// Script to generate chart data directly from Gemini API and save to file
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure the API
const API_KEY = "AIzaSyDJ7tT1DyZ4FnSWIc4UazjYL4gGCo6vN0Y";
const genAI = new GoogleGenerativeAI(API_KEY);

// Path to save the generated chart data
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const CHART_DATA_FILE = path.join(DATA_DIR, 'chartData.json');

// Make sure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Define the function declaration for line chart
const lineChartSchema = {
  name: 'create_line_chart',
  description: 'Creates a line chart for stock price data',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'The title for the chart.',
      },
      data: {
        type: 'array',
        description: 'Array of data points with date and value properties',
        items: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format'
            },
            value: {
              type: 'number',
              description: 'Stock price value for that date'
            }
          }
        }
      }
    },
    required: ['title', 'data']
  }
};

// Define the function declaration for comparison chart
const comparisonChartSchema = {
  name: 'create_comparison_chart',
  description: 'Creates a multi-line chart comparing multiple stocks',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'The title for the chart.',
      },
      data: {
        type: 'array',
        description: 'Array of data points with date and values for each stock',
        items: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date in YYYY-MM-DD format'
            },
            // Other properties will be dynamically named after stock symbols
          }
        }
      },
      series: {
        type: 'array',
        description: 'Configuration for each series in the chart',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Display name for the series'
            },
            dataKey: {
              type: 'string',
              description: 'Property name in data objects for this series'
            }
          }
        }
      }
    },
    required: ['title', 'data', 'series']
  }
};

// Generate a stock chart using Gemini
async function generateStockChart(symbol) {
  console.log(`Generating chart for ${symbol}...`);
  
  const prompt = `Create a line chart showing 30 days of stock price data for ${symbol}.
  The data should include realistic price movements and trends.
  Include exactly 30 data points with dates in YYYY-MM-DD format and corresponding price values.`;

  try {
    const result = await genAI.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048
      },
      tools: [{
        functionDeclarations: [lineChartSchema]
      }]
    });

    const response = result.response;
    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0];
      console.log(`Function called: ${functionCall.name}`);
      
      return {
        id: `stock_${symbol}_${Date.now()}`,
        chartData: {
          chartConfig: {
            type: 'line',
            data: functionCall.args.data,
            xKey: 'date',
            yKey: 'value',
            title: functionCall.args.title || `${symbol} Stock Price`
          }
        },
        timestamp: new Date()
      };
    } else {
      console.log("No function call found in response");
      console.log(response.text());
      return generateFallbackStockChart(symbol);
    }
  } catch (error) {
    console.error(`Error generating chart for ${symbol}:`, error);
    return generateFallbackStockChart(symbol);
  }
}

// Generate a comparison chart using Gemini
async function generateComparisonChart(symbols) {
  console.log(`Generating comparison chart for ${symbols.join(', ')}...`);
  
  const prompt = `Create a comparison chart showing price performance for these stocks: ${symbols.join(', ')}.
  Include 30 data points with dates in YYYY-MM-DD format.
  For each date, include price values for each of the stocks.
  Make sure to create realistic relative performance between the stocks.`;

  try {
    const result = await genAI.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048
      },
      tools: [{
        functionDeclarations: [comparisonChartSchema]
      }]
    });

    const response = result.response;
    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0];
      console.log(`Function called: ${functionCall.name}`);
      
      return {
        id: `comparison_${symbols.join('_')}_${Date.now()}`,
        chartData: {
          chartConfig: {
            type: 'comparison',
            data: functionCall.args.data,
            xKey: 'date',
            title: functionCall.args.title || `Comparison: ${symbols.join(' vs ')}`
          },
          series: functionCall.args.series || symbols.map(symbol => ({
            name: symbol,
            dataKey: symbol
          }))
        },
        timestamp: new Date()
      };
    } else {
      console.log("No function call found in response");
      console.log(response.text());
      return generateFallbackComparisonChart(symbols);
    }
  } catch (error) {
    console.error(`Error generating comparison chart:`, error);
    return generateFallbackComparisonChart(symbols);
  }
}

// Fallback chart generation
function generateFallbackStockChart(symbol) {
  console.log(`Generating fallback chart for ${symbol}`);
  
  const data = [];
  const today = new Date();
  let basePrice = 100 + (symbol.charCodeAt(0) % 100); // Use first char code for some variety
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Add some random movement
    basePrice = basePrice * (1 + (Math.random() - 0.48) * 0.03); // Slight upward bias
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: parseFloat(basePrice.toFixed(2))
    });
  }
  
  return {
    id: `stock_${symbol}_${Date.now()}`,
    chartData: {
      chartConfig: {
        type: 'line',
        data: data,
        xKey: 'date',
        yKey: 'value',
        title: `${symbol} Stock Price (Fallback)`
      }
    },
    timestamp: new Date()
  };
}

function generateFallbackComparisonChart(symbols) {
  console.log(`Generating fallback comparison chart for ${symbols.join(', ')}`);
  
  const data = [];
  const today = new Date();
  const basePrices = {};
  
  // Initialize base prices
  symbols.forEach(symbol => {
    basePrices[symbol] = 100; // All start at 100 for easy comparison
  });
  
  // Generate data points
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const dataPoint = {
      date: date.toISOString().split('T')[0]
    };
    
    // Update each symbol's price
    symbols.forEach(symbol => {
      const bias = (symbol.charCodeAt(0) % 5) / 100; // Different trend per symbol
      basePrices[symbol] *= (1 + (Math.random() - 0.48 + bias) * 0.03);
      dataPoint[symbol] = parseFloat(basePrices[symbol].toFixed(2));
    });
    
    data.push(dataPoint);
  }
  
  // Create series config
  const series = symbols.map(symbol => ({
    name: symbol,
    dataKey: symbol
  }));
  
  return {
    id: `comparison_${symbols.join('_')}_${Date.now()}`,
    chartData: {
      chartConfig: {
        type: 'comparison',
        data: data,
        xKey: 'date',
        title: `Comparison: ${symbols.join(' vs ')} (Fallback)`
      },
      series: series
    },
    timestamp: new Date()
  };
}

// Main function to generate charts and save to file
async function generateCharts() {
  try {
    const charts = [];
    
    // Empty arrays - no sample base charts
    const stockSymbols = [];
    const comparisonGroups = [];
    
    // Generate individual stock charts (only if symbols are provided)
    for (const symbol of stockSymbols) {
      const chart = await generateStockChart(symbol);
      charts.push(chart);
    }
    
    // Generate comparison charts (only if groups are provided)
    for (const group of comparisonGroups) {
      const chart = await generateComparisonChart(group);
      charts.push(chart);
    }
    
    // Save charts to file (only if there are charts to save)
    if (charts.length > 0) {
      fs.writeFileSync(CHART_DATA_FILE, JSON.stringify(charts, null, 2));
      console.log(`Successfully generated ${charts.length} charts and saved to ${CHART_DATA_FILE}`);
    } else {
      // Create empty array if no charts
      fs.writeFileSync(CHART_DATA_FILE, JSON.stringify([], null, 2));
      console.log(`No charts generated. Saved empty array to ${CHART_DATA_FILE}`);
    }
  } catch (error) {
    console.error('Error generating charts:', error);
  }
}

// Run the chart generation
generateCharts().catch(console.error); 