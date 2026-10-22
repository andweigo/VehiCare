import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';
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

  // If type string is still generic, empty, or unknown, deduce from vehicle brand/model/name
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

const DashboardVehicleProfileModal = ({
  visible,
  onClose,
  vehicleProfile,
  onManageVehicles = () => {},
}) => {
  const { theme } = useTheme();
  const isDark = theme?.name === 'dark';
  const normalizedVehicle = normalizeVehicleProfile(vehicleProfile);

  const vehicleName = getVehicleDisplayName(
    normalizedVehicle,
    'Your Vehicle',
  );

  const vehicleYear = getDisplayValue(
    normalizedVehicle?.vehicle_year ??
      normalizedVehicle?.vehicleYear ??
      normalizedVehicle?.custom_year,
    'Unknown',
  );

  const rawVehicleType =
    normalizedVehicle?.vehicle_type ??
    normalizedVehicle?.vehicleType ??
    normalizedVehicle?.vehicle_type_name ??
    normalizedVehicle?.type ??
    normalizedVehicle?.category ??
    vehicleProfile?.vehicle_type ??
    vehicleProfile?.vehicleType ??
    vehicleProfile?.vehicle_type_name ??
    vehicleProfile?.type ??
    vehicleProfile?.category;

  const vehicleIcon = getVehicleIconName(rawVehicleType, normalizedVehicle);

  const deducedType =
    vehicleIcon === 'motorcycle'
      ? 'Motorcycle'
      : vehicleIcon === 'directions-bike'
      ? 'Bicycle'
      : vehicleIcon === 'local-shipping'
      ? 'Truck / Van'
      : vehicleIcon === 'directions-bus'
      ? 'Bus'
      : 'Car / Sedan';

  const vehicleTypeLabel =
    getDisplayValue(rawVehicleType, '') || deducedType;

  const vehicleBrand = getDisplayValue(
    normalizedVehicle?.custom_brand ||
      normalizedVehicle?.vehicle_brand ||
      normalizedVehicle?.vehicleBrand,
    'Unknown',
  );

  const vehicleModel = getDisplayValue(
    normalizedVehicle?.custom_model ||
      normalizedVehicle?.vehicle_model ||
      normalizedVehicle?.vehicleModel,
    'Unknown',
  );

  const hasVehicle = Boolean(
    vehicleProfile &&
      Object.keys(normalizedVehicle).length > 0 &&
      (vehicleBrand !== 'Unknown' ||
        vehicleModel !== 'Unknown' ||
        vehicleName !== 'Your Vehicle' ||
        vehicleTypeLabel !== 'Unknown'),
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#141416' : '#FFFFFF',
                borderColor: isDark ? '#262629' : '#E2E8F0',
              },
            ]}
          >
            {/* Header Row: Badge Pill + Circular X Close Button */}
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.badgePill,
                  {
                    backgroundColor: isDark
                      ? 'rgba(246, 59, 5, 0.15)'
                      : '#FFF2EE',
                  },
                ]}
              >
                <Icon name={vehicleIcon} size={14} color={theme.accent} />
                <Text style={[styles.badgeText, { color: theme.accent }]}>
                  ACTIVE VEHICLE
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={[
                  styles.closeCircleBtn,
                  { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
                ]}
                accessibilityLabel="Close dialog"
              >
                <Icon
                  name="close"
                  size={16}
                  color={isDark ? '#A1A1AA' : '#64748B'}
                />
              </Pressable>
            </View>

            {/* Title & Subtitle */}
            <Text style={[styles.title, { color: theme.text }]}>
              Your Vehicle Setup
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Active profile powering personalized diagnostics & recommendations.
            </Text>

            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
              ]}
            />

            {!hasVehicle ? (
              <View style={styles.emptyContainer}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: isDark
                        ? 'rgba(246, 59, 5, 0.12)'
                        : '#FFF2EE',
                    },
                  ]}
                >
                  <Icon
                    name="directions-car"
                    size={28}
                    color={theme.accent}
                  />
                </View>
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.textSecondary },
                  ]}
                >
                  No active vehicle profile is currently loaded.
                </Text>
              </View>
            ) : (
              <>
                {/* Hero Vehicle Display */}
                <View
                  style={[
                    styles.vehicleHeroBox,
                    {
                      backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                      borderColor: isDark ? '#2B2B30' : '#E2E8F0',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconWrapper,
                      {
                        backgroundColor: isDark
                          ? 'rgba(246, 59, 5, 0.16)'
                          : '#FFF2EE',
                      },
                    ]}
                  >
                    <Icon
                      name={vehicleIcon}
                      size={24}
                      color={theme.accent}
                    />
                  </View>
                  <View style={styles.vehicleHeroInfo}>
                    <View style={styles.activeTagRow}>
                      <View style={styles.activeDot} />
                      <Text style={styles.activeTagText}>CURRENTLY SELECTED</Text>
                    </View>
                    <Text
                      style={[styles.vehicleHeroName, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {vehicleName}
                    </Text>
                  </View>
                </View>

                {/* Specs 2x2 Grid */}
                <View style={styles.specsGrid}>
                  <View
                    style={[
                      styles.specTile,
                      {
                        backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                        borderColor: isDark ? '#262629' : '#E2E8F0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.specLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      TYPE
                    </Text>
                    <Text
                      style={[styles.specValue, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {vehicleTypeLabel}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.specTile,
                      {
                        backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                        borderColor: isDark ? '#262629' : '#E2E8F0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.specLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      YEAR
                    </Text>
                    <Text
                      style={[styles.specValue, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {vehicleYear}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.specTile,
                      {
                        backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                        borderColor: isDark ? '#262629' : '#E2E8F0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.specLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      BRAND
                    </Text>
                    <Text
                      style={[styles.specValue, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {vehicleBrand}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.specTile,
                      {
                        backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                        borderColor: isDark ? '#262629' : '#E2E8F0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.specLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      MODEL
                    </Text>
                    <Text
                      style={[styles.specValue, { color: theme.text }]}
                      numberOfLines={1}
                    >
                      {vehicleModel}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Manage My Vehicles CTA */}
            <TouchableOpacity
              style={[
                styles.manageButton,
                { backgroundColor: theme.accent },
              ]}
              activeOpacity={0.85}
              onPress={() => {
                onClose?.();
                onManageVehicles?.();
              }}
            >
              <Icon name="directions-car" size={17} color="#FFFFFF" />
              <Text style={styles.manageButtonText}>Manage My Vehicles</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 999,
    gap: 6,
  },
  badgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  closeCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    lineHeight: 23,
    marginBottom: 3,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },

  vehicleHeroBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleHeroInfo: {
    flex: 1,
  },
  activeTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  activeTagText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: '#10B981',
    letterSpacing: 0.6,
  },
  vehicleHeroName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    lineHeight: 19,
  },

  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  specTile: {
    flexBasis: '48.5%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
  },
  specLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 8.5,
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  specValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    lineHeight: 17,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  manageButton: {
    minHeight: 44,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  manageButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});

export default DashboardVehicleProfileModal;
