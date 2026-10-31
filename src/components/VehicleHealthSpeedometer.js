import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import useVehicleHealth from '../hooks/useVehicleHealth';
import { useTheme } from '../theme/ThemeContext';

// Number of radial tick marks on the gauge (spanning from -120 deg to +120 deg = 240 deg arc)
const TICK_COUNT = 17;
const START_ANGLE = -120;
const ARC_ANGLE = 240;

const VehicleHealthSpeedometer = ({
  onPress,
  showDetailsLink = true,
  isInteractive = true,
  showHeader = true,
  containerStyle,
}) => {
  const { theme } = useTheme();
  const isDark = theme?.name === 'dark';

  const {
    vehicleProfile,
    healthPercentage,
    healthStatus,
    healthData,
    loading,
  } = useVehicleHealth();

  const activeVehicleId = vehicleProfile?.id ?? vehicleProfile?.vehicle_id ?? null;

  const score =
    typeof healthPercentage === 'number' && Number.isFinite(healthPercentage)
      ? Math.min(100, Math.max(0, Math.round(healthPercentage)))
      : 94;

  // Compute live issue counts for the active vehicle
  const urgentCount = healthData?.urgentDiagnosticItems?.length || 0;
  const diagCount = healthData?.diagnosticItems?.length || 0;
  const preventiveCount = healthData?.preventiveItems?.length || 0;

  // Animated sweep value (0 -> score)
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset and sweep smoothly up to the active vehicle's real health score
    animValue.setValue(0);
    Animated.sequence([
      Animated.timing(animValue, {
        toValue: 100,
        duration: 420,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(animValue, {
        toValue: score,
        duration: 380,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [score, activeVehicleId, animValue]);

  // Needle rotation interpolation: 0% -> START_ANGLE (-120deg), 100% -> START_ANGLE + ARC_ANGLE (120deg)
  const needleRotation = animValue.interpolate({
    inputRange: [0, 100],
    outputRange: [`${START_ANGLE}deg`, `${START_ANGLE + ARC_ANGLE}deg`],
  });

  // Progressive health color palette: the higher the vehicle health score, the better the color
  // (decoupled from whether the badge says ATTENTION so higher health always updates the colors used)
  const scorePalette = useMemo(() => {
    if (score >= 90) {
      return {
        color: '#10B981',
        glowColor: 'rgba(16, 185, 129, 0.22)',
        bgColor: 'rgba(16, 185, 129, 0.14)',
      };
    }
    if (score >= 80) {
      return {
        color: '#32D583',
        glowColor: 'rgba(50, 213, 131, 0.20)',
        bgColor: 'rgba(50, 213, 131, 0.14)',
      };
    }
    if (score >= 70) {
      return {
        color: '#84CC16',
        glowColor: 'rgba(132, 204, 22, 0.20)',
        bgColor: 'rgba(132, 204, 22, 0.14)',
      };
    }
    if (score >= 60) {
      return {
        color: '#F5B942',
        glowColor: 'rgba(245, 185, 66, 0.20)',
        bgColor: 'rgba(245, 185, 66, 0.14)',
      };
    }
    if (score >= 40) {
      return {
        color: '#FF7337',
        glowColor: 'rgba(255, 115, 55, 0.20)',
        bgColor: 'rgba(255, 115, 55, 0.14)',
      };
    }
    return {
      color: '#EF4444',
      glowColor: 'rgba(239, 68, 68, 0.22)',
      bgColor: 'rgba(239, 68, 68, 0.14)',
    };
  }, [score]);

  // 4 Standard Dynamic Vehicle Health Badges: OPTIMAL, GOOD, ATTENTION, CRITICAL
  const statusInfo = useMemo(() => {
    const code = String(healthStatus?.code || '').toUpperCase();
    const rawLabel = String(healthStatus?.label || '').toUpperCase();

    // 1. CRITICAL: Urgent issues, critical code, or score < 40
    if (
      urgentCount > 0 ||
      code === 'CRITICAL' ||
      rawLabel.includes('CRITICAL') ||
      rawLabel.includes('IMMEDIATE') ||
      score < 40
    ) {
      return {
        badge: 'CRITICAL',
        color: scorePalette.color,
        glowColor: scorePalette.glowColor,
        bgColor: scorePalette.bgColor,
        detailText: urgentCount > 0
          ? `${urgentCount} critical issue${urgentCount === 1 ? '' : 's'} reported`
          : diagCount > 0
          ? `${diagCount} issue${diagCount === 1 ? '' : 's'} reported`
          : 'Immediate inspection needed',
      };
    }

    // 2. ATTENTION: Unresolved diagnostic issues or score < 60
    if (
      diagCount > 0 ||
      code === 'ATTENTION' ||
      rawLabel.includes('ATTENTION') ||
      score < 60
    ) {
      return {
        badge: 'ATTENTION',
        color: scorePalette.color,
        glowColor: scorePalette.glowColor,
        bgColor: scorePalette.bgColor,
        detailText: diagCount > 0
          ? `${diagCount} issue${diagCount === 1 ? '' : 's'} reported`
          : 'Inspection recommended',
      };
    }

    // 3. GOOD: Scheduled maintenance approaching or score < 80
    if (
      code === 'DUE_SOON' ||
      code === 'GOOD' ||
      rawLabel.includes('DUE') ||
      rawLabel.includes('GOOD') ||
      score < 80
    ) {
      return {
        badge: 'GOOD',
        color: scorePalette.color,
        glowColor: scorePalette.glowColor,
        bgColor: scorePalette.bgColor,
        detailText: preventiveCount > 0
          ? `${preventiveCount} task${preventiveCount === 1 ? '' : 's'} due soon`
          : 'Maintenance due soon',
      };
    }

    // 4. OPTIMAL: Score >= 80, no unresolved diagnostic issues
    return {
      badge: 'OPTIMAL',
      color: scorePalette.color,
      glowColor: scorePalette.glowColor,
      bgColor: scorePalette.bgColor,
      detailText: 'All systems checked',
    };
  }, [score, urgentCount, diagCount, preventiveCount, healthStatus, scorePalette]);

  const statusColor = statusInfo.color;
  const statusGlowColor = statusInfo.glowColor;
  const statusBgColor = statusInfo.bgColor;
  const statusLabel = statusInfo.badge;
  const statusDetail = statusInfo.detailText;

  const canInteract = Boolean(isInteractive && onPress);
  const CardContainer = canInteract ? TouchableOpacity : View;
  const cardContainerProps = canInteract ? { activeOpacity: 0.88, onPress } : {};

  return (
    <CardContainer
      style={[
        styles.card,
        {
          backgroundColor: theme?.glassSurface || (isDark ? 'rgba(20, 21, 25, 0.90)' : '#18181B'),
          borderColor: theme?.glassBorder || (isDark ? 'rgba(255, 255, 255, 0.14)' : '#2E2F35'),
        },
        containerStyle,
      ]}
      {...cardContainerProps}
    >
      {/* Top Header Row (no icon, clean title stack + diagonal arrow) */}
      {showHeader && (
        <View style={styles.topRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>
              Vehicle health
            </Text>
            <Text style={styles.subtitle}>
              Real-time diagnostic condition
            </Text>
          </View>

          {canInteract && (
            <Icon
              name="call-made"
              size={18}
              color="#6E6E73"
            />
          )}
        </View>
      )}

      {/* Speedometer Cluster Dial */}
      <View style={styles.gaugeContainer}>
        {/* Dynamic Ambient Glow Ring Background */}
        <View
          style={[
            styles.glowRing,
            {
              borderColor: statusGlowColor,
            },
          ]}
        />

        {/* Outer Dial Circle */}
        <View style={styles.dialCircle}>
          {/* Calibrated Tick Marks with Dynamic Health Color */}
          {Array.from({ length: TICK_COUNT }).map((_, idx) => {
            const tickAngle = START_ANGLE + (ARC_ANGLE / (TICK_COUNT - 1)) * idx;
            const tickFraction = idx / (TICK_COUNT - 1);
            const isScoreActive = (score / 100) >= tickFraction;
            const isMajor = idx % 2 === 0;

            return (
              <View
                key={idx}
                style={[
                  styles.tickWrapper,
                  {
                    transform: [{ rotate: `${tickAngle}deg` }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.tick,
                    isMajor ? styles.majorTick : styles.minorTick,
                    {
                      backgroundColor: isScoreActive
                        ? statusColor
                        : '#2A2C32',
                    },
                  ]}
                />
              </View>
            );
          })}

          {/* Sweeping Needle Assembly */}
          <Animated.View
            style={[
              styles.needleAnchor,
              {
                transform: [{ rotate: needleRotation }],
              },
            ]}
          >
            <View style={styles.needleBody}>
              <View
                style={[
                  styles.needleTip,
                  {
                    shadowColor: statusColor,
                  },
                ]}
              />
            </View>
          </Animated.View>

          {/* Center Hub & Digital Health Score Readout */}
          <View style={styles.centerHub}>
            <Text style={styles.unitText}>HEALTH SCORE</Text>
            <Text style={styles.scoreValue}>
              {score}
            </Text>
          </View>

          {/* Min & Max Labels on the Gauge Arc */}
          <Text style={styles.minLabel}>0</Text>
          <Text style={styles.maxLabel}>100</Text>
        </View>
      </View>

      {/* Minimalist Bottom Status Strip with Dynamic Badge */}
      <View style={styles.bottomStrip}>
        <View style={styles.statusBadgeWrap}>
          <View
            style={[
              styles.bottomBadge,
              {
                backgroundColor: statusBgColor,
                borderColor: statusColor,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: statusColor,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: statusColor,
                },
              ]}
            >
              {statusLabel}
            </Text>
          </View>

          <Text style={styles.bulletDivider}>·</Text>

          <Text style={styles.statusSubtext} numberOfLines={1}>
            {statusDetail}
          </Text>
        </View>

        {showDetailsLink && (
          <Text style={styles.viewDetailsText}>
            View details
          </Text>
        )}
      </View>
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(20, 21, 25, 0.90)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },

  // Dial Container
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 195,
    marginVertical: 2,
  },
  glowRing: {
    position: 'absolute',
    width: 185,
    height: 185,
    borderRadius: 95,
    borderWidth: 12,
    top: 5,
  },
  dialCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  // Radial Ticks
  tickWrapper: {
    position: 'absolute',
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  tick: {
    borderRadius: 2,
  },
  majorTick: {
    width: 3,
    height: 14,
  },
  minorTick: {
    width: 2,
    height: 9,
    opacity: 0.85,
  },

  // Needle
  needleAnchor: {
    position: 'absolute',
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needleBody: {
    position: 'absolute',
    top: 12,
    alignItems: 'center',
  },
  needleTip: {
    width: 3.5,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 7,
    elevation: 4,
  },

  // Center Hub
  centerHub: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#121316',
    borderWidth: 1,
    borderColor: '#222328',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8.5,
    color: '#8E8E93',
    letterSpacing: 1.1,
  },
  scoreValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 32,
    lineHeight: 38,
    color: '#FFFFFF',
    letterSpacing: -0.8,
  },

  // Center Badge Pill
  centerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  centerBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  centerBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.6,
  },

  // Gauge min/max
  minLabel: {
    position: 'absolute',
    bottom: 22,
    left: 32,
    fontFamily: 'Outfit-Bold',
    fontSize: 10.5,
    color: '#8E8E93',
  },
  maxLabel: {
    position: 'absolute',
    bottom: 22,
    right: 32,
    fontFamily: 'Outfit-Bold',
    fontSize: 10.5,
    color: '#8E8E93',
  },

  // Minimalist Bottom Status Strip
  bottomStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 6,
  },
  bottomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 0.8,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
  },
  statusText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  bulletDivider: {
    marginHorizontal: 6,
    fontSize: 11,
    color: '#8E8E93',
  },
  statusSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
    flexShrink: 1,
  },
  viewDetailsText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10.5,
    color: '#8E8E93',
  },
});

export default VehicleHealthSpeedometer;
