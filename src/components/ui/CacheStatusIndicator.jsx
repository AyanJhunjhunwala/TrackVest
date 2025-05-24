import React, { useState, useEffect } from 'react';
import { hasChartInCache, getChartCacheTimestamp } from '../../utils/localChartCache';

/**
 * Component to display cache status for charts
 * Shows a small indicator when chart data is loaded from cache
 */
const CacheStatusIndicator = ({ chartId, darkMode = false }) => {
  const [cacheStatus, setCacheStatus] = useState({
    isFromCache: false,
    timestamp: null
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if this chart is from cache
    if (hasChartInCache(chartId)) {
      const timestamp = getChartCacheTimestamp(chartId);
      setCacheStatus({
        isFromCache: true,
        timestamp
      });
      setVisible(true);
      
      // Hide after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [chartId]);

  // If not from cache or not visible, return null
  if (!cacheStatus.isFromCache || !visible) {
    return null;
  }

  // Format the timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    // Format based on how old the timestamp is
    const now = new Date();
    const diff = now - timestamp;
    
    // If less than a minute ago
    if (diff < 60000) {
      return 'just now';
    }
    
    // If less than an hour ago
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    
    // If less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
    
    // Default: Show date
    return timestamp.toLocaleString();
  };

  return (
    <div 
      className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs transition-opacity duration-300 ${
        darkMode 
          ? 'bg-slate-700/90 text-slate-300 border border-slate-600' 
          : 'bg-slate-100/90 text-slate-600 border border-slate-200'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-500'}`}></span>
        <span>Loaded from cache</span>
        {cacheStatus.timestamp && (
          <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            ({formatTime(cacheStatus.timestamp)})
          </span>
        )}
      </div>
    </div>
  );
};

export default CacheStatusIndicator; 