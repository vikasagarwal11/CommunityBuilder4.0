import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/*.png'],
      manifest: {
        name: 'MomFit - Fitness Community for Mothers',
        short_name: 'MomFit',
        description: 'A supportive fitness community for mothers',
        theme_color: '#ff6b6b',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    exclude: [
      '@capacitor/core',
      '@capacitor/splash-screen',
      '@capacitor/status-bar',
      '@capacitor/camera',
      '@capacitor/geolocation',
      '@capacitor/push-notifications'
    ],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-hook-form',
      'framer-motion',
      'zxcvbn'
    ]
  }
});