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
  const [groqApiKey, setGroqApiKey] = useState("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");
  const [isGroqApiKeyVisible, setIsGroqApiKeyVisible] = useState(false);
  const [savedGroqApiKey, setSavedGroqApiKey] = useState(localStorage.getItem('groqApiKey') || "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");
  const [isGroqKeySaved, setIsGroqKeySaved] = useState(false);
  const [isPolygonKeyVisible, setIsPolygonKeyVisible] = useState(false);

  // Save Groq API key to localStorage
  useEffect(() => {
    if (savedGroqApiKey) {
      localStorage.setItem('groqApiKey', savedGroqApiKey);
    }
  }, [savedGroqApiKey]);

  // Save Groq API Key
  const saveGroqApiKey = () => {
    setSavedGroqApiKey(groqApiKey);
    setIsGroqKeySaved(true);
    
    // Show success message briefly
    setTimeout(() => {
      setIsGroqKeySaved(false);
    }, 3000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Groq AI Chatbot API */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Groq AI Chatbot</CardTitle>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage your Groq API key for the AI assistant.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="groqApiKey" className="text-sm font-medium mb-1 block">Groq API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-grow">
                  <Input 
                    id="groqApiKey" 
                    name="groqApiKey" 
                    type={isGroqApiKeyVisible ? "text" : "password"}
                    placeholder="Enter your Groq API key" 
                    value={groqApiKey} 
                    onChange={(e) => setGroqApiKey(e.target.value)} 
                    className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'} pr-9`} 
                  />
                  <button 
                    type="button"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    onClick={() => setIsGroqApiKeyVisible(!isGroqApiKeyVisible)}
                  >
                    {isGroqApiKeyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button 
                  onClick={saveGroqApiKey} 
                  className={`flex-shrink-0 gap-1 ${isGroqKeySaved ? 'bg-emerald-600 hover:bg-emerald-700' : darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'}`}
                >
                  {isGroqKeySaved ? (
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
                Your Groq API key is used to power the AI chatbot. Get a key at <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">console.groq.com</a>.
              </p>
            </div>
            <div className={`rounded-md p-3 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
              <h3 className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Current Configuration</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status: <span className="text-emerald-500">Active</span></p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Model: llama3-70b-8192</p>
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
                    value="9h2tWR97GWuVzS5a27bqgC4JjhC3H1uv" 
                    readOnly
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
              </div>
              <p className={`mt-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Polygon.io provides real-time and historical data for stocks, crypto, and forex. Get your own API key at <a href="https://polygon.io/dashboard/signup" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">polygon.io</a>.
              </p>
            </div>
            <div className={`rounded-md p-3 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
              <h3 className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Current Configuration</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Status: <span className="text-emerald-500">Active</span></p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Usage: <span className="text-emerald-500">Basic Plan</span></p>
                </div>
                <div className="text-xs text-emerald-500 font-medium">
                  Connected
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}