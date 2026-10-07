import { useCallback, useEffect, useMemo, useState } from 'react';
import activityService from '../services/activity.service';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook to consume and update persistent cross-app user activities
 */
export const useRecentActivities = (limit = 5) => {
  const { user } = useAuth();
  const userId = user?.id || user?.uid || null;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshActivities = useCallback(async () => {
    try {
      const data = await activityService.getAllActivities(userId);
      setActivities(data);
    } catch (err) {
      console.warn('Error refreshing activities in hook:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshActivities();
  }, [refreshActivities]);

  const addActivity = useCallback(
    async entryData => {
      const result = await activityService.addActivity({
        ...entryData,
        userId,
      });
      if (result) {
        await refreshActivities();
      }
      return result;
    },
    [refreshActivities, userId],
  );

  const recentActivities = useMemo(
    () => activities.slice(0, limit),
    [activities, limit],
  );

  return {
    activities,
    recentActivities,
    loading,
    addActivity,
    refreshActivities,
  };
};

export default useRecentActivities;

