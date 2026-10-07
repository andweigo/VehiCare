import { useEffect, useRef } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useVehicle } from '../context/VehicleContext';
import useVehicleHealth from '../hooks/useVehicleHealth';
import { useTheme } from '../theme/ThemeContext';

import {
    getVehicleDisplayDetails,
    getVehicleDisplayName,
} from '../utils/vehicleDisplay';

const VehicleHealthCard = ({ onPress }) => {
  const { theme } = useTheme();

  const { activeVehicle, pendingVehicle } = useVehicle();

  const {
    healthPercentage,
    healthStatus,
    loading,
  } = useVehicleHealth();

  const vehicleProfile = activeVehicle || pendingVehicle;

  // ==========================================
  // VEHICLE ICON
  // ==========================================

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

    const text = `${typeValue || ''}`
      .toLowerCase()
      .trim();

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

  const vehicleIconName = getVehicleIconName(
    vehicleProfile?.vehicle_type ||
      vehicleProfile?.vehicleType ||
      vehicleProfile?.type ||
      vehicleProfile,
  );

  // ==========================================
  // VEHICLE INFORMATION
  // ==========================================

  const vehicleName = getVehicleDisplayName(
    vehicleProfile,
    'Your Vehicle',
  );

  const vehicleDetails = getVehicleDisplayDetails(
    vehicleProfile,
    'Review diagnostics and maintenance for details',
  );

  const summary = vehicleProfile
    ? vehicleDetails
    : 'View your vehicle status and maintenance history.';

  // ==========================================
  // HEALTH SCORE
  // ==========================================

  const percentage = Math.min(
    100,
    Math.max(
      0,
      Number(healthPercentage) || 0,
    ),
  );

  // ==========================================
  // ANIMATED PROGRESS
  // ==========================================

  const progress = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    if (loading) {
      return;
    }

    progress.setValue(0);

    Animated.timing(progress, {
      toValue: percentage,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [percentage, loading, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // ==========================================
  // HEALTH COLOR
  // ==========================================

  const getHealthColor = value => {
    if (value >= 80) {
      return theme.success || '#35B86B';
    }

    if (value >= 60) {
      return theme.accent;
    }

    if (value >= 40) {
      return '#D6A23A';
    }

    return '#FF5A5F';
  };

  const healthColor = getHealthColor(
    percentage,
  );

  // ==========================================
  // LOADING STATE
  // ==========================================

  if (loading) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.loadingContainer}>
          <View
            style={[
              styles.loadingIcon,
              {
                backgroundColor:
                  theme.accentSoft,
              },
            ]}
          >
            <Icon
              name="favorite"
              size={22}
              color={theme.accent}
            />
          </View>

          <View style={styles.loadingTextContainer}>
            <Text
              style={[
                styles.loadingTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              Vehicle Health
            </Text>

            <Text
              style={[
                styles.loadingSubtitle,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Checking vehicle health...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* ==========================================
          HEADER
      ========================================== */}

      <View style={styles.header}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor:
                theme.accentSoft,
            },
          ]}
        >
          <Icon
            name={vehicleIconName}
            size={24}
            color={theme.accent}
          />
        </View>

        <View style={styles.headerText}>
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Vehicle Health
          </Text>

          <Text
            style={[
              styles.vehicleName,
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

        <Icon
          name="chevron-right"
          size={24}
          color={theme.textSecondary}
        />
      </View>

      {/* ==========================================
          HEALTH SCORE
      ========================================== */}

      <View style={styles.scoreRow}>
        <View style={styles.scoreContent}>
          <Text
            style={[
              styles.scoreLabel,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            HEALTH SCORE
          </Text>

          <View style={styles.scoreValueRow}>
            <Text
              style={[
                styles.scoreValue,
                {
                  color: healthColor,
                },
              ]}
            >
              {percentage}
            </Text>

            <Text
              style={[
                styles.percentSymbol,
                {
                  color: healthColor,
                },
              ]}
            >
              %
            </Text>
          </View>
        </View>

        {/* STATUS */}

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                theme.statusBadgeBackground,
            },
          ]}
        >
          <Icon
            name={healthStatus.icon}
            size={14}
            color={healthColor}
            style={styles.statusIcon}
          />

          <Text
            style={[
              styles.statusText,
              {
                color: healthColor,
              },
            ]}
          >
            {healthStatus.label}
          </Text>
        </View>
      </View>

      {/* ==========================================
          PROGRESS BAR
      ========================================== */}

      <View
        style={[
          styles.progressTrack,
          {
            backgroundColor:
              theme.border,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: progressWidth,
              backgroundColor:
                healthColor,
            },
          ]}
        />
      </View>

      {/* ==========================================
          DESCRIPTION
      ========================================== */}

      <Text
        style={[
          styles.description,
          {
            color:
              theme.textSecondary,
          },
        ]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {summary}
      </Text>

      {/* ==========================================
          FOOTER
      ========================================== */}

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Icon
            name="insights"
            size={15}
            color={theme.textSecondary}
          />

          <Text
            style={[
              styles.footerText,
              {
                color:
                  theme.textSecondary,
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Based on your vehicle information
          </Text>
        </View>

        <View style={styles.viewDetails}>
          <Text
            style={[
              styles.viewText,
              {
                color: theme.accent,
              },
            ]}
          >
            View details
          </Text>

          <Icon
            name="arrow-forward"
            size={14}
            color={theme.accent}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // ==========================================
  // CARD
  // ==========================================

  card: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },

  // ==========================================
  // HEADER
  // ==========================================

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 16,
    lineHeight: 20,
  },

  vehicleName: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },

  // ==========================================
  // SCORE
  // ==========================================

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },

  scoreContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  scoreLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 0.8,
    marginRight: 9,
    marginBottom: 5,
  },

  scoreValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  scoreValue: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 30,
    lineHeight: 32,
  },

  percentSymbol: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    marginBottom: 4,
    marginLeft: 1,
  },

  // ==========================================
  // STATUS
  // ==========================================

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  statusIcon: {
    marginRight: 4,
  },

  statusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
  },

  // ==========================================
  // PROGRESS
  // ==========================================

  progressTrack: {
    width: '100%',
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 13,
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
  },

  // ==========================================
  // DESCRIPTION
  // ==========================================

  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 15,
  },

  // ==========================================
  // FOOTER
  // ==========================================

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  footerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    minWidth: 0,
  },

  footerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginLeft: 5,
    flexShrink: 1,
  },

  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  viewText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    marginRight: 3,
  },

  // ==========================================
  // LOADING
  // ==========================================

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 72,
  },

  loadingIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  loadingTextContainer: {
    flex: 1,
  },

  loadingTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 16,
    lineHeight: 20,
  },

  loadingSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
});

export default VehicleHealthCard;