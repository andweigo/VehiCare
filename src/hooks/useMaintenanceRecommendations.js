import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, DeviceEventEmitter } from 'react-native';
import vehicleApi from '../api/vehicleApi';
import { useAuth } from '../context/AuthContext';
import { useVehicle } from '../context/VehicleContext';
import { VehicleHealthContext } from '../context/VehicleHealthContext';
import { getHistoryStorageKey, loadActiveChatSessions } from '../services/storageService';
import {
  extractDiagnosticRecommendations,
  extractMaintenanceTasks,
  extractSmartRecommendations,
  getCategoryFromDiagnosticItem,
  getVehicleMaintenanceCategories,
  getVehicleRecommendations,
  mapItemToCategoryId,
  mergeRecommendations,
  normalizeKey,
} from '../utils/maintenanceUtils';
import activityService from '../services/activity.service';

const DEFAULT_HEALTH_STATUS = {
  label: 'No maintenance activity yet',
  code: 'NO_HISTORY',
  color: '#64748B',
  icon: 'info-outline',
  explanation: 'Log a service or schedule a task to start tracking this vehicle.',
};

// Global in-memory cache to prevent flickering during vehicle switching
const healthScoreMemoryCache = new Map();
export const healthFactorsMemoryCache = new Map();
const vehicleDataMemoryCache = new Map();
const completedIdsMemoryCache = new Map();

export const getHealthScoreColor = score => {
  const num = Number(score);
  if (!Number.isFinite(num)) return '#32D583';
  if (num >= 90) return '#10B981';
  if (num >= 80) return '#32D583';
  if (num >= 70) return '#84CC16';
  if (num >= 60) return '#F5B942';
  if (num >= 40) return '#FF7337';
  return '#EF4444';
};

/**
 * Core internal hook containing the authoritative vehicle health calculation
 * and maintenance persistence logic.
 */
export const useMaintenanceRecommendationsInternal = () => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id || user?.uid || null;
  const { activeVehicle, pendingVehicle, loading: vehicleLoading } = useVehicle();
  const vehicleProfile = activeVehicle || pendingVehicle;

  const activeVehicleId = useMemo(() => {
    const rawId = vehicleProfile?.id ?? vehicleProfile?.vehicle_id ?? null;
    return rawId !== null ? String(rawId) : null;
  }, [vehicleProfile]);

  const primaryStorageKey = useMemo(() => {
    return activeVehicleId
      ? `@vehicare_completed_maintenance_${userId || 'guest'}_${activeVehicleId}`
      : '@vehicare_completed_maintenance';
  }, [activeVehicleId, userId]);

  const fallbackStorageKey = useMemo(() => {
    return activeVehicleId
      ? `@vehicare_completed_maintenance_${activeVehicleId}`
      : null;
  }, [activeVehicleId]);

  const hookCompletedRecs = useMemo(() => {
    const vHealth = vehicleProfile?.health || vehicleProfile?.vehicle_health || vehicleProfile?.vehicleHealth || {};
    return Array.isArray(vHealth.completedRecommendations)
      ? vHealth.completedRecommendations
      : Array.isArray(vHealth.completed_recommendations)
      ? vHealth.completed_recommendations
      : [];
  }, [vehicleProfile]);

  const [diagnostics, setDiagnostics] = useState([]);
  const [serviceHistory, setServiceHistory] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [repairRecords, setRepairRecords] = useState([]);
  const [loadedVehicleId, setLoadedVehicleId] = useState(() => activeVehicleId);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(() => Boolean(activeVehicleId));
  const [initialDiagnosticsLoaded, setInitialDiagnosticsLoaded] = useState(false);
  const [localCompletedIds, setLocalCompletedIds] = useState([]);
  const maintenanceWriteIdsRef = useRef(new Set());
  const autoSyncedTitlesRef = useRef(new Set());
  const fetchRequestIdRef = useRef(0);

  // Scope state strictly to the currently selected activeVehicleId so switching vehicles
  // immediately reflects the new vehicle without leaking the previous vehicle's data.
  const isCurrentVehicleLoaded = loadedVehicleId === activeVehicleId;
  const cachedVehicleSnapshot = activeVehicleId ? vehicleDataMemoryCache.get(activeVehicleId) : null;

  const effectiveDiagnostics = useMemo(
    () => (isCurrentVehicleLoaded ? diagnostics : (cachedVehicleSnapshot?.diagnostics || [])),
    [isCurrentVehicleLoaded, diagnostics, cachedVehicleSnapshot],
  );
  const effectiveServiceHistory = useMemo(
    () => (isCurrentVehicleLoaded ? serviceHistory : (cachedVehicleSnapshot?.serviceHistory || [])),
    [isCurrentVehicleLoaded, serviceHistory, cachedVehicleSnapshot],
  );
  const effectiveMaintenanceRecords = useMemo(
    () => (isCurrentVehicleLoaded ? maintenanceRecords : (cachedVehicleSnapshot?.maintenanceRecords || [])),
    [isCurrentVehicleLoaded, maintenanceRecords, cachedVehicleSnapshot],
  );
  const effectiveRepairRecords = useMemo(
    () => (isCurrentVehicleLoaded ? repairRecords : (cachedVehicleSnapshot?.repairRecords || [])),
    [isCurrentVehicleLoaded, repairRecords, cachedVehicleSnapshot],
  );

  const vehicleInitialScore = useMemo(() => {
    const vHealth = vehicleProfile?.health || vehicleProfile?.vehicle_health || vehicleProfile?.vehicleHealth || {};
    const scoreVal = vHealth.score ?? vHealth.health_score ?? vHealth.overall_score ?? null;
    return (typeof scoreVal === 'number' && !isNaN(scoreVal)) ? scoreVal : null;
  }, [vehicleProfile]);

  // In-memory / storage cached health score to prevent initial flash to 100
  const [cachedHealthScore, setCachedHealthScore] = useState(() => {
    if (activeVehicleId && healthScoreMemoryCache.has(activeVehicleId)) {
      return healthScoreMemoryCache.get(activeVehicleId);
    }
    if (typeof vehicleInitialScore === 'number') {
      return vehicleInitialScore;
    }
    return null;
  });

  useEffect(() => {
    let isCancelled = false;
    autoSyncedTitlesRef.current = new Set();

    if (!activeVehicleId) {
      setCachedHealthScore(null);
      setLoadedVehicleId(null);
      return;
    }

    const memSnapshot = vehicleDataMemoryCache.get(activeVehicleId);
    if (memSnapshot) {
      setDiagnostics(memSnapshot.diagnostics || []);
      setServiceHistory(memSnapshot.serviceHistory || []);
      setMaintenanceRecords(memSnapshot.maintenanceRecords || []);
      setRepairRecords(memSnapshot.repairRecords || []);
      setLoadedVehicleId(activeVehicleId);
      setInitialDiagnosticsLoaded(true);
      setLoadingDiagnostics(false);
    } else {
      setDiagnostics([]);
      setServiceHistory([]);
      setMaintenanceRecords([]);
      setRepairRecords([]);
      setLoadedVehicleId(activeVehicleId);
      setInitialDiagnosticsLoaded(false);
      setLoadingDiagnostics(true);
    }

    if (healthScoreMemoryCache.has(activeVehicleId)) {
      setCachedHealthScore(healthScoreMemoryCache.get(activeVehicleId));
    } else {
      setCachedHealthScore(typeof vehicleInitialScore === 'number' ? vehicleInitialScore : null);
      AsyncStorage.getItem(`@vehicare_cached_health_${activeVehicleId}`)
        .then(val => {
          if (!isCancelled && val !== null) {
            const num = Number(val);
            if (!isNaN(num)) {
              healthScoreMemoryCache.set(activeVehicleId, num);
              setCachedHealthScore(num);
            }
          }
        })
        .catch(() => {});
    }
    return () => {
      isCancelled = true;
    };
  }, [activeVehicleId, vehicleInitialScore]);

  // Load completed maintenance items for active vehicle
  useEffect(() => {
    let isCancelled = false;
    setLocalCompletedIds(completedIdsMemoryCache.get(primaryStorageKey) || []);
    const loadCompletedState = async () => {
      try {
        let loadedKeys = [];
        const savedPrimary = await AsyncStorage.getItem(primaryStorageKey);
        if (savedPrimary) {
          const parsed = JSON.parse(savedPrimary);
          if (Array.isArray(parsed)) {
            loadedKeys = parsed;
          }
        } else if (fallbackStorageKey) {
          const savedFallback = await AsyncStorage.getItem(fallbackStorageKey);
          if (savedFallback) {
            const parsed = JSON.parse(savedFallback);
            if (Array.isArray(parsed)) {
              loadedKeys = parsed;
            }
          }
        }
        if (!isCancelled) {
          completedIdsMemoryCache.set(primaryStorageKey, loadedKeys);
          setLocalCompletedIds(loadedKeys);
        }
      } catch (err) {
        console.warn('Failed to load vehicle completed maintenance state:', err);
      }
    };

    loadCompletedState();
    return () => {
      isCancelled = true;
    };
  }, [primaryStorageKey, fallbackStorageKey]);

  // Save completed maintenance items for active vehicle (both user-scoped and vehicle-scoped)
  const saveCompletedState = useCallback(
    async updatedKeys => {
      try {
        completedIdsMemoryCache.set(primaryStorageKey, updatedKeys);
        setLocalCompletedIds(updatedKeys);
        await AsyncStorage.setItem(primaryStorageKey, JSON.stringify(updatedKeys));
        if (fallbackStorageKey) {
          await AsyncStorage.setItem(fallbackStorageKey, JSON.stringify(updatedKeys));
        }
      } catch (err) {
        console.warn('Failed to save vehicle completed maintenance state:', err);
      }
    },
    [primaryStorageKey, fallbackStorageKey],
  );

  // Fetch diagnostics, repairs, and service history scoped strictly to active vehicle
  const fetchVehicleDiagnostics = useCallback(async () => {
    const requestId = ++fetchRequestIdRef.current;

    if (!vehicleProfile) {
      setDiagnostics([]);
      setServiceHistory([]);
      setRepairRecords([]);
      setMaintenanceRecords([]);
      setLoadedVehicleId(null);
      setLoadingDiagnostics(false);
      setInitialDiagnosticsLoaded(true);
      return;
    }

    const hasMemSnapshot = Boolean(activeVehicleId && vehicleDataMemoryCache.has(activeVehicleId));
    if (!hasMemSnapshot) {
      setInitialDiagnosticsLoaded(false);
      setLoadingDiagnostics(true);
    }

    const filterByVehicle = list =>
      (list || []).filter(item => {
        const itemVid =
          item.vehicle_id ??
          item.vehicleId ??
          item.vehicle?.id ??
          item.vehicle?.vehicle_id ??
          null;

        if (activeVehicleId !== null) {
          return itemVid !== null && String(itemVid) === String(activeVehicleId);
        }
        return itemVid === null;
      });

    const filterMaintenanceByVehicle = list =>
      (list || []).filter(item => {
        const itemVid = item.vehicle_id ?? item.vehicleId ?? item.vehicle?.id ?? item.vehicle?.vehicle_id ?? null;
        return activeVehicleId !== null && itemVid !== null && String(itemVid) === String(activeVehicleId);
      });

    try {
      // Step 1: Read local history and active diagnostic sessions INSTANTLY (< 5ms)
      let localRecords = [];
      let localServices = [];
      try {
        const [localStr, activeSessions] = await Promise.all([
          AsyncStorage.getItem(getHistoryStorageKey(userId)).catch(() => null),
          loadActiveChatSessions(userId).catch(() => null),
        ]);

        if (localStr) {
          const parsed = JSON.parse(localStr);
          if (Array.isArray(parsed)) {
            localRecords.push(...parsed.filter(
              item => item.type === 'diagnosis' || item.diagnosisData || item.symptoms,
            ));
            localServices.push(...parsed.filter(
              item => item.type === 'maintenance' || item.type === 'service' || item.serviceType || item.cost,
            ));
          }
        }

        if (activeSessions && typeof activeSessions === 'object') {
          Object.values(activeSessions).forEach(session => {
            if (session && Array.isArray(session.messages)) {
              session.messages.forEach(msg => {
                if (msg?.diagnosisData) {
                  const dData = msg.diagnosisData;
                  const diagVehicleId = dData.vehicle?.id || dData.vehicle_id || session.vehicleId || null;
                  localRecords.push({
                    id: dData.id || `diag-${msg.id}`,
                    vehicle_id: diagVehicleId,
                    problem: dData.summary || dData.problem || 'Vehicle Issue',
                    summary: dData.summary || dData.problem || 'Vehicle Issue',
                    severity: dData.severity || 'moderate',
                    urgency: dData.urgency || 'Inspection recommended.',
                    possible_causes: dData.possible_causes || [],
                    recommended_actions: dData.recommended_actions || [],
                    maintenance_tasks: dData.maintenance_tasks || [],
                    created_at: dData.created_at || session.updatedAt || session.createdAt || new Date().toISOString(),
                    type: 'diagnosis',
                  });
                }
              });
            }
          });
        }
      } catch (err) {
        console.warn('Local storage error reading history:', err?.message);
      }

      if (fetchRequestIdRef.current !== requestId) {
        return;
      }

      const initialFiltered = filterByVehicle(localRecords);
      const initialServices = filterMaintenanceByVehicle(localServices);

      let resolvedDiags = initialFiltered;
      let resolvedRepairs = hasMemSnapshot ? (vehicleDataMemoryCache.get(activeVehicleId)?.repairRecords || []) : [];
      let resolvedMaint = hasMemSnapshot ? (vehicleDataMemoryCache.get(activeVehicleId)?.maintenanceRecords || []) : [];
      let resolvedServices = initialServices;

      if (!hasMemSnapshot) {
        setServiceHistory(initialServices);
        setDiagnostics(initialFiltered);
        setRepairRecords([]);
        setMaintenanceRecords([]);
        setLoadedVehicleId(activeVehicleId);
        // Mark local phase loaded immediately so switching vehicles updates the UI without waiting 8s
        setInitialDiagnosticsLoaded(true);
        setLoadingDiagnostics(false);
      }

      // Step 2: Background API sync (8.0s timeout to accommodate mobile network/Render latency)
      if (isAuthenticated) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Diagnostics sync timeout')), 8000),
          );

          const [apiDiags, apiRepairs, apiMaintenance] = await Promise.race([
            Promise.all([
              vehicleApi.getDiagnosticsHistory(),
              activeVehicleId ? vehicleApi.getRepairRecords({ vehicle_id: activeVehicleId }) : Promise.resolve([]),
              activeVehicleId ? vehicleApi.getMaintenanceRecords({ vehicle_id: activeVehicleId }) : Promise.resolve([]),
            ]),
            timeoutPromise,
          ]);

          if (fetchRequestIdRef.current !== requestId) {
            return;
          }

          if (Array.isArray(apiDiags)) {
            const filteredApiDiags = filterByVehicle(apiDiags);
            const seenDiagIds = new Set(filteredApiDiags.map(d => String(d.id)));
            const mergedDiags = [
              ...filteredApiDiags,
              ...initialFiltered.filter(d => !d.id || !seenDiagIds.has(String(d.id))),
            ];
            resolvedDiags = mergedDiags;
            setDiagnostics(mergedDiags);
          }
          if (Array.isArray(apiRepairs)) {
            const filteredApiRepairs = filterByVehicle(apiRepairs);
            resolvedRepairs = filteredApiRepairs;
            setRepairRecords(filteredApiRepairs);
          }
          if (Array.isArray(apiMaintenance)) {
            const vehicleMaintenance = filterMaintenanceByVehicle(apiMaintenance);
            resolvedMaint = vehicleMaintenance;
            setMaintenanceRecords(vehicleMaintenance);
            const completedBackendServices = vehicleMaintenance.filter(
              m => (m.status || 'completed') === 'completed'
            );
            const combinedServices = [...initialServices.filter(item => !item.id), ...completedBackendServices];
            const seenIds = new Set();
            resolvedServices = combinedServices.filter(item => {
              const id = item.id || `${item.title}-${item.created_at}`;
              if (seenIds.has(id)) return false;
              seenIds.add(id);
              return true;
            });
            setServiceHistory(resolvedServices);
          }
        } catch (err) {
          console.warn('Silent API diagnostics check:', err?.message);
        }
      }

      if (fetchRequestIdRef.current === requestId && activeVehicleId) {
        vehicleDataMemoryCache.set(activeVehicleId, {
          diagnostics: resolvedDiags,
          repairRecords: resolvedRepairs,
          maintenanceRecords: resolvedMaint,
          serviceHistory: resolvedServices,
        });
      }
    } catch (error) {
      console.warn('Error loading vehicle diagnostics:', error?.message);
    } finally {
      if (fetchRequestIdRef.current === requestId) {
        setLoadedVehicleId(activeVehicleId);
        setInitialDiagnosticsLoaded(true);
        setLoadingDiagnostics(false);
      }
    }
  }, [vehicleProfile, activeVehicleId, isAuthenticated, userId]);

  useEffect(() => {
    fetchVehicleDiagnostics();
  }, [fetchVehicleDiagnostics]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('vehicleHealthChanged', () => {
      fetchVehicleDiagnostics();
    });
    return () => {
      sub.remove();
    };
  }, [fetchVehicleDiagnostics]);

  // Distinct Maintenance Tasks (Action-oriented Inspections & Tasks)
  const maintenanceTasks = useMemo(
    () => extractMaintenanceTasks(effectiveDiagnostics, effectiveRepairRecords, vehicleProfile),
    [effectiveDiagnostics, effectiveRepairRecords, vehicleProfile],
  );

  // Distinct Smart Recommendations (Educational & Preventive Habits)
  const smartRecommendations = useMemo(
    () => extractSmartRecommendations(effectiveDiagnostics, effectiveRepairRecords, vehicleProfile),
    [effectiveDiagnostics, effectiveRepairRecords, vehicleProfile],
  );

  // Compute baseline recommendations for active vehicle
  const baselineRecommendations = useMemo(
    () => getVehicleRecommendations(vehicleProfile),
    [vehicleProfile],
  );

  const diagnosticRecommendations = useMemo(
    () => maintenanceTasks,
    [maintenanceTasks],
  );

  const allRecommendations = useMemo(
    () => mergeRecommendations(diagnosticRecommendations, baselineRecommendations, vehicleProfile),
    [diagnosticRecommendations, baselineRecommendations, vehicleProfile],
  );

  // Set of completed item IDs and normalized title keys for active vehicle
  const completedIdsSet = useMemo(() => {
    const ids = new Set();

    if (Array.isArray(localCompletedIds)) {
      localCompletedIds.forEach(key => {
        if (typeof key === 'string' && key) {
          ids.add(key);
          const norm = normalizeKey(key);
          if (norm) ids.add(norm);
        }
      });
    }

    if (Array.isArray(hookCompletedRecs)) {
      hookCompletedRecs.forEach(item => {
        if (typeof item === 'string' && item) {
          ids.add(item);
          const norm = normalizeKey(item);
          if (norm) ids.add(norm);
        } else if (item && typeof item === 'object') {
          if (item.id) {
            ids.add(String(item.id));
            const norm = normalizeKey(item.id);
            if (norm) ids.add(norm);
          }
          if (item.title) {
            const norm = normalizeKey(item.title);
            if (norm) ids.add(norm);
          }
          if (item.what_to_do) {
            const normWhat = normalizeKey(item.what_to_do);
            if (normWhat) ids.add(normWhat);
          }
          if (item.recommendationId) {
            ids.add(String(item.recommendationId));
          }
        }
      });
    }

    if (Array.isArray(effectiveMaintenanceRecords)) {
      effectiveMaintenanceRecords.forEach(record => {
        if (record && (record.status || '') === 'completed') {
          if (record.id) {
            ids.add(String(record.id));
          }
          if (record.title) {
            const norm = normalizeKey(record.title);
            if (norm) ids.add(norm);
          }
        }
      });
    }

    return ids;
  }, [localCompletedIds, hookCompletedRecs, effectiveMaintenanceRecords]);

  // Checks if an item or ID is marked as completed
  const isRecommendationCompleted = useCallback(
    itemOrId => {
      if (!itemOrId) return false;
      if (typeof itemOrId === 'string') {
        if (completedIdsSet.has(itemOrId)) return true;
        const norm = normalizeKey(itemOrId);
        return norm ? completedIdsSet.has(norm) : false;
      }
      if (typeof itemOrId === 'object') {
        if (itemOrId.id) {
          const idStr = String(itemOrId.id);
          if (completedIdsSet.has(idStr)) return true;
          const normId = normalizeKey(idStr);
          if (normId && completedIdsSet.has(normId)) return true;
        }
        if (itemOrId.title) {
          const norm = normalizeKey(itemOrId.title);
          if (norm && completedIdsSet.has(norm)) return true;
        }
        if (itemOrId.what_to_do) {
          const normWhat = normalizeKey(itemOrId.what_to_do);
          if (normWhat && completedIdsSet.has(normWhat)) return true;
        }
        if (itemOrId.recommendationId && completedIdsSet.has(String(itemOrId.recommendationId))) return true;
      }
      return false;
    },
    [completedIdsSet],
  );

  // Persist generated recommendations as pending maintenance records. This
  // gives the maintenance history a record as soon as VehiCare recommends a
  // task; completion later updates that same record instead of creating a
  // second one.
  useEffect(() => {
    if (
      !isAuthenticated ||
      !activeVehicleId ||
      !isCurrentVehicleLoaded ||
      !initialDiagnosticsLoaded ||
      loadingDiagnostics ||
      !Array.isArray(allRecommendations) ||
      allRecommendations.length === 0
    ) {
      return;
    }

    const existingTitles = new Set(
      (effectiveMaintenanceRecords || [])
        .filter(record => record?.status !== 'cancelled')
        .map(record => normalizeKey(record?.title))
        .filter(Boolean),
    );
    const recommendationTitles = new Set();
    const pendingRecommendations = allRecommendations.filter(item => {
      const title = typeof item === 'object' ? item.title : item;
      const titleKey = normalizeKey(title);
      if (
        !titleKey ||
        existingTitles.has(titleKey) ||
        recommendationTitles.has(titleKey) ||
        autoSyncedTitlesRef.current.has(titleKey) ||
        isRecommendationCompleted(item)
      ) {
        return false;
      }
      recommendationTitles.add(titleKey);
      autoSyncedTitlesRef.current.add(titleKey);
      return true;
    });

    if (pendingRecommendations.length === 0) return;

    const vehicleId = Number.parseInt(activeVehicleId, 10);
    if (!Number.isInteger(vehicleId)) return;

    let cancelled = false;
    const syncRecommendations = async () => {
      const created = await Promise.allSettled(pendingRecommendations.map(item => {
        const recommendation = typeof item === 'object' ? item : { title: String(item) };
        return vehicleApi.createMaintenanceRecord({
          vehicle_id: vehicleId,
          diagnostic_id: recommendation.diagnosisId && !isNaN(Number(recommendation.diagnosisId))
            ? Number(recommendation.diagnosisId)
            : null,
          title: String(recommendation.title || 'Maintenance task').trim(),
          description: recommendation.description || null,
          service_type: recommendation.serviceType || 'General Inspection',
          status: 'pending',
          due_date: recommendation.dueDate || null,
          urgency: recommendation.priority || 'Routine',
          is_inspection: Boolean(recommendation.isInspection),
        });
      }));

      if (!cancelled && created.some(result => result.status === 'fulfilled')) {
        try {
          DeviceEventEmitter?.emit?.('vehicleHealthChanged');
        } catch (_) {}
      }
    };

    syncRecommendations().catch(error => {
      console.warn('Automatic maintenance recommendation sync failed:', error?.message);
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeVehicleId,
    allRecommendations,
    effectiveMaintenanceRecords,
    initialDiagnosticsLoaded,
    isAuthenticated,
    isCurrentVehicleLoaded,
    isRecommendationCompleted,
    loadingDiagnostics,
  ]);

  // Mark item as completed across all screens, AsyncStorage, and backend
  const markAsDone = useCallback(
    async item => {
      if (!item) return false;
      const title =
        typeof item === 'object'
          ? (item.title || item.what_to_do || String(item.id || 'Maintenance Task'))
          : String(item);
      const normKey = title ? normalizeKey(title) : null;
      const normWhatKey =
        typeof item === 'object' && item.what_to_do ? normalizeKey(item.what_to_do) : null;
      const id = typeof item === 'object' ? (item.id || normKey || title) : item;
      if (!id) return false;

      const writeKey = `${activeVehicleId || 'guest'}:${String(id)}`;
      if (maintenanceWriteIdsRef.current.has(writeKey)) return false;
      maintenanceWriteIdsRef.current.add(writeKey);

      const nowIso = new Date().toISOString();
      const rawDiagId = typeof item === 'object' && item.diagnosisId ? Number(item.diagnosisId) : NaN;
      const safeDiagId =
        Number.isInteger(rawDiagId) && rawDiagId > 0 && rawDiagId < 2147483647 ? rawDiagId : null;

      let savedBackendRecord = null;
      try {
        if (isAuthenticated && activeVehicleId) {
          const numVehicleId = Number.parseInt(activeVehicleId, 10);
          if (!Number.isInteger(numVehicleId)) {
            throw new Error('The selected vehicle could not be confirmed.');
          }
          const existingPending = (maintenanceRecords || []).find(
            record =>
              record?.status === 'pending' &&
              (normalizeKey(record.title) === normKey ||
                (normWhatKey && normalizeKey(record.title) === normWhatKey)),
          );
          const completedPayload = {
            title,
            description: typeof item === 'object' ? (item.description || item.why_it_matters || null) : null,
            service_type: typeof item === 'object' && item.serviceType ? item.serviceType : 'General Inspection',
            status: 'completed',
            performed_at: nowIso,
            urgency: typeof item === 'object' && item.priority ? item.priority : 'Routine',
            is_inspection: typeof item === 'object' ? Boolean(item.isInspection ?? true) : true,
          };
          if (existingPending?.id) {
            savedBackendRecord = await vehicleApi.updateMaintenanceRecord(existingPending.id, completedPayload);
          } else {
            try {
              savedBackendRecord = await vehicleApi.createMaintenanceRecord({
                vehicle_id: numVehicleId,
                diagnostic_id: safeDiagId,
                ...completedPayload,
              });
            } catch (createErr) {
              if (safeDiagId !== null && createErr?.response?.status === 422) {
                savedBackendRecord = await vehicleApi.createMaintenanceRecord({
                  vehicle_id: numVehicleId,
                  diagnostic_id: null,
                  ...completedPayload,
                });
              } else {
                throw createErr;
              }
            }
          }
        }
      } catch (error) {
        Alert.alert('Could not save maintenance', 'Your task was not marked complete because it could not be saved. Check your connection and try again.');
        console.warn('Backend maintenance record persistence failed:', error?.message);
        return false;
      } finally {
        maintenanceWriteIdsRef.current.delete(writeKey);
      }

      const keysToAdd = [String(id)];
      const normId = normalizeKey(String(id));
      if (normId) keysToAdd.push(normId);
      if (normKey) keysToAdd.push(normKey);
      if (normWhatKey) keysToAdd.push(normWhatKey);
      if (savedBackendRecord?.id) keysToAdd.push(String(savedBackendRecord.id));

      setLocalCompletedIds(prev => {
        const next = Array.from(new Set([...prev, ...keysToAdd]));
        saveCompletedState(next);
        return next;
      });

      const optimisticRecord = savedBackendRecord || {
        id: `completed-${String(id)}`,
        vehicle_id: activeVehicleId,
        diagnostic_id: safeDiagId,
        title,
        description: typeof item === 'object' ? (item.description || null) : null,
        service_type: typeof item === 'object' && item.serviceType ? item.serviceType : 'General Inspection',
        status: 'completed',
        performed_at: nowIso,
        created_at: nowIso,
        urgency: typeof item === 'object' && item.priority ? item.priority : 'Routine',
        is_inspection: true,
      };

      setMaintenanceRecords(prev => {
        const list = Array.isArray(prev) ? prev : [];
        let matched = false;
        const updated = list.map(rec => {
          if (
            (savedBackendRecord?.id && String(rec?.id) === String(savedBackendRecord.id)) ||
            (rec?.status === 'pending' &&
              (normalizeKey(rec?.title) === normKey ||
                (normWhatKey && normalizeKey(rec?.title) === normWhatKey)))
          ) {
            matched = true;
            return { ...rec, ...optimisticRecord, status: 'completed', performed_at: nowIso };
          }
          return rec;
        });
        const nextMaint = matched ? updated : [optimisticRecord, ...updated];
        if (activeVehicleId && vehicleDataMemoryCache.has(activeVehicleId)) {
          const prevSnap = vehicleDataMemoryCache.get(activeVehicleId);
          vehicleDataMemoryCache.set(activeVehicleId, {
            ...prevSnap,
            maintenanceRecords: nextMaint,
          });
        }
        return nextMaint;
      });

      setServiceHistory(prev => {
        const list = Array.isArray(prev) ? prev : [];
        const exists = list.some(
          rec =>
            (optimisticRecord.id && String(rec?.id) === String(optimisticRecord.id)) ||
            normalizeKey(rec?.title) === normKey,
        );
        const nextServices = exists ? list : [optimisticRecord, ...list];
        if (activeVehicleId && vehicleDataMemoryCache.has(activeVehicleId)) {
          const prevSnap = vehicleDataMemoryCache.get(activeVehicleId);
          vehicleDataMemoryCache.set(activeVehicleId, {
            ...prevSnap,
            serviceHistory: nextServices,
          });
        }
        return nextServices;
      });

      DeviceEventEmitter.emit('vehicleHealthChanged');

      const isDiag = typeof item === 'object' && item.source === 'diagnostic';
      activityService.addActivity({
        type: 'maintenance_completed',
        title: isDiag ? 'Diagnostic Maintenance Completed' : 'Maintenance Completed',
        description: isDiag
          ? `Completed "${title}" based on a recent diagnosis.`
          : `Marked "${title}" as completed.`,
        vehicleId: activeVehicleId,
        vehicleName: vehicleProfile?.name || vehicleProfile?.make || 'Active Vehicle',
        userId,
        metadata: {
          maintenanceId: id,
          diagnosisId: typeof item === 'object' ? item.diagnosisId : null,
          categoryId: typeof item === 'object' ? mapItemToCategoryId(item, vehicleProfile) : null,
        },
      });

      return true;
    },
    [saveCompletedState, activeVehicleId, vehicleProfile, isAuthenticated, userId, maintenanceRecords],
  );

  // Undo completed item across all screens and AsyncStorage
  const undo = useCallback(
    async itemOrId => {
      if (!itemOrId) return;
      const id = typeof itemOrId === 'object' ? itemOrId.id : itemOrId;
      const title = typeof itemOrId === 'object' ? itemOrId.title : null;
      const normKey = title
        ? normalizeKey(title)
        : (typeof itemOrId === 'string' ? normalizeKey(itemOrId) : null);

      if (isAuthenticated && activeVehicleId && title) {
        const record = maintenanceRecords
          .filter(entry => String(entry.title || '').trim().toLowerCase() === String(title).trim().toLowerCase() && entry.status === 'completed')
          .sort((a, b) => new Date(b.performed_at || b.created_at || 0).getTime() - new Date(a.performed_at || a.created_at || 0).getTime())[0];
        if (record?.id) {
          try {
            await vehicleApi.updateMaintenanceRecord(record.id, { status: 'pending', performed_at: null });
          } catch (error) {
            Alert.alert('Could not reopen task', 'The completed maintenance record could not be updated. Please try again.');
            return false;
          }
        }
      }

      setLocalCompletedIds(prev => {
        const next = prev.filter(key => key !== String(id) && key !== normKey);
        saveCompletedState(next);
        return next;
      });
      DeviceEventEmitter.emit('vehicleHealthChanged');

      activityService.addActivity({
        type: 'maintenance_undone',
        title: 'Maintenance Reopened',
        description: title ? `Reopened "${title}".` : 'Reopened completed maintenance item.',
        vehicleId: activeVehicleId,
        vehicleName: vehicleProfile?.name || vehicleProfile?.make || 'Active Vehicle',
        userId,
      });
    },
    [saveCompletedState, activeVehicleId, vehicleProfile, userId, isAuthenticated, maintenanceRecords],
  );

  // Categorized Items
  const todoItems = useMemo(
    () => allRecommendations.filter(item => !isRecommendationCompleted(item)),
    [allRecommendations, isRecommendationCompleted],
  );

  // History Items for Active Vehicle
  const historyItems = useMemo(() => {
    const completedRecs = allRecommendations.filter(item => isRecommendationCompleted(item));
    const merged = [...completedRecs, ...effectiveServiceHistory];

    merged.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return merged;
  }, [allRecommendations, isRecommendationCompleted, effectiveServiceHistory]);

  const diagnosticItems = useMemo(
    () => todoItems.filter(item => item.source === 'diagnostic'),
    [todoItems],
  );

  const preventiveItems = useMemo(
    () => todoItems.filter(item => item.source === 'preventive'),
    [todoItems],
  );

  const urgentDiagnosticItems = useMemo(
    () => diagnosticItems.filter(item => item.priority === 'Urgent'),
    [diagnosticItems],
  );

  const overdueCount = urgentDiagnosticItems.length;
  const dueSoonCount = preventiveItems.length;
  const completedCount = historyItems.length;

  // Group Recommendations into AI-Diagnostic-Driven Categories
  const groupedCategories = useMemo(() => {
    const hasDiagnostics = diagnosticRecommendations.length > 0;
    const activeCategoriesMap = new Map();

    if (hasDiagnostics) {
      diagnosticRecommendations.forEach(item => {
        const catObj = getCategoryFromDiagnosticItem(item, vehicleProfile);
        if (catObj && catObj.id && !activeCategoriesMap.has(catObj.id)) {
          activeCategoriesMap.set(catObj.id, catObj);
        }
      });
    }

    if (activeCategoriesMap.size === 0) {
      const fallbackList = getVehicleMaintenanceCategories(vehicleProfile);
      fallbackList.forEach(cat => activeCategoriesMap.set(cat.id, cat));
    }

    const categoryList = Array.from(activeCategoriesMap.values()).map(cat => {
      const catItems = allRecommendations.filter(item => {
        const itemCat = getCategoryFromDiagnosticItem(item, vehicleProfile);
        return itemCat.id === cat.id;
      });

      const catTodoItems = catItems.filter(item => !isRecommendationCompleted(item));
      const catHistoryItems = catItems.filter(item => isRecommendationCompleted(item));
      const catDiagnosticItems = catTodoItems.filter(item => item.source === 'diagnostic');
      const catUrgentItems = catDiagnosticItems.filter(item => item.priority === 'Urgent');

      let statusBadge = 'UP TO DATE';
      let statusColor = '#32D583';
      let isDiagnostic = false;
      let sortPriority = 4;

      if (catUrgentItems.length > 0) {
        statusBadge = 'DIAGNOSTIC';
        statusColor = '#FF5A5F';
        isDiagnostic = true;
        sortPriority = 1;
      } else if (catDiagnosticItems.length > 0) {
        statusBadge = 'DIAGNOSTIC';
        statusColor = '#F63B05';
        isDiagnostic = true;
        sortPriority = 2;
      } else if (catTodoItems.length > 0) {
        statusBadge = 'PREVENTIVE';
        statusColor = '#D6A23A';
        sortPriority = 3;
      } else {
        statusBadge = 'UP TO DATE';
        statusColor = '#32D583';
        sortPriority = 4;
      }

      return {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        isDiagnostic,
        diagnosticCount: catDiagnosticItems.length,
        todoCount: catTodoItems.length,
        itemCount: catItems.length,
        statusBadge,
        statusColor,
        sortPriority,
        items: catItems,
        todoItems: catTodoItems,
        historyItems: catHistoryItems,
        diagnosticItems: catDiagnosticItems,
        diagnostics: catDiagnosticItems.map(d => ({
          id: d.id,
          problem: d.relatedProblem || d.title,
          title: d.title,
          date: d.createdAt,
        })),
        recommendations: catItems.map(r => ({
          title: r.title,
          reason: r.source === 'diagnostic'
            ? `Previous VehiCare diagnosis indicated ${r.relatedProblem || r.title}`
            : r.description,
          priority: r.priority,
        })),
      };
    });

    categoryList.sort((a, b) => a.sortPriority - b.sortPriority);

    return categoryList;
  }, [vehicleProfile, diagnosticRecommendations, allRecommendations, isRecommendationCompleted]);

  // Determine active unresolved diagnostics for the currently selected vehicle
  const activeUnresolvedDiags = useMemo(() => {
    return (effectiveDiagnostics || []).filter(d => {
      const diagIdStr = String(d.id);
      const isRepaired = (effectiveRepairRecords || []).some(
        r => String(r.diagnostic_id || r.diagnosticId) === diagIdStr && (r.status || 'completed') === 'completed',
      );
      if (isRepaired) return false;

      const isCompletedInMaint = (effectiveMaintenanceRecords || []).some(
        m => String(m.diagnostic_id || m.diagnosticId) === diagIdStr && m.status === 'completed',
      );
      if (isCompletedInMaint) return false;

      const tasksForDiag = (diagnosticRecommendations || []).filter(
        t => t.diagnosisId && String(t.diagnosisId) === diagIdStr,
      );
      if (tasksForDiag.length > 0 && tasksForDiag.every(t => isRecommendationCompleted(t))) {
        return false;
      }

      return true;
    });
  }, [
    effectiveDiagnostics,
    effectiveRepairRecords,
    effectiveMaintenanceRecords,
    diagnosticRecommendations,
    isRecommendationCompleted,
  ]);

  const overdueMaintenanceTasks = useMemo(() => {
    const now = Date.now();
    return (effectiveMaintenanceRecords || []).filter(
      r => r.status === 'pending' && r.due_date && new Date(r.due_date).getTime() < now,
    );
  }, [effectiveMaintenanceRecords]);

  const calculatedScore = useMemo(() => {
    // If backend profile provides an authoritative vehicle health score, use it
    if (typeof vehicleInitialScore === 'number' && !isNaN(vehicleInitialScore)) {
      const activeUrgentDiags = activeUnresolvedDiags.filter(d => {
        const sev = String(d.severity || '').toLowerCase();
        return sev === 'high' || sev === 'critical' || sev === 'urgent';
      });
      if (activeUrgentDiags.length > 0) {
        return Math.min(vehicleInitialScore, 55);
      }
      return vehicleInitialScore;
    }

    if (activeUnresolvedDiags.length === 0) {
      const bonus = Math.min(6, completedCount * 2);
      const baseScore = Math.min(100, 94 + bonus);
      if (overdueMaintenanceTasks.length === 0) return baseScore;
      return Math.max(65, baseScore - overdueMaintenanceTasks.length * 6);
    }

    let penalty = 0;
    activeUnresolvedDiags.forEach(d => {
      const sev = String(d.severity || '').toLowerCase();
      if (sev === 'high' || sev === 'critical' || sev === 'urgent') {
        penalty += 25;
      } else if (sev === 'medium' || sev === 'moderate') {
        penalty += 14;
      } else {
        penalty += 8;
      }
    });

    if (overdueMaintenanceTasks.length > 0) {
      penalty += overdueMaintenanceTasks.length * 5;
    }

    return Math.max(25, Math.min(92, 100 - penalty));
  }, [vehicleInitialScore, activeUnresolvedDiags, overdueMaintenanceTasks, completedCount]);

  // Calculate Maintenance Health & Status for Active Vehicle
  // Colors dynamically scale with the health score (higher health = better color),
  // while the badge reflects the active vehicle's real condition.
  const healthStatus = useMemo(() => {
    const urgentDiags = activeUnresolvedDiags.filter(d => {
      const sev = String(d.severity || '').toLowerCase();
      return sev === 'high' || sev === 'critical' || sev === 'urgent';
    });

    const dynamicColor = getHealthScoreColor(calculatedScore);

    if (urgentDiags.length > 0 || calculatedScore < 40) {
      return {
        label: 'Needs Immediate Attention',
        code: 'CRITICAL',
        color: dynamicColor,
        icon: 'warning',
        explanation:
          urgentDiags.length > 0
            ? `${urgentDiags.length} critical issue${urgentDiags.length === 1 ? '' : 's'} identified from recent diagnostic results`
            : 'Immediate vehicle inspection recommended.',
      };
    }

    if (activeUnresolvedDiags.length > 0 || calculatedScore < 60) {
      return {
        label: 'Needs Attention',
        code: 'ATTENTION',
        color: dynamicColor,
        icon: 'report-problem',
        explanation:
          activeUnresolvedDiags.length > 0
            ? `${activeUnresolvedDiags.length} item${activeUnresolvedDiags.length > 1 ? 's' : ''} need attention based on diagnostic history`
            : 'Inspection recommended based on current vehicle health.',
      };
    }

    if (overdueMaintenanceTasks.length > 0 || calculatedScore < 80) {
      return {
        label: 'Maintenance Due Soon',
        code: 'GOOD',
        color: dynamicColor,
        icon: 'schedule',
        explanation:
          overdueMaintenanceTasks.length > 0
            ? `${overdueMaintenanceTasks.length} scheduled maintenance item${overdueMaintenanceTasks.length > 1 ? 's' : ''} due for service`
            : 'Routine maintenance approaching service interval.',
      };
    }

    return {
      label: 'Optimal',
      code: 'OPTIMAL',
      color: dynamicColor,
      icon: 'check-circle',
      explanation: 'All vehicle systems are checked and running normally.',
    };
  }, [activeUnresolvedDiags, overdueMaintenanceTasks, calculatedScore]);

  const maintenanceHealth = useMemo(() => {
    if (isCurrentVehicleLoaded && (initialDiagnosticsLoaded || !loadingDiagnostics)) {
      return calculatedScore;
    }
    if (activeVehicleId && healthScoreMemoryCache.has(activeVehicleId)) {
      const memScore = healthScoreMemoryCache.get(activeVehicleId);
      if (typeof memScore === 'number') {
        return memScore;
      }
    }
    if (typeof cachedHealthScore === 'number') {
      return cachedHealthScore;
    }
    if (typeof vehicleInitialScore === 'number') {
      return vehicleInitialScore;
    }
    return calculatedScore;
  }, [
    isCurrentVehicleLoaded,
    initialDiagnosticsLoaded,
    loadingDiagnostics,
    activeVehicleId,
    cachedHealthScore,
    vehicleInitialScore,
    calculatedScore,
  ]);

  // Keep memory and persistent health cache updated
  useEffect(() => {
    if (isCurrentVehicleLoaded && !loadingDiagnostics && initialDiagnosticsLoaded && activeVehicleId && typeof calculatedScore === 'number') {
      healthScoreMemoryCache.set(activeVehicleId, calculatedScore);
      AsyncStorage.setItem(`@vehicare_cached_health_${activeVehicleId}`, String(calculatedScore)).catch(() => {});
    }
  }, [isCurrentVehicleLoaded, loadingDiagnostics, initialDiagnosticsLoaded, activeVehicleId, calculatedScore]);

  const resolvedTasks = useMemo(
    () => maintenanceTasks.filter(item => item.isResolved),
    [maintenanceTasks],
  );

  // Accurate loading flag: stays true while vehicle or initial vehicle diagnostics are loading
  const loading = Boolean(
    vehicleLoading ||
    (Boolean(vehicleProfile) && (!initialDiagnosticsLoaded || loadingDiagnostics))
  );

  return {
    vehicleProfile: vehicleProfile || null,
    activeVehicleId: activeVehicleId || null,
    maintenanceTasks: Array.isArray(maintenanceTasks) ? maintenanceTasks : [],
    smartRecommendations: Array.isArray(smartRecommendations) ? smartRecommendations : [],
    resolvedTasks: Array.isArray(resolvedTasks) ? resolvedTasks : [],
    repairRecords: Array.isArray(effectiveRepairRecords) ? effectiveRepairRecords : [],
    allRecommendations: Array.isArray(allRecommendations) ? allRecommendations : [],
    todoItems: Array.isArray(todoItems) ? todoItems : [],
    diagnosticItems: Array.isArray(diagnosticItems) ? diagnosticItems : [],
    preventiveItems: Array.isArray(preventiveItems) ? preventiveItems : [],
    urgentDiagnosticItems: Array.isArray(urgentDiagnosticItems) ? urgentDiagnosticItems : [],
    historyItems: Array.isArray(historyItems) ? historyItems : [],
    serviceHistory: Array.isArray(effectiveServiceHistory) ? effectiveServiceHistory : [],
    maintenanceRecords: Array.isArray(effectiveMaintenanceRecords) ? effectiveMaintenanceRecords : [],
    groupedCategories: Array.isArray(groupedCategories) ? groupedCategories : [],
    diagnostics: Array.isArray(effectiveDiagnostics) ? effectiveDiagnostics : [],
    dueSoonCount: Number.isInteger(dueSoonCount) ? dueSoonCount : 0,
    overdueCount: Number.isInteger(overdueCount) ? overdueCount : 0,
    completedCount: Number.isInteger(completedCount) ? completedCount : 0,
    healthStatus: healthStatus || DEFAULT_HEALTH_STATUS,
    maintenanceHealth: typeof maintenanceHealth === 'number' ? maintenanceHealth : null,
    healthScore: typeof maintenanceHealth === 'number' ? maintenanceHealth : null,
    healthPercentage: typeof maintenanceHealth === 'number' ? Math.min(100, Math.max(0, Math.round(maintenanceHealth))) : null,
    loading,
    initialDiagnosticsLoaded: !!initialDiagnosticsLoaded,
    loadingDiagnostics: !!loadingDiagnostics,
    refresh: fetchVehicleDiagnostics,
    refreshVehicleHealth: fetchVehicleDiagnostics,
    completedRecommendationIds: completedIdsSet,
    isRecommendationCompleted,
    markAsDone,
    undo,
  };
};

/** Read the shared vehicle-health state provided by the app shell. */
export const useMaintenanceRecommendations = () => {
  const context = useContext(VehicleHealthContext);
  if (!context || context.allRecommendations === undefined) {
    throw new Error('useMaintenanceRecommendations must be used inside VehicleHealthProvider');
  }
  return context;
};

export default useMaintenanceRecommendations;
