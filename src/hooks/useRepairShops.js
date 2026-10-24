import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MAP_CONFIG from '../config/mapConfig';
import { fetchNearbyRepairShops, filterShopsByCategory } from '../services/repairShopApi';
import LocationService, { getAccuracyStatus } from '../services/locationService';
import { showPermissionModal } from '../services/permissionService';
import { BRAND } from '../theme/colors';

const SAVED_LOCATION_STORAGE_KEY = '@vehicare_last_location';

/**
 * Common Philippines City Presets for Manual Map Exploration
 */
export const LOCATION_PRESETS = [
  { id: 'mindoro_socorro', name: 'Socorro, Oriental Mindoro', latitude: 13.0642, longitude: 121.4089, isManual: true },
  { id: 'mindoro_pinamalayan', name: 'Pinamalayan, Oriental Mindoro', latitude: 13.0475, longitude: 121.4939, isManual: true },
  { id: 'mindoro_oriental', name: 'Oriental Mindoro (Province)', latitude: 13.1500, longitude: 121.3500, isManual: true },
];

export const DEFAULT_FALLBACK_LOCATION = LOCATION_PRESETS[0];

/**
 * Save user's selected location to AsyncStorage
 */
export const saveLastLocation = async (locationObj) => {
  try {
    if (!locationObj || locationObj.latitude === undefined || locationObj.latitude === null || locationObj.latitude === ''
      || locationObj.longitude === undefined || locationObj.longitude === null || locationObj.longitude === '') return;
    const lat = Number(locationObj.latitude);
    const lng = Number(locationObj.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

    const accuracy = Number(locationObj.accuracy);
    const payload = {
      latitude: lat,
      longitude: lng,
      name: locationObj.name || 'Selected Location',
      ...(locationObj.isManual !== true && Number.isFinite(accuracy) && accuracy > 0 ? { accuracy } : {}),
      isManual: locationObj.isManual === true,
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
      if (err?.message === 'PERMISSION_DENIED' || err?.message === 'PERMISSION_PERMANENTLY_DENIED') {
        setPermissionState(err?.message === 'PERMISSION_PERMANENTLY_DENIED' ? 'PERMANENTLY_DENIED' : 'DENIED');
      } else if (err?.message === 'LOCATION_SERVICES_DISABLED') {
        setError('Location services are turned off. Please enable device GPS.');
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
    if (!locationObj || locationObj.latitude === undefined || locationObj.latitude === null || locationObj.latitude === ''
      || locationObj.longitude === undefined || locationObj.longitude === null || locationObj.longitude === '') return;

    const lat = Number(locationObj.latitude);
    const lng = Number(locationObj.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
    const accuracy = Number(locationObj.accuracy);
    const hasMeasuredAccuracy = locationObj.isManual !== true && Number.isFinite(accuracy) && accuracy > 0;
    const accInfo = hasMeasuredAccuracy ? getAccuracyStatus(accuracy) : null;

    const formattedObj = {
      latitude: lat,
      longitude: lng,
      ...(hasMeasuredAccuracy ? {
        accuracy,
        accuracyStatus: accInfo.status,
        accuracyLabel: accInfo.label,
        accuracyShortLabel: accInfo.shortLabel || accInfo.label,
        accuracyColor: accInfo.color,
        isGoodAccuracy: accInfo.isGood,
        isPrecise: Boolean(locationObj.isPrecise),
      } : {}),
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
  const acquireCurrentGpsLocation = useCallback(async () => {
    const gpsFix = await acquireFreshGps();
    if (gpsFix) {
      setSelectedLocation(gpsFix, true);
      return gpsFix;
    }
    return null;
  }, [acquireFreshGps, setSelectedLocation]);

  // Request location permission explicitly
  const requestPermissionAndAcquire = async () => {
    try {
      const perm = await LocationService.requestPermissions();
      if (perm.isGranted) {
        setPermissionState(perm.isPrecise ? 'GRANTED_PRECISE' : 'GRANTED_APPROXIMATE');
        const gpsObj = await acquireCurrentGpsLocation();
        return gpsObj;
      } else {
        setPermissionState(perm.isPermanentlyDenied ? 'PERMANENTLY_DENIED' : 'DENIED');
        if (perm.isPermanentlyDenied) {
          showPermissionModal({
            badgeLabel: 'LOCATION ACCESS',
            icon: 'location-on',
            title: 'Location Access Needed',
            message: 'VehiCare needs device location to find repair shops near your position. Please enable location permission in App Settings.',
            primaryLabel: 'Open Settings',
            secondaryLabel: 'Cancel',
            onConfirm: () => LocationService.openSettings(),
          });
        }
        if (!selectedLocation) {
          setSelectedLocation(DEFAULT_FALLBACK_LOCATION, false);
        }
        return null;
      }
    } catch (err) {
      console.warn('[useRepairShops] Request permission error:', err);
      setPermissionState('DENIED');
      if (!selectedLocation) {
        setSelectedLocation(DEFAULT_FALLBACK_LOCATION, false);
      }
      return null;
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
        radius: selectedLocation.id === 'mindoro_oriental' ? 80000 : MAP_CONFIG.defaultRadiusMeters,
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
  }, [categoryFilter, rawShops, selectedShopId]);

  // Initial load priority: 1) Saved location -> 2) existing GPS permission -> 3) city preset.
  // Ask for location permission only after the user activates a location action.
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
          setSelectedLocationState(DEFAULT_FALLBACK_LOCATION);
        }
      } else {
        setPermissionState(perm.state === 'PERMANENTLY_DENIED'
          ? 'PERMANENTLY_DENIED'
          : perm.state === 'NOT_REQUESTED' ? 'NOT_REQUESTED' : 'DENIED');
        setSelectedLocationState(DEFAULT_FALLBACK_LOCATION);
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
    loadShops();
  }, [loadShops]);

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
    acquireCurrentGpsLocation,
    selectedShopId,
    setSelectedShopId,
    activeShopModal,
    setActiveShopModal,
    isMapExpanded,
    setIsMapExpanded,
    selectShop,
    setManualLocation: (loc) => setSelectedLocation(loc, true),
    requestPermissionAndAcquire,
    acquireFreshLocation: acquireCurrentGpsLocation,
    categoryFilter,
    setCategoryFilter,
    reload: loadShops,
  };
};

export default useRepairShops;
