import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MAP_CONFIG from '../config/mapConfig';
import { fetchNearbyRepairShops, filterShopsByCategory } from '../services/repairShopApi';
import LocationService, { getAccuracyStatus } from '../services/locationService';
import { BRAND } from '../theme/colors';

const SAVED_LOCATION_STORAGE_KEY = '@vehicare_last_location';

/**
 * Common Philippines City Presets for Manual Map Exploration
 */
export const LOCATION_PRESETS = [
  { id: 'mindoro_oriental', name: 'Calapan, Oriental Mindoro', latitude: 13.4117, longitude: 121.1803, accuracy: 15 },
  { id: 'mindoro_socorro', name: 'Socorro, Oriental Mindoro', latitude: 13.0642, longitude: 121.4089, accuracy: 15 },
  { id: 'mindoro_occidental', name: 'Mamburao, Occidental Mindoro', latitude: 13.2238, longitude: 120.5961, accuracy: 15 },
  { id: 'quezon_city', name: 'Quezon City, Metro Manila', latitude: 14.6500, longitude: 121.0300, accuracy: 15 },
  { id: 'manila', name: 'City of Manila', latitude: 14.5995, longitude: 120.9842, accuracy: 15 },
  { id: 'pasig', name: 'Pasig City', latitude: 14.5764, longitude: 121.0851, accuracy: 15 },
  { id: 'cebu', name: 'Cebu City', latitude: 10.3157, longitude: 123.8854, accuracy: 15 },
  { id: 'davao', name: 'Davao City', latitude: 7.1907, longitude: 125.4553, accuracy: 15 },
];

/**
 * Save user's selected location to AsyncStorage
 */
export const saveLastLocation = async (locationObj) => {
  try {
    if (!locationObj || locationObj.latitude === undefined || locationObj.longitude === undefined) return;
    const lat = Number(locationObj.latitude);
    const lng = Number(locationObj.longitude);
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    const payload = {
      latitude: lat,
      longitude: lng,
      name: locationObj.name || 'Selected Location',
      accuracy: locationObj.accuracy || 15,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(SAVED_LOCATION_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[useRepairShops] Error saving last location:', err);
  }
};

/**
 * Retrieve & validate saved location from AsyncStorage
 */
export const getSavedLastLocation = async () => {
  try {
    const raw = await AsyncStorage.getItem(SAVED_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number' &&
      !isNaN(parsed.latitude) &&
      !isNaN(parsed.longitude) &&
      parsed.latitude >= -90 && parsed.latitude <= 90 &&
      parsed.longitude >= -180 && parsed.longitude <= 180
    ) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn('[useRepairShops] Error reading saved location:', err);
    return null;
  }
};

/**
 * useRepairShops Hook
 * Manages physical device GPS location (userLocation) vs user's chosen search location (selectedLocation).
 * Restores previously saved location from AsyncStorage on mount so users don't need to re-select.
 */
export const useRepairShops = (vehicleTypeInput = 'car') => {
  const vehicleType = typeof vehicleTypeInput === 'object' && vehicleTypeInput !== null
    ? (vehicleTypeInput.name || vehicleTypeInput.type || 'car')
    : String(vehicleTypeInput || 'car');

  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [acquiringLocation, setAcquiringLocation] = useState(false);
  const [permissionState, setPermissionState] = useState('CHECKING');
  const [error, setError] = useState(null);

  // Physical hardware GPS location of the device
  const [deviceGpsLocation, setDeviceGpsLocation] = useState(null);

  // Active selected location used for searching nearby repair shops & placing pin
  const [selectedLocation, setSelectedLocationState] = useState(null);

  const [selectedShopId, setSelectedShopId] = useState(null);
  const [activeShopModal, setActiveShopModal] = useState(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Acquire fresh high-accuracy hardware GPS location fix
  const acquireFreshGps = useCallback(async () => {
    setAcquiringLocation(true);
    setError(null);

    try {
      const fix = await LocationService.getFreshHighAccuracyLocation({
        maxAgeMs: 30000,
        targetAccuracyMeters: 25,
        acquisitionTimeoutMs: 10000,
      });

      const gpsObj = {
        latitude: fix.latitude,
        longitude: fix.longitude,
        accuracy: fix.accuracy,
        accuracyStatus: fix.accuracyStatus,
        accuracyLabel: fix.accuracyLabel,
        accuracyShortLabel: fix.accuracyShortLabel || fix.accuracyLabel,
        accuracyColor: fix.accuracyColor,
        isGoodAccuracy: fix.isGoodAccuracy,
        isPrecise: fix.isPrecise,
        name: fix.name || 'My Current Location',
        hasPermission: true,
        isManual: false,
      };

      setDeviceGpsLocation(gpsObj);
      setPermissionState(fix.isPrecise ? 'GRANTED_PRECISE' : 'GRANTED_APPROXIMATE');
      return gpsObj;
    } catch (err) {
      console.warn('[useRepairShops] GPS acquisition error:', err?.message || err);
      if (err?.message === 'PERMISSION_DENIED') {
        setPermissionState('DENIED');
      } else {
        setError('Unable to acquire a fresh GPS location fix. Please ensure location services are enabled.');
      }
      return null;
    } finally {
      setAcquiringLocation(false);
    }
  }, []);

  // Update selected location state & persist to AsyncStorage
  const setSelectedLocation = useCallback((locationObj, shouldSave = true) => {
    if (!locationObj || locationObj.latitude === undefined || locationObj.longitude === undefined) return;

    const lat = Number(locationObj.latitude);
    const lng = Number(locationObj.longitude);
    const accInfo = getAccuracyStatus(locationObj.accuracy || 15);

    const formattedObj = {
      latitude: lat,
      longitude: lng,
      accuracy: locationObj.accuracy || 15,
      accuracyStatus: accInfo.status,
      accuracyLabel: accInfo.label,
      accuracyShortLabel: accInfo.shortLabel || accInfo.label,
      accuracyColor: accInfo.color,
      isGoodAccuracy: true,
      isPrecise: true,
      name: locationObj.name || 'Selected Location',
      hasPermission: locationObj.hasPermission ?? false,
      isManual: locationObj.isManual ?? true,
      isSaved: locationObj.isSaved ?? false,
    };

    setSelectedLocationState(formattedObj);

    if (shouldSave) {
      saveLastLocation(formattedObj);
    }
  }, []);

  // Action: "Use My Current Location" button press
  const useCurrentGpsLocation = useCallback(async () => {
    const gpsFix = await acquireFreshGps();
    if (gpsFix) {
      setSelectedLocation(gpsFix, true);
      return gpsFix;
    } else {
      // Fallback if GPS hardware fails
      const fallbackPreset = LOCATION_PRESETS[1];
      setSelectedLocation(fallbackPreset, true);
      return fallbackPreset;
    }
  }, [acquireFreshGps, setSelectedLocation]);

  // Request location permission explicitly
  const requestPermissionAndAcquire = async () => {
    try {
      const perm = await LocationService.requestPermissions();
      if (perm.isGranted) {
        setPermissionState(perm.isPrecise ? 'GRANTED_PRECISE' : 'GRANTED_APPROXIMATE');
        const gpsObj = await useCurrentGpsLocation();
        return gpsObj;
      } else {
        setPermissionState('DENIED');
        if (!selectedLocation) {
          setSelectedLocation(LOCATION_PRESETS[1], false);
        }
        return LOCATION_PRESETS[1];
      }
    } catch (err) {
      console.warn('[useRepairShops] Request permission error:', err);
      setPermissionState('DENIED');
      if (!selectedLocation) {
        setSelectedLocation(LOCATION_PRESETS[1], false);
      }
      return LOCATION_PRESETS[1];
    }
  };

  const [rawShops, setRawShops] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Fetch nearby repair shops from backend API for active selectedLocation
  const loadShops = useCallback(async (isRefresh = false) => {
    if (!selectedLocation || selectedLocation.latitude === undefined || selectedLocation.longitude === undefined) {
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchNearbyRepairShops({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        radius: MAP_CONFIG.defaultRadiusMeters,
        vehicleType: 'all', // Fetch all nearby shops, then filter client side safely
      });

      const list = Array.isArray(data) ? data : [];
      setRawShops(list);
      const filtered = filterShopsByCategory(list, categoryFilter);
      setShops(filtered);

      if (filtered.length > 0) {
        setSelectedShopId(filtered[0].id);
      }
    } catch (err) {
      console.warn('[useRepairShops] API load error:', err);
      setError('Unable to load nearby repair shops. Please ensure your backend server and internet connection are active.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedLocation, categoryFilter]);

  // Re-filter when categoryFilter or rawShops change
  useEffect(() => {
    const filtered = filterShopsByCategory(rawShops, categoryFilter);
    setShops(filtered);
    if (filtered.length > 0 && !filtered.some(s => s.id === selectedShopId)) {
      setSelectedShopId(filtered[0].id);
    }
  }, [categoryFilter, rawShops]);

  // Initial load priority: 1) Saved location -> 2) Current GPS -> 3) Default Preset
  useEffect(() => {
    let cancelled = false;

    const initLocation = async () => {
      // Priority 1: Check for previously saved location in AsyncStorage
      const saved = await getSavedLastLocation();
      if (cancelled) return;

      if (saved) {
        setSelectedLocationState({
          latitude: saved.latitude,
          longitude: saved.longitude,
          name: saved.name || 'Saved Location',
          accuracy: saved.accuracy || 15,
          accuracyStatus: 'HIGH',
          accuracyLabel: 'Saved Location',
          accuracyShortLabel: 'Saved',
          accuracyColor: BRAND,
          isGoodAccuracy: true,
          isPrecise: true,
          hasPermission: false,
          isManual: true,
          isSaved: true,
        });

        // Still check background GPS to render physical device marker if permitted
        LocationService.checkPermissionState().then(async (perm) => {
          if (cancelled) return;
          if (perm.isGranted) {
            acquireFreshGps();
          }
        });
        return;
      }

      // Priority 2: Request/check GPS hardware location if no saved location
      const perm = await LocationService.checkPermissionState();
      if (cancelled) return;

      if (perm.isGranted) {
        setPermissionState(perm.isPrecise ? 'GRANTED_PRECISE' : 'GRANTED_APPROXIMATE');
        const gpsFix = await acquireFreshGps();
        if (cancelled) return;
        if (gpsFix) {
          setSelectedLocationState(gpsFix);
        } else {
          // Priority 3: Fallback preset
          setSelectedLocationState(LOCATION_PRESETS[1]);
        }
      } else {
        setPermissionState(perm.state === 'NOT_REQUESTED' ? 'NOT_REQUESTED' : 'DENIED');
        setSelectedLocationState(LOCATION_PRESETS[1]);
        setLoading(false);
      }
    };

    initLocation();

    return () => {
      cancelled = true;
    };
  }, [vehicleType, acquireFreshGps]);

  // Fetch shops whenever selectedLocation changes
  useEffect(() => {
    if (selectedLocation && selectedLocation.latitude !== undefined && selectedLocation.longitude !== undefined) {
      loadShops();
    }
  }, [selectedLocation?.latitude, selectedLocation?.longitude, loadShops]);

  const selectShop = (shop) => {
    if (!shop) return;
    setSelectedShopId(shop.id);
    setActiveShopModal(shop);
  };

  return {
    shops,
    loading,
    refreshing,
    acquiringLocation,
    permissionState,
    error,
    userLocation: selectedLocation, // Backwards compatibility for screens expecting active search location
    deviceGpsLocation,
    selectedLocation,
    setSelectedLocation,
    useCurrentGpsLocation,
    selectedShopId,
    setSelectedShopId,
    activeShopModal,
    setActiveShopModal,
    isMapExpanded,
    setIsMapExpanded,
    selectShop,
    setManualLocation: (loc) => setSelectedLocation(loc, true),
    requestPermissionAndAcquire,
    acquireFreshLocation: useCurrentGpsLocation,
    categoryFilter,
    setCategoryFilter,
    reload: loadShops,
  };
};

export default useRepairShops;
