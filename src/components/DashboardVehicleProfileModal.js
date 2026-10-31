import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import vehicleApi from '../api/vehicleApi';
import { useVehicle } from '../context/VehicleContext';
import { getGuestVehicle, saveGuestVehicle, saveVehiclePhoto } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';
import { toPersistablePhoto } from '../utils/profilePhoto';
import {
  getDisplayValue,
  getVehicleDisplayName,
  normalizeVehicleProfile,
} from '../utils/vehicleDisplay';

const getVehicleIconName = (vehicleTypeValue, vehicleObj = null) => {
  let typeValue = vehicleTypeValue;

  if (typeValue && typeof typeValue === 'object') {
    const objectCandidates = [
      typeValue.name,
      typeValue.type,
      typeValue.label,
      typeValue.title,
      typeValue.value,
      typeValue.code,
      typeValue.category,
      typeValue.id,
    ];

    typeValue = objectCandidates.find(
      candidate =>
        candidate !== undefined &&
        candidate !== null &&
        candidate !== '',
    );
  }

  let text = `${typeValue || ''}`.toLowerCase().trim();

  if (!text || text === 'unknown' || text === 'other') {
    const v = vehicleObj || (typeof vehicleTypeValue === 'object' ? vehicleTypeValue : null);
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

const DashboardVehicleProfileModal = ({
  visible,
  onClose,
  vehicleProfile,
  onManageVehicles = () => {},
}) => {
  const { theme } = useTheme();
  const isDark = theme?.name === 'dark';

  let vehicleContext = null;
  try {
    vehicleContext = useVehicle();
  } catch (_) {
    // If mounted outside VehicleProvider fallback safely
  }

  const contextVehicles = vehicleContext?.vehicles || [];
  const activeVehicle = vehicleContext?.activeVehicle;
  const pendingVehicle = vehicleContext?.pendingVehicle;
  const setActiveVehicle = vehicleContext?.setActiveVehicle;
  const setActiveVehicleById = vehicleContext?.setActiveVehicleById;
  const setVehicles = vehicleContext?.setVehicles;

  const [uploadingVehicleId, setUploadingVehicleId] = useState(null);
  const [localFallbackVehicles, setLocalFallbackVehicles] = useState([]);

  React.useEffect(() => {
    if (!visible) return;
    let isMounted = true;
    const loadFallback = async () => {
      try {
        const stored = await AsyncStorage.getItem('@vehicare_vehicles');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0 && isMounted) {
            setLocalFallbackVehicles(parsed);
            return;
          }
        }
        const guestVeh = typeof getGuestVehicle === 'function' ? await getGuestVehicle() : null;
        if (guestVeh && isMounted) {
          setLocalFallbackVehicles([guestVeh]);
        }
      } catch (_) {}
    };
    loadFallback();
    return () => {
      isMounted = false;
    };
  }, [visible]);

  // Derive the display vehicles list (either all user vehicles or the active profile)
  let rawVehicles = [];
  if (Array.isArray(contextVehicles) && contextVehicles.length > 0) {
    rawVehicles = contextVehicles;
  } else if (activeVehicle && Object.keys(activeVehicle).length > 0) {
    rawVehicles = [activeVehicle];
  } else if (pendingVehicle && Object.keys(pendingVehicle).length > 0) {
    rawVehicles = [pendingVehicle];
  } else if (vehicleProfile && Object.keys(vehicleProfile).length > 0) {
    rawVehicles = [vehicleProfile];
  } else if (localFallbackVehicles.length > 0) {
    rawVehicles = localFallbackVehicles;
  }

  const activeId = activeVehicle?.id != null ? String(activeVehicle.id) : null;
  const profileId = vehicleProfile?.id != null ? String(vehicleProfile.id) : null;

  // Guarantee that the active vehicle is ALWAYS at the very top of the sheet (index 0)
  const displayVehicles = [...rawVehicles].sort((a, b) => {
    const aId = a?.id != null ? String(a.id) : null;
    const bId = b?.id != null ? String(b.id) : null;

    const aIsActive = Boolean(
      (activeId && aId === activeId) ||
      (profileId && aId === profileId) ||
      a?.is_active === true ||
      a?.status === 'active',
    );
    const bIsActive = Boolean(
      (activeId && bId === activeId) ||
      (profileId && bId === profileId) ||
      b?.is_active === true ||
      b?.status === 'active',
    );

    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;
    return 0;
  });

  const handlePickVehiclePhoto = async targetVehicle => {
    if (!targetVehicle) return;
    const targetId = targetVehicle.id || 'current';

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 800,
        maxHeight: 600,
        selectionLimit: 1,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const photoUri = toPersistablePhoto(asset);

      if (!photoUri) {
        Alert.alert(
          'Invalid Photo',
          'Unable to use that photo. Please choose a different image.',
        );
        return;
      }

      setUploadingVehicleId(targetId);

      const updatedVehicle = {
        ...targetVehicle,
        photo_url: photoUri,
        image_url: photoUri,
        photo: photoUri,
        image: photoUri,
      };

      // 1. Update in Context state for immediate optimistic UI feedback
      if (typeof setVehicles === 'function') {
        setVehicles(currentList =>
          currentList.map(v =>
            String(v.id) === String(targetVehicle.id)
              ? { ...v, photo_url: photoUri, image_url: photoUri, photo: photoUri, image: photoUri }
              : v,
          ),
        );
      }

      if (typeof setActiveVehicle === 'function') {
        setActiveVehicle(prev => {
          if (!targetVehicle.id || String(prev?.id) === String(targetVehicle.id)) {
            return {
              ...prev,
              photo_url: photoUri,
              image_url: photoUri,
              photo: photoUri,
              image: photoUri,
            };
          }
          return prev;
        });
      }

      // 2. Persist locally in AsyncStorage & dedicated vehicle photo repository
      try {
        await saveVehiclePhoto(targetVehicle.id, photoUri);

        const storedVehicles = await AsyncStorage.getItem('@vehicare_vehicles');
        if (storedVehicles) {
          const list = JSON.parse(storedVehicles);
          const updated = list.map(v =>
            String(v.id) === String(targetVehicle.id)
              ? { ...v, photo_url: photoUri, image_url: photoUri, photo: photoUri, image: photoUri }
              : v,
          );
          await AsyncStorage.setItem('@vehicare_vehicles', JSON.stringify(updated));
        }

        if (typeof saveGuestVehicle === 'function' && !targetVehicle.id) {
          await saveGuestVehicle(updatedVehicle);
        }
      } catch (storageErr) {
        console.warn('Vehicle photo local cache save note:', storageErr);
      }

      // 3. Save to backend if vehicle has a valid ID and user is authenticated
      const isRealBackendId = Boolean(
        targetVehicle.id && !isNaN(Number(targetVehicle.id)),
      );

      if (isRealBackendId && typeof vehicleApi?.updateVehicle === 'function') {
        try {
          const cleanUpdatePayload = {
            vehicle_type_id:
              targetVehicle.vehicle_type_id ||
              targetVehicle.vehicle_type?.id ||
              null,
            vehicle_brand_id:
              targetVehicle.vehicle_brand_id ||
              targetVehicle.vehicle_brand?.id ||
              null,
            vehicle_model_id:
              targetVehicle.vehicle_model_id ||
              targetVehicle.vehicle_model?.id ||
              null,
            vehicle_year_id:
              targetVehicle.vehicle_year_id ||
              targetVehicle.vehicle_year?.id ||
              null,
            custom_brand: targetVehicle.custom_brand || null,
            custom_model: targetVehicle.custom_model || null,
            custom_year: targetVehicle.custom_year || null,
            model_number: targetVehicle.model_number || null,
            photo_url: photoUri,
            image_url: photoUri,
            photo: photoUri,
            image: photoUri,
          };

          await vehicleApi.updateVehicle(targetVehicle.id, cleanUpdatePayload);
        } catch (apiErr) {
          console.warn(
            'Vehicle photo backend sync note (saved locally):',
            apiErr?.message || apiErr,
          );
        }
      }
    } catch (pickerErr) {
      console.error('Vehicle photo picker error:', pickerErr);
      Alert.alert(
        'Upload Error',
        'Unable to update vehicle photo right now. Please try again.',
      );
    } finally {
      setUploadingVehicleId(null);
    }
  };

  const handleSetActive = async vehicle => {
    try {
      if (vehicle.id && typeof setActiveVehicleById === 'function') {
        await setActiveVehicleById(vehicle.id);
      } else if (typeof setActiveVehicle === 'function') {
        setActiveVehicle(vehicle);
      }
    } catch (err) {
      console.warn('Could not set active vehicle:', err);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
      testID="dashboard-vehicle-profile-modal"
    >
      <View style={styles.overlay}>
        <Pressable
          style={styles.backdropTouchable}
          onPress={onClose}
          testID="modal-backdrop-touchable"
        />

        <View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: theme?.glassSurfaceElevated || (isDark ? '#141417' : '#18181B'),
              borderColor: theme?.glassBorder || (isDark ? 'rgba(255, 255, 255, 0.12)' : '#2E2F35'),
            },
          ]}
        >
          {/* Top Sheet Drag Indicator Pill */}
          <View style={styles.grabberPill} />

          {/* Sheet Header: Title & Close Button */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Your Vehicles</Text>
              <Text style={styles.sheetSubtitle}>
                Active profile & garage management
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.closeBtn}
              accessibilityLabel="Close sheet"
              testID="modal-close-button"
            >
              <Icon name="close" size={17} color="#A1A1AA" />
            </Pressable>
          </View>

          {/* Scrollable Vehicle Cards List */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollList}
          >
            {displayVehicles.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="directions-car" size={30} color="#F5501C" />
                </View>
                <Text style={styles.emptyTitle}>No Vehicle Found</Text>
                <Text style={styles.emptySubtitle}>
                  Add your vehicle profile to get tailored diagnostics, maintenance intervals, and health score tracking.
                </Text>
              </View>
            ) : (
              displayVehicles.map((vehicle, index) => {
                const normalized = normalizeVehicleProfile(vehicle);
                const name = getVehicleDisplayName(normalized, 'Your Vehicle');
                const year = getDisplayValue(
                  normalized?.vehicle_year ??
                    normalized?.vehicleYear ??
                    normalized?.custom_year,
                  '—',
                );
                const brand = getDisplayValue(
                  normalized?.custom_brand ||
                    normalized?.vehicle_brand ||
                    normalized?.vehicleBrand,
                  '—',
                );
                const model = getDisplayValue(
                  normalized?.custom_model ||
                    normalized?.vehicle_model ||
                    normalized?.vehicleModel,
                  '—',
                );

                const rawType =
                  normalized?.vehicle_type ??
                  normalized?.vehicleType ??
                  normalized?.vehicle_type_name ??
                  normalized?.type ??
                  normalized?.category;

                const icon = getVehicleIconName(rawType, normalized);
                const deducedType =
                  icon === 'motorcycle'
                    ? 'Motorcycle'
                    : icon === 'directions-bike'
                    ? 'Bicycle'
                    : icon === 'local-shipping'
                    ? 'Truck / Van'
                    : icon === 'directions-bus'
                    ? 'Bus'
                    : 'Sedan';

                const typeLabel = getDisplayValue(rawType, '') || deducedType;

                const vehicleIdStr = vehicle?.id != null ? String(vehicle.id) : null;
                const isActive = Boolean(
                  (activeId && vehicleIdStr === activeId) ||
                  (profileId && vehicleIdStr === profileId) ||
                  vehicle?.is_active === true ||
                  vehicle?.status === 'active' ||
                  index === 0,
                );

                const photoUri = resolveVehiclePhoto(vehicle);
                const targetId = vehicle?.id || 'current';
                const isUploading = uploadingVehicleId === targetId;

                return (
                  <View
                    key={vehicle.id || `vehicle-item-${index}`}
                    style={styles.vehicleSection}
                  >
                    {/* 1. Full Image Overview (Separate from info card) */}
                    {photoUri ? (
                      <View
                        style={[
                          styles.imageOverviewCard,
                          {
                            borderColor: isActive
                              ? 'rgba(245, 80, 28, 0.45)'
                              : 'rgba(255, 255, 255, 0.08)',
                          },
                        ]}
                      >
                        <Image
                          source={{ uri: photoUri }}
                          style={styles.imageOverviewPhoto}
                          resizeMode="contain"
                        />
                        <TouchableOpacity
                          style={styles.changePhotoPill}
                          activeOpacity={0.8}
                          onPress={() => handlePickVehiclePhoto(vehicle)}
                          disabled={isUploading}
                          accessibilityLabel="Change vehicle photo"
                        >
                          {isUploading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <>
                              <Icon name="camera-alt" size={13} color="#FFFFFF" />
                              <Text style={styles.changePhotoPillText}>Change Photo</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.overviewUploadCard,
                          {
                            borderColor: isActive
                              ? 'rgba(245, 80, 28, 0.40)'
                              : 'rgba(255, 255, 255, 0.16)',
                          },
                        ]}
                        activeOpacity={0.82}
                        onPress={() => handlePickVehiclePhoto(vehicle)}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <View style={styles.uploadingBox}>
                            <ActivityIndicator size="small" color="#F5501C" />
                            <Text style={styles.uploadingText}>
                              Saving vehicle photo...
                            </Text>
                          </View>
                        ) : (
                          <>
                            <View style={styles.cameraIconWrap}>
                              <Icon name="add-a-photo" size={22} color="#F5501C" />
                            </View>
                            <Text style={styles.uploadTitle}>
                              Upload Vehicle Photo
                            </Text>
                            <Text style={styles.uploadSubtitle}>
                              Tap to select an image from your device gallery
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}

                    {/* 2. Vehicle Info Card (Directly below image overview) */}
                    <View
                      style={[
                        styles.vehicleInfoCard,
                        {
                          borderColor: isActive
                            ? 'rgba(245, 80, 28, 0.40)'
                            : 'rgba(255, 255, 255, 0.08)',
                        },
                      ]}
                    >
                      {/* Header: Name/Year on Left, Active Badge or "Set Active" on Right */}
                      <View style={styles.cardHeader}>
                        <View style={styles.titleColumn}>
                          <Text style={styles.vehicleName} numberOfLines={1}>
                            {name}
                          </Text>
                          <Text style={styles.vehicleYear}>{year}</Text>
                        </View>

                        {isActive ? (
                          <View style={styles.activeBadge}>
                            <View style={styles.activeDot} />
                            <Text style={styles.activeBadgeText}>ACTIVE</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.setActiveBtn}
                            activeOpacity={0.8}
                            onPress={() => handleSetActive(vehicle)}
                          >
                            <Text style={styles.setActiveText}>Set as Active</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* 4-Column Spec Strip (TYPE | YEAR | BRAND | MODEL) */}
                      <View style={styles.specStrip}>
                        <View style={styles.specColumn}>
                          <Text style={styles.specLabel}>TYPE</Text>
                          <Text style={styles.specValue} numberOfLines={1}>
                            {typeLabel}
                          </Text>
                        </View>

                        <View style={styles.specDivider} />

                        <View style={styles.specColumn}>
                          <Text style={styles.specLabel}>YEAR</Text>
                          <Text style={styles.specValue} numberOfLines={1}>
                            {year}
                          </Text>
                        </View>

                        <View style={styles.specDivider} />

                        <View style={styles.specColumn}>
                          <Text style={styles.specLabel}>BRAND</Text>
                          <Text style={styles.specValue} numberOfLines={1}>
                            {brand}
                          </Text>
                        </View>

                        <View style={styles.specDivider} />

                        <View style={styles.specColumn}>
                          <Text style={styles.specLabel}>MODEL</Text>
                          <Text style={styles.specValue} numberOfLines={1}>
                            {model}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Bottom Sheet Footer Button: Manage Garage */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={styles.manageBtn}
              activeOpacity={0.85}
              onPress={() => {
                onClose?.();
                onManageVehicles?.();
              }}
            >
              <Icon name="directions-car" size={18} color="#FFFFFF" />
              <Text style={styles.manageBtnText}>Manage Garage</Text>
              <Icon name="chevron-right" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '88%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.38,
    shadowRadius: 20,
    elevation: 20,
  },
  grabberPill: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#232328',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  scrollList: {
    paddingBottom: 8,
  },

  // Vehicle Section (groups full image overview + info card)
  vehicleSection: {
    marginBottom: 20,
  },

  // 1. Separate Full Image Overview Card
  imageOverviewCard: {
    height: 180,
    width: '100%',
    borderRadius: 22,
    backgroundColor: '#16161A',
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  imageOverviewPhoto: {
    width: '100%',
    height: '100%',
  },
  changePhotoPill: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 22, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  changePhotoPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Overview Upload Placeholder Card (Full overview style)
  overviewUploadCard: {
    height: 160,
    width: '100%',
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: '#16161A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  cameraIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 80, 28, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 3,
  },
  uploadSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    maxWidth: 240,
  },
  uploadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#8E8E93',
  },

  // 2. Separate Vehicle Info Card (Directly below image overview)
  vehicleInfoCard: {
    backgroundColor: '#1C1C20',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleColumn: {
    flex: 1,
    paddingRight: 10,
  },
  vehicleName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  vehicleYear: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 80, 28, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 80, 28, 0.35)',
    gap: 5,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F5501C',
  },
  activeBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#F5501C',
    letterSpacing: 0.6,
  },
  setActiveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  setActiveText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },

  // 4-Column Spec Strip
  specStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  specColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  specDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  specLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: '#8E8E93',
    letterSpacing: 0.6,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  specValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Empty State
  emptyCard: {
    backgroundColor: '#1E1E23',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 80, 28, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Footer
  sheetFooter: {
    marginTop: 10,
  },
  manageBtn: {
    backgroundColor: '#F5501C',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#F5501C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  manageBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default DashboardVehicleProfileModal;
