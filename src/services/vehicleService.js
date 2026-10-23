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

export const buildGuestVehicleTransferPayload = guestVehicle => {
  if (!guestVehicle || typeof guestVehicle !== 'object') {
    return null;
  }

  return {
    vehicle_type_id: guestVehicle.vehicle_type_id ?? guestVehicle.vehicleType?.id ?? null,
    vehicle_type:
      typeof guestVehicle.vehicle_type === 'object'
        ? (guestVehicle.vehicle_type?.name ?? null)
        : (guestVehicle.vehicle_type ?? guestVehicle.type ?? null),
    vehicle_brand_id: guestVehicle.vehicle_brand_id ?? guestVehicle.vehicleBrand?.id ?? null,
    vehicle_brand:
      typeof guestVehicle.vehicle_brand === 'object'
        ? (guestVehicle.vehicle_brand?.name ?? null)
        : (guestVehicle.vehicle_brand ?? guestVehicle.brand ?? null),
    vehicle_model_id: guestVehicle.vehicle_model_id ?? guestVehicle.vehicleModel?.id ?? null,
    vehicle_model:
      typeof guestVehicle.vehicle_model === 'object'
        ? (guestVehicle.vehicle_model?.name ?? null)
        : (guestVehicle.vehicle_model ?? guestVehicle.model ?? null),
    vehicle_year_id: guestVehicle.vehicle_year_id ?? guestVehicle.vehicleYear?.id ?? null,
    vehicle_year:
      typeof guestVehicle.vehicle_year === 'object'
        ? (guestVehicle.vehicle_year?.year ?? guestVehicle.vehicle_year?.name ?? null)
        : (guestVehicle.vehicle_year ?? guestVehicle.year ?? null),
    custom_brand: guestVehicle.custom_brand ?? null,
    custom_model: guestVehicle.custom_model ?? null,
    custom_year: guestVehicle.custom_year ?? null,
    model_number: guestVehicle.model_number ?? null,
  };
};

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

  const payload = buildGuestVehicleTransferPayload(guestVehicle);
  const saved = await vehicleApi.saveVehicle(payload);
  if (saved?.id && typeof vehicleApi.setActiveVehicle === 'function') {
    await vehicleApi.setActiveVehicle(saved.id).catch(() => {});
  }
  await clearGuestVehicle();
  return saved;
};

export const transferGuestVehicleToAccount =
  async vehicle => {
    const targetVehicle =
      vehicle && typeof vehicle === 'object'
        ? vehicle
        : await getGuestVehicle();

    if (!targetVehicle || typeof targetVehicle !== 'object') {
      return null;
    }

    const payload = buildGuestVehicleTransferPayload(targetVehicle);
    if (
      !payload ||
      (!payload.vehicle_type_id &&
        !payload.vehicle_type &&
        !payload.vehicle_brand_id &&
        !payload.custom_brand)
    ) {
      return null;
    }

    try {
      const savedVehicle =
        await vehicleApi.saveVehicle(
          payload,
        );

      if (savedVehicle?.id && typeof vehicleApi.setActiveVehicle === 'function') {
        await vehicleApi.setActiveVehicle(savedVehicle.id).catch(() => {});
      }

      await clearGuestVehicle();

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