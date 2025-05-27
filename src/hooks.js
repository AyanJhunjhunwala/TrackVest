import { useRef } from "react";

// Polygon.io API configuration
const getPolygonApiKey = () => localStorage.getItem('polygonApiKey') || '';

// Debounce utility function
export function debounce(func, wait) {
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

// Custom hook to create a debounced function
export function useDebounce(callback, delay) {
    const debouncedFn = useRef(debounce(callback, delay)).current;
    return debouncedFn;
}

// Function to get the 2nd last US market day using Gemini API
const getSecondLastMarketDay = async () => {
    try {
        const geminiApiKey = localStorage.getItem('geminiApiKey');
        if (!geminiApiKey || geminiApiKey.trim().length < 10) {
            console.warn('No Gemini API key found, using fallback date calculation');
            return getFallbackSecondLastMarketDay();
        }

        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });

        const today = new Date();
        const prompt = `
            What was the 2nd last US stock market trading day before today (${today.toISOString().split('T')[0]})?
            
            Consider:
            - US stock market is closed on weekends (Saturday and Sunday)
            - US stock market holidays (New Year's Day, MLK Day, Presidents Day, Good Friday, Memorial Day, Juneteenth, Independence Day, Labor Day, Thanksgiving, Christmas, etc.)
            - I need the 2nd most recent trading day, not the most recent
            
            Please respond with ONLY the date in YYYY-MM-DD format, nothing else.
            
            For example, if today is Friday and yesterday (Thursday) was the last trading day, I want Wednesday's date.
            If today is Monday and Friday was the last trading day, I want Thursday's date.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response.text().trim();
        
        // Validate the response format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(response)) {
            console.log(`Gemini API returned 2nd last market day: ${response}`);
            return response;
        } else {
            console.warn('Invalid date format from Gemini API, using fallback');
            return getFallbackSecondLastMarketDay();
        }
    } catch (error) {
        console.error('Error getting market day from Gemini API:', error);
        return getFallbackSecondLastMarketDay();
    }
};

// Fallback function for when Gemini API is not available
const getFallbackSecondLastMarketDay = () => {
    const today = new Date();
    
    // Function to check if a date is a US market holiday
    const isMarketHoliday = (date) => {
        const year = date.getFullYear();
        const dateString = date.toISOString().split('T')[0];
        
        // Common US market holidays for 2025
        const holidays2025 = [
            '2025-01-01', // New Year's Day
            '2025-01-20', // MLK Day (3rd Monday in January)
            '2025-02-17', // Presidents Day (3rd Monday in February)
            '2025-04-18', // Good Friday
            '2025-05-26', // Memorial Day (last Monday in May)
            '2025-06-19', // Juneteenth
            '2025-07-04', // Independence Day
            '2025-09-01', // Labor Day (1st Monday in September)
            '2025-11-27', // Thanksgiving (4th Thursday in November)
            '2025-12-25'  // Christmas
        ];
        
        return holidays2025.includes(dateString);
    };
    
    // Find the 2nd most recent valid trading day
    let marketDays = [];
    let daysToSubtract = 1;
    let maxAttempts = 20;
    
    while (marketDays.length < 2 && maxAttempts > 0) {
        const checkDay = new Date(today);
        checkDay.setDate(today.getDate() - daysToSubtract);
        
        const dayOfWeek = checkDay.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = isMarketHoliday(checkDay);
        
        if (!isWeekend && !isHoliday) {
            const marketDay = checkDay.toISOString().split('T')[0];
            marketDays.push(marketDay);
        }
        
        daysToSubtract++;
        maxAttempts--;
    }
    
    // Return the 2nd last market day, or fallback to a safe date
    if (marketDays.length >= 2) {
        console.log(`Fallback: Using 2nd last market day: ${marketDays[1]}`);
        return marketDays[1];
    } else {
        const fallbackDate = '2025-01-08'; // Known safe trading day
        console.warn(`Could not find 2nd last market day, using fallback: ${fallbackDate}`);
        return fallbackDate;
    }
};

// Helper function to get a suitable date for API calls (2nd last trading day)
export const getApiDate = async () => {
    try {
        return await getSecondLastMarketDay();
    } catch (error) {
        console.error('Error getting API date:', error);
        return getFallbackSecondLastMarketDay();
    }
};

// Synchronous version for immediate use (uses cached result or fallback)
export const getApiDateSync = () => {
    // Check if we have a cached result from recent async call
    const cachedDate = localStorage.getItem('lastMarketDate');
    const cachedTime = localStorage.getItem('lastMarketDateTime');
    
    if (cachedDate && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime);
        // Use cached date if it's less than 1 hour old
        if (cacheAge < 60 * 60 * 1000) {
            console.log(`Using cached market date: ${cachedDate}`);
            return cachedDate;
        }
    }
    
    // If no valid cache, use fallback
    const fallbackDate = getFallbackSecondLastMarketDay();
    
    // Cache the fallback date
    localStorage.setItem('lastMarketDate', fallbackDate);
    localStorage.setItem('lastMarketDateTime', Date.now().toString());
    
    return fallbackDate;
};

// Helper function to format date for display
export const formatMarketDate = (dateStr) => {
    const date = new Date(dateStr);
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
};

// Cache to store the daily market data by date
let marketDataCache = {
    date: null,
    stocks: {},
    crypto: {}
};

// Helper function to determine if we're in development or production
const isDevelopment = () => {
    return import.meta.env.DEV || window.location.hostname === 'localhost';
};

// Helper function to get the correct API URL
const getApiUrl = (endpoint) => {
    if (isDevelopment()) {
        // In development, use the proxy
        return endpoint;
    } else {
        // In production, make direct calls to Polygon.io
        return endpoint.replace('/api/polygon/', 'https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/')
                      .replace('/api/polygon/daily/crypto', 'https://api.polygon.io/v2/aggs/grouped/locale/global/market/crypto/')
                      .replace('/api/polygon/open-close', 'https://api.polygon.io/v1/open-close/');
    }
};

// Function to fetch all stock data for a specific day
export const fetchDailyMarketData = async (apiKey) => {
    // Use the hardcoded Polygon key if none provided
    const key = apiKey || getPolygonApiKey();
    if (!key) throw new Error("API key not set.");
    
    // Get previous valid market day (2nd last trading day)
    const date = await getApiDate();
    const formattedDate = formatMarketDate(date);
    
    // Cache the date for sync access
    localStorage.setItem('lastMarketDate', date);
    localStorage.setItem('lastMarketDateTime', Date.now().toString());
    
    // If we already have data for this date in cache, return it
    if (marketDataCache.date === date && Object.keys(marketDataCache.stocks).length > 0) {
        console.log(`Using cached market data for ${date} (${formattedDate})`);
        return marketDataCache;
    }
    
    try {
        console.log(`Fetching grouped daily market data for ${date} (${formattedDate})`);
        
        // Initialize cache with the date
        marketDataCache = {
            date,
            stocks: {},
            crypto: {}
        };
        
        // Fetch stock data
        let stocksUrl;
        if (isDevelopment()) {
            // Use our server proxy in development
            stocksUrl = `/api/polygon/daily?date=${date}&apiKey=${key}`;
        } else {
            // Make direct call to Polygon.io in production
            stocksUrl = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&apiKey=${key}`;
        }
        const stocksResponse = await fetch(stocksUrl);
        
        if (!stocksResponse.ok) {
            throw new Error(`Network error (${stocksResponse.status}): ${stocksResponse.statusText}`);
        }
        
        const stocksData = await stocksResponse.json();
        
        if (stocksData.status !== "OK" || !stocksData.results) {
            // Check if the API indicates a specific issue with the date
            if (stocksData.error && stocksData.error.includes("no data")) {
                throw new Error(`No market data available for ${formattedDate}. This may be a market holiday or weekend.`);
            }
            
            throw new Error(`No stock market data available for ${formattedDate}`);
        }
        
        // Map stock results to cache by ticker symbol
        stocksData.results.forEach(stock => {
            marketDataCache.stocks[stock.T] = {
                symbol: stock.T,
                close: stock.c,
                open: stock.o,
                high: stock.h,
                low: stock.l,
                volume: stock.v,
                vwap: stock.vw
            };
        });
        
        console.log(`Cached ${Object.keys(marketDataCache.stocks).length} stocks for ${date} (${formattedDate})`);
        
        // Fetch crypto data using the same grouped endpoint but for crypto market
        console.log(`Fetching grouped daily crypto market data for ${date} (${formattedDate})`);
        let cryptoUrl;
        if (isDevelopment()) {
            cryptoUrl = `/api/polygon/daily/crypto?date=${date}&apiKey=${key}`;
        } else {
            cryptoUrl = `https://api.polygon.io/v2/aggs/grouped/locale/global/market/crypto/${date}?adjusted=true&apiKey=${key}`;
        }
        const cryptoResponse = await fetch(cryptoUrl);
        
        if (cryptoResponse.ok) {
            const cryptoData = await cryptoResponse.json();
            
            if (cryptoData.status === "OK" && cryptoData.results) {
                // Map crypto results to cache by ticker symbol
                cryptoData.results.forEach(crypto => {
                    // Remove the "X:" prefix from crypto symbols for easier lookup
                    const cleanSymbol = crypto.T.replace('X:', '').replace('USD', '');
                    marketDataCache.crypto[cleanSymbol] = {
                        symbol: cleanSymbol,
                        close: crypto.c,
                        open: crypto.o,
                        high: crypto.h,
                        low: crypto.l,
                        volume: crypto.v,
                        vwap: crypto.vw
                    };
                });
                
                console.log(`Cached ${Object.keys(marketDataCache.crypto).length} crypto assets for ${date} (${formattedDate})`);
            } else {
                console.warn(`No crypto data available for ${date} (${formattedDate})`);
            }
        } else {
            console.warn(`Failed to fetch crypto data for ${date}: ${cryptoResponse.status}`);
        }
        
        return marketDataCache;
    } catch (error) {
        console.error(`Error fetching market data for ${date}:`, error);
        
        // In production, if API calls fail, return simulated data to keep the app functional
        if (!isDevelopment()) {
            console.warn('API call failed in production, using simulated data');
            return {
                date,
                stocks: {},
                crypto: {},
                simulated: true
            };
        }
        
        throw error;
    }
};

// Helper function to fetch data for a specific date (for fallback)
async function fetchSpecificDateData(specificDate, apiKey) {
    console.log(`Attempting to fetch data specifically for ${specificDate}`);
    
    try {
        let stocksUrl;
        if (isDevelopment()) {
            stocksUrl = `/api/polygon/daily?date=${specificDate}&apiKey=${apiKey}`;
        } else {
            stocksUrl = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${specificDate}?adjusted=true&apiKey=${apiKey}`;
        }
        const stocksResponse = await fetch(stocksUrl);
        
        if (!stocksResponse.ok) {
            throw new Error(`Network error (${stocksResponse.status}): ${stocksResponse.statusText}`);
        }
        
        const stocksData = await stocksResponse.json();
        
        // Initialize cache with the specific date
        marketDataCache = {
            date: specificDate,
            stocks: {},
            crypto: {}
        };
        
        if (stocksData.status === "OK" && stocksData.results) {
        // Map stock results to cache by ticker symbol
        stocksData.results.forEach(stock => {
            marketDataCache.stocks[stock.T] = {
                symbol: stock.T,
                close: stock.c,
                open: stock.o,
                high: stock.h,
                low: stock.l,
                volume: stock.v,
                vwap: stock.vw
            };
        });
        
        console.log(`Cached ${Object.keys(marketDataCache.stocks).length} stocks for fallback date ${specificDate}`);
        } else {
            console.warn(`No stock data for fallback date ${specificDate}`);
        }
        
        // Also try to fetch crypto data for the fallback date
        let cryptoUrl;
        if (isDevelopment()) {
            cryptoUrl = `/api/polygon/daily/crypto?date=${specificDate}&apiKey=${apiKey}`;
        } else {
            cryptoUrl = `https://api.polygon.io/v2/aggs/grouped/locale/global/market/crypto/${specificDate}?adjusted=true&apiKey=${apiKey}`;
        }
        const cryptoResponse = await fetch(cryptoUrl);
        
        if (cryptoResponse.ok) {
            const cryptoData = await cryptoResponse.json();
            
            if (cryptoData.status === "OK" && cryptoData.results) {
                // Map crypto results to cache by ticker symbol
                cryptoData.results.forEach(crypto => {
                    // Remove the "X:" prefix from crypto symbols for easier lookup
                    const cleanSymbol = crypto.T.replace('X:', '').replace('USD', '');
                    marketDataCache.crypto[cleanSymbol] = {
                        symbol: cleanSymbol,
                        close: crypto.c,
                        open: crypto.o,
                        high: crypto.h,
                        low: crypto.l,
                        volume: crypto.v,
                        vwap: crypto.vw
                    };
                });
                
                console.log(`Cached ${Object.keys(marketDataCache.crypto).length} crypto assets for fallback date ${specificDate}`);
            }
        }
        
        return marketDataCache;
    } catch (error) {
        console.error(`Error fetching data for fallback date ${specificDate}:`, error);
        throw error;
    }
}

// API functions - updated to use the cached grouped data when possible
export const fetchStockPrice = async (symbol, apiKey) => {
    // Use the hardcoded Polygon key if none provided
    const key = apiKey || getPolygonApiKey();
    if (!key) throw new Error("API key not set.");
    
    try {
        // Get market data (will use cache if available)
        await fetchDailyMarketData(key);
        
        // Get API date (for log messages)
        const date = await getApiDate();
        const formattedDate = formatMarketDate(date);
        
        // Convert symbol to uppercase to match cache keys
        const upperSymbol = symbol.toUpperCase();
        
        // Check if we have this symbol in our cache
        if (marketDataCache.stocks[upperSymbol]) {
            console.log(`Using cached price for ${upperSymbol} from ${date} (${formattedDate})`);
            return marketDataCache.stocks[upperSymbol].close;
        }
        
        // If not found in cache after fetching grouped market data, go directly to individual API call
        // We don't need to fetch grouped data again as we already tried that in fetchDailyMarketData
        console.log(`Symbol ${upperSymbol} not found in cache, trying individual API call`);
        let url;
        if (isDevelopment()) {
            url = `/api/polygon/open-close?symbol=${upperSymbol}&date=${date}&apiKey=${key}`;
        } else {
            url = `https://api.polygon.io/v1/open-close/${upperSymbol}/${date}?adjusted=true&apiKey=${key}`;
        }
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Network error (${response.status}): ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status !== "OK") {
            throw new Error(`API error: ${data.status}`);
        }
        
        // Cache the individual result for future use
        marketDataCache.stocks[upperSymbol] = {
            symbol: upperSymbol,
            close: data.close,
            open: data.open,
            high: data.high,
            low: data.low
        };
        
        console.log(`Fetched and cached individual price for ${upperSymbol}: $${data.close}`);
        return data.close;
    } catch (error) {
        console.error(`Error fetching stock price for ${symbol}:`, error);
        throw error;
    }
};

export const fetchCryptoPrice = async (symbol, apiKey) => {
    // Use the hardcoded Polygon key if none provided
    const key = apiKey || getPolygonApiKey();
    if (!key) throw new Error("API key not set.");
    
    try {
        // Format crypto ticker in Polygon format: X:BTCUSD
        const upperSymbol = symbol.toUpperCase();
        
        // Get market data (will use cache if available)
        await fetchDailyMarketData(key);
        
        // Get API date (for log messages)
        const date = await getApiDate();
        const formattedDate = formatMarketDate(date);
        
        // Check if we already have this crypto in our cache
        if (marketDataCache.crypto[upperSymbol]) {
            console.log(`Using cached price for ${upperSymbol} from ${date} (${formattedDate})`);
            return marketDataCache.crypto[upperSymbol].close;
        }
        
        // If not found in cache after fetching grouped market data, go directly to individual API call
        // We don't need to fetch grouped data again as we already tried that in fetchDailyMarketData
        console.log(`Symbol ${upperSymbol} not found in cache, trying individual API call`);
        const ticker = `X:${upperSymbol}USD`;
        let url;
        if (isDevelopment()) {
            url = `/api/polygon/open-close?symbol=${ticker}&date=${date}&apiKey=${key}`;
        } else {
            url = `https://api.polygon.io/v1/open-close/${ticker}/${date}?adjusted=true&apiKey=${key}`;
        }
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Network error (${response.status}): ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status !== "OK") {
            throw new Error(`API error: ${data.status}`);
        }
        
        // Cache the individual result for future use
        marketDataCache.crypto[upperSymbol] = {
            symbol: upperSymbol,
            close: data.close,
            open: data.open,
            high: data.high,
            low: data.low
        };
        
        console.log(`Fetched and cached individual price for ${upperSymbol}: $${data.close}`);
        return data.close;
    } catch (error) {
        console.error(`Error fetching crypto price for ${symbol}:`, error);
        throw error;
    }
};

// Logo generator functions
export const getStockLogo = (symbol) => {
    const upperSymbol = symbol.trim().toUpperCase();
    
    // Map of known symbols to their company logos
    const stockLogos = {
        // Tech stocks
        "AAPL": "https://logo.clearbit.com/apple.com", 
        "MSFT": "https://logo.clearbit.com/microsoft.com",
        "GOOGL": "https://logo.clearbit.com/google.com", 
        "GOOG": "https://logo.clearbit.com/google.com",
        "AMZN": "https://logo.clearbit.com/amazon.com",
        "TSLA": "https://logo.clearbit.com/tesla.com", 
        "NVDA": "https://logo.clearbit.com/nvidia.com",
        "META": "https://logo.clearbit.com/meta.com",
        "NFLX": "https://logo.clearbit.com/netflix.com",
        "INTC": "https://logo.clearbit.com/intel.com",
        "AMD": "https://logo.clearbit.com/amd.com",
        "CSCO": "https://logo.clearbit.com/cisco.com",
        "ADBE": "https://logo.clearbit.com/adobe.com",
        "CRM": "https://logo.clearbit.com/salesforce.com",
        "PYPL": "https://logo.clearbit.com/paypal.com",
        "ORCL": "https://logo.clearbit.com/oracle.com",
        
        // Financial
        "JPM": "https://logo.clearbit.com/jpmorganchase.com",
        "BAC": "https://logo.clearbit.com/bankofamerica.com",
        "WFC": "https://logo.clearbit.com/wellsfargo.com",
        "GS": "https://logo.clearbit.com/goldmansachs.com",
        "MS": "https://logo.clearbit.com/morganstanley.com",
        "V": "https://logo.clearbit.com/visa.com",
        "MA": "https://logo.clearbit.com/mastercard.com",
        "AXP": "https://logo.clearbit.com/americanexpress.com",
        
        // Retail
        "WMT": "https://logo.clearbit.com/walmart.com",
        "TGT": "https://logo.clearbit.com/target.com",
        "HD": "https://logo.clearbit.com/homedepot.com",
        "LOW": "https://logo.clearbit.com/lowes.com",
        "SBUX": "https://logo.clearbit.com/starbucks.com",
        "MCD": "https://logo.clearbit.com/mcdonalds.com",
        "NKE": "https://logo.clearbit.com/nike.com",
        "DIS": "https://logo.clearbit.com/disney.com",
        
        // Healthcare
        "JNJ": "https://logo.clearbit.com/jnj.com",
        "PFE": "https://logo.clearbit.com/pfizer.com",
        "ABBV": "https://logo.clearbit.com/abbvie.com",
        "MRK": "https://logo.clearbit.com/merck.com",
        "UNH": "https://logo.clearbit.com/unitedhealthgroup.com",
        
        // Telecom
        "T": "https://logo.clearbit.com/att.com",
        "VZ": "https://logo.clearbit.com/verizon.com",
        
        // Energy
        "XOM": "https://logo.clearbit.com/exxonmobil.com",
        "CVX": "https://logo.clearbit.com/chevron.com",
    };
    
    // Try to get logo from our predefined map
    if (stockLogos[upperSymbol]) {
        return stockLogos[upperSymbol];
    }
    
    // Try clearbit for companies not in our map
    try {
        return `https://logo.clearbit.com/${upperSymbol.toLowerCase()}.com`;
    } catch {
        // Fallback to avatar generator
        return `https://ui-avatars.com/api/?name=${upperSymbol}&background=random&color=fff&size=128`;
    }
};

export const getCryptoLogo = (symbol) => {
    const upperSymbol = symbol.trim().toUpperCase();
    
    // Map of crypto symbols to their logos
    const cryptoLogos = {
        // Major cryptocurrencies
        "BTC": "https://cryptologos.cc/logos/bitcoin-btc-logo.png", 
        "ETH": "https://cryptologos.cc/logos/ethereum-eth-logo.png",
        "SOL": "https://cryptologos.cc/logos/solana-sol-logo.png", 
        "ADA": "https://cryptologos.cc/logos/cardano-ada-logo.png",
        "XRP": "https://cryptologos.cc/logos/xrp-xrp-logo.png", 
        "DOT": "https://cryptologos.cc/logos/polkadot-new-dot-logo.png",
        "DOGE": "https://cryptologos.cc/logos/dogecoin-doge-logo.png", 
        "LINK": "https://cryptologos.cc/logos/chainlink-link-logo.png",
        "MATIC": "https://cryptologos.cc/logos/polygon-matic-logo.png", 
        "LTC": "https://cryptologos.cc/logos/litecoin-ltc-logo.png",
        
        // DeFi tokens
        "UNI": "https://cryptologos.cc/logos/uniswap-uni-logo.png",
        "AAVE": "https://cryptologos.cc/logos/aave-aave-logo.png",
        "MKR": "https://cryptologos.cc/logos/maker-mkr-logo.png",
        "COMP": "https://cryptologos.cc/logos/compound-comp-logo.png",
        "SNX": "https://cryptologos.cc/logos/synthetix-network-token-snx-logo.png",
        "SUSHI": "https://cryptologos.cc/logos/sushiswap-sushi-logo.png",
        
        // Layer 1 blockchains
        "AVAX": "https://cryptologos.cc/logos/avalanche-avax-logo.png",
        "ALGO": "https://cryptologos.cc/logos/algorand-algo-logo.png",
        "ATOM": "https://cryptologos.cc/logos/cosmos-atom-logo.png",
        "FTM": "https://cryptologos.cc/logos/fantom-ftm-logo.png",
        "NEAR": "https://cryptologos.cc/logos/near-protocol-near-logo.png",
        
        // Stablecoins
        "USDT": "https://cryptologos.cc/logos/tether-usdt-logo.png",
        "USDC": "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
        "DAI": "https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png",
        
        // Meme coins
        "SHIB": "https://cryptologos.cc/logos/shiba-inu-shib-logo.png",
        "PEPE": "https://cryptologos.cc/logos/pepe-pepe-logo.png",
        
        // Other popular cryptocurrencies
        "BNB": "https://cryptologos.cc/logos/bnb-bnb-logo.png",
        "TRX": "https://cryptologos.cc/logos/tron-trx-logo.png",
        "EOS": "https://cryptologos.cc/logos/eos-eos-logo.png",
        "XLM": "https://cryptologos.cc/logos/stellar-xlm-logo.png",
        "XMR": "https://cryptologos.cc/logos/monero-xmr-logo.png",
        "BCH": "https://cryptologos.cc/logos/bitcoin-cash-bch-logo.png",
        "XTZ": "https://cryptologos.cc/logos/tezos-xtz-logo.png",
        "FIL": "https://cryptologos.cc/logos/filecoin-fil-logo.png",
    };
    
    // Check our predefined map first
    if (cryptoLogos[upperSymbol]) {
        return cryptoLogos[upperSymbol];
    }
    
    // Try the generic path
    try {
        return `https://cryptologos.cc/logos/${upperSymbol.toLowerCase()}-${upperSymbol.toLowerCase()}-logo.png`;
    } catch {
        // If all fails, use avatar generator with crypto-themed colors
        return `https://ui-avatars.com/api/?name=${upperSymbol}&background=7137c8&color=fff&size=128`;
    }
};