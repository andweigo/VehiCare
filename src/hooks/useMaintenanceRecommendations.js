import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import vehicleApi from '../api/vehicleApi';
import { useAuth } from '../context/AuthContext';
import { useVehicle } from '../context/VehicleContext';
import { VehicleHealthContext } from '../context/VehicleHealthContext';
import { getHistoryStorageKey } from '../services/storageService';
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
  label: 'Looking Good',
  code: 'HEALTHY',
  color: '#32D583',
  icon: 'check-circle',
  explanation: 'No recent diagnostic issues found. VehiCare will continue to provide preventive maintenance recommendations based on your vehicle.',
};

// Global in-memory cache to prevent flickering during vehicle switching
const healthScoreMemoryCache = new Map();

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
  const [repairRecords, setRepairRecords] = useState([]);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [localCompletedIds, setLocalCompletedIds] = useState([]);

  // In-memory / storage cached health score to prevent initial flash to 100
  const [cachedHealthScore, setCachedHealthScore] = useState(() => {
    if (activeVehicleId && healthScoreMemoryCache.has(activeVehicleId)) {
      return healthScoreMemoryCache.get(activeVehicleId);
    }
    return null;
  });

  useEffect(() => {
    let isCancelled = false;
    if (!activeVehicleId) {
      setCachedHealthScore(null);
      return;
    }
    if (healthScoreMemoryCache.has(activeVehicleId)) {
      setCachedHealthScore(healthScoreMemoryCache.get(activeVehicleId));
    } else {
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
  }, [activeVehicleId]);

  // Load completed maintenance items for active vehicle
  useEffect(() => {
    let isCancelled = false;
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
    if (!vehicleProfile) {
      setDiagnostics([]);
      setServiceHistory([]);
      setRepairRecords([]);
      setLoadingDiagnostics(false);
      return;
    }

    setLoadingDiagnostics(true);

    const filterByVehicle = list =>
      (list || []).filter(item => {
        const itemVid =
          item.vehicle_id ??
          item.vehicleId ??
          item.vehicle?.id ??
          item.vehicle?.vehicle_id ??
          null;

        if (activeVehicleId !== null && itemVid !== null) {
          return String(itemVid) === String(activeVehicleId);
        }
        return true;
      });

    try {
      // Step 1: Read local history INSTANTLY (< 5ms)
      let localRecords = [];
      let localServices = [];
      try {
        const localStr = await AsyncStorage.getItem(getHistoryStorageKey(userId));
        if (localStr) {
          const parsed = JSON.parse(localStr);
          if (Array.isArray(parsed)) {
            localRecords = parsed.filter(
              item => item.type === 'diagnosis' || item.diagnosisData || item.symptoms,
            );
            localServices = parsed.filter(
              item => item.type === 'maintenance' || item.type === 'service' || item.serviceType || item.cost,
            );
          }
        }
      } catch (err) {
        console.warn('Local storage error reading history:', err?.message);
      }

      const initialFiltered = filterByVehicle(localRecords);
      const initialServices = filterByVehicle(localServices);

      setServiceHistory(initialServices);
      setDiagnostics(initialFiltered);

      // Step 2: Background API sync (2.0s timeout)
      if (isAuthenticated) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Diagnostics sync timeout')), 2000),
          );

          const [apiDiags, apiRepairs, apiMaintenance] = await Promise.race([
            Promise.all([
              vehicleApi.getDiagnosticsHistory(),
              activeVehicleId ? vehicleApi.getRepairRecords({ vehicle_id: activeVehicleId }) : Promise.resolve([]),
              activeVehicleId ? vehicleApi.getMaintenanceRecords({ vehicle_id: activeVehicleId }) : Promise.resolve([]),
            ]),
            timeoutPromise,
          ]);

          if (Array.isArray(apiDiags) && apiDiags.length > 0) {
            setDiagnostics(filterByVehicle(apiDiags));
          }
          if (Array.isArray(apiRepairs) && apiRepairs.length > 0) {
            setRepairRecords(filterByVehicle(apiRepairs));
          }
          if (Array.isArray(apiMaintenance) && apiMaintenance.length > 0) {
            const completedBackendServices = filterByVehicle(apiMaintenance).filter(
              m => (m.status || 'completed') === 'completed'
            );
            if (completedBackendServices.length > 0) {
              setServiceHistory(prev => {
                const combined = [...prev, ...completedBackendServices];
                const seenIds = new Set();
                return combined.filter(item => {
                  const id = item.id || `${item.title}-${item.created_at}`;
                  if (seenIds.has(id)) return false;
                  seenIds.add(id);
                  return true;
                });
              });
            }
          }
        } catch (err) {
          console.warn('Silent API diagnostics check:', err?.message);
        }
      }
    } catch (error) {
      console.warn('Error loading vehicle diagnostics:', error?.message);
    } finally {
      setLoadingDiagnostics(false);
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
    () => extractMaintenanceTasks(diagnostics, repairRecords, vehicleProfile),
    [diagnostics, repairRecords, vehicleProfile],
  );

  // Distinct Smart Recommendations (Educational & Preventive Habits)
  const smartRecommendations = useMemo(
    () => extractSmartRecommendations(diagnostics, repairRecords, vehicleProfile),
    [diagnostics, repairRecords, vehicleProfile],
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
          if (item.recommendationId) {
            ids.add(String(item.recommendationId));
          }
        }
      });
    }

    return ids;
  }, [localCompletedIds, hookCompletedRecs]);

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
        if (itemOrId.id && completedIdsSet.has(String(itemOrId.id))) return true;
        if (itemOrId.title) {
          const norm = normalizeKey(itemOrId.title);
          if (norm && completedIdsSet.has(norm)) return true;
        }
        if (itemOrId.recommendationId && completedIdsSet.has(String(itemOrId.recommendationId))) return true;
      }
      return false;
    },
    [completedIdsSet],
  );

  // Mark item as completed across all screens, AsyncStorage, and backend
  const markAsDone = useCallback(
    async item => {
      const id = typeof item === 'object' ? item.id : item;
      if (!id) return;
      const title = typeof item === 'object' ? item.title : String(item);
      const normKey = title ? normalizeKey(title) : null;

      const keysToAdd = [String(id)];
      if (normKey) keysToAdd.push(normKey);

      setLocalCompletedIds(prev => {
        const next = Array.from(new Set([...prev, ...keysToAdd]));
        saveCompletedState(next);
        DeviceEventEmitter.emit('vehicleHealthChanged');
        return next;
      });

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

      if (isAuthenticated && activeVehicleId) {
        try {
          const numVehicleId = parseInt(activeVehicleId, 10);
          if (!isNaN(numVehicleId)) {
            await vehicleApi.createMaintenanceRecord({
              vehicle_id: numVehicleId,
              diagnostic_id: typeof item === 'object' && item.diagnosisId && !isNaN(parseInt(item.diagnosisId, 10))
                ? parseInt(item.diagnosisId, 10)
                : null,
              title: title,
              description: typeof item === 'object' ? item.description : null,
              service_type: typeof item === 'object' && item.serviceType ? item.serviceType : 'General Inspection',
              status: 'completed',
              performed_at: new Date().toISOString(),
              urgency: typeof item === 'object' && item.priority ? item.priority : 'Routine',
              is_inspection: typeof item === 'object' ? Boolean(item.isInspection) : true,
            });
          }
        } catch (backendErr) {
          console.warn('Backend maintenance record persistence notice:', backendErr?.message);
        }
      }
    },
    [saveCompletedState, activeVehicleId, vehicleProfile, isAuthenticated, userId],
  );

  // Undo completed item across all screens and AsyncStorage
  const undo = useCallback(
    itemOrId => {
      if (!itemOrId) return;
      const id = typeof itemOrId === 'object' ? itemOrId.id : itemOrId;
      const title = typeof itemOrId === 'object' ? itemOrId.title : null;
      const normKey = title
        ? normalizeKey(title)
        : (typeof itemOrId === 'string' ? normalizeKey(itemOrId) : null);

      setLocalCompletedIds(prev => {
        const next = prev.filter(key => key !== String(id) && key !== normKey);
        saveCompletedState(next);
        DeviceEventEmitter.emit('vehicleHealthChanged');
        return next;
      });

      activityService.addActivity({
        type: 'maintenance_undone',
        title: 'Maintenance Reopened',
        description: title ? `Reopened "${title}".` : 'Reopened completed maintenance item.',
        vehicleId: activeVehicleId,
        vehicleName: vehicleProfile?.name || vehicleProfile?.make || 'Active Vehicle',
        userId,
      });
    },
    [saveCompletedState, activeVehicleId, vehicleProfile, userId],
  );

  // Categorized Items
  const todoItems = useMemo(
    () => allRecommendations.filter(item => !isRecommendationCompleted(item)),
    [allRecommendations, isRecommendationCompleted],
  );

  // History Items for Active Vehicle
  const historyItems = useMemo(() => {
    const completedRecs = allRecommendations.filter(item => isRecommendationCompleted(item));
    const merged = [...completedRecs, ...serviceHistory];

    merged.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return merged;
  }, [allRecommendations, isRecommendationCompleted, serviceHistory]);

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

  // Calculate Maintenance Health & Status for Active Vehicle
  const healthStatus = useMemo(() => {
    if (urgentDiagnosticItems.length > 0) {
      return {
        label: 'Needs Immediate Attention',
        code: 'CRITICAL',
        color: '#FF5A5F',
        icon: 'warning',
        explanation: `${urgentDiagnosticItems.length} critical issue found from recent diagnostic results`,
      };
    }
    if (diagnosticItems.length > 0) {
      return {
        label: 'Needs Attention',
        code: 'ATTENTION',
        color: '#F63B05',
        icon: 'report-problem',
        explanation: `${diagnosticItems.length} item${
          diagnosticItems.length > 1 ? 's' : ''
        } need your attention based on recent diagnostics`,
      };
    }
    if (preventiveItems.length > 0) {
      return {
        label: 'Maintenance Due Soon',
        code: 'DUE_SOON',
        color: '#D6A23A',
        icon: 'schedule',
        explanation: `${preventiveItems.length} routine maintenance item${
          preventiveItems.length > 1 ? 's' : ''
        } due soon`,
      };
    }
    return DEFAULT_HEALTH_STATUS;
  }, [urgentDiagnosticItems, diagnosticItems, preventiveItems]);

  const calculatedScore = useMemo(() => {
    if (diagnosticItems.length === 0 && preventiveItems.length === 0) return 100;
    if (allRecommendations.length === 0) return 100;
    const penalty =
      urgentDiagnosticItems.length * 20 +
      (diagnosticItems.length - urgentDiagnosticItems.length) * 10 +
      preventiveItems.length * 4;
    return Math.max(25, Math.min(100, 100 - penalty));
  }, [allRecommendations.length, urgentDiagnosticItems, diagnosticItems, preventiveItems]);

  const maintenanceHealth = useMemo(() => {
    // While initial diagnostics are loading for active vehicle, use cached score to prevent 100% flash
    if (loadingDiagnostics && diagnostics.length === 0) {
      if (typeof cachedHealthScore === 'number') {
        return cachedHealthScore;
      }
      if (activeVehicleId && healthScoreMemoryCache.has(activeVehicleId)) {
        return healthScoreMemoryCache.get(activeVehicleId);
      }
    }
    return calculatedScore;
  }, [loadingDiagnostics, diagnostics.length, cachedHealthScore, activeVehicleId, calculatedScore]);

  // Keep memory and persistent health cache updated
  useEffect(() => {
    if (!loadingDiagnostics && activeVehicleId && typeof calculatedScore === 'number') {
      healthScoreMemoryCache.set(activeVehicleId, calculatedScore);
      AsyncStorage.setItem(`@vehicare_cached_health_${activeVehicleId}`, String(calculatedScore)).catch(() => {});
    }
  }, [loadingDiagnostics, activeVehicleId, calculatedScore]);

  const resolvedTasks = useMemo(
    () => maintenanceTasks.filter(item => item.isResolved),
    [maintenanceTasks],
  );

  // Accurate loading flag: stays true while vehicle or initial vehicle diagnostics are loading
  const loading = Boolean(vehicleLoading || (Boolean(vehicleProfile) && loadingDiagnostics && diagnostics.length === 0));

  return {
    vehicleProfile: vehicleProfile || null,
    activeVehicleId: activeVehicleId || null,
    maintenanceTasks: Array.isArray(maintenanceTasks) ? maintenanceTasks : [],
    smartRecommendations: Array.isArray(smartRecommendations) ? smartRecommendations : [],
    resolvedTasks: Array.isArray(resolvedTasks) ? resolvedTasks : [],
    repairRecords: Array.isArray(repairRecords) ? repairRecords : [],
    allRecommendations: Array.isArray(allRecommendations) ? allRecommendations : [],
    todoItems: Array.isArray(todoItems) ? todoItems : [],
    diagnosticItems: Array.isArray(diagnosticItems) ? diagnosticItems : [],
    preventiveItems: Array.isArray(preventiveItems) ? preventiveItems : [],
    urgentDiagnosticItems: Array.isArray(urgentDiagnosticItems) ? urgentDiagnosticItems : [],
    historyItems: Array.isArray(historyItems) ? historyItems : [],
    serviceHistory: Array.isArray(serviceHistory) ? serviceHistory : [],
    groupedCategories: Array.isArray(groupedCategories) ? groupedCategories : [],
    diagnostics: Array.isArray(diagnostics) ? diagnostics : [],
    dueSoonCount: Number.isInteger(dueSoonCount) ? dueSoonCount : 0,
    overdueCount: Number.isInteger(overdueCount) ? overdueCount : 0,
    completedCount: Number.isInteger(completedCount) ? completedCount : 0,
    healthStatus: healthStatus || DEFAULT_HEALTH_STATUS,
    maintenanceHealth: typeof maintenanceHealth === 'number' ? maintenanceHealth : 100,
    healthScore: typeof maintenanceHealth === 'number' ? maintenanceHealth : 100,
    healthPercentage: typeof maintenanceHealth === 'number' ? Math.min(100, Math.max(0, Math.round(maintenanceHealth))) : 100,
    loading,
    loadingDiagnostics: !!loadingDiagnostics,
    refresh: fetchVehicleDiagnostics,
    refreshVehicleHealth: fetchVehicleDiagnostics,
    completedRecommendationIds: completedIdsSet,
    isRecommendationCompleted,
    markAsDone,
    undo,
  };
};

/**
 * Public hook: prefers centralized context when inside VehicleHealthProvider,
 * falls back to internal hook when rendered in isolation (e.g. unit tests).
 */
export const useMaintenanceRecommendations = () => {
  const context = useContext(VehicleHealthContext);
  if (context && context.allRecommendations !== undefined) {
    return context;
  }
  return useMaintenanceRecommendationsInternal();
};

export default useMaintenanceRecommendations;
