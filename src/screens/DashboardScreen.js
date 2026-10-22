
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
import VehicleHealthCard from '../components/VehicleHealthCard';
import AIUsageCard from '../components/AIUsageCard';
import AIUsageDetailsModal from '../components/AIUsageDetailsModal';
import { useAIUsage } from '../context/AIUsageContext';

import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useVehicle } from '../context/VehicleContext';

import useNeedHelpSignInModal from '../hooks/useNeedHelpSignInModal';
import useRecentActivities from '../hooks/useRecentActivities';

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
      categoryKey: 'maint',
      title: 'Keep It Maintained',
      description:
        'Stay on top of services and maintenance reminders.',
      feature:
        'Keep It Maintained',
      requiresAuth: true,
      routeName: 'Maintenance',
    },
    {
      iconName: 'storefront',
      categoryKey: 'shop',
      title: 'Need Professional Help?',
      description:
        'Find nearby repair shops when your vehicle needs help.',
      feature:
        'Need Professional Help',
      requiresAuth: false,
      routeName: 'RepairShops',
    },
    {
      iconName: 'medical-services',
      categoryKey: 'diag',
      title: 'Something Wrong?',
      description:
        'Diagnose a current vehicle problem with AI.',
      feature:
        'Ask VehiCare',
      requiresAuth: true,
      routeName:
        'AskVehiCare',
    },
    {
      iconName: 'auto-awesome',
      categoryKey: 'smart',
      title: 'Smart Recommendations',
      description:
        'Get personalized maintenance advice based on symptoms and history.',
      feature:
        'Smart Recommendations',
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
                        theme.surfaceAlt,
                      borderColor:
                        theme.border,
                    },
                  ]}
                  activeOpacity={0.8}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={() => openSidebar()}
                  accessibilityLabel="Open Sidebar Menu"
                >
                  <Icon
                    name="menu"
                    size={24}
                    color={theme.text}
                  />
                </TouchableOpacity>
              </View>

            </View>

            {/* ==================================================
                VEHICLE CARD
            ================================================== */}

            <TouchableOpacity
              style={[
                styles.vehicleCard,
                {
                  backgroundColor:
                    theme.surfaceAlt,
                  borderColor:
                    theme.accent,
                  shadowColor:
                    theme.shadow,
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
              <View
                style={[
                  styles.vehicleIconContainer,
                  {
                    backgroundColor:
                      theme.accentSoft,
                  },
                ]}
              >
                <Icon
                  name={
                    vehicleIconName
                  }
                  size={28}
                  color={theme.accent}
                />
              </View>

              <View
                style={styles.vehicleInfo}
              >
                <Text
                  style={[
                    styles.vehicleLabel,
                    {
                      color:
                        theme.accent,
                    },
                  ]}
                >
                  YOUR VEHICLE
                </Text>

                <Text
                  style={[
                    styles.vehicleName,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {vehicleName}
                </Text>

                <Text
                  style={[
                    styles.vehicleDetails,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {vehicleDetails}
                </Text>
              </View>

              <View
                style={styles.arrowButton}
              >
                <Icon
                  name="chevron-right"
                  size={28}
                  color="#777777"
                />
              </View>
            </TouchableOpacity>

            {/* ==================================================
                AI CARD
            ================================================== */}

            <TouchableOpacity
              style={[
                styles.aiCard,
                {
                  backgroundColor:
                    theme.surfaceAlt,
                  borderColor:
                    theme.accent,
                },
              ]}
              activeOpacity={0.85}
              onPress={() => {
                if (
                  isAuthenticated
                ) {
                  navigation.navigate(
                    'AskVehiCare',
                  );

                  return;
                }

                openAuthPrompt(
                  'Ask VehiCare',
                  {
                    name:
                      'AskVehiCare',
                    params: null,
                  },
                );
              }}
            >
              <View
                style={[
                  styles.aiIconContainer,
                  {
                    backgroundColor:
                      'transparent',
                  },
                ]}
              >
                <Image
                  source={require('../assets/logo.png')}
                  style={
                    styles.aiLogo
                  }
                  resizeMode="contain"
                />
              </View>

              <View
                style={styles.aiContent}
              >
                <Text
                  style={[
                    styles.aiSmallLabel,
                    {
                      color:
                        theme.accent,
                    },
                  ]}
                >
                  NEED HELP WITH YOUR VEHICLE?
                </Text>

                <Text
                  style={[
                    styles.aiTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  Something wrong?
                </Text>

                <Text
                  style={[
                    styles.aiDescription,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Tell VehiCare what
                  you're experiencing.
                </Text>
              </View>

              <Icon
                name="chevron-right"
                size={28}
                color={
                  theme.textSecondary
                }
              />
            </TouchableOpacity>

            {/* ==================================================
                HELP SECTION
            ================================================== */}

            <View
              style={
                styles.sectionHeader
              }
            >
              <View>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  How can we help?
                </Text>

                <Text
                  style={[
                    styles.sectionSubtitle,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Take care of your
                  vehicle with ease
                </Text>
              </View>
            </View>

            {/* ==================================================
                ACTIONS
            ================================================== */}

            <View
              style={styles.actions}
            >
              {actionCards.map(
                card => (
                  <DashboardActionCard
                    key={
                      card.title
                    }
                    iconName={
                      card.iconName
                    }
                    categoryKey={
                      card.categoryKey
                    }
                    title={
                      card.title
                    }
                    description={
                      card.description
                    }
                    onPress={() =>
                      handleProtectedFeature(
                        card.feature,
                        card.routeName,
                        card.routeParams,
                      )
                    }
                  />
                ),
              )}
            </View>

            {/* ==================================================
                RECENT ACTIVITY
            ================================================== */}

            <RecentActivityCard
              activities={recentActivities}
              onViewAll={() => navigation.navigate('Activity')}
              onItemPress={activity => handleActivityPress(activity, navigation)}
            />

            {/* ==================================================
                AI USAGE QUOTA CARD
            ================================================== */}

            <AIUsageCard
              onPress={openDetailsModal}
              onViewDetails={openDetailsModal}
              onUpgrade={() => navigation.navigate('ManagePlan')}
            />

            {/* ==================================================
                VEHICLE HEALTH
            ================================================== */}

            <View
              style={styles.actions}
            >
              <VehicleHealthCard
                onPress={() =>
                  handleProtectedFeature(
                    'Vehicle Health',
                    'VehicleHealth',
                  )
                }
              />
            </View>

            {/* ==================================================
                VEHICLE INFORMATION
            ================================================== */}

            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor:
                    theme.surfaceAlt,
                  borderColor:
                    theme.border,
                },
              ]}
            >
              <View
                style={styles.infoHeader}
              >
                <View>
                  <Text
                    style={[
                      styles.infoTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    Your Vehicle
                  </Text>

                  <Text
                    style={[
                      styles.infoSubtitle,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {vehicleName}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        theme.statusBadgeBackground,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          theme.success,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          theme.statusBadgeText,
                      },
                    ]}
                  >
                    ACTIVE
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor:
                      theme.border,
                  },
                ]}
              />

              <View
                style={
                  styles.infoStats
                }
              >
                <View
                  style={styles.stat}
                >
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    {vehicleYear ||
                      '—'}
                  </Text>

                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    YEAR
                  </Text>
                </View>

                <View
                  style={[
                    styles.statDivider,
                    {
                      backgroundColor:
                        theme.border,
                    },
                  ]}
                />

                <View
                  style={styles.stat}
                >
                  <Text
                    style={[
                      styles.statValue,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {vehicleType ||
                      '—'}
                  </Text>

                  <Text
                    style={[
                      styles.statLabel,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    TYPE
                  </Text>
                </View>
              </View>
            </View>

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
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
    marginBottom: 24,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  profileButton: {
    width: 45,
    height: 45,
    flexShrink: 0,
    borderRadius: 15,
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
    minHeight: 104,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 3,
  },

  vehicleIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent:
      'center',
    marginRight: 14,
  },

  vehicleInfo: {
    flex: 1,
    minWidth: 0,
  },

  vehicleLabel: {
    fontFamily:
      'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.1,
    marginBottom: 4,
  },

  vehicleName: {
    fontFamily:
      'Outfit-Bold',
    fontSize: 18,
    marginBottom: 2,
  },

  vehicleDetails: {
    fontFamily:
      'Inter-Regular',
    fontSize: 11,
    marginTop: 3,
  },

  arrowButton: {
    width: 28,
    height: 40,
    alignItems: 'center',
    justifyContent:
      'center',
    flexShrink: 0,
  },

  // ==================================================
  // AI CARD
  // ==================================================

  aiCard: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: 21,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 27,
  },

  aiIconContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent:
      'center',
    marginRight: 14,
    flexShrink: 0,
  },

  aiLogo: {
    width: 60,
    height: 60,
  },

  aiContent: {
    flex: 1,
    minWidth: 0,
  },

  aiSmallLabel: {
    fontFamily:
      'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 0.9,
    marginBottom: 4,
  },

  aiTitle: {
    fontFamily:
      'Outfit-Bold',
    fontSize: 19,
  },

  aiDescription: {
    fontFamily:
      'Inter-Regular',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },

  // ==================================================
  // SECTION
  // ==================================================

  sectionHeader: {
    marginBottom: 14,
  },

  sectionTitle: {
    fontFamily:
      'Outfit-Bold',
    fontSize: 20,
  },

  sectionSubtitle: {
    fontFamily:
      'Inter-Regular',
    fontSize: 11,
    marginTop: 3,
  },

  // ==================================================
  // ACTIONS
  // ==================================================

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent:
      'space-between',
    marginBottom: 20,
  },

  // ==================================================
  // VEHICLE INFORMATION
  // ==================================================

  infoCard: {
    borderWidth: 1,
    borderRadius: 19,
    padding: 16,
    marginBottom: 20,
  },

  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  infoTitle: {
    fontFamily:
      'Outfit-Bold',
    fontSize: 16,
  },

  infoSubtitle: {
    fontFamily:
      'Inter-Regular',
    fontSize: 11,
    marginTop: 3,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  statusText: {
    fontFamily:
      'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 0.6,
  },

  divider: {
    height: 1,
    marginVertical: 15,
  },

  infoStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  stat: {
    flex: 1,
    minWidth: 0,
  },

  statValue: {
    fontFamily:
      'Outfit-Bold',
    fontSize: 15,
  },

  statLabel: {
    fontFamily:
      'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 0.8,
    marginTop: 4,
  },

  statDivider: {
    width: 1,
    height: 30,
    marginHorizontal: 15,
  },
});

export default DashboardScreen;
