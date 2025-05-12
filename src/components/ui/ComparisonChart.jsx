import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

// Color palette for chart lines
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function ComparisonChart({ 
  data = [], 
  width = '100%', 
  height = 300,
  xKey = 'date',
  series = [], // Array of series names (e.g. stock symbols)
  title = '',
  darkMode = false
}) {
  const [highlightBest, setHighlightBest] = useState(false);
  const [highlightWorst, setHighlightWorst] = useState(false);
  
  if (!data || data.length === 0 || series.length === 0) {
    return (
      <div className={`flex items-center justify-center border rounded-md h-[300px] ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
        No comparison data available
      </div>
    );
  }

  // Calculate best and worst performers
  const getBestAndWorstPerformers = () => {
    // Only calculate if we have enough data points
    if (data.length < 2 || series.length < 2) return { best: null, worst: null };
    
    const firstDataPoint = data[0];
    const lastDataPoint = data[data.length - 1];
    
    let bestPerformer = { symbol: null, change: -Infinity };
    let worstPerformer = { symbol: null, change: Infinity };
    
    series.forEach(symbol => {
      if (firstDataPoint[symbol] && lastDataPoint[symbol]) {
        const startValue = firstDataPoint[symbol];
        const endValue = lastDataPoint[symbol];
        const percentChange = ((endValue - startValue) / startValue) * 100;
        
        if (percentChange > bestPerformer.change) {
          bestPerformer = { symbol, change: percentChange };
        }
        
        if (percentChange < worstPerformer.change) {
          worstPerformer = { symbol, change: percentChange };
        }
      }
    });
    
    return { best: bestPerformer.symbol, worst: worstPerformer.symbol };
  };
  
  const { best, worst } = getBestAndWorstPerformers();
  
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
    <div className="w-full">
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
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis 
            dataKey={xKey} 
            tick={{ fontSize: 12, fill: axisColor }}
            tickLine={{ stroke: axisColor }}
            axisLine={{ stroke: axisColor }}
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
          {series.map((seriesName, index) => {
            // Check if this series should be highlighted
            const isHighlighted = (highlightBest && seriesName === best) || 
                                 (highlightWorst && seriesName === worst);
            
            // Dim non-highlighted series if any highlighting is active
            const shouldDim = (highlightBest || highlightWorst) && !isHighlighted;
            
            return (
              <Line
                key={seriesName}
                type="monotone"
                dataKey={seriesName}
                name={seriesName}
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