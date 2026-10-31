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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import useVehicleHealth from '../hooks/useVehicleHealth';
import { getVehicleDisplayName } from '../utils/vehicleDisplay';

// Arc configuration matching the 0..8 digital cockpit tachometer (240° sweep)
const START_ANGLE = -120;
const ARC_ANGLE = 240;
const MAJOR_STEPS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const BAND_SEGMENTS = 33;

// Dial geometry constants for precise trigonometric layout
const DIAL_SIZE = 152;
const DIAL_CENTER = DIAL_SIZE / 2;
const LABEL_RADIUS = 68;

const VehicleHealthSpeedometer = ({
  onPress,
  showDetailsLink = true,
  isInteractive = true,
  showHeader = true,
  containerStyle,
}) => {
  const {
    vehicleProfile,
    healthPercentage,
    healthStatus,
    healthData,
    completedCount = 0,
    pendingCount = 0,
  } = useVehicleHealth();

  const activeVehicleId = vehicleProfile?.id ?? vehicleProfile?.vehicle_id ?? null;

  const score =
    typeof healthPercentage === 'number' && Number.isFinite(healthPercentage)
      ? Math.min(100, Math.max(0, Math.round(healthPercentage)))
      : 94;

  // Live vehicle metrics
  const urgentCount = healthData?.urgentDiagnosticItems?.length || 0;
  const diagCount = healthData?.diagnosticItems?.length || 0;
  const preventiveCount = healthData?.preventiveItems?.length || 0;
  const maintenanceLogsCount = healthData?.factors?.maintenance ?? completedCount ?? 0;
  const totalRecordsCount =
    (Number(maintenanceLogsCount) || 0) +
    (Number(healthData?.factors?.diagnostics) || diagCount) +
    (Number(completedCount) || 0);

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
        bandColor: 'rgba(16, 185, 129, 0.42)',
        glowColor: 'rgba(16, 185, 129, 0.22)',
        bgColor: 'rgba(16, 185, 129, 0.14)',
      };
    }
    if (score >= 80) {
      return {
        color: '#32D583',
        bandColor: 'rgba(50, 213, 131, 0.40)',
        glowColor: 'rgba(50, 213, 131, 0.20)',
        bgColor: 'rgba(50, 213, 131, 0.14)',
      };
    }
    if (score >= 70) {
      return {
        color: '#84CC16',
        bandColor: 'rgba(132, 204, 22, 0.40)',
        glowColor: 'rgba(132, 204, 22, 0.20)',
        bgColor: 'rgba(132, 204, 22, 0.14)',
      };
    }
    if (score >= 60) {
      return {
        color: '#F5B942',
        bandColor: 'rgba(245, 185, 66, 0.40)',
        glowColor: 'rgba(245, 185, 66, 0.20)',
        bgColor: 'rgba(245, 185, 66, 0.14)',
      };
    }
    if (score >= 40) {
      return {
        color: '#FF7337',
        bandColor: 'rgba(255, 115, 55, 0.42)',
        glowColor: 'rgba(255, 115, 55, 0.20)',
        bgColor: 'rgba(255, 115, 55, 0.14)',
      };
    }
    return {
      color: '#EF4444',
      bandColor: 'rgba(239, 68, 68, 0.45)',
      glowColor: 'rgba(239, 68, 68, 0.22)',
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
        tier: 1,
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
        tier: 2,
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
        tier: 3,
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
      tier: 4,
      color: scorePalette.color,
      glowColor: scorePalette.glowColor,
      bgColor: scorePalette.bgColor,
      detailText: 'All systems checked',
    };
  }, [score, urgentCount, diagCount, preventiveCount, healthStatus, scorePalette]);

  const statusColor = statusInfo.color;
  const statusLabel = statusInfo.badge;
  const statusDetail = statusInfo.detailText;

  // Cockpit derived telemetry values
  const nowDate = useMemo(() => {
    const d = new Date();
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' }).toLowerCase();
    const year = d.getFullYear();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return { datePart: `${day} ${month} ${year}`, timePart: time };
  }, []);

  const vehicleShortLabel = useMemo(() => {
    const name = getVehicleDisplayName(vehicleProfile, 'Active Vehicle');
    return name.length > 16 ? `${name.slice(0, 15)}…` : name;
  }, [vehicleProfile]);

  // Left gauge (Care Reserve: 6 segments from E to F)
  const careFilledSegments = Math.max(1, Math.min(6, Math.round((score / 100) * 6)));
  // Right lower gauge (System Readiness: 5 segments)
  const readinessSegments = Math.max(1, Math.min(5, Math.round((score / 100) * 5)));
  // Right upper gauge (Diagnostic Integrity %)
  const diagIntegrity = Math.max(50, Math.min(130, Math.round(50 + (score / 100) * 45)));
  const readinessVoltage = (11.8 + (score / 100) * 2.2).toFixed(1);

  const canInteract = Boolean(isInteractive && onPress);
  const CardContainer = canInteract ? TouchableOpacity : View;
  const cardContainerProps = canInteract ? { activeOpacity: 0.9, onPress } : {};

  return (
    <CardContainer
      style={[styles.card, containerStyle]}
      {...cardContainerProps}
    >
      {/* Ambient Radial Center Glow */}
      <View
        pointerEvents="none"
        style={[
          styles.ambientCenterGlow,
          { backgroundColor: scorePalette.glowColor },
        ]}
      />

      {/* TOP HUD HEADER ROW (Date/Time Left + Vehicle/Sync Right with Angled HUD Underlines) */}
      {showHeader && (
        <View style={styles.topHudRow}>
          <View style={styles.topHudLeftWrap}>
            <View style={styles.topHudLeftTextRow}>
              <Text style={styles.hudDateText}>{nowDate.datePart} </Text>
              <Text style={styles.hudTimeText}>{nowDate.timePart}</Text>
            </View>
            <View style={styles.hudLineLeftContainer}>
              <View style={styles.hudHorizontalLineLeft} />
              <View style={styles.hudAngledTailLeft} />
            </View>
          </View>

          <View style={styles.topHudCenterTitle}>
            <Text style={styles.clusterEyebrow} numberOfLines={1}>
              {vehicleShortLabel}
            </Text>
          </View>

          <View style={styles.topHudRightWrap}>
            <View style={styles.topHudRightTextRow}>
              <Text style={[styles.hudRightTempText, { color: statusColor }]}>
                {statusLabel}
              </Text>
              {canInteract && (
                <Icon
                  name="call-made"
                  size={13}
                  color="#7C8B99"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            <View style={styles.hudLineRightContainer}>
              <View style={styles.hudAngledTailRight} />
              <View style={styles.hudHorizontalLineRight} />
            </View>
          </View>
        </View>
      )}

      {/* MAIN 3-COLUMN DIGITAL COCKPIT CLUSTER */}
      <View style={styles.clusterMainRow}>
        {/* ================= LEFT WING: CARE RESERVE GAUGE & CARE LOG TABLE ================= */}
        <View style={styles.leftWing}>
          <View style={styles.leftGaugeBlock}>
            {/* F / 1/2 / E Labels */}
            <View style={styles.fuelLabelsCol}>
              <Text style={styles.arcScaleLabel}>F</Text>
              <Text style={styles.arcScaleLabel}>1/2</Text>
              <Text style={styles.arcScaleLabel}>E</Text>
            </View>

            {/* Curved Segmented Vertical Bar */}
            <View style={styles.leftCurvedBarOuter}>
              {[5, 4, 3, 2, 1, 0].map(segIdx => {
                const isLit = segIdx < careFilledSegments;
                const isBottomReserve = segIdx === 0;
                return (
                  <View
                    key={segIdx}
                    style={[
                      styles.leftBarSegment,
                      {
                        backgroundColor: isLit
                          ? statusColor
                          : 'rgba(148, 163, 184, 0.10)',
                        opacity: isLit ? 0.88 : 1,
                      },
                      isBottomReserve && styles.leftBarReserveSegment,
                    ]}
                  />
                );
              })}
            </View>

            {/* Readout + Dotted Connector Sub-stats */}
            <View style={styles.leftReadoutCol}>
              <View style={styles.leftPrimaryMetricRow}>
                <Text style={styles.smallArrow}>◀</Text>
                <MaterialCommunityIcons
                  name="car-wrench"
                  size={13}
                  color="#FFFFFF"
                  style={{ marginHorizontal: 3 }}
                />
                <Text style={styles.wingBigValue}>
                  {score}%
                </Text>
              </View>

              <View style={styles.dottedStatsWrap}>
                <View style={styles.dottedLineRow}>
                  <View style={styles.dottedTick} />
                  <Text style={styles.wingSubStatText} numberOfLines={1}>
                    ~{diagCount} {diagCount === 1 ? 'issue' : 'issues'}
                  </Text>
                </View>
                <View style={styles.dottedLineRow}>
                  <View style={[styles.dottedTick, { width: 10 }]} />
                  <Text style={styles.wingSubStatText} numberOfLines={1}>
                    → {preventiveCount} due
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom-Left Distance-style Table ("Care Log") */}
          <View style={styles.distanceTableWrap}>
            <Text style={styles.distanceHeaderLabel}>Care Log</Text>
            <View style={styles.distancePillRow}>
              <Text style={styles.distanceRowKey}>Pending</Text>
              <Text style={styles.distanceRowVal}>{pendingCount} tasks</Text>
            </View>
            <View style={styles.distancePillRow}>
              <Text style={styles.distanceRowKey}>Total</Text>
              <Text style={styles.distanceRowVal}>{totalRecordsCount} logs</Text>
            </View>
          </View>
        </View>

        {/* ================= CENTER: SPEEDOMETER / TACHOMETER DIAL ================= */}
        <View style={styles.centerDialContainer}>
          <View style={styles.dialBox}>
            {/* Outer Scale Numbers 0..8 Positioned Trigonometrically */}
            {MAJOR_STEPS.map((num, idx) => {
              const deg = START_ANGLE + (ARC_ANGLE / (MAJOR_STEPS.length - 1)) * idx;
              const rad = ((deg - 90) * Math.PI) / 180;
              const x = DIAL_CENTER + LABEL_RADIUS * Math.cos(rad);
              const y = DIAL_CENTER + LABEL_RADIUS * Math.sin(rad);

              return (
                <View
                  key={`num-${num}`}
                  style={[
                    styles.outerNumberWrap,
                    {
                      left: x - 10,
                      top: y - 8,
                    },
                  ]}
                >
                  <Text style={styles.outerNumberText}>{num}</Text>
                </View>
              );
            })}

            {/* Illuminated Radial Band Segments Between Outer & Inner Ring */}
            {Array.from({ length: BAND_SEGMENTS }).map((_, idx) => {
              const segAngle = START_ANGLE + (ARC_ANGLE / (BAND_SEGMENTS - 1)) * idx;
              const segFraction = idx / (BAND_SEGMENTS - 1);
              const isActive = score / 100 >= segFraction;
              const isMajorSpoke = idx % 4 === 0;
              const isHighZone = segFraction >= 0.75;

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
                          : isHighZone
                          ? 'rgba(239, 68, 68, 0.16)'
                          : 'rgba(148, 163, 184, 0.08)',
                        opacity: isActive ? (isMajorSpoke ? 0.95 : 0.42) : 1,
                      },
                    ]}
                  />
                </View>
              );
            })}

            {/* Outer Thin Ring */}
            <View style={styles.outerThinArcRing} pointerEvents="none" />

            {/* Sweeping Glowing Needle Assembly */}
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

            {/* Crisp White Inner Horseshoe Ring & Center Readout Hub */}
            <View style={styles.innerWhiteRing}>
              {/* Top Mode Selector ("Health mode" / "◀ OPTIMAL ▶") */}
              <Text style={styles.driveModeLabel}>Health mode</Text>
              <View style={styles.driveModeSelectorRow}>
                <Text style={styles.modeTriangle}>◀</Text>
                <Text
                  style={[
                    styles.driveModeValue,
                    { color: statusColor },
                  ]}
                  numberOfLines={1}
                >
                  {statusLabel}
                </Text>
                <Text style={styles.modeTriangle}>▶</Text>
              </View>

              {/* Giant Center Score Value */}
              <Text style={styles.centerGiantScore}>
                {score}
              </Text>

              {/* Unit Subtitle ("health %") */}
              <Text style={styles.centerUnitLabel}>health %</Text>

              {/* Bottom Gear-style Indicator ("V H 4") */}
              <View style={styles.gearRow}>
                <Text style={styles.gearMutedText}>V</Text>
                <Text style={styles.gearActiveText}>H</Text>
                <Text
                  style={[
                    styles.gearNumberText,
                    { color: statusColor },
                  ]}
                >
                  {statusInfo.tier}
                </Text>
              </View>
            </View>

            {/* Bottom-Right Multiplier Label ("×100 IDX") */}
            <View style={styles.multiplierWrap}>
              <Text style={styles.multiplierTopText}>×100</Text>
              <Text style={styles.multiplierSubText}>IDX</Text>
            </View>
          </View>
        </View>

        {/* ================= RIGHT WING: INTEGRITY & READINESS GAUGES ================= */}
        <View style={styles.rightWing}>
          {/* Upper-Right Gauge (Diagnostic Integrity / Temp Style) */}
          <View style={styles.rightUpperBlock}>
            <View style={styles.rightMetricInline}>
              <Text style={styles.wingBigValue}>
                {100 - Math.min(90, urgentCount * 25 + diagCount * 10)}%
              </Text>
              <MaterialCommunityIcons
                name="coolant-temperature"
                size={15}
                color="#FFFFFF"
                style={{ marginLeft: 4 }}
              />
            </View>

            <View style={styles.rightUpperGaugeWrap}>
              <View style={styles.rightCurvedTempBar}>
                {/* Red High Zone Top */}
                <View style={styles.tempTopZone} />
                {/* Active Glowing Level Fill */}
                <View
                  style={[
                    styles.tempActiveFill,
                    {
                      height: `${Math.max(20, Math.min(75, (diagIntegrity - 50)))}%`,
                      backgroundColor: statusColor,
                      borderTopColor: '#FFFFFF',
                    },
                  ]}
                />
              </View>

              <View style={styles.tempLabelsCol}>
                <Text style={styles.arcScaleLabel}>100</Text>
                <Text style={styles.arcScaleLabel}>80</Text>
                <Text style={styles.arcScaleLabel}>50</Text>
              </View>
            </View>
          </View>

          {/* Lower-Right Gauge (Battery / System Readiness Style) */}
          <View style={styles.rightLowerBlock}>
            <View style={styles.rightMetricInline}>
              <Text style={styles.wingBigValue}>{readinessVoltage} v</Text>
              <MaterialCommunityIcons
                name="car-battery"
                size={15}
                color="#FFFFFF"
                style={{ marginLeft: 4 }}
              />
            </View>

            <View style={styles.rightBatteryBarOuter}>
              {[4, 3, 2, 1, 0].map(segIdx => {
                const isLit = segIdx < readinessSegments;
                return (
                  <View
                    key={`bat-${segIdx}`}
                    style={[
                      styles.batteryBarSegment,
                      {
                        backgroundColor: isLit
                          ? statusColor
                          : 'rgba(148, 163, 184, 0.12)',
                        opacity: isLit ? 0.85 : 1,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        </View>
      </View>

      {/* BOTTOM COCKPIT TELLTALE BAR & STATUS STRIP */}
      <View style={styles.bottomCockpitBar}>
        <View style={styles.telltaleIconsRow}>
          {/* 1. Inspection / Headlight Telltale */}
          <MaterialCommunityIcons
            name="car-light-high"
            size={17}
            color="#F59E0B"
            style={styles.telltaleAmberGlow}
          />

          {/* 2. Oil / Service Telltale */}
          <MaterialCommunityIcons
            name="oil"
            size={17}
            color={preventiveCount > 0 ? '#F5B942' : '#263445'}
          />

          {/* 3. Active Vehicle Sync Turn-Signal Arrows (Glowing Green) */}
          <MaterialCommunityIcons
            name="swap-horizontal-bold"
            size={18}
            color="#10B981"
            style={styles.telltaleGreenGlow}
          />

          {/* 4. Check Engine / Diagnostic Telltale */}
          <MaterialCommunityIcons
            name="engine-outline"
            size={17}
            color={diagCount > 0 ? statusColor : '#263445'}
          />
        </View>

        <View style={styles.bottomSummaryRow}>
          <Text style={styles.bottomDetailText} numberOfLines={1}>
            {statusDetail}
          </Text>
          {showDetailsLink && (
            <Text style={[styles.viewDetailsText, { color: statusColor }]}>
              View details ›
            </Text>
          )}
        </View>
      </View>
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#07131E',
    borderColor: 'rgba(56, 189, 248, 0.18)',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 7,
    marginBottom: 20,
    overflow: 'hidden',
  },
  ambientCenterGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    alignSelf: 'center',
    top: 22,
    opacity: 0.25,
  },

  // Top HUD Bar
  topHudRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  topHudLeftWrap: {
    width: '34%',
  },
  topHudLeftTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 3,
  },
  hudDateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 9.5,
    color: '#7C8B99',
  },
  hudTimeText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 9.5,
    color: '#F1F5F9',
  },
  hudLineLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hudHorizontalLineLeft: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.22)',
  },
  hudAngledTailLeft: {
    width: 10,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.22)',
    transform: [{ rotate: '-35deg' }, { translateY: -2 }],
  },
  topHudCenterTitle: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  clusterEyebrow: {
    fontFamily: 'Inter-Medium',
    fontSize: 9.5,
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  topHudRightWrap: {
    width: '30%',
    alignItems: 'flex-end',
  },
  topHudRightTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 3,
  },
  hudRightTempText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  hudLineRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  hudAngledTailRight: {
    width: 10,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.22)',
    transform: [{ rotate: '35deg' }, { translateY: -2 }],
  },
  hudHorizontalLineRight: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.22)',
  },

  // Main 3-Column Layout
  clusterMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },

  // Left Wing
  leftWing: {
    width: 96,
    justifyContent: 'space-between',
  },
  leftGaugeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fuelLabelsCol: {
    height: 64,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginRight: 3,
  },
  arcScaleLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 8.5,
    color: '#CBD5E1',
  },
  leftCurvedBarOuter: {
    width: 11,
    height: 64,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 4,
    padding: 1.5,
    justifyContent: 'space-between',
    transform: [{ rotate: '6deg' }],
  },
  leftBarSegment: {
    flex: 1,
    marginVertical: 0.6,
    borderRadius: 1,
  },
  leftBarReserveSegment: {
    borderTopWidth: 1,
    borderTopColor: '#EF4444',
  },
  leftReadoutCol: {
    marginLeft: 6,
    flex: 1,
  },
  leftPrimaryMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallArrow: {
    fontSize: 7,
    color: '#94A3B8',
  },
  wingBigValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  dottedStatsWrap: {
    marginTop: 4,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(148, 163, 184, 0.28)',
    borderStyle: 'dashed',
    paddingLeft: 4,
  },
  dottedLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dottedTick: {
    width: 5,
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.35)',
    marginRight: 3,
  },
  wingSubStatText: {
    fontFamily: 'Inter-Regular',
    fontSize: 8.5,
    color: '#94A3B8',
  },

  // Left Distance / Care Log Table
  distanceTableWrap: {
    marginTop: 8,
  },
  distanceHeaderLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 8.5,
    color: '#64748B',
    marginBottom: 3,
  },
  distancePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
    marginBottom: 2.5,
  },
  distanceRowKey: {
    fontFamily: 'Inter-Regular',
    fontSize: 8.5,
    color: '#94A3B8',
  },
  distanceRowVal: {
    fontFamily: 'Inter-Medium',
    fontSize: 8.5,
    color: '#E2E8F0',
  },

  // Center Speedometer / Tachometer Dial
  centerDialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: DIAL_SIZE,
    height: DIAL_SIZE,
  },
  dialBox: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  outerNumberWrap: {
    position: 'absolute',
    width: 20,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerNumberText: {
    fontFamily: 'Inter-Medium',
    fontSize: 9,
    color: '#CBD5E1',
  },
  radialRayWrapper: {
    position: 'absolute',
    width: 124,
    height: 124,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  radialBandSlice: {
    width: 2.5,
    height: 15,
    borderRadius: 1,
  },
  majorSpokeSlice: {
    width: 1.5,
    height: 16,
  },
  outerThinArcRing: {
    position: 'absolute',
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderBottomColor: 'transparent',
  },
  needleAnchor: {
    position: 'absolute',
    width: 124,
    height: 124,
    alignItems: 'center',
    justifyContent: 'center',
  },
  needleBody: {
    position: 'absolute',
    top: 1,
    alignItems: 'center',
  },
  needleTip: {
    width: 3,
    height: 17,
    borderRadius: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 6,
    elevation: 5,
  },
  innerWhiteRing: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#06111B',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  driveModeLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 7.5,
    color: '#64748B',
  },
  driveModeSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0.5,
  },
  modeTriangle: {
    fontSize: 6,
    color: '#E2E8F0',
    marginHorizontal: 2,
  },
  driveModeValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 7.5,
    letterSpacing: 0.6,
  },
  centerGiantScore: {
    fontFamily: 'Outfit-Bold',
    fontSize: 32,
    lineHeight: 35,
    color: '#FFFFFF',
    letterSpacing: -1,
    marginTop: 1,
  },
  centerUnitLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 8,
    color: '#94A3B8',
    marginTop: -2,
  },
  gearRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  gearMutedText: {
    fontFamily: 'Outfit-Medium',
    fontSize: 10,
    color: '#475569',
    marginRight: 4,
  },
  gearActiveText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: '#FFFFFF',
    marginRight: 2,
  },
  gearNumberText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
  },
  multiplierWrap: {
    position: 'absolute',
    bottom: 8,
    right: 16,
    alignItems: 'center',
  },
  multiplierTopText: {
    fontFamily: 'Inter-Medium',
    fontSize: 7,
    color: '#94A3B8',
  },
  multiplierSubText: {
    fontFamily: 'Inter-Bold',
    fontSize: 6.5,
    color: '#64748B',
  },

  // Right Wing
  rightWing: {
    width: 92,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  rightUpperBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rightMetricInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  rightUpperGaugeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightCurvedTempBar: {
    width: 11,
    height: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    transform: [{ rotate: '-6deg' }],
  },
  tempTopZone: {
    width: '100%',
    height: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.38)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.7)',
  },
  tempActiveFill: {
    width: '100%',
    borderTopWidth: 1.5,
    opacity: 0.85,
  },
  tempLabelsCol: {
    height: 60,
    justifyContent: 'space-between',
    marginLeft: 3,
  },
  rightLowerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  rightBatteryBarOuter: {
    width: 11,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    borderRadius: 3.5,
    padding: 1.5,
    justifyContent: 'space-between',
    transform: [{ rotate: '6deg' }],
  },
  batteryBarSegment: {
    flex: 1,
    marginVertical: 0.5,
    borderRadius: 1,
  },

  // Bottom Telltale & Status Bar
  bottomCockpitBar: {
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.14)',
  },
  telltaleIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 4,
  },
  telltaleAmberGlow: {
    textShadowColor: 'rgba(245, 158, 11, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  telltaleGreenGlow: {
    textShadowColor: 'rgba(16, 185, 129, 0.65)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  bottomSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  bottomDetailText: {
    fontFamily: 'Inter-Regular',
    fontSize: 9.5,
    color: '#7C8B99',
    flex: 1,
    paddingRight: 8,
  },
  viewDetailsText: {
    fontFamily: 'Inter-Medium',
    fontSize: 9.5,
  },
});

export default VehicleHealthSpeedometer;
