import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  PlusCircle, Trash2, Eye, EyeOff, XCircle, CheckCircle, Save, RefreshCw
} from "lucide-react";

export default function ApiKeysTab({ darkMode, apiKeys, setApiKeys }) {
  // Local state
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('geminiApiKey') || "");
  const [isGeminiApiKeyVisible, setIsGeminiApiKeyVisible] = useState(false);
  const [savedGeminiApiKey, setSavedGeminiApiKey] = useState(localStorage.getItem('geminiApiKey') || "");
  const [isGeminiKeySaved, setIsGeminiKeySaved] = useState(false);
  const [isPolygonKeyVisible, setIsPolygonKeyVisible] = useState(false);
  const [polygonApiKey, setPolygonApiKey] = useState(localStorage.getItem('polygonApiKey') || "");

  useEffect(() => {
    if (savedGeminiApiKey) {
      localStorage.setItem('geminiApiKey', savedGeminiApiKey);
    }
  }, [savedGeminiApiKey]);

  // Save Polygon API key to localStorage
  useEffect(() => {
    if (polygonApiKey) {
      localStorage.setItem('polygonApiKey', polygonApiKey);
    }
  }, [polygonApiKey]);

  // Save Gemini API Key
  const saveGeminiApiKey = () => {
    setSavedGeminiApiKey(geminiApiKey);
    setIsGeminiKeySaved(true);
    
    // Show success message briefly
    setTimeout(() => {
      setIsGeminiKeySaved(false);
    }, 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gemini AI Chatbot API */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Gemini AI Chatbot</CardTitle>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage your Gemini API key for the AI assistant.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="geminiApiKey" className="text-sm font-medium mb-1 block">Gemini API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <Input 
                    id="geminiApiKey" 
                    name="geminiApiKey" 
                    type={isGeminiApiKeyVisible ? "text" : "password"}
                    placeholder="Enter your Gemini API key" 
                    value={geminiApiKey} 
                    onChange={(e) => setGeminiApiKey(e.target.value)} 
                    className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'} pr-9`} 
                  />
                  <button 
                    type="button"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    onClick={() => setIsGeminiApiKeyVisible(!isGeminiApiKeyVisible)}
                  >
                    {isGeminiApiKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button 
                  onClick={saveGeminiApiKey} 
                  className={`flex-shrink-0 gap-1 ${isGeminiKeySaved ? 'bg-emerald-600 hover:bg-emerald-700' : darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}
                >
                  {isGeminiKeySaved ? (
                    <>
                      <CheckCircle className="h-4 w-4" /> Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save
                    </>
                  )}
                </Button>
              </div>
              <p className={`mt-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Your Gemini API key is used to power the AI chatbot. Get a key at <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">makersuite.google.com</a>.
              </p>
            </div>
            <div className={`rounded-md p-3 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
              <h3 className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Current Configuration</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status: <span className={geminiApiKey ? "text-emerald-500" : "text-red-500"}>{geminiApiKey ? "Active" : "Not Configured"}</span></p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Model: gemini-pro</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`h-8 px-2 text-xs ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-200'}`}
                  onClick={() => window.location.reload()}
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Polygon.io API */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Polygon.io Stock & Crypto Data</CardTitle>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Connect to Polygon.io for financial market data</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="polygonApiKey" className="text-sm font-medium mb-1 block">Polygon.io API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <Input 
                    id="polygonApiKey" 
                    name="polygonApiKey" 
                    type={isPolygonKeyVisible ? "text" : "password"}
                    placeholder="Enter your Polygon.io API key" 
                    value={polygonApiKey}
                    onChange={(e) => setPolygonApiKey(e.target.value)}
                    className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'} pr-9`} 
                  />
                  <button 
                    type="button"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    onClick={() => setIsPolygonKeyVisible(!isPolygonKeyVisible)}
                  >
                    {isPolygonKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button 
                  onClick={() => {
                    localStorage.setItem('polygonApiKey', polygonApiKey);
                    setIsGeminiKeySaved(true);
                    setTimeout(() => setIsGeminiKeySaved(false), 3000);
                  }} 
                  className={`flex-shrink-0 gap-1 ${isGeminiKeySaved ? 'bg-emerald-600 hover:bg-emerald-700' : darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}
                >
                  {isGeminiKeySaved ? (
                    <>
                      <CheckCircle className="h-4 w-4" /> Saved
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Save
                    </>
                  )}
                </Button>
              </div>
              <p className={`mt-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Polygon.io provides real-time and historical data for stocks, crypto, and forex. Get your own API key at <a href="https://polygon.io/dashboard/signup" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">polygon.io</a>.
              </p>
            </div>
            <div className={`rounded-md p-3 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
              <h3 className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Current Configuration</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status: <span className={polygonApiKey ? "text-emerald-500" : "text-red-500"}>{polygonApiKey ? "Active" : "Not Configured"}</span></p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Usage: <span className="text-emerald-500">Basic Plan</span></p>
                </div>
                <div className="text-xs text-emerald-500 font-medium">
                  {polygonApiKey ? "Connected" : "Not Connected"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}