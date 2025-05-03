import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { 
  Wallet, DollarSign, Home, LineChart, TrendingUp 
} from "lucide-react";

// Custom Tooltip for Pie Chart
const CustomPieTooltip = ({ active, payload, darkMode }) => {
  if (active && payload && payload.length) {
    return (
      <div className={`${darkMode ? 'bg-slate-700' : 'bg-white'} p-2 border ${darkMode ? 'border-slate-600' : 'border-slate-300'} rounded shadow-lg text-sm`}>
        <p className="font-bold">{`${payload[0].name}: ${payload[0].value}%`}</p>
      </div>
    );
  }
  return null;
};

export default function OverviewTab({ 
  darkMode, 
  totalValue, 
  totalRealEstateEquity, 
  changePercentage, 
  performanceData,
  assetAllocation 
}) {
  return (
    <>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
        {/* Total Portfolio Value Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0 }}>
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md hover:shadow-lg transition-shadow`}>
            <CardHeader className="pb-2">
              <CardTitle className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} text-sm font-medium flex items-center gap-2`}>
                <Wallet className="h-4 w-4 text-emerald-500" /> Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                ${(totalValue + totalRealEstateEquity).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className={`text-xs sm:text-sm mt-1 flex items-center gap-1 ${changePercentage >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {changePercentage >= 0 ? <TrendingUp className="h-3 w-3"/> : <TrendingUp className="h-3 w-3 transform rotate-180"/>} {Math.abs(changePercentage).toFixed(1)}%
                <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} ml-1`}>vs prev. day</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Financial Assets Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md hover:shadow-lg transition-shadow`}>
            <CardHeader className="pb-2">
              <CardTitle className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} text-sm font-medium flex items-center gap-2`}>
                <DollarSign className="h-4 w-4 text-blue-500" /> Stocks & Crypto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className={`text-xs sm:text-sm mt-1 flex items-center gap-1 ${changePercentage >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {changePercentage >= 0 ? <TrendingUp className="h-3 w-3"/> : <TrendingUp className="h-3 w-3 transform rotate-180"/>} {Math.abs(changePercentage).toFixed(1)}%
                <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} ml-1`}>today</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Real Estate Equity Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md hover:shadow-lg transition-shadow`}>
            <CardHeader className="pb-2">
              <CardTitle className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} text-sm font-medium flex items-center gap-2`}>
                <Home className="h-4 w-4 text-amber-500" /> Real Estate Equity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                ${totalRealEstateEquity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              {/* Placeholder for YTD change */}
              <div className={`text-xs sm:text-sm mt-1 flex items-center gap-1 text-emerald-400`}>
                <TrendingUp className="h-3 w-3"/> 3.2%
                <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} ml-1`}>YTD (est.)</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Portfolio Performance Mini Chart Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md hover:shadow-lg transition-shadow`}>
            <CardHeader className="pb-2">
              <CardTitle className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} text-sm font-medium flex items-center gap-2`}>
                <LineChart className="h-4 w-4 text-purple-500" /> Performance (1 Yr)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mini Area Chart */}
              <div className="h-12 mb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData.slice(-30)} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValueMini" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={darkMode ? "#a855f7" : "#8b5cf6"} stopOpacity={0.6}/>
                        <stop offset="95%" stopColor={darkMode ? "#a855f7" : "#8b5cf6"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="value" stroke={darkMode ? "#a855f7" : "#8b5cf6"} strokeWidth={2} fillOpacity={1} fill="url(#colorValueMini)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              {/* Yearly change calculation */}
              {(() => {
                const startValue = performanceData[0]?.value || 1;
                const endValue = performanceData[performanceData.length - 1]?.value || startValue;
                const yearlyChange = ((endValue - startValue) / startValue) * 100;
                return (
                  <div className={`text-xs sm:text-sm flex items-center gap-1 ${yearlyChange >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {yearlyChange >= 0 ? <TrendingUp className="h-3 w-3"/> : <TrendingUp className="h-3 w-3 transform rotate-180"/>} {Math.abs(yearlyChange).toFixed(1)}%
                    <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} ml-1`}>past year</span>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Chart and Allocation Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Main Performance Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
            <CardHeader>
              <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Portfolio Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValueMain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={darkMode ? "#10b981" : "#10b981"} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={darkMode ? "#10b981" : "#10b981"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month" tickLine={false} axisLine={false} dy={10}
                      style={{ fontSize: '12px', fill: darkMode ? '#94a3b8' : '#64748b' }}
                    />
                    <YAxis
                      tickFormatter={tick => `$${(tick/1000).toFixed(0)}k`}
                      tickLine={false} axisLine={false} dx={-10}
                      style={{ fontSize: '12px', fill: darkMode ? '#94a3b8' : '#64748b' }}
                    />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                    <Tooltip
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Value']}
                      contentStyle={{
                        backgroundColor: darkMode ? '#1e293b' : '#ffffff',
                        borderColor: darkMode ? '#475569' : '#e2e8f0',
                        color: darkMode ? '#f8fafc' : '#0f172a',
                        borderRadius: '6px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                      itemStyle={{ color: darkMode ? '#cbd5e1' : '#334155' }}
                      labelStyle={{ fontWeight: 'bold', marginBottom: '5px', color: darkMode ? '#f1f5f9' : '#1e293b' }}
                    />
                    <Area type="monotone" dataKey="value" stroke={darkMode ? "#10b981" : "#10b981"} strokeWidth={2} fillOpacity={1} fill="url(#colorValueMain)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Asset Allocation Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md h-full flex flex-col`}>
            <CardHeader>
              <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col items-center justify-center">
              <div className="w-full h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={assetAllocation} cx="50%" cy="50%" labelLine={false}
                      outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name"
                      stroke={darkMode ? '#1e293b' : '#ffffff'} strokeWidth={2}
                    >
                      {assetAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip darkMode={darkMode} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                {assetAllocation.map((entry, index) => (
                  <div key={`legend-${index}`} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                    <span className={`${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>{entry.name} ({entry.value}%)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}