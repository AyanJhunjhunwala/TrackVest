import { GoogleGenerativeAI } from '@google/generative-ai';
import { chartEmitter } from '../hooks/useChartSubscription';

// Initialize Google Generative AI
const getGeminiApiKey = () => localStorage.getItem('geminiApiKey') || '';
const genAI = new GoogleGenerativeAI(getGeminiApiKey());

// Function declaration for creating a Plotly chart
const plotlyChartFunctionDeclaration = {
  name: 'create_plotly_chart',
  description: 'Creates a Plotly.js chart configuration for financial data',
  parameters: {
    type: "OBJECT",
    properties: {
      data: {
        type: "ARRAY",
        description: 'Array of Plotly.js traces with x, y, type, mode, name properties',
        items: {
          type: "OBJECT",
          properties: {
            type: {
              type: "STRING",
              description: 'Type of chart (line, bar, scatter, candlestick, etc.)',
              enum: ['line', 'bar', 'scatter', 'pie', 'candlestick', 'histogram', 'heatmap', 'box']
            },
            x: {
              type: "ARRAY",
              description: 'Array of x values (can be dates, categories, or numbers)',
              items: {
                type: "STRING",
                description: "X-axis value (usually a date string)"
              }
            },
            y: {
              type: "ARRAY",
              description: 'Array of y values',
              items: {
                type: "NUMBER",
                description: "Y-axis value (usually a numeric price or value)"
              }
            },
            name: {
              type: "STRING",
              description: 'Name of the trace for the legend'
            },
            mode: {
              type: "STRING",
              description: 'Mode for scatter/line traces',
              enum: ['lines', 'markers', 'lines+markers', 'text', 'none']
            },
            marker: {
              type: "OBJECT",
              description: 'Marker styling options'
            },
            line: {
              type: "OBJECT",
              description: 'Line styling options'
            },
            visible: {
              type: "STRING",
              description: 'Visibility of the trace (true, false, or "legendonly")',
              enum: ["true", "false", "legendonly"]
            },
            showlegend: {
              type: "BOOLEAN",
              description: 'Whether to show this trace in the legend'
            },
            legendgroup: {
              type: "STRING",
              description: 'Group traces to toggle visibility together in legend'
            },
            fill: {
              type: "STRING",
              description: 'Fill area under/between traces',
              enum: ["none", "tozeroy", "tozerox", "tonexty", "tonextx", "toself", "tonext"]
            },
            fillcolor: {
              type: "STRING",
              description: 'Color of fill area'
            },
            hoverinfo: {
              type: "STRING",
              description: 'Determines which trace information appears on hover'
            }
          },
          required: ['type']
        }
      },
      layout: {
        type: "OBJECT",
        description: 'Plotly.js layout configuration',
        properties: {
          title: {
            type: "STRING",
            description: 'Chart title'
          },
          xaxis: {
            type: "OBJECT",
            description: 'X-axis configuration',
            properties: {
              title: {
                type: "STRING",
                description: "X-axis title"
              },
              rangeslider: {
                type: "OBJECT",
                description: "Range slider configuration",
                properties: {
                  visible: {
                    type: "BOOLEAN",
                    description: "Show range slider"
                  }
                }
              },
              type: {
                type: "STRING",
                description: "Axis type",
                enum: ["linear", "log", "date", "category"]
              },
              showgrid: {
                type: "BOOLEAN",
                description: "Show grid lines"
              }
            }
          },
          yaxis: {
            type: "OBJECT",
            description: 'Y-axis configuration',
            properties: {
              title: {
                type: "STRING",
                description: "Y-axis title"
              },
              type: {
                type: "STRING",
                description: "Axis type",
                enum: ["linear", "log", "date", "category"]
              },
              showgrid: {
                type: "BOOLEAN",
                description: "Show grid lines"
              },
              fixedrange: {
                type: "BOOLEAN",
                description: "Prevent y-axis from being zoomed"
              }
            }
          },
          yaxis2: {
            type: "OBJECT",
            description: 'Secondary Y-axis configuration for indicators',
            properties: {
              title: {
                type: "STRING",
                description: "Secondary Y-axis title"
              },
              overlaying: {
                type: "STRING",
                description: "Axis to overlay on",
                enum: ["y"]
              },
              side: {
                type: "STRING",
                description: "Side to place the axis",
                enum: ["right"]
              },
              showgrid: {
                type: "BOOLEAN",
                description: "Show grid lines"
              }
            }
          },
          legend: {
            type: "OBJECT",
            description: 'Legend configuration',
            properties: {
              orientation: {
                type: "STRING",
                description: "Legend orientation",
                enum: ["h", "v"]
              },
              y: {
                type: "NUMBER",
                description: "Legend y position"
              },
              x: {
                type: "NUMBER",
                description: "Legend x position"
              },
              xanchor: {
                type: "STRING",
                description: "Legend horizontal anchor",
                enum: ["auto", "left", "center", "right"]
              },
              yanchor: {
                type: "STRING",
                description: "Legend vertical anchor",
                enum: ["auto", "top", "middle", "bottom"]
              }
            }
          },
          annotations: {
            type: "ARRAY",
            description: 'Annotations to show on the chart',
            items: {
              type: "OBJECT",
              description: "Individual annotation object",
              properties: {
                text: {
                  type: "STRING",
                  description: "Annotation text"
                },
                x: {
                  type: "STRING",
                  description: "X position of annotation"
                },
                y: {
                  type: "NUMBER",
                  description: "Y position of annotation"
                },
                showarrow: {
                  type: "BOOLEAN",
                  description: "Show arrow with annotation"
                },
                arrowhead: {
                  type: "INTEGER",
                  description: "Arrow head style (1-8)"
                },
                arrowcolor: {
                  type: "STRING",
                  description: "Arrow color"
                },
                arrowsize: {
                  type: "NUMBER",
                  description: "Arrow size"
                },
                bgcolor: {
                  type: "STRING",
                  description: "Background color for annotation"
                },
                bordercolor: {
                  type: "STRING",
                  description: "Border color for annotation"
                }
              }
            }
          },
          shapes: {
            type: "ARRAY",
            description: 'Shapes to add to the chart (lines, rectangles, etc.)',
            items: {
              type: "OBJECT",
              description: "Shape object",
              properties: {
                type: {
                  type: "STRING",
                  description: "Shape type",
                  enum: ["line", "rect", "circle", "path"]
                },
                x0: {
                  type: "STRING",
                  description: "X0 coordinate"
                },
                y0: {
                  type: "NUMBER",
                  description: "Y0 coordinate"
                },
                x1: {
                  type: "STRING",
                  description: "X1 coordinate"
                },
                y1: {
                  type: "NUMBER",
                  description: "Y1 coordinate"
                },
                line: {
                  type: "OBJECT",
                  description: "Line properties",
                  properties: {
                    color: {
                      type: "STRING",
                      description: "Line color"
                    },
                    width: {
                      type: "NUMBER",
                      description: "Line width"
                    },
                    dash: {
                      type: "STRING",
                      description: "Line dash style",
                      enum: ["solid", "dot", "dash", "longdash", "dashdot", "longdashdot"]
                    }
                  }
                },
                fillcolor: {
                  type: "STRING",
                  description: "Fill color"
                }
              }
            }
          },
          hovermode: {
            type: "STRING",
            description: 'Hover interaction mode',
            enum: ["closest", "x", "y", "x unified", "y unified"]
          },
          dragmode: {
            type: "STRING",
            description: 'Drag interaction mode',
            enum: ["zoom", "pan", "select", "lasso", "orbit", "turntable"]
          },
          template: {
            type: "STRING",
            description: 'Chart template to use',
            enum: ["plotly", "plotly_white", "plotly_dark", "ggplot2", "seaborn", "simple_white"]
          },
          margin: {
            type: "OBJECT",
            description: 'Chart margins',
            properties: {
              l: {
                type: "INTEGER",
                description: "Left margin"
              },
              r: {
                type: "INTEGER",
                description: "Right margin"
              },
              t: {
                type: "INTEGER",
                description: "Top margin"
              },
              b: {
                type: "INTEGER",
                description: "Bottom margin"
              },
              pad: {
                type: "INTEGER",
                description: "Padding between plot and margins"
              }
            }
          }
        },
        required: ['title']
      },
      config: {
        type: "OBJECT",
        description: 'Plotly.js configuration options',
        properties: {
          responsive: {
            type: "BOOLEAN",
            description: 'Whether the chart is responsive'
          },
          displayModeBar: {
            type: "BOOLEAN",
            description: 'Whether to display the mode bar'
          },
          scrollZoom: {
            type: "BOOLEAN",
            description: 'Enable zoom via scrolling'
          },
          showTips: {
            type: "BOOLEAN",
            description: 'Show chart tips'
          },
          toImageButtonOptions: {
            type: "OBJECT",
            description: 'Options for the toImage button',
            properties: {
              format: {
                type: "STRING",
                description: "Image format",
                enum: ["png", "svg", "jpeg", "webp"]
              },
              filename: {
                type: "STRING",
                description: "Default filename"
              }
            }
          }
        }
      }
    },
    required: ['data', 'layout']
  }
};

/**
 * Generate a Plotly.js chart based on a natural language description
 * @param {string} request - Natural language description of the chart to create
 * @param {object} chartData - Data to use for the chart
 * @return {Promise<object>} - Plotly chart configuration
 */
export const generatePlotlyChart = async (request, chartData) => {
  try {
    // Create a prompt for Gemini that includes the request and data
    const dataDescription = JSON.stringify(chartData, null, 2);
    
    const prompt = `Generate a Plotly.js chart configuration based on this request: "${request}"
    
    Use the following data to create the chart:
    ${dataDescription}
    
    Create a sophisticated financial chart with these features:
    1. Create a clear, visually appealing chart with 'plotly_white' template
    2. Use a modern color palette with good contrast
    3. Include a range slider for time series data 
    4. Add meaningful annotations for key data points (max, min, significant events)
    5. Format large numbers with K, M, B suffixes
    6. Format percentages with proper decimal places
    7. For stock/financial charts:
       - Show trading volume as a bar chart at the bottom if volume data is available
       - Include requested technical indicators (SMA, EMA, MACD, RSI, Bollinger Bands)
       - For candlestick charts, use green/red for up/down days
       - For MACD charts, use histogram bars with proper coloring
       - For RSI, include overbought (70) and oversold (30) reference lines
    8. For comparison charts:
       - Use distinct colors for different assets
       - Add annotations comparing performance
       - Include percent change reference
    9. For technical analysis charts:
       - Use a multi-panel layout with main price chart on top
       - Place indicators in separate panels below the main chart
       - Ensure proper scaling for each indicator
    10. Make all charts interactive with useful hover information
    
    Return only the Plotly.js configuration object with data, layout, and config properties.`;

    // Get the model instance
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Call generateContent with the prompt
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192
      },
      tools: [{
        functionDeclarations: [plotlyChartFunctionDeclaration]
      }]
    });
    
    // Check for function calls in the response
    const response = result.response;
    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0];
      
      if (functionCall.name === 'create_plotly_chart') {
        try {
          const chartConfig = functionCall.args;
          // Make sure we return a properly structured object with data and layout
          return {
            data: chartConfig.data || [],
            layout: chartConfig.layout || {},
            config: chartConfig.config || { responsive: true }
          };
        } catch (error) {
          console.error("Error processing function call:", error);
          throw error;
        }
      }
    }
    
    // If no function call found, try to extract JSON from text response
    const responseText = response.text();
    console.log("Raw response:", responseText.substring(0, 200) + "...");
    
    try {
      // Look for JSON in the response - try different parsing strategies
      // First attempt: direct parse if it looks like JSON
      if (responseText.trim().startsWith('{') && responseText.trim().endsWith('}')) {
        try {
          const parsedData = JSON.parse(responseText.trim());
          return {
            data: parsedData.data || [],
            layout: parsedData.layout || {},
            config: parsedData.config || { responsive: true }
          };
        } catch (e) {
          console.error("Direct parse failed:", e);
        }
      }
      
      // Second attempt: Look for JSON object pattern
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedData = JSON.parse(jsonMatch[0]);
          return {
            data: parsedData.data || [],
            layout: parsedData.layout || {},
            config: parsedData.config || { responsive: true }
          };
        } catch (e) {
          console.error("JSON extraction failed:", e);
        }
      }
      
      // Third attempt: Try to clean up markdown code blocks
      const cleanedJson = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      if (cleanedJson.startsWith('{') && cleanedJson.endsWith('}')) {
        try {
          const parsedData = JSON.parse(cleanedJson);
          return {
            data: parsedData.data || [],
            layout: parsedData.layout || {},
            config: parsedData.config || { responsive: true }
          };
        } catch (e) {
          console.error("Cleaned JSON parse failed:", e);
        }
      }
      
      // All parsing attempts failed, log error and fall back
      console.error("Failed to extract valid JSON from response");
    } catch (error) {
      console.error("Failed to parse JSON from response:", error);
    }
    
    // Fallback to a basic chart if extraction fails
    console.log("Falling back to generated chart");
    
    // Check if we have technical indicators in the request
    const hasTechnicalIndicators = request.toLowerCase().includes('macd') || 
                                 request.toLowerCase().includes('rsi') || 
                                 request.toLowerCase().includes('bollinger');
    
    // For technical charts, use our specialized fallback
    if (hasTechnicalIndicators) {
      const symbol = chartData.symbol || "Stock";
      const indicators = [];
      
      if (request.toLowerCase().includes('macd')) indicators.push('macd');
      if (request.toLowerCase().includes('rsi')) indicators.push('rsi');
      if (request.toLowerCase().includes('bollinger')) indicators.push('bollinger');
      if (request.toLowerCase().includes('volume')) indicators.push('volume');
      
      return createTechnicalChartFallback(symbol, chartData.priceData || [], indicators);
    }
    
    // For regular charts, use the standard fallback
    return generateFallbackChart(request, chartData);
  } catch (error) {
    console.error("Error generating Plotly chart:", error);
    return generateFallbackChart(request, chartData);
  }
};

/**
 * Create a stock price chart with Plotly.js
 * @param {string} symbol - Stock symbol
 * @param {Array} priceData - Array of price data objects with date and price
 * @param {Array} indicators - Array of technical indicators to include
 * @return {object} - Plotly chart configuration
 */
export const createStockPriceChart = async (symbol, priceData, indicators = []) => {
  if (!priceData || priceData.length === 0) {
    console.error("No price data provided for chart");
    return null;
  }
  
  try {
    // Basic data transformation
    const dates = priceData.map(item => item.date);
    const prices = priceData.map(item => item.price || item.close || item.value);
    const volumes = priceData.map(item => item.volume || 0);
    
    // Extract high, low, open, close for candlestick if available
    const hasOHLC = priceData.some(item => item.open && item.high && item.low && item.close);
    
    // Create chart request based on indicators
    let chartRequest = `Create an interactive stock price chart for ${symbol}`;
    if (indicators.length > 0) {
      chartRequest += ` with ${indicators.join(', ')} indicators`;
    }
    
    // Add type of chart requested (candlestick if OHLC data available)
    if (hasOHLC) {
      chartRequest += ` using candlestick chart`;
    }
    
    // Add additional context for complex visualization
    if (indicators.includes('bollinger')) {
      chartRequest += ` and Bollinger Bands (20,2)`;
    }
    if (indicators.includes('sma')) {
      chartRequest += ` with 50 and 200 day SMAs`;
    }
    if (indicators.includes('volume')) {
      chartRequest += ` including volume bars at the bottom`;
    }
    
    // Create enhanced data structure for Gemini
    const chartData = {
      symbol,
      dates,
      prices,
      volumes,
      indicators,
      priceData: hasOHLC ? priceData.map(item => ({
        date: item.date,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      })) : null
    };
    
    // Generate chart configuration
    const config = await generatePlotlyChart(chartRequest, chartData);
    
    // Create chart ID and add to system
    const chartId = `stock_${symbol}_${Date.now()}`;
    
    // Update chartEmitter with the correct plotlyConfig format
    chartEmitter.updateChart(chartId, { 
      plotlyConfig: config 
    });
    
    return config;
  } catch (error) {
    console.error(`Error creating stock price chart for ${symbol}:`, error);
    return null;
  }
};

/**
 * Create a comparison chart for multiple stocks
 * @param {Array} symbols - Array of stock symbols
 * @param {Object} priceData - Object with symbol keys and arrays of price data
 * @return {object} - Plotly chart configuration
 */
export const createComparisonChart = async (symbols, priceData) => {
  if (!symbols || symbols.length === 0 || !priceData) {
    console.error("Invalid data for comparison chart");
    return null;
  }
  
  try {
    // Create chart request
    const chartRequest = `Create a comparison chart for ${symbols.join(', ')} showing price performance`;
    
    // Generate chart configuration
    const config = await generatePlotlyChart(chartRequest, priceData);
    
    // Create chart ID and add to system
    const chartId = `comparison_${symbols.join('_')}_${Date.now()}`;
    
    // Update chartEmitter with the correct plotlyConfig format
    chartEmitter.updateChart(chartId, { 
      plotlyConfig: config 
    });
    
    return config;
  } catch (error) {
    console.error(`Error creating comparison chart:`, error);
    return null;
  }
};

/**
 * Generate a fallback chart when the API fails
 * @param {string} request - Original chart request
 * @param {object} chartData - Data for the chart
 * @return {object} - Basic Plotly chart configuration
 */
const generateFallbackChart = (request, chartData) => {
  const isComparison = request.toLowerCase().includes('comparison') || 
                      (chartData.symbol && Array.isArray(chartData.symbol) && chartData.symbol.length > 1);
  
  // Check if we have candlestick data
  const hasCandlestickData = chartData.priceData && chartData.priceData.length > 0;
  
  // Determine if we should include volume
  const includeVolume = request.toLowerCase().includes('volume') || 
                       chartData.volumes && chartData.volumes.some(v => v > 0);
  
  // Check if indicators are requested
  const indicators = [];
  if (request.toLowerCase().includes('sma') || 
      (chartData.indicators && chartData.indicators.includes('sma'))) {
    indicators.push('sma');
  }
  if (request.toLowerCase().includes('ema') || 
      (chartData.indicators && chartData.indicators.includes('ema'))) {
    indicators.push('ema');
  }
  if (request.toLowerCase().includes('bollinger') || 
      (chartData.indicators && chartData.indicators.includes('bollinger'))) {
    indicators.push('bollinger');
  }
  
  if (isComparison) {
    // Enhanced comparison chart
    const traces = [];
    
    // Create traces for each symbol
    Object.keys(chartData).filter(key => key !== 'dates' && key !== 'indicators').forEach((symbol, index) => {
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: symbol,
        x: chartData.dates,
        y: chartData[symbol],
        line: {
          width: 2,
          color: getColorByIndex(index)
        },
        hovertemplate: `${symbol}: %{y:.2f}<br>Date: %{x}<extra></extra>`
      });
    });
    
    return {
      data: traces,
      layout: {
        title: `Price Comparison Chart`,
        template: 'plotly_white',
        xaxis: {
          title: 'Date',
          rangeslider: { visible: true }
        },
        yaxis: {
          title: 'Price',
          gridwidth: 1,
          gridcolor: 'rgba(203, 213, 225, 0.5)',
          zerolinecolor: 'rgba(203, 213, 225, 0.8)'
        },
        legend: {
          orientation: 'h',
          y: -0.2,
          xanchor: 'center',
          x: 0.5
        },
        hovermode: 'closest',
        margin: { t: 60, r: 30, b: 60, l: 60 },
        dragmode: 'zoom'
      },
      config: {
        responsive: true,
        displayModeBar: true,
        scrollZoom: true,
        showTips: true
      }
    };
  } else if (hasCandlestickData) {
    // Candlestick chart with optional indicators
    const traces = [
      // Candlestick trace
      {
        type: 'candlestick',
        name: chartData.symbol || 'Stock',
        x: chartData.priceData.map(d => d.date),
        open: chartData.priceData.map(d => d.open),
        high: chartData.priceData.map(d => d.high),
        low: chartData.priceData.map(d => d.low),
        close: chartData.priceData.map(d => d.close),
        increasing: {line: {color: '#26a69a'}, fillcolor: '#26a69a'},
        decreasing: {line: {color: '#ef5350'}, fillcolor: '#ef5350'},
        showlegend: true
      }
    ];
    
    // Add SMA if requested
    if (indicators.includes('sma')) {
      const sma20 = calculateSMA(chartData.priceData.map(d => d.close), 20);
      const sma50 = calculateSMA(chartData.priceData.map(d => d.close), 50);
      
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'SMA 20',
        x: chartData.priceData.map(d => d.date).slice(19),
        y: sma20,
        line: { color: '#2196F3', width: 1.5 },
        hovertemplate: 'SMA 20: %{y:.2f}<extra></extra>'
      });
      
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'SMA 50',
        x: chartData.priceData.map(d => d.date).slice(49),
        y: sma50,
        line: { color: '#673AB7', width: 1.5 },
        hovertemplate: 'SMA 50: %{y:.2f}<extra></extra>'
      });
    }
    
    // Add volume if available
    if (includeVolume) {
      traces.push({
        type: 'bar',
        name: 'Volume',
        x: chartData.priceData.map(d => d.date),
        y: chartData.priceData.map(d => d.volume),
        marker: {
          color: chartData.priceData.map((d, i) => 
            i > 0 && d.close >= chartData.priceData[i-1].close ? 'rgba(38, 166, 154, 0.15)' : 'rgba(239, 83, 80, 0.15)'
          ),
          line: {
            color: chartData.priceData.map((d, i) => 
              i > 0 && d.close >= chartData.priceData[i-1].close ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
            ),
            width: 1
          }
        },
        yaxis: 'y2',
        hovertemplate: 'Volume: %{y:,.0f}<extra></extra>'
      });
    }
    
    return {
      data: traces,
      layout: {
        title: `${chartData.symbol || 'Stock'} Price Chart`,
        template: 'plotly_white',
        xaxis: {
          title: 'Date',
          rangeslider: { visible: true }
        },
        yaxis: {
          title: 'Price',
          gridwidth: 1,
          gridcolor: 'rgba(203, 213, 225, 0.5)',
          zerolinecolor: 'rgba(203, 213, 225, 0.8)'
        },
        yaxis2: includeVolume ? {
          title: 'Volume',
          overlaying: 'y',
          side: 'right',
          showgrid: false
        } : undefined,
        legend: {
          orientation: 'h',
          y: -0.2,
          xanchor: 'center',
          x: 0.5
        },
        hovermode: 'closest',
        margin: { t: 60, r: 50, b: 60, l: 50 },
        dragmode: 'zoom'
      },
      config: {
        responsive: true,
        displayModeBar: true,
        scrollZoom: true,
        showTips: true
      }
    };
  } else {
    // Enhanced basic stock chart
    const symbol = chartData.symbol || 'Stock';
    const traces = [
      // Main price line
      {
        type: 'scatter',
        mode: 'lines',
        name: symbol,
        x: chartData.dates,
        y: chartData.prices,
        line: {
          width: 2,
          color: '#1E88E5'
        },
        hovertemplate: `${symbol}: %{y:.2f}<br>Date: %{x}<extra></extra>`
      }
    ];
    
    // Add SMA if requested
    if (indicators.includes('sma')) {
      const sma20 = calculateSMA(chartData.prices, 20);
      const sma50 = calculateSMA(chartData.prices, 50);
      
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'SMA 20',
        x: chartData.dates.slice(19),
        y: sma20,
        line: { color: '#2196F3', width: 1.5 },
        hovertemplate: 'SMA 20: %{y:.2f}<extra></extra>'
      });
      
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'SMA 50',
        x: chartData.dates.slice(49),
        y: sma50,
        line: { color: '#673AB7', width: 1.5 },
        hovertemplate: 'SMA 50: %{y:.2f}<extra></extra>'
      });
    }
    
    // Add EMA if requested
    if (indicators.includes('ema')) {
      const ema12 = calculateEMA(chartData.prices, 12);
      const ema26 = calculateEMA(chartData.prices, 26);
      
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'EMA 12',
        x: chartData.dates.slice(11),
        y: ema12,
        line: { color: '#FF9800', width: 1.5 },
        hovertemplate: 'EMA 12: %{y:.2f}<extra></extra>'
      });
      
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'EMA 26',
        x: chartData.dates.slice(25),
        y: ema26,
        line: { color: '#9C27B0', width: 1.5 },
        hovertemplate: 'EMA 26: %{y:.2f}<extra></extra>'
      });
    }
    
    // Add Bollinger Bands if requested
    if (indicators.includes('bollinger')) {
      const { upper, lower, middle } = calculateBollingerBands(chartData.prices, 20, 2);
      
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'Bollinger Upper',
        x: chartData.dates.slice(19),
        y: upper,
        line: { color: 'rgba(244, 67, 54, 0.5)', width: 1, dash: 'dash' },
        hovertemplate: 'Upper Band: %{y:.2f}<extra></extra>'
      });
      
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'Bollinger Middle',
        x: chartData.dates.slice(19),
        y: middle,
        line: { color: 'rgba(76, 175, 80, 0.5)', width: 1 },
        hovertemplate: 'Middle Band: %{y:.2f}<extra></extra>'
      });
      
      traces.push({
        type: 'scatter',
        mode: 'lines',
        name: 'Bollinger Lower',
        x: chartData.dates.slice(19),
        y: lower,
        line: { color: 'rgba(244, 67, 54, 0.5)', width: 1, dash: 'dash' },
        fill: 'tonexty',
        fillcolor: 'rgba(173, 216, 230, 0.1)',
        hovertemplate: 'Lower Band: %{y:.2f}<extra></extra>'
      });
    }
    
    // Add volume if available
    if (includeVolume && chartData.volumes) {
      traces.push({
        type: 'bar',
        name: 'Volume',
        x: chartData.dates,
        y: chartData.volumes,
        marker: {
          color: 'rgba(0, 150, 136, 0.15)',
          line: {
            color: 'rgba(0, 150, 136, 0.5)',
            width: 1
          }
        },
        yaxis: 'y2',
        hovertemplate: 'Volume: %{y:,.0f}<extra></extra>'
      });
    }
    
    return {
      data: traces,
      layout: {
        title: `${symbol} Price Chart`,
        template: 'plotly_white',
        xaxis: {
          title: 'Date',
          rangeslider: { visible: true }
        },
        yaxis: {
          title: 'Price',
          gridwidth: 1,
          gridcolor: 'rgba(203, 213, 225, 0.5)',
          zerolinecolor: 'rgba(203, 213, 225, 0.8)'
        },
        yaxis2: includeVolume ? {
          title: 'Volume',
          titlefont: { color: 'rgb(0, 150, 136)' },
          tickfont: { color: 'rgb(0, 150, 136)' },
          overlaying: 'y',
          side: 'right',
          showgrid: false
        } : undefined,
        legend: {
          orientation: 'h',
          y: -0.2,
          xanchor: 'center',
          x: 0.5
        },
        hovermode: 'closest',
        margin: { t: 60, r: includeVolume ? 60 : 30, b: 60, l: 50 },
        dragmode: 'zoom'
      },
      config: {
        responsive: true,
        displayModeBar: true,
        scrollZoom: true,
        showTips: true
      }
    };
  }
};

/**
 * Calculate Simple Moving Average
 * @param {Array} data - Array of price data
 * @param {Number} period - SMA period
 * @return {Array} - SMA values
 */
const calculateSMA = (data, period) => {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
};

/**
 * Calculate Exponential Moving Average
 * @param {Array} data - Array of price data
 * @param {Number} period - EMA period
 * @return {Array} - EMA values
 */
const calculateEMA = (data, period) => {
  const k = 2 / (period + 1);
  const result = [data[0]];
  
  for (let i = 1; i < data.length; i++) {
    result.push(data[i] * k + result[i - 1] * (1 - k));
  }
  
  // Return only EMA values after the period to match correct calculation
  return result.slice(period - 1);
};

/**
 * Calculate Bollinger Bands
 * @param {Array} data - Array of price data
 * @param {Number} period - Period (typically 20)
 * @param {Number} multiplier - Standard deviation multiplier (typically 2)
 * @return {Object} - Object with upper, middle, and lower bands
 */
const calculateBollingerBands = (data, period = 20, multiplier = 2) => {
  const middle = calculateSMA(data, period);
  const upper = [];
  const lower = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const stdDev = Math.sqrt(slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period);
    
    upper.push(middle[i - (period - 1)] + (multiplier * stdDev));
    lower.push(middle[i - (period - 1)] - (multiplier * stdDev));
  }
  
  return { upper, lower, middle };
};

/**
 * Get a color from our palette based on index
 * @param {number} index - Index to use for color selection
 * @return {string} - Color hex code
 */
const getColorByIndex = (index) => {
  const colors = [
    '#1E88E5', // Blue
    '#00C49F', // Teal
    '#FFBB28', // Yellow
    '#FF8042', // Orange
    '#8884d8', // Purple
    '#82ca9d', // Green
    '#ff6b6b', // Red
    '#a374ff'  // Violet
  ];
  return colors[index % colors.length];
};

/**
 * Analyze a user query to determine chart intent
 * @param {string} query - User's natural language query
 * @return {object} - Intent analysis with chart type, indicators, etc.
 */
export const analyzeChartIntent = async (query) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `Analyze this chart request and extract details about what type of chart to create: "${query}"
    
    Extract the following information and return it in a clean JSON format:
    {
      "chartType": "line|bar|candlestick|scatter|etc",
      "symbols": ["AAPL", "MSFT", etc],
      "indicators": ["sma", "ema", "macd", "rsi", "bollinger", "volume", etc],
      "timePeriod": "1d|1w|1m|3m|6m|1y|5y|max",
      "isComparison": true|false
    }
    
    Rules for extraction:
    1. For symbols, extract ALL stock tickers mentioned (like AAPL, MSFT, IONQ, etc)
    2. For indicators:
       - "sma" for Simple Moving Average
       - "ema" for Exponential Moving Average
       - "macd" for MACD
       - "rsi" for Relative Strength Index
       - "bollinger" for Bollinger Bands
       - "volume" for volume bars
    3. For chartType, prefer candlestick for MACD or other technical analysis
    4. Set isComparison to true if comparing multiple stocks or benchmarks
    
    Return ONLY valid JSON with no explanation or markdown formatting.`;
    
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024
      }
    });
    
    const responseText = result.response.text();
    
    // Extract JSON from response
    try {
      // First attempt: direct parse
      try {
        return JSON.parse(responseText.trim());
      } catch (e) {
        // Second attempt: find JSON object
        const jsonRegex = /\{[\s\S]*\}/g;
        const jsonMatch = responseText.match(jsonRegex);
        if (jsonMatch && jsonMatch[0]) {
          return JSON.parse(jsonMatch[0]);
        }
        
        // Third attempt: remove any markdown code blocks
        const cleanedJson = responseText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        return JSON.parse(cleanedJson);
      }
    } catch (error) {
      console.error("Failed to parse JSON from intent analysis:", error);
      console.log("Raw response:", responseText);
      // Fallback to manual analysis
      return manualIntentAnalysis(query);
    }
  } catch (error) {
    console.error("Error analyzing chart intent:", error);
    return manualIntentAnalysis(query);
  }
};

/**
 * Manual fallback for intent analysis when API fails
 * @param {string} query - User's query
 * @return {object} - Basic intent analysis
 */
const manualIntentAnalysis = (query) => {
  const lowercaseQuery = query.toLowerCase();
  
  // Enhanced ticker extraction - look for uppercase words with 1-5 letters
  // surrounded by word boundaries or common punctuation
  const symbolRegex = /\b[A-Z]{1,5}\b|\$[A-Z]{1,5}/g;
  const matches = query.match(symbolRegex) || [];
  
  // Filter out common words that might be picked up
  const commonWords = ['I', 'A', 'THE', 'FOR', 'AND', 'OR', 'TO', 'IN', 'ON', 'BY', 'AT', 'IS', 'IT', 'BE'];
  const symbols = matches
    .map(m => m.replace('$', ''))
    .filter(m => !commonWords.includes(m));
  
  // Detect chart type
  let chartType = 'line'; // Default
  if (lowercaseQuery.includes('bar chart') || lowercaseQuery.includes('column chart')) {
    chartType = 'bar';
  } else if (lowercaseQuery.includes('candle') || lowercaseQuery.includes('candlestick')) {
    chartType = 'candlestick';
  } else if (lowercaseQuery.includes('scatter')) {
    chartType = 'scatter';
  } else if (lowercaseQuery.includes('pie')) {
    chartType = 'pie';
  } else if (lowercaseQuery.includes('macd') || lowercaseQuery.includes('rsi') || 
             lowercaseQuery.includes('technical')) {
    chartType = 'candlestick'; // Default to candlestick for technical indicators
  }
  
  // Enhanced indicator detection
  const indicators = [];
  if (lowercaseQuery.includes('sma') || lowercaseQuery.includes('simple moving average')) {
    indicators.push('sma');
  }
  if (lowercaseQuery.includes('ema') || lowercaseQuery.includes('exponential moving average')) {
    indicators.push('ema');
  }
  if (lowercaseQuery.includes('macd')) {
    indicators.push('macd');
  }
  if (lowercaseQuery.includes('rsi') || lowercaseQuery.includes('relative strength')) {
    indicators.push('rsi');
  }
  if (lowercaseQuery.includes('bollinger') || lowercaseQuery.includes('bands')) {
    indicators.push('bollinger');
  }
  if (lowercaseQuery.includes('volume')) {
    indicators.push('volume');
  }
  
  // Detect time period with more options
  let timePeriod = '1m'; // Default
  if (lowercaseQuery.includes('today') || lowercaseQuery.includes('1 day') || 
      lowercaseQuery.includes('day') || lowercaseQuery.includes('1d') || 
      lowercaseQuery.includes('daily')) {
    timePeriod = '1d';
  } else if (lowercaseQuery.includes('1 week') || lowercaseQuery.includes('week') || 
            lowercaseQuery.includes('1w') || lowercaseQuery.includes('weekly')) {
    timePeriod = '1w';
  } else if (lowercaseQuery.includes('month') || lowercaseQuery.includes('1m') || 
            lowercaseQuery.includes('monthly') || lowercaseQuery.includes('30 day')) {
    timePeriod = '1m';
  } else if (lowercaseQuery.includes('3 month') || lowercaseQuery.includes('3m') || 
            lowercaseQuery.includes('quarter')) {
    timePeriod = '3m';
  } else if (lowercaseQuery.includes('6 month') || lowercaseQuery.includes('6m') || 
            lowercaseQuery.includes('half year')) {
    timePeriod = '6m';
  } else if (lowercaseQuery.includes('year') || lowercaseQuery.includes('1y') || 
            lowercaseQuery.includes('annual') || lowercaseQuery.includes('12 month')) {
    timePeriod = '1y';
  } else if (lowercaseQuery.includes('5 year') || lowercaseQuery.includes('5y')) {
    timePeriod = '5y';
  } else if (lowercaseQuery.includes('max') || lowercaseQuery.includes('all time') || 
            lowercaseQuery.includes('all-time') || lowercaseQuery.includes('maximum')) {
    timePeriod = 'max';
  }
  
  return {
    chartType,
    symbols,
    indicators: indicators.length > 0 ? indicators : ['sma'], // Default to SMA if nothing specified
    timePeriod,
    isComparison: symbols.length > 1 || lowercaseQuery.includes('compar') || 
                 lowercaseQuery.includes('vs') || lowercaseQuery.includes('versus')
  };
};

/**
 * Create a technical indicator chart (MACD, RSI, etc.) with Plotly.js
 * @param {string} symbol - Stock symbol
 * @param {Array} priceData - Array of price data objects
 * @param {Array} indicators - Array of technical indicators to include
 * @return {object} - Plotly chart configuration
 */
export const createTechnicalIndicatorChart = async (symbol, priceData, indicators = ['macd']) => {
  if (!priceData || priceData.length === 0) {
    console.error("No price data provided for technical chart");
    return null;
  }
  
  try {
    // Basic data transformation
    const dates = priceData.map(item => item.date);
    const prices = priceData.map(item => item.price || item.close || item.value);
    const volumes = priceData.map(item => item.volume || 0);
    
    // Extract OHLC data if available
    const hasOHLC = priceData.some(item => item.open && item.high && item.low && item.close);
    const ohlcData = hasOHLC ? priceData.map(item => ({
      date: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume
    })) : null;
    
    // Calculate technical indicators
    const technicalData = {};
    
    // Calculate MACD if requested
    if (indicators.includes('macd')) {
      const ema12 = calculateEMA(prices, 12);
      const ema26 = calculateEMA(prices, 26);
      
      // MACD line = EMA(12) - EMA(26)
      const macdLine = [];
      for (let i = 0; i < ema12.length && i < ema26.length; i++) {
        macdLine.push(ema12[i] - ema26[i]);
      }
      
      // Signal line = EMA(9) of MACD line
      const signalLine = calculateEMA(macdLine, 9);
      
      // Histogram = MACD line - Signal line
      const histogram = [];
      for (let i = 0; i < macdLine.length && i < signalLine.length; i++) {
        histogram.push(macdLine[i] - signalLine[i]);
      }
      
      // Store MACD data
      technicalData.macd = {
        line: macdLine,
        signal: signalLine,
        histogram: histogram,
        // Adjust dates to match the MACD data length
        dates: dates.slice(25 + 8) // 26 for EMA(26) + 9 for Signal EMA
      };
    }
    
    // Calculate RSI if requested
    if (indicators.includes('rsi')) {
      const rsiValues = calculateRSI(prices, 14);
      
      technicalData.rsi = {
        values: rsiValues,
        dates: dates.slice(14) // RSI needs at least 14 periods
      };
    }
    
    // Create a more descriptive chart request
    let chartRequest = `Create an interactive technical analysis chart for ${symbol}`;
    
    if (indicators.includes('macd')) {
      chartRequest += ` with MACD (12,26,9)`;
    }
    
    if (indicators.includes('rsi')) {
      chartRequest += `${indicators.includes('macd') ? ' and' : ' with'} RSI (14)`;
    }
    
    if (indicators.includes('bollinger')) {
      chartRequest += `${indicators.includes('macd') || indicators.includes('rsi') ? ' and' : ' with'} Bollinger Bands (20,2)`;
    }
    
    if (hasOHLC) {
      chartRequest += ` using candlestick chart`;
    }
    
    if (indicators.includes('volume')) {
      chartRequest += ` with volume bars`;
    }
    
    // Create enhanced data structure for Gemini
    const chartData = {
      symbol,
      dates,
      prices,
      volumes,
      indicators,
      priceData: ohlcData,
      technicalData
    };
    
    // Generate chart configuration using Gemini
    const config = await generatePlotlyChart(chartRequest, chartData);
    
    // If Gemini fails to create a good chart, use our fallback
    if (!config || !config.data || config.data.length === 0) {
      return createTechnicalChartFallback(symbol, priceData, indicators, technicalData);
    }
    
    // Create chart ID and add to system
    const chartId = `technical_${symbol}_${Date.now()}`;
    
    // Update chartEmitter with the correct plotlyConfig format
    chartEmitter.updateChart(chartId, { 
      plotlyConfig: config 
    });
    
    return config;
  } catch (error) {
    console.error(`Error creating technical chart for ${symbol}:`, error);
    return createTechnicalChartFallback(symbol, priceData, indicators);
  }
};

/**
 * Create a fallback technical indicator chart when Gemini fails
 * @param {string} symbol - Stock symbol
 * @param {Array} priceData - Array of price data objects
 * @param {Array} indicators - Indicators to include
 * @param {Object} technicalData - Pre-calculated technical indicators
 * @return {object} - Plotly chart configuration
 */
const createTechnicalChartFallback = (symbol, priceData, indicators = ['macd'], technicalData = null) => {
  // Basic data preparation
  const dates = priceData.map(item => item.date);
  const prices = priceData.map(item => item.price || item.close || item.value);
  const volumes = priceData.map(item => item.volume || 0);
  const hasOHLC = priceData.some(item => item.open && item.high && item.low && item.close);
  
  // Create traces array
  const traces = [];
  
  // Main price chart (candlestick or line)
  if (hasOHLC) {
    traces.push({
      type: 'candlestick',
      name: symbol,
      x: dates,
      open: priceData.map(d => d.open),
      high: priceData.map(d => d.high),
      low: priceData.map(d => d.low),
      close: priceData.map(d => d.close),
      increasing: {line: {color: '#26a69a'}, fillcolor: '#26a69a'},
      decreasing: {line: {color: '#ef5350'}, fillcolor: '#ef5350'},
      yaxis: 'y',
      showlegend: true
    });
  } else {
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: symbol,
      x: dates,
      y: prices,
      line: {
        width: 2,
        color: '#1E88E5'
      },
      yaxis: 'y',
      hovertemplate: `${symbol}: %{y:.2f}<br>Date: %{x}<extra></extra>`
    });
  }
  
  // Add MACD if requested
  if (indicators.includes('macd')) {
    const macdData = technicalData?.macd || calculateMACD(prices);
    const macdDates = technicalData?.macd?.dates || dates.slice(25 + 8);
    
    // MACD Line
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'MACD Line',
      x: macdDates,
      y: macdData.line,
      line: { color: '#2196F3', width: 1.5 },
      yaxis: 'y3',
      hovertemplate: 'MACD: %{y:.4f}<extra></extra>'
    });
    
    // Signal Line
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'Signal Line',
      x: macdDates,
      y: macdData.signal,
      line: { color: '#FF9800', width: 1.5 },
      yaxis: 'y3',
      hovertemplate: 'Signal: %{y:.4f}<extra></extra>'
    });
    
    // Histogram
    traces.push({
      type: 'bar',
      name: 'Histogram',
      x: macdDates,
      y: macdData.histogram,
      marker: {
        color: macdData.histogram.map(v => v >= 0 ? 'rgba(38, 166, 154, 0.3)' : 'rgba(239, 83, 80, 0.3)'),
        line: {
          color: macdData.histogram.map(v => v >= 0 ? 'rgba(38, 166, 154, 0.7)' : 'rgba(239, 83, 80, 0.7)'),
          width: 1
        }
      },
      yaxis: 'y3',
      hovertemplate: 'Hist: %{y:.4f}<extra></extra>'
    });
  }
  
  // Add RSI if requested
  if (indicators.includes('rsi')) {
    const rsiData = technicalData?.rsi || { 
      values: calculateRSI(prices, 14), 
      dates: dates.slice(14) 
    };
    
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'RSI (14)',
      x: rsiData.dates,
      y: rsiData.values,
      line: { color: '#9C27B0', width: 1.5 },
      yaxis: 'y2',
      hovertemplate: 'RSI: %{y:.2f}<extra></extra>'
    });
    
    // Add RSI reference lines
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'Overbought (70)',
      x: [rsiData.dates[0], rsiData.dates[rsiData.dates.length - 1]],
      y: [70, 70],
      line: { color: 'rgba(239, 83, 80, 0.5)', width: 1, dash: 'dash' },
      yaxis: 'y2',
      hoverinfo: 'skip',
      showlegend: false
    });
    
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'Oversold (30)',
      x: [rsiData.dates[0], rsiData.dates[rsiData.dates.length - 1]],
      y: [30, 30],
      line: { color: 'rgba(38, 166, 154, 0.5)', width: 1, dash: 'dash' },
      yaxis: 'y2',
      hoverinfo: 'skip',
      showlegend: false
    });
  }
  
  // Add volume if requested
  if (indicators.includes('volume')) {
    traces.push({
      type: 'bar',
      name: 'Volume',
      x: dates,
      y: volumes,
      marker: {
        color: 'rgba(0, 150, 136, 0.15)',
        line: {
          color: 'rgba(0, 150, 136, 0.5)',
          width: 1
        }
      },
      yaxis: 'y4',
      hovertemplate: 'Volume: %{y:,.0f}<extra></extra>'
    });
  }
  
  // Create layout
  const layout = {
    title: `${symbol} Technical Analysis`,
    template: 'plotly_white',
    grid: {
      rows: 3,
      columns: 1,
      pattern: 'independent',
      roworder: 'top to bottom'
    },
    xaxis: {
      rangeslider: { visible: false },
      showgrid: true,
      domain: [0, 1]
    },
    // Main price chart
    yaxis: {
      title: 'Price',
      domain: [0.55, 1]
    },
    // RSI
    yaxis2: indicators.includes('rsi') ? {
      title: 'RSI',
      range: [0, 100],
      domain: [0.3, 0.45],
      showgrid: true
    } : null,
    // MACD
    yaxis3: indicators.includes('macd') ? {
      title: 'MACD',
      domain: [0.1, 0.25],
      showgrid: true
    } : null,
    // Volume
    yaxis4: indicators.includes('volume') ? {
      title: 'Volume',
      domain: [0, 0.05],
      showgrid: false
    } : null,
    legend: {
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: 1.02,
      yanchor: 'bottom'
    },
    margin: { t: 60, r: 40, b: 40, l: 40 },
    hovermode: 'x unified'
  };
  
  // Filter out null axis definitions
  Object.keys(layout).forEach(key => {
    if (layout[key] === null) {
      delete layout[key];
    }
  });
  
  // Adjust layout if not all indicators are used
  if (!indicators.includes('rsi') && !indicators.includes('macd')) {
    layout.yaxis.domain = [0.1, 1];
  } else if (!indicators.includes('rsi')) {
    layout.yaxis.domain = [0.35, 1];
    layout.yaxis3.domain = [0.1, 0.3];
  } else if (!indicators.includes('macd')) {
    layout.yaxis.domain = [0.35, 1];
    layout.yaxis2.domain = [0.1, 0.3];
  }
  
  return {
    data: traces,
    layout: layout,
    config: {
      responsive: true,
      displayModeBar: true,
      scrollZoom: true,
      showTips: true
    }
  };
};

/**
 * Calculate MACD values
 * @param {Array} prices - Array of price values
 * @return {Object} - MACD values
 */
const calculateMACD = (prices) => {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  
  // MACD line = EMA(12) - EMA(26)
  const macdLine = [];
  // Need to account for different starting points due to EMA calculation
  const startIdx = Math.max(12 - 1, 26 - 1);
  for (let i = 0; i < ema12.length && i < ema26.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }
  
  // Signal line = EMA(9) of MACD line
  const signalLine = calculateEMA(macdLine, 9);
  
  // Histogram = MACD line - Signal line
  const histogram = [];
  for (let i = 0; i < macdLine.length && i < signalLine.length; i++) {
    histogram.push(macdLine[i + (macdLine.length - signalLine.length)] - signalLine[i]);
  }
  
  return {
    line: macdLine.slice(macdLine.length - signalLine.length),
    signal: signalLine,
    histogram: histogram
  };
};

/**
 * Calculate RSI
 * @param {Array} prices - Array of price values
 * @param {Number} period - RSI period (typically 14)
 * @return {Array} - RSI values
 */
const calculateRSI = (prices, period = 14) => {
  if (prices.length < period + 1) {
    return [];
  }
  
  // Calculate price changes
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  // Initialize
  let gains = 0;
  let losses = 0;
  
  // First RSI calculation uses simple average
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) {
      gains += changes[i];
    } else {
      losses += Math.abs(changes[i]);
    }
  }
  
  // Average gains and losses for first RSI value
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Calculate first RSI value
  const rsiValues = [];
  let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
  rsiValues.push(100 - (100 / (1 + rs)));
  
  // Calculate rest of RSI values with smoothed averages
  for (let i = period; i < changes.length; i++) {
    // Update average gain and loss using smoothing formula
    avgGain = ((avgGain * (period - 1)) + (changes[i] >= 0 ? changes[i] : 0)) / period;
    avgLoss = ((avgLoss * (period - 1)) + (changes[i] < 0 ? Math.abs(changes[i]) : 0)) / period;
    
    // Calculate RSI
    rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
    rsiValues.push(100 - (100 / (1 + rs)));
  }
  
  return rsiValues;
}; 