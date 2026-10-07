import { useMemo } from 'react';
import { useVehicleHealthContext } from '../context/VehicleHealthContext';
import useMaintenanceRecommendations from './useMaintenanceRecommendations';

/**
 * Unified useVehicleHealth Hook
 * Provides synchronized vehicle health score, status, and recommendations
 * across Dashboard, Maintenance Screen, and Vehicle Health Details screen.
 */
const useVehicleHealth = () => {
  const { activeVehicle, pendingVehicle, loading: contextLoading } = useVehicleHealthContext();
  const vehicleProfile = activeVehicle || pendingVehicle || null;

  const {
    maintenanceHealth,
    healthStatus: recHealthStatus,
    allRecommendations,
    diagnosticItems,
    urgentDiagnosticItems,
    preventiveItems,
    historyItems,
    loading: recLoading,
  } = useMaintenanceRecommendations();

  const vehicleHealth = useMemo(() => {
    if (!vehicleProfile) return {};
    return (
      vehicleProfile.health ||
      vehicleProfile.vehicle_health ||
      vehicleProfile.vehicleHealth ||
      {}
    );
  }, [vehicleProfile]);

  // If backend provided an explicit override healthScore, use it; otherwise use dynamic maintenanceHealth
  const healthScore = typeof vehicleHealth?.healthScore === 'number'
    ? vehicleHealth.healthScore
    : typeof vehicleHealth?.health_score === 'number'
      ? vehicleHealth.health_score
      : maintenanceHealth;

  const healthPercentage = Number.isFinite(healthScore)
    ? Math.min(100, Math.max(0, Math.round(healthScore)))
    : 100;

  const rawHealthStatus = vehicleHealth?.status || vehicleHealth?.health_status || recHealthStatus;

  const healthStatus = {
    label: typeof rawHealthStatus === 'string'
      ? rawHealthStatus
      : rawHealthStatus?.label || 'Looking Good',
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
  };

  return {
    activeVehicle,
    pendingVehicle,
    vehicleHealth,
    completedRecommendations: historyItems,
    pendingRecommendations: [...diagnosticItems, ...preventiveItems],
    recommendations: allRecommendations,
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
    },
    loading: contextLoading || recLoading,
    hasVehicle: !!activeVehicle,
    hasPendingVehicle: !!pendingVehicle,
  };
};

export default useVehicleHealth;