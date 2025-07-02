import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { takePicture, selectFromGallery, getCurrentPosition, initPushNotifications } from '../utils/mobileUtils';

export function useMobileFeatures() {
  const [isMobile, setIsMobile] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<string>('web');
  
  useEffect(() => {
    // Check if we're on a mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobile(isMobileDevice);
    };
    
    // Check if we're running in a native container
    const checkNative = () => {
      const isNativePlatform = Capacitor.isNativePlatform();
      setIsNative(isNativePlatform);
      setPlatform(Capacitor.getPlatform());
      
      // Initialize push notifications if in native environment
      if (isNativePlatform) {
        initPushNotifications().catch(err => {
          console.error('Failed to initialize push notifications:', err);
        });
      }
    };
    
    checkMobile();
    checkNative();
  }, []);
  
  return {
    isMobile,
    isNative,
    platform,
    takePicture,
    selectFromGallery,
    getCurrentPosition
  };
}