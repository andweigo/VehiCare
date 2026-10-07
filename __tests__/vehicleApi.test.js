jest.mock('../src/services/storageService', () => ({
  getToken: jest.fn(),
}));

jest.mock('../src/api/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    defaults: {
      headers: {
        common: {},
      },
    },
  },
}));

const { getToken } = require('../src/services/storageService');
const apiClient = require('../src/api/apiClient').default;
const vehicleApi = require('../src/api/vehicleApi').default;

describe('vehicleApi auth header handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('attaches a bearer token to protected vehicle requests', async () => {
    getToken.mockResolvedValue('sanctum-token');
    apiClient.get.mockResolvedValue({ data: { data: [] } });

    await vehicleApi.getMyVehicles();

    expect(apiClient.get).toHaveBeenCalledWith(
      '/my-vehicles',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer sanctum-token',
        }),
      }),
    );
  });
});
