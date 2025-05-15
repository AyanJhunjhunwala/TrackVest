/**
 * Utility functions for formatting portfolio data for use with Zapier chatbot
 */

/**
 * Creates a formatted summary of the portfolio data
 * @param {Array} positions - The positions data
 * @param {Array} realEstateHoldings - The real estate holdings data
 * @returns {Object} Formatted portfolio data
 */
export function formatPortfolioData(positions = [], realEstateHoldings = []) {
  const stocks = positions.filter(p => p.assetType === 'stocks');
  const crypto = positions.filter(p => p.assetType === 'crypto');
  
  const totalStockValue = stocks.reduce((sum, p) => sum + p.value, 0);
  const totalCryptoValue = crypto.reduce((sum, p) => sum + p.value, 0);
  const totalRealEstateValue = realEstateHoldings.reduce((sum, p) => sum + p.currentValue, 0);
  
  return {
    summary: {
      stocksCount: stocks.length,
      cryptoCount: crypto.length,
      realEstateCount: realEstateHoldings.length,
      totalStockValue,
      totalCryptoValue,
      totalRealEstateValue,
      totalPortfolioValue: totalStockValue + totalCryptoValue + totalRealEstateValue,
      allocation: {
        stocks: totalStockValue / (totalStockValue + totalCryptoValue + totalRealEstateValue) * 100,
        crypto: totalCryptoValue / (totalStockValue + totalCryptoValue + totalRealEstateValue) * 100,
        realEstate: totalRealEstateValue / (totalStockValue + totalCryptoValue + totalRealEstateValue) * 100
      }
    },
    stocks: stocks.map(formatStockPosition),
    crypto: crypto.map(formatCryptoPosition),
    realEstate: realEstateHoldings.map(formatRealEstateHolding)
  };
}

/**
 * Format a stock position for display
 * @param {Object} position - The stock position data
 * @returns {Object} Formatted stock position
 */
function formatStockPosition(position) {
  const percentChange = position.percentChange || 
    (position.change / (position.price - position.change) * 100).toFixed(2);
  
  return {
    symbol: position.symbol,
    name: position.name,
    shares: position.quantity,
    price: position.price,
    value: position.value,
    change: position.change,
    percentChange: parseFloat(percentChange)
  };
}

/**
 * Format a crypto position for display
 * @param {Object} position - The crypto position data
 * @returns {Object} Formatted crypto position
 */
function formatCryptoPosition(position) {
  const percentChange = position.percentChange || 
    (position.change / (position.price - position.change) * 100).toFixed(2);
  
  return {
    symbol: position.symbol,
    name: position.name,
    amount: position.quantity,
    price: position.price,
    value: position.value,
    change: position.change,
    percentChange: parseFloat(percentChange)
  };
}

/**
 * Format a real estate holding for display
 * @param {Object} holding - The real estate holding data
 * @returns {Object} Formatted real estate holding
 */
function formatRealEstateHolding(holding) {
  return {
    address: holding.address,
    type: holding.type,
    purchasePrice: holding.purchasePrice,
    currentValue: holding.currentValue,
    equity: holding.currentValue - (holding.mortgage || 0),
    annualRent: holding.annualRent,
    roi: holding.roi,
    yearPurchased: holding.yearPurchased
  };
}

/**
 * Create a human-readable text summary of the portfolio
 * @param {Object} portfolioData - The formatted portfolio data
 * @returns {string} Human-readable summary
 */
export function createPortfolioSummaryText(portfolioData) {
  const { summary, stocks, crypto, realEstate } = portfolioData;
  
  let text = `Portfolio Summary:\n`;
  text += `- Total Value: $${summary.totalPortfolioValue.toLocaleString()}\n`;
  text += `- Stocks: ${summary.stocksCount} positions ($${summary.totalStockValue.toLocaleString()}, ${summary.allocation.stocks.toFixed(1)}%)\n`;
  text += `- Crypto: ${summary.cryptoCount} positions ($${summary.totalCryptoValue.toLocaleString()}, ${summary.allocation.crypto.toFixed(1)}%)\n`;
  text += `- Real Estate: ${summary.realEstateCount} properties ($${summary.totalRealEstateValue.toLocaleString()}, ${summary.allocation.realEstate.toFixed(1)}%)\n\n`;
  
  // Show all stocks instead of just the top 3
  if (stocks.length > 0) {
    text += `All Stock Holdings:\n`;
    const sortedStocks = [...stocks].sort((a, b) => b.value - a.value);
    sortedStocks.forEach(stock => {
      const percentOfPortfolio = (stock.value / summary.totalPortfolioValue * 100).toFixed(1);
      text += `- ${stock.symbol} (${stock.name}): $${stock.value.toLocaleString()} (${stock.shares} shares @ $${stock.price.toLocaleString()}, ${percentOfPortfolio}% of portfolio)\n`;
    });
    text += `\n`;
  }
  
  // Show all crypto instead of just the top 3
  if (crypto.length > 0) {
    text += `All Crypto Holdings:\n`;
    const sortedCrypto = [...crypto].sort((a, b) => b.value - a.value);
    sortedCrypto.forEach(coin => {
      const percentOfPortfolio = (coin.value / summary.totalPortfolioValue * 100).toFixed(1);
      text += `- ${coin.symbol} (${coin.name}): $${coin.value.toLocaleString()} (${coin.amount} coins @ $${coin.price.toLocaleString()}, ${percentOfPortfolio}% of portfolio)\n`;
    });
    text += `\n`;
  }
  
  // Include all real estate holdings with detailed information
  if (realEstate.length > 0) {
    text += `All Real Estate Holdings:\n`;
    realEstate.forEach(property => {
      const equity = property.equity;
      const equityPercentage = ((equity / property.currentValue) * 100).toFixed(1);
      const percentOfPortfolio = (property.currentValue / summary.totalPortfolioValue * 100).toFixed(1);
      const yearsSinceAcquisition = new Date().getFullYear() - property.yearPurchased;
      const appreciation = property.purchasePrice > 0 
        ? ((property.currentValue - property.purchasePrice) / property.purchasePrice * 100).toFixed(1) 
        : 'N/A';
      
      text += `- ${property.address} (${property.type}):\n`;
      text += `  • Current Value: $${property.currentValue.toLocaleString()} (${percentOfPortfolio}% of portfolio)\n`;
      text += `  • Purchase Price: $${property.purchasePrice.toLocaleString()} (${yearsSinceAcquisition} years ago, ${appreciation}% appreciation)\n`;
      text += `  • Equity: $${equity.toLocaleString()} (${equityPercentage}% of property value)\n`;
      
      if (property.annualRent) {
        const grossYield = ((property.annualRent / property.currentValue) * 100).toFixed(1);
        text += `  • Annual Rent: $${property.annualRent.toLocaleString()} (${grossYield}% gross yield)\n`;
      }
      
      if (property.roi) {
        text += `  • ROI: ${property.roi.toFixed(1)}%\n`;
      }
      
      text += `\n`;
    });
  }
  
  return text;
}

/**
 * Injects portfolio data into the document in multiple formats
 * to increase chances of Zapier accessing it
 * @param {Object} portfolioData - The formatted portfolio data 
 */
export function injectPortfolioDataToDOM(portfolioData) {
  // Create hidden divs with data attributes
  const dataContainer = document.createElement('div');
  dataContainer.id = 'trackvest-portfolio-data-container';
  dataContainer.style.display = 'none';
  
  // Add data as attributes
  dataContainer.setAttribute('data-portfolio', JSON.stringify(portfolioData));
  dataContainer.setAttribute('data-stocks', JSON.stringify(portfolioData.stocks));
  dataContainer.setAttribute('data-crypto', JSON.stringify(portfolioData.crypto));
  dataContainer.setAttribute('data-realestate', JSON.stringify(portfolioData.realEstate));
  
  // Create script tag with JSON for more reliable parsing
  const scriptTag = document.createElement('script');
  scriptTag.id = 'trackvest-portfolio-json';
  scriptTag.type = 'application/json';
  scriptTag.textContent = JSON.stringify(portfolioData);
  
  // Add to body
  document.body.appendChild(dataContainer);
  document.body.appendChild(scriptTag);
  
  // Set as globals
  window.TRACKVEST_PORTFOLIO_DATA = portfolioData;
  window.TRACKVEST_PORTFOLIO_TEXT = createPortfolioSummaryText(portfolioData);
  
  // Dispatch custom event with data
  const event = new CustomEvent('trackvestDataUpdated', { 
    detail: { 
      portfolioData,
      timestamp: new Date().toISOString() 
    } 
  });
  document.dispatchEvent(event);
  
  return {
    cleanup: () => {
      // Remove elements
      if (document.body.contains(dataContainer)) {
        document.body.removeChild(dataContainer);
      }
      if (document.body.contains(scriptTag)) {
        document.body.removeChild(scriptTag);
      }
      // Remove globals
      delete window.TRACKVEST_PORTFOLIO_DATA;
      delete window.TRACKVEST_PORTFOLIO_TEXT;
    }
  };
} 