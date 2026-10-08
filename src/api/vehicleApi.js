import { getToken } from '../services/storageService';
import apiClient from './apiClient';

/*
|--------------------------------------------------------------------------
| AUTH CONFIG
|--------------------------------------------------------------------------
*/

const getStoredToken =
  async () => {
    const token =
      await getToken();

    return token &&
      String(token).trim()
      ? token
      : null;
  };

const buildAuthConfig =
  async () => {
    const token =
      await getStoredToken();

    if (!token) {
      return {};
    }

    return {
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    };
  };

/*
|--------------------------------------------------------------------------
| RESPONSE NORMALIZER
|--------------------------------------------------------------------------
*/

const normalizeApiResponse =
  response => {
    if (
      !response ||
      !response.data
    ) {
      return null;
    }

    const payload =
      response.data;

    if (Array.isArray(payload)) {
      return payload;
    }

    if (
      Array.isArray(
        payload.data,
      )
    ) {
      return payload.data;
    }

    if (
      Array.isArray(
        payload.data?.data,
      )
    ) {
      return payload.data.data;
    }

    return null;
  };

/*
|--------------------------------------------------------------------------
| VEHICLE API
|--------------------------------------------------------------------------
*/

const vehicleApi = {
  /*
  |--------------------------------------------------------------------------
  | VEHICLE TYPES
  |--------------------------------------------------------------------------
  */

  getVehicleTypes:
    async () => {
      try {
        const response =
          await apiClient.get(
            '/vehicle-types',
          );

        const normalized =
          normalizeApiResponse(
            response,
          );

        return normalized || [];
      } catch (error) {
        console.error(
          'API Error in getVehicleTypes:',
          error,
        );

        throw error;
      }
    },

  /*
  |--------------------------------------------------------------------------
  | BRANDS
  |--------------------------------------------------------------------------
  */

  getBrands:
    async vehicleTypeId => {
      try {
        if (!vehicleTypeId) {
          throw new Error(
            'vehicleTypeId is required',
          );
        }

        const response =
          await apiClient.get(
            `/vehicle-types/${vehicleTypeId}/brands`,
          );

        const normalized =
          normalizeApiResponse(
            response,
          );

        return normalized || [];
      } catch (error) {
        console.error(
          'API Error in getBrands:',
          error,
        );

        throw error;
      }
    },

  /*
  |--------------------------------------------------------------------------
  | MODELS
  |--------------------------------------------------------------------------
  */

  getModels:
    async brandId => {
      try {
        if (!brandId) {
          throw new Error(
            'brandId is required',
          );
        }

        const response =
          await apiClient.get(
            `/brands/${brandId}/models`,
          );

        const normalized =
          normalizeApiResponse(
            response,
          );

        return normalized || [];
      } catch (error) {
        console.error(
          'API Error in getModels:',
          error,
        );

        throw error;
      }
    },

  /*
  |--------------------------------------------------------------------------
  | YEARS (VALIDATED & STANDARD)
  |--------------------------------------------------------------------------
  */

  getYears:
    async modelId => {
      try {
        if (!modelId) {
          throw new Error(
            'modelId is required',
          );
        }

        const response =
          await apiClient.get(
            `/models/${modelId}/years`,
          );

        const normalized =
          normalizeApiResponse(
            response,
          );

        return normalized || [];
      } catch (error) {
        console.error(
          'API Error in getYears:',
          error,
        );

        throw error;
      }
    },

  getValidatedYears:
    async modelId => {
      try {
        if (!modelId) {
          return [];
        }

        const response =
          await apiClient.get(
            `/models/${modelId}/validated-years`,
          );

        const normalized =
          normalizeApiResponse(
            response,
          );

        return Array.isArray(normalized) && normalized.length > 0
          ? normalized
          : await vehicleApi.getYears(modelId);
      } catch (error) {
        console.warn('Fallback to standard getYears due to error:', error?.message);
        return await vehicleApi.getYears(modelId);
      }
    },

  validateVehicle:
    async payload => {
      try {
        const response =
          await apiClient.post(
            '/vehicles/validate',
            payload,
          );

        return response?.data?.validation || {
          is_valid: true,
          status: 'validation_unavailable',
          reason: 'Vehicle validation unavailable.',
        };
      } catch (error) {
        console.warn('Vehicle validation API call failed:', error?.message);
        return {
          is_valid: true,
          status: 'validation_unavailable',
          reason: 'Vehicle validation unavailable.',
        };
      }
    },

  /*
  |--------------------------------------------------------------------------
  | MY VEHICLES
  |--------------------------------------------------------------------------
  */

  getMyVehicles:
    async () => {
      try {
        const config =
          await buildAuthConfig();

        const response =
          await apiClient.get(
            '/my-vehicles',
            config,
          );

        const normalized =
          normalizeApiResponse(
            response,
          );

        return normalized || [];
      } catch (error) {
        console.error(
          'API Error in getMyVehicles:',
          error,
        );

        throw error;
      }
    },

  /*
  |--------------------------------------------------------------------------
  | SET ACTIVE VEHICLE
  |--------------------------------------------------------------------------
  */

  setActiveVehicle:
    async vehicleId => {
      try {
        if (!vehicleId) {
          throw new Error(
            'vehicleId is required',
          );
        }

        const config =
          await buildAuthConfig();

        const response =
          await apiClient.post(
            '/my-vehicles/active',
            {
              vehicle_id:
                vehicleId,
            },
            config,
          );

        return (
          response?.data?.data ||
          response?.data
        );
      } catch (error) {
        console.error(
          'API Error in setActiveVehicle:',
          error,
        );

        throw error;
      }
    },

  /*
  |--------------------------------------------------------------------------
  | SAVE VEHICLE
  |--------------------------------------------------------------------------
  */

  saveVehicle:
    async vehicleData => {
      try {
        if (!vehicleData) {
          throw new Error(
            'vehicleData is required',
          );
        }

        const config =
          await buildAuthConfig();

        const response =
          await apiClient.post(
            '/vehicles',
            vehicleData,
            config,
          );

        if (
          !response ||
          !response.data
        ) {
          throw new Error(
            'Invalid response from server',
          );
        }

        return (
          response.data.data ||
          response.data
        );
      } catch (error) {
        console.error(
          'API Error in saveVehicle:',
          error,
        );

        throw error;
      }
    },

  /*
  |--------------------------------------------------------------------------
  | GET VEHICLE
  |--------------------------------------------------------------------------
  */

  getVehicleById:
    async vehicleId => {
      try {
        if (!vehicleId) {
          throw new Error(
            'vehicleId is required',
          );
        }

        const config =
          await buildAuthConfig();

        const response =
          await apiClient.get(
            `/vehicles/${vehicleId}`,
            config,
          );

        return (
          response?.data?.data ||
          response?.data
        );
      } catch (error) {
        console.error(
          'API Error in getVehicleById:',
          error,
        );

        throw error;
      }
    },

  /*
  |--------------------------------------------------------------------------
  | UPDATE VEHICLE
  |--------------------------------------------------------------------------
  */

  updateVehicle:
    async (
      vehicleId,
      vehicleData,
    ) => {
      try {
        if (!vehicleId) {
          throw new Error(
            'vehicleId is required',
          );
        }

        if (!vehicleData) {
          throw new Error(
            'vehicleData is required',
          );
        }

        const config =
          await buildAuthConfig();

        const response =
          await apiClient.put(
            `/vehicles/${vehicleId}`,
            vehicleData,
            config,
          );

        return (
          response?.data?.data ||
          response?.data
        );
      } catch (error) {
        console.error(
          'API Error in updateVehicle:',
          error,
        );

        throw error;
      }
    },

  /*
  |--------------------------------------------------------------------------
  | VEHICLE CORRECTION
  |--------------------------------------------------------------------------
  */

  submitVehicleCorrectionRequest:
    async requestData => {
      try {
        if (!requestData) {
          throw new Error(
            'requestData is required',
          );
        }

        const config =
          await buildAuthConfig();

        const response =
          await apiClient.post(
            '/vehicle-correction-requests',
            requestData,
            config,
          );

        return (
          response?.data?.data ||
          response?.data
        );
      } catch (error) {
        if (error?.response?.status !== 422) {
          console.error(
            'API Error in submitVehicleCorrectionRequest:',
            error,
          );
        }

        throw error;
      }
    },

  /*
  |--------------------------------------------------------------------------
  | GET CORRECTION REQUEST
  |--------------------------------------------------------------------------
  */

  getVehicleCorrectionRequestForVehicle:
    async vehicleId => {
      try {
        if (!vehicleId) {
          throw new Error(
            'vehicleId is required',
          );
        }

        const config =
          await buildAuthConfig();

        const response =
          await apiClient.get(
            `/my-vehicles/${vehicleId}/correction-request`,
            config,
          );

        const payload = response?.data?.data;
        return (payload && payload.id) ? payload : null;
      } catch (error) {
        console.error(
          'API Error in getVehicleCorrectionRequestForVehicle:',
          error,
        );

        return null;
      }
    },

  /*
  |--------------------------------------------------------------------------
  | DELETE VEHICLE
  |--------------------------------------------------------------------------
  */

  deleteVehicle:
    async vehicleId => {
      try {
        if (!vehicleId) {
          throw new Error(
            'vehicleId is required',
          );
        }

        const config =
          await buildAuthConfig();

        const response =
          await apiClient.delete(
            `/vehicles/${vehicleId}`,
            config,
          );

        return response.data;
      } catch (error) {
        console.error(
          'API Error in deleteVehicle:',
          error,
        );

        throw error;
      }
    },

  /*
  |--------------------------------------------------------------------------
  | UNARCHIVE VEHICLE
  |--------------------------------------------------------------------------
  */

  unarchiveVehicle:
    async vehicleId => {
      try {
        if (!vehicleId) {
          throw new Error(
            'vehicleId is required',
          );
        }

        const config =
          await buildAuthConfig();

        const response =
          await apiClient.post(
            `/vehicles/${vehicleId}/unarchive`,
            {},
            config,
          );

        return response.data;
      } catch (error) {
        console.error(
          'API Error in unarchiveVehicle:',
          error,
        );

        throw error;
      }
    },

  /*
  |--------------------------------------------------------------------------
  | DIAGNOSTICS & REPAIR SHOPS
  |--------------------------------------------------------------------------
  */

  getDiagnosticsHistory: async () => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.get('/diagnostics', config);
      const data = response?.data?.data || response?.data;
      return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.warn('API Error in getDiagnosticsHistory:', error?.message);
      return [];
    }
  },

  submitDiagnostic: async payload => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.post('/diagnostics', payload, {
        ...config,
        headers: {
          ...(config.headers || {}),
          ...(typeof FormData !== 'undefined' && payload instanceof FormData
            ? { 'Content-Type': 'multipart/form-data' }
            : {}),
        },
      });
      return response?.data?.data || response?.data;
    } catch (error) {
      if (error?.response?.status !== 422) {
        console.warn('API Error in submitDiagnostic:', error?.message);
      }
      throw error;
    }
  },

  getNearbyShops: async params => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.get('/repair-shops/nearby', {
        ...config,
        params,
      });
      return response?.data?.data || response?.data || [];
    } catch (error) {
      console.warn('API Error in getNearbyShops:', error?.message);
      return [];
    }
  },

  createServiceReferral: async payload => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.post('/service-referrals', payload, config);
      return response?.data?.data || response?.data;
    } catch (error) {
      console.warn('API Error in createServiceReferral:', error?.message);
      throw error;
    }
  },

  /*
  |--------------------------------------------------------------------------
  | HISTORY & CHAT SESSIONS API
  |--------------------------------------------------------------------------
  */

  getHistory: async (params = {}) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.get('/history', {
        ...config,
        params,
      });
      return response?.data || { data: [], meta: {} };
    } catch (error) {
      console.warn('API Error in getHistory:', error?.message);
      return { data: [], meta: {} };
    }
  },

  getHistoryDetails: async (type, id) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.get(`/history/${type}/${id}`, config);
      return response?.data?.data || response?.data;
    } catch (error) {
      console.warn(`API Error in getHistoryDetails (${type}/${id}):`, error?.message);
      throw error;
    }
  },

  getDiagnosticById: async (id) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.get(`/diagnostics/${id}`, config);
      return response?.data?.data || response?.data;
    } catch (error) {
      console.warn('API Error in getDiagnosticById:', error?.message);
      throw error;
    }
  },

  getChatSessions: async (params = {}) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.get('/chat-sessions', {
        ...config,
        params,
      });
      return response?.data?.data || response?.data || [];
    } catch (error) {
      console.warn('API Error in getChatSessions:', error?.message);
      return [];
    }
  },

  getChatSessionById: async (id) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.get(`/chat-sessions/${id}`, config);
      return response?.data;
    } catch (error) {
      console.warn('API Error in getChatSessionById:', error?.message);
      return null;
    }
  },

  syncChatSession: async (sessionPayload) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.post('/chat-sessions', sessionPayload, config);
      return response?.data;
    } catch (error) {
      console.warn('API Error in syncChatSession:', error?.message);
      return null;
    }
  },

  completeChatSession: async (id) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.post(`/chat-sessions/${id}/complete`, {}, config);
      return response?.data;
    } catch (error) {
      console.warn('API Error in completeChatSession:', error?.message);
      return null;
    }
  },

  getMaintenanceRecords: async (params = {}) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.get('/maintenance', { ...config, params });
      return response?.data?.data || response?.data || [];
    } catch (error) {
      console.warn('API Error in getMaintenanceRecords:', error?.message);
      return [];
    }
  },

  createMaintenanceRecord: async (payload) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.post('/maintenance', payload, config);
      return response?.data?.data || response?.data;
    } catch (error) {
      console.warn('API Error in createMaintenanceRecord:', error?.message);
      throw error;
    }
  },

  updateMaintenanceRecord: async (id, payload) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.put(`/maintenance/${id}`, payload, config);
      return response?.data?.data || response?.data;
    } catch (error) {
      console.warn('API Error in updateMaintenanceRecord:', error?.message);
      throw error;
    }
  },

  deleteMaintenanceRecord: async (id) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.delete(`/maintenance/${id}`, config);
      return response?.data;
    } catch (error) {
      console.warn('API Error in deleteMaintenanceRecord:', error?.message);
      throw error;
    }
  },

  getRepairRecords: async (params = {}) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.get('/repairs', { ...config, params });
      return response?.data?.data || response?.data || [];
    } catch (error) {
      console.warn('API Error in getRepairRecords:', error?.message);
      return [];
    }
  },

  createRepairRecord: async (payload) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.post('/repairs', payload, config);
      return response?.data?.data || response?.data;
    } catch (error) {
      console.warn('API Error in createRepairRecord:', error?.message);
      throw error;
    }
  },

  updateRepairRecord: async (id, payload) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.put(`/repairs/${id}`, payload, config);
      return response?.data?.data || response?.data;
    } catch (error) {
      console.warn('API Error in updateRepairRecord:', error?.message);
      throw error;
    }
  },

  deleteRepairRecord: async (id) => {
    try {
      const config = await buildAuthConfig();
      const response = await apiClient.delete(`/repairs/${id}`, config);
      return response?.data;
    } catch (error) {
      console.warn('API Error in deleteRepairRecord:', error?.message);
      throw error;
    }
  },
};

export { vehicleApi };
export default vehicleApi;