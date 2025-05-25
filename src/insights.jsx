import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell,
  BarChart, Bar, LineChart as RechartsLineChart, Line, Legend, ResponsiveContainer
} from "recharts";
import Chart from "./components/ui/Chart";
import ComparisonChart from "./components/ui/ComparisonChart";
import DynamicPlotlyChart from "./components/ui/DynamicPlotlyChart";
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
  riskData = [], 
  assetAllocation = [],
  carbonData = [], 
  correlationData = [], 
  sharpeRatios = [], 
  volatilityData = [],
  investmentCategories = [],
  onDeleteCategory
}) {
  // Use our subscription hook to get all charts
  const { charts } = useAllChartsSubscription();
  const [error, setError] = useState(null);
  
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

  // Handle errors in rendering charts
  const renderChart = (insight) => {
    try {
      // Check if this is a Plotly chart
      if (insight.data && insight.data.plotlyConfig) {
        return (
          <DynamicPlotlyChart
            chartId={insight.id}
            darkMode={darkMode}
            onDelete={() => handleDeleteChart(insight.id)}
          />
        );
      }
      
      // Handle comparison chart
      if (insight.data && 
          (insight.data.series || 
           (insight.data.chartConfig && insight.data.chartConfig.type === 'comparison'))) {
        return (
          <ComparisonChart
            data={(insight.data.chartConfig) ? insight.data.chartConfig.data : insight.data.data}
            xKey={(insight.data.chartConfig) ? insight.data.chartConfig.xKey : insight.data.xKey}
            series={Array.isArray(insight.data.series) ? 
              insight.data.series : 
              (insight.data.chartConfig && Array.isArray(insight.data.chartConfig.series)) ? 
                insight.data.chartConfig.series : []}
            title={(insight.data.chartConfig) ? insight.data.chartConfig.title : insight.data.title}
            metricType={(insight.data.chartConfig) ? insight.data.chartConfig.metricType || 'Price (USD)' : 'Price (USD)'}
            darkMode={darkMode}
            onDelete={() => handleDeleteChart(insight.id)}
          />
        );
      }
      
      // Standard chart as default
      return (
        <Chart
          type={(insight.data && insight.data.chartConfig) ? insight.data.chartConfig.type : (insight.data ? insight.data.type : 'line')}
          data={(insight.data && insight.data.chartConfig) ? insight.data.chartConfig.data : (insight.data ? insight.data.data : [])}
          xKey={(insight.data && insight.data.chartConfig) ? insight.data.chartConfig.xKey : (insight.data ? insight.data.xKey : 'date')}
          yKey={(insight.data && insight.data.chartConfig) ? insight.data.chartConfig.yKey : (insight.data ? insight.data.yKey : 'value')}
          title={(insight.data && insight.data.chartConfig) ? insight.data.chartConfig.title : (insight.data ? insight.data.title : 'Chart')}
          darkMode={darkMode}
          onDelete={() => handleDeleteChart(insight.id)}
        />
      );
    } catch (err) {
      console.error("Error rendering chart:", err, insight);
      return (
        <div className={`flex items-center justify-center h-64 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
          Error rendering chart
        </div>
      );
    }
  };
  
  // Safely check if we have valid chart data
  const hasValidCharts = Array.isArray(charts) && charts.length > 0;
  
  // Render both the dynamic charts and the static visualizations
  return (
    <div className="space-y-8">
      {/* Dynamic Generated Charts from chartEmitter */}
      {hasValidCharts && (
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
                  {renderChart(insight)}
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

      {/* Investment Categories Section */}
      {investmentCategories.length > 0 && (
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              AI-Generated Investment Categories
            </h2>
            <div className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}>
              Powered by Gemini AI
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {investmentCategories.map((category, index) => (
              <motion.div 
                key={category.id}
                variants={itemVariants}
                className="h-full"
              >
                <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md h-full overflow-hidden hover:shadow-lg transition-shadow duration-200`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-base font-semibold leading-tight`}>
                          {category.name}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            category.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                            category.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {category.riskLevel} Risk
                          </span>
                          {category.source && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              category.source === 'detailed' 
                                ? darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'
                                : darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {category.source === 'detailed' ? 'AI Research' : 'Quick Gen'}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteCategory && onDeleteCategory(category.id)}
                        className={`h-8 w-8 p-0 ml-2 ${darkMode ? 'hover:bg-red-900/20 text-red-400' : 'hover:bg-red-50 text-red-500'}`}
                        title="Delete Category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} line-clamp-2 mt-2`}>
                      {category.description}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Expected Return:</span>
                        <div className={`text-sm font-semibold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                          {category.expectedReturn}
                        </div>
                      </div>
                      
                      <div>
                        <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Time Horizon:</span>
                        <div className={`text-sm ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                          {category.timeHorizon}
                        </div>
                      </div>
                      
                      {category.estimatedAmount && category.estimatedAmount !== 'Not specified' && (
                        <div className="col-span-2">
                          <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Investment Amount:</span>
                          <div className={`text-sm font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                            ${typeof category.estimatedAmount === 'number' 
                              ? category.estimatedAmount.toLocaleString() 
                              : category.estimatedAmount}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {category.keyMetrics && category.keyMetrics.length > 0 && (
                      <div>
                        <span className={`font-medium text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Key Metrics:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {category.keyMetrics.slice(0, 3).map((metric, idx) => (
                            <span key={idx} className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                              {metric}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {category.recommendedAssets && category.recommendedAssets.length > 0 && (
                      <div>
                        <span className={`font-medium text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Recommended Assets:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {category.recommendedAssets.slice(0, 4).map((asset, idx) => (
                            <span key={idx} className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                              {asset.symbol}
                              {asset.currentPrice && <span className="ml-1 text-green-600">${asset.currentPrice}</span>}
                            </span>
                          ))}
                          {category.recommendedAssets.length > 4 && (
                            <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                              +{category.recommendedAssets.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {category.webSources && category.webSources.length > 0 && (
                      <div>
                        <span className={`font-medium text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Research Sources:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {category.webSources.slice(0, 2).map((source, idx) => (
                            <a 
                              key={idx} 
                              href={source} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={`text-xs px-2 py-1 rounded hover:underline ${darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-700'}`}
                            >
                              Source {idx + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center text-xs">
                        <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Rebalance: {category.rebalancingFrequency}
                        </span>
                        <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Created {new Date(category.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {category.lastUpdated && (
                        <div className="mt-1">
                          <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            Research updated: {new Date(category.lastUpdated).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}