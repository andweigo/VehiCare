
import { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import useRealtimeUpdates from '../hooks/useRealtimeUpdates';
import notificationService from '../services/notificationService';
import { useTheme } from '../theme/ThemeContext';

const tabs = [
  { key: 'Home', icon: 'home', label: 'Home' },
  { key: 'Diagnose', icon: 'medical-services', label: 'Diagnose' },
  { key: 'Maintenance', icon: 'build', label: 'Maintenance' },
  { key: 'Notifications', icon: 'notifications', label: 'Notifications' },
  { key: 'Profile', icon: 'person', label: 'Profile' },
];

const BottomTabBar = ({ activeTab, onTabPress, isSidebarOpen }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isOpen: sidebarOpenFromContext } = useSidebar();
  const sidebarOpen = isSidebarOpen !== undefined ? isSidebarOpen : sidebarOpenFromContext;
  const [unread, setUnread] = useState(0);

  const loadUnread = useCallback(async () => {
    try {
      const items = await notificationService.fetchNotifications();
      setUnread(items.filter(i => !i.isRead).length);
    } catch (err) {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadUnread();
    const timer = setInterval(loadUnread, 10000);
    return () => clearInterval(timer);
  }, [activeTab, loadUnread]);

  useRealtimeUpdates(user?.id, {
    'Illuminate\\Notifications\\Events\\BroadcastNotificationCreated': loadUnread,
    'payment.updated': loadUnread,
  });

  return (
    <View
      style={[
        styles.wrapper,
        sidebarOpen && styles.hiddenUnderSidebar,
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}> 
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              activeOpacity={0.78}
              onPress={() => onTabPress(tab.key)}
            >
              <View
                style={[
                  styles.iconContainer,
                  isActive && styles.iconContainerActive,
                ]}
              >
                <Icon
                  name={tab.icon}
                  size={23}
                  color={isActive ? theme.accent : theme.textSecondary}
                />
                {tab.key === 'Notifications' && unread > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.badgeText}>{unread > 9 ? '9+' : `${unread}`}</Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                  { color: isActive ? theme.accent : theme.textSecondary },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    zIndex: 20,
  },

  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    backgroundColor: '#000000',

    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1D1D1D',

    paddingVertical: 7,
    paddingHorizontal: 6,

    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 8,
  },

  hiddenUnderSidebar: {
    zIndex: 5,
    elevation: 2,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 58,
  },

  iconContainer: {
    width: 38,
    height: 32,
    borderRadius: 11,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 2,
  },

  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },


  tabLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 9,
    lineHeight: 11,
    color: '#777777',
    textAlign: 'center',
  },

  tabLabelActive: {
    color: '#F63B05',
    fontFamily: 'Inter-SemiBold',
  },
});

export default BottomTabBar;
