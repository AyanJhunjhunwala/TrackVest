import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell,
  BarChart, Bar, LineChart as RechartsLineChart, Line, Legend, ResponsiveContainer
} from "recharts";

// Custom tooltip for scatter chart
const CustomScatterTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-slate-200 rounded shadow-lg text-sm">
        <p className="font-bold">{payload[0].payload.name}</p>
        <p>Risk: {payload[0].value}%</p>
        <p>Return: {payload[0].payload.return}%</p>
      </div>
    );
  }
  return null;
};

export default function InsightsTab({ 
  darkMode, 
  riskData, 
  carbonData, 
  correlationData, 
  sharpeRatios, 
  volatilityData 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Risk vs Return Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0 }}>
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-base font-semibold`}>Risk vs. Return</CardTitle>
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-base font-semibold`}>Carbon Intensity Score</CardTitle>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Lower score is better (simulated).</p>
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
                    formatter={(value) => [value, 'Score']} 
                    cursor={{ fill: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                    contentStyle={{ 
                      backgroundColor: darkMode ? '#1e293b' : '#ffffff', 
                      borderColor: darkMode ? '#475569' : '#e2e8f0', 
                      borderRadius: '6px' 
                    }}
                    labelStyle={{ color: darkMode ? '#f1f5f9' : '#1e293b', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="score" barSize={20}>
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-base font-semibold`}>Correlation vs. SPY</CardTitle>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>1 = Perfect positive correlation (simulated).</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={correlationData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis 
                    type="number" 
                    domain={[0, 1]} 
                    tickFormatter={(tick) => tick.toFixed(1)} 
                    ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]} 
                    style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={70} 
                    tickLine={false} 
                    axisLine={false} 
                    style={{ fontSize: '12px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
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
                  <Bar dataKey="value" barSize={20} fill={darkMode ? "#ec4899" : "#f472b6"} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sharpe Ratio */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-base font-semibold`}>Sharpe Ratio</CardTitle>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Risk-adjusted return, higher is better (simulated).</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sharpeRatios} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    style={{ fontSize: '12px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
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
                  <Bar dataKey="value" barSize={30} fill={darkMode ? "#14b8a6" : "#2dd4bf"} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Portfolio vs. Market Volatility */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, delay: 0.4 }} 
        className="md:col-span-2"
      >
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-base font-semibold`}>Portfolio vs. Market Volatility</CardTitle>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Monthly volatility estimate (simulated).</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={volatilityData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false} 
                    axisLine={false} 
                    style={{ fontSize: '12px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    unit="%" 
                    style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} 
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value.toFixed(1)}%`, 
                      name === 'portfolio' ? 'Portfolio Vol.' : 'Market Vol.'
                    ]}
                    contentStyle={{ 
                      backgroundColor: darkMode ? '#1e293b' : '#ffffff', 
                      borderColor: darkMode ? '#475569' : '#e2e8f0', 
                      borderRadius: '6px' 
                    }}
                    labelStyle={{ color: darkMode ? '#f1f5f9' : '#1e293b', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={30} iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="portfolio" 
                    name="Portfolio" 
                    stroke={darkMode ? "#60a5fa" : "#3b82f6"} 
                    strokeWidth={2} 
                    dot={false} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="market" 
                    name="Market (SPY)" 
                    stroke={darkMode ? "#e879f9" : "#d946ef"} 
                    strokeWidth={2} 
                    dot={false} 
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}