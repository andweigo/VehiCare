import { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useVehicle } from '../context/VehicleContext';
import useMaintenanceRecommendations from '../hooks/useMaintenanceRecommendations';
import { useTheme } from '../theme/ThemeContext';
import {
  ensureRecommendationGuide,
  resolveVehicleTypeString,
} from '../utils/maintenanceUtils';
import { getVehicleDisplayName } from '../utils/vehicleDisplay';

const MaintenanceGuideScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { item } = route.params || {};

  const { activeVehicle, pendingVehicle } = useVehicle();
  const vehicleProfile = activeVehicle || pendingVehicle;
  const { markAsDone } = useMaintenanceRecommendations();

  // Resolve step-by-step guide
  const guide = useMemo(
    () => ensureRecommendationGuide(item, vehicleProfile),
    [item, vehicleProfile],
  );

  const steps = guide?.steps || [];
  const totalSteps = steps.length;

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [outcomeStatus, setOutcomeStatus] = useState(null); // 'success' | 'failure' | null
  const [isDoneSaved, setIsDoneSaved] = useState(false);

  const activeStepData = steps[currentStep] || steps[0] || {};
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const progressPercent = totalSteps > 0 ? Math.round(((currentStep + 1) / totalSteps) * 100) : 100;

  const toggleStepComplete = stepNum => {
    setCompletedSteps(prev =>
      prev.includes(stepNum) ? prev.filter(s => s !== stepNum) : [...prev, stepNum],
    );
  };

  const handleMarkAsDone = async () => {
    if (!item) return;
    try {
      await markAsDone(item);
      setIsDoneSaved(true);
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (err) {
      console.warn('Failed to mark guide item as done:', err);
    }
  };

  if (!item) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Maintenance Guide</Text>
        </View>
        <View style={styles.emptyGuideState}>
          <Icon name="build" size={36} color={theme.textSecondary} />
          <Text style={[styles.emptyGuideText, { color: theme.text }]}>No maintenance task selected.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 1. HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            activeOpacity={0.75}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>
              VEHICARE MAINTENANCE GUIDE
            </Text>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
        </View>

        {/* 2. TASK SUMMARY CARD */}
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: item.source === 'diagnostic' ? theme.accent : theme.border }]}>
          <View style={styles.summaryTopRow}>
            <View style={[styles.summaryIconBox, { backgroundColor: theme.accentSoft }]}>
              <Icon name={item.icon || 'build'} size={24} color={theme.accent} />
            </View>

            <View style={styles.summaryPillRow}>
              {item.source === 'diagnostic' && (
                <View style={[styles.sourceBadge, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
                  <Text style={[styles.sourceBadgeText, { color: theme.accent }]}>DIAGNOSTIC-GUIDED</Text>
                </View>
              )}

              <View style={[styles.difficultyPill, { backgroundColor: theme.surfaceAlt }]}>
                <Icon name="bolt" size={13} color={theme.accent} />
                <Text style={[styles.difficultyText, { color: theme.text }]}>{guide.difficulty || 'Easy'}</Text>
              </View>

              <View style={[styles.timePill, { backgroundColor: theme.surfaceAlt }]}>
                <Icon name="schedule" size={13} color={theme.textSecondary} />
                <Text style={[styles.timeText, { color: theme.textSecondary }]}>{guide.estimatedTime || '10-15 min'}</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.taskTitleText, { color: theme.text }]}>{item.title}</Text>

          {item.relatedProblem ? (
            <View style={[styles.relatedProblemBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
              <Text style={[styles.relatedLabel, { color: theme.textSecondary }]}>Related to diagnosis:</Text>
              <Text style={[styles.relatedProblemText, { color: theme.text }]} numberOfLines={1}>
                "{item.relatedProblem}"
              </Text>
            </View>
          ) : null}

          <Text style={[styles.vehicleContextText, { color: theme.textSecondary }]}>
            Target vehicle: {getVehicleDisplayName(vehicleProfile, 'Active Vehicle')} ({resolveVehicleTypeString(vehicleProfile)})
          </Text>
        </View>

        {/* 3. WHY THIS MATTERS */}
        {guide.whyItMatters ? (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="info-outline" size={18} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>WHY THIS MATTERS</Text>
            </View>
            <Text style={[styles.bodyText, { color: theme.textSecondary }]}>{guide.whyItMatters}</Text>
          </View>
        ) : null}

        {/* 4. WHAT YOU'LL NEED (TOOLS) */}
        {Array.isArray(guide.tools) && guide.tools.length > 0 && (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="home-repair-service" size={18} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>WHAT YOU'LL NEED</Text>
            </View>

            <View style={styles.toolsList}>
              {guide.tools.map((tool, idx) => (
                <View key={idx} style={styles.toolRow}>
                  <Text style={[styles.bulletDot, { color: theme.accent }]}>•</Text>
                  <Text style={[styles.toolText, { color: theme.text }]}>{tool}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 5. SAFETY FIRST */}
        {Array.isArray(guide.safetyNotes) && guide.safetyNotes.length > 0 && (
          <View style={[styles.safetyCard, { backgroundColor: 'rgba(255, 90, 95, 0.08)', borderColor: '#FF5A5F' }]}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="warning" size={18} color="#FF5A5F" />
              <Text style={[styles.sectionTitle, { color: '#FF5A5F' }]}>SAFETY FIRST</Text>
            </View>

            {guide.safetyNotes.map((note, idx) => (
              <View key={idx} style={styles.safetyRow}>
                <Text style={[styles.safetyBullet, { color: '#FF5A5F' }]}>•</Text>
                <Text style={[styles.safetyText, { color: theme.text }]}>{note}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 6. INTERACTIVE STEP-BY-STEP GUIDE */}
        {totalSteps > 0 ? (
          <View style={[styles.guideCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            
            {/* Progress Header */}
            <View style={styles.progressHeaderRow}>
              <Text style={[styles.stepCounterText, { color: theme.accent }]}>
                STEP {currentStep + 1} OF {totalSteps}
              </Text>
              <Text style={[styles.progressPercentText, { color: theme.textSecondary }]}>
                {progressPercent}% Complete
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: theme.accent }]} />
            </View>

            {/* Active Step Content */}
            <View style={styles.stepContentBox}>
              <Text style={[styles.stepTitleText, { color: theme.text }]}>
                {activeStepData.title || `Step ${currentStep + 1}`}
              </Text>

              <Text style={[styles.stepInstructionsText, { color: theme.textSecondary }]}>
                {activeStepData.instructions}
              </Text>

              {activeStepData.check ? (
                <View style={[styles.checkCallout, { backgroundColor: 'rgba(50, 213, 131, 0.08)', borderColor: theme.success || '#32D583' }]}>
                  <Icon name="check-circle-outline" size={18} color={theme.success || '#32D583'} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.calloutTitle, { color: theme.success || '#32D583' }]}>CHECK</Text>
                    <Text style={[styles.calloutBody, { color: theme.text }]}>{activeStepData.check}</Text>
                  </View>
                </View>
              ) : null}

              {activeStepData.warning ? (
                <View style={[styles.warningCallout, { backgroundColor: 'rgba(255, 90, 95, 0.08)', borderColor: '#FF5A5F' }]}>
                  <Icon name="warning" size={18} color="#FF5A5F" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.calloutTitle, { color: '#FF5A5F' }]}>WARNING</Text>
                    <Text style={[styles.calloutBody, { color: theme.text }]}>{activeStepData.warning}</Text>
                  </View>
                </View>
              ) : null}

              {/* Step Completion Checkbox */}
              <TouchableOpacity
                style={[styles.stepCheckRow, { backgroundColor: completedSteps.includes(currentStep + 1) ? theme.accentSoft : theme.surfaceAlt }]}
                activeOpacity={0.8}
                onPress={() => toggleStepComplete(currentStep + 1)}
              >
                <Icon
                  name={completedSteps.includes(currentStep + 1) ? 'check-box' : 'check-box-outline-blank'}
                  size={20}
                  color={completedSteps.includes(currentStep + 1) ? theme.accent : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.stepCheckLabel,
                    { color: completedSteps.includes(currentStep + 1) ? theme.accent : theme.text },
                  ]}
                >
                  {completedSteps.includes(currentStep + 1)
                    ? `Step ${currentStep + 1} completed`
                    : `Mark Step ${currentStep + 1} as completed`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Step Controls */}
            <View style={styles.stepControlsRow}>
              <TouchableOpacity
                style={[
                  styles.controlBtn,
                  { backgroundColor: theme.surfaceAlt, opacity: isFirstStep ? 0.4 : 1 },
                ]}
                disabled={isFirstStep}
                onPress={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              >
                <Icon name="arrow-back" size={18} color={theme.text} />
                <Text style={[styles.controlBtnText, { color: theme.text }]}>Previous</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: theme.accent }]}
                onPress={() => {
                  if (!isLastStep) {
                    setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1));
                  }
                }}
              >
                <Text style={[styles.controlBtnText, { color: '#FFFFFF' }]}>
                  {isLastStep ? 'Final Verification' : 'Next Step'}
                </Text>
                <Icon name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

          </View>
        ) : (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
              Step-by-step guidance is not available for this recommendation yet. Ask VehiCare for assistance.
            </Text>
          </View>
        )}

        {/* 7. FINAL VERIFICATION SCREEN */}
        {isLastStep && guide.completionCheck && (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="verified" size={20} color={theme.accent} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {guide.completionCheck.title || 'FINAL CHECK'}
              </Text>
            </View>

            <Text style={[styles.bodyText, { color: theme.textSecondary, marginBottom: 14 }]}>
              {guide.completionCheck.instructions}
            </Text>

            <Text style={[styles.outcomeQuestionText, { color: theme.text }]}>
              Did the issue improve after completing this maintenance?
            </Text>

            <View style={styles.outcomeBtnRow}>
              <TouchableOpacity
                style={[
                  styles.outcomePill,
                  {
                    backgroundColor: outcomeStatus === 'success' ? 'rgba(50, 213, 131, 0.15)' : theme.surfaceAlt,
                    borderColor: outcomeStatus === 'success' ? (theme.success || '#32D583') : theme.border,
                  },
                ]}
                onPress={() => setOutcomeStatus('success')}
              >
                <Icon name="sentiment-very-satisfied" size={18} color={theme.success || '#32D583'} />
                <Text style={[styles.outcomePillText, { color: theme.text }]}>Yes, issue resolved</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.outcomePill,
                  {
                    backgroundColor: outcomeStatus === 'failure' ? 'rgba(255, 90, 95, 0.15)' : theme.surfaceAlt,
                    borderColor: outcomeStatus === 'failure' ? '#FF5A5F' : theme.border,
                  },
                ]}
                onPress={() => setOutcomeStatus('failure')}
              >
                <Icon name="sentiment-dissatisfied" size={18} color="#FF5A5F" />
                <Text style={[styles.outcomePillText, { color: theme.text }]}>No, issue remains</Text>
              </TouchableOpacity>
            </View>

            {outcomeStatus === 'success' && guide.outcomes?.success ? (
              <Text style={[styles.outcomeNoteText, { color: theme.success || '#32D583' }]}>
                ✓ {guide.outcomes.success}
              </Text>
            ) : null}

            {outcomeStatus === 'failure' && guide.outcomes?.failure ? (
              <Text style={[styles.outcomeNoteText, { color: '#FF5A5F' }]}>
                ⚠ {guide.outcomes.failure}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.markDoneBigBtn,
                { backgroundColor: isDoneSaved ? (theme.success || '#32D583') : theme.accent },
              ]}
              activeOpacity={0.85}
              onPress={handleMarkAsDone}
            >
              <Icon name="check-circle" size={20} color="#FFFFFF" />
              <Text style={styles.markDoneBigBtnText}>
                {isDoneSaved ? 'Maintenance Completed!' : 'Mark Maintenance as Done'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 8. ASK VEHICARE ACTION */}
        <TouchableOpacity
          style={[styles.aiAssistCard, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AskVehiCare')}
        >
          <View style={styles.aiAssistHeader}>
            <Icon name="auto-awesome" size={22} color={theme.accent} />
            <Text style={[styles.aiAssistTitle, { color: theme.text }]}>Still unsure about this maintenance?</Text>
          </View>
          <Text style={[styles.aiAssistSub, { color: theme.textSecondary }]}>
            Ask VehiCare for step-by-step guidance, tool suggestions, or diagnostic advice for {item.title}.
          </Text>
          <View style={styles.aiAssistActionRow}>
            <Text style={[styles.aiAssistActionText, { color: theme.accent }]}>Ask VehiCare →</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitleBox: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 9,
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 22,
  },

  /* SUMMARY CARD */
  summaryCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  sourceBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8.5,
    letterSpacing: 0.5,
  },
  difficultyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  difficultyText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
  },
  timeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
  },
  taskTitleText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    marginBottom: 6,
  },
  relatedProblemBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  relatedLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  relatedProblemText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    flex: 1,
  },
  vehicleContextText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
  },

  /* SECTION CARDS */
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  safetyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    letterSpacing: 0.8,
  },
  bodyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  toolsList: {
    gap: 6,
    marginTop: 4,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulletDot: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
  toolText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  safetyBullet: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
  safetyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },

  /* GUIDE INTERACTIVE CARD */
  guideCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepCounterText: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  progressPercentText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepContentBox: {
    marginBottom: 20,
  },
  stepTitleText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    marginBottom: 8,
  },
  stepInstructionsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 14,
  },
  checkCallout: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  warningCallout: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  calloutTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  calloutBody: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    lineHeight: 17,
  },
  stepCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
  },
  stepCheckLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
  },
  stepControlsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  controlBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
  },

  /* VERIFICATION SECTION */
  outcomeQuestionText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    marginBottom: 10,
  },
  outcomeBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  outcomePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  outcomePillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
  },
  outcomeNoteText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  markDoneBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    marginTop: 4,
  },
  markDoneBigBtnText: {
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
    fontSize: 14.5,
  },

  /* AI ASSIST CARD */
  aiAssistCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  aiAssistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  aiAssistTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14.5,
  },
  aiAssistSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  aiAssistActionRow: {
    alignSelf: 'flex-start',
  },
  aiAssistActionText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
  },

  /* EMPTY GUIDE STATE */
  emptyGuideState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyGuideText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
  },
});

export default MaintenanceGuideScreen;
