import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell,
  BarChart, Bar, LineChart as RechartsLineChart, Line, Legend, ResponsiveContainer
} from "recharts";
import Chart from "./components/ui/Chart";
import ComparisonChart from "./components/ui/ComparisonChart";
import { useAllChartsSubscription, chartEmitter } from './hooks/useChartSubscription';
import { removeChartWithSubscription } from './services/chartDataService';

// Custom tooltip for scatter chart
const CustomScatterTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg text-sm">
        <p className="font-semibold text-slate-800 mb-1">{payload[0].payload.name}</p>
        <div className="flex flex-col gap-0.5">
          <p className="text-slate-600">Risk: <span className="font-medium text-slate-800">{payload[0].value}%</span></p>
          <p className="text-slate-600">Return: <span className="font-medium text-slate-800">{payload[0].payload.return}%</span></p>
        </div>
      </div>
    );
  }
  return null;
};

// Custom tooltip for bar chart
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg text-sm">
        <p className="font-semibold text-slate-800 mb-1">{payload[0].payload.name}</p>
        <p className="text-slate-600">Score: <span className="font-medium text-slate-800">{payload[0].value.toFixed(1)}</span></p>
      </div>
    );
  }
  return null;
};

export default function InsightsTab({ 
  darkMode, 
  riskData, 
  assetAllocation,
  carbonData, 
  correlationData, 
  sharpeRatios, 
  volatilityData 
}) {
  // Use our subscription hook to get all charts
  const { charts } = useAllChartsSubscription();
  
  // Function to delete a chart
  const handleDeleteChart = (chartId) => {
    console.log(`Deleting chart with ID: ${chartId}`);
    removeChartWithSubscription(chartId);
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };
  
  // Render both the dynamic charts and the static visualizations
  return (
    <div className="space-y-8">
      {/* Dynamic Generated Charts from chartEmitter */}
      {charts.length > 0 && (
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              Interactive Market Data
            </h2>
            <div className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
              Data from Polygon.io
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {charts.map(insight => (
              <motion.div 
                key={insight.id}
                variants={itemVariants}
                className="h-full"
              >
                <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md h-full overflow-hidden`}>
                  {/* Handle both direct chartData format and nested chartConfig format */}
                  {(insight.chartData.series || (insight.chartData.chartConfig && insight.chartData.chartConfig.type === 'comparison')) ? (
                    <ComparisonChart
                      data={(insight.chartData.chartConfig) ? insight.chartData.chartConfig.data : insight.chartData.data}
                      xKey={(insight.chartData.chartConfig) ? insight.chartData.chartConfig.xKey : insight.chartData.xKey}
                      series={Array.isArray(insight.chartData.series) ? 
                        insight.chartData.series : 
                        (insight.chartData.chartConfig && Array.isArray(insight.chartData.chartConfig.series)) ? 
                          insight.chartData.chartConfig.series : []}
                      title={(insight.chartData.chartConfig) ? insight.chartData.chartConfig.title : insight.chartData.title}
                      metricType={(insight.chartData.chartConfig) ? insight.chartData.chartConfig.metricType || 'Price (USD)' : 'Price (USD)'}
                      darkMode={darkMode}
                      onDelete={() => handleDeleteChart(insight.id)}
                    />
                  ) : (
                    <Chart
                      type={(insight.chartData.chartConfig) ? insight.chartData.chartConfig.type : insight.chartData.type}
                      data={(insight.chartData.chartConfig) ? insight.chartData.chartConfig.data : insight.chartData.data}
                      xKey={(insight.chartData.chartConfig) ? insight.chartData.chartConfig.xKey : insight.chartData.xKey}
                      yKey={(insight.chartData.chartConfig) ? insight.chartData.chartConfig.yKey : insight.chartData.yKey}
                      title={(insight.chartData.chartConfig) ? insight.chartData.chartConfig.title : insight.chartData.title}
                      darkMode={darkMode}
                      onDelete={() => handleDeleteChart(insight.id)}
                    />
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Static Visualizations */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-4"
      >
        <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
          Portfolio Analysis
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Risk vs Return Chart */}
          <motion.div variants={itemVariants}>
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md h-full`}>
              <CardHeader className="pb-2">
                <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-base font-semibold`}>Risk vs. Return</CardTitle>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Portfolio assets performance metrics
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                      <XAxis 
                        type="number" 
                        dataKey="risk" 
                        name="Risk" 
                        unit="%" 
                        tickLine={false} 
                        axisLine={{ stroke: darkMode ? '#475569' : '#cbd5e1' }} 
                        style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                      />
                      <YAxis 
                        type="number" 
                        dataKey="return" 
                        name="Return" 
                        unit="%" 
                        tickLine={false} 
                        axisLine={{ stroke: darkMode ? '#475569' : '#cbd5e1' }} 
                        style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                      />
                      <ZAxis type="category" dataKey="name" name="Asset" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomScatterTooltip />} />
                      <Scatter name="Assets" data={riskData}>
                        {riskData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.name.match(/BTC|ETH|SOL|ADA|XRP|DOT|DOGE|LINK|MATIC|LTC/) 
                              ? (darkMode ? "#a855f7" : "#8b5cf6") 
                              : (darkMode ? "#60a5fa" : "#3b82f6")} 
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Carbon Intensity Score */}
          <motion.div variants={itemVariants}>
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md h-full`}>
              <CardHeader className="pb-2">
                <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-base font-semibold`}>Carbon Intensity Score</CardTitle>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Lower score is better (simulated)</p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={carbonData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={60} 
                        tickLine={false} 
                        axisLine={false} 
                        style={{ fontSize: '12px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                      />
                      <Tooltip
                        content={<CustomBarTooltip />}
                        cursor={{ fill: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                      />
                      <Bar dataKey="score" barSize={20} radius={[0, 4, 4, 0]}>
                        {carbonData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.score > 7 
                              ? (darkMode ? "#f43f5e" : "#ef4444") 
                              : entry.score > 4 
                                ? (darkMode ? "#f59e0b" : "#fbbf24") 
                                : (darkMode ? "#22c55e" : "#10b981")
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Correlation vs. SPY */}
          <motion.div variants={itemVariants}>
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md h-full`}>
              <CardHeader className="pb-2">
                <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-base font-semibold`}>Market Correlation</CardTitle>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Correlation with S&P 500 Index</p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={correlationData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                      <XAxis 
                        dataKey="name" 
                        tickLine={false} 
                        axisLine={{ stroke: darkMode ? '#475569' : '#cbd5e1' }} 
                        style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                        tick={{ angle: -45, textAnchor: 'end', dominantBaseline: 'ideographic' }}
                        height={60}
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={{ stroke: darkMode ? '#475569' : '#cbd5e1' }} 
                        style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                        tickFormatter={(value) => value.toFixed(1)}
                        domain={[0, 1]}
                      />
                      <Tooltip
                        formatter={(value) => [value.toFixed(2), 'Correlation']} 
                        cursor={{ fill: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#1e293b' : '#ffffff', 
                          borderColor: darkMode ? '#475569' : '#e2e8f0', 
                          borderRadius: '6px' 
                        }}
                        labelStyle={{ color: darkMode ? '#f1f5f9' : '#1e293b', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" fill={darkMode ? "#60a5fa" : "#3b82f6"} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sharpe Ratios */}
          <motion.div variants={itemVariants}>
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md h-full`}>
              <CardHeader className="pb-2">
                <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-base font-semibold`}>Sharpe Ratios</CardTitle>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Risk-adjusted return metrics</p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sharpeRatios} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                      <XAxis 
                        dataKey="name" 
                        tickLine={false} 
                        axisLine={{ stroke: darkMode ? '#475569' : '#cbd5e1' }} 
                        style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={{ stroke: darkMode ? '#475569' : '#cbd5e1' }} 
                        style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                      />
                      <Tooltip
                        formatter={(value) => [value.toFixed(2), 'Sharpe Ratio']} 
                        cursor={{ fill: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#1e293b' : '#ffffff', 
                          borderColor: darkMode ? '#475569' : '#e2e8f0', 
                          borderRadius: '6px' 
                        }}
                        labelStyle={{ color: darkMode ? '#f1f5f9' : '#1e293b', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" fill={darkMode ? "#f472b6" : "#ec4899"} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Market vs Portfolio Volatility */}
          <motion.div variants={itemVariants}>
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md h-full`}>
              <CardHeader className="pb-2">
                <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-base font-semibold`}>Volatility Comparison</CardTitle>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Portfolio vs Market Volatility</p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={volatilityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                      <XAxis 
                        dataKey="name" 
                        tickLine={false} 
                        axisLine={{ stroke: darkMode ? '#475569' : '#cbd5e1' }} 
                        style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                      />
                      <YAxis 
                        tickLine={false} 
                        axisLine={{ stroke: darkMode ? '#475569' : '#cbd5e1' }} 
                        style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                      />
                      <Tooltip
                        formatter={(value) => [value, 'Volatility %']} 
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#1e293b' : '#ffffff', 
                          borderColor: darkMode ? '#475569' : '#e2e8f0', 
                          borderRadius: '6px' 
                        }}
                        labelStyle={{ color: darkMode ? '#f1f5f9' : '#1e293b', fontWeight: 'bold' }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="market" 
                        name="Market" 
                        stroke={darkMode ? "#f43f5e" : "#ef4444"} 
                        strokeWidth={2} 
                        dot={{ r: 3, strokeWidth: 1 }} 
                        activeDot={{ r: 5 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="portfolio" 
                        name="Portfolio" 
                        stroke={darkMode ? "#10b981" : "#059669"} 
                        strokeWidth={2} 
                        dot={{ r: 3, strokeWidth: 1 }} 
                        activeDot={{ r: 5 }} 
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Asset Allocation (Donut Chart) */}
          <motion.div variants={itemVariants}>
            <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md h-full`}>
              <CardHeader className="pb-2">
                <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-base font-semibold`}>Asset Allocation</CardTitle>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Portfolio asset class breakdown</p>
              </CardHeader>
              <CardContent>
                <div className="h-64 -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={assetAllocation} 
                      layout="vertical" 
                      margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                      <XAxis 
                        type="number"
                        tickLine={false}
                        axisLine={{ stroke: darkMode ? '#475569' : '#cbd5e1' }}
                        style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }}
                        unit="%"
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={80} 
                        tickLine={false} 
                        axisLine={false} 
                        style={{ fontSize: '12px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                      />
                      <Tooltip
                        formatter={(value) => [`${value}%`, 'Allocation']} 
                        cursor={{ fill: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                        contentStyle={{ 
                          backgroundColor: darkMode ? '#1e293b' : '#ffffff', 
                          borderColor: darkMode ? '#475569' : '#e2e8f0', 
                          borderRadius: '6px' 
                        }}
                        labelStyle={{ color: darkMode ? '#f1f5f9' : '#1e293b', fontWeight: 'bold' }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {assetAllocation.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}