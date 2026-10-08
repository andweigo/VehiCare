import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
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
import { useAuth } from '../context/AuthContext';
import { useVehicle } from '../context/VehicleContext';
import useVehicleHealth from '../hooks/useVehicleHealth';
import { getHistoryStorageKey, loadActiveChatSessions } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';
import {
  getVehicleDisplayDetails,
  getVehicleDisplayName,
} from '../utils/vehicleDisplay';
import {
  extractDiagnosticRecommendations,
  getHealthBarColor,
  getVehicleIconName,
  getVehicleRecommendations,
  mergeRecommendations,
  normalizeDiagnosticRecord,
} from '../utils/maintenanceUtils';

/*
|--------------------------------------------------------------------------
| SMART RECOMMENDATIONS SCREEN
|--------------------------------------------------------------------------
*/

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
    healthPercentage,
    healthStatus,
    completedRecommendations,
    loading: healthLoading,
  } = useVehicleHealth();

  const [diagnostics, setDiagnostics] = useState([]);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(true);
  const [diagnosticError, setDiagnosticError] = useState(null);

  const [itemOpacity] = useState(new Animated.Value(0));
  const [localCompletedIds, setLocalCompletedIds] = useState([]);
  const [selectedDiagnosisModal, setSelectedDiagnosisModal] = useState(null);

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

  /*
  |--------------------------------------------------------------------------
  | DIAGNOSTIC DATA FETCHING & VEHICLE SCOPING
  |--------------------------------------------------------------------------
  */

  const fetchVehicleDiagnostics = useCallback(async () => {
    if (!vehicleProfile) {
      setDiagnostics([]);
      setLoadingDiagnostics(false);
      return;
    }

    try {
      setLoadingDiagnostics(true);
      setDiagnosticError(null);

      let records = [];

      if (isAuthenticated) {
        try {
          const apiDiags = await vehicleApi.getDiagnosticsHistory();
          if (Array.isArray(apiDiags) && apiDiags.length > 0) {
            records = apiDiags;
          } else {
            const histRes = await vehicleApi.getHistory({ type: 'diagnosis' });
            records = histRes?.data || [];
          }
        } catch (err) {
          console.warn('API error fetching diagnostics:', err?.message);
        }
      }

      if (!records || records.length === 0) {
        try {
          const userId = user?.id || user?.uid || null;
          const localStr = await AsyncStorage.getItem(getHistoryStorageKey(userId));
          if (localStr) {
            const parsed = JSON.parse(localStr);
            if (Array.isArray(parsed)) {
              records = parsed.filter(
                item => item.type === 'diagnosis' || item.diagnosisData || item.symptoms,
              );
            }
          }
        } catch (err) {
          console.warn('Local storage error reading history:', err?.message);
        }
      }

      const filtered = (records || []).filter(item => {
        const itemVid =
          item.vehicle_id ??
          item.vehicleId ??
          item.vehicle?.id ??
          item.vehicle?.vehicle_id ??
          null;

        if (activeVehicleId !== null && itemVid !== null) {
          return String(itemVid) === String(activeVehicleId);
        }
        return true;
      });

      setDiagnostics(filtered);
    } catch (error) {
      console.warn('Error loading vehicle diagnostics:', error?.message);
      setDiagnosticError('Recent diagnostic recommendations are temporarily unavailable.');
    } finally {
      setLoadingDiagnostics(false);
    }
  }, [vehicleProfile, activeVehicleId, isAuthenticated]);

  useEffect(() => {
    fetchVehicleDiagnostics();
  }, [fetchVehicleDiagnostics]);

  /*
  |--------------------------------------------------------------------------
  | RECOMMENDATION COMPUTE & MERGE
  |--------------------------------------------------------------------------
  */

  const baselineRecommendations = useMemo(
    () => getVehicleRecommendations(vehicleProfile),
    [vehicleProfile],
  );

  const diagnosticRecommendations = useMemo(
    () => extractDiagnosticRecommendations(diagnostics),
    [diagnostics],
  );

  const recommendations = useMemo(
    () => mergeRecommendations(diagnosticRecommendations, baselineRecommendations),
    [diagnosticRecommendations, baselineRecommendations],
  );

  /*
  |--------------------------------------------------------------------------
  | COMPLETION STATE PERSISTENCE
  |--------------------------------------------------------------------------
  */

  const completedRecommendationIds = useMemo(() => {
    const ids = new Set();

    if (Array.isArray(completedRecommendations)) {
      completedRecommendations.forEach(item => {
        if (typeof item === 'string') {
          ids.add(item);
        } else if (item && typeof item === 'object') {
          if (item.id) {
            ids.add(item.id);
          } else if (item.recommendationId) {
            ids.add(item.recommendationId);
          }
        }
      });
    }

    localCompletedIds.forEach(id => ids.add(id));

    return ids;
  }, [completedRecommendations, localCompletedIds]);

  const isRecommendationCompleted = useCallback(
    id => completedRecommendationIds.has(id),
    [completedRecommendationIds],
  );

  const completeRecommendation = useCallback(item => {
    const id = item?.id;
    if (!id) return;

    setLocalCompletedIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const undoRecommendation = useCallback(id => {
    if (!id) return;

    setLocalCompletedIds(prev => prev.filter(itemId => itemId !== id));
  }, []);

  useEffect(() => {
    Animated.timing(itemOpacity, {
      toValue: 1,
      duration: 380,
      useNativeDriver: true,
    }).start();
  }, [itemOpacity]);

  const completedCount = recommendations.filter(recommendation =>
    isRecommendationCompleted(recommendation.id),
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

  const healthBarColor = useMemo(() => {
    if (healthPercentage >= 80) {
      return theme.success || '#35B86B';
    }
    if (healthPercentage >= 60) {
      return theme.accent;
    }
    if (healthPercentage >= 40) {
      return '#D6A23A';
    }
    return '#FF5A5F';
  }, [healthPercentage, theme]);

  const vehicleName = getVehicleDisplayName(vehicleProfile, 'Your Vehicle');
  const vehicleDetails = getVehicleDisplayDetails(vehicleProfile, 'Vehicle information');
  const vehicleIconName = getVehicleIconName(vehicleProfile);

  const renderRecommendation = ({ item }) => {
    const completed = isRecommendationCompleted(item.id);

    return (
      <Animated.View
        style={[
          styles.recommendationWrapper,
          {
            opacity: itemOpacity,
            transform: [
              {
                scale: itemOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.97, 1],
                }),
              },
            ],
          },
        ]}
      >
        <View
          style={[
            styles.recommendationCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.recommendationHeader}>
            <View
              style={[
                styles.recommendationIcon,
                {
                  backgroundColor: theme.accentSoft,
                },
              ]}
            >
              <Icon name={item.icon} size={20} color={theme.accent} />
            </View>

            <View style={styles.recommendationTitleBlock}>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.sourceBadge,
                    item.source === 'diagnostic'
                      ? { backgroundColor: theme.accentSoft, borderColor: theme.accent }
                      : { backgroundColor: theme.border, borderColor: theme.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.sourceBadgeText,
                      item.source === 'diagnostic'
                        ? { color: theme.accent }
                        : { color: theme.textSecondary },
                    ]}
                  >
                    {item.source === 'diagnostic' ? 'DIAGNOSTIC' : 'PREVENTIVE MAINTENANCE'}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.recommendationCategory,
                    {
                      color: theme.textSecondary,
                    },
                  ]}
                >
                  {item.category.toUpperCase()}
                </Text>
              </View>

              <Text
                style={[
                  styles.recommendationTitle,
                  {
                    color: theme.text,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.title}
              </Text>
            </View>
          </View>

          {item.source === 'diagnostic' && item.relatedProblem ? (
            <View style={[styles.relatedBox, { backgroundColor: theme.border, borderColor: theme.border }]}>
              <Text style={[styles.relatedLabel, { color: theme.textSecondary }]}>Related to:</Text>
              <Text style={[styles.relatedTitle, { color: theme.text }]} numberOfLines={1}>
                {item.relatedProblem}
              </Text>
            </View>
          ) : null}

          <Text
            style={[
              styles.recommendationDescription,
              {
                color: theme.textSecondary,
              },
            ]}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {item.description}
          </Text>

          {item.source === 'diagnostic' ? (
            <TouchableOpacity
              style={styles.viewDiagnosisButton}
              onPress={() => handleOpenDiagnosisModal(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewDiagnosisText, { color: theme.accent }]}>View Full Diagnosis</Text>
              <Icon name="visibility" size={16} color={theme.accent} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.recommendationFooter}>
            <View>
              <Text
                style={[
                  styles.priorityLabel,
                  {
                    color: theme.textSecondary,
                  },
                ]}
              >
                {item.priority.toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.healthImpact,
                  {
                    color: healthBarColor,
                  },
                ]}
              >
                +{item.scoreImpact} HEALTH
              </Text>
            </View>

            {completed ? (
              <View style={styles.completedRow}>
                <Icon
                  name="check-circle"
                  size={18}
                  color={theme.success || '#35B86B'}
                />
                <TouchableOpacity
                  style={styles.undoButton}
                  onPress={() => undoRecommendation(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Undo ${item.title}`}
                >
                  <Text
                    style={[
                      styles.undoText,
                      {
                        color: theme.accent,
                      },
                    ]}
                  >
                    Undo
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.completeButton,
                  {
                    backgroundColor: theme.accent,
                  },
                ]}
                onPress={() => completeRecommendation(item)}
                accessibilityRole="button"
                accessibilityLabel={`Mark ${item.title} as done`}
              >
                <Text
                  style={[
                    styles.completeButtonText,
                    {
                      color: theme.surface,
                    },
                  ]}
                >
                  Mark as Done
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  if (healthLoading || loadingDiagnostics) {
    return (
      <SafeAreaView
        style={[
          styles.loadingContainer,
          {
            backgroundColor: theme.background,
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.accent} />
        <Text
          style={[
            styles.loadingText,
            {
              color: theme.text,
            },
          ]}
        >
          Loading recommendations...
        </Text>
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
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.screenHeader}>
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Icon name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.titleBlock}>
            <Text
              style={[
                styles.screenTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              Smart Recommendations
            </Text>
            <Text
              style={[
                styles.screenSubtitle,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              Personalized advice for your vehicle
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.vehicleSummary,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionLabel,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            RECOMMENDATIONS FOR
          </Text>
          <View style={styles.vehicleSummaryHeader}>
            <View
              style={[
                styles.vehicleIconContainer,
                {
                  backgroundColor: theme.accentSoft,
                },
              ]}
            >
              <Icon
                name={vehicleIconName}
                size={24}
                color={theme.accent}
              />
            </View>

            <View style={styles.vehicleSummaryText}>
              <Text
                style={[
                  styles.vehicleSummaryTitle,
                  {
                    color: theme.text,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {vehicleName}
              </Text>
              <Text
                style={[
                  styles.vehicleSummaryDetails,
                  {
                    color: theme.textSecondary,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {vehicleDetails}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.healthSummary,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.sectionLabel,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            CURRENT VEHICLE HEALTH
          </Text>

          <View style={styles.healthValueRow}>
            <Text
              style={[
                styles.healthValue,
                {
                  color: healthBarColor,
                },
              ]}
            >
              {healthPercentage}
            </Text>
            <Text
              style={[
                styles.healthPercent,
                {
                  color: healthBarColor,
                },
              ]}
            >
              %
            </Text>
          </View>

          <Text
            style={[
              styles.healthStatusLabel,
              {
                color: healthBarColor,
              },
            ]}
          >
            {healthStatus.label}
          </Text>

          <View
            style={[
              styles.healthTrack,
              {
                backgroundColor: theme.border,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.healthFill,
                {
                  width: `${healthPercentage}%`,
                  backgroundColor: healthBarColor,
                },
              ]}
            />
          </View>

          <Text
            style={[
              styles.healthExplanation,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            Based on your vehicle information, recent diagnostic results, and completed maintenance actions.
          </Text>
        </View>

        {/* DIAGNOSTIC STATE INFORMATIONAL NOTICE */}
        {diagnosticError ? (
          <View style={[styles.noticeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Icon name="info-outline" size={20} color={theme.accent} style={{ marginRight: 10 }} />
            <Text style={[styles.noticeText, { color: theme.textSecondary }]}>
              Recent diagnostic recommendations are temporarily unavailable. Showing preventive maintenance recommendations instead.
            </Text>
          </View>
        ) : !loadingDiagnostics && diagnosticRecommendations.length === 0 ? (
          <View style={[styles.noticeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Icon name="check-circle-outline" size={20} color={theme.accent} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.noticeTitle, { color: theme.text }]}>No recent diagnostic issues were found.</Text>
              <Text style={[styles.noticeSubtitle, { color: theme.textSecondary }]}>
                VehiCare will continue to provide preventive maintenance recommendations based on your vehicle.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.progressSection}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: theme.text,
              },
            ]}
          >
            YOUR PROGRESS
          </Text>
          <Text
            style={[
              styles.sectionSubtitle,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            {completedCount} of {recommendations.length} recommendations completed
          </Text>

          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor: theme.border,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressWidth.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: theme.accent,
                },
              ]}
            />
          </View>
        </View>

        {allCompleted ? (
          <View
            style={[
              styles.completeSummary,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Icon
              name="check-circle"
              size={28}
              color={theme.success || '#35B86B'}
            />
            <View style={styles.completeSummaryText}>
              <Text
                style={[
                  styles.completeSummaryTitle,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Vehicle looking good
              </Text>
              <Text
                style={[
                  styles.completeSummarySubtitle,
                  {
                    color: theme.textSecondary,
                  },
                ]}
              >
                You've completed all of VehiCare's current recommendations for this vehicle. Keep following your maintenance schedule to maintain its health.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.recommendationList}>
          <FlatList
            data={recommendations}
            keyExtractor={item => item.id}
            renderItem={renderRecommendation}
            scrollEnabled={false}
            contentContainerStyle={styles.recommendationListContent}
          />
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
                  <View style={styles.modalActionsRow}>
                    <TouchableOpacity
                      style={[styles.modalActionPrimary, { backgroundColor: theme.accent }]}
                      activeOpacity={0.85}
                      onPress={() => {
                        const problemText = selectedDiagnosisModal.problem;
                        setSelectedDiagnosisModal(null);
                        navigation.navigate('AskVehiCare', {
                          initialPrompt: `I need advice regarding: ${problemText}`,
                        });
                      }}
                    >
                      <Icon name="auto-awesome" size={18} color="#FFFFFF" />
                      <Text style={styles.modalActionPrimaryText}>Ask VehiCare AI</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalActionSecondary, { borderColor: theme.border, backgroundColor: theme.surface }]}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedDiagnosisModal(null);
                        navigation.navigate('RepairShops');
                      }}
                    >
                      <Icon name="place" size={18} color={theme.text} />
                      <Text style={[styles.modalActionSecondaryText, { color: theme.text }]}>Find Repair Shop</Text>
                    </TouchableOpacity>
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
    marginBottom: 22,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  titleBlock: {
    flex: 1,
  },
  screenTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 22,
    lineHeight: 28,
  },
  screenSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 4,
  },
  vehicleSummary: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  sectionLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 10,
  },
  vehicleSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  vehicleSummaryText: {
    flex: 1,
  },
  vehicleSummaryTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  vehicleSummaryDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  healthSummary: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  healthValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 10,
  },
  healthValue: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 38,
    lineHeight: 44,
  },
  healthPercent: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 22,
    lineHeight: 28,
    marginLeft: 6,
  },
  healthStatusLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    lineHeight: 18,
    marginTop: 6,
  },
  healthTrack: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 14,
  },
  healthFill: {
    height: '100%',
    borderRadius: 999,
  },
  healthExplanation: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 14,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  noticeTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13.5,
    marginBottom: 2,
  },
  noticeSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
  },
  noticeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  progressSection: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1,
  },
  sectionSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 4,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  completeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  completeSummaryText: {
    flex: 1,
    marginLeft: 12,
  },
  completeSummaryTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
    lineHeight: 22,
  },
  completeSummarySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  recommendationList: {
    marginBottom: 30,
  },
  recommendationListContent: {
    paddingBottom: 10,
  },
  recommendationWrapper: {
    marginBottom: 14,
  },
  recommendationCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recommendationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  recommendationTitleBlock: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sourceBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sourceBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  recommendationCategory: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1,
  },
  recommendationTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
    lineHeight: 20,
  },
  relatedBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  relatedLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  relatedTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginTop: 2,
  },
  recommendationDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  viewDiagnosisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewDiagnosisText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    marginRight: 4,
  },
  recommendationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priorityLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 4,
  },
  healthImpact: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
    lineHeight: 16,
  },
  completeButton: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  completeButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  undoButton: {
    marginLeft: 10,
  },
  undoText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    textTransform: 'uppercase',
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
    fontFamily: 'Outfit-SemiBold',
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
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
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
    fontFamily: 'Outfit-Bold',
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
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
  },
});

export default SmartRecommendationsScreen;
