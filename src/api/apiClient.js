
import axios from 'axios';
import { getGuestUuid, getToken } from '../services/storageService';

const getApiBaseUrl = () =>
  'https://vehicare-backend-n3v4.onrender.com/api';

const apiBaseUrl = getApiBaseUrl();

console.info('[apiClient] ========================================');
console.info('[apiClient] Cloud API baseURL:', apiBaseUrl);
console.info('[apiClient] ========================================');

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 60000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

let unauthorizedHandler = null;
let isHandlingUnauthorized = false;

export const setUnauthorizedHandler = handler => {
  unauthorizedHandler = handler;
};

export const clearUnauthorizedHandler = () => {
  unauthorizedHandler = null;
};

export const setAuthToken = token => {
  const normalizedToken = token && String(token).trim() ? token : null;

  if (normalizedToken) {
    apiClient.defaults.headers.common.Authorization =
      `Bearer ${normalizedToken}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
};

apiClient.interceptors.request.use(
  async config => {
    config.baseURL = getApiBaseUrl();

    const hasAuthTokenSnapshot = Object.prototype.hasOwnProperty.call(
      config,
      'authTokenSnapshot',
    );

    const token = hasAuthTokenSnapshot
      ? config.authTokenSnapshot
      : await getToken();

    if (hasAuthTokenSnapshot) {
      delete config.authTokenSnapshot;
    }

    const guestUuid = await getGuestUuid();
    const hasToken = Boolean(token && String(token).trim());

    config.headers = {
      ...(config.headers || {}),
      'X-Guest-UUID': guestUuid,
    };

    if (hasToken) {
      if (!hasAuthTokenSnapshot) {
        setAuthToken(token);
      }
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      if (hasAuthTokenSnapshot) {
        delete config.headers.Authorization;
      } else {
        setAuthToken(null);
      }
    }

    const baseURL = config?.baseURL || apiBaseUrl;
    const requestPath = config?.url || '';
    const fullURL = `${baseURL}${requestPath}`;

    console.info('[apiClient] Preparing request', {
      method: config?.method?.toUpperCase() || 'GET',
      baseURL,
      url: requestPath,
      fullURL,
      hasAuthToken: hasToken,
      authHeaderPresent: hasToken,
      hasGuestUuid: Boolean(guestUuid),
    });

    return config;
  },
  error => {
    console.error('[apiClient] Request configuration error:', error);
    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  response => {
    if (!response) {
      throw new Error('No response from server');
    }

    const baseURL = response?.config?.baseURL || apiBaseUrl;
    const requestPath = response?.config?.url || '';
    const fullURL = `${baseURL}${requestPath}`;

    console.info('[apiClient] Response received', {
      status: response.status,
      method: response?.config?.method?.toUpperCase() || 'GET',
      fullURL,
    });

    return response;
  },
  error => {
    const message = error?.message || String(error);
    const status = error?.response?.status;
    const responseData = error?.response?.data;

    const baseURL = error?.config?.baseURL || apiBaseUrl;
    const requestPath = error?.config?.url || '';
    const fullURL = `${baseURL}${requestPath}`;

    const isValidationError = status === 422;
    const isUnauthenticated = status === 401;
    const isNetworkError =
      error?.code === 'ERR_NETWORK' ||
      error?.code === 'ECONNABORTED' ||
      !error?.response;

    if (isUnauthenticated) {
      console.info('[apiClient] Unauthenticated request:', {
        method: error?.config?.method?.toUpperCase() || 'GET',
        fullURL,
        status,
      });

      const normalizedPath = String(requestPath).toLowerCase();
      const isAuthAttempt =
        normalizedPath.includes('/login') ||
        normalizedPath.includes('/register') ||
        normalizedPath.includes('/forgot-password') ||
        normalizedPath.includes('/reset-password') ||
        normalizedPath.includes('/otp');

      if (
        !isAuthAttempt &&
        typeof unauthorizedHandler === 'function' &&
        !isHandlingUnauthorized
      ) {
        isHandlingUnauthorized = true;

        try {
          unauthorizedHandler();
        } finally {
          setTimeout(() => {
            isHandlingUnauthorized = false;
          }, 3000);
        }
      }
    } else if (isNetworkError) {
      console.warn('[apiClient] Network / Connection unavailable:', {
        method: error?.config?.method?.toUpperCase() || 'GET',
        fullURL,
        code: error?.code || 'ERR_NETWORK',
        message,
      });
    } else if (
      status === 403 &&
      (responseData?.reason === 'ai_limit_reached' ||
        responseData?.error === 'ai_limit_reached')
    ) {
      console.info('[apiClient] AI Consultation Quota Limit reached (403):', {
        status,
        plan: responseData?.plan,
        limit: responseData?.limit,
        used: responseData?.used,
        remaining: responseData?.remaining,
      });
    } else if (status === 404) {
      // 404 Not Found is expected during account/resource lookups (e.g. forgot password, user check)
      // Log as info to avoid triggering noisy red error banners or cluttering console
      console.info('[apiClient] Resource not found (404):', {
        method: error?.config?.method?.toUpperCase() || 'GET',
        url: requestPath,
        fullURL,
        message: responseData?.message || message,
      });
    } else if (!isValidationError) {
      console.error('[apiClient] API Client Error:', message);

      console.error('[apiClient] Request details:', {
        method: error?.config?.method?.toUpperCase() || 'GET',
        baseURL,
        url: requestPath,
        fullURL,
        status,
      });

      if (responseData) {
        console.error(
          '[apiClient] API Response:',
          JSON.stringify(responseData, null, 2),
        );
      }

      if (error?.code) {
        console.error('[apiClient] Error Code:', error.code);
      }
    } else {
      console.info('[apiClient] API Client Validation Error:', {
        status,
        method: error?.config?.method?.toUpperCase() || 'GET',
        fullURL,
        responseData,
      });
    }

    return Promise.reject(error);
  },
);

export default apiClient;
