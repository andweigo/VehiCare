import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const PossibleCauseCard = ({ cause, index }) => {
  const { theme } = useTheme();

  if (!cause) return null;

  const causeTitle = typeof cause === 'string' ? cause : (cause?.cause || cause?.name || `Possible cause ${index + 1}`);
  const likelihood = String(cause?.likelihood || 'LOW').toUpperCase();

  let score = Number(cause?.likelihood_score || cause?.score);
  if (!Number.isFinite(score)) {
    const fallbackScores = {
      HIGH: 85,
      MEDIUM: 60,
      MODERATE: 60,
      LOW: 35,
    };
    score = fallbackScores[likelihood] || 25;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const getLikelihoodColor = () => {
    if (likelihood === 'HIGH') return '#FF5757';
    if (likelihood === 'MEDIUM' || likelihood === 'MODERATE') return '#F5B942';
    return '#32D583';
  };

  const color = getLikelihoodColor();
  const reason = typeof cause === 'object' ? cause?.reason : '';

  return (
    <View style={[styles.causeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.causeHeader}>
        <View style={[styles.causeNumber, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={[styles.causeNumberText, { color: theme.textSecondary }]}>
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>

        <View style={styles.causeTitleContainer}>
          <Text style={[styles.causeTitle, { color: theme.text }]}>{causeTitle}</Text>

          <View style={styles.causeLikelihoodRow}>
            <View style={[styles.causeLikelihoodDot, { backgroundColor: color }]} />
            <Text style={[styles.causeLikelihood, { color }]}>{likelihood}</Text>
            <Text style={[styles.causeScore, { color: theme.textSecondary }]}>{score}%</Text>
          </View>
        </View>
      </View>

      <View style={[styles.causeProgressTrack, { backgroundColor: theme.surfaceAlt }]}>
        <View style={[styles.causeProgressFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>

      {Boolean(reason) && (
        <Text style={[styles.causeReason, { color: theme.textSecondary }]}>{reason}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  causeCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  causeHeader: {
    flexDirection: 'row',
  },
  causeNumber: {
    width: 35,
    height: 35,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  causeNumberText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 11,
  },
  causeTitleContainer: {
    flex: 1,
  },
  causeTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    lineHeight: 19,
  },
  causeLikelihoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  causeLikelihoodDot: {
    width: 6,
    height: 6,
    borderRadius: 6,
    marginRight: 5,
  },
  causeLikelihood: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  causeScore: {
    fontFamily: 'Inter-Regular',
    fontSize: 8,
    marginLeft: 6,
  },
  causeProgressTrack: {
    height: 5,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 13,
  },
  causeProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  causeReason: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 10,
  },
});

export default PossibleCauseCard;
