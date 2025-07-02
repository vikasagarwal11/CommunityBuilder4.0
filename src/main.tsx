import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './index.css';

// Capacitor imports
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

// Initialize Capacitor plugins
const initCapacitor = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Set status bar style
      await StatusBar.setStyle({ style: Style.Light });
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#ff6b6b' });
      }
      
      // Hide splash screen with fade
      await SplashScreen.hide({
        fadeOutDuration: 500
      });
    } catch (error) {
      console.error('Error initializing Capacitor plugins:', error);
    }
  }
};

// Initialize Capacitor
initCapacitor();

// Optional: service worker progressive enhancement
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  try {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      console.debug('Service worker registration skipped');
    });
  } catch (error) {
    console.debug('Service worker registration failed', error);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);