import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useMaintenanceRecommendationsInternal } from '../src/hooks/useMaintenanceRecommendations';
import vehicleApi from '../src/api/vehicleApi';

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 10, name: 'Test Rider' },
    isAuthenticated: true,
  }),
}));

const mockVehicle = {
  id: 42,
  vehicle_id: 42,
  type: 'Motorcycle',
  brand: 'Yamaha',
  model: 'Mio Aerox',
  year: '2022',
};

jest.mock('../src/context/VehicleContext', () => ({
  useVehicle: () => ({
    activeVehicle: mockVehicle,
    pendingVehicle: null,
    loading: false,
  }),
}));

jest.mock('../src/api/vehicleApi', () => ({
  getDiagnosticsHistory: jest.fn().mockResolvedValue([
    {
      id: 101,
      vehicle_id: 42,
      problem: 'Engine stalling on idle',
      severity: 'medium',
      recommended_actions: ['Inspect spark plug condition'],
      possible_causes: ['Worn spark plug'],
      created_at: '2026-10-14T10:00:00Z',
    },
  ]),
  getMaintenanceRecords: jest.fn().mockResolvedValue([]),
  getRepairRecords: jest.fn().mockResolvedValue([]),
  createMaintenanceRecord: jest.fn().mockResolvedValue({ id: 999, status: 'completed' }),
}));

describe('Task 1: Maintenance Completion Persistence', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  const renderMaintenanceHook = async () => {
    let hookValue;
    function Consumer() {
      hookValue = useMaintenanceRecommendationsInternal();
      return null;
    }
    let comp;
    await act(async () => {
      comp = renderer.create(<Consumer />);
      await Promise.resolve();
    });
    return {
      get current() {
        return hookValue;
      },
      unmount: () => {
        act(() => {
          comp.unmount();
        });
      },
    };
  };

  it('marks item as completed, saves to AsyncStorage, calls backend API, and recalculates lists', async () => {
    const hook = await renderMaintenanceHook();

    expect(hook.current.allRecommendations.length).toBeGreaterThan(0);
    const targetItem = hook.current.allRecommendations[0];

    expect(hook.current.isRecommendationCompleted(targetItem)).toBe(false);

    await act(async () => {
      await hook.current.markAsDone(targetItem);
      await Promise.resolve();
    });

    // 1. In-memory state updated
    expect(hook.current.isRecommendationCompleted(targetItem)).toBe(true);
    expect(hook.current.isRecommendationCompleted(targetItem.id)).toBe(true);

    // 2. Persisted to vehicle-scoped AsyncStorage
    const savedVehicleData = await AsyncStorage.getItem('@vehicare_completed_maintenance_42');
    expect(savedVehicleData).toBeTruthy();
    const parsed = JSON.parse(savedVehicleData);
    expect(parsed).toContain(targetItem.id);

    // 3. User-scoped storage key also persisted
    const savedUserData = await AsyncStorage.getItem('@vehicare_completed_maintenance_10_42');
    expect(savedUserData).toBeTruthy();

    // 4. Backend createMaintenanceRecord was called
    expect(vehicleApi.createMaintenanceRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicle_id: 42,
        title: targetItem.title,
        status: 'completed',
      }),
    );

    // 5. Item moved to history and out of todo
    expect(hook.current.historyItems.some(i => i.id === targetItem.id)).toBe(true);
    expect(hook.current.todoItems.some(i => i.id === targetItem.id)).toBe(false);
  });

  it('persists completed items across hook unmount and remount (simulating navigation away and back)', async () => {
    // Phase 1: Mount and mark an item as done
    const firstMount = await renderMaintenanceHook();
    const targetItem = firstMount.current.allRecommendations[0];

    await act(async () => {
      await firstMount.current.markAsDone(targetItem);
      await Promise.resolve();
    });
    expect(firstMount.current.isRecommendationCompleted(targetItem)).toBe(true);

    firstMount.unmount();

    // Phase 2: Remount hook (simulating user navigating away and reopening screen)
    const secondMount = await renderMaintenanceHook();

    // Verify item remains completed on new screen mount
    expect(secondMount.current.isRecommendationCompleted(targetItem)).toBe(true);
    expect(secondMount.current.isRecommendationCompleted(targetItem.id)).toBe(true);
  });

  it('undo restores item to todoItems and updates AsyncStorage', async () => {
    const hook = await renderMaintenanceHook();
    const targetItem = hook.current.allRecommendations[0];

    await act(async () => {
      await hook.current.markAsDone(targetItem);
      await Promise.resolve();
    });
    expect(hook.current.isRecommendationCompleted(targetItem)).toBe(true);

    // Undo the completed item
    await act(async () => {
      hook.current.undo(targetItem);
      await Promise.resolve();
    });

    expect(hook.current.isRecommendationCompleted(targetItem)).toBe(false);
    expect(hook.current.todoItems.some(i => i.id === targetItem.id)).toBe(true);

    const saved = await AsyncStorage.getItem('@vehicare_completed_maintenance_42');
    const parsed = JSON.parse(saved);
    expect(parsed).not.toContain(targetItem.id);
  });

  it('matches completion cross-screen using normalized titles when IDs differ', async () => {
    const hook = await renderMaintenanceHook();

    // Smart rec ID vs Maint task ID with identical title
    const smartRec = {
      id: 'smart-rec-101-0',
      title: 'Inspect spark plug condition',
    };
    const maintTask = {
      id: 'maint-task-101-0',
      title: 'Inspect spark plug condition',
    };

    await act(async () => {
      await hook.current.markAsDone(smartRec);
      await Promise.resolve();
    });

    // Both should report completed due to normalized title resolution
    expect(hook.current.isRecommendationCompleted(smartRec)).toBe(true);
    expect(hook.current.isRecommendationCompleted(maintTask)).toBe(true);
  });
});
