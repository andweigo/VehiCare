import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getPaymentHistory, getSubscriptionStatus, subscribePlan } from '../api/subscriptionApi';
import vehicleApi from '../api/vehicleApi';
import PaymentModal from '../components/PaymentModal';
import CustomModal from '../components/CustomModal';
import useCustomModal from '../hooks/useCustomModal';
import { useAuth } from '../context/AuthContext';
import useRealtimeUpdates from '../hooks/useRealtimeUpdates';
import { useTheme } from '../theme/ThemeContext';

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateStr;
  }
};

const ManagePlanScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, refreshUser } = useAuth();
  const { modalState, showModal } = useCustomModal();

  const plan = user?.subscription_plan || 'free';
  const isGuest = !user;
  const isPremium = plan === 'premium';
  const isFree = plan === 'free' || !isPremium;

  const subscriptionCycle = user?.subscription_cycle || 'monthly';
  const subscriptionStatus = user?.subscription_status || (isPremium ? 'active' : 'none');
  const expiresAt = user?.subscription_expires_at || null;
  const vehicleLimit = user?.vehicle_limit ?? (isPremium ? 5 : 1);

  const [selectedCycle, setSelectedCycle] = useState('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [registeredVehicles, setRegisteredVehicles] = useState([]);
  const [vehicleLoading, setVehicleLoading] = useState(true);

  // Workflow State & History
  const [restrictionState, setRestrictionState] = useState('none');
  const [canSubmitPayment, setCanSubmitPayment] = useState(true);
  const [activePayment, setActivePayment] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [statusLoading, setStatusLoading] = useState(true);

  const isCurrentMonthly = isPremium && subscriptionCycle === 'monthly';
  const isCurrentYearly = isPremium && subscriptionCycle === 'yearly';

  const isMonthlyDisabled = isCurrentMonthly || restrictionState === 'pending_verification' || restrictionState === 'refund_processing';
  const isYearlyDisabled = isCurrentYearly || restrictionState === 'pending_verification' || restrictionState === 'refund_processing';

  const currentVehicleLimit = vehicleLimit;
  const registeredVehicleCount = registeredVehicles.length;
  const availableSpaces = Math.max(0, currentVehicleLimit - registeredVehicleCount);

  const vehicleUsagePercent = Math.min(
    100,
    currentVehicleLimit > 0
      ? Math.round((registeredVehicleCount / currentVehicleLimit) * 100)
      : 0,
  );

  const planLabel = isPremium ? 'Premium Plan' : isFree && !isGuest ? 'Free Plan' : 'Guest';
  const planDescription = isPremium
    ? 'The full VehiCare experience. Diagnose, repair and care for every ride.'
    : 'Essential vehicle care: beginner-friendly diagnosis, plausible causes, and safe checks.';

  const features = useMemo(() => {
    if (isPremium) {
      return [
        {
          title: 'Up to 5 vehicle profiles',
          desc: 'Keep all your rides in one place.',
        },
        {
          title: '100 AI consultations / month',
          desc: 'Vehicle-specific help when you need it.',
        },
        {
          title: 'Deep diagnostic reasoning',
          desc: 'Understand findings with supporting evidence.',
        },
        {
          title: 'Step-by-step repair guides',
          desc: 'DIY instructions & professional repair guidance.',
        },
        {
          title: 'Itemized repair costs',
          desc: 'See parts and labor separately.',
        },
        {
          title: 'Vehicle history analysis',
          desc: 'Insights across repairs & maintenance.',
        },
      ];
    }
    return [
      {
        title: '1 vehicle profile',
        desc: 'Save and track your primary vehicle.',
      },
      {
        title: '20 AI consultations / month',
        desc: 'Essential vehicle-specific AI help.',
      },
      {
        title: 'Plausible causes & DIY checks',
        desc: 'Safe guidance for common vehicle symptoms.',
      },
      {
        title: 'Estimated repair cost ranges',
        desc: 'See general cost expectations before visiting shops.',
      },
    ];
  }, [isPremium]);

  const restrictionStateRef = useRef(restrictionState);
  useEffect(() => {
    restrictionStateRef.current = restrictionState;
  }, [restrictionState]);

  const refreshUserRef = useRef(refreshUser);
  useEffect(() => {
    refreshUserRef.current = refreshUser;
  }, [refreshUser]);

  const loadSubscriptionData = useCallback(async (options = {}) => {
    if (isGuest) {
      setStatusLoading(false);
      return;
    }

    try {
      const statusRes = await getSubscriptionStatus();
      if (statusRes?.status === 'success') {
        const nextRestriction = statusRes.restriction_state || 'none';
        const prevRestriction = restrictionStateRef.current;
        restrictionStateRef.current = nextRestriction;
        setRestrictionState(nextRestriction);
        setCanSubmitPayment(statusRes.can_submit_payment ?? true);
        setActivePayment(statusRes.active_payment || null);

        if (
          (options.refreshAuth || prevRestriction !== nextRestriction) &&
          typeof refreshUserRef.current === 'function'
        ) {
          await refreshUserRef.current();
        }
      }

      const historyRes = await getPaymentHistory();
      if (historyRes?.status === 'success' && Array.isArray(historyRes.payments)) {
        setPaymentHistory(historyRes.payments);
      }
    } catch (e) {
      console.warn('Error loading subscription payment info:', e?.message || e);
    } finally {
      setStatusLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    const loadVehicles = async () => {
      setVehicleLoading(true);
      try {
        const vehicles = await vehicleApi.getMyVehicles();
        setRegisteredVehicles(Array.isArray(vehicles) ? vehicles : []);
      } catch (error) {
        console.warn('Unable to load registered vehicles:', error?.message || error);
        setRegisteredVehicles([]);
      } finally {
        setVehicleLoading(false);
      }
    };

    if (!isGuest) {
      loadVehicles();
      loadSubscriptionData();
    } else {
      setRegisteredVehicles([]);
      setVehicleLoading(false);
      setStatusLoading(false);
    }
  }, [isGuest, loadSubscriptionData]);

  // Automatic status polling while a transaction is processing or pending verification
  useEffect(() => {
    if (
      isGuest ||
      (restrictionState !== 'pending_verification' &&
        restrictionState !== 'refund_processing')
    ) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      loadSubscriptionData({ refreshAuth: true });
    }, 5000);
    intervalId?.unref?.();

    return () => clearInterval(intervalId);
  }, [isGuest, restrictionState, loadSubscriptionData]);

  // Refresh subscription status when the app returns to foreground
  useEffect(() => {
    if (isGuest || !AppState?.addEventListener) {
      return undefined;
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadSubscriptionData({ refreshAuth: true });
      }
    });

    return () => {
      subscription?.remove?.();
    };
  }, [isGuest, loadSubscriptionData]);

  const handleRealtimePaymentUpdate = useCallback(
    async (eventData) => {
      if (typeof refreshUser === 'function') {
        await refreshUser();
      }
      if (eventData?.state_data) {
        setRestrictionState(eventData.state_data.restriction_state || 'none');
        setCanSubmitPayment(eventData.state_data.can_submit_payment ?? true);
        setActivePayment(eventData.state_data.active_payment || null);
        if (Array.isArray(eventData.state_data.payments)) {
          setPaymentHistory(eventData.state_data.payments);
        }
      }
      await loadSubscriptionData();
    },
    [refreshUser, loadSubscriptionData],
  );

  useRealtimeUpdates(user?.id, {
    'payment.updated': handleRealtimePaymentUpdate,
  });

  const handleSelectPlan = (cycle) => {
    if (restrictionState === 'pending_verification') {
      showModal({
        title: 'Payment Pending Verification',
        message: 'Your previous payment is currently awaiting review by VehiCare admin. Please wait for verification.',
        type: 'warning',
        primaryLabel: 'Got it',
      });
      return;
    }

    if (restrictionState === 'refund_processing') {
      showModal({
        title: 'Refund in Progress',
        message: 'Your previous payment is currently being refunded. Please wait until your refund is completed before submitting another payment.',
        type: 'warning',
        primaryLabel: 'Got it',
      });
      return;
    }

    if ((cycle === 'monthly' && isCurrentMonthly) || (cycle === 'yearly' && isCurrentYearly)) {
      showModal({
        title: 'Active Plan',
        message: `You are already subscribed to the Premium ${cycle === 'yearly' ? 'Yearly' : 'Monthly'} plan.`,
        type: 'info',
        primaryLabel: 'OK',
      });
      return;
    }

    setSelectedCycle(cycle);
    setShowConfirmModal(true);
  };

  const handleChangeBilling = () => {
    if (restrictionState === 'pending_verification') {
      showModal({
        title: 'Payment Pending Verification',
        message: 'Your previous payment is currently awaiting review by VehiCare admin. Please wait for verification.',
        type: 'warning',
        primaryLabel: 'Got it',
      });
      return;
    }

    if (restrictionState === 'refund_processing') {
      showModal({
        title: 'Refund in Progress',
        message: 'Your previous payment is currently being refunded. Please wait until your refund is completed before submitting another payment.',
        type: 'warning',
        primaryLabel: 'Got it',
      });
      return;
    }

    const targetCycle = subscriptionCycle === 'monthly' ? 'yearly' : 'monthly';
    setSelectedCycle(targetCycle);
    setShowConfirmModal(true);
  };

  const handleConfirmPayment = async (paymentData) => {
    if (isSubmitting || !canSubmitPayment || restrictionState === 'pending_verification' || restrictionState === 'refund_processing') {
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await subscribePlan(
        'premium',
        selectedCycle,
        paymentData?.paymentMethod || 'card',
        paymentData?.referenceNumber || null,
      );

      setShowConfirmModal(false);
      setRestrictionState('pending_verification');
      setCanSubmitPayment(false);
      if (res?.payment) {
        setActivePayment(res.payment);
      }

      if (typeof refreshUser === 'function') {
        await refreshUser();
      }

      await loadSubscriptionData();

      const priceText = selectedCycle === 'yearly' ? '₱1,490.00' : '₱149.00';
      showModal({
        title: 'Payment Submitted — Pending Verification',
        message: `Your ${priceText} Premium payment request has been received (Reference: ${res?.payment?.reference_number || 'VC-Payment'}). Premium entitlements will activate automatically once verified by VehiCare.`,
        type: 'info',
        primaryLabel: 'OK',
      });
    } catch (error) {
      console.error('Subscription error:', error);
      const validationErrors = error?.response?.data?.errors;
      const firstValidationError = validationErrors
        ? Object.values(validationErrors).flat()[0]
        : null;
      const message =
        firstValidationError ||
        error?.response?.data?.message ||
        error?.response?.data?.payment?.[0] ||
        error?.message ||
        'Failed to process subscription payment.';
      showModal({
        title: 'Submission Failed',
        message,
        type: 'error',
        primaryLabel: 'Close',
        destructive: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactSupport = () => {
    navigation.navigate('HelpSupport');
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.goBack()}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <Icon name="arrow-back" size={20} color={theme.text} />
            </TouchableOpacity>

            <View>
              <Text style={[styles.eyebrow, { color: theme.textSecondary }]}>
                SUBSCRIPTION
              </Text>
              <Text style={[styles.screenTitle, { color: theme.text }]}>
                Manage Plan
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.openDrawer?.() || navigation.getParent()?.openDrawer?.()}
            style={[
              styles.iconBtn,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Icon name="menu" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* WORKFLOW RESTRICTION BANNERS */}
        {restrictionState === 'pending_verification' && activePayment && (
          <View style={[styles.bannerCard, styles.pendingBannerCard]}>
            <View style={styles.bannerHeaderRow}>
              <View style={[styles.bannerIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Icon name="hourglass-empty" size={22} color="#F59E0B" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: '#F59E0B' }]}>
                  Payment Verification in Progress
                </Text>
                <Text style={[styles.bannerSubTitle, { color: theme.textSecondary }]}>
                  Your payment is currently being reviewed by VehiCare admin.
                </Text>
              </View>
            </View>

            <View style={[styles.bannerDetailsBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.bannerDetailRow}>
                <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Reference Number</Text>
                <Text style={[styles.bannerValueMono, { color: theme.text }]}>{activePayment.reference_number}</Text>
              </View>
              <View style={styles.bannerDetailRow}>
                <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Selected Plan</Text>
                <Text style={[styles.bannerValue, { color: theme.text }]}>
                  Premium ({activePayment.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'})
                </Text>
              </View>
              <View style={styles.bannerDetailRow}>
                <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Amount</Text>
                <Text style={[styles.bannerValue, { color: theme.accent, fontFamily: 'Outfit-Bold' }]}>
                  ₱{Number(activePayment.amount).toFixed(2)}
                </Text>
              </View>
              <View style={styles.bannerDetailRow}>
                <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Status</Text>
                <Text style={[styles.bannerValue, { color: '#F59E0B', fontFamily: 'Outfit-Bold' }]}>
                  Verification Pending
                </Text>
              </View>
            </View>
          </View>
        )}

        {restrictionState === 'refund_processing' && activePayment && (
          <View style={[styles.bannerCard, styles.refundProcessingBannerCard]}>
            <View style={styles.bannerHeaderRow}>
              <View style={[styles.bannerIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Icon name="error-outline" size={22} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: '#EF4444' }]}>
                  Refund in Progress
                </Text>
                <Text style={[styles.bannerSubTitle, { color: theme.textSecondary }]}>
                  Your previous payment was rejected. Please wait until your refund is completed before submitting another payment.
                </Text>
              </View>
            </View>

            <View style={[styles.bannerDetailsBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.bannerDetailRow}>
                <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Reference Number</Text>
                <Text style={[styles.bannerValueMono, { color: theme.text }]}>{activePayment.reference_number}</Text>
              </View>
              <View style={styles.bannerDetailRow}>
                <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Amount</Text>
                <Text style={[styles.bannerValue, { color: '#EF4444', fontFamily: 'Outfit-Bold' }]}>
                  ₱{Number(activePayment.amount).toFixed(2)}
                </Text>
              </View>
              <View style={styles.bannerDetailRow}>
                <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Refund Status</Text>
                <Text style={[styles.bannerValue, { color: '#EF4444', fontFamily: 'Outfit-Bold' }]}>
                  Processing (1–3 business days)
                </Text>
              </View>
            </View>
          </View>
        )}

        {restrictionState === 'refund_completed' && activePayment && (
          <View style={[styles.bannerCard, styles.refundCompletedBannerCard]}>
            <View style={styles.bannerHeaderRow}>
              <View style={[styles.bannerIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Icon name="check-circle-outline" size={22} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: '#3B82F6' }]}>
                  Refund Completed
                </Text>
                <Text style={[styles.bannerSubTitle, { color: theme.textSecondary }]}>
                  Your previous payment has been refunded. You may now submit a new payment.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Hero Current Plan Card matching reference design */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: '#16161A',
              borderColor: '#232328',
            },
          ]}
        >
          {/* Header Row */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconBox}>
              <Icon name="verified" size={22} color="#F5501C" />
            </View>

            <View style={styles.heroTitleWrap}>
              <Text style={styles.heroEyebrow}>CURRENT PLAN</Text>
              <Text style={styles.heroTitleText}>{planLabel}</Text>
            </View>

            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>
                {subscriptionStatus === 'active' ? 'Active' : subscriptionStatus.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.heroDescText}>{planDescription}</Text>

          {/* Vehicle Profiles Stats & Progress */}
          {!isGuest && (
            <View style={styles.heroUsageSection}>
              <View style={styles.usageHeaderRow}>
                <Text style={styles.usageLabel}>Vehicle profiles</Text>
                <Text style={styles.usageValue}>
                  {registeredVehicleCount} / {currentVehicleLimit}
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${vehicleUsagePercent}%` },
                  ]}
                />
              </View>

              <Text style={styles.usageCaption}>
                {vehicleLoading
                  ? 'Loading vehicles…'
                  : `${availableSpaces} vehicle ${availableSpaces === 1 ? 'space' : 'spaces'} available`}
              </Text>
            </View>
          )}
        </View>

        {/* What's Included Section matching reference design */}
        <View
          style={[
            styles.featuresCard,
            {
              backgroundColor: '#16161A',
              borderColor: '#232328',
            },
          ]}
        >
          <View style={styles.featuresHeader}>
            <Text style={styles.featuresTitle}>What's included</Text>
            <View style={styles.featuresCountBadge}>
              <Text style={styles.featuresCountText}>{features.length} features</Text>
            </View>
          </View>

          <View style={styles.featuresList}>
            {features.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.featureRow,
                  idx !== features.length - 1 && styles.featureRowDivider,
                ]}
              >
                <View style={styles.checkIconBox}>
                  <Icon name="check" size={15} color="#F5501C" />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={styles.featureItemTitle}>{item.title}</Text>
                  <Text style={styles.featureItemDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Available Plans / Upgrade / Manage Options */}
        <View style={styles.sectionHeadingWrap}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>
            {isPremium ? 'Subscription Details' : 'Choose a Plan'}
          </Text>
          <Text style={[styles.sectionHeadingDescription, { color: theme.textSecondary }]}>
            {isPremium
              ? `Currently on Premium ${subscriptionCycle === 'yearly' ? 'Yearly' : 'Monthly'} cycle`
              : 'Select your preferred billing cycle to unlock full features'}
          </Text>
        </View>

        {/* If Free: Display Monthly and Yearly options */}
        {!isPremium && (
          <View style={styles.planCardsWrap}>
            {/* Monthly Card */}
            <TouchableOpacity
              activeOpacity={0.88}
              disabled={isSubmitting || isMonthlyDisabled}
              onPress={() => handleSelectPlan('monthly')}
              style={[
                styles.planOptionCard,
                {
                  backgroundColor: '#16161A',
                  borderColor: selectedCycle === 'monthly' ? '#F5501C' : '#232328',
                  opacity: isSubmitting || isMonthlyDisabled ? 0.65 : 1,
                },
              ]}
            >
              <View style={styles.planOptionHeader}>
                <View>
                  <Text style={styles.planOptionTitle}>Premium Monthly</Text>
                  <Text style={styles.planOptionPrice}>₱149 <Text style={styles.planOptionPer}>/ month</Text></Text>
                </View>
                <View style={styles.actionPill}>
                  <Text style={styles.actionPillText}>
                    {isSubmitting && selectedCycle === 'monthly'
                      ? 'Processing…'
                      : restrictionState === 'pending_verification'
                      ? 'Verification Pending'
                      : restrictionState === 'refund_processing'
                      ? 'Refund in Progress'
                      : 'Select'}
                  </Text>
                  <Icon name="arrow-forward" size={14} color="#F5501C" />
                </View>
              </View>
              <Text style={styles.planOptionSub}>Up to 5 vehicles • Cancel anytime</Text>
            </TouchableOpacity>

            {/* Yearly Card */}
            <TouchableOpacity
              activeOpacity={0.88}
              disabled={isSubmitting || isYearlyDisabled}
              onPress={() => handleSelectPlan('yearly')}
              style={[
                styles.planOptionCard,
                {
                  backgroundColor: '#16161A',
                  borderColor: selectedCycle === 'yearly' ? '#F5501C' : '#232328',
                  opacity: isSubmitting || isYearlyDisabled ? 0.65 : 1,
                },
              ]}
            >
              <View style={styles.ribbon}>
                <Text style={styles.ribbonText}>SAVE 17%</Text>
              </View>
              <View style={styles.planOptionHeader}>
                <View>
                  <Text style={styles.planOptionTitle}>Premium Yearly</Text>
                  <Text style={styles.planOptionPrice}>₱1,490 <Text style={styles.planOptionPer}>/ year</Text></Text>
                </View>
                <View style={styles.actionPill}>
                  <Text style={styles.actionPillText}>
                    {isSubmitting && selectedCycle === 'yearly'
                      ? 'Processing…'
                      : restrictionState === 'pending_verification'
                      ? 'Verification Pending'
                      : restrictionState === 'refund_processing'
                      ? 'Refund in Progress'
                      : 'Select'}
                  </Text>
                  <Icon name="arrow-forward" size={14} color="#F5501C" />
                </View>
              </View>
              <Text style={styles.planOptionSub}>₱124/month • Up to 5 vehicles</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* If Premium: Display Manage & Billing Switch Button */}
        {isPremium && (
          <View
            style={[
              styles.manageBox,
              {
                backgroundColor: '#16161A',
                borderColor: '#232328',
              },
            ]}
          >
            <View style={styles.manageRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.heroEyebrow}>
                  {subscriptionCycle === 'yearly' ? 'ACTIVE YEARLY PLAN' : 'ACTIVE MONTHLY PLAN'}
                </Text>
                <Text style={styles.manageTitle}>Current Active Plan</Text>
                <Text style={styles.manageSub}>
                  {subscriptionCycle === 'yearly' ? 'Yearly (₱1,490/yr)' : 'Monthly (₱149/mo)'}
                  {expiresAt ? ` • Renews ${formatDate(expiresAt)}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmitting || restrictionState === 'pending_verification' || restrictionState === 'refund_processing'}
                onPress={handleChangeBilling}
                style={[
                  styles.changeBillingBtn,
                  (isSubmitting || restrictionState === 'pending_verification' || restrictionState === 'refund_processing') && { opacity: 0.6 },
                ]}
              >
                <Text style={styles.changeBillingBtnText}>
                  {isSubmitting
                    ? 'Processing…'
                    : restrictionState === 'pending_verification'
                    ? 'Verification Pending'
                    : restrictionState === 'refund_processing'
                    ? 'Refund in Progress'
                    : subscriptionCycle === 'monthly'
                    ? 'Switch to Yearly — ₱1,490/yr'
                    : 'Switch to Monthly — ₱149/mo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PAYMENT HISTORY SECTION */}
        {paymentHistory.length > 0 && (
          <View
            style={[
              styles.featuresCard,
              {
                backgroundColor: '#16161A',
                borderColor: '#232328',
                marginTop: 16,
              },
            ]}
          >
            <View style={styles.featuresHeader}>
              <Text style={styles.featuresTitle}>Payment History</Text>
              <Text style={[styles.featuresCountText, { color: theme.textSecondary }]}>
                {paymentHistory.length} records
              </Text>
            </View>

            <View style={styles.historyList}>
              {paymentHistory.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.historyItemCard,
                    {
                      backgroundColor: '#1D1D22',
                      borderColor: '#2A2A30',
                    },
                  ]}
                >
                  <View style={styles.historyItemTopRow}>
                    <View>
                      <Text style={styles.historyRefText}>{item.reference_number}</Text>
                      <Text style={styles.historyMetaText}>
                        Premium ({item.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'}) • {item.payment_method?.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.historyAmountText}>
                      ₱{Number(item.amount).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.historyStatusRow}>
                    <View style={styles.badgeGroup}>
                      {item.status === 'approved' && (
                        <View style={[styles.historyBadge, { backgroundColor: 'rgba(50, 213, 131, 0.15)' }]}>
                          <Text style={[styles.historyBadgeText, { color: '#32D583' }]}>APPROVED</Text>
                        </View>
                      )}
                      {item.status === 'pending' && (
                        <View style={[styles.historyBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                          <Text style={[styles.historyBadgeText, { color: '#F59E0B' }]}>PENDING</Text>
                        </View>
                      )}
                      {item.status === 'rejected' && (
                        <View style={[styles.historyBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                          <Text style={[styles.historyBadgeText, { color: '#EF4444' }]}>REJECTED</Text>
                        </View>
                      )}
                      {item.refund_status === 'processing' && (
                        <View style={[styles.historyBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                          <Text style={[styles.historyBadgeText, { color: '#EF4444' }]}>REFUND PROCESSING</Text>
                        </View>
                      )}
                      {item.refund_status === 'refunded' && (
                        <View style={[styles.historyBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                          <Text style={[styles.historyBadgeText, { color: '#3B82F6' }]}>REFUNDED</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.historyDateText}>
                      {formatDate(item.submitted_at || item.created_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Support Help Link */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleContactSupport}
          style={[
            styles.helpRow,
            {
              backgroundColor: '#16161A',
              borderColor: '#232328',
              marginTop: 16,
            },
          ]}
        >
          <View style={styles.helpIconBox}>
            <Icon name="support-agent" size={20} color="#F5501C" />
          </View>
          <View style={styles.helpTextWrap}>
            <Text style={styles.helpTitle}>Need help with billing?</Text>
            <Text style={styles.helpSub}>Contact VehiCare support team</Text>
          </View>
          <Icon name="chevron-right" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </ScrollView>

      {/* Payment Form Checkout Modal */}
      <PaymentModal
        visible={showConfirmModal}
        onClose={() => !isSubmitting && setShowConfirmModal(false)}
        selectedCycle={selectedCycle}
        planName="VehiCare Premium"
        onConfirmPayment={handleConfirmPayment}
        isSubmitting={isSubmitting}
        userEmail={user?.email}
        userName={user?.name}
      />

      {/* Custom Alert & Feedback Modal */}
      <CustomModal {...modalState} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  screenTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  // Hero Card
  heroCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 80, 28, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroTitleWrap: {
    flex: 1,
  },
  heroEyebrow: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 1,
    color: '#8E8E93',
  },
  heroTitleText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#FFFFFF',
    marginTop: 2,
  },
  heroBadge: {
    backgroundColor: 'rgba(245, 80, 28, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(245, 80, 28, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#F5501C',
  },
  heroDescText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: '#A0A0A5',
    marginTop: 14,
    marginBottom: 16,
  },
  heroUsageSection: {
    borderTopWidth: 1,
    borderTopColor: '#232328',
    paddingTop: 16,
  },
  usageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    color: '#FFFFFF',
  },
  usageValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#26262B',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F5501C',
    borderRadius: 3,
  },
  usageCaption: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
  },
  // Features Card
  featuresCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  featuresHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  featuresTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  featuresCountBadge: {
    backgroundColor: 'rgba(245, 80, 28, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  featuresCountText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    color: '#F5501C',
  },
  featuresList: {
    marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  featureRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#202025',
  },
  checkIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 80, 28, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureItemTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  featureItemDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
    lineHeight: 16,
  },
  // Heading
  sectionHeadingWrap: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
  },
  sectionHeadingDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  // Plan Options
  planCardsWrap: {
    gap: 12,
  },
  planOptionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  ribbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#F5501C',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 10,
  },
  ribbonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 9,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planOptionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  planOptionPrice: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    color: '#F5501C',
    marginTop: 2,
  },
  planOptionPer: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#8E8E93',
  },
  planOptionSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 6,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 80, 28, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionPillText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#F5501C',
  },
  // Manage Box
  manageBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  manageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  manageSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  changeBillingBtn: {
    backgroundColor: 'rgba(245, 80, 28, 0.14)',
    borderWidth: 1,
    borderColor: '#F5501C',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  changeBillingBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
    color: '#F5501C',
  },
  // Help Row
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  helpIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 80, 28, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  helpTextWrap: {
    flex: 1,
  },
  helpTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  helpSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 1,
  },
  // Workflow Banners
  bannerCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  pendingBannerCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: '#F59E0B',
  },
  refundProcessingBannerCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: '#EF4444',
  },
  refundCompletedBannerCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: '#3B82F6',
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bannerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
  bannerSubTitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 1,
  },
  bannerDetailsBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  bannerDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
  },
  bannerValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  bannerValueMono: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
  },
  // History List
  historyList: {
    marginTop: 10,
    gap: 10,
  },
  historyItemCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  historyItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyRefText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  historyMetaText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  historyAmountText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#F5501C',
  },
  historyStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  historyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  historyDateText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: '#8E8E93',
  },
});

export default ManagePlanScreen;
