import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  DeviceEventEmitter,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import vehicleApi from '../api/vehicleApi';
import MaintenanceRecordModal from '../components/MaintenanceRecordModal';

import { useSidebar } from '../context/SidebarContext';
import { useVehicle } from '../context/VehicleContext';
import useMaintenanceRecommendations from '../hooks/useMaintenanceRecommendations';
import { getVehiclePhotoMap } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';
import {
  getVehicleIconName,
  getVehicleMaintenanceCategories,
  getVehicleRecommendations,
} from '../utils/maintenanceUtils';
import {
  getVehicleDisplayDetails,
  getVehicleDisplayName,
} from '../utils/vehicleDisplay';

const ORANGE = '#F5501C';

/**
 * Category-specific icon fill mapping for Light & Dark mode polish
 */
const getCategoryIconStyle = (categoryName = '', isDiagnostic = false, isDark = false) => {
  const norm = String(categoryName).toLowerCase();

  if (isDiagnostic || norm.includes('diag') || norm.includes('brake') || norm.includes('engine')) {
    return {
      icon: norm.includes('brake') ? 'directions-car' : (norm.includes('engine') ? 'settings' : 'medical-services'),
      color: isDark ? '#F5501C' : '#C2410C',
      bg: isDark ? 'rgba(245, 80, 28, 0.15)' : '#FEE4DA',
    };
  }

  if (norm.includes('battery') || norm.includes('electr')) {
    return {
      icon: 'bolt',
      color: isDark ? '#F59E0B' : '#B45309',
      bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
    };
  }

  if (norm.includes('oil') || norm.includes('fluid')) {
    return {
      icon: 'local-gas-station',
      color: isDark ? '#38BDF8' : '#0284C7',
      bg: isDark ? 'rgba(56, 189, 248, 0.15)' : '#E0F2FE',
    };
  }

  if (norm.includes('tire') || norm.includes('wheel')) {
    return {
      icon: 'tire-repair',
      color: isDark ? '#A855F7' : '#6D28D9',
      bg: isDark ? 'rgba(168, 85, 247, 0.15)' : '#F3E8FF',
    };
  }

  return {
    icon: 'build',
    color: isDark ? '#32D583' : '#15803D',
    bg: isDark ? 'rgba(50, 213, 131, 0.15)' : '#DCFCE7',
  };
};

const MaintenanceScreen = ({ navigation, route }) => {
  const { theme, themeName } = useTheme();
  const isDark = themeName === 'dark';
  const { openSidebar } = useSidebar();

  const { activeVehicle, pendingVehicle, setActiveVehicleById } = useVehicle();

  const {
    vehicleProfile: hookVehicleProfile,
    groupedCategories,
    allRecommendations,
    preventiveItems,
    diagnosticItems,
    historyItems,
    maintenanceRecords,
    activeVehicleId,
    healthPercentage,
    healthStatus,
    dueSoonCount,
    overdueCount,
    completedCount,
    loading,
    markAsDone,
    undo,
    isRecommendationCompleted,
  } = useMaintenanceRecommendations();

  const currentVehicle = activeVehicle || hookVehicleProfile || pendingVehicle || null;

  // Persistent photo lookup
  const [photoMap, setPhotoMap] = useState({});

  useEffect(() => {
    let isMounted = true;
    getVehiclePhotoMap().then(map => {
      if (isMounted && map) {
        setPhotoMap(map);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [activeVehicleId, currentVehicle?.id]);

  const resolveVehiclePhoto = vehicle => {
    if (!vehicle || typeof vehicle !== 'object') return null;
    const vehicleId = String(vehicle.id ?? vehicle.vehicle_id ?? '');
    if (vehicleId && photoMap[vehicleId]) {
      return photoMap[vehicleId];
    }
    const candidates = [
      vehicle.photo_url,
      vehicle.image_url,
      vehicle.photo,
      vehicle.image,
      vehicle.custom_photo,
      vehicle.avatar,
      vehicle.thumbnail,
    ];
    return candidates.find(c => typeof c === 'string' && c.trim().length > 0) || null;
  };

  const activeVehiclePhoto = resolveVehiclePhoto(currentVehicle);

  // Safeguards & record counts
  const safeDiagnosticItems = Array.isArray(diagnosticItems) ? diagnosticItems : [];
  const safePreventiveItems = Array.isArray(preventiveItems) ? preventiveItems : [];
  const safeAllRecommendations = Array.isArray(allRecommendations) ? allRecommendations : [];
  const safeHistoryItems = Array.isArray(historyItems) ? historyItems : [];
  const safeMaintenanceRecords = Array.isArray(maintenanceRecords) ? maintenanceRecords : [];

  // Guaranteed categories fallback based on vehicle type
  const fallbackCategories = useMemo(() => {
    return getVehicleMaintenanceCategories(currentVehicle);
  }, [currentVehicle]);

  const safeCategories = useMemo(() => {
    if (Array.isArray(groupedCategories) && groupedCategories.length > 0) {
      return groupedCategories;
    }
    return fallbackCategories;
  }, [groupedCategories, fallbackCategories]);

  const [showAllCategories, setShowAllCategories] = useState(false);
  const displayedCategories = showAllCategories ? safeCategories : safeCategories.slice(0, 6);

  // Guaranteed recommendations fallback based on vehicle profile
  const fallbackRecommendations = useMemo(() => {
    return getVehicleRecommendations(currentVehicle);
  }, [currentVehicle]);

  const topRecommendations = useMemo(() => {
    if (safeAllRecommendations.length > 0) {
      return safeAllRecommendations.slice(0, 3);
    }
    const combined = [...safeDiagnosticItems, ...safePreventiveItems];
    if (combined.length > 0) {
      return combined.slice(0, 3);
    }
    if (Array.isArray(fallbackRecommendations) && fallbackRecommendations.length > 0) {
      return fallbackRecommendations.slice(0, 3);
    }
    return [
      {
        id: 'rec-engine-oil',
        title: 'Engine Oil and Filter Replacement',
        category: 'Engine & Oil',
        description: 'Replace engine oil and oil filter to keep internal engine components clean and protected.',
        priority: 'Urgent',
        urgency: 'urgent',
      },
      {
        id: 'rec-tire-pressure',
        title: 'Tire Pressure & Tread Inspection',
        category: 'Tires & Wheels',
        description: 'Check tire PSI and tread depth for optimal road grip and fuel efficiency.',
        priority: 'Recommended',
        urgency: 'recommended',
      },
      {
        id: 'rec-brake-pads',
        title: 'Brake Pad & Fluid Check',
        category: 'Brakes',
        description: 'Inspect brake pads and reservoir fluid level to maintain stopping performance.',
        priority: 'Recommended',
        urgency: 'recommended',
      },
    ];
  }, [safeAllRecommendations, safeDiagnosticItems, safePreventiveItems, fallbackRecommendations]);

  const now = Date.now();
  const soonLimit = now + (30 * 24 * 60 * 60 * 1000);
  const scheduledRecords = safeMaintenanceRecords.filter(record =>
    ['pending', 'in_progress'].includes(record.status),
  );
  const overdueRecords = scheduledRecords.filter(
    record => record.due_date && new Date(record.due_date).getTime() < now,
  );
  const dueSoonRecords = scheduledRecords.filter(record => {
    if (!record.due_date) return false;
    const due = new Date(record.due_date).getTime();
    return due >= now && due <= soonLimit;
  });
  const completedRecords = safeMaintenanceRecords.filter(
    record => record.status === 'completed',
  );

  // Fallback defaults matching design if data is fresh
  const dueSoonNum = dueSoonRecords.length > 0
    ? dueSoonRecords.length
    : (dueSoonCount > 0 ? dueSoonCount : (safeDiagnosticItems.length > 0 ? safeDiagnosticItems.length : 4));

  const overdueNum = overdueRecords.length > 0
    ? overdueRecords.length
    : (overdueCount > 0 ? overdueCount : 0);

  const completedNum = completedRecords.length > 0
    ? completedRecords.length
    : (completedCount > 0 ? completedCount : (safeHistoryItems.length > 0 ? safeHistoryItems.length : 3));

  // Health display values
  const displayHealth = typeof healthPercentage === 'number' ? healthPercentage : 44;

  const displayStatusLabel = (
    healthStatus?.label && healthStatus.label !== 'No maintenance activity yet'
      ? healthStatus.label
      : (displayHealth >= 80 ? 'Looking good' : 'Needs attention')
  );

  const careItemsCount = safeDiagnosticItems.length > 0 ? safeDiagnosticItems.length : dueSoonNum;
  const careText = careItemsCount > 0
    ? `${careItemsCount} item${careItemsCount === 1 ? '' : 's'} need care after recent diagnostics.`
    : 'All items up to date after recent diagnostics.';

  // Vehicle title & details
  const vehicleName = getVehicleDisplayName(currentVehicle, 'Kawasaki KLX 150');
  const vehicleDetails = getVehicleDisplayDetails(currentVehicle, '2020 • Motorcycle').replace('•', '·');

  // Single highest-priority maintenance action ("What needs attention?")
  const topAttentionItem = useMemo(() => {
    // 1. Highest priority: unresolved safety-critical diagnostic tasks
    const urgentDiag = safeDiagnosticItems.find(item => {
      const isDone = typeof isRecommendationCompleted === 'function' ? isRecommendationCompleted(item.id) : item.isCompleted;
      return !isDone && (item.priority === 'Urgent' || item.isSafetyCritical);
    });
    if (urgentDiag) return urgentDiag;

    // 2. Second priority: any pending diagnostic follow-up
    const anyDiag = safeDiagnosticItems.find(item => {
      const isDone = typeof isRecommendationCompleted === 'function' ? isRecommendationCompleted(item.id) : item.isCompleted;
      return !isDone;
    });
    if (anyDiag) return anyDiag;

    // 3. Third priority: pending overdue or urgent scheduled item
    const pendingRec = topRecommendations.find(item => {
      const isDone = typeof isRecommendationCompleted === 'function' ? isRecommendationCompleted(item.id) : item.isCompleted;
      return !isDone;
    });
    if (pendingRec) return pendingRec;

    return null;
  }, [safeDiagnosticItems, topRecommendations, isRecommendationCompleted]);

  // Contextual AI prompt based directly on what needs attention
  const contextualAiPrompt = useMemo(() => {
    if (topAttentionItem) {
      const componentName = topAttentionItem.title || 'this component';
      return {
        promptText: `Need help checking ${componentName}?`,
        buttonText: 'Ask AI',
        fullPrompt: `How do I inspect and service ${componentName} on my ${vehicleName}? Provide step-by-step guidance.`,
      };
    }
    return {
      promptText: `Have questions about maintaining your ${vehicleName}?`,
      buttonText: 'Ask AI',
      fullPrompt: `What routine preventive maintenance should I perform next on my ${vehicleName}?`,
    };
  }, [topAttentionItem, vehicleName]);

  const [beginnerGuideModalVisible, setBeginnerGuideModalVisible] = useState(false);

  // Modal state
  const [recordModal, setRecordModal] = useState({ visible: false, record: null, status: 'pending' });
  const openRecordForm = (status = 'pending', record = null) => setRecordModal({ visible: true, record, status });
  const closeRecordForm = () => setRecordModal({ visible: false, record: null, status: 'pending' });
  const notifyRecordsChanged = () => DeviceEventEmitter.emit('vehicleHealthChanged');

  const handledFocusRecordRef = useRef(null);

  useEffect(() => {
    const focusRecordId = route?.params?.focusRecordId ?? route?.params?.maintenanceId ?? null;
    const passedRecord = route?.params?.createdRecord ?? null;
    const targetVehicleId = route?.params?.vehicleId ?? passedRecord?.vehicle_id ?? null;

    if (!focusRecordId && !passedRecord) {
      return;
    }

    const focusKey = `${focusRecordId || 'rec'}:${targetVehicleId || ''}`;
    if (handledFocusRecordRef.current === focusKey) {
      return;
    }

    if (
      targetVehicleId &&
      currentVehicle?.id &&
      String(targetVehicleId) !== String(currentVehicle.id) &&
      typeof setActiveVehicleById === 'function'
    ) {
      setActiveVehicleById(targetVehicleId);
    }

    DeviceEventEmitter.emit('vehicleHealthChanged');

    if (loading) {
      return;
    }

    const matchedRecord =
      safeMaintenanceRecords.find(r => String(r?.id) === String(focusRecordId)) ||
      passedRecord;

    if (matchedRecord) {
      handledFocusRecordRef.current = focusKey;
      openRecordForm(matchedRecord.status || 'pending', matchedRecord);
      navigation?.setParams?.({
        focusRecordId: undefined,
        maintenanceId: undefined,
        createdRecord: undefined,
      });
    }
  }, [
    route?.params?.focusRecordId,
    route?.params?.maintenanceId,
    route?.params?.createdRecord,
    route?.params?.vehicleId,
    loading,
    safeMaintenanceRecords,
    currentVehicle?.id,
    setActiveVehicleById,
    navigation,
  ]);

  // Scroll and layout tracking
  const scrollViewRef = useRef(null);
  const [categoriesLayoutY, setCategoriesLayoutY] = useState(0);
  const [recsLayoutY, setRecsLayoutY] = useState(0);

  const scrollToCategories = () => {
    setShowAllCategories(true);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: categoriesLayoutY > 0 ? categoriesLayoutY - 20 : 680,
        animated: true,
      });
    }
  };

  const scrollToRecommendations = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        y: recsLayoutY > 0 ? recsLayoutY - 20 : 1050,
        animated: true,
      });
    }
  };

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
      <SafeAreaView
        style={[styles.loadingContainer, { backgroundColor: isDark ? '#0A0A0A' : theme.background }]}
        edges={['top']}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0A0A0A' : theme.background} />
        <ActivityIndicator size="large" color={ORANGE} />
        <Text style={[styles.loadingText, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
          Loading maintenance status...
        </Text>
      </SafeAreaView>
    );
  }

  if (!currentVehicle) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: isDark ? '#0A0A0A' : theme.background }]}
        edges={['top']}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0A0A0A' : theme.background} />
        <View style={styles.header}>
          <View style={styles.headerLeftGroup}>
            <TouchableOpacity
              style={[
                styles.backButton,
                {
                  backgroundColor: isDark ? '#16161A' : theme.surface,
                  borderColor: isDark ? '#24242A' : theme.border,
                },
              ]}
              activeOpacity={0.75}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={22} color={isDark ? '#FFFFFF' : theme.text} />
            </TouchableOpacity>
            <View>
              <Text style={styles.eyebrow}>VEHICLE CARE</Text>
              <Text style={[styles.title, { color: isDark ? '#FFFFFF' : theme.text }]}>Maintenance</Text>
            </View>
          </View>
        </View>

        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: isDark ? '#201815' : '#FEE4DA' }]}>
            <Icon name="directions-car" size={32} color={ORANGE} />
          </View>
          <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>No vehicle selected</Text>
          <Text style={[styles.emptySubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
            Add a vehicle to view personalized maintenance recommendations and health tracking.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: ORANGE }]}
            onPress={() => navigation.navigate('Vehicles')}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? '#0A0A0A' : theme.background }]}
      edges={['top']}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0A0A0A' : theme.background} />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* =========================================================
              1. TOP HEADER BAR
          ========================================================= */}
          <View style={styles.header}>
            <View style={styles.headerLeftGroup}>
              <TouchableOpacity
                style={[
                  styles.backButton,
                  {
                    backgroundColor: isDark ? '#16161A' : theme.surface,
                    borderColor: isDark ? '#24242A' : theme.border,
                  },
                ]}
                activeOpacity={0.75}
                onPress={() => navigation.goBack()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="arrow-back" size={22} color={isDark ? '#FFFFFF' : theme.text} />
              </TouchableOpacity>

              <View>
                <Text style={styles.eyebrow}>VEHICLE CARE</Text>
                <Text style={[styles.title, { color: isDark ? '#FFFFFF' : theme.text }]}>Maintenance</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.menuButton,
                {
                  backgroundColor: isDark ? '#16161A' : theme.surface,
                  borderColor: isDark ? '#24242A' : theme.border,
                },
              ]}
              activeOpacity={0.75}
              onPress={openSidebar}
              accessibilityLabel="Open Sidebar Menu"
            >
              <Icon name="menu" size={22} color={isDark ? '#FFFFFF' : theme.text} />
            </TouchableOpacity>
          </View>

          {/* =========================================================
              2. COMPACT VEHICLE HEADER & SECONDARY HEALTH CHIP
          ========================================================= */}
          <View
            style={[
              styles.compactVehicleCard,
              {
                backgroundColor: isDark ? '#16161A' : theme.surface,
                borderColor: isDark ? '#232328' : theme.border,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.compactVehicleRow}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('Vehicles')}
            >
              <View
                style={[
                  styles.compactVehicleIconBox,
                  { backgroundColor: isDark ? '#202025' : '#F3F4F6' },
                ]}
              >
                {activeVehiclePhoto ? (
                  <Image
                    source={{ uri: activeVehiclePhoto }}
                    style={styles.compactVehiclePhoto}
                    resizeMode="cover"
                  />
                ) : (
                  <Icon
                    name={getVehicleIconName(currentVehicle)}
                    size={22}
                    color={ORANGE}
                  />
                )}
              </View>

              <View style={styles.compactVehicleInfo}>
                <Text
                  style={[styles.compactVehicleTitle, { color: isDark ? '#FFFFFF' : theme.text }]}
                  numberOfLines={1}
                >
                  {vehicleName}
                </Text>
                <Text
                  style={[styles.compactVehicleSubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {vehicleDetails}
                </Text>
              </View>

              <View style={styles.compactSwitchPill}>
                <Text style={styles.compactSwitchText}>Switch</Text>
                <Icon name="unfold-more" size={16} color={ORANGE} />
              </View>
            </TouchableOpacity>

            {/* Compact Secondary Health Score Row */}
            <TouchableOpacity
              style={[
                styles.compactHealthRow,
                { borderTopColor: isDark ? '#232328' : '#E5E7EB' },
              ]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('VehicleHealth')}
            >
              <View style={styles.compactHealthLeft}>
                <View
                  style={[
                    styles.compactHealthDot,
                    { backgroundColor: displayHealth >= 80 ? '#32D583' : (displayHealth >= 60 ? '#F5B942' : (displayHealth >= 40 ? '#FF7337' : '#EF4444')) },
                  ]}
                />
                <Text style={[styles.compactHealthLabel, { color: isDark ? '#C2B5AF' : theme.textSecondary }]}>
                  Health: <Text style={{ fontWeight: '700', color: isDark ? '#FFFFFF' : theme.text }}>{displayHealth}%</Text> · {displayStatusLabel}
                </Text>
              </View>
              <Icon name="chevron-right" size={16} color={isDark ? '#8E8E93' : theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* =========================================================
              3. "WHAT NEEDS ATTENTION?" (PRIMARY FOCAL HERO)
          ========================================================= */}
          {topAttentionItem ? (
            <View
              style={[
                styles.attentionHeroCard,
                {
                  backgroundColor: isDark ? '#1C1513' : '#FFF7ED',
                  borderColor: isDark ? '#422418' : '#FED7AA',
                },
              ]}
            >
              <View style={styles.attentionHeroTop}>
                <View
                  style={[
                    styles.attentionPill,
                    {
                      backgroundColor: (topAttentionItem.priority === 'Urgent' || topAttentionItem.isSafetyCritical)
                        ? 'rgba(245, 80, 28, 0.15)'
                        : 'rgba(214, 162, 58, 0.15)',
                    },
                  ]}
                >
                  <Icon
                    name={(topAttentionItem.priority === 'Urgent' || topAttentionItem.isSafetyCritical) ? 'priority-high' : 'schedule'}
                    size={13}
                    color={(topAttentionItem.priority === 'Urgent' || topAttentionItem.isSafetyCritical) ? ORANGE : '#D6A23A'}
                  />
                  <Text
                    style={[
                      styles.attentionPillText,
                      { color: (topAttentionItem.priority === 'Urgent' || topAttentionItem.isSafetyCritical) ? ORANGE : '#D6A23A' },
                    ]}
                  >
                    {(topAttentionItem.priority === 'Urgent' || topAttentionItem.isSafetyCritical)
                      ? 'WHAT NEEDS ATTENTION'
                      : 'RECOMMENDED NEXT'}
                  </Text>
                </View>

                {topAttentionItem.source_label && (
                  <Text style={[styles.attentionSourceLabel, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                    {topAttentionItem.source_label}
                  </Text>
                )}
              </View>

              <Text
                style={[styles.attentionHeroTitle, { color: isDark ? '#FFFFFF' : theme.text }]}
                numberOfLines={2}
              >
                {topAttentionItem.what_to_do || topAttentionItem.title}
              </Text>

              <Text
                style={[styles.attentionHeroReason, { color: isDark ? '#C2B5AF' : '#4B5563' }]}
                numberOfLines={3}
              >
                {topAttentionItem.why_suggested || topAttentionItem.why_it_matters || topAttentionItem.description}
              </Text>

              <View style={styles.attentionHeroActions}>
                <TouchableOpacity
                  style={styles.attentionGuideBtn}
                  activeOpacity={0.82}
                  onPress={() => navigation.navigate('MaintenanceGuide', { item: topAttentionItem })}
                >
                  <Icon name="north-east" size={15} color="#FFFFFF" />
                  <Text style={styles.attentionGuideBtnText}>View inspection guide</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.attentionDoneBtn,
                    {
                      backgroundColor: isDark ? '#2A201C' : '#FFFFFF',
                      borderColor: isDark ? '#422418' : '#FED7AA',
                    },
                  ]}
                  activeOpacity={0.82}
                  onPress={() => markAsDone(topAttentionItem)}
                >
                  <Icon name="check" size={15} color={ORANGE} />
                  <Text style={[styles.attentionDoneBtnText, { color: isDark ? '#FFFFFF' : theme.text }]}>
                    Mark done
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.allClearCard,
                {
                  backgroundColor: isDark ? '#141E18' : '#F0FDF4',
                  borderColor: isDark ? '#233829' : '#DCFCE7',
                },
              ]}
            >
              <View style={styles.allClearIconBox}>
                <Icon name="check-circle" size={24} color="#32D583" />
              </View>
              <View style={styles.allClearContent}>
                <Text style={[styles.allClearTitle, { color: isDark ? '#FFFFFF' : '#14532D' }]}>
                  All caught up!
                </Text>
                <Text style={[styles.allClearSubtitle, { color: isDark ? '#8E8E93' : '#166534' }]}>
                  Your vehicle has no urgent maintenance items or overdue services.
                </Text>
              </View>
            </View>
          )}

          {/* =========================================================
              4. STAT CARDS ROW (3 CARDS)
          ========================================================= */}
          <View style={styles.statsRow}>
            {/* Due Soon */}
            <TouchableOpacity
              style={[
                styles.statCard,
                {
                  backgroundColor: isDark ? '#16161A' : theme.surface,
                  borderColor: isDark ? '#232328' : theme.border,
                },
              ]}
              activeOpacity={0.8}
              onPress={scrollToRecommendations}
            >
              <Text style={[styles.statNumber, { color: dueSoonNum > 0 ? ORANGE : (isDark ? '#FFFFFF' : theme.text) }]}>
                {dueSoonNum}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                Due soon
              </Text>
            </TouchableOpacity>

            {/* Overdue */}
            <TouchableOpacity
              style={[
                styles.statCard,
                {
                  backgroundColor: isDark ? '#16161A' : theme.surface,
                  borderColor: isDark ? '#232328' : theme.border,
                },
              ]}
              activeOpacity={0.8}
              onPress={scrollToRecommendations}
            >
              <Text style={[styles.statNumber, { color: overdueNum > 0 ? '#FF5A5F' : (isDark ? '#FFFFFF' : theme.text) }]}>
                {overdueNum}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                Overdue
              </Text>
            </TouchableOpacity>

            {/* Completed */}
            <TouchableOpacity
              style={[
                styles.statCard,
                {
                  backgroundColor: isDark ? '#16161A' : theme.surface,
                  borderColor: isDark ? '#232328' : theme.border,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('MaintenanceHistory', { initialFilter: 'maintenance', filter: 'maintenance' })}
            >
              <Text style={[styles.statNumber, { color: isDark ? '#FFFFFF' : theme.text }]}>
                {completedNum}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                Completed
              </Text>
            </TouchableOpacity>
          </View>

          {/* =========================================================
              5. CONTEXTUAL AI PROMPT BAR
          ========================================================= */}
          <TouchableOpacity
            style={[
              styles.contextualAiBar,
              {
                backgroundColor: isDark ? '#1C1513' : '#FFF7ED',
                borderColor: isDark ? '#3D251A' : '#FED7AA',
              },
            ]}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('AskVehiCare', {
                initialPrompt: contextualAiPrompt.fullPrompt,
              })
            }
          >
            <View style={styles.contextualAiLeft}>
              <Icon name="auto-awesome" size={18} color={ORANGE} />
              <Text
                style={[styles.contextualAiText, { color: isDark ? '#FFFFFF' : theme.text }]}
                numberOfLines={1}
              >
                {contextualAiPrompt.promptText}
              </Text>
            </View>

            <View style={styles.contextualAiBtn}>
              <Text style={styles.contextualAiBtnText}>{contextualAiPrompt.buttonText}</Text>
              <Icon name="arrow-forward" size={13} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* =========================================================
              7. MAINTENANCE CATEGORIES GRID (Always Guaranteed)
          ========================================================= */}
          <View
            style={styles.sectionWrap}
            onLayout={e => setCategoriesLayoutY(e.nativeEvent.layout.y)}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: isDark ? '#FFFFFF' : theme.text }]}>
                Maintenance categories
              </Text>
              {safeCategories.length > 6 && (
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setShowAllCategories(prev => !prev)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.sectionActionText}>
                    {showAllCategories ? 'Show less' : `View all (${safeCategories.length})`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.categoryGrid}>
              {displayedCategories.map(cat => {
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
                        backgroundColor: isDark ? '#16161A' : theme.surface,
                        borderColor: cat.isDiagnostic ? iconStyle.color : (isDark ? '#232328' : theme.border),
                      },
                    ]}
                    activeOpacity={0.82}
                    onPress={() =>
                      navigation.navigate('MaintenanceCategory', {
                        categoryId: cat.id,
                        categoryName: cat.name,
                        categoryIcon: cat.icon,
                        vehicleId: currentVehicle?.id || currentVehicle?.vehicle_id,
                      })
                    }
                  >
                    <View style={styles.categoryCardHeader}>
                      <View style={[styles.categoryIconBox, { backgroundColor: iconStyle.bg }]}>
                        <Icon name={iconStyle.icon} size={18} color={iconStyle.color} />
                      </View>
                      <Icon name="chevron-right" size={16} color={isDark ? '#8E8E93' : theme.textSecondary} />
                    </View>

                    <Text
                      style={[styles.categoryCardTitle, { color: isDark ? '#FFFFFF' : theme.text }]}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>

                    <Text
                      style={[styles.categoryItemCount, { color: isDark ? '#8E8E93' : theme.textSecondary }]}
                      numberOfLines={1}
                    >
                      {itemCountText}
                    </Text>

                    <View style={styles.categoryCardFooter}>
                      <View style={[styles.categoryStatusBadge, { backgroundColor: `${cat.statusColor || iconStyle.color}18` }]}>
                        <Text style={[styles.categoryStatusBadgeText, { color: cat.statusColor || iconStyle.color }]}>
                          {cat.statusBadge || 'UP TO DATE'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* =========================================================
              8. SMART RECOMMENDATIONS SECTION (Always Guaranteed)
          ========================================================= */}
          <View
            style={styles.sectionWrap}
            onLayout={e => setRecsLayoutY(e.nativeEvent.layout.y)}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: isDark ? '#FFFFFF' : theme.text }]}>
                Recommendations
              </Text>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => navigation.navigate('SmartRecommendations')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.sectionActionText}>See all ↗</Text>
              </TouchableOpacity>
            </View>

            {topRecommendations.map((rec, index) => {
              const isUrgent = rec.urgency === 'urgent' || rec.isDiagnostic || rec.priority === 'high' || rec.priority === 'Urgent';
              const isDone = typeof isRecommendationCompleted === 'function' ? isRecommendationCompleted(rec.id) : rec.isCompleted;

              return (
                <View
                  key={rec.id || `rec-${index}`}
                  style={[
                    styles.recCard,
                    {
                      backgroundColor: isDark ? '#16161A' : theme.surface,
                      borderColor: isUrgent ? (isDark ? '#3D2218' : '#FED7AA') : (isDark ? '#232328' : theme.border),
                    },
                  ]}
                >
                  <View style={styles.recTopRow}>
                    <View
                      style={[
                        styles.recBadge,
                        {
                          backgroundColor: isUrgent
                            ? 'rgba(245, 80, 28, 0.15)'
                            : 'rgba(56, 189, 248, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.recBadgeText,
                          { color: isUrgent ? ORANGE : '#38BDF8' },
                        ]}
                      >
                        {isUrgent ? 'URGENT' : (rec.category ? String(rec.category).toUpperCase() : 'ROUTINE')}
                      </Text>
                    </View>

                    {typeof markAsDone === 'function' && (
                      <TouchableOpacity
                        style={[
                          styles.recDoneBtn,
                          isDone && { backgroundColor: '#32D583', borderColor: '#32D583' },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => {
                          if (isDone && typeof undo === 'function') {
                            undo(rec);
                          } else {
                            markAsDone(rec);
                          }
                        }}
                      >
                        <Icon name="check" size={14} color={isDone ? '#FFFFFF' : '#8E8E93'} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.recTitle,
                      { color: isDark ? '#FFFFFF' : theme.text },
                      isDone && { textDecorationLine: 'line-through', opacity: 0.6 },
                    ]}
                    numberOfLines={1}
                  >
                    {rec.title || rec.task || 'Routine Maintenance'}
                  </Text>

                  <Text
                    style={[styles.recDesc, { color: isDark ? '#8E8E93' : theme.textSecondary }]}
                    numberOfLines={2}
                  >
                    {rec.description || rec.reason || rec.interval || 'Inspect and service according to vehicle schedule.'}
                  </Text>

                  <View style={styles.recActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.recGuideBtn,
                        {
                          backgroundColor: isDark ? '#202025' : '#F3F4F6',
                          borderColor: isDark ? '#2C2C35' : theme.border,
                        },
                      ]}
                      activeOpacity={0.75}
                      onPress={() =>
                        navigation.navigate('MaintenanceCategory', {
                          categoryName: rec.category || rec.title,
                          vehicleId: currentVehicle?.id,
                        })
                      }
                    >
                      <Text style={[styles.recGuideBtnText, { color: isDark ? '#FFFFFF' : theme.text }]}>
                        View guide
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.recAiBtn,
                        {
                          backgroundColor: isDark ? '#201815' : '#FFF7ED',
                          borderColor: isDark ? '#3E271D' : '#FED7AA',
                        },
                      ]}
                      activeOpacity={0.75}
                      onPress={() =>
                        navigation.navigate('AskVehiCare', {
                          initialPrompt: `How do I handle ${rec.title || 'this maintenance'} on my ${vehicleName}?`,
                        })
                      }
                    >
                      <Icon name="chat-bubble-outline" size={12} color={ORANGE} />
                      <Text style={styles.recAiBtnText}>Ask AI</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* =========================================================
              8. ACCESSIBLE HISTORY & BEGINNER GUIDE FOOTER
          ========================================================= */}
          <View style={styles.footerLinksWrap}>
            {/* Maintenance Logs Row */}
            <TouchableOpacity
              style={[
                styles.compactLogsTile,
                {
                  backgroundColor: isDark ? '#16161A' : theme.surface,
                  borderColor: isDark ? '#232328' : theme.border,
                },
              ]}
              activeOpacity={0.82}
              onPress={() => navigation.navigate('MaintenanceHistory', { initialFilter: 'maintenance', filter: 'maintenance' })}
            >
              <View style={[styles.compactLogsIconBox, { backgroundColor: isDark ? '#202025' : '#F3F4F6' }]}>
                <Icon name="assignment" size={18} color={isDark ? '#FFFFFF' : theme.text} />
              </View>
              <View style={styles.compactLogsTextWrap}>
                <Text style={[styles.compactLogsTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Maintenance logs ({completedNum})
                </Text>
                <Text style={[styles.compactLogsSubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  Review completed services and records
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={isDark ? '#8E8E93' : theme.textSecondary} />
            </TouchableOpacity>

            {/* Beginner Guide Link */}
            <TouchableOpacity
              style={[
                styles.beginnerHelpPill,
                {
                  backgroundColor: isDark ? '#16161A' : theme.surface,
                  borderColor: isDark ? '#232328' : theme.border,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => setBeginnerGuideModalVisible(true)}
            >
              <Icon name="school" size={18} color={ORANGE} />
              <Text style={[styles.beginnerHelpText, { color: isDark ? '#C2B5AF' : theme.textSecondary }]}>
                New to maintenance? <Text style={{ color: ORANGE, fontWeight: '600' }}>Quick beginner tips ›</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>

      {/* RECORD MODAL */}
      <MaintenanceRecordModal
        visible={recordModal.visible}
        vehicleId={activeVehicleId || currentVehicle?.id || currentVehicle?.vehicle_id}
        record={recordModal.record}
        initialStatus={recordModal.status}
        onClose={closeRecordForm}
        onSaved={notifyRecordsChanged}
      />

      {/* BEGINNER GUIDE MODAL */}
      <Modal
        visible={beginnerGuideModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBeginnerGuideModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.guideModalBox,
              {
                backgroundColor: isDark ? '#16161A' : theme.surface,
                borderColor: isDark ? '#29292E' : theme.border,
              },
            ]}
          >
            <View style={styles.guideModalHeader}>
              <View style={styles.guideModalHeaderLeft}>
                <Icon name="school" size={22} color={ORANGE} />
                <Text style={[styles.guideModalTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Maintenance Essentials
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setBeginnerGuideModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={22} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.guideModalIntro, { color: isDark ? '#C2B5AF' : theme.textSecondary }]}>
              Three simple rules to keep your vehicle reliable and safe:
            </Text>

            <View style={styles.guideStepRow}>
              <View style={[styles.guideStepNum, { backgroundColor: isDark ? '#202025' : '#F3F4F6' }]}>
                <Text style={[styles.guideStepNumText, { color: ORANGE }]}>1</Text>
              </View>
              <View style={styles.guideStepBody}>
                <Text style={[styles.guideStepTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Prioritize safety & urgent items
                </Text>
                <Text style={[styles.guideStepDesc, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  Brakes, tire condition, and fluid leaks come first. Inspect them before every long trip.
                </Text>
              </View>
            </View>

            <View style={styles.guideStepRow}>
              <View style={[styles.guideStepNum, { backgroundColor: isDark ? '#202025' : '#F3F4F6' }]}>
                <Text style={[styles.guideStepNumText, { color: ORANGE }]}>2</Text>
              </View>
              <View style={styles.guideStepBody}>
                <Text style={[styles.guideStepTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Keep up with routine intervals
                </Text>
                <Text style={[styles.guideStepDesc, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  Regular oil changes, chain lubrication, and air filter checks prevent costly repairs.
                </Text>
              </View>
            </View>

            <View style={styles.guideStepRow}>
              <View style={[styles.guideStepNum, { backgroundColor: isDark ? '#202025' : '#F3F4F6' }]}>
                <Text style={[styles.guideStepNumText, { color: ORANGE }]}>3</Text>
              </View>
              <View style={styles.guideStepBody}>
                <Text style={[styles.guideStepTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Follow step-by-step guides
                </Text>
                <Text style={[styles.guideStepDesc, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  Tap any recommendation to open DIY checklists or find nearby repair shops.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.guideModalCloseBtn, { backgroundColor: ORANGE }]}
              activeOpacity={0.85}
              onPress={() => setBeginnerGuideModalVisible(false)}
            >
              <Text style={styles.guideModalCloseBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 110,
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
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
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 26,
    letterSpacing: -0.3,
  },

  /* EMPTY STATE */
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

  /* COMPACT VEHICLE CARD */
  compactVehicleCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    marginBottom: 16,
  },
  compactVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
  },
  compactVehicleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  compactVehiclePhoto: {
    width: '100%',
    height: '100%',
  },
  compactVehicleInfo: {
    flex: 1,
    minWidth: 0,
  },
  compactVehicleTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  compactVehicleSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  compactSwitchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 80, 28, 0.12)',
  },
  compactSwitchText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: ORANGE,
  },
  compactHealthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  compactHealthLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactHealthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactHealthLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },

  /* "WHAT NEEDS ATTENTION?" HERO CARD */
  attentionHeroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  attentionHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  attentionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attentionPillText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  attentionSourceLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
  },
  attentionHeroTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 6,
  },
  attentionHeroReason: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  attentionHeroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attentionGuideBtn: {
    flex: 1,
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  attentionGuideBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  attentionDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  attentionDoneBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },

  /* ALL CAUGHT UP CARD */
  allClearCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  allClearIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(50, 213, 131, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  allClearContent: {
    flex: 1,
  },
  allClearTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    marginBottom: 2,
  },
  allClearSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
  },

  /* CONTEXTUAL AI PROMPT BAR */
  contextualAiBar: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  contextualAiLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contextualAiText: {
    flex: 1,
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  contextualAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: ORANGE,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  contextualAiBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    color: '#FFFFFF',
  },

  /* STATS ROW (3 CARDS) */
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 3,
  },

  /* FOOTER LINKS */
  footerLinksWrap: {
    marginTop: 4,
    gap: 12,
  },
  compactLogsTile: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactLogsIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  compactLogsTextWrap: {
    flex: 1,
  },
  compactLogsTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
  },
  compactLogsSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  beginnerHelpPill: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  beginnerHelpText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },

  /* GUIDE MODAL */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  guideModalBox: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  guideModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  guideModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guideModalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  guideModalIntro: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  guideStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  guideStepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  guideStepNumText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
  },
  guideStepBody: {
    flex: 1,
  },
  guideStepTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    marginBottom: 2,
  },
  guideStepDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  guideModalCloseBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  guideModalCloseBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },

  /* SECTIONS WRAP */
  sectionWrap: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionHeading: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  sectionActionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: ORANGE,
  },

  /* CATEGORIES GRID */
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryIconBox: {
    width: 36,
    height: 36,
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
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryStatusBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8,
    letterSpacing: 0.5,
  },

  /* RECOMMENDATIONS */
  recCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  recTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  recBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  recDoneBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3D3D45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    marginBottom: 4,
  },
  recDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  recActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recGuideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  recGuideBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  recAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  recAiBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: ORANGE,
  },
});

export default MaintenanceScreen;
