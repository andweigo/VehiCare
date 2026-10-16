import AsyncStorage from '@react-native-async-storage/async-storage';
import activityService from '../src/services/activity.service';

describe('Task 3: Meaningful Recent Activity Summary', () => {
  const userId = 'user_test_99';

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('rejects noisy chat_question and navigation events', async () => {
    const chatResult = await activityService.addActivity({
      type: 'chat_question',
      title: 'Asked VehiCare',
      description: 'How do I change oil?',
      userId,
    });
    expect(chatResult).toBeNull();

    const navResult = await activityService.addActivity({
      type: 'navigation',
      title: 'Navigated to Settings',
      userId,
    });
    expect(navResult).toBeNull();

    const activities = await activityService.getAllActivities(userId);
    expect(activities).toHaveLength(0);
  });

  it('persists meaningful operations (diagnosis_completed, maintenance_completed, vehicle_added)', async () => {
    const diag = await activityService.addActivity({
      type: 'diagnosis_completed',
      title: 'Diagnosis: Battery Degradation',
      description: 'Completed diagnosis with recommended inspection.',
      vehicleId: '42',
      vehicleName: 'Yamaha Aerox',
      userId,
    });
    expect(diag).toBeTruthy();
    expect(diag.type).toBe('diagnosis_completed');

    const maint = await activityService.addActivity({
      type: 'maintenance_completed',
      title: 'Maintenance Completed',
      description: 'Marked "Check Tire Pressure" as completed.',
      vehicleId: '42',
      vehicleName: 'Yamaha Aerox',
      userId,
    });
    expect(maint).toBeTruthy();

    const vehicle = await activityService.addActivity({
      type: 'vehicle_added',
      title: 'Vehicle Added',
      description: 'Added 2022 Yamaha Mio Aerox to your garage.',
      vehicleId: '42',
      vehicleName: 'Yamaha Aerox',
      userId,
    });
    expect(vehicle).toBeTruthy();

    const activities = await activityService.getAllActivities(userId);
    expect(activities).toHaveLength(3);
    expect(activities.map(a => a.type)).toEqual([
      'vehicle_added',
      'maintenance_completed',
      'diagnosis_completed',
    ]);
  });

  it('filters out legacy chat_question entries present in storage', async () => {
    const storageKey = `@vehicare_recent_activities_${userId}`;
    const legacyData = [
      {
        id: 'act_1',
        type: 'chat_question',
        title: 'Asked VehiCare',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'act_2',
        type: 'diagnosis_completed',
        title: 'Diagnosis: Overheating',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'act_3',
        type: 'chat_question',
        title: 'Asked VehiCare',
        createdAt: new Date().toISOString(),
      },
    ];
    await AsyncStorage.setItem(storageKey, JSON.stringify(legacyData));

    const sanitized = await activityService.getAllActivities(userId);
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].id).toBe('act_2');
    expect(sanitized[0].type).toBe('diagnosis_completed');
  });

  it('suppresses rapid duplicate entries within 5 seconds', async () => {
    const entry1 = await activityService.addActivity({
      type: 'maintenance_completed',
      title: 'Completed Oil Change',
      vehicleId: '42',
      userId,
    });

    // Rapid duplicate call
    const entry2 = await activityService.addActivity({
      type: 'maintenance_completed',
      title: 'Completed Oil Change',
      vehicleId: '42',
      userId,
    });

    expect(entry2.id).toBe(entry1.id);
    const activities = await activityService.getAllActivities(userId);
    expect(activities).toHaveLength(1);
  });
});
