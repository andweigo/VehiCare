import { NativeModules } from 'react-native';
import { setDeviceBadgeCount, clearDeviceBadge } from '../src/services/deviceBadgeService';

describe('deviceBadgeService', () => {
  beforeEach(() => {
    NativeModules.VehiCareBadge = {
      setBadgeCount: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    delete NativeModules.VehiCareBadge;
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

  it('gracefully handles missing native module without throwing', async () => {
    delete NativeModules.VehiCareBadge;
    await expect(setDeviceBadgeCount(3)).resolves.not.toThrow();
  });
});
