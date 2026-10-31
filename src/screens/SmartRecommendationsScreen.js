import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  DeviceEventEmitter,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import vehicleApi from '../api/vehicleApi';
import SkeletonLoader, { useScreenSkeleton } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { useVehicle } from '../context/VehicleContext';
import useMaintenanceRecommendations from '../hooks/useMaintenanceRecommendations';
import { getHistoryStorageKey, loadActiveChatSessions } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';
import {
  getVehicleDisplayDetails,
  getVehicleDisplayName,
} from '../utils/vehicleDisplay';
import {
  extractSmartRecommendations,
  getHealthBarColor,
  getVehicleIconName,
  getVehicleRecommendations,
  groupRecommendationsByTriSections,
  isTaskSafetyCritical,
  mergeRecommendations,
  normalizeDiagnosticRecord,
} from '../utils/maintenanceUtils';

/*
|--------------------------------------------------------------------------
| SMART RECOMMENDATIONS SCREEN
|--------------------------------------------------------------------------
*/

const useSafeMaintenanceRecommendations = () => {
  try {
    return useMaintenanceRecommendations() || {};
  } catch {
    return {};
  }
};

const SmartRecommendationsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { activeVehicle, pendingVehicle } = useVehicle();
  const vehicleProfile = activeVehicle || pendingVehicle;

  const activeVehicleId = useMemo(() => {
    const rawId = vehicleProfile?.id ?? vehicleProfile?.vehicle_id ?? null;
    return rawId !== null ? String(rawId) : null;
  }, [vehicleProfile]);

  const {
    vehicleProfile: hookVehicleProfile,
    allRecommendations,
    smartRecommendations: hookSmartRecommendations,
    healthPercentage: hookHealthPercentage,
    healthStatus: hookHealthStatus,
    loading: hookLoading,
    isRecommendationCompleted: isRecCompletedHook,
    markAsDone: markAsDoneHook,
    undo: undoHook,
    diagnostics: hookDiagnostics,
    repairRecords: hookRepairRecords,
    completedRecommendationIds: hookCompletedIds,
  } = useSafeMaintenanceRecommendations();

  const healthPercentage = typeof hookHealthPercentage === 'number' ? hookHealthPercentage : 44;
  const healthStatus = hookHealthStatus || 'Needs attention';
  const loading = hookLoading;
  const showSkeleton = useScreenSkeleton(loading, 'SmartRecommendations');

  const [itemOpacity] = useState(new Animated.Value(0));
  const [localCompletedIds, setLocalCompletedIds] = useState([]);
  const [selectedDiagnosisModal, setSelectedDiagnosisModal] = useState(null);

  useEffect(() => {
    setLocalCompletedIds([]);
    setExpandedCardIds(new Set());
    setSelectedDiagnosisModal(null);
    setRecPage(1);
  }, [activeVehicleId]);

  const handleOpenDiagnosisModal = useCallback(item => {
    if (!item) return;

    const diagId = String(item.diagnosisId || '');
    const matched = diagnostics.find(d => {
      const dId = String(d.id || d.diagnosis_id || d._id || '');
      return dId && dId === diagId;
    });

    const record = matched || item.diagnosticRecord || item.raw || {};
    const norm = normalizeDiagnosticRecord(record) || {};

    const problem =
      norm.problem ||
      record.problem ||
      record.diagnosis_title ||
      record.title ||
      item.relatedProblem ||
      item.title ||
      'Diagnostic Issue';

    const rawSeverity = norm.severity || record.severity || record.urgency || item.priority || 'medium';
    const severity = String(rawSeverity).toLowerCase();

    const summary =
      record.summary ||
      record.description ||
      record.explanation ||
      record.ai_analysis ||
      item.description ||
      '';

    const rawActions =
      norm.recommendedActions ||
      record.recommended_actions ||
      record.recommendedActions ||
      record.actions ||
      [];
    const actions = Array.isArray(rawActions) && rawActions.length > 0
      ? rawActions.map(a => (typeof a === 'string' ? a : a?.action || a?.text || a?.title || String(a)))
      : [item.title];

    const rawCauses =
      norm.possibleCauses ||
      record.possible_causes ||
      record.possibleCauses ||
      record.causes ||
      [];
    const causes = Array.isArray(rawCauses) && rawCauses.length > 0
      ? rawCauses.map(c => (typeof c === 'string' ? c : c?.cause || c?.name || c?.title || String(c)))
      : [];

    const rawSteps =
      norm.troubleshootingSteps ||
      record.troubleshooting_steps ||
      record.troubleshootingSteps ||
      record.steps ||
      [];
    const steps = Array.isArray(rawSteps) && rawSteps.length > 0
      ? rawSteps.map(s => (typeof s === 'string' ? s : s?.step || s?.text || String(s)))
      : [];

    const rawSymptoms = record.symptoms || [];
    const symptoms = Array.isArray(rawSymptoms)
      ? rawSymptoms.map(s => (typeof s === 'string' ? s : s?.symptom || s?.text || String(s)))
      : typeof rawSymptoms === 'string' && rawSymptoms
      ? [rawSymptoms]
      : [];

    const createdAt = norm.createdAt || record.createdAt || record.created_at || item.createdAt || null;

    setSelectedDiagnosisModal({
      item,
      problem,
      severity,
      summary,
      actions,
      causes,
      steps,
      symptoms,
      createdAt,
    });
  }, [diagnostics]);

  const diagnostics = hookDiagnostics || [];
  const repairRecords = hookRepairRecords || [];

  /*
  |--------------------------------------------------------------------------
  | SMART PREVENTIVE RECOMMENDATION COMPUTE
  |--------------------------------------------------------------------------
  */

  const recommendations = useMemo(() => {
    if (Array.isArray(allRecommendations) && allRecommendations.length > 0) {
      return allRecommendations;
    }
    return Array.isArray(hookSmartRecommendations) ? hookSmartRecommendations : [];
  }, [allRecommendations, hookSmartRecommendations]);

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'do_this_now' | 'coming_up_soon' | 'helpful_tips'
  const [expandedCardIds, setExpandedCardIds] = useState(new Set());
  const toggleExpandCard = useCallback(id => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const REC_PAGE_SIZE = 15;
  const [recPage, setRecPage] = useState(1);
  const mainScrollViewRef = useRef(null);

  /*
  |--------------------------------------------------------------------------
  | COMPLETION STATE PERSISTENCE
  |--------------------------------------------------------------------------
  */

  const completedRecommendationIds = useMemo(() => {
    const ids = new Set();
    if (hookCompletedIds instanceof Set) {
      hookCompletedIds.forEach(id => ids.add(id));
    }
    localCompletedIds.forEach(id => ids.add(id));
    return ids;
  }, [hookCompletedIds, localCompletedIds]);

  const triSections = useMemo(
    () => groupRecommendationsByTriSections(recommendations, completedRecommendationIds, vehicleProfile),
    [recommendations, completedRecommendationIds, vehicleProfile],
  );

  const displayedItems = useMemo(() => {
    if (activeTab === 'do_this_now') return triSections.doThisNow;
    if (activeTab === 'coming_up_soon') return triSections.comingUpSoon;
    if (activeTab === 'helpful_tips') return triSections.helpfulTips;
    return recommendations;
  }, [activeTab, triSections, recommendations]);

  const allOrderedItems = useMemo(() => {
    const combined = [
      ...triSections.doThisNow,
      ...triSections.comingUpSoon,
      ...triSections.helpfulTips,
    ];
    return combined.length > 0 ? combined : recommendations;
  }, [triSections, recommendations]);

  const currentTabItems = useMemo(() => {
    if (activeTab === 'do_this_now') return triSections.doThisNow;
    if (activeTab === 'coming_up_soon') return triSections.comingUpSoon;
    if (activeTab === 'helpful_tips') return triSections.helpfulTips;
    return allOrderedItems;
  }, [activeTab, triSections, allOrderedItems]);

  const totalRecPages = Math.max(1, Math.ceil(currentTabItems.length / REC_PAGE_SIZE));

  const paginatedRecItems = useMemo(() => {
    const start = (recPage - 1) * REC_PAGE_SIZE;
    return currentTabItems.slice(start, start + REC_PAGE_SIZE);
  }, [currentTabItems, recPage]);

  const handlePageChange = useCallback(newPage => {
    setRecPage(newPage);
    mainScrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const handleTabChange = useCallback(tabKey => {
    setActiveTab(tabKey);
    setRecPage(1);
  }, []);

  const isRecommendationCompleted = useCallback(
    itemOrId => {
      if (typeof isRecCompletedHook === 'function') {
        return isRecCompletedHook(itemOrId);
      }
      const id = typeof itemOrId === 'object' ? itemOrId?.id : itemOrId;
      return completedRecommendationIds.has(String(id));
    },
    [isRecCompletedHook, completedRecommendationIds],
  );

  const completeRecommendation = useCallback(
    item => {
      if (!item) return;
      if (typeof markAsDoneHook === 'function') {
        markAsDoneHook(item);
      } else {
        const id = item?.id || item;
        setLocalCompletedIds(prev => (prev.includes(id) ? prev : [...prev, id]));
      }
    },
    [markAsDoneHook],
  );

  const undoRecommendation = useCallback(
    itemOrId => {
      if (!itemOrId) return;
      if (typeof undoHook === 'function') {
        undoHook(itemOrId);
      } else {
        const id = typeof itemOrId === 'object' ? itemOrId?.id : itemOrId;
        setLocalCompletedIds(prev => prev.filter(itemId => itemId !== id));
      }
    },
    [undoHook],
  );

  useEffect(() => {
    Animated.timing(itemOpacity, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [itemOpacity]);

  const completedCount = recommendations.filter(recommendation =>
    isRecommendationCompleted(recommendation),
  ).length;

  const progressPercentage = recommendations.length
    ? Math.round((completedCount / recommendations.length) * 100)
    : 0;

  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: progressPercentage,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [progressPercentage, progressWidth]);

  const healthTheme = useMemo(() => {
    if (healthPercentage >= 90) {
      return {
        color: '#10B981',
        bgColor: 'rgba(16, 185, 129, 0.14)',
        borderColor: 'rgba(16, 185, 129, 0.35)',
        glowColor: 'rgba(16, 185, 129, 0.20)',
        label: 'OPTIMAL',
        conditionText: 'Optimal vehicle condition',
      };
    }
    if (healthPercentage >= 80) {
      return {
        color: '#32D583',
        bgColor: 'rgba(50, 213, 131, 0.14)',
        borderColor: 'rgba(50, 213, 131, 0.35)',
        glowColor: 'rgba(50, 213, 131, 0.20)',
        label: 'OPTIMAL',
        conditionText: 'Optimal vehicle condition',
      };
    }
    if (healthPercentage >= 70) {
      return {
        color: '#84CC16',
        bgColor: 'rgba(132, 204, 22, 0.14)',
        borderColor: 'rgba(132, 204, 22, 0.35)',
        glowColor: 'rgba(132, 204, 22, 0.20)',
        label: 'GOOD',
        conditionText: 'Good vehicle condition',
      };
    }
    if (healthPercentage >= 60) {
      return {
        color: '#F5B942',
        bgColor: 'rgba(245, 185, 66, 0.14)',
        borderColor: 'rgba(245, 185, 66, 0.35)',
        glowColor: 'rgba(245, 185, 66, 0.20)',
        label: 'GOOD',
        conditionText: 'Routine maintenance approaching',
      };
    }
    if (healthPercentage >= 40) {
      return {
        color: '#FF7337',
        bgColor: 'rgba(255, 115, 55, 0.14)',
        borderColor: 'rgba(255, 115, 55, 0.35)',
        glowColor: 'rgba(255, 115, 55, 0.20)',
        label: 'ATTENTION',
        conditionText: 'Inspection recommended',
      };
    }
    return {
      color: '#EF4444',
      bgColor: 'rgba(239, 68, 68, 0.14)',
      borderColor: 'rgba(239, 68, 68, 0.35)',
      glowColor: 'rgba(239, 68, 68, 0.20)',
      label: 'CRITICAL',
      conditionText: 'Immediate attention required',
    };
  }, [healthPercentage]);

  const healthBarColor = healthTheme.color;

  const isDark = theme?.name === 'dark' || Boolean(theme?.dark);
  const activeVehiclePhoto =
    vehicleProfile?.photo_uri ||
    vehicleProfile?.photoUri ||
    vehicleProfile?.photo ||
    null;

  const displayHealth = typeof healthPercentage === 'number' ? healthPercentage : 44;

  const displayStatusLabel = (
    healthStatus?.label && healthStatus.label !== 'No maintenance activity yet'
      ? healthStatus.label
      : (typeof healthStatus === 'string' && healthStatus !== 'No maintenance activity yet'
          ? healthStatus
          : (displayHealth >= 80 ? 'Looking good' : 'Needs attention'))
  );

  const vehicleName = getVehicleDisplayName(vehicleProfile, 'Your Vehicle');
  const vehicleDetails = getVehicleDisplayDetails(vehicleProfile, 'Vehicle information').replace('•', '·');
  const vehicleIconName = getVehicleIconName(vehicleProfile);

  const renderRecommendation = ({ item }) => {
    const completed = isRecommendationCompleted(item.id || item);
    const categoryName = typeof item.category === 'string'
      ? item.category.toUpperCase()
      : (item.category?.name || 'CARE').toUpperCase();

    const isSafety = item.isSafetyCritical || isTaskSafetyCritical(item);
    const sourceLabel = item.source_label || (item.source === 'diagnostic'
      ? 'Diagnostic Follow-up'
      : (item.source === 'scheduled' ? 'Scheduled Maintenance' : 'Preventive Tip'));

    const statusTag = isSafety
      ? 'SAFETY CHECK'
      : (item.source === 'diagnostic'
        ? 'INSPECT SOON'
        : (item.source === 'scheduled' ? 'DUE BY SCHEDULE' : 'PREVENTIVE CARE'));

    const statusColor = isSafety ? '#FF5A5F' : (item.source === 'diagnostic' ? '#F5501C' : (item.source === 'scheduled' ? '#38BDF8' : '#32D583'));

    const whySuggested = item.why_suggested || (
      item.source === 'diagnostic'
        ? (item.relatedProblem ? `Your previous diagnosis mentioned "${item.relatedProblem}".` : 'Identified during recent vehicle diagnostics.')
        : (item.source === 'scheduled'
          ? 'Based on standard vehicle maintenance intervals.'
          : 'General preventive advice tailored for your vehicle type.')
    );

    const timingText = item.timing || item.when_due || (isSafety ? 'Check before your next ride' : 'Confirm using owner manual and actual condition');

    return (
      <View style={[styles.recCard, completed && styles.recCardCompleted]} key={item.id}>
        {/* Top Badges Row: Category & Status */}
        <View style={styles.recTopRow}>
          <View style={styles.catBadge}>
            <Text style={styles.catBadgeText}>{categoryName}</Text>
          </View>

          <View style={[styles.statusTagBadge, { backgroundColor: `${statusColor}18`, borderColor: `${statusColor}40` }]}>
            <Text style={[styles.statusTagText, { color: statusColor }]}>{statusTag}</Text>
          </View>
        </View>

        {/* 1. What should I do? */}
        <Text style={[styles.recTitleText, completed && styles.completedText]}>
          {item.what_to_do || item.title}
        </Text>

        {/* 2. Why should I do it? */}
        <Text style={[styles.recSubtitleText, completed && { opacity: 0.6 }]}>
          {item.why_it_matters || item.reason || item.preventive_action || item.description}
        </Text>

        {/* 3. Why this was suggested? (Source Attribution Box) */}
        <View style={styles.whySuggestedBox}>
          <View style={styles.whySuggestedHeader}>
            <Icon name="search" size={13} color="#F5501C" />
            <Text style={styles.whySuggestedHeaderTitle}>WHY THIS WAS SUGGESTED</Text>
          </View>

          <Text style={styles.whySuggestedBodyText}>
            {whySuggested}
          </Text>

          <View style={styles.whySuggestedFooter}>
            <View style={styles.sourceMetaRow}>
              <Icon name="label-outline" size={12} color="#8E8E93" />
              <Text style={styles.sourceMetaText}>{sourceLabel}</Text>
            </View>

            <View style={styles.sourceMetaRow}>
              <Icon name="schedule" size={12} color="#8E8E93" />
              <Text style={styles.sourceMetaText} numberOfLines={1}>{timingText}</Text>
            </View>
          </View>
        </View>

        {/* 4. What should I do next? (Actions Row) */}
        <View style={styles.recActionRow}>
          <TouchableOpacity
            style={styles.viewRecButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MaintenanceGuide', { item })}
          >
            <Icon name="north-east" size={14} color="#F5501C" />
            <Text style={styles.viewRecButtonText}>View inspection guide</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.doneCheckBtn,
              completed && styles.doneCheckBtnActive,
            ]}
            activeOpacity={0.8}
            onPress={() => completed ? undoRecommendation(item) : completeRecommendation(item)}
          >
            <Icon
              name={completed ? 'check-circle' : 'radio-button-unchecked'}
              size={17}
              color={completed ? '#32D583' : '#8E8E93'}
            />
            <Text style={[styles.doneCheckText, completed && { color: '#32D583' }]}>
              {completed ? 'Inspected' : 'Mark Inspected'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (showSkeleton) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
          },
        ]}
      >
        <SkeletonLoader variant="smartTips" />
      </SafeAreaView>
    );
  }

  if (!vehicleProfile) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
          },
        ]}
      >
        <View style={styles.emptyContainer}>
          <Text
            style={[
              styles.emptyTitle,
              {
                color: theme.text,
              },
            ]}
          >
            No vehicle selected
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            Add a vehicle to receive personalized maintenance recommendations.
          </Text>
          <TouchableOpacity
            style={[
              styles.emptyButton,
              {
                backgroundColor: theme.accent,
              },
            ]}
            onPress={() => navigation.navigate('Vehicles')}
            accessibilityRole="button"
          >
            <Text style={styles.emptyButtonText}>Add Vehicle</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const allCompleted = completedCount === recommendations.length;

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
      edges={['top']}
    >
      <ScrollView
        ref={mainScrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* TOP HEADER */}
        <View style={styles.screenHeader}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Icon name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>

            <View>
              <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>
                PERSONALIZED CARE
              </Text>
              <Text style={[styles.screenTitle, { color: theme.text }]}>
                Smart Recommendations
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => navigation.openDrawer?.() || navigation.getParent()?.openDrawer?.()}
            accessibilityLabel="Open Menu"
          >
            <Icon name="menu" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* COMPACT VEHICLE HEADER & SECONDARY HEALTH CHIP */}
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
                  name={getVehicleIconName(vehicleProfile)}
                  size={22}
                  color="#F5501C"
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
              <Icon name="unfold-more" size={16} color="#F5501C" />
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

        {/* PROGRESS CARD */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressTitle}>Your progress</Text>
            <Text style={styles.progressCountText}>
              {completedCount} of {recommendations.length} completed
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: healthTheme.color,
                  width: progressWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
        </View>

        {/* FILTER PILLS */}
        {recommendations.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsRow}
          >
            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === 'all' && styles.filterPillActive,
              ]}
              onPress={() => handleTabChange('all')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === 'all' && styles.filterPillTextActive,
                ]}
              >
                All {recommendations.length}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === 'do_this_now' && styles.filterPillActive,
              ]}
              onPress={() => handleTabChange('do_this_now')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === 'do_this_now' && styles.filterPillTextActive,
                ]}
              >
                Do This Now {triSections.doThisNow.length > 0 ? triSections.doThisNow.length : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === 'coming_up_soon' && styles.filterPillActive,
              ]}
              onPress={() => handleTabChange('coming_up_soon')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === 'coming_up_soon' && styles.filterPillTextActive,
                ]}
              >
                Coming Soon {triSections.comingUpSoon.length > 0 ? triSections.comingUpSoon.length : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                activeTab === 'helpful_tips' && styles.filterPillActive,
              ]}
              onPress={() => handleTabChange('helpful_tips')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterPillText,
                  activeTab === 'helpful_tips' && styles.filterPillTextActive,
                ]}
              >
                Helpful Tips {triSections.helpfulTips.length > 0 ? triSections.helpfulTips.length : ''}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : null}

        {/* SECTION HEADER */}
        <View style={styles.sectionHeaderRow}>
          <Icon name="event" size={17} color="#F5501C" />
          <Text style={styles.sectionTitleText}>
            {activeTab === 'do_this_now'
              ? 'Do this now'
              : activeTab === 'coming_up_soon'
              ? 'Coming up soon'
              : activeTab === 'helpful_tips'
              ? 'Helpful tips'
              : 'Coming up soon'}
          </Text>
        </View>

        {/* RECOMMENDATION LIST */}
        <View style={styles.recommendationList}>
          {currentTabItems.length === 0 ? (
            <View style={styles.emptyNoticeBox}>
              <Icon name="check-circle" size={20} color="#32D583" style={{ marginRight: 8 }} />
              <Text style={styles.emptyNoticeText}>
                No pending items in this category. Everything is up to date!
              </Text>
            </View>
          ) : (
            <View>
              {paginatedRecItems.map(item => (
                <View key={item.id}>{renderRecommendation({ item })}</View>
              ))}
            </View>
          )}

          {/* PAGINATION CONTROLS */}
          {currentTabItems.length > REC_PAGE_SIZE && (
            <View style={styles.paginationContainer}>
              <Text style={styles.paginationSummary}>
                Showing {((recPage - 1) * REC_PAGE_SIZE) + 1}–{Math.min(recPage * REC_PAGE_SIZE, currentTabItems.length)} of {currentTabItems.length} recommendations
              </Text>
              <View style={styles.paginationControls}>
                <TouchableOpacity
                  style={[
                    styles.pageNavButton,
                    { opacity: recPage === 1 ? 0.4 : 1 },
                  ]}
                  disabled={recPage === 1}
                  onPress={() => handlePageChange(Math.max(1, recPage - 1))}
                >
                  <Icon name="chevron-left" size={18} color="#FFFFFF" />
                  <Text style={styles.pageNavButtonText}>Prev</Text>
                </TouchableOpacity>

                <View style={styles.pagePillsRow}>
                  {Array.from({ length: totalRecPages }, (_, idx) => idx + 1).map(pageNum => {
                    const isActive = pageNum === recPage;
                    return (
                      <TouchableOpacity
                        key={pageNum}
                        style={[
                          styles.pagePill,
                          isActive && styles.pagePillActive,
                        ]}
                        onPress={() => handlePageChange(pageNum)}
                      >
                        <Text
                          style={[
                            styles.pagePillText,
                            isActive && styles.pagePillTextActive,
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
                    { opacity: recPage >= totalRecPages ? 0.4 : 1 },
                  ]}
                  disabled={recPage >= totalRecPages}
                  onPress={() => handlePageChange(Math.min(totalRecPages, recPage + 1))}
                >
                  <Text style={styles.pageNavButtonText}>Next</Text>
                  <Icon name="chevron-right" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* FOOTER NOTE */}
        <View style={styles.footerNoteRow}>
          <Icon name="auto-awesome" size={14} color="#F5501C" />
          <Text style={styles.footerNoteText}>
            Tailored to your vehicle, recent diagnostics and completed maintenance.
          </Text>
        </View>
      </ScrollView>

      {/* FULL DIAGNOSIS DETAILS MODAL */}
      <Modal
        visible={Boolean(selectedDiagnosisModal)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDiagnosisModal(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedDiagnosisModal(null)}
          />
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View style={styles.modalHeaderLeft}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Diagnosis Report</Text>
                <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                  {vehicleName}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceAlt || '#242424' }]}
                onPress={() => setSelectedDiagnosisModal(null)}
                accessibilityLabel="Close diagnosis report"
              >
                <Icon name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {selectedDiagnosisModal && (
                <>
                  {/* Severity Badge & Problem Title */}
                  <View style={styles.modalProblemSection}>
                    <View
                      style={[
                        styles.severityBadge,
                        {
                          backgroundColor:
                            selectedDiagnosisModal.severity.includes('crit') ||
                            selectedDiagnosisModal.severity.includes('high') ||
                            selectedDiagnosisModal.severity.includes('urg')
                              ? 'rgba(255, 90, 95, 0.16)'
                              : 'rgba(246, 59, 5, 0.16)',
                          borderColor:
                            selectedDiagnosisModal.severity.includes('crit') ||
                            selectedDiagnosisModal.severity.includes('high') ||
                            selectedDiagnosisModal.severity.includes('urg')
                              ? '#FF5A5F'
                              : theme.accent,
                        },
                      ]}
                    >
                      <Icon
                        name={
                          selectedDiagnosisModal.severity.includes('crit') ||
                          selectedDiagnosisModal.severity.includes('high') ||
                          selectedDiagnosisModal.severity.includes('urg')
                            ? 'warning'
                            : 'error-outline'
                        }
                        size={14}
                        color={
                          selectedDiagnosisModal.severity.includes('crit') ||
                          selectedDiagnosisModal.severity.includes('high') ||
                          selectedDiagnosisModal.severity.includes('urg')
                            ? '#FF5A5F'
                            : theme.accent
                        }
                      />
                      <Text
                        style={[
                          styles.severityBadgeText,
                          {
                            color:
                              selectedDiagnosisModal.severity.includes('crit') ||
                              selectedDiagnosisModal.severity.includes('high') ||
                              selectedDiagnosisModal.severity.includes('urg')
                                ? '#FF5A5F'
                                : theme.accent,
                          },
                        ]}
                      >
                        {selectedDiagnosisModal.severity.toUpperCase()} PRIORITY
                      </Text>
                    </View>

                    <Text style={[styles.modalProblemTitle, { color: theme.text }]}>
                      {selectedDiagnosisModal.problem}
                    </Text>

                    {selectedDiagnosisModal.createdAt && (
                      <Text style={[styles.modalDateText, { color: theme.textSecondary }]}>
                        Diagnosed on {new Date(selectedDiagnosisModal.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    )}
                  </View>

                  {/* Summary / Analysis */}
                  {Boolean(selectedDiagnosisModal.summary) && (
                    <View style={[styles.modalSectionCard, { backgroundColor: theme.surfaceAlt || '#1C1C1C', borderColor: theme.border }]}>
                      <View style={styles.modalSectionHeaderRow}>
                        <Icon name="description" size={16} color={theme.accent} />
                        <Text style={[styles.modalSectionHeading, { color: theme.text }]}>Summary & Analysis</Text>
                      </View>
                      <Text style={[styles.modalBodyText, { color: theme.textSecondary }]}>
                        {selectedDiagnosisModal.summary}
                      </Text>
                    </View>
                  )}

                  {/* Symptoms */}
                  {selectedDiagnosisModal.symptoms.length > 0 && (
                    <View style={[styles.modalSectionCard, { backgroundColor: theme.surfaceAlt || '#1C1C1C', borderColor: theme.border }]}>
                      <View style={styles.modalSectionHeaderRow}>
                        <Icon name="hearing" size={16} color="#F59E0B" />
                        <Text style={[styles.modalSectionHeading, { color: theme.text }]}>Symptoms Observed</Text>
                      </View>
                      {selectedDiagnosisModal.symptoms.map((symptom, idx) => (
                        <View key={idx} style={styles.bulletItemRow}>
                          <View style={[styles.bulletDot, { backgroundColor: '#F59E0B' }]} />
                          <Text style={[styles.bulletText, { color: theme.text }]}>{symptom}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Possible Causes */}
                  {selectedDiagnosisModal.causes.length > 0 && (
                    <View style={[styles.modalSectionCard, { backgroundColor: theme.surfaceAlt || '#1C1C1C', borderColor: theme.border }]}>
                      <View style={styles.modalSectionHeaderRow}>
                        <Icon name="search" size={16} color="#38BDF8" />
                        <Text style={[styles.modalSectionHeading, { color: theme.text }]}>Possible Causes</Text>
                      </View>
                      {selectedDiagnosisModal.causes.map((cause, idx) => (
                        <View key={idx} style={styles.bulletItemRow}>
                          <View style={[styles.bulletDot, { backgroundColor: '#38BDF8' }]} />
                          <Text style={[styles.bulletText, { color: theme.text }]}>{cause}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Recommended Actions */}
                  {selectedDiagnosisModal.actions.length > 0 && (
                    <View style={[styles.modalSectionCard, { backgroundColor: theme.surfaceAlt || '#1C1C1C', borderColor: theme.border }]}>
                      <View style={styles.modalSectionHeaderRow}>
                        <Icon name="check-circle-outline" size={16} color="#32D583" />
                        <Text style={[styles.modalSectionHeading, { color: theme.text }]}>Recommended Actions</Text>
                      </View>
                      {selectedDiagnosisModal.actions.map((act, idx) => (
                        <View key={idx} style={styles.stepItemRow}>
                          <View style={[styles.stepNumberBadge, { backgroundColor: 'rgba(50, 213, 131, 0.16)' }]}>
                            <Text style={[styles.stepNumberText, { color: '#32D583' }]}>{idx + 1}</Text>
                          </View>
                          <Text style={[styles.stepText, { color: theme.text }]}>{act}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Troubleshooting Steps */}
                  {selectedDiagnosisModal.steps.length > 0 && (
                    <View style={[styles.modalSectionCard, { backgroundColor: theme.surfaceAlt || '#1C1C1C', borderColor: theme.border }]}>
                      <View style={styles.modalSectionHeaderRow}>
                        <Icon name="build" size={16} color={theme.accent} />
                        <Text style={[styles.modalSectionHeading, { color: theme.text }]}>Troubleshooting Steps</Text>
                      </View>
                      {selectedDiagnosisModal.steps.map((step, idx) => (
                        <View key={idx} style={styles.stepItemRow}>
                          <View style={[styles.stepNumberBadge, { backgroundColor: theme.accentSoft }]}>
                            <Text style={[styles.stepNumberText, { color: theme.accent }]}>{idx + 1}</Text>
                          </View>
                          <Text style={[styles.stepText, { color: theme.text }]}>{step}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Action buttons */}
                  <View style={styles.modalActionsContainer}>
                    <TouchableOpacity
                      style={[styles.modalActionGuide, { backgroundColor: theme.accent }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        const targetItem = selectedDiagnosisModal.item;
                        setSelectedDiagnosisModal(null);
                        navigation.navigate('MaintenanceGuide', { item: targetItem });
                      }}
                    >
                      <Icon name="menu-book" size={18} color="#FFFFFF" />
                      <Text style={styles.modalActionGuideText}>Open Step-by-Step DIY Guide</Text>
                      <Icon name="arrow-forward" size={16} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.modalActionsRow}>
                      <TouchableOpacity
                        style={[styles.modalActionPrimary, { backgroundColor: theme.accentSoft, borderColor: theme.accent, borderWidth: 1 }]}
                        activeOpacity={0.85}
                        onPress={() => {
                          const problemText = selectedDiagnosisModal.problem;
                          setSelectedDiagnosisModal(null);
                          navigation.navigate('AskVehiCare', {
                            initialPrompt: `I need advice regarding: ${problemText}`,
                          });
                        }}
                      >
                        <Icon name="auto-awesome" size={16} color={theme.accent} />
                        <Text style={[styles.modalActionPrimaryText, { color: theme.accent }]}>Ask VehiCare AI</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalActionSecondary, { borderColor: theme.border, backgroundColor: theme.surface }]}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedDiagnosisModal(null);
                          navigation.navigate('RepairShops');
                        }}
                      >
                        <Icon name="place" size={16} color={theme.text} />
                        <Text style={[styles.modalActionSecondaryText, { color: theme.text }]}>Find Repair Shop</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
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
  scrollContent: {
    padding: 18,
    paddingBottom: 28,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 20,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyButtonText: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFF',
    fontSize: 13,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  screenTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    letterSpacing: -0.4,
  },

  /* COMPACT VEHICLE CARD (Identical to MaintenanceScreen) */
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
    color: '#F5501C',
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

  /* PROGRESS CARD */
  progressCard: {
    backgroundColor: '#16161A',
    borderColor: '#232328',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  progressCountText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#8E8E93',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#26262B',
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F5501C',
    borderRadius: 3,
  },

  /* FILTER PILLS */
  filterPillsRow: {
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#16161A',
    borderColor: '#232328',
  },
  filterPillActive: {
    backgroundColor: '#F5501C',
    borderColor: '#F5501C',
  },
  filterPillText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: '#8E8E93',
  },
  filterPillTextActive: {
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
  },

  /* SECTION HEADER */
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitleText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },

  /* RECOMMENDATION LIST */
  recommendationList: {
    marginBottom: 20,
  },
  emptyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16161A',
    borderWidth: 1,
    borderColor: '#232328',
    borderRadius: 14,
    padding: 14,
    marginVertical: 12,
  },
  emptyNoticeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: '#8E8E93',
    flex: 1,
  },

  /* RECOMMENDATION CARD */
  recCard: {
    backgroundColor: '#16161A',
    borderColor: '#232328',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  recCardCompleted: {
    opacity: 0.75,
  },
  completedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  recTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catBadge: {
    backgroundColor: '#222228',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#FFFFFF',
  },
  statusTagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusTagText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  recTitleText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#FFFFFF',
    marginTop: 10,
  },
  recSubtitleText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#8E8E93',
    lineHeight: 17,
    marginTop: 4,
  },
  whySuggestedBox: {
    backgroundColor: '#1A1716',
    borderWidth: 1,
    borderColor: '#33241C',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  whySuggestedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  whySuggestedHeaderTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    color: '#F5501C',
  },
  whySuggestedBodyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    color: '#E4E4E7',
    lineHeight: 18,
    marginBottom: 8,
  },
  whySuggestedFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#2B2019',
    paddingTop: 8,
  },
  sourceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sourceMetaText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#9CA3AF',
  },
  recActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#232328',
  },
  viewRecButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewRecButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#F5501C',
  },
  doneCheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#232328',
  },
  doneCheckBtnActive: {
    borderColor: 'rgba(50, 213, 131, 0.4)',
    backgroundColor: 'rgba(50, 213, 131, 0.1)',
  },
  doneCheckText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#8E8E93',
  },

  /* FOOTER NOTE */
  footerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 36,
    paddingHorizontal: 20,
  },
  footerNoteText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    flex: 1,
  },

  /* PAGINATION */
  paginationContainer: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#232328',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  paginationSummary: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    color: '#8E8E93',
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
    borderColor: '#232328',
    backgroundColor: '#16161A',
    gap: 4,
  },
  pageNavButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
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
    borderColor: '#232328',
    backgroundColor: '#16161A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pagePillActive: {
    backgroundColor: '#F5501C',
    borderColor: '#F5501C',
  },
  pagePillText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
    color: '#8E8E93',
  },
  pagePillTextActive: {
    color: '#FFFFFF',
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    padding: 20,
    gap: 14,
  },
  modalProblemSection: {
    marginBottom: 4,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  severityBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  modalProblemTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    lineHeight: 24,
  },
  modalDateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 4,
  },
  modalSectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  modalSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  modalSectionHeading: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
  },
  modalBodyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
  bulletItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  bulletText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
  },
  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10.5,
  },
  stepText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  viewGuideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 4,
  },
  viewGuideButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewGuideButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
  },
  modalActionsContainer: {
    marginTop: 10,
    gap: 8,
  },
  modalActionGuide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  modalActionGuideText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
  },
  modalActionPrimaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  modalActionSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalActionSecondaryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  tabFilterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 14,
    flexWrap: 'wrap',
  },
  tabFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabFilterText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  tabFilterCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  triSectionHeader: {
    flexDirection: 'column',
    gap: 4,
    marginBottom: 12,
    marginTop: 8,
  },
  triSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  triSectionBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  triSectionSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
    marginLeft: 2,
  },
});

export default SmartRecommendationsScreen;
