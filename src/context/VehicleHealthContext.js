import {
  createContext,
  useContext,
  useMemo,
} from 'react';

import { useVehicle } from './VehicleContext';
import { useMaintenanceRecommendationsInternal } from '../hooks/useMaintenanceRecommendations';

export const VehicleHealthContext = createContext(null);

/*
|--------------------------------------------------------------------------
| PROVIDER
|--------------------------------------------------------------------------
| Centralizes vehicle state, calculated health scores, and maintenance 
| recommendation persistence so that all screens stay 100% in sync without flickering.
*/

export const VehicleHealthProvider = ({
  children,
}) => {
  const vehicleState = useVehicle();
  const maintenanceHealthState = useMaintenanceRecommendationsInternal();

  const value = useMemo(
    () => ({
      ...vehicleState,
      ...maintenanceHealthState,
      // Combine loading indicators accurately
      loading: Boolean(vehicleState.loading || maintenanceHealthState.loading),
    }),
    [vehicleState, maintenanceHealthState],
  );

  return (
    <VehicleHealthContext.Provider value={value}>
      {children}
    </VehicleHealthContext.Provider>
  );
};

/*
|--------------------------------------------------------------------------
| HOOK
|--------------------------------------------------------------------------
*/

export const useVehicleHealthContext = () => {
  const context = useContext(VehicleHealthContext);

  if (!context) {
    throw new Error(
      'useVehicleHealthContext must be used inside VehicleHealthProvider',
    );
  }

  return context;
};

export default VehicleHealthProvider;