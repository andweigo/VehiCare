import vehicleApi from '../api/vehicleApi';

/*
|--------------------------------------------------------------------------
| VEHICLE SERVICE
|--------------------------------------------------------------------------
|
| Guest vehicles are managed in React context state only.
| This service no longer depends on AsyncStorage for guest
| vehicle persistence.
|
|--------------------------------------------------------------------------
*/

export const transferGuestVehicleToAccount =
  async vehicle => {
    if (!vehicle || typeof vehicle !== 'object') {
      return null;
    }

    const vehicleData = {
      ...vehicle,
    };

    delete vehicleData.isGuest;
    delete vehicleData.guest;
    delete vehicleData.localOnly;
    delete vehicleData.createdLocally;
    delete vehicleData.savedLocally;
    delete vehicleData.id;

    try {
      const savedVehicle =
        await vehicleApi.saveVehicle(
          vehicleData,
        );

      return savedVehicle;
    } catch (error) {
      console.error(
        'Failed to transfer guest vehicle to account:',
        error?.message || error,
      );

      throw error;
    }
  };

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
*/

export default {
  transferGuestVehicleToAccount,
};