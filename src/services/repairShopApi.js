import apiClient from '../api/apiClient';

/**
 * Fetch nearby repair shops from VehiCare Laravel API boundary.
 *
 * @param {Object} params
 * @param {number} [params.latitude]
 * @param {number} [params.longitude]
 * @param {number} [params.radius]
 * @param {string} [params.vehicleType]
 * @returns {Promise<Array>} Array of normalized repair shop DTOs
 */
export const fetchNearbyRepairShops = async ({
  latitude = 14.6500,
  longitude = 121.0300,
  radius = 5000,
  vehicleType = 'car',
} = {}) => {
  const vehicleTypeStr = typeof vehicleType === 'object' && vehicleType !== null
    ? (vehicleType.name || vehicleType.type || 'car')
    : String(vehicleType || 'car');

  try {
    const response = await apiClient.get('/repair-shops/nearby', {
      params: {
        latitude,
        longitude,
        radius,
        vehicle_type: vehicleTypeStr,
      },
    });

    if (response?.data?.status === 'success' && Array.isArray(response.data.data)) {
      return response.data.data;
    }

    return [];
  } catch (error) {
    console.warn('[repairShopApi] Error fetching nearby repair shops:', error?.message || error);
    throw error;
  }
};
