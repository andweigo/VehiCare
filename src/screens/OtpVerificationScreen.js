import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { resendOtp, verifyOtp } from '../api/authApi';
import CustomToast from '../components/CustomToast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

const OtpVerificationScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { verifyUserEmail } = useAuth();

  const email = route?.params?.email || '';
  const purpose = route?.params?.purpose || 'registration';
  const redirectTo = route?.params?.redirectTo || null;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [toast, setToast] = useState(null);

  const inputRef = useRef(null);

  const showToast = useCallback(({ type = 'info', title = '', message = '', duration = 3000 }) => {
    setToast({ type, title, message, duration });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // 60-second Resend Cooldown Countdown
  useEffect(() => {
    let timer = null;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  // Focus input automatically
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(focusTimer);
  }, []);

  const handleVerify = async (codeToVerify = otp) => {
    const code = String(codeToVerify || '').trim();

    if (code.length !== 6) {
      showToast({
        type: 'warning',
        title: 'Incomplete Code',
        message: 'Please enter all 6 digits of your verification code.',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await verifyOtp(email, purpose, code);

      if (response?.success) {
        showToast({
          type: 'success',
          title: 'Verification Successful',
          message: response.message || 'Verification complete!',
          duration: 1500,
        });

        setTimeout(async () => {
          if (purpose === 'registration') {
            await verifyUserEmail();
            if (redirectTo?.name) {
              navigation.replace(redirectTo.name, redirectTo.params);
            } else {
              navigation.replace('Dashboard');
            }
          } else if (purpose === 'password_reset') {
            navigation.replace('ResetPassword', { email, code });
          }
        }, 1500);
      } else {
        showToast({
          type: 'error',
          title: 'Verification Failed',
          message: response?.message || 'Invalid verification code. Please try again.',
        });
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.message || 'Verification failed. Please try again.';
      showToast({
        type: 'error',
        title: 'Verification Error',
        message: apiMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = text => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(cleaned);

    if (cleaned.length === 6) {
      Keyboard.dismiss();
      handleVerify(cleaned);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);

    try {
      const response = await resendOtp(email, purpose);

      if (response?.success) {
        setCooldown(response?.cooldown_seconds || 60);
        setOtp('');
        showToast({
          type: 'success',
          title: 'Code Sent',
          message: 'A new 6-digit verification code has been sent to your email.',
        });
      } else {
        showToast({
          type: 'error',
          title: 'Resend Failed',
          message: response?.message || 'Failed to resend code. Please try again later.',
        });
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.message || 'Failed to resend code.';
      showToast({
        type: 'error',
        title: 'Resend Error',
        message: apiMsg,
      });
    } finally {
      setResending(false);
    }
  };

  const renderOtpBoxes = () => {
    const digits = otp.split('');
    const boxes = [];

    for (let i = 0; i < 6; i++) {
      const digit = digits[i] || '';
      const isFocused = otp.length === i || (otp.length === 6 && i === 5);

      boxes.push(
        <View
          key={i}
          style={[
            styles.otpBox,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: isFocused ? theme.accent : theme.border,
            },
          ]}
        >
          <Text style={[styles.otpDigit, { color: theme.text }]}>{digit}</Text>
        </View>,
      );
    }

    return boxes;
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <CustomToast toast={toast} onHide={hideToast} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexOne}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.inner}>
            {/* BACK BUTTON */}
            <TouchableOpacity
              style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={22} color={theme.text} />
            </TouchableOpacity>

            {/* HEADER */}
            <View style={styles.headerBox}>
              <View style={[styles.iconCircle, { backgroundColor: '#27160F' }]}>
                <Icon name="mark-email-read" size={32} color={theme.accent} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                {purpose === 'password_reset' ? 'Password Reset Verification' : 'Verify Your Email'}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                We've sent a 6-digit verification code to:
              </Text>
              <Text style={[styles.emailText, { color: theme.accent }]}>{email}</Text>
            </View>

            {/* OTP BOXES DISPLAY */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
              style={styles.otpContainer}
            >
              {renderOtpBoxes()}
            </TouchableOpacity>

            {/* HIDDEN REAL TEXTINPUT */}
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={handleTextChange}
              keyboardType="number-pad"
              maxLength={6}
              style={styles.hiddenInput}
              caretHidden
            />

            {/* RESEND SECTION */}
            <View style={styles.resendContainer}>
              <Text style={[styles.resendLabel, { color: theme.textSecondary }]}>
                Didn't receive the code?
              </Text>
              {cooldown > 0 ? (
                <Text style={[styles.cooldownText, { color: theme.accent }]}>
                  Resend available in {cooldown}s
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResendCode} disabled={resending} activeOpacity={0.7} style={{ paddingVertical: 4 }}>
                  <Text style={[styles.resendLink, { color: theme.accent }]}>
                    {resending ? 'Sending...' : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* SUBMIT BUTTON */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.accent }, (loading || otp.length !== 6) && styles.buttonDisabled]}
              onPress={() => handleVerify()}
              disabled={loading || otp.length !== 6}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Verify Code</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flexOne: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : 16,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBox: {
    alignItems: 'center',
    marginTop: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 24,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  resendContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
    width: '100%',
    paddingHorizontal: 12,
  },
  resendLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    textAlign: 'center',
    width: '100%',
  },
  cooldownText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default OtpVerificationScreen;
