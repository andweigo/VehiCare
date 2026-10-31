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
import { saveGuestVehicle, saveVehiclePhoto } from '../services/storageService';
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
      candidate => candidate !== undefined && candidate !== null && candidate !== '',
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

  if (text.includes('bicycle') || text.includes('bike') || text.includes('cycle')) {
    return 'directions-bike';
  }

  if (text.includes('bus')) {
    return 'directions-bus';
  }

  if (text.includes('truck') || text.includes('van') || text.includes('pickup')) {
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

const VehicleProfileModal = ({
  visible,
  onClose,
  vehicleProfile,
  isPremium,
  mode = 'manage',
  onManageVehicles,
  onCorrectVehicle,
  onArchiveVehicle,
  onSetActive,
  onRestoreVehicle,
}) => {
  const { theme } = useTheme();
  const isDark = theme?.name === 'dark';

  let vehicleContext = null;
  try {
    vehicleContext = useVehicle();
  } catch (_) {
    // Graceful fallback outside provider
  }

  const activeVehicle = vehicleContext?.activeVehicle;
  const setActiveVehicle = vehicleContext?.setActiveVehicle;
  const setVehicles = vehicleContext?.setVehicles;

  const [isUploading, setIsUploading] = useState(false);

  const normalized = normalizeVehicleProfile(vehicleProfile);
  const vehicleName = getVehicleDisplayName(normalized, 'Your Vehicle');
  const vehicleYear = getDisplayValue(
    normalized?.vehicle_year ?? normalized?.vehicleYear ?? normalized?.custom_year,
    '—',
  );
  const vehicleBrand = getDisplayValue(
    normalized?.custom_brand || normalized?.vehicle_brand || normalized?.vehicleBrand,
    '—',
  );
  const vehicleModel = getDisplayValue(
    normalized?.custom_model || normalized?.vehicle_model || normalized?.vehicleModel,
    '—',
  );

  const rawVehicleType =
    normalized?.vehicle_type ??
    normalized?.vehicleType ??
    normalized?.vehicle_type_name ??
    normalized?.type ??
    normalized?.category;

  const vehicleIcon = getVehicleIconName(rawVehicleType, normalized);
  const deducedType =
    vehicleIcon === 'motorcycle'
      ? 'Motorcycle'
      : vehicleIcon === 'directions-bike'
      ? 'Bicycle'
      : vehicleIcon === 'local-shipping'
      ? 'Truck / Van'
      : vehicleIcon === 'directions-bus'
      ? 'Bus'
      : 'Sedan';

  const vehicleTypeLabel = getDisplayValue(rawVehicleType, '') || deducedType;

  const isCurrentlyActive = Boolean(
    (activeVehicle?.id && vehicleProfile?.id && String(activeVehicle.id) === String(vehicleProfile.id)) ||
    vehicleProfile?.isActive ||
    vehicleProfile?.is_active,
  );

  const isArchived = Boolean(vehicleProfile?.isArchived || vehicleProfile?.status === 'archived');
  const photoUri = resolveVehiclePhoto(vehicleProfile);

  const handlePickVehiclePhoto = async () => {
    if (!vehicleProfile) return;

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
      const newPhotoUri = toPersistablePhoto(asset);
      if (!newPhotoUri) {
        Alert.alert(
          'Invalid Photo',
          'Unable to use that photo. Please choose a different image.',
        );
        return;
      }

      setIsUploading(true);

      const updatedVehicle = {
        ...vehicleProfile,
        photo_url: newPhotoUri,
        image_url: newPhotoUri,
        photo: newPhotoUri,
        image: newPhotoUri,
      };

      // 1. Optimistic update in context
      if (typeof setVehicles === 'function' && vehicleProfile.id) {
        setVehicles(currentList =>
          currentList.map(v =>
            String(v.id) === String(vehicleProfile.id)
              ? {
                  ...v,
                  photo_url: newPhotoUri,
                  image_url: newPhotoUri,
                  photo: newPhotoUri,
                  image: newPhotoUri,
                }
              : v,
          ),
        );
      }

      if (typeof setActiveVehicle === 'function') {
        setActiveVehicle(prev => {
          if (!vehicleProfile.id || String(prev?.id) === String(vehicleProfile.id)) {
            return {
              ...prev,
              photo_url: newPhotoUri,
              image_url: newPhotoUri,
              photo: newPhotoUri,
              image: newPhotoUri,
            };
          }
          return prev;
        });
      }

      // 2. Persist locally in AsyncStorage & dedicated vehicle photo repository
      try {
        await saveVehiclePhoto(vehicleProfile.id, newPhotoUri);

        const storedVehicles = await AsyncStorage.getItem('@vehicare_vehicles');
        if (storedVehicles && vehicleProfile.id) {
          const list = JSON.parse(storedVehicles);
          const updated = list.map(v =>
            String(v.id) === String(vehicleProfile.id)
              ? {
                  ...v,
                  photo_url: newPhotoUri,
                  image_url: newPhotoUri,
                  photo: newPhotoUri,
                  image: newPhotoUri,
                }
              : v,
          );
          await AsyncStorage.setItem('@vehicare_vehicles', JSON.stringify(updated));
        }

        if (typeof saveGuestVehicle === 'function' && !vehicleProfile.id) {
          await saveGuestVehicle(updatedVehicle);
        }
      } catch (storageErr) {
        console.warn('Vehicle photo local cache save note:', storageErr);
      }

      // 3. Save to backend if vehicle has a valid ID and user is authenticated
      const isRealBackendId = Boolean(
        vehicleProfile.id && !isNaN(Number(vehicleProfile.id)),
      );

      if (isRealBackendId && typeof vehicleApi?.updateVehicle === 'function') {
        try {
          const cleanUpdatePayload = {
            vehicle_type_id:
              vehicleProfile.vehicle_type_id ||
              vehicleProfile.vehicle_type?.id ||
              null,
            vehicle_brand_id:
              vehicleProfile.vehicle_brand_id ||
              vehicleProfile.vehicle_brand?.id ||
              null,
            vehicle_model_id:
              vehicleProfile.vehicle_model_id ||
              vehicleProfile.vehicle_model?.id ||
              null,
            vehicle_year_id:
              vehicleProfile.vehicle_year_id ||
              vehicleProfile.vehicle_year?.id ||
              null,
            custom_brand: vehicleProfile.custom_brand || null,
            custom_model: vehicleProfile.custom_model || null,
            custom_year: vehicleProfile.custom_year || null,
            model_number: vehicleProfile.model_number || null,
            photo_url: newPhotoUri,
            image_url: newPhotoUri,
            photo: newPhotoUri,
            image: newPhotoUri,
          };

          await vehicleApi.updateVehicle(vehicleProfile.id, cleanUpdatePayload);
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
      setIsUploading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
      testID="vehicle-profile-modal"
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
              backgroundColor:
                theme?.glassSurfaceElevated || (isDark ? '#141417' : '#18181B'),
              borderColor:
                theme?.glassBorder ||
                (isDark ? 'rgba(255, 255, 255, 0.12)' : '#2E2F35'),
            },
          ]}
        >
          {/* Top Sheet Drag Indicator Pill */}
          <View style={styles.grabberPill} />

          {/* Sheet Header: Title & Close Button */}
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Vehicle Profile</Text>
              <Text style={styles.sheetSubtitle}>
                Active garage profile & specifications
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

          {/* Scrollable Vehicle Profile Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollList}
          >
            {/* 1. Full Image Overview (Separate top card) */}
            {photoUri ? (
              <View
                style={[
                  styles.imageOverviewCard,
                  {
                    borderColor: isCurrentlyActive
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
                  onPress={handlePickVehiclePhoto}
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
                    borderColor: isCurrentlyActive
                      ? 'rgba(245, 80, 28, 0.40)'
                      : 'rgba(255, 255, 255, 0.16)',
                  },
                ]}
                activeOpacity={0.82}
                onPress={handlePickVehiclePhoto}
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
                  borderColor: isCurrentlyActive
                    ? 'rgba(245, 80, 28, 0.40)'
                    : 'rgba(255, 255, 255, 0.08)',
                },
              ]}
            >
              {/* Header: Name/Year on Left, Status Badge on Right */}
              <View style={styles.cardHeader}>
                <View style={styles.titleColumn}>
                  <Text style={styles.vehicleName} numberOfLines={1}>
                    {vehicleName}
                  </Text>
                  <Text style={styles.vehicleYear}>{vehicleYear}</Text>
                </View>

                {isArchived ? (
                  <View style={styles.archivedBadge}>
                    <View style={styles.archivedDot} />
                    <Text style={styles.archivedBadgeText}>ARCHIVED</Text>
                  </View>
                ) : isCurrentlyActive ? (
                  <View style={styles.activeBadge}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                ) : (
                  <View style={styles.savedBadge}>
                    <Text style={styles.savedBadgeText}>SAVED</Text>
                  </View>
                )}
              </View>

              {/* 4-Column Spec Strip (TYPE | YEAR | BRAND | MODEL) */}
              <View style={styles.specStrip}>
                <View style={styles.specColumn}>
                  <Text style={styles.specLabel}>TYPE</Text>
                  <Text style={styles.specValue} numberOfLines={1}>
                    {vehicleTypeLabel}
                  </Text>
                </View>

                <View style={styles.specDivider} />

                <View style={styles.specColumn}>
                  <Text style={styles.specLabel}>YEAR</Text>
                  <Text style={styles.specValue} numberOfLines={1}>
                    {vehicleYear}
                  </Text>
                </View>

                <View style={styles.specDivider} />

                <View style={styles.specColumn}>
                  <Text style={styles.specLabel}>BRAND</Text>
                  <Text style={styles.specValue} numberOfLines={1}>
                    {vehicleBrand}
                  </Text>
                </View>

                <View style={styles.specDivider} />

                <View style={styles.specColumn}>
                  <Text style={styles.specLabel}>MODEL</Text>
                  <Text style={styles.specValue} numberOfLines={1}>
                    {vehicleModel}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. Garage Action Buttons (Preserving all original actions & content) */}
            <View style={styles.actionsContainer}>
              {mode === 'dashboard' ? (
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    onClose?.();
                    if (typeof onManageVehicles === 'function') {
                      onManageVehicles();
                    } else if (typeof onCorrectVehicle === 'function') {
                      onCorrectVehicle();
                    }
                  }}
                >
                  <Icon name="directions-car" size={17} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>
                    Manage My Vehicles
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  {!isArchived && !isCurrentlyActive && (
                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      activeOpacity={0.85}
                      onPress={() => {
                        onClose?.();
                        onSetActive?.();
                      }}
                    >
                      <Icon name="check-circle" size={17} color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>
                        Set as Active Vehicle
                      </Text>
                    </TouchableOpacity>
                  )}

                  {!isArchived && (
                    <View style={styles.multiActionRow}>
                      <TouchableOpacity
                        style={styles.secondaryActionBtn}
                        activeOpacity={0.8}
                        onPress={() => {
                          onClose?.();
                          onCorrectVehicle?.();
                        }}
                      >
                        <Icon name="edit" size={16} color="#F5501C" />
                        <Text style={styles.secondaryActionBtnText}>
                          Correct Info
                        </Text>
                      </TouchableOpacity>

                      {isPremium && (
                        <TouchableOpacity
                          style={styles.secondaryActionBtn}
                          activeOpacity={0.8}
                          onPress={() => {
                            onClose?.();
                            onArchiveVehicle?.();
                          }}
                        >
                          <Icon name="archive" size={16} color="#8E8E93" />
                          <Text
                            style={[
                              styles.secondaryActionBtnText,
                              { color: '#8E8E93' },
                            ]}
                          >
                            Archive
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {isArchived && (
                    <View style={styles.archivedBox}>
                      {typeof onRestoreVehicle === 'function' && (
                        <TouchableOpacity
                          style={styles.restoreBtn}
                          activeOpacity={0.85}
                          onPress={() => {
                            onClose?.();
                            onRestoreVehicle();
                          }}
                        >
                          <Icon name="unarchive" size={16} color="#FFFFFF" />
                          <Text style={styles.restoreBtnText}>
                            Restore Vehicle
                          </Text>
                        </TouchableOpacity>
                      )}
                      <Text style={styles.archivedActionText}>
                        Restore this vehicle to submit a correction request or set active.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </ScrollView>
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

  // 1. Full Image Overview
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

  // Overview Upload Placeholder
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

  // 2. Separate Vehicle Info Card
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

  // Badges
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
  archivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    gap: 5,
  },
  archivedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
  },
  archivedBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#F59E0B',
    letterSpacing: 0.6,
  },
  savedBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  savedBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: '#8E8E93',
    letterSpacing: 0.6,
  },

  // 4-Column Spec Strip
  specStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginTop: 8,
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

  // Actions Container
  actionsContainer: {
    marginTop: 14,
    gap: 10,
  },
  primaryActionBtn: {
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
  primaryActionBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  multiActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  secondaryActionBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  archivedBox: {
    gap: 10,
    alignItems: 'center',
  },
  restoreBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  restoreBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  archivedActionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});

export default VehicleProfileModal;
