import apiClient from '../api/apiClient';
import { DeviceEventEmitter } from 'react-native';
import { getToken } from '../services/storageService';
import { setDeviceBadgeCount } from './deviceBadgeService';

export const NOTIFICATION_READ_STATE_CHANGED = 'notificationReadStateChanged';

const resolveCategory = (type, data = {}) => {
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

export const fetchNotifications = async () => {
  const token = await getToken();
  if (!token || String(token).startsWith('guest')) {
    return [];
  }

  try {
    const response = await apiClient.get('/notifications');
    const items = response?.data?.data || [];

    return items.map(n => {
      const dataPayload = n.data || {};
      const notificationType = n.type || dataPayload.type || 'system_notice';
      
      return {
        id: String(n.id),
        type: notificationType,
        category: resolveCategory(notificationType, dataPayload),
        title: n.title || dataPayload.title || 'Notification',
        message: n.message || dataPayload.message || '',
        data: dataPayload,
        isRead: Boolean(n.is_read),
        timestamp: n.timestamp || (n.created_at ? new Date(n.created_at).getTime() : Date.now()),
        vehicleId: dataPayload.vehicle_id || n.vehicle_id || null,
        requestId: dataPayload.request_id || n.request_id || null,
      };
    }).sort((a, b) => b.timestamp - a.timestamp);
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

export const getUnreadCount = async () => {
  try {
    const token = await getToken();
    if (!token || String(token).startsWith('guest')) {
      setDeviceBadgeCount(0);
      return 0;
    }

    const response = await apiClient.get('/notifications/unread-count');
    const count = response?.data?.data?.unread_count;
    if (Number.isInteger(count) && count >= 0) {
      setDeviceBadgeCount(count).catch(() => {});
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
    const unreadCount = await getUnreadCount();
    if (typeof unreadCount === 'number') {
      await setDeviceBadgeCount(unreadCount);
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
    setDeviceBadgeCount(0);
    DeviceEventEmitter.emit(NOTIFICATION_READ_STATE_CHANGED);
    return true;
  } catch (err) {
    console.warn('[notificationService] Failed to mark all as read:', err?.message);
    return false;
  }
};

export const getNotificationPreferences = async () => {
  try {
    const token = await getToken();
    if (!token || String(token).startsWith('guest')) {
      return DEFAULT_PREFERENCES;
    }

    const response = await apiClient.get('/user/notification-preferences');
    return response?.data?.data || DEFAULT_PREFERENCES;
  } catch (err) {
    console.warn('[notificationService] Failed to fetch preferences:', err?.message);
    return DEFAULT_PREFERENCES;
  }
};

export const updateNotificationPreferences = async data => {
  try {
    const token = await getToken();
    if (!token || String(token).startsWith('guest')) {
      return data;
    }

    const response = await apiClient.put('/user/notification-preferences', data);
    return response?.data?.data || data;
  } catch (err) {
    console.warn('[notificationService] Failed to update preferences:', err?.message);
    throw err;
  }
};

export default {
  DEFAULT_PREFERENCES,
  fetchNotifications,
  getUnreadCount,
  setDeviceBadgeCount,
  markAsRead,
  markAllAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
};
