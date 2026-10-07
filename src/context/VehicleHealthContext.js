import {
  createContext,
  useContext,
} from 'react';

import { useVehicle } from './VehicleContext';

const VehicleHealthContext =
  createContext(null);

/*
|--------------------------------------------------------------------------
| PROVIDER
|--------------------------------------------------------------------------
*/

export const VehicleHealthProvider = ({
  children,
}) => {
  const {
    activeVehicle,
    pendingVehicle,
    loading,
    setActiveVehicle,
    savePendingVehicle,
    clearPendingVehicle,
    refreshPendingVehicle,
    refreshActiveVehicle,
    claimPendingVehicle,
  } = useVehicle();

  return (
    <VehicleHealthContext.Provider
      value={{
        activeVehicle,
        pendingVehicle,
        loading,
        setActiveVehicle,
        savePendingVehicle,
        clearPendingVehicle,
        refreshPendingVehicle,
        refreshActiveVehicle,
        claimPendingVehicle,
      }}
    >
      {children}
    </VehicleHealthContext.Provider>
  );
};

/*
|--------------------------------------------------------------------------
| HOOK
|--------------------------------------------------------------------------
*/

export const useVehicleHealthContext =
  () => {
    const context =
      useContext(
        VehicleHealthContext,
      );

    if (!context) {
      throw new Error(
        'useVehicleHealthContext must be used inside VehicleHealthProvider',
      );
    }

    return context;
  };

export default VehicleHealthProvider;