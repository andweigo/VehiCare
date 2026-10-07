jest.mock('../src/api/vehicleApi', () => ({
  getMyVehicles: jest.fn(),
  saveVehicle: jest.fn(),
}));

jest.mock('../src/services/storageService', () => ({
  clearGuestVehicle: jest.fn(),
  getGuestVehicle: jest.fn(),
}));

const vehicleApi = require('../src/api/vehicleApi');
const { clearGuestVehicle, getGuestVehicle } = require('../src/services/storageService');
const { syncPendingGuestVehicleToServer } = require('../src/services/vehicleService');

describe('syncPendingGuestVehicleToServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears guest vehicle storage when the account already has vehicles', async () => {
    getGuestVehicle.mockResolvedValue({ vehicle_type_id: 1, vehicle_type: 'Car' });
    vehicleApi.getMyVehicles.mockResolvedValue([{ id: 101, vehicle_type: 'Car' }]);

    const result = await syncPendingGuestVehicleToServer();

    expect(result).toBeNull();
    expect(clearGuestVehicle).toHaveBeenCalled();
    expect(vehicleApi.saveVehicle).not.toHaveBeenCalled();
  });

  it('saves pending guest vehicle when the account has no vehicles', async () => {
    getGuestVehicle.mockResolvedValue({ vehicle_type_id: 1, vehicle_type: 'Car' });
    vehicleApi.getMyVehicles.mockResolvedValue([]);
    vehicleApi.saveVehicle.mockResolvedValue({ id: 202, vehicle_type: 'Car' });

    const result = await syncPendingGuestVehicleToServer();

    expect(result).toEqual({ id: 202, vehicle_type: 'Car' });
    expect(clearGuestVehicle).toHaveBeenCalled();
    expect(vehicleApi.saveVehicle).toHaveBeenCalledWith({
      vehicle_type_id: 1,
      vehicle_type: 'Car',
      vehicle_brand_id: null,
      vehicle_brand: null,
      vehicle_model_id: null,
      vehicle_model: null,
      vehicle_year_id: null,
      vehicle_year: null,
      custom_brand: null,
      custom_model: null,
      custom_year: null,
      model_number: null,
    });
  });
});
