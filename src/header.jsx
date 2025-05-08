import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Loader2, AlertCircle, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Header({ 
  darkMode, 
  setDarkMode, 
  showApiInput, 
  setShowApiInput, 
  refreshData, 
  isLoading, 
  refreshApiError 
}) {
  // Logo component
  const Logo = () => (
    <div className="flex items-center gap-2">
      <img src="/src/trackvest.png" alt="TrackVest Logo" className="w-8 h-8" onError={(e) => { e.target.style.display = 'none'; }} />
      <span className="text-xl sm:text-2xl font-bold tracking-tighter">TrackVest</span>
    </div>
  );

  return (
    <header className={`sticky top-0 z-50 ${darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur border-b px-4 sm:px-6 py-3`}>
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Logo />

        <div className="flex items-center gap-3 sm:gap-6">
          {/* Dark Mode Toggle with Sun/Moon Icon */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDarkMode(!darkMode)}
            className="w-9 h-9 p-0 rounded-full"
          >
            {darkMode ? (
              <Sun className="h-4 w-4 text-yellow-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            className={`gap-1 px-2 sm:px-3 sm:gap-2 ${darkMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
            onClick={refreshData}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>
      {/* Display Refresh API Error */}
      {refreshApiError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto mt-1 text-center text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 py-1 px-2 rounded"
        >
          <AlertCircle className="inline h-3 w-3 mr-1"/> {refreshApiError}
        </motion.div>
      )}
    </header>
  );
}