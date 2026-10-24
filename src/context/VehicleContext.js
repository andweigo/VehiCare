import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import vehicleApi from '../api/vehicleApi';
import { isSessionChangedError } from '../api/apiClient';
import activityService from '../services/activity.service';
import {
  clearGuestVehicle,
  getGuestVehicle,
  saveGuestVehicle,
} from '../services/storageService';
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

  const userId = user?.id || user?.uid || null;
  const hasInitializedRef = useRef(false);
  const currentScope = `${isAuthenticated ? 'auth' : 'guest'}:${userId || 'anon'}:${logoutSignal}`;
  const [syncedScope, setSyncedScope] = useState(null);
  const prevLogoutSignalRef = useRef(logoutSignal);
  const pendingVehicleRef = useRef(null);
  pendingVehicleRef.current = pendingVehicle;

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

    if (pendingVehicleRef.current) {
      return pendingVehicleRef.current;
    }

    const storedGuest =
      typeof getGuestVehicle === 'function'
        ? await getGuestVehicle()
        : null;

    if (storedGuest) {
      setPendingVehicleState(storedGuest);
      setActiveVehicle(storedGuest);
      return storedGuest;
    }

    return null;
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
          String(vehicle.id) === String(activeVehicleId) &&
          !vehicle.isArchived &&
          !vehicle.archived_at,
      );

      if (matchedVehicle) {
        return matchedVehicle;
      }
    }

    const explicitlyActive = vehicleList.find(
      v => Boolean(v?.is_active || v?.isActive || v?.active) && !v?.isArchived && !v?.archived_at,
    );
    if (explicitlyActive) {
      return explicitlyActive;
    }

    const firstNonArchived = vehicleList.find(v => !v?.isArchived && !v?.archived_at);
    return firstNonArchived || null;
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
      if (isSessionChangedError(error)) {
        return [];
      }

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

    if (selectedVehicle.isArchived || selectedVehicle.archived_at) {
      console.warn(
        'Cannot set archived vehicle as active:',
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
    */
    try {
      await vehicleApi.setActiveVehicle(vehicleId);
    } catch (error) {
      console.warn(
        'Unable to persist active vehicle to backend:',
        error?.message || error,
      );
    }

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

    pendingVehicleRef.current = nextVehicle;
    setPendingVehicleState(nextVehicle);
    setActiveVehicle(nextVehicle);

    if (typeof saveGuestVehicle === 'function') {
      await saveGuestVehicle(nextVehicle);
    }

    return nextVehicle;
  };

  /*
  |--------------------------------------------------------------------------
  | CLEAR GUEST VEHICLE
  |--------------------------------------------------------------------------
  */

  const clearPendingVehicle = async () => {
    pendingVehicleRef.current = null;
    setPendingVehicleState(null);
    if (!isAuthenticated) {
      setActiveVehicle(null);
    }
    if (typeof clearGuestVehicle === 'function') {
      await clearGuestVehicle();
    }
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
    const scopeAtStart = `${isAuthenticated ? 'auth' : 'guest'}:${userId || 'anon'}:${logoutSignal}`;

    const syncVehicleState = async () => {
      setLoading(true);

      try {
        if (isAuthenticated) {
          const guestCandidate =
            pendingVehicleRef.current ||
            (typeof getGuestVehicle === 'function'
              ? await getGuestVehicle()
              : null);

          if (!cancelled) {
            pendingVehicleRef.current = null;
            setPendingVehicleState(null);
          }

          let accountList = await refreshActiveVehicle();

          if (
            Array.isArray(accountList) &&
            accountList.length === 0 &&
            guestCandidate
          ) {
            try {
              const migrated = await transferGuestVehicleToAccount(
                guestCandidate,
              );
              if (migrated) {
                accountList = await refreshActiveVehicle();
              }
            } catch (migrationErr) {
              console.warn(
                'Automatic guest vehicle migration note:',
                migrationErr?.message || migrationErr,
              );
            }
          }

          if (typeof clearGuestVehicle === 'function') {
            await clearGuestVehicle();
          }
        } else {
          const logoutChanged =
            prevLogoutSignalRef.current !== logoutSignal;
          prevLogoutSignalRef.current = logoutSignal;

          const storedGuest =
            pendingVehicleRef.current ||
            (typeof getGuestVehicle === 'function'
              ? await getGuestVehicle()
              : null);

          if (!cancelled) {
            setVehicles([]);
            if (storedGuest && !logoutChanged) {
              pendingVehicleRef.current = storedGuest;
              setPendingVehicleState(storedGuest);
              setActiveVehicle(storedGuest);
            } else if (storedGuest) {
              pendingVehicleRef.current = storedGuest;
              setPendingVehicleState(storedGuest);
              setActiveVehicle(storedGuest);
            } else {
              setActiveVehicle(null);
              setPendingVehicleState(null);
            }
          }
        }
      } catch (error) {
        console.warn(
          'Vehicle state synchronization failed:',
          error?.message || error,
        );
      } finally {
        if (!cancelled) {
          setSyncedScope(scopeAtStart);
          setLoading(false);
          hasInitializedRef.current = true;
        }
      }
    };

    syncVehicleState();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    userId,
    logoutSignal,
  ]);

  const effectiveLoading = loading || syncedScope !== currentScope;

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
        setVehicles,
        activeVehicle,
        pendingVehicle,
        loading: effectiveLoading,

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
