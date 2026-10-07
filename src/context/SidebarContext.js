import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Sidebar from '../components/Sidebar';

const SidebarContext = createContext(null);

export const SidebarProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState('Dashboard');

  const closeSidebar = useCallback(() => setIsOpen(false), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);
  const toggleSidebar = useCallback(() => setIsOpen(prev => !prev), []);

  const updateActiveScreen = useCallback((routeName) => {
    if (routeName) {
      setActiveScreen(routeName);
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

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* BACKDROP */}
      <TouchableWithoutFeedback onPress={closeSidebar} disabled={!isOpen}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* SOLID OPAQUE SIDEBAR DRAWER */}
      <Animated.View
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
    backgroundColor: '#0A0A0A',
  },
});

export const useSidebar = () => {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }

  return context;
};
