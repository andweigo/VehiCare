import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

/**
 * Shared animated pulse hook for smooth native-driver skeleton shimmer.
 */
export const useSkeletonPulse = () => {
  const pulseAnim = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return pulseAnim;
};

/**
 * Reusable rectangular skeleton block.
 */
export const SkeletonBox = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
  pulseAnim: externalPulse,
}) => {
  const { themeName } = useTheme();
  const isDark = themeName === 'dark';
  const internalPulse = useSkeletonPulse();
  const opacity = externalPulse || internalPulse;
  const fill = isDark ? '#23242B' : '#E2E8F0';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: fill,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Reusable circular skeleton block (icons, avatars, badges).
 */
export const SkeletonCircle = ({ size = 40, style, pulseAnim }) => (
  <SkeletonBox
    width={size}
    height={size}
    borderRadius={size / 2}
    style={style}
    pulseAnim={pulseAnim}
  />
);

/**
 * Reusable text-line skeleton block.
 */
export const SkeletonLine = ({
  width = '80%',
  height = 12,
  borderRadius = 6,
  style,
  pulseAnim,
}) => (
  <SkeletonBox
    width={width}
    height={height}
    borderRadius={borderRadius}
    style={style}
    pulseAnim={pulseAnim}
  />
);

/**
 * Reusable themed card container for skeleton layouts.
 */
export const SkeletonCard = ({ children, style }) => {
  const { theme, themeName } = useTheme();
  const isDark = themeName === 'dark';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#141519' : theme.surface || '#FFFFFF',
          borderColor: isDark ? '#23242B' : theme.border || '#E8EDF2',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

/**
 * Screen-customizable SkeletonLoader with tailored presets matching each VehiCare screen's cards.
 */
const SkeletonLoader = ({ variant = 'cards', count = 3, style }) => {
  const pulse = useSkeletonPulse();

  // 1. MAINTENANCE SCREEN SKELETON
  if (variant === 'maintenance') {
    return (
      <View testID="skeleton-maintenance" style={[styles.screenWrap, style]}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="55%" height={18} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="38%" height={11} pulseAnim={pulse} />
          </View>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
        </View>

        {/* Active Vehicle Hero Card + 3 Stat Boxes */}
        <SkeletonCard style={styles.mb14}>
          <View style={styles.rowCenter}>
            <SkeletonBox width={54} height={54} borderRadius={16} pulseAnim={pulse} />
            <View style={[styles.flex1, styles.ml12]}>
              <SkeletonLine width="65%" height={16} style={styles.mb6} pulseAnim={pulse} />
              <SkeletonLine width="45%" height={12} pulseAnim={pulse} />
            </View>
            <SkeletonBox width={68} height={28} borderRadius={14} pulseAnim={pulse} />
          </View>
          <View style={[styles.statsRow, styles.mt14]}>
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.statBoxPlaceholder}>
                <SkeletonLine width={28} height={20} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width="70%" height={10} pulseAnim={pulse} />
              </View>
            ))}
          </View>
        </SkeletonCard>

        {/* "What needs attention" Hero Card */}
        <SkeletonCard style={styles.mb16}>
          <SkeletonBox width={140} height={22} borderRadius={8} style={styles.mb12} pulseAnim={pulse} />
          <SkeletonLine width="82%" height={17} style={styles.mb8} pulseAnim={pulse} />
          <SkeletonLine width="94%" height={12} style={styles.mb6} pulseAnim={pulse} />
          <SkeletonLine width="68%" height={12} style={styles.mb14} pulseAnim={pulse} />
          <View style={styles.rowGap10}>
            <SkeletonBox width="62%" height={40} borderRadius={12} pulseAnim={pulse} />
            <SkeletonBox width="34%" height={40} borderRadius={12} pulseAnim={pulse} />
          </View>
        </SkeletonCard>

        {/* 2x2 Category Cards Grid */}
        <SkeletonLine width={150} height={15} style={styles.mb12} pulseAnim={pulse} />
        <View style={styles.grid2x2}>
          {[0, 1, 2, 3].map(i => (
            <SkeletonCard key={i} style={styles.gridCard}>
              <View style={styles.rowBetween}>
                <SkeletonCircle size={38} pulseAnim={pulse} />
                <SkeletonBox width={56} height={20} borderRadius={8} pulseAnim={pulse} />
              </View>
              <SkeletonLine width="78%" height={14} style={styles.mt12} pulseAnim={pulse} />
              <SkeletonLine width="52%" height={11} style={styles.mt6} pulseAnim={pulse} />
            </SkeletonCard>
          ))}
        </View>
      </View>
    );
  }

  // 2. SMART TIPS / RECOMMENDATIONS SCREEN SKELETON
  if (variant === 'smartTips' || variant === 'smartRecommendations') {
    return (
      <View testID="skeleton-smart-tips" style={[styles.screenWrap, style]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="42%" height={10} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="68%" height={18} pulseAnim={pulse} />
          </View>
        </View>

        {/* Vehicle Health & Completion Progress Card */}
        <SkeletonCard style={styles.mb14}>
          <View style={styles.rowBetween}>
            <View style={styles.rowCenter}>
              <SkeletonCircle size={44} pulseAnim={pulse} />
              <View style={styles.ml12}>
                <SkeletonLine width={140} height={15} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width={100} height={11} pulseAnim={pulse} />
              </View>
            </View>
            <SkeletonBox width={58} height={28} borderRadius={12} pulseAnim={pulse} />
          </View>
          <SkeletonBox width="100%" height={8} borderRadius={4} style={styles.mt14} pulseAnim={pulse} />
        </SkeletonCard>

        {/* Filter Tabs Row */}
        <View style={[styles.rowGap8, styles.mb14]}>
          <SkeletonBox width={64} height={34} borderRadius={17} pulseAnim={pulse} />
          <SkeletonBox width={96} height={34} borderRadius={17} pulseAnim={pulse} />
          <SkeletonBox width={110} height={34} borderRadius={17} pulseAnim={pulse} />
          <SkeletonBox width={88} height={34} borderRadius={17} pulseAnim={pulse} />
        </View>

        {/* Recommendation Task Cards */}
        {[0, 1, 2].map(i => (
          <SkeletonCard key={i} style={styles.mb12}>
            <View style={styles.rowBetween}>
              <View style={[styles.rowCenter, styles.flex1]}>
                <SkeletonCircle size={40} pulseAnim={pulse} />
                <View style={[styles.ml12, styles.flex1]}>
                  <SkeletonLine width="75%" height={15} style={styles.mb6} pulseAnim={pulse} />
                  <SkeletonLine width="45%" height={11} pulseAnim={pulse} />
                </View>
              </View>
              <SkeletonBox width={64} height={22} borderRadius={8} pulseAnim={pulse} />
            </View>
            <SkeletonLine width="92%" height={12} style={styles.mt12} pulseAnim={pulse} />
            <SkeletonLine width="68%" height={12} style={styles.mt6} pulseAnim={pulse} />
            <View style={[styles.rowGap10, styles.mt14]}>
              <SkeletonBox width="48%" height={36} borderRadius={10} pulseAnim={pulse} />
              <SkeletonBox width="48%" height={36} borderRadius={10} pulseAnim={pulse} />
            </View>
          </SkeletonCard>
        ))}
      </View>
    );
  }

  // 3. MY VEHICLES / GARAGE SCREEN SKELETON
  if (variant === 'vehicles') {
    return (
      <View testID="skeleton-vehicles" style={[styles.screenWrap, style]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="50%" height={18} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="35%" height={11} pulseAnim={pulse} />
          </View>
          <SkeletonBox width={96} height={38} borderRadius={12} pulseAnim={pulse} />
        </View>

        {/* Active Vehicle Showcase Card */}
        <SkeletonCard style={styles.mb16}>
          <View style={styles.rowBetween}>
            <SkeletonBox width={88} height={22} borderRadius={8} pulseAnim={pulse} />
            <SkeletonBox width={64} height={22} borderRadius={8} pulseAnim={pulse} />
          </View>
          <View style={[styles.rowCenter, styles.mt12]}>
            <SkeletonBox width={64} height={64} borderRadius={18} pulseAnim={pulse} />
            <View style={[styles.ml12, styles.flex1]}>
              <SkeletonLine width="72%" height={18} style={styles.mb8} pulseAnim={pulse} />
              <SkeletonLine width="48%" height={12} pulseAnim={pulse} />
            </View>
          </View>
          <View style={[styles.rowGap10, styles.mt14]}>
            <SkeletonBox width="48%" height={38} borderRadius={11} pulseAnim={pulse} />
            <SkeletonBox width="48%" height={38} borderRadius={11} pulseAnim={pulse} />
          </View>
        </SkeletonCard>

        {/* Other Vehicles List */}
        <SkeletonLine width={130} height={14} style={styles.mb12} pulseAnim={pulse} />
        {[0, 1].map(i => (
          <SkeletonCard key={i} style={styles.mb12}>
            <View style={styles.rowCenter}>
              <SkeletonBox width={48} height={48} borderRadius={14} pulseAnim={pulse} />
              <View style={[styles.ml12, styles.flex1]}>
                <SkeletonLine width="66%" height={15} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width="42%" height={11} pulseAnim={pulse} />
              </View>
              <SkeletonBox width={74} height={32} borderRadius={10} pulseAnim={pulse} />
            </View>
          </SkeletonCard>
        ))}
      </View>
    );
  }

  // 4. HISTORY SCREEN SKELETON
  if (variant === 'history') {
    return (
      <View testID="skeleton-history" style={[styles.screenWrap, style]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="48%" height={18} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="64%" height={11} pulseAnim={pulse} />
          </View>
        </View>

        {/* Search + Filter Chips */}
        <SkeletonBox width="100%" height={44} borderRadius={14} style={styles.mb12} pulseAnim={pulse} />
        <View style={[styles.rowGap8, styles.mb16]}>
          <SkeletonBox width={58} height={32} borderRadius={16} pulseAnim={pulse} />
          <SkeletonBox width={92} height={32} borderRadius={16} pulseAnim={pulse} />
          <SkeletonBox width={98} height={32} borderRadius={16} pulseAnim={pulse} />
          <SkeletonBox width={76} height={32} borderRadius={16} pulseAnim={pulse} />
        </View>

        {/* History Log Cards */}
        {[0, 1, 2, 3].map(i => (
          <SkeletonCard key={i} style={styles.mb12}>
            <View style={styles.rowBetween}>
              <View style={[styles.rowCenter, styles.flex1]}>
                <SkeletonCircle size={40} pulseAnim={pulse} />
                <View style={[styles.ml12, styles.flex1]}>
                  <SkeletonLine width="74%" height={15} style={styles.mb6} pulseAnim={pulse} />
                  <SkeletonLine width="46%" height={11} pulseAnim={pulse} />
                </View>
              </View>
              <SkeletonBox width={66} height={22} borderRadius={8} pulseAnim={pulse} />
            </View>
            <SkeletonLine width="88%" height={11} style={styles.mt12} pulseAnim={pulse} />
          </SkeletonCard>
        ))}
      </View>
    );
  }

  // 5. REPAIR SHOPS LIST SKELETON (embedded inside RepairShopsScreen)
  if (variant === 'repairShops') {
    return (
      <View testID="skeleton-repair-shops" style={style}>
        {[0, 1, 2].map(i => (
          <SkeletonCard key={i} style={styles.mb12}>
            <View style={styles.rowBetween}>
              <View style={[styles.rowCenter, styles.flex1]}>
                <SkeletonBox width={44} height={44} borderRadius={12} pulseAnim={pulse} />
                <View style={[styles.ml12, styles.flex1]}>
                  <SkeletonLine width="72%" height={15} style={styles.mb6} pulseAnim={pulse} />
                  <SkeletonLine width="50%" height={11} pulseAnim={pulse} />
                </View>
              </View>
              <SkeletonBox width={54} height={24} borderRadius={8} pulseAnim={pulse} />
            </View>
            <SkeletonLine width="85%" height={11} style={styles.mt12} pulseAnim={pulse} />
            <View style={[styles.rowGap10, styles.mt12]}>
              <SkeletonBox width="48%" height={36} borderRadius={10} pulseAnim={pulse} />
              <SkeletonBox width="48%" height={36} borderRadius={10} pulseAnim={pulse} />
            </View>
          </SkeletonCard>
        ))}
      </View>
    );
  }

  // 6. VEHICLE HEALTH RECORDS SKELETON (embedded inside VehicleHealthScreen)
  if (variant === 'vehicleHealth') {
    return (
      <View testID="skeleton-vehicle-health" style={style}>
        {[0, 1, 2].map(i => (
          <SkeletonCard key={i} style={styles.mb10}>
            <View style={styles.rowCenter}>
              <SkeletonCircle size={36} pulseAnim={pulse} />
              <View style={[styles.ml12, styles.flex1]}>
                <SkeletonLine width="68%" height={14} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width="42%" height={11} pulseAnim={pulse} />
              </View>
              <SkeletonBox width={64} height={22} borderRadius={8} pulseAnim={pulse} />
            </View>
          </SkeletonCard>
        ))}
      </View>
    );
  }

  // 7. NOTIFICATIONS SCREEN SKELETON
  if (variant === 'notifications') {
    return (
      <View testID="skeleton-notifications" style={[styles.screenWrap, style]}>
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="52%" height={18} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="38%" height={11} pulseAnim={pulse} />
          </View>
        </View>
        <View style={[styles.rowGap8, styles.mb14]}>
          <SkeletonBox width={68} height={32} borderRadius={16} pulseAnim={pulse} />
          <SkeletonBox width={84} height={32} borderRadius={16} pulseAnim={pulse} />
          <SkeletonBox width={92} height={32} borderRadius={16} pulseAnim={pulse} />
        </View>
        {[0, 1, 2, 3, 4].map(i => (
          <SkeletonCard key={i} style={styles.mb10}>
            <View style={styles.rowCenter}>
              <SkeletonCircle size={40} pulseAnim={pulse} />
              <View style={[styles.ml12, styles.flex1]}>
                <SkeletonLine width="76%" height={14} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width="92%" height={11} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width="32%" height={9} pulseAnim={pulse} />
              </View>
            </View>
          </SkeletonCard>
        ))}
      </View>
    );
  }

  // 8. NOTIFICATION PREFERENCES SKELETON
  if (variant === 'notificationPreferences') {
    return (
      <View testID="skeleton-notification-preferences" style={[styles.screenWrap, style]}>
        {[0, 1].map(sectionIdx => (
          <View key={sectionIdx} style={styles.mb16}>
            <SkeletonLine width={110} height={11} style={styles.mb10} pulseAnim={pulse} />
            <SkeletonCard>
              {[0, 1, 2].map(rowIdx => (
                <View
                  key={rowIdx}
                  style={[
                    styles.rowBetween,
                    rowIdx > 0 && styles.mt14,
                  ]}
                >
                  <View style={[styles.rowCenter, styles.flex1]}>
                    <SkeletonCircle size={36} pulseAnim={pulse} />
                    <View style={[styles.ml12, styles.flex1]}>
                      <SkeletonLine width="62%" height={14} style={styles.mb6} pulseAnim={pulse} />
                      <SkeletonLine width="84%" height={10} pulseAnim={pulse} />
                    </View>
                  </View>
                  <SkeletonBox width={46} height={26} borderRadius={13} pulseAnim={pulse} />
                </View>
              ))}
            </SkeletonCard>
          </View>
        ))}
      </View>
    );
  }

  // 9. DEFAULT GENERIC CARDS SKELETON
  return (
    <View testID="skeleton-cards" style={[styles.screenWrap, style]}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} style={styles.mb12}>
          <View style={styles.rowCenter}>
            <SkeletonCircle size={40} pulseAnim={pulse} />
            <View style={[styles.ml12, styles.flex1]}>
              <SkeletonLine width="70%" height={15} style={styles.mb6} pulseAnim={pulse} />
              <SkeletonLine width="45%" height={11} pulseAnim={pulse} />
            </View>
          </View>
          <SkeletonLine width="90%" height={12} style={styles.mt12} pulseAnim={pulse} />
        </SkeletonCard>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowGap8: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowGap10: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBoxPlaceholder: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
  },
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridCard: {
    width: '48%',
    padding: 14,
  },
  flex1: {
    flex: 1,
  },
  ml12: {
    marginLeft: 12,
  },
  mt6: {
    marginTop: 6,
  },
  mt12: {
    marginTop: 12,
  },
  mt14: {
    marginTop: 14,
  },
  mb6: {
    marginBottom: 6,
  },
  mb8: {
    marginBottom: 8,
  },
  mb10: {
    marginBottom: 10,
  },
  mb12: {
    marginBottom: 12,
  },
  mb14: {
    marginBottom: 14,
  },
  mb16: {
    marginBottom: 16,
  },
});

export default SkeletonLoader;
