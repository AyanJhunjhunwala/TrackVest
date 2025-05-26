import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { 
  Wallet, DollarSign, Home, LineChart, TrendingUp, TrendingDown, Info 
} from "lucide-react";

// Enhanced Custom Tooltip for Pie Chart
const CustomPieTooltip = ({ active, payload, darkMode }) => {
  if (active && payload && payload.length) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`p-3 rounded-lg shadow-lg border ${
          darkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
        }`}
      >
        <p className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
          {payload[0].name}
        </p>
        <p className="text-emerald-500 font-medium">
          {`${payload[0].value}%`}
        </p>
      </motion.div>
    );
  }
  return null;
};

// Enhanced Custom Tooltip for Area Chart
const CustomAreaTooltip = ({ active, payload, label, darkMode }) => {
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
        <p className="text-emerald-500 font-semibold">
          ${payload[0].value.toLocaleString()}
        </p>
      </motion.div>
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
  assetAllocation,
  demoMode,
  investmentCategories,
  totalInvestmentCategoriesValue,
  totalPortfolioValue
}) {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  // Enhanced gradient colors for pie chart
  const pieGradients = [
    { id: 'tech', start: '#10b981', end: '#059669' },
    { id: 'crypto', start: '#8b5cf6', end: '#7c3aed' },
    { id: 'healthcare', start: '#3b82f6', end: '#2563eb' },
    { id: 'consumer', start: '#f59e0b', end: '#d97706' },
    { id: 'energy', start: '#ec4899', end: '#db2777' }
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Demo Mode Banner */}
      {(!demoMode?.polygon || !demoMode?.gemini) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border-l-4 border-yellow-500 ${darkMode ? 'bg-gradient-to-r from-yellow-900/20 to-yellow-800/10 text-yellow-200' : 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800'} shadow-sm`}
        >
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-yellow-500" />
            <div>
              <h3 className="font-semibold">Demo Mode - Portfolio Overview</h3>
              <p className="text-sm mt-1">
                {!demoMode?.polygon && !demoMode?.gemini 
                  ? "You're viewing sample data. Add your API keys in Settings to get live market data and AI-powered insights."
                  : !demoMode?.polygon 
                    ? "Stock/crypto data is simulated. Add your Polygon.io API key for live market data."
                    : "Real estate data is simulated. Add your Gemini API key for AI-powered property analysis."
                }
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-6" data-tutorial="overview-cards">
        {/* Total Portfolio Value Card */}
        <motion.div variants={itemVariants}>
          <Card className={`${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
            <CardHeader className="pb-2">
              <CardTitle className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} text-sm font-medium flex items-center gap-2`}>
                <div className="p-2 rounded-full bg-emerald-500/20">
                  <Wallet className="h-4 w-4 text-emerald-500" />
                </div>
                Total Portfolio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className={`text-xs sm:text-sm mt-2 flex items-center gap-1 ${changePercentage >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {changePercentage >= 0 ? <TrendingUp className="h-3 w-3"/> : <TrendingDown className="h-3 w-3"/>} 
                {Math.abs(changePercentage).toFixed(1)}%
                <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} ml-1`}>vs prev. day</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Financial Assets Card */}
        <motion.div variants={itemVariants}>
          <Card className={`${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
            <CardHeader className="pb-2">
              <CardTitle className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} text-sm font-medium flex items-center gap-2`}>
                <div className="p-2 rounded-full bg-blue-500/20">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </div>
                Stocks & Crypto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className={`text-xs sm:text-sm mt-2 flex items-center gap-1 ${changePercentage >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {changePercentage >= 0 ? <TrendingUp className="h-3 w-3"/> : <TrendingDown className="h-3 w-3"/>} 
                {Math.abs(changePercentage).toFixed(1)}%
                <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} ml-1`}>today</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Real Estate Equity Card */}
        <motion.div variants={itemVariants}>
          <Card className={`${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
            <CardHeader className="pb-2">
              <CardTitle className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} text-sm font-medium flex items-center gap-2`}>
                <div className="p-2 rounded-full bg-amber-500/20">
                  <Home className="h-4 w-4 text-amber-500" />
                </div>
                Real Estate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                ${totalRealEstateEquity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className={`text-xs sm:text-sm mt-2 flex items-center gap-1 text-emerald-400`}>
                <TrendingUp className="h-3 w-3"/> 3.2%
                <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} ml-1`}>YTD (est.)</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alternative Investments Card */}
        <motion.div variants={itemVariants}>
          <Card className={`${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
            <CardHeader className="pb-2">
              <CardTitle className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} text-sm font-medium flex items-center gap-2`}>
                <div className="p-2 rounded-full bg-purple-500/20">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                </div>
                Alternative Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl sm:text-3xl font-bold ${darkMode ? 'text-slate-50' : 'text-slate-900'}`}>
                ${totalInvestmentCategoriesValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className={`text-xs sm:text-sm mt-2 flex items-center gap-1 text-slate-400`}>
                <span>{investmentCategories.length} categories</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Portfolio Performance Mini Chart Card */}
        <motion.div variants={itemVariants}>
          <Card className={`${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105`}>
            <CardHeader className="pb-2">
              <CardTitle className={`${darkMode ? 'text-slate-300' : 'text-slate-600'} text-sm font-medium flex items-center gap-2`}>
                <div className="p-2 rounded-full bg-indigo-500/20">
                  <LineChart className="h-4 w-4 text-indigo-500" />
                </div>
                Performance (1 Yr)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Enhanced Mini Area Chart */}
              <div className="h-12 mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData.slice(-30)} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValueMini" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={darkMode ? "#a855f7" : "#8b5cf6"} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={darkMode ? "#a855f7" : "#8b5cf6"} stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={darkMode ? "#a855f7" : "#8b5cf6"} 
                      strokeWidth={2} 
                      fillOpacity={1} 
                      fill="url(#colorValueMini)"
                      animationDuration={1500}
                    />
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
                    {yearlyChange >= 0 ? <TrendingUp className="h-3 w-3"/> : <TrendingDown className="h-3 w-3"/>} 
                    {Math.abs(yearlyChange).toFixed(1)}%
                    <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} ml-1`}>past year</span>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Enhanced Performance Chart and Allocation Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Main Performance Chart */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2"
        >
          <Card className={`${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-300`}>
            <CardHeader>
              <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold flex items-center gap-2`}>
                <div className="p-2 rounded-full bg-emerald-500/20">
                  <LineChart className="h-5 w-5 text-emerald-500" />
                </div>
                Portfolio Performance Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorValueMain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month" 
                      tickLine={false} 
                      axisLine={false} 
                      dy={10}
                      style={{ fontSize: '12px', fill: darkMode ? '#94a3b8' : '#64748b' }}
                    />
                    <YAxis
                      tickFormatter={tick => `$${(tick/1000).toFixed(0)}k`}
                      tickLine={false} 
                      axisLine={false} 
                      dx={-10}
                      style={{ fontSize: '12px', fill: darkMode ? '#94a3b8' : '#64748b' }}
                    />
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      vertical={false} 
                      stroke={darkMode ? 'rgba(148, 163, 184, 0.1)' : 'rgba(203, 213, 225, 0.3)'} 
                    />
                    <Tooltip content={<CustomAreaTooltip darkMode={darkMode} />} />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorValueMain)"
                      animationDuration={1500}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2, fill: darkMode ? '#1e293b' : '#ffffff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Enhanced Asset Allocation Pie Chart */}
        <motion.div variants={itemVariants}>
          <Card className={`${darkMode ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700' : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'} shadow-lg hover:shadow-xl transition-all duration-300 h-full flex flex-col`}>
            <CardHeader>
              <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold flex items-center gap-2`}>
                <div className="p-2 rounded-full bg-purple-500/20">
                  <PieChart className="h-5 w-5 text-purple-500" />
                </div>
                Asset Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col items-center justify-center">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {pieGradients.map((gradient, index) => (
                        <linearGradient key={gradient.id} id={`pie-${gradient.id}`} x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={gradient.start} />
                          <stop offset="100%" stopColor={gradient.end} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={assetAllocation}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      animationDuration={1200}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelStyle={{
                        fill: darkMode ? '#e2e8f0' : '#334155',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      {assetAllocation.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={`url(#pie-${pieGradients[index % pieGradients.length].id})`}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip darkMode={darkMode} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Enhanced Legend */}
              <div className="mt-4 w-full">
                <div className="grid grid-cols-1 gap-2">
                  {assetAllocation.map((item, index) => (
                    <motion.div 
                      key={item.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ background: `linear-gradient(45deg, ${pieGradients[index % pieGradients.length].start}, ${pieGradients[index % pieGradients.length].end})` }}
                        />
                        <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                          {item.name}
                        </span>
                      </div>
                      <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {item.value}%
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}