/**
 * Polygon API integration for grouped stock data
 * 
 * This module provides functions for fetching and processing
 * grouped stock data from the Polygon API
 */

import { getApiDate, formatMarketDate } from './hooks';

// API Configuration
const getPolygonApiKey = () => localStorage.getItem('polygonApiKey') || '';

/**
 * Fetch grouped stock data for a specific date
 * @param {string} date - The date in YYYY-MM-DD format
 * @param {string[]} symbols - Stock symbols to filter for (optional)
 * @returns {Promise<Object>} Processed stock data
 */
export async function fetchGroupedStockData(date = null, symbols = []) {
  // If no date provided, use the most recent market day
  const targetDate = date || getApiDate();
  const displayDate = formatMarketDate(targetDate);
  
  try {
    console.log(`Fetching grouped stock data for ${targetDate} (${displayDate})`);
    
    // Use our server proxy for the Polygon API request
    const url = `/api/polygon/daily?date=${targetDate}&apiKey=${getPolygonApiKey()}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Network error (${response.status}): ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== "OK" || !data.results) {
      // Check if the API returned a specific error
      if (data.error && data.error.includes("no data")) {
        throw new Error(`No market data available for ${displayDate}. This may be a market holiday or weekend.`);
      }
      
      throw new Error(`No stock market data available for ${displayDate}`);
    }
    
    // Process and filter the results
    const stocksData = {};
    
    // Map stock results to our data structure by ticker symbol
    data.results.forEach(stock => {
      // Only include stocks we're interested in if we specified symbols
      if (symbols.length === 0 || symbols.includes(stock.T)) {
        stocksData[stock.T] = {
          symbol: stock.T,
          close: stock.c,
          open: stock.o,
          high: stock.h,
          low: stock.l,
          volume: stock.v,
          vwap: stock.vw || null,
          transactions: stock.n || null,
          change: stock.c - stock.o,
          changePercent: ((stock.c - stock.o) / stock.o) * 100
        };
      }
    });
    
    // If we specified symbols, filter for just those
    const filteredResults = symbols.length > 0
      ? symbols
          .filter(symbol => stocksData[symbol])
          .map(symbol => stocksData[symbol])
      : Object.values(stocksData);
    
    console.log(`Retrieved data for ${filteredResults.length} stocks from ${targetDate}`);
    
    return {
      date: targetDate,
      displayDate: displayDate,
      requestDate: data.requestedDate || targetDate,
      adjustedDate: data.adjustedDate || targetDate,
      dateAdjustedReason: data.dateAdjustedReason || null,
      count: filteredResults.length,
      stocks: filteredResults
    };
  } catch (error) {
    console.error(`Error fetching grouped stock data for ${targetDate}:`, error);
    return {
      date: targetDate,
      displayDate: displayDate,
      error: error.message,
      count: 0,
      stocks: []
    };
  }
}

/**
 * Get the user's current stock positions from local storage
 * @returns {string[]} Array of stock symbols
 */
export function getUserStockSymbols() {
  try {
    // Access positions from localStorage
    const storedPositions = localStorage.getItem('positions');
    if (storedPositions) {
      const positions = JSON.parse(storedPositions);
      return positions
        .filter(p => p.assetType === 'stocks')
        .map(p => p.symbol);
    }
    
    // Default fallback symbols
    return ['AAPL', 'MSFT', 'GOOGL'];
  } catch (error) {
    console.error('Error getting user stock symbols:', error);
    return ['AAPL', 'MSFT', 'GOOGL']; // Default fallback
  }
}

/**
 * Get popular stock symbols to display in the portfolio assistant
 * @returns {string[]} Array of popular stock symbols
 */
export function getPopularStockSymbols() {
  return [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'JPM',
    'V', 'WMT', 'DIS', 'NFLX', 'PYPL', 'INTC', 'AMD', 'BA'
  ];
}

/**
 * Fetch stock data for the user's portfolio
 * @returns {Promise<Object>} Processed portfolio stock data
 */
export async function fetchPortfolioStockData() {
  const userSymbols = getUserStockSymbols();
  return fetchGroupedStockData(null, userSymbols);
}

/**
 * Fetch stock data for popular stocks
 * @returns {Promise<Object>} Processed popular stock data
 */
export async function fetchPopularStockData() {
  const popularSymbols = getPopularStockSymbols();
  return fetchGroupedStockData(null, popularSymbols);
} 