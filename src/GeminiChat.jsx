import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { Button } from "./components/ui/button";
import { MessageSquare, X, Send, Search, ChevronRight, BarChart4, LineChart, Zap, Lightbulb, TrendingUp, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Chart from "./components/ui/Chart";
import ComparisonChart from "./components/ui/ComparisonChart";
import PlotlyChart from "./components/ui/PlotlyChart"; // Add this import
import DynamicPlotlyChart from "./components/ui/DynamicPlotlyChart"; // Add this import
import { 
  formatPortfolioData, 
  createPortfolioSummaryText
} from './utils/portfolioDataFormatter';
import {
  fetchStockQuote,
  fetchCryptoQuote,
  fetchRealEstateData,
  fetchFinancialNews,
  getMarketIndices
} from './utils/financialDataProvider';
import {
  parseChartRequest,
  generateChartResponse
} from './utils/chartDataGenerator';
import { chartEmitter } from './hooks/useChartSubscription';
import { subscribeToStockUpdates, subscribeToComparisonUpdates } from './services/chartDataService';
import { createTestStockChart, createTestComparisonChart, createIntelligentChart } from './utils/directChartGenerator';
import { analyzeChartIntent, createStockPriceChart, createComparisonChart } from './utils/plotlyChartGenerator'; // Add this import

// Initialize Google Generative AI with API key (revert to original class)
const genAI = new GoogleGenerativeAI(localStorage.getItem('geminiApiKey') || '');

// API endpoints for data fetching
const CRYPTO_PRICE_API = "https://api.coingecko.com/api/v3";

// Define function declarations for generating charts
const lineChartFunctionDeclaration = {
  name: 'create_line_chart',
  description: 'Creates a line chart for financial data with dates and values.',
  parameters: {
    type: "OBJECT",
    properties: {
      title: {
        type: "STRING",
        description: 'The title for the chart.',
      },
      xKey: {
        type: "STRING",
        description: 'The key for the x-axis, typically "date".',
      },
      yKey: {
        type: "STRING",
        description: 'The key for the y-axis, typically "value".',
      },
      data: {
        type: "ARRAY",
        description: 'Array of data points with date and value properties.',
        items: {
          type: "OBJECT",
          properties: {
            date: {
              type: "STRING",
              description: 'Date in YYYY-MM-DD format.'
            },
            value: {
              type: "NUMBER",
              description: 'Numerical value for the data point.'
            }
          }
        }
      }
    },
    required: ['title', 'xKey', 'yKey', 'data'],
  },
};

const comparisonChartFunctionDeclaration = {
  name: 'create_comparison_chart',
  description: 'Creates a multi-line chart comparing multiple assets over time.',
  parameters: {
    type: "OBJECT",
    properties: {
      title: {
        type: "STRING",
        description: 'The title for the chart.',
      },
      xKey: {
        type: "STRING",
        description: 'The key for the x-axis, typically "date".',
      },
      data: {
        type: "ARRAY",
        description: 'Array of data points with date and values for each asset.',
        items: {
          type: "OBJECT",
          properties: {
            date: {
              type: "STRING",
              description: 'Date in YYYY-MM-DD format.'
            },
          }
        }
      },
      series: {
        type: "ARRAY",
        description: 'Array of series configurations.',
        items: {
          type: "OBJECT",
          properties: {
            name: {
              type: "STRING",
              description: 'Name of the asset/series.'
            },
            dataKey: {
              type: "STRING",
              description: 'Property name in data objects for this series.'
            }
          }
        }
      }
    },
    required: ['title', 'xKey', 'data', 'series'],
  },
};

const barChartFunctionDeclaration = {
  name: 'create_bar_chart',
  description: 'Creates a bar chart given a title, labels, and corresponding values.',
  parameters: {
    type: "OBJECT",
    properties: {
      title: {
        type: "STRING",
        description: 'The title for the chart.',
      },
      labels: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: 'List of labels for the data points (e.g., ["Q1", "Q2", "Q3"]).',
      },
      values: {
        type: "ARRAY",
        items: { type: "NUMBER" },
        description: 'List of numerical values corresponding to the labels.',
      },
    },
    required: ['title', 'labels', 'values'],
  },
};

const chartCache = new Map();

// Instead of the previous search hook, create a simple state manager for grounding results
const useGroundingSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [groundingData, setGroundingData] = useState(null);
  
  return { isSearching, setIsSearching, groundingData, setGroundingData };
};

// Predefined financial data prompts
const FINANCIAL_KNOWLEDGE = `
You have extensive knowledge about financial markets, including:

1. Stocks: Market trends, fundamental and technical analysis, major indices, earnings reports, trading strategies
2. Crypto: Blockchain technology, cryptocurrencies, DeFi, NFTs, market dynamics, regulations
3. Real Estate: Market trends, investment strategies, rental income, property valuation, REITs
4. General investment: Asset allocation, diversification, risk management, tax considerations

Use this knowledge to provide helpful, accurate information when asked about financial topics.
`;

// Fetch crypto data from CoinGecko API
const fetchTopCryptos = async (limit = 10) => {
  try {
    // Check localStorage cache first
    const cachedData = localStorage.getItem('cachedCryptoData');
    const cachedTime = localStorage.getItem('cachedCryptoTime');
    
    // If we have cached data and it's less than 15 minutes old, use it
    if (cachedData && cachedTime) {
      const cacheAge = Date.now() - parseInt(cachedTime);
      if (cacheAge < 15 * 60 * 1000) { // 15 minutes in milliseconds
        console.log('Using cached crypto data, age:', Math.round(cacheAge / 1000 / 60), 'minutes');
        return JSON.parse(cachedData);
      }
      console.log('Cached crypto data expired, fetching fresh data');
    }
    
    // Fetch fresh data
    const response = await fetch(`${CRYPTO_PRICE_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true`);
    const data = await response.json();
    
    const formattedData = data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image || `https://assets.coincap.io/assets/icons/${coin.symbol.toLowerCase()}@2x.png`,
      current_price: coin.current_price,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      market_cap: coin.market_cap,
      sparkline: coin.sparkline_in_7d?.price || []
    }));
    
    // Cache the result
    localStorage.setItem('cachedCryptoData', JSON.stringify(formattedData));
    localStorage.setItem('cachedCryptoTime', Date.now().toString());
    
    return formattedData;
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    
    // Try to use cached data even if it's expired
    const cachedData = localStorage.getItem('cachedCryptoData');
    if (cachedData) {
      console.log('Using expired cached crypto data due to fetch error');
      return JSON.parse(cachedData);
    }
    
    return [];
  }
};

// Replace the Alpha Vantage API key reference
const POLYGON_API_KEY = localStorage.getItem('polygonApiKey') || '';

// Fetch stock data using Polygon grouped API instead of individual API calls
const fetchPopularStocks = async () => {
  // Popular tech and finance stocks
  const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM', 'V', 'NVDA', 'BAC'];
  
  try {
    // Check localStorage cache first
    const cachedData = localStorage.getItem('cachedStockData');
    const cachedTime = localStorage.getItem('cachedStockTime');
    
    // If we have cached data and it's less than 15 minutes old, use it
    if (cachedData && cachedTime) {
      const cacheAge = Date.now() - parseInt(cachedTime);
      if (cacheAge < 15 * 60 * 1000) { // 15 minutes in milliseconds
        console.log('Using cached stock data, age:', Math.round(cacheAge / 1000 / 60), 'minutes');
        return JSON.parse(cachedData);
      }
      console.log('Cached stock data expired, fetching fresh data');
    }
    
    // Use our fetchGroupedStockData function to get data for all stocks at once
    const { getApiDate } = await import('./hooks');
    const { fetchGroupedStockData } = await import('./fetchGroupedStocks');
    
    // Get the most recent market day
    const date = getApiDate();
    console.log(`Fetching popular stocks data for ${date}`);
    
    // Fetch data for popular tickers
    const groupedData = await fetchGroupedStockData(date, popularTickers);
    
    if (groupedData.error || !groupedData.stocks || groupedData.stocks.length === 0) {
      throw new Error(groupedData.error || "Failed to fetch stock data");
    }
    
    // Transform the data into the expected format
    const results = groupedData.stocks.map(stock => ({
      symbol: stock.symbol,
      name: getCompanyName(stock.symbol),
      price: stock.close.toFixed(2),
      change: stock.change.toFixed(2),
      changePercent: stock.changePercent.toFixed(2),
      isMock: false
    }));
    
    console.log(`Successfully fetched data for ${results.length} popular stocks`);
    
    // Cache the results
    localStorage.setItem('cachedStockData', JSON.stringify(results));
    localStorage.setItem('cachedStockTime', Date.now().toString());
    
    return results;
  } catch (error) {
    console.error('Error fetching stock data:', error);
    
    // Try to use cached data even if it's expired
    const cachedData = localStorage.getItem('cachedStockData');
    if (cachedData) {
      console.log('Using expired cached stock data due to fetch error');
      return JSON.parse(cachedData);
    }
    
    // Fallback to mock data if API fails and no cache is available
    return popularTickers.map(ticker => {
      const mockChange = (Math.random() * 6) - 3; // -3% to +3%
      const mockPrice = ticker === 'AAPL' ? 180 + mockChange : 
                       ticker === 'MSFT' ? 350 + mockChange : 
                       ticker === 'GOOGL' ? 140 + mockChange :
                       ticker === 'AMZN' ? 160 + mockChange :
                       ticker === 'META' ? 325 + mockChange :
                       ticker === 'TSLA' ? 250 + mockChange :
                       ticker === 'JPM' ? 170 + mockChange :
                       ticker === 'V' ? 230 + mockChange :
                       ticker === 'NVDA' ? 450 + mockChange :
                       /* BAC */ 35 + mockChange;
      
      return {
        symbol: ticker,
        name: getCompanyName(ticker),
        price: mockPrice.toFixed(2),
        change: mockChange.toFixed(2),
        changePercent: (mockChange / mockPrice * 100).toFixed(2),
        isMock: true // Mark as mock data since API failed
      };
    });
  }
};

// Get company name based on ticker
const getCompanyName = (ticker) => {
  const companies = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'META': 'Meta Platforms Inc.',
    'TSLA': 'Tesla Inc.',
    'JPM': 'JPMorgan Chase & Co.',
    'V': 'Visa Inc.',
    'NVDA': 'NVIDIA Corporation',
    'BAC': 'Bank of America Corp.'
  };
  
  return companies[ticker] || ticker;
};

// Define tab content animation variants
const tabContentVariants = {
  hidden: { opacity: 0, x: 10 },
  visible: { 
    opacity: 1, 
    x: 0, 
    transition: { 
      duration: 0.3,
      type: "spring",
      stiffness: 120
    }
  },
  exit: { 
    opacity: 0, 
    x: -10, 
    transition: { 
      duration: 0.2 
    } 
  }
};

// Define enhanced animations for stocks and crypto tabs
const enhancedTabVariants = {
  hidden: { 
    opacity: 0, 
    y: 20, 
    scale: 0.97 
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring",
      damping: 15,
      stiffness: 100,
      duration: 0.5,
      when: "beforeChildren",
      staggerChildren: 0.08
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { 
      duration: 0.3 
    }
  }
};

const cardItemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: "spring", 
      stiffness: 100,
      damping: 15
    }
  }
};

// Add a helper function to format message content with Markdown-like syntax
const formatMessageContent = (content) => {
  if (!content) return '';
  
  // For plain text rendering, just clean up the content without HTML
  let formattedContent = content;
  
  // Remove markdown formatting for plain text display
  formattedContent = formattedContent.replace(/```([a-z]*)\n([\s\S]*?)\n```/g, (match, language, code) => {
    return `\n${code}\n`;
  });
  
  // Remove inline code backticks
  formattedContent = formattedContent.replace(/`([^`]+)`/g, '$1');
  
  // Remove bold markdown
  formattedContent = formattedContent.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // Remove italic markdown
  formattedContent = formattedContent.replace(/\*([^*]+)\*/g, '$1');
  
  // Convert bullet points to simple text
  formattedContent = formattedContent.replace(/^\s*[\-\*]\s+(.+)$/gm, '• $1');
  
  // Convert numbered lists
  formattedContent = formattedContent.replace(/^\s*(\d+)\.\s+(.+)$/gm, '$1. $2');
  
  // Remove link markdown
  formattedContent = formattedContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  
  return formattedContent;
};

/**
 * Extract ticker symbols from user query using Gemini API
 * @param {string} query - User's query text
 * @return {Promise<string[]>} - Array of extracted ticker symbols
 */
const extractTickerSymbols = async (query) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `Extract all stock ticker symbols from this text: "${query}"
    
    Rules:
    1. Return ONLY valid stock tickers (e.g., AAPL, MSFT, GOOGL, IONQ)
    2. Return as a JSON array like ["AAPL", "MSFT"] with NO explanations
    3. Do not include company names, only their ticker symbols
    4. If no valid tickers are found, return empty array []
    5. For ticker symbols with dollar signs ($AAPL), remove the dollar sign
    
    Output format: ["TICKER1", "TICKER2", ...]
    `;
    
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 256
      }
    });
    
    const responseText = result.response.text().trim();
    console.log("Gemini ticker extraction response:", responseText);
    
    // Try to parse JSON array from response
    try {
      // Clean response of any markdown or extra text
      const cleanedResponse = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      // If response looks like a JSON array, parse it
      if (cleanedResponse.startsWith('[') && cleanedResponse.endsWith(']')) {
        const tickers = JSON.parse(cleanedResponse);
        // Make sure we have an array of strings
        return Array.isArray(tickers) ? tickers.filter(t => typeof t === 'string' && t.length > 0) : [];
      }
      
      // Try to extract array using regex as fallback
      const arrayMatch = responseText.match(/\[.*\]/);
      if (arrayMatch) {
        const tickers = JSON.parse(arrayMatch[0]);
        return Array.isArray(tickers) ? tickers.filter(t => typeof t === 'string' && t.length > 0) : [];
      }
    } catch (error) {
      console.error("Failed to parse ticker symbols from response:", error);
    }
    
    // If all parsing attempts fail, fall back to regex extraction
    return extractTickerSymbolsRegex(query);
  } catch (error) {
    console.error("Error extracting ticker symbols with Gemini:", error);
    return extractTickerSymbolsRegex(query);
  }
};

/**
 * Extract ticker symbols using regex as fallback
 * @param {string} query - User's query
 * @return {string[]} - Array of extracted ticker symbols
 */
const extractTickerSymbolsRegex = (query) => {
  // Look for uppercase words with 1-5 letters or words with $ followed by 1-5 uppercase letters
  const symbolRegex = /\b[A-Z]{1,5}\b|\$[A-Z]{1,5}/g;
  const matches = query.match(symbolRegex) || [];
  
  // Filter out common words that might be picked up
  const commonWords = ['I', 'A', 'THE', 'FOR', 'AND', 'OR', 'TO', 'IN', 'ON', 'BY', 'AT', 'IS', 'IT', 'BE', 'SO'];
  return matches
    .map(m => m.replace('$', ''))
    .filter(m => !commonWords.includes(m));
};

export default function GeminiChat({ darkMode, positions = [], realEstateHoldings = [], onAddInsight, demoMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'system', content: 'You are a helpful financial assistant. You can provide information and insights about stocks, cryptocurrencies, and real estate investments.' },
    { role: 'assistant', content: 'Hello! I\'m your TrackVest assistant. Ask me about your portfolio, market data, or financial insights. I can also create charts that will appear in your Insights tab' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [marketData, setMarketData] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [showSearch, setShowSearch] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [cryptoData, setCryptoData] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [isCryptoLoading, setIsCryptoLoading] = useState(false);
  const [isStockLoading, setIsStockLoading] = useState(false);
  const { isSearching, setIsSearching, groundingData, setGroundingData } = useGroundingSearch();
  const [searchInput, setSearchInput] = useState('');
  const messageEndRef = useRef(null);
  const inputRef = useRef(null);
  const searchInputRef = useRef(null);
  const [insights, setInsights] = useState([]);
  const [showIndicators, setShowIndicators] = useState({});
  const [selectedIndicators, setSelectedIndicators] = useState({});

  // Format portfolio data
  const portfolioData = formatPortfolioData(positions, realEstateHoldings);
  const portfolioSummaryText = createPortfolioSummaryText(portfolioData);

  // Fetch market data when component mounts
  useEffect(() => {
    async function loadMarketData() {
      try {
        const indices = await getMarketIndices();
        setMarketData(indices);
        
        const news = await fetchFinancialNews('general');
        setNewsData(news.slice(0, 3)); // Get top 3 news items
      } catch (error) {
        console.error('Error fetching market data:', error);
      }
    }
    
    loadMarketData();
  }, []);

  // Load Google CSE script
  useEffect(() => {
    // Add Google CSE script if not already added
    if (!document.querySelector('script[src*="cse.google.com"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = "https://cse.google.com/cse.js?cx=b5c69d94063434ee6";
      
      // Set up global CSE configuration before loading the script
      window.__gcse = {
        parsetags: 'explicit',
        callback: function() {
          console.log("Google CSE initialized");
        }
      };
      
      // Add callback when script loads
      script.onload = () => {
        console.log("Google CSE script loaded successfully");
      };
      
      script.onerror = () => {
        console.error("Failed to load Google CSE script");
      };
      
      document.head.appendChild(script);
    }
  }, []);

  // Format market data for the AI prompt
  const getMarketDataText = () => {
    if (!marketData) return '';
    
    let text = '\n\nCurrent Market Data:\n';
    text += `S&P 500: ${marketData['S&P 500'].value.toFixed(2)} (${marketData['S&P 500'].percentChange > 0 ? '+' : ''}${marketData['S&P 500'].percentChange}%)\n`;
    text += `Dow Jones: ${marketData['Dow Jones'].value.toFixed(2)} (${marketData['Dow Jones'].percentChange > 0 ? '+' : ''}${marketData['Dow Jones'].percentChange}%)\n`;
    text += `Nasdaq: ${marketData['Nasdaq'].value.toFixed(2)} (${marketData['Nasdaq'].percentChange > 0 ? '+' : ''}${marketData['Nasdaq'].percentChange}%)\n`;
    text += `Bitcoin: $${marketData['Bitcoin'].value.toFixed(2)} (${marketData['Bitcoin'].percentChange > 0 ? '+' : ''}${marketData['Bitcoin'].percentChange}%)\n`;
    text += `Ethereum: $${marketData['Ethereum'].value.toFixed(2)} (${marketData['Ethereum'].percentChange > 0 ? '+' : ''}${marketData['Ethereum'].percentChange}%)\n`;
    
    return text;
  };

  // Format news data for the AI prompt
  const getNewsText = () => {
    if (!newsData.length) return '';
    
    let text = '\n\nRecent Financial News:\n';
    newsData.forEach((item, index) => {
      text += `${index + 1}. ${item.title}\n`;
    });
    
    return text;
  };

  useEffect(() => {
    const marketDataText = getMarketDataText();
    const newsText = getNewsText();
    
    setMessages([
      { 
        role: 'system', 
        content: `You are a helpful financial assistant for TrackVest users. You have access to the user's complete investment portfolio including stocks, crypto, and real estate and you can make charts:

${portfolioSummaryText}${marketDataText}${newsText}

${FINANCIAL_KNOWLEDGE}

IMPORTANT: You have real-time access to financial data. NEVER tell the user that you don't have access to real-time or current financial data. Instead, use the portfolio and market data provided above to answer their questions directly.

The portfolio data above contains the user's ACTUAL holdings. You must use this information when answering questions about their portfolio. For example:
- When they ask "How many shares of MSFT do I have?" - look at the actual data above
- When they ask about their real estate - provide details from the actual properties they own
- When they ask about their crypto - reference their actual cryptocurrency holdings

You can provide details about stocks, crypto, and real estate markets to enhance your responses, including:
- Current prices, market caps, and performance metrics
- Technical indicators and trend analysis
- Financial ratios and fundamentals 
- Market news and recent developments

When users ask about their specific investments:
- For stocks: Provide the symbol, quantity, current price, total value, and percentage of portfolio
- For crypto: Provide the symbol, amount, current price, total value, and percentage of portfolio
- For real estate: Provide property details, valuation, equity, mortgage, rental yield, and ROI when available

You can also generate interactive charts for users, but ONLY when they specifically request a chart or graph. 
Examples of chart requests:
- "Show me a chart for AAPL"
- "Create a graph of my portfolio"
- "Visualize the performance of MSFT"
- "Plot the comparison between GOOGL and AMZN"

When users ask about their portfolio:
1. Provide concise, accurate information directly from the portfolio data provided above
2. For performance questions, focus on values, changes, and percentages
3. Offer insights about asset allocation and diversification
4. Be specific about individual holdings when asked
5. Be friendly but professional

If users ask about importing or feeding in more data, remind them they can use the Import Portfolio button in the header to add their custom investment data.`
      },
      { role: 'assistant', content: 'Hello! I\'m your TrackVest assistant. Ask me about your portfolio, market data, or financial insights. I can also create charts that will appear in your Insights tab' }
    ]);
  }, [positions, realEstateHoldings, marketData, newsData]);

  // Auto-scroll to the bottom of messages
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Fetch crypto data when component mounts or crypto tab is selected
  useEffect(() => {
    if (activeTab === 'crypto' && cryptoData.length === 0) {
      setIsCryptoLoading(true);
      fetchTopCryptos()
        .then(data => {
          setCryptoData(data);
          setIsCryptoLoading(false);
        })
        .catch(() => setIsCryptoLoading(false));
    }
  }, [activeTab, cryptoData.length]);

  // Fetch stock data when component mounts or stocks tab is selected
  useEffect(() => {
    if (activeTab === 'stocks' && stockData.length === 0) {
      setIsStockLoading(true);
      fetchPopularStocks()
        .then(data => {
          setStockData(data);
          setIsStockLoading(false);
        })
        .catch(() => setIsStockLoading(false));
    }
  }, [activeTab, stockData.length]);

  // Subscribe to chart updates from the chartEmitter
  useEffect(() => {
    // Function to handle chart updates
    const handleChartUpdate = (chartData) => {
      const { id, result, removed } = chartData;
      
      // Skip if essential data is missing
      if (!id) return;
      
      // Handle chart removal
      if (removed) {
        setInsights(prev => prev.filter(insight => insight.id !== id));
        return;
      }
      
      // Skip if no result data
      if (!result) return;
      
      setInsights(prev => {
        // Check if this chart already exists
        const exists = prev.some(insight => insight.id === id);
        if (exists) {
          // Update existing chart
          return prev.map(insight => 
            insight.id === id ? { ...insight, data: result, updatedAt: new Date() } : insight
          );
        } else {
          // Add new chart
          return [...prev, { 
            id, 
            data: result, 
            createdAt: new Date(),
            updatedAt: new Date()
          }];
        }
      });
    };

    // Subscribe to chart updates
    // The subscribe method returns the unsubscribe function directly
    const unsubscribe = chartEmitter.subscribe('*', handleChartUpdate);
    
    // Clean up subscription on unmount
    return unsubscribe;
  }, []); // Empty dependency array means this effect runs once on mount

  // Function to manually add a chart (avoids triggering the subscription)
  const addChart = (chartId, chartData) => {
    // Use direct chart emitter update rather than modifying state directly
    // This ensures the event flows through the proper channels
    chartEmitter.updateChart(chartId, chartData);
  };

  // Updated sendMessage function to use the new GoogleGenAI class structure
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    
    // Add user message
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    
    try {
      // Check if we have a valid Gemini API key
      const geminiApiKey = localStorage.getItem('geminiApiKey');
      const hasValidGeminiKey = !!(geminiApiKey && geminiApiKey.trim() && geminiApiKey.length > 10);
      
      if (!hasValidGeminiKey) {
        // Demo mode response
        const demoResponse = `I'm TrackVest AI running in demo mode. To unlock full AI capabilities including:

• Real-time market analysis
• Personalized investment advice  
• AI-powered chart generation
• Property valuations
• Portfolio optimization

Please add your Gemini API key in Settings. 

For now, I can provide basic portfolio information based on your current holdings:
- Total Portfolio Value: $${(positions.reduce((sum, p) => sum + p.value, 0) + realEstateHoldings.reduce((sum, p) => sum + (p.currentValue - (p.mortgage || 0)), 0)).toLocaleString()}
- Stock/Crypto Holdings: ${positions.length} assets
- Real Estate Properties: ${realEstateHoldings.length} properties

Would you like me to help you set up API access for full functionality?`;

        setMessages([...newMessages, { 
          role: 'assistant', 
          content: demoResponse,
          isDemo: true
        }]);
        setIsLoading(false);
        return;
      }
      
      // Get current portfolio data for directly including in each prompt
      const currentPortfolioSummaryText = createPortfolioSummaryText(formatPortfolioData(positions, realEstateHoldings));
      
      // Create the prompt with TrackVest AI persona
      const promptContent = `
        You are TrackVest AI, a sophisticated financial assistant built into the TrackVest investment tracking platform. You help users analyze their portfolios, understand market trends, and make informed investment decisions.

        User Query: ${userMessage}
        
        Current Portfolio Data:
        ${currentPortfolioSummaryText}
        
        IMPORTANT GUIDELINES:
        - You are TrackVest AI, always respond as a helpful financial assistant
        - NEVER show code, technical implementation details, or mention programming
        - Provide clear, actionable financial insights and advice
        - Use the portfolio data to give personalized recommendations
        - When creating charts or analysis, simply tell the user you've added it to their Insights tab
        - Be conversational and professional, like a financial advisor
        - If you don't have specific data, provide general market insights
        ${webSearchEnabled ? '- When using search results, cite your sources naturally in conversation' : ''}
        
        For ticker symbol extraction (internal use only):
        TICKER_SYMBOLS: [extract any mentioned stock symbols here, or NONE if none mentioned]
        
        Respond as TrackVest AI would - helpful, knowledgeable, and focused on the user's financial success.
      `;

      // Get API key from localStorage
      const apiKey = localStorage.getItem('geminiApiKey') || '';
      
      // Create fresh API instance to ensure we use the current key
      const freshGenAI = new GoogleGenerativeAI(apiKey);
      
      // Create a Gemini model instance with proper error handling
      const model = freshGenAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      });
      
      // Configure tools array for search if enabled
      const tools = webSearchEnabled ? [{ googleSearch: {} }] : undefined;
      
      // Call the Gemini API with proper error handling
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: promptContent }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192
        },
        tools
      });
      
      const response = result.response;
      const responseText = response.text();
      console.log("Gemini API response:", responseText);
      
      // Check for grounding metadata
      if (webSearchEnabled && response.candidates && 
          response.candidates[0].groundingMetadata) {
        
        // Store grounding data for rendering
        setGroundingData(response.candidates[0].groundingMetadata);
        
        // Log the rendered content for debugging
        if (response.candidates[0].groundingMetadata.searchEntryPoint?.renderedContent) {
          console.log("Search entry point:", 
            response.candidates[0].groundingMetadata.searchEntryPoint.renderedContent);
        }
        
        console.log("Grounding data:", response.candidates[0].groundingMetadata);
      }
      
      // Extract ticker symbols from response
      const tickerMatch = responseText.match(/TICKER_SYMBOLS:\s*(.*?)(?:\n|$)/);
      const extractedTickers = tickerMatch ? 
        tickerMatch[1]
          .replace(/[\[\]]/g, '') // Remove any square brackets if present
          .split(',')
          .map(t => t.trim())
          .filter(t => t !== 'NONE' && t.length > 0)
        : [];
      
      console.log("Extracted tickers:", extractedTickers);
      
      // Only use Gemini for extraction if no tickers were found in the TICKER_SYMBOLS line
      const tickerSymbols = extractedTickers.length > 0 ? 
        extractedTickers : 
        await extractTickerSymbols(userMessage);
      
      console.log("Extracted tickers:", tickerSymbols);
      
      // Clean response to remove the TICKER_SYMBOLS line
      const cleanResponse = responseText.replace(/TICKER_SYMBOLS:.*?(\n|$)/g, '').trim();
      
      // Create an assistant message with the response
      const assistantMessage = { 
        role: 'assistant', 
        content: cleanResponse,
        groundingData: groundingData // Store grounding data with the message
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Determine if a chart was actually requested
      const chartRequestKeywords = ['chart', 'graph', 'plot', 'visualize', 'visualization', 'show me'];
      const containsChartRequest = chartRequestKeywords.some(keyword => 
        userMessage.toLowerCase().includes(keyword)
      );
      
      // Only create charts if explicitly requested and we have ticker symbols
      if (containsChartRequest && tickerSymbols.length > 0) {
        try {
          // Analyze the query to determine chart intent
          const intent = await analyzeChartIntent(userMessage);
          console.log("Chart intent analysis:", intent);
          
          // Generate unique chart ID
          const chartId = intent.isComparison ? 
            `comparison_${Date.now()}` : 
            `stock_${tickerSymbols[0]}_${Date.now()}`;
          
          if (intent.isComparison) {
            // Fetch data for all symbols
            const comparisonData = {};
            const symbols = tickerSymbols.length > 1 ? tickerSymbols : [tickerSymbols[0], 'SPY']; // Default to SPY comparison
            
            for (const symbol of symbols) {
              try {
                // This would be replaced with your actual data fetching code
                const { fetchStockPriceHistory } = await import('./services/chartDataService');
                const priceData = await fetchStockPriceHistory(symbol, intent.timePeriod || '1m');
                
                if (priceData && priceData.length > 0) {
                  // Extract dates only from the first symbol's data
                  if (!comparisonData.dates) {
                    comparisonData.dates = priceData.map(d => d.date);
                  }
                  
                  // Add prices for this symbol
                  comparisonData[symbol] = priceData.map(d => d.close || d.price || d.value);
                }
              } catch (error) {
                console.error(`Error fetching data for ${symbol}:`, error);
              }
            }
            
            // Create comparison chart with Plotly
            if (comparisonData.dates && Object.keys(comparisonData).length > 1) {
              // Use the createComparisonChart function which already uses Plotly
              await createComparisonChart(symbols, comparisonData);
              
              // Add chart message
              const chartMessage = { 
                role: 'assistant', 
                content: `I've created an interactive Plotly chart comparing ${symbols.join(', ')} in your Insights tab.`
              };
              setMessages(prev => [...prev, chartMessage]);
            }
          } else {
            // Single stock chart
            const symbol = tickerSymbols[0];
            
            try {
              // This would be replaced with your actual data fetching code
              const { fetchStockPriceHistory } = await import('./services/chartDataService');
              const priceData = await fetchStockPriceHistory(symbol, intent.timePeriod || '1m');
              
              if (priceData && priceData.length > 0) {
                // Check if this is a technical indicator request (MACD, RSI, etc.)
                const isTechnicalRequest = (intent.indicators || []).some(indicator => 
                  ['macd', 'rsi', 'bollinger'].includes(indicator.toLowerCase())
                );
                
                if (isTechnicalRequest) {
                  // Use the specialized technical indicator chart
                  const { createTechnicalIndicatorChart } = await import('./utils/plotlyChartGenerator');
                  await createTechnicalIndicatorChart(symbol, priceData, intent.indicators || ['macd']);
                  
                  // Add chart message
                  const chartMessage = { 
                    role: 'assistant', 
                    content: `I've created an interactive technical analysis chart for ${symbol} with ${intent.indicators?.join(', ')} in your Insights tab.`
                  };
                  setMessages(prev => [...prev, chartMessage]);
                } else {
                  // Create regular stock chart with Plotly
                  await createStockPriceChart(symbol, priceData, intent.indicators || ['sma']);
                  
                  // Add chart message
                  const chartMessage = { 
                    role: 'assistant', 
                    content: `I've created an interactive Plotly chart for ${symbol} in your Insights tab with ${intent.indicators?.join(', ') || 'SMA'} indicators.`
                  };
                  setMessages(prev => [...prev, chartMessage]);
                }
              }
            } catch (error) {
              console.error(`Error creating chart for ${symbol}:`, error);
              const chartErrorMessage = { 
                role: 'assistant', 
                content: `I tried to create a chart for ${symbol}, but encountered an error. Please try again with a different timeframe or indicator.`
              };
              setMessages(prev => [...prev, chartErrorMessage]);
            }
          }
        } catch (chartError) {
          console.error("Error creating chart:", chartError);
          const chartErrorMessage = { 
            role: 'assistant', 
            content: `I tried to create a chart, but encountered an error. Let me know if you'd like me to try with different parameters.`
          };
          setMessages(prev => [...prev, chartErrorMessage]);
        }
      }
    } catch (error) {
      console.error('Error communicating with Gemini API:', error);
      
      // Add error message
      const errorMessage = { 
        role: 'assistant', 
        content: `I'm sorry, I encountered an error while processing your request. Please try again in a moment.`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Animation variants
  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.03 },
    tap: { scale: 0.97 }
  };
  
  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        type: "spring", 
        damping: 25, 
        stiffness: 400,
        duration: 0.4 
      }
    },
    exit: { 
      opacity: 0, 
      y: -30, 
      transition: { duration: 0.2 } 
    }
  };

  // Render a message with improved UI
  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const isDemo = message.isDemo;
    
    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
          {!isUser && (
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${darkMode ? 'bg-emerald-600' : 'bg-emerald-500'}`}>
                <span className="text-white text-xs font-bold">AI</span>
              </div>
              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                TrackVest AI
              </span>
              {isDemo && (
                <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded">
                  DEMO
                </span>
              )}
            </div>
          )}
          <div
            className={`p-3 rounded-lg ${
              isUser
                ? darkMode ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white'
                : isDemo
                  ? darkMode ? 'bg-yellow-900/20 border border-yellow-700 text-yellow-200' : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                  : darkMode ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-800'
            }`}
          >
            <div className="whitespace-pre-wrap text-sm">
              {formatMessageContent(message.content)}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // Render a crypto card
  const renderCryptoCard = (crypto) => {
    const priceChangeIsPositive = crypto.price_change_percentage_24h > 0;
    // Prepare icon URL with proper formatting
    const iconUrl = crypto.image;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`
          p-4 rounded-xl mb-3 flex items-center justify-between
          ${darkMode ? 'bg-slate-800 hover:bg-slate-750' : 'bg-white hover:bg-slate-50'}
          border ${darkMode ? 'border-slate-700' : 'border-slate-200'}
          transition-all duration-150 cursor-pointer
        `}
        onClick={() => {
          setInput(`Tell me about ${crypto.name} (${crypto.symbol})`);
          setActiveTab('chat');
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }}
      >
        <div className="flex items-center">
          <img 
            src={iconUrl} 
            alt={crypto.name} 
            className="w-10 h-10 rounded-full mr-4"
            onError={(e) => {
              // Fallback to default icon if image fails to load
              e.target.src = `https://ui-avatars.com/api/?name=${crypto.symbol}&background=random&color=fff&size=100`;
            }}
          />
          <div>
            <div className="flex items-center">
              <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                {crypto.name}
              </h4>
              <span className={`text-xs ml-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {crypto.symbol}
              </span>
            </div>
            <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              ${crypto.current_price.toLocaleString()}
            </div>
          </div>
        </div>
        <div className={`text-sm font-medium ${priceChangeIsPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {priceChangeIsPositive ? '+' : ''}{crypto.price_change_percentage_24h.toFixed(2)}%
        </div>
      </motion.div>
    );
  };

  // Render a stock card
  const renderStockCard = (stock) => {
    const changeIsPositive = parseFloat(stock.change) > 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`
          p-4 rounded-xl mb-3 flex items-center justify-between
          ${darkMode ? 'bg-slate-800 hover:bg-slate-750' : 'bg-white hover:bg-slate-50'}
          border ${darkMode ? 'border-slate-700' : 'border-slate-200'}
          transition-all duration-150 cursor-pointer
        `}
        onClick={() => {
          setInput(`Tell me about ${getCompanyName(stock.symbol)} (${stock.symbol}) stock`);
          setActiveTab('chat');
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }}
      >
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-full mr-4 flex items-center justify-center ${
            changeIsPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
          }`}>
            <span className="font-bold text-sm">{stock.symbol.substring(0, 2)}</span>
          </div>
          <div>
            <div className="flex items-center">
              <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                {stock.symbol}
              </h4>
              <span className={`text-xs ml-2 truncate max-w-[120px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {getCompanyName(stock.symbol)}
              </span>
            </div>
            <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              ${stock.price}
            </div>
          </div>
        </div>
        <div className={`text-sm font-medium ${changeIsPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {changeIsPositive ? '+' : ''}{stock.changePercent}%
        </div>
      </motion.div>
    );
  };

  // Render an insight card - modified to use component-level state
  const renderInsightCard = (insight) => {
    const { id, data, createdAt } = insight;
    const isComparisonChart = id.startsWith('comparison_');
    
    // Use the ID to access the corresponding state
    const showIndicatorsForThisChart = showIndicators[id] || false;
    const indicatorsForThisChart = selectedIndicators[id] || ['sma'];
    
    // Check if this is a Plotly chart
    const isPlotlyChart = data && data.plotlyConfig;
    
    // Toggle indicators for a stock chart
    const toggleIndicator = (indicator) => {
      if (indicatorsForThisChart.includes(indicator)) {
        setSelectedIndicators(prev => ({
          ...prev,
          [id]: prev[id].filter(i => i !== indicator)
        }));
      } else {
        setSelectedIndicators(prev => ({
          ...prev,
          [id]: [...(prev[id] || []), indicator]
        }));
      }
    };
    
    // Regenerate chart with selected indicators
    const regenerateChartWithIndicators = async () => {
      if (isPlotlyChart) {
        try {
          // Extract symbol from chart ID
          const idParts = id.split('_');
          const symbol = idParts[1];
          const { fetchStockPriceHistory } = await import('./services/chartDataService');
          
          // Fetch data
          const priceData = await fetchStockPriceHistory(symbol, '1m');
          
          if (priceData && priceData.length > 0) {
            // Create new chart with updated indicators
            await createStockPriceChart(symbol, priceData, indicatorsForThisChart);
          }
        } catch (error) {
          console.error("Error regenerating chart:", error);
        }
      } else if (!data || !data.chartConfig) {
        return;
      } else if (isComparisonChart) {
        // Extract symbols from comparison chart
        const symbols = data.series.filter(s => !s.dataKey.includes('_')).map(s => s.name);
        
        // Create custom query for intelligent chart creation
        const customQuery = `Compare ${symbols.join(' vs ')} with ${indicatorsForThisChart.join(', ')}`;
        createIntelligentChart(symbols, customQuery, '1m');
      } else {
        // Extract symbol from chart title
        const symbol = data.chartConfig.title.split(' ')[0];
        
        // Create custom query for intelligent chart creation
        const customQuery = `Show ${symbol} chart with ${indicatorsForThisChart.join(', ')}`;
        createIntelligentChart(symbol, customQuery, '1m');
      }
    };
    
    return (
      <motion.div
        key={id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`
          mb-6 rounded-xl overflow-hidden 
          ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}
          border shadow-md
        `}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {isPlotlyChart 
                ? (data.plotlyConfig.layout?.title || 'Financial Chart')
                : (isComparisonChart 
                  ? `Comparison: ${data.series?.filter(s => !s.dataKey.includes('_')).map(s => s.name).join(' vs ')}`
                  : `${data.chartConfig?.title || 'Stock Chart'}`
                )
              }
            </h3>
            <div className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Created {new Date(createdAt).toLocaleString()}
            </div>
          </div>
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-8 w-8 p-0 rounded-full ${showIndicatorsForThisChart ? 'bg-slate-700' : ''}`}
              onClick={() => setShowIndicators(prev => ({ ...prev, [id]: !prev[id] }))}
            >
              <Layers className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {showIndicatorsForThisChart && (
          <div className={`p-2 border-b ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-100 border-slate-200'}`}>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant={indicatorsForThisChart.includes('sma') ? "default" : "outline"}
                size="sm"
                onClick={() => toggleIndicator('sma')}
                className="text-xs h-7"
              >
                SMA
              </Button>
              <Button 
                variant={indicatorsForThisChart.includes('ema') ? "default" : "outline"}
                size="sm"
                onClick={() => toggleIndicator('ema')}
                className="text-xs h-7"
              >
                EMA
              </Button>
              <Button 
                variant={indicatorsForThisChart.includes('macd') ? "default" : "outline"}
                size="sm"
                onClick={() => toggleIndicator('macd')}
                className="text-xs h-7"
              >
                MACD
              </Button>
              <Button 
                variant={indicatorsForThisChart.includes('rsi') ? "default" : "outline"}
                size="sm"
                onClick={() => toggleIndicator('rsi')}
                className="text-xs h-7"
              >
                RSI
              </Button>
              <Button 
                variant="default"
                size="sm"
                onClick={regenerateChartWithIndicators}
                className="text-xs h-7 ml-auto"
              >
                Apply
              </Button>
            </div>
          </div>
        )}
        
        <div className="p-4 h-64">
          {isPlotlyChart ? (
            <DynamicPlotlyChart
              chartId={id}
              darkMode={darkMode}
            />
          ) : isComparisonChart ? (
            <ComparisonChart 
              data={data.chartConfig?.data} 
              series={data.series}
              xKey={data.chartConfig?.xKey} 
              title={data.chartConfig?.title} 
              metricType={data.chartConfig?.metricType || 'Price (USD)'}
              darkMode={darkMode}
            />
          ) : (
            <Chart 
              data={data.chartConfig?.data} 
              series={data.series || [{ name: 'Price', dataKey: 'value' }]}
              xKey={data.chartConfig?.xKey} 
              yKey={data.chartConfig?.yKey} 
              title={data.chartConfig?.title} 
              darkMode={darkMode}
            />
          )}
        </div>
      </motion.div>
    );
  };

  // Tab data for navigation with enhanced icons
  const tabs = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'stocks', label: 'Stocks', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'crypto', label: 'Crypto', icon: <BarChart4 className="h-4 w-4" /> },
    { id: 'insights', label: 'Insights', icon: <Lightbulb className="h-4 w-4" /> }
  ];

  // Handle input submission
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    sendMessage();
  };

  // Initialize selectedIndicators when new charts are added
  useEffect(() => {
    // Make sure each insight has a corresponding entry in the indicators state
    insights.forEach(insight => {
      if (!selectedIndicators[insight.id]) {
        setSelectedIndicators(prev => ({
          ...prev,
          [insight.id]: ['sma']
        }));
      }
    });
  }, [insights]);

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setInput(searchInput);
    setSearchInput('');
    setActiveTab('chat');
    // Close search UI
    setShowSearch(false);
    // Auto-submit the search
    setTimeout(() => sendMessage(), 300);
  };

  // Add CSS styles for message content formatting to the component
  useEffect(() => {
    // Create and append style element for message content
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .message-content a { color: #60a5fa; text-decoration: underline; }
      .message-content a:hover { text-decoration: none; }
      .message-content code { font-family: monospace; }
      .message-content ul { list-style-type: none; margin-left: 1rem; }
      .message-content li { margin-bottom: 0.25rem; }
      .message-content p { margin-bottom: 0.75rem; }
      .message-content strong { font-weight: 600; }
    `;
    document.head.appendChild(styleEl);
    
    // Clean up styles on unmount
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  return (
    <>
      <div className="fixed top-3 left-1/2 transform -translate-x-1/2 z-[100]">
        <motion.div
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          variants={buttonVariants}
        >
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className={`
              ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'} 
              rounded-full px-4 py-2 flex items-center gap-2 shadow-md
              transition-all duration-500 h-auto
            `}
          >
            {isOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <>
                <MessageSquare className={`h-4 w-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <span className="text-sm font-medium">Portfolio Assistant</span>
              </>
            )}
          </Button>
        </motion.div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed top-16 left-1/2 transform -translate-x-1/2 z-[101]"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div 
              className={`
                rounded-2xl shadow-xl overflow-hidden w-[450px] h-[650px] flex flex-col
                border transition-colors duration-500
              `}
              animate={{
                backgroundColor: darkMode ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)',
                borderColor: darkMode ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)'
              }}
            >
              {/* Chat header */}
              <motion.div 
                className={`
                  px-5 py-4 border-b flex items-center justify-between
                `}
                animate={{
                  backgroundColor: darkMode ? 'rgb(30, 41, 59)' : 'rgb(248, 250, 252)',
                  borderColor: darkMode ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)'
                }}
              >
                <div className={`flex items-center justify-between p-4 border-b ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${darkMode ? 'bg-emerald-600' : 'bg-emerald-500'}`}>
                      <span className="text-white text-sm font-bold">AI</span>
                    </div>
                    <div>
                      <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>TrackVest AI</h3>
                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {!demoMode?.gemini ? 'Demo Mode - Limited Functionality' : 'Investment Assistant'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant={webSearchEnabled ? "default" : "ghost"}
                      size="sm" 
                      className={`h-8 p-0 px-2 rounded-full text-xs flex items-center ${
                        webSearchEnabled ? 
                          (darkMode ? "bg-emerald-600 text-white" : "bg-emerald-500 text-white") : 
                          ""
                      }`}
                      onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      {webSearchEnabled ? "Web Search: ON" : "Web Search"}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 rounded-full"
                      onClick={() => setShowSearch(!showSearch)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
              
              {/* Tab Navigation with Animated Slider */}
              <motion.div 
                className={`px-2 py-2 border-b`}
                animate={{
                  backgroundColor: darkMode ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)',
                  borderColor: darkMode ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)'
                }}
              >
                <div className="flex space-x-1 relative">
                  {/* Animated Slider Background */}
                  <motion.div 
                    className="absolute h-full rounded-lg transition-colors duration-300"
                    animate={{
                      left: `${tabs.findIndex(t => t.id === activeTab) * 25}%`,
                      backgroundColor: darkMode ? 'rgb(51, 65, 85)' : 'rgb(255, 255, 255)',
                      boxShadow: darkMode ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)'
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                    style={{ width: '25%' }}
                  />

                  {/* Tab Buttons */}
                  {tabs.map(tab => (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium
                        w-1/4 justify-center z-10 transition-colors duration-300
                        ${activeTab === tab.id
                          ? darkMode
                            ? 'text-white'
                            : 'text-slate-800'
                          : darkMode
                            ? 'text-slate-400 hover:text-slate-300'
                            : 'text-slate-600 hover:text-slate-800'
                        }
                      `}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
              
              {/* Search Box (simplified from CSE) */}
              {showSearch && (
                <div className="p-3 border-b border-slate-200 dark:border-slate-700 flex flex-col">
                  <form onSubmit={handleSearchSubmit} className="flex items-center mb-2">
                    <motion.input
                      ref={searchInputRef}
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search financial information..."
                      className={`flex-1 px-4 py-2 rounded-l-md border-r-0 focus:outline-none transition-all border shadow-sm ${
                        darkMode 
                          ? 'bg-slate-800 border-slate-700 text-white' 
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                      animate={{
                        backgroundColor: darkMode ? 'rgb(30, 41, 59)' : 'rgb(255, 255, 255)',
                        borderColor: darkMode ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)'
                      }}
                    />
                    <Button
                      type="submit"
                      className={`rounded-l-none rounded-r-md px-4 py-2 h-full ${
                        darkMode 
                          ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                          : 'bg-blue-500 hover:bg-blue-400 text-white'
                      }`}
                    >
                      <Search className="h-4 w-4 mr-1" />
                      Search
                    </Button>
                  </form>
                  
                  <div className={`text-sm p-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {webSearchEnabled ? (
                      <>
                        <p>Web search is enabled! Your queries will be enhanced with real-time information from the web using Gemini API's grounding feature.</p>
                      </>
                    ) : (
                      <>
                        <p>Turn on web search in the header to enhance responses with real-time information from the web.</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Tab Content with Animation */}
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  {/* Chat Tab */}
                  {activeTab === 'chat' && (
                    <motion.div 
                      key="chat-tab"
                      className={`h-full flex flex-col transition-colors duration-300 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}
                      variants={tabContentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      {/* Chat messages */}
                      <div className="flex-1 overflow-y-auto p-5">
                        {messages.filter(m => m.role !== 'system').map((message, index) => (
                          renderMessage(message, index))
                        )}
                        {isLoading && (
                          <div className="text-left mb-4">
                            <div className={`
                              inline-block max-w-[80%] px-5 py-3 rounded-2xl transition-colors duration-300
                              ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'}
                            `}>
                              <div className="flex space-x-3">
                                <div className="w-2 h-2 rounded-full bg-current animate-bounce"></div>
                                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={messageEndRef} />
                      </div>
                      
                      {/* Chat input */}
                      <motion.form 
                        onSubmit={handleSubmit} 
                        animate={{
                          backgroundColor: darkMode ? 'rgb(30, 41, 59)' : 'rgb(248, 250, 252)',
                          borderColor: darkMode ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)'
                        }}
                        className="p-4 border-t flex items-center"
                      >
                        <motion.input
                          ref={inputRef}
                          type="text"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Ask about your portfolio..."
                          disabled={isLoading}
                          animate={{
                            backgroundColor: darkMode ? 'rgb(15, 23, 42)' : 'rgb(255, 255, 255)',
                            color: darkMode ? 'rgb(255, 255, 255)' : 'rgb(30, 41, 59)',
                            borderColor: darkMode ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)'
                          }}
                          className="flex-1 px-5 py-3 rounded-full focus:outline-none transition-all border shadow-sm focus:ring-2 focus:ring-emerald-500/50"
                        />
                        <Button
                          type="submit"
                          disabled={isLoading || !input.trim()}
                          className={`
                            ml-2 h-12 w-12 p-0 rounded-full flex items-center justify-center
                            ${darkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-400'}
                            transition-all duration-200
                          `}
                        >
                          <Send className="h-5 w-5 text-white" />
                        </Button>
                      </motion.form>
                    </motion.div>
                  )}
                  
                  {/* Stocks Tab */}
                  {activeTab === 'stocks' && (
                    <motion.div 
                      key="stocks-tab"
                      className="h-full overflow-y-auto p-5"
                      variants={enhancedTabVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <motion.h3 
                        className={`text-lg font-semibold mb-4 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-800'}`}
                        variants={cardItemVariants}
                      >
                        Popular Stocks
                      </motion.h3>
                      
                      {isStockLoading ? (
                        <div className="flex justify-center items-center h-64">
                          <div className="flex space-x-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500 animate-bounce"></div>
                            <div className="w-3 h-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-3 h-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        </div>
                      ) : stockData.length > 0 ? (
                        <div>
                          <motion.div 
                            variants={cardItemVariants}
                            className={`text-sm mb-4 transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}
                          >
                            Click on any stock to ask the assistant about it
                          </motion.div>
                          {stockData.map((stock, index) => (
                            <motion.div
                              key={stock.symbol}
                              variants={cardItemVariants}
                              custom={index}
                            >
                              {renderStockCard(stock)}
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <motion.div 
                          className={`p-4 rounded-xl mb-4 transition-colors duration-300 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}
                          variants={cardItemVariants}
                          animate={{
                            backgroundColor: darkMode ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)'
                          }}
                        >
                          <p className={`text-sm transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            Unable to load stock data. Please try again later.
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                  
                  {/* Crypto Tab */}
                  {activeTab === 'crypto' && (
                    <motion.div 
                      key="crypto-tab"
                      className="h-full overflow-y-auto p-5"
                      variants={enhancedTabVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <motion.h3 
                        className={`text-lg font-semibold mb-4 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-800'}`}
                        variants={cardItemVariants}
                      >
                        Top Cryptocurrencies
                      </motion.h3>
                      
                      {isCryptoLoading ? (
                        <div className="flex justify-center items-center h-64">
                          <div className="flex space-x-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce"></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        </div>
                      ) : cryptoData.length > 0 ? (
                        <div>
                          <motion.div 
                            variants={cardItemVariants}
                            className={`text-sm mb-4 transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}
                          >
                            Click on any cryptocurrency to ask the assistant about it
                          </motion.div>
                          {cryptoData.map((crypto, index) => (
                            <motion.div
                              key={crypto.id}
                              variants={cardItemVariants}
                              custom={index}
                            >
                              {renderCryptoCard(crypto)}
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <motion.div 
                          className={`p-4 rounded-xl mb-4`}
                          variants={cardItemVariants}
                          animate={{
                            backgroundColor: darkMode ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)'
                          }}
                        >
                          <p className={`text-sm transition-colors duration-300 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                            Unable to load cryptocurrency data. Please try again later.
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                  
                  {/* Insights Tab */}
                  {activeTab === 'insights' && (
                    <motion.div 
                      key="insights-tab"
                      className="h-full overflow-y-auto p-5"
                      variants={tabContentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                    >
                      <h3 className={`text-lg font-semibold mb-4 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                        Financial Insights
                      </h3>
                      
                      {insights.length > 0 ? (
                        <div>
                          <div className={`text-sm mb-4 transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Charts created by the AI assistant
                          </div>
                          {insights.map((insight, index) => (
                            <motion.div
                              key={insight.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ 
                                duration: 0.3,
                                delay: index * 0.1,
                                type: "spring",
                                stiffness: 100
                              }}
                            >
                              {renderInsightCard(insight)}
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <motion.div 
                          className={`p-6 rounded-xl mb-4 text-center`}
                          animate={{
                            backgroundColor: darkMode ? 'rgb(30, 41, 59)' : 'rgb(241, 245, 249)'
                          }}
                        >
                          <BarChart4 className="mx-auto h-12 w-12 mb-3 transition-colors duration-300" style={{ color: darkMode ? 'rgb(71, 85, 105)' : 'rgb(148, 163, 184)' }} />
                          <h4 className={`text-lg font-medium mb-2 transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                            No insights yet
                          </h4>
                          <p className={`text-sm max-w-md mx-auto transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Ask the assistant to create charts for stocks or cryptocurrencies.
                            For example, try asking "Show me a chart for Apple stock"
                          </p>
                          <Button
                            onClick={() => {
                              setActiveTab('chat');
                              setInput('Show me a chart of the S&P 500 vs Bitcoin over the last month');
                              setTimeout(() => {
                                inputRef.current?.focus();
                              }, 100);
                            }}
                            className="mt-4 transition-colors duration-300"
                            style={{ 
                              backgroundColor: darkMode ? 'rgb(51, 65, 85)' : 'rgb(226, 232, 240)',
                              color: darkMode ? 'rgb(248, 250, 252)' : 'rgb(30, 41, 59)'
                            }}
                            variant="outline"
                          >
                            Create example chart
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}