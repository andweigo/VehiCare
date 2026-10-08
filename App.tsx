import 'react-native-gesture-handler';

import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/config/googleSignIn';

import { AuthProvider } from './src/context/AuthContext';
import { ChatProvider } from './src/context/ChatContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { SidebarDrawerOverlay, SidebarProvider, useSidebar } from './src/context/SidebarContext';
import { VehicleProvider } from './src/context/VehicleContext';
import VehicleHealthProvider from './src/context/VehicleHealthContext';

import AppNavigator from './src/navigation/AppNavigator';
import GlobalBottomTabBar from './src/components/GlobalBottomTabBar';
import { ThemeProvider } from './src/theme/ThemeContext';

export const navigationRef = createNavigationContainerRef();

const App = () => {
  const activeScreenSyncRef = useRef<((name: string) => void) | null>(null);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <VehicleProvider>
                <VehicleHealthProvider>
                  <ChatProvider>
                    <SidebarProvider>
                      <NavigationContainer
                        ref={navigationRef}
                        onReady={() => {
                          if (navigationRef.isReady()) {
                            const currentRoute = navigationRef.getCurrentRoute();
                            if (currentRoute?.name && activeScreenSyncRef.current) {
                              activeScreenSyncRef.current(currentRoute.name);
                            }
                          }
                        }}
                        onStateChange={() => {
                          if (navigationRef.isReady()) {
                            const currentRoute = navigationRef.getCurrentRoute();
                            if (currentRoute?.name && activeScreenSyncRef.current) {
                              activeScreenSyncRef.current(currentRoute.name);
                            }
                          }
                        }}>
                        <AppNavigatorWithSidebar onSyncReady={fn => (activeScreenSyncRef.current = fn)} />
                      </NavigationContainer>
                    </SidebarProvider>
                  </ChatProvider>
                </VehicleHealthProvider>
              </VehicleProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const AppNavigatorWithSidebar = ({ onSyncReady }: { onSyncReady: (fn: (name: string) => void) => void }) => {
  const { updateActiveScreen } = useSidebar();

  if (onSyncReady) {
    onSyncReady(updateActiveScreen);
  }

  return (
    <View style={styles.appShell}>
      <AppNavigator />
      <GlobalBottomTabBar navigationRef={navigationRef} />
      <SidebarDrawerOverlay navigationRef={navigationRef} />
    </View>
  );
};

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
    position: 'relative',
  },
});

export default App;