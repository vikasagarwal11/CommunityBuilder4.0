import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const OfflineNotice = () => {
  const [isOffline, setIsOffline] = useState(false);
  
  useEffect(() => {
    // Set initial state
    setIsOffline(!navigator.onLine);
    
    // Add event listeners for online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div 
          className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:w-80 bg-red-500 text-white rounded-lg shadow-lg z-50"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
        >
          <div className="p-4 flex items-center">
            <WifiOff className="h-5 w-5 mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium">You're offline</p>
              <p className="text-sm text-white/80">Some features may be unavailable</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineNotice;