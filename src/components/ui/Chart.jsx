import React from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function Chart({ 
  type = 'line', 
  data = [], 
  width = '100%', 
  height = 300,
  xKey = 'name',
  yKey = 'value',
  title = '',
  darkMode = false
}) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center border rounded-md h-[300px] ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
        No data available for chart
      </div>
    );
  }

  const renderTitle = title && (
    <div className={`text-center font-medium mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
      {title}
    </div>
  );

  const chartProps = {
    width: width,
    height: height,
    data: data,
    margin: { top: 5, right: 30, left: 20, bottom: 5 }
  };

  // Theme colors based on dark mode
  const axisColor = darkMode ? '#94a3b8' : '#64748b';
  const gridColor = darkMode ? 'rgba(148, 163, 184, 0.15)' : 'rgba(203, 213, 225, 0.5)';

  // Common axis and grid config
  const commonConfig = [
    <XAxis
      dataKey={xKey}
      tick={{ fontSize: 12, fill: axisColor }}
      tickLine={{ stroke: axisColor }}
      axisLine={{ stroke: axisColor }}
    />,
    <YAxis
      tick={{ fontSize: 12, fill: axisColor }}
      tickLine={{ stroke: axisColor }}
      axisLine={{ stroke: axisColor }}
    />,
    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />,
    <Tooltip
      contentStyle={{
        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
        border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
        borderRadius: '4px',
        color: darkMode ? '#e2e8f0' : '#334155'
      }}
    />,
    <Legend
      wrapperStyle={{
        paddingTop: '10px',
        fontSize: '12px',
        color: darkMode ? '#e2e8f0' : '#334155'
      }}
    />
  ];

  // Render the appropriate chart based on type
  const renderChart = () => {
    switch (type.toLowerCase()) {
      case 'line':
        return (
          <LineChart {...chartProps}>
            {commonConfig}
            <Line 
              type="monotone" 
              dataKey={yKey} 
              stroke={COLORS[0]} 
              activeDot={{ r: 6 }} 
              strokeWidth={2}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...chartProps}>
            {commonConfig}
            <Bar dataKey={yKey} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart width={width} height={height}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              outerRadius={80}
              fill="#8884d8"
              dataKey={yKey}
              nameKey={xKey}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                border: darkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                borderRadius: '4px',
                color: darkMode ? '#e2e8f0' : '#334155'
              }}
            />
            <Legend 
              wrapperStyle={{
                paddingTop: '10px',
                fontSize: '12px',
                color: darkMode ? '#e2e8f0' : '#334155'
              }}
            />
          </PieChart>
        );
        
      case 'area':
        return (
          <AreaChart {...chartProps}>
            {commonConfig}
            <Area 
              type="monotone" 
              dataKey={yKey} 
              stroke={COLORS[0]} 
              fill={COLORS[0]} 
              fillOpacity={0.3}
            />
          </AreaChart>
        );

      default:
        return (
          <LineChart {...chartProps}>
            {commonConfig}
            <Line 
              type="monotone" 
              dataKey={yKey} 
              stroke={COLORS[0]} 
              activeDot={{ r: 6 }} 
              strokeWidth={2}
            />
          </LineChart>
        );
    }
  };

  return (
    <div className="w-full">
      {renderTitle}
      <ResponsiveContainer width={width} height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
} 