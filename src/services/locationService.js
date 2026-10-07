import { PermissionsAndroid, Platform } from 'react-native';
import { check, PERMISSIONS, request, RESULTS } from 'react-native-permissions';

/**
 * Location Accuracy Status Thresholds (in meters)
 * <= 20m: Excellent (Precise GNSS/GPS)
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
    return { label: 'Excellent (Precise GPS)', shortLabel: 'Precise', status: 'excellent', color: '#32D583', isGood: true };
  }
  if (acc <= ACCURACY_THRESHOLDS.GOOD) {
    return { label: 'Good', shortLabel: 'Good', status: 'good', color: '#38BDF8', isGood: true };
  }
  if (acc <= ACCURACY_THRESHOLDS.ACCEPTABLE) {
    return { label: 'Acceptable', shortLabel: 'Fair', status: 'acceptable', color: '#F59E0B', isGood: true };
  }
  return { label: 'Low Accuracy', shortLabel: 'Low', status: 'poor', color: '#EF4444', isGood: false };
};

/**
 * LocationService Class (OOP Service Layer)
 * Strictly enforces Android FINE/COARSE location permission checks,
 * fresh GNSS/GPS fix acquisition, stale reading rejection, and zero IP-guessing fallbacks.
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
          return { state: 'GRANTED_PRECISE', isGranted: true, isPrecise: true };
        }
        return { state: 'NOT_REQUESTED', isGranted: false, isPrecise: false };
      }
    } catch (err) {
      console.warn('[LocationService] Permission check warning:', err);
      return { state: 'ERROR', isGranted: false, isPrecise: false };
    }
  }

  /**
   * Request explicit Android FINE/COARSE location permissions from user
   */
  static async requestPermissions() {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);

        const fineGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
        const coarseGranted = granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;

        if (fineGranted) {
          return { state: 'GRANTED_PRECISE', isGranted: true, isPrecise: true };
        }
        if (coarseGranted) {
          return { state: 'GRANTED_APPROXIMATE', isGranted: true, isPrecise: false };
        }
        return { state: 'DENIED', isGranted: false, isPrecise: false };
      } else {
        const fineRequest = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        if (fineRequest === RESULTS.GRANTED) {
          return { state: 'GRANTED_PRECISE', isGranted: true, isPrecise: true };
        }
        return { state: 'DENIED', isGranted: false, isPrecise: false };
      }
    } catch (err) {
      console.warn('[LocationService] Permission request error:', err);
      return { state: 'DENIED', isGranted: false, isPrecise: false };
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
    targetAccuracyMeters = 10,
    acquisitionTimeoutMs = 12000,
  } = {}) {
    const perm = await this.checkPermissionState();
    if (!perm.isGranted) {
      const requested = await this.requestPermissions();
      if (!requested.isGranted) {
        throw new Error('PERMISSION_DENIED');
      }
    }

    return new Promise((resolve, reject) => {
      let bestFix = null;
      let watchId = null;
      let isDone = false;

      const finishAcquisition = async () => {
        if (isDone) return;
        isDone = true;

        if (watchId !== null && global.navigator?.geolocation) {
          try {
            global.navigator.geolocation.clearWatch(watchId);
          } catch (e) {}
        }

        if (bestFix && bestFix.latitude && bestFix.longitude) {
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
            isPrecise: perm.isPrecise,
            source: 'gps_fused',
            name: geocodedName || (perm.isPrecise ? 'Verified GPS Location' : 'Approximate Location'),
          });
        } else {
          reject(new Error('LOCATION_UNAVAILABLE'));
        }
      };

      // Set acquisition timeout (~10s)
      const timer = setTimeout(() => {
        finishAcquisition();
      }, acquisitionTimeoutMs);

      // Validate & inspect each position reading
      const handleReading = (coords, timestamp) => {
        const now = Date.now();
        const readingTime = timestamp || now;
        const ageMs = now - readingTime;

        // 1. Reject stale cached readings older than maxAgeMs
        if (ageMs > maxAgeMs) {
          console.warn('[LocationService] Rejected stale location fix (age: ' + Math.round(ageMs / 1000) + 's)');
          return;
        }

        const accuracy = Number(coords.accuracy ?? 150);
        const fix = {
          latitude: Number(coords.latitude),
          longitude: Number(coords.longitude),
          accuracy: accuracy,
          timestamp: readingTime,
        };

        // Keep best fix (lowest accuracy value in meters)
        if (!bestFix || fix.accuracy < bestFix.accuracy) {
          bestFix = fix;
        }

        // 2. High accuracy target achieved -> resolve immediately
        if (fix.accuracy <= targetAccuracyMeters) {
          clearTimeout(timer);
          finishAcquisition();
        }
      };

      // Subscribe to fresh device location updates
      if (global.navigator && global.navigator.geolocation) {
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
          console.warn('[LocationService] Geolocation subscription error:', e);
          clearTimeout(timer);
          reject(new Error('LOCATION_UNAVAILABLE'));
        }
      } else {
        clearTimeout(timer);
        reject(new Error('GEOLOCATION_NOT_SUPPORTED'));
      }
    });
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
