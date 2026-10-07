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
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
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
  getGuestUuid,

  getHistoryStorageKey,
  getRecentActivitiesStorageKey,
  getVehiclesStorageKey,
  getActiveChatStorageKey,
  loadActiveChatSessions,
  saveActiveChatSessions,
  clearActiveChatSessions,
};