/**
 * This directive is used to instruct the Zapier chatbot on how to use the portfolio data
 * It can be used in the chatbot's system prompt
 */

export const zapierChatbotDirective = `
You are an AI portfolio assistant for TrackVest users. You have access to the user's investment portfolio data, which includes stocks, cryptocurrencies, and real estate holdings.

# Available Data Sources

You can access the user's portfolio data in several ways:
1. Through global variables: window.TRACKVEST_PORTFOLIO_DATA, window.TRACKVEST_PORTFOLIO_TEXT
2. Through data attributes in the chatbot element: data-portfolio, data-stocks, data-crypto, data-realestate, data-summary
3. Through a custom event: 'trackvestDataLoaded' which includes portfolioData and portfolioSummaryText

# Data Structure

The portfolio data is structured as follows:

## Summary Object
- stocksCount: Number of stock positions
- cryptoCount: Number of crypto positions
- realEstateCount: Number of real estate properties
- totalStockValue: Total value of stock holdings
- totalCryptoValue: Total value of crypto holdings
- totalRealEstateValue: Total value of real estate holdings
- totalPortfolioValue: Total value of all assets
- allocation: Percentage allocation across asset classes

## Stocks Array
Each stock object contains:
- symbol: Stock ticker symbol
- name: Company name
- shares: Number of shares owned
- price: Current price per share
- value: Total value of the position
- change: Price change
- percentChange: Percentage price change

## Crypto Array
Each crypto object contains:
- symbol: Cryptocurrency symbol
- name: Cryptocurrency name
- amount: Number of coins owned
- price: Current price per coin
- value: Total value of the position
- change: Price change
- percentChange: Percentage price change

## Real Estate Array
Each property object contains:
- address: Property address
- type: Property type (e.g., Residential, Commercial)
- purchasePrice: Original purchase price
- currentValue: Current estimated value
- equity: Current equity (value minus mortgage)
- annualRent: Annual rental income
- roi: Return on investment
- yearPurchased: Year when the property was purchased

# How to Respond to User Questions

When users ask about their portfolio:

1. Provide concise, accurate information about their investments
2. For performance questions, focus on values, changes, and percentages
3. Offer insights about asset allocation and diversification
4. Be specific about individual holdings when asked
5. Be friendly but professional

# Examples of User Questions and Responses

User: "How is my portfolio doing?"
Response: "Your portfolio is currently valued at $[totalPortfolioValue], with stocks representing [allocation.stocks]%, crypto [allocation.crypto]%, and real estate [allocation.realEstate]%. [Add recent performance information if available]"

User: "What are my top holdings?"
Response: [List top 3 holdings from each asset class by value]

User: "How much Apple stock do I own?"
Response: [Find AAPL in stocks array and provide shares, value, and performance]

Remember to tailor your responses based on the actual data in the user's portfolio.
`;

/**
 * Returns a formatted directive with real portfolio data included
 * @param {Object} portfolioData - The portfolio data object
 * @returns {string} - Directive with real data
 */
export function getDirectiveWithData(portfolioData) {
  const { summary, stocks, crypto, realEstate } = portfolioData;
  
  // Get top holdings 
  const topStocks = [...stocks].sort((a, b) => b.value - a.value).slice(0, 3);
  const topCrypto = [...crypto].sort((a, b) => b.value - a.value).slice(0, 3);
  
  // Format top holdings text
  let topHoldingsText = "Top Holdings:\n";
  
  if (topStocks.length > 0) {
    topHoldingsText += "Stocks:\n";
    topStocks.forEach((stock, i) => {
      topHoldingsText += `${i+1}. ${stock.symbol} (${stock.name}): $${stock.value.toLocaleString()} (${stock.shares} shares)\n`;
    });
  }
  
  if (topCrypto.length > 0) {
    topHoldingsText += "\nCrypto:\n";
    topCrypto.forEach((coin, i) => {
      topHoldingsText += `${i+1}. ${coin.symbol} (${coin.name}): $${coin.value.toLocaleString()} (${coin.amount} coins)\n`;
    });
  }
  
  if (realEstate.length > 0) {
    topHoldingsText += "\nReal Estate:\n";
    realEstate.sort((a, b) => b.currentValue - a.currentValue)
      .slice(0, 3)
      .forEach((property, i) => {
        topHoldingsText += `${i+1}. ${property.address}: $${property.currentValue.toLocaleString()} (Equity: $${property.equity.toLocaleString()})\n`;
      });
  }
  
  // Add portfolio summary section
  const portfolioSummary = `
# Current Portfolio Summary

Total Portfolio Value: $${summary.totalPortfolioValue.toLocaleString()}

Asset Allocation:
- Stocks: ${summary.allocation.stocks.toFixed(1)}% ($${summary.totalStockValue.toLocaleString()})
- Crypto: ${summary.allocation.crypto.toFixed(1)}% ($${summary.totalCryptoValue.toLocaleString()})
- Real Estate: ${summary.allocation.realEstate.toFixed(1)}% ($${summary.totalRealEstateValue.toLocaleString()})

${topHoldingsText}
`;
  
  return zapierChatbotDirective + portfolioSummary;
}

/**
 * Returns a formatted script to inject the directive into the chatbot
 * @param {Object} portfolioData - The portfolio data object
 * @returns {string} - HTML script element with directive
 */
export function getDirectiveScript(portfolioData) {
  const directive = getDirectiveWithData(portfolioData);
  const escapedDirective = directive.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  
  return `
<script type="application/json" id="trackvest-directive">
  {
    "directive": "${escapedDirective}"
  }
</script>
  `;
} 