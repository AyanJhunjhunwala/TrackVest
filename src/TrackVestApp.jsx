import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Info, AlertCircle, X, Plus, Sparkles, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "./ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Import custom components
import Header from './header';
import OverviewTab from './tabs';
import StocksTab from './stocks';
import RealEstateTab from './realestate';
import InsightsTab from './insights';
import GeminiChat from './GeminiChat';
import SettingsModal from './components/SettingsModal';
import TutorialSystem from './components/TutorialSystem';
import MobileNotSupported from './components/MobileNotSupported';

// Import utility functions
import { 
  fetchStockPrice, 
  fetchCryptoPrice
} from './hooks';
import useMobileDetection from './hooks/useMobileDetection';

// Investment Category Modal Component
const InvestmentCategoryModal = ({ isOpen, onClose, darkMode, onCreateCategory }) => {
  const [activeTab, setActiveTab] = useState('quick');
  const [categoryName, setCategoryName] = useState('');
  const [investmentDescription, setInvestmentDescription] = useState('');
  const [dollarAmount, setDollarAmount] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);

  const handleGenerate = async () => {
    if (activeTab === 'quick' && !categoryName.trim()) return;
    if (activeTab === 'detailed' && !investmentDescription.trim()) return;
    
    setIsGenerating(true);
    try {
      // Get API key from localStorage
      const apiKey = localStorage.getItem('geminiApiKey') || '';
      
      if (!apiKey || apiKey.trim().length < 10) {
        console.warn('No valid Gemini API key found, using fallback data');
        // Create fallback category
        setGeneratedContent({
          name: activeTab === 'quick' ? categoryName : 'Custom Investment Category',
          description: activeTab === 'quick' ? `A custom investment category for ${categoryName}` : investmentDescription,
          riskLevel: "Medium",
          expectedReturn: "6-10%",
          timeHorizon: "Medium-term",
          keyMetrics: ["ROI", "Volatility", "Sharpe Ratio"],
          recommendedAssets: [],
          riskFactors: ["Market volatility", "Economic conditions"],
          marketTrends: "Analysis not available without API key",
          investmentStrategy: "Diversified approach recommended",
          rebalancingFrequency: "Quarterly",
          taxConsiderations: "Consult with tax advisor",
          estimatedAmount: dollarAmount || 'Not specified'
        });
        setIsGenerating(false);
        return;
      }
      
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // Use Gemini 2.5 Flash Preview for agentic AI with web search
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-05-20" });
      
      let prompt;
      if (activeTab === 'quick') {
        prompt = `
          You are an expert investment advisor creating a comprehensive investment category for TrackVest.
          
          Category Name: ${categoryName}
          
          Research this investment category thoroughly and create a detailed analysis with the following structure:
          {
            "name": "${categoryName}",
            "description": "A comprehensive description based on current market research",
            "riskLevel": "Low|Medium|High (based on actual market analysis)",
            "expectedReturn": "realistic percentage range based on current market data",
            "timeHorizon": "Short-term|Medium-term|Long-term (appropriate for this investment type)",
            "keyMetrics": ["relevant metrics specific to this investment type"],
            "recommendedAssets": [
              {
                "symbol": "ACTUAL_SYMBOL",
                "name": "Real Asset Name",
                "allocation": "percentage based on risk profile",
                "rationale": "specific reason based on current market conditions",
                "currentPrice": "current market price if available",
                "marketCap": "market cap if available"
              }
            ],
            "riskFactors": ["specific risks for this investment category"],
            "marketTrends": "Current market analysis and trends",
            "investmentStrategy": "Detailed strategy based on current conditions",
            "rebalancingFrequency": "Appropriate frequency for this investment type",
            "taxConsiderations": "Specific tax implications for this investment category"
          }
          
          IMPORTANT: Base ALL values on actual market research and analysis. Do not use generic placeholders.
          Return only valid JSON.
        `;
      } else {
        prompt = `
          You are an expert investment advisor with web search capabilities. Analyze this investment description and create a comprehensive investment category.
          
          Investment Description: ${investmentDescription}
          ${dollarAmount ? `Investment Amount: $${dollarAmount}` : ''}
          
          Please search the web for current information about this specific investment, including:
          - Current market conditions and trends for this asset type
          - Specific valuation methods and appreciation rates
          - Risk factors and market volatility
          - Tax implications and considerations
          - Comparable assets and market performance
          - Industry-specific metrics and benchmarks
          
          Based on your research, create a detailed investment category with this structure:
          {
            "name": "Descriptive name based on the investment type",
            "description": "Comprehensive description incorporating web research and specific details",
            "riskLevel": "Low|Medium|High (based on actual market volatility and risk analysis)",
            "expectedReturn": "realistic percentage range based on historical data and current market conditions",
            "timeHorizon": "Short-term|Medium-term|Long-term (appropriate for this specific investment)",
            "keyMetrics": ["specific metrics relevant to this investment type - e.g., for vintage cars: appreciation rate, condition score, rarity index, market demand"],
            "recommendedAssets": [
              {
                "symbol": "RELEVANT_SYMBOL_OR_IDENTIFIER",
                "name": "Specific Asset Name",
                "allocation": "percentage based on investment amount and risk profile",
                "rationale": "detailed reasoning based on research",
                "currentPrice": "current market value if available",
                "marketCap": "market size or comparable values"
              }
            ],
            "riskFactors": ["specific risks identified from research"],
            "marketTrends": "Latest market analysis from web search with specific data points",
            "investmentStrategy": "Strategy tailored to this specific investment based on current market conditions",
            "rebalancingFrequency": "Appropriate frequency for this investment type",
            "taxConsiderations": "Specific tax implications based on current tax law research",
            "webSources": ["URLs of sources used for research"],
            "lastUpdated": "${new Date().toISOString()}",
            "estimatedAmount": "${dollarAmount || 'Not specified'}",
            "specificMetrics": {
              "appreciationRate": "annual appreciation rate based on research",
              "volatility": "market volatility percentage",
              "liquidityScore": "how easily this can be sold (1-10)",
              "marketSize": "total addressable market size"
            }
          }
          
          CRITICAL: Use real, current data from your web search. Infer ALL metrics from the specific investment described.
          For example, if it's a vintage car, research vintage car markets, appreciation rates, auction results, etc.
          Return only valid JSON with NO generic placeholders.
        `;
      }
      
      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
        tools: activeTab === 'detailed' ? [{ googleSearch: {} }] : undefined,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192
        }
      });
      
      const response = result.response.text();
      
      // Clean the response to handle markdown code blocks and other formatting
      let cleanedResponse = response.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Remove any leading/trailing whitespace and newlines
      cleanedResponse = cleanedResponse.trim();
      
      // Find JSON object boundaries if there's extra text
      const jsonStart = cleanedResponse.indexOf('{');
      let jsonEnd = cleanedResponse.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd + 1);
        
        // Validate bracket matching
        let bracketCount = 0;
        let validEnd = -1;
        
        for (let i = 0; i < cleanedResponse.length; i++) {
          if (cleanedResponse[i] === '{') {
            bracketCount++;
          } else if (cleanedResponse[i] === '}') {
            bracketCount--;
            if (bracketCount === 0) {
              validEnd = i;
              break;
            }
          }
        }
        
        if (validEnd !== -1) {
          cleanedResponse = cleanedResponse.substring(0, validEnd + 1);
        }
      }
      
      // Parse the JSON response
      try {
        const categoryData = JSON.parse(cleanedResponse);
        
        // Validate that we have the required fields
        if (categoryData && typeof categoryData === 'object' && categoryData.name) {
          setGeneratedContent(categoryData);
        } else {
          throw new Error('Invalid category data structure');
        }
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.error('Original response length:', response.length);
        console.error('Cleaned response:', cleanedResponse);
        
        // Try to extract partial data if possible
        let partialData = null;
        try {
          // Look for name field in the response
          const nameMatch = response.match(/"name":\s*"([^"]+)"/);
          const descMatch = response.match(/"description":\s*"([^"]+)"/);
          const riskMatch = response.match(/"riskLevel":\s*"([^"]+)"/);
          const returnMatch = response.match(/"expectedReturn":\s*"([^"]+)"/);
          
          if (nameMatch) {
            partialData = {
              name: nameMatch[1],
              description: descMatch ? descMatch[1] : `Investment analysis for ${investmentDescription || categoryName}`,
              riskLevel: riskMatch ? riskMatch[1] : "Medium",
              expectedReturn: returnMatch ? returnMatch[1] : "6-10%",
              timeHorizon: "Medium-term",
              keyMetrics: ["ROI", "Volatility", "Market Analysis"],
              recommendedAssets: [],
              riskFactors: ["Market volatility", "Economic conditions"],
              marketTrends: "Analysis based on available data",
              investmentStrategy: "Diversified approach recommended",
              rebalancingFrequency: "Quarterly",
              taxConsiderations: "Consult with tax advisor",
              estimatedAmount: dollarAmount || 'Not specified'
            };
          }
        } catch (extractError) {
          console.error('Error extracting partial data:', extractError);
        }
        
        if (partialData) {
          setGeneratedContent(partialData);
        } else {
          // Intelligent fallback category structure based on input
          const isVintageCar = investmentDescription.toLowerCase().includes('car') || investmentDescription.toLowerCase().includes('vintage');
          const isRealEstate = investmentDescription.toLowerCase().includes('property') || investmentDescription.toLowerCase().includes('real estate');
          
          let intelligentFallback;
          
          if (isVintageCar) {
            intelligentFallback = {
              name: 'Vintage Car Investment',
              description: `Investment in vintage automobiles with estimated appreciation of 2% annually. Based on description: ${investmentDescription}`,
              riskLevel: "Medium",
              expectedReturn: "2-4%",
              timeHorizon: "Long-term",
              keyMetrics: ["Appreciation Rate", "Condition Score", "Rarity Index", "Market Demand", "Maintenance Costs"],
              recommendedAssets: [
                {
                  symbol: "VINTAGE_AUTO",
                  name: "Classic Automobile Collection",
                  allocation: "100%",
                  rationale: "Direct investment in appreciating vintage vehicle",
                  currentPrice: dollarAmount || "40000",
                  marketCap: "Collectible Auto Market"
                }
              ],
              riskFactors: ["Market volatility", "Maintenance costs", "Storage requirements", "Insurance costs", "Liquidity constraints"],
              marketTrends: "Vintage car market showing steady appreciation, particularly for well-maintained classics",
              investmentStrategy: "Buy and hold strategy with proper maintenance and storage",
              rebalancingFrequency: "Annual assessment",
              taxConsiderations: "Capital gains tax on appreciation, potential collectible tax rates",
              specificMetrics: {
                appreciationRate: "2% annually",
                volatility: "15-25%",
                liquidityScore: "4/10",
                marketSize: "Niche collectible market"
              }
            };
          } else if (isRealEstate) {
            intelligentFallback = {
              name: 'Real Estate Investment',
              description: `Real estate investment opportunity. ${investmentDescription}`,
              riskLevel: "Medium",
              expectedReturn: "6-12%",
              timeHorizon: "Long-term",
              keyMetrics: ["Cap Rate", "Cash Flow", "Appreciation", "Occupancy Rate", "NOI"],
              recommendedAssets: [],
              riskFactors: ["Market cycles", "Interest rate changes", "Property management"],
              marketTrends: "Real estate market analysis based on location and property type",
              investmentStrategy: "Location-based buy and hold strategy",
              rebalancingFrequency: "Annual",
              taxConsiderations: "Depreciation benefits, 1031 exchanges, capital gains"
            };
          } else {
            intelligentFallback = {
              name: activeTab === 'quick' ? categoryName : 'Custom Investment Category',
              description: activeTab === 'quick' ? `Investment category for ${categoryName}` : investmentDescription,
              riskLevel: "Medium",
              expectedReturn: "6-10%",
              timeHorizon: "Medium-term",
              keyMetrics: ["ROI", "Volatility", "Sharpe Ratio", "Beta", "Alpha"],
              recommendedAssets: [],
              riskFactors: ["Market volatility", "Economic conditions", "Sector-specific risks"],
              marketTrends: "Market analysis based on investment type",
              investmentStrategy: "Diversified approach with risk management",
              rebalancingFrequency: "Quarterly",
              taxConsiderations: "Standard investment tax implications"
            };
          }
          
          setGeneratedContent({
            ...intelligentFallback,
            estimatedAmount: dollarAmount || 'Not specified'
          });
        }
      }
    } catch (error) {
      console.error('Error generating category:', error);
      setGeneratedContent({
        name: activeTab === 'quick' ? categoryName : 'Custom Investment Category',
        description: activeTab === 'quick' ? `A custom investment category for ${categoryName}` : investmentDescription,
        riskLevel: "Medium",
        expectedReturn: "6-10%",
        timeHorizon: "Medium-term",
        keyMetrics: ["ROI", "Volatility", "Sharpe Ratio"],
        recommendedAssets: [],
        riskFactors: ["Market volatility", "Economic conditions"],
        marketTrends: "Analysis not available",
        investmentStrategy: "Diversified approach recommended",
        rebalancingFrequency: "Quarterly",
        taxConsiderations: "Consult with tax advisor",
        estimatedAmount: dollarAmount || 'Not specified'
      });
    }
    setIsGenerating(false);
  };

  const handleSave = async () => {
    if (generatedContent) {
      // Enhanced category data with caching information
      const enhancedCategory = {
        ...generatedContent,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        source: activeTab,
        originalInput: activeTab === 'quick' ? categoryName : investmentDescription,
        dollarAmount: dollarAmount || null
      };
      
      // Save to local storage with enhanced data
      await saveCategoryToLocalStorage(enhancedCategory);
      
      onCreateCategory(enhancedCategory);
      handleClose();
    }
  };

  const saveCategoryToLocalStorage = async (category) => {
    try {
      // Get existing categories
      const existingCategories = JSON.parse(localStorage.getItem('investmentCategories') || '[]');
      
      // Add new category
      const updatedCategories = [...existingCategories, category];
      
      // Save categories
      localStorage.setItem('investmentCategories', JSON.stringify(updatedCategories));
      
      // Cache any stock/crypto data mentioned in recommended assets
      if (category.recommendedAssets && category.recommendedAssets.length > 0) {
        const assetCache = JSON.parse(localStorage.getItem('assetDataCache') || '{}');
        
        for (const asset of category.recommendedAssets) {
          if (asset.symbol && asset.currentPrice) {
            assetCache[asset.symbol] = {
              symbol: asset.symbol,
              name: asset.name,
              price: asset.currentPrice,
              marketCap: asset.marketCap,
              lastUpdated: new Date().toISOString(),
              source: 'investment_category'
            };
          }
        }
        
        localStorage.setItem('assetDataCache', JSON.stringify(assetCache));
      }
      
      console.log('Investment category and asset data saved to local storage');
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  };

  const handleClose = () => {
    setCategoryName('');
    setInvestmentDescription('');
    setDollarAmount('');
    setGeneratedContent(null);
    setActiveTab('quick');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className={`relative w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-auto rounded-xl shadow-xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className={`h-6 w-6 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                Create Investment Category
              </h2>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Tab Navigation */}
          <div className={`flex mb-6 p-1 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
            <button
              onClick={() => setActiveTab('quick')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'quick'
                  ? darkMode ? 'bg-slate-600 text-white' : 'bg-white text-slate-900 shadow-sm'
                  : darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Quick Category
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'detailed'
                  ? darkMode ? 'bg-slate-600 text-white' : 'bg-white text-slate-900 shadow-sm'
                  : darkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Detailed Analysis
            </button>
          </div>
          
          <div className="space-y-4">
            {activeTab === 'quick' ? (
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                  Investment Category Name
                </label>
                <Input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g., ESG Technology, Dividend Growth, Emerging Markets"
                  className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    Investment Description
                  </label>
                  <textarea
                    value={investmentDescription}
                    onChange={(e) => setInvestmentDescription(e.target.value)}
                    placeholder="Describe your investment idea in detail. For example: 'I want to invest in renewable energy companies focusing on solar and wind power, particularly those with strong ESG ratings and growth potential in emerging markets...'"
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md resize-none ${
                      darkMode 
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                    Investment Amount (Optional)
                  </label>
                  <Input
                    type="number"
                    value={dollarAmount}
                    onChange={(e) => setDollarAmount(e.target.value)}
                    placeholder="e.g., 10000"
                    className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}
                  />
                  <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    This helps the AI provide more specific allocation recommendations
                  </p>
                </div>
              </div>
            )}
            
            <Button 
              onClick={handleGenerate}
              disabled={
                (activeTab === 'quick' && !categoryName.trim()) || 
                (activeTab === 'detailed' && !investmentDescription.trim()) || 
                isGenerating
              }
              className={`w-full gap-2 ${darkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-400'} text-white`}
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {activeTab === 'detailed' ? 'Researching & Generating...' : 'Generating with AI...'}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {activeTab === 'detailed' ? 'Research & Generate Category' : 'Generate Category with AI'}
                </>
              )}
            </Button>
            
            {generatedContent && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-slate-50 border-slate-200'}`}
              >
                <h3 className={`font-semibold mb-3 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {generatedContent.name}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Risk Level:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                      generatedContent.riskLevel === 'High' ? 'bg-red-100 text-red-800' :
                      generatedContent.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {generatedContent.riskLevel}
                    </span>
                  </div>
                  
                  <div>
                    <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Expected Return:</span>
                    <span className={`ml-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {generatedContent.expectedReturn}
                    </span>
                  </div>
                  
                  <div>
                    <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Time Horizon:</span>
                    <span className={`ml-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      {generatedContent.timeHorizon}
                    </span>
                  </div>
                  
                  <div>
                    <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Rebalancing:</span>
                    <span className={`ml-2 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                      {generatedContent.rebalancingFrequency}
                    </span>
                  </div>
                  
                  {generatedContent.estimatedAmount && (
                    <div className="md:col-span-2">
                      <span className={`font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Investment Amount:</span>
                      <span className={`ml-2 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        ${generatedContent.estimatedAmount}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3">
                  <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {generatedContent.description}
                  </p>
                </div>
                
                {generatedContent.recommendedAssets && generatedContent.recommendedAssets.length > 0 && (
                  <div className="mt-3">
                    <span className={`font-medium text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      Recommended Assets:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {generatedContent.recommendedAssets.map((asset, index) => (
                        <span key={index} className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-slate-600 text-slate-200' : 'bg-slate-200 text-slate-700'}`}>
                          {asset.symbol} ({asset.allocation})
                          {asset.currentPrice && <span className="ml-1 text-green-600">${asset.currentPrice}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {generatedContent.webSources && generatedContent.webSources.length > 0 && (
                  <div className="mt-3">
                    <span className={`font-medium text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      Research Sources:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {generatedContent.webSources.slice(0, 3).map((source, index) => (
                        <a 
                          key={index} 
                          href={source} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`text-xs px-2 py-1 rounded hover:underline ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}
                        >
                          Source {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            
            {generatedContent && (
              <div className="flex gap-3">
                <Button 
                  onClick={handleSave}
                  className={`flex-1 gap-2 ${darkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-400'} text-white`}
                >
                  <TrendingUp className="h-4 w-4" />
                  Save Category
                </Button>
                <Button 
                  onClick={handleClose}
                  variant="outline"
                  className={`${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-600'}`}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Welcome Modal Component
const WelcomeModal = ({ isOpen, onClose, darkMode }) => {
  if (!isOpen) return null;

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className={`relative w-full max-w-lg mx-auto rounded-xl overflow-hidden shadow-xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <img src="/src/trackvest.png" alt="TrackVest Logo" className="w-12 h-12" onError={(e) => { e.target.style.display = 'none'; }} />
              <div>
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Welcome to TrackVest!</h2>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>AI-powered investment tracking</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className={`mb-6 space-y-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            <p className="text-lg leading-relaxed">
              Hi! I created this <span className="font-semibold text-emerald-500">free-to-use AI-powered platform</span> for tracking any kind of investment. 
            </p>
            
            <p>
              TrackVest uses free APIs to feed accurate data to your dashboard and lets you discover insights from your portfolio through quick prompts with the AI assistant.
            </p>
            
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/50 border-l-4 border-emerald-500' : 'bg-emerald-50 border-l-4 border-emerald-500'}`}>
              <p className="text-sm">
                <span className="font-medium">This is the first version</span> and I expect to make heaps of improvements over the next couple of months. I hope you enjoy it!
              </p>
            </div>
            
            <p className="text-sm">
              Feel free to reach out to me directly for any feedback or questions.
            </p>
            
            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm font-medium">— Ayan</span>
              <a 
                href="https://ayanj.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-sm hover:underline ${darkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'} transition-colors`}
              >
                ayanj.com
              </a>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={onClose}
              className={`${darkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-400'} text-white px-6`}
            >
              Start Tracking!
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Demo mode and onboarding components
const OnboardingModal = ({ isOpen, onClose, darkMode, currentStep, onNext, onPrev, demoMode }) => {
  const steps = [
    {
      title: "Welcome to TrackVest",
      content: "Your AI-powered investment tracking platform that handles any type of investment - from traditional stocks to alternative assets.",
      icon: "logo",
      features: ["Track vintage cars, art, crypto, real estate", "Zero-cost API integrations", "AI researches investments for you"]
    },
    {
      title: "Portfolio Overview",
      content: "Get a comprehensive view of your entire portfolio with performance charts, asset allocation, and trend analysis.",
      icon: "📊",
      features: ["Generate custom performance comparisons", "Side-by-side stock analysis charts", "Interactive asset allocation breakdowns"]
    },
    {
      title: "Stocks & Crypto Tracking",
      content: demoMode.polygon ? "Live stock and crypto data via Polygon.io API. Data is ~2 days behind on free tier, but I'm working on a free real-time solution!" : "Demo mode: Uses Polygon.io API for live data (free tier has 2-day delay). Add your API key to get started!",
      icon: "💹",
      features: demoMode.polygon ? ["Polygon.io professional-grade data", "2-day delay (upgrading to real-time)", "Free tier with premium features"] : ["Professional market data access", "Get free Polygon.io API key", "Upgrade path to real-time data"]
    },
    {
      title: "Real Estate Tracking",
      content: demoMode.gemini ? "Smart real estate tracking that circumvents expensive data providers using Google web scraping for property valuations." : "Demo mode: Uses AI and web scraping to avoid expensive real estate data APIs. Add Gemini API key for full features!",
      icon: "🏡",
      features: demoMode.gemini ? ["Google web scraping for live valuations", "Bypass $1000+/month real estate APIs", "AI-powered property market analysis"] : ["Smart grounded webscraping", "Avoid expensive real estate data fees", "Get Gemini API key for AI features"]
    },
    {
      title: "AI Investment Assistant",
      content: demoMode.gemini ? "Chat with the AI assistant for limitless data insights, investment analysis, and portfolio optimization. Ask anything about your investments!" : "Demo mode: AI assistant with limitless data insights and investment analysis. Requires Gemini API key for full functionality.",
      icon: "🤖",
      features: demoMode.gemini ? ["Limitless data insights on any topic", "Custom investment strategy recommendations", "Real-time market sentiment analysis"] : ["Sample AI responses", "Limitless data insight capability", "Get Gemini API key for full access"]
    },
    {
      title: "Alternative Investments",
      content: "Use the + button to add ANY type of investment - vintage cars, art, collectibles, private equity. The AI will research it and help you track it!",
      icon: "📈",
      features: ["AI auto-researches any investment type", "Track collectibles, art, vintage items", "Automatic valuation and trend analysis"]
    },
    {
      title: "Coming Soon",
      content: "Exciting new features are in development to make TrackVest even more powerful and accessible!",
      icon: "🚀",
      features: [
        "Mobile app + secure database caching (your data stays private)",
        "Enhanced web-scraped insights with smarter data collection",
        "Automated API integration after creating investment categories"
      ]
    }
  ];

  const currentStepData = steps[currentStep] || steps[0];

  if (!isOpen) return null;

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className={`relative w-full max-w-2xl mx-auto rounded-xl shadow-xl ${darkMode ? 'bg-slate-800' : 'bg-white'}`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
      >
        <div className="p-8">
          <div className="text-center mb-6">
            {currentStepData.icon === "logo" ? (
              <div className="flex justify-center mb-4">
                <img src="/src/trackvest.png" alt="TrackVest Logo" className="w-16 h-16" onError={(e) => { e.target.style.display = 'none'; }} />
              </div>
            ) : (
              <div className="text-6xl mb-4">{currentStepData.icon}</div>
            )}
            <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>
              {currentStepData.title}
            </h2>
            <p className={`text-lg ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              {currentStepData.content}
            </p>
          </div>
          
          <div className="mb-6">
            <h3 className={`font-semibold mb-3 ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>
              Key Features:
            </h3>
            <ul className="space-y-2">
              {currentStepData.features.map((feature, index) => (
                <li key={index} className={`flex items-center ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  <span className="text-emerald-500 mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          
          {/* Demo mode indicators */}
          {(currentStep === 2 || currentStep === 3 || currentStep === 4) && (
            <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  API Status:
                </span>
                <div className="flex gap-2">
                  {currentStep === 2 && (
                    <span className={`px-2 py-1 rounded text-xs ${
                      demoMode.polygon 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      Polygon: {demoMode.polygon ? 'Active' : 'Demo'}
                    </span>
                  )}
                  {(currentStep === 3 || currentStep === 4) && (
                    <span className={`px-2 py-1 rounded text-xs ${
                      demoMode.gemini 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      Gemini: {demoMode.gemini ? 'Active' : 'Demo'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Progress indicator */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Step {currentStep + 1} of {steps.length}
              </span>
              <span className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {Math.round(((currentStep + 1) / steps.length) * 100)}%
              </span>
            </div>
            <div className={`w-full h-2 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <div 
                className="h-2 bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
          
          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button 
              onClick={onPrev}
              disabled={currentStep === 0}
              variant="outline"
              className={`${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-600'}`}
            >
              Previous
            </Button>
            
            <div className="flex gap-2">
              <Button 
                onClick={onClose}
                variant="outline"
                className={`${darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-600'}`}
              >
                Skip Tour
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button 
                  onClick={onNext}
                  className={`${darkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-400'} text-white`}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={onClose}
                  className={`${darkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-400'} text-white`}
                >
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function TrackVestApp() {
  // Mobile detection
  const isMobile = useMobileDetection();
  
  // State for API key
  const [apiKey] = useState(() => localStorage.getItem('polygonApiKey') || '');
  const [showApiInput, setShowApiInput] = useState(false);
  const [refreshApiError, setRefreshApiError] = useState(""); // Specific error during refresh

  // Use theme context instead of local state
  const { darkMode, setDarkMode } = useTheme();
  
  // Tutorial and refresh tracking state
  const [hasUserRefreshed, setHasUserRefreshed] = useState(() => {
    return localStorage.getItem('hasUserRefreshed') === 'true';
  });
  const [showTutorial, setShowTutorial] = useState(true);
  
  // Demo mode detection
  const [demoMode, setDemoMode] = useState(() => {
    const geminiKey = localStorage.getItem('geminiApiKey');
    const polygonKey = localStorage.getItem('polygonApiKey');
    return {
      gemini: !!(geminiKey && geminiKey.trim() && geminiKey.length > 10),
      polygon: !!(polygonKey && polygonKey.trim() && polygonKey.length > 10)
    };
  });
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  
  // Welcome modal state
  const [showWelcome, setShowWelcome] = useState(false);
  
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  
  // Investment category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // Investment categories state
  const [investmentCategories, setInvestmentCategories] = useState(() => {
    const saved = localStorage.getItem('investmentCategories');
    return saved ? JSON.parse(saved) : [];
  });

  // State for holdings
  const [positions, setPositions] = useState(() => {
    // Try to load cached data immediately during state initialization
    try {
      const portfolioCache = localStorage.getItem('portfolioCache');
      if (portfolioCache) {
        const cached = JSON.parse(portfolioCache);
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        
        // Use cached data if it's less than 1 hour old
        if (cacheAge < 60 * 60 * 1000) {
          console.log('Loading cached portfolio data during initialization, age:', Math.round(cacheAge / 1000 / 60), 'minutes');
          const allPositions = [];
          
          if (cached.stocks && cached.stocks.length > 0) {
            allPositions.push(...cached.stocks.map(stock => ({
              ...stock,
              currentPrice: stock.currentPrice || stock.price
            })));
          }
          
          if (cached.crypto && cached.crypto.length > 0) {
            allPositions.push(...cached.crypto.map(crypto => ({
              ...crypto,
              currentPrice: crypto.currentPrice || crypto.price
            })));
          }
          
          if (allPositions.length > 0) {
            console.log('Loaded', allPositions.length, 'positions from cache');
            return allPositions;
          }
        }
      }
    } catch (error) {
      console.error('Error loading cached positions during initialization:', error);
    }
    
    // Fallback to default positions
    return [
      { id: 1, symbol: "AAPL", name: "Apple Inc.", quantity: 15, price: 190.50, shares: 15, value: 2857.50, change: 2.3, assetType: "stocks", logoUrl: "https://logo.clearbit.com/apple.com" },
      { id: 2, symbol: "MSFT", name: "Microsoft Corp.", quantity: 10, price: 325.00, shares: 10, value: 3250.00, change: 1.7, assetType: "stocks", logoUrl: "https://logo.clearbit.com/microsoft.com" },
      { id: 3, symbol: "GOOGL", name: "Alphabet Inc.", quantity: 8, price: 140.20, shares: 8, value: 1121.60, change: -0.5, assetType: "stocks", logoUrl: "https://logo.clearbit.com/google.com" },
      { id: 4, symbol: "BTC", name: "Bitcoin", quantity: 0.5, price: 49800.00, shares: 0.5, value: 24900.00, change: 5.2, assetType: "crypto", logoUrl: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/btc.png" },
      { id: 5, symbol: "ETH", name: "Ethereum", quantity: 2.3, price: 2350.00, shares: 2.3, value: 5405.00, change: 3.8, assetType: "crypto", logoUrl: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png" }
    ];
  });

  // State for real estate holdings
  const [realEstateHoldings, setRealEstateHoldings] = useState(() => {
    // Try to load cached real estate data immediately during state initialization
    try {
      const portfolioCache = localStorage.getItem('portfolioCache');
      if (portfolioCache) {
        const cached = JSON.parse(portfolioCache);
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        
        // Use cached data if it's less than 1 hour old
        if (cacheAge < 60 * 60 * 1000 && cached.realEstate && cached.realEstate.length > 0) {
          console.log('Loading cached real estate data during initialization, age:', Math.round(cacheAge / 1000 / 60), 'minutes');
          console.log('Loaded', cached.realEstate.length, 'real estate properties from cache');
          return cached.realEstate;
        }
      }
    } catch (error) {
      console.error('Error loading cached real estate during initialization:', error);
    }
    
    // Fallback to default real estate holdings
    return [
      { id: 1, address: "123 Main St, Austin, TX", type: "Residential", purchasePrice: 450000, currentValue: 520000, annualRent: 36000, roi: 8.0, mortgage: 320000, yearPurchased: 2019 },
      { id: 2, address: "456 Oak Ave, Denver, CO", type: "Multi-family", purchasePrice: 750000, currentValue: 890000, annualRent: 72000, roi: 9.6, mortgage: 600000, yearPurchased: 2018 },
      { id: 3, address: "789 Market Blvd, Seattle, WA", type: "Commercial", purchasePrice: 1200000, currentValue: 1350000, annualRent: 120000, roi: 10.0, mortgage: 900000, yearPurchased: 2021 }
    ];
  });
  
  // General Loading state (for refresh)
  const [isLoading, setIsLoading] = useState(false);
  
  // Market data state
  const [marketData] = useState(null);
  
  // Performance data state
  const [performanceData, setPerformanceData] = useState(() => {
    // Try to load cached analytics data
    try {
      const analyticsCache = localStorage.getItem('analyticsCache');
      if (analyticsCache) {
        const cached = JSON.parse(analyticsCache);
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        
        // Use cached data if it's less than 1 hour old
        if (cacheAge < 60 * 60 * 1000 && cached.performanceData && cached.performanceData.length > 0) {
          console.log('Loading cached performance data during initialization, age:', Math.round(cacheAge / 1000 / 60), 'minutes');
          return cached.performanceData;
        }
      }
    } catch (error) {
      console.error('Error loading cached performance data during initialization:', error);
    }
    
    // Fallback to default performance data
    return [
      { month: 'Jan', value: 42000 }, { month: 'Feb', value: 44000 }, { month: 'Mar', value: 46500 },
      { month: 'Apr', value: 45800 }, { month: 'May', value: 47200 }, { month: 'Jun', value: 48300 },
      { month: 'Jul', value: 47900 }, { month: 'Aug', value: 49700 }, { month: 'Sep', value: 52000 },
      { month: 'Oct', value: 54500 }, { month: 'Nov', value: 57200 }, { month: 'Dec', value: 60000 }
    ];
  });

  // Risk data
  const [riskData, setRiskData] = useState(() => {
    // Try to load cached analytics data
    try {
      const analyticsCache = localStorage.getItem('analyticsCache');
      if (analyticsCache) {
        const cached = JSON.parse(analyticsCache);
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        
        // Use cached data if it's less than 1 hour old
        if (cacheAge < 60 * 60 * 1000 && cached.riskData && cached.riskData.length > 0) {
          console.log('Loading cached risk data during initialization');
          return cached.riskData;
        }
      }
    } catch (error) {
      console.error('Error loading cached risk data during initialization:', error);
    }
    
    // Fallback to default risk data
    return [
      { name: 'AAPL', risk: 12, return: 15 }, { name: 'MSFT', risk: 10, return: 12 },
      { name: 'GOOGL', risk: 15, return: 17 }, { name: 'BTC', risk: 28, return: 32 },
      { name: 'ETH', risk: 25, return: 30 },
    ];
  });

  // Asset allocation data
  const [assetAllocation, setAssetAllocation] = useState(() => {
    // Try to load cached analytics data
    try {
      const analyticsCache = localStorage.getItem('analyticsCache');
      if (analyticsCache) {
        const cached = JSON.parse(analyticsCache);
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        
        // Use cached data if it's less than 1 hour old
        if (cacheAge < 60 * 60 * 1000 && cached.assetAllocation && cached.assetAllocation.length > 0) {
          console.log('Loading cached asset allocation during initialization');
          return cached.assetAllocation;
        }
      }
    } catch (error) {
      console.error('Error loading cached asset allocation during initialization:', error);
    }
    
    // Fallback to default asset allocation
    return [
      { name: "Technology", value: 38, color: "#10b981" }, { name: "Crypto", value: 27, color: "#8b5cf6" },
      { name: "Healthcare", value: 12, color: "#3b82f6" }, { name: "Consumer", value: 15, color: "#f59e0b" },
      { name: "Energy", value: 8, color: "#ec4899" }
    ];
  });

  // Carbon intensity data
  const [carbonData, setCarbonData] = useState(() => {
    // Try to load cached analytics data
    try {
      const analyticsCache = localStorage.getItem('analyticsCache');
      if (analyticsCache) {
        const cached = JSON.parse(analyticsCache);
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        
        // Use cached data if it's less than 1 hour old
        if (cacheAge < 60 * 60 * 1000 && cached.carbonData && cached.carbonData.length > 0) {
          console.log('Loading cached carbon data during initialization');
          return cached.carbonData;
        }
      }
    } catch (error) {
      console.error('Error loading cached carbon data during initialization:', error);
    }
    
    // Fallback to default carbon data
    return [
      { name: "AAPL", score: 3.2 }, { name: "MSFT", score: 2.8 }, { name: "GOOGL", score: 4.1 },
      { name: "BTC", score: 8.9 }, { name: "ETH", score: 7.2 }
    ];
  });

  // Quantitative insights data
  const [correlationData, setCorrelationData] = useState(() => {
    // Try to load cached analytics data
    try {
      const analyticsCache = localStorage.getItem('analyticsCache');
      if (analyticsCache) {
        const cached = JSON.parse(analyticsCache);
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        
        // Use cached data if it's less than 1 hour old
        if (cacheAge < 60 * 60 * 1000 && cached.correlationData && cached.correlationData.length > 0) {
          console.log('Loading cached correlation data during initialization');
          return cached.correlationData;
        }
      }
    } catch (error) {
      console.error('Error loading cached correlation data during initialization:', error);
    }
    
    // Fallback to default correlation data
    return [
      { name: "AAPL vs. SPY", value: 0.72 }, { name: "MSFT vs. SPY", value: 0.81 },
      { name: "GOOGL vs. SPY", value: 0.76 }, { name: "BTC vs. SPY", value: 0.23 },
      { name: "ETH vs. SPY", value: 0.18 }
    ];
  });
  
  const [sharpeRatios, setSharpeRatios] = useState(() => {
    // Try to load cached analytics data
    try {
      const analyticsCache = localStorage.getItem('analyticsCache');
      if (analyticsCache) {
        const cached = JSON.parse(analyticsCache);
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        
        // Use cached data if it's less than 1 hour old
        if (cacheAge < 60 * 60 * 1000 && cached.sharpeRatios && cached.sharpeRatios.length > 0) {
          console.log('Loading cached Sharpe ratios during initialization');
          return cached.sharpeRatios;
        }
      }
    } catch (error) {
      console.error('Error loading cached Sharpe ratios during initialization:', error);
    }
    
    // Fallback to default Sharpe ratios
    return [
      { name: "AAPL", value: 1.3 }, { name: "MSFT", value: 1.5 }, { name: "GOOGL", value: 1.2 },
      { name: "BTC", value: 2.1 }, { name: "ETH", value: 1.8 }
    ];
  });
  
  const [volatilityData] = useState([
    { name: "Jan", market: 12, portfolio: 10 }, { name: "Feb", market: 14, portfolio: 11 },
    { name: "Mar", market: 18, portfolio: 15 }, { name: "Apr", market: 16, portfolio: 13 },
    { name: "May", market: 15, portfolio: 12 }, { name: "Jun", market: 17, portfolio: 14 },
    { name: "Jul", market: 20, portfolio: 16 }, { name: "Aug", market: 22, portfolio: 18 },
    { name: "Sep", market: 19, portfolio: 15 }, { name: "Oct", market: 16, portfolio: 13 },
    { name: "Nov", market: 14, portfolio: 12 }, { name: "Dec", market: 13, portfolio: 11 }
  ]);

  // API management state
  const [apiKeys] = useState([
    { id: 1, name: "Polygon.io", key: "", service: "Stock/Crypto Data", status: "Not Set", created: "2023-11-05", visible: false },
  ]);

  // Calculations
  const totalValue = positions.reduce((acc, p) => acc + p.value, 0);
  const totalChange = positions.reduce((acc, p) => acc + (p.quantity * p.price * (p.change / 100)), 0);
  const changePercentage = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

  const totalRealEstateValue = realEstateHoldings.reduce((acc, prop) => acc + prop.currentValue, 0);
  const totalRealEstateEquity = realEstateHoldings.reduce((acc, prop) => acc + (prop.currentValue - (prop.mortgage || 0)), 0);
  const totalAnnualRent = realEstateHoldings.reduce((acc, prop) => acc + (prop.annualRent || 0), 0);
  const avgRealEstateROI = realEstateHoldings.length > 0 ?
    realEstateHoldings.reduce((acc, prop) => acc + prop.roi, 0) / realEstateHoldings.length : 0;

  // Investment categories calculations
  const totalInvestmentCategoriesValue = investmentCategories.reduce((acc, category) => {
    const amount = parseFloat(category.estimatedAmount) || 0;
    return acc + amount;
  }, 0);

  // Total portfolio value including all asset types
  const totalPortfolioValue = totalValue + totalRealEstateEquity + totalInvestmentCategoriesValue;

  // Effects
  useEffect(() => {
    document.title = "TrackVest - Portfolio Tracker";

    // Set favicon
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = '/src/trackvest.png';
    link.type = 'image/png';
    
    // Check if it's the first visit and show onboarding
    const hasVisitedBefore = localStorage.getItem('hasVisitedTrackVest');
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    
    if (!hasVisitedBefore) {
      setShowWelcome(true);
    } else if (!hasCompletedOnboarding) {
      // Show onboarding for returning users who haven't completed it
      setShowOnboarding(true);
    }
  }, []);

  // Effect to save portfolio data whenever it changes
  useEffect(() => {
    // Don't save on initial render, only when data actually changes
    if (positions.length > 0 || realEstateHoldings.length > 0) {
      const savePortfolioData = async () => {
        try {
          const portfolioCache = {
            stocks: positions.filter(p => p.assetType === 'stocks'),
            crypto: positions.filter(p => p.assetType === 'crypto'),
            realEstate: realEstateHoldings,
            lastUpdated: new Date().toISOString()
          };
          localStorage.setItem('portfolioCache', JSON.stringify(portfolioCache));
          console.log('Portfolio data auto-saved to cache:', {
            stocks: portfolioCache.stocks.length,
            crypto: portfolioCache.crypto.length,
            realEstate: portfolioCache.realEstate.length
          });
        } catch (error) {
          console.error('Error auto-saving portfolio data:', error);
        }
      };
      
      // Debounce the save operation
      const timer = setTimeout(savePortfolioData, 1000);
      return () => clearTimeout(timer);
    }
  }, [positions, realEstateHoldings]);

  // Effect to save chart and analytics data
  useEffect(() => {
    const saveAnalyticsData = async () => {
      try {
        const analyticsCache = {
          assetAllocation,
          performanceData,
          riskData,
          correlationData,
          sharpeRatios,
          volatilityData,
          carbonData,
          lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('analyticsCache', JSON.stringify(analyticsCache));
        console.log('Analytics data auto-saved to cache');
      } catch (error) {
        console.error('Error auto-saving analytics data:', error);
      }
    };

    // Debounce the save operation
    const timer = setTimeout(saveAnalyticsData, 1000);
    return () => clearTimeout(timer);
  }, [assetAllocation, performanceData, riskData, correlationData, sharpeRatios, volatilityData, carbonData]);

  // Function to handle closing the welcome modal
  const closeWelcomeModal = () => {
    setShowWelcome(false);
    localStorage.setItem('hasVisitedTrackVest', 'true');
    // Start onboarding after welcome
    setShowOnboarding(true);
  };

  // Onboarding navigation functions
  const handleOnboardingNext = () => {
    if (onboardingStep < 6) {
      setOnboardingStep(onboardingStep + 1);
    } else {
      closeOnboarding();
    }
  };

  const handleOnboardingPrev = () => {
    if (onboardingStep > 0) {
      setOnboardingStep(onboardingStep - 1);
    }
  };

  const closeOnboarding = () => {
    setShowOnboarding(false);
    setOnboardingStep(0);
    localStorage.setItem('hasCompletedOnboarding', 'true');
  };

  // Function to handle creating investment categories
  const handleCreateCategory = async (categoryData) => {
    const newCategory = {
      ...categoryData,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    
    const updatedCategories = [...investmentCategories, newCategory];
    setInvestmentCategories(updatedCategories);
    
    // Enhanced local storage with comprehensive caching
    await saveToEnhancedLocalStorage(newCategory, updatedCategories);
  };

  // Function to handle deleting investment categories
  const handleDeleteCategory = async (categoryId) => {
    const updatedCategories = investmentCategories.filter(cat => cat.id !== categoryId);
    setInvestmentCategories(updatedCategories);
    
    // Update localStorage
    localStorage.setItem('investmentCategories', JSON.stringify(updatedCategories));
    
    // Remove associated cached assets
    try {
      const assetCache = JSON.parse(localStorage.getItem('assetDataCache') || '{}');
      const filteredAssetCache = Object.fromEntries(
        Object.entries(assetCache).filter(([key, value]) => value.categoryId !== categoryId)
      );
      localStorage.setItem('assetDataCache', JSON.stringify(filteredAssetCache));
      
      console.log(`Deleted investment category ${categoryId} and associated cached assets`);
    } catch (error) {
      console.error('Error removing cached assets:', error);
    }
  };

  // Enhanced local storage function
  const saveToEnhancedLocalStorage = async (category, allCategories) => {
    try {
      console.log('Saving enhanced data to local storage...');
      
      // Save investment categories
      localStorage.setItem('investmentCategories', JSON.stringify(allCategories));
      
      // Cache current portfolio data with current state
      const currentStocks = positions.filter(p => p.assetType === 'stocks');
      const currentCrypto = positions.filter(p => p.assetType === 'crypto');
      
      const portfolioCache = {
        stocks: currentStocks,
        crypto: currentCrypto,
        realEstate: realEstateHoldings,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('portfolioCache', JSON.stringify(portfolioCache));
      console.log('Portfolio cache saved:', {
        stocks: currentStocks.length,
        crypto: currentCrypto.length,
        realEstate: realEstateHoldings.length
      });
      
      // Cache market data if available
      if (marketData) {
        const marketCache = {
          data: marketData,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('marketDataCache', JSON.stringify(marketCache));
        console.log('Market data cache saved');
      }
      
      // Cache asset allocation data with current state
      const allocationCache = {
        allocation: assetAllocation,
        riskData: riskData,
        correlationData: correlationData,
        sharpeRatios: sharpeRatios,
        volatilityData: volatilityData,
        carbonData: carbonData,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('assetAllocationCache', JSON.stringify(allocationCache));
      console.log('Asset allocation cache saved');
      
      // Cache recommended assets from the category
      if (category.recommendedAssets && category.recommendedAssets.length > 0) {
        const existingAssetCache = JSON.parse(localStorage.getItem('assetDataCache') || '{}');
        
        for (const asset of category.recommendedAssets) {
          if (asset.symbol) {
            existingAssetCache[asset.symbol] = {
              symbol: asset.symbol,
              name: asset.name,
              price: asset.currentPrice || null,
              marketCap: asset.marketCap || null,
              allocation: asset.allocation,
              rationale: asset.rationale,
              lastUpdated: new Date().toISOString(),
              source: 'investment_category',
              categoryId: category.id
            };
          }
        }
        
        localStorage.setItem('assetDataCache', JSON.stringify(existingAssetCache));
        console.log('Asset data cache updated with', category.recommendedAssets.length, 'assets');
      }
      
      // Cache performance data with current state
      const performanceCache = {
        data: performanceData,
        totalValue: totalValue,
        totalRealEstateValue: totalRealEstateValue,
        totalRealEstateEquity: totalRealEstateEquity,
        totalAnnualRent: totalAnnualRent,
        avgRealEstateROI: avgRealEstateROI,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('performanceDataCache', JSON.stringify(performanceCache));
      console.log('Performance data cache saved');
      
      const cacheStats = {
        categories: allCategories.length,
        portfolioAssets: currentStocks.length + currentCrypto.length,
        realEstateProperties: realEstateHoldings.length,
        cachedAssets: Object.keys(JSON.parse(localStorage.getItem('assetDataCache') || '{}')).length,
        timestamp: new Date().toISOString()
      };
      
      console.log('Enhanced data saved successfully:', cacheStats);
      
      // Save cache statistics for debugging
      localStorage.setItem('cacheStats', JSON.stringify(cacheStats));
      
    } catch (error) {
      console.error('Error saving enhanced data to local storage:', error);
      // Try to save at least the categories
      try {
        localStorage.setItem('investmentCategories', JSON.stringify(allCategories));
        console.log('At least investment categories were saved');
      } catch (fallbackError) {
        console.error('Failed to save even basic category data:', fallbackError);
      }
    }
  };

  // Update charts data
  const updateChartsData = (updatedPositions) => {
    // Risk data
    const newRiskData = updatedPositions.map(p => ({
      name: p.symbol,
      risk: parseFloat((Math.random() * (p.assetType === 'crypto' ? 30 : 15) + 5).toFixed(1)),
      return: parseFloat((Math.random() * (p.assetType === 'crypto' ? 40 : 20) + 8).toFixed(1))
    }));
    setRiskData(newRiskData);

    // Carbon data
    const newCarbonData = updatedPositions.map(p => ({
      name: p.symbol,
      score: parseFloat((Math.random() * (p.assetType === 'crypto' ? 12 : 6)).toFixed(1))
    }));
    setCarbonData(newCarbonData);

    // Correlation data
    const newCorrelationData = updatedPositions.map(p => ({
      name: `${p.symbol} vs. SPY`,
      value: parseFloat((Math.random() * (p.assetType === 'crypto' ? 0.4 : 0.8) + 0.1).toFixed(2))
    }));
    setCorrelationData(newCorrelationData);

    // Sharpe ratios
    const newSharpeRatios = updatedPositions.map(p => ({
      name: p.symbol,
      value: parseFloat((Math.random() * (p.assetType === 'crypto' ? 2.5 : 1.5) + 0.5).toFixed(1))
    }));
    setSharpeRatios(newSharpeRatios);

    // Asset allocation
    const allocationByType = updatedPositions.reduce((acc, pos) => {
      let type = 'Other';
      if (pos.assetType === 'crypto') {
        type = 'Crypto';
      } else if (['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'META'].includes(pos.symbol)) {
        type = 'Technology';
      } else if (['JPM', 'V'].includes(pos.symbol)) {
        type = 'Financials';
      } else if (['AMZN', 'DIS'].includes(pos.symbol)) {
        type = 'Consumer';
      } else {
        type = 'Other Stocks';
      }
      acc[type] = (acc[type] || 0) + pos.value;
      return acc;
    }, {});

    const totalPortfolioValue = Object.values(allocationByType).reduce((sum, val) => sum + val, 0);
    const colors = ["#10b981", "#8b5cf6", "#3b82f6", "#f59e0b", "#ec4899", "#64748b"];

    const newAllocation = Object.entries(allocationByType)
      .map(([name, value], index) => ({
        name,
        value: totalPortfolioValue > 0 ? parseFloat(((value / totalPortfolioValue) * 100).toFixed(1)) : 0,
        color: colors[index % colors.length]
      }))
      .filter(item => item.value > 0);

    setAssetAllocation(newAllocation);
  };

  // Enhanced refresh data function with tutorial tracking
  const refreshData = async () => {
    setIsLoading(true);
    setRefreshApiError("");
    
    // Track that user has refreshed
    if (!hasUserRefreshed) {
      setHasUserRefreshed(true);
      localStorage.setItem('hasUserRefreshed', 'true');
    }
    
    // Get API key from localStorage
    const currentApiKey = localStorage.getItem('polygonApiKey') || '';
  
    /* 1. If no key, fall back to simulator right away */
    if (!currentApiKey || currentApiKey.trim().length < 10) {
      setRefreshApiError("Polygon.io API key not set. Using simulated data.");
      simulateRefresh();
      return;
    }
  
    /* 2. Build one array of promises, collecting any failures locally */
    const failed = [];
  
    const pricePromises = positions.map(async (p) => {
      try {
        let currentPrice;
  
        if (p.assetType === "stocks") {
          currentPrice = await fetchStockPrice(p.symbol, currentApiKey);
        } else if (p.assetType === "crypto") {
          currentPrice = await fetchCryptoPrice(p.symbol, currentApiKey);
        } else {
          currentPrice = p.price; // defensive fallback
        }
  
        const newValue = p.quantity * currentPrice;
        const prevPrice = p.currentPrice || p.price;
        const changePercent = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
  
        return {
          ...p,
          currentPrice: +currentPrice.toFixed(p.assetType === "crypto" && currentPrice < 1 ? 6 : 2),
          value: +newValue.toFixed(2),
          change: +changePercent.toFixed(1)
        };
      } catch (err) {
        console.warn(`Failed to fetch price for ${p.symbol}: ${err.message}. Using simulated data.`);
        failed.push(p.symbol);
  
        /* simulate this one position */
        const prevPrice = p.currentPrice || p.price;
        const changePercent = Math.random() * 8 - 2;
        const simulatedPrice = prevPrice * (1 + changePercent / 100);
        const newValue = p.quantity * simulatedPrice;
        const simChangePct = prevPrice > 0 ? ((simulatedPrice - prevPrice) / prevPrice) * 100 : 0;
  
        return {
          ...p,
          currentPrice: +simulatedPrice.toFixed(p.assetType === "crypto" && simulatedPrice < 1 ? 6 : 2),
          value: +newValue.toFixed(2),
          change: +simChangePct.toFixed(1)
        };
      }
    });
  
    /* 3. Wait for everything, then update state once */
    const updatedPositions = await Promise.all(pricePromises);
    setPositions(updatedPositions);
    updateChartsData(updatedPositions);
  
    /* --- optional performance‑chart bump --- */
    try {
      const lastValue = performanceData[performanceData.length - 1].value;
      const newTotalValue = updatedPositions.reduce((s, p) => s + p.value, 0) + totalRealEstateEquity;
      const newValue =
        Math.abs(newTotalValue - lastValue) > lastValue * 0.001
          ? newTotalValue
          : lastValue * (1 + (Math.random() * 0.01 - 0.005));
  
      setPerformanceData([...performanceData.slice(-11), { month: "Now", value: Math.round(newValue) }]);
    } catch (e) {
      console.error("Error updating performance chart data:", e);
    }
  
    /* 4. Surface any failures in one message */
    if (failed.length) {
      setRefreshApiError(`Failed: ${failed.join(", ")}. Using simulated prices for these.`);
      setTimeout(() => setRefreshApiError(""), 10000); // auto‑clear after 10 s
    }
  
    setIsLoading(false);
  };

  // Function to handle tutorial refresh encouragement
  const handleRefreshEncourage = () => {
    refreshData();
  };

  // Simulation function
  const simulateRefresh = () => {
    console.log("Running simulated refresh...");
    setTimeout(() => {
      const updatedPositions = positions.map(p => {
        const changePercent = (Math.random() * 8 - 2);
        const previousPrice = p.currentPrice || p.price;
        const newPrice = previousPrice * (1 + changePercent / 100);
        const newValue = p.quantity * newPrice;
        const simulatedChangePercent = previousPrice > 0 ? ((newPrice - previousPrice) / previousPrice) * 100 : 0;

        return {
          ...p,
          price: p.price,
          currentPrice: parseFloat(newPrice.toFixed(p.assetType === 'crypto' && newPrice < 1 ? 6 : 2)),
          value: parseFloat(newValue.toFixed(2)),
          change: parseFloat(simulatedChangePercent.toFixed(1))
        };
      });

      setPositions(updatedPositions);
      updateChartsData(updatedPositions);

      // Simulate performance data update
      try {
        const lastValue = performanceData[performanceData.length - 1].value;
        const newTotalValue = updatedPositions.reduce((sum, p) => sum + p.value, 0) + totalRealEstateEquity;
        const newValue = Math.abs(newTotalValue - lastValue) > lastValue * 0.001
                        ? newTotalValue
                        : lastValue * (1 + (Math.random() * 0.01 - 0.005));
        const newPerformanceData = [...performanceData.slice(-11), { month: 'Now', value: Math.round(newValue) }];
        setPerformanceData(newPerformanceData);
      } catch (e) { console.error("Error updating performance chart data:", e); }

      setIsLoading(false);
    }, 1000);
  };

  // Effect to update demo mode when API keys change
  useEffect(() => {
    const geminiKey = localStorage.getItem('geminiApiKey');
    const polygonKey = localStorage.getItem('polygonApiKey');
    setDemoMode({
      gemini: !!(geminiKey && geminiKey.trim() && geminiKey.length > 10),
      polygon: !!(polygonKey && polygonKey.trim() && polygonKey.length > 10)
    });
  }, [showSettings]); // Re-check when settings modal closes

  // Show mobile not supported screen if on mobile
  if (isMobile) {
    return <MobileNotSupported />;
  }

  return (
    <div className={`flex flex-col min-h-screen ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        refreshData={refreshData} 
        isLoading={isLoading}
        refreshApiError={refreshApiError}
        setShowSettings={setShowSettings}
        onShowAbout={() => setShowWelcome(true)}
      />
      
      <main className="flex-1 container mx-auto p-4 pt-6">
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="flex items-center gap-2">
            <TabsList className={`grid grid-cols-4 flex-1 ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/90 border-slate-200'} shadow-sm rounded-lg backdrop-blur-sm transition-colors duration-200`}>
              <TabsTrigger value="overview">
                <div className="flex items-center gap-2">
                  Overview
                  {(!demoMode.polygon && !demoMode.gemini) && (
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded">DEMO</span>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="stocks">
                <div className="flex items-center gap-2">
                  Stocks & Crypto
                  {!demoMode.polygon && (
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded">DEMO</span>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="realestate">
                <div className="flex items-center gap-2">
                  Real Estate
                  {!demoMode.gemini && (
                    <span className="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded">DEMO</span>
                  )}
                </div>
              </TabsTrigger>
              <TabsTrigger value="insights" data-tutorial="insights-tab">Insights</TabsTrigger>
            </TabsList>
            
            <Button
              onClick={() => setShowCategoryModal(true)}
              size="sm"
              className={`h-10 w-10 p-0 rounded-full shadow-lg ${darkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-500 hover:bg-emerald-400'} text-white transition-all duration-200 hover:scale-110 hover:shadow-xl`}
              title="Create Investment Category"
              data-tutorial="add-button"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          
          <TabsContent value="overview" className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <OverviewTab 
                  darkMode={darkMode} 
                  positions={positions} 
                  totalValue={totalValue} 
                  totalChange={totalChange} 
                  changePercentage={changePercentage}
                  realEstateHoldings={realEstateHoldings}
                  totalRealEstateValue={totalRealEstateValue}
                  totalRealEstateEquity={totalRealEstateEquity}
                  totalAnnualRent={totalAnnualRent}
                  avgRealEstateROI={avgRealEstateROI}
                  performanceData={performanceData}
                  assetAllocation={assetAllocation}
                  demoMode={demoMode}
                  investmentCategories={investmentCategories}
                  totalInvestmentCategoriesValue={totalInvestmentCategoriesValue}
                  totalPortfolioValue={totalPortfolioValue}
                />
              </motion.div>
            </AnimatePresence>
          </TabsContent>
          
          <TabsContent value="stocks" className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key="stocks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <StocksTab 
                  darkMode={darkMode} 
                  positions={positions} 
                  setPositions={setPositions} 
                  totalValue={totalValue} 
                  totalChange={totalChange} 
                  changePercentage={changePercentage}
                  updateChartsData={updateChartsData}
                  apiKey={apiKey}
                  apiError={refreshApiError}
                  setApiError={setRefreshApiError}
                  demoMode={demoMode}
                />
              </motion.div>
            </AnimatePresence>
          </TabsContent>
          
          <TabsContent value="realestate" className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key="realestate"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <RealEstateTab 
                  darkMode={darkMode} 
                  realEstateHoldings={realEstateHoldings} 
                  setRealEstateHoldings={setRealEstateHoldings}
                  totalRealEstateValue={totalRealEstateValue}
                  totalRealEstateEquity={totalRealEstateEquity}
                  totalAnnualRent={totalAnnualRent}
                  avgRealEstateROI={avgRealEstateROI}
                  demoMode={demoMode}
                />
              </motion.div>
            </AnimatePresence>
          </TabsContent>
          
          <TabsContent value="insights" className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key="insights"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <InsightsTab 
                  darkMode={darkMode} 
                  positions={positions}
                  realEstateHoldings={realEstateHoldings}
                  riskData={riskData}
                  assetAllocation={assetAllocation}
                  carbonData={carbonData}
                  correlationData={correlationData}
                  sharpeRatios={sharpeRatios}
                  volatilityData={volatilityData}
                  investmentCategories={investmentCategories}
                  onDeleteCategory={handleDeleteCategory}
                />
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Gemini Chat Component */}
      <GeminiChat 
        darkMode={darkMode} 
        positions={positions}
        realEstateHoldings={realEstateHoldings}
        demoMode={demoMode}
      />
      
      {/* Tutorial System */}
      <TutorialSystem
        darkMode={darkMode}
        onRefreshEncourage={handleRefreshEncourage}
        hasUserRefreshed={hasUserRefreshed}
        isVisible={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
      
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            darkMode={darkMode}
          />
        )}
        
        {showCategoryModal && (
          <InvestmentCategoryModal
            isOpen={showCategoryModal}
            onClose={() => setShowCategoryModal(false)}
            darkMode={darkMode}
            onCreateCategory={handleCreateCategory}
          />
        )}
        
        {showWelcome && (
          <WelcomeModal
            isOpen={showWelcome}
            onClose={closeWelcomeModal}
            darkMode={darkMode}
          />
        )}
        
        {showOnboarding && (
          <OnboardingModal
            isOpen={showOnboarding}
            onClose={closeOnboarding}
            darkMode={darkMode}
            currentStep={onboardingStep}
            onNext={handleOnboardingNext}
            onPrev={handleOnboardingPrev}
            demoMode={demoMode}
          />
        )}
      </AnimatePresence>
      
      {/* Footer */}
      <footer className={`border-t ${darkMode ? 'bg-slate-900/50 border-slate-800 text-slate-400' : 'bg-white/50 border-slate-200 text-slate-600'} backdrop-blur-sm`}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <span>© 2025 TrackVest™. All rights reserved.</span>
              <span className="hidden sm:inline">•</span>
              <span>Created by <a href="https://ayanj.com/" target="_blank" rel="noopener noreferrer" className={`font-medium hover:underline ${darkMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'} transition-colors`}>Ayan Jhunjhunwala</a></span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span>Track every investment!</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}