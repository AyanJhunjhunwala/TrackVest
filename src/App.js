import React, { useState, useEffect } from 'react';
import { fetchCryptoPrice } from './hooks';

function App() {
  const [cryptoData, setCryptoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testCryptoApi = async () => {
    setLoading(true);
    setError(null);
    try {
      // Test fetching BTC price
      const btcPrice = await fetchCryptoPrice('BTC');
      console.log('Bitcoin price:', btcPrice);
      
      // Test fetching ETH price
      const ethPrice = await fetchCryptoPrice('ETH');
      console.log('Ethereum price:', ethPrice);
      
      setCryptoData({
        BTC: btcPrice,
        ETH: ethPrice
      });
    } catch (err) {
      console.error('Error fetching crypto data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Crypto API Test</h1>
        <button onClick={testCryptoApi} disabled={loading}>
          {loading ? 'Loading...' : 'Test Crypto API'}
        </button>
        
        {error && (
          <div style={{ color: 'red', margin: '20px 0' }}>
            Error: {error}
          </div>
        )}
        
        {cryptoData && (
          <div style={{ margin: '20px 0' }}>
            <h2>Crypto Prices</h2>
            <div>Bitcoin (BTC): ${cryptoData.BTC?.toFixed(2)}</div>
            <div>Ethereum (ETH): ${cryptoData.ETH?.toFixed(2)}</div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App; 