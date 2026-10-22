import { getUnreadCount, markAsRead, markAllAsRead, resetNotificationSyncState } from '../src/services/notificationService';
import apiClient from '../src/api/apiClient';
import { getToken } from '../src/services/storageService';
import { setDeviceBadgeCount, resetBadgeCache } from '../src/services/deviceBadgeService';

jest.mock('../src/api/apiClient');
jest.mock('../src/services/storageService');
jest.mock('../src/services/deviceBadgeService', () => ({
  setDeviceBadgeCount: jest.fn().mockResolvedValue(),
  resetBadgeCache: jest.fn(),
}));

describe('notificationService synchronization & anti-looping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNotificationSyncState();
    getToken.mockResolvedValue('valid_token_123');
  });

  afterEach(() => {
    resetNotificationSyncState();
  });

  it('synchronizes device badge on initial positive count fetch', async () => {
    apiClient.get.mockResolvedValueOnce({
      data: { data: { unread_count: 2 } },
    });

    const count = await getUnreadCount();

    expect(count).toBe(2);
    expect(setDeviceBadgeCount).toHaveBeenCalledTimes(1);
    expect(setDeviceBadgeCount).toHaveBeenCalledWith(2);
  });

  it('skips redundant setDeviceBadgeCount calls during repeated 10s polling intervals', async () => {
    // Poll 1: 1 unread notification
    apiClient.get.mockResolvedValueOnce({
      data: { data: { unread_count: 1 } },
    });
    await getUnreadCount();
    expect(setDeviceBadgeCount).toHaveBeenCalledTimes(1);
    expect(setDeviceBadgeCount).toHaveBeenCalledWith(1);

    // Poll 2 (10s later): still 1 unread notification
    apiClient.get.mockResolvedValueOnce({
      data: { data: { unread_count: 1 } },
    });
    await getUnreadCount();
    expect(setDeviceBadgeCount).toHaveBeenCalledTimes(1); // NOT called again!

    // Poll 3 (20s later): still 1 unread notification
    apiClient.get.mockResolvedValueOnce({
      data: { data: { unread_count: 1 } },
    });
    await getUnreadCount();
    expect(setDeviceBadgeCount).toHaveBeenCalledTimes(1); // STILL NOT called again!
  });

  it('triggers setDeviceBadgeCount when new announcement arrives (count increases)', async () => {
    // Poll 1: 1 unread
    apiClient.get.mockResolvedValueOnce({
      data: { data: { unread_count: 1 } },
    });
    await getUnreadCount();
    expect(setDeviceBadgeCount).toHaveBeenCalledTimes(1);

    // New announcement arrives on server -> count becomes 2
    apiClient.get.mockResolvedValueOnce({
      data: { data: { unread_count: 2 } },
    });
    await getUnreadCount();
    expect(setDeviceBadgeCount).toHaveBeenCalledTimes(2);
    expect(setDeviceBadgeCount).toHaveBeenLastCalledWith(2);
  });

  it('clears device badge count immediately on markAllAsRead without looping', async () => {
    apiClient.patch.mockResolvedValueOnce({
      data: { status: 'success' },
    });

    const result = await markAllAsRead();

    expect(result).toBe(true);
    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/read-all');
    expect(setDeviceBadgeCount).toHaveBeenCalledWith(0);
  });

  it('resets sync state and updates badge count on markAsRead', async () => {
    apiClient.patch.mockResolvedValueOnce({
      data: { status: 'success' },
    });
    apiClient.get.mockResolvedValueOnce({
      data: { data: { unread_count: 0 } },
    });

    const result = await markAsRead('notif_99');

    expect(result).toBe(true);
    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/notif_99/read');
    expect(setDeviceBadgeCount).toHaveBeenCalledWith(0);
  });

  it('clears badge for guests without redundant calls on repeated polling', async () => {
    getToken.mockResolvedValue('guest_uuid_xyz');

    // Poll 1 as guest
    const count1 = await getUnreadCount();
    expect(count1).toBe(0);
    expect(setDeviceBadgeCount).toHaveBeenCalledTimes(1);
    expect(setDeviceBadgeCount).toHaveBeenCalledWith(0);

    // Poll 2 as guest
    const count2 = await getUnreadCount();
    expect(count2).toBe(0);
    expect(setDeviceBadgeCount).toHaveBeenCalledTimes(1); // No redundant call
  });
});
