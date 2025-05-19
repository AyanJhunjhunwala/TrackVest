import { GoogleGenerativeAI } from '@google/generative-ai';
import { chartEmitter } from '../hooks/useChartSubscription';
import { subscribeToStockUpdates, subscribeToComparisonUpdates } from '../services/chartDataService';

// Initialize with API key
const genAI = new GoogleGenerativeAI("AIzaSyDJ7tT1DyZ4FnSWIc4UazjYL4gGCo6vN0Y");

// Define function declarations for chart generation
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

// Function to directly add a chart via the emitter
function addChartToSystem(chartData, chartType = 'custom') {
  // Generate a unique ID for the chart
  const chartId = `${chartType}_${Date.now()}`;
  console.log(`Adding chart to Insights with ID: ${chartId}`, chartData);
  
  // Directly update the chart via the emitter
  chartEmitter.updateChart(chartId, chartData);
  
  return chartId;
}

// Generate a sample dataset for a given stock symbol
async function generateSampleStockData(symbol) {
  try {
    // Create the prompt for Gemini
    const prompt = `Create a line chart showing 30 days of stock price data for ${symbol}. 
    Include realistic price fluctuations and market trends. 
    The data should be in a format where each point has a date (YYYY-MM-DD) and value (price in dollars).`;
    
    // Get the model instance first
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Call generateContent on the model with the proper params
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048
      },
      tools: [{
        functionDeclarations: [lineChartFunctionDeclaration]
      }]
    });
    
    // Check for function calls in the response
    const response = result.response;
    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0];
      console.log(`Function call received: ${functionCall.name}`);
      
      if (functionCall.name === 'create_line_chart') {
        // Create the chart data object
        const chartData = {
          chartConfig: {
            type: 'line',
            data: functionCall.args.data,
            xKey: functionCall.args.xKey || 'date',
            yKey: functionCall.args.yKey || 'value',
            title: functionCall.args.title || `${symbol} Stock Price`
          }
        };
        
        return chartData;
      }
    }
    
    // Fallback if no function call found
    console.log("No function call found in the response, using fallback data");
    
    // Generate fallback data
    const fallbackData = {
      chartConfig: {
        type: 'line',
        data: generateFallbackStockData(symbol, 30),
        xKey: 'date',
        yKey: 'value',
        title: `${symbol} Stock Price (Fallback)`
      }
    };
    
    return fallbackData;
  } catch (error) {
    console.error("Error generating chart data:", error);
    // Return fallback data
    return {
      chartConfig: {
        type: 'line',
        data: generateFallbackStockData(symbol, 30),
        xKey: 'date',
        yKey: 'value',
        title: `${symbol} Stock Price (Error Fallback)`
      }
    };
  }
}

// Generate a comparison chart for multiple symbols
async function generateComparisonData(symbols) {
  try {
    // Create the prompt for Gemini
    const prompt = `Create a comparison chart for the following stocks: ${symbols.join(', ')}. 
    Show realistic price performance over the last 30 days.
    The data should include a date field and separate values for each stock symbol.`;
    
    // Get the model instance first
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Call generateContent on the model with the proper params
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048
      },
      tools: [{
        functionDeclarations: [comparisonChartFunctionDeclaration]
      }]
    });
    
    // Check for function calls in the response
    const response = result.response;
    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0];
      console.log(`Function call received: ${functionCall.name}`);
      
      if (functionCall.name === 'create_comparison_chart') {
        // Create the chart data object
        const chartData = {
          chartConfig: {
            type: 'comparison',
            data: functionCall.args.data,
            xKey: functionCall.args.xKey || 'date',
            title: functionCall.args.title || `Comparison: ${symbols.join(' vs ')}`
          },
          series: functionCall.args.series
        };
        
        return chartData;
      }
    }
    
    // Fallback if no function call found
    console.log("No function call found in the response, using fallback data");
    
    // Generate fallback data
    return generateFallbackComparisonData(symbols);
  } catch (error) {
    console.error("Error generating comparison chart data:", error);
    // Return fallback data
    return generateFallbackComparisonData(symbols);
  }
}

// Helper function to generate fallback stock data
function generateFallbackStockData(symbol, days = 30) {
  const data = [];
  const today = new Date();
  
  // Use symbol as seed for consistency
  const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = (seed % 400) + 50; // Price between 50 and 450
  let currentPrice = basePrice;
  
  // Add slight trend based on symbol
  const trend = 1 + ((seed % 20) - 10) / 1000; // Between 0.99 and 1.01
  const volatility = 0.02; // 2% daily volatility
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - i));
    
    // Apply random walk with trend
    currentPrice = currentPrice * trend * (1 + (Math.random() - 0.5) * volatility);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: parseFloat(currentPrice.toFixed(2))
    });
  }
  
  return data;
}

// Helper function to generate fallback comparison data
function generateFallbackComparisonData(symbols) {
  const data = [];
  const today = new Date();
  const days = 30;
  
  // Initialize prices for each symbol
  const prices = {};
  symbols.forEach(symbol => {
    const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    prices[symbol] = 100; // Start all at 100 for easier comparison
  });
  
  // Generate data for each day
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - i));
    
    const dataPoint = {
      date: date.toISOString().split('T')[0]
    };
    
    // Update prices for each symbol
    symbols.forEach(symbol => {
      const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const trend = 1 + ((seed % 20) - 10) / 1000; // Between 0.99 and 1.01
      const volatility = 0.02;
      
      prices[symbol] *= (1 + (Math.random() - 0.48) * volatility); // Slight upward bias
      dataPoint[symbol] = parseFloat(prices[symbol].toFixed(2));
    });
    
    data.push(dataPoint);
  }
  
  // Create series config
  const series = symbols.map(symbol => ({
    name: symbol,
    dataKey: symbol
  }));
  
  return {
    chartConfig: {
      type: 'comparison',
      data,
      xKey: 'date',
      title: `Comparison: ${symbols.join(' vs ')} (Fallback)`
    },
    series
  };
}

// Create a test stock chart and add it to the system
export async function createSampleStockChart() {
  console.log("Creating test stock chart...");
  const symbol = "AAPL";
  
  try {
    // Generate the chart data
    const chartData = await generateSampleStockData(symbol);
    
    // Add chart to the system
    const chartId = addChartToSystem(chartData, 'test_stock');
    
    // Start real-time updates
    subscribeToStockUpdates(chartId, symbol, '1m', 'line');
    
    console.log(`Test stock chart created with ID: ${chartId}`);
    return chartId;
  } catch (error) {
    console.error("Error creating test stock chart:", error);
  }
}

// Create a test comparison chart and add it to the system
export async function createSampleComparisonChart() {
  console.log("Creating test comparison chart...");
  const symbols = ["AAPL", "MSFT", "GOOGL"];
  
  try {
    // Generate the chart data
    const chartData = await generateComparisonData(symbols);
    
    // Add chart to the system
    const chartId = addChartToSystem(chartData, 'test_comparison');
    
    // Start real-time updates
    subscribeToComparisonUpdates(chartId, symbols, '1m');
    
    console.log(`Test comparison chart created with ID: ${chartId}`);
    return chartId;
  } catch (error) {
    console.error("Error creating test comparison chart:", error);
  }
}

// Create both types of test charts
export async function createAllTestCharts() {
  await createSampleStockChart();
  await createSampleComparisonChart();
}

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
    
    // Get the model instance first
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Call generateContent on the model with the proper params
    const result = await model.generateContent({
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
    
    // ... rest of the function ...
  } catch (error) {
    console.error("Error generating chart data:", error);
    // Return fallback data
    return {
      chartConfig: {
        type: 'line',
        data: generateFallbackStockData(chartRequest.symbol, 30),
        xKey: 'date',
        yKey: 'value',
        title: `${chartRequest.symbol} Stock Price (Error Fallback)`
      }
    };
  }
}

/**
 * Utilities for generating chart data without external API dependencies
 */

// Add Polygon API helper functions
const POLYGON_API_KEY = localStorage.getItem('polygonApiKey') || "9h2tWR97GWuVzS5a27bqgC4JjhC3H1uv"; // Use localStorage value or specified API key

// Fetch historical stock data from Polygon API
async function fetchPolygonStockData(symbol, timeframe = '1m') {
  try {
    // Convert timeframe to API parameters
    const endDate = new Date().toISOString().split('T')[0];
    let startDate;
    
    switch(timeframe) {
      case '1w': 
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '2w': 
        startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1m': 
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '3m': 
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '6m': 
        startDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1y': 
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }
    
    // Use Polygon Aggregates API
    const apiUrl = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${startDate}/${endDate}?apiKey=${POLYGON_API_KEY}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.resultsCount === 0 || !data.results) {
      console.log(`No Polygon data found for ${symbol}, falling back to generated data`);
      return null;
    }
    
    // Format the data for our chart
    return data.results.map(result => ({
      date: new Date(result.t).toISOString().split('T')[0],
      value: result.c // Using closing price
    }));
  } catch (error) {
    console.error(`Error fetching Polygon data for ${symbol}:`, error);
    return null;
  }
}

// Generate random stock price data with realistic patterns and technical indicators
export const createTestStockChart = async (symbol, timeframe = '1m', indicators = ['sma']) => {
  // Try to fetch real data from Polygon API first
  const polygonData = await fetchPolygonStockData(symbol, timeframe);
  
  let data;
  if (polygonData) {
    console.log(`Using real Polygon data for ${symbol}`);
    data = [...polygonData]; // Clone the array
  } else {
    console.log(`Generating synthetic data for ${symbol}`);
    // Define time period
    const days = timeframe === '1w' ? 7 :
                timeframe === '2w' ? 14 :
                timeframe === '1m' ? 30 :
                timeframe === '3m' ? 90 :
                timeframe === '6m' ? 180 :
                timeframe === '1y' ? 365 : 30;
    
    // Set realistic starting values based on ticker
    const basePrice = 
      symbol === 'AAPL' ? 180 :
      symbol === 'MSFT' ? 350 :
      symbol === 'GOOGL' ? 140 :
      symbol === 'AMZN' ? 160 :
      symbol === 'META' ? 325 :
      symbol === 'TSLA' ? 250 :
      symbol === 'JPM' ? 170 :
      symbol === 'V' ? 230 :
      symbol === 'NVDA' ? 450 :
      symbol === 'BAC' ? 35 :
      symbol === 'BTC' || symbol === 'Bitcoin' ? 45000 :
      symbol === 'ETH' || symbol === 'Ethereum' ? 3000 :
      symbol === 'XRP' ? 0.5 :
      symbol === 'ADA' ? 0.4 :
      symbol === 'SOL' ? 100 :
      symbol === 'DOT' ? 6 :
      symbol === 'DOGE' ? 0.1 : 
      100; // Default value
    
    // Generate volatility based on the asset
    const volatility = 
      symbol.includes('BTC') || symbol === 'Bitcoin' ? 0.03 :
      symbol.includes('ETH') || symbol === 'Ethereum' ? 0.04 :
      symbol === 'TSLA' ? 0.025 :
      symbol === 'NVDA' ? 0.02 :
      symbol === 'AAPL' || symbol === 'MSFT' ? 0.01 : 0.015;
    
    // Generate dates
    const dates = [];
    const prices = [];
    const today = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    // Generate semi-realistic price movements
    // Start with base price
    let currentPrice = basePrice;
    prices.push(currentPrice);
    
    // Add a trend bias (0.6 = 60% chance of following the trend)
    const trendBias = 0.6;
    let trend = Math.random() > 0.5 ? 1 : -1;
    
    // Generate subsequent prices with momentum and volatility
    for (let i = 1; i <= days; i++) {
      // 20% chance of trend reversal
      if (Math.random() > 0.8) {
        trend = -trend;
      }
      
      // Calculate price movement with trend bias
      const randomFactor = Math.random();
      const movement = (randomFactor > trendBias ? -trend : trend) * volatility * currentPrice;
      
      // Add some random noise
      const noise = (Math.random() - 0.5) * volatility * currentPrice * 0.5;
      
      // Update price
      currentPrice += movement + noise;
      
      // Ensure price doesn't go negative
      currentPrice = Math.max(currentPrice, basePrice * 0.5);
      
      prices.push(currentPrice);
    }

    // Format data for chart
    data = dates.map((date, index) => ({
      date,
      value: parseFloat(prices[index].toFixed(2))
    }));
  }
  
  // Extract prices for technical indicators
  const prices = data.map(point => point.value);
  
  // Calculate technical indicators
  const technicalIndicators = {};
  
  // Simple Moving Average (SMA)
  if (indicators.includes('sma') || indicators.includes('all')) {
    const smaPeriod = 7; // 7-day SMA
    const smaValues = calculateSMA(prices, smaPeriod);
    technicalIndicators.sma = smaValues;
  }
  
  // Exponential Moving Average (EMA)
  if (indicators.includes('ema') || indicators.includes('all')) {
    const emaPeriod = 14; // 14-day EMA
    const emaValues = calculateEMA(prices, emaPeriod);
    technicalIndicators.ema = emaValues;
  }
  
  // MACD (Moving Average Convergence Divergence)
  if (indicators.includes('macd') || indicators.includes('all')) {
    const macdValues = calculateMACD(prices);
    technicalIndicators.macd = macdValues;
  }
  
  // RSI (Relative Strength Index)
  if (indicators.includes('rsi') || indicators.includes('all')) {
    const rsiValues = calculateRSI(prices);
    technicalIndicators.rsi = rsiValues;
  }
  
  // Add technical indicators to data points
  data = data.map((point, index) => {
    // Add technical indicators to data points
    if (technicalIndicators.sma && index >= technicalIndicators.sma.length - prices.length) {
      const smaIndex = index - (prices.length - technicalIndicators.sma.length);
      if (smaIndex >= 0) {
        point.sma = parseFloat(technicalIndicators.sma[smaIndex].toFixed(2));
      }
    }
    
    if (technicalIndicators.ema && index >= technicalIndicators.ema.length - prices.length) {
      const emaIndex = index - (prices.length - technicalIndicators.ema.length);
      if (emaIndex >= 0) {
        point.ema = parseFloat(technicalIndicators.ema[emaIndex].toFixed(2));
      }
    }
    
    if (technicalIndicators.macd && index >= technicalIndicators.macd.MACD.length - prices.length) {
      const macdIndex = index - (prices.length - technicalIndicators.macd.MACD.length);
      if (macdIndex >= 0) {
        point.macd = parseFloat(technicalIndicators.macd.MACD[macdIndex].toFixed(2));
        point.signal = parseFloat(technicalIndicators.macd.signal[macdIndex].toFixed(2));
        point.histogram = parseFloat(technicalIndicators.macd.histogram[macdIndex].toFixed(2));
      }
    }
    
    if (technicalIndicators.rsi && index >= technicalIndicators.rsi.length - prices.length) {
      const rsiIndex = index - (prices.length - technicalIndicators.rsi.length);
      if (rsiIndex >= 0) {
        point.rsi = parseFloat(technicalIndicators.rsi[rsiIndex].toFixed(2));
      }
    }
    
    return point;
  });
  
  // Prepare the series configuration for the chart
  const series = [
    { name: symbol, dataKey: 'value' }
  ];
  
  if (technicalIndicators.sma) {
    series.push({ name: '7-Day SMA', dataKey: 'sma' });
  }
  
  if (technicalIndicators.ema) {
    series.push({ name: '14-Day EMA', dataKey: 'ema' });
  }
  
  return {
    chartConfig: {
      type: 'line',
      data: data,
      xKey: 'date',
      yKey: 'value',
      title: `${symbol} Price History (${timeframe.toUpperCase()})`
    },
    series: series,
    technicalIndicators: Object.keys(technicalIndicators)
  };
};

// Create comparison chart data for multiple assets
export const createTestComparisonChart = async (symbols, timeframe = '1m', withIndicators = false, useRawPrices = false) => {
  // Use exactly the symbols provided without adding or removing any
  const requestedSymbols = [...symbols]; // Clone to avoid modifying the original array
  
  console.log(`Creating comparison chart with exactly ${requestedSymbols.length} symbols: ${requestedSymbols.join(', ')}`);
  
  // Fetch data for each symbol
  const symbolsData = {};
  const series = [];
  
  // Generate dates for the full timeframe (in case some symbols have missing days)
  const days = timeframe === '1w' ? 7 :
              timeframe === '2w' ? 14 :
              timeframe === '1m' ? 30 :
              timeframe === '3m' ? 90 :
              timeframe === '6m' ? 180 :
              timeframe === '1y' ? 365 : 30;
  
  // Generate date range to ensure complete dataset
  const dates = [];
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  // Fetch data for each symbol
  for (const symbol of requestedSymbols) {
    // Get chart data (real or synthetic)
    const chart = await createTestStockChart(symbol, timeframe);
    const priceData = chart.chartConfig.data;
    
    // Store either raw price data or normalized data depending on mode
    if (useRawPrices) {
      // Use raw price data for direct price comparison
      symbolsData[symbol] = {
        data: priceData,
        sma: withIndicators ? calculateSMA(priceData.map(p => p.value), 7) : null
      };
    } else {
      // Normalize to percentage change from starting value for fair comparison
      const startValue = priceData[0].value;
      const normalizedData = priceData.map(point => ({
        date: point.date,
        value: (point.value / startValue) * 100
      }));
      
      symbolsData[symbol] = {
        data: normalizedData,
        sma: withIndicators ? calculateSMA(normalizedData.map(p => p.value), 7) : null
      };
    }
    
    // Add to series config
    series.push({
      name: symbol,
      dataKey: symbol
    });
    
    if (withIndicators) {
      series.push({
        name: `${symbol} 7D-SMA`,
        dataKey: `${symbol}_sma`,
        stroke: 'rgba(150,150,150,0.8)', // Muted color for indicators
        strokeDasharray: '3 3' // Dashed line
      });
    }
  }
  
  // Combine into a single dataset with aligned dates
  const combinedData = dates.map(date => ({ date }));
  
  // Populate data for each symbol
  for (let i = 0; i < combinedData.length; i++) {
    const currentDate = combinedData[i].date;
    
    requestedSymbols.forEach(symbol => {
      // Find matching date in symbol data
      const matchingPoint = symbolsData[symbol].data.find(point => point.date === currentDate);
      
      if (matchingPoint) {
        combinedData[i][symbol] = matchingPoint.value;
        
        // Add SMA if available
        if (withIndicators && symbolsData[symbol].sma) {
          const smaIndex = symbolsData[symbol].data.findIndex(point => point.date === currentDate);
          const smaOffset = symbolsData[symbol].data.length - symbolsData[symbol].sma.length;
          
          if (smaIndex >= smaOffset) {
            combinedData[i][`${symbol}_sma`] = symbolsData[symbol].sma[smaIndex - smaOffset];
          }
        }
      } else {
        // Interpolate missing data
        combinedData[i][symbol] = null; // Chart component will handle null values
      }
    });
  }
  
  // Remove data points where all symbols have null values
  const filteredData = combinedData.filter(point => {
    return requestedSymbols.some(symbol => point[symbol] !== null);
  });
  
  // Create title based on comparison type
  const metricType = useRawPrices ? "Price (USD)" : "Percentage Change (Base: 100%)";
  const title = useRawPrices 
    ? `Price Comparison: ${requestedSymbols.join(' vs ')} (${timeframe.toUpperCase()})`
    : `Performance Comparison: ${requestedSymbols.join(' vs ')} (${timeframe.toUpperCase()})`;
  
  return {
    chartConfig: {
      type: 'comparison',
      data: filteredData,
      xKey: 'date',
      title: title,
      metricType: metricType
    },
    series: series,
    withIndicators: withIndicators,
    useRawPrices: useRawPrices
  };
};

// Technical indicator calculation functions

// Calculate Simple Moving Average (SMA)
function calculateSMA(prices, period) {
  const sma = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - (period - 1), i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

// Calculate Exponential Moving Average (EMA)
function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  const ema = [prices[0]]; // Initialize with the first price
  
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  
  return ema;
}

// Calculate MACD (Moving Average Convergence Divergence)
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  // MACD Line = Fast EMA - Slow EMA
  const macdLine = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < slowPeriod - 1) {
      // Not enough data for slow EMA yet
      macdLine.push(0);
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }
  
  // Signal Line = 9-day EMA of MACD Line
  const validMacd = macdLine.slice(slowPeriod - 1);
  const signalLine = calculateEMA(validMacd, signalPeriod);
  
  // Pad signal line to match the original array length
  const paddedSignalLine = Array(slowPeriod + signalPeriod - 2).fill(0).concat(signalLine);
  
  // MACD Histogram = MACD Line - Signal Line
  const histogram = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (i < slowPeriod + signalPeriod - 2) {
      histogram.push(0);
    } else {
      histogram.push(macdLine[i] - paddedSignalLine[i]);
    }
  }
  
  return {
    MACD: macdLine,
    signal: paddedSignalLine,
    histogram: histogram
  };
}

// Calculate Relative Strength Index (RSI)
function calculateRSI(prices, period = 14) {
  if (prices.length <= period) {
    return Array(prices.length).fill(50); // Default to 50 if not enough data
  }
  
  const gains = [];
  const losses = [];
  
  // Calculate price changes
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // Calculate initial averages
  let avgGain = gains.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  
  const rsi = [100 - (100 / (1 + avgGain / (avgLoss === 0 ? 0.001 : avgLoss)))];
  
  // Calculate RSI for remaining periods
  for (let i = period; i < prices.length - 1; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    
    const rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
    rsi.push(100 - (100 / (1 + rs)));
  }
  
  // Pad with initial values to match prices length
  return Array(period).fill(50).concat(rsi);
}

// Create a sample pie chart for portfolio allocation
export const createPortfolioAllocationChart = (positions) => {
  // Group positions by asset type and calculate totals
  const assetGroups = {};
  
  positions.forEach(position => {
    const type = position.type || 'Other';
    if (!assetGroups[type]) {
      assetGroups[type] = 0;
    }
    assetGroups[type] += position.value;
  });
  
  // Convert to array format for chart
  const data = Object.entries(assetGroups).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2))
  }));
  
  return {
    chartConfig: {
      type: 'pie',
      data: data,
      nameKey: 'name',
      valueKey: 'value',
      title: 'Portfolio Allocation'
    }
  };
}; 

/**
 * Creates an intelligent chart based on user intent, data analysis, and indicator feasibility
 * @param {string|Array} symbol - Stock symbol(s) to chart (string for single, array for comparison)
 * @param {string} userQuery - The original user query to analyze for intent
 * @param {string} timeframe - Time period for the chart (e.g., '1w', '1m', '3m', '1y')
 * @return {Object} Chart configuration and data
 */
export const createIntelligentChart = async (symbol, userQuery, timeframe = '1m') => {
  console.log(`Creating intelligent chart for ${Array.isArray(symbol) ? symbol.join(', ') : symbol}`);
  
  // Analyze if this is a comparison chart request
  const isComparisonChart = Array.isArray(symbol) && symbol.length > 1;
  
  // Analyze user query for indicators and other parameters
  const indicators = analyzeChartIntent(userQuery);
  
  if (isComparisonChart) {
    console.log(`Processing comparison chart with indicators: ${indicators.join(', ')}`);
    return createTestComparisonChart(symbol, timeframe, indicators.length > 0, indicators.includes('price_comparison'));
  } else {
    // Handle single stock chart
    const singleSymbol = Array.isArray(symbol) ? symbol[0] : symbol;
    console.log(`Processing single stock chart for ${singleSymbol} with indicators: ${indicators.join(', ')}`);
    return createTestStockChart(singleSymbol, timeframe, indicators);
  }
};

/**
 * Analyzes the user query to determine chart intent and appropriate indicators
 * @param {string} query - The user's original query
 * @return {Array} List of indicators to include
 */
function analyzeChartIntent(query) {
  const indicators = [];
  const normalizedQuery = query.toLowerCase();
  
  // Check for explicit indicators
  if (normalizedQuery.includes('sma') || 
      normalizedQuery.includes('simple moving average') || 
      normalizedQuery.includes('moving average')) {
    indicators.push('sma');
  }
  
  if (normalizedQuery.includes('ema') || 
      normalizedQuery.includes('exponential moving average')) {
    indicators.push('ema');
  }
  
  if (normalizedQuery.includes('macd') || 
      normalizedQuery.includes('moving average convergence divergence')) {
    indicators.push('macd');
  }
  
  if (normalizedQuery.includes('rsi') || 
      normalizedQuery.includes('relative strength') || 
      normalizedQuery.includes('overbought') || 
      normalizedQuery.includes('oversold')) {
    indicators.push('rsi');
  }
  
  // Check for trend analysis requests
  if (normalizedQuery.includes('trend') || 
      normalizedQuery.includes('analysis') || 
      normalizedQuery.includes('technical')) {
    // If general trend analysis requested, include useful indicators
    if (indicators.length === 0) {
      indicators.push('sma');
      indicators.push('ema');
    }
  }
  
  // Check for volatility or momentum
  if (normalizedQuery.includes('volatil') || 
      normalizedQuery.includes('momentum') || 
      normalizedQuery.includes('strength')) {
    if (!indicators.includes('rsi')) {
      indicators.push('rsi');
    }
  }
  
  // Check for comparison intent
  if (normalizedQuery.includes('compar') || 
      normalizedQuery.includes('versus') || 
      normalizedQuery.includes(' vs ') || 
      normalizedQuery.includes('against')) {
    indicators.push('price_comparison');
  }
  
  // If no specific indicators were requested but the query asks for "all" indicators
  if (indicators.length === 0 && 
     (normalizedQuery.includes('all indicator') || 
      normalizedQuery.includes('every indicator') || 
      normalizedQuery.includes('full analysis'))) {
    indicators.push('all');
  }
  
  // Default to SMA if no indicators were specified
  if (indicators.length === 0) {
    indicators.push('sma');
  }
  
  return indicators;
} 