import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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
import SubscriptionManagementCard from '../components/SubscriptionManagementCard';
import PaymentModal from '../components/PaymentModal';
import { useAuth } from '../context/AuthContext';
import useRealtimeUpdates from '../hooks/useRealtimeUpdates';
import { useTheme } from '../theme/ThemeContext';

const LOGO_SOURCE = require('../assets/logo.png');

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

  const currentVehicleLimit = vehicleLimit;
  const registeredVehicleCount = registeredVehicles.length;

  const vehicleUsagePercent = Math.min(
    100,
    currentVehicleLimit > 0
      ? Math.round((registeredVehicleCount / currentVehicleLimit) * 100)
      : 0,
  );

  const planLabel = useMemo(() => {
    if (isPremium) return 'Premium Plan';
    if (isFree && !isGuest) return 'Free Plan';
    if (isGuest) return 'Guest';
    return 'Not available';
  }, [isPremium, isFree, isGuest]);

  const planHeadline = useMemo(() => {
    if (isPremium) return 'Full VehiCare Experience';
    if (isFree) return 'Essential VehiCare Features';
    return 'Try VehiCare without an account';
  }, [isPremium, isFree]);

  const planDescription = useMemo(() => {
    if (isPremium) {
      return 'Enjoy advanced tools, up to 5 vehicle profiles, and full AI diagnostics.';
    }
    if (isFree) {
      return 'Get started with essential vehicle assistance and upgrade whenever you need more.';
    }
    return 'Create an account to save your vehicle information, history, and access account features.';
  }, [isPremium, isFree]);

  const benefits = useMemo(() => {
    if (isPremium) {
      return [
        'Up to 5 vehicle profiles',
        'Full AI-assisted diagnostics',
        'Smart maintenance assistance',
        'Advanced repair assistance',
        'Enhanced vehicle insights',
        'Premium features',
      ];
    }

    return [
      '1 vehicle profile',
      'Basic AI diagnostics',
      'Maintenance reminders',
      'Repair assistance',
      'Basic vehicle insights',
    ];
  }, [isPremium]);

  const freeComparison = [
    '1 vehicle profile',
    'Basic diagnostics',
    'Maintenance reminders',
    'Repair assistance',
  ];

  const premiumComparison = [
    'Up to 5 vehicle profiles',
    'Full AI diagnostics',
    'Smart maintenance',
    'Advanced repair assistance',
    'Premium features',
  ];

  const loadSubscriptionData = useCallback(async () => {
    if (isGuest) {
      setStatusLoading(false);
      return;
    }

    try {
      const statusRes = await getSubscriptionStatus();
      if (statusRes?.status === 'success') {
        setRestrictionState(statusRes.restriction_state || 'none');
        setCanSubmitPayment(statusRes.can_submit_payment ?? true);
        setActivePayment(statusRes.active_payment || null);
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

  const handleRealtimePaymentUpdate = useCallback(
    async (eventData) => {
      console.info('[ManagePlanScreen] Realtime payment update received:', eventData);

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
    if (!canSubmitPayment && restrictionState === 'pending_verification') {
      Alert.alert(
        'Payment Pending Verification',
        'Your previous payment is currently awaiting review by VehiCare admin. Please wait for verification.',
      );
      return;
    }

    if (!canSubmitPayment && restrictionState === 'refund_processing') {
      Alert.alert(
        'Refund in Progress',
        'Your previous payment is currently being refunded. Please wait until your refund is completed before submitting another payment.',
      );
      return;
    }

    setSelectedCycle(cycle);
    setShowConfirmModal(true);
  };

  const handleConfirmPayment = async (paymentData) => {
    setIsSubmitting(true);
    try {
      const res = await subscribePlan(
        'premium',
        selectedCycle,
        paymentData?.paymentMethod || 'card',
        paymentData?.referenceNumber || null,
      );

      setShowConfirmModal(false);

      if (typeof refreshUser === 'function') {
        await refreshUser();
      }

      await loadSubscriptionData();

      const priceText = selectedCycle === 'yearly' ? '₱1,490.00' : '₱149.00';
      Alert.alert(
        'Payment Submitted!',
        `Your ${priceText} Premium payment has been submitted successfully (Reference: ${res?.payment?.reference_number || 'VC-Payment'}). It is now awaiting admin verification.`,
        [{ text: 'OK' }],
      );
    } catch (error) {
      console.error('Subscription error:', error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.payment?.[0] ||
        error?.message ||
        'Failed to process subscription payment.';
      Alert.alert('Submission Failed', message);
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.goBack()}
            style={[
              styles.backButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Icon name="arrow-back" size={21} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Manage Plan
          </Text>
        </View>

        {/* WORKFLOW RESTRICTION BANNERS */}

        {/* 1. Pending Verification Banner */}
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
                <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Payment Method</Text>
                <Text style={[styles.bannerValue, { color: theme.text }]}>
                  {activePayment.payment_method?.toUpperCase()}
                </Text>
              </View>
              <View style={styles.bannerDetailRow}>
                <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Status</Text>
                <Text style={[styles.bannerValue, { color: '#F59E0B', fontFamily: 'Outfit-Bold' }]}>
                  Pending Verification
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 2. Refund Processing Banner */}
        {restrictionState === 'refund_processing' && activePayment && (
          <View style={[styles.bannerCard, styles.refundProcessingBannerCard]}>
            <View style={styles.bannerHeaderRow}>
              <View style={[styles.bannerIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Icon name="error-outline" size={22} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bannerTitle, { color: '#EF4444' }]}>
                  Payment Rejected • Refund in Progress
                </Text>
                <Text style={[styles.bannerSubTitle, { color: theme.textSecondary }]}>
                  Please wait until your refund is completed before submitting another payment.
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
              {activePayment.rejection_reason && (
                <View style={styles.bannerDetailRow}>
                  <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Reason</Text>
                  <Text style={[styles.bannerValue, { color: '#EF4444' }]}>
                    {activePayment.rejection_reason}
                  </Text>
                </View>
              )}
              <View style={styles.bannerDetailRow}>
                <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Refund Status</Text>
                <Text style={[styles.bannerValue, { color: '#EF4444', fontFamily: 'Outfit-Bold' }]}>
                  Processing (1–3 business days)
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 3. Refund Completed Banner */}
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

            <View style={[styles.bannerDetailsBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.bannerDetailRow}>
                <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Refund Amount</Text>
                <Text style={[styles.bannerValue, { color: '#3B82F6', fontFamily: 'Outfit-Bold' }]}>
                  ₱{Number(activePayment.refund_amount || activePayment.amount).toFixed(2)}
                </Text>
              </View>
              <View style={styles.bannerDetailRow}>
                <Text style={[styles.bannerLabel, { color: theme.textSecondary }]}>Refund Status</Text>
                <Text style={[styles.bannerValue, { color: '#3B82F6', fontFamily: 'Outfit-Bold' }]}>
                  Refunded
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Current Plan Hero */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.surface,
              borderColor: isPremium ? theme.accent : theme.border,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View
              style={[
                styles.heroIcon,
                {
                  backgroundColor: isPremium
                    ? theme.accentSoft
                    : theme.surfaceAlt,
                },
              ]}
            >
              <Icon
                name={isPremium ? 'star' : isFree ? 'person' : 'person-outline'}
                size={24}
                color={isPremium ? theme.accent : theme.textSecondary}
              />
            </View>

            <View style={styles.heroPlanInfo}>
              <View style={styles.heroLabelRow}>
                <Text
                  style={[
                    styles.heroPlanType,
                    { color: theme.textSecondary },
                  ]}
                >
                  CURRENT PLAN
                </Text>

                {isPremium && (
                  <View
                    style={[
                      styles.activeBadge,
                      { backgroundColor: theme.accentSoft },
                    ]}
                  >
                    <View
                      style={[
                        styles.activeDot,
                        { backgroundColor: theme.accent },
                      ]}
                    />
                    <Text
                      style={[
                        styles.activeBadgeText,
                        { color: theme.accent },
                      ]}
                    >
                      {subscriptionStatus === 'active' ? 'ACTIVE' : subscriptionStatus.toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={[styles.heroTitle, { color: theme.text }]}>
                {planLabel}
              </Text>
            </View>
          </View>

          <Text style={[styles.heroHeadline, { color: theme.text }]}>
            {planHeadline}
          </Text>

          <Text
            style={[styles.heroDescription, { color: theme.textSecondary }]}
          >
            {planDescription}
          </Text>

          {!isGuest && (
            <View
              style={[
                styles.vehicleUsage,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.vehicleUsageHeader}>
                <View style={styles.vehicleUsageTitleRow}>
                  <Icon name="directions-car" size={17} color={theme.accent} />
                  <Text
                    style={[styles.vehicleUsageTitle, { color: theme.text }]}
                  >
                    Vehicle profiles
                  </Text>
                </View>

                <Text
                  style={[styles.vehicleUsageValue, { color: theme.text }]}
                >
                  {registeredVehicleCount}/{currentVehicleLimit}
                </Text>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.border },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: theme.accent,
                      width: `${vehicleUsagePercent}%`,
                    },
                  ]}
                />
              </View>

              <Text
                style={[
                  styles.vehicleUsageCaption,
                  { color: theme.textSecondary },
                ]}
              >
                {vehicleLoading
                  ? 'Loading registered vehicles…'
                  : `${registeredVehicleCount} registered ${
                      registeredVehicleCount === 1 ? 'vehicle' : 'vehicles'
                    } on your account (Max limit: ${currentVehicleLimit})`}
              </Text>
            </View>
          )}
        </View>

        {/* Plan Benefits */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                What's included
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { color: theme.textSecondary },
                ]}
              >
                Features available on your plan
              </Text>
            </View>

            <View
              style={[
                styles.featureCount,
                { backgroundColor: theme.accentSoft },
              ]}
            >
              <Text
                style={[styles.featureCountText, { color: theme.accent }]}
              >
                {benefits.length}
              </Text>
            </View>
          </View>

          <View style={styles.benefitList}>
            {benefits.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.benefitRow,
                  index !== benefits.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkCircle,
                    { backgroundColor: theme.accentSoft },
                  ]}
                >
                  <Icon name="check" size={15} color={theme.accent} />
                </View>
                <Text style={[styles.benefitText, { color: theme.text }]}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Selectable Subscription Plans */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeadingWrap}>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>
              Available Plans
            </Text>
            <Text
              style={[
                styles.sectionHeadingDescription,
                { color: theme.textSecondary },
              ]}
            >
              Tap a plan below to choose your billing cycle and checkout
            </Text>
          </View>

          {/* 1. Free Plan Card */}
          <View
            style={[
              styles.compareCard,
              {
                backgroundColor: theme.surface,
                borderColor: isFree ? theme.accent : theme.border,
              },
            ]}
          >
            {isFree && !isGuest && (
              <View
                style={[
                  styles.currentBadge,
                  { backgroundColor: theme.accentSoft },
                ]}
              >
                <Text
                  style={[styles.currentBadgeText, { color: theme.accent }]}
                >
                  CURRENT PLAN
                </Text>
              </View>
            )}

            <View style={styles.compareHeader}>
              <View
                style={[
                  styles.compareIcon,
                  { backgroundColor: theme.surfaceAlt },
                ]}
              >
                <Icon
                  name="person-outline"
                  size={21}
                  color={theme.textSecondary}
                />
              </View>

              <View style={styles.compareTitleWrap}>
                <Text style={[styles.compareTitle, { color: theme.text }]}>
                  Free Plan
                </Text>
                <Text
                  style={[
                    styles.comparePrice,
                    { color: theme.textSecondary },
                  ]}
                >
                  ₱0 / month • 1 Vehicle Limit
                </Text>
              </View>
            </View>

            <View style={styles.compareFeatures}>
              {freeComparison.map((item, index) => (
                <View key={index} style={styles.compareFeatureRow}>
                  <Icon name="check" size={16} color={theme.accent} />
                  <Text
                    style={[
                      styles.compareFeatureText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* 2. Premium Monthly Card */}
          <TouchableOpacity
            activeOpacity={canSubmitPayment ? 0.88 : 1}
            disabled={!canSubmitPayment}
            onPress={() => handleSelectPlan('monthly')}
            style={[
              styles.compareCard,
              styles.premiumCompareCard,
              {
                backgroundColor: theme.surface,
                borderColor:
                  selectedCycle === 'monthly' ? theme.accent : theme.border,
                borderWidth: selectedCycle === 'monthly' ? 2 : 1,
                opacity: canSubmitPayment ? 1 : 0.65,
              },
            ]}
          >
            {isPremium && subscriptionCycle === 'monthly' && (
              <View
                style={[
                  styles.currentBadge,
                  { backgroundColor: theme.accentSoft },
                ]}
              >
                <Text
                  style={[styles.currentBadgeText, { color: theme.accent }]}
                >
                  ACTIVE MONTHLY PLAN
                </Text>
              </View>
            )}

            <View style={styles.compareHeader}>
              <View
                style={[
                  styles.compareIcon,
                  { backgroundColor: theme.accentSoft },
                ]}
              >
                <Icon name="star" size={21} color={theme.accent} />
              </View>

              <View style={styles.compareTitleWrap}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.compareTitle, { color: theme.text }]}>
                    Premium Monthly
                  </Text>
                  <View style={[styles.cycleBadge, { backgroundColor: theme.accentSoft }]}>
                    <Text style={[styles.cycleBadgeText, { color: theme.accent }]}>MONTHLY</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.comparePrice,
                    { color: theme.accent, fontFamily: 'Outfit-Bold', fontSize: 16, marginTop: 2 },
                  ]}
                >
                  ₱149 / month
                </Text>
                <Text
                  style={[
                    styles.compareSubPrice,
                    { color: theme.textSecondary },
                  ]}
                >
                  Billed monthly • Up to 5 vehicles
                </Text>
              </View>
            </View>

            <View style={styles.compareFeatures}>
              {premiumComparison.map((item, index) => (
                <View key={index} style={styles.compareFeatureRow}>
                  <Icon name="check" size={16} color={theme.accent} />
                  <Text
                    style={[
                      styles.compareFeatureText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!canSubmitPayment}
              onPress={() => handleSelectPlan('monthly')}
              style={[
                styles.cardSelectButton,
                { backgroundColor: canSubmitPayment ? theme.accent : theme.border },
              ]}
            >
              <Icon name="star" size={17} color="#FFFFFF" />
              <Text style={styles.cardSelectButtonText}>
                {canSubmitPayment
                  ? 'Select Premium Monthly — ₱149/mo'
                  : restrictionState === 'pending_verification'
                  ? 'Verification Pending'
                  : 'Refund in Progress'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* 3. Premium Yearly Card */}
          <TouchableOpacity
            activeOpacity={canSubmitPayment ? 0.88 : 1}
            disabled={!canSubmitPayment}
            onPress={() => handleSelectPlan('yearly')}
            style={[
              styles.compareCard,
              styles.premiumCompareCard,
              {
                backgroundColor: theme.surface,
                borderColor:
                  selectedCycle === 'yearly' ? theme.accent : theme.border,
                borderWidth: selectedCycle === 'yearly' ? 2 : 1,
                opacity: canSubmitPayment ? 1 : 0.65,
              },
            ]}
          >
            <View
              style={[
                styles.premiumRibbon,
                { backgroundColor: theme.accent },
              ]}
            >
              <Icon name="star" size={12} color="#FFFFFF" />
              <Text style={styles.premiumRibbonText}>BEST VALUE</Text>
            </View>

            {isPremium && subscriptionCycle === 'yearly' && (
              <View
                style={[
                  styles.currentBadge,
                  { backgroundColor: theme.accentSoft },
                ]}
              >
                <Text
                  style={[styles.currentBadgeText, { color: theme.accent }]}
                >
                  ACTIVE YEARLY PLAN
                </Text>
              </View>
            )}

            <View style={styles.compareHeader}>
              <View
                style={[
                  styles.compareIcon,
                  { backgroundColor: theme.accentSoft },
                ]}
              >
                <Icon name="stars" size={23} color={theme.accent} />
              </View>

              <View style={styles.compareTitleWrap}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.compareTitle, { color: theme.text }]}>
                    Premium Yearly
                  </Text>
                  <View style={[styles.cycleBadge, { backgroundColor: theme.accentSoft }]}>
                    <Text style={[styles.cycleBadgeText, { color: theme.accent }]}>YEARLY</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.comparePrice,
                    { color: theme.accent, fontFamily: 'Outfit-Bold', fontSize: 16, marginTop: 2 },
                  ]}
                >
                  ₱1,490 / year
                </Text>
                <Text
                  style={[
                    styles.compareSubPrice,
                    { color: theme.textSecondary },
                  ]}
                >
                  About ₱124/month (Save ₱298/year) • Up to 5 vehicles
                </Text>
              </View>
            </View>

            <View style={styles.compareFeatures}>
              {premiumComparison.map((item, index) => (
                <View key={index} style={styles.compareFeatureRow}>
                  <Icon name="check" size={16} color={theme.accent} />
                  <Text
                    style={[
                      styles.compareFeatureText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {item}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!canSubmitPayment}
              onPress={() => handleSelectPlan('yearly')}
              style={[
                styles.cardSelectButton,
                { backgroundColor: canSubmitPayment ? theme.accent : theme.border },
              ]}
            >
              <Icon name="stars" size={17} color="#FFFFFF" />
              <Text style={styles.cardSelectButtonText}>
                {canSubmitPayment
                  ? 'Select Premium Yearly — ₱1,490/yr'
                  : restrictionState === 'pending_verification'
                  ? 'Verification Pending'
                  : 'Refund in Progress'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Subscription Management Info Card */}
        <SubscriptionManagementCard
          isPremium={isPremium}
          subscriptionInterval={subscriptionCycle}
          subscriptionStatus={subscriptionStatus}
          expiresAt={expiresAt}
          vehicleLimit={vehicleLimit}
          onChangeBilling={() => canSubmitPayment && setShowConfirmModal(true)}
        />

        {/* PAYMENT HISTORY SECTION */}
        {paymentHistory.length > 0 && (
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.sectionHeader}>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Payment History
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Simulated payment attempts & refund logs
                </Text>
              </View>
            </View>

            <View style={styles.historyList}>
              {paymentHistory.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.historyItemCard,
                    {
                      backgroundColor: theme.surfaceAlt,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.historyItemTopRow}>
                    <View>
                      <Text style={[styles.historyRefText, { color: theme.text }]}>
                        {item.reference_number}
                      </Text>
                      <Text style={[styles.historyMetaText, { color: theme.textSecondary }]}>
                        Premium ({item.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'}) • {item.payment_method?.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.historyAmountText, { color: theme.accent }]}>
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

                    <Text style={[styles.historyDateText, { color: theme.textSecondary }]}>
                      {formatDate(item.submitted_at || item.created_at)}
                    </Text>
                  </View>

                  {item.rejection_reason && (
                    <Text style={[styles.rejectionReasonText, { color: '#EF4444' }]}>
                      Reason: {item.rejection_reason}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Support Card */}
        <View
          style={[
            styles.supportCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.supportIcon,
              { backgroundColor: theme.accentSoft },
            ]}
          >
            <Icon name="support-agent" size={22} color={theme.accent} />
          </View>

          <View style={styles.supportContent}>
            <Text style={[styles.supportTitle, { color: theme.text }]}>
              Need help with your plan?
            </Text>
            <Text
              style={[
                styles.supportDescription,
                { color: theme.textSecondary },
              ]}
            >
              Our support team can help with subscriptions, account questions, and premium features.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleContactSupport}
              style={[
                styles.supportButton,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                },
              ]}
            >
              <Icon name="chat" size={17} color={theme.accent} />
              <Text
                style={[
                  styles.supportButtonText,
                  { color: theme.accent },
                ]}
              >
                Contact Support
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  // Restriction Banners
  bannerCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
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
    marginBottom: 12,
  },
  bannerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bannerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  bannerSubTitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  bannerDetailsBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  bannerDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  bannerValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  bannerValueMono: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
  },
  // Hero Card
  heroCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroPlanInfo: {
    flex: 1,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroPlanType: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
    letterSpacing: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  activeBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    marginTop: 2,
  },
  heroHeadline: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    marginBottom: 6,
  },
  heroDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  vehicleUsage: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  vehicleUsageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleUsageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleUsageTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    marginLeft: 6,
  },
  vehicleUsageValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  vehicleUsageCaption: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  // Section Card
  sectionCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  sectionSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  featureCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  featureCountText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
  },
  benefitList: {
    marginTop: 4,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  // Comparison Section
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeadingWrap: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  sectionHeadingDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  compareCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    position: 'relative',
  },
  premiumCompareCard: {
    overflow: 'hidden',
  },
  currentBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  currentBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  premiumRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumRibbonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 9,
    color: '#FFFFFF',
    marginLeft: 3,
    letterSpacing: 0.5,
  },
  compareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  compareIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  compareTitleWrap: {
    flex: 1,
  },
  compareTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  cycleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cycleBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
  },
  comparePrice: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },
  compareSubPrice: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  compareFeatures: {
    marginBottom: 16,
  },
  compareFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  compareFeatureText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginLeft: 8,
  },
  cardSelectButton: {
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSelectButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 6,
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
    fontSize: 14,
  },
  historyMetaText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },
  historyAmountText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
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
    paddingVertical: 3,
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
  },
  rejectionReasonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    marginTop: 6,
  },
  // Support Card
  supportCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  supportIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  supportContent: {
    flex: 1,
  },
  supportTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  supportDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 14,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  supportButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    marginLeft: 6,
  },
});

export default ManagePlanScreen;
