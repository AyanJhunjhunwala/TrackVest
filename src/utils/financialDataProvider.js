/**
 * Financial Data Provider
 * 
 * Utility functions for fetching real-time financial data
 * to enhance our Groq chatbot with up-to-date information
 */

// Cache mechanism to avoid hitting API rate limits
const cache = {
  stocks: { data: {}, timestamp: 0 },
  crypto: { data: {}, timestamp: 0 },
  realEstate: { data: {}, timestamp: 0 },
  news: { data: [], timestamp: 0 }
};

// Cache expiration in milliseconds (15 minutes)
const CACHE_EXPIRATION = 15 * 60 * 1000;

// Polygon.io API key
const POLYGON_API_KEY = "9h2tWR97GWuVzS5a27bqgC4JjhC3H1uv";

// Helper function to get a date 2 days ago in YYYY-MM-DD format
const getApiDate = () => {
  const date = new Date();
  // Always go back 2 days to ensure data is available for free tier
  date.setDate(date.getDate() - 2);
  return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
};

/**
 * Fetch stock quote for a given symbol
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Object>} - Stock quote data
 */
export async function fetchStockQuote(symbol) {
  // Check cache first
  const now = Date.now();
  if (
    cache.stocks.data[symbol] && 
    now - cache.stocks.timestamp < CACHE_EXPIRATION
  ) {
    return cache.stocks.data[symbol];
  }

  try {
    // Polygon.io API - Daily Open/Close endpoint (free tier)
    const date = getApiDate();
    const response = await fetch(
      `https://api.polygon.io/v1/open-close/${symbol}/${date}?apiKey=${POLYGON_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stock data: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === "OK") {
      const quote = {
        symbol,
        price: data.close,
        change: data.close - data.open,
        percentChange: ((data.close - data.open) / data.open) * 100,
        volume: data.volume || 0,
        timestamp: new Date().toISOString()
      };
      
      // Update cache
      cache.stocks.data[symbol] = quote;
      cache.stocks.timestamp = now;
      
      return quote;
    } else {
      throw new Error("Invalid data format received");
    }
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error);
    // Return simulated data as fallback
    return {
      symbol,
      price: Math.random() * 1000 + 50,
      change: (Math.random() * 10) - 5,
      percentChange: (Math.random() * 5) - 2.5,
      volume: Math.floor(Math.random() * 10000000),
      timestamp: new Date().toISOString(),
      simulated: true
    };
  }
}

/**
 * Fetch crypto quote for a given symbol
 * @param {string} symbol - Crypto symbol
 * @returns {Promise<Object>} - Crypto quote data
 */
export async function fetchCryptoQuote(symbol) {
  // Check cache first
  const now = Date.now();
  if (
    cache.crypto.data[symbol] && 
    now - cache.crypto.timestamp < CACHE_EXPIRATION
  ) {
    return cache.crypto.data[symbol];
  }

  try {
    // Polygon.io API - Daily Open/Close endpoint for crypto (free tier)
    const date = getApiDate();
    const ticker = `X:${symbol}USD`; // Format: X:BTCUSD
    const response = await fetch(
      `https://api.polygon.io/v1/open-close/${ticker}/${date}?apiKey=${POLYGON_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch crypto data: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === "OK") {
      const quote = {
        symbol,
        price: data.close,
        change: data.close - data.open,
        percentChange: ((data.close - data.open) / data.open) * 100,
        volume: data.volume || 0,
        timestamp: new Date().toISOString()
      };
      
      // Update cache
      cache.crypto.data[symbol] = quote;
      cache.crypto.timestamp = now;
      
      return quote;
    } else {
      throw new Error("Invalid data format received");
    }
  } catch (error) {
    console.error(`Error fetching crypto data for ${symbol}:`, error);
    // Return simulated data as fallback
    return {
      symbol,
      price: symbol === 'BTC' ? 50000 + (Math.random() * 5000) : 2500 + (Math.random() * 500),
      change: (Math.random() * 500) - 250,
      percentChange: (Math.random() * 8) - 4,
      volume: Math.floor(Math.random() * 50000000),
      timestamp: new Date().toISOString(),
      simulated: true
    };
  }
}

/**
 * Fetch real estate market data for a region
 * @param {string} region - Region name (city or state)
 * @returns {Promise<Object>} - Real estate market data
 */
export async function fetchRealEstateData(region) {
  // Since there's no free real estate API, we'll simulate this data
  // In a real app, you'd integrate with a real estate data provider
  
  // Check cache first
  const cacheKey = region.toLowerCase();
  const now = Date.now();
  if (
    cache.realEstate.data[cacheKey] && 
    now - cache.realEstate.timestamp < CACHE_EXPIRATION
  ) {
    return cache.realEstate.data[cacheKey];
  }
  
  // Simulated data based on region
  let basePrice = 0;
  let appreciation = 0;
  let rentalYield = 0;
  
  switch(region.toLowerCase()) {
    case 'new york':
    case 'nyc':
    case 'new york city':
      basePrice = 1200000;
      appreciation = 4.2;
      rentalYield = 3.1;
      break;
    case 'san francisco':
    case 'sf':
    case 'bay area':
      basePrice = 1400000;
      appreciation = 5.1;
      rentalYield = 3.5;
      break;
    case 'austin':
    case 'austin, tx':
      basePrice = 650000;
      appreciation = 7.3;
      rentalYield = 4.2;
      break;
    case 'miami':
    case 'miami, fl':
      basePrice = 580000;
      appreciation = 8.1;
      rentalYield = 5.0;
      break;
    case 'denver':
    case 'denver, co':
      basePrice = 620000;
      appreciation = 6.2;
      rentalYield = 4.5;
      break;
    case 'seattle':
    case 'seattle, wa':
      basePrice = 880000;
      appreciation = 5.8;
      rentalYield = 3.8;
      break;
    default:
      basePrice = 450000;
      appreciation = 5.0;
      rentalYield = 4.0;
  }
  
  // Add some randomness to make it more realistic
  const variance = 0.15; // 15% variance
  basePrice = basePrice * (1 + (Math.random() * variance * 2 - variance));
  appreciation = appreciation * (1 + (Math.random() * variance * 2 - variance));
  rentalYield = rentalYield * (1 + (Math.random() * variance * 2 - variance));
  
  const data = {
    region,
    medianPrice: Math.round(basePrice),
    annualAppreciation: parseFloat(appreciation.toFixed(1)),
    rentalYield: parseFloat(rentalYield.toFixed(1)),
    daysOnMarket: Math.round(30 + Math.random() * 20),
    inventoryMonths: parseFloat((2 + Math.random() * 2).toFixed(1)),
    timestamp: new Date().toISOString(),
    simulated: true
  };
  
  // Update cache
  cache.realEstate.data[cacheKey] = data;
  cache.realEstate.timestamp = now;
  
  return data;
}

/**
 * Fetch financial news headlines
 * @param {string} category - News category (stocks, crypto, realestate)
 * @returns {Promise<Array>} - News headlines
 */
export async function fetchFinancialNews(category = 'general') {
  // Check cache first
  const now = Date.now();
  if (
    cache.news.data.length > 0 && 
    now - cache.news.timestamp < CACHE_EXPIRATION
  ) {
    // Filter cached news by category
    return cache.news.data.filter(item => 
      category === 'general' || item.category === category
    );
  }
  
  try {
    // For news, we'll use simulated data since Polygon.io doesn't offer free news API
    // In a production app, you might use a dedicated news API service
    const news = generateSimulatedNews('general');
    
    // Update cache
    cache.news.data = news;
    cache.news.timestamp = now;
    
    // Filter by category
    return news.filter(item => 
      category === 'general' || item.category === category
    );
  } catch (error) {
    console.error('Error fetching financial news:', error);
    // Return simulated data as fallback
    return generateSimulatedNews(category);
  }
}

/**
 * Determine news category based on content
 * @param {Object} newsItem - News item from API
 * @returns {string} - Category (stocks, crypto, realestate, general)
 */
function determineCategory(newsItem) {
  const text = `${newsItem.title} ${newsItem.summary}`.toLowerCase();
  
  // Check for crypto keywords
  if (/bitcoin|crypto|blockchain|ethereum|defi|nft|token|coin/i.test(text)) {
    return 'crypto';
  }
  
  // Check for real estate keywords
  if (/real estate|housing|property|mortgage|rent|home price|commercial property/i.test(text)) {
    return 'realestate';
  }
  
  // Default to stocks if it has stock terms
  if (/stock|market|index|nasdaq|dow|s&p|earnings|shares|investor/i.test(text)) {
    return 'stocks';
  }
  
  return 'general';
}

/**
 * Generate simulated news when API fails
 * @param {string} filterCategory - Category to filter by
 * @returns {Array} - Simulated news items
 */
function generateSimulatedNews(filterCategory = 'general') {
  const allNews = [
    {
      title: "S&P 500 Reaches New All-Time High Amid Strong Earnings",
      summary: "The S&P 500 index climbed to a record high today as major companies reported better-than-expected quarterly earnings.",
      url: "https://example.com/markets/sp500-record",
      source: "Financial Times",
      category: "stocks",
      timestamp: new Date().toISOString(),
      sentiment: 0.8,
      simulated: true
    },
    {
      title: "Bitcoin Surges Past $60,000 on ETF Approval News",
      summary: "Bitcoin price rose sharply following reports that regulatory authorities are considering approval for additional cryptocurrency ETFs.",
      url: "https://example.com/crypto/bitcoin-etf-surge",
      source: "CoinDesk",
      category: "crypto",
      timestamp: new Date().toISOString(),
      sentiment: 0.9,
      simulated: true
    },
    {
      title: "Housing Market Shows Signs of Cooling After Record Growth",
      summary: "After two years of record price increases, the housing market is showing early signs of deceleration as mortgage rates continue to rise.",
      url: "https://example.com/realestate/market-cooling",
      source: "Reuters",
      category: "realestate",
      timestamp: new Date().toISOString(),
      sentiment: -0.2,
      simulated: true
    },
    {
      title: "Tech Stocks Lead Market Decline Amid Interest Rate Concerns",
      summary: "Technology stocks faced significant pressure today as investors reacted to Federal Reserve comments suggesting continued interest rate hikes.",
      url: "https://example.com/markets/tech-stocks-decline",
      source: "CNBC",
      category: "stocks",
      timestamp: new Date().toISOString(),
      sentiment: -0.5,
      simulated: true
    },
    {
      title: "Ethereum Completes Major Network Upgrade",
      summary: "Ethereum successfully implemented its latest network upgrade, promising improved transaction speeds and lower gas fees for users.",
      url: "https://example.com/crypto/ethereum-upgrade",
      source: "CryptoNews",
      category: "crypto",
      timestamp: new Date().toISOString(),
      sentiment: 0.7,
      simulated: true
    },
    {
      title: "Commercial Real Estate Faces Challenges as Remote Work Persists",
      summary: "Office building owners continue to navigate a challenging environment as many companies extend remote work policies and reduce physical office space.",
      url: "https://example.com/realestate/commercial-challenges",
      source: "Wall Street Journal",
      category: "realestate",
      timestamp: new Date().toISOString(),
      sentiment: -0.3,
      simulated: true
    }
  ];
  
  // Filter by category if specified
  return filterCategory === 'general' 
    ? allNews 
    : allNews.filter(item => item.category === filterCategory);
}

/**
 * Get basic market indices data
 * @returns {Promise<Object>} - Market indices data
 */
export async function getMarketIndices() {
  // In a real implementation, you would fetch this from an API
  // For now, we'll return simulated data
  
  return {
    "S&P 500": {
      value: 5127 + (Math.random() * 50 - 25),
      change: parseFloat((Math.random() * 2 - 1).toFixed(2)),
      percentChange: parseFloat((Math.random() * 3 - 1.5).toFixed(2))
    },
    "Dow Jones": {
      value: 38952 + (Math.random() * 200 - 100),
      change: parseFloat((Math.random() * 150 - 75).toFixed(2)),
      percentChange: parseFloat((Math.random() * 3 - 1.5).toFixed(2))
    },
    "Nasdaq": {
      value: 17718 + (Math.random() * 150 - 75),
      change: parseFloat((Math.random() * 100 - 50).toFixed(2)),
      percentChange: parseFloat((Math.random() * 3.5 - 1.75).toFixed(2))
    },
    "Russell 2000": {
      value: 2063 + (Math.random() * 30 - 15),
      change: parseFloat((Math.random() * 20 - 10).toFixed(2)),
      percentChange: parseFloat((Math.random() * 2.8 - 1.4).toFixed(2))
    },
    "Bitcoin": {
      value: 66120 + (Math.random() * 1000 - 500),
      change: parseFloat((Math.random() * 500 - 250).toFixed(2)),
      percentChange: parseFloat((Math.random() * 5 - 2.5).toFixed(2))
    },
    "Ethereum": {
      value: 3354 + (Math.random() * 100 - 50),
      change: parseFloat((Math.random() * 50 - 25).toFixed(2)),
      percentChange: parseFloat((Math.random() * 4.5 - 2.25).toFixed(2))
    },
    timestamp: new Date().toISOString(),
    simulated: true
  };
} 