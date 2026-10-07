import apiClient from './apiClient';

const normalizeAuthResponse = response => {
  const body = response?.data ?? {};

  if (body && typeof body === 'object' && 'token' in body) {
    return body;
  }

  if (body?.data && typeof body.data === 'object') {
    return body.data;
  }

  return body;
};

export const register = async (name, email, password) => {
  const response = await apiClient.post('/register', {
    name,
    email,
    password,
    password_confirmation: password,
  });

  return normalizeAuthResponse(response);
};

export const login = async (email, password) => {
  const response = await apiClient.post('/login', {
    email,
    password,
  });

  return normalizeAuthResponse(response);
};

export const logout = async () => {
  const response = await apiClient.post('/logout');

  return response.data;
};

export const googleLogin = async idToken => {
  const response = await apiClient.post('/google-login', {
    id_token: idToken,
  });

  return normalizeAuthResponse(response);
};

export const googleRegister = async idToken => {
  const response = await apiClient.post('/google-register', {
    id_token: idToken,
  });

  return normalizeAuthResponse(response);
};

export const updateProfile = async profile => {
  const response = await apiClient.patch('/user', profile);
  return normalizeAuthResponse(response);
};

export const sendOtp = async (email, purpose = 'registration') => {
  const response = await apiClient.post('/auth/send-otp', {
    email,
    purpose,
  });
  return response?.data;
};

export const verifyOtp = async (email, purpose, code) => {
  const response = await apiClient.post('/auth/verify-otp', {
    email,
    purpose,
    code,
  });
  return response?.data;
};

export const resendOtp = async (email, purpose = 'registration') => {
  const response = await apiClient.post('/auth/resend-otp', {
    email,
    purpose,
  });
  return response?.data;
};

export const resetPassword = async (email, code, password) => {
  const response = await apiClient.post('/auth/reset-password', {
    email,
    code,
    password,
    password_confirmation: password,
  });
  return response?.data;
};