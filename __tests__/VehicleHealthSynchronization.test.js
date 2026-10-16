import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useMaintenanceRecommendationsInternal, useMaintenanceRecommendations } from '../src/hooks/useMaintenanceRecommendations';
import useVehicleHealth from '../src/hooks/useVehicleHealth';
import { VehicleHealthProvider } from '../src/context/VehicleHealthContext';

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 10, name: 'Test Rider' },
    isAuthenticated: true,
  }),
}));

const mockVehicleWithStaleScore = {
  id: 88,
  vehicle_id: 88,
  type: 'Car',
  brand: 'Toyota',
  model: 'Vios',
  year: '2020',
  health: {
    healthScore: 100, // Stale backend static field
    status: 'Healthy',
  },
};

jest.mock('../src/context/VehicleContext', () => ({
  useVehicle: () => ({
    activeVehicle: mockVehicleWithStaleScore,
    pendingVehicle: null,
    loading: false,
  }),
}));

const mockDiagnosticList = [
  {
    id: 501,
    vehicle_id: 88,
    problem: 'Brake fluid leak',
    severity: 'urgent',
    recommended_actions: ['Inspect brake lines'],
    possible_causes: ['Damaged brake hose'],
    created_at: '2026-10-14T11:00:00Z',
  },
];

jest.mock('../src/api/vehicleApi', () => ({
  getDiagnosticsHistory: jest.fn().mockImplementation(() =>
    Promise.resolve([
      {
        id: 501,
        vehicle_id: 88,
        problem: 'Brake fluid leak',
        severity: 'urgent',
        recommended_actions: ['Inspect brake lines'],
        possible_causes: ['Damaged brake hose'],
        created_at: '2026-10-14T11:00:00Z',
      },
    ]),
  ),
  getMaintenanceRecords: jest.fn().mockResolvedValue([]),
  getRepairRecords: jest.fn().mockResolvedValue([]),
}));

describe('Task 2: Vehicle Health Synchronization and Flicker Prevention', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  const renderHealthHook = async () => {
    let maintenanceValue;
    let unifiedHealthValue;

    function Consumer() {
      maintenanceValue = useMaintenanceRecommendations();
      unifiedHealthValue = useVehicleHealth();
      return null;
    }

    let comp;
    await act(async () => {
      comp = renderer.create(
        <VehicleHealthProvider>
          <Consumer />
        </VehicleHealthProvider>,
      );
      await new Promise(r => setTimeout(r, 100));
    });

    return {
      get maintenance() {
        return maintenanceValue;
      },
      get unifiedHealth() {
        return unifiedHealthValue;
      },
      unmount: () => {
        act(() => comp.unmount());
      },
    };
  };

  it('synchronizes health score across useMaintenanceRecommendations and useVehicleHealth', async () => {
    const hook = await renderHealthHook();

    expect(hook.maintenance.loadingDiagnostics).toBe(false);

    const score = hook.maintenance.maintenanceHealth;
    // Stale vehicle.healthScore (100) must NOT override calculated score (which has urgent penalty)
    expect(score).toBeLessThan(100);

    // useVehicleHealth must match useMaintenanceRecommendations score exactly!
    expect(hook.unifiedHealth.healthScore).toEqual(hook.maintenance.maintenanceHealth);
    expect(hook.unifiedHealth.healthPercentage).toEqual(
      Math.round(hook.maintenance.maintenanceHealth),
    );
    expect(hook.unifiedHealth.healthStatus.label).toBe('Needs Immediate Attention');

    hook.unmount();
  });
});
