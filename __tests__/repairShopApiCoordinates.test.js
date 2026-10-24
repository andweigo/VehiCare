import apiClient from '../src/api/apiClient';
import { fetchNearbyRepairShops } from '../src/services/repairShopApi';

jest.mock('../src/api/apiClient', () => ({
  get: jest.fn().mockResolvedValue({ data: { status: 'success', data: [] } }),
}));

describe('repair shop search coordinates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requires an explicit location instead of sending a hidden default', async () => {
    await expect(fetchNearbyRepairShops()).rejects.toThrow('Choose a valid map location');
    await expect(fetchNearbyRepairShops({ latitude: null, longitude: null })).rejects.toThrow('Choose a valid map location');
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('accepts zero latitude and longitude as real coordinates', async () => {
    await fetchNearbyRepairShops({ latitude: 0, longitude: 0 });
    expect(apiClient.get).toHaveBeenCalledWith('/repair-shops/nearby', expect.objectContaining({
      params: expect.objectContaining({ latitude: 0, longitude: 0 }),
    }));
  });
});
