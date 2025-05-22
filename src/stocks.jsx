import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { PlusCircle, Trash2, AlertCircle, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { getStockLogo, getCryptoLogo } from "./hooks";
import SearchBar from "./components/SearchBar";

// Animation variants for staggered animations
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

export default function StocksTab({ 
  darkMode, 
  positions, 
  setPositions, 
  totalValue, 
  updateChartsData,
  apiKey,
  apiError,
  setApiError
}) {
  // Local state
  const [form, setForm] = useState({ symbol: "", quantity: "", price: "", assetType: "stocks" });
  const [selectedResult, setSelectedResult] = useState(null);
  
  // Handle form changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle asset type change
  const handleAssetTypeChange = (value) => {
    setForm({ symbol: "", quantity: "", price: "", assetType: value });
    setSelectedResult(null);
    setApiError("");
  };

  // Select a search result
  const handleSelectSearchResult = (result) => {
    setSelectedResult(result);
    setForm({
      ...form, 
      symbol: result.symbol,
      price: result.price ? result.price : ""
    });
    setApiError("");
    
    // Store whether the price is simulated or from cache
    if (result.simulated || result.fromCache) {
      setSelectedResult({
        ...result,
        simulated: result.simulated || false,
        fromCache: result.fromCache || false
      });
    }
  };

  // Add a position
  const addPosition = () => {
    if (!form.symbol || !form.quantity || !form.price) {
      setApiError("Please fill in Symbol, Quantity, and Purchase Price.");
      return;
    }

    let logoUrl = "";
    const upperSymbol = form.symbol.trim().toUpperCase();

    if (form.assetType === "stocks") {
      logoUrl = getStockLogo(upperSymbol);
    } else {
      logoUrl = getCryptoLogo(upperSymbol);
    }

    const newPosition = {
      id: Date.now(), 
      symbol: upperSymbol, 
      name: selectedResult ? selectedResult.name : upperSymbol,
      quantity: Number(form.quantity), 
      price: Number(form.price),
      currentPrice: Number(form.price),
      value: Number(form.quantity) * Number(form.price),
      change: 0,
      assetType: form.assetType,
      logoUrl,
      simulated: selectedResult?.simulated || false,
      fromCache: selectedResult?.fromCache || false
    };

    setPositions([...positions, newPosition]);
    updateChartsData([...positions, newPosition]);
    
    // Clear form
    setForm({ symbol: "", quantity: "", price: "", assetType: form.assetType });
    setSelectedResult(null);
  };

  // Delete position
  const deletePosition = (id) => {
    const updatedPositions = positions.filter(p => p.id !== id);
    setPositions(updatedPositions);
    updateChartsData(updatedPositions);
  };

  // Group positions by type
  const stockPositions = positions.filter(p => p.assetType === "stocks");
  const cryptoPositions = positions.filter(p => p.assetType === "crypto");
  
  // Calculate totals
  const stocksValue = stockPositions.reduce((sum, p) => sum + p.value, 0);
  const cryptoValue = cryptoPositions.reduce((sum, p) => sum + p.value, 0);
  
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Top Cards Summary */}
      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" variants={containerVariants}>
        {/* Stocks Value */}
        <motion.div variants={itemVariants}>
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm hover:shadow-md transition-shadow duration-300`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Stocks Value</p>
                  <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    ${stocksValue.toLocaleString()}
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {stockPositions.length} positions
                  </p>
                </div>
                <div className={`bg-blue-500/10 p-3 rounded-xl`}>
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Crypto Value */}
        <motion.div variants={itemVariants}>
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm hover:shadow-md transition-shadow duration-300`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Crypto Value</p>
                  <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    ${cryptoValue.toLocaleString()}
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {cryptoPositions.length} positions
                  </p>
                </div>
                <div className={`bg-purple-500/10 p-3 rounded-xl`}>
                  <TrendingUp className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Total Value */}
        <motion.div variants={itemVariants}>
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-sm hover:shadow-md transition-shadow duration-300`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Value</p>
                  <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                    ${totalValue.toLocaleString()}
                  </h3>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {positions.length} positions
                  </p>
                </div>
                <div className={`bg-emerald-500/10 p-3 rounded-xl`}>
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      
      {/* Add Position Form */}
      <motion.div variants={itemVariants}>
        <Card className={`mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`text-xl ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
              Add New Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-4">
                <Label htmlFor="assetType" className={`mb-2 block text-sm font-medium ${darkMode ? 'text-white' : ''}`}>
                  Asset Type
                </Label>
                <Select value={form.assetType} onValueChange={handleAssetTypeChange}>
                  <SelectTrigger className={`w-full ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}>
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                  <SelectContent className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <SelectItem value="stocks">Stocks</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-4">
                <Label htmlFor="symbol" className={`mb-2 block text-sm font-medium ${darkMode ? 'text-white' : ''}`}>
                  Search for {form.assetType === "stocks" ? "Stock" : "Cryptocurrency"}
                </Label>
                <div className="relative" style={{ zIndex: 20 }}>
                  <SearchBar 
                    darkMode={darkMode}
                    assetType={form.assetType}
                    apiKey={apiKey}
                    onSelect={handleSelectSearchResult}
                    placeholder={`Search for ${form.assetType === "stocks" ? "stocks by name or symbol" : "cryptocurrencies"}`}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="symbol" className={`mb-2 block text-sm font-medium ${darkMode ? 'text-white' : ''}`}>
                  Symbol
                </Label>
                <Input
                  id="symbol"
                  name="symbol"
                  placeholder="e.g., AAPL"
                  value={form.symbol}
                  onChange={handleChange}
                  className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}
                  readOnly={!!selectedResult}
                />
              </div>
              
              <div>
                <Label htmlFor="quantity" className={`mb-2 block text-sm font-medium ${darkMode ? 'text-white' : ''}`}>
                  Quantity
                </Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="any"
                  placeholder="Number of shares/coins"
                  value={form.quantity}
                  onChange={handleChange}
                  className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}
                />
              </div>
              
              <div>
                <Label htmlFor="price" className={`mb-2 block text-sm font-medium ${darkMode ? 'text-white' : ''}`}>
                  Purchase Price
                </Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  step="any"
                  placeholder="Price per share/coin"
                  value={form.price}
                  onChange={handleChange}
                  className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-300'}`}
                />
              </div>
              
              <div className="flex items-end">
                <Button
                  onClick={addPosition}
                  className={`w-full h-10 gap-2 ${darkMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                >
                  <PlusCircle className="h-4 w-4" /> Add Position
                </Button>
              </div>
            </div>
            
            {apiError && (
              <div className={`mt-4 p-3 rounded-md flex items-start gap-2 ${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">{apiError}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Stocks List */}
      <AnimatePresence>
        {stockPositions.length > 0 && (
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className={`mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md overflow-hidden`}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-xl ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  Stocks Portfolio 
                  <span className={`text-sm ml-2 font-normal ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    (${stocksValue.toLocaleString()})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`${darkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'} text-xs uppercase`}>
                      <tr>
                        <th className="px-6 py-3 text-left">Stock</th>
                        <th className="px-6 py-3 text-right">Quantity</th>
                        <th className="px-6 py-3 text-right">Purchase Price</th>
                        <th className="px-6 py-3 text-right">Current Price</th>
                        <th className="px-6 py-3 text-right">Value</th>
                        <th className="px-6 py-3 text-right">Change</th>
                        <th className="px-6 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {stockPositions.map((position, index) => (
                        <motion.tr 
                          key={position.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ 
                            opacity: 1, 
                            y: 0,
                            transition: { 
                              delay: index * 0.05,
                              duration: 0.3
                            }
                          }}
                          className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} hover:bg-slate-100/5 transition-colors duration-150`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <img
                                src={position.logoUrl}
                                alt={position.symbol}
                                className="w-8 h-8 rounded-md object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = `https://ui-avatars.com/api/?name=${position.symbol}&background=random&color=fff&size=128`;
                                }}
                              />
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{position.symbol}</span>
                                  {position.simulated && (
                                    <span className={`text-xxs px-1 py-0.5 rounded ${
                                      darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      est
                                    </span>
                                  )}
                                  {position.fromCache && (
                                    <span className={`text-xxs px-1 py-0.5 rounded ${
                                      darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      cached
                                    </span>
                                  )}
                                </div>
                                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {position.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">{position.quantity.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">${position.price.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-medium">${(position.currentPrice || position.price).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-medium">${position.value.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              position.change >= 0 
                                ? darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                                : darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
                            }`}>
                              {position.change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                              {position.change >= 0 ? '+' : ''}{position.change}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePosition(position.id)}
                              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Crypto List */}
      <AnimatePresence>
        {cryptoPositions.length > 0 && (
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className={`mb-6 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md overflow-hidden`}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-xl ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                  Cryptocurrency Portfolio
                  <span className={`text-sm ml-2 font-normal ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    (${cryptoValue.toLocaleString()})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={`${darkMode ? 'bg-slate-700/50 text-slate-300' : 'bg-slate-100 text-slate-600'} text-xs uppercase`}>
                      <tr>
                        <th className="px-6 py-3 text-left">Cryptocurrency</th>
                        <th className="px-6 py-3 text-right">Quantity</th>
                        <th className="px-6 py-3 text-right">Purchase Price</th>
                        <th className="px-6 py-3 text-right">Current Price</th>
                        <th className="px-6 py-3 text-right">Value</th>
                        <th className="px-6 py-3 text-right">Change</th>
                        <th className="px-6 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {cryptoPositions.map((position, index) => (
                        <motion.tr 
                          key={position.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ 
                            opacity: 1, 
                            y: 0,
                            transition: { 
                              delay: index * 0.05,
                              duration: 0.3
                            }
                          }}
                          className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} hover:bg-slate-100/5 transition-colors duration-150`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <img
                                src={position.logoUrl}
                                alt={position.symbol}
                                className="w-8 h-8 rounded-md object-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = `https://ui-avatars.com/api/?name=${position.symbol}&background=random&color=fff&size=128`;
                                }}
                              />
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{position.symbol}</span>
                                  {position.simulated && (
                                    <span className={`text-xxs px-1 py-0.5 rounded ${
                                      darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      est
                                    </span>
                                  )}
                                  {position.fromCache && (
                                    <span className={`text-xxs px-1 py-0.5 rounded ${
                                      darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      cached
                                    </span>
                                  )}
                                </div>
                                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {position.name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">{position.quantity.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">${position.price.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-medium">${(position.currentPrice || position.price).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-medium">${position.value.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              position.change >= 0 
                                ? darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                                : darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-800'
                            }`}>
                              {position.change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                              {position.change >= 0 ? '+' : ''}{position.change}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePosition(position.id)}
                              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
      
      {positions.length === 0 && (
        <motion.div 
          variants={itemVariants}
          className={`text-center p-8 rounded-lg border-2 border-dashed ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}
        >
          <p className="mb-2">No positions added yet</p>
          <p className="text-sm">Search for a stock or cryptocurrency and add your first position</p>
        </motion.div>
      )}
    </motion.div>
  );
}