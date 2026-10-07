import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import vehicleApi from '../api/vehicleApi';

import ConfirmActionModal from '../components/ConfirmActionModal';
import LimitModal from '../components/LimitModal';
import VehicleCard from '../components/VehicleCard';
import VehicleProfileModal from '../components/VehicleProfileModal';

import {
  getDisplayValue,
  getVehicleDisplayName,
} from '../utils/vehicleDisplay';

import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useVehicle } from '../context/VehicleContext';
import { useTheme } from '../theme/ThemeContext';

const ORANGE = '#F63B05';
const BACKGROUND = '#0A0A0A';
const CARD = '#151515';
const CARD_LIGHT = '#1C1C1C';
const BORDER = '#292929';
const TEXT = '#FFFFFF';
const MUTED = '#858585';
const GREEN = '#32D583';

const VEHICLES_STORAGE_KEY =
  '@vehicare_vehicles';

const PLAN_STORAGE_KEY =
  '@vehicare_plan';

/*
 * ============================================
 * VEHICLE HELPERS
 * ============================================
 */

const getVehicleId = vehicle => {
  return String(
    vehicle?.id ??
      vehicle?.vehicle_id ??
      vehicle?.vehicleId ??
      `${getDisplayValue(
        vehicle?.custom_brand ??
          vehicle?.vehicle_brand ??
          vehicle?.vehicleBrand ??
          vehicle?.brand,
        'Unknown',
      )}-${getDisplayValue(
        vehicle?.custom_model ??
          vehicle?.vehicle_model ??
          vehicle?.vehicleModel ??
          vehicle?.model,
        'Unknown',
      )}-${getDisplayValue(
        vehicle?.vehicle_year ??
          vehicle?.vehicleYear ??
          vehicle?.custom_year ??
          vehicle?.year,
        'Unknown',
      )}`,
  );
};

/*
 * Get vehicle type from all supported
 * backend/context field names.
 */
const getVehicleType = vehicle => {
  const value =
    vehicle?.vehicle_type ??
    vehicle?.vehicleType ??
    vehicle?.type ??
    vehicle?.vehicle_type_name ??
    vehicle?.vehicleTypeName;

  return getDisplayValue(value, 'Unknown');
};

/*
 * Dynamically determine the MaterialIcons
 * icon for the vehicle type.
 */
const getVehicleIconName = vehicle => {
  const type = getVehicleType(vehicle)
    .toLowerCase()
    .trim();

  if (
    type.includes('motorcycle') ||
    type.includes('motorbike') ||
    type.includes('motor bike') ||
    type.includes('moto') ||
    type.includes('scooter')
  ) {
    return 'motorcycle';
  }

  if (
    type.includes('bicycle') ||
    type.includes('bike') ||
    type.includes('cycle')
  ) {
    return 'directions-bike';
  }

  if (
    type.includes('bus') ||
    type.includes('coach')
  ) {
    return 'directions-bus';
  }

  if (
    type.includes('truck') ||
    type.includes('van') ||
    type.includes('pickup') ||
    type.includes('pick-up') ||
    type.includes('lorry')
  ) {
    return 'local-shipping';
  }

  return 'directions-car';
};

const normalizeVehicle = vehicle => ({
  ...vehicle,

  id: getVehicleId(vehicle),

  isActive: Boolean(
    vehicle?.isActive ??
      vehicle?.is_active ??
      vehicle?.active,
  ),

  isArchived: Boolean(
    vehicle?.isArchived ??
      vehicle?.archived_at ??
      vehicle?.archived,
  ),
});

/*
 * ============================================
 * SCREEN
 * ============================================
 */

const MyVehiclesScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { openSidebar } = useSidebar();

  const [vehicles, setVehicles] =
    useState([]);

  const [plan, setPlan] =
    useState('free');

  const [loading, setLoading] =
    useState(true);

  const [activeLoadingId, setActiveLoadingId] =
    useState(null);

  const [profileVisible, setProfileVisible] =
    useState(false);

  const [selectedVehicle, setSelectedVehicle] =
    useState(null);

  const [confirmVisible, setConfirmVisible] =
    useState(false);

  const [confirmAction, setConfirmAction] =
    useState(null);

  const [confirmVehicle, setConfirmVehicle] =
    useState(null);

  const [sortOrder, setSortOrder] =
    useState('recent');

  const [limitModalVisible, setLimitModalVisible] =
    useState(false);

  const { user, updateUser } =
    useAuth();

  const backendPlan =
    user?.subscription_plan;

  const usedPlan =
    backendPlan ?? plan;

  const isPremium =
    usedPlan === 'premium';

  const vehicleLimit =
    user?.vehicle_limit ??
    (isPremium ? 5 : 1);

  const {
    activeVehicle: accountActive,
    setActiveVehicle,
  } = useVehicle();

  /*
   * ============================================
   * ACTIVE VEHICLE
   * ============================================
   */

  const activeVehicle = useMemo(
    () =>
      accountActive ??
      vehicles.find(
        vehicle =>
          vehicle.isActive &&
          !vehicle.isArchived,
      ),
    [vehicles, accountActive],
  );

  /*
   * ============================================
   * MERGE VEHICLE CONTEXT
   * WITH VEHICLE LIST
   * ============================================
   */

  const displayVehicles = useMemo(() => {
    const activeId = accountActive
      ? String(
          getVehicleId(accountActive),
        )
      : null;

    const merged = vehicles
      .map(vehicle => {
        const vehicleId =
          String(getVehicleId(vehicle));

        return {
          ...vehicle,

          isActive: activeId
            ? vehicleId === activeId
            : Boolean(vehicle.isActive || vehicle.is_active || vehicle.active),
        };
      })
      .filter(Boolean);

    if (
      accountActive &&
      !merged.some(
        vehicle =>
          String(
            getVehicleId(vehicle),
          ) === activeId,
      )
    ) {
      merged.unshift(
        normalizeVehicle({
          ...accountActive,
          isActive: true,
        }),
      );
    }

    return merged;
  }, [vehicles, accountActive]);

  /*
   * ============================================
   * VEHICLE COUNTS
   * ============================================
   */

  const activeVehicleCount =
    useMemo(
      () =>
        displayVehicles.filter(
          vehicle =>
            !vehicle.isArchived,
        ).length,
      [displayVehicles],
    );

  const vehicleCount =
    useMemo(
      () =>
        displayVehicles.length,
      [displayVehicles],
    );

  const canAddVehicle =
    vehicleCount < vehicleLimit;

  /*
   * ============================================
   * SORT
   * ============================================
   */

  const sortedVehicles =
    useMemo(() => {
      const compareDates = (a, b) => {
        const parseDate = value => {
          const date =
            new Date(value);

          return Number.isNaN(
            date.getTime(),
          )
            ? 0
            : date.getTime();
        };

        const aTime = parseDate(
          a.created_at ??
            a.createdAt,
        );

        const bTime = parseDate(
          b.created_at ??
            b.createdAt,
        );

        if (
          sortOrder ===
          'oldest'
        ) {
          return aTime - bTime;
        }

        return bTime - aTime;
      };

      return [
        ...displayVehicles,
      ].sort(compareDates);
    }, [
      displayVehicles,
      sortOrder,
    ]);

  /*
   * ============================================
   * SECTIONS
   * ============================================
   */

  const vehicleSections =
    useMemo(() => {
      const activeVehicles =
        sortedVehicles.filter(
          vehicle =>
            !vehicle.isArchived,
        );

      const archivedVehicles =
        sortedVehicles.filter(
          vehicle =>
            vehicle.isArchived,
        );

      const sections = [];

      if (
        activeVehicles.length > 0
      ) {
        sections.push({
          title: 'Vehicles',
          data: activeVehicles,
        });
      }

      if (
        archivedVehicles.length > 0
      ) {
        sections.push({
          title:
            'Archived Vehicles',
          data: archivedVehicles,
        });
      }

      return sections;
    }, [sortedVehicles]);

  /*
   * ============================================
   * LOAD VEHICLES
   * ============================================
   */

  const loadVehicles =
    useCallback(async () => {
      try {
        setLoading(true);

        let parsedVehicles = [];
        let storedPlan = null;

        /*
         * ACCOUNT USER
         */

        if (user) {
          try {
            const accountVehicles =
              await vehicleApi.getMyVehicles();

            if (
              Array.isArray(
                accountVehicles,
              )
            ) {
              parsedVehicles =
                accountVehicles.map(
                  normalizeVehicle,
                );
            }
          } catch (error) {
            console.warn(
              'Unable to load account vehicles:',
              error,
            );
          }
        }

        /*
         * GUEST USER
         */

        if (!user) {
          const storedVehicles =
            await AsyncStorage.getItem(
              VEHICLES_STORAGE_KEY,
            );

          storedPlan =
            await AsyncStorage.getItem(
              PLAN_STORAGE_KEY,
            );

          if (storedVehicles) {
            try {
              const parsed =
                JSON.parse(
                  storedVehicles,
                );

              if (
                Array.isArray(
                  parsed,
                )
              ) {
                parsedVehicles =
                  parsed.map(
                    normalizeVehicle,
                  );
              }
            } catch (error) {
              console.warn(
                'Failed to parse stored vehicles:',
                error,
              );
            }
          }
        }

        const currentPlan =
          storedPlan === 'premium'
            ? 'premium'
            : 'free';

        if (!user) {
          setPlan(currentPlan);
        }

        /*
         * Automatically activate the
         * only guest vehicle if needed.
         */

        if (
          !user &&
          parsedVehicles.length > 0
        ) {
          const hasActiveVehicle =
            parsedVehicles.some(
              v => v.isActive,
            );

          if (!hasActiveVehicle) {
            parsedVehicles[0].isActive =
              true;

            await AsyncStorage.setItem(
              VEHICLES_STORAGE_KEY,
              JSON.stringify(
                parsedVehicles,
              ),
            );
          }
        }

        setVehicles(
          parsedVehicles,
        );
      } catch (error) {
        console.error(
          'Failed to load vehicles:',
          error,
        );
      } finally {
        setLoading(false);
      }
    }, [user]);

  /*
   * ============================================
   * INITIAL LOAD + REFRESH
   * ============================================
   */

  useEffect(() => {
    loadVehicles();

    const unsubscribe =
      navigation?.addListener?.(
        'focus',
        loadVehicles,
      );

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [
    navigation,
    loadVehicles,
  ]);

  useEffect(() => {
    if (route?.params?.vehicle || route?.params?.openVehicleId) {
      const target = route.params.vehicle || displayVehicles.find(v => String(v.id) === String(route.params.openVehicleId));
      if (target) {
        setSelectedVehicle(target);
        setProfileVisible(true);
      }
    }
  }, [route?.params?.vehicle, route?.params?.openVehicleId, displayVehicles]);

  /*
   * ============================================
   * SAVE LOCAL VEHICLES
   * ============================================
   */

  const saveVehicles =
    async updatedVehicles => {
      if (!user) {
        await AsyncStorage.setItem(
          VEHICLES_STORAGE_KEY,
          JSON.stringify(
            updatedVehicles,
          ),
        );
      }

      setVehicles(
        updatedVehicles,
      );
    };

  /*
   * ============================================
   * OPEN VEHICLE
   * ============================================
   */

  const handleVehiclePress =
    vehicle => {
      setSelectedVehicle(
        vehicle,
      );

      setProfileVisible(true);
    };

  /*
   * ============================================
   * CLOSE PROFILE
   * ============================================
   */

  const handleCloseProfile =
    () => {
      setProfileVisible(false);
      setSelectedVehicle(null);
    };

  /*
   * ============================================
   * SET ACTIVE
   * ============================================
   */

  const handleSetActive =
    async vehicle => {
      if (!isPremium) {
        Alert.alert(
          'Premium Feature',
          'Free accounts use their only registered vehicle. Upgrade to Premium to manage multiple vehicles and switch between them.',
        );

        return;
      }

      if (
        vehicle.isArchived ||
        vehicle.isActive
      ) {
        return;
      }

      try {
        setActiveLoadingId(
          vehicle.id,
        );

        await vehicleApi.setActiveVehicle(
          vehicle.id,
        );

        const updatedVehicles =
          vehicles.map(item => ({
            ...item,
            isActive:
              item.id ===
              vehicle.id,
          }));

        if (
          user &&
          typeof updateUser ===
            'function'
        ) {
          await updateUser({
            ...user,
            active_vehicle_id:
              vehicle.id,
          });
        }

        await saveVehicles(
          updatedVehicles,
        );

        /*
         * Keep the full vehicle object
         * in VehicleContext so the active
         * card can determine its type/icon.
         */
        setActiveVehicle({
          ...vehicle,
          isActive: true,
          isArchived: false,
        });

        setSelectedVehicle(
          prev =>
            prev?.id === vehicle.id
              ? {
                  ...prev,
                  isActive: true,
                }
              : prev,
        );
      } catch (error) {
        console.error(
          'Failed to set active vehicle:',
          error,
        );

        Alert.alert(
          'Unable to Change Vehicle',
          'Something went wrong while changing your active vehicle. Please try again.',
        );
      } finally {
        setActiveLoadingId(
          null,
        );
      }
    };

  /*
   * ============================================
   * ADD VEHICLE
   * ============================================
   */

  const handleAddVehicle =
    () => {
      if (!canAddVehicle) {
        setLimitModalVisible(true);
        return;
      }

      navigation.navigate(
        'VehicleDetails',
        {
          from: 'MyVehicles',
          mode: 'create',
        },
      );
    };

  /*
   * ============================================
   * CORRECT VEHICLE
   * ============================================
   */

  const handleCorrectVehicle =
    vehicle => {
      if (vehicle?.isArchived) {
        Alert.alert(
          'Archived Vehicle',
          'Restore this vehicle before submitting a correction request.',
        );

        return;
      }

      setConfirmAction(
        'correct',
      );

      setConfirmVehicle(
        vehicle,
      );

      setConfirmVisible(true);
    };

  /*
   * ============================================
   * ARCHIVE VEHICLE
   * ============================================
   */

  const handleArchiveVehicle =
    vehicle => {
      if (!isPremium) {
        Alert.alert(
          'Premium Feature',
          'Vehicle archiving is available for Premium accounts.',
        );

        return;
      }

      if (
        vehicle?.isArchived
      ) {
        return;
      }

      if (vehicle.isActive) {
        const nonArchivedVehicles =
          displayVehicles.filter(
            v =>
              !v.isArchived,
          );

        const otherNonArchived =
          nonArchivedVehicles.filter(
            v =>
              v.id !==
              vehicle.id,
          );

        if (
          otherNonArchived.length ===
          0
        ) {
          Alert.alert(
            'Active Vehicle',
            'This vehicle is currently active. Select another vehicle as active before archiving this vehicle.',
            [
              {
                text: 'OK',
                style: 'cancel',
              },
            ],
          );

          return;
        }

        Alert.alert(
          'Active Vehicle',
          'This vehicle is currently active. Select another vehicle as active before archiving this vehicle.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text:
                'Choose Another Vehicle',
              onPress: () => {
                setProfileVisible(
                  false,
                );
              },
            },
          ],
        );

        return;
      }

      setConfirmAction(
        'archive',
      );

      setConfirmVehicle(
        vehicle,
      );

      setConfirmVisible(true);
    };

  /*
   * ============================================
   * RESTORE VEHICLE
   * ============================================
   */

  const handleUnarchiveVehicle =
    vehicle => {
      setConfirmAction(
        'unarchive',
      );

      setConfirmVehicle(
        vehicle,
      );

      setConfirmVisible(true);
    };

  /*
   * ============================================
   * CONFIRM ACTION
   * ============================================
   */

  const handleConfirmAction =
    async () => {
      if (
        !confirmVehicle ||
        !confirmAction
      ) {
        setConfirmVisible(
          false,
        );

        return;
      }

      /*
       * CORRECT
       */

      if (
        confirmAction ===
        'correct'
      ) {
        setConfirmVisible(
          false,
        );

        setProfileVisible(
          false,
        );

        navigation.navigate(
          'VehicleCorrectionRequest',
          {
            vehicle:
              confirmVehicle,
          },
        );

        return;
      }

      /*
       * RESTORE
       */

      if (
        confirmAction ===
        'unarchive'
      ) {
        try {
          await vehicleApi.unarchiveVehicle(
            confirmVehicle.id,
          );

          const updatedVehicles =
            vehicles.map(item => {
              if (
                item.id ===
                confirmVehicle.id
              ) {
                return {
                  ...item,
                  isArchived:
                    false,
                };
              }

              return item;
            });

          await saveVehicles(
            updatedVehicles,
          );

          setSelectedVehicle(
            prev =>
              prev?.id ===
              confirmVehicle.id
                ? {
                    ...prev,
                    isArchived:
                      false,
                  }
                : prev,
          );

          setConfirmVisible(
            false,
          );
        } catch (error) {
          console.error(
            'Failed to restore vehicle:',
            error,
          );

          Alert.alert(
            'Unable to Restore',
            'Something went wrong while restoring this vehicle. Please try again.',
          );
        }

        return;
      }

      /*
       * ARCHIVE
       */

      if (
        confirmAction ===
        'archive'
      ) {
        try {
          await vehicleApi.deleteVehicle(
            confirmVehicle.id,
          );

          const updatedVehicles =
            vehicles.map(item => {
              if (
                item.id ===
                confirmVehicle.id
              ) {
                return {
                  ...item,
                  isArchived:
                    true,
                  isActive:
                    false,
                };
              }

              return item;
            });

          await saveVehicles(
            updatedVehicles,
          );

          setSelectedVehicle(
            prev =>
              prev?.id ===
              confirmVehicle.id
                ? {
                    ...prev,
                    isArchived:
                      true,
                    isActive:
                      false,
                  }
                : prev,
          );

          setConfirmVisible(
            false,
          );

          setProfileVisible(
            false,
          );
        } catch (error) {
          console.error(
            'Failed to archive vehicle:',
            error,
          );

          Alert.alert(
            'Unable to Archive',
            'Something went wrong while archiving this vehicle. Please try again.',
          );
        }
      }
    };

  /*
   * ============================================
   * RENDER VEHICLE
   * ============================================
   */

  const renderVehicle =
    ({ item }) => (
      <VehicleCard
        vehicle={item}
        theme={theme}
        isPremium={isPremium}
        activeLoadingId={
          activeLoadingId
        }
        onPress={
          handleVehiclePress
        }
        onSetActive={
          handleSetActive
        }
        onArchive={
          handleArchiveVehicle
        }
        onRestore={
          handleUnarchiveVehicle
        }
      />
    );

  /*
   * ============================================
   * HEADER
   * ============================================
   */

  const renderHeader =
    () => (
      <>
        {/* HEADER */}

        <View
          style={styles.header}
        >
          <View
            style={
              styles.headerLeft
            }
          >
            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  backgroundColor:
                    theme.surface,
                  borderColor:
                    theme.border,
                },
              ]}
              activeOpacity={0.75}
              onPress={() =>
                navigation.goBack()
              }
            >
              <Icon
                name="arrow-back"
                size={22}
                color={
                  theme.text
                }
              />
            </TouchableOpacity>

            <View>
              <Text
                style={[
                  styles.eyebrow,
                  {
                    color:
                      theme.accent,
                  },
                ]}
              >
                VEHICARE
              </Text>

              <Text
                style={[
                  styles.title,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                My Garage
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Your registered
                vehicles
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {canAddVehicle && (
              <TouchableOpacity
                style={[
                  styles.addHeaderButton,
                  {
                    backgroundColor:
                      theme.surfaceAlt,
                    borderColor:
                      theme.border,
                  },
                ]}
                onPress={
                  handleAddVehicle
                }
                activeOpacity={0.85}
              >
                <Icon
                  name="add"
                  size={25}
                  color={
                    theme.text
                  }
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.addHeaderButton,
                {
                  backgroundColor:
                    theme.surfaceAlt,
                  borderColor:
                    theme.border,
                },
              ]}
              onPress={openSidebar}
              activeOpacity={0.85}
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

        {/* PLAN CARD */}

        <View
          style={[
            styles.planCard,
            {
              backgroundColor:
                theme.surface,
              borderColor:
                theme.border,
            },

            isPremium && {
              backgroundColor:
                theme.accentSoft,
              borderColor:
                theme.accent,
            },
          ]}
        >
          <View
            style={[
              styles.planIcon,
              {
                backgroundColor:
                  theme.accentSoft,
              },
            ]}
          >
            <Icon
              name={
                isPremium
                  ? 'workspace-premium'
                  : 'person-outline'
              }
              size={22}
              color={
                theme.accent
              }
            />
          </View>

          <View
            style={
              styles.planContent
            }
          >
            <View
              style={
                styles.planTitleRow
              }
            >
              <View
                style={
                  styles.planNameRow
                }
              >
                <Text
                  style={[
                    styles.planTitle,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                >
                  {isPremium
                    ? 'Premium Plan'
                    : 'Free Plan'}
                </Text>

                {isPremium && (
                  <View
                    style={
                      styles.premiumBadge
                    }
                  >
                    <Text
                      style={
                        styles.premiumBadgeText
                      }
                    >
                      PREMIUM
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.planCount,
                  {
                    color:
                      theme.accent,
                  },
                ]}
              >
                {vehicleCount}/
                {vehicleLimit}
              </Text>
            </View>

            <Text
              style={[
                styles.planDescription,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              {isPremium
                ? 'Manage up to five vehicle profiles.'
                : 'Your plan includes one vehicle profile.'}
            </Text>

            <View
              style={[
                styles.progressTrack,
                {
                  backgroundColor:
                    theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor:
                      theme.accent,
                    width: `${Math.min(
                      (vehicleCount /
                        vehicleLimit) *
                        100,
                      100,
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* ACTIVE VEHICLE */}

        {activeVehicle && (
          <View
            style={
              styles.activeSection
            }
          >
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
                  Active Vehicle
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
                  Currently used
                  across VehiCare
                </Text>
              </View>

              <View
                style={[
                  styles.activeStatus,
                  {
                    backgroundColor:
                      theme.statusBadgeBackground,
                  },
                ]}
              >
                <View
                  style={[
                    styles.activeStatusDot,
                    {
                      backgroundColor:
                        theme.success,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.activeStatusText,
                    {
                      color:
                        theme.success,
                    },
                  ]}
                >
                  ACTIVE
                </Text>
              </View>
            </View>

            {/*
             * ====================================
             * DYNAMIC ACTIVE VEHICLE ICON
             * ====================================
             */}

            <TouchableOpacity
              style={[
                styles.activeCard,

                /*
                 * Use a solid theme surface first
                 * so light mode doesn't appear
                 * transparent.
                 */
                {
                  backgroundColor:
                    theme.surface,
                  borderColor:
                    theme.accent,
                },
              ]}
              activeOpacity={0.9}
              onPress={() =>
                handleVehiclePress(
                  activeVehicle,
                )
              }
            >
              <View
                style={[
                  styles.activeCardIcon,
                  {
                    backgroundColor:
                      theme.accentSoft,
                  },
                ]}
              >
                <Icon
                  name={getVehicleIconName(
                    activeVehicle,
                  )}
                  size={31}
                  color={
                    theme.accent
                  }
                />
              </View>

              <View
                style={
                  styles.activeCardContent
                }
              >
                <Text
                  style={[
                    styles.activeCardName,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {getVehicleDisplayName(
                    activeVehicle,
                    'Your Vehicle',
                  )}
                </Text>

                <Text
                  style={[
                    styles.activeCardDetails,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {getDisplayValue(
                    activeVehicle?.vehicle_year ??
                      activeVehicle?.vehicleYear ??
                      activeVehicle?.custom_year ??
                      activeVehicle?.year,
                    'Unknown',
                  )}{' '}
                  •{' '}
                  {getVehicleType(
                    activeVehicle,
                  )}
                </Text>

                <View
                  style={
                    styles.activeCardFooter
                  }
                >
                  <Icon
                    name="verified"
                    size={14}
                    color={
                      theme.success
                    }
                  />

                  <Text
                    style={[
                      styles.activeCardFooterText,
                      {
                        color:
                          theme.success,
                      },
                    ]}
                  >
                    Protected
                    profile
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.viewProfileButton,
                  {
                    backgroundColor:
                      theme.accent,
                  },
                ]}
              >
                <Icon
                  name="arrow-forward"
                  size={18}
                  color="#FFFFFF"
                />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* VEHICLES HEADER */}

        <View
          style={
            styles.listHeader
          }
        >
          <View
            style={
              styles.sectionHeaderLeft
            }
          >
            <View
              style={
                styles.sectionTitleRow
              }
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                All Vehicles
              </Text>

              {activeVehicleCount <
                vehicleLimit && (
                <TouchableOpacity
                  style={
                    styles.addVehicleTextButton
                  }
                  onPress={
                    handleAddVehicle
                  }
                  activeOpacity={0.75}
                >
                  <Icon
                    name="add-circle-outline"
                    size={18}
                    color={
                      theme.accent
                    }
                  />

                  <Text
                    style={[
                      styles.addVehicleText,
                      {
                        color:
                          theme.accent,
                      },
                    ]}
                  >
                    Add Vehicle
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              {isPremium
                ? 'Manage your registered vehicles'
                : 'Your registered vehicle profile'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.sortButton,
              {
                backgroundColor:
                  theme.surface,
                borderColor:
                  theme.border,
              },
            ]}
            onPress={() =>
              setSortOrder(
                prev =>
                  prev ===
                  'recent'
                    ? 'oldest'
                    : 'recent',
              )
            }
            activeOpacity={0.75}
          >
            <Icon
              name="sort"
              size={16}
              color={
                theme.accent
              }
              style={
                styles.sortButtonIcon
              }
            />

            <Text
              style={[
                styles.sortButtonText,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Sort:{' '}
              {sortOrder ===
              'recent'
                ? 'Recent'
                : 'Oldest'}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );

  /*
   * ============================================
   * EMPTY
   * ============================================
   */

  const renderEmpty =
    () => (
      <View
        style={
          styles.emptyContainer
        }
      >
        <View
          style={[
            styles.emptyIcon,
            {
              backgroundColor:
                theme.surfaceAlt,
              borderColor:
                theme.border,
            },
          ]}
        >
          <Icon
            name="directions-car"
            size={38}
            color={
              theme.accent
            }
          />
        </View>

        <Text
          style={[
            styles.emptyTitle,
            {
              color:
                theme.text,
            },
          ]}
        >
          No Vehicle Profile
        </Text>

        <Text
          style={[
            styles.emptyDescription,
            {
              color:
                theme.textSecondary,
            },
          ]}
        >
          You don't have a
          registered vehicle
          yet. Add one to
          start using VehiCare.
        </Text>

        <TouchableOpacity
          style={[
            styles.emptyButton,
            {
              backgroundColor:
                theme.accent,
            },
          ]}
          onPress={
            handleAddVehicle
          }
          activeOpacity={0.85}
        >
          <Icon
            name="add"
            size={21}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.emptyButtonText
            }
          >
            Add Vehicle
          </Text>
        </TouchableOpacity>
      </View>
    );

  /*
   * ============================================
   * LOADING
   * ============================================
   */

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <StatusBar
          barStyle={
            theme.name ===
            'dark'
              ? 'light-content'
              : 'dark-content'
          }
          backgroundColor={
            theme.background
          }
        />

        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color={
              theme.accent
            }
          />

          <Text
            style={[
              styles.loadingText,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            Loading your
            vehicles...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * ============================================
   * SCREEN
   * ============================================
   */

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.background,
        },
      ]}
      edges={['top']}
    >
      <StatusBar
        barStyle={
          theme.name ===
          'dark'
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={
          theme.background
        }
      />

      <SectionList
        sections={
          vehicleSections
        }
        keyExtractor={item =>
          String(item.id)
        }
        renderItem={
          renderVehicle
        }
        renderSectionHeader={({
          section,
        }) => (
          <View
            style={
              styles.sectionListHeader
            }
          >
            <Text
              style={[
                styles.sectionListTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {section.title}
            </Text>
          </View>
        )}
        ListHeaderComponent={
          renderHeader
        }
        ListEmptyComponent={
          renderEmpty
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.contentContainer,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      />

      {/* VEHICLE PROFILE */}

      {selectedVehicle && (
        <VehicleProfileModal
          visible={
            profileVisible
          }
          onClose={
            handleCloseProfile
          }
          vehicleProfile={
            selectedVehicle
          }
          isPremium={
            isPremium
          }
          onCorrectVehicle={() =>
            handleCorrectVehicle(
              selectedVehicle,
            )
          }
          onArchiveVehicle={() =>
            handleArchiveVehicle(
              selectedVehicle,
            )
          }
          onSetActive={() =>
            handleSetActive(
              selectedVehicle,
            )
          }
        />
      )}

      {/* VEHICLE LIMIT MODAL */}

      <LimitModal
        visible={
          limitModalVisible
        }
        vehicleCount={
          vehicleCount
        }
        onPrimaryPress={() => {
          setLimitModalVisible(false);
          if (!isPremium) {
            navigation.navigate('ManagePlan');
          }
        }}
        onSecondaryPress={() =>
          setLimitModalVisible(
            false,
          )
        }
        onClose={() =>
          setLimitModalVisible(
            false,
          )
        }
      />

      {/* CONFIRMATION */}

      <ConfirmActionModal
        visible={
          confirmVisible
        }
        title={
          confirmAction ===
          'archive'
            ? 'Archive Vehicle?'
            : confirmAction ===
              'unarchive'
            ? 'Restore Vehicle?'
            : 'Correct Vehicle Information'
        }
        message={
          confirmAction ===
          'archive'
            ? 'This vehicle will no longer be available for active diagnostics, but its diagnostic, maintenance, and activity history will be preserved.'
            : confirmAction ===
              'unarchive'
            ? 'Restore this archived vehicle so you can resume active diagnostics and submit correction requests if needed.'
            : 'Vehicle information is protected to keep your diagnostic and maintenance history associated with the correct vehicle. If you entered incorrect information during setup, you can correct those details now.'
        }
        primaryLabel={
          confirmAction ===
          'archive'
            ? 'Archive Vehicle'
            : confirmAction ===
              'unarchive'
            ? 'Restore Vehicle'
            : 'Continue'
        }
        secondaryLabel="Cancel"
        destructive={
          confirmAction ===
          'archive'
        }
        onConfirm={
          handleConfirmAction
        }
        onCancel={() =>
          setConfirmVisible(
            false,
          )
        }
      />
    </SafeAreaView>
  );
};

/*
 * ============================================
 * STYLES
 * ============================================
 */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      BACKGROUND,
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 45,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    color: MUTED,
    fontFamily:
      'Inter-Regular',
    fontSize: 13,
    marginTop: 12,
  },

  /* HEADER */

  header: {
    paddingTop: 12,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  eyebrow: {
    fontFamily:
      'Inter-SemiBold',
    color: ORANGE,
    fontSize: 9,
    letterSpacing: 1.8,
    marginBottom: 2,
  },

  title: {
    fontFamily:
      'Outfit-ExtraBold',
    color: TEXT,
    fontSize: 28,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontFamily:
      'Inter-Regular',
    color: MUTED,
    fontSize: 11,
    marginTop: 3,
  },

  addHeaderButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  /* SORT */

  sortButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },

  sortButtonIcon: {
    marginRight: 8,
  },

  sortButtonText: {
    fontFamily:
      'Inter-SemiBold',
    fontSize: 11,
  },

  /* PLAN */

  planCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 19,
    padding: 15,
    marginBottom: 26,
  },

  planIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  planContent: {
    flex: 1,
  },

  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },

  planTitle: {
    fontFamily:
      'Outfit-SemiBold',
    fontSize: 14,
  },

  premiumBadge: {
    backgroundColor: ORANGE,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 7,
  },

  premiumBadgeText: {
    color: '#FFFFFF',
    fontFamily:
      'Inter-SemiBold',
    fontSize: 7,
    letterSpacing: 0.5,
  },

  planCount: {
    fontFamily:
      'Outfit-Bold',
    fontSize: 13,
  },

  planDescription: {
    fontFamily:
      'Inter-Regular',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  progressTrack: {
    height: 5,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 9,
  },

  progressBar: {
    height: '100%',
    borderRadius: 5,
  },

  /* ACTIVE */

  activeSection: {
    marginBottom: 29,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent:
      'space-between',
    marginBottom: 11,
  },

  sectionTitle: {
    fontFamily:
      'Outfit-SemiBold',
    fontSize: 17,
  },

  sectionSubtitle: {
    fontFamily:
      'Inter-Regular',
    fontSize: 10,
    marginTop: 3,
  },

  activeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },

  activeStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    marginRight: 5,
  },

  activeStatusText: {
    fontFamily:
      'Inter-SemiBold',
    fontSize: 7,
    letterSpacing: 0.6,
  },

  /*
   * No shadow here.
   */

  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 19,
    padding: 15,
  },

  activeCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  activeCardContent: {
    flex: 1,
    minWidth: 0,
  },

  activeCardName: {
    fontFamily:
      'Outfit-SemiBold',
    fontSize: 16,
  },

  activeCardDetails: {
    fontFamily:
      'Inter-Regular',
    fontSize: 10,
    marginTop: 3,
  },

  activeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },

  activeCardFooterText: {
    fontFamily:
      'Inter-Regular',
    fontSize: 9,
    marginLeft: 4,
  },

  viewProfileButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  /* LIST */

  listHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent:
      'space-between',
    marginBottom: 12,
  },

  sectionHeaderLeft: {
    flex: 1,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 6,
  },

  addVehicleTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  addVehicleText: {
    fontFamily:
      'Inter-SemiBold',
    fontSize: 10,
  },

  sectionListHeader: {
    paddingTop: 16,
    paddingBottom: 10,
  },

  sectionListTitle: {
    fontFamily:
      'Outfit-SemiBold',
    fontSize: 14,
  },

  /* EMPTY */

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 55,
    paddingBottom: 35,
    paddingHorizontal: 25,
  },

  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    fontFamily:
      'Outfit-ExtraBold',
    fontSize: 20,
  },

  emptyDescription: {
    fontFamily:
      'Inter-Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 310,
  },

  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 21,
    paddingVertical: 13,
    marginTop: 20,
  },

  emptyButtonText: {
    fontFamily:
      'Outfit-SemiBold',
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 6,
  },
});

export default MyVehiclesScreen;