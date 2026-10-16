import vehicleApi from '../api/vehicleApi';
import { clearGuestVehicle, getGuestVehicle } from './storageService';

/*
|--------------------------------------------------------------------------
| VEHICLE SERVICE
|--------------------------------------------------------------------------
|
| Guest vehicles are managed in React context state only.
| This service provides synchronization and account transfer helpers.
|
|--------------------------------------------------------------------------
*/

export const syncPendingGuestVehicleToServer = async () => {
  const guestVehicle = await getGuestVehicle();
  if (!guestVehicle) {
    return null;
  }

  const existingVehicles = await vehicleApi.getMyVehicles();
  if (Array.isArray(existingVehicles) && existingVehicles.length > 0) {
    await clearGuestVehicle();
    return null;
  }

  const payload = {
    vehicle_type_id: guestVehicle.vehicle_type_id ?? null,
    vehicle_type: guestVehicle.vehicle_type ?? null,
    vehicle_brand_id: guestVehicle.vehicle_brand_id ?? null,
    vehicle_brand: guestVehicle.vehicle_brand ?? null,
    vehicle_model_id: guestVehicle.vehicle_model_id ?? null,
    vehicle_model: guestVehicle.vehicle_model ?? null,
    vehicle_year_id: guestVehicle.vehicle_year_id ?? null,
    vehicle_year: guestVehicle.vehicle_year ?? null,
    custom_brand: guestVehicle.custom_brand ?? null,
    custom_model: guestVehicle.custom_model ?? null,
    custom_year: guestVehicle.custom_year ?? null,
    model_number: guestVehicle.model_number ?? null,
  };

  const saved = await vehicleApi.saveVehicle(payload);
  await clearGuestVehicle();
  return saved;
};

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
  syncPendingGuestVehicleToServer,
};