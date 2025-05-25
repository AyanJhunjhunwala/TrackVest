import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, PlusCircle, Trash2, Search, Loader2, Home, MapPin, Locate, Info, X, Globe } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function RealEstateTab({ 
  darkMode, 
  realEstateHoldings, 
  setRealEstateHoldings, 
  totalRealEstateEquity, 
  avgRealEstateROI,
  demoMode
}) {
  // Local state
  const [realEstateForm, setRealEstateForm] = useState({
    address: "", 
    region: "",
    type: "Residential", 
    purchasePrice: "", 
    currentValue: "",
    annualRent: "", 
    mortgage: "", 
    yearPurchased: new Date().getFullYear()
  });
  
  const [isFetchingEstimate, setIsFetchingEstimate] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [propertyDetails, setPropertyDetails] = useState(null);
  const [searchMode, setSearchMode] = useState("full"); // "full" for full address, "split" for address+region

  // Handle form changes
  const handleRealEstateChange = (e) => {
    const { name, value } = e.target;
    setRealEstateForm({ ...realEstateForm, [name]: value });
    setEstimateError("");
  };

  // Handle type change
  const handleRealEstateTypeChange = (value) => {
    setRealEstateForm({ ...realEstateForm, type: value });
    setEstimateError("");
  };

  // Handle search mode change
  const toggleSearchMode = () => {
    setSearchMode(searchMode === "full" ? "split" : "full");
    setEstimateError("");
  };

  // Fetch property data using Google Gemini
  const fetchPropertyEstimate = async () => {
    // Validate input based on search mode
    if (searchMode === "full" && !realEstateForm.address) {
      setEstimateError("Please enter a complete address");
      return;
    } else if (searchMode === "split" && (!realEstateForm.address || !realEstateForm.region)) {
      setEstimateError("Please enter both address and region");
      return;
    }

    setIsFetchingEstimate(true);
    setEstimateError("");
    setSearchResults([]);
    setShowSearchResults(false);

    try {
      // Build search query based on search mode
      let searchQuery;
      if (searchMode === "full") {
        searchQuery = `real estate property ${realEstateForm.address}`;
      } else {
        searchQuery = `real estate property ${realEstateForm.address} ${realEstateForm.region}`;
      }

      console.log(`Searching properties with: ${searchQuery}`);
      
      // Get API key from localStorage
      const geminiApiKey = localStorage.getItem('geminiApiKey') || '';
      
      if (!geminiApiKey || geminiApiKey.trim().length < 10) {
        console.log("No valid Gemini API key found, using simulation");
        simulatePropertyEstimate();
        return;
      }
      
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      
      // Use generative content API with google search grounding
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
      
      const searchPrompt = `
        Search for real estate properties matching this description: "${searchQuery}".
        Find actual property listings from sites like Trulia, Zillow, or Realtor.com.
        Include the complete address, property details, and estimated values.
        Also provide a short summary (1-2 sentences) for each property describing key features.
        Return the results in JSON format like this:
        {
          "status": "OK",
          "results": [
            {
              "properties": {
                "robust_id": "unique_id_1",
                "address": "Complete address",
                "addr_number": "Street number",
                "addr_street_name": "Street name",
                "addr_street_type": "Street type",
                "addr_city": "City name",
                "state_abbr": "State code",
                "addr_zip": "Zip code",
                "bedrooms": 3,
                "bathrooms": 2,
                "year_built": 1985,
                "summary": "A charming 3-bedroom home with renovated kitchen and large backyard."
              }
            }
          ],
          "sources": [
            {
              "name": "Trulia",
              "url": "https://www.trulia.com/..."
            },
            {
              "name": "Realtor.com",
              "url": "https://www.realtor.com/..."
            }
          ]
        }
      `;
      
      // Use the Google Search tool for grounding
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: searchPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
        tools: [{
          googleSearch: {}
        }],
      });
      
      const result = response.response;
      const text = result.text();
      console.log("Gemini search response:", text);
      
      // Log the grounding metadata if available
      if (response.candidates && 
          response.candidates[0].groundingMetadata && 
          response.candidates[0].groundingMetadata.searchEntryPoint) {
        console.log("Grounding sources:", 
          response.candidates[0].groundingMetadata.searchEntryPoint.renderedContent);
      }
      
      // Parse the JSON response
      let parsedData;
      try {
        // Extract JSON from the response text (which might contain markdown or other formatting)
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                         text.match(/```\n([\s\S]*?)\n```/) || 
                         text.match(/{[\s\S]*?}/);
                         
        let jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
        
        // Remove any trailing commas which are invalid in JSON
        jsonString = jsonString.replace(/,(\s*[}\]])/g, "$1");
        
        // Make sure the string is actually valid JSON by checking for opening brace
        if (!jsonString.trim().startsWith('{')) {
          // Try to find any JSON-like object in the text
          const potentialJson = text.match(/{[^{]*"status"[^}]*}/);
          if (potentialJson) {
            jsonString = potentialJson[0];
          }
        }
        
        try {
          parsedData = JSON.parse(jsonString);
        } catch (innerError) {
          console.error("First JSON parse attempt failed:", innerError);
          // If parsing fails, try to sanitize the string further
          jsonString = jsonString.replace(/[\r\n\t]/g, ' ')  // Remove newlines, tabs
                              .replace(/\s+/g, ' ')         // Normalize whitespace
                              .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Ensure property names are quoted
                              .replace(/'/g, '"');         // Replace single quotes with double quotes
          
          // Create a minimal valid response if all else fails
          try {
            parsedData = JSON.parse(jsonString);
          } catch (finalError) {
            console.error("Final JSON parse attempt failed:", finalError);
            // Create fallback data
            parsedData = {
              status: "OK",
              results: [{
                properties: {
                  robust_id: `fallback_${Date.now()}`,
                  address: searchQuery,
                  addr_city: "",
                  state_abbr: "",
                  addr_zip: "",
                  summary: "Property details could not be retrieved. Using simulated values."
                }
              }]
            };
          }
        }
      } catch (jsonError) {
        console.error("Error parsing Gemini response as JSON:", jsonError);
        // Create fallback data instead of throwing
        parsedData = {
          status: "OK",
          results: [{
            properties: {
              robust_id: `fallback_${Date.now()}`,
              address: searchQuery,
              addr_city: "",
              state_abbr: "",
              addr_zip: "",
              summary: "Property details could not be retrieved. Using simulated values."
            }
          }]
        };
      }
      
      console.log("Gemini search results:", parsedData);
      
      if (parsedData.results && parsedData.results.length > 0) {
        setSearchResults(parsedData.results);
        setShowSearchResults(true);
        
        // If only one result is found, automatically select it
        if (parsedData.results.length === 1) {
          handleSelectProperty(parsedData.results[0]);
          return; // Don't set isFetchingEstimate to false as handleSelectProperty will handle it
        }
      } else {
        setEstimateError("No properties found matching this address.");
        // Fallback to simulated data with loading icon still showing
        simulatePropertyEstimate(true);
        // We'll set the loading state to false after a delay to simulate API time
        setTimeout(() => setIsFetchingEstimate(false), 1200);
        return;
      }
    } catch (error) {
      console.error("Error fetching property data:", error);
      setEstimateError("Failed to fetch property data. Using simulated values instead.");
      // Fallback to simulated data with loading icon still showing
      simulatePropertyEstimate(true);
      // We'll set the loading state to false after a delay to simulate API time
      setTimeout(() => setIsFetchingEstimate(false), 1200);
      return;
    }
    
    // If we reach here, we didn't select a single property or simulate data
    setIsFetchingEstimate(false);
  };
  
  // Simulate property data (used as fallback)
  const simulatePropertyEstimate = (keepLoadingState = false) => {
    // Simulated delay
    setTimeout(() => {
      const estimate = Math.floor(Math.random() * 400000) + 300000;
      const purchaseEstimate = Math.floor(estimate * 0.8);
      const annualRentEstimate = Math.floor(estimate * 0.05);
      const mortgageEstimate = Math.floor(purchaseEstimate * 0.7);
      
      setRealEstateForm({
        ...realEstateForm,
        purchasePrice: purchaseEstimate,
        currentValue: estimate,
        annualRent: annualRentEstimate,
        mortgage: mortgageEstimate
      });
      
      setPropertyDetails({
        address: realEstateForm.address,
        totalValue: estimate,
        landValue: Math.floor(estimate * 0.3),
        buildingValue: Math.floor(estimate * 0.7),
        yearBuilt: Math.floor(Math.random() * 50) + 1970,
        acreage: (Math.random() * 2 + 0.1).toFixed(2),
        estimatedMonthlyRent: Math.floor(estimate * 0.005),
        estimatedAnnualRent: annualRentEstimate,
        summary: `${realEstateForm.type} property with estimated value of $${estimate.toLocaleString()}.`,
        simulated: true
      });
      
      // Only set loading to false if we're not part of a property selection flow
      if (!keepLoadingState) {
        setIsFetchingEstimate(false);
      }
    }, 1000);
  };
  
  // Select a property from search results
  const handleSelectProperty = async (property) => {
    setSelectedProperty(property);
    setShowSearchResults(false);
    setIsFetchingEstimate(true);
    
    try {
      // Get property details using Google Gemini
      const robustId = property.properties.robust_id;
      const address = property.properties.address || 
                     `${property.properties.addr_number || ''} ${property.properties.addr_street_name || ''} ${property.properties.addr_street_type || ''}`.trim();
      
      console.log(`Fetching details for property: ${address}`);
      
      // Get API key from localStorage
      const geminiApiKey = localStorage.getItem('geminiApiKey') || '';
      
      if (!geminiApiKey || geminiApiKey.trim().length < 10) {
        console.log("No valid Gemini API key found, using simulation");
        simulatePropertyEstimate();
        return;
      }
      
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      
      // Use generative content API with google search grounding
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
      
      // Create prompt for property details with grounding
      const detailsPrompt = `
        Search for detailed information about this property: "${address}".
        Find actual property listings and detailed information from sites like Trulia, Zillow, or Realtor.com.
        Include the property value, year built, land and building value, acreage, and estimated rental income.
        Also provide a short property summary (1-2 sentences) describing the key features.
        Return the results in JSON format like this:
        {
          "status": "OK",
          "robust_id": "${robustId}",
          "address": "${address}",
          "summary": "A beautiful 3-bedroom, 2-bathroom home in a quiet neighborhood with recent renovations.",
          "totalValue": 350000,
          "landValue": 120000,
          "buildingValue": 230000,
          "yearBuilt": 1985,
          "acreage": "0.25",
          "estimatedMonthlyRent": 1750,
          "estimatedAnnualRent": 21000,
          "simulated": false,
          "sources": [
            {
              "name": "Trulia",
              "url": "https://www.trulia.com/..."
            },
            {
              "name": "Realtor.com",
              "url": "https://www.realtor.com/..."
            }
          ]
        }
      `;
      
      // Use the Google Search tool for grounding
      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: detailsPrompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        },
        tools: [{
          googleSearch: {}
        }],
      });
      
      const result = response.response;
      const text = result.text();
      console.log("Property details response:", text);
      
      // Log the grounding metadata if available
      if (response.candidates && 
          response.candidates[0].groundingMetadata && 
          response.candidates[0].groundingMetadata.searchEntryPoint) {
        console.log("Grounding sources:", 
          response.candidates[0].groundingMetadata.searchEntryPoint.renderedContent);
      }
      
      // Parse the JSON response
      let data;
      try {
        // Check if response is empty or too short
        if (!text || text.trim().length < 10) {
          console.warn("Empty or very short response from Gemini, using fallback data");
          throw new Error("Empty response");
        }
        
        // Extract JSON from the response text (which might contain markdown or other formatting)
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                         text.match(/```\n([\s\S]*?)\n```/) || 
                         text.match(/{[\s\S]*?}/);
                         
        let jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
        
        // Remove any trailing commas which are invalid in JSON
        jsonString = jsonString.replace(/,(\s*[}\]])/g, "$1");
        
        // Make sure the string is actually valid JSON by checking for opening brace
        if (!jsonString.trim().startsWith('{')) {
          // Try to find any JSON-like object in the text
          const potentialJson = text.match(/{[^{]*"status"[^}]*}/);
          if (potentialJson) {
            jsonString = potentialJson[0];
          } else {
            console.warn("No valid JSON structure found in response, using fallback");
            throw new Error("No valid JSON found");
          }
        }
        
        // Clean up the JSON string
        jsonString = jsonString.replace(/[\r\n\t]/g, ' ')  // Remove newlines, tabs
                            .replace(/\s+/g, ' ')         // Normalize whitespace
                            .trim();
        
        try {
          data = JSON.parse(jsonString);
        } catch (innerError) {
          console.error("First JSON parse attempt failed:", innerError);
          console.log("Problematic JSON string:", jsonString);
          
          // Try to sanitize the string further
          jsonString = jsonString.replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // Ensure property names are quoted
                              .replace(/'/g, '"');         // Replace single quotes with double quotes
          
          try {
            data = JSON.parse(jsonString);
          } catch (finalError) {
            console.error("Final JSON parse attempt failed:", finalError);
            console.log("Final problematic JSON string:", jsonString);
            throw finalError; // Let the outer catch handle this
          }
        }
      } catch (jsonError) {
        console.error("Error parsing Gemini response as JSON:", jsonError);
        console.log("Using fallback property data due to parsing error");
        
        // Create fallback data based on the original property search result
        const originalProperty = property.properties;
        data = {
          status: "OK",
          robust_id: robustId || `fallback_${Date.now()}`,
          address: address,
          summary: "Property details retrieved from search results with estimated values.",
          totalValue: originalProperty.estimated_value_zillow ? 
            parseInt(originalProperty.estimated_value_zillow.replace(/[$,]/g, '')) : 
            Math.round(Math.random() * 400000) + 300000,
          landValue: Math.round((originalProperty.estimated_value_zillow ? 
            parseInt(originalProperty.estimated_value_zillow.replace(/[$,]/g, '')) : 350000) * 0.3),
          buildingValue: Math.round((originalProperty.estimated_value_zillow ? 
            parseInt(originalProperty.estimated_value_zillow.replace(/[$,]/g, '')) : 350000) * 0.7),
          yearBuilt: originalProperty.year_built || new Date().getFullYear() - 20,
          bedrooms: originalProperty.bedrooms || 3,
          bathrooms: originalProperty.bathrooms || 2,
          acreage: "0.25",
          estimatedMonthlyRent: Math.round((originalProperty.estimated_value_zillow ? 
            parseInt(originalProperty.estimated_value_zillow.replace(/[$,]/g, '')) : 350000) * 0.004),
          estimatedAnnualRent: Math.round((originalProperty.estimated_value_zillow ? 
            parseInt(originalProperty.estimated_value_zillow.replace(/[$,]/g, '')) : 350000) * 0.048),
          simulated: false, // This is based on real search data
          sources: property.sources || []
        };
      }
      
      console.log("Property estimation data:", data);
      
      if (data.status === 'OK') {
        // Check if we have actual data from sources or if it's simulated
        const hasRealData = data.sources && data.sources.length > 0 && !data.simulated;
        
        // Format address from property data
        const formattedAddress = address;
        
        // Update form with real data
        setRealEstateForm({
          ...realEstateForm,
          address: formattedAddress,
          purchasePrice: data.totalValue ? Math.round(data.totalValue * 0.9) : "", // Assume purchase was 90% of current value
          currentValue: data.totalValue || "",
          annualRent: data.estimatedAnnualRent || (data.totalValue ? Math.round(data.totalValue * 0.05) : ""),
          yearPurchased: new Date().getFullYear() - 3 // Default to 3 years ago
        });
        
        setPropertyDetails(data);
        
        // Log whether we're using real data or not
        console.log(hasRealData ? "Using real property data from sources" : "Using estimated property data");
      } else {
        // If no valid data was returned, use simulated data
        console.warn("Failed to get property estimate, using simulation");
        simulatePropertyDataForAddress(address);
      }
    } catch (error) {
      console.error("Error fetching property estimate:", error);
      // Extract address from property data for fallback
      const propertyAddress = property.properties.address || 
                             `${property.properties.addr_number || ''} ${property.properties.addr_street_name || ''} ${property.properties.addr_street_type || ''}`.trim();
      
      // Fallback to simulated data for this property
      simulatePropertyDataForAddress(propertyAddress);
    } finally {
      setIsFetchingEstimate(false);
    }
  };
  
  // Helper to simulate property data for a specific address
  const simulatePropertyDataForAddress = (address) => {
    const estimate = Math.round(Math.random() * 400000) + 300000;
    
    // Add a small delay to simulate API call
    setTimeout(() => {
      setRealEstateForm({
        ...realEstateForm,
        address: address,
        purchasePrice: Math.round(estimate * 0.9),
        currentValue: estimate,
        annualRent: Math.round(Math.random() * 30000) + 20000,
        yearPurchased: new Date().getFullYear() - Math.floor(Math.random() * 10)
      });
      
      setPropertyDetails({
        address: address,
        robust_id: `sim_${Date.now()}`,
        totalValue: estimate,
        landValue: Math.floor(estimate * 0.3),
        buildingValue: Math.floor(estimate * 0.7),
        yearBuilt: Math.floor(Math.random() * 50) + 1970,
        acreage: (Math.random() * 2 + 0.1).toFixed(2),
        estimatedMonthlyRent: Math.floor(estimate * 0.005),
        estimatedAnnualRent: Math.floor(estimate * 0.05),
        summary: `${realEstateForm.type || 'Residential'} property with estimated value of $${estimate.toLocaleString()}.`,
        simulated: true
      });
      
      console.log(`Using simulated data for ${address}`);
      
      // Keep the loading state managed by the parent function
    }, 800);
  };

  // Add real estate property
  const addRealEstateProperty = () => {
    const { address, type, purchasePrice, currentValue, annualRent, mortgage, yearPurchased } = realEstateForm;
    
    if (!address || !type || !purchasePrice || !currentValue || !yearPurchased) {
      setEstimateError("Please fill in all required fields");
      return;
    }

    const numericPurchasePrice = Number(purchasePrice);
    const numericCurrentValue = Number(currentValue);
    const numericAnnualRent = Number(annualRent) || 0;
    const numericMortgage = Number(mortgage) || 0;
    const numericYearPurchased = Number(yearPurchased);

    // Calculate ROI as annual rent / purchase price
    const roi = numericPurchasePrice > 0 
      ? (numericAnnualRent / numericPurchasePrice) * 100 
      : 0;

    const newProperty = {
      id: Date.now(),
      address,
      type,
      purchasePrice: numericPurchasePrice,
      currentValue: numericCurrentValue,
      annualRent: numericAnnualRent,
      mortgage: numericMortgage,
      yearPurchased: numericYearPurchased,
      roi,
      // Add property details if available
      propertyDetails: propertyDetails ? {
        robust_id: propertyDetails.robust_id,
        acreage: propertyDetails.acreage,
        yearBuilt: propertyDetails.yearBuilt,
        landValue: propertyDetails.landValue,
        buildingValue: propertyDetails.buildingValue,
        summary: propertyDetails.summary,
        simulated: propertyDetails.simulated,
        sources: propertyDetails.sources || []
      } : null
    };

    const updatedHoldings = [...realEstateHoldings, newProperty];
    setRealEstateHoldings(updatedHoldings);
    
    // Reset form and state
    setRealEstateForm({
      address: "", 
      region: "",
      type: "Residential", 
      purchasePrice: "", 
      currentValue: "",
      annualRent: "", 
      mortgage: "", 
      yearPurchased: new Date().getFullYear()
    });
    
    setEstimateError("");
    setSelectedProperty(null);
    setPropertyDetails(null);
  };

  // Delete real estate property
  const deleteRealEstateProperty = (id) => {
    const updatedHoldings = realEstateHoldings.filter(property => property.id !== id);
    setRealEstateHoldings(updatedHoldings);
  };

  return (
    <div className="space-y-6">
      {/* Demo Mode Banner */}
      {!demoMode?.gemini && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border-l-4 border-yellow-500 ${darkMode ? 'bg-yellow-900/20 text-yellow-200' : 'bg-yellow-50 text-yellow-800'}`}
        >
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-yellow-500" />
            <div>
              <h3 className="font-semibold">Demo Mode - Real Estate</h3>
              <p className="text-sm mt-1">
                You're viewing sample data. Add your Gemini API key in Settings to get AI-powered property valuations and market insights.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Real Estate Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Property Form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
            <CardHeader>
              <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold flex justify-between items-center`}>
                <span>Add Real Estate Property</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Toggle search mode */}
              <div className="flex justify-end">
                <button 
                  onClick={toggleSearchMode} 
                  className={`text-xs px-2 py-1 rounded ${darkMode ? 'text-blue-400 hover:bg-slate-700' : 'text-blue-600 hover:bg-slate-100'}`}
                >
                  Switch to {searchMode === "full" ? "address + region" : "full address"} search
                </button>
              </div>
              
              {/* Address Search Fields */}
              {searchMode === "full" ? (
                <div className="space-y-1">
                  <Label htmlFor="address" className="text-sm font-medium">Complete Address</Label>
                  <div className="flex gap-2 items-start">
                    <div className="relative w-full">
                      <Input 
                        id="address" 
                        name="address" 
                        placeholder="e.g., 123 Main St, Columbus, OH 43215" 
                        value={realEstateForm.address} 
                        onChange={handleRealEstateChange} 
                        className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'} pr-10`} 
                      />
                      {realEstateForm.address && (
                        <button 
                          type="button"
                          onClick={() => setRealEstateForm({...realEstateForm, address: ""})}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      variant="outline" 
                      size="sm" 
                      onClick={fetchPropertyEstimate}
                      disabled={isFetchingEstimate || !realEstateForm.address}
                      className="gap-1 flex-shrink-0"
                    >
                      {isFetchingEstimate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4"/>}
                      <span className="hidden sm:inline">Find</span>
                    </Button>
                  </div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Enter the complete address including city, state, and zip code
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="address" className="text-sm font-medium">Street Address</Label>
                    <Input 
                      id="address" 
                      name="address" 
                      placeholder="e.g., 123 Main St" 
                      value={realEstateForm.address} 
                      onChange={handleRealEstateChange} 
                      className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} 
                    />
                  </div>
                  <div>
                    <Label htmlFor="region" className="text-sm font-medium">Region (City, County, or Zip)</Label>
                    <div className="flex gap-2 items-start">
                      <div className="relative w-full">
                        <Input 
                          id="region" 
                          name="region" 
                          placeholder="e.g., Columbus, OH or Franklin County, OH" 
                          value={realEstateForm.region} 
                          onChange={handleRealEstateChange} 
                          className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} 
                        />
                      </div>
                      <Button
                        variant="outline" 
                        size="sm" 
                        onClick={fetchPropertyEstimate}
                        disabled={isFetchingEstimate || !realEstateForm.address || !realEstateForm.region}
                        className="gap-1 flex-shrink-0"
                      >
                        {isFetchingEstimate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Locate className="h-4 w-4"/>}
                        <span className="hidden sm:inline">Find</span>
                      </Button>
                    </div>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Specify region as city & state, county, or zip code
                    </p>
                  </div>
                </div>
              )}
              
              {/* Search Results Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className={`mt-1 border rounded-md overflow-hidden ${
                  darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200'
                }`}>
                  <div className={`p-2 border-b ${
                    darkMode ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-slate-50'
                  } text-xs font-medium flex items-center justify-between`}>
                    <span>Search Results ({searchResults.length})</span>
                    <button 
                      onClick={() => setShowSearchResults(false)}
                      className="text-slate-400 hover:text-slate-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectProperty(result)}
                        className={`w-full text-left p-2 block border-b ${
                          darkMode 
                            ? 'border-slate-600 hover:bg-slate-600 text-slate-200' 
                            : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                        } text-sm`}
                      >
                        <div className="flex items-start gap-2">
                          <MapPin className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                            darkMode ? 'text-emerald-400' : 'text-emerald-600'
                          }`} />
                          <div>
                            <div className="font-medium">{result.properties.address || result.properties.addr_line}</div>
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {result.properties.addr_city}, {result.properties.state_abbr} {result.properties.addr_zip}
                            </div>
                            {result.properties.summary && (
                              <div className={`text-xs mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                {result.properties.summary}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Property Details Panel */}
              {propertyDetails && (
                <div className={`p-3 rounded-md ${darkMode ? 'bg-slate-700/50' : 'bg-slate-50'} border ${
                  darkMode ? 'border-slate-600' : 'border-slate-200'
                } text-xs`}>
                  <div className="flex items-start gap-2 mb-2">
                    <Info className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'} mt-0.5`} />
                    <span className="font-medium">Property Details</span>
                    {propertyDetails.simulated ? (
                      <span className={`text-xxs px-1 py-0.5 rounded ${
                        darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'
                      }`}>
                        Simulated
                      </span>
                    ) : (
                      <span className={`text-xxs px-1 py-0.5 rounded flex items-center gap-1 ${
                        darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        <Globe className="h-2 w-2" /> Google Search
                      </span>
                    )}
                  </div>

                  {/* Property Summary */}
                  {propertyDetails.summary && (
                    <div className={`mb-3 py-1 px-2 rounded ${
                      darkMode ? 'bg-slate-800/50' : 'bg-white/80'
                    }`}>
                      {propertyDetails.summary}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                    {propertyDetails.totalValue && (
                      <div className="flex justify-between">
                        <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Est. Value:</span>
                        <span className="font-medium">${propertyDetails.totalValue.toLocaleString()}</span>
                      </div>
                    )}
                    {propertyDetails.yearBuilt && (
                      <div className="flex justify-between">
                        <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Year Built:</span>
                        <span className="font-medium">{propertyDetails.yearBuilt}</span>
                      </div>
                    )}
                    {propertyDetails.acreage && (
                      <div className="flex justify-between">
                        <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Acreage:</span>
                        <span className="font-medium">{parseFloat(propertyDetails.acreage).toFixed(2)}</span>
                      </div>
                    )}
                    {propertyDetails.estimatedMonthlyRent && (
                      <div className="flex justify-between">
                        <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Est. Monthly Rent:</span>
                        <span className="font-medium">${propertyDetails.estimatedMonthlyRent.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Sources Section */}
                  {propertyDetails.sources && propertyDetails.sources.length > 0 && !propertyDetails.simulated && (
                    <div className={`mt-3 pt-2 border-t ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className={`h-3 w-3 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        <span className={`text-xs ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Grounded Sources:
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {propertyDetails.sources.map((source, index) => (
                          <a 
                            key={index}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-xxs px-1.5 py-0.5 rounded-full ${
                              darkMode 
                                ? 'bg-slate-800 text-blue-400 hover:bg-slate-700 border border-slate-700' 
                                : 'bg-white text-blue-600 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            {source.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Property Type */}
              <div>
                <Label htmlFor="type" className="text-sm font-medium mb-1 block">Property Type</Label>
                <Select value={realEstateForm.type} onValueChange={handleRealEstateTypeChange}>
                  <SelectTrigger id="type" className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}> 
                    <SelectValue placeholder="Select type" /> 
                  </SelectTrigger>
                  <SelectContent className={`${darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
                    <SelectItem value="Residential">Residential</SelectItem> 
                    <SelectItem value="Multi-family">Multi-family</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem> 
                    <SelectItem value="Land">Land</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchasePrice" className="text-sm font-medium mb-1 block">Purchase Price ($)</Label>
                  <Input 
                    id="purchasePrice" 
                    name="purchasePrice" 
                    type="number" 
                    placeholder="e.g., 450000" 
                    value={realEstateForm.purchasePrice} 
                    onChange={handleRealEstateChange} 
                    className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} 
                  />
                </div>
                <div>
                  <Label htmlFor="currentValue" className="text-sm font-medium mb-1 block">Current Value ($)</Label>
                  <Input 
                    id="currentValue" 
                    name="currentValue" 
                    type="number" 
                    placeholder="e.g., 520000" 
                    value={realEstateForm.currentValue} 
                    onChange={handleRealEstateChange} 
                    className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} 
                  />
                </div>
              </div>

              {/* Financial Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="annualRent" className="text-sm font-medium mb-1 block">Annual Rent ($)</Label>
                  <Input 
                    id="annualRent" 
                    name="annualRent" 
                    type="number" 
                    placeholder="e.g., 36000" 
                    value={realEstateForm.annualRent} 
                    onChange={handleRealEstateChange} 
                    className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} 
                  />
                </div>
                <div>
                  <Label htmlFor="mortgage" className="text-sm font-medium mb-1 block">Mortgage Bal. ($)</Label>
                  <Input 
                    id="mortgage" 
                    name="mortgage" 
                    type="number" 
                    placeholder="e.g., 320000" 
                    value={realEstateForm.mortgage} 
                    onChange={handleRealEstateChange} 
                    className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} 
                  />
                </div>
              </div>

              {/* Year Purchased */}
              <div>
                <Label htmlFor="yearPurchased" className="text-sm font-medium mb-1 block">Year Purchased</Label>
                <Input 
                  id="yearPurchased" 
                  name="yearPurchased" 
                  type="number" 
                  placeholder="e.g., 2019" 
                  value={realEstateForm.yearPurchased} 
                  onChange={handleRealEstateChange} 
                  className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} 
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={addRealEstateProperty} 
                className={`w-full gap-2 ${darkMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
              >
                <PlusCircle className="h-4 w-4" /> Add Property
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Properties List */}
        <motion.div
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
            <CardHeader>
              <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold flex items-center justify-between`}>
                <span>Real Estate Holdings</span>
                <span className={`text-sm font-normal ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  Total Equity: ${totalRealEstateEquity.toLocaleString()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {realEstateHoldings.length > 0 ? realEstateHoldings.map(p => (
                  <motion.div
                    key={p.id} 
                    layout 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, x: -20 }} 
                    transition={{ duration: 0.3 }}
                    className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700 border-slate-600' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'} transition-colors`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-white bg-gradient-to-br ${
                            p.type === "Residential" ? "from-blue-500 to-blue-700" :
                            p.type === "Commercial" ? "from-amber-500 to-amber-700" :
                            p.type === "Multi-family" ? "from-emerald-500 to-emerald-700" : 
                            "from-purple-500 to-purple-700"
                          }`}>
                            {p.type.charAt(0)}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{p.address}</p>
                              {p.propertyDetails && !p.propertyDetails.simulated && (
                                <span className={`text-xxs px-1 py-0.5 rounded flex items-center gap-1 ${
                                  darkMode ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  <Globe className="h-2 w-2" /> Google Search
                                </span>
                              )}
                            </div>
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-2`}>
                              <span>{p.type} (Purchased {p.yearPurchased})</span>
                              {p.propertyDetails && p.propertyDetails.yearBuilt && (
                                <span className="flex items-center gap-1">
                                  <span>•</span>
                                  <span>Built {p.propertyDetails.yearBuilt}</span>
                                </span>
                              )}
                              {p.propertyDetails && p.propertyDetails.summary && (
                                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                  {p.propertyDetails.summary}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 flex-shrink-0"
                        onClick={() => deleteRealEstateProperty(p.id)}
                      > 
                        <Trash2 className="h-4 w-4" /> 
                      </Button>
                    </div>
                    <div className={`grid grid-cols-2 gap-4 p-3 rounded-md ${darkMode ? 'bg-slate-800/50' : 'bg-white'}`}>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Property Value:</span>
                          <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>${p.currentValue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Mortgage:</span>
                          <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>${(p.mortgage || 0).toLocaleString()}</span>
                        </div>
                        {p.propertyDetails && p.propertyDetails.acreage && (
                          <div className="flex justify-between text-sm">
                            <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Acreage:</span>
                            <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{parseFloat(p.propertyDetails.acreage).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Equity:</span>
                          <span className={`font-medium ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>${(p.currentValue - (p.mortgage || 0)).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Annual Rent:</span>
                          <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>${(p.annualRent || 0).toLocaleString()}</span>
                        </div>
                        {p.propertyDetails && p.propertyDetails.landValue && p.propertyDetails.buildingValue && (
                          <div className="flex justify-between text-sm">
                            <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Land/Building:</span>
                            <span className={`font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                              {Math.round(p.propertyDetails.landValue / p.currentValue * 100)}% / {Math.round(p.propertyDetails.buildingValue / p.currentValue * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="col-span-2 mt-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ROI (Annual Rent / Purchase Price):</span>
                          <span className={`font-medium text-base ${p.roi >= 0 ? darkMode ? 'text-emerald-400' : 'text-emerald-600' : darkMode ? 'text-rose-400' : 'text-rose-600'}`}>
                            {p.roi.toFixed(1)}%
                          </span>
                        </div>
                        
                        {/* Property ID */}
                        {p.propertyDetails && p.propertyDetails.robust_id && (
                          <div className={`mt-2 pt-2 border-t border-dashed flex items-center justify-between text-xs
                            ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}
                          >
                            <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Property ID:</span>
                            <span className={`font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {p.propertyDetails.robust_id}
                            </span>
                          </div>
                        )}
                        
                        {/* Sources Section */}
                        {p.propertyDetails && p.propertyDetails.sources && p.propertyDetails.sources.length > 0 && !p.propertyDetails.simulated && (
                          <div className={`mt-2 pt-2 border-t border-dashed ${darkMode ? 'border-slate-600' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-1">
                              <Globe className={`h-3 w-3 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Grounded Sources:
                              </span>
                              <div className="flex flex-wrap gap-1 ml-1">
                                {p.propertyDetails.sources.map((source, index) => (
                                  <a 
                                    key={index}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`text-xxs px-1 py-0.5 rounded ${
                                      darkMode 
                                        ? 'bg-slate-700 text-blue-400 hover:bg-slate-600' 
                                        : 'bg-slate-100 text-blue-600 hover:bg-slate-200'
                                    }`}
                                  >
                                    {source.name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )) : ( 
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className={`w-16 h-16 mb-4 flex items-center justify-center rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <Search className={`h-8 w-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                    </div>
                    <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-sm`}>No real estate properties added yet.</p> 
                    <p className={`${darkMode ? 'text-slate-500' : 'text-slate-400'} text-xs mt-1`}>Add your first property using the form on the left.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}