import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, PlusCircle, Trash2, Search, Loader2 } from "lucide-react";

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
    type: "Residential", 
    purchasePrice: "", 
    currentValue: "",
    annualRent: "", 
    mortgage: "", 
    yearPurchased: new Date().getFullYear()
  });
  
  const [isFetchingEstimate, setIsFetchingEstimate] = useState(false);
  const [estimateError, setEstimateError] = useState("");

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

  // Fetch property estimate (simulated)
  const fetchPropertyEstimate = () => {
    if (!realEstateForm.address) {
      setEstimateError("Please enter an address");
      return;
    }

    setIsFetchingEstimate(true);
    setEstimateError("");

    // Simulate API call with timeout
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
      
      setIsFetchingEstimate(false);
    }, 1500);
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
      roi
    };

    const updatedHoldings = [...realEstateHoldings, newProperty];
    setRealEstateHoldings(updatedHoldings);
    
    // Reset form
    setRealEstateForm({
      address: "", 
      type: "Residential", 
      purchasePrice: "", 
      currentValue: "",
      annualRent: "", 
      mortgage: "", 
      yearPurchased: new Date().getFullYear()
    });
    
    setEstimateError("");
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
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Add Real Estate Property</CardTitle>
            {estimateError && <p className="text-xs text-rose-500 mt-2 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {estimateError}</p>}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Address with Estimate Button */}
            <div className="space-y-1">
              <Label htmlFor="address" className="text-sm font-medium">Property Address</Label>
              <div className="flex gap-2 items-start">
                <Input 
                  id="address" 
                  name="address" 
                  placeholder="e.g., 123 Main St, Anytown, USA" 
                  value={realEstateForm.address} 
                  onChange={handleRealEstateChange} 
                  className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} 
                />
                <Button
                  variant="outline" 
                  size="sm" 
                  onClick={fetchPropertyEstimate}
                  disabled={isFetchingEstimate || !realEstateForm.address}
                  className="gap-1 flex-shrink-0"
                >
                  {isFetchingEstimate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4"/>}
                  <span className="hidden sm:inline">Estimate</span>
                </Button>
              </div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Enter address & click estimate (simulated).</p>
            </div>

            {/* Property Type */}
            <div>
              <Label htmlFor="type" className="text-sm font-medium mb-1 block">Property Type</Label>
              <Select value={realEstateForm.type} onValueChange={handleRealEstateTypeChange}>
                <SelectTrigger id="type" className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}> 
                  <SelectValue placeholder="Select type" /> 
                </SelectTrigger>
                <SelectContent className={`${darkMode ? 'bg-slate-700 border-slate-600 text-slate-100' : 'bg-white'}`}>
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
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Real Estate Holdings</CardTitle>
            <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-sm`}>
              Total Equity: ${totalRealEstateEquity.toLocaleString()} | Avg ROI: {avgRealEstateROI.toFixed(1)}%
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {realEstateHoldings.length > 0 ? realEstateHoldings.map(p => (
                <motion.div
                  key={p.id} 
                  layout 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, x: -20 }} 
                  transition={{ duration: 0.3 }}
                  className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className={`font-medium text-sm ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{p.address}</p>
                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{p.type} (Purchased {p.yearPurchased})</p>
                    </div>
                    <Button
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 flex-shrink-0 ml-2"
                      onClick={() => deleteRealEstateProperty(p.id)}
                    > 
                      <Trash2 className="h-3.5 w-3.5" /> 
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                    <div>
                      <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Value:</span>
                      <span className={`font-medium ml-1 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>${p.currentValue.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Equity:</span>
                      <span className={`font-medium ml-1 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>${(p.currentValue - (p.mortgage || 0)).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Rent/Yr:</span>
                      <span className={`font-medium ml-1 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>${(p.annualRent || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>ROI (Rent/Cost):</span>
                      <span className={`font-medium ml-1 ${p.roi >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>{p.roi.toFixed(1)}%</span>
                    </div>
                  </div>
                </motion.div>
              )) : ( 
                <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-center py-4`}>No real estate properties added yet.</p> 
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}