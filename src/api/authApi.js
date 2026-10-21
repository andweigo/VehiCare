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

export const verifyOtp = async (arg1, arg2, arg3) => {
  const email = arg1;
  let purpose = 'registration';
  let code = '';

  if (arg2 === 'registration' || arg2 === 'password_reset') {
    purpose = arg2;
    code = arg3;
  } else if (arg3 === 'registration' || arg3 === 'password_reset') {
    code = arg2;
    purpose = arg3;
  } else if (typeof arg2 === 'string' && /^\d+$/.test(arg2.trim())) {
    code = arg2;
    purpose = arg3 || 'registration';
  } else {
    purpose = arg2 || 'registration';
    code = arg3;
  }

  const response = await apiClient.post('/auth/verify-otp', {
    email: String(email).trim().toLowerCase(),
    purpose,
    code: String(code).trim(),
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

export const getMe = async () => {
  const response = await apiClient.get('/user/me');
  return normalizeAuthResponse(response);
};
