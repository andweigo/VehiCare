import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAIUsage } from '../context/AIUsageContext';
import { useTheme } from '../theme/ThemeContext';
import AIUsageDonut from './AIUsageDonut';

const formatShortDate = (isoString) => {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch (_) {
    return null;
  }
};

const AIUsageCard = ({
  onPress,
  onViewDetails,
  onUpgrade,
  style,
  testID = 'ai-usage-card',
}) => {
  const { theme } = useTheme();
  const { usage, loading, error, refreshUsage, openDetailsModal } = useAIUsage();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (onViewDetails) {
      onViewDetails();
    } else {
      openDetailsModal();
    }
  };

  const plan = usage?.plan || 'free';
  const isGuest = plan === 'guest';
  const isPremium = plan === 'premium';
  const limit = typeof usage?.limit === 'number' ? usage.limit : (isPremium ? 100 : isGuest ? 5 : 20);
  const used = typeof usage?.used === 'number' ? usage.used : 0;
  const remaining = typeof usage?.remaining === 'number' ? usage.remaining : Math.max(0, limit - used);
  const exhausted = Boolean(usage?.exhausted || remaining <= 0 || used >= limit);

  const planBadgeText = isPremium ? 'Premium Plan' : isGuest ? 'Guest Mode' : 'Free Plan';
  const planBadgeColor = isPremium ? '#F59E0B' : '#F5501C';

  const resetShortDate = formatShortDate(usage?.reset_at);
  const summaryText = exhausted
    ? isGuest
      ? '0 left — guest allowance used'
      : `0 left — resets ${resetShortDate || 'next month'}`
    : isGuest
    ? `${remaining} guest consultation${remaining === 1 ? '' : 's'} remaining`
    : `${remaining} consultation${remaining === 1 ? '' : 's'} left this month`;

  const sublineText = isGuest
    ? '5 total consultations allowance'
    : resetShortDate
    ? `Monthly quota • Resets ${resetShortDate}`
    : 'Monthly quota • Resets 1st of month';

  // Loading skeleton / placeholder
  if (loading && !usage?.limit) {
    return (
      <View
        testID="ai-usage-card-loading"
        style={[
          styles.card,
          {
            backgroundColor: theme.surface || '#151515',
            borderColor: theme.border || '#292929',
          },
          style,
        ]}
      >
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.accent || '#F5501C'} />
          <Text style={[styles.loadingText, { color: theme.textSecondary || '#8E8E93' }]}>
            Loading AI consultation quota...
          </Text>
        </View>
      </View>
    );
  }

  // Error fallback state
  if (error && !usage?.limit) {
    return (
      <View
        testID="ai-usage-card-error"
        style={[
          styles.card,
          {
            backgroundColor: theme.surface || '#151515',
            borderColor: theme.border || '#292929',
          },
          style,
        ]}
      >
        <View style={styles.errorRow}>
          <Feather name="alert-circle" size={20} color="#F5501C" />
          <Text style={[styles.errorText, { color: theme.textSecondary || '#8E8E93' }]}>
            Unable to sync AI quota
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { borderColor: theme.accent || '#F5501C' }]}
            onPress={() => refreshUsage()}
          >
            <Text style={[styles.retryText, { color: theme.accent || '#F5501C' }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.card,
        {
          backgroundColor: theme.surface || '#151515',
          borderColor: exhausted ? '#F5501C' : theme.border || '#292929',
        },
        style,
      ]}
      activeOpacity={0.88}
      onPress={handlePress}
    >
      {/* Top Header Row */}
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.sparkDot, { backgroundColor: theme.accent || '#F5501C' }]} />
          <Text style={[styles.cardTag, { color: theme.textSecondary || '#8E8E93' }]}>
            AI CONSULTATION USAGE
          </Text>
        </View>

        <View style={[styles.planBadge, { backgroundColor: planBadgeColor + '18', borderColor: planBadgeColor + '40' }]}>
          <Text style={[styles.planBadgeText, { color: planBadgeColor }]}>
            {planBadgeText}
          </Text>
        </View>
      </View>

      {/* Main Content: Donut + Details */}
      <View style={styles.bodyRow}>
        <View style={styles.donutContainer}>
          <AIUsageDonut
            used={used}
            limit={limit}
            size={76}
            strokeWidth={7}
            isExhausted={exhausted}
            activeColor={theme.accent || '#F5501C'}
            trackColor={theme.dark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)"}
            textColor={theme.text}
            exhaustedColor="#F5501C"
            testID="dashboard-donut-ring"
          />
        </View>

        <View style={styles.textDetails}>
          <Text
            style={[
              styles.summaryTitle,
              { color: exhausted ? '#F5501C' : theme.text || '#FFFFFF' },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {summaryText}
          </Text>

          <Text
            style={[styles.subline, { color: theme.textSecondary || '#8E8E93' }]}
            numberOfLines={1}
          >
            {sublineText}
          </Text>

          <View style={styles.actionRow}>
            <Text style={[styles.viewDetailsText, { color: theme.accent || '#F5501C' }]}>
              View details
            </Text>
            <MaterialIcons
              name="chevron-right"
              size={18}
              color={theme.accent || '#F5501C'}
            />
          </View>
        </View>
      </View>

      {/* Progress Bar reflecting true values */}
      <View style={styles.progressBarWrapper} testID="ai-usage-progress-bar">
        <View style={[styles.progressBarTrack, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
          <View
            testID="ai-usage-progress-fill"
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, Math.max(used > 0 ? 3 : 0, Math.round(limit > 0 ? (used / limit) * 100 : 0)))}%`,
                backgroundColor: exhausted ? '#F5501C' : (used / limit >= 0.8 ? '#F59E0B' : (theme.accent || '#F5501C')),
              },
            ]}
          />
        </View>
        <View style={styles.progressBarMeta}>
          <Text style={[styles.progressCountText, { color: theme.textSecondary || '#8E8E93' }]}>
            {used} of {limit} used
          </Text>
          <Text style={[styles.progressPercentText, { color: exhausted ? '#F5501C' : (theme.text || '#FFFFFF') }]}>
            {Math.min(100, Math.round(limit > 0 ? (used / limit) * 100 : 0))}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sparkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.3,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '800',
    fontFamily: 'Outfit-Bold',
    letterSpacing: -0.2,
    lineHeight: 22,
    marginBottom: 3,
  },
  subline: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 17,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    flex: 1,
    marginLeft: 8,
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  progressBarWrapper: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressBarMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  progressCountText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  progressPercentText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
  },
});

export default AIUsageCard;
