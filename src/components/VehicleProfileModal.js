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
import { getDisplayValue, getVehicleDisplayName } from '../utils/vehicleDisplay';

const getVehicleIconName = vehicleTypeValue => {
  let typeValue = vehicleTypeValue;

  if (typeValue && typeof typeValue === 'object') {
    const objectCandidates = [
      typeValue.name,
      typeValue.type,
      typeValue.label,
      typeValue.title,
      typeValue.value,
      typeValue.code,
      typeValue.id,
    ];

    typeValue = objectCandidates.find(
      candidate => candidate !== undefined && candidate !== null && candidate !== '',
    );
  }

  const text = `${typeValue || ''}`.toLowerCase().trim();

  if (text.includes('moto') || text.includes('motor') || text.includes('scooter')) {
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
}) => {
  const { theme } = useTheme();
  const isDark = theme?.name === 'dark';

  const vehicleName = getVehicleDisplayName(vehicleProfile, 'Your Vehicle');
  const vehicleYear = getDisplayValue(
    vehicleProfile?.vehicle_year ?? vehicleProfile?.vehicleYear ?? vehicleProfile?.custom_year,
    'Unknown',
  );
  const rawVehicleType = vehicleProfile?.vehicle_type ?? vehicleProfile?.vehicleType;
  const vehicleTypeLabel = getDisplayValue(rawVehicleType, 'Unknown');
  const vehicleIcon = getVehicleIconName(rawVehicleType);
  const vehicleBrand = getDisplayValue(
    vehicleProfile?.custom_brand || vehicleProfile?.vehicle_brand || vehicleProfile?.vehicleBrand,
    'Unknown',
  );
  const vehicleModel = getDisplayValue(
    vehicleProfile?.custom_model || vehicleProfile?.vehicle_model || vehicleProfile?.vehicleModel,
    'Unknown',
  );

  const isActive = Boolean(vehicleProfile?.isActive);
  const isArchived = Boolean(vehicleProfile?.isArchived);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
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
                  {isArchived ? 'ARCHIVED' : isActive ? 'ACTIVE VEHICLE' : 'SAVED PROFILE'}
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
                <Icon name="close" size={16} color={isDark ? '#A1A1AA' : '#64748B'} />
              </Pressable>
            </View>

            {/* Title & Subtitle */}
            <Text style={[styles.title, { color: theme.text }]}>Your Vehicle Setup</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Review the vehicle specifications used for diagnostics and maintenance.
            </Text>

            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
              ]}
            />

            {/* Vehicle Hero Display */}
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
                <Icon name={vehicleIcon} size={24} color={theme.accent} />
              </View>
              <View style={styles.vehicleHeroInfo}>
                <View style={styles.activeTagRow}>
                  <View
                    style={[
                      styles.activeDot,
                      { backgroundColor: isArchived ? '#F59E0B' : isActive ? '#10B981' : theme.textSecondary },
                    ]}
                  />
                  <Text
                    style={[
                      styles.activeTagText,
                      { color: isArchived ? '#F59E0B' : isActive ? '#10B981' : theme.textSecondary },
                    ]}
                  >
                    {isArchived ? 'ARCHIVED VEHICLE' : isActive ? 'CURRENTLY ACTIVE' : 'INACTIVE VEHICLE'}
                  </Text>
                </View>
                <Text style={[styles.vehicleHeroName, { color: theme.text }]} numberOfLines={1}>
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
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>TYPE</Text>
                <Text style={[styles.specValue, { color: theme.text }]} numberOfLines={1}>
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
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>YEAR</Text>
                <Text style={[styles.specValue, { color: theme.text }]} numberOfLines={1}>
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
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>BRAND</Text>
                <Text style={[styles.specValue, { color: theme.text }]} numberOfLines={1}>
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
                <Text style={[styles.specLabel, { color: theme.textSecondary }]}>MODEL</Text>
                <Text style={[styles.specValue, { color: theme.text }]} numberOfLines={1}>
                  {vehicleModel}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            {mode === 'dashboard' ? (
              <TouchableOpacity
                style={[styles.primaryActionBtn, { backgroundColor: theme.accent }]}
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
                <Text style={styles.primaryActionBtnText}>Manage My Vehicles</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.actionsContainer}>
                {isPremium && !isArchived && !isActive && (
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: theme.accent, marginBottom: 8 }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      onClose?.();
                      onSetActive?.();
                    }}
                  >
                    <Icon name="check-circle" size={17} color="#FFFFFF" />
                    <Text style={styles.primaryActionBtnText}>Set as Active Vehicle</Text>
                  </TouchableOpacity>
                )}

                {!isArchived && (
                  <View style={styles.multiActionRow}>
                    <TouchableOpacity
                      style={[
                        styles.secondaryActionBtn,
                        {
                          backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                          borderColor: isDark ? '#2B2B30' : '#E2E8F0',
                        },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => {
                        onClose?.();
                        onCorrectVehicle?.();
                      }}
                    >
                      <Icon name="edit" size={16} color={theme.accent} />
                      <Text style={[styles.secondaryActionBtnText, { color: theme.text }]}>
                        Correct Info
                      </Text>
                    </TouchableOpacity>

                    {isPremium && (
                      <TouchableOpacity
                        style={[
                          styles.secondaryActionBtn,
                          {
                            backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                            borderColor: isDark ? '#2B2B30' : '#E2E8F0',
                          },
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                          onClose?.();
                          onArchiveVehicle?.();
                        }}
                      >
                        <Icon name="archive" size={16} color={theme.textSecondary} />
                        <Text style={[styles.secondaryActionBtnText, { color: theme.textSecondary }]}>
                          Archive
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {isArchived && (
                  <Text style={[styles.archivedActionText, { color: theme.textSecondary }]}>
                    Restore this vehicle to submit a correction request or set active.
                  </Text>
                )}
              </View>
            )}
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
  },
  activeTagText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
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

  actionsContainer: {
    width: '100%',
  },
  primaryActionBtn: {
    width: '100%',
    minHeight: 44,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryActionBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  multiActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryActionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
  },
  archivedActionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
    paddingVertical: 6,
  },
});

export default VehicleProfileModal;
