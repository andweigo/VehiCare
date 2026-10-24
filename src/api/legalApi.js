import apiClient from './apiClient';

export const getLegalConsentStatus = async () => {
  const response = await apiClient.get('/user/consents/status');
  return response?.data?.data || response?.data || {};
};

export const acceptCurrentLegalVersions = async ({ termsVersion, privacyVersion }) => {
  const response = await apiClient.post('/user/consents', {
    accepted: true,
    terms_version: termsVersion,
    privacy_version: privacyVersion,
  });
  return response?.data?.data || response?.data || {};
};
