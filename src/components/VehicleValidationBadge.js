import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const ORANGE = '#F63B05';

const VehicleValidationBadge = ({ validationResult, loadingValidation }) => {
  const { theme } = useTheme();

  if (loadingValidation) {
    return (
      <View style={[styles.card, styles.loadingCard, { borderColor: 'rgba(246, 59, 5, 0.3)' }]}>
        <ActivityIndicator size="small" color={ORANGE} />
        <Text style={[styles.loadingTitle, { color: theme.text }]}>
          Verifying vehicle profile...
        </Text>
      </View>
    );
  }

  if (!validationResult) {
    return null;
  }

  const {
    status,
    is_valid,
    year_valid,
    reason,
    production_year_start,
    production_year_end,
    suggested_years,
  } = validationResult;

  if (status === 'validation_unavailable') {
    return (
      <View style={[styles.card, styles.mutedCard, { borderColor: theme.border }]}>
        <Icon name="info-outline" size={18} color={theme.textSecondary} />
        <Text style={[styles.mutedText, { color: theme.textSecondary }]}>
          Vehicle verification is temporarily unavailable.
        </Text>
      </View>
    );
  }

  // CLEAN VERIFIED DISPLAY: "Vehicle Verified" with check icon on the right side
  if (status === 'verified' || (is_valid && year_valid && status === 'likely_valid')) {
    return (
      <View style={[styles.card, styles.verifiedCard]}>
        <Text style={styles.verifiedTitle}>Vehicle Verified</Text>
        <Icon name="check-circle" size={20} color="#10B981" />
      </View>
    );
  }

  // INVALID / YEAR MISMATCH
  if (status === 'invalid' || year_valid === false) {
    const minYear = Array.isArray(suggested_years) && suggested_years.length > 0 ? Math.min(...suggested_years) : production_year_start;
    const maxYear = Array.isArray(suggested_years) && suggested_years.length > 0 ? Math.max(...suggested_years) : production_year_end;

    return (
      <View style={[styles.card, styles.warningCard]}>
        <View style={styles.warningContent}>
          <Text style={styles.warningTitle}>Vehicle / Year Mismatch</Text>
          <Text style={styles.warningReason}>
            {reason || 'The selected year does not match the historical production bounds of this model.'}
          </Text>

          {minYear && maxYear && (
            <View style={styles.suggestedRangeBox}>
              <Icon name="history" size={14} color={ORANGE} />
              <Text style={styles.suggestedRangeText}>
                Known Production Years: <Text style={styles.suggestedRangeHighlight}>{minYear} – {maxYear}</Text>
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // UNCERTAIN
  if (status === 'uncertain') {
    return (
      <View style={[styles.card, styles.uncertainCard]}>
        <Icon name="help-outline" size={18} color="#F59E0B" />
        <View style={styles.content}>
          <Text style={styles.uncertainTitle}>Uncertain Model Combination</Text>
          <Text style={styles.uncertainReason}>
            {reason || 'We could not confidently verify this vehicle model. Please double-check your entry.'}
          </Text>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 12,
  },
  content: {
    flex: 1,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(246, 59, 5, 0.06)',
    gap: 12,
  },
  loadingTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
  },
  mutedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    gap: 10,
  },
  mutedText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },

  // Verified Card (Simple & Clean with check icon on right)
  verifiedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
  },
  verifiedTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#10B981',
    letterSpacing: 0.3,
  },

  // Warning Card
  warningCard: {
    backgroundColor: 'rgba(246, 59, 5, 0.08)',
    borderColor: 'rgba(246, 59, 5, 0.3)',
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: ORANGE,
    marginBottom: 4,
  },
  warningReason: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  suggestedRangeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(246, 59, 5, 0.15)',
  },
  suggestedRangeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    color: '#A1A1AA',
  },
  suggestedRangeHighlight: {
    fontFamily: 'Outfit-Bold',
    color: ORANGE,
  },

  // Uncertain Card
  uncertainCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 10,
  },
  uncertainTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: '#F59E0B',
  },
  uncertainReason: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#A1A1AA',
    marginTop: 2,
    lineHeight: 16,
  },
});

export default VehicleValidationBadge;
