import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { X, Trash2 } from 'lucide-react';

// Color palette for chart lines
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function ComparisonChart({ 
  data = [], 
  width = '100%', 
  height = 300,
  xKey = 'date',
  series = [], // Array of series names or objects with {name, dataKey}
  title = '',
  darkMode = false,
  onDelete // Optional callback to delete the chart
}) {
  const [highlightBest, setHighlightBest] = useState(false);
  const [highlightWorst, setHighlightWorst] = useState(false);
  const [hovered, setHovered] = useState(false);
  
  // Normalize series to always be an array of objects with name and dataKey
  const normalizedSeries = React.useMemo(() => {
    if (!Array.isArray(series)) {
      console.warn('ComparisonChart: series prop is not an array, using empty array instead');
      return [];
    }
    
    return series.map(item => {
      if (typeof item === 'string') {
        return { name: item, dataKey: item };
      } else if (item && typeof item === 'object' && item.name && item.dataKey) {
        return item;
      } else if (item && typeof item === 'object' && item.name) {
        return { name: item.name, dataKey: item.name };
      } else {
        console.warn('ComparisonChart: Invalid series item', item);
        return null;
      }
    }).filter(Boolean); // Remove null items
  }, [series]);
  
  // Make sure we have enough data
  const hasEnoughData = Array.isArray(data) && data.length > 1;
  
  // If we have a lot of data points, use every other one to prevent overcrowding of the x-axis
  const processedData = React.useMemo(() => {
    if (!hasEnoughData) return [];
    
    // If we have exactly 30 data points (monthly view), show all points but only label some
    if (data.length === 30) {
      return data;
    }
    
    // For other cases with many data points, return a filtered set
    if (data.length > 15) {
      return data.filter((_, index) => index % 2 === 0);
    }
    
    return data;
  }, [data, hasEnoughData]);
  
  if (!hasEnoughData || normalizedSeries.length === 0) {
    return (
      <div className={`flex items-center justify-center border rounded-md h-[300px] ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
        No comparison data available
      </div>
    );
  }

  // Calculate best and worst performers
  const getBestAndWorstPerformers = () => {
    // Only calculate if we have enough data points
    if (data.length < 2 || normalizedSeries.length < 2) return { best: null, worst: null };
    
    const firstDataPoint = data[0];
    const lastDataPoint = data[data.length - 1];
    
    let bestPerformer = { symbol: null, change: -Infinity };
    let worstPerformer = { symbol: null, change: Infinity };
    
    normalizedSeries.forEach(series => {
      const dataKey = series.dataKey;
      if (firstDataPoint[dataKey] && lastDataPoint[dataKey]) {
        const startValue = firstDataPoint[dataKey];
        const endValue = lastDataPoint[dataKey];
        const percentChange = ((endValue - startValue) / startValue) * 100;
        
        if (percentChange > bestPerformer.change) {
          bestPerformer = { symbol: series.name, change: percentChange };
        }
        
        if (percentChange < worstPerformer.change) {
          worstPerformer = { symbol: series.name, change: percentChange };
        }
      }
    });
    
    return { best: bestPerformer.symbol, worst: worstPerformer.symbol };
  };
  
  const { best, worst } = getBestAndWorstPerformers();
  
  // Custom X-axis tick formatter for monthly data (30 points)
  const formatXAxisTick = (value) => {
    if (data.length === 30) {
      // For monthly data, show every 6th day for cleaner axis
      const index = data.findIndex(d => d[xKey] === value);
      if (index % 6 === 0) {
        // Format date as MMM-DD for monthly view
        const date = new Date(value);
        const month = date.toLocaleString('default', { month: 'short' });
        const day = date.getDate();
        return `${month}-${day}`;
      }
      return '';
    }
    return value;
  };

  const renderTitle = title && (
    <div className={`text-center font-medium mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
      {title}
    </div>
  );

  // Theme colors based on dark mode
  const axisColor = darkMode ? '#94a3b8' : '#64748b';
  const gridColor = darkMode ? 'rgba(148, 163, 184, 0.15)' : 'rgba(203, 213, 225, 0.5)';

  // Get button style based on dark mode
  const getButtonStyle = (isActive) => {
    if (darkMode) {
      return isActive 
        ? 'bg-blue-600 text-white border-blue-500' 
        : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600';
    }
    return isActive 
      ? 'bg-blue-100 text-blue-700 border-blue-200' 
      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50';
  };

  return (
    <div 
      className="w-full relative" 
      onMouseEnter={() => setHovered(true)} 
      onMouseLeave={() => setHovered(false)}
    >
      {/* Delete button that appears on hover */}
      {hovered && onDelete && (
        <button
          onClick={onDelete}
          className={`absolute top-0 right-0 z-10 p-1 rounded-full ${darkMode 
            ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
          title="Delete chart"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      
      <div className="flex justify-between items-center mb-2">
        {renderTitle}
        <div className="flex space-x-1 text-xs">
          <button 
            className={`px-2 py-1 rounded border ${getButtonStyle(highlightBest)}`}
            onClick={() => {
              setHighlightBest(!highlightBest);
              setHighlightWorst(false);
            }}
          >
            Best
          </button>
          <button 
            className={`px-2 py-1 rounded border ${getButtonStyle(highlightWorst)}`}
            onClick={() => {
              setHighlightWorst(!highlightWorst);
              setHighlightBest(false);
            }}
          >
            Worst
          </button>
        </div>
      </div>
      <ResponsiveContainer width={width} height={height}>
        <LineChart
          data={processedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis 
            dataKey={xKey} 
            tick={{ fontSize: 12, fill: axisColor }}
            tickLine={{ stroke: axisColor }}
            axisLine={{ stroke: axisColor }}
            tickFormatter={formatXAxisTick}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: axisColor }}
            tickLine={{ stroke: axisColor }}
            axisLine={{ stroke: axisColor }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: darkMode ? '#1e293b' : '#ffffff',
              border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
              borderRadius: '4px',
              color: darkMode ? '#e2e8f0' : '#334155'
            }}
            formatter={(value) => [`${value}`, '']}
          />
          <Legend 
            wrapperStyle={{
              paddingTop: '10px',
              fontSize: '12px',
              color: darkMode ? '#e2e8f0' : '#334155'
            }}
          />
          <ReferenceLine y={100} stroke={gridColor} strokeDasharray="3 3" />
          
          {/* Render a line for each series */}
          {normalizedSeries.map((series, index) => {
            // Check if this series should be highlighted
            const isHighlighted = (highlightBest && series.name === best) || 
                                 (highlightWorst && series.name === worst);
            
            // Dim non-highlighted series if any highlighting is active
            const shouldDim = (highlightBest || highlightWorst) && !isHighlighted;
            
            return (
              <Line
                key={`series-${index}-${series.name}`}
                type="monotone"
                dataKey={series.dataKey}
                name={series.name}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={isHighlighted ? 3 : shouldDim ? 1 : 2}
                dot={isHighlighted ? { r: 4 } : false}
                opacity={shouldDim ? 0.3 : 1}
                activeDot={{ r: 6 }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 