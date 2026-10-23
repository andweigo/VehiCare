import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Modal, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
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
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSidebar}>
      <View style={styles.modalRoot}>
        {/* BACKDROP VISUAL OVERLAY */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.backdrop,
            { opacity: backdropOpacity },
          ]}
        />

        {/* SOLID OPAQUE SIDEBAR DRAWER ON LEFT */}
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

        {/* OUTSIDE CONTAINER TAP TARGET ON RIGHT - Tapping anywhere outside the 300px sidebar closes it */}
        <TouchableOpacity
          testID="sidebar-outside-dismiss"
          style={styles.outsideDismissArea}
          activeOpacity={1}
          onPress={closeSidebar}
          accessibilityRole="button"
          accessibilityLabel="Close Sidebar Menu">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeSidebar}
          />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sidebarWrapper: {
    width: 300,
    maxWidth: '82%',
    height: '100%',
    backgroundColor: '#0A0A0A',
    elevation: 32,
    zIndex: 2,
  },
  outsideDismissArea: {
    flex: 1,
    height: '100%',
    zIndex: 2,
  },
});

export const useSidebar = () => {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }

  return context;
};
