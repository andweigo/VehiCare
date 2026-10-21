import { NativeModules } from 'react-native';

/**
 * Update the app icon badge count and system notification on the user's mobile device.
 * @param {number} count - Unread notification count. If 0, clears the badge and system alert.
 */
export const setDeviceBadgeCount = async (count = 0) => {
  const safeCount = Math.max(0, parseInt(count, 10) || 0);
  const badgeModule = NativeModules?.VehiCareBadge;

  if (badgeModule?.setBadgeCount) {
    try {
      await badgeModule.setBadgeCount(safeCount);
    } catch (err) {
      console.warn('[deviceBadgeService] Failed to set native device badge:', err?.message);
    }
  }
};

/**
 * Clear the native badge count and system notification.
 */
export const clearDeviceBadge = async () => {
  await setDeviceBadgeCount(0);
};

export default {
  setDeviceBadgeCount,
  clearDeviceBadge,
};
