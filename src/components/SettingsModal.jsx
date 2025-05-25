import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { 
  Cross2Icon, EyeOpenIcon, EyeClosedIcon, CheckCircledIcon, ReloadIcon, Cross1Icon
} from "@radix-ui/react-icons";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";

export default function SettingsModal({ isOpen, onClose, darkMode }) {
  // Gemini API Key state
  const [geminiApiKey, setGeminiApiKey] = useState(localStorage.getItem('geminiApiKey') || '');
  const [isGeminiApiKeyVisible, setIsGeminiApiKeyVisible] = useState(false);
  const [isGeminiKeySaved, setIsGeminiKeySaved] = useState(false);
  
  // Polygon API Key state
  const [polygonApiKey, setPolygonApiKey] = useState(localStorage.getItem('polygonApiKey') || '');
  const [isPolygonKeyVisible, setIsPolygonKeyVisible] = useState(false);
  const [isPolygonKeySaved, setIsPolygonKeySaved] = useState(false);

  // Save Gemini API key to localStorage
  const saveGeminiApiKey = () => {
    localStorage.setItem('geminiApiKey', geminiApiKey);
    setIsGeminiKeySaved(true);
    
    // Show success message briefly
    setTimeout(() => {
      setIsGeminiKeySaved(false);
    }, 3000);
  };

  // Save Polygon API key to localStorage
  const savePolygonApiKey = () => {
    localStorage.setItem('polygonApiKey', polygonApiKey);
    setIsPolygonKeySaved(true);
    
    // Show success message briefly
    setTimeout(() => {
      setIsPolygonKeySaved(false);
    }, 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto ${darkMode ? 'bg-slate-900' : 'bg-white'} rounded-xl shadow-xl`}
      >
        <div className={`sticky top-0 z-10 flex items-center justify-between p-5 border-b ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-slate-800'}`}>Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-5">
          <Tabs defaultValue="gemini" className="w-full">
            <TabsList className={`grid w-full grid-cols-2 mb-6 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <TabsTrigger value="gemini">Gemini API</TabsTrigger>
              <TabsTrigger value="polygon">Polygon.io API</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gemini">
              <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
                <CardHeader>
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Gemini AI Chatbot</h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Configure your Gemini API key for the AI assistant
                  </p>
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
                          className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                          onClick={() => setIsGeminiApiKeyVisible(!isGeminiApiKeyVisible)}
                        >
                          {isGeminiApiKeyVisible ? 
                            <EyeClosedIcon className="h-4 w-4" /> : 
                            <EyeOpenIcon className="h-4 w-4" />
                          }
                        </button>
                      </div>
                      <Button 
                        onClick={saveGeminiApiKey} 
                        className={`flex-shrink-0 gap-1 ${isGeminiKeySaved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                      >
                        {isGeminiKeySaved ? (
                          <>
                            <CheckCircledIcon className="h-4 w-4" /> Saved
                          </>
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                    <p className={`mt-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Your Gemini API key is used to power the AI chatbot. Get a key at <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">makersuite.google.com</a>.
                    </p>
                  </div>
                  <div className={`rounded-md p-3 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                    <h4 className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Status</h4>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${geminiApiKey ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {geminiApiKey ? 'Connected' : 'Not configured'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="polygon">
              <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
                <CardHeader>
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Polygon.io Financial Data</h3>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Configure your Polygon.io API key for stock and crypto data
                  </p>
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
                          className={`absolute right-2 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                          onClick={() => setIsPolygonKeyVisible(!isPolygonKeyVisible)}
                        >
                          {isPolygonKeyVisible ? 
                            <EyeClosedIcon className="h-4 w-4" /> : 
                            <EyeOpenIcon className="h-4 w-4" />
                          }
                        </button>
                      </div>
                      <Button 
                        onClick={savePolygonApiKey} 
                        className={`flex-shrink-0 gap-1 ${isPolygonKeySaved ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                      >
                        {isPolygonKeySaved ? (
                          <>
                            <CheckCircledIcon className="h-4 w-4" /> Saved
                          </>
                        ) : (
                          "Save"
                        )}
                      </Button>
                    </div>
                    <p className={`mt-2 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      Polygon.io provides real-time and historical data for stocks, crypto, and forex. Get your API key at <a href="https://polygon.io/dashboard/signup" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">polygon.io</a>.
                    </p>
                  </div>
                  <div className={`rounded-md p-3 ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}>
                    <h4 className={`text-sm font-medium mb-1 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>Status</h4>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${polygonApiKey ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        {polygonApiKey ? 'Connected' : 'Not configured'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        <div className={`sticky bottom-0 z-10 p-5 border-t flex justify-end ${darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
          <Button onClick={onClose}>Close</Button>
        </div>
      </motion.div>
    </div>
  );
} 