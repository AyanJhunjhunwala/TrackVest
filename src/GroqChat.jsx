import React, { useState, useRef, useEffect } from 'react';
import { Button } from "./components/ui/button";
import { MessageSquare, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Chart from "./components/ui/Chart";
import ComparisonChart from "./components/ui/ComparisonChart";
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

// Predefined financial data prompts
const FINANCIAL_KNOWLEDGE = `
You have extensive knowledge about financial markets, including:

1. Stocks: Market trends, fundamental and technical analysis, major indices, earnings reports, trading strategies
2. Crypto: Blockchain technology, cryptocurrencies, DeFi, NFTs, market dynamics, regulations
3. Real Estate: Market trends, investment strategies, rental income, property valuation, REITs
4. General investment: Asset allocation, diversification, risk management, tax considerations

Use this knowledge to provide helpful, accurate information when asked about financial topics.
`;

export default function GroqChat({ darkMode, positions = [], realEstateHoldings = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'system', content: 'You are a helpful financial assistant powered by Groq. You can provide information and insights about stocks, cryptocurrencies, and real estate investments.' },
    { role: 'assistant', content: 'Hello! I\'m your TrackVest assistant. Ask me about your portfolio, market data, or financial insights. I can also display charts - try asking: "Show me a chart for AAPL" or "Compare MSFT, GOOGL, and AMZN"' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [marketData, setMarketData] = useState(null);
  const [newsData, setNewsData] = useState([]);
  const messageEndRef = useRef(null);
  const inputRef = useRef(null);

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
      { role: 'assistant', content: 'Hello! I\'m your TrackVest assistant. Ask me about your portfolio, market data, or financial insights. I can also display charts - try asking: "Show me a chart for AAPL" or "Compare MSFT, GOOGL, and AMZN"' }
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

  // Handle sending messages to Groq API
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Check if the user is requesting a chart
      const chartRequest = parseChartRequest(input);
      
      if (chartRequest) {
        // Generate chart data
        const chartResponse = generateChartResponse(chartRequest);
        
        // Add special chart message
        const assistantMessage = { 
          role: 'assistant', 
          content: `Here's the ${chartRequest.type} chart you requested:`,
          chartData: chartResponse
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
        return;
      }

      // Check if the message is asking about specific financial data
      const userInput = input.toLowerCase();
      let additionalContext = '';
      
      // Check if user is asking about a specific stock
      const stockMatch = userInput.match(/(?:price|quote|how is|info|about)\s+([a-z]{1,5})(?:\s+stock)?/i);
      if (stockMatch && stockMatch[1]) {
        try {
          const symbol = stockMatch[1].toUpperCase();
          const stockData = await fetchStockQuote(symbol);
          if (stockData) {
            additionalContext = `\n\nReal-time data for ${symbol}: Price $${stockData.price.toFixed(2)}, Change: ${stockData.change > 0 ? '+' : ''}${stockData.change.toFixed(2)} (${stockData.percentChange > 0 ? '+' : ''}${stockData.percentChange.toFixed(2)}%)`;
          }
        } catch (error) {
          console.error('Error fetching stock data:', error);
        }
      }
      
      // Check if user is asking about a specific cryptocurrency
      const cryptoMatch = userInput.match(/(?:price|quote|how is|info|about)\s+(bitcoin|btc|ethereum|eth|crypto)/i);
      if (cryptoMatch && cryptoMatch[1]) {
        try {
          let symbol = cryptoMatch[1].toUpperCase();
          if (symbol === 'BITCOIN') symbol = 'BTC';
          if (symbol === 'ETHEREUM') symbol = 'ETH';
          
          const cryptoData = await fetchCryptoQuote(symbol);
          if (cryptoData) {
            additionalContext = `\n\nReal-time data for ${symbol}: Price $${cryptoData.price.toFixed(2)}`;
          }
        } catch (error) {
          console.error('Error fetching crypto data:', error);
        }
      }
      
      // Check if user is asking about real estate in a specific region
      const realEstateMatch = userInput.match(/(?:real estate|housing|property|home prices|market)\s+(?:in|at|around)\s+([a-z ]+)/i);
      if (realEstateMatch && realEstateMatch[1]) {
        try {
          const region = realEstateMatch[1].trim();
          const realEstateData = await fetchRealEstateData(region);
          if (realEstateData) {
            additionalContext = `\n\nReal estate data for ${region}: Median price $${realEstateData.medianPrice.toLocaleString()}, Annual appreciation: ${realEstateData.annualAppreciation}%, Average rental yield: ${realEstateData.rentalYield}%`;
          }
        } catch (error) {
          console.error('Error fetching real estate data:', error);
        }
      }
      
      // Check if user is asking for market news
      const newsMatch = userInput.match(/(news|headlines|recent|latest)/i);
      if (newsMatch) {
        try {
          const category = userInput.includes('crypto') ? 'crypto' : 
                          userInput.includes('real estate') ? 'realestate' :
                          userInput.includes('stock') ? 'stocks' : 'general';
          
          const news = await fetchFinancialNews(category);
          if (news.length > 0) {
            additionalContext = '\n\nLatest financial news:\n';
            news.slice(0, 3).forEach((item, index) => {
              additionalContext += `${index + 1}. ${item.title} - ${item.source}\n`;
            });
          }
        } catch (error) {
          console.error('Error fetching news:', error);
        }
      }

      // Add the contextual information to the messages array
      const contextMessage = additionalContext ? 
        { role: 'system', content: `Additional information to help answer the query:${additionalContext}` } : 
        null;
        
      const messagesForAPI = [...messages];
      if (contextMessage) {
        messagesForAPI.push(contextMessage);
      }
      messagesForAPI.push(userMessage);

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('groqApiKey') || "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"}`
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: messagesForAPI,
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = { 
        role: 'assistant', 
        content: data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your request. Please try again later.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input submission
  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage();
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

  // Render a message (modified to handle chart data)
  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const hasChart = message.chartData && !isUser;
    
    return (
      <div 
        key={index}
        className={`p-3 my-2 rounded-lg ${
          isUser 
          ? `${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white ml-auto` 
          : `${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'} ${darkMode ? 'text-white' : 'text-slate-800'}`
        } ${isUser ? 'max-w-[80%]' : 'max-w-[100%]'}`}
      >
        <div className="mb-1">
          <span className={`text-xs font-medium ${isUser ? 'text-blue-200' : darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {isUser ? 'You' : 'TrackVest AI'}
          </span>
        </div>
        
        <div>
          {message.content}
        </div>
        
        {/* Render chart if message contains chart data */}
        {hasChart && (
          <div className={`mt-4 p-3 rounded-md border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            {message.chartData.series ? (
              <ComparisonChart
                data={message.chartData.chartConfig.data}
                xKey={message.chartData.chartConfig.xKey}
                series={message.chartData.series}
                title={message.chartData.chartConfig.title}
                darkMode={darkMode}
              />
            ) : (
              <Chart
                type={message.chartData.chartConfig.type}
                data={message.chartData.chartConfig.data}
                xKey={message.chartData.chartConfig.xKey}
                yKey={message.chartData.chartConfig.yKey}
                title={message.chartData.chartConfig.title}
                darkMode={darkMode}
              />
            )}
          </div>
        )}
      </div>
    );
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
              rounded-full px-4 py-2 flex items-center gap-2 shadow-sm
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
              rounded-lg shadow-lg overflow-hidden w-[400px] h-[600px] flex flex-col
              border ${darkMode ? 'border-slate-700' : 'border-slate-200'}
            `}>
              {/* Chat header */}
              <div className={`
                px-4 py-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} 
                border-b flex items-center justify-between
              `}>
                <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  TrackVest AI Assistant
                </h3>
                <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                  Powered by Groq
                </span>
              </div>
              
              {/* Chat messages */}
              <div className={`
                flex-1 overflow-y-auto p-4 ${darkMode ? 'text-slate-200' : 'text-slate-700'}
              `}>
                {messages.filter(m => m.role !== 'system').map((message, index) => (
                  renderMessage(message, index))
                )}
                {isLoading && (
                  <div className="text-left mb-4">
                    <div className={`
                      inline-block max-w-[80%] px-4 py-2 rounded-lg rounded-tl-none
                      ${darkMode ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800'}
                    `}>
                      <div className="flex space-x-2">
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
                p-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} 
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
                    flex-1 px-4 py-2 rounded-full focus:outline-none
                    ${darkMode 
                      ? 'bg-slate-900 text-white border-slate-700 focus:ring-1 focus:ring-emerald-500' 
                      : 'bg-white text-slate-800 border-slate-200 focus:ring-1 focus:ring-emerald-500'}
                    border
                  `}
                />
                <Button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="ml-2 h-10 w-10 p-0 rounded-full flex items-center justify-center"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
} 