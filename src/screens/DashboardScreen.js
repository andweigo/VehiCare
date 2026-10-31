
import { useEffect, useRef, useState } from 'react';

import {
    Animated,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';


import DashboardActionCard from '../components/DashboardActionCard';
import DashboardGreeting from '../components/DashboardGreeting';
import DashboardVehicleProfileModal from '../components/DashboardVehicleProfileModal';
import NeedHelpSignInModal from '../components/NeedHelpSignInModal';
import RecentActivityCard from '../components/RecentActivityCard';
import Sidebar from '../components/Sidebar';
import VehicleHealthSpeedometer from '../components/VehicleHealthSpeedometer';
import AIUsageCard from '../components/AIUsageCard';
import AIUsageDetailsModal from '../components/AIUsageDetailsModal';
import { useAIUsage } from '../context/AIUsageContext';

import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useVehicle } from '../context/VehicleContext';

import useNeedHelpSignInModal from '../hooks/useNeedHelpSignInModal';
import useRecentActivities from '../hooks/useRecentActivities';

import { BRAND, BRAND_SECONDARY } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { handleActivityPress } from '../utils/activityUtils';

import {
    getDisplayValue,
    getVehicleDisplayDetails,
    getVehicleDisplayName,
} from '../utils/vehicleDisplay';

const getVehicleIconName = (vehicleType, vehicleProfile = null) => {
  let text = `${getDisplayValue(vehicleType, '')}`.toLowerCase().trim();

  if (!text || text === 'unknown' || text === 'other') {
    const v = vehicleProfile || (typeof vehicleType === 'object' ? vehicleType : null);
    if (v) {
      const brand = `${v.custom_brand || v.vehicle_brand || v.vehicleBrand || v.brand || ''}`.toLowerCase();
      const model = `${v.custom_model || v.vehicle_model || v.vehicleModel || v.model || ''}`.toLowerCase();
      const name = `${v.name || ''}`.toLowerCase();
      const combined = `${brand} ${model} ${name}`.trim();

      if (
        combined.includes('moto') ||
        combined.includes('scooter') ||
        combined.includes('mio') ||
        combined.includes('aerox') ||
        combined.includes('nmax') ||
        combined.includes('click') ||
        combined.includes('beat') ||
        combined.includes('wave') ||
        combined.includes('raider') ||
        combined.includes('sniper') ||
        combined.includes('vespa') ||
        combined.includes('ducati') ||
        combined.includes('kawasaki') ||
        combined.includes('harley') ||
        combined.includes('ktm') ||
        combined.includes('ninja') ||
        combined.includes('cbr') ||
        combined.includes('r15') ||
        combined.includes('r3') ||
        combined.includes('pcx') ||
        combined.includes('adv') ||
        combined.includes('barako') ||
        combined.includes('smash') ||
        combined.includes('tmax')
      ) {
        return 'motorcycle';
      }

      if (
        combined.includes('bicycle') ||
        combined.includes('bike') ||
        combined.includes('cycle') ||
        combined.includes('bmx') ||
        combined.includes('shimano') ||
        combined.includes('trek') ||
        combined.includes('giant')
      ) {
        return 'directions-bike';
      }

      if (combined.includes('bus')) {
        return 'directions-bus';
      }

      if (
        combined.includes('truck') ||
        combined.includes('van') ||
        combined.includes('pickup') ||
        combined.includes('hilux') ||
        combined.includes('ranger') ||
        combined.includes('navara') ||
        combined.includes('d-max') ||
        combined.includes('strada') ||
        combined.includes('hiace') ||
        combined.includes('urvan') ||
        combined.includes('l300')
      ) {
        return 'local-shipping';
      }
    }
  }

  if (
    text.includes('moto') ||
    text.includes('motor') ||
    text.includes('scooter') ||
    text.includes('two-wheeler') ||
    text.includes('moped')
  ) {
    return 'motorcycle';
  }

  if (
    text.includes('bicycle') ||
    text.includes('bike') ||
    text.includes('cycle')
  ) {
    return 'directions-bike';
  }

  if (text.includes('bus')) {
    return 'directions-bus';
  }

  if (
    text.includes('truck') ||
    text.includes('van') ||
    text.includes('pickup')
  ) {
    return 'local-shipping';
  }

  if (
    text.includes('car') ||
    text.includes('sedan') ||
    text.includes('suv') ||
    text.includes('hatch') ||
    text.includes('coupe') ||
    text.includes('mpv')
  ) {
    return 'directions-car';
  }

  return 'directions-car';
};

const DashboardScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const isDark = theme.name === 'dark';
  const { isOpen, openSidebar } = useSidebar();
  const { isAuthenticated, loginGoogle, refreshUser } = useAuth();
  const {
    activeVehicle,
    pendingVehicle,
    refreshActiveVehicle,
  } = useVehicle();
  const { usage, isDetailsModalVisible, openDetailsModal, closeDetailsModal, refreshUsage } = useAIUsage();

  const [requestedFeature, setRequestedFeature] = useState('');
  const [requestedRoute, setRequestedRoute] = useState(null);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);

  const helpSignInModal = useNeedHelpSignInModal();
  const { recentActivities, refreshActivities } = useRecentActivities(3);

  const focusRef = useRef({
    refreshActivities,
    refreshUsage,
    refreshUser,
    refreshActiveVehicle,
    isAuthenticated,
    activeVehicle,
  });

  useEffect(() => {
    focusRef.current = {
      refreshActivities,
      refreshUsage,
      refreshUser,
      refreshActiveVehicle,
      isAuthenticated,
      activeVehicle,
    };
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const {
        refreshActivities: doActivities,
        refreshUsage: doUsage,
        refreshUser: doUser,
        refreshActiveVehicle: doVehicle,
        isAuthenticated: isAuth,
        activeVehicle: curVehicle,
      } = focusRef.current;

      if (typeof doActivities === 'function') {
        doActivities();
      }
      if (typeof doUsage === 'function') {
        doUsage();
      }
      if (isAuth && typeof doUser === 'function') {
        doUser().catch(() => {});
      }
      if (isAuth && !curVehicle && typeof doVehicle === 'function') {
        doVehicle().catch?.(() => {});
      }
    });
    return unsubscribe;
  }, [navigation]);

  const vehicleProfile =
    activeVehicle || pendingVehicle;

  const vehicleName =
    getVehicleDisplayName(
      vehicleProfile,
      'Your Vehicle',
    );

  const vehicleBrand =
    getDisplayValue(
      vehicleProfile?.custom_brand ||
        vehicleProfile?.vehicle_brand ||
        vehicleProfile?.vehicleBrand ||
        vehicleProfile?.brand,
      '',
    );

  const vehicleModel =
    getDisplayValue(
      vehicleProfile?.custom_model ||
        vehicleProfile?.vehicle_model ||
        vehicleProfile?.vehicleModel ||
        vehicleProfile?.model,
      '',
    );

  const vehicleBrandAndModel =
    [vehicleBrand, vehicleModel].filter(Boolean).join(' ').trim() ||
    vehicleName ||
    'Your Vehicle';

  const vehicleDetails =
    getVehicleDisplayDetails(
      vehicleProfile,
      '',
    );

  const vehicleYear =
    getDisplayValue(
      vehicleProfile?.vehicle_year ||
        vehicleProfile?.custom_year,
      '',
    );

  const rawVehicleType =
    vehicleProfile?.vehicle_type ??
    vehicleProfile?.vehicleType ??
    vehicleProfile?.vehicle_type_name ??
    vehicleProfile?.type ??
    vehicleProfile?.category;

  const vehicleType =
    getDisplayValue(
      rawVehicleType,
      '',
    );

  const vehicleIconName =
    getVehicleIconName(
      rawVehicleType,
      vehicleProfile,
    );

  const vehiclePhotoUri =
    vehicleProfile?.photo_url ||
    vehicleProfile?.image_url ||
    vehicleProfile?.photo ||
    vehicleProfile?.image ||
    vehicleProfile?.custom_photo ||
    vehicleProfile?.avatar ||
    vehicleProfile?.thumbnail ||
    null;

  // ==================================================
  // AUTH PROMPT
  // ==================================================

  const openAuthPrompt = (
    feature,
    route,
  ) => {
    setRequestedFeature(feature);
    setRequestedRoute(route);

    helpSignInModal.openNeedHelpSignInModal();
  };

  const closeAuthPrompt = () => {
    helpSignInModal.closeNeedHelpSignInModal();

    setRequestedFeature('');
    setRequestedRoute(null);
  };

  const handleNeedHelpGoogleSignIn =
    async () => {
      const route = requestedRoute;

      closeAuthPrompt();

      try {
        await loginGoogle();

        if (route?.name) {
          navigation.navigate(
            route.name,
            route.params,
          );
        }
      } catch (error) {
        if (
          !error?.message
            ?.toLowerCase()
            .includes('cancelled')
        ) {
          console.error(
            'Google sign-in failed:',
            error,
          );
        }
      }
    };

  const handleNeedHelpSignInPress =
    () => {
      const route = requestedRoute;

      closeAuthPrompt();

      navigation.navigate(
        'Login',
        {
          redirectTo: route,
        },
      );
    };

  const handleNeedHelpSignUpPress =
    () => {
      const route = requestedRoute;

      closeAuthPrompt();

      navigation.navigate(
        'Register',
        {
          redirectTo: route,
        },
      );
    };

  const handleProtectedFeature = (
    feature,
    routeName = null,
    routeParams = null,
  ) => {
    if (isAuthenticated) {
      if (routeName) {
        navigation.navigate(
          routeName,
          routeParams,
        );
      }

      return;
    }

    openAuthPrompt(
      feature,
      routeName
        ? {
            name: routeName,
            params: routeParams,
          }
        : null,
    );
  };

  // ==================================================
  // ACTION CARDS
  // ==================================================

  const actionCards = [
    {
      iconName: 'build',
      title: 'Maintenance',
      description: 'Services & reminders',
      feature: 'Keep It Maintained',
      requiresAuth: true,
      routeName: 'Maintenance',
    },
    {
      iconName: 'storefront',
      title: 'Find a pro',
      description: 'Nearby repair shops',
      feature: 'Need Professional Help',
      requiresAuth: false,
      routeName: 'RepairShops',
    },
    {
      iconName: 'show-chart',
      title: 'Vehicle health',
      description: 'See what needs care',
      feature: 'Vehicle Health',
      requiresAuth: true,
      routeName: 'VehicleHealth',
    },
    {
      iconName: 'auto-awesome',
      title: 'Smart recommendations',
      description: 'Your next steps',
      feature: 'Smart Recommendations',
      requiresAuth: true,
      routeName: 'SmartRecommendations',
    },
  ];

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <StatusBar
        barStyle={
          theme.name === 'dark'
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={
          theme.background
        }
      />

      <View style={styles.page}>

        {/* ==================================================
            CONTENT
        ================================================== */}

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="always"
          contentContainerStyle={[
            styles.scrollContent,
            {
              flexGrow: 1,
            },
          ]}
        >
          <View style={styles.content}>

            {/* ==================================================
                HEADER
            ================================================== */}

            <View style={styles.header}>

              <DashboardGreeting />

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[
                    styles.profileButton,
                    {
                      backgroundColor:
                        theme.name === 'dark' ? '#1E1F22' : theme.surfaceAlt,
                      borderColor:
                        theme.name === 'dark' ? '#28292D' : theme.border,
                    },
                  ]}
                  activeOpacity={0.8}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={() => openSidebar()}
                  accessibilityLabel="Open Sidebar Menu"
                >
                  <Icon
                    name="menu"
                    size={22}
                    color={theme.text}
                  />
                </TouchableOpacity>
              </View>

            </View>

            {/* ==================================================
                ACTIVE VEHICLE CARD
            ================================================== */}

            <TouchableOpacity
              style={[
                styles.vehicleCard,
                {
                  backgroundColor: theme.glassSurface || (isDark ? 'rgba(20, 21, 25, 0.90)' : '#18181B'),
                  borderColor: theme.glassBorder || (isDark ? 'rgba(255, 255, 255, 0.14)' : '#2E2F35'),
                },
              ]}
              activeOpacity={0.85}
              hitSlop={{
                top: 10,
                bottom: 10,
                left: 10,
                right: 10,
              }}
              onPress={() =>
                setVehicleModalOpen(
                  true,
                )
              }
            >
              <View style={styles.vehicleIconContainer}>
                {vehiclePhotoUri ? (
                  <Image
                    source={{ uri: vehiclePhotoUri }}
                    style={styles.vehicleCardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Icon
                    name={
                      vehicleIconName
                    }
                    size={24}
                    color={BRAND}
                  />
                )}
              </View>

              <View
                style={styles.vehicleInfo}
              >
                <Text style={styles.vehicleLabel}>
                  ACTIVE VEHICLE
                </Text>

                <Text
                  style={styles.vehicleName}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {vehicleBrandAndModel}
                </Text>
              </View>

              <View
                style={styles.garageAction}
              >
                <Icon
                  name="unfold-more"
                  size={20}
                  color="#8E8E93"
                />
                <Text style={styles.garageText}>
                  Garage
                </Text>
              </View>
            </TouchableOpacity>

            {/* ==================================================
                VEHICLE HEALTH SPEEDOMETER CLUSTER
            ================================================== */}

            <VehicleHealthSpeedometer
              containerStyle={{ marginBottom: 14 }}
              onPress={() =>
                handleProtectedFeature(
                  'Vehicle Health',
                  'VehicleHealth',
                )
              }
            />

            {/* ==================================================
                DIAGNOSIS HERO BANNER ("Something wrong?")
            ================================================== */}

            <View
              style={[
                styles.heroBanner,
                {
                  backgroundColor: theme.glassWarmSurface || (isDark ? 'rgba(32, 22, 18, 0.90)' : '#221814'),
                  borderColor: theme.glassWarmBorder || (isDark ? 'rgba(245, 80, 28, 0.35)' : '#3D271D'),
                },
              ]}
            >
              <View style={styles.heroTopRow}>
                <Icon
                  name="crop-free"
                  size={26}
                  color={BRAND}
                  style={styles.heroIcon}
                />
                <View style={styles.heroTextCol}>
                  <Text style={styles.heroTitle}>
                    Something wrong?
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    Tell VehiCare what you're experiencing.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.heroButton}
                activeOpacity={0.85}
                onPress={() => {
                  if (isAuthenticated) {
                    navigation.navigate('AskVehiCare');
                    return;
                  }

                  openAuthPrompt('Ask VehiCare', {
                    name: 'AskVehiCare',
                    params: null,
                  });
                }}
              >
                <Icon
                  name="call-made"
                  size={18}
                  color="#FFFFFF"
                  style={styles.heroBtnIcon}
                />
                <Text style={styles.heroButtonText}>Start a diagnosis</Text>
              </TouchableOpacity>
            </View>

            {/* ==================================================
                HOW CAN WE HELP? (2x2 GRID)
            ================================================== */}

            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                How can we help?
              </Text>
            </View>

            <View style={styles.actionsGrid}>
              {actionCards.map(card => (
                <DashboardActionCard
                  key={card.title}
                  iconName={card.iconName}
                  title={card.title}
                  description={card.description}
                  onPress={() =>
                    handleProtectedFeature(
                      card.feature,
                      card.routeName,
                      card.routeParams,
                    )
                  }
                />
              ))}
            </View>

            {/* ==================================================
                YOUR RECENT ACTIVITY (SINGLE-ROW ENTRY)
            ================================================== */}

            <TouchableOpacity
              style={[
                styles.recentActivityRow,
                {
                  backgroundColor: theme.glassSurface || (isDark ? 'rgba(20, 21, 25, 0.90)' : '#18181B'),
                  borderColor: theme.glassBorder || (isDark ? 'rgba(255, 255, 255, 0.14)' : '#2E2F35'),
                },
              ]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('Activity')}
            >
              <View style={styles.activityIconCircle}>
                <Icon
                  name="history"
                  size={20}
                  color="#FFFFFF"
                />
              </View>

              <View style={styles.activityTextCol}>
                <Text style={styles.activityRowTitle}>
                  Your recent activity
                </Text>
                <Text style={styles.activityRowSubtitle}>
                  Diagnoses, chats & maintenance
                </Text>
              </View>

              <Icon
                name="chevron-right"
                size={22}
                color="#6E6E73"
              />
            </TouchableOpacity>

            {/* ==================================================
                AI USAGE QUOTA CARD
            ================================================== */}

            <AIUsageCard
              onPress={openDetailsModal}
              onViewDetails={openDetailsModal}
              onUpgrade={() => navigation.navigate('ManagePlan')}
              style={{
                marginBottom: 20,
              }}
            />

          </View>
        </ScrollView>
      </View>


      {/* ==================================================
          SIGN IN MODAL
      ================================================== */}

      <NeedHelpSignInModal
        visible={
          helpSignInModal.visible
        }
        onClose={
          closeAuthPrompt
        }
        onGoogleSignIn={
          handleNeedHelpGoogleSignIn
        }
        onSignInPress={
          handleNeedHelpSignInPress
        }
        onSignUpPress={
          handleNeedHelpSignUpPress
        }
        vehicleName={
          vehicleName
        }
        vehicleMeta={
          vehicleDetails
        }
        vehicleType={
          vehicleType
        }
      />

      {/* ==================================================
          VEHICLE PROFILE MODAL
      ================================================== */}

      <DashboardVehicleProfileModal
        visible={
          vehicleModalOpen
        }
        onClose={() =>
          setVehicleModalOpen(
            false,
          )
        }
        vehicleProfile={
          vehicleProfile
        }
        onManageVehicles={() => {
          setVehicleModalOpen(
            false,
          );

          navigation.navigate(
            'Vehicles',
          );
        }}
      />

      {/* ==================================================
          AI USAGE DETAILS MODAL
      ================================================== */}
      <AIUsageDetailsModal
        visible={isDetailsModalVisible}
        onClose={closeDetailsModal}
        usage={usage}
        onUpgrade={() => {
          closeDetailsModal();
          navigation.navigate('ManagePlan');
        }}
        onCreateAccount={() => {
          closeDetailsModal();
          navigation.navigate('Register');
        }}
        onSignIn={() => {
          closeDetailsModal();
          navigation.navigate('Login');
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // ==================================================
  // MAIN
  // ==================================================

  container: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 140,
  },

  page: {
    flex: 1,
    flexDirection: 'row',
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
  },

  sidebarWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 300,
    zIndex: 10,
    backgroundColor:
      'rgba(0,0,0,0.6)',
  },

  // ==================================================
  // HEADER
  // ==================================================

  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginBottom: 18,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileButton: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent:
      'center',
    position: 'relative',
  },

  // ==================================================
  // VEHICLE CARD
  // ==================================================

  vehicleCard: {
    backgroundColor: 'rgba(20, 21, 25, 0.90)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 5,
  },

  vehicleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 80, 28, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 80, 28, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },

  vehicleCardImage: {
    width: '100%',
    height: '100%',
  },

  vehicleInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },

  vehicleLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 1.1,
    marginBottom: 2,
  },

  vehicleName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },

  vehicleDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
  },

  garageAction: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    paddingHorizontal: 4,
  },

  garageText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    color: '#8E8E93',
    marginTop: 2,
  },

  // ==================================================
  // DIAGNOSIS HERO BANNER
  // ==================================================

  heroBanner: {
    backgroundColor: 'rgba(32, 22, 18, 0.90)',
    borderColor: 'rgba(245, 80, 28, 0.35)',
    borderRadius: 22,
    borderWidth: 1.2,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#F5501C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 7,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  heroIcon: {
    marginTop: 2,
    marginRight: 12,
  },

  heroTextCol: {
    flex: 1,
  },

  heroTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },

  heroSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#D4CDC8',
    lineHeight: 16,
    marginTop: 3,
  },

  heroButton: {
    backgroundColor: '#F5501C',
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: '#F5501C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },

  heroBtnIcon: {
    marginRight: 6,
  },

  heroButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ==================================================
  // SECTION & 2x2 ACTIONS GRID
  // ==================================================

  sectionHeader: {
    marginBottom: 10,
  },

  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16.5,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  // ==================================================
  // RECENT ACTIVITY ROW
  // ==================================================

  recentActivityRow: {
    backgroundColor: 'rgba(20, 21, 25, 0.90)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },

  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  activityTextCol: {
    flex: 1,
  },

  activityRowTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },

  activityRowSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
  },
});

export default DashboardScreen;
