import { Alert, PermissionsAndroid, Platform } from 'react-native';
import permissionService, {
  PERMISSION_STATUS,
  requestNotificationPermission,
  requestCameraPermission,
  requestMicrophonePermission,
  requestCameraAndAudioPermission,
  requestLocationPermission,
} from '../src/services/permissionService';
import LocationService from '../src/services/locationService';

jest.mock('../src/services/locationService', () => ({
  requestPermissions: jest.fn(),
  openSettings: jest.fn(),
}));

describe('permissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
    Platform.Version = 33;
    PermissionsAndroid.check = jest.fn().mockResolvedValue(true);
    PermissionsAndroid.request = jest.fn().mockResolvedValue('granted');
    PermissionsAndroid.RESULTS = {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    };
    PermissionsAndroid.PERMISSIONS = {
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
      CAMERA: 'android.permission.CAMERA',
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
    };
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('requestNotificationPermission', () => {
    it('returns granted immediately on Android < 33', async () => {
      Platform.Version = 31;
      const result = await requestNotificationPermission();
      expect(result.isGranted).toBe(true);
      expect(result.status).toBe(PERMISSION_STATUS.GRANTED);
      expect(PermissionsAndroid.request).not.toHaveBeenCalled();
    });

    it('returns granted immediately if already granted on Android 33+', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(true);

      const result = await requestNotificationPermission();
      expect(result.isGranted).toBe(true);
      expect(result.status).toBe(PERMISSION_STATUS.GRANTED);
      expect(PermissionsAndroid.request).not.toHaveBeenCalled();
    });

    it('requests permission and resolves granted if user clicks allow', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(false);
      PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.GRANTED);

      const result = await requestNotificationPermission();
      expect(result.isGranted).toBe(true);
      expect(result.status).toBe(PERMISSION_STATUS.GRANTED);
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        expect.any(Object),
      );
    });

    it('returns denied if user rejects permission', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(false);
      PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.DENIED);

      const result = await requestNotificationPermission({ showSettingsDialog: false });
      expect(result.isGranted).toBe(false);
      expect(result.status).toBe(PERMISSION_STATUS.DENIED);
    });

    it('shows settings dialog if user selected never ask again', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(false);
      PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);

      const result = await requestNotificationPermission();
      expect(result.isGranted).toBe(false);
      expect(result.status).toBe(PERMISSION_STATUS.NEVER_ASK_AGAIN);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Notification Access Needed',
        expect.any(String),
        expect.any(Array),
      );
    });
  });

  describe('requestCameraPermission', () => {
    it('returns granted if already granted', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(true);

      const result = await requestCameraPermission();
      expect(result.isGranted).toBe(true);
      expect(result.status).toBe(PERMISSION_STATUS.GRANTED);
      expect(PermissionsAndroid.request).not.toHaveBeenCalled();
    });

    it('requests camera permission and returns granted upon approval', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(false);
      PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.GRANTED);

      const result = await requestCameraPermission();
      expect(result.isGranted).toBe(true);
      expect(result.status).toBe(PERMISSION_STATUS.GRANTED);
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        expect.any(Object),
      );
    });

    it('shows alert if camera permission is denied', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(false);
      PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.DENIED);

      const result = await requestCameraPermission({ showSettingsDialog: true });
      expect(result.isGranted).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Camera Access Needed',
        expect.any(String),
        expect.any(Array),
      );
    });
  });

  describe('requestMicrophonePermission', () => {
    it('returns granted if microphone already granted', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(true);

      const result = await requestMicrophonePermission();
      expect(result.isGranted).toBe(true);
      expect(result.status).toBe(PERMISSION_STATUS.GRANTED);
    });

    it('requests RECORD_AUDIO and returns granted upon approval', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(false);
      PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.GRANTED);

      const result = await requestMicrophonePermission();
      expect(result.isGranted).toBe(true);
      expect(PermissionsAndroid.request).toHaveBeenCalledWith(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        expect.any(Object),
      );
    });

    it('shows settings alert if microphone is permanently denied', async () => {
      PermissionsAndroid.check.mockResolvedValueOnce(false);
      PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);

      const result = await requestMicrophonePermission({ showSettingsDialog: true });
      expect(result.isGranted).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Microphone Permission Disabled',
        expect.any(String),
        expect.any(Array),
      );
    });
  });

  describe('requestCameraAndAudioPermission', () => {
    it('returns granted when both camera and mic are granted', async () => {
      PermissionsAndroid.check.mockResolvedValue(true);

      const result = await requestCameraAndAudioPermission();
      expect(result.isGranted).toBe(true);
    });

    it('fails if camera is denied', async () => {
      PermissionsAndroid.check.mockResolvedValue(false);
      PermissionsAndroid.request.mockResolvedValueOnce(PermissionsAndroid.RESULTS.DENIED);

      const result = await requestCameraAndAudioPermission({ showSettingsDialog: true });
      expect(result.isGranted).toBe(false);
      expect(Alert.alert).toHaveBeenCalled();
    });
  });

  describe('requestLocationPermission', () => {
    it('delegates to LocationService and returns granted', async () => {
      LocationService.requestPermissions.mockResolvedValueOnce({
        isGranted: true,
        isPrecise: true,
      });

      const result = await requestLocationPermission();
      expect(result.isGranted).toBe(true);
      expect(result.isPrecise).toBe(true);
    });

    it('handles permanently denied location permission with alert', async () => {
      LocationService.requestPermissions.mockResolvedValueOnce({
        isGranted: false,
        isPermanentlyDenied: true,
      });

      const result = await requestLocationPermission({ showSettingsDialog: true });
      expect(result.isGranted).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Access Needed',
        expect.any(String),
        expect.any(Array),
      );
    });
  });
});
