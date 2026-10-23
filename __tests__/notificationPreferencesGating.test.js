import {
  DEFAULT_PREFERENCES,
  shouldShowPushNotification,
  shouldShowInAppNotification,
  isWithinQuietHours,
  isCriticalNotification,
  isCategoryEnabled,
  updateNotificationPreferences,
  resetNotificationSyncState,
} from '../src/services/notificationService';
import { setDeviceBadgeCount } from '../src/services/deviceBadgeService';
import apiClient from '../src/api/apiClient';
import { getToken } from '../src/services/storageService';

jest.mock('../src/api/apiClient');
jest.mock('../src/services/storageService');
jest.mock('../src/services/deviceBadgeService', () => ({
  setDeviceBadgeCount: jest.fn().mockResolvedValue(),
  resetBadgeCache: jest.fn(),
}));

describe('Notification Preferences Gating & Quiet Hours', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNotificationSyncState();
    getToken.mockResolvedValue('user_jwt_123');
  });

  afterEach(() => {
    resetNotificationSyncState();
  });

  describe('Master Push & In-App toggles', () => {
    it('blocks push notification when push_notifications is false', () => {
      const prefs = { ...DEFAULT_PREFERENCES, push_notifications: false };
      const notification = { id: '1', title: 'Test Alert', message: 'Engine check' };

      expect(shouldShowPushNotification(notification, prefs)).toBe(false);
    });

    it('allows push notification when push_notifications is true', () => {
      const prefs = { ...DEFAULT_PREFERENCES, push_notifications: true };
      const notification = { id: '1', title: 'Test Alert', message: 'Engine check', type: 'system_notice' };

      expect(shouldShowPushNotification(notification, prefs)).toBe(true);
    });

    it('blocks in-app notification when in_app_notifications is false', () => {
      const prefs = { ...DEFAULT_PREFERENCES, in_app_notifications: false };
      const notification = { id: '1', title: 'Test Alert', message: 'Engine check' };

      expect(shouldShowInAppNotification(notification, prefs)).toBe(false);
    });

    it('allows in-app notification when in_app_notifications is true', () => {
      const prefs = { ...DEFAULT_PREFERENCES, in_app_notifications: true };
      const notification = { id: '1', title: 'Test Alert', message: 'Engine check', type: 'system_notice' };

      expect(shouldShowInAppNotification(notification, prefs)).toBe(true);
    });
  });

  describe('isWithinQuietHours calculation', () => {
    it('detects time within overnight quiet hours (22:00 to 07:00)', () => {
      const lateNight = new Date(2026, 9, 24, 23, 30); // 23:30
      expect(isWithinQuietHours('22:00', '07:00', lateNight)).toBe(true);

      const earlyMorning = new Date(2026, 9, 24, 5, 15); // 05:15
      expect(isWithinQuietHours('22:00', '07:00', earlyMorning)).toBe(true);
    });

    it('detects time outside overnight quiet hours', () => {
      const afternoon = new Date(2026, 9, 24, 14, 0); // 14:00
      expect(isWithinQuietHours('22:00', '07:00', afternoon)).toBe(false);

      const morning = new Date(2026, 9, 24, 8, 30); // 08:30
      expect(isWithinQuietHours('22:00', '07:00', morning)).toBe(false);
    });

    it('detects time within same-day quiet hours (01:00 to 06:00)', () => {
      const midNight = new Date(2026, 9, 24, 3, 0); // 03:00
      expect(isWithinQuietHours('01:00', '06:00', midNight)).toBe(true);

      const noon = new Date(2026, 9, 24, 12, 0); // 12:00
      expect(isWithinQuietHours('01:00', '06:00', noon)).toBe(false);
    });
  });

  describe('Quiet hours suppression and critical alert bypass', () => {
    it('suppresses regular notification during quiet hours', () => {
      const prefs = {
        ...DEFAULT_PREFERENCES,
        quiet_hours_enabled: true,
        quiet_hours_start: '00:00',
        quiet_hours_end: '23:59', // All day quiet hours for testing
      };
      const regularNotif = { id: '1', title: 'Tip', message: 'Check tire pressure regularly' };

      expect(shouldShowPushNotification(regularNotif, prefs)).toBe(false);
      expect(shouldShowInAppNotification(regularNotif, prefs)).toBe(false);
    });

    it('permits critical safety alert during quiet hours when critical_alerts is enabled', () => {
      const prefs = {
        ...DEFAULT_PREFERENCES,
        quiet_hours_enabled: true,
        quiet_hours_start: '00:00',
        quiet_hours_end: '23:59',
        critical_alerts: true,
      };
      const criticalNotif = {
        id: '99',
        title: 'Critical Engine Overheat Alert',
        message: 'Engine temperature exceeded safe threshold',
        data: { severity: 'critical' },
      };

      expect(isCriticalNotification(criticalNotif)).toBe(true);
      expect(shouldShowPushNotification(criticalNotif, prefs)).toBe(true);
      expect(shouldShowInAppNotification(criticalNotif, prefs)).toBe(true);
    });
  });

  describe('Category filtering', () => {
    it('suppresses diagnostic notification when diagnostic_results is disabled', () => {
      const prefs = { ...DEFAULT_PREFERENCES, diagnostic_results: false };
      const diagNotif = { id: '2', type: 'diagnostic_complete', category: 'Diagnostics' };

      expect(isCategoryEnabled(diagNotif, prefs)).toBe(false);
      expect(shouldShowPushNotification(diagNotif, prefs)).toBe(false);
    });

    it('suppresses maintenance notification when maintenance_reminders is disabled', () => {
      const prefs = { ...DEFAULT_PREFERENCES, maintenance_reminders: false };
      const maintNotif = { id: '3', type: 'maintenance_due', category: 'Maintenance' };

      expect(isCategoryEnabled(maintNotif, prefs)).toBe(false);
      expect(shouldShowPushNotification(maintNotif, prefs)).toBe(false);
    });

    it('suppresses vehicle update notification when vehicle_updates is disabled', () => {
      const prefs = { ...DEFAULT_PREFERENCES, vehicle_updates: false };
      const vehicleNotif = { id: '4', type: 'vehicle_profile_update', category: 'Vehicle' };

      expect(isCategoryEnabled(vehicleNotif, prefs)).toBe(false);
      expect(shouldShowPushNotification(vehicleNotif, prefs)).toBe(false);
    });
  });

  describe('updateNotificationPreferences behavior', () => {
    it('clears device badge immediately when push_notifications is switched off', async () => {
      apiClient.put.mockResolvedValueOnce({
        data: { data: { ...DEFAULT_PREFERENCES, push_notifications: false } },
      });

      await updateNotificationPreferences({ push_notifications: false });

      expect(setDeviceBadgeCount).toHaveBeenCalledWith(0);
      expect(apiClient.put).toHaveBeenCalledWith('/user/notification-preferences', {
        push_notifications: false,
      });
    });
  });
});
