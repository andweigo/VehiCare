import React from 'react';
import renderer, { act } from 'react-test-renderer';
import DashboardVehicleProfileModal from '../src/components/DashboardVehicleProfileModal';
import PasswordSecurityCard from '../src/components/PasswordSecurityCard';
import { normalizeVehicleProfile } from '../src/utils/vehicleDisplay';

jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      name: 'dark',
      background: '#0D0D0D',
      surface: '#151515',
      surfaceAlt: '#212121',
      border: '#2E2E2E',
      text: '#F5F5F5',
      textSecondary: '#8E8E93',
      accent: '#F63B05',
      accentSoft: 'rgba(246, 59, 5, 0.12)',
    },
  }),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 1, email: 'rider@example.com' },
    token: 'test-token',
  }),
}));

jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: { email: 'rider@example.com', providerData: [{ providerId: 'password' }] },
}));

describe('Dashboard Vehicle Profile Modal and Password Security UI', () => {
  describe('Vehicle Icon and Profile Resolution', () => {
    it('correctly normalizes string vehicle types and resolves motorcycle icon for motorcycle profiles', () => {
      const motorcycleVehicle = {
        id: 1,
        type: 'Motorcycle',
        brand: 'Yamaha',
        model: 'Mio Aerox',
        year: '2022',
      };

      const normalized = normalizeVehicleProfile(motorcycleVehicle);
      expect(normalized.vehicle_type).toBe('Motorcycle');
      expect(normalized.vehicle_brand).toBe('Yamaha');
      expect(normalized.vehicle_model).toBe('Mio Aerox');

      let component;
      act(() => {
        component = renderer.create(
          <DashboardVehicleProfileModal
            visible={true}
            onClose={jest.fn()}
            vehicleProfile={motorcycleVehicle}
          />,
        );
      });

      const root = component.root;
      // Motorcycle icon should be used, not generic car
      const icons = root.findAll(n => n.props && n.props.name === 'motorcycle');
      expect(icons.length).toBeGreaterThanOrEqual(1);

      // Should display vehicle type as Motorcycle
      const typeLabels = root.findAll(n => n.props && n.props.children === 'Motorcycle');
      expect(typeLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('deduces motorcycle icon from popular motorcycle model names when vehicle_type is missing', () => {
      const unclassifiedMotorcycle = {
        id: 2,
        brand: 'Honda',
        model: 'Click 150i',
        year: '2023',
      };

      let component;
      act(() => {
        component = renderer.create(
          <DashboardVehicleProfileModal
            visible={true}
            onClose={jest.fn()}
            vehicleProfile={unclassifiedMotorcycle}
          />,
        );
      });

      const root = component.root;
      const icons = root.findAll(n => n.props && n.props.name === 'motorcycle');
      expect(icons.length).toBeGreaterThanOrEqual(1);
    });

    it('resolves truck / van icon when vehicle model is a pickup or van', () => {
      const truckVehicle = {
        id: 3,
        brand: 'Toyota',
        model: 'Hilux',
        year: '2021',
      };

      let component;
      act(() => {
        component = renderer.create(
          <DashboardVehicleProfileModal
            visible={true}
            onClose={jest.fn()}
            vehicleProfile={truckVehicle}
          />,
        );
      });

      const root = component.root;
      const icons = root.findAll(n => n.props && n.props.name === 'local-shipping');
      expect(icons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PasswordSecurityCard Modern UI', () => {
    it('renders the modernized modal header, badge, session bar, and form controls', () => {
      let component;
      act(() => {
        component = renderer.create(
          <PasswordSecurityCard
            visible={true}
            onClose={jest.fn()}
          />,
        );
      });

      const root = component.root;

      // Badge
      expect(root.findByProps({ children: 'SECURITY & AUTH' })).toBeDefined();

      // Title & Subtitle
      expect(root.findByProps({ children: 'Password & Security' })).toBeDefined();
      expect(root.findByProps({ children: 'Manage your credentials and account protection.' })).toBeDefined();

      // Session bar
      expect(root.findByProps({ children: 'Email & Password' })).toBeDefined();

      // Input labels
      expect(root.findByProps({ children: 'CURRENT PASSWORD' })).toBeDefined();
      expect(root.findByProps({ children: 'NEW PASSWORD' })).toBeDefined();
      expect(root.findByProps({ children: 'CONFIRM NEW PASSWORD' })).toBeDefined();

      // Action buttons
      expect(root.findByProps({ children: 'Cancel' })).toBeDefined();
      expect(root.findByProps({ children: 'Update Password' })).toBeDefined();
    });
  });
});
