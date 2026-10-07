
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
import {
    getDisplayValue,
    getVehicleDisplayName,
    normalizeVehicleProfile,
} from '../utils/vehicleDisplay';

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
      candidate =>
        candidate !== undefined &&
        candidate !== null &&
        candidate !== '',
    );
  }

  const text = `${typeValue || ''}`.toLowerCase().trim();

  if (
    text.includes('moto') ||
    text.includes('motor') ||
    text.includes('scooter')
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
    normalizedVehicle?.vehicleType;

  const vehicleTypeLabel = getDisplayValue(
    rawVehicleType,
    'Unknown',
  );

  const vehicleIcon = getVehicleIconName(rawVehicleType);

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <SafeAreaView style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.border }]}>

          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.accentSoft }]}>
                <Icon
                  name={vehicleIcon}
                  size={26}
                  color={theme.accent}
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <Icon
                name="close"
                size={24}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: theme.text }]}>
            Your Vehicle Setup
          </Text>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Review the full profile used to personalize
            VehiCare recommendations.
          </Text>

          <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Vehicle
            </Text>

            <Text style={[styles.fieldValue, { color: theme.text }]}>
              {vehicleName}
            </Text>
          </View>

          <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Type
            </Text>

            <Text style={[styles.fieldValue, { color: theme.text }]}>
              {vehicleTypeLabel}
            </Text>
          </View>

          <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Brand
            </Text>

            <Text style={[styles.fieldValue, { color: theme.text }]}>
              {vehicleBrand}
            </Text>
          </View>

          <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Model
            </Text>

            <Text style={[styles.fieldValue, { color: theme.text }]}>
              {vehicleModel}
            </Text>
          </View>

          <View style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              Year
            </Text>

            <Text style={[styles.fieldValue, { color: theme.text }]}>
              {vehicleYear}
            </Text>
          </View>

          {/* Manage My Vehicles */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
              activeOpacity={0.8}
              onPress={onManageVehicles}
              accessibilityRole="button"
              hitSlop={{
                top: 10,
                bottom: 10,
                left: 10,
                right: 10,
              }}
            >
              <View style={[styles.actionIconWrapper, { backgroundColor: theme.accentSoft }]}>
                <Icon
                  name="directions-car"
                  size={20}
                  color={theme.accent}
                />
              </View>

              <View style={styles.actionContent}>
                <Text style={[styles.actionCardText, { color: theme.text }]}>
                  Manage My Vehicles
                </Text>

                <Text style={[styles.actionCardSubtext, { color: theme.textSecondary }]}>
                  View and manage your vehicle profiles
                </Text>
              </View>

              <View style={styles.actionChevron}>
                <Icon
                  name="chevron-right"
                  size={20}
                  color={theme.textSecondary}
                />
              </View>
            </TouchableOpacity>
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

  actionCard: {
    width: '100%',
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 12,
    backgroundColor: '#151515',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#292929',
  },

  actionIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(246, 59, 5, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  actionContent: {
    flex: 1,
  },

  actionCardText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  actionCardSubtext: {
    color: '#858585',
    fontSize: 10,
    marginTop: 3,
  },

  actionChevron: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default DashboardVehicleProfileModal;
