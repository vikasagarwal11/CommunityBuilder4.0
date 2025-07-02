import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.momfit.app',
  appName: 'MomFit',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ff6b6b",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "large",
      spinnerColor: "#ffffff",
      splashFullScreen: true,
      splashImmersive: true
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    StatusBar: {
      style: "light",
      backgroundColor: "#ff6b6b"
    }
  }
};

export default config;