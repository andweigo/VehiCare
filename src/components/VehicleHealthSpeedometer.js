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

// 240° horseshoe arc (-120° to +120°)
const START_ANGLE = -120;
const ARC_ANGLE = 240;
const SCALE_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const BAND_SEGMENTS = 41;

// Centered dial geometry with generous breathing room
const DIAL_BOX_SIZE = 216;
const DIAL_CENTER = DIAL_BOX_SIZE / 2;
const OUTER_RING_SIZE = 168;
const INNER_RING_SIZE = 128;
const LABEL_RADIUS = 98;

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
  } = useVehicleHealth();

  const activeVehicleId = vehicleProfile?.id ?? vehicleProfile?.vehicle_id ?? null;

  const score =
    typeof healthPercentage === 'number' && Number.isFinite(healthPercentage)
      ? Math.min(100, Math.max(0, Math.round(healthPercentage)))
      : 94;

  // Live issue counts for the active vehicle
  const urgentCount = healthData?.urgentDiagnosticItems?.length || 0;
  const diagCount = healthData?.diagnosticItems?.length || 0;
  const preventiveCount = healthData?.preventiveItems?.length || 0;

  // Animated sweep value (0 -> score)
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
        glowColor: 'rgba(16, 185, 129, 0.20)',
        bgColor: 'rgba(16, 185, 129, 0.14)',
      };
    }
    if (score >= 80) {
      return {
        color: '#32D583',
        glowColor: 'rgba(50, 213, 131, 0.18)',
        bgColor: 'rgba(50, 213, 131, 0.14)',
      };
    }
    if (score >= 70) {
      return {
        color: '#84CC16',
        glowColor: 'rgba(132, 204, 22, 0.18)',
        bgColor: 'rgba(132, 204, 22, 0.14)',
      };
    }
    if (score >= 60) {
      return {
        color: '#F5B942',
        glowColor: 'rgba(245, 185, 66, 0.18)',
        bgColor: 'rgba(245, 185, 66, 0.14)',
      };
    }
    if (score >= 40) {
      return {
        color: '#FF7337',
        glowColor: 'rgba(255, 115, 55, 0.18)',
        bgColor: 'rgba(255, 115, 55, 0.14)',
      };
    }
    return {
      color: '#EF4444',
      glowColor: 'rgba(239, 68, 68, 0.20)',
      bgColor: 'rgba(239, 68, 68, 0.14)',
    };
  }, [score]);

  // 4 Standard Dynamic Vehicle Health Badges: OPTIMAL, GOOD, ATTENTION, CRITICAL
  const statusInfo = useMemo(() => {
    const code = String(healthStatus?.code || '').toUpperCase();
    const rawLabel = String(healthStatus?.label || '').toUpperCase();

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

    return {
      badge: 'OPTIMAL',
      color: scorePalette.color,
      glowColor: scorePalette.glowColor,
      bgColor: scorePalette.bgColor,
      detailText: 'All systems checked',
    };
  }, [score, urgentCount, diagCount, preventiveCount, healthStatus, scorePalette]);

  const statusColor = statusInfo.color;
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
          backgroundColor: theme?.glassSurface || (isDark ? 'rgba(14, 18, 26, 0.94)' : '#12161F'),
          borderColor: theme?.glassBorder || (isDark ? 'rgba(255, 255, 255, 0.12)' : '#262C3A'),
        },
        containerStyle,
      ]}
      {...cardContainerProps}
    >
      {/* Top Header Row */}
      {showHeader && (
        <View style={styles.topRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Vehicle health</Text>
            <Text style={styles.subtitle}>Real-time diagnostic condition</Text>
          </View>

          {canInteract && (
            <Icon name="call-made" size={18} color="#6E6E73" />
          )}
        </View>
      )}

      {/* Centered Speedometer Gauge */}
      <View style={styles.gaugeWrapper}>
        <View style={styles.dialBox}>
          {/* Subtle Ambient Center Glow */}
          <View
            pointerEvents="none"
            style={[
              styles.ambientGlow,
              { backgroundColor: scorePalette.glowColor },
            ]}
          />

          {/* Outer Scale Numbers (0..100 in steps of 10) Positioned Trigonometrically */}
          {SCALE_STEPS.map((num, idx) => {
            const deg = START_ANGLE + (ARC_ANGLE / (SCALE_STEPS.length - 1)) * idx;
            const rad = ((deg - 90) * Math.PI) / 180;
            const x = DIAL_CENTER + LABEL_RADIUS * Math.cos(rad);
            const y = DIAL_CENTER + LABEL_RADIUS * Math.sin(rad);
            const isActiveStep = score >= num;

            return (
              <View
                key={`scale-${num}`}
                pointerEvents="none"
                style={[
                  styles.scaleNumberWrap,
                  {
                    left: x - 14,
                    top: y - 9,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.scaleNumberText,
                    isActiveStep && { color: '#F1F5F9', fontWeight: '600' },
                  ]}
                >
                  {num}
                </Text>
              </View>
            );
          })}

          {/* Illuminated Radial Band Between Outer & Inner Ring */}
          {Array.from({ length: BAND_SEGMENTS }).map((_, idx) => {
            const segAngle = START_ANGLE + (ARC_ANGLE / (BAND_SEGMENTS - 1)) * idx;
            const segFraction = idx / (BAND_SEGMENTS - 1);
            const isActive = score / 100 >= segFraction;
            const isMajorSpoke = idx % 4 === 0;

            return (
              <View
                key={`seg-${idx}`}
                pointerEvents="none"
                style={[
                  styles.radialRayWrapper,
                  {
                    transform: [{ rotate: `${segAngle}deg` }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.radialBandSlice,
                    isMajorSpoke && styles.majorSpokeSlice,
                    {
                      backgroundColor: isActive
                        ? statusColor
                        : 'rgba(148, 163, 184, 0.12)',
                      opacity: isActive ? (isMajorSpoke ? 0.95 : 0.45) : 1,
                    },
                  ]}
                />
              </View>
            );
          })}

          {/* Outer Thin Arc Ring */}
          <View style={styles.outerThinArcRing} pointerEvents="none" />

          {/* Sweeping Glowing Needle */}
          <Animated.View
            pointerEvents="none"
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
                    backgroundColor: statusColor,
                    shadowColor: statusColor,
                  },
                ]}
              />
            </View>
          </Animated.View>

          {/* Crisp White Inner Ring & Perfectly Centered Readout */}
          <View style={styles.innerWhiteRing}>
            <Text style={styles.centerGiantScore}>{score}</Text>
          </View>
        </View>
      </View>

      {/* Clean Bottom Status Strip */}
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
          <Text style={styles.viewDetailsText}>View details</Text>
        )}
      </View>
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
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
    marginBottom: 4,
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    color: '#8E8E93',
    marginTop: 2,
  },

  // Perfectly Centered Speedometer Container
  gaugeWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  dialBox: {
    width: DIAL_BOX_SIZE,
    height: DIAL_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ambientGlow: {
    position: 'absolute',
    width: OUTER_RING_SIZE + 8,
    height: OUTER_RING_SIZE + 8,
    borderRadius: (OUTER_RING_SIZE + 8) / 2,
    opacity: 0.25,
  },
  scaleNumberWrap: {
    position: 'absolute',
    width: 28,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleNumberText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },
  radialRayWrapper: {
    position: 'absolute',
    width: OUTER_RING_SIZE,
    height: OUTER_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  radialBandSlice: {
    width: 3,
    height: 18,
    borderRadius: 1.5,
  },
  majorSpokeSlice: {
    width: 2,
    height: 20,
  },
  outerThinArcRing: {
    position: 'absolute',
    width: OUTER_RING_SIZE,
    height: OUTER_RING_SIZE,
    borderRadius: OUTER_RING_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.20)',
    borderBottomColor: 'transparent',
  },
  needleAnchor: {
    position: 'absolute',
    width: OUTER_RING_SIZE,
    height: OUTER_RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needleBody: {
    position: 'absolute',
    top: 1,
    alignItems: 'center',
  },
  needleTip: {
    width: 3.5,
    height: 21,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 7,
    elevation: 5,
  },
  innerWhiteRing: {
    width: INNER_RING_SIZE,
    height: INNER_RING_SIZE,
    borderRadius: INNER_RING_SIZE / 2,
    backgroundColor: '#0B0F17',
    borderWidth: 1.8,
    borderColor: 'rgba(255, 255, 255, 0.88)',
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  healthModeLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 9.5,
    color: '#8A99AD',
  },
  healthModeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  modeTriangle: {
    fontSize: 7,
    color: '#E2E8F0',
    marginHorizontal: 4,
  },
  healthModeValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 9.5,
    letterSpacing: 0.7,
  },
  centerGiantScore: {
    fontFamily: 'Outfit-Bold',
    fontSize: 42,
    lineHeight: 46,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginTop: 2,
  },
  centerUnitLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    color: '#94A3B8',
    marginTop: -1,
  },

  // Bottom Status Strip
  bottomStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  statusBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  bottomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    fontSize: 11,
    color: '#8E8E93',
  },
});

export default VehicleHealthSpeedometer;
