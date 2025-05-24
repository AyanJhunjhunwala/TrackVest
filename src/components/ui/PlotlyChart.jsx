import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist';
import { Trash2 } from 'lucide-react';

export default function PlotlyChart({
  data = [],
  layout = {},
  config = { responsive: true },
  title = '',
  darkMode = false,
  width = '100%',
  height = 300,
  onDelete, // Optional callback to delete the chart
}) {
  const chartRef = useRef(null);
  const [hovered, setHovered] = React.useState(false);

  // Theme-aware default layout settings
  const defaultLayout = {
    template: 'plotly_white',
    paper_bgcolor: darkMode ? 'rgb(15, 23, 42)' : 'white',
    plot_bgcolor: darkMode ? 'rgb(30, 41, 59)' : 'rgb(248, 250, 252)',
    font: {
      family: 'Inter, system-ui, sans-serif',
      color: darkMode ? 'rgb(226, 232, 240)' : 'rgb(51, 65, 85)',
    },
    margin: { t: 50, r: 30, b: 50, l: 60 },
    xaxis: {
      gridwidth: 1,
      gridcolor: darkMode ? 'rgba(148, 163, 184, 0.15)' : 'rgba(203, 213, 225, 0.5)',
      linewidth: 0.2,
      linecolor: darkMode ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)'
    },
    yaxis: {
      gridwidth: 1,
      gridcolor: darkMode ? 'rgba(148, 163, 184, 0.15)' : 'rgba(203, 213, 225, 0.5)',
      linewidth: 0.2,
      linecolor: darkMode ? 'rgb(100, 116, 139)' : 'rgb(148, 163, 184)'
    },
    hoverlabel: {
      bgcolor: darkMode ? 'rgb(51, 65, 85)' : 'white',
      font: {
        color: darkMode ? 'rgb(226, 232, 240)' : 'rgb(51, 65, 85)',
        family: 'Inter, system-ui, sans-serif'
      },
      bordercolor: darkMode ? 'rgb(71, 85, 105)' : 'rgb(203, 213, 225)'
    }
  };

  // Initialize and update chart when props change
  useEffect(() => {
    if (chartRef.current && Array.isArray(data) && data.length > 0) {
      const mergedLayout = {
        ...defaultLayout,
        ...layout,
        title: title || layout.title, // Use provided title or from layout
      };

      Plotly.react(chartRef.current, data, mergedLayout, config);
    }
  }, [data, layout, config, title, darkMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        Plotly.purge(chartRef.current);
      }
    };
  }, []);

  // Handle window resize for responsive charts
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        Plotly.relayout(chartRef.current, {
          'width': chartRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className={`flex items-center justify-center border rounded-md h-[300px] ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
        No data available for chart
      </div>
    );
  }

  return (
    <div 
      className="w-full relative" 
      onMouseEnter={() => setHovered(true)} 
      onMouseLeave={() => setHovered(false)}
      style={{ width: width, height: height }}
    >
      {/* Delete button that appears on hover */}
      {hovered && onDelete && (
        <button
          onClick={onDelete}
          className={`absolute top-2 right-2 z-10 p-1 rounded-full ${
            darkMode 
              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' 
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
          title="Delete chart"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      
      <div 
        ref={chartRef} 
        className="w-full h-full"
      />
    </div>
  );
} 