import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  PlusCircle, Trash2, Eye, EyeOff, XCircle, CheckCircle 
} from "lucide-react";

export default function ApiKeysTab({ darkMode, apiKeys, setApiKeys }) {
  // Local state
  const [newApiKey, setNewApiKey] = useState({ name: "", service: "" });

  // Generate random key
  const generateRandomKey = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 24;
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  };

  // Add new API key
  const addNewApiKey = () => {
    if (!newApiKey.name || !newApiKey.service) {
      alert("Please provide both name and service");
      return;
    }

    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    const newKey = {
      id: Date.now(),
      name: newApiKey.name,
      service: newApiKey.service,
      key: generateRandomKey(),
      status: "Active",
      created: formattedDate,
      visible: false
    };

    setApiKeys([...apiKeys, newKey]);
    setNewApiKey({ name: "", service: "" });
  };

  // Toggle API key visibility
  const toggleApiKeyVisibility = (id) => {
    setApiKeys(apiKeys.map(key => 
      key.id === id ? { ...key, visible: !key.visible } : key
    ));
  };

  // Toggle API key status
  const toggleApiKeyStatus = (id) => {
    setApiKeys(apiKeys.map(key => 
      key.id === id ? { ...key, status: key.status === 'Active' ? 'Inactive' : 'Active' } : key
    ));
  };

  // Delete API key
  const deleteApiKey = (id) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Add New API Key */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Add New API Key</CardTitle>
            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Manage external API connections (simulated).</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="apiKeyName" className="text-sm font-medium mb-1 block">Key Name / Label</Label>
              <Input 
                id="apiKeyName" 
                name="name" 
                placeholder="e.g., My Brokerage API" 
                value={newApiKey.name} 
                onChange={(e) => setNewApiKey({ ...newApiKey, name: e.target.value })} 
                className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} 
              />
            </div>
            <div>
              <Label htmlFor="apiKeyService" className="text-sm font-medium mb-1 block">Service / Purpose</Label>
              <Input 
                id="apiKeyService" 
                name="service" 
                placeholder="e.g., Portfolio Sync" 
                value={newApiKey.service} 
                onChange={(e) => setNewApiKey({ ...newApiKey, service: e.target.value })} 
                className={`${darkMode ? 'bg-slate-700 border-slate-600' : 'bg-white'}`} 
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={addNewApiKey} 
              className={`w-full gap-2 ${darkMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
            >
              <PlusCircle className="h-4 w-4" /> Add API Key
            </Button>
          </CardFooter>
        </Card>
      </motion.div>

      {/* API Keys List */}
      <motion.div
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ duration: 0.4, delay: 0.1 }}
        className="lg:col-span-2"
      >
        <Card className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-md`}>
          <CardHeader>
            <CardTitle className={`${darkMode ? 'text-slate-200' : 'text-slate-800'} text-lg font-semibold`}>Managed API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {apiKeys.length > 0 ? apiKeys.map(key => (
                <motion.div
                  key={key.id} 
                  layout 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, x: -20 }} 
                  transition={{ duration: 0.3 }}
                  className={`p-3 rounded-lg ${darkMode ? 'bg-slate-700/50' : 'bg-slate-100'}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-grow mb-2 sm:mb-0">
                      <p className={`font-medium text-sm ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>{key.name}</p>
                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{key.service}</p>
                      <div className="flex items-center mt-1">
                        <span className={`text-xs font-mono mr-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {key.visible ? key.key : `••••••••${key.key.slice(-4)}`}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 text-slate-400 hover:text-slate-200" 
                          onClick={() => toggleApiKeyVisibility(key.id)}
                        >
                          {key.visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 flex-wrap">
                      <div className="flex items-center gap-1 text-xs">
                        <span className={`w-2 h-2 rounded-full ${key.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <span className={`${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{key.status}</span>
                      </div>
                      <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Added: {key.created}</span>
                      <div className="flex gap-1">
                        <Button
                          variant={key.status === 'Active' ? 'outline' : 'secondary'} 
                          size="sm" 
                          className="h-7 px-2 text-xs"
                          onClick={() => toggleApiKeyStatus(key.id)}
                        >
                          {key.status === 'Active' ? <XCircle className="h-3 w-3 mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                          {key.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                          onClick={() => deleteApiKey(key.id)}
                        > 
                          <Trash2 className="h-3.5 w-3.5" /> 
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )) : ( 
                <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'} text-center py-4`}>No API keys added yet.</p> 
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}