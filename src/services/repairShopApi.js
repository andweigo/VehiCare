import apiClient from '../api/apiClient';

/**
 * Normalize shop category strings for comparison.
 * Maps synonyms like 'automotive', 'motor', 'bike', 'all_categories' to standard keys.
 */
export const normalizeShopCategory = (categoryInput) => {
  const cat = String(categoryInput || 'all').toLowerCase().trim();

  if (cat === 'all' || cat === 'all_categories' || cat === 'all vehicle types' || cat === 'all categories') {
    return 'all';
  }
  if (cat.includes('car') || cat.includes('auto') || cat.includes('sedan') || cat.includes('suv')) {
    return 'car';
  }
  if (cat.includes('motor') || cat.includes('scooter') || cat.includes('moped')) {
    return 'motorcycle';
  }
  if (cat.includes('bicyc') || cat.includes('bike')) {
    return 'bicycle';
  }

  return cat;
};

/**
 * Filter an array of repair shop objects by selected category.
 * Shops with category 'all' (All Vehicle Types) are included in EVERY category filter.
 * When selectedCategory is 'all', ALL active shops are included regardless of category.
 */
export const filterShopsByCategory = (shops = [], selectedCategory = 'all') => {
  if (!Array.isArray(shops)) return [];

  const targetCategory = normalizeShopCategory(selectedCategory);

  // If filter is 'all', return all shops
  if (targetCategory === 'all') {
    return shops;
  }

  return shops.filter(shop => {
    const shopCat = normalizeShopCategory(shop.category || shop.vehicle_type || shop.vehicle_category || 'all');

    // A shop marked 'all' services ALL vehicle types (car, motorcycle, bicycle, etc.)
    if (shopCat === 'all') {
      return true;
    }

    return shopCat === targetCategory;
  });
};

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
  vehicleType = 'all',
} = {}) => {
  const vehicleTypeStr = typeof vehicleType === 'object' && vehicleType !== null
    ? (vehicleType.name || vehicleType.type || 'all')
    : String(vehicleType || 'all');

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

export default {
  fetchNearbyRepairShops,
  filterShopsByCategory,
  normalizeShopCategory,
};
