import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const ConfidenceCard = ({ confidence }) => {
  const { theme } = useTheme();

  if (!confidence) return null;

  const score = typeof confidence === 'object' && confidence.score !== undefined
    ? Math.max(0, Math.min(100, Number(confidence.score) || 0))
    : (typeof confidence === 'string'
      ? (confidence.toUpperCase() === 'HIGH' ? 85 : confidence.toUpperCase() === 'MEDIUM' ? 65 : 40)
      : 75);

  const rawLevel = typeof confidence === 'object' ? (confidence.level || 'MEDIUM') : String(confidence);
  const levelStr = String(rawLevel).toUpperCase();

  const level =
    levelStr === 'VERY_HIGH'
      ? 'Very High'
      : levelStr === 'HIGH'
      ? 'High'
      : (levelStr === 'MEDIUM' || levelStr === 'MODERATE')
      ? 'Moderate'
      : levelStr === 'LOW'
      ? 'Low'
      : 'Limited';

  const reason = typeof confidence === 'object' && confidence.reason
    ? confidence.reason
    : 'Confidence is based on the information provided by the user.';

  return (
    <View style={[styles.confidenceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.confidenceHeader}>
        <View>
          <Text style={[styles.sectionEyebrow, { color: theme.accent }]}>AI ASSESSMENT</Text>
          <Text style={[styles.confidenceTitle, { color: theme.text }]}>{level} confidence</Text>
        </View>

        <View style={[styles.confidenceScore, { backgroundColor: theme.accentSoft }]}>
          <Text style={[styles.confidenceScoreText, { color: theme.accent }]}>{score}%</Text>
        </View>
      </View>

      <View style={[styles.confidenceTrack, { backgroundColor: theme.surfaceAlt }]}>
        <View style={[styles.confidenceFill, { width: `${score}%`, backgroundColor: theme.accent }]} />
      </View>

      <Text style={[styles.confidenceReason, { color: theme.textSecondary }]}>{reason}</Text>

      <View style={styles.confidenceDisclaimer}>
        <Icon name="info-outline" size={14} color={theme.textSecondary} />
        <Text style={[styles.confidenceDisclaimerText, { color: theme.textSecondary }]}>
          This reflects AI assessment confidence, not a guaranteed diagnosis.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  confidenceCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  confidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionEyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 1.4,
  },
  confidenceTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 17,
    marginTop: 4,
  },
  confidenceScore: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confidenceScoreText: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 17,
  },
  confidenceTrack: {
    height: 7,
    borderRadius: 7,
    overflow: 'hidden',
    marginTop: 14,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 7,
  },
  confidenceReason: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 11,
  },
  confidenceDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 6,
  },
  confidenceDisclaimerText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 8,
    lineHeight: 13,
  },
});

export default ConfidenceCard;
