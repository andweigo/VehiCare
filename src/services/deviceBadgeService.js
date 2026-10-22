import { NativeModules } from 'react-native';

let lastNativeCount = null;

/**
 * Update the app icon badge count and system notification on the user's mobile device.
 * Skips redundant updates when the positive count hasn't changed to prevent repeated alerting.
 * @param {number} count - Unread notification count. If 0, clears the badge and system alert.
 */
export const setDeviceBadgeCount = async (count = 0) => {
  const safeCount = Math.max(0, parseInt(count, 10) || 0);

  // If already at this unread count (> 0), skip native call completely to prevent repeated alert buzzing
  if (safeCount > 0 && safeCount === lastNativeCount) {
    return;
  }

  lastNativeCount = safeCount;
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
  lastNativeCount = 0;
  await setDeviceBadgeCount(0);
};

/**
 * Reset in-memory cache (used for unit tests and session cleanup).
 */
export const resetBadgeCache = () => {
  lastNativeCount = null;
};

export default {
  setDeviceBadgeCount,
  clearDeviceBadge,
  resetBadgeCache,
};
