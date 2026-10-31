import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
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
import { getGuestVehicle, getVehiclePhotoMap } from '../services/storageService';

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

const resolveVehiclePhoto = vehicle => {
  if (!vehicle || typeof vehicle !== 'object') return null;
  const candidates = [
    vehicle.photo_url,
    vehicle.image_url,
    vehicle.photo,
    vehicle.image,
    vehicle.custom_photo,
    vehicle.avatar,
    vehicle.thumbnail,
  ];
  return candidates.find(c => typeof c === 'string' && c.trim().length > 0) || null;
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

  const { user, updateUser, refreshUser } =
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
    pendingVehicle,
    setActiveVehicle,
    refreshActiveVehicle,
  } = useVehicle();

  /*
   * ============================================
   * MERGE VEHICLE CONTEXT
   * WITH VEHICLE LIST
   * ============================================
   */

  const displayVehicles = useMemo(() => {
    const candidateActive = accountActive || pendingVehicle;
    const activeId = candidateActive
      ? String(
          getVehicleId(candidateActive),
        )
      : null;

    let merged = vehicles
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
      candidateActive &&
      !merged.some(
        vehicle =>
          String(
            getVehicleId(vehicle),
          ) === activeId,
      )
    ) {
      merged.unshift(
        normalizeVehicle({
          ...candidateActive,
          isActive: true,
        }),
      );
    }

    // Default first non-archived vehicle as active if none is explicitly active
    if (!merged.some(v => v.isActive) && merged.length > 0) {
      const firstActiveIndex = merged.findIndex(v => !v.isArchived);
      if (firstActiveIndex !== -1) {
        merged[firstActiveIndex] = {
          ...merged[firstActiveIndex],
          isActive: true,
        };
      }
    }

    return merged;
  }, [vehicles, accountActive, pendingVehicle]);

  /*
   * ============================================
   * ACTIVE VEHICLE
   * ============================================
   */

  const activeVehicle = useMemo(
    () =>
      accountActive ??
      pendingVehicle ??
      displayVehicles.find(
        vehicle =>
          vehicle.isActive &&
          !vehicle.isArchived,
      ) ??
      displayVehicles.find(
        vehicle => !vehicle.isArchived,
      ) ??
      null,
    [vehicles, accountActive, pendingVehicle, displayVehicles],
  );

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

  const canAddVehicle = isPremium
    ? vehicleCount < vehicleLimit
    : activeVehicleCount < vehicleLimit;

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
      const otherVehicles =
        sortedVehicles.filter(
          vehicle =>
            !vehicle.isArchived &&
            !vehicle.isActive,
        );

      const archivedVehicles =
        sortedVehicles.filter(
          vehicle =>
            vehicle.isArchived,
        );

      const sections = [];

      if (
        otherVehicles.length > 0
      ) {
        sections.push({
          title: 'Other vehicles',
          data: otherVehicles,
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
              ) &&
              accountVehicles.length > 0
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
         * GUEST USER OR LOCAL CACHE FALLBACK
         */

        if (!user || parsedVehicles.length === 0) {
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
                ) &&
                parsed.length > 0
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

          if (parsedVehicles.length === 0) {
            const guestVeh =
              typeof getGuestVehicle === 'function'
                ? await getGuestVehicle()
                : null;
            if (guestVeh) {
              parsedVehicles = [normalizeVehicle(guestVeh)];
            }
          }
        }

        let photoMap = {};
        try {
          photoMap = await getVehiclePhotoMap();
        } catch (_) {}

        parsedVehicles = parsedVehicles.map(v => {
          const idKey = String(v?.id);
          const savedPhoto =
            photoMap[idKey] ||
            photoMap[String(v?.vehicle_id)] ||
            v.photo_url ||
            v.image_url ||
            v.photo ||
            v.image;

          if (savedPhoto) {
            return {
              ...v,
              photo_url: savedPhoto,
              image_url: savedPhoto,
              photo: savedPhoto,
              image: savedPhoto,
            };
          }
          return v;
        });

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

  const loadVehiclesRef = useRef(loadVehicles);
  const refreshUserRef = useRef(refreshUser);
  const userRef = useRef(user);

  useEffect(() => {
    loadVehiclesRef.current = loadVehicles;
    refreshUserRef.current = refreshUser;
    userRef.current = user;
  });

  useEffect(() => {
    loadVehicles();
    if (user && typeof refreshUser === 'function') {
      refreshUser().catch(() => {});
    }

    const unsubscribe = navigation?.addListener?.('focus', () => {
      if (typeof loadVehiclesRef.current === 'function') {
        loadVehiclesRef.current();
      }
      if (userRef.current && typeof refreshUserRef.current === 'function') {
        refreshUserRef.current().catch(() => {});
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigation]);

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

          await refreshActiveVehicle();

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
            error?.response?.data?.message ||
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
          const archiveRes = await vehicleApi.deleteVehicle(
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

          await refreshActiveVehicle();

          if (archiveRes?.data?.active_vehicle_id !== undefined && user && typeof updateUser === 'function') {
            await updateUser({
              ...user,
              active_vehicle_id: archiveRes.data.active_vehicle_id,
            });
          }

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
            error?.response?.data?.message ||
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

  const renderHeader = () => {
    const activeVehiclePhoto = resolveVehiclePhoto(activeVehicle);
    const activeYear = getDisplayValue(
      activeVehicle?.vehicle_year ??
        activeVehicle?.vehicleYear ??
        activeVehicle?.custom_year,
      '',
    );
    const activeType = getVehicleType(activeVehicle);
    const remainingRooms = Math.max(0, vehicleLimit - activeVehicleCount);

    return (
      <>
        {/* TOP HEADER: Back arrow, "YOUR VEHICLES" subtitle, "My Garage" title, Menu Button */}
        <View style={styles.header}>
          <View style={styles.headerLeftGroup}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.75}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.titleWrap}>
              <Text style={styles.eyebrow}>YOUR VEHICLES</Text>
              <Text style={styles.title}>My Garage</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.menuSquareBtn}
            onPress={openSidebar}
            activeOpacity={0.8}
            accessibilityLabel="Open Sidebar Menu"
          >
            <Icon name="menu" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* PLAN CARD: Premium Active (or Free Plan), Count/Limit, Progress Bar, Room Text */}
        <View style={styles.planCard}>
          <View style={styles.planTopRow}>
            <View style={styles.planTitleGroup}>
              <Icon name="verified" size={18} color="#F5501C" />
              <Text style={styles.planTitleText}>
                {isPremium ? 'Premium Active' : 'Free Plan'}
              </Text>
            </View>

            <Text style={styles.planFractionText}>
              {activeVehicleCount} / {vehicleLimit}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(
                    (activeVehicleCount / vehicleLimit) * 100,
                    100,
                  )}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.roomText}>
            Room for {remainingRooms} more vehicle{remainingRooms === 1 ? '' : 's'}
          </Text>
        </View>

        {/* ACTIVE VEHICLE SECTION */}
        {activeVehicle && (
          <View style={styles.activeSection}>
            <View style={styles.activeSectionHeaderRow}>
              <Text style={styles.sectionHeaderTitle}>Active vehicle</Text>
              <View style={styles.activePillBadge}>
                <Text style={styles.activePillText}>Active</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.activeCard}
              activeOpacity={0.88}
              onPress={() => handleVehiclePress(activeVehicle)}
            >
              <View style={styles.cardTopRow}>
                <View style={styles.activeIconBox}>
                  {activeVehiclePhoto ? (
                    <Image
                      source={{ uri: activeVehiclePhoto }}
                      style={styles.cardPhoto}
                      resizeMode="cover"
                    />
                  ) : (
                    <Icon
                      name={getVehicleIconName(activeVehicle)}
                      size={26}
                      color="#F5501C"
                    />
                  )}
                </View>

                <View style={styles.cardTextCol}>
                  <Text style={styles.activeCardTitle} numberOfLines={1}>
                    {getVehicleDisplayName(activeVehicle, 'Your Vehicle')}
                  </Text>
                  <Text style={styles.cardSubtitle} numberOfLines={1}>
                    {[activeYear, activeType].filter(Boolean).join(' · ')}
                  </Text>
                </View>

                <View style={styles.openCol}>
                  <Icon name="unfold-more" size={20} color="#8E8E93" />
                  <Text style={styles.openText}>Open</Text>
                </View>
              </View>

              <View style={styles.cardBottomRow}>
                <View style={styles.protectedRow}>
                  <Icon name="verified" size={14} color="#8E8E93" />
                  <Text style={styles.protectedText}>Protected profile</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };

  /*
   * ============================================
   * EMPTY
   * ============================================
   */

  const renderEmpty = () => {
    // If the garage already has an active vehicle or displayVehicles has records,
    // do not show "No Vehicle Profile"!
    if (displayVehicles.length > 0 || activeVehicle) {
      return null;
    }

    return (
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
  };

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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderTitle}>
              {section.title}
            </Text>
            {section.title === 'Other vehicles' && (
              <TouchableOpacity
                style={styles.sortDropdownBtn}
                activeOpacity={0.75}
                onPress={() => {
                  setSortOrder(prev =>
                    prev === 'recent' ? 'alphabetical' : 'recent',
                  );
                }}
              >
                <Text style={styles.sortDropdownText}>
                  {sortOrder === 'alphabetical' ? 'Name' : 'Recent'}
                </Text>
                <Icon
                  name="keyboard-arrow-down"
                  size={16}
                  color="#8E8E93"
                />
              </TouchableOpacity>
            )}
          </View>
        )}
        ListHeaderComponent={
          renderHeader
        }
        ListFooterComponent={
          canAddVehicle ? (
            <TouchableOpacity
              style={styles.addVehicleBottomBtn}
              activeOpacity={0.85}
              onPress={handleAddVehicle}
            >
              <Icon name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addVehicleBottomText}>Add vehicle</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ height: 24 }} />
          )
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
          onRestoreVehicle={() =>
            handleUnarchiveVehicle(
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
    backgroundColor: BACKGROUND,
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
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginTop: 12,
  },

  /* HEADER */

  header: {
    paddingTop: 12,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#16161A',
    borderWidth: 1,
    borderColor: '#24242A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  titleWrap: {
    flex: 1,
    justifyContent: 'center',
  },

  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    color: '#8E8E93',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  title: {
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
    fontSize: 26,
    letterSpacing: -0.3,
  },

  menuSquareBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#16161A',
    borderWidth: 1,
    borderColor: '#24242A',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* PLAN CARD */

  planCard: {
    backgroundColor: '#16161A',
    borderWidth: 1,
    borderColor: '#232328',
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
  },

  planTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  planTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  planTitleText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },

  planFractionText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#F5501C',
  },

  progressTrack: {
    height: 5,
    backgroundColor: '#27272F',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#F5501C',
    borderRadius: 5,
  },

  roomText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#8E8E93',
  },

  /* ACTIVE VEHICLE SECTION */

  activeSection: {
    marginBottom: 24,
  },

  activeSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  activePillBadge: {
    backgroundColor: '#F5501C',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },

  activePillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  activeCard: {
    backgroundColor: '#16161A',
    borderWidth: 1.5,
    borderColor: '#F5501C',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },

  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  activeIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#232328',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  cardPhoto: {
    width: '100%',
    height: '100%',
  },

  cardTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },

  activeCardTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    color: '#FFFFFF',
    marginBottom: 3,
  },

  cardSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#8E8E93',
  },

  openCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  openText: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 2,
  },

  cardBottomRow: {
    borderTopWidth: 1,
    borderTopColor: '#232328',
    marginTop: 14,
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  protectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  protectedText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
  },

  /* SECTION HEADERS */

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 12,
  },

  sectionHeaderTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },

  sortDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161A',
    borderWidth: 1,
    borderColor: '#24242A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },

  sortDropdownText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#8E8E93',
  },

  /* FOOTER ADD VEHICLE */

  addVehicleBottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16161A',
    borderWidth: 1,
    borderColor: '#24242A',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 14,
    marginBottom: 24,
    gap: 6,
  },

  addVehicleBottomText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
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
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 20,
  },

  emptyDescription: {
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Outfit-SemiBold',
    color: '#FFFFFF',
    fontSize: 13,
    marginLeft: 6,
  },
});

export default MyVehiclesScreen;