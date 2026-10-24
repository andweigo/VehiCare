import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useMaintenanceRecommendations } from '../src/hooks/useMaintenanceRecommendations';
import useVehicleHealth from '../src/hooks/useVehicleHealth';
import { VehicleHealthProvider } from '../src/context/VehicleHealthContext';

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 42, name: 'Driver' },
    isAuthenticated: true,
  }),
}));

const mockActiveVehicle = {
  id: 77,
  vehicle_id: 77,
  type: 'Car',
  brand: 'Honda',
  model: 'Civic',
  year: '2022',
  health: {
    status: 'Healthy',
  },
};

jest.mock('../src/context/VehicleContext', () => ({
  useVehicle: () => ({
    activeVehicle: mockActiveVehicle,
    pendingVehicle: null,
    loading: false,
  }),
}));

jest.mock('../src/api/vehicleApi', () => ({
  getDiagnosticsHistory: jest.fn().mockResolvedValue([]),
  getMaintenanceRecords: jest.fn().mockResolvedValue([]),
  getRepairRecords: jest.fn().mockResolvedValue([]),
  createMaintenanceRecord: jest.fn().mockResolvedValue({ id: 999, status: 'pending' }),
  updateMaintenanceRecord: jest.fn().mockResolvedValue({ id: 999, status: 'completed' }),
}));

describe('Diagnosis to Maintenance and Vehicle Health Score Integrity', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  const renderHook = async () => {
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
      get health() {
        return unifiedHealthValue;
      },
      unmount: () => {
        act(() => comp.unmount());
      },
    };
  };

  it('calculates 100% health for a clean vehicle without bugging to 80%', async () => {
    const hook = await renderHook();

    // When there are no diagnostics and no overdue items, vehicle score must be 100%
    expect(hook.maintenance.diagnosticItems.length).toBe(0);
    expect(hook.health.healthPercentage).toBe(100);
    expect(hook.health.healthScore).toBe(100);

    hook.unmount();
  });

  it('immediately reflects recent AI diagnosis stored in active chat sessions', async () => {
    // Setup active chat session with an AI diagnosis for vehicle 77
    const chatKey = '@vehicare_active_chats_42';
    const activeSessions = {
      session_101: {
        sessionId: 'session_101',
        userId: 42,
        vehicleId: 77,
        updatedAt: '2026-10-25T01:00:00Z',
        messages: [
          { id: 'msg-1', role: 'user', text: 'I hear screeching sound from wheels' },
          {
            id: 'msg-2',
            role: 'assistant',
            text: 'Worn brake pads detected.',
            diagnosisData: {
              id: 901,
              type: 'diagnostic',
              vehicle_id: 77,
              problem: 'Worn brake pads',
              summary: 'Brake pads are severely worn and require inspection.',
              severity: 'urgent',
              urgency: 'Immediate inspection recommended',
              recommended_actions: ['Inspect and replace front brake pads'],
              possible_causes: ['Worn friction material'],
              maintenance_tasks: [
                {
                  title: 'Inspect brake pads',
                  service_type: 'Brake Inspection',
                  urgency: 'Urgent',
                  description: 'Check thickness of front brake pads.',
                },
              ],
            },
          },
        ],
      },
    };
    await AsyncStorage.setItem(chatKey, JSON.stringify(activeSessions));

    const hook = await renderHook();

    // The diagnosis must be recognized and converted into a maintenance task
    expect(hook.maintenance.diagnosticItems.length).toBeGreaterThan(0);
    const brakeTask = hook.maintenance.diagnosticItems.find(item =>
      item.title.toLowerCase().includes('brake'),
    );
    expect(brakeTask).toBeDefined();

    // Since it has an urgent diagnostic item, health score should reflect penalty (< 100)
    expect(hook.health.healthPercentage).toBeLessThan(100);
    expect(hook.health.healthStatus.label).toBe('Needs Immediate Attention');

    hook.unmount();
  });
});
