import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sidebar from '../components/Sidebar';

const SidebarContext = createContext(null);

export const SidebarProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState(null);

  const closeSidebar = useCallback(() => setIsOpen(false), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);
  const toggleSidebar = useCallback(() => setIsOpen(prev => !prev), []);

  const updateActiveScreen = useCallback((routeName) => {
    if (routeName) {
      setActiveScreen(prev => {
        if (prev && prev !== routeName) {
          setIsOpen(false);
        }
        return routeName;
      });
      const authScreens = ['Welcome', 'Login', 'Register', 'Auth', 'ForgotPassword'];
      if (authScreens.includes(routeName)) {
        setIsOpen(false);
      }
    }
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        openSidebar,
        closeSidebar,
        toggleSidebar,
        activeScreen,
        updateActiveScreen,
      }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const SidebarDrawerOverlay = ({ navigationRef }) => {
  const { isOpen, closeSidebar, activeScreen } = useSidebar();
  const sidebarX = useRef(new Animated.Value(-300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(sidebarX, {
        toValue: isOpen ? 0 : -300,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, sidebarX, backdropOpacity]);

  useEffect(() => {
    if (!isOpen) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      closeSidebar();
      return true;
    });

    return () => backHandler.remove();
  }, [isOpen, closeSidebar]);

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        isOpen && styles.openOverlay,
      ]}
      pointerEvents={isOpen ? 'box-none' : 'none'}>
      {/* BACKDROP - Tapping outside the sidebar dismisses it */}
      <Pressable
        style={styles.backdropPressable}
        onPress={closeSidebar}
        disabled={!isOpen}
        accessibilityRole="button"
        accessibilityLabel="Close Sidebar Menu">
        <Animated.View
          pointerEvents="none"
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        />
      </Pressable>

      {/* SOLID OPAQUE SIDEBAR DRAWER */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          styles.sidebarWrapper,
          {
            transform: [{ translateX: sidebarX }],
          },
        ]}>
        <Sidebar
          navigation={navigationRef}
          activeScreen={activeScreen}
          onClose={closeSidebar}
          topInset={insets.top}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sidebarWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 300,
    maxWidth: '82%',
    backgroundColor: '#0A0A0A',
    elevation: 31,
    zIndex: 2,
  },
  openOverlay: {
    elevation: 30,
    zIndex: 30,
  },
});

export const useSidebar = () => {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }

  return context;
};
