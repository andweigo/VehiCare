import { NativeModules } from 'react-native';

let lastNativeCount = null;
let lastNativeNotifId = null;
let lastNativeHadContent = false;

/**
 * Update the app icon badge count and system notification on the user's mobile device.
 * Skips redundant updates when the positive count and notification ID haven't changed,
 * while always allowing upgrades that supply the notification's title and content.
 * @param {number} count - Unread notification count. If 0, clears the badge and system alert.
 * @param {object|null} notification - Optional latest unread notification to display in the push notification.
 */
export const setDeviceBadgeCount = async (count = 0, notification = null) => {
  const safeCount = Math.max(0, parseInt(count, 10) || 0);
  const notifId = notification?.id ? String(notification.id) : null;
  const hasContent = Boolean(notification && (notification.title || notification.message));
  const isNewNotifId = Boolean(notifId && notifId !== lastNativeNotifId);
  const isContentUpgrade = Boolean(hasContent && !lastNativeHadContent);

  if (safeCount > 0 && safeCount === lastNativeCount && !isNewNotifId && !isContentUpgrade) {
    return;
  }

  lastNativeCount = safeCount;
  if (safeCount === 0) {
    lastNativeNotifId = null;
    lastNativeHadContent = false;
  } else {
    if (notifId) lastNativeNotifId = notifId;
    if (hasContent) lastNativeHadContent = true;
  }

  const badgeModule = NativeModules?.VehiCareBadge;

  if (
    safeCount > 0 &&
    hasContent &&
    typeof badgeModule?.setBadgeWithNotification === 'function'
  ) {
    try {
      await badgeModule.setBadgeWithNotification(
        safeCount,
        String(notification.title || 'VehiCare'),
        String(notification.message || ''),
        notifId,
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
  lastNativeNotifId = null;
  lastNativeHadContent = false;
  await setDeviceBadgeCount(0);
};

/**
 * Reset in-memory cache (used for unit tests and session cleanup).
 */
export const resetBadgeCache = () => {
  lastNativeCount = null;
  lastNativeNotifId = null;
  lastNativeHadContent = false;
};

export default {
  setDeviceBadgeCount,
  consumePendingPushNotification,
  clearDeviceBadge,
  resetBadgeCache,
};
