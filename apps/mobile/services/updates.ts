import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

/**
 * Check for available OTA updates and prompt user to restart if one is available.
 * @param showNoUpdateAlert - If true, show an alert even when no update is available
 * @returns true if an update was found and downloaded
 */
export const checkForUpdates = async (showNoUpdateAlert = false): Promise<boolean> => {
  // Skip update checks in development mode
  if (__DEV__) {
    console.log('[Updates] Skipping update check in development mode');
    return false;
  }

  try {
    console.log('[Updates] Checking for updates...');
    const update = await Updates.checkForUpdateAsync();
    
    if (update.isAvailable) {
      console.log('[Updates] New update available, downloading...');
      await Updates.fetchUpdateAsync();
      
      Alert.alert(
        'Update Available',
        'A new version has been downloaded. Restart now to apply the update?',
        [
          { text: 'Later', style: 'cancel' },
          { 
            text: 'Restart', 
            onPress: async () => {
              await Updates.reloadAsync();
            }
          }
        ]
      );
      return true;
    } else {
      console.log('[Updates] App is up to date');
      if (showNoUpdateAlert) {
        Alert.alert('Up to Date', 'You are running the latest version.');
      }
    }
    
    return false;
  } catch (error) {
    console.error('[Updates] Error checking for updates:', error);
    return false;
  }
};

/**
 * Force check and apply an update immediately (restarts the app if update found)
 */
export const forceUpdate = async (): Promise<void> => {
  if (__DEV__) {
    console.log('[Updates] Skipping force update in development mode');
    return;
  }
  
  try {
    console.log('[Updates] Force checking for updates...');
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      console.log('[Updates] Downloading and applying update...');
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (error) {
    console.error('[Updates] Force update failed:', error);
  }
};

/**
 * Get current update information
 */
export const getUpdateInfo = () => {
  return {
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    updateId: Updates.updateId,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
    createdAt: Updates.createdAt,
  };
};
