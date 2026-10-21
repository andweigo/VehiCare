import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import CustomModal from '../src/components/CustomModal';
import ManagePlanScreen from '../src/screens/ManagePlanScreen';

jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#0D0D0D',
      surface: '#151515',
      surfaceAlt: '#1C1C1E',
      border: '#292929',
      accent: '#F5501C',
      accentSoft: '#F5501C20',
      text: '#FFFFFF',
      textSecondary: '#8E8E93',
      modalOverlay: 'rgba(0,0,0,0.7)',
    },
  }),
}));

const mockDefaultUser = {
  id: 42,
  name: 'Test Driver',
  email: 'driver@vehicare.com',
  subscription_plan: 'premium',
  subscription_cycle: 'monthly',
  subscription_status: 'active',
  vehicle_limit: 5,
};

let mockCurrentUser = mockDefaultUser;

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    refreshUser: jest.fn(),
  }),
}));

jest.mock('../src/api/subscriptionApi', () => ({
  getSubscriptionStatus: jest.fn().mockResolvedValue({
    status: 'success',
    restriction_state: 'none',
    can_submit_payment: true,
    active_payment: null,
  }),
  getPaymentHistory: jest.fn().mockResolvedValue({
    status: 'success',
    payments: [],
  }),
  subscribePlan: jest.fn().mockResolvedValue({
    status: 'success',
    payment: { id: 101, reference_number: 'VC-20261021-9999' },
  }),
}));

jest.mock('../src/api/vehicleApi', () => ({
  getMyVehicles: jest.fn().mockResolvedValue([]),
}));

jest.mock('../src/hooks/useRealtimeUpdates', () => jest.fn());

describe('CustomModal and ManagePlanScreen Display Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = { ...mockDefaultUser };
  });

  describe('CustomModal Component', () => {
    it('renders title, message, and single primary button in alert mode', () => {
      const handleConfirm = jest.fn();
      let tree;
      act(() => {
        tree = renderer.create(
          <CustomModal
            visible={true}
            title="Notice"
            message="Payment completed successfully."
            type="success"
            primaryLabel="Got it"
            onConfirm={handleConfirm}
          />
        );
      });

      const root = tree.root;
      const texts = root.findAllByType(Text).map(t => String(t.props.children || ''));
      expect(texts).toContain('Notice');
      expect(texts).toContain('Payment completed successfully.');
      expect(texts).toContain('Got it');

      const buttons = root.findAllByType(TouchableOpacity);
      expect(buttons.length).toBe(1);

      act(() => {
        buttons[0].props.onPress();
      });
      expect(handleConfirm).toHaveBeenCalled();
    });

    it('renders secondary button when secondaryLabel is provided', () => {
      const handleConfirm = jest.fn();
      const handleCancel = jest.fn();
      let tree;
      act(() => {
        tree = renderer.create(
          <CustomModal
            visible={true}
            title="Confirm Action"
            message="Are you sure you want to proceed?"
            primaryLabel="Confirm"
            secondaryLabel="Cancel"
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        );
      });

      const root = tree.root;
      const texts = root.findAllByType(Text).map(t => String(t.props.children || ''));
      expect(texts).toContain('Confirm');
      expect(texts).toContain('Cancel');

      const buttons = root.findAllByType(TouchableOpacity);
      expect(buttons.length).toBe(2);

      // Cancel button
      act(() => {
        buttons[0].props.onPress();
      });
      expect(handleCancel).toHaveBeenCalled();

      // Confirm button
      act(() => {
        buttons[1].props.onPress();
      });
      expect(handleConfirm).toHaveBeenCalled();
    });
  });

  describe('ManagePlanScreen Plan Cards & Refund Bug Resolution', () => {
    it('shows "Current Active Plan" on Monthly and "Switch to Yearly" on Yearly card when active monthly premium (NO "Refund in Progress")', async () => {
      let tree;
      await act(async () => {
        tree = renderer.create(<ManagePlanScreen navigation={{ navigate: jest.fn() }} />);
      });

      const root = tree.root;
      const allTexts = root.findAllByType(Text).map(t => {
        if (Array.isArray(t.props.children)) {
          return t.props.children.join('');
        }
        return String(t.props.children || '');
      });

      // Verify the active monthly plan is recognized
      expect(allTexts).toContain('ACTIVE MONTHLY PLAN');
      expect(allTexts).toContain('Current Active Plan');

      // The yearly card must allow switching
      expect(allTexts).toContain('Switch to Yearly — ₱1,490/yr');

      // Crucial: "Refund in Progress" MUST NOT be present when no refund is in progress!
      expect(allTexts).not.toContain('Refund in Progress');
    });

    it('shows "Refund in Progress" only when restriction_state is refund_processing', async () => {
      const { getSubscriptionStatus } = require('../src/api/subscriptionApi');
      getSubscriptionStatus.mockResolvedValueOnce({
        status: 'success',
        restriction_state: 'refund_processing',
        can_submit_payment: false,
        active_payment: { id: 88, status: 'rejected', refund_status: 'processing' },
      });

      let tree;
      await act(async () => {
        tree = renderer.create(<ManagePlanScreen navigation={{ navigate: jest.fn() }} />);
      });

      const root = tree.root;
      const allTexts = root.findAllByType(Text).map(t => {
        if (Array.isArray(t.props.children)) {
          return t.props.children.join('');
        }
        return String(t.props.children || '');
      });

      expect(allTexts).toContain('Refund in Progress');
    });

    it('shows "Verification Pending" when restriction_state is pending_verification', async () => {
      const { getSubscriptionStatus } = require('../src/api/subscriptionApi');
      getSubscriptionStatus.mockResolvedValueOnce({
        status: 'success',
        restriction_state: 'pending_verification',
        can_submit_payment: false,
        active_payment: { id: 89, status: 'pending' },
      });

      let tree;
      await act(async () => {
        tree = renderer.create(<ManagePlanScreen navigation={{ navigate: jest.fn() }} />);
      });

      const root = tree.root;
      const allTexts = root.findAllByType(Text).map(t => {
        if (Array.isArray(t.props.children)) {
          return t.props.children.join('');
        }
        return String(t.props.children || '');
      });

      expect(allTexts).toContain('Verification Pending');
      expect(allTexts).not.toContain('Refund in Progress');
    });
  });
});
