import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Cache for market holidays to avoid repeated API calls
let marketHolidaysCache = {
  fetchedAt: null,
  holidays: [],
  validUntil: null
};

// Cache for search results to reduce API calls
let searchCache = {
  stocks: {},  // Cache by query string
  crypto: {}   // Separate cache for crypto searches
};

// Helper function to clean and normalize search queries for caching
const normalizeSearchQuery = (query) => {
  return query.trim().toLowerCase();
};

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Market holidays endpoint
app.get('/api/polygon/market-holidays', async (req, res) => {
  try {
    const { apiKey } = req.query;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'Missing required parameter: apiKey' });
    }
    
    // Use cache if available and not expired (cache for 24 hours)
    const now = new Date();
    if (marketHolidaysCache.validUntil && now < marketHolidaysCache.validUntil) {
      console.log('Using cached market holidays data');
      return res.json({ 
        status: 'OK', 
        cached: true, 
        fetchedAt: marketHolidaysCache.fetchedAt,
        holidays: marketHolidaysCache.holidays 
      });
    }
    
    // Generate mock market holidays data
    const currentYear = new Date().getFullYear();
    const mockHolidays = [
      {
        date: `${currentYear}-01-01T00:00:00.000Z`,
        exchange: "NYSE",
        name: "New Year's Day",
        status: "closed"
      },
      {
        date: `${currentYear}-01-17T00:00:00.000Z`,
        exchange: "NYSE",
        name: "Martin Luther King Jr. Day",
        status: "closed"
      },
      {
        date: `${currentYear}-02-21T00:00:00.000Z`,
        exchange: "NYSE",
        name: "Presidents' Day",
        status: "closed"
      },
      {
        date: `${currentYear}-04-15T00:00:00.000Z`,
        exchange: "NYSE",
        name: "Good Friday",
        status: "closed"
      },
      {
        date: `${currentYear}-05-30T00:00:00.000Z`,
        exchange: "NYSE",
        name: "Memorial Day",
        status: "closed"
      },
      {
        date: `${currentYear}-06-20T00:00:00.000Z`,
        exchange: "NYSE",
        name: "Juneteenth",
        status: "closed"
      },
      {
        date: `${currentYear}-07-04T00:00:00.000Z`,
        exchange: "NYSE",
        name: "Independence Day",
        status: "closed"
      },
      {
        date: `${currentYear}-09-05T00:00:00.000Z`,
        exchange: "NYSE",
        name: "Labor Day",
        status: "closed"
      },
      {
        date: `${currentYear}-11-24T00:00:00.000Z`,
        exchange: "NYSE",
        name: "Thanksgiving Day",
        status: "closed"
      },
      {
        date: `${currentYear}-12-25T00:00:00.000Z`,
        exchange: "NYSE",
        name: "Christmas Day",
        status: "closed"
      }
    ];
    
    // Update cache with expiration of 24 hours
    marketHolidaysCache = {
      fetchedAt: now.toISOString(),
      holidays: mockHolidays,
      validUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours cache
    };
    
    res.json({ 
      status: 'OK', 
      cached: false,
      fetchedAt: marketHolidaysCache.fetchedAt,
      holidays: mockHolidays 
    });
  } catch (error) {
    console.error('Error fetching market holidays:', error);
    res.status(500).json({ error: 'Failed to fetch market holidays' });
  }
});

// Check if a specific date is a market holiday
app.get('/api/polygon/is-market-holiday', async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Ensure we have holiday data
    let holidays = marketHolidaysCache.holidays;
    
    if (!holidays.length) {
      // Use mock holidays
      const currentYear = new Date().getFullYear();
      holidays = [
        `${currentYear}-01-01`, // New Year's Day
        `${currentYear}-01-17`, // MLK Day
        `${currentYear}-02-21`, // Presidents' Day
        `${currentYear}-04-15`, // Good Friday
        `${currentYear}-05-30`, // Memorial Day
        `${currentYear}-06-20`, // Juneteenth
        `${currentYear}-07-04`, // Independence Day
        `${currentYear}-09-05`, // Labor Day
        `${currentYear}-11-24`, // Thanksgiving
        `${currentYear}-12-25`  // Christmas
      ];
    }
    
    // Check if the date is a holiday
    const formattedDate = date.split('T')[0]; // Ensure we're using YYYY-MM-DD format
    const isHoliday = holidays.some(holiday => {
      const holidayDate = typeof holiday === 'string' ? holiday : holiday.date.split('T')[0];
      return holidayDate === formattedDate;
    });
    
    // Also check if it's a weekend
    const dateObj = new Date(formattedDate);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
    
    let reason = null;
    if (isHoliday) {
      const holiday = typeof holidays[0] === 'string' ? 
        { name: "Market Holiday" } : 
        holidays.find(h => h.date.split('T')[0] === formattedDate);
      reason = holiday ? holiday.name : 'Market Holiday';
    } else if (isWeekend) {
      reason = dayOfWeek === 0 ? 'Sunday - Weekend' : 'Saturday - Weekend';
    }
    
    res.json({
      status: 'OK',
      date: formattedDate,
      isMarketClosed: isHoliday || isWeekend,
      isHoliday,
      isWeekend,
      reason,
      dayOfWeek
    });
    
  } catch (error) {
    console.error('Error checking market holiday status:', error);
    res.status(500).json({ error: 'Failed to check market holiday status' });
  }
});

// Daily Market Summary API for stocks
app.get('/api/polygon/daily', async (req, res) => {
  try {
    const { date, apiKey } = req.query;
    
    if (!date || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters: date and apiKey' });
    }
    
    // Forward the request to Polygon.io
    const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${date}?adjusted=true&apiKey=${apiKey}`;
    
    console.log(`Fetching daily market data for ${date} from Polygon.io`);
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Polygon API error (${response.status}): ${errorText}`);
      return res.status(response.status).json({ 
        error: `Polygon API error: ${response.status}`,
        details: errorText
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching daily market data:', error);
    res.status(500).json({ error: 'Failed to fetch daily market data' });
  }
});

// Daily Market Summary API for crypto
app.get('/api/polygon/daily/crypto', async (req, res) => {
  try {
    const { date, apiKey } = req.query;
    
    if (!date || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters: date and apiKey' });
    }
    
    // Forward the request to Polygon.io's crypto endpoint
    const url = `https://api.polygon.io/v2/aggs/grouped/locale/global/market/crypto/${date}?adjusted=true&apiKey=${apiKey}`;
    
    console.log(`Fetching daily crypto market data for ${date} from Polygon.io`);
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Polygon API error (${response.status}): ${errorText}`);
      return res.status(response.status).json({ 
        error: `Polygon API error: ${response.status}`,
        details: errorText
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching daily crypto market data:', error);
    res.status(500).json({ error: 'Failed to fetch daily crypto market data' });
  }
});

// Also add an endpoint for individual open-close data for fallback
app.get('/api/polygon/open-close', async (req, res) => {
  try {
    const { symbol, date, apiKey } = req.query;
    
    if (!symbol || !date || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters: symbol, date, and apiKey' });
    }
    
    // Forward the request to Polygon.io
    const url = `https://api.polygon.io/v1/open-close/${symbol}/${date}?adjusted=true&apiKey=${apiKey}`;
    
    console.log(`Fetching open-close data for ${symbol} on ${date} from Polygon.io`);
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Polygon API error (${response.status}): ${errorText}`);
      return res.status(response.status).json({ 
        error: `Polygon API error: ${response.status}`,
        details: errorText
      });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching open-close data:', error);
    res.status(500).json({ error: 'Failed to fetch open-close data' });
  }
});

// Helper function to generate fallback stock results
const generateFallbackResults = (query, marketType) => {
  const formattedQuery = query.toUpperCase();
  
  if (marketType === 'crypto') {
    // Generate simulated crypto results
    return {
      status: "OK",
      count: 1,
      results: [{
        ticker: `X:${formattedQuery}-USD`,
        name: `${formattedQuery} USD`,
        market: "crypto",
        locale: "global",
        type: "CRYPTO",
        active: true,
        currency_name: "usd",
        last_updated_utc: new Date().toISOString()
      }],
      simulated: true
    };
  } else {
    // Generate simulated stock results
    return {
      status: "OK",
      count: 1,
      results: [{
        ticker: formattedQuery,
        name: `${formattedQuery} Inc.`,
        market: "stocks",
        locale: "us",
        primary_exchange: "XNAS",
        type: "CS",
        active: true,
        currency_name: "usd",
        last_updated_utc: new Date().toISOString()
      }],
      simulated: true
    };
  }
};

// Search for stocks or crypto using Polygon.io
app.get('/api/polygon/search', async (req, res) => {
  try {
    const { query, market, apiKey } = req.query;
    
    if (!query || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters: query and apiKey' });
    }
    
    const normalizedQuery = normalizeSearchQuery(query);
    const cacheType = market === 'crypto' ? 'crypto' : 'stocks';
    
    // Check if we have cached results for this query
    if (searchCache[cacheType][normalizedQuery]) {
      const cachedData = searchCache[cacheType][normalizedQuery];
      const cacheAge = Date.now() - cachedData.timestamp;
      
      // Use cache if it's less than 15 minutes old
      if (cacheAge < 15 * 60 * 1000) {
        console.log(`Using cached search results for "${query}" (${market || 'stocks'})`);
        return res.json({
          ...cachedData.data,
          cached: true
        });
      }
    }
    
    // Build the search URL matching exactly the Polygon.io API format
    // Example: https://api.polygon.io/v3/reference/tickers?market=stocks&search=IONQ&active=true&order=asc&limit=100&sort=ticker&apiKey=API_KEY
    const marketType = market === 'crypto' ? 'crypto' : 'stocks';
    const searchUrl = `https://api.polygon.io/v3/reference/tickers?market=${marketType}&search=${encodeURIComponent(query)}&active=true&order=asc&limit=100&sort=ticker&apiKey=${apiKey}`;
    
    console.log(`Searching for ${marketType} assets matching "${query}"`);
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Polygon API search error (${response.status}): ${errorText}`);
      
      // Handle specific error codes
      if (response.status === 401 || response.status === 403) {
        return res.status(response.status).json({ 
          error: 'API key error: Invalid or unauthorized API key',
          status: "ERROR",
          code: response.status
        });
      }
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please try again later.',
          status: "ERROR",
          code: 429
        });
      }
      
      // Return fallback mock data for other errors
      const fallbackData = generateFallbackResults(query, marketType);
      console.log(`Using fallback data for "${query}" due to API error`);
      return res.json(fallbackData);
    }
    
    const data = await response.json();
    
    // If no results were found, consider using fallback data
    if (!data.results || data.results.length === 0) {
      console.log(`No results found for "${query}", using fallback data`);
      const fallbackData = generateFallbackResults(query, marketType);
      
      // Cache the fallback results too
      searchCache[cacheType][normalizedQuery] = {
        timestamp: Date.now(),
        data: fallbackData
      };
      
      return res.json(fallbackData);
    }
    
    // Cache the results
    searchCache[cacheType][normalizedQuery] = {
      timestamp: Date.now(),
      data: data
    };
    
    res.json(data);
  } catch (error) {
    console.error('Error searching:', error);
    
    // Return fallback mock data if any error occurs
    const marketType = req.query.market === 'crypto' ? 'crypto' : 'stocks';
    const fallbackData = generateFallbackResults(req.query.query, marketType);
    res.json(fallbackData);
  }
});

// Server start
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 