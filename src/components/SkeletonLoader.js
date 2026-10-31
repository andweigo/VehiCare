import React, { useEffect, useRef, useState } from 'react';
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
 * In-memory session registry of screens that have already completed their initial data fetch
 * during the current app launch. Resets automatically whenever the app relaunches,
 * ensuring skeleton loading only appears on initial fetch and NOT every time the user
 * switches between screens.
 */
const hydratedScreensInSession = new Set();

export const hasScreenHydrated = (screenKey = 'default') =>
  hydratedScreensInSession.has(String(screenKey || 'default'));

export const markScreenHydrated = (screenKey = 'default') => {
  hydratedScreensInSession.add(String(screenKey || 'default'));
};

export const resetHydratedScreensInSession = () => {
  hydratedScreensInSession.clear();
};

/**
 * Reusable screen-level skeleton hook.
 * Shows the screen's custom skeleton ONLY when data is initially being fetched after app launch,
 * and skips the skeleton on subsequent screen switches within the same app session.
 */
export const useScreenSkeleton = (
  externalLoading = false,
  screenKey = 'default',
  durationMs = 340,
) => {
  const isTestEnv =
    typeof process !== 'undefined' &&
    process?.env?.JEST_WORKER_ID !== undefined;

  const key = String(screenKey || 'default');
  const alreadyHydrated = !isTestEnv && hydratedScreensInSession.has(key);

  const [hydrating, setHydrating] = useState(() => !isTestEnv && !alreadyHydrated);

  useEffect(() => {
    if (isTestEnv) {
      setHydrating(false);
      return undefined;
    }

    if (hydratedScreensInSession.has(key)) {
      setHydrating(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setHydrating(false);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [key, durationMs, isTestEnv]);

  useEffect(() => {
    if (!isTestEnv && !externalLoading && !hydrating) {
      hydratedScreensInSession.add(key);
    }
  }, [externalLoading, hydrating, key, isTestEnv]);

  if (alreadyHydrated) {
    return false;
  }

  return Boolean(externalLoading || hydrating);
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

  // 0. DASHBOARD SCREEN SKELETON
  if (variant === 'dashboard') {
    return (
      <View testID="skeleton-dashboard" style={[styles.screenWrap, style]}>
        {/* Greeting + Menu */}
        <View style={styles.headerRow}>
          <View style={styles.flex1}>
            <SkeletonLine width="42%" height={12} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="68%" height={20} pulseAnim={pulse} />
          </View>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
        </View>

        {/* Active Vehicle Garage Bar Card */}
        <SkeletonCard style={styles.mb14}>
          <View style={styles.rowCenter}>
            <SkeletonBox width={46} height={46} borderRadius={14} pulseAnim={pulse} />
            <View style={[styles.flex1, styles.ml12]}>
              <SkeletonLine width="38%" height={10} style={styles.mb6} pulseAnim={pulse} />
              <SkeletonLine width="66%" height={16} pulseAnim={pulse} />
            </View>
            <SkeletonBox width={70} height={30} borderRadius={10} pulseAnim={pulse} />
          </View>
        </SkeletonCard>

        {/* Vehicle Health Speedometer Cluster Card */}
        <SkeletonCard style={[styles.mb14, styles.centerCol]}>
          <SkeletonCircle size={126} style={styles.mb12} pulseAnim={pulse} />
          <SkeletonBox width={118} height={24} borderRadius={12} pulseAnim={pulse} />
        </SkeletonCard>

        {/* Something Wrong? Diagnosis Hero Banner */}
        <SkeletonCard style={styles.mb16}>
          <View style={styles.rowCenter}>
            <SkeletonBox width={42} height={42} borderRadius={12} pulseAnim={pulse} />
            <View style={[styles.flex1, styles.ml12]}>
              <SkeletonLine width="62%" height={16} style={styles.mb6} pulseAnim={pulse} />
              <SkeletonLine width="85%" height={11} pulseAnim={pulse} />
            </View>
          </View>
          <SkeletonBox width="100%" height={42} borderRadius={12} style={styles.mt14} pulseAnim={pulse} />
        </SkeletonCard>

        {/* How can we help? 2x2 Grid */}
        <SkeletonLine width={140} height={15} style={styles.mb12} pulseAnim={pulse} />
        <View style={styles.grid2x2}>
          {[0, 1, 2, 3].map(i => (
            <SkeletonCard key={i} style={styles.gridCard}>
              <SkeletonBox width={38} height={38} borderRadius={12} pulseAnim={pulse} />
              <SkeletonLine width="75%" height={14} style={styles.mt12} pulseAnim={pulse} />
              <SkeletonLine width="55%" height={11} style={styles.mt6} pulseAnim={pulse} />
            </SkeletonCard>
          ))}
        </View>
      </View>
    );
  }

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
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
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

  // 5. REPAIR SHOPS FULL SCREEN SKELETON (includes Header, Location Bar, Assistance Card, Map, Filters & Shop Cards)
  if (variant === 'repairShops') {
    return (
      <View testID="skeleton-repair-shops" style={[styles.screenWrap, style]}>
        {/* Header ("Nearby Repair Shops") */}
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="64%" height={18} pulseAnim={pulse} />
          </View>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
        </View>

        {/* Location Bar Card */}
        <SkeletonCard style={styles.mb12}>
          <View style={styles.rowBetween}>
            <View style={[styles.rowCenter, styles.flex1]}>
              <SkeletonBox width={34} height={34} borderRadius={10} pulseAnim={pulse} />
              <View style={[styles.ml12, styles.flex1]}>
                <SkeletonLine width="42%" height={10} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width="74%" height={14} pulseAnim={pulse} />
              </View>
            </View>
            <SkeletonBox width={72} height={28} borderRadius={10} pulseAnim={pulse} />
          </View>
        </SkeletonCard>

        {/* Dual-Purpose Repair Assistance Context Card */}
        <SkeletonCard style={styles.mb14}>
          <SkeletonBox width={210} height={20} borderRadius={8} style={styles.mb10} pulseAnim={pulse} />
          <SkeletonLine width="94%" height={11} style={styles.mb6} pulseAnim={pulse} />
          <SkeletonLine width="76%" height={11} style={styles.mb12} pulseAnim={pulse} />
          {[0, 1].map(optIdx => (
            <View
              key={optIdx}
              style={[
                styles.rowBetween,
                styles.statBoxPlaceholder,
                { paddingHorizontal: 12, paddingVertical: 12 },
                optIdx > 0 && styles.mt10,
              ]}
            >
              <View style={[styles.rowCenter, styles.flex1]}>
                <SkeletonBox width={32} height={32} borderRadius={10} pulseAnim={pulse} />
                <View style={[styles.ml12, styles.flex1]}>
                  <SkeletonLine width="32%" height={9} style={styles.mb6} pulseAnim={pulse} />
                  <SkeletonLine width="76%" height={14} pulseAnim={pulse} />
                </View>
              </View>
              <SkeletonCircle size={18} pulseAnim={pulse} />
            </View>
          ))}
        </SkeletonCard>

        {/* Map Area Placeholder */}
        <SkeletonBox width="100%" height={148} borderRadius={18} style={styles.mb12} pulseAnim={pulse} />

        {/* Category Filter Chips */}
        <View style={[styles.rowGap8, styles.mb14]}>
          <SkeletonBox width={104} height={34} borderRadius={17} pulseAnim={pulse} />
          <SkeletonBox width={88} height={34} borderRadius={17} pulseAnim={pulse} />
          <SkeletonBox width={94} height={34} borderRadius={17} pulseAnim={pulse} />
        </View>

        {/* Section Header + Shop Cards */}
        <SkeletonLine width="54%" height={16} style={styles.mb6} pulseAnim={pulse} />
        <SkeletonLine width="72%" height={11} style={styles.mb12} pulseAnim={pulse} />
        {[0, 1].map(i => (
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

  // 5b. REPAIR SHOPS INLINE LIST SKELETON
  if (variant === 'repairShopsList') {
    return (
      <View testID="skeleton-repair-shops-list" style={style}>
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

  // 6. VEHICLE HEALTH FULL SCREEN SKELETON
  if (variant === 'vehicleHealth') {
    return (
      <View testID="skeleton-vehicle-health" style={[styles.screenWrap, style]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="38%" height={10} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="58%" height={18} pulseAnim={pulse} />
          </View>
        </View>

        {/* Speedometer Gauge Card */}
        <SkeletonCard style={[styles.mb14, styles.centerCol]}>
          <SkeletonCircle size={132} style={styles.mb12} pulseAnim={pulse} />
          <SkeletonBox width={124} height={24} borderRadius={12} pulseAnim={pulse} />
        </SkeletonCard>

        {/* Active Vehicle Card */}
        <SkeletonCard style={styles.mb14}>
          <View style={styles.rowBetween}>
            <View style={styles.flex1}>
              <SkeletonBox width={104} height={20} borderRadius={10} style={styles.mb8} pulseAnim={pulse} />
              <SkeletonLine width="68%" height={16} style={styles.mb6} pulseAnim={pulse} />
              <SkeletonLine width="46%" height={12} pulseAnim={pulse} />
            </View>
            <SkeletonBox width={48} height={48} borderRadius={14} pulseAnim={pulse} />
          </View>
          <SkeletonBox width="100%" height={38} borderRadius={11} style={styles.mt14} pulseAnim={pulse} />
        </SkeletonCard>

        {/* Health Breakdown / Completed Records */}
        <SkeletonCard style={styles.mb12}>
          <SkeletonLine width="52%" height={15} style={styles.mb12} pulseAnim={pulse} />
          {[0, 1, 2].map(i => (
            <View key={i} style={[styles.rowCenter, i > 0 && styles.mt12]}>
              <SkeletonCircle size={36} pulseAnim={pulse} />
              <View style={[styles.ml12, styles.flex1]}>
                <SkeletonLine width="68%" height={14} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width="42%" height={11} pulseAnim={pulse} />
              </View>
              <SkeletonBox width={64} height={22} borderRadius={8} pulseAnim={pulse} />
            </View>
          ))}
        </SkeletonCard>
      </View>
    );
  }

  // 6b. VEHICLE HEALTH INLINE RECORDS SKELETON
  if (variant === 'vehicleHealthRecords') {
    return (
      <View testID="skeleton-vehicle-health-records" style={style}>
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

  // 8. NOTIFICATION PREFERENCES SKELETON (includes Header + Section Toggle Cards)
  if (variant === 'notificationPreferences') {
    return (
      <View testID="skeleton-notification-preferences" style={[styles.screenWrap, style]}>
        {/* Header ("Notification Preferences" + Subtitle) */}
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="64%" height={18} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="84%" height={11} pulseAnim={pulse} />
          </View>
        </View>

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

  // 9. MANAGE PLAN SCREEN SKELETON
  if (variant === 'managePlan') {
    return (
      <View testID="skeleton-manage-plan" style={[styles.screenWrap, style]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="36%" height={10} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="56%" height={18} pulseAnim={pulse} />
          </View>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
        </View>

        {/* Current Plan Hero Card */}
        <SkeletonCard style={styles.mb14}>
          <View style={styles.rowBetween}>
            <View style={[styles.rowCenter, styles.flex1]}>
              <SkeletonBox width={44} height={44} borderRadius={13} pulseAnim={pulse} />
              <View style={[styles.ml12, styles.flex1]}>
                <SkeletonLine width="42%" height={10} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width="68%" height={16} pulseAnim={pulse} />
              </View>
            </View>
            <SkeletonBox width={64} height={24} borderRadius={12} pulseAnim={pulse} />
          </View>
          <SkeletonLine width="90%" height={11} style={styles.mt12} pulseAnim={pulse} />
          <View style={styles.mt14}>
            <View style={styles.rowBetween}>
              <SkeletonLine width="38%" height={11} pulseAnim={pulse} />
              <SkeletonLine width="18%" height={11} pulseAnim={pulse} />
            </View>
            <SkeletonBox width="100%" height={8} borderRadius={4} style={styles.mt6} pulseAnim={pulse} />
          </View>
        </SkeletonCard>

        {/* What's Included Features Card */}
        <SkeletonCard style={styles.mb14}>
          <View style={[styles.rowBetween, styles.mb12]}>
            <SkeletonLine width="45%" height={15} pulseAnim={pulse} />
            <SkeletonBox width={72} height={22} borderRadius={11} pulseAnim={pulse} />
          </View>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[styles.rowCenter, i > 0 && styles.mt12]}>
              <SkeletonCircle size={26} pulseAnim={pulse} />
              <View style={[styles.ml12, styles.flex1]}>
                <SkeletonLine width="68%" height={13} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width="86%" height={10} pulseAnim={pulse} />
              </View>
            </View>
          ))}
        </SkeletonCard>

        {/* Plan Cycle Cards */}
        <SkeletonLine width="44%" height={15} style={styles.mb10} pulseAnim={pulse} />
        {[0, 1].map(i => (
          <SkeletonCard key={i} style={styles.mb12}>
            <View style={styles.rowBetween}>
              <View style={styles.flex1}>
                <SkeletonLine width="55%" height={16} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width="75%" height={11} pulseAnim={pulse} />
              </View>
              <SkeletonBox width={84} height={28} borderRadius={10} pulseAnim={pulse} />
            </View>
          </SkeletonCard>
        ))}
      </View>
    );
  }

  // 10. ACTIVITY TIMELINE SCREEN SKELETON
  if (variant === 'activity') {
    return (
      <View testID="skeleton-activity" style={[styles.screenWrap, style]}>
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="32%" height={10} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="58%" height={18} pulseAnim={pulse} />
          </View>
          <SkeletonBox width={68} height={26} borderRadius={13} pulseAnim={pulse} />
        </View>

        <SkeletonBox width={76} height={24} borderRadius={12} style={styles.mb12} pulseAnim={pulse} />

        {[0, 1, 2, 3, 4].map(i => (
          <SkeletonCard key={i} style={styles.mb10}>
            <View style={styles.rowCenter}>
              <SkeletonBox width={40} height={40} borderRadius={12} pulseAnim={pulse} />
              <View style={[styles.ml12, styles.flex1]}>
                <View style={[styles.rowBetween, styles.mb6]}>
                  <SkeletonBox width={74} height={18} borderRadius={6} pulseAnim={pulse} />
                  <SkeletonLine width={48} height={10} pulseAnim={pulse} />
                </View>
                <SkeletonLine width="76%" height={14} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width="90%" height={11} pulseAnim={pulse} />
              </View>
            </View>
          </SkeletonCard>
        ))}
      </View>
    );
  }

  // 11. MAINTENANCE CATEGORY SCREEN SKELETON
  if (variant === 'maintenanceCategory') {
    return (
      <View testID="skeleton-maintenance-category" style={[styles.screenWrap, style]}>
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="42%" height={10} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="66%" height={18} pulseAnim={pulse} />
          </View>
        </View>

        {/* Category Hero Card */}
        <SkeletonCard style={styles.mb16}>
          <View style={styles.rowBetween}>
            <SkeletonBox width={52} height={52} borderRadius={16} pulseAnim={pulse} />
            <SkeletonBox width={86} height={26} borderRadius={13} pulseAnim={pulse} />
          </View>
          <SkeletonLine width="68%" height={17} style={styles.mt12} pulseAnim={pulse} />
          <SkeletonLine width="92%" height={12} style={styles.mt6} pulseAnim={pulse} />
          <View style={[styles.rowGap8, styles.mt14]}>
            <SkeletonBox width={78} height={28} borderRadius={10} pulseAnim={pulse} />
            <SkeletonBox width={88} height={28} borderRadius={10} pulseAnim={pulse} />
            <SkeletonBox width={78} height={28} borderRadius={10} pulseAnim={pulse} />
          </View>
        </SkeletonCard>

        {/* Category Tasks */}
        {[0, 1, 2].map(i => (
          <SkeletonCard key={i} style={styles.mb12}>
            <View style={styles.rowBetween}>
              <SkeletonLine width="68%" height={15} pulseAnim={pulse} />
              <SkeletonBox width={66} height={22} borderRadius={8} pulseAnim={pulse} />
            </View>
            <SkeletonLine width="92%" height={11} style={styles.mt12} pulseAnim={pulse} />
            <SkeletonLine width="74%" height={11} style={styles.mt6} pulseAnim={pulse} />
            <View style={[styles.rowGap10, styles.mt14]}>
              <SkeletonBox width="48%" height={36} borderRadius={10} pulseAnim={pulse} />
              <SkeletonBox width="48%" height={36} borderRadius={10} pulseAnim={pulse} />
            </View>
          </SkeletonCard>
        ))}
      </View>
    );
  }

  // 12. MAINTENANCE GUIDE SCREEN SKELETON
  if (variant === 'maintenanceGuide') {
    return (
      <View testID="skeleton-maintenance-guide" style={[styles.screenWrap, style]}>
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonBox width={120} height={18} borderRadius={9} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="78%" height={18} pulseAnim={pulse} />
          </View>
        </View>

        {/* Overview & Progress Card */}
        <SkeletonCard style={styles.mb14}>
          <View style={styles.rowBetween}>
            <SkeletonLine width="46%" height={13} pulseAnim={pulse} />
            <SkeletonLine width="24%" height={13} pulseAnim={pulse} />
          </View>
          <SkeletonBox width="100%" height={8} borderRadius={4} style={styles.mt12} pulseAnim={pulse} />
        </SkeletonCard>

        {/* Active Step Card */}
        <SkeletonCard style={styles.mb14}>
          <View style={styles.rowCenter}>
            <SkeletonCircle size={36} pulseAnim={pulse} />
            <View style={[styles.ml12, styles.flex1]}>
              <SkeletonLine width="35%" height={10} style={styles.mb6} pulseAnim={pulse} />
              <SkeletonLine width="75%" height={16} pulseAnim={pulse} />
            </View>
          </View>
          <SkeletonLine width="96%" height={12} style={styles.mt14} pulseAnim={pulse} />
          <SkeletonLine width="88%" height={12} style={styles.mt6} pulseAnim={pulse} />
          <SkeletonLine width="72%" height={12} style={styles.mt6} pulseAnim={pulse} />
          <SkeletonBox width="100%" height={54} borderRadius={12} style={styles.mt14} pulseAnim={pulse} />
          <SkeletonBox width="100%" height={42} borderRadius={12} style={styles.mt12} pulseAnim={pulse} />
          <View style={[styles.rowGap10, styles.mt12]}>
            <SkeletonBox width="48%" height={40} borderRadius={12} pulseAnim={pulse} />
            <SkeletonBox width="48%" height={40} borderRadius={12} pulseAnim={pulse} />
          </View>
        </SkeletonCard>

        {/* Collapsed Step Clarification Bar */}
        <SkeletonCard>
          <View style={styles.rowBetween}>
            <View style={[styles.rowCenter, styles.flex1]}>
              <SkeletonCircle size={36} pulseAnim={pulse} />
              <View style={[styles.ml12, styles.flex1]}>
                <SkeletonLine width="62%" height={14} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width="80%" height={10} pulseAnim={pulse} />
              </View>
            </View>
            <SkeletonCircle size={28} pulseAnim={pulse} />
          </View>
        </SkeletonCard>
      </View>
    );
  }

  // 13. PROFILE SCREEN SKELETON
  if (variant === 'profile') {
    return (
      <View testID="skeleton-profile" style={[styles.screenWrap, style]}>
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="36%" height={10} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="48%" height={18} pulseAnim={pulse} />
          </View>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
        </View>

        {/* User Hero Card */}
        <SkeletonCard style={styles.mb14}>
          <View style={styles.rowCenter}>
            <SkeletonCircle size={60} pulseAnim={pulse} />
            <View style={[styles.ml12, styles.flex1]}>
              <SkeletonLine width="64%" height={17} style={styles.mb6} pulseAnim={pulse} />
              <SkeletonLine width="78%" height={12} pulseAnim={pulse} />
            </View>
            <SkeletonCircle size={34} pulseAnim={pulse} />
          </View>
          <View style={[styles.statsRow, styles.mt14]}>
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.statBoxPlaceholder}>
                <SkeletonLine width={36} height={16} style={styles.mb6} pulseAnim={pulse} />
                <SkeletonLine width="65%" height={10} pulseAnim={pulse} />
              </View>
            ))}
          </View>
        </SkeletonCard>

        {/* Plan Card */}
        <SkeletonCard style={styles.mb14}>
          <View style={styles.rowBetween}>
            <SkeletonLine width="48%" height={16} pulseAnim={pulse} />
            <SkeletonBox width={60} height={22} borderRadius={11} pulseAnim={pulse} />
          </View>
          <View style={[styles.rowBetween, styles.mt12]}>
            <SkeletonLine width="40%" height={12} pulseAnim={pulse} />
            <SkeletonLine width="32%" height={12} pulseAnim={pulse} />
          </View>
        </SkeletonCard>

        {/* Settings Group Rows */}
        <SkeletonCard>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[styles.rowBetween, i > 0 && styles.mt14]}>
              <View style={[styles.rowCenter, styles.flex1]}>
                <SkeletonBox width={38} height={38} borderRadius={11} pulseAnim={pulse} />
                <View style={[styles.ml12, styles.flex1]}>
                  <SkeletonLine width="58%" height={14} style={styles.mb6} pulseAnim={pulse} />
                  <SkeletonLine width="76%" height={10} pulseAnim={pulse} />
                </View>
              </View>
              <SkeletonBox width={20} height={20} borderRadius={6} pulseAnim={pulse} />
            </View>
          ))}
        </SkeletonCard>
      </View>
    );
  }

  // 14. PERSONAL INFORMATION / FORM SCREEN SKELETON
  if (variant === 'personalInfo' || variant === 'form') {
    return (
      <View testID="skeleton-personal-info" style={[styles.screenWrap, style]}>
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="34%" height={10} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="64%" height={18} pulseAnim={pulse} />
          </View>
        </View>

        {/* Avatar Identity Card */}
        <SkeletonCard style={styles.mb14}>
          <View style={styles.rowCenter}>
            <SkeletonCircle size={68} pulseAnim={pulse} />
            <View style={[styles.ml12, styles.flex1]}>
              <SkeletonLine width="62%" height={16} style={styles.mb6} pulseAnim={pulse} />
              <SkeletonLine width="80%" height={12} style={styles.mb8} pulseAnim={pulse} />
              <SkeletonBox width={84} height={22} borderRadius={11} pulseAnim={pulse} />
            </View>
          </View>
        </SkeletonCard>

        {/* Input Form Fields Card */}
        <SkeletonCard style={styles.mb14}>
          {[0, 1, 2].map(i => (
            <View key={i} style={i > 0 ? styles.mt14 : undefined}>
              <SkeletonLine width="38%" height={11} style={styles.mb8} pulseAnim={pulse} />
              <SkeletonBox width="100%" height={46} borderRadius={12} pulseAnim={pulse} />
            </View>
          ))}
        </SkeletonCard>

        <SkeletonBox width="100%" height={48} borderRadius={14} pulseAnim={pulse} />
      </View>
    );
  }

  // 15. VEHICLE CORRECTION REQUEST SCREEN SKELETON
  if (variant === 'vehicleCorrection') {
    return (
      <View testID="skeleton-vehicle-correction" style={[styles.screenWrap, style]}>
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="42%" height={10} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="68%" height={18} pulseAnim={pulse} />
          </View>
        </View>

        {/* Protected Profile Banner */}
        <SkeletonCard style={styles.mb14}>
          <View style={styles.rowCenter}>
            <SkeletonBox width={40} height={40} borderRadius={12} pulseAnim={pulse} />
            <View style={[styles.ml12, styles.flex1]}>
              <SkeletonLine width="52%" height={14} style={styles.mb6} pulseAnim={pulse} />
              <SkeletonLine width="90%" height={11} pulseAnim={pulse} />
            </View>
          </View>
        </SkeletonCard>

        {/* Selectable Vehicle Detail Fields */}
        {[0, 1, 2, 3].map(i => (
          <SkeletonCard key={i} style={styles.mb10}>
            <View style={styles.rowBetween}>
              <View style={[styles.rowCenter, styles.flex1]}>
                <SkeletonBox width={36} height={36} borderRadius={10} pulseAnim={pulse} />
                <View style={[styles.ml12, styles.flex1]}>
                  <SkeletonLine width="44%" height={11} style={styles.mb6} pulseAnim={pulse} />
                  <SkeletonLine width="68%" height={14} pulseAnim={pulse} />
                </View>
              </View>
              <SkeletonCircle size={22} pulseAnim={pulse} />
            </View>
          </SkeletonCard>
        ))}
      </View>
    );
  }

  // 16. SETTINGS / HELP SUPPORT SCREEN SKELETON
  if (variant === 'settings' || variant === 'helpSupport') {
    return (
      <View testID={`skeleton-${variant}`} style={[styles.screenWrap, style]}>
        <View style={styles.headerRow}>
          <SkeletonBox width={42} height={42} borderRadius={13} pulseAnim={pulse} />
          <View style={styles.flex1}>
            <SkeletonLine width="45%" height={10} style={styles.mb6} pulseAnim={pulse} />
            <SkeletonLine width="55%" height={18} pulseAnim={pulse} />
          </View>
        </View>

        {variant === 'helpSupport' && (
          <>
            <SkeletonBox width="100%" height={46} borderRadius={14} style={styles.mb14} pulseAnim={pulse} />
            <View style={[styles.grid2x2, styles.mb16]}>
              {[0, 1, 2, 3].map(i => (
                <SkeletonCard key={i} style={styles.gridCard}>
                  <SkeletonBox width={36} height={36} borderRadius={10} pulseAnim={pulse} />
                  <SkeletonLine width="75%" height={14} style={styles.mt12} pulseAnim={pulse} />
                  <SkeletonLine width="90%" height={10} style={styles.mt6} pulseAnim={pulse} />
                </SkeletonCard>
              ))}
            </View>
          </>
        )}

        {[0, 1].map(sectionIdx => (
          <View key={sectionIdx} style={styles.mb16}>
            <SkeletonLine width={110} height={11} style={styles.mb10} pulseAnim={pulse} />
            <SkeletonCard>
              {[0, 1, 2].map(rowIdx => (
                <View key={rowIdx} style={[styles.rowBetween, rowIdx > 0 && styles.mt14]}>
                  <View style={[styles.rowCenter, styles.flex1]}>
                    <SkeletonBox width={38} height={38} borderRadius={11} pulseAnim={pulse} />
                    <View style={[styles.ml12, styles.flex1]}>
                      <SkeletonLine width="60%" height={14} style={styles.mb6} pulseAnim={pulse} />
                      <SkeletonLine width="82%" height={10} pulseAnim={pulse} />
                    </View>
                  </View>
                  <SkeletonBox width={20} height={20} borderRadius={6} pulseAnim={pulse} />
                </View>
              ))}
            </SkeletonCard>
          </View>
        ))}
      </View>
    );
  }

  // 17. DEFAULT GENERIC CARDS SKELETON
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
  centerCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
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
  mt10: {
    marginTop: 10,
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
