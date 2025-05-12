import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Set up __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// For stock and crypto logos
const stockLogos = {
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
  "JPM": "https://logo.clearbit.com/jpmorganchase.com",
  "BAC": "https://logo.clearbit.com/bankofamerica.com",
  "WFC": "https://logo.clearbit.com/wellsfargo.com",
  "GS": "https://logo.clearbit.com/goldmansachs.com",
  "MS": "https://logo.clearbit.com/morganstanley.com",
  "V": "https://logo.clearbit.com/visa.com",
  "MA": "https://logo.clearbit.com/mastercard.com",
  "AXP": "https://logo.clearbit.com/americanexpress.com",
  "WMT": "https://logo.clearbit.com/walmart.com",
  "TGT": "https://logo.clearbit.com/target.com",
  "HD": "https://logo.clearbit.com/homedepot.com",
  "LOW": "https://logo.clearbit.com/lowes.com",
  "SBUX": "https://logo.clearbit.com/starbucks.com",
  "MCD": "https://logo.clearbit.com/mcdonalds.com",
  "NKE": "https://logo.clearbit.com/nike.com",
  "DIS": "https://logo.clearbit.com/disney.com",
  "JNJ": "https://logo.clearbit.com/jnj.com",
  "PFE": "https://logo.clearbit.com/pfizer.com",
  "ABBV": "https://logo.clearbit.com/abbvie.com",
  "MRK": "https://logo.clearbit.com/merck.com",
  "UNH": "https://logo.clearbit.com/unitedhealthgroup.com",
  "T": "https://logo.clearbit.com/att.com",
  "VZ": "https://logo.clearbit.com/verizon.com",
  "XOM": "https://logo.clearbit.com/exxonmobil.com",
  "CVX": "https://logo.clearbit.com/chevron.com",
};

const cryptoLogos = {
  "BTC": "https://cryptologos.cc/logos/bitcoin-btc-logo.png", 
  "ETH": "https://cryptologos.cc/logos/ethereum-eth-logo.png",
  "USDT": "https://cryptologos.cc/logos/tether-usdt-logo.png",
  "BNB": "https://cryptologos.cc/logos/bnb-bnb-logo.png",
  "SOL": "https://cryptologos.cc/logos/solana-sol-logo.png", 
  "XRP": "https://cryptologos.cc/logos/xrp-xrp-logo.png",
  "USDC": "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  "ADA": "https://cryptologos.cc/logos/cardano-ada-logo.png",
  "AVAX": "https://cryptologos.cc/logos/avalanche-avax-logo.png",
  "DOGE": "https://cryptologos.cc/logos/dogecoin-doge-logo.png", 
  "DOT": "https://cryptologos.cc/logos/polkadot-new-dot-logo.png",
  "MATIC": "https://cryptologos.cc/logos/polygon-matic-logo.png", 
  "LINK": "https://cryptologos.cc/logos/chainlink-link-logo.png",
  "SHIB": "https://cryptologos.cc/logos/shiba-inu-shib-logo.png",
  "LTC": "https://cryptologos.cc/logos/litecoin-ltc-logo.png",
  "DAI": "https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png",
  "UNI": "https://cryptologos.cc/logos/uniswap-uni-logo.png",
  "ATOM": "https://cryptologos.cc/logos/cosmos-atom-logo.png",
  "NEAR": "https://cryptologos.cc/logos/near-protocol-near-logo.png",
  "ALGO": "https://cryptologos.cc/logos/algorand-algo-logo.png",
  "BCH": "https://cryptologos.cc/logos/bitcoin-cash-bch-logo.png",
  "FIL": "https://cryptologos.cc/logos/filecoin-fil-logo.png",
  "XMR": "https://cryptologos.cc/logos/monero-xmr-logo.png",
  "XLM": "https://cryptologos.cc/logos/stellar-xlm-logo.png",
  "ETC": "https://cryptologos.cc/logos/ethereum-classic-etc-logo.png",
  "APE": "https://cryptologos.cc/logos/apecoin-ape-logo.png",
  "SAND": "https://cryptologos.cc/logos/the-sandbox-sand-logo.png",
  "MANA": "https://cryptologos.cc/logos/decentraland-mana-logo.png",
  "AXS": "https://cryptologos.cc/logos/axie-infinity-axs-logo.png",
  "EGLD": "https://cryptologos.cc/logos/multiversx-egld-logo.png",
  "FLOW": "https://cryptologos.cc/logos/flow-flow-logo.png",
  "STX": "https://cryptologos.cc/logos/stacks-stx-logo.png",
  "GALA": "https://cryptologos.cc/logos/gala-gala-logo.png",
  "CAKE": "https://cryptologos.cc/logos/pancakeswap-cake-logo.png",
  "CRO": "https://cryptologos.cc/logos/cronos-cro-logo.png",
  "GRT": "https://cryptologos.cc/logos/the-graph-grt-logo.png",
  "ENJ": "https://cryptologos.cc/logos/enjin-coin-enj-logo.png",
  "CHZ": "https://cryptologos.cc/logos/chiliz-chz-logo.png",
  "BAT": "https://cryptologos.cc/logos/basic-attention-token-bat-logo.png",
  "LRC": "https://cryptologos.cc/logos/loopring-lrc-logo.png",
};

// Initialize database
const dbPath = path.join(__dirname, 'db', 'trackvest.db');
const db = new Database(dbPath);

// Make directory if it doesn't exist
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Stock data
const stocks = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', price: 188.85 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', price: 410.34 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', price: 178.75 },
  { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', sector: 'Communication Services', price: 164.37 },
  { symbol: 'GOOG', name: 'Alphabet Inc. Class C', sector: 'Communication Services', price: 165.92 },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', price: 474.99 },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical', price: 175.34 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', price: 106.13 },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', sector: 'Financial Services', price: 408.76 },
  { symbol: 'BRK.A', name: 'Berkshire Hathaway Inc. Class A', sector: 'Financial Services', price: 616055.03 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial Services', price: 203.27 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', price: 150.89 },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financial Services', price: 273.62 },
  { symbol: 'PG', name: 'Procter & Gamble Company', sector: 'Consumer Defensive', price: 165.87 },
  { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', sector: 'Healthcare', price: 565.75 },
  { symbol: 'HD', name: 'Home Depot Inc.', sector: 'Consumer Cyclical', price: 335.09 },
  { symbol: 'MA', name: 'Mastercard Incorporated', sector: 'Financial Services', price: 467.65 },
  { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', price: 1283.64 },
  { symbol: 'LLY', name: 'Eli Lilly and Company', sector: 'Healthcare', price: 904.61 },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', price: 117.67 },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', price: 28.72 },
  { symbol: 'CSCO', name: 'Cisco Systems Inc.', sector: 'Technology', price: 47.22 },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer Defensive', price: 60.76 },
  { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy', price: 151.10 },
  { symbol: 'KO', name: 'Coca-Cola Company', sector: 'Consumer Defensive', price: 62.11 },
  { symbol: 'MRK', name: 'Merck & Co. Inc.', sector: 'Healthcare', price: 122.25 },
  { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Defensive', price: 171.44 },
  { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', price: 169.12 },
  { symbol: 'ORCL', name: 'Oracle Corporation', sector: 'Technology', price: 136.46 },
  { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology', price: 278.96 },
  { symbol: 'COST', name: 'Costco Wholesale Corporation', sector: 'Consumer Defensive', price: 884.04 },
  { symbol: 'TMO', name: 'Thermo Fisher Scientific Inc.', sector: 'Healthcare', price: 569.46 },
  { symbol: 'ACN', name: 'Accenture plc', sector: 'Technology', price: 336.38 },
  { symbol: 'MCD', name: 'McDonald\'s Corporation', sector: 'Consumer Cyclical', price: 271.78 },
  { symbol: 'ABT', name: 'Abbott Laboratories', sector: 'Healthcare', price: 109.12 },
  { symbol: 'DHR', name: 'Danaher Corporation', sector: 'Healthcare', price: 248.10 },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Communication Services', price: 623.69 },
  { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', sector: 'Technology', price: 156.14 },
  { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Technology', price: 539.80 },
  { symbol: 'WFC', name: 'Wells Fargo & Company', sector: 'Financial Services', price: 57.87 },
  { symbol: 'BAC', name: 'Bank of America Corp', sector: 'Financial Services', price: 38.17 },
  { symbol: 'PM', name: 'Philip Morris International Inc.', sector: 'Consumer Defensive', price: 90.22 },
  { symbol: 'DIS', name: 'Walt Disney Company', sector: 'Communication Services', price: 88.10 },
  { symbol: 'CMCSA', name: 'Comcast Corporation', sector: 'Communication Services', price: 41.30 },
  { symbol: 'INTC', name: 'Intel Corporation', sector: 'Technology', price: 34.37 },
  { symbol: 'NKE', name: 'Nike Inc.', sector: 'Consumer Cyclical', price: 92.23 },
  { symbol: 'TXN', name: 'Texas Instruments Incorporated', sector: 'Technology', price: 196.37 },
  { symbol: 'VZ', name: 'Verizon Communications Inc.', sector: 'Communication Services', price: 39.03 },
  { symbol: 'UPS', name: 'United Parcel Service Inc.', sector: 'Industrials', price: 132.08 },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', sector: 'Financial Services', price: 61.23 },
];

// Cryptocurrency data
const cryptocurrencies = [
  { symbol: 'BTC', name: 'Bitcoin', price: 69420.21 },
  { symbol: 'ETH', name: 'Ethereum', price: 3456.78 },
  { symbol: 'USDT', name: 'Tether', price: 1.00 },
  { symbol: 'BNB', name: 'Binance Coin', price: 574.32 },
  { symbol: 'SOL', name: 'Solana', price: 143.21 },
  { symbol: 'XRP', name: 'Ripple', price: 0.56 },
  { symbol: 'USDC', name: 'USD Coin', price: 1.00 },
  { symbol: 'ADA', name: 'Cardano', price: 0.45 },
  { symbol: 'AVAX', name: 'Avalanche', price: 34.76 },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.11 },
  { symbol: 'DOT', name: 'Polkadot', price: 7.23 },
  { symbol: 'MATIC', name: 'Polygon', price: 0.87 },
  { symbol: 'LINK', name: 'Chainlink', price: 15.32 },
  { symbol: 'SHIB', name: 'Shiba Inu', price: 0.000024 },
  { symbol: 'LTC', name: 'Litecoin', price: 76.54 },
  { symbol: 'DAI', name: 'Dai', price: 1.00 },
  { symbol: 'UNI', name: 'Uniswap', price: 7.81 },
  { symbol: 'ATOM', name: 'Cosmos', price: 9.43 },
  { symbol: 'NEAR', name: 'NEAR Protocol', price: 6.78 },
  { symbol: 'ALGO', name: 'Algorand', price: 0.18 },
  { symbol: 'BCH', name: 'Bitcoin Cash', price: 345.67 },
  { symbol: 'FIL', name: 'Filecoin', price: 4.56 },
  { symbol: 'XMR', name: 'Monero', price: 167.89 },
  { symbol: 'XLM', name: 'Stellar', price: 0.12 },
  { symbol: 'ETC', name: 'Ethereum Classic', price: 24.56 },
  { symbol: 'APE', name: 'ApeCoin', price: 1.23 },
  { symbol: 'SAND', name: 'The Sandbox', price: 0.42 },
  { symbol: 'MANA', name: 'Decentraland', price: 0.38 },
  { symbol: 'AXS', name: 'Axie Infinity', price: 8.90 },
  { symbol: 'EGLD', name: 'MultiversX', price: 45.67 },
  { symbol: 'FLOW', name: 'Flow', price: 0.65 },
  { symbol: 'STX', name: 'Stacks', price: 1.78 },
  { symbol: 'GALA', name: 'Gala', price: 0.024 },
  { symbol: 'CAKE', name: 'PancakeSwap', price: 2.34 },
  { symbol: 'CRO', name: 'Cronos', price: 0.089 },
  { symbol: 'GRT', name: 'The Graph', price: 0.18 },
  { symbol: 'ENJ', name: 'Enjin Coin', price: 0.32 },
  { symbol: 'CHZ', name: 'Chiliz', price: 0.078 },
  { symbol: 'BAT', name: 'Basic Attention Token', price: 0.25 },
  { symbol: 'LRC', name: 'Loopring', price: 0.32 }
];

// Add logos to the data
stocks.forEach(stock => {
  stock.logo_url = stockLogos[stock.symbol] || 
    `https://logo.clearbit.com/${stock.symbol.toLowerCase()}.com` || 
    `https://ui-avatars.com/api/?name=${stock.symbol}&background=random&color=fff&size=128`;
});

cryptocurrencies.forEach(crypto => {
  crypto.logo_url = cryptoLogos[crypto.symbol] || 
    `https://cryptologos.cc/logos/${crypto.symbol.toLowerCase()}-${crypto.symbol.toLowerCase()}-logo.png` ||
    `https://ui-avatars.com/api/?name=${crypto.symbol}&background=7137c8&color=fff&size=128`;
});

// Set up database
db.exec(`
  CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    logo_url TEXT,
    sector TEXT,
    price REAL
  );

  CREATE TABLE IF NOT EXISTS cryptocurrencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    logo_url TEXT,
    price REAL
  );
`);

// Clear existing data
const clearStocks = db.prepare('DELETE FROM stocks');
const clearCrypto = db.prepare('DELETE FROM cryptocurrencies');

// Insert statements
const insertStock = db.prepare('INSERT OR REPLACE INTO stocks (symbol, name, logo_url, sector, price) VALUES (?, ?, ?, ?, ?)');
const insertCrypto = db.prepare('INSERT OR REPLACE INTO cryptocurrencies (symbol, name, logo_url, price) VALUES (?, ?, ?, ?)');

// Seed database in a transaction
function seedDatabase() {
  // Begin transaction
  const transaction = db.transaction(() => {
    // Clear existing data
    clearStocks.run();
    clearCrypto.run();
    
    // Insert stocks
    for (const stock of stocks) {
      insertStock.run(stock.symbol, stock.name, stock.logo_url, stock.sector, stock.price);
    }
    
    // Insert cryptocurrencies
    for (const crypto of cryptocurrencies) {
      insertCrypto.run(crypto.symbol, crypto.name, crypto.logo_url, crypto.price);
    }
  });
  
  // Execute transaction
  transaction();
  
  console.log(`Database seeded successfully with ${stocks.length} stocks and ${cryptocurrencies.length} cryptocurrencies`);
}

// Run the seeder
seedDatabase(); 