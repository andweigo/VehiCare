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
import { useTheme } from '../theme/ThemeContext';
import ConfidenceCard from './ConfidenceCard';
import PossibleCauseCard from './PossibleCauseCard';

const ORANGE = '#F63B05';
const TEXT_MUTED = '#A1A1AA';

const DiagnosticResultModal = ({
  visible,
  onClose,
  diagnosis,
  vehicleName = 'Your Vehicle',
  onFindNearbyShops,
  onOwnShopSelected,
}) => {
  const { theme } = useTheme();

  if (!diagnosis) return null;

  const severity = diagnosis.severity || 'LOW';
  const isHighOrCritical = severity === 'HIGH' || severity === 'CRITICAL';
  const showRepairShops = isHighOrCritical || diagnosis.professional_help?.recommended === true;

  const getSeverityBadgeColor = () => {
    switch (severity) {
      case 'CRITICAL':
        return '#DC2626';
      case 'HIGH':
        return ORANGE;
      case 'MODERATE':
        return '#F59E0B';
      default:
        return '#10B981';
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
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTitleContainer}>
              <View style={styles.aiTag}>
                <Icon name="auto-awesome" size={14} color={ORANGE} />
                <Text style={styles.aiTagText}>VEHICARE AI DIAGNOSTIC REPORT</Text>
              </View>
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
                    {severity === 'CRITICAL' ? 'CRITICAL SAFETY ALERT' : 'HIGH SEVERITY ASSESSSEMENT'}
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
                        <Icon name="visibility" size={16} color="#10B981" />
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
                    <Text style={[styles.detailSectionTitle, { color: ORANGE }]}>POSSIBLE CAUSES</Text>
                    <Text style={[styles.sectionSubtext, { color: theme.textSecondary }]}>
                      Ranked based on the symptoms provided
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

            {/* Estimated Cost */}
            {diagnosis.estimated_cost && (diagnosis.estimated_cost.min > 0 || diagnosis.estimated_cost.max > 0) && (
              <View style={[styles.costCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.costHeader}>
                  <Icon name="payments" size={20} color={ORANGE} />
                  <Text style={styles.costTitle}>ESTIMATED REPAIR COST</Text>
                </View>

                <Text style={styles.costAmount}>
                  ₱{diagnosis.estimated_cost.min.toLocaleString()} – ₱{diagnosis.estimated_cost.max.toLocaleString()} {diagnosis.estimated_cost.currency || 'PHP'}
                </Text>
                <Text style={[styles.costDisclaimer, { color: theme.textSecondary }]}>
                  Costs are estimates based on standard parts and service rates. Actual mechanic charges may vary.
                </Text>
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
    marginBottom: 8,
  },
  costTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    color: TEXT_MUTED,
    letterSpacing: 0.8,
  },
  costAmount: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 22,
    color: '#FFFFFF',
    marginVertical: 4,
  },
  costDisclaimer: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    marginTop: 4,
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
