import { chartEmitter } from '../hooks/useChartSubscription';
import { restClient } from '@polygon.io/client-js';

// Polygon API key
const POLYGON_API_KEY = localStorage.getItem('polygonApiKey') || "9h2tWR97GWuVzS5a27bqgC4JjhC3H1uv";
const polygonClient = restClient(POLYGON_API_KEY);

// Map of active subscriptions
const activeSubscriptions = new Map();

// Cache for API responses
const dataCache = new Map();

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// API request queue to prevent too many concurrent requests
let requestQueue = [];
let isProcessingQueue = false;

// Add request to queue
const addToRequestQueue = (requestFn) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ requestFn, resolve, reject });
    processRequestQueue();
  });
};

// Process request queue with rate limiting
const processRequestQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  
  // Process first item in queue
  const { requestFn, resolve, reject } = requestQueue.shift();
  
  try {
    // Add a small delay between requests to avoid rate limiting
    const result = await requestFn();
    resolve(result);
  } catch (error) {
    reject(error);
  } finally {
    isProcessingQueue = false;
    
    // Process next item after a delay to avoid rate limiting
    setTimeout(() => {
      processRequestQueue();
    }, 300); // 300ms delay between requests
  }
};

// Retry function with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelayMs = 1000) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      // Only retry on rate limiting errors or network errors
      if ((error.status === 429 || error.name === 'NetworkError') && retries < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, retries);
        console.log(`Rate limited. Retrying after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
      } else {
        throw error;
      }
    }
  }
};

// Convert timeframe to API parameters
const timeframeToParams = (timeframe) => {
  // Default multiplier and timespan
  let multiplier = 1;
  let timespan = 'day';
  
  // Parse timeframe like "1d", "1w", "1m", "1y"
  const match = timeframe.match(/^(\d+)([dwmy])$/);
  if (match) {
    const [_, count, unit] = match;
    multiplier = parseInt(count, 10);
    
    // Convert to Polygon timespan format
    switch (unit) {
      case 'd': timespan = 'day'; break;
      case 'w': timespan = 'week'; break;
      case 'm': timespan = 'month'; break;
      case 'y': timespan = 'year'; break;
    }
  }
  
  return { multiplier, timespan };
};

// Calculate date range based on timeframe
const getDateRange = (timeframe) => {
  const now = new Date();
  const toDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  let fromDate;
  const { multiplier, timespan } = timeframeToParams(timeframe);
  
  // Handle monthly timeframe specially to get exactly 30 days
  const isMonthly = timeframe.match(/^[0-9]+m$/i);
  
  if (isMonthly) {
    // For monthly view, we want exactly 30 days
    fromDate = new Date(now);
    fromDate.setDate(now.getDate() - 30);
  } else {
    // For other timeframes, use the regular calculation
    switch (timespan) {
      case 'day':
        fromDate = new Date(now.setDate(now.getDate() - multiplier * 1));
        break;
      case 'week':
        fromDate = new Date(now.setDate(now.getDate() - multiplier * 7));
        break;
      case 'month':
        fromDate = new Date(now.setMonth(now.getMonth() - multiplier));
        break;
      case 'year':
        fromDate = new Date(now.setFullYear(now.getFullYear() - multiplier));
        break;
      default:
        fromDate = new Date(now.setDate(now.getDate() - 30)); // Default to 30 days
    }
  }
  
  return {
    from: fromDate.toISOString().split('T')[0],
    to: toDate
  };
};

// Fetch real stock data using Polygon Client
const fetchStockData = async (symbol, timeframe = '1m') => {
  console.log(`Fetching data for ${symbol}, timeframe: ${timeframe}`);
  
  try {
    // Get date range based on timeframe
    const { from, to } = getDateRange(timeframe);
    
    // Parse the timeframe to determine the appropriate parameters
    const { multiplier, timespan } = timeframeToParams(timeframe);
    
    // Create a cache key
    const cacheKey = `${symbol}-${timeframe}-${from}-${to}`;
    
    // Check cache first
    const cachedData = dataCache.get(cacheKey);
    if (cachedData && cachedData.timestamp > Date.now() - CACHE_EXPIRATION) {
      console.log(`Using cached data for ${symbol}`);
      return cachedData.data;
    }
    
    console.log(`Making Polygon API request for ${symbol} from ${from} to ${to}`);
    
    // For monthly timeframe, ensure we get exactly 30 data points (daily bars)
    const isMonthly = timeframe.match(/^[0-9]+m$/i);
    
    // Use queue and retry mechanism for API call
    const response = await addToRequestQueue(() => 
      retryWithBackoff(() => 
        polygonClient.stocks.aggregates(
          symbol,
          isMonthly ? 1 : multiplier,  // For monthly view, use 1-day bars
          isMonthly ?'day' : timespan, // For monthly view, use 'day' timespan
          from,
          to,

        )
      )
    );
    
    if (!response || !response.results) {
      throw new Error(`Invalid API response: ${JSON.stringify(response)}`);
    }
    
    // Log the full response for debugging
    console.log(`Received ${response.results.length} data points for ${symbol}`);
    
    // Transform the data for our chart format
    const chartData = response.results.map(item => ({
      date: new Date(item.t).toISOString().split('T')[0], // Convert timestamp to YYYY-MM-DD
      value: item.c, // Using closing price
      open: item.o,
      high: item.h,
      low: item.l,
      volume: item.v,
      vwap: item.vw,
      trades: item.n
    }));
    
    // Cache the results
    dataCache.set(cacheKey, {
      data: chartData,
      timestamp: Date.now()
    });
    
    return chartData;
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    // Fallback to generated data
    return generateSampleStockData(symbol, getPeriodCount(timeframe));
  }
};

// Fetch comparison data for multiple stocks
const fetchComparisonData = async (symbols = [], timeframe = '1m') => {
  console.log(`Fetching comparison data for ${symbols.join(', ')}, timeframe: ${timeframe}`);
  
  try {
    const { from, to } = getDateRange(timeframe);
    
    // Parse the timeframe to determine the appropriate parameters
    const { multiplier, timespan } = timeframeToParams(timeframe);
    
    // For monthly timeframe, ensure we get exactly 30 data points (daily bars)
    const isMonthly = timeframe.match(/^[0-9]+m$/i);
    
    // Create a cache key
    const cacheKey = `comparison-${symbols.join('-')}-${timeframe}-${from}-${to}`;
    
    // Check cache first
    const cachedData = dataCache.get(cacheKey);
    if (cachedData && cachedData.timestamp > Date.now() - CACHE_EXPIRATION) {
      console.log(`Using cached comparison data for ${symbols.join(', ')}`);
      return cachedData.data;
    }
    
    console.log(`Making Polygon API requests for comparison from ${from} to ${to}`);
    
    // Fetch data for each symbol sequentially to avoid rate limiting
    const results = [];
    for (const symbol of symbols) {
      try {
        // Use queue and retry mechanism for API call
        const data = await addToRequestQueue(() => 
          retryWithBackoff(() => 
            polygonClient.stocks.aggregates(
              symbol,
              isMonthly ? 1 : multiplier,  // For monthly view, use 1-day bars
              isMonthly ? 'day' : timespan, // For monthly view, use 'day' timespan
              from,
              to,
              {
                adjusted: true,
                sort: 'asc',
                // For monthly, we want ~30 days of daily data
                // For other timeframes, use the appropriate limit
                limit: isMonthly ? 31 : 120
              }
            )
          )
        );
        
        if (!data || !data.results) {
          throw new Error(`Invalid API response for ${symbol}`);
        }
        
        results.push({
          symbol,
          data: data.results
        });
      } catch (error) {
        console.error(`Error fetching data for ${symbol}:`, error);
        results.push({
          symbol,
          data: [] // Return empty data for this symbol
        });
      }
    }
    
    // Create a combined dataset
    const dateMap = new Map();
    
    // Process each stock's data
    results.forEach(({ symbol, data }) => {
      if (!data || data.length === 0) return;
      
      data.forEach(item => {
        const date = new Date(item.t).toISOString().split('T')[0];
        
        if (!dateMap.has(date)) {
          dateMap.set(date, { date });
        }
        
        // Store the closing price for this symbol on this date
        dateMap.get(date)[symbol] = item.c;
      });
    });
    
    // Convert to array and sort by date
    const combinedData = Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Cache the results
    dataCache.set(cacheKey, {
      data: combinedData,
      timestamp: Date.now()
    });
    
    return combinedData;
  } catch (error) {
    console.error(`Error fetching comparison data:`, error);
    // Fallback to generated data
    return generateSampleComparisonData(symbols, getPeriodCount(timeframe));
  }
};

// Start a real-time subscription for a stock
export const subscribeToStockUpdates = (chartId, symbol, timeframe = '1m', chartType = 'line') => {
  // Cancel any existing subscription for this chart
  if (activeSubscriptions.has(chartId)) {
    console.log(`Canceling previous subscription for chart ${chartId}`);
    clearInterval(activeSubscriptions.get(chartId));
  }
  
  // Initial data fetch
  fetchStockData(symbol, timeframe).then(data => {
    const chartData = {
      chartConfig: {
        type: chartType,
        data: data,
        xKey: 'date',
        yKey: 'value',
        title: `${symbol} Price Chart`
      }
    };
    
    // Update the chart with initial data
    chartEmitter.updateChart(chartId, chartData);
  }).catch(error => {
    console.error(`Error with initial data fetch for ${symbol}:`, error);
    // Fallback to generated data on error
    const fallbackData = generateSampleStockData(symbol, getPeriodCount(timeframe));
    chartEmitter.updateChart(chartId, {
      chartConfig: {
        type: chartType,
        data: fallbackData,
        xKey: 'date',
        yKey: 'value',
        title: `${symbol} Price Chart (Simulated)`
      }
    });
  });
  
  // Set up interval for periodic updates - reduced frequency to every 2 minutes
  const intervalId = setInterval(async () => {
    try {
      const data = await fetchStockData(symbol, timeframe);
      
      const chartData = {
        chartConfig: {
          type: chartType,
          data: data,
          xKey: 'date',
          yKey: 'value',
          title: `${symbol} Price Chart (Live)`
        }
      };
      
      // Update the chart with new data
      chartEmitter.updateChart(chartId, chartData);
    } catch (error) {
      console.error(`Error updating chart ${chartId}:`, error);
      // Don't update on error to avoid flickering
    }
  }, 120000); // Update every 2 minutes (reduced from 30 seconds)
  
  // Store the interval ID for cleanup
  activeSubscriptions.set(chartId, intervalId);
  
  // Return an unsubscribe function
  return () => {
    if (activeSubscriptions.has(chartId)) {
      clearInterval(activeSubscriptions.get(chartId));
      activeSubscriptions.delete(chartId);
      console.log(`Unsubscribed from updates for chart ${chartId}`);
    }
  };
};

// Start a real-time subscription for a comparison chart
export const subscribeToComparisonUpdates = (chartId, symbols = [], timeframe = '1m') => {
  // Cancel any existing subscription for this chart
  if (activeSubscriptions.has(chartId)) {
    console.log(`Canceling previous subscription for chart ${chartId}`);
    clearInterval(activeSubscriptions.get(chartId));
  }
  
  // Initial data fetch
  fetchComparisonData(symbols, timeframe).then(data => {
    const series = symbols.map(symbol => ({
      name: symbol,
      dataKey: symbol
    }));
    
    const chartData = {
      chartConfig: {
        type: 'comparison',
        data: data,
        xKey: 'date',
        title: `Comparison of ${symbols.join(', ')}`
      },
      series
    };
    
    // Update the chart with initial data
    chartEmitter.updateChart(chartId, chartData);
  }).catch(error => {
    console.error(`Error with initial comparison data fetch:`, error);
    // Fallback to generated data on error
    const fallbackData = generateSampleComparisonData(symbols, getPeriodCount(timeframe));
    const series = symbols.map(symbol => ({
      name: symbol,
      dataKey: symbol
    }));
    
    chartEmitter.updateChart(chartId, {
      chartConfig: {
        type: 'comparison',
        data: fallbackData.chartConfig.data,
        xKey: 'date',
        title: `Comparison of ${symbols.join(', ')} (Simulated)`
      },
      series
    });
  });
  
  // Set up interval for periodic updates - reduced frequency to every 3 minutes
  const intervalId = setInterval(async () => {
    try {
      const data = await fetchComparisonData(symbols, timeframe);
      
      const series = symbols.map(symbol => ({
        name: symbol,
        dataKey: symbol
      }));
      
      const chartData = {
        chartConfig: {
          type: 'comparison',
          data: data,
          xKey: 'date',
          title: `Comparison of ${symbols.join(', ')} (Live)`
        },
        series
      };
      
      // Update the chart with new data
      chartEmitter.updateChart(chartId, chartData);
    } catch (error) {
      console.error(`Error updating comparison chart ${chartId}:`, error);
      // Don't update on error to avoid flickering
    }
  }, 180000); // Update every 3 minutes (reduced from 30 seconds)
  
  // Store the interval ID for cleanup
  activeSubscriptions.set(chartId, intervalId);
  
  // Return an unsubscribe function
  return () => {
    if (activeSubscriptions.has(chartId)) {
      clearInterval(activeSubscriptions.get(chartId));
      activeSubscriptions.delete(chartId);
      console.log(`Unsubscribed from updates for chart ${chartId}`);
    }
  };
};

// Define an event emitter for chart subscriptions
export const removeChartWithSubscription = (chartId) => {
  // First check if there is an active subscription for this chart
  if (activeSubscriptions.has(chartId)) {
    console.log(`Cleaning up subscription for deleted chart ${chartId}`);
    clearInterval(activeSubscriptions.get(chartId));
    activeSubscriptions.delete(chartId);
  }
  
  // Then remove the chart from the emitter
  chartEmitter.removeChart(chartId);
};

// Clean up all subscriptions (e.g., when app unmounts)
export const cleanupAllSubscriptions = () => {
  activeSubscriptions.forEach((intervalId, chartId) => {
    clearInterval(intervalId);
    console.log(`Cleaned up subscription for chart ${chartId}`);
  });
  activeSubscriptions.clear();
};

// Helper functions
const getPeriodCount = (timeframe) => {
  const match = timeframe.match(/(\d+)([dwmy])/);
  if (!match) return 30; // Default to 30 days
  
  const [_, count, unit] = match;
  const numCount = parseInt(count);
  
  switch(unit) {
    case 'd': return numCount;
    case 'w': return numCount * 7;
    case 'm': return numCount * 30;
    case 'y': return numCount * 365;
    default: return 30;
  }
};

// Generate sample stock data for fallback
const generateSampleStockData = (symbol, periods) => {
  // For monthly view, ensure we generate exactly 30 data points
  const isMonthTimeframe = periods >= 28 && periods <= 31;
  const dataPoints = isMonthTimeframe ? 30 : periods;
  
  const data = [];
  const today = new Date();
  
  // Use symbol as seed for semi-consistent random numbers
  const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = (seed % 400) + 50; // Price between 50 and 450
  let currentPrice = basePrice;
  
  // Add slight trend based on symbol
  const trend = 1 + ((seed % 20) - 10) / 1000; // Between 0.99 and 1.01
  const volatility = 0.02; // 2% daily volatility
  
  for (let i = 0; i < dataPoints; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (dataPoints - i));
    
    // Apply random walk with trend
    currentPrice = currentPrice * trend * (1 + (pseudoRandom(seed + i) - 0.5) * volatility);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: parseFloat(currentPrice.toFixed(2))
    });
  }
  
  return data;
};

// Generate sample comparison data for fallback
const generateSampleComparisonData = (symbols, periods) => {
  // For monthly view, ensure we generate exactly 30 data points
  const isMonthTimeframe = periods >= 28 && periods <= 31;
  const dataPoints = isMonthTimeframe ? 30 : periods;
  
  const data = [];
  const today = new Date();
  const basePrices = {};
  
  // Initialize base prices
  symbols.forEach(symbol => {
    const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    basePrices[symbol] = 100; // All start at 100 for percentage comparison
  });
  
  // Generate data points
  for (let i = 0; i < dataPoints; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (dataPoints - i));
    
    const dataPoint = {
      date: date.toISOString().split('T')[0]
    };
    
    // Update prices for each symbol
    symbols.forEach(symbol => {
      const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const trend = 1 + ((seed % 20) - 10) / 1000; // Between 0.99 and 1.01
      
      const change = (pseudoRandom(seed + i) - 0.48) * 3; // Slight upward bias
      basePrices[symbol] *= (1 + change / 100);
      
      dataPoint[symbol] = parseFloat(basePrices[symbol].toFixed(2));
    });
    
    data.push(dataPoint);
  }
  
  return data;
};

// Pseudo-random number generator based on seed for consistency
const pseudoRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}; 