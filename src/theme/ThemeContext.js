import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { themes } from './themes';

const THEME_STORAGE_KEY = '@vehicare_theme';
const DEFAULT_THEME_NAME = 'dark';

const ThemeContext = createContext({
  theme: themes.dark,
  themeName: DEFAULT_THEME_NAME,
  isReady: false,
  setThemeName: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeNameState] = useState(DEFAULT_THEME_NAME);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (isMounted && storedTheme && themes[storedTheme]) {
          setThemeNameState(storedTheme);
        }
      } catch (error) {
        console.warn('Could not load theme:', error);
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    loadTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  const theme = useMemo(() => themes[themeName] || themes.dark, [themeName]);

  const setThemeName = useCallback(async (nextTheme, userId = null) => {
    if (!themes[nextTheme]) {
      return;
    }

    try {
      // Save global device theme preference (persists across log in / log out)
      await AsyncStorage.setItem(THEME_STORAGE_KEY, nextTheme);

      // Optionally save user-specific theme preference
      if (userId) {
        await AsyncStorage.setItem(`@vehicare_theme_${userId}`, nextTheme);
      }
    } catch (error) {
      console.warn('Could not save theme:', error);
    }

    setThemeNameState(nextTheme);
  }, []);

  const toggleTheme = useCallback((userId = null) => {
    setThemeName(themeName === 'dark' ? 'light' : 'dark', userId);
  }, [themeName, setThemeName]);

  return (
    <ThemeContext.Provider
      value={{ theme, themeName, isReady, setThemeName, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
};

export default ThemeContext;
