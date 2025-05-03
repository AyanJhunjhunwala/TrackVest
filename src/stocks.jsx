import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { PlusCircle, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { debounce, getStockLogo, getCryptoLogo } from "./hooks";

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
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  
  // Handle form changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'symbol') {
      setSelectedResult(null);
      setSearchResults([]);
      setApiError(""); 
      if(e.target.value.trim() !== "") {
        setIsSearching(true);
        debouncedSearch();
      } else {
        setIsSearching(false);
      }
    }
  };

  // Handle asset type change
  const handleAssetTypeChange = (value) => {
    setForm({ symbol: "", quantity: "", price: "", assetType: value });
    setSearchResults([]);
    setSelectedResult(null);
    setIsSearching(false);
    setApiError("");
  };

  // Search for symbol
  const searchSymbol = async () => {
    if (!form.symbol) return;

    if (form.assetType === 'stocks' && !apiKey) {
      setApiError("Please enter an AlphaVantage API key first in Settings");
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setIsSearchLoading(true);
    setApiError("");
    setSearchResults([]);

    let keywords = form.symbol.trim();

    if (form.assetType === "stocks") {
      const endpoint = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${keywords}&apikey=${apiKey}`;
      try {
        const response = await fetch(endpoint);
        const data = await response.json();

        if (data.Note && data.Note.includes("call frequency")) {
          setApiError("API rate limit reached. Using demo stock data.");
          simulateStockResults(keywords);
        } else if (data["Error Message"] || data.Information) {
          setApiError(data["Error Message"] || data.Information || "Error fetching stock data. Using demo stock data.");
          simulateStockResults(keywords);
        } else if (data.bestMatches && data.bestMatches.length > 0) {
          setSearchResults(data.bestMatches.map(match => ({
            symbol: match["1. symbol"], 
            name: match["2. name"], 
            type: match["3. type"],
            region: match["4. region"], 
            price: (Math.random() * 500 + 50).toFixed(2)
          })));
        } else {
          setApiError("No stock results found");
        }
      } catch (error) {
        console.error("Stock Search API Fetch Error:", error);
        setApiError("Network error. Using demo stock data.");
        simulateStockResults(keywords);
      } finally {
        setIsSearchLoading(false);
      }
    } else {
      console.log("Simulating crypto search for:", keywords);
      simulateCryptoResults(keywords);
      setIsSearchLoading(false);
    }
  };

  // Debounced search
  const debouncedSearch = useRef(debounce(searchSymbol, 500)).current;

  // Simulate stock search results
  const simulateStockResults = (keyword) => {
    const stocks = [
      { symbol: "AAPL", name: "Apple Inc.", price: 190.50 }, 
      { symbol: "MSFT", name: "Microsoft Corp.", price: 325.00 },
      { symbol: "GOOGL", name: "Alphabet Inc.", price: 140.20 }, 
      { symbol: "AMZN", name: "Amazon.com Inc.", price: 135.80 },
      { symbol: "TSLA", name: "Tesla Inc.", price: 250.00 }, 
      { symbol: "NVDA", name: "NVIDIA Corp.", price: 480.60 },
      { symbol: "META", name: "Meta Platforms Inc.", price: 315.40 }, 
      { symbol: "JPM", name: "JPMorgan Chase & Co.", price: 155.20 },
      { symbol: "V", name: "Visa Inc.", price: 240.90 }, 
      { symbol: "DIS", name: "The Walt Disney Company", price: 85.10 },
    ];
    const filtered = stocks.filter(s =>
      s.symbol.toLowerCase().includes(keyword.toLowerCase()) || 
      s.name.toLowerCase().includes(keyword.toLowerCase())
    );
    setSearchResults(filtered.map(stock => ({ 
      ...stock, 
      type: "Equity", 
      region: "United States" 
    })));
    if (filtered.length === 0) setApiError("No simulated stock results found");
  };

  // Simulate crypto search results
  const simulateCryptoResults = (keyword) => {
    const cryptos = [
      { symbol: "BTC", name: "Bitcoin", price: 49800 }, 
      { symbol: "ETH", name: "Ethereum", price: 2350 },
      { symbol: "SOL", name: "Solana", price: 145 }, 
      { symbol: "ADA", name: "Cardano", price: 0.45 },
      { symbol: "XRP", name: "Ripple", price: 0.55 }, 
      { symbol: "DOT", name: "Polkadot", price: 7.20 },
      { symbol: "DOGE", name: "Dogecoin", price: 0.10 }, 
      { symbol: "LINK", name: "Chainlink", price: 15.50 },
      { symbol: "MATIC", name: "Polygon", price: 0.90 }, 
      { symbol: "LTC", name: "Litecoin", price: 75.00 }
    ];
    const filtered = cryptos.filter(c =>
      c.symbol.toLowerCase().includes(keyword.toLowerCase()) || 
      c.name.toLowerCase().includes(keyword.toLowerCase())
    );
    setSearchResults(filtered.map(crypto => ({
      symbol: crypto.symbol, 
      name: crypto.name, 
      price: crypto.price.toFixed(2), 
      type: "Cryptocurrency", 
      region: "Global"
    })));
    if (filtered.length === 0) setApiError("No crypto results found");
  };

  // Select a search result
  const selectResult = (result) => {
    setSelectedResult(result);
    setForm({
      ...form, 
      symbol: result.symbol,
      price: result.price ? result.price : ""
    });
    setSearchResults([]);
    setIsSearching(false);
    setApiError("");
  };

  // Add a position
  const addPosition = () => {
    if (!form.symbol || !form.quantity || !form.price) {
      alert("Please fill in Symbol, Quantity, and Purchase Price.");
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
      logoUrl: logoUrl
    };

    const updatedPositions = [...positions, newPosition];
    setPositions(updatedPositions);
    setForm({ symbol: "", quantity: "", price: "", assetType: form.assetType });
    setSelectedResult(null);
    setIsSearching(false);
    setSearchResults([]);
    setApiError("");

    // Update charts data
    updateChartsData(updatedPositions);
  };

  // Delete a position
  const deletePosition = (id) => {
    const updatedPositions = positions.filter(p => p.id !== id);
    setPositions(updatedPositions);
    updateChartsData(updatedPositions);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add Position Form */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Add New Position</CardTitle>
            {apiError && <p className="text-xs text-rose-500 mt-2 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {apiError}</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Asset Type Selector */}
            <div>
              <Label htmlFor="assetTypeSelect" className="text-sm font-medium mb-1 block">Asset Type</Label>
              <Select value={form.assetType} onValueChange={handleAssetTypeChange}>
                <SelectTrigger id="assetTypeSelect" className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}>
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent className={`${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white'}`}>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="crypto">Cryptocurrency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Symbol Search */}
            <div className="relative">
              <Label htmlFor="symbol" className="text-sm font-medium mb-1 block">Symbol / Name</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="symbol" name="symbol"
                  placeholder={form.assetType === 'stocks' ? "e.g., AAPL or Apple" : "e.g., BTC or Bitcoin"}
                  value={form.symbol} onChange={handleChange}
                  onFocus={() => setIsSearching(true)}
                  className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}
                  autoComplete="off"
                />
                {isSearchLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400"/>}
              </div>
              {/* Search Results Dropdown */}
              {isSearching && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className={`absolute z-20 w-full mt-1 ${darkMode ? 'bg-slate-700' : 'bg-white'} border ${darkMode ? 'border-slate-600' : 'border-slate-300'} rounded-md shadow-lg max-h-60 overflow-y-auto`}
                >
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      className={`px-3 py-2 text-sm cursor-pointer ${darkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-100'} transition-colors`}
                      onMouseDown={() => selectResult(result)}
                    >
                      <span className="font-medium">{result.symbol}</span> - <span className={`${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{result.name}</span>
                      <span className="text-xs ml-2 px-1.5 py-0.5 rounded bg-slate-500 text-white">{result.type}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Quantity Input */}
            <div>
              <Label htmlFor="quantity" className="text-sm font-medium mb-1 block">Quantity</Label>
              <Input
                id="quantity" name="quantity" type="number" placeholder="e.g., 10 or 0.5"
                value={form.quantity} onChange={handleChange} step="any"
                className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}
              />
            </div>

            {/* Price Input */}
            <div>
              <Label htmlFor="price" className="text-sm font-medium mb-1 block">Purchase Price (per unit)</Label>
              <Input
                id="price" name="price" type="number"
                placeholder={selectedResult?.price ? `Current ~ $${selectedResult.price}` : "e.g., 150.75"}
                value={form.price} onChange={handleChange} step="any"
                className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={addPosition} className={`w-full gap-2 ${darkMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
              <PlusCircle className="h-4 w-4" /> Add Position
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Positions List */}
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        className="lg:col-span-2"
      >
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Current Holdings</CardTitle>
            <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-sm`}>
              Total Value: ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {positions.length > 0 ? positions.map(p => (
                <motion.div
                  key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                  className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}
                >
                  <div className="flex items-center gap-3 flex-grow mr-2 overflow-hidden">
                    <img
                      src={p.logoUrl} alt={`${p.name} logo`} className="w-8 h-8 rounded-full bg-slate-500 flex-shrink-0 object-contain"
                      onError={(e) => { 
                        e.target.onerror = null; 
                        e.target.src = `https://ui-avatars.com/api/?name=${p.symbol}&background=random&color=fff&size=64`; 
                      }}
                    />
                    <div className="flex-grow overflow-hidden">
                      <p className={`font-medium text-sm truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{p.symbol}</p>
                      <p className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{p.name}</p>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {p.quantity} @ ${p.currentPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: p.currentPrice > 1 ? 2 : 6 }) || 'N/A'}
                        <span className="ml-2 text-slate-500">(Cost: ${p.price.toLocaleString()})</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2 w-28">
                    <p className={`font-medium text-sm ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                      ${p.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-xs ${p.change >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                      {p.change >= 0 ? '+' : ''}{p.change?.toFixed(1) ?? '0.0'}%
                    </p>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 mt-1 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                      onClick={() => deletePosition(p.id)}
                    > <Trash2 className="h-3.5 w-3.5" /> </Button>
                  </div>
                </motion.div>
              )) : ( <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-center py-4`}>No positions added yet.</p> )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}