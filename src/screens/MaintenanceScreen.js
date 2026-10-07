import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useSidebar } from '../context/SidebarContext';
import useMaintenanceRecommendations from '../hooks/useMaintenanceRecommendations';
import { useTheme } from '../theme/ThemeContext';
import { getVehicleIconName } from '../utils/maintenanceUtils';
import {
  getVehicleDisplayDetails,
  getVehicleDisplayName,
} from '../utils/vehicleDisplay';

const DEFAULT_HEALTH_STATUS = {
  label: 'Looking Good',
  code: 'HEALTHY',
  color: '#32D583',
  icon: 'check-circle',
  explanation:
    'No recent diagnostic issues found. VehiCare will continue to provide preventive maintenance recommendations based on your vehicle.',
};

/**
 * Category-specific icon fill mapping for Light & Dark mode polish
 */
const getCategoryIconStyle = (categoryName = '', isDiagnostic = false, isDark = false) => {
  const norm = String(categoryName).toLowerCase();

  if (isDiagnostic || norm.includes('diag') || norm.includes('brake') || norm.includes('engine')) {
    return {
      icon: norm.includes('brake') ? 'directions-car' : (norm.includes('engine') ? 'settings' : 'medical-services'),
      color: isDark ? '#F63B05' : '#C2410C',
      bg: isDark ? '#27160F' : '#FEE4DA',
    };
  }

  if (norm.includes('battery') || norm.includes('electr')) {
    return {
      icon: 'bolt',
      color: isDark ? '#F59E0B' : '#B45309',
      bg: isDark ? '#29220F' : '#FEF3C7',
    };
  }

  if (norm.includes('oil') || norm.includes('fluid')) {
    return {
      icon: 'local-gas-station',
      color: isDark ? '#38BDF8' : '#0284C7',
      bg: isDark ? '#122438' : '#E0F2FE',
    };
  }

  if (norm.includes('tire') || norm.includes('wheel')) {
    return {
      icon: 'tire-repair',
      color: isDark ? '#A855F7' : '#6D28D9',
      bg: isDark ? '#21172A' : '#F3E8FF',
    };
  }

  return {
    icon: 'build',
    color: isDark ? '#32D583' : '#15803D',
    bg: isDark ? '#13241A' : '#DCFCE7',
  };
};

const MaintenanceScreen = ({ navigation }) => {
  const { theme, themeName } = useTheme();
  const isDark = themeName === 'dark';
  const { openSidebar } = useSidebar();

  const {
    vehicleProfile,
    groupedCategories,
    diagnostics,
    diagnosticItems,
    historyItems,
    dueSoonCount,
    overdueCount,
    completedCount,
    healthStatus,
    maintenanceHealth,
    loading,
  } = useMaintenanceRecommendations();

  // Safeguards
  const safeCategories = Array.isArray(groupedCategories) ? groupedCategories : [];
  const safeDiagnostics = Array.isArray(diagnostics) ? diagnostics : [];
  const safeDiagnosticItems = Array.isArray(diagnosticItems) ? diagnosticItems : [];
  const safeHistoryItems = Array.isArray(historyItems) ? historyItems : [];
  const safeHealthStatus = healthStatus || DEFAULT_HEALTH_STATUS;

  const recentActivity = safeHistoryItems.slice(0, 3);
  const hasDiagnosticItems = safeDiagnosticItems.length > 0;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading maintenance status...
        </Text>
      </SafeAreaView>
    );
  }

  if (!vehicleProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            activeOpacity={0.75}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>VEHICARE</Text>
            <Text style={[styles.title, { color: theme.text }]}>Maintenance</Text>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: isDark ? '#27160F' : '#FEE4DA' }]}>
            <Icon name="directions-car" size={32} color={isDark ? '#F63B05' : '#C2410C'} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No vehicle selected</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Add a vehicle to view personalized maintenance recommendations and health tracking.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: '#F63B05' }]}
            onPress={() => navigation.navigate('Vehicles')}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const scoreColor = safeHealthStatus.color || '#32D583';
  const scorePercent = Math.min(100, Math.max(0, maintenanceHealth || 100));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* =========================================================
              1. HEADER BAR
          ========================================================= */}
          <View style={styles.header}>
            <View style={styles.headerLeftGroup}>
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                activeOpacity={0.75}
                onPress={() => navigation.goBack()}
              >
                <Icon name="arrow-back" size={22} color={theme.text} />
              </TouchableOpacity>

              <View>
                <Text style={[styles.eyebrow, { color: theme.accent }]}>VEHICARE</Text>
                <Text style={[styles.title, { color: theme.text }]}>Maintenance</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.menuButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              activeOpacity={0.75}
              onPress={openSidebar}
              accessibilityLabel="Open Sidebar Menu"
            >
              <Icon name="menu" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* =========================================================
              2. HERO VEHICLE HEALTH DASHBOARD BANNER
          ========================================================= */}
          <View
            style={[
              styles.heroBanner,
              {
                backgroundColor: theme.surface || '#151515',
                borderColor: theme.border || '#292929',
              },
            ]}
          >
            {/* Top Row: Vehicle Switcher */}
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.heroVehicleHeader}
              onPress={() => navigation.navigate('Vehicles')}
            >
              <View style={[styles.heroVehicleIconBox, { backgroundColor: isDark ? '#27160F' : '#FEE4DA' }]}>
                <Icon
                  name={getVehicleIconName(vehicleProfile?.vehicle_type ?? vehicleProfile?.vehicleType)}
                  size={24}
                  color={isDark ? '#F63B05' : '#C2410C'}
                />
              </View>

              <View style={styles.heroVehicleTextWrap}>
                <View style={styles.activeVehicleTagRow}>
                  <Text style={[styles.activeTagText, { color: theme.accent }]}>ACTIVE VEHICLE</Text>
                </View>
                <Text style={[styles.heroVehicleName, { color: theme.text }]} numberOfLines={1}>
                  {getVehicleDisplayName(vehicleProfile, 'Your Vehicle')}
                </Text>
                <Text style={[styles.heroVehicleDetails, { color: theme.textSecondary }]} numberOfLines={1}>
                  {getVehicleDisplayDetails(vehicleProfile, 'Vehicle Profile')}
                </Text>
              </View>

              <View style={[styles.changeVehiclePill, { backgroundColor: isDark ? (theme.surfaceAlt || '#1C1C1C') : '#F3F4F6' }]}>
                <Text style={[styles.changeVehicleText, { color: theme.textSecondary }]}>Change</Text>
                <Icon name="chevron-right" size={14} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>

            <View style={[styles.heroDivider, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB' }]} />

            {/* Bottom Row: Vehicle Health Score Gauge */}
            <View style={styles.healthGaugeRow}>
              <View style={styles.healthScoreBlock}>
                <Text style={[styles.healthScoreBig, { color: theme.text }]}>
                  {scorePercent}
                  <Text style={[styles.healthPercentSymbol, { color: scoreColor }]}>%</Text>
                </Text>
              </View>

              <View style={styles.healthStatusWrap}>
                <View style={styles.statusBadgeRow}>
                  <View style={[styles.statusBadgePill, { backgroundColor: `${scoreColor}1B` }]}>
                    <Icon name={safeHealthStatus.icon || 'check-circle'} size={13} color={scoreColor} />
                    <Text style={[styles.statusBadgePillText, { color: scoreColor }]}>
                      {(safeHealthStatus.label || 'LOOKING GOOD').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.healthExplanation, { color: theme.textSecondary }]} numberOfLines={2}>
                  {safeHealthStatus.explanation}
                </Text>
              </View>
            </View>

            {/* Health Progress Line */}
            <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB' }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.max(6, scorePercent))}%`,
                    backgroundColor: scoreColor,
                  },
                ]}
              />
            </View>
          </View>

          {/* =========================================================
              3. METRICS OVERVIEW (STATISTICS CARDS)
          ========================================================= */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.statNumberText, { color: '#D6A23A' }]}>{dueSoonCount || 0}</Text>
              <Text style={[styles.statLabelText, { color: theme.textSecondary }]}>Due Soon</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.statNumberText, { color: (overdueCount || 0) > 0 ? '#FF5A5F' : theme.textSecondary }]}>
                {overdueCount || 0}
              </Text>
              <Text style={[styles.statLabelText, { color: theme.textSecondary }]}>Overdue</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.statNumberText, { color: isDark ? '#32D583' : '#15803D' }]}>{completedCount || 0}</Text>
              <Text style={[styles.statLabelText, { color: theme.textSecondary }]}>Completed</Text>
            </View>
          </View>

          {/* =========================================================
              4. SMART AI MAINTENANCE ASSISTANT BANNER
          ========================================================= */}
          <TouchableOpacity
            style={[
              styles.aiAssistantCard,
              {
                backgroundColor: isDark ? 'rgba(246, 59, 5, 0.12)' : '#FFF4F0',
                borderColor: isDark ? 'rgba(246, 59, 5, 0.4)' : '#FEE4DA',
              },
            ]}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('AskVehiCare')}
          >
            <View style={styles.aiHeaderRow}>
              <View style={[styles.aiIconBadge, { backgroundColor: isDark ? '#27160F' : '#FEE4DA' }]}>
                <Icon name="auto-awesome" size={20} color={isDark ? '#F63B05' : '#C2410C'} />
              </View>

              <View style={styles.aiTitleWrap}>
                <Text style={[styles.aiTag, { color: isDark ? '#F63B05' : '#C2410C' }]}>
                  SMART AI ASSISTANT
                </Text>
                <Text style={[styles.aiTitle, { color: theme.text }]}>
                  {hasDiagnosticItems
                    ? 'Diagnostic issues detected'
                    : 'Not sure what your vehicle needs?'}
                </Text>
              </View>
            </View>

            <Text style={[styles.aiDesc, { color: theme.textSecondary }]}>
              {hasDiagnosticItems
                ? `Get tailored step-by-step guidance for ${
                    safeDiagnosticItems[0]?.relatedProblem ||
                    safeDiagnosticItems[0]?.title ||
                    'your active vehicle'
                  }.`
                : 'Ask VehiCare AI for personalized maintenance recommendations based on your vehicle model and history.'}
            </Text>

            <View style={styles.aiBtnRow}>
              <Text style={[styles.aiBtnText, { color: isDark ? '#F63B05' : '#C2410C' }]}>
                Ask VehiCare AI
              </Text>
              <Icon name="arrow-forward" size={14} color={isDark ? '#F63B05' : '#C2410C'} />
            </View>
          </TouchableOpacity>

          {/* =========================================================
              5. MAINTENANCE CATEGORIES GRID
          ========================================================= */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitleHeader, { color: theme.text }]}>MAINTENANCE CATEGORIES</Text>
            <Text style={[styles.sectionSubtitleHeader, { color: theme.textSecondary }]}>
              {safeCategories.length} categories
            </Text>
          </View>

          <View style={styles.categoryGrid}>
            {safeCategories.map(cat => {
              const iconStyle = getCategoryIconStyle(cat.name, cat.isDiagnostic, isDark);
              const itemCountText = cat.isDiagnostic
                ? `${cat.diagnosticCount || cat.todoCount || 1} diagnostic issue${(cat.diagnosticCount || cat.todoCount) !== 1 ? 's' : ''}`
                : `${cat.todoCount || 0} recommended`;

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: theme.surface || '#151515',
                      borderColor: cat.isDiagnostic ? iconStyle.color : (theme.border || '#292929'),
                    },
                  ]}
                  activeOpacity={0.84}
                  onPress={() =>
                    navigation.navigate('MaintenanceCategory', {
                      categoryId: cat.id,
                      categoryName: cat.name,
                      categoryIcon: cat.icon,
                      vehicleId: vehicleProfile?.id || vehicleProfile?.vehicle_id,
                    })
                  }
                >
                  <View style={styles.categoryCardHeader}>
                    <View style={[styles.categoryIconBox, { backgroundColor: iconStyle.bg }]}>
                      <Icon
                        name={iconStyle.icon}
                        size={19}
                        color={iconStyle.color}
                      />
                    </View>
                    <Icon name="chevron-right" size={18} color={theme.textSecondary} />
                  </View>

                  <Text style={[styles.categoryCardTitle, { color: theme.text }]} numberOfLines={1}>
                    {cat.name}
                  </Text>

                  <Text style={[styles.categoryItemCount, { color: theme.textSecondary }]}>
                    {itemCountText}
                  </Text>

                  <View style={styles.categoryCardFooter}>
                    <View style={[styles.categoryStatusBadge, { backgroundColor: `${cat.statusColor || iconStyle.color}15` }]}>
                      <Text style={[styles.categoryStatusBadgeText, { color: cat.statusColor || iconStyle.color }]}>
                        {cat.statusBadge || 'UP TO DATE'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* SUBTLE INFO CARD IF VEHICLE HAS NO DIAGNOSTIC HISTORY */}
          {safeDiagnostics.length === 0 && (
            <View style={[styles.noDiagsNoticeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Icon name="info-outline" size={18} color={theme.accent} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.noDiagsNoticeTitle, { color: theme.text }]}>
                  No recent diagnostic issues found
                </Text>
                <Text style={[styles.noDiagsNoticeSub, { color: theme.textSecondary }]}>
                  VehiCare provides preventive maintenance recommendations based on your vehicle specifications.
                </Text>
              </View>
            </View>
          )}

          {/* =========================================================
              6. RECENT ACTIVITY
          ========================================================= */}
          <View style={styles.sectionHeaderBetween}>
            <Text style={[styles.sectionTitleHeader, { color: theme.text }]}>RECENT ACTIVITY</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('History')}
            >
              <Text style={[styles.seeAllText, { color: theme.accent }]}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentActivity.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Icon name="history" size={24} color={theme.textSecondary} />
              <Text style={[styles.emptyCardTitle, { color: theme.text }]}>No Recent Activity</Text>
              <Text style={[styles.emptyCardSub, { color: theme.textSecondary }]}>
                Completed maintenance records will appear here as you log them.
              </Text>
            </View>
          ) : (
            recentActivity.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.recentItemCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                activeOpacity={0.84}
                onPress={() => navigation.navigate('History')}
              >
                <View style={styles.recentItemLeft}>
                  <View style={[styles.recentCheckIcon, { backgroundColor: isDark ? '#13241A' : '#DCFCE7' }]}>
                    <Icon name="check" size={15} color={isDark ? '#32D583' : '#15803D'} />
                  </View>
                  <View style={styles.recentItemTextContainer}>
                    <Text style={[styles.recentItemTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.recentItemDate, { color: theme.textSecondary }]}>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Recently completed'}
                    </Text>
                  </View>
                </View>

                {item.cost ? (
                  <Text style={[styles.recentItemCost, { color: theme.text }]}>₱{item.cost}</Text>
                ) : (
                  <Icon name="chevron-right" size={18} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            ))
          )}

          {/* =========================================================
              7. QUICK ACTIONS
          ========================================================= */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitleHeader, { color: theme.text }]}>QUICK ACTIONS</Text>
          </View>

          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickActionPill, { backgroundColor: theme.surface, borderColor: theme.border }]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('AskVehiCare')}
            >
              <Icon name="add-circle-outline" size={18} color={theme.accent} />
              <Text style={[styles.quickActionPillText, { color: theme.text }]}>Log Maintenance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionPill, { backgroundColor: theme.surface, borderColor: theme.border }]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('NotificationPreferences')}
            >
              <Icon name="notifications-none" size={18} color={theme.accent} />
              <Text style={[styles.quickActionPillText, { color: theme.text }]}>Reminders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickActionPill, { backgroundColor: theme.surface, borderColor: theme.border }]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('RepairShops')}
            >
              <Icon name="place" size={18} color={theme.accent} />
              <Text style={[styles.quickActionPillText, { color: theme.text }]}>Repair Shops</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  title: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 26,
    letterSpacing: -0.5,
  },

  /* EMPTY VEHICLE STATE */
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  /* HERO BANNER */
  heroBanner: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
  },
  heroVehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroVehicleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroVehicleTextWrap: {
    flex: 1,
  },
  activeVehicleTagRow: {
    marginBottom: 2,
  },
  activeTagText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  heroVehicleName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  heroVehicleDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 1,
  },
  changeVehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeVehicleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },
  heroDivider: {
    height: 1,
    marginVertical: 14,
  },
  healthGaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  healthScoreBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthScoreBig: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
  },
  healthPercentSymbol: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
  },
  healthStatusWrap: {
    flex: 1,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgePillText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  healthExplanation: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* STATS OVERVIEW ROW */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statNumberText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
  },
  statLabelText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    marginTop: 2,
  },

  /* AI ASSISTANT CARD */
  aiAssistantCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  aiIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTitleWrap: {
    flex: 1,
  },
  aiTag: {
    fontFamily: 'Inter-Bold',
    fontSize: 8,
    letterSpacing: 0.8,
  },
  aiTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    marginTop: 1,
  },
  aiDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  aiBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
  },

  /* SECTION HEADERS */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 12,
  },
  sectionTitleHeader: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    letterSpacing: 0.6,
  },
  sectionSubtitleHeader: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  seeAllText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
  },

  /* CATEGORIES GRID */
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  categoryCard: {
    width: '48.5%',
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    marginBottom: 2,
  },
  categoryItemCount: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginBottom: 10,
  },
  categoryCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryStatusBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8,
    letterSpacing: 0.5,
  },

  /* NOTICE CARD */
  noDiagsNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  noDiagsNoticeTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    marginBottom: 2,
  },
  noDiagsNoticeSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
  },

  /* RECENT ACTIVITY ITEMS */
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyCardTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    marginTop: 6,
  },
  emptyCardSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  recentItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  recentCheckIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentItemTextContainer: {
    flex: 1,
  },
  recentItemTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
  },
  recentItemDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    marginTop: 1,
  },
  recentItemCost: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
  },

  /* QUICK ACTIONS */
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickActionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickActionPillText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
  },
});

export default MaintenanceScreen;
