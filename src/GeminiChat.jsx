import React, { useState, useRef, useEffect } from 'react';
import { Button } from "./components/ui/button";
import { MessageSquare, X, Send, Search, ChevronRight, BarChart4, LineChart, Zap, Lightbulb, TrendingUp, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Chart from "./components/ui/Chart";
import ComparisonChart from "./components/ui/ComparisonChart";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
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
import { createTestStockChart, createTestComparisonChart } from './utils/directChartGenerator';

// Initialize Google Generative AI with API key
const genAI = new GoogleGenerativeAI(localStorage.getItem('geminiApiKey') || "");

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
            // Dynamic properties for each asset will be handled by the model
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

// Cache for storing generated chart data
const chartCache = new Map();

// Function to directly add a chart to the insights system via chartEmitter
function directlyAddChartToInsights(chartData, chartType = 'custom') {
  // Generate a unique ID for the chart
  const chartId = `${chartType}_${Date.now()}`;
  console.log(`Adding chart to Insights with ID: ${chartId}`, chartData);
  
  // Directly update the chart via the emitter
  chartEmitter.updateChart(chartId, chartData);
  
  return chartId;
}

// Market day timestamps - regular US market hours (9:30 AM - 4:00 PM ET)
const getMarketDayTimestamps = () => {
  const timestamps = [];
  const now = new Date();
  
  // Set to current date
  const marketOpen = new Date(now);
  marketOpen.setHours(9, 30, 0, 0); // 9:30 AM ET
  
  const marketClose = new Date(now);
  marketClose.setHours(16, 0, 0, 0); // 4:00 PM ET
  
  // Generate 10 evenly spaced timestamps throughout trading day
  const interval = (marketClose - marketOpen) / 9; // 9 intervals for 10 points
  
  for (let i = 0; i < 10; i++) {
    const timestamp = new Date(marketOpen.getTime() + (interval * i));
    timestamps.push(timestamp.toISOString());
  }
  
  return timestamps;
};

// Search results state
const useGoogleSearch = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const performSearch = (query) => {
    setIsSearching(true);
    
    // Google CSE API is loaded asynchronously, so we need to wait
    if (window.google && window.google.search) {
      const searchExecute = new window.google.search.cse.element.AllElement({
        gname: 'gsearch',
        result_callback: (results) => {
          if (results && results.cursor && results.cursor.pages) {
            setSearchResults(results);
          }
          setIsSearching(false);
        }
      });
      
      searchExecute.execute(query);
    } else {
      console.error('Google Search not loaded yet');
      setIsSearching(false);
    }
  };
  
  return { searchResults, isSearching, performSearch };
};

// Generate chart code using Gemini API with function calling
const generateChartCodeWithGemini = async (chartRequest) => {
  try {
    // If we have this chart in cache, return it
    const cacheKey = JSON.stringify(chartRequest);
    if (chartCache.has(cacheKey)) {
      console.log('Chart found in cache, returning cached version');
      return chartCache.get(cacheKey);
    }
    
    console.log('Generating chart with Gemini API using function calling');
    
    // Create a prompt for Gemini to generate the chart
    const chartType = chartRequest.type;
    const symbols = chartRequest.symbols || [chartRequest.symbol];
    const timeframe = chartRequest.timeframe || '1m';
    
    let prompt = '';
    let functionDeclarations = [];
    
    if (chartType === 'comparison' && symbols.length > 1) {
      prompt = `Create a comparison chart showing performance for ${symbols.join(', ')} over a ${timeframe} timeframe.`;
      functionDeclarations = [comparisonChartFunctionDeclaration];
    } else if (chartType === 'bar') {
      prompt = `Create a bar chart showing ${chartRequest.title || 'performance metrics'} for ${symbols[0]}.`;
      functionDeclarations = [barChartFunctionDeclaration];
    } else {
      prompt = `Create a line chart for ${symbols[0]} stock price over a ${timeframe} timeframe.`;
      functionDeclarations = [lineChartFunctionDeclaration];
    }
    
    // Call Gemini API using function calling with the updated API
    const result = await genAI.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048
      },
      tools: [{
        functionDeclarations: functionDeclarations
      }]
    });
    
    let chartData = null;
    
    // Check for function calls in the response
    const response = result.response;
    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0];
      console.log(`Function to call: ${functionCall.name}`);
      console.log(`Arguments:`, functionCall.args);
      
      if (functionCall.name === 'create_line_chart') {
        // Process the line chart data
        chartData = {
          chartConfig: {
            type: chartType || 'line',
            data: functionCall.args.data,
            xKey: functionCall.args.xKey,
            yKey: functionCall.args.yKey,
            title: functionCall.args.title
          }
        };
      } else if (functionCall.name === 'create_comparison_chart') {
        // Process the comparison chart data
        chartData = {
          chartConfig: {
            type: 'comparison',
            data: functionCall.args.data,
            xKey: functionCall.args.xKey,
            title: functionCall.args.title
          },
          series: functionCall.args.series
        };
      } else if (functionCall.name === 'create_bar_chart') {
        // Convert bar chart data to format expected by our chart component
        const barData = functionCall.args.labels.map((label, index) => ({
          name: label,
          value: functionCall.args.values[index]
        }));
        
        chartData = {
          chartConfig: {
            type: 'bar',
            data: barData,
            xKey: 'name',
            yKey: 'value',
            title: functionCall.args.title
          }
        };
      }
      
      // Store in cache if we got valid chart data
      if (chartData) {
        chartCache.set(cacheKey, chartData);
        console.log('Generated chart data:', chartData);
        return chartData;
      }
    } else {
      console.error('No function call found in response');
      console.log(response.text());
    }
    
    // Fallback to the local generator if function calling didn't work
    console.log('Falling back to local chart generator');
    const fallbackData = generateChartResponse(chartRequest);
    chartCache.set(cacheKey, fallbackData);
    return fallbackData;
  } catch (error) {
    console.error('Error generating chart with Gemini:', error);
    // Fallback to local chart generator
    const fallbackData = generateChartResponse(chartRequest);
    return fallbackData;
  }
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
    const response = await fetch(`${CRYPTO_PRICE_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true`);
    const data = await response.json();
    
    return data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image || `https://assets.coincap.io/assets/icons/${coin.symbol.toLowerCase()}@2x.png`,
      current_price: coin.current_price,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      market_cap: coin.market_cap,
      sparkline: coin.sparkline_in_7d?.price || []
    }));
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    return [];
  }
};

// Fetch stock data using mock data generator
const fetchPopularStocks = async () => {
  // Popular tech and finance stocks
  const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM', 'V', 'NVDA', 'BAC'];
  
  try {
    // Generate mock data for popular stocks
    const results = popularTickers.map(ticker => {
      // Create realistic mock data
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
        price: mockPrice.toFixed(2),
        change: mockChange.toFixed(2),
        changePercent: (mockChange / mockPrice * 100).toFixed(2)
      };
    });
    
    return results;
  } catch (error) {
    console.error('Error generating stock data:', error);
    return [];
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

export default function GeminiChat({ darkMode, positions = [], realEstateHoldings = [], onAddInsight }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'system', content: 'You are a helpful financial assistant powered by Gemini. You can provide information and insights about stocks, cryptocurrencies, and real estate investments.' },
    { role: 'assistant', content: 'Hello! I\'m your TrackVest assistant. Ask me about your portfolio, market data, or financial insights. I can also create charts that will appear in your Insights tab' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [marketData, setMarketData] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const [showSearch, setShowSearch] = useState(false);
  const [cryptoData, setCryptoData] = useState([]);
  const [stockData, setStockData] = useState([]);
  const [isCryptoLoading, setIsCryptoLoading] = useState(false);
  const [isStockLoading, setIsStockLoading] = useState(false);
  const { searchResults, isSearching, performSearch } = useGoogleSearch();
  const messageEndRef = useRef(null);
  const inputRef = useRef(null);
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

The portfolio data above contains the user's ACTUAL holdings. You must use this information when answering questions about their portfolio. For example:
- When they ask "How many shares of MSFT do I have?" - look at the actual data above
- When they ask about their real estate - provide details from the actual properties they own
- When they ask about their crypto - reference their actual cryptocurrency holdings

You can fetch real-time data for stocks, crypto, and real estate markets to enhance your responses.

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

If users ask to "feed in" additional data, remind them they can use the Import Portfolio button in the header to add their custom investment data.`
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

  // Updated sendMessage function to also track when charts are created
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Send all prompts to Gemini API
      console.log("Sending message to Gemini API:", input);
      
      // Create a Gemini model using the proper method
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      // Get current portfolio data for directly including in each prompt
      const currentPortfolioSummaryText = createPortfolioSummaryText(formatPortfolioData(positions, realEstateHoldings));
      
      const prompt = `
        ${input}
        
        IMPORTANT: I'm providing you with the user's current portfolio data right now. You MUST use this information to answer questions about their holdings:
        
        ${currentPortfolioSummaryText}
        
        VERY IMPORTANT: In your response, list ONLY stock ticker symbols that are explicitly mentioned in the query. Do not add any tickers that were not mentioned by the user.
        
        For comparison charts:
        - If user requests "compare AAPL and MSFT", return exactly these two: AAPL, MSFT
        - If user requests "compare AAPL, MSFT, and GOOGL", return exactly these three: AAPL, MSFT, GOOGL
        - Do not add extra tickers beyond what was explicitly requested
        
        Format them exactly like this at the end of your response:
        TICKER_SYMBOLS: AAPL, MSFT, GOOGL
        
        Do NOT include square brackets, just use a comma-separated list.
        If no ticker symbols are mentioned, include "TICKER_SYMBOLS: NONE"
        Only include actual ticker symbols, not company names or other words.
        
        WHEN DISCUSSING THE USER'S PORTFOLIO:
        - If asked about specific stocks, check the portfolio data above and provide precise information including shares, value, etc.
        - If asked about specific cryptocurrencies, check the portfolio data above and provide precise information
        - If asked about real estate holdings, provide all relevant details like value, equity, mortgage, etc.
        - For any holdings NOT in the user's portfolio, clearly indicate this
        
        CHART CREATION RULES:
        - ONLY create charts when the user explicitly asks for a chart or graph
        - Do NOT extract ticker symbols for charts unless the user clearly wants a visualization
        - Example chart requests: "show me a chart for AAPL", "create a graph of my stocks", "visualize MSFT performance"
        - For general questions about holdings, just provide the text information, not charts
        
        If the user asks about importing or feeding in more data, explain they can use the "Import Portfolio" button in the header.
        
        Give me condensed outputs and properly formatted.
      `;
      
      // Call generateContent on the model instance with error handling
      let result;
      try {
        result = await model.generateContent([
          { text: prompt }
        ]);
      } catch (apiError) {
        console.error("Gemini API error:", apiError);
        // Add an error message and return early
        const errorMessage = { 
          role: 'assistant', 
          content: `I'm sorry, I encountered an error connecting to the AI service. Please try again in a moment.`
        };
        setMessages(prev => [...prev, errorMessage]);
        setIsLoading(false);
        return;
      }
      
      const responseText = result.response.text();
      console.log("Gemini API response:", responseText);
      
      // Extract ticker symbols from response
      const tickerMatch = responseText.match(/TICKER_SYMBOLS:\s*(.*?)(?:\n|$)/);
      const tickerSymbols = tickerMatch ? 
        tickerMatch[1]
          .replace(/[\[\]]/g, '') // Remove any square brackets if present
          .split(',')
          .map(t => t.trim())
          .filter(t => t !== 'NONE' && t.length > 0)
        : [];
      
      console.log("Extracted tickers:", tickerSymbols);
      
      // Clean response to remove the TICKER_SYMBOLS line
      const cleanResponse = responseText.replace(/TICKER_SYMBOLS:.*?(\n|$)/g, '').trim();
      
      // Create an assistant message with the response
      const assistantMessage = { 
        role: 'assistant', 
        content: cleanResponse
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Determine if a chart was actually requested
      const chartRequestKeywords = ['chart', 'graph', 'plot', 'visualize', 'visualization', 'show me'];
      const containsChartRequest = chartRequestKeywords.some(keyword => 
        input.toLowerCase().includes(keyword)
      );
      
      // Only create charts if explicitly requested and we have ticker symbols
      if (containsChartRequest && tickerSymbols.length > 0) {
        // Check for comparison intent by looking for comparison words
        const isComparison = input.toLowerCase().includes('compar') || 
                             input.toLowerCase().includes('versus') || 
                             input.toLowerCase().includes(' vs ') ||
                             input.toLowerCase().includes(' vs. ');
        
        const timeframeMatch = input.match(/\b(\d+[dwmy])\b/i);
        const timeframe = timeframeMatch ? timeframeMatch[1].toLowerCase() : '1m';
        
        try {
          // Create a comparison chart if explicitly requested AND we have multiple tickers
          if (isComparison && tickerSymbols.length > 1) {
            console.log(`Creating comparison chart for ${tickerSymbols.length} symbols: ${tickerSymbols.join(', ')}`);
            
            // Create a comparison chart
            const chartId = `comparison_${Date.now()}`;
            
            // Create custom comparison chart data with exactly the requested symbols
            const comparisonData = await createTestComparisonChart(tickerSymbols, timeframe);
            
            // Add to chart system via emitter
            chartEmitter.updateChart(chartId, comparisonData);
            
            const chartMessage = { 
              role: 'assistant', 
              content: `I've added a comparison chart for ${tickerSymbols.join(', ')} to your Insights tab.`
            };
            setMessages(prev => [...prev, chartMessage]);
          } else if (containsChartRequest) {
            // Create separate charts for each ticker, but only if a chart was requested
            for (const symbol of tickerSymbols) {
              console.log(`Creating chart for: ${symbol}`);
              
              // Create a single stock chart with test data
              const chartId = `stock_${symbol}_${Date.now()}`;
              const stockChartData = await createTestStockChart(symbol, timeframe);
              
              // Add to chart system via emitter
              chartEmitter.updateChart(chartId, stockChartData);
            }
            
            const chartMessage = { 
              role: 'assistant', 
              content: `I've added charts for ${tickerSymbols.join(', ')} to your Insights tab.`
            };
            setMessages(prev => [...prev, chartMessage]);
          }
        } catch (chartError) {
          console.error("Error creating chart:", chartError);
          const chartErrorMessage = { 
            role: 'assistant', 
            content: `I tried to create a chart, but encountered an error. This might be due to API limitations.`
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
    
    return (
      <motion.div 
        key={index}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 * (index % 3) }}
        className={`p-4 my-3 rounded-2xl shadow-sm ${
          isUser 
          ? `${darkMode ? 'bg-blue-600 bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-blue-500 bg-gradient-to-br from-blue-400 to-blue-600'} text-white ml-auto` 
          : `${darkMode ? 'bg-slate-800 border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-white border border-slate-200 bg-gradient-to-br from-slate-50 to-white'} ${darkMode ? 'text-white' : 'text-slate-800'}`
        } ${isUser ? 'max-w-[80%]' : 'max-w-[90%]'}`}
      >
        <div className="mb-1 flex items-center">
          <div className={`w-7 h-7 mr-2 rounded-full flex items-center justify-center ${
            isUser ? (darkMode ? 'bg-blue-400' : 'bg-blue-400') : (darkMode ? 'bg-emerald-600' : 'bg-emerald-500')
          }`}>
            <span className="text-xs text-white font-bold">
              {isUser ? 'Y' : 'AI'}
            </span>
          </div>
          <span className={`text-xs font-medium ${isUser ? 'text-blue-200' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {isUser ? 'You' : 'TrackVest AI'}
          </span>
        </div>
        
        <div className="ml-8 text-sm leading-relaxed font-light">
          {message.content}
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
    const regenerateChartWithIndicators = () => {
      if (!data || !data.chartConfig) return;
      
      let updatedChartData;
      
      if (isComparisonChart) {
        // Extract symbols from comparison chart
        const symbols = data.series.filter(s => !s.dataKey.includes('_')).map(s => s.name);
        updatedChartData = createTestComparisonChart(symbols, '1m', true);
      } else {
        // Extract symbol from chart title
        const symbol = data.chartConfig.title.split(' ')[0];
        updatedChartData = createTestStockChart(symbol, '1m', indicatorsForThisChart);
      }
      
      // Update the chart using the chart emitter
      chartEmitter.updateChart(id, updatedChartData);
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
              {isComparisonChart 
                ? `Comparison: ${data.series?.filter(s => !s.dataKey.includes('_')).map(s => s.name).join(' vs ')}`
                : `${data.chartConfig?.title || 'Stock Chart'}`
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
          {isComparisonChart ? (
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
                <h3 className={`font-semibold transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  TrackVest AI Assistant
                </h3>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 rounded-full"
                    onClick={() => setShowSearch(!showSearch)}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                  <motion.span 
                    className={`text-xs px-2 py-1 rounded-full`}
                    animate={{
                      backgroundColor: darkMode ? 'rgba(5, 150, 105, 0.2)' : 'rgb(209, 250, 229)',
                      color: darkMode ? 'rgb(52, 211, 153)' : 'rgb(4, 120, 87)'
                    }}
                  >
                    Powered by Gemini
                  </motion.span>
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
                      backgroundColor: darkMode ? 'rgb(51, 65, 85)' : 'white',
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
              
              {/* Google CSE Search Box */}
              {showSearch && (
                <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="gcse-search"></div>
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
                            backgroundColor: darkMode ? 'rgb(15, 23, 42)' : 'white',
                            color: darkMode ? 'white' : 'rgb(30, 41, 59)',
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