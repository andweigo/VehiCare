
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  DeviceEventEmitter,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import useRealtimeUpdates from '../hooks/useRealtimeUpdates';
import { consumePendingPushNotification } from '../services/deviceBadgeService';
import { requestNotificationPermission } from '../services/permissionService';
import notificationService, {
  NEW_IN_APP_NOTIFICATION_EVENT,
  NOTIFICATION_READ_STATE_CHANGED,
} from '../services/notificationService';
import { BRAND } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import CustomToast from './CustomToast';

// ─── Tab definitions ────────────────────────────────────────────────────────

const TABS = [
  { key: 'Home',          icon: 'home',             label: 'Home' },
  { key: 'Maintenance',   icon: 'build',             label: 'Maintenance' },
  { key: 'Diagnose',      icon: 'medical-services',  label: 'Diagnose', isCenter: true },
  { key: 'Notifications', icon: 'notifications',     label: 'Notifications' },
  { key: 'Profile',       icon: 'person',            label: 'Profile' },
];

// Screens where the bottom tab bar should be visible
const TAB_VISIBLE_ROUTES = new Set([
  'Dashboard',
  'Maintenance',
  'Notifications',
  'Profile',
]);

// Map route name → active tab key
const ROUTE_TO_TAB = {
  Dashboard:                'Home',
  Diagnostics:              'Diagnose',
  AskVehiCare:              'Diagnose',
  Maintenance:              'Maintenance',
  MaintenanceCategory:      'Maintenance',
  MaintenanceGuide:         'Maintenance',
  MaintenanceHistory:       'Maintenance',
  SmartRecommendations:     'Maintenance',
  History:                  'Maintenance',
  RepairShops:              'Maintenance',
  VehicleHealth:            'Maintenance',
  Notifications:            'Notifications',
  NotificationPreferences:  'Notifications',
  Profile:                  'Profile',
  PersonalInformation:      'Profile',
  ManagePlan:               'Profile',
  Settings:                 'Profile',
  Activity:                 'Profile',
};

// ─── Component ───────────────────────────────────────────────────────────────

const GlobalBottomTabBar = ({ navigationRef }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { activeScreen, isOpen: sidebarOpen } = useSidebar();
  const [unread, setUnread] = useState(0);
  const [inAppToast, setInAppToast] = useState(null);
  const mountedRef = useRef(false);
  const currentUserIdRef = useRef(user?.id);
  const inFlightRef = useRef(null);
  const loadUnreadRef = useRef(null);
  const handlePushOpenRef = useRef(null);
  currentUserIdRef.current = user?.id;

  // Derive which tab is active from the current route name
  const activeTab = ROUTE_TO_TAB[activeScreen] || null;

  // Only show when the current route is one of our main tab screens
  const isVisible = TAB_VISIBLE_ROUTES.has(activeScreen);

  // ── Notifications badge ──
  const loadUnread = useCallback(async () => {
    const userId = user?.id;
    if (!userId) {
      if (mountedRef.current) {
        setUnread(0);
        setInAppToast(null);
      }
      return;
    }

    if (inFlightRef.current) {
      if (inFlightRef.current.userId === userId) {
        await inFlightRef.current.promise;
        return;
      }

      await inFlightRef.current.promise;
      if (mountedRef.current) loadUnreadRef.current?.();
      return;
    }

    const request = notificationService.getUnreadCount();
    const entry = { userId, promise: request };
    inFlightRef.current = entry;

    try {
      const count = await request;
      if (mountedRef.current && currentUserIdRef.current === userId && count !== null) {
        setUnread(count);
        if (count > 0 && !notificationService.getLatestUnreadNotification?.()) {
          notificationService.fetchNotifications().catch(() => {});
        }
      }
    } finally {
      if (inFlightRef.current === entry) {
        inFlightRef.current = null;
      }
      if (mountedRef.current && currentUserIdRef.current !== userId) {
        loadUnreadRef.current?.();
      }
    }
  }, [user?.id]);
  loadUnreadRef.current = loadUnread;

  useEffect(() => {
    mountedRef.current = true;
    requestNotificationPermission({ showSettingsDialog: false }).catch(() => {});
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    loadUnread();
    const timer = setInterval(loadUnread, 10000);

    const handlePushOpen = async payload => {
      setInAppToast(null);
      const fallback = notificationService.getLatestUnreadNotification?.() || null;
      const resolved = payload && (payload.id || payload.title || payload.message) ? payload : fallback;
      if (!resolved) return;

      const notifId = resolved.id ? String(resolved.id) : (fallback?.id ? String(fallback.id) : null);
      if (notifId) {
        notificationService.markAsRead(notifId).catch(() => {});
      }

      const tryNavigate = (attempt = 0) => {
        if (navigationRef?.isReady?.()) {
          navigationRef.navigate('Notifications', {
            openNotificationId: notifId,
            openNotification: {
              ...fallback,
              ...resolved,
              id: notifId || resolved.id,
              isRead: true,
            },
            _pushClickTs: Date.now(),
          });
        } else if (attempt < 10) {
          setTimeout(() => tryNavigate(attempt + 1), 150);
        }
      };
      tryNavigate();
    };
    handlePushOpenRef.current = handlePushOpen;

    const checkPendingPush = async () => {
      const pending = await consumePendingPushNotification();
      if (pending) {
        handlePushOpen(pending);
      }
    };
    checkPendingPush();

    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        loadUnread();
        checkPendingPush();
      }
    });
    const readStateSubscription = DeviceEventEmitter.addListener(
      NOTIFICATION_READ_STATE_CHANGED,
      loadUnread,
    );
    const pushClickSubscription = DeviceEventEmitter.addListener(
      'vehicarePushNotificationClicked',
      handlePushOpen,
    );
    const inAppNotifSubscription = DeviceEventEmitter.addListener(
      NEW_IN_APP_NOTIFICATION_EVENT,
      notification => {
        if (mountedRef.current && notification && (notification.title || notification.message)) {
          setInAppToast({
            ...notification,
            visible: true,
            type: 'notification',
            duration: 5000,
          });
        }
      },
    );

    return () => {
      clearInterval(timer);
      appStateSubscription.remove();
      readStateSubscription.remove();
      pushClickSubscription.remove();
      inAppNotifSubscription.remove();
    };
  }, [loadUnread, navigationRef]);

  useRealtimeUpdates(user?.id, {
    'Illuminate\\Notifications\\Events\\BroadcastNotificationCreated': broadcastData => {
      if (broadcastData && (broadcastData.title || broadcastData.message) && mountedRef.current) {
        setInAppToast({
          id: broadcastData.id || broadcastData.announcement_id || null,
          title: broadcastData.title || 'New Notification',
          message: broadcastData.message || '',
          type: 'notification',
          notificationType: broadcastData.type || 'announcement',
          visible: true,
          duration: 5000,
        });
      }
      loadUnread();
    },
    'payment.updated': loadUnread,
  });

  // ── Tab press ──
  const handleTabPress = (tabKey) => {
    if (!navigationRef?.isReady?.()) return;

    if (tabKey === 'Home')          return navigationRef.navigate('Dashboard');
    if (tabKey === 'Diagnose')      return navigationRef.navigate('Diagnostics');
    if (tabKey === 'Maintenance')   return navigationRef.navigate('Maintenance');
    if (tabKey === 'Notifications') return navigationRef.navigate('Notifications');
    if (tabKey === 'Profile')       return navigationRef.navigate('Profile');
  };

  return (
    <>
      <CustomToast
        visible={Boolean(inAppToast?.visible)}
        type="notification"
        title={inAppToast?.title || 'Notification'}
        message={inAppToast?.message || ''}
        duration={5000}
        onHide={() => setInAppToast(null)}
        onPress={() => {
          if (inAppToast) {
            handlePushOpenRef.current?.(inAppToast);
          }
        }}
      />
      {!isVisible || sidebarOpen ? null : (
        <View
          style={styles.wrapper}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.container,
              {
                backgroundColor: theme.name === 'dark' ? 'rgba(18, 19, 22, 0.92)' : 'rgba(22, 23, 26, 0.94)',
                borderColor: theme.glassBorder || 'rgba(255, 255, 255, 0.12)',
              },
            ]}
          >
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              const isDark = theme.name === 'dark';
              const activeIconColor = theme.accent || BRAND;
              const inactiveIconColor = isDark ? '#8E8E93' : '#64748B';

              if (tab.isCenter) {
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={styles.centerTabItem}
                    activeOpacity={0.8}
                    onPress={() => handleTabPress(tab.key)}
                    accessibilityLabel="Start Diagnosis"
                  >
                    <View style={styles.inactiveIconBox}>
                      <Icon
                        name="medical-services"
                        size={23}
                        color={isActive ? activeIconColor : inactiveIconColor}
                      />
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tabItem}
                  activeOpacity={0.78}
                  onPress={() => handleTabPress(tab.key)}
                  accessibilityLabel={tab.label}
                >
                  <View style={styles.inactiveIconBox}>
                    <Icon
                      name={tab.icon}
                      size={23}
                      color={isActive ? activeIconColor : inactiveIconColor}
                    />
                    {tab.key === 'Notifications' && unread > 0 && (
                      <View style={styles.badgeDot} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 20,
    zIndex: 25,
    alignItems: 'center',
  },

  container: {
    width: '100%',
    maxWidth: 400,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',

    borderRadius: 36,
    borderWidth: 1,

    paddingHorizontal: 8,

    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 12,
  },

  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    paddingHorizontal: 4,
  },

  activePill: {
    width: 50,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },

  inactiveIconBox: {
    width: 44,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  centerTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },

  centerCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },

  centerCircleActive: {
    backgroundColor: 'rgba(245, 80, 28, 0.18)',
    borderColor: 'rgba(245, 80, 28, 0.48)',
    borderWidth: 1.5,
    shadowColor: '#F5501C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
});

export default GlobalBottomTabBar;
