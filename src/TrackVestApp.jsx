import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, AlertCircle } from "lucide-react";

// Import custom components
import Header from './header';
import OverviewTab from './tabs';
import StocksTab from './stocks';
import RealEstateTab from './realestate';
import InsightsTab from './insights';
import ApiKeysTab from './apikeys';
import ZapierChat from './ZapierChat';

// Import utility functions
import { 
  debounce, 
  fetchStockPrice, 
  fetchCryptoPrice, 
  getStockLogo, 
  getCryptoLogo 
} from './hooks';

export default function App() {
  // State for API key
  const [apiKey, setApiKey] = useState("LESMQ2XRINEYXI2F");
  const [showApiInput, setShowApiInput] = useState(false);
  const [apiError, setApiError] = useState(""); // General API error
  const [refreshApiError, setRefreshApiError] = useState(""); // Specific error during refresh

  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // State for holdings
  const [positions, setPositions] = useState([
    { id: 1, symbol: "AAPL", name: "Apple Inc.", quantity: 15, price: 190.50, shares: 15, value: 2857.50, change: 2.3, assetType: "stocks", logoUrl: "https://logo.clearbit.com/apple.com" },
    { id: 2, symbol: "MSFT", name: "Microsoft Corp.", quantity: 10, price: 325.00, shares: 10, value: 3250.00, change: 1.7, assetType: "stocks", logoUrl: "https://logo.clearbit.com/microsoft.com" },
    { id: 3, symbol: "GOOGL", name: "Alphabet Inc.", quantity: 8, price: 140.20, shares: 8, value: 1121.60, change: -0.5, assetType: "stocks", logoUrl: "https://logo.clearbit.com/google.com" },
    { id: 4, symbol: "BTC", name: "Bitcoin", quantity: 0.5, price: 49800.00, shares: 0.5, value: 24900.00, change: 5.2, assetType: "crypto", logoUrl: "https://cryptologos.cc/logos/bitcoin-btc-logo.png" },
    { id: 5, symbol: "ETH", name: "Ethereum", quantity: 2.3, price: 2350.00, shares: 2.3, value: 5405.00, change: 3.8, assetType: "crypto", logoUrl: "https://cryptologos.cc/logos/ethereum-eth-logo.png" }
  ]);

  // State for real estate holdings
  const [realEstateHoldings, setRealEstateHoldings] = useState([
    { id: 1, address: "123 Main St, Austin, TX", type: "Residential", purchasePrice: 450000, currentValue: 520000, annualRent: 36000, roi: 8.0, mortgage: 320000, yearPurchased: 2019 },
    { id: 2, address: "456 Oak Ave, Denver, CO", type: "Multi-family", purchasePrice: 750000, currentValue: 890000, annualRent: 72000, roi: 9.6, mortgage: 600000, yearPurchased: 2018 },
    { id: 3, address: "789 Market Blvd, Seattle, WA", type: "Commercial", purchasePrice: 1200000, currentValue: 1350000, annualRent: 120000, roi: 10.0, mortgage: 900000, yearPurchased: 2021 }
  ]);
  
  // General Loading state (for refresh)
  const [isLoading, setIsLoading] = useState(false);
  
  // Performance data state
  const [performanceData, setPerformanceData] = useState([
    { month: 'Jan', value: 42000 }, { month: 'Feb', value: 44000 }, { month: 'Mar', value: 46500 },
    { month: 'Apr', value: 45800 }, { month: 'May', value: 47200 }, { month: 'Jun', value: 48300 },
    { month: 'Jul', value: 47900 }, { month: 'Aug', value: 49700 }, { month: 'Sep', value: 52000 },
    { month: 'Oct', value: 54500 }, { month: 'Nov', value: 57200 }, { month: 'Dec', value: 60000 }
  ]);

  // Risk data
  const [riskData, setRiskData] = useState([
    { name: 'AAPL', risk: 12, return: 15 }, { name: 'MSFT', risk: 10, return: 12 },
    { name: 'GOOGL', risk: 15, return: 17 }, { name: 'BTC', risk: 28, return: 32 },
    { name: 'ETH', risk: 25, return: 30 },
  ]);

  // Asset allocation data
  const [assetAllocation, setAssetAllocation] = useState([
    { name: "Technology", value: 38, color: "#10b981" }, { name: "Crypto", value: 27, color: "#8b5cf6" },
    { name: "Healthcare", value: 12, color: "#3b82f6" }, { name: "Consumer", value: 15, color: "#f59e0b" },
    { name: "Energy", value: 8, color: "#ec4899" }
  ]);

  // Carbon intensity data
  const [carbonData, setCarbonData] = useState([
    { name: "AAPL", score: 3.2 }, { name: "MSFT", score: 2.8 }, { name: "GOOGL", score: 4.1 },
    { name: "BTC", score: 8.9 }, { name: "ETH", score: 7.2 }
  ]);

  // Quantitative insights data
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

  // API management state
  const [apiKeys, setApiKeys] = useState([
    { id: 1, name: "Alpha Vantage", key: "LESMQ2XRINEYXI2F", service: "Stock/Crypto Data", status: "Active", created: "2023-11-05", visible: false },
    { id: 2, name: "Real Estate API (Simulated)", key: "RE98765DEMO", service: "Property Valuations", status: "Active", created: "2024-01-22", visible: false },
  ]);

  // Calculations
  const totalValue = positions.reduce((acc, p) => acc + p.value, 0);
  const totalChange = positions.reduce((acc, p) => acc + (p.quantity * p.price * (p.change / 100)), 0);
  const changePercentage = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

  const totalRealEstateValue = realEstateHoldings.reduce((acc, prop) => acc + prop.currentValue, 0);
  const totalRealEstateEquity = realEstateHoldings.reduce((acc, prop) => acc + (prop.currentValue - (prop.mortgage || 0)), 0);
  const totalAnnualRent = realEstateHoldings.reduce((acc, prop) => acc + (prop.annualRent || 0), 0);
  const avgRealEstateROI = realEstateHoldings.length > 0 ?
    realEstateHoldings.reduce((acc, prop) => acc + prop.roi, 0) / realEstateHoldings.length : 0;

  // Effects
  useEffect(() => {
    document.title = "TrackVest - Portfolio Tracker";

    // Set favicon
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = '/src/trackvest.png';
    link.type = 'image/png';
  }, []);

  // Update charts data
  const updateChartsData = (updatedPositions) => {
    // Risk data
    const newRiskData = updatedPositions.map(p => ({
      name: p.symbol,
      risk: parseFloat((Math.random() * (p.assetType === 'crypto' ? 30 : 15) + 5).toFixed(1)),
      return: parseFloat((Math.random() * (p.assetType === 'crypto' ? 40 : 20) + 8).toFixed(1))
    }));
    setRiskData(newRiskData);

    // Carbon data
    const newCarbonData = updatedPositions.map(p => ({
      name: p.symbol,
      score: parseFloat((Math.random() * (p.assetType === 'crypto' ? 12 : 6)).toFixed(1))
    }));
    setCarbonData(newCarbonData);

    // Correlation data
    const newCorrelationData = updatedPositions.map(p => ({
      name: `${p.symbol} vs. SPY`,
      value: parseFloat((Math.random() * (p.assetType === 'crypto' ? 0.4 : 0.8) + 0.1).toFixed(2))
    }));
    setCorrelationData(newCorrelationData);

    // Sharpe ratios
    const newSharpeRatios = updatedPositions.map(p => ({
      name: p.symbol,
      value: parseFloat((Math.random() * (p.assetType === 'crypto' ? 2.5 : 1.5) + 0.5).toFixed(1))
    }));
    setSharpeRatios(newSharpeRatios);

    // Asset allocation
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
    const colors = ["#10b981", "#8b5cf6", "#3b82f6", "#f59e0b", "#ec4899", "#64748b"];

    const newAllocation = Object.entries(allocationByType)
      .map(([name, value], index) => ({
        name,
        value: totalPortfolioValue > 0 ? parseFloat(((value / totalPortfolioValue) * 100).toFixed(1)) : 0,
        color: colors[index % colors.length]
      }))
      .filter(item => item.value > 0);

    setAssetAllocation(newAllocation);
  };

  // Save API Key
  const saveApiKey = () => {
    setShowApiInput(false);
    setApiError("");
    console.log("API Key saved (Note: Still not stored securely in this demo)");
  };

  // Refresh data using Alpha Vantage API or simulation
  const refreshData = async () => {
    setIsLoading(true);
    setRefreshApiError("");
  
    /* 1. If no key, fall back to simulator right away */
    if (!apiKey) {
      setRefreshApiError("AlphaVantage API key not set. Using simulated data.");
      simulateRefresh();
      return;
    }
  
    /* 2. Build one array of promises, collecting any failures locally */
    const failed = [];
  
    const pricePromises = positions.map(async (p) => {
      try {
        let currentPrice;
  
        if (p.assetType === "stocks") {
          currentPrice = await fetchStockPrice(p.symbol, apiKey);
        } else if (p.assetType === "crypto") {
          currentPrice = await fetchCryptoPrice(p.symbol, apiKey);
        } else {
          currentPrice = p.price; // defensive fallback
        }
  
        const newValue = p.quantity * currentPrice;
        const prevPrice = p.currentPrice || p.price;
        const changePercent = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
  
        return {
          ...p,
          currentPrice: +currentPrice.toFixed(p.assetType === "crypto" && currentPrice < 1 ? 6 : 2),
          value: +newValue.toFixed(2),
          change: +changePercent.toFixed(1)
        };
      } catch (err) {
        console.warn(`Failed to fetch price for ${p.symbol}: ${err.message}. Using simulated data.`);
        failed.push(p.symbol);
  
        /* simulate this one position */
        const prevPrice = p.currentPrice || p.price;
        const changePercent = Math.random() * 8 - 2;
        const simulatedPrice = prevPrice * (1 + changePercent / 100);
        const newValue = p.quantity * simulatedPrice;
        const simChangePct = prevPrice > 0 ? ((simulatedPrice - prevPrice) / prevPrice) * 100 : 0;
  
        return {
          ...p,
          currentPrice: +simulatedPrice.toFixed(p.assetType === "crypto" && simulatedPrice < 1 ? 6 : 2),
          value: +newValue.toFixed(2),
          change: +simChangePct.toFixed(1)
        };
      }
    });
  
    /* 3. Wait for everything, then update state once */
    const updatedPositions = await Promise.all(pricePromises);
    setPositions(updatedPositions);
    updateChartsData(updatedPositions);
  
    /* --- optional performance‑chart bump --- */
    try {
      const lastValue = performanceData[performanceData.length - 1].value;
      const newTotalValue = updatedPositions.reduce((s, p) => s + p.value, 0) + totalRealEstateEquity;
      const newValue =
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
      setTimeout(() => setRefreshApiError(""), 10000); // auto‑clear after 10 s
    }
  
    setIsLoading(false);
  };

  // Simulation function
  const simulateRefresh = () => {
    console.log("Running simulated refresh...");
    setTimeout(() => {
      const updatedPositions = positions.map(p => {
        const changePercent = (Math.random() * 8 - 2);
        const previousPrice = p.currentPrice || p.price;
        const newPrice = previousPrice * (1 + changePercent / 100);
        const newValue = p.quantity * newPrice;
        const simulatedChangePercent = previousPrice > 0 ? ((newPrice - previousPrice) / previousPrice) * 100 : 0;

        return {
          ...p,
          price: p.price,
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
      } catch (e) { console.error("Error updating performance chart data:", e); }

      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-300 font-sans`}>
      {/* Header */}
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        showApiInput={showApiInput} 
        setShowApiInput={setShowApiInput} 
        refreshData={refreshData} 
        isLoading={isLoading}
        refreshApiError={refreshApiError}
      />

      {/* API Key Input - Animated */}
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
          {/* Main Navigation Tabs */}
          <Tabs defaultValue="overview" className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} mb-6`}>
            <TabsList className={`grid w-full grid-cols-3 sm:grid-cols-5 mb-4 ${darkMode ? 'bg-slate-800/50' : 'bg-slate-200/70'} rounded-xl overflow-hidden p-1`}>
              <TabsTrigger value="overview" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1.5 rounded-lg transition-all duration-200">
                Overview
              </TabsTrigger>
              <TabsTrigger value="stocks" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1.5 rounded-lg transition-all duration-200">
                Stocks/Crypto
              </TabsTrigger>
              <TabsTrigger value="realestate" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1.5 rounded-lg transition-all duration-200">
                Real Estate
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1.5 rounded-lg transition-all duration-200">
                Insights
              </TabsTrigger>
              <TabsTrigger value="api" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1.5 rounded-lg transition-all duration-200">
                API Keys
              </TabsTrigger>
            </TabsList>

            {/* Tab Contents */}
            <TabsContent value="overview">
              <OverviewTab 
                darkMode={darkMode}
                totalValue={totalValue}
                totalRealEstateEquity={totalRealEstateEquity}
                changePercentage={changePercentage}
                performanceData={performanceData}
                assetAllocation={assetAllocation}
              />
            </TabsContent>

            <TabsContent value="stocks">
              <StocksTab 
                darkMode={darkMode}
                positions={positions}
                setPositions={setPositions}
                totalValue={totalValue}
                updateChartsData={updateChartsData}
                apiKey={apiKey}
                apiError={apiError}
                setApiError={setApiError}
              />
            </TabsContent>

            <TabsContent value="realestate">
              <RealEstateTab 
                darkMode={darkMode}
                realEstateHoldings={realEstateHoldings}
                setRealEstateHoldings={setRealEstateHoldings}
                totalRealEstateEquity={totalRealEstateEquity}
                avgRealEstateROI={avgRealEstateROI}
              />
            </TabsContent>

            <TabsContent value="insights">
              <InsightsTab 
                darkMode={darkMode}
                riskData={riskData}
                carbonData={carbonData}
                correlationData={correlationData}
                sharpeRatios={sharpeRatios}
                volatilityData={volatilityData}
              />
            </TabsContent>

            <TabsContent value="api">
              <ApiKeysTab 
                darkMode={darkMode}
                apiKeys={apiKeys}
                setApiKeys={setApiKeys}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className={`border-t mt-8 py-4 px-6 text-center ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
        <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          TrackVest © {new Date().getFullYear()} | Data is sourced via Alpha Vantage API and simulation. For demonstration purposes only.
          <a href="https://www.alphavantage.co" target="_blank" rel="noopener noreferrer" className="ml-2 underline hover:text-emerald-500">Data provided by Alpha Vantage</a>
        </p>
      </footer>

      {/* Zapier Chat */}
      <ZapierChat darkMode={darkMode} positions={positions} realEstateHoldings={realEstateHoldings} />
    </div>
  );
}