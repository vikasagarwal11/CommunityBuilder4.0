import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InstallPWAPrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if the user has already dismissed or installed the PWA
    const hasPromptBeenShown = localStorage.getItem('pwaPromptShown');
    
    // Check if it's iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);
    
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 76+ from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      
      // Only show if not previously dismissed/installed
      if (!hasPromptBeenShown) {
        setShowPrompt(true);
      }
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check if the app is already installed
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      localStorage.setItem('pwaPromptShown', 'true');
      console.log('PWA was installed');
    });
    
    // For iOS, we need to check if it's in standalone mode
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                              (window.navigator as any).standalone || 
                              document.referrer.includes('android-app://');
    
    // Show iOS instructions if not installed and not previously dismissed
    if (isIOSDevice && !isInStandaloneMode && !hasPromptBeenShown) {
      setShowPrompt(true);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt && !isIOS) {
      console.log('No installation prompt available');
      return;
    }
    
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      
      // We've used the prompt, and can't use it again, discard it
      setDeferredPrompt(null);
    }
    
    // Mark as shown regardless of outcome
    setShowPrompt(false);
    localStorage.setItem('pwaPromptShown', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Store in localStorage so we don't show it again
    localStorage.setItem('pwaPromptShown', 'true');
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          className="fixed bottom-16 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white rounded-xl shadow-lg border border-neutral-200 z-50"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
        >
          <div className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                  <Smartphone className="h-5 w-5 text-primary-500" />
                </div>
                <div>
                  <h3 className="font-semibold">Install MomFit App</h3>
                  <p className="text-xs text-neutral-500">Get the best experience</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {isIOS ? (
              <div className="mb-4">
                <p className="text-sm text-neutral-600 mb-2">
                  To install this app on your iPhone:
                </p>
                <ol className="text-sm text-neutral-600 space-y-1 pl-5 list-decimal">
                  <li>Tap the share icon <span className="inline-block w-5 h-5 bg-neutral-200 rounded text-center leading-5">↑</span></li>
                  <li>Scroll down and tap "Add to Home Screen"</li>
                  <li>Tap "Add" in the top right corner</li>
                </ol>
              </div>
            ) : (
              <p className="text-sm text-neutral-600 mb-4">
                Install our app for a better experience with offline access and faster loading times.
              </p>
            )}
            
            <button
              onClick={handleInstallClick}
              className="w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              {isIOS ? 'Got it!' : 'Install App'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPWAPrompt;