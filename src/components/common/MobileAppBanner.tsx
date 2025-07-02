import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MobileAppBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  
  useEffect(() => {
    // Check if the user is on a mobile device
    const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check if the app is already installed (in standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone || 
                        document.referrer.includes('android-app://');
    
    // Check if the banner has been dismissed before
    const hasBeenDismissed = localStorage.getItem('appBannerDismissed') === 'true';
    
    // Only show the banner on mobile devices, when not in standalone mode, and if not dismissed
    setShowBanner(isMobileDevice && !isStandalone && !hasBeenDismissed);
  }, []);
  
  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('appBannerDismissed', 'true');
  };
  
  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div 
          className="fixed top-0 left-0 right-0 bg-primary-500 text-white z-50 shadow-md"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          transition={{ duration: 0.3 }}
        >
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex-1 mr-4">
              <p className="text-sm font-medium">Get the MomFit App</p>
              <p className="text-xs text-white/80">Better experience, faster loading</p>
            </div>
            <div className="flex items-center">
              <button 
                onClick={() => window.location.href = '#download-app'}
                className="mr-2 px-3 py-1 bg-white text-primary-500 rounded-full text-xs font-medium flex items-center"
              >
                <Download className="h-3 w-3 mr-1" />
                Install
              </button>
              <button 
                onClick={handleDismiss}
                className="p-1 text-white/80 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileAppBanner;