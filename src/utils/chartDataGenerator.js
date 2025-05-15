/**
 * Utility functions for generating chart data for Gemini chat
 */

// Generate sample stock price data
export const generateStockPriceData = (symbol = 'AAPL', days = 30, trend = 'random') => {
  const data = [];
  const today = new Date();
  let basePrice = 150 + Math.random() * 100; // Random starting price between 150-250
  
  // Determine trend factor
  let trendFactor = 0;
  switch(trend.toLowerCase()) {
    case 'up':
      trendFactor = 0.01; // Upward trend
      break;
    case 'down':
      trendFactor = -0.01; // Downward trend
      break;
    case 'volatile':
      trendFactor = 0; // More volatile random movements
      break;
    default:
      trendFactor = 0; // Random with small trend
  }
  
  // Generate data points
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    // Calculate price with randomness and trend
    const randomChange = (Math.random() - 0.5) * (trend === 'volatile' ? 8 : 4);
    const trendChange = basePrice * trendFactor;
    basePrice += randomChange + trendChange;
    
    // Ensure price doesn't go negative
    basePrice = Math.max(basePrice, 1);
    
    data.push({
      date: date.toISOString().split('T')[0],
      price: parseFloat(basePrice.toFixed(2))
    });
  }
  
  return {
    title: `${symbol} Stock Price - Last ${days} Days`,
    data: data,
    xKey: 'date',
    yKey: 'price'
  };
};

// Generate sample portfolio allocation data
export const generatePortfolioAllocationData = () => {
  const assets = [
    { name: 'Stocks', value: 45 },
    { name: 'Bonds', value: 20 },
    { name: 'Real Estate', value: 15 },
    { name: 'Crypto', value: 10 },
    { name: 'Cash', value: 10 }
  ];
  
  return {
    title: 'Portfolio Allocation',
    data: assets,
    xKey: 'name',
    yKey: 'value'
  };
};

// Generate sector breakdown data
export const generateSectorBreakdownData = () => {
  const sectors = [
    { name: 'Technology', value: 35 },
    { name: 'Healthcare', value: 15 },
    { name: 'Financials', value: 12 },
    { name: 'Consumer Cyclical', value: 10 },
    { name: 'Energy', value: 8 },
    { name: 'Utilities', value: 7 },
    { name: 'Real Estate', value: 7 },
    { name: 'Materials', value: 6 }
  ];
  
  return {
    title: 'Stock Sector Breakdown',
    data: sectors,
    xKey: 'name',
    yKey: 'value'
  };
};

// Generate monthly returns data
export const generateMonthlyReturnsData = (months = 12, baseline = 0) => {
  const data = [];
  const today = new Date();
  const currentMonth = today.getMonth();
  
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  for (let i = months - 1; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const year = today.getFullYear() - (currentMonth - i < 0 ? 1 : 0);
    const month = monthNames[monthIndex];
    
    // Generate return percentage between -8% and +10%
    const returnValue = (baseline + (Math.random() * 18 - 8)).toFixed(2);
    
    data.push({
      month: `${month} ${year}`,
      return: parseFloat(returnValue)
    });
  }
  
  return {
    title: 'Monthly Returns (%)',
    data: data,
    xKey: 'month',
    yKey: 'return'
  };
};

// Generate comparison data for multiple stocks/assets
export const generateComparisonData = (symbols = ['AAPL', 'MSFT', 'GOOGL'], days = 30) => {
  const data = [];
  const today = new Date();
  const basePrices = {};
  
  // Initialize base prices
  symbols.forEach(symbol => {
    basePrices[symbol] = 100; // All start at 100 for percentage comparison
  });
  
  // Generate data points
  for (let i = 0; i <= days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - days + i);
    
    const dataPoint = {
      date: date.toISOString().split('T')[0]
    };
    
    // Update prices for each symbol
    symbols.forEach(symbol => {
      const change = (Math.random() - 0.48) * 3; // Slight upward bias
      basePrices[symbol] *= (1 + change / 100);
      dataPoint[symbol] = parseFloat(basePrices[symbol].toFixed(2));
    });
    
    data.push(dataPoint);
  }
  
  return {
    title: `Performance Comparison - Last ${days} Days (Base 100)`,
    data: data,
    xKey: 'date',
    series: symbols
  };
};

// Parse chart requests from user input
export const parseChartRequest = (input) => {
  const inputLower = input.toLowerCase();
  
  // Check for comparison chart requests
  const compareRegex = /(?:compare|comparison of|compare between)\s+([a-z0-9,\s]+)/i;
  const compareMatch = inputLower.match(compareRegex);
  
  // Check for timeframe in the request
  const timeframeRegex = /(?:over|last|past|for)\s+([0-9]+)?\s*(day|days|week|weeks|month|months|year|years)/i;
  const timeframeMatch = inputLower.match(timeframeRegex);
  let timeframe = '1m'; // Default to 1 month
  
  if (timeframeMatch) {
    const amount = timeframeMatch[1] ? parseInt(timeframeMatch[1]) : 1;
    const unit = timeframeMatch[2].toLowerCase();
    
    if (unit.startsWith('day')) timeframe = `${amount}d`;
    else if (unit.startsWith('week')) timeframe = `${amount}w`;
    else if (unit.startsWith('month')) timeframe = `${amount}m`;
    else if (unit.startsWith('year')) timeframe = `${amount}y`;
  }
  
  if (compareMatch) {
    // Handle comparison chart
    const symbolsText = compareMatch[1];
    const symbols = symbolsText
      .split(/(?:,|\s+and\s+)/)
      .map(s => s.trim().toUpperCase())
      .filter(s => s && /^[A-Z]{1,5}$/.test(s));
    
    if (symbols.length >= 2) {
      return {
        type: 'comparison',
        symbols,
        timeframe
      };
    }
  }
  
  // Check for single chart requests
  const chartRegex = /(?:chart|graph|plot|visualization|price|performance|trend|history)(?:\s+for)?\s+([a-z]{1,5})/i;
  const chartMatch = inputLower.match(chartRegex);
  
  if (chartMatch) {
    const symbol = chartMatch[1].toUpperCase();
    
    // Determine chart type based on input
    let type = 'line'; // Default
    if (inputLower.includes('bar')) type = 'bar';
    else if (inputLower.includes('candlestick') || inputLower.includes('candle')) type = 'candlestick';
    else if (inputLower.includes('area')) type = 'area';
    
    return {
      type,
      symbol,
      timeframe
    };
  }
  
  return null;
};

// Generate chart data from a request
export const generateChartResponse = (chartRequest) => {
  if (!chartRequest) return null;
  
  console.log('Using local chart generator as Gemini API fallback');
  
  // Generate sample data based on the type of chart requested
  if (chartRequest.type === 'comparison' && chartRequest.symbols) {
    return generateComparisonChart(chartRequest.symbols, chartRequest.timeframe);
  } else if (chartRequest.symbol) {
    return generateSingleStockChart(chartRequest.symbol, chartRequest.type, chartRequest.timeframe);
  }
  
  return null;
};

// Generate a comparison chart for multiple symbols
const generateComparisonChart = (symbols, timeframe) => {
  const periods = getPeriodCount(timeframe);
  const today = new Date();
  const data = [];
  
  // Generate dates for the timeframe
  for (let i = 0; i < periods; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (periods - i));
    
    const dataPoint = {
      date: date.toISOString().split('T')[0]
    };
    
    // Add values for each symbol
    symbols.forEach(symbol => {
      // Generate a starting price between 50 and 500
      const basePrice = 50 + Math.random() * 450;
      // Calculate a value with some randomness but following a trend
      const trend = 0.9 + Math.random() * 0.2; // Between 0.9 and 1.1
      const volatility = 0.05; // 5% volatility
      const value = basePrice * Math.pow(trend, i) * (1 + (Math.random() - 0.5) * volatility);
      
      dataPoint[symbol] = parseFloat(value.toFixed(2));
    });
    
    data.push(dataPoint);
  }
  
  const series = symbols.map(symbol => ({
    name: symbol,
    dataKey: symbol
  }));
  
  return {
    chartConfig: {
      type: 'comparison',
      data,
      xKey: 'date',
      title: `Comparison of ${symbols.join(', ')}`
    },
    series
  };
};

// Generate a single stock chart
const generateSingleStockChart = (symbol, chartType, timeframe) => {
  const periods = getPeriodCount(timeframe);
  const today = new Date();
  const data = [];
  
  // Generate initial price between 50 and 500
  const basePrice = 50 + Math.random() * 450;
  let currentPrice = basePrice;
  
  // Add slight positive bias - stocks tend to go up over time
  const trend = 1.001;
  const volatility = 0.02; // 2% daily volatility
  
  for (let i = 0; i < periods; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - (periods - i));
    
    // Apply random walk with trend
    currentPrice = currentPrice * trend * (1 + (Math.random() - 0.5) * volatility);
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: parseFloat(currentPrice.toFixed(2))
    });
  }
  
  return {
    chartConfig: {
      type: chartType || 'line',
      data,
      xKey: 'date',
      yKey: 'value',
      title: `${symbol} Price Chart`
    }
  };
};

// Helper function to determine number of periods based on timeframe
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