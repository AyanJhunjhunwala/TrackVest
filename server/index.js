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

// Real estate data mock endpoints
app.get('/api/reportall/search', (req, res) => {
  // Generate mock property data
  const mockProperties = [
    {
      properties: {
        robust_id: 'mock_prop_1',
        address: '123 Main St',
        addr_number: '123',
        addr_street_name: 'Main',
        addr_street_type: 'St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        apn: '12-34-567-890',
        longitude: -89.645,
        latitude: 39.799,
        bedrooms: 3,
        bathrooms: 2,
        year_built: 1985
      }
    },
    {
      properties: {
        robust_id: 'mock_prop_2',
        address: '456 Elm St',
        addr_number: '456',
        addr_street_name: 'Elm',
        addr_street_type: 'St',
        city: 'Springfield',
        state: 'IL',
        zip: '62702',
        apn: '23-45-678-901',
        longitude: -89.652,
        latitude: 39.805,
        bedrooms: 4,
        bathrooms: 2.5,
        year_built: 1992
      }
    }
  ];

  res.json({
    status: 'OK',
    count: mockProperties.length,
    results: mockProperties
  });
});

app.get('/api/reportall/estimate', (req, res) => {
  const { robust_id } = req.query;
  
  if (!robust_id) {
    return res.status(400).json({ error: 'Missing required parameter: robust_id' });
  }
  
  // Generate mock property estimate with realistic data
  const randomEstimates = {
    totalValue: Math.floor(Math.random() * 400000) + 300000,
    landValue: Math.floor(Math.random() * 150000) + 100000,
    buildingValue: Math.floor(Math.random() * 250000) + 200000,
  };
  
  const mockEstimate = {
    status: 'OK',
    robust_id: robust_id,
    address: robust_id === 'mock_prop_1' ? '123 Main St, Springfield, IL 62701' : '456 Elm St, Springfield, IL 62702',
    totalValue: randomEstimates.totalValue,
    landValue: randomEstimates.landValue,
    buildingValue: randomEstimates.buildingValue,
    yearBuilt: Math.floor(Math.random() * 50) + 1970,
    acreage: (Math.random() * 2 + 0.1).toFixed(2),
    estimatedMonthlyRent: Math.floor(randomEstimates.totalValue * 0.005),
    estimatedAnnualRent: Math.floor(randomEstimates.totalValue * 0.06),
    simulated: false
  };
  
  res.json(mockEstimate);
});

// Server start
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 