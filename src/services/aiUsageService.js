import apiClient from '../api/apiClient';

export const fetchAIUsageStats = async () => {
  try {
    const response = await apiClient.get('/ai/usage');
    return response?.data?.data || null;
  } catch (error) {
    console.warn('[aiUsageService] Unable to fetch AI usage stats:', error?.message || error);
    return null;
  }
};

export default {
  fetchAIUsageStats,
};
