import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import vehicleApi from '../api/vehicleApi';
import { useAuth } from '../context/AuthContext';
import { useVehicle } from '../context/VehicleContext';
import { getHistoryStorageKey } from '../services/storageService';
import {
  extractDiagnosticRecommendations,
  getCategoryFromDiagnosticItem,
  getVehicleMaintenanceCategories,
  getVehicleRecommendations,
  mapItemToCategoryId,
  mergeRecommendations,
} from '../utils/maintenanceUtils';
import activityService from '../services/activity.service';

const DEFAULT_HEALTH_STATUS = {
  label: 'Looking Good',
  code: 'HEALTHY',
  color: '#32D583',
  icon: 'check-circle',
  explanation: 'No recent diagnostic issues found. VehiCare will continue to provide preventive maintenance recommendations based on your vehicle.',
};

export const useMaintenanceRecommendations = () => {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id || user?.uid || null;
  const { activeVehicle, pendingVehicle, loading: vehicleLoading } = useVehicle();
  const vehicleProfile = activeVehicle || pendingVehicle;

  const activeVehicleId = useMemo(() => {
    const rawId = vehicleProfile?.id ?? vehicleProfile?.vehicle_id ?? null;
    return rawId !== null ? String(rawId) : null;
  }, [vehicleProfile]);

  const storageKey = useMemo(() => {
    return activeVehicleId
      ? `@vehicare_completed_maintenance_${activeVehicleId}`
      : '@vehicare_completed_maintenance';
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
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [localCompletedIds, setLocalCompletedIds] = useState([]);

  // Load completed maintenance items for active vehicle
  useEffect(() => {
    let isCancelled = false;
    const loadCompletedState = async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (!isCancelled) {
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              setLocalCompletedIds(parsed);
              return;
            }
          }
          setLocalCompletedIds([]);
        }
      } catch (err) {
        console.warn('Failed to load vehicle completed maintenance state:', err);
      }
    };

    loadCompletedState();
    return () => {
      isCancelled = true;
    };
  }, [storageKey]);

  // Save completed maintenance items for active vehicle
  const saveCompletedState = async updatedIds => {
    try {
      setLocalCompletedIds(updatedIds);
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedIds));
    } catch (err) {
      console.warn('Failed to save vehicle completed maintenance state:', err);
    }
  };

  // Fetch diagnostics and service history scoped strictly to active vehicle
  const fetchVehicleDiagnostics = useCallback(async () => {
    if (!vehicleProfile) {
      setDiagnostics([]);
      setServiceHistory([]);
      setLoadingDiagnostics(false);
      return;
    }

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

      // Step 2: Background API sync (1.5s timeout)
      if (isAuthenticated) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Diagnostics timeout')), 1500),
          );

          const apiDiags = await Promise.race([
            vehicleApi.getDiagnosticsHistory(),
            timeoutPromise,
          ]);

          if (Array.isArray(apiDiags) && apiDiags.length > 0) {
            const apiFiltered = filterByVehicle(apiDiags);
            setDiagnostics(apiFiltered);
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
  }, [vehicleProfile, activeVehicleId, isAuthenticated]);

  useEffect(() => {
    fetchVehicleDiagnostics();
  }, [fetchVehicleDiagnostics]);

  // Compute recommendations for active vehicle
  const baselineRecommendations = useMemo(
    () => getVehicleRecommendations(vehicleProfile),
    [vehicleProfile],
  );

  const diagnosticRecommendations = useMemo(
    () => extractDiagnosticRecommendations(diagnostics),
    [diagnostics],
  );

  const allRecommendations = useMemo(
    () => mergeRecommendations(diagnosticRecommendations, baselineRecommendations),
    [diagnosticRecommendations, baselineRecommendations],
  );

  // Set of completed item IDs for active vehicle
  const completedIdsSet = useMemo(() => {
    const ids = new Set(localCompletedIds);

    if (Array.isArray(hookCompletedRecs)) {
      hookCompletedRecs.forEach(item => {
        if (typeof item === 'string') {
          ids.add(item);
        } else if (item && typeof item === 'object') {
          if (item.id) ids.add(item.id);
          else if (item.recommendationId) ids.add(item.recommendationId);
        }
      });
    }

    return ids;
  }, [localCompletedIds, hookCompletedRecs]);

  // Mark item as completed
  const markAsDone = useCallback(
    item => {
      const id = item?.id || item;
      if (!id) return;
      setLocalCompletedIds(prev => {
        const updated = Array.from(new Set([...prev, id]));
        saveCompletedState(updated);
        return updated;
      });

      const title = typeof item === 'object' ? item.title : 'Maintenance item';
      const isDiag = typeof item === 'object' && item.source === 'diagnostic';

      activityService.addActivity({
        type: 'maintenance_completed',
        title: isDiag ? `Diagnostic Maintenance Completed` : `Maintenance Completed`,
        description: isDiag
          ? `Completed "${title}" based on a recent diagnosis.`
          : `Marked "${title}" as completed.`,
        vehicleId: activeVehicleId,
        vehicleName: vehicleProfile?.name || vehicleProfile?.make || 'Active Vehicle',
        metadata: {
          maintenanceId: id,
          diagnosisId: typeof item === 'object' ? item.diagnosisId : null,
          categoryId: typeof item === 'object' ? mapItemToCategoryId(item, vehicleProfile) : null,
        },
      });
    },
    [saveCompletedState, activeVehicleId, vehicleProfile],
  );

  // Undo completed item
  const undo = useCallback(
    itemId => {
      if (!itemId) return;
      setLocalCompletedIds(prev => {
        const updated = prev.filter(id => id !== itemId);
        saveCompletedState(updated);
        return updated;
      });

      activityService.addActivity({
        type: 'maintenance_undone',
        title: 'Maintenance Reopened',
        description: 'Reopened completed maintenance item.',
        vehicleId: activeVehicleId,
        vehicleName: vehicleProfile?.name || vehicleProfile?.make || 'Active Vehicle',
      });
    },
    [saveCompletedState, activeVehicleId, vehicleProfile],
  );

  // Categorized Items
  const todoItems = useMemo(
    () => allRecommendations.filter(item => !completedIdsSet.has(item.id)),
    [allRecommendations, completedIdsSet],
  );

  // History Items for Active Vehicle
  const historyItems = useMemo(() => {
    const completedRecs = allRecommendations.filter(item => completedIdsSet.has(item.id));
    const merged = [...completedRecs, ...serviceHistory];

    merged.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return merged;
  }, [allRecommendations, completedIdsSet, serviceHistory]);

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
      // 1. PRIMARY SOURCE: Build categories strictly from AI diagnostic recommendations!
      diagnosticRecommendations.forEach(item => {
        const catObj = getCategoryFromDiagnosticItem(item, vehicleProfile);
        if (catObj && catObj.id && !activeCategoriesMap.has(catObj.id)) {
          activeCategoriesMap.set(catObj.id, catObj);
        }
      });
    }

    // 2. FALLBACK / PREVENTIVE: If no diagnostic categories exist, use vehicle-type baseline
    if (activeCategoriesMap.size === 0) {
      const fallbackList = getVehicleMaintenanceCategories(vehicleProfile);
      fallbackList.forEach(cat => activeCategoriesMap.set(cat.id, cat));
    }

    // 3. Build rich category structure for UI
    const categoryList = Array.from(activeCategoriesMap.values()).map(cat => {
      const catItems = allRecommendations.filter(item => {
        const itemCat = getCategoryFromDiagnosticItem(item, vehicleProfile);
        return itemCat.id === cat.id;
      });

      const catTodoItems = catItems.filter(item => !completedIdsSet.has(item.id));
      const catHistoryItems = catItems.filter(item => completedIdsSet.has(item.id));
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
  }, [vehicleProfile, diagnosticRecommendations, allRecommendations, completedIdsSet]);

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

  const maintenanceHealth = useMemo(() => {
    if (diagnosticItems.length === 0 && preventiveItems.length === 0) return 100;
    if (allRecommendations.length === 0) return 100;
    const penalty =
      urgentDiagnosticItems.length * 20 +
      (diagnosticItems.length - urgentDiagnosticItems.length) * 10 +
      preventiveItems.length * 4;
    return Math.max(25, Math.min(100, 100 - penalty));
  }, [allRecommendations.length, urgentDiagnosticItems, diagnosticItems, preventiveItems]);

  return {
    vehicleProfile: vehicleProfile || null,
    activeVehicleId: activeVehicleId || null,
    allRecommendations: Array.isArray(allRecommendations) ? allRecommendations : [],
    todoItems: Array.isArray(todoItems) ? todoItems : [],
    diagnosticItems: Array.isArray(diagnosticItems) ? diagnosticItems : [],
    preventiveItems: Array.isArray(preventiveItems) ? preventiveItems : [],
    urgentDiagnosticItems: Array.isArray(urgentDiagnosticItems) ? urgentDiagnosticItems : [],
    historyItems: Array.isArray(historyItems) ? historyItems : [],
    groupedCategories: Array.isArray(groupedCategories) ? groupedCategories : [],
    diagnostics: Array.isArray(diagnostics) ? diagnostics : [],
    dueSoonCount: Number.isInteger(dueSoonCount) ? dueSoonCount : 0,
    overdueCount: Number.isInteger(overdueCount) ? overdueCount : 0,
    completedCount: Number.isInteger(completedCount) ? completedCount : 0,
    healthStatus: healthStatus || DEFAULT_HEALTH_STATUS,
    maintenanceHealth: typeof maintenanceHealth === 'number' ? maintenanceHealth : 100,
    loading: !vehicleProfile && (loadingDiagnostics || vehicleLoading),
    loadingDiagnostics: !!loadingDiagnostics,
    refresh: fetchVehicleDiagnostics,
    markAsDone,
    undo,
  };
};

export default useMaintenanceRecommendations;
