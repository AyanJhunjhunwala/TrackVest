import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

// Enhanced color palette for charts
const COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', 
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
];

// Gradient definitions for enhanced visuals
const GRADIENTS = [
  { id: 'emerald', start: '#10b981', end: '#059669' },
  { id: 'blue', start: '#3b82f6', end: '#2563eb' },
  { id: 'purple', start: '#8b5cf6', end: '#7c3aed' },
  { id: 'amber', start: '#f59e0b', end: '#d97706' },
  { id: 'red', start: '#ef4444', end: '#dc2626' }
];

export default function Chart({ 
  type = 'line', 
  data = [], 
  width = '100%', 
  height = 300,
  xKey = 'name',
  yKey = 'value',
  title = '',
  darkMode = false,
  onDelete, // Optional callback to delete the chart
  showTrend = true, // Show trend indicators
  animated = true, // Enable animations
  gradient = true // Use gradients
}) {
  const [hovered, setHovered] = useState(false);

  if (!data || data.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center justify-center border-2 border-dashed rounded-xl h-[300px] ${
          darkMode 
            ? 'border-slate-600 text-slate-400 bg-slate-800/50' 
            : 'border-slate-300 text-slate-500 bg-slate-50/50'
        }`}
      >
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <div className="font-medium">No data available</div>
          <div className="text-sm opacity-70">Add some data to see your chart</div>
      </div>
      </motion.div>
    );
  }

  // Calculate trend for trend indicators
  const calculateTrend = () => {
    if (!showTrend || data.length < 2) return null;
    const firstValue = data[0][yKey];
    const lastValue = data[data.length - 1][yKey];
    const change = ((lastValue - firstValue) / firstValue) * 100;
    return {
      percentage: change,
      isPositive: change >= 0,
      value: Math.abs(change).toFixed(1)
    };
  };

  const trend = calculateTrend();

  const renderTitle = title && (
    <div className="flex items-center justify-between mb-4">
      <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
      {title}
      </h3>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-medium ${
          trend.isPositive ? 'text-emerald-500' : 'text-red-500'
        }`}>
          {trend.isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {trend.value}%
        </div>
      )}
    </div>
  );

  // Enhanced formatting for different data types
  const formatXAxisTick = (value) => {
    if (data.length === 30 && typeof value === 'string' && value.includes('-')) {
      const index = data.findIndex(d => d[xKey] === value);
      if (index % 6 === 0) {
        const date = new Date(value);
        const month = date.toLocaleString('default', { month: 'short' });
        const day = date.getDate();
        return `${month}-${day}`;
      }
      return '';
    }
    return value;
  };

  const formatYAxisTick = (value) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const chartProps = {
    width: width,
    height: height,
    data: data,
    margin: { top: 20, right: 30, left: 20, bottom: 20 }
  };

  // Enhanced theme colors
  const axisColor = darkMode ? '#94a3b8' : '#64748b';
  const gridColor = darkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(203, 213, 225, 0.3)';
  const tooltipBg = darkMode ? '#1e293b' : '#ffffff';
  const tooltipBorder = darkMode ? '#334155' : '#e2e8f0';

  // Enhanced tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-3 rounded-lg shadow-lg border ${
            darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
          }`}
        >
          <p className={`font-medium mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${typeof entry.value === 'number' && entry.value > 1000 
                ? formatYAxisTick(entry.value) 
                : entry.value}`}
            </p>
          ))}
        </motion.div>
      );
    }
    return null;
  };

  // Common axis and grid config with enhanced styling
  const commonConfig = [
    <XAxis
      key="xaxis"
      dataKey={xKey}
      tick={{ fontSize: 12, fill: axisColor }}
      tickLine={{ stroke: axisColor, strokeWidth: 1 }}
      axisLine={{ stroke: axisColor, strokeWidth: 1 }}
      tickFormatter={formatXAxisTick}
    />,
    <YAxis
      key="yaxis"
      tick={{ fontSize: 12, fill: axisColor }}
      tickLine={{ stroke: axisColor, strokeWidth: 1 }}
      axisLine={{ stroke: axisColor, strokeWidth: 1 }}
      tickFormatter={formatYAxisTick}
    />,
    <CartesianGrid 
      key="grid" 
      strokeDasharray="3 3" 
      stroke={gridColor} 
      strokeWidth={1}
      horizontal={true}
      vertical={false}
    />,
    <Tooltip key="tooltip" content={<CustomTooltip />} />
  ];

  // Enhanced chart rendering with gradients and animations
  const renderChart = () => {
    const primaryColor = COLORS[0];
    const gradientId = `gradient-${type}-${Math.random().toString(36).substr(2, 9)}`;

    switch (type.toLowerCase()) {
      case 'line':
        return (
          <LineChart {...chartProps}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            {commonConfig}
            <Line 
              type="monotone" 
              dataKey={yKey} 
              stroke={primaryColor} 
              strokeWidth={3}
              dot={{ fill: primaryColor, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: primaryColor, strokeWidth: 2, fill: '#ffffff' }}
              animationDuration={animated ? 1500 : 0}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...chartProps}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.9}/>
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0.6}/>
              </linearGradient>
            </defs>
            {commonConfig}
            <Bar 
              dataKey={yKey} 
              fill={gradient ? `url(#${gradientId})` : primaryColor}
              radius={[6, 6, 0, 0]}
              animationDuration={animated ? 1000 : 0}
            />
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart width={width} height={height}>
            <defs>
              {GRADIENTS.map((grad, index) => (
                <linearGradient key={grad.id} id={`pie-${grad.id}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={grad.start} />
                  <stop offset="100%" stopColor={grad.end} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={Math.min(width, height) * 0.3}
              fill="#8884d8"
              dataKey={yKey}
              nameKey={xKey}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              animationDuration={animated ? 1200 : 0}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={gradient ? `url(#pie-${GRADIENTS[index % GRADIENTS.length].id})` : COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '12px',
                color: darkMode ? '#e2e8f0' : '#334155'
              }}
            />
          </PieChart>
        );
        
      case 'area':
        return (
          <AreaChart {...chartProps}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            {commonConfig}
            <Area 
              type="monotone" 
              dataKey={yKey} 
              stroke={primaryColor} 
              strokeWidth={3}
              fill={gradient ? `url(#${gradientId})` : primaryColor}
              fillOpacity={gradient ? 1 : 0.3}
              animationDuration={animated ? 1500 : 0}
            />
          </AreaChart>
        );

      default:
        return renderChart.call(this, { ...arguments, type: 'line' });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`w-full relative p-4 rounded-xl border transition-all duration-300 ${
        darkMode 
          ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800/70' 
          : 'bg-white border-slate-200 hover:shadow-lg'
      }`}
      onMouseEnter={() => setHovered(true)} 
      onMouseLeave={() => setHovered(false)}
    >
      {/* Delete button that appears on hover */}
      {hovered && onDelete && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={onDelete}
          className={`absolute top-2 right-2 z-10 p-2 rounded-full transition-colors ${
            darkMode 
              ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
              : 'bg-red-50 hover:bg-red-100 text-red-500'
          }`}
        >
          <Trash2 className="h-4 w-4" />
        </motion.button>
      )}

      {renderTitle}
      
      <div className="w-full">
        <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
    </motion.div>
  );
} 