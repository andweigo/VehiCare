import { BRAND, BRAND_SOFT, darkColors, lightColors } from './colors';

export const themes = {
  dark: {
    name: 'dark',
    ...darkColors,
    accent: BRAND,
    accentSoft: BRAND_SOFT,
    iconInactive: '#A3A3A3',
    statusBadgeBackground: '#132017',
    statusBadgeText: '#32D583',
  },
  light: {
    name: 'light',
    ...lightColors,
    accent: BRAND,
    accentSoft: BRAND_SOFT,
    iconInactive: '#9CA3AF',
    statusBadgeBackground: '#FEE4DA',
    statusBadgeText: '#C2410C',
  },
};
