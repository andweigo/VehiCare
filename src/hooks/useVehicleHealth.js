import { useContext, useMemo } from 'react';
import { VehicleHealthContext } from '../context/VehicleHealthContext';
import { useMaintenanceRecommendations } from './useMaintenanceRecommendations';

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

  // Dynamic maintenanceHealth derived from active diagnostic records and maintenance history
  // is authoritative across the entire application to prevent score divergence.
  const healthScore = typeof maintenanceHealth === 'number' ? maintenanceHealth : 100;

  const healthPercentage = Number.isFinite(healthScore)
    ? Math.min(100, Math.max(0, Math.round(healthScore)))
    : 100;

  const rawHealthStatus = recHealthStatus || vehicleHealth?.status || vehicleHealth?.health_status;

  const healthStatus = {
    label: typeof rawHealthStatus === 'string'
      ? rawHealthStatus
      : rawHealthStatus?.label || (healthPercentage >= 80 ? 'Looking Good' : healthPercentage >= 60 ? 'Needs Attention' : 'Needs Immediate Attention'),
    icon: (typeof rawHealthStatus === 'object' && rawHealthStatus?.icon)
      ? rawHealthStatus.icon
      : healthPercentage >= 80
        ? 'check-circle'
        : healthPercentage >= 60
          ? 'info'
          : 'warning',
    color: (typeof rawHealthStatus === 'object' && rawHealthStatus?.color)
      ? rawHealthStatus.color
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

  const diagnosticsCount = Array.isArray(maintenance.resolvedTasks) && maintenance.resolvedTasks.length > 0
    ? maintenance.resolvedTasks.length
    : (Array.isArray(historyItems) ? historyItems.filter(h => h.source === 'diagnostic').length : 0);

  const recommendationsCount = Array.isArray(historyItems) ? historyItems.length : 0;

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
      factors: {
        maintenance: maintenanceCount,
        diagnostics: diagnosticsCount,
        recommendations: recommendationsCount,
      },
    },
    loading: Boolean(loading),
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