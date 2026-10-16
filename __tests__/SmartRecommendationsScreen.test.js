const mockActiveVehicle = {
  id: 1,
  vehicle_id: 1,
  type: 'Motorcycle',
  brand: 'Yamaha',
  model: 'Mio Aerox',
  year: '2022',
};

jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#0D0D0D',
      accent: '#F63B05',
      textSecondary: '#858585',
      surface: '#151515',
      border: '#292929',
      text: '#F5F5F5',
    },
  }),
}));

jest.mock('../src/context/VehicleContext', () => ({
  useVehicle: () => ({
    activeVehicle: mockActiveVehicle,
    selectedVehicle: mockActiveVehicle,
  }),
}));

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 1, name: 'Test Rider' },
  }),
}));

jest.mock('../src/hooks/useVehicleHealth', () => () => ({
  healthPercentage: 88,
  healthStatus: 'Good',
  completedRecommendations: [],
  loading: false,
}));

jest.mock('../src/api/vehicleApi', () => ({
  getDiagnosticsHistory: jest.fn().mockResolvedValue([]),
  getHistory: jest.fn().mockResolvedValue({ data: [] }),
  getRepairRecords: jest.fn().mockResolvedValue([]),
}));

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import SmartRecommendationsScreen from '../src/screens/SmartRecommendationsScreen';

describe('SmartRecommendationsScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders cleanly without ReferenceError when recommendations is empty or loaded', () => {
    let component;
    act(() => {
      component = renderer.create(
        <SmartRecommendationsScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />,
      );
    });

    expect(component).toBeDefined();
    expect(component.toJSON()).toBeTruthy();
  });
});
