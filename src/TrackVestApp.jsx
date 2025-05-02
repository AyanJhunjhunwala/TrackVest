import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  PlusCircle,
  Trash2,
  BarChart4,
  TrendingUp,
  RefreshCcw,
  Settings,
  AlertCircle,
  DollarSign,
  // Bitcoin, // Can be removed if not used elsewhere
  Wallet,
  Search,
  // ArrowRight, // Can be removed if not used elsewhere
  Info,
  // ChevronDown, // Can be removed if not used elsewhere
  Home,
  Building2,
  LineChart,
  Activity,
  Database,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2 // Added for loading states
} from "lucide-react";
import { PieChart, Pie, Cell, LineChart as RechartsLineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ScatterChart, Scatter, ZAxis } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// Debounce utility function (remains the same)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export default function App() {
  // State for API key
  const [apiKey, setApiKey] = useState("");
  const [showApiInput, setShowApiInput] = useState(false);
  const [apiError, setApiError] = useState(""); // General API error
  const [refreshApiError, setRefreshApiError] = useState(""); // Specific error during refresh


  // Reference states

  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // Asset type (for add form)
  // const [assetType, setAssetType] = useState("stocks"); // This seems handled within the 'form' state now

  // State for holdings (remains the same)
  const [positions, setPositions] = useState([
    { id: 1, symbol: "AAPL", name: "Apple Inc.", quantity: 15, price: 190.50, shares: 15, value: 2857.50, change: 2.3, assetType: "stocks", logoUrl: "https://logo.clearbit.com/apple.com" },
    { id: 2, symbol: "MSFT", name: "Microsoft Corp.", quantity: 10, price: 325.00, shares: 10, value: 3250.00, change: 1.7, assetType: "stocks", logoUrl: "https://logo.clearbit.com/microsoft.com" },
    { id: 3, symbol: "GOOGL", name: "Alphabet Inc.", quantity: 8, price: 140.20, shares: 8, value: 1121.60, change: -0.5, assetType: "stocks", logoUrl: "https://logo.clearbit.com/google.com" },
    { id: 4, symbol: "BTC", name: "Bitcoin", quantity: 0.5, price: 49800.00, shares: 0.5, value: 24900.00, change: 5.2, assetType: "crypto", logoUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.png" },
    { id: 5, symbol: "ETH", name: "Ethereum", quantity: 2.3, price: 2350.00, shares: 2.3, value: 5405.00, change: 3.8, assetType: "crypto", logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png" }
  ]);

  // State for real estate holdings (remains the same)
  const [realEstateHoldings, setRealEstateHoldings] = useState([
    { id: 1, address: "123 Main St, Austin, TX", type: "Residential", purchasePrice: 450000, currentValue: 520000, annualRent: 36000, roi: 8.0, mortgage: 320000, yearPurchased: 2019 },
    { id: 2, address: "456 Oak Ave, Denver, CO", type: "Multi-family", purchasePrice: 750000, currentValue: 890000, annualRent: 72000, roi: 9.6, mortgage: 600000, yearPurchased: 2018 },
    { id: 3, address: "789 Market Blvd, Seattle, WA", type: "Commercial", purchasePrice: 1200000, currentValue: 1350000, annualRent: 120000, roi: 10.0, mortgage: 900000, yearPurchased: 2021 }
  ]);

  // Real estate form state
  const [realEstateForm, setRealEstateForm] = useState({
    address: "", type: "Residential", purchasePrice: "", currentValue: "",
    annualRent: "", mortgage: "", yearPurchased: new Date().getFullYear()
  });
  const [isFetchingEstimate, setIsFetchingEstimate] = useState(false); // Zillow simulation loading state
  const [estimateError, setEstimateError] = useState(""); // Zillow simulation error state

  // Form state for adding stocks/crypto
  const [form, setForm] = useState({ symbol: "", quantity: "", price: "", assetType: "stocks" });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false); // For symbol search input focus/results display
  const [isSearchLoading, setIsSearchLoading] = useState(false); // Loading indicator during symbol search API call
  const [selectedResult, setSelectedResult] = useState(null);

  // General Loading state (for refresh)
  const [isLoading, setIsLoading] = useState(false);

  // Performance data state (remains the same)
  const [performanceData, setPerformanceData] = useState([
    { month: 'Jan', value: 42000 }, { month: 'Feb', value: 44000 }, { month: 'Mar', value: 46500 },
    { month: 'Apr', value: 45800 }, { month: 'May', value: 47200 }, { month: 'Jun', value: 48300 },
    { month: 'Jul', value: 47900 }, { month: 'Aug', value: 49700 }, { month: 'Sep', value: 52000 },
    { month: 'Oct', value: 54500 }, { month: 'Nov', value: 57200 }, { month: 'Dec', value: 60000 }
  ]);

  // Risk data (remains the same)
  const [riskData, setRiskData] = useState([
    { name: 'AAPL', risk: 12, return: 15 }, { name: 'MSFT', risk: 10, return: 12 },
    { name: 'GOOGL', risk: 15, return: 17 }, { name: 'BTC', risk: 28, return: 32 },
    { name: 'ETH', risk: 25, return: 30 },
  ]);

  // Asset allocation data (remains the same)
  const [assetAllocation, setAssetAllocation] = useState([
    { name: "Technology", value: 38, color: "#10b981" }, { name: "Crypto", value: 27, color: "#8b5cf6" },
    { name: "Healthcare", value: 12, color: "#3b82f6" }, { name: "Consumer", value: 15, color: "#f59e0b" },
    { name: "Energy", value: 8, color: "#ec4899" }
  ]);

  // Carbon intensity data (remains the same)
  const [carbonData, setCarbonData] = useState([
    { name: "AAPL", score: 3.2 }, { name: "MSFT", score: 2.8 }, { name: "GOOGL", score: 4.1 },
    { name: "BTC", score: 8.9 }, { name: "ETH", score: 7.2 }
  ]);

  // Quantitative insights data (remains the same)
  const [correlationData, setCorrelationData] = useState([
    { name: "AAPL vs. SPY", value: 0.72 }, { name: "MSFT vs. SPY", value: 0.81 },
    { name: "GOOGL vs. SPY", value: 0.76 }, { name: "BTC vs. SPY", value: 0.23 },
    { name: "ETH vs. SPY", value: 0.18 }
  ]);
  const [sharpeRatios, setSharpeRatios] = useState([
    { name: "AAPL", value: 1.3 }, { name: "MSFT", value: 1.5 }, { name: "GOOGL", value: 1.2 },
    { name: "BTC", value: 2.1 }, { name: "ETH", value: 1.8 }
  ]);
  const [volatilityData, setVolatilityData] = useState([
    { name: "Jan", market: 12, portfolio: 10 }, { name: "Feb", market: 14, portfolio: 11 },
    { name: "Mar", market: 18, portfolio: 15 }, { name: "Apr", market: 16, portfolio: 13 },
    { name: "May", market: 15, portfolio: 12 }, { name: "Jun", market: 17, portfolio: 14 },
    { name: "Jul", market: 20, portfolio: 16 }, { name: "Aug", market: 22, portfolio: 18 },
    { name: "Sep", market: 19, portfolio: 15 }, { name: "Oct", market: 16, portfolio: 13 },
    { name: "Nov", market: 14, portfolio: 12 }, { name: "Dec", market: 13, portfolio: 11 }
  ]);

  // API management state (remains the same)
  const [apiKeys, setApiKeys] = useState([
    { id: 1, name: "Alpha Vantage", key: "DEMO12345", service: "Stock/Crypto Data", status: "Active", created: "2023-11-05", visible: false },
    { id: 2, name: "Real Estate API (Simulated)", key: "RE98765DEMO", service: "Property Valuations", status: "Active", created: "2024-01-22", visible: false },
    // { id: 3, name: "Crypto Service", key: "CRYPTO789DEMO", service: "Cryptocurrency data", status: "Inactive", created: "2023-09-15", visible: false } // Example inactive key
  ]);
  const [newApiKey, setNewApiKey] = useState({ name: "", service: "" });


  // --- Effects ---

  // Effect to set document title and favicon
  useEffect(() => {
    document.title = "TrackVest - Portfolio Tracker";

    // Standard way to set favicon is in public/index.html:
    // <link rel="icon" type="image/png" href="/trackvest.png" />
    // Assuming trackvest.png is in the public folder.
    // Dynamically setting it here might work depending on the setup,
    // but the path '/src/trackvest.png' is unusual for public assets.
    // Using requested path, ensure the build process handles this or move to public folder.
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }
    // IMPORTANT: Verify this path works with your project structure/build tool.
    // If '/src/...' doesn't work, try '/trackvest.png' assuming it's in public/.
    link.href = '/src/trackvest.png';
    link.type = 'image/png';

  }, []); // Runs once on mount


  // --- Calculations ---

  const totalValue = positions.reduce((acc, p) => acc + p.value, 0);
  const totalChange = positions.reduce((acc, p) => acc + (p.quantity * p.price * (p.change / 100)), 0); // Calculate change based on current value and %
  const changePercentage = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0; // % change based on previous value

  const totalRealEstateValue = realEstateHoldings.reduce((acc, prop) => acc + prop.currentValue, 0);
  const totalRealEstateEquity = realEstateHoldings.reduce((acc, prop) => acc + (prop.currentValue - (prop.mortgage || 0)), 0);
  const totalAnnualRent = realEstateHoldings.reduce((acc, prop) => acc + (prop.annualRent || 0), 0);
  const avgRealEstateROI = realEstateHoldings.length > 0 ?
    realEstateHoldings.reduce((acc, prop) => acc + prop.roi, 0) / realEstateHoldings.length : 0;


  // --- Event Handlers & Functions ---

  // Save API Key
  const saveApiKey = () => {
    setShowApiInput(false);
    setApiError(""); // Clear error on save
    console.log("API Key saved (Note: Still not stored securely in this demo)");
    // Optionally: Add a success notification here
  };

  // Handle asset add form changes
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (e.target.name === 'symbol') {
      setSelectedResult(null);
      setSearchResults([]);
      setApiError(""); // Clear previous search errors
      if(e.target.value.trim() !== "") {
          setIsSearching(true); // Keep search active while typing non-empty string
          debouncedSearch(); // Trigger debounced search
      } else {
          setIsSearching(false); // Hide results if input is empty
      }
    }
  };

  // Handle real estate form changes
  const handleRealEstateChange = (e) => {
    setRealEstateForm({ ...realEstateForm, [e.target.name]: e.target.value });
    setEstimateError(""); // Clear simulation error on input change
  };

  // Handle real estate type change
  const handleRealEstateTypeChange = (value) => {
    setRealEstateForm({ ...realEstateForm, type: value });
  };

  // Simulate fetching property estimate (Zillow-esque)
  const fetchPropertyEstimate = () => {
      if (!realEstateForm.address) {
          setEstimateError("Please enter a property address first.");
          return;
      }
      setIsFetchingEstimate(true);
      setEstimateError("");

      console.log("Simulating Zillow API call for:", realEstateForm.address);

      setTimeout(() => {
          try {
              // Simulate value based on address length and purchase price (very basic)
              const baseValue = Number(realEstateForm.purchasePrice) || 500000; // Use purchase price or a default
              const randomFactor = 1 + (Math.random() * 0.4 - 0.1); // -10% to +30% adjustment
              const simulatedValue = Math.round((baseValue * randomFactor) / 1000) * 1000; // Round to nearest thousand

              // Simulate rent based on value (e.g., 0.5% - 1% of value per month)
              const rentFactor = (Math.random() * 0.005) + 0.005; // 0.005 to 0.01
              const simulatedAnnualRent = Math.round((simulatedValue * rentFactor * 12) / 100) * 100; // Round to nearest hundred

              setRealEstateForm(prevForm => ({
                  ...prevForm,
                  currentValue: simulatedValue.toString(),
                  annualRent: simulatedAnnualRent.toString()
              }));
              console.log("Simulated estimates:", { value: simulatedValue, rent: simulatedAnnualRent });
          } catch (error) {
              console.error("Estimate simulation error:", error);
              setEstimateError("Failed to simulate property estimate.");
          } finally {
              setIsFetchingEstimate(false);
          }
      }, 1500); // Simulate network delay
  };


  // Add real estate property
  const addRealEstateProperty = () => {
    if (!realEstateForm.address || !realEstateForm.purchasePrice || !realEstateForm.currentValue) {
        alert("Please fill in Address, Purchase Price, and Current Value.");
        return;
    }

    const purchasePrice = Number(realEstateForm.purchasePrice);
    const currentValue = Number(realEstateForm.currentValue);
    const annualRent = Number(realEstateForm.annualRent || 0);
    const mortgage = Number(realEstateForm.mortgage || 0);
    const yearPurchased = Number(realEstateForm.yearPurchased);

    // Simple ROI: (Annual Rent / Purchase Price) * 100
    const roi = purchasePrice > 0 ? (annualRent / purchasePrice) * 100 : 0;

    const newProperty = {
      id: Date.now(), address: realEstateForm.address, type: realEstateForm.type,
      purchasePrice, currentValue, annualRent, mortgage, yearPurchased,
      roi: parseFloat(roi.toFixed(1))
    };

    setRealEstateHoldings([...realEstateHoldings, newProperty]);
    // Reset form
    setRealEstateForm({
      address: "", type: "Residential", purchasePrice: "", currentValue: "",
      annualRent: "", mortgage: "", yearPurchased: new Date().getFullYear()
    });
    setEstimateError(""); // Clear any simulation errors
  };

  // Delete real estate property
  const deleteRealEstateProperty = (id) => {
    setRealEstateHoldings(realEstateHoldings.filter(p => p.id !== id));
  };

  // Add new API key (simulated)
  const addNewApiKey = () => {
    if (!newApiKey.name || !newApiKey.service) return;
    const key = 'FAKEKEY_' + Math.random().toString(36).substring(2, 15).toUpperCase();
    const newKey = {
      id: Date.now(), name: newApiKey.name, key: key, service: newApiKey.service,
      status: "Active", created: new Date().toISOString().split('T')[0], visible: false
    };
    setApiKeys([...apiKeys, newKey]);
    setNewApiKey({ name: "", service: "" });
  };

  // Delete API key
  const deleteApiKey = (id) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));
  };

  // Toggle API key status
  const toggleApiKeyStatus = (id) => {
    setApiKeys(apiKeys.map(key =>
      key.id === id ? { ...key, status: key.status === "Active" ? "Inactive" : "Active" } : key
    ));
  };

  // Toggle API key visibility
  const toggleApiKeyVisibility = (id) => {
    setApiKeys(apiKeys.map(key =>
      key.id === id ? { ...key, visible: !key.visible } : key
    ));
  };

  // Handle asset type change in the add form
  const handleAssetTypeChange = (value) => {
    setForm({ symbol: "", quantity: "", price: "", assetType: value });
    setSearchResults([]);
    setSelectedResult(null);
    setIsSearching(false);
    setApiError("");
  };

  // --- Alpha Vantage API Functions ---

  // Fetch latest stock price
  const fetchStockPrice = async (symbol) => {
    if (!apiKey) throw new Error("API key not set.");
  
    const url =
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const data = await (await fetch(url)).json();
  
    if (data.Note?.includes("call frequency"))  throw new Error("API rate limit");
    if (data["Error Message"])                  throw new Error(data["Error Message"]);
    const price = data?.["Global Quote"]?.["05. price"];
    if (!price)                                throw new Error("No price data");
  
    return +price;
  };
  // Fetch latest crypto price (BTC/ETH to USD)
  const fetchCryptoPrice = async (symbol) => {
      if (!apiKey) throw new Error("API key not set.");
      // Use CURRENCY_EXCHANGE_RATE for crypto
      const endpoint = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${apiKey}`;
      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.Note && data.Note.includes("call frequency")) throw new Error("API rate limit reached.");
      if (data["Error Message"]) throw new Error(`API Error: ${data["Error Message"]}`);
      const rateInfo = data["Realtime Currency Exchange Rate"];
      if (!rateInfo || !rateInfo["5. Exchange Rate"]) throw new Error(`No price data for ${symbol}`);

      return parseFloat(rateInfo["5. Exchange Rate"]);
  };


  // Search for symbol using Alpha Vantage (Stocks) or Simulation (Crypto)
  const searchSymbol = async () => {
    if (!form.symbol) return;

    // Check for API key only if searching for stocks
    if (form.assetType === 'stocks' && !apiKey) {
      setApiError("Please enter an AlphaVantage API key first in Settings");
      setSearchResults([]);
      return;
    }

    setIsSearching(true); // Keep results dropdown potentially open
    setIsSearchLoading(true); // Show loading indicator
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
                 simulateStockResults(keywords); // Fallback on error
            } else if (data.bestMatches && data.bestMatches.length > 0) {
                setSearchResults(data.bestMatches.map(match => ({
                    symbol: match["1. symbol"], name: match["2. name"], type: match["3. type"],
                    region: match["4. region"], price: (Math.random() * 500 + 50).toFixed(2) // Simulate price for search results
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
    } else { // Crypto search simulation (AV has no direct crypto symbol search)
      // NOTE: Alpha Vantage does not have a dedicated endpoint for searching crypto symbols like SYMBOL_SEARCH for stocks.
      // We will continue simulating crypto search results.
      console.log("Simulating crypto search for:", keywords);
      simulateCryptoResults(keywords);
      setIsSearchLoading(false);
    }
  };

  // Debounced version of searchSymbol
  const debouncedSearch = useRef(debounce(searchSymbol, 500)).current;


  // Simulate stock results (fallback, remains the same)
  const simulateStockResults = (keyword) => {
      const stocks = [
          { symbol: "AAPL", name: "Apple Inc.", price: 190.50 }, { symbol: "MSFT", name: "Microsoft Corp.", price: 325.00 },
          { symbol: "GOOGL", name: "Alphabet Inc.", price: 140.20 }, { symbol: "AMZN", name: "Amazon.com Inc.", price: 135.80 },
          { symbol: "TSLA", name: "Tesla Inc.", price: 250.00 }, { symbol: "NVDA", name: "NVIDIA Corp.", price: 480.60 },
          { symbol: "META", name: "Meta Platforms Inc.", price: 315.40 }, { symbol: "JPM", name: "JPMorgan Chase & Co.", price: 155.20 },
          { symbol: "V", name: "Visa Inc.", price: 240.90 }, { symbol: "DIS", name: "The Walt Disney Company", price: 85.10 },
      ];
      const filtered = stocks.filter(s =>
          s.symbol.toLowerCase().includes(keyword.toLowerCase()) || s.name.toLowerCase().includes(keyword.toLowerCase())
      );
      setSearchResults(filtered.map(stock => ({ ...stock, type: "Equity", region: "United States" })));
       if (filtered.length === 0) setApiError("No simulated stock results found");
  };

  // Simulate crypto results (remains the same)
  const simulateCryptoResults = (keyword) => {
    const cryptos = [
      { symbol: "BTC", name: "Bitcoin", price: 49800 }, { symbol: "ETH", name: "Ethereum", price: 2350 },
      { symbol: "SOL", name: "Solana", price: 145 }, { symbol: "ADA", name: "Cardano", price: 0.45 },
      { symbol: "XRP", name: "Ripple", price: 0.55 }, { symbol: "DOT", name: "Polkadot", price: 7.20 },
      { symbol: "DOGE", name: "Dogecoin", price: 0.10 }, { symbol: "LINK", name: "Chainlink", price: 15.50 },
      { symbol: "MATIC", name: "Polygon", price: 0.90 }, { symbol: "LTC", name: "Litecoin", price: 75.00 }
    ];
    const filtered = cryptos.filter(c =>
      c.symbol.toLowerCase().includes(keyword.toLowerCase()) || c.name.toLowerCase().includes(keyword.toLowerCase())
    );
    setSearchResults(filtered.map(crypto => ({
      symbol: crypto.symbol, name: crypto.name, price: crypto.price.toFixed(2), type: "Cryptocurrency", region: "Global"
    })));
    if (filtered.length === 0) setApiError("No crypto results found");
  };

  // Select a search result
  const selectResult = (result) => {
    setSelectedResult(result);
    setForm({
      ...form, symbol: result.symbol,
      // Use the price from the search result if available, otherwise leave blank
      price: result.price ? result.price : ""
    });
    setSearchResults([]);
    setIsSearching(false);
    setApiError(""); // Clear search error
  };

  // Add position (remains mostly the same, logo logic updated)
  const addPosition = () => {
    if (!form.symbol || !form.quantity || !form.price) {
      alert("Please fill in Symbol, Quantity, and Purchase Price.");
      return;
    }

    let logoUrl = "";
    const upperSymbol = form.symbol.trim().toUpperCase();

    if (form.assetType === "stocks") {
        // Prioritize clearbit for known good ones, fallback to ui-avatars
        const clearbitMap = {
            "AAPL": "https://logo.clearbit.com/apple.com", "MSFT": "https://logo.clearbit.com/microsoft.com",
            "GOOGL": "https://logo.clearbit.com/google.com", "AMZN": "https://logo.clearbit.com/amazon.com",
            "TSLA": "https://logo.clearbit.com/tesla.com", "NVDA": "https://logo.clearbit.com/nvidia.com",
            "META": "https://logo.clearbit.com/meta.com",
        };
        logoUrl = clearbitMap[upperSymbol] || `https://ui-avatars.com/api/?name=${upperSymbol}&background=random&color=fff&size=64`;
    } else { // Crypto
        const cryptoLogos = {
            "BTC": "https://cryptologos.cc/logos/bitcoin-btc-logo.png", "ETH": "https://cryptologos.cc/logos/ethereum-eth-logo.png",
            "SOL": "https://cryptologos.cc/logos/solana-sol-logo.png", "ADA": "https://cryptologos.cc/logos/cardano-ada-logo.png",
            "XRP": "https://cryptologos.cc/logos/xrp-xrp-logo.png", "DOT": "https://cryptologos.cc/logos/polkadot-new-dot-logo.png",
            "DOGE": "https://cryptologos.cc/logos/dogecoin-doge-logo.png", "LINK": "https://cryptologos.cc/logos/chainlink-link-logo.png",
            "MATIC": "https://cryptologos.cc/logos/polygon-matic-logo.png", "LTC": "https://cryptologos.cc/logos/litecoin-ltc-logo.png"
        };
        logoUrl = cryptoLogos[upperSymbol] || `https://ui-avatars.com/api/?name=${upperSymbol}&background=random&color=fff&size=64`;
    }

    const newPosition = {
      id: Date.now(), symbol: upperSymbol, name: selectedResult ? selectedResult.name : upperSymbol,
      quantity: Number(form.quantity), price: Number(form.price), // This is purchase price
      currentPrice: Number(form.price), // Initialize currentPrice to purchase price
      value: Number(form.quantity) * Number(form.price),
      change: 0, // Initial change is 0
      assetType: form.assetType, logoUrl: logoUrl
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

  // Update charts data when positions change (remains the same)
  const updateChartsData = (updatedPositions) => {
    // Risk data (adjust based on asset type)
    const newRiskData = updatedPositions.map(p => ({
      name: p.symbol,
      risk: parseFloat((Math.random() * (p.assetType === 'crypto' ? 30 : 15) + 5).toFixed(1)),
      return: parseFloat((Math.random() * (p.assetType === 'crypto' ? 40 : 20) + 8).toFixed(1))
    }));
    setRiskData(newRiskData);

    // Carbon data (adjust based on asset type)
    const newCarbonData = updatedPositions.map(p => ({
      name: p.symbol,
      score: parseFloat((Math.random() * (p.assetType === 'crypto' ? 12 : 6)).toFixed(1))
    }));
    setCarbonData(newCarbonData);

    // Correlation data (adjust based on asset type)
    const newCorrelationData = updatedPositions.map(p => ({
      name: `${p.symbol} vs. SPY`,
      value: parseFloat((Math.random() * (p.assetType === 'crypto' ? 0.4 : 0.8) + 0.1).toFixed(2))
    }));
    setCorrelationData(newCorrelationData);

    // Sharpe ratios (adjust based on asset type)
    const newSharpeRatios = updatedPositions.map(p => ({
      name: p.symbol,
      value: parseFloat((Math.random() * (p.assetType === 'crypto' ? 2.5 : 1.5) + 0.5).toFixed(1))
    }));
    setSharpeRatios(newSharpeRatios);

     // Asset allocation (Simplified: Group by type/sector)
    const allocationByType = updatedPositions.reduce((acc, pos) => {
        let type = 'Other';
        if (pos.assetType === 'crypto') {
            type = 'Crypto';
        } else if (['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META'].includes(pos.symbol)) {
            type = 'Technology';
        } else if (['JPM', 'V'].includes(pos.symbol)) {
            type = 'Financials';
        } else if (['AMZN', 'DIS'].includes(pos.symbol)) {
            type = 'Consumer';
        } else {
            type = 'Other Stocks';
        }
        acc[type] = (acc[type] || 0) + pos.value;
        return acc;
    }, {});

    const totalPortfolioValue = Object.values(allocationByType).reduce((sum, val) => sum + val, 0);
    const colors = ["#10b981", "#8b5cf6", "#3b82f6", "#f59e0b", "#ec4899", "#64748b"]; // Added grey for 'Other'

    const newAllocation = Object.entries(allocationByType)
        .map(([name, value], index) => ({
            name,
            value: totalPortfolioValue > 0 ? parseFloat(((value / totalPortfolioValue) * 100).toFixed(1)) : 0,
            color: colors[index % colors.length]
        }))
        .filter(item => item.value > 0); // Remove categories with 0 value

    setAssetAllocation(newAllocation);
  };

  // Delete position
  const deletePosition = (id) => {
    const updatedPositions = positions.filter(p => p.id !== id);
    setPositions(updatedPositions);
    updateChartsData(updatedPositions); // Update charts after deletion
  };

  // Refresh position data using Alpha Vantage API or simulation
  const refreshData = async () => {
    setIsLoading(true);
    setRefreshApiError("");        // clear any previous message
  
    /* 1. If no key, fall back to simulator right away */
    if (!apiKey) {
      setRefreshApiError("AlphaVantage API key not set. Using simulated data.");
      setIsLoading(false);
      simulateRefresh();
      return;
    }
  
    /* 2. Build one array of promises, collecting any failures locally */
    const failed = [];
  
    const pricePromises = positions.map(async (p) => {
      try {
        let currentPrice;
  
        if (p.assetType === "stocks") {
          currentPrice = await fetchStockPrice(p.symbol);
        } else if (p.assetType === "crypto") {
          currentPrice = await fetchCryptoPrice(p.symbol);
        } else {
          currentPrice = p.price; // defensive fallback
        }
  
        const newValue      = p.quantity * currentPrice;
        const prevPrice     = p.currentPrice || p.price;
        const changePercent = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
  
        return {
          ...p,
          currentPrice: +currentPrice.toFixed(p.assetType === "crypto" && currentPrice < 1 ? 6 : 2),
          value:        +newValue.toFixed(2),
          change:       +changePercent.toFixed(1)
        };
      } catch (err) {
        console.warn(`Failed to fetch price for ${p.symbol}: ${err.message}. Using simulated data.`);
        failed.push(p.symbol);
  
        /* simulate this one position */
        const prevPrice      = p.currentPrice || p.price;
        const changePercent  = Math.random() * 8 - 2;            // –2 % .. +6 %
        const simulatedPrice = prevPrice * (1 + changePercent / 100);
        const newValue       = p.quantity * simulatedPrice;
        const simChangePct   = prevPrice > 0 ? ((simulatedPrice - prevPrice) / prevPrice) * 100 : 0;
  
        return {
          ...p,
          currentPrice: +simulatedPrice.toFixed(p.assetType === "crypto" && simulatedPrice < 1 ? 6 : 2),
          value:        +newValue.toFixed(2),
          change:       +simChangePct.toFixed(1)
        };
      }
    });
  
    /* 3. Wait for everything, then update state once */
    const updatedPositions = await Promise.all(pricePromises);
    setPositions(updatedPositions);
    updateChartsData(updatedPositions);
  
    /* --- optional performance‑chart bump (same as before) --- */
    try {
      const lastValue     = performanceData[performanceData.length - 1].value;
      const newTotalValue = updatedPositions.reduce((s, p) => s + p.value, 0) + totalRealEstateEquity;
      const newValue      =
        Math.abs(newTotalValue - lastValue) > lastValue * 0.001
          ? newTotalValue
          : lastValue * (1 + (Math.random() * 0.01 - 0.005));
  
      setPerformanceData([...performanceData.slice(-11), { month: "Now", value: Math.round(newValue) }]);
    } catch (e) {
      console.error("Error updating performance chart data:", e);
    }
  
    /* 4. Surface any failures in one message */
    if (failed.length) {
      setRefreshApiError(`Failed: ${failed.join(", ")}. Using simulated prices for these.`);
      setTimeout(() => setRefreshApiError(""), 10000); // auto‑clear after 10 s
    }
  
    setIsLoading(false);
  };

  // Simulation function (used as fallback)
  const simulateRefresh = () => {
       console.log("Running simulated refresh...");
       setTimeout(() => {
           const updatedPositions = positions.map(p => {
               const changePercent = (Math.random() * 8 - 2); // Change between -2% and +6%
               const previousPrice = p.currentPrice || p.price; // Use last known current price or purchase price
               const newPrice = previousPrice * (1 + changePercent / 100);
               const newValue = p.quantity * newPrice;
               const simulatedChangePercent = previousPrice > 0 ? ((newPrice - previousPrice) / previousPrice) * 100 : 0;


               return {
                   ...p,
                   price: p.price, // Keep original purchase price
                   currentPrice: parseFloat(newPrice.toFixed(p.assetType === 'crypto' && newPrice < 1 ? 6 : 2)),
                   value: parseFloat(newValue.toFixed(2)),
                   change: parseFloat(simulatedChangePercent.toFixed(1))
               };
           });

           setPositions(updatedPositions);
           updateChartsData(updatedPositions);

            // Simulate performance data update
            try {
                const lastValue = performanceData[performanceData.length - 1].value;
                const newTotalValue = updatedPositions.reduce((sum, p) => sum + p.value, 0) + totalRealEstateEquity;
                const newValue = Math.abs(newTotalValue - lastValue) > lastValue * 0.001
                               ? newTotalValue
                               : lastValue * (1 + (Math.random() * 0.01 - 0.005));
                const newPerformanceData = [...performanceData.slice(-11), { month: 'Now', value: Math.round(newValue) }];
                setPerformanceData(newPerformanceData);
            } catch (e) { console.error("Error updating performance chart data:", e)}


           setIsLoading(false);
       }, 1000); // Shorter delay for simulation
   };


  // --- UI Components ---

  // Logo component (PRO removed)
  const Logo = () => (
    <div className="flex items-center gap-2">
      {/* Ensure '/src/trackvest.png' path is correct for your setup, or move to public/ */}
      <img src="/src/trackvest.png" alt="TrackVest Logo" className="w-8 h-8" onError={(e) => { e.target.style.display = 'none'; }} />
      <span className="text-xl sm:text-2xl font-bold tracking-tighter">TrackVest</span>
      {/* PRO Badge Removed */}
      {/* <span className={`bg-gradient-to-r from-emerald-500 to-teal-600 text-xs px-2 py-0.5 rounded-full font-bold text-white ${darkMode ? 'opacity-90' : 'opacity-100'}`}>PRO</span> */}
    </div>
  );

  // Custom Tooltip for Pie Chart (remains the same)
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`${darkMode ? 'bg-slate-700' : 'bg-white'} p-2 border ${darkMode ? 'border-slate-600' : 'border-slate-300'} rounded shadow-lg text-sm`}>
          <p className="font-bold">{`${payload[0].name}: ${payload[0].value}%`}</p>
        </div>
      );
    }
    return null;
  };

   // Custom Tooltip for Scatter Chart (remains the same)
  const CustomScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`${darkMode ? 'bg-slate-700' : 'bg-white'} p-2 border ${darkMode ? 'border-slate-600' : 'border-slate-300'} rounded shadow-lg text-sm`}>
          <p className="font-bold mb-1">{data.name}</p>
          <p>{`Risk: ${payload[0].value}`}</p> {/* X-axis: risk */}
          <p>{`Return: ${payload[1].value}`}</p> {/* Y-axis: return */}
        </div>
      );
    }
    return null;
  };

  // --- Render JSX ---

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300 font-sans`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur border-b px-4 sm:px-6 py-3`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Logo />

          <div className="flex items-center gap-3 sm:gap-6">
            {/* Dark Mode Switch - More Professional */}
            <div className="flex items-center gap-2">
               <Label htmlFor="dark-mode" className="text-sm font-medium">Dark Mode</Label>
               <Switch
                 id="dark-mode"
                 checked={darkMode}
                 onCheckedChange={setDarkMode}
                 className="transform scale-90" // Slightly smaller
               />
            </div>

            <Button
              variant={darkMode ? "outline" : "secondary"}
              size="sm"
              className="gap-1 px-2 sm:px-3 sm:gap-2"
              onClick={() => setShowApiInput(!showApiInput)}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">API Key</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              className={`gap-1 px-2 sm:px-3 sm:gap-2 ${darkMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
              onClick={refreshData}
              disabled={isLoading}
            >
              {isLoading ? (
                 <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                 <RefreshCcw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
        {/* Display Refresh API Error */}
         {refreshApiError && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-7xl mx-auto mt-1 text-center text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 py-1 px-2 rounded"
            >
                 <AlertCircle className="inline h-3 w-3 mr-1"/> {refreshApiError}
            </motion.div>
         )}
      </header>

       {/* API Key Input - Animated (remains the same) */}
      <AnimatePresence>
        {showApiInput && (
          <motion.div
            key="api-input"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className={`overflow-hidden border-b ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
          >
            <div className="max-w-7xl mx-auto p-4 flex flex-col sm:flex-row gap-4 items-center">
              <Label htmlFor="apiKeyInput" className="sr-only">AlphaVantage API Key</Label>
              <div className="flex-grow w-full">
                <Input
                  id="apiKeyInput"
                  type="password"
                  placeholder="Enter your AlphaVantage API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className={`${darkMode ? 'bg-slate-700 border-slate-600 placeholder-slate-400' : 'bg-white border-slate-300 placeholder-slate-500'} text-sm`}
                />
              </div>
              <Button
                onClick={saveApiKey}
                size="sm"
                className={`${darkMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'} w-full sm:w-auto`}
              >
                Save API Key
              </Button>
              <div className="text-xs text-slate-400 flex-shrink-0">
                <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                  <Info className="h-3 w-3" />
                  Get a free key
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Main Dashboard */}
      <main className="p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Main Navigation Tabs (remains the same structure) */}
          <Tabs defaultValue="overview" className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} mb-6`}>
             <TabsList className={`grid w-full grid-cols-3 sm:grid-cols-5 mb-4 ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <TabsTrigger value="overview" className="gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                <BarChart4 className="h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="stocks" className="gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                <TrendingUp className="h-4 w-4" /> Stocks/Crypto
              </TabsTrigger>
              <TabsTrigger value="realestate" className="gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                <Building2 className="h-4 w-4" /> Real Estate
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                <Activity className="h-4 w-4" /> Insights
              </TabsTrigger>
              <TabsTrigger value="api" className="gap-1 sm:gap-2 text-xs sm:text-sm px-1">
                <Database className="h-4 w-4" /> API Keys
              </TabsTrigger>
            </TabsList>

             {/* Overview Tab Content (structure remains, calculations updated) */}
            <TabsContent value="overview">
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
                       {/* Placeholder for 1 Year change */}
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

              {/* Performance Chart and Allocation Chart (structure remains same) */}
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
                                        <Tooltip content={<CustomPieTooltip />} />
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
            </TabsContent>


             {/* Stocks & Crypto Tab Content */}
            <TabsContent value="stocks">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add Position Form */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                  <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
                    <CardHeader>
                      <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Add New Position</CardTitle>
                       {/* Display API error from search */}
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
                              onFocus={() => setIsSearching(true)} // Show results on focus if needed
                              // Optional: Hide on blur after a delay
                              // onBlur={() => setTimeout(() => { if (!form.symbol) setIsSearching(false); }, 150)}
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
                                    // Use onMouseDown to prevent blur event from hiding list before click registers
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
                                onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${p.symbol}&background=random&color=fff&size=64`; }}
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
                            <div className="text-right flex-shrink-0 ml-2 w-28"> {/* Fixed width for alignment */}
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
            </TabsContent>


             {/* Real Estate Tab Content */}
            <TabsContent value="realestate">
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Add Real Estate Form */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                    <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
                        <CardHeader>
                            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Add Real Estate Property</CardTitle>
                             {/* Display Zillow simulation error */}
                             {estimateError && <p className="text-xs text-rose-500 mt-2 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {estimateError}</p>}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Address and Estimate Button */}
                            <div className="space-y-1">
                                <Label htmlFor="address" className="text-sm font-medium">Property Address</Label>
                                <div className="flex gap-2 items-start">
                                    <Input id="address" name="address" placeholder="e.g., 123 Main St, Anytown, USA" value={realEstateForm.address} onChange={handleRealEstateChange} className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} />
                                    <Button
                                        variant="outline" size="sm" onClick={fetchPropertyEstimate}
                                        disabled={isFetchingEstimate || !realEstateForm.address}
                                        className="gap-1 flex-shrink-0"
                                     >
                                         {isFetchingEstimate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4"/>}
                                        <span className="hidden sm:inline">Estimate</span>
                                    </Button>
                                </div>
                                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Enter address & click estimate (simulated).</p>
                            </div>

                            {/* Property Type */}
                             <div>
                                <Label htmlFor="type" className="text-sm font-medium mb-1 block">Property Type</Label>
                                <Select value={realEstateForm.type} onValueChange={handleRealEstateTypeChange}>
                                    <SelectTrigger id="type" className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}> <SelectValue placeholder="Select type" /> </SelectTrigger>
                                    <SelectContent className={`${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white'}`}>
                                        <SelectItem value="Residential">Residential</SelectItem> <SelectItem value="Multi-family">Multi-family</SelectItem>
                                        <SelectItem value="Commercial">Commercial</SelectItem> <SelectItem value="Land">Land</SelectItem>
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Prices */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="purchasePrice" className="text-sm font-medium mb-1 block">Purchase Price ($)</Label>
                                    <Input id="purchasePrice" name="purchasePrice" type="number" placeholder="e.g., 450000" value={realEstateForm.purchasePrice} onChange={handleRealEstateChange} className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} />
                                </div>
                                <div>
                                    <Label htmlFor="currentValue" className="text-sm font-medium mb-1 block">Current Value ($)</Label>
                                    <Input id="currentValue" name="currentValue" type="number" placeholder="e.g., 520000" value={realEstateForm.currentValue} onChange={handleRealEstateChange} className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} />
                                </div>
                            </div>

                             {/* Rent & Mortgage */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="annualRent" className="text-sm font-medium mb-1 block">Annual Rent ($)</Label>
                                    <Input id="annualRent" name="annualRent" type="number" placeholder="e.g., 36000" value={realEstateForm.annualRent} onChange={handleRealEstateChange} className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} />
                                </div>
                                <div>
                                    <Label htmlFor="mortgage" className="text-sm font-medium mb-1 block">Mortgage Bal. ($)</Label>
                                    <Input id="mortgage" name="mortgage" type="number" placeholder="e.g., 320000" value={realEstateForm.mortgage} onChange={handleRealEstateChange} className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} />
                                </div>
                            </div>

                             {/* Year Purchased */}
                             <div>
                                <Label htmlFor="yearPurchased" className="text-sm font-medium mb-1 block">Year Purchased</Label>
                                <Input id="yearPurchased" name="yearPurchased" type="number" placeholder="e.g., 2019" value={realEstateForm.yearPurchased} onChange={handleRealEstateChange} className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={addRealEstateProperty} className={`w-full gap-2 ${darkMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                                <PlusCircle className="h-4 w-4" /> Add Property
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>

                 {/* Real Estate Holdings List (structure remains same) */}
                 <motion.div
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                    className="lg:col-span-2"
                >
                     <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
                        <CardHeader>
                            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Real Estate Holdings</CardTitle>
                             <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-sm`}>
                                Total Equity: ${totalRealEstateEquity.toLocaleString()} | Avg ROI: {avgRealEstateROI.toFixed(1)}%
                             </p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                {realEstateHoldings.length > 0 ? realEstateHoldings.map(p => (
                                    <motion.div
                                        key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                                        className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className={`font-medium text-sm ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{p.address}</p>
                                                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{p.type} (Purchased {p.yearPurchased})</p>
                                            </div>
                                             <Button
                                                variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 flex-shrink-0 ml-2"
                                                onClick={() => deleteRealEstateProperty(p.id)}
                                             > <Trash2 className="h-3.5 w-3.5" /> </Button>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                                            <div>
                                                <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Value:</span>
                                                <span className={`font-medium ml-1 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>${p.currentValue.toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Equity:</span>
                                                <span className={`font-medium ml-1 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>${(p.currentValue - (p.mortgage || 0)).toLocaleString()}</span>
                                            </div>
                                             <div>
                                                <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Rent/Yr:</span>
                                                <span className={`font-medium ml-1 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>${(p.annualRent || 0).toLocaleString()}</span>
                                            </div>
                                            <div>
                                                <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ROI (Rent/Cost):</span>
                                                <span className={`font-medium ml-1 ${p.roi >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{p.roi.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )) : ( <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-center py-4`}>No real estate properties added yet.</p> )}
                            </div>
                        </CardContent>
                     </Card>
                 </motion.div>
               </div>
            </TabsContent>

             {/* Quantitative Insights Tab Content (structure remains same) */}
            <TabsContent value="insights">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Risk vs Return Scatter Chart */}
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
                                            <XAxis type="number" dataKey="risk" name="Risk" unit="%" tickLine={false} axisLine={{ stroke: darkMode ? '#475569' : '#cbd5e1' }} style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} />
                                            <YAxis type="number" dataKey="return" name="Return" unit="%" tickLine={false} axisLine={{ stroke: darkMode ? '#475569' : '#cbd5e1' }} style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} />
                                            <ZAxis type="category" dataKey="name" name="Asset" />
                                            <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomScatterTooltip />} />
                                            <Scatter name="Assets" data={riskData} >
                                                 {riskData.map((entry, index) => (
                                                     <Cell key={`cell-${index}`} fill={entry.name.match(/BTC|ETH|SOL|ADA|XRP|DOT|DOGE|LINK|MATIC|LTC/) ? (darkMode ? "#a855f7" : "#8b5cf6") : (darkMode ? "#60a5fa" : "#3b82f6")} />
                                                 ))}
                                            </Scatter>
                                        </ScatterChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Carbon Intensity Bar Chart */}
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
                                            <YAxis dataKey="name" type="category" width={60} tickLine={false} axisLine={false} style={{ fontSize: '12px', fill: darkMode ? '#94a3b8' : '#64748b' }} />
                                            <Tooltip
                                                formatter={(value) => [value, 'Score']} cursor={{ fill: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                                                contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#ffffff', borderColor: darkMode ? '#475569' : '#e2e8f0', borderRadius: '6px' }}
                                                labelStyle={{ color: darkMode ? '#f1f5f9' : '#1e293b', fontWeight: 'bold' }}
                                            />
                                            <Bar dataKey="score" barSize={20} >
                                                {carbonData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.score > 7 ? (darkMode ? "#f43f5e" : "#ef4444") : entry.score > 4 ? (darkMode ? "#f59e0b" : "#fbbf24") : (darkMode ? "#22c55e" : "#10b981")} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Correlation with SPY Bar Chart */}
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
                                            <XAxis type="number" domain={[0, 1]} tickFormatter={(tick) => tick.toFixed(1)} ticks={[0, 0.2, 0.4, 0.6, 0.8, 1.0]} style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} />
                                            <YAxis dataKey="name" type="category" width={70} tickLine={false} axisLine={false} style={{ fontSize: '12px', fill: darkMode ? '#94a3b8' : '#64748b' }} />
                                            <Tooltip
                                                formatter={(value) => [value.toFixed(2), 'Correlation']} cursor={{ fill: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                                                contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#ffffff', borderColor: darkMode ? '#475569' : '#e2e8f0', borderRadius: '6px' }}
                                                labelStyle={{ color: darkMode ? '#f1f5f9' : '#1e293b', fontWeight: 'bold' }}
                                            />
                                            <Bar dataKey="value" barSize={20} fill={darkMode ? "#ec4899" : "#f472b6"} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Sharpe Ratios Bar Chart */}
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
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: '12px', fill: darkMode ? '#94a3b8' : '#64748b' }} />
                                            <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} />
                                            <Tooltip
                                                formatter={(value) => [value.toFixed(2), 'Sharpe Ratio']} cursor={{ fill: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                                                contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#ffffff', borderColor: darkMode ? '#475569' : '#e2e8f0', borderRadius: '6px' }}
                                                labelStyle={{ color: darkMode ? '#f1f5f9' : '#1e293b', fontWeight: 'bold' }}
                                            />
                                            <Bar dataKey="value" barSize={30} fill={darkMode ? "#14b8a6" : "#2dd4bf"} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                     {/* Volatility Line Chart */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }} className="md:col-span-2">
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
                                            <XAxis dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: '12px', fill: darkMode ? '#94a3b8' : '#64748b' }} />
                                            <YAxis tickLine={false} axisLine={false} unit="%" style={{ fontSize: '11px', fill: darkMode ? '#94a3b8' : '#64748b' }} />
                                            <Tooltip
                                                formatter={(value, name) => [`${value.toFixed(1)}%`, name === 'portfolio' ? 'Portfolio Vol.' : 'Market Vol.']}
                                                contentStyle={{ backgroundColor: darkMode ? '#1e293b' : '#ffffff', borderColor: darkMode ? '#475569' : '#e2e8f0', borderRadius: '6px' }}
                                                labelStyle={{ color: darkMode ? '#f1f5f9' : '#1e293b', fontWeight: 'bold' }}
                                            />
                                            <Legend verticalAlign="top" height={30} iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                                            <Line type="monotone" dataKey="portfolio" name="Portfolio" stroke={darkMode ? "#60a5fa" : "#3b82f6"} strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="market" name="Market (SPY)" stroke={darkMode ? "#e879f9" : "#d946ef"} strokeWidth={2} dot={false} />
                                        </RechartsLineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </TabsContent>


             {/* API Management Tab Content (structure remains same) */}
            <TabsContent value="api">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Add New API Key Form */}
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
                        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
                            <CardHeader>
                                <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Add New API Key</CardTitle>
                                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage external API connections (simulated).</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="apiKeyName" className="text-sm font-medium mb-1 block">Key Name / Label</Label>
                                    <Input id="apiKeyName" name="name" placeholder="e.g., My Brokerage API" value={newApiKey.name} onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })} className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} />
                                </div>
                                <div>
                                    <Label htmlFor="apiKeyService" className="text-sm font-medium mb-1 block">Service / Purpose</Label>
                                    <Input id="apiKeyService" name="service" placeholder="e.g., Portfolio Sync" value={newApiKey.service} onChange={(e) => setNewApiKey({ ...newApiKey, service: e.target.value })} className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} />
                                </div>
                            </CardContent>
                             <CardFooter>
                                <Button onClick={addNewApiKey} className={`w-full gap-2 ${darkMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                                    <PlusCircle className="h-4 w-4" /> Add API Key
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>

                     {/* API Keys List */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
                        className="lg:col-span-2"
                    >
                        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
                            <CardHeader>
                                <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Managed API Keys</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                                    {apiKeys.length > 0 ? apiKeys.map(key => (
                                        <motion.div
                                            key={key.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
                                            className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <div className="flex-grow mb-2 sm:mb-0">
                                                    <p className={`font-medium text-sm ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{key.name}</p>
                                                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{key.service}</p>
                                                     <div className="flex items-center mt-1">
                                                        <span className={`text-xs font-mono mr-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            {key.visible ? key.key : `••••••••${key.key.slice(-4)}`}
                                                        </span>
                                                        <Button variant="ghost" size="icon" className="h-5 w-5 text-slate-400 hover:text-slate-200" onClick={() => toggleApiKeyVisibility(key.id)}>
                                                            {key.visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                        </Button>
                                                     </div>
                                                </div>
                                                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 flex-wrap"> {/* Added flex-wrap */}
                                                    <div className="flex items-center gap-1 text-xs">
                                                        <span className={`w-2 h-2 rounded-full ${key.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                        <span className={`${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{key.status}</span>
                                                    </div>
                                                    <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Added: {key.created}</span>
                                                    <div className="flex gap-1">
                                                         <Button
                                                            variant={key.status === 'Active' ? 'outline' : 'secondary'} size="sm" className="h-7 px-2 text-xs"
                                                            onClick={() => toggleApiKeyStatus(key.id)}
                                                        >
                                                            {key.status === 'Active' ? <XCircle className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                                                            {key.status === 'Active' ? 'Deactivate' : 'Activate'}
                                                        </Button>
                                                         <Button
                                                            variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                                                            onClick={() => deleteApiKey(key.id)}
                                                        > <Trash2 className="h-3.5 w-3.5" /> </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )) : ( <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-center py-4`}>No API keys added yet.</p> )}
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </TabsContent>


          </Tabs>
        </div>
      </main>

       {/* Footer (remains the same) */}
      <footer className={`border-t mt-8 py-4 px-6 text-center ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
        <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            TrackVest © {new Date().getFullYear()} | Data is sourced via Alpha Vantage API and simulation. For demonstration purposes only.
            <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="ml-2 underline hover:text-emerald-500">Data provided by Alpha Vantage</a>
        </p>
      </footer>
    </div>
  );
}