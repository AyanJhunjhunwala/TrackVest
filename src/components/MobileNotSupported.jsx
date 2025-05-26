import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

const MobileNotSupported = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center"
      >
        {/* TrackVest Logo */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              rotate: [0, 1, -1, 0]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="w-24 h-24 mx-auto mb-6"
          >
            <img 
              src="/trackvest.png" 
              alt="TrackVest Logo" 
              className="w-full h-full object-contain drop-shadow-2xl"
              onError={(e) => {
                // Fallback to styled logo
                e.target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'w-full h-full bg-gradient-to-br from-slate-600 to-slate-800 dark:from-slate-700 dark:to-slate-900 rounded-3xl flex items-center justify-center shadow-2xl';
                fallback.innerHTML = '<span class="text-3xl font-bold text-white">TV</span>';
                e.target.parentElement.appendChild(fallback);
              }}
            />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-4xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-300 dark:to-slate-100 bg-clip-text text-transparent"
          >
            TrackVest
          </motion.h1>
        </motion.div>

        {/* Main Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mb-12"
        >
          <motion.h2
            animate={{ 
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="text-2xl font-semibold text-slate-700 dark:text-slate-300"
          >
            Mobile version coming soon
          </motion.h2>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="text-xs text-slate-500 dark:text-slate-600"
        >
          <motion.p
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mb-2"
          >
            © 2025 TrackVest™. All rights reserved.
          </motion.p>
          <a 
            href="https://ayanj.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Created by Ayan Jhunjhunwala
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default MobileNotSupported; 