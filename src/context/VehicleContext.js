import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import vehicleApi from '../api/vehicleApi';
import activityService from '../services/activity.service';
import { transferGuestVehicleToAccount } from '../services/vehicleService';
import { useAuth } from './AuthContext';

const VehicleContext = createContext(null);

export const VehicleProvider = ({ children }) => {
  /*
  |--------------------------------------------------------------------------
  | VEHICLES
  |--------------------------------------------------------------------------
  */

  const [vehicles, setVehicles] = useState([]);

  const [activeVehicle, setActiveVehicle] = useState(null);

  const [pendingVehicle, setPendingVehicleState] = useState(null);

  const [loading, setLoading] = useState(true);

  const {
    isAuthenticated,
    user,
    logoutSignal,
  } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | GUEST VEHICLE
  |--------------------------------------------------------------------------
  */

  const refreshPendingVehicle = async () => {
    if (isAuthenticated) {
      setPendingVehicleState(null);
      return null;
    }

    return pendingVehicle;
  };

  /*
  |--------------------------------------------------------------------------
  | FIND ACTIVE VEHICLE
  |--------------------------------------------------------------------------
  */

  const resolveActiveVehicle = (vehicleList) => {
    if (
      !Array.isArray(vehicleList) ||
      vehicleList.length === 0
    ) {
      return null;
    }

    const activeVehicleId =
      user?.active_vehicle_id ||
      user?.activeVehicleId ||
      null;

    if (activeVehicleId) {
      const matchedVehicle = vehicleList.find(
        vehicle =>
          String(vehicle.id) ===
          String(activeVehicleId),
      );

      if (matchedVehicle) {
        return matchedVehicle;
      }
    }

    return vehicleList[0];
  };

  /*
  |--------------------------------------------------------------------------
  | ACCOUNT VEHICLES
  |--------------------------------------------------------------------------
  */

  const refreshActiveVehicle = async () => {
    try {
      if (!isAuthenticated) {
        setVehicles([]);
        setActiveVehicle(null);
        return [];
      }

      const result = await vehicleApi.getMyVehicles();

      const vehicleList = Array.isArray(result)
        ? result
        : [];

      setVehicles(vehicleList);

      if (vehicleList.length === 0) {
        setActiveVehicle(null);
        return [];
      }

      const resolvedVehicle =
        resolveActiveVehicle(vehicleList);

      setActiveVehicle(resolvedVehicle);

      return vehicleList;
    } catch (error) {
      console.warn(
        'Unable to load account vehicles:',
        error?.message || error,
      );

      setVehicles([]);
      setActiveVehicle(null);

      return [];
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CHANGE ACTIVE VEHICLE
  |--------------------------------------------------------------------------
  |
  | This is intentionally handled by the context.
  |
  | That means:
  |
  | Ask VehiCare
  | My Vehicles
  | Garage
  | Dashboard
  |
  | can all read the exact same active vehicle.
  |
  */

  const setActiveVehicleById = async vehicleId => {
    if (!vehicleId) {
      return null;
    }

    const selectedVehicle = vehicles.find(
      vehicle =>
        String(vehicle.id) ===
        String(vehicleId),
    );

    if (!selectedVehicle) {
      console.warn(
        'Vehicle not found:',
        vehicleId,
      );

      return null;
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE GLOBAL LOCAL STATE
    |--------------------------------------------------------------------------
    */

    setActiveVehicle(selectedVehicle);

    /*
    |--------------------------------------------------------------------------
    | BACKEND PERSISTENCE
    |--------------------------------------------------------------------------
    |
    | Your current vehicleApi does not show an
    | endpoint for updating active_vehicle_id.
    |
    | Do NOT call an unknown API method here.
    |
    | Once your Laravel endpoint exists, this is
    | where it should be called.
    |
    */

    return selectedVehicle;
  };

  /*
  |--------------------------------------------------------------------------
  | SAVE GUEST VEHICLE
  |--------------------------------------------------------------------------
  */

  const savePendingVehicle = async vehicle => {
    if (isAuthenticated) {
      console.warn(
        'savePendingVehicle should only be used in guest mode.',
      );

      return null;
    }

    const nextVehicle = vehicle || null;

    setPendingVehicleState(nextVehicle);

    return nextVehicle;
  };

  /*
  |--------------------------------------------------------------------------
  | CLEAR GUEST VEHICLE
  |--------------------------------------------------------------------------
  */

  const clearPendingVehicle = async () => {
    setPendingVehicleState(null);
  };

  /*
  |--------------------------------------------------------------------------
  | CLAIM GUEST VEHICLE
  |--------------------------------------------------------------------------
  */

  const claimPendingVehicle = async vehicle => {
    if (!isAuthenticated) {
      throw new Error(
        'User must be authenticated to claim a pending guest vehicle.',
      );
    }

    if (!vehicle) {
      setPendingVehicleState(null);

      return null;
    }

    const claimedVehicle =
      await transferGuestVehicleToAccount(
        vehicle,
      );

    if (claimedVehicle) {
      setPendingVehicleState(null);

      /*
      |--------------------------------------------------------------------------
      | ADD TO GLOBAL VEHICLE LIST
      |--------------------------------------------------------------------------
      */

      setVehicles(current => {
        const alreadyExists = current.some(
          item =>
            String(item.id) ===
            String(claimedVehicle.id),
        );

        if (alreadyExists) {
          return current;
        }

        return [
          ...current,
          claimedVehicle,
        ];
      });

      setActiveVehicle(claimedVehicle);

      return claimedVehicle;
    }

    return null;
  };

  /*
  |--------------------------------------------------------------------------
  | INITIAL / AUTH STATE SYNC
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;

    const syncVehicleState = async () => {
      setLoading(true);

      try {
        if (isAuthenticated) {
          if (!cancelled) {
            setPendingVehicleState(null);
          }

          await refreshActiveVehicle();
        } else {
          if (!cancelled) {
            setVehicles([]);
            setActiveVehicle(null);
            setPendingVehicleState(null);
          }
        }
      } catch (error) {
        console.warn(
          'Vehicle state synchronization failed:',
          error?.message || error,
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    syncVehicleState();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    user,
    logoutSignal,
  ]);

  /*
  |--------------------------------------------------------------------------
  | PROVIDER
  |--------------------------------------------------------------------------
  */

  return (
    <VehicleContext.Provider
      value={{
        /*
        |--------------------------------------------------------------------------
        | VEHICLE DATA
        |--------------------------------------------------------------------------
        */

        vehicles,
        activeVehicle,
        pendingVehicle,
        loading,

        /*
        |--------------------------------------------------------------------------
        | ACTIVE VEHICLE
        |--------------------------------------------------------------------------
        */

        setActiveVehicle,
        setActiveVehicleById,

        /*
        |--------------------------------------------------------------------------
        | GUEST VEHICLE
        |--------------------------------------------------------------------------
        */

        savePendingVehicle,
        clearPendingVehicle,

        /*
        |--------------------------------------------------------------------------
        | REFRESH
        |--------------------------------------------------------------------------
        */

        refreshPendingVehicle,
        refreshActiveVehicle,

        /*
        |--------------------------------------------------------------------------
        | CLAIM
        |--------------------------------------------------------------------------
        */

        claimPendingVehicle,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
};

/*
|--------------------------------------------------------------------------
| HOOK
|--------------------------------------------------------------------------
*/

export const useVehicle = () => {
  const context = useContext(VehicleContext);

  if (!context) {
    throw new Error(
      'useVehicle must be used inside VehicleProvider',
    );
  }

  return context;
};

export default VehicleProvider;