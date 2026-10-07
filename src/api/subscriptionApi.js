import apiClient from './apiClient';

export const subscribePlan = async (
  plan = 'premium',
  billingCycle = 'monthly',
  paymentMethod = 'card',
  referenceNumber = null,
) => {
  const response = await apiClient.post('/subscription/subscribe', {
    plan,
    billing_cycle: billingCycle,
    payment_method: paymentMethod,
    reference_number: referenceNumber,
  });
  return response.data;
};

export const getSubscriptionStatus = async () => {
  const response = await apiClient.get('/subscription/status');
  return response.data;
};

export const getPaymentHistory = async () => {
  const response = await apiClient.get('/subscription/payments');
  return response.data;
};

export default {
  subscribePlan,
  getSubscriptionStatus,
  getPaymentHistory,
};
