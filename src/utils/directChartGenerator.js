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

// Generate random stock price data with realistic patterns
export const createTestStockChart = (symbol, timeframe = '1m') => {
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
  const data = dates.map((date, index) => ({
    date,
    value: parseFloat(prices[index].toFixed(2))
  }));
  
  return {
    chartConfig: {
      type: 'line',
      data: data,
      xKey: 'date',
      yKey: 'value',
      title: `${symbol} Price History (${timeframe.toUpperCase()})`
    }
  };
};

// Create comparison chart data for multiple assets
export const createTestComparisonChart = (symbols, timeframe = '1m') => {
  // Define time period
  const days = timeframe === '1w' ? 7 :
               timeframe === '2w' ? 14 :
               timeframe === '1m' ? 30 :
               timeframe === '3m' ? 90 :
               timeframe === '6m' ? 180 :
               timeframe === '1y' ? 365 : 30;
  
  // Generate dates
  const dates = [];
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  // Generate normalized price data for each symbol
  const symbolsData = {};
  const series = [];
  
  symbols.forEach(symbol => {
    // Generate base data for this symbol
    const baseChart = createTestStockChart(symbol, timeframe);
    const priceData = baseChart.chartConfig.data.map(point => point.value);
    
    // Normalize to percentage change from starting value
    const startValue = priceData[0];
    const normalizedData = priceData.map(price => (price / startValue) * 100);
    
    // Store normalized values
    symbolsData[symbol] = normalizedData;
    
    // Add to series config
    series.push({
      name: symbol,
      dataKey: symbol
    });
  });
  
  // Combine into a single dataset
  const data = dates.map((date, index) => {
    const dataPoint = { date };
    symbols.forEach(symbol => {
      dataPoint[symbol] = parseFloat(symbolsData[symbol][index].toFixed(2));
    });
    return dataPoint;
  });
  
  return {
    chartConfig: {
      type: 'comparison',
      data: data,
      xKey: 'date',
      title: `Performance Comparison (${timeframe.toUpperCase()})`
    },
    series: series
  };
};

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