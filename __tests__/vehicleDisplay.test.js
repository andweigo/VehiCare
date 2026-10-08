import { getVehicleDisplayDetails, getVehicleDisplayName, normalizeVehicleProfile } from '../src/utils/vehicleDisplay';
import { getVehicleIconName } from '../src/utils/maintenanceUtils';

describe('vehicleDisplay utilities', () => {
  it('normalizes backend vehicle relation objects', () => {
    const vehicle = {
      custom_brand: 'Ford',
      custom_model: 'Escape',
      vehicle_type: { name: 'SUV' },
      vehicle_brand: { name: 'Ford' },
      vehicle_model: { name: 'Escape' },
      vehicle_year: { year: '2023' },
    };

    const normalized = normalizeVehicleProfile(vehicle);

    expect(normalized.vehicle_type).toEqual({ name: 'SUV' });
    expect(normalized.vehicle_brand).toEqual({ name: 'Ford' });
    expect(normalized.vehicle_model).toEqual({ name: 'Escape' });
    expect(normalized.vehicle_year).toEqual({ year: '2023' });
  });

  it('builds names and details from nested vehicle relation objects', () => {
    const vehicle = {
      vehicle_type: { name: 'SUV' },
      vehicle_brand: { name: 'Toyota' },
      vehicle_model: { name: 'RAV4' },
      vehicle_year: { year: '2024' },
    };

    expect(getVehicleDisplayName(vehicle)).toBe('Toyota RAV4');
    expect(getVehicleDisplayDetails(vehicle)).toBe('2024 • SUV');
  });

  it('resolves vehicle icons from nested vehicle type relations', () => {
    expect(getVehicleIconName({ vehicle_type: { id: 2, name: 'Motorcycle' } })).toBe('two-wheeler');
    expect(getVehicleIconName({ vehicleType: { label: 'Scooter' } })).toBe('two-wheeler');
    expect(getVehicleIconName({ type: 'Bicycle' })).toBe('directions-bike');
    expect(getVehicleIconName({ vehicle_type: { name: 'Bus' } })).toBe('directions-bus');
  });
});
