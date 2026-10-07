jest.mock('../src/api/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

import apiClient from '../src/api/apiClient';
import { googleLogin, login, register } from '../src/api/authApi';

describe('authApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the backend token and user for login responses', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          user: { id: 1, email: 'user@example.com' },
          token: 'backend-token',
        },
      },
    });

    const result = await login('user@example.com', 'password123');

    expect(result).toEqual({
      user: { id: 1, email: 'user@example.com' },
      token: 'backend-token',
    });
  });

  it('posts the Google ID token to the backend login endpoint', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          user: { id: 2, email: 'google@example.com' },
          token: 'google-token',
        },
      },
    });

    await googleLogin('google-id-token');

    expect(apiClient.post).toHaveBeenCalledWith('/google-login', {
      id_token: 'google-id-token',
    });
  });

  it('returns the backend token for register responses', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          user: { id: 3, email: 'new@example.com' },
          token: 'register-token',
        },
      },
    });

    const result = await register('New User', 'new@example.com', 'password123');

    expect(result).toEqual({
      user: { id: 3, email: 'new@example.com' },
      token: 'register-token',
    });
  });
});
