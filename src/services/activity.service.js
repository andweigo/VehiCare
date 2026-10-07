import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActivityIcon } from '../utils/activityUtils';
import { getRecentActivitiesStorageKey } from './storageService';

const MAX_STORAGE_LIMIT = 50;

/**
 * Service to manage cross-app user activity timeline
 */
export const activityService = {
  /**
   * Get all persisted activities from AsyncStorage for given userId
   */
  async getAllActivities(userId = null) {
    try {
      const storageKey = getRecentActivitiesStorageKey(userId);
      const json = await AsyncStorage.getItem(storageKey);
      if (json) {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      return [];
    } catch (err) {
      console.warn('Failed to load recent activities:', err);
      return [];
    }
  },

  /**
   * Get recent activities up to requested limit (default 5)
   */
  async getRecentActivities(limit = 5, userId = null) {
    const list = await this.getAllActivities(userId);
    return list.slice(0, limit);
  },

  /**
   * Add a new activity entry to persistent timeline
   */
  async addActivity({
    type,
    title,
    description = '',
    icon = null,
    vehicleId = null,
    vehicleName = null,
    userId = null,
    metadata = {},
  }) {
    if (!type || !title) {
      return null;
    }

    try {
      const existing = await this.getAllActivities(userId);

      const newEntry = {
        id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type,
        title: title.trim(),
        description: description ? description.trim() : '',
        icon: icon || getActivityIcon(type),
        createdAt: new Date().toISOString(),
        vehicleId: vehicleId ? String(vehicleId) : null,
        vehicleName: vehicleName || null,
        userId: userId || null,
        metadata: metadata || {},
      };

      // Prevent duplicate activity entries within a 5-second window
      if (existing.length > 0) {
        const top = existing[0];
        if (
          top.type === newEntry.type &&
          top.title === newEntry.title &&
          top.vehicleId === newEntry.vehicleId
        ) {
          const topTime = new Date(top.createdAt).getTime();
          const newTime = new Date(newEntry.createdAt).getTime();
          if (newTime - topTime < 5000) {
            return top; // Skip duplicate burst entry
          }
        }
      }

      const updatedList = [newEntry, ...existing].slice(0, MAX_STORAGE_LIMIT);
      const storageKey = getRecentActivitiesStorageKey(userId);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedList));
      return newEntry;
    } catch (err) {
      console.warn('Failed to save activity entry:', err);
      return null;
    }
  },

  /**
   * Clear all activity records for specified userId
   */
  async clearActivities(userId = null) {
    try {
      const storageKey = getRecentActivitiesStorageKey(userId);
      await AsyncStorage.removeItem(storageKey);
      return true;
    } catch (err) {
      console.warn('Failed to clear activities:', err);
      return false;
    }
  },
};

export default activityService;

