import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation, Position } from '@capacitor/geolocation';
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications';

// Check if running in a native mobile environment
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

// Get the current platform (ios, android, web)
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

// Camera utilities
export const takePicture = async (): Promise<string | undefined> => {
  if (!isNativePlatform()) {
    console.warn('Camera is only available on native platforms');
    return undefined;
  }
  
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera
    });
    
    return image.webPath;
  } catch (error) {
    console.error('Error taking picture:', error);
    return undefined;
  }
};

export const selectFromGallery = async (): Promise<string | undefined> => {
  if (!isNativePlatform()) {
    console.warn('Camera is only available on native platforms');
    return undefined;
  }
  
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos
    });
    
    return image.webPath;
  } catch (error) {
    console.error('Error selecting from gallery:', error);
    return undefined;
  }
};

// Geolocation utilities
export const getCurrentPosition = async (): Promise<Position | undefined> => {
  if (!isNativePlatform()) {
    console.warn('Geolocation is only available on native platforms');
    return undefined;
  }
  
  try {
    const position = await Geolocation.getCurrentPosition();
    return position;
  } catch (error) {
    console.error('Error getting current position:', error);
    return undefined;
  }
};

// Push notification utilities
export const initPushNotifications = async (): Promise<void> => {
  if (!isNativePlatform()) {
    console.warn('Push notifications are only available on native platforms');
    return;
  }
  
  try {
    // Request permission
    const permission = await PushNotifications.requestPermissions();
    
    if (permission.receive === 'granted') {
      // Register with FCM/APNS
      await PushNotifications.register();
      
      // Setup listeners
      PushNotifications.addListener('registration', (token: Token) => {
        console.log('Push registration success:', token.value);
        // Here you would typically send this token to your server
      });
      
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Push registration error:', error);
      });
      
      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        // Handle the notification when the app is in foreground
      });
      
      PushNotifications.addListener('pushNotificationActionPerformed', (notification: any) => {
        console.log('Push notification action performed:', notification);
        // Handle when user taps on notification
      });
    }
  } catch (error) {
    console.error('Error initializing push notifications:', error);
  }
};