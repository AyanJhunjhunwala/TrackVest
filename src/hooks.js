import { useRef } from "react";

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

// API functions
export const fetchStockPrice = async (symbol, apiKey) => {
    if (!apiKey) throw new Error("API key not set.");
  
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const data = await (await fetch(url)).json();
  
    if (data.Note?.includes("call frequency")) throw new Error("API rate limit");
    if (data["Error Message"]) throw new Error(data["Error Message"]);
    const price = data?.["Global Quote"]?.["05. price"];
    if (!price) throw new Error("No price data");
  
    return +price;
};

export const fetchCryptoPrice = async (symbol, apiKey) => {
    if (!apiKey) throw new Error("API key not set.");
    const endpoint = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${apiKey}`;
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.Note && data.Note.includes("call frequency")) throw new Error("API rate limit reached.");
    if (data["Error Message"]) throw new Error(`API Error: ${data["Error Message"]}`);
    const rateInfo = data["Realtime Currency Exchange Rate"];
    if (!rateInfo || !rateInfo["5. Exchange Rate"]) throw new Error(`No price data for ${symbol}`);

    return parseFloat(rateInfo["5. Exchange Rate"]);
};

// Logo generator functions
export const getStockLogo = (symbol) => {
    const upperSymbol = symbol.trim().toUpperCase();
    const clearbitMap = {
        "AAPL": "https://logo.clearbit.com/apple.com", 
        "MSFT": "https://logo.clearbit.com/microsoft.com",
        "GOOGL": "https://logo.clearbit.com/google.com", 
        "AMZN": "https://logo.clearbit.com/amazon.com",
        "TSLA": "https://logo.clearbit.com/tesla.com", 
        "NVDA": "https://logo.clearbit.com/nvidia.com",
        "META": "https://logo.clearbit.com/meta.com",
    };
    return clearbitMap[upperSymbol] || `https://ui-avatars.com/api/?name=${upperSymbol}&background=random&color=fff&size=64`;
};

export const getCryptoLogo = (symbol) => {
    const upperSymbol = symbol.trim().toUpperCase();
    const cryptoLogos = {
        "BTC": "https://cryptologos.cc/logos/bitcoin-btc-logo.png", 
        "ETH": "https://cryptologos.cc/logos/ethereum-eth-logo.png",
        "SOL": "https://cryptologos.cc/logos/solana-sol-logo.png", 
        "ADA": "https://cryptologos.cc/logos/cardano-ada-logo.png",
        "XRP": "https://cryptologos.cc/logos/xrp-xrp-logo.png", 
        "DOT": "https://cryptologos.cc/logos/polkadot-new-dot-logo.png",
        "DOGE": "https://cryptologos.cc/logos/dogecoin-doge-logo.png", 
        "LINK": "https://cryptologos.cc/logos/chainlink-link-logo.png",
        "MATIC": "https://cryptologos.cc/logos/polygon-matic-logo.png", 
        "LTC": "https://cryptologos.cc/logos/litecoin-ltc-logo.png"
    };
    return cryptoLogos[upperSymbol] || `https://ui-avatars.com/api/?name=${upperSymbol}&background=random&color=fff&size=64`;
};