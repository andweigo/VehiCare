import AsyncStorage from '@react-native-async-storage/async-storage';

/*
|--------------------------------------------------------------------------
| STORAGE KEYS
|--------------------------------------------------------------------------
*/

const TOKEN_KEY = '@vehicare_token';
const USER_KEY = '@vehicare_user';
const GUEST_DIAGNOSIS_COUNT_KEY = '@vehicare_guest_diagnosis_count';

/*
|--------------------------------------------------------------------------
| TOKEN
|--------------------------------------------------------------------------
*/

export const saveToken = async token => {
  try {
    if (!token) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      return;
    }

    await AsyncStorage.setItem(
      TOKEN_KEY,
      String(token),
    );
  } catch (error) {
    console.error(
      'Failed to save token:',
      error?.message || error,
    );

    throw error;
  }
};

export const getToken = async () => {
  try {
    return await AsyncStorage.getItem(
      TOKEN_KEY,
    );
  } catch (error) {
    console.error(
      'Failed to get token:',
      error?.message || error,
    );

    return null;
  }
};

export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem(
      TOKEN_KEY,
    );
  } catch (error) {
    console.error(
      'Failed to remove token:',
      error?.message || error,
    );
  }
};

/*
|--------------------------------------------------------------------------
| USER
|--------------------------------------------------------------------------
*/

export const saveUser = async user => {
  try {
    if (!user) {
      await AsyncStorage.removeItem(
        USER_KEY,
      );
      return;
    }

    await AsyncStorage.setItem(
      USER_KEY,
      JSON.stringify(user),
    );
  } catch (error) {
    console.error(
      'Failed to save user:',
      error?.message || error,
    );

    throw error;
  }
};

export const getUser = async () => {
  try {
    const storedUser =
      await AsyncStorage.getItem(
        USER_KEY,
      );

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser);
    } catch {
      return null;
    }
  } catch (error) {
    console.error(
      'Failed to get user:',
      error?.message || error,
    );

    return null;
  }
};

export const removeUser = async () => {
  try {
    await AsyncStorage.removeItem(
      USER_KEY,
    );
  } catch (error) {
    console.error(
      'Failed to remove user:',
      error?.message || error,
    );
  }
};

/*
|--------------------------------------------------------------------------
| AUTH DATA
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This ONLY clears authentication information.
|
| It does NOT store or clear guest vehicles.
| Guest vehicle state is handled by vehicleService.js.
|
|--------------------------------------------------------------------------
*/

export const saveAuthData = async (
  token,
  user,
) => {
  try {
    if (token) {
      await AsyncStorage.setItem(
        TOKEN_KEY,
        String(token),
      );
    } else {
      await AsyncStorage.removeItem(
        TOKEN_KEY,
      );
    }

    if (user) {
      await AsyncStorage.setItem(
        USER_KEY,
        JSON.stringify(user),
      );
    } else {
      await AsyncStorage.removeItem(
        USER_KEY,
      );
    }
  } catch (error) {
    console.error(
      'Failed to save auth data:',
      error?.message || error,
    );

    throw error;
  }
};

export const clearAuthData = async () => {
  try {
    if (
      AsyncStorage &&
      typeof AsyncStorage.multiRemove === 'function'
    ) {
      await AsyncStorage.multiRemove([
        TOKEN_KEY,
        USER_KEY,
      ]);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    }
  } catch (error) {
    console.error(
      'Failed to clear auth data:',
      error?.message || error,
    );

    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| GUEST DIAGNOSIS COUNT
|--------------------------------------------------------------------------
*/

export const getGuestDiagnosisCount =
  async () => {
    try {
      const value =
        await AsyncStorage.getItem(
          GUEST_DIAGNOSIS_COUNT_KEY,
        );

      if (!value) {
        return 0;
      }

      const number =
        parseInt(value, 10);

      return Number.isNaN(number)
        ? 0
        : number;
    } catch (error) {
      console.error(
        'Failed to get guest diagnosis count:',
        error?.message || error,
      );

      return 0;
    }
  };

export const saveGuestDiagnosisCount =
  async count => {
    try {
      await AsyncStorage.setItem(
        GUEST_DIAGNOSIS_COUNT_KEY,
        String(count),
      );
    } catch (error) {
      console.error(
        'Failed to save guest diagnosis count:',
        error?.message || error,
      );

      throw error;
    }
  };

export const incrementGuestDiagnosisCount =
  async () => {
    const current =
      await getGuestDiagnosisCount();

    const next = current + 1;

    await saveGuestDiagnosisCount(
      next,
    );

    return next;
  };

export const clearGuestDiagnosisCount = async () => {
  try {
    await AsyncStorage.removeItem(GUEST_DIAGNOSIS_COUNT_KEY);
  } catch (error) {
    console.error('Failed to clear guest diagnosis count:', error?.message || error);
  }
};

const GUEST_UUID_KEY = '@vehicare_guest_uuid';

export const getGuestUuid = async () => {
  try {
    let uuid = await AsyncStorage.getItem(GUEST_UUID_KEY);
    if (!uuid) {
      uuid = `guest-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await AsyncStorage.setItem(GUEST_UUID_KEY, uuid);
    }
    return uuid;
  } catch (error) {
    return 'guest-device-fallback';
  }
};

const GUEST_VEHICLE_KEY = '@vehicare_guest_vehicle';
const ONBOARDING_COMPLETED_KEY = '@vehicare_onboarding_completed';
const GUEST_MODE_KEY = '@vehicare_guest_mode';

export const saveOnboardingCompleted = async (completed = true) => {
  try {
    if (!completed) {
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      return;
    }
    await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
  } catch (error) {
    console.error('Failed to save onboarding completed status:', error?.message || error);
  }
};

export const getOnboardingCompleted = async () => {
  try {
    const val = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
    return val === 'true';
  } catch (error) {
    console.error('Failed to get onboarding completed status:', error?.message || error);
    return false;
  }
};

export const saveGuestMode = async (isGuest = true) => {
  try {
    if (!isGuest) {
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
      return;
    }
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
  } catch (error) {
    console.error('Failed to save guest mode status:', error?.message || error);
  }
};

export const getGuestMode = async () => {
  try {
    const val = await AsyncStorage.getItem(GUEST_MODE_KEY);
    return val === 'true';
  } catch (error) {
    console.error('Failed to get guest mode status:', error?.message || error);
    return false;
  }
};

export const clearGuestMode = async () => {
  try {
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
  } catch (error) {
    console.error('Failed to clear guest mode status:', error?.message || error);
  }
};

export const saveGuestVehicle = async (vehicle) => {
  try {
    if (!vehicle) {
      await AsyncStorage.removeItem(GUEST_VEHICLE_KEY);
      return;
    }
    await AsyncStorage.setItem(GUEST_VEHICLE_KEY, JSON.stringify(vehicle));
  } catch (error) {
    console.error('Failed to save guest vehicle:', error?.message || error);
  }
};

export const getGuestVehicle = async () => {
  try {
    const raw = await AsyncStorage.getItem(GUEST_VEHICLE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to get guest vehicle:', error?.message || error);
    return null;
  }
};

export const clearGuestVehicle = async () => {
  try {
    await AsyncStorage.removeItem(GUEST_VEHICLE_KEY);
  } catch (error) {
    console.error('Failed to clear guest vehicle:', error?.message || error);
  }
};

/*
|--------------------------------------------------------------------------
| ACTIVE CHAT PERSISTENCE
|--------------------------------------------------------------------------
*/

const ACTIVE_CHAT_KEY_PREFIX = '@vehicare_active_chats_';
const HISTORY_KEY_PREFIX = '@vehicare_history_';
const RECENT_ACTIVITIES_KEY_PREFIX = '@vehicare_recent_activities_';
const VEHICLES_KEY_PREFIX = '@vehicare_vehicles_';

export const getHistoryStorageKey = (userId = null) => {
  const uid = userId || 'guest';
  return `${HISTORY_KEY_PREFIX}${uid}`;
};

export const getRecentActivitiesStorageKey = (userId = null) => {
  const uid = userId || 'guest';
  return `${RECENT_ACTIVITIES_KEY_PREFIX}${uid}`;
};

export const getVehiclesStorageKey = (userId = null) => {
  const uid = userId || 'guest';
  return `${VEHICLES_KEY_PREFIX}${uid}`;
};

export const getActiveChatStorageKey = (userId = null) => {
  const uid = userId || 'guest';
  return `${ACTIVE_CHAT_KEY_PREFIX}${uid}`;
};

export const loadActiveChatSessions = async (userId = null) => {
  try {
    const key = getActiveChatStorageKey(userId);
    const stored = await AsyncStorage.getItem(key);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load active chat sessions:', error?.message || error);
    return null;
  }
};

export const saveActiveChatSessions = async (userId = null, chatData = {}) => {
  try {
    const key = getActiveChatStorageKey(userId);
    if (!chatData) {
      await AsyncStorage.removeItem(key);
      return;
    }
    await AsyncStorage.setItem(key, JSON.stringify(chatData));
  } catch (error) {
    console.error('Failed to save active chat sessions:', error?.message || error);
  }
};

export const clearActiveChatSessions = async (userId = null) => {
  try {
    const key = getActiveChatStorageKey(userId);
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to clear active chat sessions:', error?.message || error);
  }
};

/*
|--------------------------------------------------------------------------
| PENDING VEHICLE SETUP (per account)
|--------------------------------------------------------------------------
| Persists the "email verified, vehicle setup not finished yet" onboarding
| stage so an app restart resumes at vehicle setup. It is only a hint: the
| navigator always reconciles it against the real vehicle list from Laravel.
*/

const PENDING_VEHICLE_SETUP_KEY_PREFIX = '@vehicare_pending_vehicle_setup_';

export const getPendingVehicleSetupKey = userId =>
  `${PENDING_VEHICLE_SETUP_KEY_PREFIX}${userId}`;

export const savePendingVehicleSetup = async (userId, pending = true) => {
  if (!userId) return;
  try {
    if (!pending) {
      await AsyncStorage.removeItem(getPendingVehicleSetupKey(userId));
      return;
    }
    await AsyncStorage.setItem(getPendingVehicleSetupKey(userId), 'true');
  } catch (error) {
    console.error('Failed to save pending vehicle setup flag:', error?.message || error);
  }
};

export const getPendingVehicleSetup = async userId => {
  if (!userId) return false;
  try {
    return (await AsyncStorage.getItem(getPendingVehicleSetupKey(userId))) === 'true';
  } catch (error) {
    return false;
  }
};

/*
|--------------------------------------------------------------------------
| CENTRALIZED SESSION CLEANUP
|--------------------------------------------------------------------------
| Single audited list of everything that belongs to an account/session.
| Non-sensitive global preferences (theme, language, notification prefs,
| onboarding-seen flag, device guest UUID) are intentionally NOT listed.
*/

const SESSION_EXACT_KEYS = [
  TOKEN_KEY,
  USER_KEY,
  GUEST_DIAGNOSIS_COUNT_KEY,
  '@vehicare_guest_vehicle',
  '@vehicare_guest_mode',
  // Account-specific caches/drafts written by individual screens & contexts.
  '@vehicare_ai_usage_v2', // AIUsageContext: per-account consultation counters
  '@vehicare_last_location', // useRepairShops: last selected search location
  '@vehicare_vehicles', // MyVehiclesScreen vehicle cache
  '@vehicare_plan', // MyVehiclesScreen plan cache
  '@vehicare_problem_reports', // ReportProblemScreen local submissions
  '@vehicare_feedback_submissions', // SendFeedbackScreen local submissions
  '@vehicare_notification_preferences', // notificationService local copy
  '@vehicare_completed_maintenance', // legacy un-scoped completion cache
];

const SESSION_KEY_PREFIXES = [
  '@vehicare_active_chats_',
  '@vehicare_history_',
  '@vehicare_recent_activities_',
  '@vehicare_vehicles_',
  '@vehicare_completed_maintenance_',
  '@vehicare_cached_health_',
  '@vehicare_cached_factors_',
  PENDING_VEHICLE_SETUP_KEY_PREFIX,
];

// Intentionally preserved across logout (non-sensitive, device-level):
//   @vehicare_theme, @vehicare_theme_<uid>, @vehicare_language,
//   @vehicare_onboarding_completed, @vehicare_guest_uuid

export const clearSessionData = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const scopedKeys = (allKeys || []).filter(key =>
      SESSION_KEY_PREFIXES.some(prefix => String(key).startsWith(prefix)),
    );
    const keysToRemove = [...new Set([...SESSION_EXACT_KEYS, ...scopedKeys])];

    if (typeof AsyncStorage.multiRemove === 'function') {
      await AsyncStorage.multiRemove(keysToRemove);
    } else {
      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));
    }
  } catch (error) {
    console.error('Failed to clear session data:', error?.message || error);
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  clearSessionData,
  savePendingVehicleSetup,
  getPendingVehicleSetup,
  saveToken,
  getToken,
  removeToken,

  saveUser,
  getUser,
  removeUser,

  saveAuthData,
  clearAuthData,

  getGuestDiagnosisCount,
  saveGuestDiagnosisCount,
  incrementGuestDiagnosisCount,
  clearGuestDiagnosisCount,
  saveGuestVehicle,
  getGuestVehicle,
  clearGuestVehicle,
  saveOnboardingCompleted,
  getOnboardingCompleted,
  saveGuestMode,
  getGuestMode,
  clearGuestMode,

  getHistoryStorageKey,
  getRecentActivitiesStorageKey,
  getVehiclesStorageKey,
  getActiveChatStorageKey,
  loadActiveChatSessions,
  saveActiveChatSessions,
  clearActiveChatSessions,
};