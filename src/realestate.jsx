import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, PlusCircle, Trash2, Search, Loader2, Home, MapPin, Locate, Info, X } from "lucide-react";

export default function RealEstateTab({ 
  darkMode, 
  realEstateHoldings, 
  setRealEstateHoldings, 
  totalRealEstateEquity, 
  avgRealEstateROI 
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

  // Fetch property data using ReportAll API
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
      // Build query based on search mode
      let queryParams;
      if (searchMode === "full") {
        // Format address as "street, region" for q parameter - following the example format that works
        queryParams = `q=${encodeURIComponent(realEstateForm.address)}`;
      } else {
        // Use separate address & region parameters
        queryParams = `address=${encodeURIComponent(realEstateForm.address)}&region=${encodeURIComponent(realEstateForm.region)}`;
      }

      console.log(`Searching properties with: ${queryParams}`);
      
      // Search for properties matching this address
      const response = await fetch(`/api/reportall/search?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch property data: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("ReportAll search results:", data);
      
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
        setShowSearchResults(true);
        
        // If only one result is found, automatically select it
        if (data.results.length === 1) {
          handleSelectProperty(data.results[0]);
        }
      } else {
        setEstimateError("No properties found matching this address.");
        // Fallback to simulated data
        simulatePropertyEstimate();
      }
    } catch (error) {
      console.error("Error fetching property data:", error);
      setEstimateError("Failed to fetch property data. Using simulated values instead.");
      // Fallback to simulated data
      simulatePropertyEstimate();
    } finally {
      setIsFetchingEstimate(false);
    }
  };
  
  // Simulate property data (used as fallback)
  const simulatePropertyEstimate = () => {
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
        simulated: true
      });
      
      setIsFetchingEstimate(false);
    }, 1000);
  };
  
  // Select a property from search results
  const handleSelectProperty = async (property) => {
    setSelectedProperty(property);
    setShowSearchResults(false);
    setIsFetchingEstimate(true);
    
    try {
      // Get property details including valuation estimate
      const robustId = property.properties.robust_id;
      console.log(`Fetching details for property: ${robustId}`);
      
      const response = await fetch(`/api/reportall/estimate?robust_id=${encodeURIComponent(robustId)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch property estimate: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Property estimation data:", data);
      
      if (data.status === 'OK') {
        // Format address from property data
        const formattedAddress = property.properties.address || 
                                `${property.properties.addr_number || ''} ${property.properties.addr_street_name || ''} ${property.properties.addr_street_type || ''}`.trim();
        
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
      } else {
        throw new Error("Failed to get property estimate");
      }
    } catch (error) {
      console.error("Error fetching property estimate:", error);
      // Extract address from property data for fallback
      const propertyAddress = property.properties.address || 
                             `${property.properties.addr_number || ''} ${property.properties.addr_street_name || ''} ${property.properties.addr_street_type || ''}`.trim();
      
      // Fallback to simulated data for this property
      setRealEstateForm({
        ...realEstateForm,
        address: propertyAddress,
        purchasePrice: Math.round(Math.random() * 400000) + 300000,
        currentValue: Math.round(Math.random() * 500000) + 350000,
        annualRent: Math.round(Math.random() * 30000) + 20000,
        yearPurchased: new Date().getFullYear() - Math.floor(Math.random() * 10)
      });
    } finally {
      setIsFetchingEstimate(false);
    }
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
        buildingValue: propertyDetails.buildingValue
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add Property Form */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold flex justify-between items-center`}>
              <span>Add Real Estate Property</span>
              <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-300">
                Using ReportAll API
              </span>
            </CardTitle>
            {estimateError && <p className="text-xs text-rose-500 mt-2 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {estimateError}</p>}
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
                  {propertyDetails.simulated && (
                    <span className={`text-xxs px-1 py-0.5 rounded ${
                      darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-800'
                    }`}>
                      Simulated
                    </span>
                  )}
                </div>
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
            <div className={`flex items-center text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <div className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
                <span>Average ROI: {avgRealEstateROI.toFixed(1)}%</span>
              </div>
            </div>
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
                          <p className={`font-medium ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{p.address}</p>
                          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} flex items-center gap-2`}>
                            <span>{p.type} (Purchased {p.yearPurchased})</span>
                            {p.propertyDetails && p.propertyDetails.yearBuilt && (
                              <span className="flex items-center gap-1">
                                <span>•</span>
                                <span>Built {p.propertyDetails.yearBuilt}</span>
                              </span>
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
  );
}