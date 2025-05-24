import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist';
import CacheStatusIndicator from './CacheStatusIndicator';

const DynamicPlotlyChart = ({ chartId, darkMode = false }) => {
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dimensions, setDimensions] = useState({ width: '100%', height: '100%' });

  // Theme-aware default layout settings
  const defaultLayout = {
    template: darkMode ? 'plotly_dark' : 'plotly_white',
    paper_bgcolor: darkMode ? 'rgb(15, 23, 42)' : 'white',
    plot_bgcolor: darkMode ? 'rgb(30, 41, 59)' : 'rgb(248, 250, 252)',
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: darkMode ? 'rgb(226, 232, 240)' : 'rgb(51, 65, 85)',
    },
    margin: { t: 50, r: 30, b: 50, l: 60 },
    autosize: true,
    xaxis: {
      gridwidth: 1,
      gridcolor: darkMode ? 'rgba(148, 163, 184, 0.15)' : 'rgba(203, 213, 225, 0.5)',
      linewidth: 0.2,
      linecolor: darkMode ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)',
      rangeslider: { visible: false },
      showspikes: true,
      spikemode: 'across',
      spikesnap: 'cursor',
      spikecolor: darkMode ? 'rgba(226, 232, 240, 0.5)' : 'rgba(51, 65, 85, 0.5)',
      spikedash: 'solid',
      spikeusethickness: true
    },
    yaxis: {
      gridwidth: 1,
      gridcolor: darkMode ? 'rgba(148, 163, 184, 0.15)' : 'rgba(203, 213, 225, 0.5)',
      linewidth: 0.2,
      linecolor: darkMode ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)',
      showspikes: true,
      spikemode: 'across',
      spikesnap: 'cursor',
      spikecolor: darkMode ? 'rgba(226, 232, 240, 0.5)' : 'rgba(51, 65, 85, 0.5)',
      spikedash: 'solid',
      spikeusethickness: true
    },
    hoverlabel: {
      bgcolor: darkMode ? 'rgb(51, 65, 85)' : 'white',
      font: {
        color: darkMode ? 'rgb(226, 232, 240)' : 'rgb(51, 65, 85)',
        family: 'Inter, system-ui, sans-serif'
      },
      bordercolor: darkMode ? 'rgb(71, 85, 105)' : 'rgb(203, 213, 225)'
    },
    legend: {
      orientation: 'h',
      y: -0.2,
      yanchor: 'top',
      xanchor: 'center',
      x: 0.5,
      bgcolor: darkMode ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)',
      bordercolor: darkMode ? 'rgb(51, 65, 85)' : 'rgb(203, 213, 225)',
      borderwidth: 1
    },
    hovermode: 'closest',
    dragmode: 'zoom',
    showlegend: true
  };

  // Default config with expanded interactivity options
  const defaultConfig = {
    responsive: true,
    displayModeBar: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: `chart_${chartId}`,
      height: 800,
      width: 1200,
      scale: 2
    },
    scrollZoom: true,
    showTips: true
  };

  // Format numbers helper for tooltips
  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '';
    
    if (Math.abs(num) >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    }
    if (Math.abs(num) >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    if (Math.abs(num) < 0.01 && num !== 0) {
      return num.toExponential(2);
    }
    
    return num.toLocaleString(undefined, {
      maximumFractionDigits: 2
    });
  };

  // Fetch chart data and config from the chartEmitter with better cache handling
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    // Function to fetch chart data with retry
    const fetchChartData = () => {
      // Import the chartEmitter dynamically to avoid circular dependencies
      import('../../hooks/useChartSubscription').then(({ chartEmitter }) => {
        // Function to update chart based on data
        const updateChart = (chartData) => {
          if (!isMounted) return;
          
          try {
            if (!chartData || !chartData.plotlyConfig) {
              // Check if we should retry
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying chart data fetch (${retryCount}/${maxRetries})...`);
                // Retry with exponential backoff
                setTimeout(() => fetchChartData(), 1000 * retryCount);
                return;
              }
              
              setError('No chart data available');
              setLoading(false);
              return;
            }

            setChartData(chartData.plotlyConfig);
            setLoading(false);
            // Reset retry count on success
            retryCount = 0;
          } catch (err) {
            console.error('Error setting chart data:', err);
            setError(`Failed to load chart: ${err.message}`);
            setLoading(false);
          }
        };

        // Check if we already have data for this chart
        if (chartEmitter.chartData && chartEmitter.chartData.has(chartId)) {
          updateChart(chartEmitter.chartData.get(chartId));
        }

        // Subscribe to updates for this chart
        const unsubscribe = chartEmitter.subscribe(chartId, ({ id, result }) => {
          updateChart(result);
        });

        // Cleanup subscription on unmount
        return () => {
          if (unsubscribe) unsubscribe();
        };
      }).catch(err => {
        if (!isMounted) return;
        console.error('Failed to import chartEmitter:', err);
        
        // Only set error if we've exhausted retries
        if (retryCount >= maxRetries) {
          setError(`Failed to initialize chart: ${err.message}`);
          setLoading(false);
        } else {
          retryCount++;
          console.log(`Retry importing chartEmitter (${retryCount}/${maxRetries})...`);
          setTimeout(() => fetchChartData(), 1000 * retryCount);
        }
      });
    };
    
    // Start fetch process
    fetchChartData();
    
    // Cleanup
    return () => {
      isMounted = false;
    };
  }, [chartId]);

  // Initialize and update chart when data changes
  useEffect(() => {
    if (!chartRef.current || !chartData) return;

    try {
      // Get data and layout from chart data, ensuring they are valid
      const data = Array.isArray(chartData.data) ? chartData.data : [];
      
      // Extra validation for data
      if (data.length === 0) {
        setError('No trace data available for the chart');
        return;
      }
      
      // Enhanced data validation and formatting
      const validData = data.map(trace => {
        // Deep clone to avoid modification issues
        const newTrace = JSON.parse(JSON.stringify(trace));
        
        // Ensure x and y are arrays
        if (!Array.isArray(newTrace.x)) {
          newTrace.x = [];
        }
        if (!Array.isArray(newTrace.y)) {
          newTrace.y = [];
        }
        
        // Make sure type is valid
        if (!newTrace.type) {
          newTrace.type = 'scatter';
        }
        
        // Default mode for scatter
        if (newTrace.type === 'scatter' && !newTrace.mode) {
          newTrace.mode = 'lines';
        }
        
        // Make volume indicators more transparent
        if (newTrace.type === 'bar' && (newTrace.name?.toLowerCase().includes('volume') || newTrace.yaxis === 'y2' || newTrace.yaxis === 'y4')) {
          if (!newTrace.marker) newTrace.marker = {};
          
          // More transparent volume styling
          if (Array.isArray(newTrace.marker.color)) {
            // If it's an array of colors (for up/down volume coloring)
            newTrace.marker.color = newTrace.marker.color.map(color => {
              if (typeof color === 'string' && color.includes('rgba')) {
                return color.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/, 'rgba($1, $2, $3, 0.15)');
              }
              return color;
            });
          } else {
            // Single color
            newTrace.marker.color = newTrace.marker.color || 'rgba(0, 150, 136, 0.15)';
          }
          
          if (!newTrace.marker.line) newTrace.marker.line = {};
          
          if (Array.isArray(newTrace.marker.line.color)) {
            // If it's an array of colors
            newTrace.marker.line.color = newTrace.marker.line.color.map(color => {
              if (typeof color === 'string' && color.includes('rgba')) {
                return color.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/, 'rgba($1, $2, $3, 0.5)');
              }
              return color;
            });
          } else {
            // Single color
            newTrace.marker.line.color = newTrace.marker.line.color || 'rgba(0, 150, 136, 0.5)';
          }
          
          newTrace.marker.line.width = newTrace.marker.line.width || 1;
        }
        
        // Enhance hover templates if not already set
        if (!newTrace.hovertemplate && newTrace.type !== 'candlestick') {
          if (newTrace.name) {
            if (newTrace.type === 'bar' && newTrace.yaxis === 'y2') {
              // For volume
              newTrace.hovertemplate = `${newTrace.name}: %{y:,.0f}<br>Date: %{x}<extra></extra>`;
            } else {
              // For standard traces
              newTrace.hovertemplate = `${newTrace.name}: %{y:.2f}<br>Date: %{x}<extra></extra>`;
            }
          } else {
            newTrace.hovertemplate = `Value: %{y:.2f}<br>Date: %{x}<extra></extra>`;
          }
        }
        
        return newTrace;
      });
      
      // Merge layouts while preserving theme settings
      const mergedLayout = { ...defaultLayout };
      
      if (chartData.layout) {
        // Deep merge only non-theme properties
        Object.keys(chartData.layout).forEach(key => {
          if (typeof chartData.layout[key] === 'object' && chartData.layout[key] !== null) {
            mergedLayout[key] = { 
              ...(mergedLayout[key] || {}), 
              ...chartData.layout[key] 
            };
          } else {
            mergedLayout[key] = chartData.layout[key];
          }
        });
      }
      
      // Ensure we have title
      if (!mergedLayout.title || mergedLayout.title === '') {
        mergedLayout.title = 'Financial Chart';
      }
      
      // Ensure fonts are consistent
      if (mergedLayout.title && typeof mergedLayout.title === 'string') {
        mergedLayout.title = {
          text: mergedLayout.title,
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 18,
            color: darkMode ? 'rgb(226, 232, 240)' : 'rgb(51, 65, 85)'
          }
        };
      }
      
      // Merge configs
      const mergedConfig = { 
        ...defaultConfig, 
        ...(chartData.config || {}) 
      };

      // Render the chart
      Plotly.react(chartRef.current, validData, mergedLayout, mergedConfig).catch(err => {
        console.error('Plotly.react error:', err);
        setError(`Error rendering chart: ${err.message}`);
      });
    } catch (err) {
      console.error('Error rendering Plotly chart:', err);
      setError(`Failed to render chart: ${err.message}`);
    }
  }, [chartData, darkMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        Plotly.purge(chartRef.current);
      }
    };
  }, []);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartRef.current.parentNode) {
        const { width, height } = chartRef.current.parentNode.getBoundingClientRect();
        setDimensions({ width, height });
        Plotly.relayout(chartRef.current, { width, height, autosize: true });
      }
    };

    // Initial size
    setTimeout(handleResize, 100);

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center border rounded-md h-[400px] px-4 ${
        darkMode ? 'border-red-800 bg-red-900/20 text-red-300' : 'border-red-200 bg-red-50 text-red-500'
      }`}>
        <div className="mb-2 text-2xl">⚠️</div>
        <div className="text-center font-medium">{error}</div>
        <button 
          className={`mt-4 px-3 py-1 rounded text-sm ${
            darkMode ? 'bg-red-800 hover:bg-red-700 text-white' : 'bg-red-100 hover:bg-red-200 text-red-700'
          }`}
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center border rounded-md h-[400px] ${
        darkMode ? 'border-slate-700 bg-slate-800/30 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'
      }`}>
        <div className="w-16 h-16 border-4 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <div className="text-sm">Preparing your chart...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[400px] relative">
      <CacheStatusIndicator chartId={chartId} darkMode={darkMode} />
      <div ref={chartRef} className="w-full h-full" style={{ minHeight: '400px' }} />
    </div>
  );
};

export default DynamicPlotlyChart; 