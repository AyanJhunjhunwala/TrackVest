/**
 * Utility functions for generating chart data for Groq chat
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

// Parse a chat message to determine if it's requesting a chart
export const parseChartRequest = (message) => {
  const text = message.toLowerCase();
  
  // Chart type detection patterns - more flexible patterns
  const patterns = {
    stock: /(?:show|display|create|generate|give)(?:\s+me)?(?:\s+a)?(?:\s+chart|graph|plot)?(?:\s+of)?(?:\s+the)?(?:\s+stock|price)?(?:\s+for|of)?\s+([a-z]{1,5})(?:\s+stock)?/i,
    portfolio: /(?:show|display|create|generate|give)(?:\s+me)?(?:\s+a)?(?:\s+chart|graph|plot)?(?:\s+of)?(?:\s+the)?(?:\s+portfolio|asset)(?:\s+allocation)?/i,
    sectors: /(?:show|display|create|generate|give)(?:\s+me)?(?:\s+a)?(?:\s+chart|graph|plot)?(?:\s+of)?(?:\s+the)?(?:\s+sector|sectors|sector breakdown|sector allocation)/i,
    returns: /(?:show|display|create|generate|give)(?:\s+me)?(?:\s+a)?(?:\s+chart|graph|plot)?(?:\s+of)?(?:\s+the)?(?:\s+monthly|performance|return|returns)/i,
    comparison: /(?:compare|comparison|(?:show|display|create|generate|give)(?:\s+me)?(?:\s+a)?(?:\s+comparison|comparative)(?:\s+chart|graph|plot)?)(?:\s+of|between|for)?(?:\s+the)?(?:\s+stocks)?\s+([a-z]{1,5}(?:(?:,| and| vs\.?| versus| \&)\s*[a-z]{1,5}){1,4})/i
  };
  
  // Check for stock price chart request
  const stockMatch = text.match(patterns.stock);
  if (stockMatch) {
    const symbol = stockMatch[1].toUpperCase();
    console.log(`Stock chart requested for ${symbol}`);
    
    // Determine trend if specified
    let trend = 'random';
    if (text.includes('upward') || text.includes('bullish') || text.includes('up trend')) {
      trend = 'up';
    } else if (text.includes('downward') || text.includes('bearish') || text.includes('down trend')) {
      trend = 'down';
    } else if (text.includes('volatile')) {
      trend = 'volatile';
    }
    
    // Determine timeframe
    let days = 30;
    if (text.includes('year') || text.includes('365 days') || text.includes('12 month')) {
      days = 365;
    } else if (text.includes('6 month') || text.includes('half year')) {
      days = 180;
    } else if (text.includes('3 month') || text.includes('quarter')) {
      days = 90;
    } else if (text.includes('week')) {
      days = 7;
    }
    
    return {
      type: 'stock',
      chartType: text.includes('bar') ? 'bar' : text.includes('area') ? 'area' : 'line',
      data: generateStockPriceData(symbol, days, trend)
    };
  }
  
  // Check for portfolio allocation chart
  const portfolioMatch = text.match(patterns.portfolio);
  if (portfolioMatch) {
    console.log("Portfolio allocation chart requested");
    return {
      type: 'portfolio',
      chartType: text.includes('bar') ? 'bar' : 'pie',
      data: generatePortfolioAllocationData()
    };
  }
  
  // Check for sector breakdown chart
  const sectorMatch = text.match(patterns.sectors);
  if (sectorMatch) {
    console.log("Sector breakdown chart requested");
    return {
      type: 'sectors',
      chartType: text.includes('bar') ? 'bar' : 'pie',
      data: generateSectorBreakdownData()
    };
  }
  
  // Check for returns chart
  const returnsMatch = text.match(patterns.returns);
  if (returnsMatch) {
    console.log("Returns chart requested");
    let months = 12;
    if (text.includes('year') || text.includes('12 month')) {
      months = 12;
    } else if (text.includes('6 month') || text.includes('half year')) {
      months = 6;
    } else if (text.includes('3 month') || text.includes('quarter')) {
      months = 3;
    }
    
    // Add a positive or negative bias if specified
    let baseline = 0;
    if (text.includes('positive') || text.includes('good') || text.includes('gains')) {
      baseline = 2; // Positive bias
    } else if (text.includes('negative') || text.includes('bad') || text.includes('losses')) {
      baseline = -2; // Negative bias
    }
    
    return {
      type: 'returns',
      chartType: 'bar',
      data: generateMonthlyReturnsData(months, baseline)
    };
  }
  
  // Check for comparison chart
  const comparisonMatch = text.match(patterns.comparison);
  if (comparisonMatch) {
    console.log("Comparison chart requested");
    const symbolsStr = comparisonMatch[1];
    // Handle different separators (comma, "and", "vs", "versus")
    const symbols = symbolsStr
      .replace(/\s+and\s+|\s+vs\.?\s+|\s+versus\s+|\s+\&\s+/gi, ',')
      .split(/,\s*/)
      .map(s => s.toUpperCase());
    
    console.log(`Symbols for comparison: ${symbols.join(', ')}`);
    
    // Determine timeframe
    let days = 30;
    if (text.includes('year') || text.includes('365 days')) {
      days = 365;
    } else if (text.includes('6 month') || text.includes('half year')) {
      days = 180;
    } else if (text.includes('3 month') || text.includes('quarter')) {
      days = 90;
    } else if (text.includes('week')) {
      days = 7;
    }
    
    const comparisonData = generateComparisonData(symbols, days);
    
    return {
      type: 'comparison',
      chartType: 'line',
      data: comparisonData,
      series: symbols
    };
  }
  
  // General chart keywords
  if (/(?:chart|graph|plot|visualization)/i.test(text) && /(?:stock|price|market|performance|returns)/i.test(text)) {
    // Look for stock symbols
    const symbolMatch = text.match(/\b([A-Za-z]{1,5})\b/g);
    if (symbolMatch && symbolMatch.length > 0) {
      // Filter out common words that might be confused for symbols
      const commonWords = ['show', 'me', 'a', 'the', 'and', 'for', 'of', 'vs', 'chart', 'graph', 'plot'];
      const potentialSymbols = symbolMatch
        .filter(word => !commonWords.includes(word.toLowerCase()))
        .map(s => s.toUpperCase());
      
      if (potentialSymbols.length === 1) {
        // Single stock chart
        console.log(`Inferring stock chart for ${potentialSymbols[0]}`);
        return {
          type: 'stock',
          chartType: 'line',
          data: generateStockPriceData(potentialSymbols[0], 30, 'random')
        };
      } else if (potentialSymbols.length > 1) {
        // Comparison chart
        console.log(`Inferring comparison chart for ${potentialSymbols.join(', ')}`);
        const comparisonData = generateComparisonData(potentialSymbols.slice(0, 5), 30);
        return {
          type: 'comparison',
          chartType: 'line',
          data: comparisonData,
          series: potentialSymbols.slice(0, 5)
        };
      }
    }
  }
  
  // If no specific chart request is detected
  return null;
};

// Generate chart component for response
export const generateChartResponse = (request) => {
  if (!request) return null;
  
  let chartConfig = {
    type: request.chartType || 'line',
    data: request.data.data,
    xKey: request.data.xKey,
    yKey: request.data.yKey,
    title: request.data.title
  };
  
  if (request.type === 'comparison') {
    // Comparison charts need special handling for multiple series
    const series = request.series;
    return {
      chartConfig,
      series
    };
  }
  
  return { chartConfig };
}; 