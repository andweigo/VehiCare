import apiClient from '../api/apiClient';
import { getToken } from '../services/storageService';

const resolveCategory = (type, data = {}) => {
  if (data?.category) {
    return data.category;
  }

  const t = String(type || '').toLowerCase();

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
  try {
    const token = await getToken();
    if (!token || String(token).startsWith('guest')) {
      return [];
    }

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
    if (err?.response?.status !== 401) {
      console.warn('[notificationService] Failed to fetch notifications:', err?.message);
    }
    return [];
  }
};

export const getUnreadCount = async () => {
  try {
    const token = await getToken();
    if (!token || String(token).startsWith('guest')) {
      return 0;
    }

    const response = await apiClient.get('/notifications/unread-count');
    return response?.data?.data?.unread_count || 0;
  } catch (err) {
    if (err?.response?.status !== 401) {
      console.warn('[notificationService] Failed to fetch unread count:', err?.message);
    }
    return 0;
  }
};

export const markAsRead = async id => {
  try {
    await apiClient.patch(`/notifications/${id}/read`);
    return true;
  } catch (err) {
    console.warn('[notificationService] Failed to mark notification as read:', err?.message);
    return false;
  }
};

export const markAllAsRead = async () => {
  try {
    await apiClient.patch('/notifications/read-all');
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
  markAsRead,
  markAllAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
};
