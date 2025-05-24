/**
 * Local chart cache utility
 * Handles persistent caching of chart data across page refreshes
 * Cache is automatically cleared when the browser is closed or localhost is shut down
 */

const CACHE_KEY_PREFIX = 'tv_chart_';
const CACHE_META_KEY = 'tv_chart_meta';

/**
 * Save chart data to local storage
 * @param {string} chartId - Unique identifier for the chart
 * @param {object} chartData - Chart data to cache
 * @param {Date} timestamp - When the chart was last updated
 */
export const saveChartToCache = (chartId, chartData, timestamp) => {
  try {
    // Store the chart data
    localStorage.setItem(
      `${CACHE_KEY_PREFIX}${chartId}`, 
      JSON.stringify({
        data: chartData,
        timestamp: timestamp ? timestamp.toISOString() : new Date().toISOString()
      })
    );
    
    // Update the chart index
    updateChartIndex(chartId);
    
    return true;
  } catch (error) {
    console.error('Failed to cache chart data:', error);
    // If storage quota is exceeded, try to clear oldest charts
    if (error.name === 'QuotaExceededError') {
      clearOldestCharts();
      // Try again
      try {
        localStorage.setItem(
          `${CACHE_KEY_PREFIX}${chartId}`, 
          JSON.stringify({
            data: chartData,
            timestamp: timestamp ? timestamp.toISOString() : new Date().toISOString()
          })
        );
        updateChartIndex(chartId);
        return true;
      } catch (retryError) {
        console.error('Still failed to cache chart data after clearing space:', retryError);
        return false;
      }
    }
    return false;
  }
};

/**
 * Load a chart from cache
 * @param {string} chartId - Chart ID to load
 * @return {object|null} - Chart data or null if not found
 */
export const loadChartFromCache = (chartId) => {
  try {
    const cachedItem = localStorage.getItem(`${CACHE_KEY_PREFIX}${chartId}`);
    if (!cachedItem) return null;
    
    const parsed = JSON.parse(cachedItem);
    return {
      chartData: parsed.data,
      timestamp: new Date(parsed.timestamp)
    };
  } catch (error) {
    console.error(`Failed to load cached chart ${chartId}:`, error);
    return null;
  }
};

/**
 * Load all cached charts
 * @return {Array} - Array of chart objects with id, data and timestamp
 */
export const loadAllCachedCharts = () => {
  try {
    const metaString = localStorage.getItem(CACHE_META_KEY);
    if (!metaString) return [];
    
    const chartIds = JSON.parse(metaString).charts || [];
    return chartIds
      .map(chartId => {
        const cachedData = loadChartFromCache(chartId);
        if (!cachedData) return null;
        
        return {
          id: chartId,
          data: cachedData.chartData,
          timestamp: cachedData.timestamp
        };
      })
      .filter(chart => chart !== null);
  } catch (error) {
    console.error('Failed to load all cached charts:', error);
    return [];
  }
};

/**
 * Remove a chart from cache
 * @param {string} chartId - Chart ID to remove
 */
export const removeChartFromCache = (chartId) => {
  try {
    localStorage.removeItem(`${CACHE_KEY_PREFIX}${chartId}`);
    
    // Update the chart index
    const metaString = localStorage.getItem(CACHE_META_KEY);
    if (metaString) {
      const meta = JSON.parse(metaString);
      meta.charts = (meta.charts || []).filter(id => id !== chartId);
      localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
    }
    
    return true;
  } catch (error) {
    console.error(`Failed to remove chart ${chartId} from cache:`, error);
    return false;
  }
};

/**
 * Clear all cached charts
 */
export const clearChartCache = () => {
  try {
    // Get list of all charts first
    const metaString = localStorage.getItem(CACHE_META_KEY);
    if (metaString) {
      const meta = JSON.parse(metaString);
      const chartIds = meta.charts || [];
      
      // Remove each chart
      chartIds.forEach(chartId => {
        localStorage.removeItem(`${CACHE_KEY_PREFIX}${chartId}`);
      });
    }
    
    // Clear the index
    localStorage.removeItem(CACHE_META_KEY);
    
    return true;
  } catch (error) {
    console.error('Failed to clear chart cache:', error);
    return false;
  }
};

/**
 * Update the chart index when adding a new chart
 * @param {string} chartId - Chart ID to add to index
 * @private
 */
const updateChartIndex = (chartId) => {
  try {
    const metaString = localStorage.getItem(CACHE_META_KEY);
    const meta = metaString ? JSON.parse(metaString) : { charts: [] };
    
    // Only add the chart if it's not already in the list
    if (!meta.charts.includes(chartId)) {
      meta.charts.push(chartId);
      meta.lastUpdated = new Date().toISOString();
      
      localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
    }
  } catch (error) {
    console.error('Failed to update chart index:', error);
  }
};

/**
 * Clear older charts when storage is full
 * @private
 */
const clearOldestCharts = () => {
  try {
    const cachedCharts = loadAllCachedCharts();
    
    // Sort by timestamp (oldest first)
    cachedCharts.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove the oldest 25% of charts
    const chartsToRemove = Math.max(1, Math.floor(cachedCharts.length * 0.25));
    
    for (let i = 0; i < chartsToRemove && i < cachedCharts.length; i++) {
      removeChartFromCache(cachedCharts[i].id);
    }
  } catch (error) {
    console.error('Failed to clear oldest charts:', error);
  }
};

/**
 * Check if the cache contains a chart
 * @param {string} chartId - Chart ID to check
 * @return {boolean} - True if the chart exists in cache
 */
export const hasChartInCache = (chartId) => {
  return localStorage.getItem(`${CACHE_KEY_PREFIX}${chartId}`) !== null;
};

/**
 * Get the timestamp when a chart was last updated
 * @param {string} chartId - Chart ID to check
 * @return {Date|null} - Timestamp or null if not found
 */
export const getChartCacheTimestamp = (chartId) => {
  try {
    const cachedItem = localStorage.getItem(`${CACHE_KEY_PREFIX}${chartId}`);
    if (!cachedItem) return null;
    
    const parsed = JSON.parse(cachedItem);
    return new Date(parsed.timestamp);
  } catch (error) {
    console.error(`Failed to get cached chart timestamp for ${chartId}:`, error);
    return null;
  }
}; 