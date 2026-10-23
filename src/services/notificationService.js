import apiClient from '../api/apiClient';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../services/storageService';
import { setDeviceBadgeCount } from './deviceBadgeService';

export const NOTIFICATION_READ_STATE_CHANGED = 'notificationReadStateChanged';
export const NEW_IN_APP_NOTIFICATION_EVENT = 'vehicareNewInAppNotification';

const PREFS_STORAGE_KEY = '@vehicare_notification_preferences';

let lastSynchronizedCount = null;
let lastLatestUnread = null;
let alertedToastIds = new Set();
let cachedPreferences = null;

// Eagerly restore cached preferences on module initialization
AsyncStorage.getItem(PREFS_STORAGE_KEY)
  .then(stored => {
    if (stored) {
      try {
        cachedPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      } catch (_) {}
    }
  })
  .catch(() => {});

export const DEFAULT_PREFERENCES = {
  push_notifications: true,
  in_app_notifications: true,
  vehicle_updates: true,
  vehicle_edit_requests: true,
  diagnostic_results: true,
  high_severity_alerts: true,
  critical_alerts: true,
  maintenance_reminders: true,
  overdue_maintenance: true,
  maintenance_schedule_updates: true,
  professional_assistance: true,
  nearby_repair_shops: true,
  service_referrals: true,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
};

export const resolveCategory = (type, data = {}) => {
  if (data?.category) {
    return data.category;
  }

  const t = String(type || '').toLowerCase();

  if (t.includes('announcement')) {
    return 'Announcements';
  }
  if (t.includes('vehicle') || t.includes('edit')) {
    return 'Vehicle';
  }
  if (t.includes('diag') || t.includes('health') || t.includes('symptom')) {
    return 'Diagnostics';
  }
  if (t.includes('maint') || t.includes('service') || t.includes('oil')) {
    return 'Maintenance';
  }
  if (t.includes('account') || t.includes('security') || t.includes('login') || t.includes('profile')) {
    return 'Account';
  }

  return 'Vehicle';
};

export const isWithinQuietHours = (startStr = '22:00', endStr = '07:00', date = new Date()) => {
  try {
    const parseTime = str => {
      const [h, m] = String(str || '').split(':').map(n => parseInt(n, 10) || 0);
      return h * 60 + m;
    };
    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    const startMinutes = parseTime(startStr);
    const endMinutes = parseTime(endStr);

    if (startMinutes === endMinutes) return false;

    if (startMinutes < endMinutes) {
      // Same-day window (e.g. 01:00 to 06:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight window (e.g. 22:00 to 07:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  } catch (_) {
    return false;
  }
};

export const isCriticalNotification = notification => {
  if (!notification) return false;
  const t = String(notification.type || '').toLowerCase();
  const severity = String(notification.data?.severity || '').toLowerCase();
  const title = String(notification.title || '').toLowerCase();
  return (
    severity === 'critical' ||
    severity === 'high' ||
    t.includes('critical') ||
    t.includes('emergency') ||
    t.includes('warning') ||
    title.includes('critical') ||
    title.includes('emergency')
  );
};

export const isCategoryEnabled = (notification, prefs) => {
  if (!notification || !prefs) return true;
  const category = notification.category || resolveCategory(notification.type, notification.data);
  const t = String(notification.type || '').toLowerCase();

  if (category === 'Diagnostics' || t.includes('diag') || t.includes('health') || t.includes('symptom')) {
    if (prefs.diagnostic_results === false) return false;
  }
  if (category === 'Maintenance' || t.includes('maint') || t.includes('service') || t.includes('oil')) {
    if (prefs.maintenance_reminders === false) return false;
  }
  if (category === 'Vehicle' || t.includes('vehicle') || t.includes('edit')) {
    if (prefs.vehicle_updates === false) return false;
  }
  if (t.includes('shop') || t.includes('repair')) {
    if (prefs.nearby_repair_shops === false) return false;
  }
  return true;
};

export const shouldShowPushNotification = (notification, prefs = null) => {
  const p = prefs || cachedPreferences || DEFAULT_PREFERENCES;
  if (p.push_notifications === false) {
    return false;
  }
  if (!notification) return true;

  if (p.quiet_hours_enabled && isWithinQuietHours(p.quiet_hours_start, p.quiet_hours_end)) {
    if (isCriticalNotification(notification)) {
      return p.critical_alerts !== false;
    }
    return false;
  }

  return isCategoryEnabled(notification, p);
};

export const shouldShowInAppNotification = (notification, prefs = null) => {
  const p = prefs || cachedPreferences || DEFAULT_PREFERENCES;
  if (p.in_app_notifications === false) {
    return false;
  }
  if (!notification) return true;

  if (p.quiet_hours_enabled && isWithinQuietHours(p.quiet_hours_start, p.quiet_hours_end)) {
    if (isCriticalNotification(notification)) {
      return p.critical_alerts !== false;
    }
    return false;
  }

  return isCategoryEnabled(notification, p);
};

const emitInAppNotificationIfNew = notification => {
  if (!notification || notification.isRead) return;
  if (!shouldShowInAppNotification(notification)) return;
  const idKey = String(notification.id || `${notification.title || ''}:${notification.message || ''}`);
  if (!idKey || alertedToastIds.has(idKey)) return;
  alertedToastIds.add(idKey);
  DeviceEventEmitter.emit(NEW_IN_APP_NOTIFICATION_EVENT, notification);
};

export const fetchNotifications = async () => {
  const token = await getToken();
  if (!token || String(token).startsWith('guest')) {
    return [];
  }

  try {
    const response = await apiClient.get('/notifications');
    const items = response?.data?.data || [];

    const mapped = items.map(n => {
      const dataPayload = n.data || {};
      const notificationType = n.type || dataPayload.type || 'system_notice';
      
      return {
        id: String(n.id),
        type: notificationType,
        category: resolveCategory(notificationType, dataPayload),
        title: n.title || dataPayload.title || dataPayload.subject || 'VehiCare Alert',
        message:
          n.message ||
          dataPayload.message ||
          dataPayload.body ||
          dataPayload.content ||
          dataPayload.description ||
          (notificationType ? `New ${notificationType.replace(/_/g, ' ')} update` : 'New notification from VehiCare'),
        data: dataPayload,
        isRead: Boolean(n.is_read),
        timestamp: n.timestamp || (n.created_at ? new Date(n.created_at).getTime() : Date.now()),
        vehicleId: dataPayload.vehicle_id || n.vehicle_id || null,
        requestId: dataPayload.request_id || n.request_id || null,
      };
    }).sort((a, b) => b.timestamp - a.timestamp);

    const unreadItems = mapped.filter(n => !n.isRead);
    const newestUnread = unreadItems[0] || null;
    if (newestUnread) {
      lastLatestUnread = newestUnread;
      lastSynchronizedCount = unreadItems.length;
      if (shouldShowPushNotification(newestUnread)) {
        setDeviceBadgeCount(unreadItems.length, newestUnread).catch(() => {});
      } else {
        setDeviceBadgeCount(0).catch(() => {});
      }
      emitInAppNotificationIfNew(newestUnread);
    } else if (mapped.length > 0 && unreadItems.length === 0) {
      lastLatestUnread = null;
    }

    return mapped;
  } catch (err) {
    if (err?.response?.status === 401) {
      return [];
    }

    const safeMessage =
      err?.response?.data?.message ||
      err?.message ||
      'Failed to load notifications from server.';
    console.warn('[notificationService] Failed to fetch notifications:', safeMessage);

    const error = new Error(safeMessage);
    error.status = err?.response?.status || null;
    error.isNetworkError = !err?.response;
    throw error;
  }
};

export const resetNotificationSyncState = () => {
  lastSynchronizedCount = null;
  lastLatestUnread = null;
  alertedToastIds.clear();
  cachedPreferences = null;
};

export const getLatestUnreadNotification = () => lastLatestUnread;

export const getUnreadCount = async () => {
  try {
    const token = await getToken();
    if (!token || String(token).startsWith('guest')) {
      if (lastSynchronizedCount !== 0) {
        lastSynchronizedCount = 0;
        lastLatestUnread = null;
        setDeviceBadgeCount(0).catch(() => {});
      }
      return 0;
    }

    const response = await apiClient.get('/notifications/unread-count');
    const count = response?.data?.data?.unread_count;
    const rawLatest = response?.data?.data?.latest_unread || null;

    if (rawLatest && typeof rawLatest === 'object') {
      const dataPayload = rawLatest.data || {};
      const notificationType = rawLatest.type || dataPayload.type || 'system_notice';
      lastLatestUnread = {
        id: String(rawLatest.id),
        type: notificationType,
        category: resolveCategory(notificationType, dataPayload),
        title: rawLatest.title || dataPayload.title || dataPayload.subject || 'VehiCare Alert',
        message:
          rawLatest.message ||
          dataPayload.message ||
          dataPayload.body ||
          dataPayload.content ||
          dataPayload.description ||
          'New notification from VehiCare - tap to view details.',
        data: dataPayload,
        isRead: false,
        timestamp:
          rawLatest.timestamp ||
          (rawLatest.created_at ? new Date(rawLatest.created_at).getTime() : Date.now()),
        vehicleId: dataPayload.vehicle_id || rawLatest.vehicle_id || null,
        requestId: dataPayload.request_id || rawLatest.request_id || null,
      };
      emitInAppNotificationIfNew(lastLatestUnread);
    } else if (count === 0) {
      lastLatestUnread = null;
    }

    if (Number.isInteger(count) && count >= 0) {
      if (count !== lastSynchronizedCount) {
        lastSynchronizedCount = count;
        const targetNotif = lastLatestUnread || getLatestUnreadNotification();
        if (count > 0 && shouldShowPushNotification(targetNotif)) {
          if (targetNotif) {
            setDeviceBadgeCount(count, targetNotif).catch(() => {});
          } else {
            setDeviceBadgeCount(count).catch(() => {});
            // Enqueue background fetch to enrich badge with content if available
            fetchNotifications().catch(() => {});
          }
        } else {
          setDeviceBadgeCount(0).catch(() => {});
        }
      }
      return count;
    }
    return null;
  } catch (err) {
    if (err?.response?.status !== 401) {
      console.warn('[notificationService] Failed to fetch unread count:', err?.message);
    }
    return null;
  }
};

export const markAsRead = async id => {
  try {
    await apiClient.patch(`/notifications/${id}/read`);
    DeviceEventEmitter.emit(NOTIFICATION_READ_STATE_CHANGED);
    lastSynchronizedCount = null;
    const unreadCount = await getUnreadCount();
    if (typeof unreadCount === 'number') {
      const remainingNotif = getLatestUnreadNotification();
      if (remainingNotif) {
        await setDeviceBadgeCount(unreadCount, remainingNotif);
      } else {
        await setDeviceBadgeCount(unreadCount);
      }
    }
    return true;
  } catch (err) {
    console.warn('[notificationService] Failed to mark notification as read:', err?.message);
    return false;
  }
};

export const markAllAsRead = async () => {
  try {
    await apiClient.patch('/notifications/read-all');
    lastSynchronizedCount = 0;
    setDeviceBadgeCount(0).catch(() => {});
    DeviceEventEmitter.emit(NOTIFICATION_READ_STATE_CHANGED);
    return true;
  } catch (err) {
    console.warn('[notificationService] Failed to mark all as read:', err?.message);
    return false;
  }
};

export const getCachedNotificationPreferences = () => cachedPreferences || DEFAULT_PREFERENCES;

export const getNotificationPreferences = async () => {
  if (!cachedPreferences) {
    try {
      const stored = await AsyncStorage.getItem(PREFS_STORAGE_KEY);
      if (stored) {
        cachedPreferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (_) {}
  }

  try {
    const token = await getToken();
    if (!token || String(token).startsWith('guest')) {
      return cachedPreferences || DEFAULT_PREFERENCES;
    }

    const response = await apiClient.get('/user/notification-preferences');
    const data = response?.data?.data || DEFAULT_PREFERENCES;
    cachedPreferences = { ...DEFAULT_PREFERENCES, ...data };
    try {
      await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(cachedPreferences));
    } catch (_) {}
    return cachedPreferences;
  } catch (err) {
    console.warn('[notificationService] Failed to fetch preferences:', err?.message);
    return cachedPreferences || DEFAULT_PREFERENCES;
  }
};

export const updateNotificationPreferences = async data => {
  const previous = cachedPreferences || DEFAULT_PREFERENCES;
  const merged = { ...previous, ...data };
  cachedPreferences = merged;

  try {
    await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(merged));
  } catch (_) {}

  // If push notifications disabled, immediately cancel device badge / notification
  if (data?.push_notifications === false) {
    setDeviceBadgeCount(0).catch(() => {});
  }

  try {
    const token = await getToken();
    if (!token || String(token).startsWith('guest')) {
      return merged;
    }

    const response = await apiClient.put('/user/notification-preferences', data);
    const updated = response?.data?.data || merged;
    cachedPreferences = { ...DEFAULT_PREFERENCES, ...updated };
    try {
      await AsyncStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(cachedPreferences));
    } catch (_) {}
    return cachedPreferences;
  } catch (err) {
    console.warn('[notificationService] Failed to update preferences on server:', err?.message);
    return merged;
  }
};

export default {
  DEFAULT_PREFERENCES,
  fetchNotifications,
  getUnreadCount,
  getLatestUnreadNotification,
  setDeviceBadgeCount,
  resetNotificationSyncState,
  markAsRead,
  markAllAsRead,
  getCachedNotificationPreferences,
  getNotificationPreferences,
  updateNotificationPreferences,
  shouldShowPushNotification,
  shouldShowInAppNotification,
  isWithinQuietHours,
  isCriticalNotification,
  isCategoryEnabled,
  resolveCategory,
};
