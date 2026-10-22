import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext, useEffect, useMemo, useState } from 'react';
import { VehicleHealthContext } from '../context/VehicleHealthContext';
import {
  healthFactorsMemoryCache,
  useMaintenanceRecommendations,
} from './useMaintenanceRecommendations';

/**
 * Unified useVehicleHealth Hook
 * Provides synchronized vehicle health score, status, and recommendations
 * across Dashboard, Maintenance Screen, Smart Recommendations Screen, and Vehicle Health Details screen.
 */
const useVehicleHealth = () => {
  const context = useContext(VehicleHealthContext);
  const maintenance = (context && context.allRecommendations !== undefined)
    ? context
    : useMaintenanceRecommendations();

  const {
    activeVehicle,
    pendingVehicle,
    loading,
    maintenanceHealth,
    healthStatus: recHealthStatus,
    allRecommendations = [],
    diagnosticItems = [],
    urgentDiagnosticItems = [],
    preventiveItems = [],
    historyItems = [],
    completedRecommendationIds,
    isRecommendationCompleted,
    markAsDone,
    undo,
    refresh,
    refreshVehicleHealth,
  } = maintenance;

  const vehicleProfile = activeVehicle || pendingVehicle || null;

  const vehicleHealth = useMemo(() => {
    if (!vehicleProfile) return {};
    return (
      vehicleProfile.health ||
      vehicleProfile.vehicle_health ||
      vehicleProfile.vehicleHealth ||
      {}
    );
  }, [vehicleProfile]);

  const activeVehicleId = useMemo(() => {
    const rawId = vehicleProfile?.id ?? vehicleProfile?.vehicle_id ?? null;
    return rawId !== null ? String(rawId) : null;
  }, [vehicleProfile]);

  const [cachedFactors, setCachedFactors] = useState(() => {
    if (activeVehicleId && healthFactorsMemoryCache.has(activeVehicleId)) {
      return healthFactorsMemoryCache.get(activeVehicleId);
    }
    return null;
  });

  useEffect(() => {
    let isCancelled = false;
    if (!activeVehicleId) {
      setCachedFactors(null);
      return;
    }
    if (healthFactorsMemoryCache.has(activeVehicleId)) {
      setCachedFactors(healthFactorsMemoryCache.get(activeVehicleId));
    } else {
      AsyncStorage.getItem(`@vehicare_cached_factors_${activeVehicleId}`)
        .then(val => {
          if (!isCancelled && val) {
            try {
              const parsed = JSON.parse(val);
              if (parsed && typeof parsed === 'object') {
                healthFactorsMemoryCache.set(activeVehicleId, parsed);
                setCachedFactors(parsed);
              }
            } catch (e) {}
          }
        })
        .catch(() => {});
    }
    return () => {
      isCancelled = true;
    };
  }, [activeVehicleId]);

  const isDiagnosticsLoading = Boolean(
    loading || maintenance.loadingDiagnostics || (!maintenance.initialDiagnosticsLoaded && Boolean(vehicleProfile))
  );

  // Dynamic maintenanceHealth derived from active diagnostic records and maintenance history
  // is authoritative across the entire application to prevent score divergence.
  const hasLoadedHealth = typeof maintenanceHealth === 'number';
  const healthScore = hasLoadedHealth ? maintenanceHealth : (isDiagnosticsLoading ? null : 100);

  const healthPercentage = (typeof healthScore === 'number' && Number.isFinite(healthScore))
    ? Math.min(100, Math.max(0, Math.round(healthScore)))
    : (isDiagnosticsLoading ? null : 100);

  const rawHealthStatus = recHealthStatus || vehicleHealth?.status || vehicleHealth?.health_status;

  const healthStatus = {
    label: typeof rawHealthStatus === 'string'
      ? rawHealthStatus
      : rawHealthStatus?.label || (
          healthPercentage === null
            ? 'Analyzing...'
            : healthPercentage >= 80
            ? 'Looking Good'
            : healthPercentage >= 60
            ? 'Needs Attention'
            : 'Needs Immediate Attention'
        ),
    icon: (typeof rawHealthStatus === 'object' && rawHealthStatus?.icon)
      ? rawHealthStatus.icon
      : healthPercentage === null
        ? 'sync'
        : healthPercentage >= 80
        ? 'check-circle'
        : healthPercentage >= 60
        ? 'info'
        : 'warning',
    color: (typeof rawHealthStatus === 'object' && rawHealthStatus?.color)
      ? rawHealthStatus.color
      : healthPercentage === null
        ? '#F63B05'
        : healthPercentage >= 80
        ? '#35B86B'
        : healthPercentage >= 60
        ? '#F63B05'
        : '#FF5A5F',
    explanation: (typeof rawHealthStatus === 'object' && rawHealthStatus?.explanation)
      ? rawHealthStatus.explanation
      : undefined,
  };

  const maintenanceCount = Array.isArray(maintenance.serviceHistory) && maintenance.serviceHistory.length > 0
    ? maintenance.serviceHistory.length
    : (Array.isArray(historyItems) ? historyItems.filter(h => h.source === 'preventive' || h.type === 'maintenance' || h.serviceType).length : 0);

  const diagnosticsCount = Array.isArray(diagnosticItems)
    ? diagnosticItems.length
    : (Array.isArray(maintenance.resolvedTasks) && maintenance.resolvedTasks.length > 0
      ? maintenance.resolvedTasks.length
      : 0);

  const recommendationsCount = Array.isArray(allRecommendations) && allRecommendations.length > 0
    ? allRecommendations.length
    : (Array.isArray(historyItems) ? historyItems.length : 0);

  const factors = useMemo(() => {
    if (!maintenance.initialDiagnosticsLoaded) {
      if (activeVehicleId && healthFactorsMemoryCache.has(activeVehicleId)) {
        return healthFactorsMemoryCache.get(activeVehicleId);
      }
      if (cachedFactors) {
        return cachedFactors;
      }
      return {
        maintenance: null,
        diagnostics: null,
        recommendations: null,
      };
    }
    const result = {
      maintenance: maintenanceCount,
      diagnostics: diagnosticsCount,
      recommendations: recommendationsCount,
    };
    if (activeVehicleId) {
      healthFactorsMemoryCache.set(activeVehicleId, result);
      AsyncStorage.setItem(`@vehicare_cached_factors_${activeVehicleId}`, JSON.stringify(result)).catch(() => {});
    }
    return result;
  }, [maintenance.initialDiagnosticsLoaded, activeVehicleId, cachedFactors, maintenanceCount, diagnosticsCount, recommendationsCount]);

  return {
    activeVehicle,
    pendingVehicle,
    vehicleProfile,
    vehicleHealth,
    completedRecommendations: historyItems,
    pendingRecommendations: [...diagnosticItems, ...preventiveItems],
    recommendations: allRecommendations,
    allRecommendations,
    completedCount: historyItems.length,
    pendingCount: diagnosticItems.length + preventiveItems.length,
    recommendationCount: allRecommendations.length,
    healthScore,
    healthPercentage,
    healthStatus,
    healthData: {
      maintenanceHealth,
      diagnosticItems,
      urgentDiagnosticItems,
      preventiveItems,
      factors,
    },
    loading: isDiagnosticsLoading,
    initialDiagnosticsLoaded: Boolean(maintenance.initialDiagnosticsLoaded),
    hasVehicle: !!activeVehicle,
    hasPendingVehicle: !!pendingVehicle,
    completedRecommendationIds,
    isRecommendationCompleted,
    markAsDone,
    undo,
    refresh: refresh || refreshVehicleHealth,
    refreshVehicleHealth: refreshVehicleHealth || refresh,
  };
};

export default useVehicleHealth;