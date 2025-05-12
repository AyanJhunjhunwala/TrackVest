import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ArrowRight, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  getStockLogo, 
  getCryptoLogo, 
  debounce, 
  getApiDate, 
  fetchDailyMarketData 
} from "../hooks";

// Polygon.io API key
const POLYGON_API_KEY = "9h2tWR97GWuVzS5a27bqgC4JjhC3H1uv";

export default function SearchBar({ 
  darkMode, 
  onSelect, 
  assetType = "stocks", 
  apiKey, // We're not using this parameter anymore since we have the Polygon API key
  placeholder = "Search for assets..."
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // Effect to update dropdown visibility when results change
  useEffect(() => {
    if (results.length > 0) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [results]);
  
  // Handle clicks outside of dropdown to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  // Search implementation with Polygon.io
  const performSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (assetType === "stocks") {
        await searchStocks();
      } else {
        await searchCrypto();
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(`Search failed: ${err.message}`);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Stock search with Polygon.io
  const searchStocks = async () => {
    try {
      // Call our server proxy instead of Polygon directly
      const response = await fetch(`/api/polygon/search?query=${encodeURIComponent(query)}&apiKey=${POLYGON_API_KEY}`);
      console.log("Polygon stock search response:", response);
      
      if (!response.ok) {
        throw new Error(`Network error (${response.status}): ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Polygon stock search response data:", data);
      
      if (data.results && data.results.length > 0) {
        const processedResults = data.results.map(stock => ({
          symbol: stock.ticker,
          name: stock.name,
          price: "0.00", // We'll fetch this from the quote endpoint
          type: "Equity",
          region: "United States",
          sector: stock.sic_description || "",
          logoUrl: getStockLogo(stock.ticker)
        }));
        
        try {
          // Fetch current prices for the stocks
          const stocksWithPrices = await fetchStockPrices(processedResults);
          console.log("Stocks with prices:", stocksWithPrices);
          setResults(stocksWithPrices);
        } catch (priceError) {
          console.error("Error fetching stock prices:", priceError);
          
          // Check if it's a market closure error
          if (priceError.message && (
            priceError.message.includes("holiday") || 
            priceError.message.includes("weekend") ||
            priceError.message.includes("closed")
          )) {
            // Still show the stocks but with a warning about prices
            setResults(processedResults);
            setError(`Note: Current stock prices unavailable. ${priceError.message}`);
          } else {
            // For other errors, just show the stocks without prices
            setResults(processedResults);
            setError("Unable to fetch current prices. Using placeholder values.");
          }
        }
      } else {
        setError("No stocks found matching your search");
        setResults([]);
      }
    } catch (error) {
      console.error("Stock search error:", error);
      setError(`Error searching stocks: ${error.message}`);
      setResults([]);
    }
  };
  
  // Fetch current prices for stocks using Polygon.io
  const fetchStockPrices = async (stocks) => {
    const stocksWithPrices = [...stocks];
    
    try {
      // For demo purposes, fetch the first 5 stocks to avoid hitting rate limits
      const stocksToFetch = stocks.slice(0, 5);
      
      // Get market data from the grouped endpoint (uses cache if available)
      const marketData = await fetchDailyMarketData(POLYGON_API_KEY);
      const date = getApiDate();
      
      // Update prices from cache first
      stocksToFetch.forEach(stock => {
        const upperSymbol = stock.symbol.toUpperCase();
        if (marketData.stocks[upperSymbol]) {
          const stockIndex = stocksWithPrices.findIndex(s => s.symbol.toUpperCase() === upperSymbol);
          if (stockIndex !== -1) {
            stocksWithPrices[stockIndex].price = marketData.stocks[upperSymbol].close.toString();
            console.log(`Using cached price for ${upperSymbol}: ${stocksWithPrices[stockIndex].price}`);
          }
        }
      });
      
      // Check which stocks we didn't find in the cache
      const missingStocks = stocksToFetch.filter(
        stock => !marketData.stocks[stock.symbol.toUpperCase()]
      );
      
      // Only fetch individual prices for stocks not in cache
      if (missingStocks.length > 0) {
        console.log(`Fetching prices for ${missingStocks.length} missing stocks`);
        
        const pricePromises = missingStocks.map(async (stock, index) => {
          try {
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, index * 100));
            
            const response = await fetch(`/api/polygon/open-close?symbol=${stock.symbol}&date=${date}&apiKey=${POLYGON_API_KEY}`);
            
            if (!response.ok) {
              return null;
            }
            
            const data = await response.json();
            console.log(`Price data for ${stock.symbol}:`, data);
            
            if (data.status === "OK") {
              // Add to the market data cache for future use
              marketData.stocks[stock.symbol.toUpperCase()] = {
                symbol: stock.symbol.toUpperCase(),
                close: data.close,
                open: data.open,
                high: data.high,
                low: data.low
              };
              
              return {
                symbol: stock.symbol,
                price: data.close.toString()
              };
            }
            return null;
          } catch (e) {
            console.error(`Error fetching price for ${stock.symbol}:`, e);
            return null;
          }
        });
        
        const priceResults = await Promise.all(pricePromises);
        
        // Update stock prices
        priceResults.forEach(priceData => {
          if (priceData) {
            const stockIndex = stocksWithPrices.findIndex(s => s.symbol === priceData.symbol);
            if (stockIndex !== -1) {
              stocksWithPrices[stockIndex].price = priceData.price;
            }
          }
        });
      }
    } catch (error) {
      console.error("Error fetching stock prices:", error);
    }
    
    return stocksWithPrices;
  };
  
  // Crypto search with Polygon.io
  const searchCrypto = async () => {
    try {
      // Call our server proxy instead of Polygon directly
      const response = await fetch(`/api/polygon/search?query=${encodeURIComponent(query)}&market=crypto&apiKey=${POLYGON_API_KEY}`);
      
      if (!response.ok) {
        throw new Error(`Network error (${response.status}): ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Polygon crypto search response:", data);
      
      if (data.results && data.results.length > 0) {
        const processedResults = data.results.map(crypto => ({
          symbol: crypto.ticker.replace('X:', '').split('-')[0], // Format: X:BTC-USD -> BTC
          name: crypto.name,
          price: "0.00", // We'll fetch this from the quote endpoint
          type: "Cryptocurrency",
          region: "Global",
          logoUrl: getCryptoLogo(crypto.ticker.replace('X:', '').split('-')[0])
        }));
        
        try {
          // Fetch current prices for the cryptos
          const cryptosWithPrices = await fetchCryptoPrices(processedResults);
          console.log("Cryptos with prices:", cryptosWithPrices);
          setResults(cryptosWithPrices);
        } catch (priceError) {
          console.error("Error fetching crypto prices:", priceError);
          // Crypto markets are 24/7, but still handle any errors gracefully
          setResults(processedResults);
          setError("Unable to fetch current crypto prices. Using placeholder values.");
        }
      } else {
        setError("No cryptocurrencies found matching your search");
        setResults([]);
      }
    } catch (error) {
      console.error("Crypto search error:", error);
      setError(`Error searching cryptocurrencies: ${error.message}`);
      setResults([]);
    }
  };
  
  // Fetch current prices for cryptocurrencies using Polygon.io
  const fetchCryptoPrices = async (cryptos) => {
    const cryptosWithPrices = [...cryptos];
    
    try {
      // For demo purposes, fetch the first 5 cryptos to avoid hitting rate limits
      const cryptosToFetch = cryptos.slice(0, 5);
      
      // Get market data (updates the cache if not already populated)
      const marketData = await fetchDailyMarketData(POLYGON_API_KEY);
      const date = getApiDate();
      
      // Check which cryptos we already have cached
      cryptosToFetch.forEach(crypto => {
        const upperSymbol = crypto.symbol.toUpperCase();
        if (marketData.crypto[upperSymbol]) {
          const cryptoIndex = cryptosWithPrices.findIndex(c => c.symbol.toUpperCase() === upperSymbol);
          if (cryptoIndex !== -1) {
            cryptosWithPrices[cryptoIndex].price = marketData.crypto[upperSymbol].close.toString();
            console.log(`Using cached price for ${upperSymbol}: ${cryptosWithPrices[cryptoIndex].price}`);
          }
        }
      });
      
      // Identify which cryptos we need to fetch
      const missingCryptos = cryptosToFetch.filter(
        crypto => !marketData.crypto[crypto.symbol.toUpperCase()]
      );
      
      // Only fetch prices for cryptos not in cache
      if (missingCryptos.length > 0) {
        console.log(`Fetching prices for ${missingCryptos.length} missing cryptos`);
        
        const pricePromises = missingCryptos.map(async (crypto, index) => {
          try {
            // Add a small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, index * 100));
            
            const ticker = `X:${crypto.symbol}USD`; // Format: X:BTCUSD
            const response = await fetch(`/api/polygon/open-close?symbol=${ticker}&date=${date}&apiKey=${POLYGON_API_KEY}`);
            
            if (!response.ok) {
              return null;
            }
            
            const data = await response.json();
            console.log(`Price data for ${crypto.symbol}:`, data);
            
            if (data.status === "OK") {
              // Add to the market data cache for future use
              marketData.crypto[crypto.symbol.toUpperCase()] = {
                symbol: crypto.symbol.toUpperCase(),
                close: data.close,
                open: data.open,
                high: data.high,
                low: data.low
              };
              
              return {
                symbol: crypto.symbol,
                price: data.close.toString()
              };
            }
            return null;
          } catch (e) {
            console.error(`Error fetching price for ${crypto.symbol}:`, e);
            return null;
          }
        });
        
        const priceResults = await Promise.all(pricePromises);
        
        // Update crypto prices
        priceResults.forEach(priceData => {
          if (priceData) {
            const cryptoIndex = cryptosWithPrices.findIndex(c => c.symbol === priceData.symbol);
            if (cryptoIndex !== -1) {
              cryptosWithPrices[cryptoIndex].price = priceData.price;
            }
          }
        });
      }
    } catch (error) {
      console.error("Error fetching crypto prices:", error);
    }
    
    return cryptosWithPrices;
  };
  
  // Handle selection
  const handleSelect = (item) => {
    console.log("Selected item:", item);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    
    if (onSelect) {
      onSelect(item);
    }
  };
  
  // Clear search
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setError('');
    setShowDropdown(false);
  };
  
  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
  };
  
  // Add explicit search button handler
  const handleSearchClick = () => {
    if (query.trim()) {
      setError('');
      performSearch();
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  };
  
  // Get search results for display
  const getDisplayResults = () => {
    if (results.length === 0) {
      if (query.trim() && !loading) {
        return [{ symbol: '404', name: 'No results found', isPlaceholder: true }];
      }
      return [];
    }
    return results;
  };
  
  // Log current state
  console.log("SearchBar state:", { 
    resultsCount: results.length, 
    query, 
    showDropdown,
    searchComponent: inputRef.current ? true : false
  });
  
  return (
    <div className="relative w-full">
      {/* Search input */}
      <div className="relative" ref={inputRef}>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className={`h-4 w-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
        </div>
        <div className="flex">
          <Input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            className={`pl-10 py-2 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} rounded-r-none`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearchClick();
              }
            }}
          />
          <Button
            type="button"
            onClick={handleSearchClick}
            className={`px-4 rounded-l-none ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'} text-slate-700 dark:text-slate-200`}
          >
            Search
          </Button>
        </div>
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-12 top-1/2 transform -translate-y-1/2"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        
        {loading && (
          <div className="absolute right-16 top-1/2 transform -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          </div>
        )}
      </div>
      
      {/* Empty state helper message */}
      {!query && !loading && !error && !results.length && (
        <div className={`mt-1 text-xs text-center p-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Type to search for {assetType === "stocks" ? "stocks" : "cryptocurrencies"} by name or symbol
        </div>
      )}
      
      {/* Error message */}
      {error && query && !loading && results.length === 0 && (
        <div className={`mt-1 text-sm text-center p-2 rounded ${darkMode ? 'text-red-400 bg-red-900/20' : 'text-red-600 bg-red-50'}`}>
          {error}
        </div>
      )}
      
      {/* Dropdown results - simpler absolute positioning */}
      {showDropdown && getDisplayResults().length > 0 && (
        <div 
          ref={dropdownRef}
          className={`absolute left-0 right-0 mt-1 overflow-hidden rounded-md border ${
            darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
          } shadow-lg z-[100]`}
          style={{ maxHeight: '400px', overflowY: 'auto' }}
        >
          <div className={`p-2 ${darkMode ? 'bg-blue-900/30 border-b border-slate-700' : 'bg-blue-50 border-b border-slate-200'}`}>
            <div className="flex justify-between items-center">
              <span className={`text-xs font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                Search Results ({getDisplayResults().length})
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                className={`h-6 w-6 p-0 ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                onClick={() => setShowDropdown(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div>
            {getDisplayResults().map((item, index) => (
              item.isPlaceholder ? (
                <div 
                  key="no-results" 
                  className={`p-3 text-center ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  No results found for "{query}"
                </div>
              ) : (
                <div 
                  key={`${item.symbol}-${index}`}
                  className={`p-3 flex items-center border-b ${
                    darkMode 
                      ? 'border-slate-700 hover:bg-slate-700/50' 
                      : 'border-slate-100 hover:bg-slate-50'
                  } cursor-pointer`}
                  onClick={() => handleSelect(item)}
                >
                  <div className="h-8 w-8 mr-3 flex-shrink-0">
                    <img 
                      src={item.logoUrl} 
                      alt={item.symbol}
                      className="h-full w-full object-contain rounded-full"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${item.symbol}&background=random&color=fff&size=48`;
                      }}
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between">
                      <div className={`font-medium truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {item.symbol} 
                        <span className={`text-xs ml-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {item.sector || item.region}
                        </span>
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {item.price && item.price !== "0.00" ? `$${parseFloat(item.price).toLocaleString()}` : ''}
                      </div>
                    </div>
                    <div className={`text-xs truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {item.name}
                    </div>
                  </div>
                  <ArrowRight className={`h-4 w-4 ml-2 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                </div>
              )
            ))}
          </div>
        </div>
      )}
      
      {/* Force show button as a fallback */}
      {query && results.length > 0 && !showDropdown && (
        <button 
          onClick={() => setShowDropdown(true)}
          className={`mt-2 p-1 text-xs font-bold w-full rounded ${
            darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'
          }`}
        >
          Show search results ({results.length})
        </button>
      )}
    </div>
  );
} 