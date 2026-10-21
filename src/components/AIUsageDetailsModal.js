import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import AIUsageDonut from './AIUsageDonut';

const WINDOW_HEIGHT = 750;

const formatResetDate = (isoString) => {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (_) {
    return null;
  }
};

const AIUsageDetailsModal = ({
  visible,
  onClose,
  usage = {},
  onUpgrade,
  onCreateAccount,
  onSignIn,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const slideY = useRef(new Animated.Value(WINDOW_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideY]);

  const hide = (callback) => {
    Animated.timing(slideY, {
      toValue: WINDOW_HEIGHT,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      callback?.();
    });
  };

  const plan = usage?.plan || 'free';
  const isGuest = plan === 'guest';
  const isFree = plan === 'free';
  const isPremium = plan === 'premium';

  const limit = typeof usage?.limit === 'number' ? usage.limit : (isPremium ? 100 : isGuest ? 5 : 20);
  const used = typeof usage?.used === 'number' ? usage.used : 0;
  const remaining = typeof usage?.remaining === 'number' ? usage.remaining : Math.max(0, limit - used);
  const exhausted = Boolean(usage?.exhausted || remaining <= 0 || used >= limit);
  const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const formattedDate = formatResetDate(usage?.reset_at);
  const resetText = isGuest
    ? 'Total Allowance • Does not reset monthly'
    : formattedDate
    ? `Resets on ${formattedDate}`
    : 'Resets on the 1st of next month';

  // Contextual tip based on usage level
  const contextualTip = (() => {
    if (exhausted) {
      if (isGuest) {
        return "You've used all 5 guest consultations. Create an account to get 20 monthly consultations.";
      }
      if (isPremium) {
        return `You've used all ${limit} premium consultations this period. Allowance resets on ${formattedDate || 'next billing cycle'}.`;
      }
      return `You've used all ${limit} consultations this month. Upgrade to Premium for 100 consultations or wait until ${formattedDate || 'next month'}.`;
    }
    if (percentage > 75) {
      return "You're approaching your limit. Consider upgrading to Premium for 100 consultations/mo.";
    }
    if (percentage >= 50) {
      return "You're halfway through your monthly allowance.";
    }
    return "You have plenty of consultations remaining.";
  })();

  const planBadgeText = isPremium ? 'Premium Plan' : isGuest ? 'Guest Mode' : 'Free Plan';
  const planBadgeColor = isPremium ? '#F59E0B' : '#F5501C';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => hide(onClose)}
      testID="ai-usage-details-modal"
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={() => hide(onClose)}
          testID="modal-backdrop-touchable"
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface || '#151515',
              borderColor: theme.border || '#292929',
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          <View style={styles.content}>
            <View style={[styles.topMarker, { backgroundColor: theme.border || '#333' }]} />

            {/* Header: Title and Plan Badge */}
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.title, { color: theme.text || '#FFF' }]}>
                  AI Consultation Quota
                </Text>
                <Text style={[styles.resetSubtext, { color: theme.textSecondary || '#8E8E93' }]}>
                  {resetText}
                </Text>
              </View>

              <View style={[styles.planBadge, { backgroundColor: planBadgeColor + '20', borderColor: planBadgeColor }]}>
                <Text style={[styles.planBadgeText, { color: planBadgeColor }]}>
                  {planBadgeText}
                </Text>
              </View>
            </View>

            {/* Donut and Breakdown Row */}
            <View style={styles.statsContainer}>
              <View style={styles.donutWrapper}>
                <AIUsageDonut
                  used={used}
                  limit={limit}
                  size={100}
                  strokeWidth={9}
                  isExhausted={exhausted}
                  activeColor="#F5501C"
                  trackColor="rgba(255, 255, 255, 0.12)"
                  testID="modal-donut-chart"
                />
              </View>

              <View style={styles.breakdownGrid}>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: theme.text || '#FFF' }]}>{used}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary || '#8E8E93' }]}>Used</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: exhausted ? '#F5501C' : '#10B981' }]}>
                    {remaining}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary || '#8E8E93' }]}>Remaining</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: theme.text || '#FFF' }]}>{limit}</Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary || '#8E8E93' }]}>Allowance</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: exhausted ? '#F5501C' : theme.accent || '#F5501C' }]}>
                    {percentage}%
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary || '#8E8E93' }]}>Quota Used</Text>
                </View>
              </View>
            </View>

            {/* Linear Progress Bar reflecting true values */}
            <View style={styles.modalProgressSection} testID="modal-progress-bar-container">
              <View style={styles.modalProgressHeader}>
                <Text style={[styles.modalProgressLabel, { color: theme.textSecondary || '#8E8E93' }]}>
                  Consultation Quota Progress
                </Text>
                <Text style={[styles.modalProgressCount, { color: theme.text || '#FFF' }]}>
                  {used} / {limit}
                </Text>
              </View>
              <View style={[styles.modalProgressTrack, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
                <View
                  testID="modal-progress-fill"
                  style={[
                    styles.modalProgressFill,
                    {
                      width: `${Math.min(100, Math.max(used > 0 ? 3 : 0, percentage))}%`,
                      backgroundColor: exhausted ? '#F5501C' : (percentage >= 80 ? '#F59E0B' : (theme.accent || '#F5501C')),
                    },
                  ]}
                />
              </View>
            </View>

            {/* Contextual Tip Card */}
            <View
              style={[
                styles.tipCard,
                {
                  backgroundColor: theme.surfaceAlt || '#1C1C1E',
                  borderColor: exhausted ? '#F5501C' : theme.border || '#2A2A2A',
                },
              ]}
            >
              <View style={styles.tipIconWrap}>
                <Feather
                  name={exhausted ? 'alert-triangle' : 'info'}
                  size={18}
                  color={exhausted ? '#F5501C' : theme.accent || '#F5501C'}
                />
              </View>
              <Text style={[styles.tipText, { color: theme.text || '#E0E0E0' }]}>
                {contextualTip}
              </Text>
            </View>

            {/* CTA Buttons */}
            <View style={styles.actionsContainer}>
              {isGuest ? (
                <>
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: theme.accent || '#F5501C' }]}
                    activeOpacity={0.85}
                    onPress={() => hide(onCreateAccount)}
                    testID="create-account-button"
                  >
                    <Feather name="user-plus" size={17} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryButtonText}>
                      {t('createFreeAccount', 'Create Free Account (20/mo)')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.secondaryButton, { borderColor: theme.accent || '#F5501C' }]}
                    activeOpacity={0.85}
                    onPress={() => hide(onSignIn)}
                  >
                    <Text style={[styles.secondaryButtonText, { color: theme.accent || '#F5501C' }]}>
                      {t('signIn', 'Sign In to Existing Account')}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : isFree ? (
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.accent || '#F5501C' }]}
                  activeOpacity={0.85}
                  onPress={() => hide(onUpgrade)}
                  testID="upgrade-premium-button"
                >
                  <MaterialIcons name="star" size={19} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryButtonText}>
                    {t('upgradeToPremium', 'Upgrade to Premium (100/mo)')}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.closeButton}
                activeOpacity={0.8}
                onPress={() => hide(onClose)}
                testID="modal-close-button"
              >
                <Text style={[styles.closeButtonText, { color: theme.textSecondary || '#8E8E93' }]}>
                  {t('close', 'Close')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  topMarker: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: 'Outfit-Bold',
    letterSpacing: -0.3,
  },
  resetSubtext: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 16,
  },
  donutWrapper: {
    padding: 4,
  },
  breakdownGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBox: {
    width: '47%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Outfit-Bold',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },
  modalProgressSection: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalProgressLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  modalProgressCount: {
    fontSize: 12,
    fontFamily: 'Outfit-Bold',
    fontWeight: '700',
  },
  modalProgressTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  modalProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  tipIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter-Medium',
  },
  actionsContainer: {
    gap: 10,
  },
  primaryButton: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
  },
  secondaryButton: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
  },
  closeButton: {
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
  },
});

export default AIUsageDetailsModal;
