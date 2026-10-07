/**
 * Centralized Icon Mapping for Activity Feed
 */
export const ACTIVITY_ICONS = {
  vehicle_added: 'directions-car',
  vehicle_updated: 'edit',
  vehicle_switched: 'swap-horiz',
  vehicle_archived: 'archive',

  diagnosis_created: 'medical-services',
  diagnosis_completed: 'auto-awesome',

  maintenance_recommended: 'build',
  maintenance_completed: 'check-circle',
  maintenance_logged: 'build-circle',
  maintenance_undone: 'undo',

  chat_started: 'chat-bubble-outline',
  chat_question: 'question-answer',

  reminder_updated: 'notifications',
};

/**
 * Get icon name for activity type with safe fallback
 */
export const getActivityIcon = type => {
  return ACTIVITY_ICONS[type] || 'circle';
};

/**
 * Theme-aware Category Icon Fills and Colors for Light & Dark Mode
 */
export const getActivityCategoryStyle = (type, isDark = false) => {
  const norm = String(type || '').toLowerCase();

  if (norm.includes('diag') || norm.includes('health') || norm.includes('symptom')) {
    return {
      icon: 'medical-services',
      color: isDark ? '#F63B05' : '#C2410C',
      background: isDark ? '#27160F' : '#FEE4DA',
    };
  }

  if (norm.includes('chat') || norm.includes('consult')) {
    return {
      icon: 'chat-bubble-outline',
      color: isDark ? '#8C7BFF' : '#6D28D9',
      background: isDark ? '#19162A' : '#F3E8FF',
    };
  }

  if (norm.includes('maint') || norm.includes('service') || norm.includes('oil')) {
    return {
      icon: 'build',
      color: isDark ? '#32D583' : '#15803D',
      background: isDark ? '#13241A' : '#DCFCE7',
    };
  }

  if (norm.includes('repair') || norm.includes('shop')) {
    return {
      icon: 'handyman',
      color: isDark ? '#F59E0B' : '#B45309',
      background: isDark ? '#29220F' : '#FEF3C7',
    };
  }

  return {
    icon: 'history',
    color: isDark ? '#F63B05' : '#C2410C',
    background: isDark ? '#27160F' : '#FEE4DA',
  };
};

/**
 * Human-friendly relative timestamp formatter
 */
export const formatActivityTime = createdAt => {
  if (!createdAt) return 'Recently';

  try {
    const now = new Date();
    const date = new Date(createdAt);

    if (isNaN(date.getTime())) return 'Recently';

    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
      return 'Yesterday';
    }
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }

    // Format like "Aug 29"
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch (err) {
    return 'Recently';
  }
};

/**
 * Group list of activities by date section header (TODAY, YESTERDAY, THIS WEEK, EARLIER)
 */
export const groupActivitiesByDate = activities => {
  if (!Array.isArray(activities) || activities.length === 0) return [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const weekStart = todayStart - 6 * 86400000;

  const groups = {
    TODAY: [],
    YESTERDAY: [],
    'THIS WEEK': [],
    EARLIER: [],
  };

  activities.forEach(act => {
    const actTime = act.createdAt ? new Date(act.createdAt).getTime() : 0;
    if (actTime >= todayStart) {
      groups['TODAY'].push(act);
    } else if (actTime >= yesterdayStart) {
      groups['YESTERDAY'].push(act);
    } else if (actTime >= weekStart) {
      groups['THIS WEEK'].push(act);
    } else {
      groups['EARLIER'].push(act);
    }
  });

  return Object.keys(groups)
    .filter(key => groups[key].length > 0)
    .map(key => ({ title: key, data: groups[key] }));
};

/**
 * Handle navigation when a user taps an activity entry
 */
export const handleActivityPress = (activity, navigation) => {
  if (!navigation || typeof navigation.navigate !== 'function' || !activity) {
    return;
  }

  const { type, metadata = {}, vehicleId } = activity;
  const normType = String(type || '').toLowerCase();

  // Explicit route override in activity metadata
  if (metadata.routeName) {
    navigation.navigate(metadata.routeName, metadata.routeParams || { vehicleId });
    return;
  }

  if (normType.startsWith('vehicle_') || normType.includes('vehicle')) {
    navigation.navigate('VehicleHealth', { vehicleId: vehicleId || metadata.vehicleId });
    return;
  }

  if (normType.startsWith('diagnosis_') || normType.includes('diag') || normType.includes('symptom')) {
    navigation.navigate('VehicleHealth', {
      vehicleId: vehicleId || metadata.vehicleId,
      diagnosisId: metadata.diagnosisId,
    });
    return;
  }

  if (normType.startsWith('maintenance_') || normType.includes('maint') || normType.includes('service')) {
    navigation.navigate('Maintenance', {
      vehicleId: vehicleId || metadata.vehicleId,
      maintenanceId: metadata.maintenanceId,
    });
    return;
  }

  if (normType.startsWith('chat_') || normType.includes('chat') || normType.includes('consult')) {
    navigation.navigate('AIConsultation', {
      vehicleId: vehicleId || metadata.vehicleId,
      sessionId: metadata.sessionId,
    });
    return;
  }

  if (normType.startsWith('reminder_') || normType.includes('reminder') || normType.includes('notification')) {
    navigation.navigate('Notifications');
    return;
  }

  if (normType.includes('repair') || normType.includes('shop')) {
    navigation.navigate('RepairShops');
    return;
  }

  // Default fallback navigation to History screen
  navigation.navigate('History', { activityId: activity.id });
};

