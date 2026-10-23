import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import LocationService from './locationService';

/**
 * VehiCare Centralized Permission Service
 * Standardizes runtime permission handling for Android (and iOS compatibility)
 * with graceful recovery, direct settings redirection, and clear user alerts.
 */

export const PERMISSION_STATUS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  NEVER_ASK_AGAIN: 'never_ask_again',
  UNAVAILABLE: 'unavailable',
};

/**
 * Request notification permission (Required for Android 13+ / API 33+)
 * @param {object} options
 * @param {boolean} options.showSettingsDialog - Whether to show an alert directing to settings if permanently denied
 */
export const requestNotificationPermission = async ({ showSettingsDialog = false } = {}) => {
  if (Platform.OS !== 'android') {
    return { status: PERMISSION_STATUS.GRANTED, isGranted: true };
  }

  // Android < 33 doesn't require runtime POST_NOTIFICATIONS permission
  if (Platform.Version < 33) {
    return { status: PERMISSION_STATUS.GRANTED, isGranted: true };
  }

  try {
    const isAlreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    if (isAlreadyGranted) {
      return { status: PERMISSION_STATUS.GRANTED, isGranted: true };
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'VehiCare Notifications',
        message: 'VehiCare needs notification access to send you vehicle diagnostics, maintenance reminders, and security alerts.',
        buttonPositive: 'Allow',
        buttonNegative: 'Not Now',
      },
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      return { status: PERMISSION_STATUS.GRANTED, isGranted: true };
    }

    const isNeverAskAgain = granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

    if (showSettingsDialog || isNeverAskAgain) {
      Alert.alert(
        'Notification Access Needed',
        'VehiCare needs notification permission to send you critical vehicle safety alerts and updates. Please allow notifications in App Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }

    return {
      status: isNeverAskAgain ? PERMISSION_STATUS.NEVER_ASK_AGAIN : PERMISSION_STATUS.DENIED,
      isGranted: false,
    };
  } catch (err) {
    console.warn('[permissionService] Notification permission error:', err?.message || err);
    return { status: PERMISSION_STATUS.DENIED, isGranted: false };
  }
};

/**
 * Request camera permission for capturing vehicle diagnostic photos or videos
 */
export const requestCameraPermission = async ({ showSettingsDialog = true } = {}) => {
  if (Platform.OS !== 'android') {
    return { status: PERMISSION_STATUS.GRANTED, isGranted: true };
  }

  try {
    const isAlreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );

    if (isAlreadyGranted) {
      return { status: PERMISSION_STATUS.GRANTED, isGranted: true };
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Access Needed',
        message: 'VehiCare needs access to your camera to capture photos and videos of vehicle symptoms and components.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      return { status: PERMISSION_STATUS.GRANTED, isGranted: true };
    }

    const isNeverAskAgain = granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

    if (showSettingsDialog) {
      Alert.alert(
        isNeverAskAgain ? 'Camera Permission Disabled' : 'Camera Access Needed',
        'VehiCare needs camera access to capture vehicle diagnostic photos. Please enable camera permission in App Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }

    return {
      status: isNeverAskAgain ? PERMISSION_STATUS.NEVER_ASK_AGAIN : PERMISSION_STATUS.DENIED,
      isGranted: false,
    };
  } catch (err) {
    console.warn('[permissionService] Camera permission error:', err?.message || err);
    return { status: PERMISSION_STATUS.DENIED, isGranted: false };
  }
};

/**
 * Request microphone permission for vehicle sound recording
 */
export const requestMicrophonePermission = async ({ showSettingsDialog = true } = {}) => {
  if (Platform.OS !== 'android') {
    return { status: PERMISSION_STATUS.GRANTED, isGranted: true };
  }

  try {
    const isAlreadyGranted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );

    if (isAlreadyGranted) {
      return { status: PERMISSION_STATUS.GRANTED, isGranted: true };
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Access Needed',
        message: 'VehiCare needs microphone access to record engine noises and vehicle symptoms for acoustic diagnosis.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      return { status: PERMISSION_STATUS.GRANTED, isGranted: true };
    }

    const isNeverAskAgain = granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

    if (showSettingsDialog) {
      Alert.alert(
        isNeverAskAgain ? 'Microphone Permission Disabled' : 'Microphone Access Needed',
        'VehiCare needs microphone access to record vehicle noises and acoustic symptoms. Please enable microphone permission in App Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
    }

    return {
      status: isNeverAskAgain ? PERMISSION_STATUS.NEVER_ASK_AGAIN : PERMISSION_STATUS.DENIED,
      isGranted: false,
    };
  } catch (err) {
    console.warn('[permissionService] Microphone permission error:', err?.message || err);
    return { status: PERMISSION_STATUS.DENIED, isGranted: false };
  }
};

/**
 * Request both camera and audio permissions (required for video recording with sound)
 */
export const requestCameraAndAudioPermission = async ({ showSettingsDialog = true } = {}) => {
  if (Platform.OS !== 'android') {
    return { status: PERMISSION_STATUS.GRANTED, isGranted: true };
  }

  try {
    const cameraPerm = await requestCameraPermission({ showSettingsDialog: false });
    if (!cameraPerm.isGranted) {
      if (showSettingsDialog) {
        Alert.alert(
          'Camera Access Needed',
          'VehiCare needs camera access to record vehicle diagnostic videos. Please enable camera permission in App Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      }
      return cameraPerm;
    }

    const micPerm = await requestMicrophonePermission({ showSettingsDialog: false });
    if (!micPerm.isGranted) {
      if (showSettingsDialog) {
        Alert.alert(
          'Microphone Access Needed',
          'Recording video with sound requires microphone access. Please enable microphone permission in App Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
      }
      return micPerm;
    }

    return { status: PERMISSION_STATUS.GRANTED, isGranted: true };
  } catch (err) {
    console.warn('[permissionService] Camera+Audio permission error:', err?.message || err);
    return { status: PERMISSION_STATUS.DENIED, isGranted: false };
  }
};

/**
 * Request location permission for finding nearby repair shops
 */
export const requestLocationPermission = async ({ showSettingsDialog = true } = {}) => {
  try {
    const result = await LocationService.requestPermissions();
    if (result.isGranted) {
      return {
        status: PERMISSION_STATUS.GRANTED,
        isGranted: true,
        isPrecise: result.isPrecise,
      };
    }

    if (showSettingsDialog && result.isPermanentlyDenied) {
      Alert.alert(
        'Location Access Needed',
        'VehiCare needs your device location to locate nearby repair shops. Please enable location permission in App Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => LocationService.openSettings() },
        ],
      );
    }

    return {
      status: result.isPermanentlyDenied ? PERMISSION_STATUS.NEVER_ASK_AGAIN : PERMISSION_STATUS.DENIED,
      isGranted: false,
      isPermanentlyDenied: result.isPermanentlyDenied,
    };
  } catch (err) {
    console.warn('[permissionService] Location permission error:', err?.message || err);
    return { status: PERMISSION_STATUS.DENIED, isGranted: false };
  }
};

export default {
  PERMISSION_STATUS,
  requestNotificationPermission,
  requestCameraPermission,
  requestMicrophonePermission,
  requestCameraAndAudioPermission,
  requestLocationPermission,
  openSettings: Linking.openSettings,
};
