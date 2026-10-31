import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import vehicleApi from '../api/vehicleApi';
import { useAIUsage } from '../context/AIUsageContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useVehicle } from '../context/VehicleContext';
import useMaintenanceRecommendations from '../hooks/useMaintenanceRecommendations';
import { incrementGuestDiagnosisCount } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';
import {
  ensureRecommendationGuide,
  resolveVehicleTypeString,
} from '../utils/maintenanceUtils';
import { getDisplayValue, getVehicleDisplayName } from '../utils/vehicleDisplay';

const MaintenanceGuideScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { item } = route.params || {};

  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const { activeVehicle, pendingVehicle } = useVehicle();
  const vehicleProfile = activeVehicle || pendingVehicle;
  const { markAsDone, isRecommendationCompleted } = useMaintenanceRecommendations();
  const {
    usage,
    recordConsultationOptimistic,
    refreshUsage,
    setQuotaExhausted,
  } = useAIUsage();

  const scrollViewRef = useRef(null);

  // Resolve step-by-step guide
  const guide = useMemo(
    () => ensureRecommendationGuide(item, vehicleProfile),
    [item, vehicleProfile],
  );

  const steps = guide?.steps || [];
  const totalSteps = steps.length;

  const alreadyCompleted = useMemo(
    () => Boolean(item && typeof isRecommendationCompleted === 'function' && isRecommendationCompleted(item)),
    [item, isRecommendationCompleted],
  );

  // Active step state
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState(() =>
    alreadyCompleted ? steps.map((_, idx) => idx + 1) : [],
  );
  const [outcomeStatus, setOutcomeStatus] = useState(() => (alreadyCompleted ? 'success' : null)); // 'success' | 'failure' | null
  const [isDoneSaved, setIsDoneSaved] = useState(alreadyCompleted);
  const [isSubmittingDone, setIsSubmittingDone] = useState(false);
  const [showFinalVerification, setShowFinalVerification] = useState(alreadyCompleted);

  // Sync if item completion changes externally
  useEffect(() => {
    if (alreadyCompleted) {
      setIsDoneSaved(true);
      setCompletedSteps(steps.map((_, idx) => idx + 1));
      setOutcomeStatus(prev => prev || 'success');
      setShowFinalVerification(true);
    }
  }, [alreadyCompleted, steps]);

  // UI accordion for tools/safety prerequisites
  const [showPrereqs, setShowPrereqs] = useState(false);

  // ON-SCREEN AI STEP CLARIFICATION STATE (collapsed by default so step card is uncramped)
  const [isClarificationOpen, setIsClarificationOpen] = useState(false);
  const [clarificationHistory, setClarificationHistory] = useState({}); // { [stepIndex]: { question, answer, timestamp } }
  const [activeInputText, setActiveInputText] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  const activeStepData = steps[currentStep] || steps[0] || {};
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === Math.max(0, totalSteps - 1);
  const isCurrentStepChecked = completedSteps.includes(currentStep + 1);
  const progressPercent = totalSteps > 0
    ? Math.round((Math.min(totalSteps, Math.max(completedSteps.length, isDoneSaved ? totalSteps : currentStep + (isCurrentStepChecked ? 1 : 0))) / totalSteps) * 100)
    : 100;

  const currentStepClarification = clarificationHistory[currentStep] || null;

  const completionCheck = useMemo(
    () =>
      guide?.completionCheck || {
        title: 'FINAL VERIFICATION & RESULT',
        instructions:
          'Perform a final visual and functional check to confirm all components are secure and operating normally.',
      },
    [guide],
  );

  const toggleStepComplete = stepNum => {
    setCompletedSteps(prev =>
      prev.includes(stepNum) ? prev.filter(s => s !== stepNum) : [...prev, stepNum],
    );
  };

  const scrollToVerificationSection = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd?.({ animated: true });
    }, 120);
  };

  const handleFinalVerificationPress = () => {
    const finalStepNumber = currentStep + 1;
    setCompletedSteps(prev =>
      prev.includes(finalStepNumber) ? prev : [...prev, finalStepNumber],
    );
    setShowFinalVerification(true);
    scrollToVerificationSection();
  };

  const handleMarkAsDone = async () => {
    if (!item || isSubmittingDone) return;
    setIsSubmittingDone(true);
    try {
      const ok = await markAsDone(item);
      if (ok !== false) {
        setIsDoneSaved(true);
        setCompletedSteps(steps.map((_, idx) => idx + 1));
        setShowFinalVerification(true);
        setOutcomeStatus(prev => prev || 'success');
      }
    } catch (err) {
      console.warn('Failed to mark guide item as done:', err);
    } finally {
      setIsSubmittingDone(false);
    }
  };

  const handleOutcomeSelect = async status => {
    setOutcomeStatus(status);
    if (status === 'success') {
      await handleMarkAsDone();
    }
  };

  // ON-SCREEN AI CLARIFICATION SUBMISSION (taps into real AI & updates AI usage)
  const handleAskClarification = async customQuery => {
    const query = (customQuery || activeInputText).trim();
    if (!query || isAskingAI) return;

    if (usage?.exhausted) {
      setAiError('You have reached your AI consultation limit for this period.');
      return;
    }

    setIsAskingAI(true);
    setAiError(null);

    const vehicleDisplayName = getVehicleDisplayName(vehicleProfile, 'Vehicle');
    const vehicleType = resolveVehicleTypeString(vehicleProfile);
    const stepTitle = activeStepData.title || `Step ${currentStep + 1}`;
    const taskTitle = item?.title || 'Maintenance Task';

    try {
      // Formulate detailed automotive context for the AI
      const promptText = `I am performing the vehicle maintenance task "${taskTitle}" on my ${vehicleDisplayName} (${vehicleType}).
Current Step ${currentStep + 1} of ${totalSteps}: "${stepTitle}".
Step Instructions: "${activeStepData.instructions || ''}".
Inspection Checkpoint: "${activeStepData.check || 'N/A'}".
Safety Warning: "${activeStepData.warning || 'None specified'}".
User's Question / Confusion about this step: "${query}".
Please provide a concise, direct, step-specific automotive clarification explaining what to do, where to look, tools to use, safety precautions, whether it is safe for DIY or requires a mechanic, or how to verify. Clearly distinguish general maintenance guidance from verified manufacturer-specific specifications.`;

      let answerText = null;
      let aiConsultationSucceeded = false;

      // Build conversation history from prior step clarifications in this guide session
      const priorHistory = Object.entries(clarificationHistory || {}).flatMap(([stepIdx, entry]) => {
        if (!entry?.question || !entry?.answer) return [];
        const userTurn = `[Step ${Number(stepIdx) + 1}] ${entry.question}`;
        return [
          { role: 'user', content: userTurn, sender: 'user', text: userTurn },
          { role: 'assistant', content: entry.answer, sender: 'ai', text: entry.answer },
        ];
      });

      const rawId = vehicleProfile?.id ?? vehicleProfile?.vehicle_id;
      const numericVehicleId =
        rawId !== null && rawId !== undefined && Number.isInteger(Number(rawId)) && Number(rawId) > 0
          ? Number(rawId)
          : null;
      const safeBrand = getDisplayValue(
        vehicleProfile?.custom_brand ??
          vehicleProfile?.vehicle_brand ??
          vehicleProfile?.vehicleBrand ??
          vehicleProfile?.brand ??
          vehicleProfile?.make,
        '',
      );
      const safeModel = getDisplayValue(
        vehicleProfile?.custom_model ??
          vehicleProfile?.vehicle_model ??
          vehicleProfile?.vehicleModel ??
          vehicleProfile?.model,
        '',
      );
      const safeYear = getDisplayValue(
        vehicleProfile?.custom_year ??
          vehicleProfile?.vehicle_year ??
          vehicleProfile?.vehicleYear ??
          vehicleProfile?.year,
        '',
      );

      try {
        const payload = {
          ...(numericVehicleId ? { vehicle_id: numericVehicleId } : {}),
          vehicle_name: vehicleDisplayName,
          vehicle_type: vehicleType,
          ...(safeBrand ? { vehicle_brand: String(safeBrand) } : {}),
          ...(safeModel ? { vehicle_model: String(safeModel) } : {}),
          ...(safeYear ? { vehicle_year: String(safeYear) } : {}),
          symptoms: promptText,
          input_type: 'text',
          diagnostic_state: { assessments: [] },
          language: language || 'en',
          history: priorHistory,
        };

        const res = await vehicleApi.submitDiagnostic(payload);

        if (res) {
          aiConsultationSucceeded = true;
          if (typeof res === 'string') {
            answerText = res;
          } else if (res.response) {
            answerText = res.response;
          } else if (res.whats_happening || res.summary || res.repair_guidance) {
            const parts = [
              res.whats_happening,
              res.summary,
              typeof res.repair_guidance === 'string'
                ? res.repair_guidance
                : res.repair_guidance?.overview || res.repair_guidance?.steps?.join('\n'),
              Array.isArray(res.recommended_actions) && res.recommended_actions.length > 0
                ? res.recommended_actions
                    .map(act => (typeof act === 'string' ? act : act?.action || act?.title || ''))
                    .filter(Boolean)
                    .join('\n• ')
                : null,
            ].filter(Boolean);
            answerText = parts.join('\n\n');
          } else if (res.message) {
            answerText = res.message;
          }
        }
      } catch (apiErr) {
        if (
          apiErr?.response?.status === 403 &&
          apiErr?.response?.data?.reason === 'ai_limit_reached'
        ) {
          if (typeof setQuotaExhausted === 'function') {
            setQuotaExhausted(apiErr.response.data);
          }
          setAiError(
            apiErr?.response?.data?.message ||
              'You have reached your AI consultation limit for this period.',
          );
          return;
        }
        console.warn('Live AI clarification API failed or offline, generating intelligent automotive fallback:', apiErr?.message);
      }

      if (aiConsultationSucceeded) {
        if (!isAuthenticated) {
          await incrementGuestDiagnosisCount().catch(() => {});
        }
        if (typeof recordConsultationOptimistic === 'function') {
          recordConsultationOptimistic();
        }
        if (typeof refreshUsage === 'function') {
          refreshUsage().catch(() => {});
        }
      }

      // Intelligent automotive fallback if API was unavailable or returned empty
      if (!answerText) {
        const lowerQuery = query.toLowerCase();

        if (lowerQuery.includes('locate') || lowerQuery.includes('where') || lowerQuery.includes('location')) {
          answerText = `📍 Component Location for ${stepTitle}:\nOn your ${vehicleDisplayName}, this component is situated near the ${taskTitle.toLowerCase()} assembly within the engine bay or underbody. Make sure the vehicle is parked on level ground with the ignition off and engine completely cool before reaching in. Refer to the owner's manual compartment diagram for exact orientation.`;
        } else if (lowerQuery.includes('tool') || lowerQuery.includes('need') || lowerQuery.includes('wrench') || lowerQuery.includes('socket')) {
          const toolsList = guide?.tools?.join(', ') || 'basic metric sockets, screwdriver, and protective work gloves';
          answerText = `🛠️ Tools for ${stepTitle}:\nRecommended tools include: ${toolsList}. Keep a flashlight or work lamp handy for clear visibility, and wear eye protection while inspecting or loosening fasteners.`;
        } else if (lowerQuery.includes('verify') || lowerQuery.includes('check') || lowerQuery.includes('right') || lowerQuery.includes('correct') || lowerQuery.includes('confirm')) {
          answerText = `🔍 Verification Checkpoint:\n${activeStepData.check || 'Confirm that all fittings, fasteners, or connectors are snug and aligned. Verify there is no play, loose debris, or fluid seepage around the component housing.'}`;
        } else if (lowerQuery.includes('mistake') || lowerQuery.includes('avoid') || lowerQuery.includes('warning') || lowerQuery.includes('danger')) {
          answerText = `⚠️ Important Precautions for ${stepTitle}:\n${activeStepData.warning || 'Do not overtighten plastic clips or thread fasteners beyond spec. Never force a part that meets stiff resistance; double-check seating alignment and ensure foreign objects cannot fall into open ports.'}`;
        } else if (lowerQuery.includes('simpl') || lowerQuery.includes('beginner') || lowerQuery.includes('explain')) {
          answerText = `💬 In Simple Terms (${stepTitle}):\n${activeStepData.instructions || stepTitle} Simply take your time with this step, make sure the vehicle is turned off and cool, and verify "${activeStepData.check || 'that all parts fit snugly before moving on'}". (Note: This is general maintenance guidance; consult your ${vehicleDisplayName} owner's manual for exact manufacturer torque and fluid specifications.)`;
        } else if (lowerQuery.includes('diy') || lowerQuery.includes('myself') || lowerQuery.includes('mechanic') || lowerQuery.includes('professional')) {
          answerText = `🧑‍🔧 DIY vs. Professional Mechanic (${stepTitle}):\nBasic visual checks and accessible fastener steps can be done DIY if you have the listed tools (${guide?.tools?.join(', ') || 'basic hand tools'}) and follow safety precautions. However, if a bolt is seized, special calibration tools are needed, or you feel unsure around pressurized/electrical parts, have a certified mechanic complete the procedure.`;
        } else {
          answerText = `💡 Guidance for ${stepTitle}:\nWhen following "${activeStepData.instructions || stepTitle}", proceed methodically. Ensure components are cleanly seated and all fasteners are secured. ${activeStepData.check ? `Key checkpoint: ${activeStepData.check}` : 'Double check that everything is back in place before proceeding.'} (General guidance — check your ${vehicleDisplayName} service manual for model-specific specs.)`;
        }
      }

      // Clean up markdown formatting
      const cleanedAnswer = answerText
        .replace(/###?\s*/g, '')
        .replace(/\*\*/g, '')
        .trim();

      setClarificationHistory(prev => ({
        ...prev,
        [currentStep]: {
          question: query,
          answer: cleanedAnswer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      }));
      setActiveInputText('');
    } catch (err) {
      console.warn('Failed to retrieve clarification:', err);
      setAiError('Could not retrieve clarification. Please try again or rephrase.');
    } finally {
      setIsAskingAI(false);
    }
  };

  const handleClearClarification = () => {
    setClarificationHistory(prev => {
      const next = { ...prev };
      delete next[currentStep];
      return next;
    });
    setAiError(null);
  };

  const diagData = useMemo(() => {
    const rec = item?.diagnosticRecord || item?.raw || item || {};
    const problem = item?.relatedProblem || rec.problem || rec.title || (item?.source === 'diagnostic' ? item?.title : null);
    const severity = rec.severity || item?.severity || item?.priority || null;
    const summary = rec.summary || rec.explanation || rec.description || item?.why_it_matters || item?.description || null;
    const causes = Array.isArray(rec.possible_causes) && rec.possible_causes.length > 0
      ? rec.possible_causes
      : (Array.isArray(rec.causes) ? rec.causes : []);
    const symptoms = Array.isArray(rec.symptoms) && rec.symptoms.length > 0
      ? rec.symptoms
      : (typeof rec.symptoms === 'string' && rec.symptoms ? [rec.symptoms] : []);

    const hasData = Boolean(item?.source === 'diagnostic' || item?.relatedProblem || causes.length > 0 || symptoms.length > 0);
    return { hasData, problem, severity, summary, causes, symptoms };
  }, [item]);

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

  const hasTools = Array.isArray(guide.tools) && guide.tools.length > 0;
  const hasSafety = Array.isArray(guide.safetyNotes) && guide.safetyNotes.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. TOP HEADER */}
          <View style={styles.header}>
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              activeOpacity={0.75}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={22} color={theme.text} />
            </TouchableOpacity>

            <View style={styles.headerTitleBox}>
              <View style={styles.eyebrowRow}>
                <View style={[styles.guidePill, { backgroundColor: theme.accentSoft }]}>
                  <Icon name="auto-stories" size={11} color={theme.accent} style={{ marginRight: 4 }} />
                  <Text style={[styles.eyebrowText, { color: theme.accent }]}>STEP-BY-STEP GUIDE</Text>
                </View>
                <Text style={[styles.vehicleContextText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {getVehicleDisplayName(vehicleProfile, 'Active Vehicle')}
                </Text>
              </View>
              <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          </View>

          {/* 2. TASK SUMMARY CARD */}
          <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: item.source === 'diagnostic' ? theme.accent : theme.border }]}>
            <View style={styles.summaryTopRow}>
              <View style={[styles.summaryIconBox, { backgroundColor: theme.accentSoft }]}>
                <Icon name={item.icon || 'build'} size={22} color={theme.accent} />
              </View>

              <View style={styles.summaryMetaRow}>
                {item.source === 'diagnostic' && (
                  <View style={[styles.sourceBadge, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
                    <Text style={[styles.sourceBadgeText, { color: theme.accent }]}>DIAGNOSTIC-GUIDED</Text>
                  </View>
                )}

                <View style={[styles.metaPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                  <Icon name="bolt" size={12} color={theme.accent} />
                  <Text style={[styles.metaPillText, { color: theme.text }]}>{guide.difficulty || 'Easy'}</Text>
                </View>

                <View style={[styles.metaPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                  <Icon name="schedule" size={12} color={theme.textSecondary} />
                  <Text style={[styles.metaPillText, { color: theme.textSecondary }]}>{guide.estimatedTime || '10-15 min'}</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.taskSummaryTitle, { color: theme.text }]}>{item.title}</Text>

            {item.relatedProblem ? (
              <View style={[styles.relatedProblemBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Icon name="report-problem" size={14} color={theme.accent} />
                <Text style={[styles.relatedProblemText, { color: theme.textSecondary }]} numberOfLines={2}>
                  Related issue: <Text style={{ color: theme.text, fontFamily: 'Inter-SemiBold' }}>"{item.relatedProblem}"</Text>
                </Text>
              </View>
            ) : null}

            {guide.whyItMatters ? (
              <Text style={[styles.whyItMattersSummary, { color: theme.textSecondary }]}>
                {guide.whyItMatters}
              </Text>
            ) : null}

            {/* PREREQUISITES COLLAPSIBLE BAR (TOOLS & SAFETY) */}
            {(hasTools || hasSafety) && (
              <TouchableOpacity
                style={[styles.prereqToggleBar, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                activeOpacity={0.8}
                onPress={() => setShowPrereqs(prev => !prev)}
              >
                <View style={styles.prereqToggleLeft}>
                  {hasTools && (
                    <View style={styles.prereqBadge}>
                      <Icon name="home-repair-service" size={13} color={theme.accent} />
                      <Text style={[styles.prereqBadgeText, { color: theme.text }]}>
                        {guide.tools.length} Tools
                      </Text>
                    </View>
                  )}
                  {hasSafety && (
                    <View style={styles.prereqBadge}>
                      <Icon name="shield" size={13} color="#FF5A5F" />
                      <Text style={[styles.prereqBadgeText, { color: theme.text }]}>
                        {guide.safetyNotes.length} Safety Notes
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.prereqToggleRight}>
                  <Text style={[styles.prereqToggleText, { color: theme.accent }]}>
                    {showPrereqs ? 'Hide' : 'View'}
                  </Text>
                  <Icon
                    name={showPrereqs ? 'expand-less' : 'expand-more'}
                    size={18}
                    color={theme.accent}
                  />
                </View>
              </TouchableOpacity>
            )}

            {/* EXPANDED PREREQUISITES DETAILS */}
            {showPrereqs && (
              <View style={[styles.prereqsDetailsBox, { borderColor: theme.border }]}>
                {hasTools && (
                  <View style={styles.prereqSection}>
                    <Text style={[styles.prereqSubheading, { color: theme.accent }]}>
                      TOOLS YOU'LL NEED:
                    </Text>
                    <View style={styles.toolsChipsContainer}>
                      {guide.tools.map((tool, idx) => (
                        <View key={idx} style={[styles.toolChip, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                          <Icon name="check" size={12} color={theme.accent} style={{ marginRight: 4 }} />
                          <Text style={[styles.toolChipText, { color: theme.text }]}>{tool}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {hasSafety && (
                  <View style={[styles.prereqSection, { marginTop: hasTools ? 12 : 0 }]}>
                    <Text style={[styles.prereqSubheading, { color: '#FF5A5F' }]}>
                      SAFETY PRECAUTIONS:
                    </Text>
                    {guide.safetyNotes.map((note, idx) => (
                      <View key={idx} style={styles.safetyBulletRow}>
                        <Icon name="warning" size={13} color="#FF5A5F" style={{ marginTop: 2 }} />
                        <Text style={[styles.safetyBulletText, { color: theme.textSecondary }]}>{note}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 3. STEP PROGRESS BAR & STEP PILLS NAVIGATION */}
          {totalSteps > 0 && (
            <View style={styles.stepNavigationHeader}>
              <View style={styles.stepProgressRow}>
                <Text style={[styles.stepCounterText, { color: theme.text }]}>
                  Step <Text style={{ color: theme.accent }}>{currentStep + 1}</Text> of {totalSteps}
                </Text>
                <Text style={[styles.progressPercentText, { color: theme.textSecondary }]}>
                  {progressPercent}% Complete
                </Text>
              </View>

              <View style={[styles.progressBarBg, { backgroundColor: theme.surfaceAlt }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: theme.accent,
                    },
                  ]}
                />
              </View>

              {/* HORIZONTAL STEP PILLS CAROUSEL */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.stepPillsScroll}
              >
                {steps.map((st, idx) => {
                  const isCurrent = idx === currentStep;
                  const isCompleted = completedSteps.includes(idx + 1);

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.stepIndicatorPill,
                        {
                          backgroundColor: isCurrent
                            ? theme.accent
                            : (isCompleted ? 'rgba(50, 213, 131, 0.14)' : theme.surfaceAlt),
                          borderColor: isCurrent
                            ? theme.accent
                            : (isCompleted ? (theme.success || '#32D583') : theme.border),
                        },
                      ]}
                      activeOpacity={0.75}
                      onPress={() => setCurrentStep(idx)}
                    >
                      {isCompleted && !isCurrent ? (
                        <Icon name="check" size={13} color={theme.success || '#32D583'} style={{ marginRight: 3 }} />
                      ) : null}
                      <Text
                        style={[
                          styles.stepIndicatorPillText,
                          {
                            color: isCurrent
                              ? '#FFFFFF'
                              : (isCompleted ? (theme.success || '#32D583') : theme.textSecondary),
                            fontFamily: isCurrent ? 'Outfit-Bold' : 'Inter-SemiBold',
                          },
                        ]}
                      >
                        {`Step ${idx + 1}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* 4. ACTIVE STEP CARD */}
          {totalSteps > 0 ? (
            <View style={[styles.stepCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {/* Step Badge & Title */}
              <View style={styles.stepHeaderRow}>
                <View style={[styles.stepNumberBadge, { backgroundColor: theme.accentSoft }]}>
                  <Text style={[styles.stepNumberBadgeText, { color: theme.accent }]}>
                    STEP {String(currentStep + 1).padStart(2, '0')}
                  </Text>
                </View>

                {isCurrentStepChecked && (
                  <View style={[styles.stepCompletedBadge, { backgroundColor: 'rgba(50, 213, 131, 0.15)' }]}>
                    <Icon name="check-circle" size={14} color={theme.success || '#32D583'} style={{ marginRight: 4 }} />
                    <Text style={[styles.stepCompletedBadgeText, { color: theme.success || '#32D583' }]}>Completed</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.activeStepTitle, { color: theme.text }]}>
                {activeStepData.title || `Step ${currentStep + 1}`}
              </Text>

              {/* Instructions text */}
              <Text style={[styles.activeStepInstructions, { color: theme.textSecondary }]}>
                {activeStepData.instructions}
              </Text>

              {/* Verification checkpoint callout */}
              {activeStepData.check ? (
                <View style={[styles.checkpointCallout, { backgroundColor: 'rgba(50, 213, 131, 0.08)', borderColor: theme.success || '#32D583' }]}>
                  <Icon name="verified" size={18} color={theme.success || '#32D583'} style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.checkpointTitle, { color: theme.success || '#32D583' }]}>
                      HOW TO CHECK / VERIFY:
                    </Text>
                    <Text style={[styles.checkpointBody, { color: theme.text }]}>
                      {activeStepData.check}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* Warning caution callout */}
              {activeStepData.warning ? (
                <View style={[styles.warningCallout, { backgroundColor: 'rgba(255, 90, 95, 0.08)', borderColor: '#FF5A5F' }]}>
                  <Icon name="warning" size={18} color="#FF5A5F" style={{ marginTop: 1 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.warningTitle, { color: '#FF5A5F' }]}>
                      CAUTION / AVOID:
                    </Text>
                    <Text style={[styles.warningBody, { color: theme.text }]}>
                      {activeStepData.warning}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* ============================================================== */}
              {/* 5. ON-SCREEN AI STEP CLARIFICATION ASSISTANT                    */}
              {/* (Collapsed by default so the step view stays uncramped)          */}
              {/* ============================================================== */}
              <View style={[styles.aiClarificationContainer, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <TouchableOpacity
                  testID="step-clarification-toggle"
                  style={[
                    styles.aiClarificationHeaderRow,
                    !isClarificationOpen && { marginBottom: 0 },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setIsClarificationOpen(prev => !prev)}
                >
                  <View style={[styles.aiIconBubble, { backgroundColor: theme.accentSoft }]}>
                    <Icon name="auto-awesome" size={16} color={theme.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.aiHeaderTagRow}>
                      <Text style={[styles.aiClarificationTitle, { color: theme.text }]}>
                        Step Clarification Assistant
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.aiPoweredBadge, { backgroundColor: theme.accentSoft }]}>
                          <Text style={[styles.aiPoweredBadgeText, { color: theme.accent }]}>AI POWERED</Text>
                        </View>
                        <Icon
                          name={isClarificationOpen ? 'expand-less' : 'expand-more'}
                          size={20}
                          color={theme.accent}
                        />
                      </View>
                    </View>
                    <Text style={[styles.aiClarificationSub, { color: theme.textSecondary }]}>
                      {isClarificationOpen
                        ? 'Ask VehiCare AI for instant on-screen clarification about this step.'
                        : `Unsure about Step ${currentStep + 1}? Tap to open AI clarification.`}
                    </Text>
                  </View>
                </TouchableOpacity>

                {isClarificationOpen && (
                  <>
                    {/* AI RESPONSE BOX (IF AVAILABLE FOR THIS STEP) */}
                    {currentStepClarification ? (
                      <View style={[styles.aiAnswerCard, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
                        <View style={styles.aiAnswerTopRow}>
                          <View style={styles.aiAnswerUserQueryBadge}>
                            <Icon name="help-outline" size={13} color={theme.textSecondary} style={{ marginRight: 4 }} />
                            <Text style={[styles.aiAnswerUserQueryText, { color: theme.textSecondary }]} numberOfLines={1}>
                              "{currentStepClarification.question}"
                            </Text>
                          </View>
                          <Text style={[styles.aiAnswerTimestamp, { color: theme.textSecondary }]}>
                            {currentStepClarification.timestamp}
                          </Text>
                        </View>

                        <Text style={[styles.aiAnswerText, { color: theme.text }]}>
                          {currentStepClarification.answer}
                        </Text>

                        <View style={styles.aiAnswerFooterRow}>
                          <TouchableOpacity
                            style={[styles.aiAskAnotherBtn, { borderColor: theme.border }]}
                            onPress={handleClearClarification}
                          >
                            <Icon name="chat" size={13} color={theme.accent} style={{ marginRight: 4 }} />
                            <Text style={[styles.aiAskAnotherText, { color: theme.accent }]}>Ask another question</Text>
                          </TouchableOpacity>

                          <View style={styles.aiVerifiedChip}>
                            <Icon name="check-circle" size={13} color={theme.success || '#32D583'} style={{ marginRight: 3 }} />
                            <Text style={[styles.aiVerifiedText, { color: theme.success || '#32D583' }]}>Clarification applied</Text>
                          </View>
                        </View>
                      </View>
                    ) : (
                      /* CUSTOM QUESTION INPUT ROW */
                      <View style={[styles.customInputRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <TextInput
                          style={[styles.customTextInput, { color: theme.text }]}
                          placeholder={`Ask a question about Step ${currentStep + 1}...`}
                          placeholderTextColor={theme.textSecondary}
                          value={activeInputText}
                          onChangeText={setActiveInputText}
                          editable={!isAskingAI}
                          returnKeyType="send"
                          onSubmitEditing={() => handleAskClarification()}
                        />

                        <TouchableOpacity
                          testID="send-step-clarification-btn"
                          style={[
                            styles.sendClarificationBtn,
                            {
                              backgroundColor: activeInputText.trim() ? theme.accent : theme.surfaceAlt,
                              opacity: activeInputText.trim() ? 1 : 0.5,
                            },
                          ]}
                          disabled={!activeInputText.trim() || isAskingAI}
                          onPress={() => handleAskClarification()}
                        >
                          <Icon name="arrow-upward" size={18} color={activeInputText.trim() ? '#FFFFFF' : theme.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* LOADING STATE */}
                    {isAskingAI && (
                      <View style={styles.aiLoadingRow}>
                        <ActivityIndicator size="small" color={theme.accent} style={{ marginRight: 8 }} />
                        <Text style={[styles.aiLoadingText, { color: theme.textSecondary }]}>
                          VehiCare AI is reviewing Step {currentStep + 1} for your {getVehicleDisplayName(vehicleProfile, 'vehicle')}...
                        </Text>
                      </View>
                    )}

                    {/* ERROR STATE */}
                    {aiError && (
                      <View style={styles.aiErrorRow}>
                        <Icon name="error-outline" size={14} color="#FF5A5F" style={{ marginRight: 6 }} />
                        <Text style={[styles.aiErrorText, { color: '#FF5A5F' }]}>{aiError}</Text>
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* STEP COMPLETION TOGGLE CHECKBOX */}
              <TouchableOpacity
                style={[
                  styles.stepCheckRow,
                  {
                    backgroundColor: isCurrentStepChecked ? 'rgba(50, 213, 131, 0.12)' : theme.surfaceAlt,
                    borderColor: isCurrentStepChecked ? (theme.success || '#32D583') : theme.border,
                  },
                ]}
                activeOpacity={0.8}
                accessibilityRole="checkbox"
                accessibilityLabel="Toggle step completion"
                accessibilityState={{ checked: isCurrentStepChecked }}
                onPress={() => toggleStepComplete(currentStep + 1)}
              >
                <Icon
                  name={isCurrentStepChecked ? 'check-box' : 'check-box-outline-blank'}
                  size={22}
                  color={isCurrentStepChecked ? (theme.success || '#32D583') : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.stepCheckLabel,
                    { color: isCurrentStepChecked ? (theme.success || '#32D583') : theme.text },
                  ]}
                >
                  {isCurrentStepChecked
                    ? `Step ${currentStep + 1} completed`
                    : `Mark Step ${currentStep + 1} as completed`}
                </Text>
              </TouchableOpacity>

              {/* STEP NAVIGATION CONTROLS */}
              <View style={styles.stepControlsRow}>
                <TouchableOpacity
                  style={[
                    styles.controlBtn,
                    { backgroundColor: theme.surfaceAlt, opacity: isFirstStep ? 0.4 : 1, borderColor: theme.border },
                  ]}
                  disabled={isFirstStep}
                  onPress={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                >
                  <Icon name="arrow-back" size={18} color={theme.text} />
                  <Text style={[styles.controlBtnText, { color: theme.text }]}>Previous</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID={isLastStep ? 'final-verification-btn' : 'next-step-btn'}
                  style={[
                    styles.controlBtn,
                    {
                      backgroundColor: (isCurrentStepChecked || isLastStep) ? theme.accent : theme.surfaceAlt,
                      opacity: (isCurrentStepChecked || isLastStep) ? 1 : 0.45,
                    },
                  ]}
                  disabled={!isCurrentStepChecked && !isLastStep}
                  onPress={() => {
                    if (isLastStep) {
                      handleFinalVerificationPress();
                    } else if (isCurrentStepChecked) {
                      setCurrentStep(prev => Math.min(totalSteps - 1, prev + 1));
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.controlBtnText,
                      { color: (isCurrentStepChecked || isLastStep) ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    {isLastStep ? 'Final Verification' : 'Next Step'}
                  </Text>
                  <Icon
                    name={isLastStep ? 'verified' : 'arrow-forward'}
                    size={18}
                    color={(isCurrentStepChecked || isLastStep) ? '#FFFFFF' : theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {!isCurrentStepChecked && (
                <View style={styles.stepNoticeRow}>
                  <Icon name="info-outline" size={13} color={theme.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.stepNoticeText, { color: theme.textSecondary }]}>
                    {isLastStep
                      ? 'Check the box above or tap Final Verification to complete and log this maintenance task.'
                      : 'Confirm this step by checking the box above to proceed to the next step.'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.stepCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.activeStepInstructions, { color: theme.textSecondary }]}>
                Step-by-step guidance is not available for this task. Ask VehiCare for assistance.
              </Text>
            </View>
          )}

          {/* 6. FINAL VERIFICATION & OUTCOME SECTION (WHEN ON LAST STEP OR OPENED) */}
          {(isLastStep || showFinalVerification) && (
            <View style={[styles.verificationCard, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
              <View style={styles.verificationHeaderRow}>
                <View style={[styles.verificationIconBox, { backgroundColor: theme.accentSoft }]}>
                  <Icon name="verified" size={20} color={theme.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.verificationTitle, { color: theme.text }]}>
                    {completionCheck.title || 'FINAL VERIFICATION & RESULT'}
                  </Text>
                  <Text style={[styles.verificationSubtitle, { color: theme.textSecondary }]}>
                    Confirm mechanical condition after completing all maintenance steps.
                  </Text>
                </View>
              </View>

              <Text style={[styles.verificationInstructions, { color: theme.textSecondary }]}>
                {completionCheck.instructions}
              </Text>

              <Text style={[styles.outcomeQuestionText, { color: theme.text }]}>
                Did the issue improve / is the component operating normally?
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
                  onPress={() => handleOutcomeSelect('success')}
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
                  onPress={() => handleOutcomeSelect('failure')}
                >
                  <Icon name="sentiment-dissatisfied" size={18} color="#FF5A5F" />
                  <Text style={[styles.outcomePillText, { color: theme.text }]}>No, issue remains</Text>
                </TouchableOpacity>
              </View>

              {outcomeStatus === 'success' && (
                <View style={styles.successCelebrationBox}>
                  <View style={styles.successCelebrationHeader}>
                    <Icon name="check-circle" size={22} color={theme.success || '#32D583'} />
                    <Text style={[styles.successCelebrationTitle, { color: theme.success || '#32D583' }]}>
                      Maintenance Verified & Logged!
                    </Text>
                  </View>
                  <Text style={[styles.successCelebrationText, { color: theme.textSecondary }]}>
                    {guide.outcomes?.success || 'Great job! This service task has been verified and permanently recorded in your vehicle maintenance history.'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.returnButton, { backgroundColor: theme.accent }]}
                    onPress={() => navigation.goBack()}
                  >
                    <Icon name="arrow-back" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.returnButtonText}>Back to Maintenance Overview</Text>
                  </TouchableOpacity>
                </View>
              )}

              {outcomeStatus === 'failure' && (
                <View style={styles.failureHelpBox}>
                  <View style={styles.failureHelpHeader}>
                    <Icon name="warning-amber" size={20} color="#FF5A5F" />
                    <Text style={[styles.failureHelpTitle, { color: '#FF5A5F' }]}>
                      Next Recommended Steps
                    </Text>
                  </View>
                  <Text style={[styles.failureHelpText, { color: theme.textSecondary }]}>
                    {guide.outcomes?.failure || 'Since the symptom persists, professional shop inspection is recommended to prevent secondary strain.'}
                  </Text>

                  <View style={styles.failureActionsGroup}>
                    <TouchableOpacity
                      style={[styles.failureActionBtn, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                      onPress={() => navigation.navigate('RepairShops')}
                    >
                      <Icon name="storefront" size={16} color={theme.text} style={{ marginRight: 6 }} />
                      <Text style={[styles.failureActionBtnText, { color: theme.text }]}>
                        Find Nearby Repair Shops
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.markDoneSecondaryBtn, { borderColor: theme.border }]}
                      onPress={handleMarkAsDone}
                    >
                      <Text style={[styles.markDoneSecondaryText, { color: theme.textSecondary }]}>
                        {isDoneSaved ? 'Logged in Service History (Issue Unresolved)' : 'Log Inspection & Keep Issue Open'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {!outcomeStatus && (
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
                    {isDoneSaved ? 'Maintenance Logged!' : 'Mark Maintenance as Done'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* 7. DIAGNOSTIC FINDINGS DETAILS (IF ATTACHED TO DIAGNOSIS) */}
          {diagData.hasData && (
            <View style={[styles.diagFindingCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.diagFindingHeaderRow}>
                <Icon name="medical-services" size={16} color={theme.accent} />
                <Text style={[styles.diagFindingTitle, { color: theme.text }]}>LINKED DIAGNOSTIC EVIDENCE</Text>
                {diagData.severity && (
                  <View style={[styles.diagSeverityBadge, { backgroundColor: `${theme.accent}20` }]}>
                    <Text style={[styles.diagSeverityText, { color: theme.accent }]}>
                      {String(diagData.severity).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              {diagData.problem && (
                <Text style={[styles.diagObservedText, { color: theme.text }]}>
                  Reported Symptom: "{diagData.problem}"
                </Text>
              )}

              {diagData.summary && (
                <Text style={[styles.diagSummaryText, { color: theme.textSecondary }]}>
                  {diagData.summary}
                </Text>
              )}
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },

  /* 1. HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    marginBottom: 16,
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
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  guidePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eyebrowText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  vehicleContextText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 20,
    lineHeight: 25,
  },

  /* 2. SUMMARY CARD */
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryMetaRow: {
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
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  metaPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
  },
  taskSummaryTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
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
  relatedProblemText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    flex: 1,
  },
  whyItMattersSummary: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 10,
  },

  /* PREREQUISITES COLLAPSIBLE BAR */
  prereqToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  prereqToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prereqBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prereqBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
  },
  prereqToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  prereqToggleText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11.5,
  },
  prereqsDetailsBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  prereqSection: {
    marginBottom: 4,
  },
  prereqSubheading: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10.5,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  toolsChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  toolChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
  },
  safetyBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  safetyBulletText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },

  /* 3. STEP NAVIGATION HEADER */
  stepNavigationHeader: {
    marginBottom: 14,
  },
  stepProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepCounterText: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 13,
  },
  progressPercentText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
  },
  progressBarBg: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepPillsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  stepIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  stepIndicatorPillText: {
    fontSize: 11.5,
  },

  /* 4. ACTIVE STEP CARD */
  stepCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 18,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stepNumberBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepNumberBadgeText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10.5,
    letterSpacing: 0.8,
  },
  stepCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepCompletedBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10.5,
  },
  activeStepTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 19,
    lineHeight: 24,
    marginBottom: 10,
  },
  activeStepInstructions: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 21,
    marginBottom: 14,
  },
  checkpointCallout: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  checkpointTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10.5,
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  checkpointBody: {
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    lineHeight: 18,
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
  warningTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10.5,
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  warningBody: {
    fontFamily: 'Inter-Medium',
    fontSize: 12.5,
    lineHeight: 18,
  },

  /* ============================================================== */
  /* 5. ON-SCREEN AI STEP CLARIFICATION ASSISTANT                   */
  /* ============================================================== */
  aiClarificationContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 6,
    marginBottom: 14,
  },
  aiClarificationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  aiIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  aiHeaderTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  aiClarificationTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
  },
  aiPoweredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  aiPoweredBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  aiClarificationSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 15,
  },

  /* QUICK PROMPTS */
  quickPromptSectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 9.5,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quickChipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  quickPromptChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
  },
  quickPromptChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
  },

  /* CUSTOM TEXT INPUT */
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  customTextInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    paddingVertical: 7,
  },
  sendClarificationBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  /* AI RESPONSE BOX */
  aiAnswerCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  aiAnswerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiAnswerUserQueryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  aiAnswerUserQueryText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },
  aiAnswerTimestamp: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
  },
  aiAnswerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 19,
    marginBottom: 10,
  },
  aiAnswerFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  aiAskAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  aiAskAnotherText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },
  aiVerifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiVerifiedText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
  },
  aiLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  aiLoadingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    flex: 1,
  },
  aiErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  aiErrorText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    flex: 1,
  },

  /* STEP COMPLETION ROW */
  stepCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
  },
  stepCheckLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
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
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  controlBtnText: {
    fontFamily: 'Inter-Bold',
    fontSize: 13,
  },
  stepNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  stepNoticeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    flex: 1,
  },

  /* 6. VERIFICATION SECTION */
  verificationCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  verificationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  verificationIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
    letterSpacing: 0.6,
  },
  verificationSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  verificationInstructions: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 12,
  },
  outcomeQuestionText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
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
  successCelebrationBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(50, 213, 131, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(50, 213, 131, 0.25)',
  },
  successCelebrationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  successCelebrationTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
  successCelebrationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  returnButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  failureHelpBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 90, 95, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 90, 95, 0.25)',
  },
  failureHelpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  failureHelpTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
  },
  failureHelpText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  failureActionsGroup: {
    gap: 8,
  },
  failureActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  failureActionBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  markDoneSecondaryBtn: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markDoneSecondaryText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    textDecorationLine: 'underline',
  },
  markDoneBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 8,
    marginTop: 4,
  },
  markDoneBigBtnText: {
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
    fontSize: 14,
  },

  /* 7. DIAGNOSTIC FINDINGS */
  diagFindingCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  diagFindingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  diagFindingTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11.5,
    letterSpacing: 0.6,
  },
  diagSeverityBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diagSeverityText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  diagObservedText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    marginBottom: 4,
  },
  diagSummaryText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
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
