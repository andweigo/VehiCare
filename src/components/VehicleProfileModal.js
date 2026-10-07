import {
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';
import { getDisplayValue, getVehicleDisplayName } from '../utils/vehicleDisplay';

const ORANGE = '#F63B05';

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

  if (text.includes('car') || text.includes('sedan') || text.includes('suv') || text.includes('hatch') || text.includes('coupe') || text.includes('mpv')) {
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.accentSoft }]}>
                <Icon name={vehicleIcon} size={26} color={theme.accent} />
              </View>

              {isPremium && !vehicleProfile?.isArchived && !vehicleProfile?.isActive && mode !== 'dashboard' && (
                <TouchableOpacity
                  style={[styles.setActiveHeaderButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                  onPress={onSetActive}
                >
                  <Icon name="verified" size={18} color={theme.accent} />
                  <Text style={[styles.setActiveHeaderText, { color: theme.accent }]}>Set Active</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Your Vehicle Setup</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Review the full profile used to personalize VehiCare recommendations.
          </Text>

          <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Vehicle</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{vehicleName}</Text>
          </View>

          <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Type</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{vehicleTypeLabel}</Text>
          </View>

          <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Brand</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{vehicleBrand}</Text>
          </View>

          <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Model</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{vehicleModel}</Text>
          </View>

          <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Year</Text>
            <Text style={[styles.fieldValue, { color: theme.text }]}>{vehicleYear}</Text>
          </View>

          <View style={styles.actionsRow}>
            {mode === 'dashboard' ? (
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={onManageVehicles || onCorrectVehicle}
              >
                <Icon name="settings" size={20} color={theme.accent} />
                <Text style={[styles.actionCardText, { color: theme.text }]}>Manage My Vehicles</Text>
              </TouchableOpacity>
            ) : (
              <>
                <View style={styles.actionGrid}>
                  {!vehicleProfile?.isArchived && (
                    <TouchableOpacity
                      style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={onCorrectVehicle}
                    >
                      <Icon name="edit" size={20} color={theme.accent} />
                      <Text style={[styles.actionCardText, { color: theme.text }]}>Correct Info</Text>
                    </TouchableOpacity>
                  )}

                  {isPremium && !vehicleProfile?.isArchived && (
                    <TouchableOpacity
                      style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                      onPress={onArchiveVehicle}
                    >
                      <Icon name="archive" size={20} color={theme.accent} />
                      <Text style={[styles.actionCardText, { color: theme.text }]}>Archive</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {vehicleProfile?.isArchived && (
                  <Text style={[styles.archivedActionText, { color: theme.textSecondary }]}>
                    Restore this vehicle to submit a correction request.
                  </Text>
                )}
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
    borderColor: '#292929',
    borderTopWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(246, 59, 5, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setActiveHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  setActiveHeaderText: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    color: '#D3B8AE',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 22,
  },
  fieldRow: {
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#292929',
  },
  fieldLabel: {
    color: '#777777',
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  fieldValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionsRow: {
    marginTop: 26,
    width: '100%',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexBasis: '48%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionCardText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  archivedActionText: {
    color: '#CCCCCC',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 14,
  },
});

export default VehicleProfileModal;
