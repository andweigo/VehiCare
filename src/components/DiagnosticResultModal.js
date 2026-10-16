import React from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import ConfidenceCard from './ConfidenceCard';
import PossibleCauseCard from './PossibleCauseCard';

const ORANGE = '#F63B05';
const GOLD = '#F59E0B';
const BLUE = '#3B82F6';
const RED = '#EF4444';
const GREEN = '#10B981';
const TEXT_MUTED = '#A1A1AA';

const parseStep = (step, idx) => {
  if (!step) return { num: idx + 1, title: '', desc: '', caution: null };

  if (typeof step === 'string') {
    const trimmed = step.trim();
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx > 0 && colonIdx < 50) {
      const possibleTitle = trimmed.substring(0, colonIdx).replace(/^Step\s*\d+\s*[-:]?\s*/i, '').trim();
      const possibleDesc = trimmed.substring(colonIdx + 1).trim();
      if (possibleDesc) {
        return {
          num: idx + 1,
          title: possibleTitle || `Step ${idx + 1}`,
          desc: possibleDesc,
          caution: null,
        };
      }
    }
    return {
      num: idx + 1,
      title: '',
      desc: trimmed,
      caution: null,
    };
  }

  if (typeof step === 'object') {
    const title = step.title || step.name || '';
    const desc = step.description || step.desc || step.instruction || step.step || step.text || step.action || '';
    const num = step.step_number || step.number || idx + 1;
    const caution = step.caution || step.warning || null;
    return { num, title, desc, caution };
  }

  return { num: idx + 1, title: '', desc: String(step), caution: null };
};

const DiagnosticResultModal = ({

  visible,
  onClose,
  diagnosis,
  vehicleName = 'Your Vehicle',
  onFindNearbyShops,
  onOwnShopSelected,
  onUpgrade,
}) => {
  const { theme } = useTheme();

  const navigation = useNavigation();


  if (!diagnosis) return null;

  const severity = diagnosis.severity || 'LOW';
  const isHighOrCritical = severity === 'HIGH' || severity === 'CRITICAL';
  const showRepairShops = isHighOrCritical || diagnosis.professional_help?.recommended === true;

  const planTier = diagnosis.plan_tier || diagnosis.diagnosis?.plan_tier || 'free';
  const isPremiumReport = planTier === 'premium' || Boolean(diagnosis.repair_guidance || diagnosis.cost_breakdown);
  const historyInsights = diagnosis.history_insights || diagnosis.diagnosis?.history_insights;
  const repairGuidance = diagnosis.repair_guidance || diagnosis.diagnosis?.repair_guidance;
  const costBreakdown = diagnosis.cost_breakdown || diagnosis.diagnosis?.cost_breakdown;

  const getSeverityBadgeColor = () => {
    switch (severity) {
      case 'CRITICAL':
        return '#DC2626';
      case 'HIGH':
        return ORANGE;
      case 'MODERATE':
        return GOLD;
      default:
        return GREEN;
    }
  };

  const getSeverityBgColor = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'rgba(220, 38, 38, 0.15)';
      case 'HIGH':
        return 'rgba(246, 59, 5, 0.15)';
      case 'MODERATE':
        return 'rgba(245, 158, 11, 0.15)';
      default:
        return 'rgba(16, 185, 129, 0.15)';
    }
  };

  const possibleCauses = Array.isArray(diagnosis.possible_causes)
    ? diagnosis.possible_causes
    : (Array.isArray(diagnosis.possibleCauses) ? diagnosis.possibleCauses : []);

  const handleUpgrade = () => {
    onClose();
    if (typeof onUpgrade === 'function') {
      onUpgrade();
    } else if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('ManagePlan');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={styles.dragHandleContainer}>
            <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />
          </View>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>

            <View style={styles.headerTitleContainer}>
              {isPremiumReport ? (
                <View style={[styles.aiTag, styles.premiumAiTag]}>
                  <Icon name="workspace-premium" size={13} color={GOLD} />
                  <Text style={[styles.aiTagText, { color: GOLD }]}>PREMIUM VEHICLE CARE ANALYSIS</Text>
                </View>
              ) : (
                <View style={styles.aiTag}>
                  <Icon name="auto-awesome" size={13} color={ORANGE} />
                  <Text style={styles.aiTagText}>ESSENTIAL VEHICLE CARE REPORT</Text>
                </View>
              )}
              <Text style={[styles.vehicleTitle, { color: theme.text }]} numberOfLines={1}>
                {vehicleName}
              </Text>
            </View>

            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.surface }]} onPress={onClose}>
              <Icon name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Safety Warning Banner for Critical/High */}
            {isHighOrCritical && (
              <View style={[styles.warningBanner, { backgroundColor: getSeverityBgColor(), borderColor: getSeverityBadgeColor() }]}>
                <Icon name="warning" size={22} color={getSeverityBadgeColor()} />
                <View style={styles.warningContent}>
                  <Text style={[styles.warningTitle, { color: getSeverityBadgeColor() }]}>
                    {severity === 'CRITICAL' ? 'CRITICAL SAFETY ALERT' : 'HIGH SEVERITY ASSESSMENT'}
                  </Text>
                  <Text style={styles.warningText}>
                    {severity === 'CRITICAL'
                      ? 'Continued operation may be unsafe. Please stop operating the vehicle when safe to do so and seek immediate assistance.'
                      : 'Symptoms indicate potential major component wear or safety concern. Professional inspection is strongly recommended.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Severity & Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.severityRow}>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityBgColor(), borderColor: getSeverityBadgeColor() }]}>
                  <View style={[styles.badgeDot, { backgroundColor: getSeverityBadgeColor() }]} />
                  <Text style={[styles.severityText, { color: getSeverityBadgeColor() }]}>
                    {severity} SEVERITY
                  </Text>
                </View>
                {isPremiumReport && (
                  <View style={styles.premiumPill}>
                    <Icon name="stars" size={12} color={GOLD} />
                    <Text style={styles.premiumPillText}>DEEP REASONING</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.summaryText, { color: theme.text }]}>
                {diagnosis.summary}
              </Text>

              {diagnosis.urgency ? (
                <View style={styles.urgencyRow}>
                  <Icon name="schedule" size={15} color={ORANGE} />
                  <Text style={styles.urgencyText}>{diagnosis.urgency}</Text>
                </View>
              ) : null}
            </View>

            {/* Vehicle History Insights (Premium Longitudinal Context) */}
            {historyInsights ? (
              <View style={[styles.historyCard, { backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
                <View style={styles.historyHeader}>
                  <Icon name="history" size={18} color={BLUE} />
                  <Text style={styles.historyTitle}>VEHICLE HISTORY INSIGHTS</Text>
                  <View style={styles.historyTag}>
                    <Text style={styles.historyTagText}>PREMIUM SYNTHESIS</Text>
                  </View>
                </View>
                <Text style={[styles.historyText, { color: theme.text }]}>
                  {historyInsights}
                </Text>
              </View>
            ) : null}

            {/* Assessment Confidence Card */}
            <ConfidenceCard confidence={diagnosis.confidence} />

            {/* Reported & Observed Evidence Section */}
            {((diagnosis.reported && diagnosis.reported.length > 0) || (diagnosis.observed && diagnosis.observed.length > 0)) && (
              <View style={styles.section}>
                {diagnosis.reported && diagnosis.reported.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.sectionTitle}>REPORTED SYMPTOMS</Text>
                    {diagnosis.reported.map((rep, idx) => (
                      <View key={`rep-${idx}`} style={[styles.listItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Icon name="record-voice-over" size={16} color={ORANGE} />
                        <Text style={[styles.listText, { color: theme.text }]}>{rep}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {diagnosis.observed && diagnosis.observed.length > 0 && (
                  <View style={{ marginBottom: 4 }}>
                    <Text style={styles.sectionTitle}>OBSERVED MEDIA EVIDENCE</Text>
                    {diagnosis.observed.map((obs, idx) => (
                      <View key={`obs-${idx}`} style={[styles.listItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                        <Icon name="visibility" size={16} color={GREEN} />
                        <Text style={[styles.listText, { color: theme.text }]}>{obs}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Ranked Possible Cause Cards */}
            {possibleCauses.length > 0 && (
              <View style={styles.causesSection}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={[styles.detailSectionTitle, { color: isPremiumReport ? GOLD : ORANGE }]}>
                      POSSIBLE CAUSES
                    </Text>
                    <Text style={[styles.sectionSubtext, { color: theme.textSecondary }]}>
                      {isPremiumReport
                        ? 'Ranked with supporting evidence and plausible component wear'
                        : 'Ranked based on the symptoms provided'}
                    </Text>
                  </View>

                  <View style={[styles.causeCount, { backgroundColor: theme.surfaceAlt }]}>
                    <Text style={[styles.causeCountText, { color: theme.textSecondary }]}>
                      {possibleCauses.length}
                    </Text>
                  </View>
                </View>

                {possibleCauses.map((causeItem, index) => (
                  <PossibleCauseCard
                    key={`cause-${index}`}
                    cause={causeItem}
                    index={index}
                  />
                ))}
              </View>
            )}

            {/* Recommended Actions */}
            {diagnosis.recommended_actions && diagnosis.recommended_actions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>RECOMMENDED ACTIONS</Text>
                {diagnosis.recommended_actions.map((action, index) => (
                  <View key={index} style={[styles.actionItem, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Icon name="check-circle-outline" size={18} color={ORANGE} />
                    <Text style={[styles.actionText, { color: theme.text }]}>{action}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Step-by-Step Repair Guidance (Premium) */}
            {repairGuidance && (
              <View style={[styles.repairCard, { backgroundColor: theme.surface, borderColor: 'rgba(245, 158, 11, 0.35)' }]}>
                <View style={styles.repairHeaderRow}>
                  <View style={styles.repairTitleGroup}>
                    <Icon name="build-circle" size={20} color={GOLD} />
                    <Text style={styles.repairTitle}>STEP-BY-STEP REPAIR GUIDANCE</Text>
                  </View>
                  <View
                    style={[
                      styles.diyPill,
                      {
                        backgroundColor: repairGuidance.diy_friendly
                          ? 'rgba(16, 185, 129, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                        borderColor: repairGuidance.diy_friendly
                          ? 'rgba(16, 185, 129, 0.35)'
                          : 'rgba(239, 68, 68, 0.35)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.diyPillText,
                        { color: repairGuidance.diy_friendly ? GREEN : RED },
                      ]}
                    >
                      {repairGuidance.diy_friendly ? 'DIY FRIENDLY' : 'PRO RECOMMENDED'}
                    </Text>
                  </View>
                </View>

                {repairGuidance.summary ? (
                  <Text style={[styles.repairSummary, { color: theme.textSecondary }]}>
                    {repairGuidance.summary}
                  </Text>
                ) : null}

                {/* Metadata Chips: Difficulty & Estimated Time */}
                <View style={styles.metaRow}>
                  {repairGuidance.difficulty && (
                    <View style={[styles.metaChip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                      <Icon name="tune" size={15} color={GOLD} />
                      <Text style={[styles.metaChipText, { color: theme.text }]}>
                        {String(repairGuidance.difficulty).replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {(repairGuidance.estimated_diy_time || repairGuidance.estimated_time) && (
                    <View style={[styles.metaChip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                      <Icon name="schedule" size={15} color={GOLD} />
                      <Text style={[styles.metaChipText, { color: theme.text }]}>
                        {repairGuidance.estimated_diy_time || repairGuidance.estimated_time}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Tools Needed */}
                {Array.isArray(repairGuidance.tools_needed) && repairGuidance.tools_needed.length > 0 && (
                  <View style={styles.subBlock}>
                    <Text style={styles.subBlockTitle}>TOOLS & EQUIPMENT NEEDED</Text>
                    <View style={styles.toolsWrap}>
                      {repairGuidance.tools_needed.map((tool, idx) => (
                        <View key={`tool-${idx}`} style={[styles.toolChip, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                          <Icon name="handyman" size={13} color={ORANGE} />
                          <Text style={[styles.toolChipText, { color: theme.text }]}>{tool}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Prerequisites */}
                {Array.isArray(repairGuidance.prerequisites) && repairGuidance.prerequisites.length > 0 && (
                  <View style={styles.subBlock}>
                    <Text style={styles.subBlockTitle}>PREREQUISITES & PREPARATION</Text>
                    {repairGuidance.prerequisites.map((prereq, idx) => (
                      <View key={`prereq-${idx}`} style={styles.bulletItem}>
                        <Icon name="arrow-right" size={16} color={GOLD} style={{ marginTop: 2 }} />
                        <Text style={[styles.bulletText, { color: theme.text }]}>{prereq}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Numbered Procedure Steps */}
                {Array.isArray(repairGuidance.steps) && repairGuidance.steps.length > 0 && (
                  <View style={styles.subBlock}>
                    <Text style={styles.subBlockTitle}>INSPECTION & REPAIR PROCEDURE</Text>
                    {repairGuidance.steps.map((rawStep, idx) => {
                      const { num, title, desc, caution } = parseStep(rawStep, idx);
                      return (
                        <View
                          key={`step-${idx}`}
                          style={[
                            styles.stepItem,
                            {
                              backgroundColor: theme.surfaceAlt || theme.surface,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <View style={styles.stepNumBadge}>
                            <Text style={styles.stepNumText}>{num}</Text>
                          </View>
                          <View style={styles.stepContent}>
                            {Boolean(title) && (
                              <Text style={[styles.stepTitle, { color: theme.text }]}>
                                {title}
                              </Text>
                            )}
                            {Boolean(desc) && (
                              <Text
                                style={[
                                  styles.stepDesc,
                                  {
                                    color: title ? theme.textSecondary : theme.text,
                                    fontSize: title ? 13 : 13.5,
                                    lineHeight: 20,
                                  },
                                ]}
                              >
                                {desc}
                              </Text>
                            )}
                            {Boolean(caution) && (
                              <View style={styles.stepCaution}>
                                <Icon name="report-problem" size={13} color={GOLD} />
                                <Text style={styles.stepCautionText}>{caution}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Safety Stopping Conditions */}
                {Array.isArray(repairGuidance.safety_stopping_conditions) && repairGuidance.safety_stopping_conditions.length > 0 && (
                  <View style={[styles.safetyStopBox, { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}>
                    <View style={styles.safetyStopHeader}>
                      <Icon name="pan-tool" size={16} color={RED} />
                      <Text style={styles.safetyStopTitle}>WHEN TO STOP & CALL A MECHANIC</Text>
                    </View>
                    {repairGuidance.safety_stopping_conditions.map((cond, idx) => (
                      <View key={`stop-${idx}`} style={styles.stopConditionItem}>
                        <Icon name="close" size={14} color={RED} />
                        <Text style={styles.stopConditionText}>{cond}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}


            {/* Cost Section: Itemized (Premium) or Standard Estimate (Free) */}
            {costBreakdown ? (
              <View style={[styles.costCard, { backgroundColor: theme.surface, borderColor: 'rgba(245, 158, 11, 0.35)' }]}>
                <View style={styles.costHeader}>
                  <Icon name="receipt-long" size={20} color={GOLD} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.costTitle, { color: GOLD }]}>ITEMIZED REPAIR & PARTS BREAKDOWN</Text>
                    <Text style={[styles.costSub, { color: theme.textSecondary }]}>Premium cost intelligence</Text>
                  </View>
                </View>

                {diagnosis.estimated_cost && (
                  <View style={styles.costTotalRow}>
                    <Text style={[styles.costTotalLabel, { color: theme.textSecondary }]}>Total Estimated Range:</Text>
                    <Text style={styles.costAmount}>
                      ₱{diagnosis.estimated_cost.min?.toLocaleString()} – ₱{diagnosis.estimated_cost.max?.toLocaleString()} {diagnosis.estimated_cost.currency || 'PHP'}
                    </Text>
                  </View>
                )}

                <View style={styles.costColumns}>
                  {costBreakdown.parts && (
                    <View style={[styles.costColBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                      <View style={styles.colBoxHeader}>
                        <Icon name="shopping-bag" size={15} color={ORANGE} />
                        <Text style={[styles.colBoxTitle, { color: theme.text }]}>Parts & Materials</Text>
                      </View>
                      <Text style={styles.colBoxAmount}>
                        ₱{costBreakdown.parts.min?.toLocaleString()} – ₱{costBreakdown.parts.max?.toLocaleString()}
                      </Text>
                      {Array.isArray(costBreakdown.parts.items) && costBreakdown.parts.items.length > 0 && (
                        <View style={styles.partsItemList}>
                          {costBreakdown.parts.items.map((item, idx) => (
                            <View key={`part-${idx}`} style={styles.partItemRow}>
                              <Text style={[styles.partItemName, { color: theme.textSecondary }]} numberOfLines={1}>
                                • {typeof item === 'string' ? item : item.name}
                              </Text>
                              {typeof item === 'object' && item.cost_range ? (
                                <Text style={[styles.partItemPrice, { color: theme.text }]}>{item.cost_range}</Text>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {costBreakdown.labor && (
                    <View style={[styles.costColBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                      <View style={styles.colBoxHeader}>
                        <Icon name="engineering" size={15} color={BLUE} />
                        <Text style={[styles.colBoxTitle, { color: theme.text }]}>Labor Estimate</Text>
                      </View>
                      <Text style={styles.colBoxAmount}>
                        ₱{costBreakdown.labor.min?.toLocaleString()} – ₱{costBreakdown.labor.max?.toLocaleString()}
                      </Text>
                      {costBreakdown.labor.estimated_hours ? (
                        <Text style={[styles.laborHours, { color: theme.textSecondary }]}>
                          ~{costBreakdown.labor.estimated_hours} hr{costBreakdown.labor.estimated_hours > 1 ? 's' : ''} standard labor
                        </Text>
                      ) : null}
                    </View>
                  )}
                </View>

                {costBreakdown.assumptions ? (
                  <Text style={[styles.costDisclaimer, { color: theme.textSecondary }]}>
                    Basis: {costBreakdown.assumptions}
                  </Text>
                ) : null}
                {(costBreakdown.price_uncertainty_note || costBreakdown.uncertainty_note) ? (
                  <Text style={[styles.costDisclaimer, { color: theme.textSecondary }]}>
                    Note: {costBreakdown.price_uncertainty_note || costBreakdown.uncertainty_note}
                  </Text>
                ) : null}
              </View>
            ) : (
              diagnosis.estimated_cost && (diagnosis.estimated_cost.min > 0 || diagnosis.estimated_cost.max > 0) ? (
                <View style={[styles.costCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.costHeader}>
                    <Icon name="payments" size={20} color={ORANGE} />
                    <Text style={styles.costTitle}>ESTIMATED REPAIR COST</Text>
                  </View>

                  <Text style={styles.costAmount}>
                    ₱{diagnosis.estimated_cost.min.toLocaleString()} – ₱{diagnosis.estimated_cost.max.toLocaleString()} {diagnosis.estimated_cost.currency || 'PHP'}
                  </Text>
                  <Text style={[styles.costDisclaimer, { color: theme.textSecondary }]}>
                    This estimate is approximate; actual parts and labor charges may vary.
                  </Text>
                </View>
              ) : (
                <View style={[styles.costCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.costHeader}>
                    <Icon name="info-outline" size={20} color={theme.textSecondary} />
                    <Text style={styles.costTitle}>NO RELIABLE COST ESTIMATE</Text>
                  </View>
                  <Text style={[styles.costDisclaimer, { color: theme.textSecondary }]}>
                    There is not enough supported pricing information to provide a reliable range. Please request a quote from a repair shop.
                  </Text>
                </View>
              )
            )}

            {/* Subtle Non-Intrusive Upgrade Banner for Free Users */}
            {!isPremiumReport && (
              <View style={[styles.upgradeBanner, { backgroundColor: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.25)' }]}>
                <View style={styles.upgradeHeader}>
                  <Icon name="workspace-premium" size={22} color={GOLD} />
                  <View style={styles.upgradeHeaderText}>
                    <Text style={[styles.upgradeTitle, { color: theme.text }]}>
                      Need Deeper Repair Insights?
                    </Text>
                    <Text style={[styles.upgradeSubtitle, { color: theme.textSecondary }]}>
                      VehiCare Premium unlocks step-by-step repair guides, itemized parts vs. labor costs, and longitudinal vehicle history analysis.
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.upgradeBtn}
                  onPress={handleUpgrade}
                  activeOpacity={0.85}
                >
                  <Text style={styles.upgradeBtnText}>Explore Premium</Text>
                  <Icon name="arrow-forward" size={16} color="#000000" />
                </TouchableOpacity>
              </View>
            )}

            {/* Professional Help Recommendation */}
            {showRepairShops && (
              <View style={[styles.proHelpSection, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.proHelpHeader}>
                  <Icon name="build" size={20} color={ORANGE} />
                  <Text style={styles.proHelpTitle}>PROFESSIONAL ASSISTANCE</Text>
                </View>

                <Text style={[styles.proHelpReason, { color: theme.text }]}>
                  {diagnosis.professional_help?.reason ||
                    (isHighOrCritical
                      ? 'Qualified mechanic inspection is strongly advised for safety and component protection.'
                      : 'Inspection recommended at your convenience.')}
                </Text>

                <Text style={styles.proHelpQuestion}>How would you like to proceed?</Text>

                <View style={styles.proHelpButtons}>
                  <TouchableOpacity
                    style={[styles.btnPrimary, { backgroundColor: ORANGE }]}
                    onPress={() => {
                      onClose();
                      if (onFindNearbyShops) onFindNearbyShops();
                    }}
                    activeOpacity={0.85}
                  >
                    <Icon name="near-me" size={18} color="#FFFFFF" />
                    <Text style={styles.btnPrimaryText}>Find Nearby Repair Shops</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnSecondary, { backgroundColor: theme.background, borderColor: theme.border }]}
                    onPress={() => {
                      onClose();
                      if (onOwnShopSelected) onOwnShopSelected();
                    }}
                    activeOpacity={0.8}
                  >
                    <Icon name="storefront" size={18} color={theme.text} />
                    <Text style={[styles.btnSecondaryText, { color: theme.text }]}>I Know a Repair Shop</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
  },
  modalHeader: {

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flex: 1,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  premiumAiTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiTagText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    color: ORANGE,
    letterSpacing: 0.8,
  },
  vehicleTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  warningText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#FFFFFF',
    lineHeight: 16,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  severityText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.6,
  },
  premiumPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  premiumPillText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: GOLD,
    letterSpacing: 0.5,
  },
  summaryText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
  },
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  urgencyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: ORANGE,
  },
  historyCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  historyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    color: BLUE,
    letterSpacing: 0.8,
    flex: 1,
  },
  historyTag: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  historyTagText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: BLUE,
  },
  historyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    color: TEXT_MUTED,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  causesSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  sectionSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginTop: 3,
  },
  causeCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  causeCountText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  listText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    flex: 1,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  actionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    flex: 1,
  },
  repairCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  repairHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  repairTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  repairTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: GOLD,
    letterSpacing: 0.6,
  },
  diyPill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  diyPillText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  repairSummary: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  metaChipText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  subBlock: {
    marginTop: 14,
  },
  subBlockTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    color: TEXT_MUTED,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  toolsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  toolChipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  bulletText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  stepNumBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: '#000000',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  stepDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 20,
  },
  stepCaution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  stepCautionText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: GOLD,
    flex: 1,
  },

  safetyStopBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  safetyStopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  safetyStopTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    color: RED,
    letterSpacing: 0.6,
  },
  stopConditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  stopConditionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: RED,
    flex: 1,
  },
  costCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  costHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  costTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    color: TEXT_MUTED,
    letterSpacing: 0.8,
  },
  costSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    marginTop: 2,
  },
  costTotalRow: {
    marginBottom: 12,
  },
  costTotalLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    marginBottom: 2,
  },
  costAmount: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 22,
    color: '#FFFFFF',
    marginVertical: 2,
  },
  costColumns: {
    gap: 10,
    marginBottom: 10,
  },
  costColBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  colBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  colBoxTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },
  colBoxAmount: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  partsItemList: {
    marginTop: 4,
    gap: 4,
  },
  partItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  partItemName: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    flex: 1,
  },
  partItemPrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },
  laborHours: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  costDisclaimer: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    marginTop: 4,
    lineHeight: 14,
  },
  upgradeBanner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  upgradeHeaderText: {
    flex: 1,
  },
  upgradeTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    marginBottom: 4,
  },
  upgradeSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  upgradeBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#000000',
  },
  proHelpSection: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  proHelpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  proHelpTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: ORANGE,
    letterSpacing: 0.8,
  },
  proHelpReason: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  proHelpQuestion: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    color: TEXT_MUTED,
    marginBottom: 12,
  },
  proHelpButtons: {
    gap: 10,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  btnPrimaryText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  btnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  btnSecondaryText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
});

export default DiagnosticResultModal;
