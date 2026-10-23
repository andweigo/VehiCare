import { NativeModules } from 'react-native';

let lastNativeCount = null;

/**
 * Update the app icon badge count and system notification on the user's mobile device.
 * Skips redundant updates when the positive count hasn't changed to prevent repeated alerting.
 * @param {number} count - Unread notification count. If 0, clears the badge and system alert.
 * @param {object|null} notification - Optional latest unread notification to display in the push notification.
 */
export const setDeviceBadgeCount = async (count = 0, notification = null) => {
  const safeCount = Math.max(0, parseInt(count, 10) || 0);

  // If already at this unread count (> 0), skip native call completely to prevent repeated alert buzzing
  if (safeCount > 0 && safeCount === lastNativeCount) {
    return;
  }

  lastNativeCount = safeCount;
  const badgeModule = NativeModules?.VehiCareBadge;

  if (
    safeCount > 0 &&
    notification &&
    (notification.title || notification.message) &&
    typeof badgeModule?.setBadgeWithNotification === 'function'
  ) {
    try {
      await badgeModule.setBadgeWithNotification(
        safeCount,
        String(notification.title || 'VehiCare'),
        String(notification.message || ''),
        notification.id ? String(notification.id) : null,
        notification.type ? String(notification.type) : null,
      );
      return;
    } catch (err) {
      console.warn('[deviceBadgeService] Failed to set native badge with notification:', err?.message);
    }
  }

  if (badgeModule?.setBadgeCount) {
    try {
      await badgeModule.setBadgeCount(safeCount);
    } catch (err) {
      console.warn('[deviceBadgeService] Failed to set native device badge:', err?.message);
    }
  }
};

/**
 * Consume any pending push notification that launched or resumed the app when tapped.
 */
export const consumePendingPushNotification = async () => {
  const badgeModule = NativeModules?.VehiCareBadge;
  if (typeof badgeModule?.consumeOpenedNotification === 'function') {
    try {
      return await badgeModule.consumeOpenedNotification();
    } catch (err) {
      return null;
    }
  }
  return null;
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
  consumePendingPushNotification,
  clearDeviceBadge,
  resetBadgeCache,
};
