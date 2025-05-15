import React from 'react';
import Chart from "./ui/Chart";
import ComparisonChart from "./ui/ComparisonChart";

export default function InsightsTab({ darkMode }) {
  return (
    <div className={`p-4 ${darkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Portfolio Insights</h2>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Static visualizations about your portfolio and financial assets
        </p>
      </div>
      
      <div className={`text-center py-10 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        <p>Portfolio analytics visualizations are available in the Insights tab.</p>
      </div>
    </div>
  );
} 