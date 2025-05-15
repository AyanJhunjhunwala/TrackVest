import React, { useState, useEffect } from 'react';
import GeminiChat from './GeminiChat';
import InsightsTab, { addInsightProgrammatically } from './components/InsightsTab';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  
  // Sample portfolio data
  const samplePositions = [
    { symbol: 'AAPL', name: 'Apple Inc.', shares: 10, costBasis: 150, currentPrice: 190 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', shares: 5, costBasis: 250, currentPrice: 320 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 2, costBasis: 1200, currentPrice: 1350 }
  ];
  
  const sampleRealEstate = [
    { id: 1, address: '123 Main St', initialValue: 400000, currentValue: 450000 },
    { id: 2, address: '456 Elm St', initialValue: 300000, currentValue: 320000 }
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
            TrackVest
          </h1>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`px-4 py-2 rounded-md ${darkMode ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-800'}`}
          >
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className={`rounded-lg border shadow-sm overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
              <InsightsTab darkMode={darkMode} />
            </div>
          </div>
          
          <div className="lg:col-span-4">
            <div className={`rounded-lg border p-4 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
              <h2 className="text-xl font-semibold mb-4">Portfolio Summary</h2>
              <div className="space-y-2">
                {samplePositions.map(position => (
                  <div key={position.symbol} className="flex justify-between">
                    <span>{position.symbol}</span>
                    <span>${position.currentPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Pass the addInsightProgrammatically function as a prop to GeminiChat */}
      <GeminiChat 
        darkMode={darkMode} 
        positions={samplePositions} 
        realEstateHoldings={sampleRealEstate}
        onAddInsight={addInsightProgrammatically}
      />
    </div>
  );
} 