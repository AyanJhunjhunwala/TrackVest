import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ReportAll API configuration
const REPORTALL_API_KEY = 'J8mtw1sWDq';
const REPORTALL_BASE_URL = 'https://reportallusa.com/api';

// Cache for geocoded addresses
let geocodeCache = {
  data: {},
  validUntil: null
};

// Cache for property data to avoid repeated API calls
let propertyDataCache = {
  fetchedAt: null,
  data: {},
  validUntil: null
};

// Middleware
app.use(cors());
app.use(express.json());

// Cache for market holidays to avoid repeated API calls
let marketHolidaysCache = {
  fetchedAt: null,
  holidays: [],
  validUntil: null
};

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
    
    // Fetch market holidays from Polygon
    const url = `https://api.polygon.io/v1/marketstatus/upcoming?apiKey=${apiKey}`;
    
    console.log(`Fetching market holidays from: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Process and simplify the holidays data
    const processedHolidays = data.map(holiday => ({
      date: holiday.date,
      exchange: holiday.exchange,
      name: holiday.name,
      status: holiday.status
    }));
    
    // Update cache with expiration of 24 hours
    marketHolidaysCache = {
      fetchedAt: now.toISOString(),
      holidays: processedHolidays,
      validUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours cache
    };
    
    res.json({ 
      status: 'OK', 
      cached: false,
      fetchedAt: marketHolidaysCache.fetchedAt,
      holidays: processedHolidays 
    });
  } catch (error) {
    console.error('Error fetching market holidays:', error);
    res.status(500).json({ error: 'Failed to fetch market holidays from Polygon.io' });
  }
});

// Check if a specific date is a market holiday
app.get('/api/polygon/is-market-holiday', async (req, res) => {
  try {
    const { date, apiKey } = req.query;
    
    if (!date || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Ensure we have holiday data
    let holidays = [];
    
    // Use cache if available
    const now = new Date();
    if (marketHolidaysCache.validUntil && now < marketHolidaysCache.validUntil) {
      holidays = marketHolidaysCache.holidays;
    } else {
      // Fetch market holidays
      const url = `https://api.polygon.io/v1/marketstatus/upcoming?apiKey=${apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Process and cache the holidays
      holidays = data.map(holiday => ({
        date: holiday.date,
        exchange: holiday.exchange,
        name: holiday.name,
        status: holiday.status
      }));
      
      // Update cache
      marketHolidaysCache = {
        fetchedAt: now.toISOString(),
        holidays: holidays,
        validUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours cache
      };
    }
    
    // Check if the date is a holiday
    const formattedDate = date.split('T')[0]; // Ensure we're using YYYY-MM-DD format
    const isHoliday = holidays.some(holiday => holiday.date.split('T')[0] === formattedDate && holiday.status === 'closed');
    
    // Also check if it's a weekend
    const dateObj = new Date(formattedDate);
    const dayOfWeek = dateObj.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
    
    let reason = null;
    if (isHoliday) {
      const holiday = holidays.find(h => h.date.split('T')[0] === formattedDate);
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

// Get the previous valid market day
app.get('/api/polygon/previous-market-day', async (req, res) => {
  try {
    const { date, apiKey } = req.query;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'Missing required parameter: apiKey' });
    }
    
    // Use today's date if not specified
    const startDate = date ? new Date(date) : new Date();
    let currentDate = new Date(startDate);
    let attempts = 0;
    let foundValidDay = false;
    let previousMarketDay = null;
    
    // Look back up to 10 days to find the last valid market day
    while (!foundValidDay && attempts < 10) {
      // Move back one day
      currentDate.setDate(currentDate.getDate() - 1);
      const currentDateStr = currentDate.toISOString().split('T')[0];
      
      // Check if this is a valid market day
      const checkUrl = `/api/polygon/is-market-holiday?date=${currentDateStr}&apiKey=${apiKey}`;
      const checkResponse = await fetch(`http://localhost:${PORT}${checkUrl}`);
      const checkData = await checkResponse.json();
      
      if (!checkData.isMarketClosed) {
        foundValidDay = true;
        previousMarketDay = currentDateStr;
      }
      
      attempts++;
    }
    
    if (!foundValidDay) {
      return res.status(404).json({ 
        error: 'Could not find a valid market day in the past 10 days' 
      });
    }
    
    res.json({
      status: 'OK',
      date: previousMarketDay,
      originalDate: date || new Date().toISOString().split('T')[0],
      daysBack: attempts
    });
    
  } catch (error) {
    console.error('Error finding previous market day:', error);
    res.status(500).json({ error: 'Failed to find previous market day' });
  }
});

// Polygon.io proxy endpoints
app.get('/api/polygon/search', async (req, res) => {
  try {
    const { query, apiKey, market } = req.query;
    
    if (!query || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Build the URL with market parameter if provided
    let url = `https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&sort=ticker&order=asc&limit=10&apiKey=${apiKey}`;
    
    if (market) {
      url += `&market=${market}`;
    }
    
    console.log(`Proxying search request to: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('Polygon API error:', error);
    res.status(500).json({ error: 'Failed to fetch data from Polygon.io' });
  }
});

app.get('/api/polygon/daily', async (req, res) => {
  try {
    const { date, apiKey } = req.query;
    
    if (!date || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // First, check if the requested date is a market holiday or weekend
    const checkUrl = `/api/polygon/is-market-holiday?date=${date}&apiKey=${apiKey}`;
    const checkResponse = await fetch(`http://localhost:${PORT}${checkUrl}`);
    const checkData = await checkResponse.json();
    
    // If market is closed, get the previous valid market day
    let targetDate = date;
    if (checkData.isMarketClosed) {
      console.log(`Market was closed on ${date}: ${checkData.reason}. Finding previous market day...`);
      
      const prevDayUrl = `/api/polygon/previous-market-day?date=${date}&apiKey=${apiKey}`;
      const prevDayResponse = await fetch(`http://localhost:${PORT}${prevDayUrl}`);
      const prevDayData = await prevDayResponse.json();
      
      if (prevDayResponse.ok && prevDayData.status === 'OK') {
        targetDate = prevDayData.date;
        console.log(`Using previous market day: ${targetDate}`);
      } else {
        return res.status(404).json({ 
          error: 'Could not find a valid market day' 
        });
      }
    }
    
    const url = `https://api.polygon.io/v2/aggs/grouped/locale/us/market/stocks/${targetDate}?adjusted=true&apiKey=${apiKey}`;
    
    console.log(`Proxying daily data request to: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Add metadata about date adjustment
    if (targetDate !== date) {
      data.requestedDate = date;
      data.adjustedDate = targetDate;
      data.dateAdjustedReason = checkData.reason;
    }
    
    res.json(data);
  } catch (error) {
    console.error('Polygon API error:', error);
    res.status(500).json({ error: 'Failed to fetch daily data from Polygon.io' });
  }
});

app.get('/api/polygon/open-close', async (req, res) => {
  try {
    const { symbol, date, apiKey } = req.query;
    
    if (!symbol || !date || !apiKey) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Check if the date is a market holiday or weekend
    const checkUrl = `/api/polygon/is-market-holiday?date=${date}&apiKey=${apiKey}`;
    const checkResponse = await fetch(`http://localhost:${PORT}${checkUrl}`);
    const checkData = await checkResponse.json();
    
    // If market is closed, get the previous valid market day (except for crypto which trades 24/7)
    let targetDate = date;
    if (checkData.isMarketClosed && !symbol.startsWith('X:')) {
      console.log(`Market was closed on ${date}: ${checkData.reason}. Finding previous market day...`);
      
      const prevDayUrl = `/api/polygon/previous-market-day?date=${date}&apiKey=${apiKey}`;
      const prevDayResponse = await fetch(`http://localhost:${PORT}${prevDayUrl}`);
      const prevDayData = await prevDayResponse.json();
      
      if (prevDayResponse.ok && prevDayData.status === 'OK') {
        targetDate = prevDayData.date;
        console.log(`Using previous market day: ${targetDate}`);
      } else {
        return res.status(404).json({ 
          error: 'Could not find a valid market day' 
        });
      }
    }
    
    const url = `https://api.polygon.io/v1/open-close/${symbol}/${targetDate}?apiKey=${apiKey}`;
    
    console.log(`Proxying open-close request to: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    // Add metadata about date adjustment
    if (targetDate !== date && data.status === 'OK') {
      data.requestedDate = date;
      data.adjustedDate = targetDate;
      data.dateAdjustedReason = checkData.reason;
    }
    
    res.json(data);
  } catch (error) {
    console.error('Polygon API error:', error);
    res.status(500).json({ error: 'Failed to fetch open-close data from Polygon.io' });
  }
});

// Geocode address and search by point
app.get('/api/reportall/geocode-search', async (req, res) => {
  try {
    const { address, client = REPORTALL_API_KEY } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Missing required parameter: address' });
    }

    console.log(`Geocoding address: ${address}`);
    
    // Check cache first
    const cacheKey = address.toLowerCase().trim();
    const now = new Date();
    if (geocodeCache.data[cacheKey] && geocodeCache.validUntil && now < geocodeCache.validUntil) {
      console.log(`Using cached geocode for: ${address}`);
      const cachedResult = geocodeCache.data[cacheKey];
      return res.json(cachedResult);
    }

    // Step 1: Geocode the address using a free geocoding service
    // Using Nominatim (OpenStreetMap) as it's free and doesn't require an API key
    // Note: For production apps, please follow their usage policy
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        'User-Agent': 'TrackVest/1.0 (property search application)',
        'Accept': 'application/json'
      }
    });
    
    if (!geocodeResponse.ok) {
      throw new Error(`Geocoding API responded with status ${geocodeResponse.status}`);
    }
    
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData || geocodeData.length === 0) {
      return res.status(404).json({ error: 'Address could not be geocoded. Try a more specific address.' });
    }
    
    const location = geocodeData[0];
    const latitude = parseFloat(location.lat);
    const longitude = parseFloat(location.lon);
    
    console.log(`Geocoded ${address} to: ${latitude}, ${longitude}`);
    
    // Step 2: Use the coordinates to search for property in ReportAll API
    // Use the point query endpoint
    const reportAllUrl = `${REPORTALL_BASE_URL}/parcels?client=${client}&v=9&lat=${latitude}&lon=${longitude}&return_buildings=true`;
    
    console.log(`Searching ReportAll by point: ${reportAllUrl}`);
    
    const reportAllResponse = await fetch(reportAllUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrackVest/1.0'
      }
    });
    
    if (!reportAllResponse.ok) {
      throw new Error(`ReportAll API responded with status ${reportAllResponse.status}`);
    }
    
    const propertyData = await reportAllResponse.json();
    
    // Add geocoded location to the response
    const result = {
      ...propertyData,
      geocoded: {
        latitude,
        longitude,
        displayName: location.display_name,
        boundingBox: location.boundingbox
      }
    };
    
    // Save to cache for 24 hours
    geocodeCache.data[cacheKey] = result;
    geocodeCache.validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    res.json(result);
  } catch (error) {
    console.error('Error in geocode-search:', error);
    res.status(500).json({ error: `Failed to geocode and search: ${error.message}` });
  }
});

// Enhanced property search with point and polygon support
app.get('/api/reportall/enhanced-search', async (req, res) => {
  try {
    const { address, lat, lon, radius = 0.001, client = REPORTALL_API_KEY } = req.query;
    
    if (!address && (!lat || !lon)) {
      return res.status(400).json({ error: 'Missing required parameters: either address or lat/lon coordinates' });
    }
    
    let url;
    
    // If coordinates are provided, use point search
    if (lat && lon) {
      url = `${REPORTALL_BASE_URL}/parcels?client=${client}&v=9&lat=${lat}&lon=${lon}&return_buildings=true`;
    } 
    // Otherwise geocode the address first
    else {
      // First try to search by address directly
      url = `${REPORTALL_BASE_URL}/parcels?client=${client}&v=9&q=${encodeURIComponent(address)}&return_buildings=true`;
    }
    
    console.log(`Enhanced search at: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrackVest/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`ReportAll API responded with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // If no results found and we were using address search, try geocoding + point search
    if (data.results && data.results.length === 0 && address && !lat && !lon) {
      console.log("No results found, trying geocode + point search");
      
      // Use geocode function to get coordinates
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
      
      const geocodeResponse = await fetch(geocodeUrl, {
        headers: {
          'User-Agent': 'TrackVest/1.0',
          'Accept': 'application/json'
        }
      });
      
      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData && geocodeData.length > 0) {
          const location = geocodeData[0];
          const geoLat = parseFloat(location.lat);
          const geoLon = parseFloat(location.lon);
          
          console.log(`Geocoded ${address} to: ${geoLat}, ${geoLon}`);
          
          // Try point search with the geocoded coordinates
          const pointUrl = `${REPORTALL_BASE_URL}/parcels?client=${client}&v=9&lat=${geoLat}&lon=${geoLon}&return_buildings=true`;
          
          console.log(`Trying point search: ${pointUrl}`);
          
          const pointResponse = await fetch(pointUrl, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'TrackVest/1.0'
            }
          });
          
          if (pointResponse.ok) {
            const pointData = await pointResponse.json();
            
            // Add the geocoded information to the response
            pointData.geocoded = {
              latitude: geoLat,
              longitude: geoLon,
              displayName: location.display_name
            };
            
            return res.json(pointData);
          }
        }
      }
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error in enhanced search:', error);
    res.status(500).json({ error: `Enhanced search failed: ${error.message}` });
  }
});

// ReportAll API routes
// Property search endpoint
app.get('/api/reportall/search', async (req, res) => {
  try {
    const { address, region, q, county_id, zip_code, client = REPORTALL_API_KEY } = req.query;
    
    // Handle direct API call with exact parameters matching the successful example
    const baseUrl = `${REPORTALL_BASE_URL}/parcels?client=${client}&v=9`;
    let url;
    
    // If q parameter is provided, use single parameter query (this is the format that works as shown in the example)
    if (q) {
      url = `${baseUrl}&q=${encodeURIComponent(q)}`;
    } 
    // If address is provided with region or region alternatives (county_id, zip_code)
    else if (address && (region || county_id || zip_code)) {
      url = `${baseUrl}&address=${encodeURIComponent(address)}`;
      
      // Add appropriate region parameter
      if (region) {
        url += `&region=${encodeURIComponent(region)}`;
      } else if (county_id) {
        url += `&county_id=${encodeURIComponent(county_id)}`;
      } else if (zip_code) {
        url += `&zip_code=${encodeURIComponent(zip_code)}`;
      }
    }
    // If only address is provided (might be less accurate but worth trying)
    else if (address) {
      // Try to parse region from address if possible
      const addressParts = address.split(',');
      if (addressParts.length > 1) {
        // If address contains commas, use q parameter for better accuracy
        url = `${baseUrl}&q=${encodeURIComponent(address)}`;
      } else {
        // Otherwise use address search with no region
        url = `${baseUrl}&address=${encodeURIComponent(address)}`;
      }
    } else {
      return res.status(400).json({ error: 'Missing required parameters: address or q' });
    }
    
    // Add building footprints option and results per page
    url += '&return_buildings=true&rpp=5';
    
    console.log(`Searching properties at: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TrackVest/1.0'
      }
    });
    
    if (!response.ok) {
      console.error(`ReportAll API error: ${response.status} ${response.statusText}`);
      throw new Error(`ReportAll API responded with status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Log successful response for debugging
    console.log(`ReportAll API success: Found ${data.count} properties`);
    
    // Add to cache
    const now = new Date();
    const cacheKey = q || address;
    if (cacheKey) {
      propertyDataCache.data[cacheKey.toLowerCase().trim()] = data;
      propertyDataCache.fetchedAt = now.toISOString();
      propertyDataCache.validUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24-hour cache
    }
    
    res.json(data);
  } catch (error) {
    console.error('ReportAll API error:', error);
    res.status(500).json({ error: 'Failed to fetch property data from ReportAll' });
  }
});

// Property details endpoint
app.get('/api/reportall/property/:robustId', async (req, res) => {
  try {
    const { robustId } = req.params;
    const { client = REPORTALL_API_KEY } = req.query;
    
    if (!robustId) {
      return res.status(400).json({ error: 'Missing required parameter: robustId' });
    }
    
    const url = `${REPORTALL_BASE_URL}/parcels?client=${client}&v=9&robust_id=${robustId}`;
    
    console.log(`Fetching property details at: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`ReportAll API responded with status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('ReportAll API error:', error);
    res.status(500).json({ error: 'Failed to fetch property details from ReportAll' });
  }
});

// Get property valuation estimate (simplified)
app.get('/api/reportall/estimate', async (req, res) => {
  try {
    const { address, robust_id, client = REPORTALL_API_KEY } = req.query;
    
    if (!address && !robust_id) {
      return res.status(400).json({ error: 'Missing required parameter: address or robust_id' });
    }
    
    let propertyData;
    
    // If robust_id is provided, fetch by ID
    if (robust_id) {
      const url = `${REPORTALL_BASE_URL}/parcels?client=${client}&v=9&robust_id=${encodeURIComponent(robust_id)}`;
      console.log(`Fetching property details by robust_id: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TrackVest/1.0'
        }
      });
      
      if (!response.ok) {
        console.error(`ReportAll API error: ${response.status} ${response.statusText}`);
        throw new Error(`ReportAll API responded with status ${response.status}: ${response.statusText}`);
      }
      
      propertyData = await response.json();
      console.log(`Retrieved property data by robust_id: count=${propertyData.count}`);
    } else {
      // Otherwise fetch by address
      const url = `${REPORTALL_BASE_URL}/parcels?client=${client}&v=9&q=${encodeURIComponent(address)}&rpp=1`;
      console.log(`Fetching property details by address: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TrackVest/1.0'
        }
      });
      
      if (!response.ok) {
        console.error(`ReportAll API error: ${response.status} ${response.statusText}`);
        throw new Error(`ReportAll API responded with status ${response.status}: ${response.statusText}`);
      }
      
      propertyData = await response.json();
      console.log(`Retrieved property data by address: count=${propertyData.count}`);
    }
    
    // Check if we found a property
    if (propertyData.results && propertyData.results.length > 0) {
      const property = propertyData.results[0];
      const props = property.properties;
      
      // Extract property data - handle potential missing values gracefully
      const totalValue = props.mkt_val_tot ? parseFloat(props.mkt_val_tot) : null;
      const landValue = props.mkt_val_land ? parseFloat(props.mkt_val_land) : null;
      const buildingValue = props.mkt_val_bldg ? parseFloat(props.mkt_val_bldg) : null;
      const yearBuilt = props.year_built || null;
      const acreage = props.acreage_calc || props.acreage_deeded || props.acreage || null;
      
      // Format the property address from component parts if available
      let formattedAddress = props.address || "";
      if (!formattedAddress && props.addr_number && props.addr_street_name) {
        formattedAddress = `${props.addr_number} ${props.addr_street_name}`;
        if (props.addr_street_type) formattedAddress += ` ${props.addr_street_type}`;
        if (props.addr_city) formattedAddress += `, ${props.addr_city}`;
        if (props.addr_zip) formattedAddress += ` ${props.addr_zip}`;
      }
      
      // Calculate rent estimate based on property value
      let estimatedRent = null;
      if (totalValue) {
        // Simple rent estimate based on property value (0.8% monthly)
        const monthlyRentPercent = 0.008; // 0.8% of property value monthly
        estimatedRent = parseFloat((totalValue * monthlyRentPercent).toFixed(2));
      }
      
      // Return all the property details
      res.json({
        status: 'OK',
        robust_id: props.robust_id,
        county: props.county_name,
        state: props.state_abbr,
        parcel_id: props.parcel_id,
        address: formattedAddress,
        city: props.addr_city || props.muni_name || null,
        zip: props.addr_zip || props.census_zip || null,
        owner: props.owner,
        totalValue,
        landValue,
        buildingValue,
        yearBuilt,
        acreage: acreage ? parseFloat(acreage) : null,
        schoolDistrict: props.school_district,
        landUseClass: props.land_use_class,
        estimatedMonthlyRent: estimatedRent,
        estimatedAnnualRent: estimatedRent ? estimatedRent * 12 : null,
        buildings: props.buildings,
        hasPolygon: property.geometry ? true : false,
        hasBuildingFootprints: property.buildings_poly ? true : false
      });
    } else {
      res.status(404).json({ status: 'error', error: 'No property found' });
    }
  } catch (error) {
    console.error('ReportAll API error:', error);
    res.status(500).json({ error: 'Failed to estimate property value' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 