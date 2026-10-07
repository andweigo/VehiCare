jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('lottie-react-native', () => 'LottieView');

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

import { Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';

import VehicleLoadingScreen from '../src/screens/VehicleLoadingScreen';

describe('VehicleLoadingScreen', () => {
  it('renders the loading UI', () => {
    let component;

    act(() => {
      component = renderer.create(
        <VehicleLoadingScreen navigation={{ replace: jest.fn() }} />,
      );
    });

    const hasHeading = component.root.findAllByType(Text).some(
      node => node.props.children === 'Preparing your vehicle',
    );

    expect(hasHeading).toBe(true);
  });
});
