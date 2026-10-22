import { NativeModules } from 'react-native';
import { setDeviceBadgeCount, clearDeviceBadge, resetBadgeCache } from '../src/services/deviceBadgeService';

describe('deviceBadgeService', () => {
  beforeEach(() => {
    resetBadgeCache();
    NativeModules.VehiCareBadge = {
      setBadgeCount: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    delete NativeModules.VehiCareBadge;
    resetBadgeCache();
  });

  it('sets native badge count with positive integer', async () => {
    await setDeviceBadgeCount(5);
    expect(NativeModules.VehiCareBadge.setBadgeCount).toHaveBeenCalledWith(5);
  });

  it('normalizes negative and invalid counts to 0', async () => {
    await setDeviceBadgeCount(-3);
    expect(NativeModules.VehiCareBadge.setBadgeCount).toHaveBeenCalledWith(0);

    await setDeviceBadgeCount('invalid');
    expect(NativeModules.VehiCareBadge.setBadgeCount).toHaveBeenCalledWith(0);
  });

  it('clears device badge by setting count to 0', async () => {
    await clearDeviceBadge();
    expect(NativeModules.VehiCareBadge.setBadgeCount).toHaveBeenCalledWith(0);
  });

  it('skips redundant native calls when positive count is unchanged to avoid buzzing loops', async () => {
    await setDeviceBadgeCount(3);
    expect(NativeModules.VehiCareBadge.setBadgeCount).toHaveBeenCalledTimes(1);
    expect(NativeModules.VehiCareBadge.setBadgeCount).toHaveBeenCalledWith(3);

    // Call again with the exact same count (e.g. 10s poll)
    await setDeviceBadgeCount(3);
    expect(NativeModules.VehiCareBadge.setBadgeCount).toHaveBeenCalledTimes(1);

    // Call with a new count (new notification arrived)
    await setDeviceBadgeCount(4);
    expect(NativeModules.VehiCareBadge.setBadgeCount).toHaveBeenCalledTimes(2);
    expect(NativeModules.VehiCareBadge.setBadgeCount).toHaveBeenLastCalledWith(4);
  });

  it('gracefully handles missing native module without throwing', async () => {
    delete NativeModules.VehiCareBadge;
    await expect(setDeviceBadgeCount(3)).resolves.not.toThrow();
  });
});
