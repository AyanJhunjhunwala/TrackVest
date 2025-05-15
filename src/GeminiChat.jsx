import React, { useState, useRef, useEffect } from 'react';
import { Button } from "./components/ui/button";
import { MessageSquare, X, Send, Search, ChevronRight, BarChart4, LineChart, Zap, Lightbulb } from 'lucide-react';
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
const genAI = new GoogleGenerativeAI(localStorage.getItem('geminiApiKey') || "AIzaSyDJ7tT1DyZ4FnSWIc4UazjYL4gGCo6vN0Y");

// Replace Polygon dependency with alternative APIs
const CRYPTO_ICON_API = "https://cryptocurrencyliveprices.com/img/";
const CRYPTO_PRICE_API = "https://api.coingecko.com/api/v3";
const STOCK_DATA_API = "https://www.alphavantage.co/query";

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

// Fetch crypto data from CoinGecko API instead of Polygon
const fetchTopCryptos = async (limit = 10) => {
  try {
    const response = await fetch(`${CRYPTO_PRICE_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=true`);
    const data = await response.json();
    return data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      image: coin.image,
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

// Fetch stock data using Alpha Vantage instead of Polygon
const fetchPopularStocks = async () => {
  // Popular tech and finance stocks
  const popularTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM', 'V', 'NVDA', 'BAC'];
  const alphaVantageKey = localStorage.getItem('alphaVantageApiKey') || "demo";
  
  try {
    // Since we can't batch requests with the free API, we'll use a demo endpoint for quick display
    // In production, you'd make individual calls for each stock with a proper API key
    const results = await Promise.all(
      popularTickers.map(async (ticker) => {
        try {
          const response = await fetch(`${STOCK_DATA_API}?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${alphaVantageKey}`);
          const data = await response.json();
          
          // If using demo key, we'll get rate limited, so create mock data
          if (data['Note'] || !data['Global Quote'] || Object.keys(data['Global Quote']).length === 0) {
            // Generate realistic mock data if API is rate limited
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
              changePercent: (mockChange / mockPrice * 100).toFixed(2),
              isMock: true
            };
          }
          
          const quote = data['Global Quote'];
          return {
            symbol: ticker,
            price: parseFloat(quote['05. price']).toFixed(2),
            change: parseFloat(quote['09. change']).toFixed(2),
            changePercent: parseFloat(quote['10. change percent'].replace('%', '')).toFixed(2),
            isMock: false
          };
        } catch (error) {
          console.error(`Error fetching data for ${ticker}:`, error);
          return {
            symbol: ticker,
            price: '0.00',
            change: '0.00',
            changePercent: '0.00',
            error: true
          };
        }
      })
    );
    
    return results.filter(stock => !stock.error);
  } catch (error) {
    console.error('Error fetching stock data:', error);
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

  // Add portfolio data to system prompt when component mounts or data changes
  useEffect(() => {
    const marketDataText = getMarketDataText();
    const newsText = getNewsText();
    
    setMessages([
      { 
        role: 'system', 
        content: `You are a helpful financial assistant for TrackVest users. You have access to the user's investment portfolio:

${portfolioSummaryText}${marketDataText}${newsText}

${FINANCIAL_KNOWLEDGE}

You can fetch real-time data for stocks, crypto, and real estate markets to enhance your responses.

You can also generate interactive charts for users. Suggest charts when relevant, such as:
- Stock price charts (e.g., "Show me a chart for AAPL")
- Portfolio allocation charts
- Sector breakdown charts
- Performance comparison charts (e.g., "Compare MSFT, GOOGL, and AMZN")

When users ask about their portfolio:
1. Provide concise, accurate information about their investments
2. For performance questions, focus on values, changes, and percentages
3. Offer insights about asset allocation and diversification
4. Be specific about individual holdings when asked
5. Be friendly but professional`
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
      
      const prompt = `
        ${input}
        
        VERY IMPORTANT: In your response, list any stock ticker symbols mentioned in the query or that are relevant to this topic.
        Format them exactly like this at the end of your response:
        TICKER_SYMBOLS: AAPL, MSFT, GOOGL
        
        Do NOT include square brackets, just use a comma-separated list.
        For example: "TICKER_SYMBOLS: AAPL, MSFT, GOOGL"
        If no ticker symbols are relevant, still include "TICKER_SYMBOLS: NONE"
        Only include actual ticker symbols, not company names or other words.
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
          .slice(0, 3) // Limit to maximum 3 tickers to avoid rate limiting
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
      
      // If we have ticker symbols, create charts for them
      if (tickerSymbols.length > 0) {
        // Only create comparison charts if explicitly requested
        const isComparison = input.toLowerCase().includes('compar') || 
                             input.toLowerCase().includes('versus') || 
                             input.toLowerCase().includes(' vs ') ||
                             input.toLowerCase().includes(' vs. ');
        
        const timeframeMatch = input.match(/\b(\d+[dwmy])\b/i);
        const timeframe = timeframeMatch ? timeframeMatch[1].toLowerCase() : '1m';
        
        try {
          if (isComparison && tickerSymbols.length > 1) {
            console.log(`Creating comparison chart for: ${tickerSymbols.join(', ')}`);
            
            // Create a comparison chart
            const chartId = `comparison_${Date.now()}`;
            
            // Create custom comparison chart data
            const comparisonData = createTestComparisonChart(tickerSymbols, timeframe);
            
            // Add to chart system via emitter
            chartEmitter.updateChart(chartId, comparisonData);
            
            const chartMessage = { 
              role: 'assistant', 
              content: `I've added a comparison chart for ${tickerSymbols.join(', ')} to your Insights tab using market data.`
            };
            setMessages(prev => [...prev, chartMessage]);
          } else {
            // Create separate charts for each ticker
            for (const symbol of tickerSymbols) {
              console.log(`Creating chart for: ${symbol}`);
              
              // Create a single stock chart with test data
              const chartId = `stock_${symbol}_${Date.now()}`;
              const stockChartData = createTestStockChart(symbol, timeframe);
              
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
            src={crypto.image} 
            alt={crypto.name} 
            className="w-10 h-10 rounded-full mr-4"
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
          ${stock.isMock ? 'relative overflow-hidden' : ''}
        `}
        onClick={() => {
          setInput(`Tell me about ${getCompanyName(stock.symbol)} (${stock.symbol}) stock`);
          setActiveTab('chat');
          setTimeout(() => {
            inputRef.current?.focus();
          }, 100);
        }}
      >
        {stock.isMock && (
          <div className="absolute right-0 top-0">
            <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-500 rounded-bl-lg">
              Sample
            </span>
          </div>
        )}
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

  // Render an insight card
  const renderInsightCard = (insight) => {
    const { id, data, createdAt } = insight;
    const isComparisonChart = id.startsWith('comparison_');
    
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
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            {isComparisonChart 
              ? `Comparison: ${data.series.map(s => s.name).join(' vs ')}`
              : `${data.chartConfig?.title || 'Stock Chart'}`
            }
          </h3>
          <div className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Created {new Date(createdAt).toLocaleString()}
          </div>
        </div>
        
        <div className="p-4 h-64">
          {isComparisonChart ? (
            <ComparisonChart 
              data={data.chartConfig.data} 
              series={data.series}
              xKey={data.chartConfig.xKey} 
              title={data.chartConfig.title} 
              darkMode={darkMode}
            />
          ) : (
            <Chart 
              data={data.chartConfig.data} 
              xKey={data.chartConfig.xKey} 
              yKey={data.chartConfig.yKey} 
              title={data.chartConfig.title} 
              darkMode={darkMode}
            />
          )}
        </div>
      </motion.div>
    );
  };

  // Tab data for navigation
  const tabs = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'stocks', label: 'Stocks', icon: <LineChart className="h-4 w-4" /> },
    { id: 'crypto', label: 'Crypto', icon: <BarChart4 className="h-4 w-4" /> },
    { id: 'insights', label: 'Insights', icon: <Lightbulb className="h-4 w-4" /> }
  ];

  // Handle input submission
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    sendMessage();
  };

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
              transition-all duration-200 h-auto
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
            <div className={`
              ${darkMode ? 'bg-slate-900 shadow-slate-900/20' : 'bg-white shadow-slate-400/30'} 
              rounded-2xl shadow-xl overflow-hidden w-[450px] h-[650px] flex flex-col
              border ${darkMode ? 'border-slate-700' : 'border-slate-200'}
            `}>
              {/* Chat header */}
              <div className={`
                px-5 py-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} 
                border-b flex items-center justify-between
              `}>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
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
                  <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                    Powered by Gemini
                  </span>
                </div>
              </div>
              
              {/* Tab Navigation */}
              <div className={`px-2 py-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} border-b`}>
                <div className="flex space-x-1">
                  {tabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${activeTab === tab.id
                          ? darkMode
                            ? 'bg-slate-700 text-white'
                            : 'bg-white shadow-sm text-slate-800'
                          : darkMode
                            ? 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
                            : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
                        }
                      `}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Google CSE Search Box */}
              {showSearch && (
                <div className="p-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="gcse-search"></div>
                </div>
              )}
              
              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                {/* Chat Tab */}
                {activeTab === 'chat' && (
                  <div className={`h-full flex flex-col ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    {/* Chat messages */}
                    <div className="flex-1 overflow-y-auto p-5">
                      {messages.filter(m => m.role !== 'system').map((message, index) => (
                        renderMessage(message, index))
                      )}
                      {isLoading && (
                        <div className="text-left mb-4">
                          <div className={`
                            inline-block max-w-[80%] px-5 py-3 rounded-2xl
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
                    <form onSubmit={handleSubmit} className={`
                      p-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} 
                      border-t flex items-center
                    `}>
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your portfolio..."
                        disabled={isLoading}
                        className={`
                          flex-1 px-5 py-3 rounded-full focus:outline-none transition-all
                          ${darkMode 
                            ? 'bg-slate-900 text-white border-slate-700 focus:ring-2 focus:ring-emerald-500/50' 
                            : 'bg-white text-slate-800 border-slate-200 focus:ring-2 focus:ring-emerald-500/50'}
                          border shadow-sm
                        `}
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
                    </form>
                  </div>
                )}
                
                {/* Stocks Tab */}
                {activeTab === 'stocks' && (
                  <div className="h-full overflow-y-auto p-5">
                    <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      Popular Stocks
                    </h3>
                    
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
                        <div className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Click on any stock to ask the assistant about it
                        </div>
                        {stockData.map(stock => renderStockCard(stock))}
                      </div>
                    ) : (
                      <div className={`p-4 rounded-xl mb-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          Unable to load stock data. Please try again later.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Crypto Tab */}
                {activeTab === 'crypto' && (
                  <div className="h-full overflow-y-auto p-5">
                    <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      Top Cryptocurrencies
                    </h3>
                    
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
                        <div className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Click on any cryptocurrency to ask the assistant about it
                        </div>
                        {cryptoData.map(crypto => renderCryptoCard(crypto))}
                      </div>
                    ) : (
                      <div className={`p-4 rounded-xl mb-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                          Unable to load cryptocurrency data. Please try again later.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Insights Tab */}
                {activeTab === 'insights' && (
                  <div className="h-full overflow-y-auto p-5">
                    <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                      Financial Insights
                    </h3>
                    
                    {insights.length > 0 ? (
                      <div>
                        <div className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Charts created by the AI assistant
                        </div>
                        {insights.map(insight => renderInsightCard(insight))}
                      </div>
                    ) : (
                      <div className={`p-6 rounded-xl mb-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} text-center`}>
                        <BarChart4 className={`mx-auto h-12 w-12 mb-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                        <h4 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                          No insights yet
                        </h4>
                        <p className={`text-sm max-w-md mx-auto ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
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
                          className={`mt-4 ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}
                          variant="outline"
                        >
                          Create example chart
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}