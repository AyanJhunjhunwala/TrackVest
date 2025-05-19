import { chartEmitter } from '../hooks/useChartSubscription';
import { restClient } from '@polygon.io/client-js';

// Polygon API key
const POLYGON_API_KEY = localStorage.getItem('polygonApiKey') || "9h2tWR97GWuVzS5a27bqgC4JjhC3H1uv";
const polygonClient = restClient(POLYGON_API_KEY);

// Map of active subscriptions
const activeSubscriptions = new Map();

// Enhanced cache for API responses with grouped data and longer expiration
const dataCache = new Map();

// Cache expiration time in milliseconds (30 minutes - increased from 5)
const CACHE_EXPIRATION = 30 * 60 * 1000; 

// Cache for grouped data requests
const groupedDataCache = new Map();

// Pending batch requests 
const pendingBatchRequests = {
  symbols: new Set(),
  timeframe: null,
  timeoutId: null,
  callbacks: new Map(), // Map of symbol -> callback function
};

// Maximum batch size for API requests
const MAX_BATCH_SIZE = 5;

// Delay for batching requests (milliseconds)
const BATCH_DELAY = 200;

// API request queue to prevent too many concurrent requests
let requestQueue = [];
let isProcessingQueue = false;
let lastRequestTime = 0;

// Rate limit settings
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_MINUTE = 5;   // Maximum API calls per minute
let requestsInCurrentWindow = 0;
let windowResetTimeout = null;

// Reset rate limit counter after window expires
const resetRateLimitWindow = () => {
  requestsInCurrentWindow = 0;
  windowResetTimeout = setTimeout(resetRateLimitWindow, RATE_LIMIT_WINDOW);
};

// Initialize rate limit window
resetRateLimitWindow();

// Add request to queue with priority
const addToRequestQueue = (requestFn, priority = 0) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ 
      requestFn, 
      resolve, 
      reject,
      priority, // Higher number = higher priority
      timestamp: Date.now() 
    });
    
    // Sort queue by priority (highest first) then by timestamp (oldest first)
    requestQueue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });
    
    processRequestQueue();
  });
};

// Process request queue with enhanced rate limiting
const processRequestQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  // Check rate limiting
  if (requestsInCurrentWindow >= MAX_REQUESTS_PER_MINUTE) {
    const timeUntilWindowReset = RATE_LIMIT_WINDOW - (Date.now() % RATE_LIMIT_WINDOW);
    console.log(`Rate limit reached, waiting ${timeUntilWindowReset}ms before next request`);
    setTimeout(processRequestQueue, timeUntilWindowReset + 100);
    return;
  }
  
  // Ensure minimum interval between requests
  const MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests
  const timeSinceLastRequest = Date.now() - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    setTimeout(processRequestQueue, MIN_REQUEST_INTERVAL - timeSinceLastRequest);
    return;
  }
  
  isProcessingQueue = true;
  
  // Process first item in queue
  const { requestFn, resolve, reject } = requestQueue.shift();
  
  try {
    requestsInCurrentWindow++;
    lastRequestTime = Date.now();
    
    const result = await requestFn();
    resolve(result);
  } catch (error) {
    console.error('Error in request queue:', error);
    reject(error);
  } finally {
    isProcessingQueue = false;
    
    // Process next item after a delay 
    setTimeout(processRequestQueue, 100);
  }
};

// Retry function with exponential backoff and improved error handling
const retryWithBackoff = async (fn, maxRetries = 3, baseDelayMs = 2000) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimitError = error.status === 429 || 
        (error.message && error.message.includes('rate limit'));
      const isNetworkError = error.name === 'NetworkError' || 
        error.name === 'TypeError' ||
        (error.message && error.message.includes('network'));
      
      if ((isRateLimitError || isNetworkError) && retries < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, retries);
        console.log(`API error (${error.message || error.status}). Retrying after ${delay}ms...`);
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

// Process and add request to batch
const addToBatchRequest = (symbol, timeframe, callback) => {
  // If this is a new batch or timeframe changed, reset the batch
  if (!pendingBatchRequests.timeoutId || pendingBatchRequests.timeframe !== timeframe) {
    // Clear existing timeout if there is one
    if (pendingBatchRequests.timeoutId) {
      clearTimeout(pendingBatchRequests.timeoutId);
    }
    
    // Reset batch
    pendingBatchRequests.symbols = new Set();
    pendingBatchRequests.callbacks = new Map();
    pendingBatchRequests.timeframe = timeframe;
  }
  
  // Add symbol to batch
  pendingBatchRequests.symbols.add(symbol);
  pendingBatchRequests.callbacks.set(symbol, callback);
  
  // Set timeout to process batch
  if (pendingBatchRequests.timeoutId) {
    clearTimeout(pendingBatchRequests.timeoutId);
  }
  
  pendingBatchRequests.timeoutId = setTimeout(() => {
    processBatch(pendingBatchRequests.timeframe);
  }, BATCH_DELAY);
  
  // If we've reached max batch size, process immediately
  if (pendingBatchRequests.symbols.size >= MAX_BATCH_SIZE) {
    clearTimeout(pendingBatchRequests.timeoutId);
    processBatch(pendingBatchRequests.timeframe);
  }
};

// Process a batch of requests
const processBatch = async (timeframe) => {
  const symbols = [...pendingBatchRequests.symbols];
  const callbacks = new Map(pendingBatchRequests.callbacks);
  
  // Reset batch
  pendingBatchRequests.symbols = new Set();
  pendingBatchRequests.callbacks = new Map();
  pendingBatchRequests.timeoutId = null;
  
  console.log(`Processing batch request for ${symbols.length} symbols with timeframe ${timeframe}`);
  
  try {
    // Create a grouped data key
    const key = `grouped-${symbols.sort().join('-')}-${timeframe}`;
    
    // Check if we have this data in cache
    if (groupedDataCache.has(key)) {
      const cachedData = groupedDataCache.get(key);
      if (cachedData.timestamp > Date.now() - CACHE_EXPIRATION) {
        console.log(`Using cached grouped data for ${symbols.join(', ')}`);
        
        // Call all callbacks with their respective data
        for (const symbol of symbols) {
          if (cachedData.data[symbol] && callbacks.has(symbol)) {
            callbacks.get(symbol)(cachedData.data[symbol]);
          }
        }
        return;
      }
    }
    
    // Split into smaller batches if needed to avoid API limits
    const batchSize = Math.min(symbols.length, MAX_BATCH_SIZE);
    const batches = [];
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize));
    }
    
    // Process batches sequentially
    const allResults = {};
    
    for (const batch of batches) {
      const batchResults = await fetchBatchData(batch, timeframe);
      Object.assign(allResults, batchResults);
    }
    
    // Store in grouped cache
    groupedDataCache.set(key, {
      data: allResults,
      timestamp: Date.now()
    });
    
    // Call callbacks with respective data
    for (const symbol of symbols) {
      if (allResults[symbol] && callbacks.has(symbol)) {
        callbacks.get(symbol)(allResults[symbol]);
      }
    }
  } catch (error) {
    console.error(`Error processing batch request: ${error.message}`);
    
    // Fall back to individual requests for each symbol
    for (const symbol of symbols) {
      if (callbacks.has(symbol)) {
        try {
          const data = await fetchStockData(symbol, timeframe);
          callbacks.get(symbol)(data);
        } catch (e) {
          console.error(`Error fetching data for ${symbol}: ${e.message}`);
          callbacks.get(symbol)(generateSampleStockData(symbol, getPeriodCount(timeframe)));
        }
      }
    }
  }
};

// Fetch data for a batch of symbols
const fetchBatchData = async (symbols, timeframe) => {
  const { from, to } = getDateRange(timeframe);
  const { multiplier, timespan } = timeframeToParams(timeframe);
  const isMonthly = timeframe.match(/^[0-9]+m$/i);
  
  const results = {};
  
  // Fetch data for each symbol with higher priority
  await Promise.all(symbols.map(async (symbol) => {
    try {
      // Check individual cache first
      const cacheKey = `${symbol}-${timeframe}-${from}-${to}`;
      const cachedData = dataCache.get(cacheKey);
      
      if (cachedData && cachedData.timestamp > Date.now() - CACHE_EXPIRATION) {
        results[symbol] = cachedData.data;
        return;
      }
      
      // Make API request with high priority
      const response = await addToRequestQueue(() => 
        retryWithBackoff(() => 
          polygonClient.stocks.aggregates(
            symbol,
            isMonthly ? 1 : multiplier,
            isMonthly ? 'day' : timespan,
            from,
            to
          )
        ), 
        10 // High priority
      );
      
      if (!response || !response.results) {
        throw new Error(`Invalid API response for ${symbol}`);
      }
      
      // Transform data
      const chartData = response.results.map(item => ({
        date: new Date(item.t).toISOString().split('T')[0],
        value: item.c,
        open: item.o,
        high: item.h,
        low: item.l,
        volume: item.v,
        vwap: item.vw,
        trades: item.n
      }));
      
      // Cache individual result
      dataCache.set(cacheKey, {
        data: chartData,
        timestamp: Date.now()
      });
      
      results[symbol] = chartData;
    } catch (error) {
      console.error(`Error fetching data for ${symbol} in batch:`, error);
      results[symbol] = generateSampleStockData(symbol, getPeriodCount(timeframe));
    }
  }));
  
  return results;
};

// Enhanced fetch stock data function using batch processing
const fetchStockData = async (symbol, timeframe = '1m') => {
  return new Promise((resolve) => {
    // Add to batch request and resolve when the data is available
    addToBatchRequest(symbol, timeframe, (data) => {
      resolve(data);
    });
  });
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
  console.log(`Subscribing to updates for ${symbol}, timeframe: ${timeframe}`);
  
  // Check if already subscribed
  if (activeSubscriptions.has(chartId)) {
    // Update existing subscription
    const existing = activeSubscriptions.get(chartId);
    clearTimeout(existing.timeoutId);
    existing.symbol = symbol;
    existing.timeframe = timeframe;
    
    // Immediate update
    fetchStockData(symbol, timeframe)
      .then(data => {
        // Process data for the specific chart type
        const chartData = {
          chartConfig: {
            data,
            xKey: 'date',
            yKey: 'value',
            title: `${symbol.toUpperCase()} Stock Price`
          },
          series: [
            { name: symbol, dataKey: 'value', color: '#3b82f6' } // Primary series
          ]
        };
        
        // Update chart via emitter
        chartEmitter.updateChart(chartId, chartData);
        
        // Schedule next update
        existing.timeoutId = setTimeout(() => {
          subscribeToStockUpdates(chartId, symbol, timeframe, chartType);
        }, getUpdateInterval(timeframe));
      })
      .catch(error => {
        console.error(`Error updating ${symbol} chart:`, error);
      });
      
    return;
  }
  
  // Create new subscription
  const subscription = {
    chartId,
    symbol,
    timeframe,
    chartType,
    timeoutId: null
  };
  
  // Fetch initial data
  fetchStockData(symbol, timeframe)
    .then(data => {
      const chartData = {
        chartConfig: {
          data,
          xKey: 'date',
          yKey: 'value',
          title: `${symbol.toUpperCase()} Stock Price`
        },
        series: [
          { name: symbol, dataKey: 'value', color: '#3b82f6' } // Primary series
        ]
      };
      
      // Update chart via emitter
      chartEmitter.updateChart(chartId, chartData);
      
      // Schedule next update
      subscription.timeoutId = setTimeout(() => {
        subscribeToStockUpdates(chartId, symbol, timeframe, chartType);
      }, getUpdateInterval(timeframe));
      
      // Store subscription
      activeSubscriptions.set(chartId, subscription);
    })
    .catch(error => {
      console.error(`Error creating chart for ${symbol}:`, error);
    });
  
  return chartId;
};

// Start a real-time subscription for a comparison chart
export const subscribeToComparisonUpdates = (chartId, symbols = [], timeframe = '1m') => {
  if (!symbols.length) return;
  
  console.log(`Subscribing to comparison updates for ${symbols.join(', ')}, timeframe: ${timeframe}`);
  
  // Check if already subscribed
  if (activeSubscriptions.has(chartId)) {
    // Update existing subscription
    const existing = activeSubscriptions.get(chartId);
    clearTimeout(existing.timeoutId);
    existing.symbols = [...symbols];
    existing.timeframe = timeframe;
    
    // Immediate update
    updateComparisonChart(chartId, symbols, timeframe);
    
    // Schedule next update
    existing.timeoutId = setTimeout(() => {
      subscribeToComparisonUpdates(chartId, symbols, timeframe);
    }, getUpdateInterval(timeframe));
    
    return;
  }
  
  // Create new subscription
  const subscription = {
    chartId,
    symbols: [...symbols],
    timeframe,
    timeoutId: null
  };
  
  // Initial update
  updateComparisonChart(chartId, symbols, timeframe)
    .then(() => {
      // Schedule next update
      subscription.timeoutId = setTimeout(() => {
        subscribeToComparisonUpdates(chartId, symbols, timeframe);
      }, getUpdateInterval(timeframe));
      
      // Store subscription
      activeSubscriptions.set(chartId, subscription);
    })
    .catch(error => {
      console.error(`Error creating comparison chart:`, error);
    });
  
  return chartId;
};

// Helper function to update comparison chart
const updateComparisonChart = async (chartId, symbols, timeframe) => {
  try {
    // Create a key for group caching
    const key = `grouped-${symbols.sort().join('-')}-${timeframe}`;
    
    // Prepare data for chart
    const allData = {};
    
    // Check if we have this data in cache
    if (groupedDataCache.has(key)) {
      const cachedData = groupedDataCache.get(key);
      if (cachedData.timestamp > Date.now() - CACHE_EXPIRATION) {
        for (const symbol of symbols) {
          allData[symbol] = cachedData.data[symbol] || 
            generateSampleStockData(symbol, getPeriodCount(timeframe));
        }
      }
    }
    
    // If not in cache, fetch batch data
    if (Object.keys(allData).length === 0) {
      const batchData = await fetchBatchData(symbols, timeframe);
      Object.assign(allData, batchData);
    }
    
    // Create merged dataset for comparison chart
    const mergedData = createMergedDataset(allData, symbols);
    
    // Create series config for chart
    const series = symbols.map((symbol, index) => ({
      name: symbol,
      dataKey: symbol,
      color: getColorForIndex(index)
    }));
    
    // Create chart data
    const chartData = {
      chartConfig: {
        data: mergedData,
        xKey: 'date',
        title: `Comparison: ${symbols.join(' vs ')}`,
        type: 'comparison'
      },
      series
    };
    
    // Update chart via emitter
    chartEmitter.updateChart(chartId, chartData);
  } catch (error) {
    console.error(`Error updating comparison chart:`, error);
  }
};

// Helper to create merged dataset
const createMergedDataset = (dataBySymbol, symbols) => {
  // Get all unique dates across all symbols
  const allDates = new Set();
  symbols.forEach(symbol => {
    if (dataBySymbol[symbol]) {
      dataBySymbol[symbol].forEach(item => allDates.add(item.date));
    }
  });
  
  // Sort dates
  const sortedDates = [...allDates].sort();
  
  // Create merged dataset
  return sortedDates.map(date => {
    const dataPoint = { date };
    
    symbols.forEach(symbol => {
      if (!dataBySymbol[symbol]) return;
      
      const point = dataBySymbol[symbol].find(item => item.date === date);
      dataPoint[symbol] = point ? point.value : null;
    });
    
    return dataPoint;
  });
};

// Get update interval based on timeframe
const getUpdateInterval = (timeframe) => {
  // Default to 5 minutes (300000ms)
  let interval = 300000;
  
  // Adjust based on timeframe
  if (timeframe.includes('d')) {
    interval = 60000; // 1 minute for daily charts
  } else if (timeframe.includes('w')) {
    interval = 300000; // 5 minutes for weekly charts
  } else if (timeframe.includes('m')) {
    interval = 900000; // 15 minutes for monthly charts
  } else if (timeframe.includes('y')) {
    interval = 3600000; // 1 hour for yearly charts
  }
  
  return interval;
};

// Get color for series by index
const getColorForIndex = (index) => {
  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#22c55e', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
    '#64748b', // slate
    '#0ea5e9'  // sky
  ];
  
  return colors[index % colors.length];
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