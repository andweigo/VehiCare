import { Alert, Linking, NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';

const { VehiCareLocation } = NativeModules;

/**
 * Location Accuracy Status Thresholds (in meters)
 * <= 20m: Excellent
 * <= 50m: Good
 * <= 100m: Acceptable
 * > 100m: Poor / Low Accuracy
 */
export const ACCURACY_THRESHOLDS = {
  EXCELLENT: 20,
  GOOD: 50,
  ACCEPTABLE: 100,
};

export const getAccuracyStatus = (accuracyMeters) => {
  if (accuracyMeters === null || accuracyMeters === undefined || isNaN(accuracyMeters)) {
    return { label: 'Unknown', shortLabel: 'Unknown', status: 'unknown', color: '#64748B', isGood: false };
  }

  const acc = Number(accuracyMeters);

  if (acc <= ACCURACY_THRESHOLDS.EXCELLENT) {
    return { label: 'Excellent', shortLabel: 'Excellent', status: 'excellent', color: '#32D583', isGood: true };
  }
  if (acc <= ACCURACY_THRESHOLDS.GOOD) {
    return { label: 'Good', shortLabel: 'Good', status: 'good', color: '#38BDF8', isGood: true };
  }
  if (acc <= ACCURACY_THRESHOLDS.ACCEPTABLE) {
    return { label: 'Acceptable', shortLabel: 'Fair', status: 'acceptable', color: '#F59E0B', isGood: true };
  }
  return { label: 'Low Accuracy', shortLabel: 'Low', status: 'poor', color: '#EF4444', isGood: false };
};

const hasValidCoordinates = (latitude, longitude) => {
  if (latitude === null || latitude === undefined || latitude === ''
    || longitude === null || longitude === undefined || longitude === '') {
    return false;
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

/**
 * LocationService Class (OOP Service Layer)
 * Enforces platform location permission checks, fresh device-fix acquisition,
 * stale reading rejection, and zero IP-guessing fallbacks.
 */
export class LocationService {
  /**
   * Check current location permission state without triggering prompt
   * Returns: 'GRANTED_PRECISE' | 'GRANTED_APPROXIMATE' | 'DENIED' | 'NOT_REQUESTED'
   */
  static async checkPermissionState() {
    try {
      if (Platform.OS === 'android') {
        const fineCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (fineCheck) {
          return { state: 'GRANTED_PRECISE', isGranted: true, isPrecise: true };
        }
        const coarseCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
        if (coarseCheck) {
          return { state: 'GRANTED_APPROXIMATE', isGranted: true, isPrecise: false };
        }
        return { state: 'NOT_REQUESTED', isGranted: false, isPrecise: false };
      } else {
        const fineStatus = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        if (fineStatus === RESULTS.GRANTED) {
          // RNPermissions exposes permission status but not iOS's precise vs
          // reduced-accuracy authorization here. Avoid claiming precision;
          // the measured coordinate accuracy is still reported separately.
          return { state: 'GRANTED_APPROXIMATE', isGranted: true, isPrecise: false };
        }
        return { state: 'NOT_REQUESTED', isGranted: false, isPrecise: false };
      }
    } catch (err) {
      console.warn('[LocationService] Permission check warning:', err);
      return { state: 'ERROR', isGranted: false, isPrecise: false };
    }
  }

  /**
   * Request explicit location permission from the user for the current platform
   */
  static async requestPermissions() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const fineResult = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
        const coarseResult = granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

        if (fineResult === PermissionsAndroid.RESULTS.GRANTED) {
          return { state: 'GRANTED_PRECISE', isGranted: true, isPrecise: true };
        }
        if (coarseResult === PermissionsAndroid.RESULTS.GRANTED) {
          return { state: 'GRANTED_APPROXIMATE', isGranted: true, isPrecise: false };
        }

        const isNeverAskAgain =
          fineResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
          coarseResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

        return {
          state: isNeverAskAgain ? 'PERMANENTLY_DENIED' : 'DENIED',
          isGranted: false,
          isPrecise: false,
          isPermanentlyDenied: isNeverAskAgain,
        };
      } else {
        const fineRequest = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        if (fineRequest === RESULTS.GRANTED) {
          return { state: 'GRANTED_APPROXIMATE', isGranted: true, isPrecise: false };
        }
        return {
          state: fineRequest === RESULTS.BLOCKED ? 'PERMANENTLY_DENIED' : 'DENIED',
          isGranted: false,
          isPrecise: false,
          isPermanentlyDenied: fineRequest === RESULTS.BLOCKED,
        };
      }
    } catch (err) {
      console.warn('[LocationService] Permission request error:', err);
      return { state: 'DENIED', isGranted: false, isPrecise: false, isPermanentlyDenied: false };
    }
  }

  /**
   * Open app / system location settings
   */
  static async openSettings() {
    try {
      if (VehiCareLocation?.openLocationSettings) {
        await VehiCareLocation.openLocationSettings();
      } else {
        await Linking.openSettings();
      }
    } catch (e) {
      await Linking.openSettings();
    }
  }

  /**
   * Check if location providers (GPS or Network) are enabled
   */
  static async isLocationEnabled() {
    try {
      if (VehiCareLocation?.isLocationEnabled) {
        return await VehiCareLocation.isLocationEnabled();
      }
      return true;
    } catch (e) {
      return true;
    }
  }

  /**
   * Acquire a fresh high-accuracy device location fix
   * - Enforces enableHighAccuracy: true
   * - Rejects stale cached readings older than maxAgeMs (default 30 seconds)
   * - Collects multiple readings for up to acquisitionTimeoutMs (~10 seconds)
   * - Rejects or flags low accuracy fixes
   * - NO IP-derived or assumed fallback coordinates
   */
  static async getFreshHighAccuracyLocation({
    maxAgeMs = 30000,
    targetAccuracyMeters = 25,
    acquisitionTimeoutMs = 10000,
  } = {}) {
    let permission = await this.checkPermissionState();
    if (!permission.isGranted) {
      permission = await this.requestPermissions();
      if (!permission.isGranted) {
        const err = new Error(permission.isPermanentlyDenied ? 'PERMISSION_PERMANENTLY_DENIED' : 'PERMISSION_DENIED');
        err.isPermanentlyDenied = permission.isPermanentlyDenied;
        throw err;
      }
    }

    // 1. Try Native Android VehiCareLocation module
    if (VehiCareLocation?.getCurrentLocation) {
      try {
        const loc = await VehiCareLocation.getCurrentLocation({ timeout: acquisitionTimeoutMs });
        if (loc && hasValidCoordinates(loc.latitude, loc.longitude)) {
          const rawAccuracy = Number(loc.accuracy);
          const accuracy = Number.isFinite(rawAccuracy) && rawAccuracy > 0 ? rawAccuracy : null;
          const accuracyInfo = getAccuracyStatus(accuracy);
          const geocodedName = await LocationService.reverseGeocode(loc.latitude, loc.longitude);
          return {
            latitude: Number(loc.latitude),
            longitude: Number(loc.longitude),
            accuracy,
            accuracyStatus: accuracyInfo.status,
            accuracyLabel: accuracyInfo.label,
            accuracyShortLabel: accuracyInfo.shortLabel,
            accuracyColor: accuracyInfo.color,
            isGoodAccuracy: accuracyInfo.isGood,
            timestamp: loc.timestamp || Date.now(),
            isPrecise: permission.isPrecise,
            source: loc.provider || 'gps',
            name: geocodedName || 'Device Location',
          };
        }
      } catch (nativeErr) {
        if (nativeErr?.code === 'LOCATION_SERVICES_DISABLED') {
          const disabledErr = new Error('LOCATION_SERVICES_DISABLED');
          disabledErr.code = 'LOCATION_SERVICES_DISABLED';
          throw disabledErr;
        }
        if (nativeErr?.code === 'PERMISSION_DENIED') {
          throw new Error('PERMISSION_DENIED');
        }
        console.warn('[LocationService] Native module location error:', nativeErr?.message || nativeErr);
      }
    }

    // 2. Fallback to navigator.geolocation if available (e.g. polyfill or web)
    if (global.navigator && global.navigator.geolocation) {
      return new Promise((resolve, reject) => {
        let bestFix = null;
        let watchId = null;
        let isDone = false;

        const finishAcquisition = async () => {
          if (isDone) return;
          isDone = true;

          if (watchId !== null) {
            try {
              global.navigator.geolocation.clearWatch(watchId);
            } catch (e) {}
          }

          if (bestFix && hasValidCoordinates(bestFix.latitude, bestFix.longitude)) {
            const accuracyInfo = getAccuracyStatus(bestFix.accuracy);
            const geocodedName = await LocationService.reverseGeocode(bestFix.latitude, bestFix.longitude);

            resolve({
              latitude: bestFix.latitude,
              longitude: bestFix.longitude,
              accuracy: bestFix.accuracy,
              accuracyStatus: accuracyInfo.status,
              accuracyLabel: accuracyInfo.label,
              accuracyShortLabel: accuracyInfo.shortLabel,
              accuracyColor: accuracyInfo.color,
              isGoodAccuracy: accuracyInfo.isGood,
              timestamp: bestFix.timestamp,
              isPrecise: permission.isPrecise,
              source: 'gps_fused',
              name: geocodedName || 'Device Location',
            });
          } else {
            reject(new Error('LOCATION_UNAVAILABLE'));
          }
        };

        const timer = setTimeout(() => {
          finishAcquisition();
        }, acquisitionTimeoutMs);

        const handleReading = (coords, timestamp) => {
          const now = Date.now();
          const readingTime = timestamp || now;
          const ageMs = now - readingTime;

          if (ageMs > maxAgeMs) return;
          if (!hasValidCoordinates(coords.latitude, coords.longitude)) return;

          const rawAccuracy = Number(coords.accuracy);
          const accuracy = Number.isFinite(rawAccuracy) && rawAccuracy > 0 ? rawAccuracy : null;
          const fix = {
            latitude: Number(coords.latitude),
            longitude: Number(coords.longitude),
            accuracy: accuracy,
            timestamp: readingTime,
          };

          if (
            hasValidCoordinates(fix.latitude, fix.longitude)
            && (!bestFix
              || (Number.isFinite(fix.accuracy) && (!Number.isFinite(bestFix.accuracy) || fix.accuracy < bestFix.accuracy)))
          ) {
            bestFix = fix;
          }

          if (Number.isFinite(fix.accuracy) && fix.accuracy <= targetAccuracyMeters) {
            clearTimeout(timer);
            finishAcquisition();
          }
        };

        try {
          global.navigator.geolocation.getCurrentPosition(
            (pos) => handleReading(pos.coords, pos.timestamp),
            (err) => console.warn('[LocationService] getCurrentPosition warning:', err?.message || err),
            { enableHighAccuracy: true, timeout: 4000, maximumAge: 0 }
          );

          watchId = global.navigator.geolocation.watchPosition(
            (pos) => handleReading(pos.coords, pos.timestamp),
            (err) => console.warn('[LocationService] watchPosition warning:', err?.message || err),
            { enableHighAccuracy: true, distanceFilter: 1, maximumAge: 0 }
          );
        } catch (e) {
          clearTimeout(timer);
          reject(new Error('LOCATION_UNAVAILABLE'));
        }
      });
    }

    throw new Error('GEOLOCATION_NOT_SUPPORTED');
  }

  /**
   * Reverse geocode lat/lng to get human-readable location address
   */
  static async reverseGeocode(latitude, longitude) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'VehiCareApp/1.0',
        },
      });
      if (response.ok) {
        const json = await response.json();
        const addr = json.address || {};
        const village = addr.village || addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || null;
        const town = addr.town || addr.city || addr.municipality || null;

        const parts = [village, town].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
        if (json.display_name) {
          return json.display_name.split(',').slice(0, 2).join(', ');
        }
      }
    } catch (err) {
      console.warn('[LocationService] Reverse geocode warning:', err);
    }
    return null;
  }
}

export default LocationService;
