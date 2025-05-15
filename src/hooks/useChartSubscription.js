import { useEffect, useState } from 'react';

// Define an event emitter for chart subscriptions
class ChartEventEmitter {
  constructor() {
    this.subscribers = new Map();
    this.chartData = new Map();
    this.lastUpdated = new Map();
  }

  // Subscribe to chart updates
  subscribe(chartId, callback) {
    if (!this.subscribers.has(chartId)) {
      this.subscribers.set(chartId, new Set());
    }
    
    this.subscribers.get(chartId).add(callback);
    
    // Immediately send current data if available
    if (this.chartData.has(chartId)) {
      callback({
        result: this.chartData.get(chartId),
        timestamp: this.lastUpdated.get(chartId)
      });
    }
    
    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(chartId);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(chartId);
        }
      }
    };
  }

  // Update chart data and notify subscribers
  updateChart(chartId, chartData) {
    const timestamp = new Date();
    this.chartData.set(chartId, chartData);
    this.lastUpdated.set(chartId, timestamp);
    
    if (this.subscribers.has(chartId)) {
      this.subscribers.get(chartId).forEach(callback => {
        callback({
          result: chartData,
          timestamp
        });
      });
    }
    
    // Also notify global subscribers
    if (this.subscribers.has('*')) {
      this.subscribers.get('*').forEach(callback => {
        callback({
          id: chartId,
          result: chartData,
          timestamp
        });
      });
    }
  }
  
  // Remove a chart by ID
  removeChart(chartId) {
    // Remove chart data
    this.chartData.delete(chartId);
    this.lastUpdated.delete(chartId);
    
    // Notify subscribers about the removal
    if (this.subscribers.has('*')) {
      this.subscribers.get('*').forEach(callback => {
        // Special event to notify of removal
        callback({
          id: chartId,
          removed: true,
          timestamp: new Date()
        });
      });
    }
    
    // Clean up subscribers for this chart
    this.subscribers.delete(chartId);
  }
  
  // Get all chart data (for initial load)
  getAllCharts() {
    const charts = [];
    this.chartData.forEach((data, id) => {
      charts.push({
        id,
        chartData: data,
        timestamp: this.lastUpdated.get(id)
      });
    });
    return charts;
  }
}

// Create a singleton instance
export const chartEmitter = new ChartEventEmitter();

// Hook for subscribing to specific chart updates
export const useChartSubscription = (chartId) => {
  const [chartData, setChartData] = useState(
    chartEmitter.chartData.get(chartId) || null
  );
  const [lastUpdated, setLastUpdated] = useState(
    chartEmitter.lastUpdated.get(chartId) || null
  );
  const [isLoading, setIsLoading] = useState(!chartData);

  useEffect(() => {
    setIsLoading(!chartData);
    
    // Subscribe to updates for this chart
    const unsubscribe = chartEmitter.subscribe(chartId, ({ result, timestamp }) => {
      setChartData(result);
      setLastUpdated(timestamp);
      setIsLoading(false);
    });
    
    return unsubscribe;
  }, [chartId]);

  return {
    chartData,
    lastUpdated,
    isLoading
  };
};

// Hook for subscribing to all chart updates
export const useAllChartsSubscription = () => {
  const [charts, setCharts] = useState(chartEmitter.getAllCharts());

  useEffect(() => {
    // Subscribe to all chart updates
    const unsubscribe = chartEmitter.subscribe('*', ({ id, result, timestamp, removed }) => {
      if (removed) {
        // Handle chart removal
        setCharts(prev => prev.filter(chart => chart.id !== id));
      } else {
        // Handle chart update
        setCharts(prev => {
          const existingIndex = prev.findIndex(chart => chart.id === id);
          
          if (existingIndex >= 0) {
            // Update existing chart
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              chartData: result,
              timestamp
            };
            return updated;
          } else {
            // Add new chart
            return [...prev, { id, chartData: result, timestamp }];
          }
        });
      }
    });
    
    return unsubscribe;
  }, []);

  return {
    charts,
    updateChart: chartEmitter.updateChart.bind(chartEmitter),
    removeChart: chartEmitter.removeChart.bind(chartEmitter)
  };
}; 