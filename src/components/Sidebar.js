import { useCallback, useEffect, useState } from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useVehicle } from '../context/VehicleContext';
import useConfirmSignOutModal from '../hooks/useConfirmSignOutModal';
import useNeedHelpSignInModal from '../hooks/useNeedHelpSignInModal';
import useRealtimeUpdates from '../hooks/useRealtimeUpdates';
import notificationService from '../services/notificationService';
import { useTheme } from '../theme/ThemeContext';
import { getDisplayValue } from '../utils/vehicleDisplay';
import ConfirmSignOutModal from './ConfirmSignOutModal';
import NeedHelpSignInModal from './NeedHelpSignInModal';
import UserAccountCard from './UserAccountCard';

const NavigationItem = ({
  icon,
  label,
  screen,
  activeScreen,
  navigation,
  onClose,
  theme,
  badgeCount,
}) => {
  const active = activeScreen === screen;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[
        styles.navigationItem,
        active && [styles.navigationItemActive, { backgroundColor: theme.surfaceAlt }],
      ]}
      onPress={() => {
        onClose?.();

        if (navigation) {
          // Navigate using the topmost parent to ensure the route is handled
          let root = navigation;
          while (root && root.getParent && root.getParent() && root.getParent() !== root) {
            const p = root.getParent();
            if (!p) break;
            root = p;
          }

          if (root && root.navigate) {
            root.navigate(screen);
          } else {
            navigation.navigate(screen);
          }
        }
      }}>

      <View style={styles.navigationIconContainer}>
        <Icon
          name={icon}
          size={18}
          style={[
            styles.navigationIcon,
            active && styles.navigationIconActive,
            { color: active ? theme.accent : theme.textSecondary },
          ]}
        />
        {badgeCount > 0 && (
          <View style={[styles.navBadge, { backgroundColor: theme.accent }]}>
            <Text style={[styles.navBadgeText, { color: theme.surface }]}>{badgeCount > 9 ? '9+' : badgeCount}</Text>
          </View>
        )}
      </View>

      <Text
        style={[
          styles.navigationLabel,
          active && styles.navigationLabelActive,
          { color: active ? theme.text : theme.textSecondary },
        ]}>
        {label}
      </Text>

      {active && <View style={[styles.activeIndicator, { backgroundColor: theme.accent }]} />}
    </TouchableOpacity>
  );
};

const Sidebar = ({ navigation, activeScreen = 'Dashboard', onClose, topInset = 0 }) => {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    try {
      const items = await notificationService.fetchNotifications();
      setUnreadCount(items.filter(i => !i.isRead).length);
    } catch (err) {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const timer = setInterval(loadUnreadCount, 10000);
    return () => clearInterval(timer);
  }, [loadUnreadCount]);

  useRealtimeUpdates(user?.id, {
    'Illuminate\\Notifications\\Events\\BroadcastNotificationCreated': loadUnreadCount,
    'payment.updated': loadUnreadCount,
  });

  const signOutModal = useConfirmSignOutModal();
  const authPrompt = useNeedHelpSignInModal();
  const { activeVehicle, pendingVehicle } = useVehicle();

  const profileName = user?.displayName || user?.name || user?.full_name || user?.email?.split('@')[0] || 'VehiCare User';
  const profileEmail = user?.email || 'Sign in to continue';
  const profilePhoto = user?.photoURL ? { uri: user.photoURL } : null;
  const profileInitial = profileName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || '')
    .join('') || 'U';

  const handleConfirmSignOut = async () => {
    signOutModal.closeConfirmSignOutModal();
    onClose?.();

    try {
      await logout();
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Welcome' }],
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const { theme, themeName, toggleTheme } = useTheme();

  const handleProfilePress = () => {
    if (user) {
      return;
    }

    authPrompt.openNeedHelpSignInModal();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme?.background || '#0A0A0A', borderRightColor: theme?.border || '#292929' }]}> 
      <View style={[styles.header, topInset > 0 && { paddingTop: topInset + 10 }]}>
        <View style={styles.brandContainer}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <View>
            <Text style={[styles.brandName, { color: theme.text }]}>VehiCare</Text>
            <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>SMART VEHICLE CARE</Text>
          </View>
        </View>

        {onClose && (
          <TouchableOpacity
            style={[styles.closeButton]}
            activeOpacity={0.7}
            onPress={onClose}>
            <Icon name="close" size={20} color={theme.accent} />
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.headerDivider, { backgroundColor: theme.border }]} />

      <UserAccountCard
        username={profileName}
        handle={user?.username || user?.handle || user?.email?.split('@')[0] || '@vehicare'}
        email={profileEmail}
        avatar={profilePhoto?.uri}
        verified={Boolean(user?.email)}
        darkMode={themeName === 'dark'}
        onToggleDarkMode={() => toggleTheme()}
        onSwitchAccount={account => {
          if (account) {
            console.log('Switch account', account);
          }
        }}
        onAddAccount={() => navigation.navigate('AddAccount')}
        onLogout={async () => {
          signOutModal.openConfirmSignOutModal();
        }}
      />

      <ScrollView
        style={styles.navigation}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>MAIN</Text>

        <NavigationItem
          icon="home"
          label="Home"
          screen="Dashboard"
          activeScreen={activeScreen}
          navigation={navigation}
          onClose={onClose}
          theme={theme}
        />

        <NavigationItem
          icon="directions-car"
          label="My Garage"
          screen="Vehicles"
          activeScreen={activeScreen}
          navigation={navigation}
          onClose={onClose}
          theme={theme}
        />

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>NOTIFICATIONS</Text>
        <NavigationItem
          icon="notifications"
          label="Notifications"
          screen="Notifications"
          activeScreen={activeScreen}
          navigation={navigation}
          onClose={onClose}
          theme={theme}
          badgeCount={unreadCount}
        />

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ASSISTANCE</Text>
        <NavigationItem
          icon="medical-services"
          label="Diagnose a Problem"
          screen="Diagnostics"
          activeScreen={activeScreen}
          navigation={navigation}
          onClose={onClose}
          theme={theme}
        />
        <NavigationItem
          icon="build"
          label="Maintenance"
          screen="Maintenance"
          activeScreen={activeScreen}
          navigation={navigation}
          onClose={onClose}
          theme={theme}
        />
        <NavigationItem
          icon="history"
          label="History"
          screen="History"
          activeScreen={activeScreen}
          navigation={navigation}
          onClose={onClose}
          theme={theme}
        />
        <NavigationItem
          icon="place"
          label="Repair Shops"
          screen="RepairShops"
          activeScreen={activeScreen}
          navigation={navigation}
          onClose={onClose}
          theme={theme}
        />

        <View style={styles.navigationSpacer} />

        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ACCOUNT</Text>
        <NavigationItem
          icon="person"
          label="Profile"
          screen="Profile"
          activeScreen={activeScreen}
          navigation={navigation}
          onClose={onClose}
          theme={theme}
        />
        <NavigationItem
          icon="settings"
          label="Settings"
          screen="Settings"
          activeScreen={activeScreen}
          navigation={navigation}
          onClose={onClose}
          theme={theme}
        />
        <NavigationItem
          icon="help-outline"
          label="Help & Support"
          screen="HelpSupport"
          activeScreen={activeScreen}
          navigation={navigation}
          onClose={onClose}
          theme={theme}
        />
      </ScrollView>

      <View style={styles.footer}>
        <View style={[styles.footerDivider, { backgroundColor: theme.border }]} />

        <TouchableOpacity
          style={styles.signOutButton}
          activeOpacity={0.75}
          onPress={signOutModal.openConfirmSignOutModal}>
          <View style={[styles.signOutIconContainer, { backgroundColor: theme.surfaceAlt }]}> 
            <Icon name="logout" size={18} color={theme.textSecondary} />
          </View>

          <Text style={[styles.signOutText, { color: theme.textSecondary }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: theme.textSecondary }]}>VehiCare v1.0.0</Text>
      </View>

      <NeedHelpSignInModal
        visible={authPrompt.visible}
        onClose={authPrompt.closeNeedHelpSignInModal}
        onGoogleSignIn={() => {
          authPrompt.closeNeedHelpSignInModal();
          navigation.navigate('Login');
        }}
        onSignInPress={() => {
          authPrompt.closeNeedHelpSignInModal();
          navigation.navigate('Login');
        }}
        onSignUpPress={() => {
          authPrompt.closeNeedHelpSignInModal();
          navigation.navigate('Register');
        }}
        vehicleName={profileName}
        vehicleMeta={profileEmail}
        vehicleType={getDisplayValue(activeVehicle?.vehicle_type || pendingVehicle?.vehicle_type, '')}
      />

      <ConfirmSignOutModal
        visible={signOutModal.visible}
        onCancel={signOutModal.closeConfirmSignOutModal}
        onConfirm={handleConfirmSignOut}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: 300,
    backgroundColor: '#0A0A0A',
    borderRightWidth: 1,
    borderRightColor: '#292929',
  },
  header: {
    minHeight: 82,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  logoImage: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  brandName: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 19,
  },
  brandSubtitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 7,
    letterSpacing: 1,
    marginTop: 2,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: '#F63B05',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 25,
  },
  headerDivider: {
    height: 1,
    backgroundColor: '#292929',
    marginHorizontal: 20,
  },
  userCard: {
    marginHorizontal: 14,
    marginTop: 18,
    marginBottom: 8,
    padding: 12,
    borderRadius: 15,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#242424',
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#202020',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userAvatarText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  userAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontSize: 12,
  },
  userStatus: {
    fontFamily: 'Inter-Regular',
    color: '#666666',
    fontSize: 9,
    marginTop: 3,
  },
  userArrow: {
    color: '#666666',
    fontSize: 22,
  },
  navigation: {
    flex: 1,
    paddingHorizontal: 14,
  },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    color: '#4F4F4F',
    fontSize: 8,
    letterSpacing: 1.2,
    marginTop: 18,
    marginBottom: 7,
    marginLeft: 8,
  },
  navigationItem: {
    height: 48,
    borderRadius: 13,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    position: 'relative',
  },
  navigationItemActive: {
    backgroundColor: '#1A100D',
  },
  navigationIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  navigationIconContainerActive: {
    backgroundColor: 'rgba(246, 59, 5, 0.12)',
  },
  navigationIcon: {
    color: '#6B6B6B',
    fontSize: 17,
  },
  navigationIconActive: {
    color: '#F63B05',
  },
  navigationLabel: {
    fontFamily: 'Inter-Medium',
    color: '#858585',
    fontSize: 12,
    flex: 1,
  },
  navigationLabelActive: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  activeIndicator: {
    position: 'absolute',
    right: 0,
    width: 3,
    height: 22,
    borderRadius: 3,
    backgroundColor: '#F63B05',
  },
  navBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  navBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
  },
  navigationSpacer: {
    height: 4,
  },
  footer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#292929',
    marginBottom: 8,
  },
  signOutButton: {
    height: 48,
    borderRadius: 13,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  signOutIcon: {
    color: '#777777',
    fontSize: 18,
  },
  signOutText: {
    fontFamily: 'Inter-Medium',
    color: '#777777',
    fontSize: 12,
  },
  version: {
    fontFamily: 'Inter-Regular',
    color: '#3F3F3F',
    fontSize: 8,
    textAlign: 'center',
    marginTop: 5,
  },
});

export default Sidebar;
