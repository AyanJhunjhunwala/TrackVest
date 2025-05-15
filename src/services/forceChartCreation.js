// Direct chart creation utility - no events or exports that could cause HMR issues
import { chartEmitter } from '../hooks/useChartSubscription';
import { subscribeToStockUpdates, subscribeToComparisonUpdates } from './chartDataService';

// Create a simple line chart and add it directly to the system
export function createSimpleChart() {
  console.log("Creating simple line chart...");
  
  // Generate chart data
  const chartData = {
    chartConfig: {
      type: 'line',
      data: Array(30).fill().map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toISOString().split('T')[0],
          value: 100 + Math.random() * 30
        };
      }),
      xKey: 'date',
      yKey: 'value',
      title: 'Sample Stock Chart'
    }
  };
  
  // Generate a unique ID for the chart
  const chartId = `simple_chart_${Date.now()}`;
  
  // Add directly to chart system via emitter
  chartEmitter.updateChart(chartId, chartData);
  
  console.log(`Simple chart created with ID: ${chartId}`);
  return chartId;
}

// Create a comparison chart
export function createComparisonChart() {
  console.log("Creating comparison chart...");
  
  const symbols = ['AAPL', 'MSFT', 'GOOGL'];
  const chartId = `comparison_chart_${Date.now()}`;
  
  // Generate chart data
  const data = [];
  const today = new Date();
  const prices = { AAPL: 100, MSFT: 100, GOOGL: 100 };
  
  // Generate 30 days of price data
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const dataPoint = { date: date.toISOString().split('T')[0] };
    
    // Update prices with some randomness
    Object.keys(prices).forEach(symbol => {
      // Different trend for each symbol
      const trend = symbol === 'AAPL' ? 1.002 : 
                   symbol === 'MSFT' ? 1.003 : 
                   1.001;
      
      prices[symbol] *= trend * (1 + (Math.random() - 0.5) * 0.03);
      dataPoint[symbol] = parseFloat(prices[symbol].toFixed(2));
    });
    
    data.push(dataPoint);
  }
  
  const chartData = {
    chartConfig: {
      type: 'comparison',
      data: data,
      xKey: 'date',
      title: 'Comparison: AAPL vs MSFT vs GOOGL'
    },
    series: symbols.map(symbol => ({
      name: symbol,
      dataKey: symbol
    }))
  };
  
  // Add directly to chart system via emitter
  chartEmitter.updateChart(chartId, chartData);
  
  console.log(`Comparison chart created with ID: ${chartId}`);
  return chartId;
}

// Create both types of charts
export function createAllCharts() {
  console.log("Creating all chart types...");
  createSimpleChart();
  createComparisonChart();
  console.log("All charts created!");
}

// Create realistic stock chart with real-time updates
export function createStockChart(symbol = 'AAPL') {
  console.log(`Creating stock chart for ${symbol}...`);
  
  // Generate chart ID
  const chartId = `stock_${symbol}_${Date.now()}`;
  
  // Base price depends on symbol
  const basePrice = symbol === 'AAPL' ? 180 : 
                   symbol === 'MSFT' ? 320 : 
                   symbol === 'GOOGL' ? 140 : 100;
  
  // Generate chart data
  const data = [];
  const today = new Date();
  let price = basePrice;
  
  // Generate 30 days of price data
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Add some random movement
    price = price * (1 + (Math.random() - 0.48) * 0.03); // Slight upward bias
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: parseFloat(price.toFixed(2))
    });
  }
  
  const chartData = {
    chartConfig: {
      type: 'line',
      data: data,
      xKey: 'date',
      yKey: 'value',
      title: `${symbol} Stock Price`
    }
  };
  
  // Add directly to chart system via emitter
  chartEmitter.updateChart(chartId, chartData);
  
  // Set up real-time updates
  subscribeToStockUpdates(chartId, symbol, '1m', 'line');
  
  console.log(`Stock chart created with ID: ${chartId}`);
  return chartId;
} 