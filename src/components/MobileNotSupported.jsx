import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, Monitor, ExternalLink } from 'lucide-react';

const MobileNotSupported = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full text-center"
      >
        {/* TrackVest Logo */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-white">TV</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            TrackVest
          </h1>
        </motion.div>

        {/* Mobile Icon */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-6"
        >
          <div className="relative">
            <Smartphone className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500" />
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">✕</span>
            </div>
          </div>
        </motion.div>

        {/* Main Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            Mobile Version Coming Soon!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            TrackVest is currently optimized for desktop and tablet experiences. 
            We're working hard to bring you an amazing mobile experience.
          </p>
        </motion.div>

        {/* Desktop Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-6"
        >
          <Monitor className="w-8 h-8 mx-auto mb-3 text-blue-600" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">
            For the best experience
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Please visit TrackVest on your desktop or tablet to access all features and manage your investment portfolio.
          </p>
        </motion.div>

        {/* Coming Soon Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mb-8"
        >
          <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Mobile app will include:
          </h4>
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Portfolio tracking
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              Real-time updates
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              AI insights
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
              Quick trades
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          className="text-xs text-gray-500 dark:text-gray-600"
        >
          <p className="mb-2">© 2025 TrackVest™. All rights reserved.</p>
          <a 
            href="https://ayanj.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
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