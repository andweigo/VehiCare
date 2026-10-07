import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const QR_IMAGE = require('../assets/qr.jpg');

const PaymentModal = ({
  visible,
  onClose,
  selectedCycle = 'monthly',
  planName = 'VehiCare Premium',
  onConfirmPayment,
  isSubmitting = false,
  userEmail = '',
  userName = '',
}) => {
  const { theme } = useTheme();

  // Payment Method: 'card' or 'gcash'
  const [paymentMethod, setPaymentMethod] = useState('card');

  // Card Form Fields
  const [cardholderName, setCardholderName] = useState(userName || 'Jenny Rosen');
  const [cardNumber, setCardNumber] = useState('1234 1234 1234 1234');
  const [expiryDate, setExpiryDate] = useState('12/30');
  const [cvc, setCvc] = useState('135');

  // GCash Reference Number
  const [gcashRefNumber, setGcashRefNumber] = useState('VEHICARE-DEMO-001');
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Dynamic Price Formatting
  const priceFormatted = useMemo(() => {
    return selectedCycle === 'yearly' ? '₱1,490.00' : '₱149.00';
  }, [selectedCycle]);

  const cycleText = useMemo(() => {
    return selectedCycle === 'yearly' ? 'Yearly' : 'Monthly';
  }, [selectedCycle]);

  const cyclePriceSub = useMemo(() => {
    return selectedCycle === 'yearly' ? '₱1,490.00 / year' : '₱149.00 / month';
  }, [selectedCycle]);

  const handleCopyAccount = () => {
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handlePayPress = () => {
    if (paymentMethod === 'gcash' && !gcashRefNumber.trim()) {
      Alert.alert('Reference Number Required', 'Please enter your GCash reference number to complete payment verification.');
      return;
    }

    if (onConfirmPayment) {
      onConfirmPayment({
        paymentMethod,
        cardholderName,
        referenceNumber: paymentMethod === 'gcash' ? gcashRefNumber : null,
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => !isSubmitting && onClose && onClose()}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay || 'rgba(0, 0, 0, 0.65)' }]}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          {/* 1. Header with subtle close button */}
          <View style={[styles.topHeader, { borderBottomColor: theme.border }]}>
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>
                VehiCare Premium Checkout
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={isSubmitting}
              onPress={onClose}
              style={styles.subtleCloseButton}
            >
              <Icon name="close" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* 2. Informative Subscription Summary Card */}
            <View
              style={[
                styles.planSummaryCard,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.planSummaryHeader}>
                <View style={styles.planTitleGroup}>
                  <View style={styles.starBadgeWrap}>
                    <Icon name="star" size={16} color={theme.accent} />
                  </View>
                  <View>
                    <Text style={[styles.planTitleText, { color: theme.text }]}>
                      {planName}
                    </Text>
                    <Text style={[styles.planCycleSubtext, { color: theme.textSecondary }]}>
                      {cycleText} subscription
                    </Text>
                  </View>
                </View>
                <Text style={[styles.planPriceMainText, { color: theme.accent }]}>
                  {cyclePriceSub}
                </Text>
              </View>

              <View style={[styles.planFeaturesList, { borderTopColor: theme.border }]}>
                <View style={styles.featureItemRow}>
                  <Icon name="check" size={15} color={theme.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.featureItemText, { color: theme.text }]}>
                    Up to 5 vehicle profiles
                  </Text>
                </View>
                <View style={styles.featureItemRow}>
                  <Icon name="check" size={15} color={theme.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.featureItemText, { color: theme.text }]}>
                    Unlimited AI diagnostics
                  </Text>
                </View>
                <View style={styles.featureItemRow}>
                  <Icon name="check" size={15} color={theme.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.featureItemText, { color: theme.text }]}>
                    Image & voice diagnostics
                  </Text>
                </View>
                <View style={styles.featureItemRow}>
                  <Icon name="check" size={15} color={theme.accent} style={{ marginRight: 6 }} />
                  <Text style={[styles.featureItemText, { color: theme.text }]}>
                    Smart maintenance tracking
                  </Text>
                </View>
              </View>
            </View>

            {/* 3. Streamlined Single-Level Payment Method Selection */}
            <View style={styles.methodSelectionSection}>
              <Text style={[styles.methodSelectorLabel, { color: theme.textSecondary }]}>
                PAYMENT METHOD
              </Text>
              <View style={styles.methodSelectorRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setPaymentMethod('card')}
                  style={[
                    styles.methodOptionBtn,
                    {
                      backgroundColor: paymentMethod === 'card' ? theme.accentSoft : theme.surfaceAlt,
                      borderColor: paymentMethod === 'card' ? theme.accent : theme.border,
                      borderWidth: paymentMethod === 'card' ? 2 : 1,
                    },
                  ]}
                >
                  <Icon
                    name="credit-card"
                    size={20}
                    color={paymentMethod === 'card' ? theme.accent : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.methodOptionText,
                      { color: paymentMethod === 'card' ? theme.accent : theme.text },
                    ]}
                  >
                    Card
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setPaymentMethod('gcash')}
                  style={[
                    styles.methodOptionBtn,
                    {
                      backgroundColor: paymentMethod === 'gcash' ? theme.accentSoft : theme.surfaceAlt,
                      borderColor: paymentMethod === 'gcash' ? theme.accent : theme.border,
                      borderWidth: paymentMethod === 'gcash' ? 2 : 1,
                    },
                  ]}
                >
                  <Icon
                    name="account-balance-wallet"
                    size={20}
                    color={paymentMethod === 'gcash' ? theme.accent : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.methodOptionText,
                      { color: paymentMethod === 'gcash' ? theme.accent : theme.text },
                    ]}
                  >
                    GCash
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. Payment Fields (Card vs GCash) */}
            {paymentMethod === 'card' ? (
              /* CARD PAYMENT FIELDS */
              <View style={styles.fieldsContainer}>
                {/* Cardholder name */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                    Cardholder Name
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.surfaceAlt,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={cardholderName}
                    onChangeText={setCardholderName}
                    placeholder="Full name on card"
                    placeholderTextColor={theme.placeholder}
                  />
                </View>

                {/* Card number */}
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                    Card Number
                  </Text>
                  <View style={styles.inputWithBadgesContainer}>
                    <TextInput
                      style={[
                        styles.textInput,
                        styles.inputWithBadges,
                        {
                          backgroundColor: theme.surfaceAlt,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      value={cardNumber}
                      onChangeText={setCardNumber}
                      keyboardType="number-pad"
                      placeholderTextColor={theme.placeholder}
                    />
                    <View style={styles.cardBadges}>
                      <View style={[styles.cardBadge, { backgroundColor: '#1E3A8A' }]}>
                        <Text style={styles.cardBadgeText}>VISA</Text>
                      </View>
                      <View style={[styles.cardBadge, { backgroundColor: '#EA580C' }]}>
                        <Text style={styles.cardBadgeText}>MC</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Expiration date & CVV side-by-side */}
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                      Expiration
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: theme.surfaceAlt,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      value={expiryDate}
                      onChangeText={setExpiryDate}
                      placeholder="12/30"
                      placeholderTextColor={theme.placeholder}
                    />
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                      CVV
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: theme.surfaceAlt,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      value={cvc}
                      onChangeText={setCvc}
                      keyboardType="number-pad"
                      placeholder="123"
                      placeholderTextColor={theme.placeholder}
                    />
                  </View>
                </View>
              </View>
            ) : (
              /* GCASH PAYMENT FLOW */
              <View style={styles.fieldsContainer}>
                <Text style={[styles.gcashSectionHeading, { color: theme.text }]}>
                  Pay with GCash
                </Text>
                <Text style={[styles.gcashSectionSubheading, { color: theme.textSecondary }]}>
                  Scan the QR code below or send {priceFormatted} to the designated GCash account.
                </Text>

                {/* Amount to Pay Pill */}
                <View style={[styles.amountPill, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
                  <Text style={[styles.amountPillLabel, { color: theme.text }]}>
                    Amount to Pay:
                  </Text>
                  <Text style={[styles.amountPillValue, { color: theme.accent }]}>
                    {priceFormatted}
                  </Text>
                </View>

                {/* Centered QR Code Card */}
                <View
                  style={[
                    styles.qrCardContainer,
                    {
                      backgroundColor: theme.surfaceAlt,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.qrInnerBox}>
                    <Image
                      source={QR_IMAGE}
                      style={styles.qrImage}
                      resizeMode="contain"
                    />
                  </View>
                </View>

                {/* Account Details Box */}
                <View
                  style={[
                    styles.accountInfoCard,
                    {
                      backgroundColor: theme.surfaceAlt,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={styles.accountDetailsRow}>
                    <View>
                      <Text style={[styles.accountInfoLabel, { color: theme.textSecondary }]}>
                        GCASH ACCOUNT
                      </Text>
                      <Text style={[styles.accountNameText, { color: theme.text }]}>
                        VehiCare
                      </Text>
                      <Text style={[styles.accountNumberText, { color: theme.accent }]}>
                        0998 765 4321
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={handleCopyAccount}
                      style={[
                        styles.copyButton,
                        {
                          backgroundColor: copiedAccount ? theme.accentSoft : theme.surface,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Icon
                        name={copiedAccount ? 'check' : 'content-copy'}
                        size={15}
                        color={copiedAccount ? theme.accent : theme.textSecondary}
                      />
                      <Text
                        style={[
                          styles.copyButtonText,
                          { color: copiedAccount ? theme.accent : theme.textSecondary },
                        ]}
                      >
                        {copiedAccount ? 'Copied' : 'Copy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Instructions & Reference Number Input */}
                <View style={styles.refInstructionBox}>
                  <Text style={[styles.refInstructionText, { color: theme.textSecondary }]}>
                    After sending the payment, enter your transaction reference number below.
                  </Text>

                  <View style={styles.fieldGroup}>
                    <Text style={[styles.fieldLabel, { color: theme.text }]}>
                      GCash Reference Number
                    </Text>
                    <TextInput
                      style={[
                        styles.textInput,
                        {
                          backgroundColor: theme.surfaceAlt,
                          borderColor: theme.border,
                          color: theme.text,
                        },
                      ]}
                      value={gcashRefNumber}
                      onChangeText={setGcashRefNumber}
                      placeholder="Enter reference number"
                      placeholderTextColor={theme.placeholder}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                {/* Payment Verification Notice */}
                <View
                  style={[
                    styles.verificationNoticeCard,
                    {
                      backgroundColor: theme.accentSoft,
                      borderColor: theme.accent,
                    },
                  ]}
                >
                  <View style={styles.noticeHeadingRow}>
                    <Icon name="info-outline" size={16} color={theme.accent} />
                    <Text style={[styles.noticeText, { color: theme.textSecondary, flex: 1, marginLeft: 6 }]}>
                      Payment verification may be required before Premium access is activated.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* 5. Improved Order Summary */}
            <View style={[styles.summaryBox, { borderTopColor: theme.border }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabelText, { color: theme.textSecondary }]}>
                  Subscription
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLineTitle, { color: theme.text }]}>
                  VehiCare Premium — {cycleText}
                </Text>
                <Text style={[styles.summaryLinePrice, { color: theme.text }]}>
                  {priceFormatted}
                </Text>
              </View>

              <View style={[styles.totalDueRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.totalDueLabel, { color: theme.text }]}>
                  Total due today
                </Text>
                <Text style={[styles.totalDueValue, { color: theme.accent }]}>
                  {priceFormatted}
                </Text>
              </View>
            </View>

            {/* 6. Primary Action Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              disabled={isSubmitting}
              onPress={handlePayPress}
              style={[
                styles.payButton,
                {
                  backgroundColor: theme.accent,
                  opacity: isSubmitting ? 0.75 : 1,
                },
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Icon name="lock" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.payButtonText}>
                    {paymentMethod === 'gcash' ? 'Submit Payment' : `Pay ${priceFormatted}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* 7. Clear & Safe Capstone Footer */}
            <View style={styles.footerWrap}>
              <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                VehiCare Premium  •  Secure Checkout  •  Terms  •  Privacy
              </Text>
              <Text style={[styles.demoNoteText, { color: theme.textSecondary }]}>
                Demo Payment  •  No real charge will be made
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitleWrap: {
    flex: 1,
  },
  modalHeaderTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  subtleCloseButton: {
    padding: 4,
  },
  scrollBody: {
    paddingTop: 14,
    paddingBottom: 36,
  },
  // Subscription Plan Summary Card
  planSummaryCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  planSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starBadgeWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(246, 59, 5, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  planTitleText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
  },
  planCycleSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  planPriceMainText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
  },
  planFeaturesList: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 6,
  },
  featureItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureItemText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  // Payment Method Selection
  methodSelectionSection: {
    marginBottom: 16,
  },
  methodSelectorLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  methodSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  methodOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 8,
  },
  methodOptionText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
  // Fields Container
  fieldsContainer: {
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
  },
  fieldLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    marginBottom: 5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  inputWithBadgesContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithBadges: {
    paddingRight: 80,
  },
  cardBadges: {
    position: 'absolute',
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  cardBadge: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
  },
  cardBadgeText: {
    fontSize: 9,
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
  },
  // GCash Specific Styles
  gcashSectionHeading: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    marginBottom: 4,
  },
  gcashSectionSubheading: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  amountPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  amountPillLabel: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
  },
  amountPillValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  qrCardContainer: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  qrInnerBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  qrImage: {
    width: 170,
    height: 170,
    borderRadius: 8,
  },
  accountInfoCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  accountInfoLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  accountDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountNameText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
  },
  accountNumberText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    marginTop: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  copyButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    marginLeft: 4,
  },
  refInstructionBox: {
    marginBottom: 12,
  },
  refInstructionText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  verificationNoticeCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 2,
  },
  noticeHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  // Order Summary Box
  summaryBox: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryLabelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  summaryLineTitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  summaryLinePrice: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  totalDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  totalDueLabel: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  totalDueValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  // Pay Button
  payButton: {
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F63B05',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 14,
  },
  payButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  // Footer
  footerWrap: {
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  demoNoteText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
  },
});

export default PaymentModal;
