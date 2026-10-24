import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import vehicleApi from '../api/vehicleApi';
import MaintenanceRecordModal from '../components/MaintenanceRecordModal';

import { useSidebar } from '../context/SidebarContext';
import useMaintenanceRecommendations from '../hooks/useMaintenanceRecommendations';
import { useTheme } from '../theme/ThemeContext';
import { getVehicleIconName } from '../utils/maintenanceUtils';
import {
  getVehicleDisplayDetails,
  getVehicleDisplayName,
} from '../utils/vehicleDisplay';

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
    maintenanceRecords,
    activeVehicleId,
    loading,
  } = useMaintenanceRecommendations();

  // Safeguards
  const safeCategories = Array.isArray(groupedCategories) ? groupedCategories : [];
  const safeDiagnostics = Array.isArray(diagnostics) ? diagnostics : [];
  const safeDiagnosticItems = Array.isArray(diagnosticItems) ? diagnosticItems : [];
  const safeHistoryItems = Array.isArray(historyItems) ? historyItems : [];
  const safeMaintenanceRecords = Array.isArray(maintenanceRecords) ? maintenanceRecords : [];
  const now = Date.now();
  const soonLimit = now + (30 * 24 * 60 * 60 * 1000);
  const scheduledRecords = safeMaintenanceRecords.filter(record => ['pending', 'in_progress'].includes(record.status));
  const overdueRecords = scheduledRecords.filter(record => record.due_date && new Date(record.due_date).getTime() < now);
  const dueSoonRecords = scheduledRecords.filter(record => {
    if (!record.due_date) return false;
    const due = new Date(record.due_date).getTime();
    return due >= now && due <= soonLimit;
  });
  const completedRecords = safeMaintenanceRecords.filter(record => record.status === 'completed');

  const [recordModal, setRecordModal] = useState({ visible: false, record: null, status: 'pending' });

  const openRecordForm = (status = 'pending', record = null) => setRecordModal({ visible: true, record, status });
  const closeRecordForm = () => setRecordModal({ visible: false, record: null, status: 'pending' });
  const notifyRecordsChanged = () => DeviceEventEmitter.emit('vehicleHealthChanged');

  const completeScheduledRecord = async record => {
    try {
      await vehicleApi.updateMaintenanceRecord(record.id, {
        status: 'completed',
        performed_at: new Date().toISOString(),
      });
      notifyRecordsChanged();
    } catch (error) {
      Alert.alert('Could not update maintenance', 'This task was not marked complete. Check your connection and try again.');
    }
  };

  const deleteMaintenanceRecord = record => {
    Alert.alert('Delete maintenance record?', 'This record will be removed from this vehicle’s maintenance history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await vehicleApi.deleteMaintenanceRecord(record.id);
            notifyRecordsChanged();
          } catch (error) {
            Alert.alert('Could not delete record', 'The maintenance record could not be deleted. Please try again.');
          }
        },
      },
    ]);
  };

  const CAT_PAGE_SIZE = 15;
  const [categoryPage, setCategoryPage] = useState(1);
  const totalCatPages = Math.max(1, Math.ceil(safeCategories.length / CAT_PAGE_SIZE));
  const paginatedCategories = safeCategories.slice((categoryPage - 1) * CAT_PAGE_SIZE, categoryPage * CAT_PAGE_SIZE);

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

  const hasMaintenanceRecords = safeMaintenanceRecords.length > 0;

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
                  name={getVehicleIconName(vehicleProfile)}
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

            <View style={styles.recordSummaryRow}>
              <View style={[styles.summaryIconBox, { backgroundColor: isDark ? '#27160F' : '#FEE4DA' }]}>
                <Icon name="build-circle" size={20} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryTitle, { color: theme.text }]}>Maintenance log</Text>
                <Text style={[styles.summaryDescription, { color: theme.textSecondary }]}>
                  {hasMaintenanceRecords
                    ? `${safeMaintenanceRecords.length} record${safeMaintenanceRecords.length === 1 ? '' : 's'} saved for this vehicle`
                    : 'No service history has been logged for this vehicle yet.'}
                </Text>
              </View>
            </View>
          </View>

          {/* =========================================================
              3. METRICS OVERVIEW (STATISTICS CARDS)
          ========================================================= */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.statNumberText, { color: '#D6A23A' }]}>{dueSoonRecords.length}</Text>
              <Text style={[styles.statLabelText, { color: theme.textSecondary }]}>Due Soon</Text>
              <Text style={[styles.statSubText, { color: theme.textSecondary }]}>Scheduled records</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.statNumberText, { color: overdueRecords.length > 0 ? '#FF5A5F' : theme.textSecondary }]}>
                {overdueRecords.length}
              </Text>
              <Text style={[styles.statLabelText, { color: theme.textSecondary }]}>Overdue</Text>
              <Text style={[styles.statSubText, { color: overdueRecords.length > 0 ? '#FF5A5F' : theme.textSecondary }]}>
                {overdueRecords.length > 0 ? 'Past due date' : 'No overdue records'}
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.statNumberText, { color: isDark ? '#32D583' : '#15803D' }]}>{completedRecords.length}</Text>
              <Text style={[styles.statLabelText, { color: theme.textSecondary }]}>Completed</Text>
              <Text style={[styles.statSubText, { color: theme.textSecondary }]}>Logged</Text>
            </View>
          </View>

          {/* =========================================================
              BEGINNER-FRIENDLY GUIDE & STATUS EXPLAINER
          ========================================================= */}
          <View
            style={[
              styles.beginnerGuideCard,
              {
                backgroundColor: theme.surface || '#151515',
                borderColor: theme.border || '#292929',
              },
            ]}
          >
            <View style={styles.beginnerGuideHeader}>
              <View style={[styles.beginnerGuideIconBox, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}>
                <Icon name="school" size={17} color={isDark ? '#60A5FA' : '#2563EB'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.beginnerGuideTitle, { color: theme.text }]}>
                  Beginner's Maintenance Overview
                </Text>
                <Text style={[styles.beginnerGuideSubtitle, { color: theme.textSecondary }]}>
                  How to manage your vehicle in 3 easy steps
                </Text>
              </View>
            </View>

            <View style={styles.beginnerGuideList}>
              <View style={styles.beginnerGuideItem}>
                <View style={[styles.guideStepNumber, { backgroundColor: isDark ? 'rgba(255, 90, 95, 0.16)' : '#FEE2E2' }]}>
                  <Text style={[styles.guideStepText, { color: '#FF5A5F' }]}>1</Text>
                </View>
                <View style={styles.guideStepContent}>
                  <Text style={[styles.guideStepTitle, { color: theme.text }]}>
                    Prioritize Overdue Items
                  </Text>
                  <Text style={[styles.guideStepDesc, { color: theme.textSecondary }]}>
                    These are critical diagnostic issues that need prompt attention to avoid vehicle damage.
                  </Text>
                </View>
              </View>

              <View style={styles.beginnerGuideItem}>
                <View style={[styles.guideStepNumber, { backgroundColor: isDark ? 'rgba(214, 162, 58, 0.16)' : '#FEF3C7' }]}>
                  <Text style={[styles.guideStepText, { color: '#D6A23A' }]}>2</Text>
                </View>
                <View style={styles.guideStepContent}>
                  <Text style={[styles.guideStepTitle, { color: theme.text }]}>
                    Keep Up with Routine Tasks
                  </Text>
                  <Text style={[styles.guideStepDesc, { color: theme.textSecondary }]}>
                    Items in "Due Soon" (like oil, tire pressure, and chain lubrication) prevent costly repairs.
                  </Text>
                </View>
              </View>

              <View style={styles.beginnerGuideItem}>
                <View style={[styles.guideStepNumber, { backgroundColor: isDark ? 'rgba(50, 213, 131, 0.16)' : '#DCFCE7' }]}>
                  <Text style={[styles.guideStepText, { color: '#32D583' }]}>3</Text>
                </View>
                <View style={styles.guideStepContent}>
                  <Text style={[styles.guideStepTitle, { color: theme.text }]}>
                    Follow Step-by-Step Categories
                  </Text>
                  <Text style={[styles.guideStepDesc, { color: theme.textSecondary }]}>
                    Tap any category below to view DIY guides, checklists, or nearby repair shop recommendations.
                  </Text>
                </View>
              </View>
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

            <Text style={[styles.aiDesc, { color: theme.textSecondary }]} numberOfLines={3}>
              {hasDiagnosticItems
                ? `Get step-by-step guidance for ${
                    safeDiagnosticItems[0]?.title ||
                    safeDiagnosticItems[0]?.relatedProblem ||
                    'your active vehicle'
                  }. Ask VehiCare AI for DIY instructions or when to visit a shop.`
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
            {paginatedCategories.map(cat => {
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

          {safeCategories.length > CAT_PAGE_SIZE && (
            <View style={styles.paginationContainer}>
              <Text style={[styles.paginationSummary, { color: theme.textSecondary }]}>
                Showing {((categoryPage - 1) * CAT_PAGE_SIZE) + 1}–{Math.min(categoryPage * CAT_PAGE_SIZE, safeCategories.length)} of {safeCategories.length} categories
              </Text>
              <View style={styles.paginationControls}>
                <TouchableOpacity
                  style={[
                    styles.pageNavButton,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: categoryPage === 1 ? 0.4 : 1,
                    },
                  ]}
                  disabled={categoryPage === 1}
                  onPress={() => setCategoryPage(p => Math.max(1, p - 1))}
                >
                  <Icon name="chevron-left" size={18} color={theme.text} />
                  <Text style={[styles.pageNavButtonText, { color: theme.text }]}>Prev</Text>
                </TouchableOpacity>

                <View style={styles.pagePillsRow}>
                  {Array.from({ length: totalCatPages }, (_, idx) => idx + 1).map(pageNum => {
                    const isActive = pageNum === categoryPage;
                    return (
                      <TouchableOpacity
                        key={pageNum}
                        style={[
                          styles.pagePill,
                          isActive
                            ? { backgroundColor: theme.accent, borderColor: theme.accent }
                            : { backgroundColor: theme.surface, borderColor: theme.border },
                        ]}
                        onPress={() => setCategoryPage(pageNum)}
                      >
                        <Text
                          style={[
                            styles.pagePillText,
                            { color: isActive ? '#FFFFFF' : theme.text },
                          ]}
                        >
                          {pageNum}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity
                  style={[
                    styles.pageNavButton,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: categoryPage >= totalCatPages ? 0.4 : 1,
                    },
                  ]}
                  disabled={categoryPage >= totalCatPages}
                  onPress={() => setCategoryPage(p => Math.min(totalCatPages, p + 1))}
                >
                  <Text style={[styles.pageNavButtonText, { color: theme.text }]}>Next</Text>
                  <Icon name="chevron-right" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* SUBTLE INFO CARD IF VEHICLE HAS NO DIAGNOSTIC HISTORY */}
          {safeDiagnostics.length === 0 && (
            <View style={[styles.noDiagsNoticeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Icon name="info-outline" size={18} color={theme.accent} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.noDiagsNoticeTitle, { color: theme.text }]}>
                  No diagnostic history yet
                </Text>
                <Text style={[styles.noDiagsNoticeSub, { color: theme.textSecondary }]}>
                  Diagnostic status is unavailable until this vehicle has diagnostic records. You can still schedule and log maintenance above.
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

        </ScrollView>
      </Animated.View>
      <MaintenanceRecordModal
        visible={recordModal.visible}
        vehicleId={activeVehicleId || vehicleProfile?.id || vehicleProfile?.vehicle_id}
        record={recordModal.record}
        initialStatus={recordModal.status}
        onClose={closeRecordForm}
        onSaved={notifyRecordsChanged}
      />
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
    paddingBottom: 100,
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
  healthScoreLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 8.5,
    letterSpacing: 0.8,
    marginBottom: 2,
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
    marginBottom: 14,
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
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    marginTop: 2,
  },
  statSubText: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginTop: 2,
    letterSpacing: 0.2,
  },

  /* BEGINNER GUIDE CARD */
  beginnerGuideCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  beginnerGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  beginnerGuideIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beginnerGuideTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
  },
  beginnerGuideSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    marginTop: 1,
  },
  beginnerGuideList: {
    gap: 10,
  },
  beginnerGuideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  guideStepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  guideStepText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
  },
  guideStepContent: {
    flex: 1,
  },
  guideStepTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
  },
  guideStepDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 1,
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

  paginationContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  paginationSummary: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    letterSpacing: 0.3,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pageNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  pageNavButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  pagePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pagePill: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pagePillText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
  },
  recordSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  summaryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  recordsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  recordsHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordsTitle: {
    fontSize: 16,
    fontFamily: 'Outfit-Bold',
  },
  recordsSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  smallAddButton: {
    minHeight: 34,
    borderRadius: 10,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  smallAddText: {
    fontSize: 12,
    fontWeight: '700',
  },
  maintenanceEmptyState: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  emptyActionsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  primaryActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recordsList: {
    marginTop: -3,
  },
  recordRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    gap: 8,
  },
  recordStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordMain: {
    flex: 1,
  },
  recordName: {
    fontSize: 13,
    fontWeight: '600',
  },
  recordMeta: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3,
  },
  recordIconButton: {
    width: 30,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MaintenanceScreen;
