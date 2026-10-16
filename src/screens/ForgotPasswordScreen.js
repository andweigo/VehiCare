import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { sendOtp } from '../api/authApi';
import CustomToast from '../components/CustomToast';
import { formatApiMessage } from './OtpVerificationScreen';
import { useTheme } from '../theme/ThemeContext';

const ForgotPasswordScreen = ({ navigation }) => {
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback(({ type = 'info', title = '', message = '', duration = 3500 }) => {
    setToast({ type, title, message, duration });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const handleSendCode = async () => {
    Keyboard.dismiss();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      showToast({
        type: 'warning',
        title: 'Missing Email',
        message: 'Please enter your email address.',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showToast({
        type: 'warning',
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await sendOtp(trimmedEmail, 'password_reset');

      if (response?.success) {
        showToast({
          type: 'success',
          title: 'Code Sent',
          message: 'A verification code has been sent to your email.',
          duration: 1500,
        });

        setTimeout(() => {
          navigation.navigate('OtpVerification', {
            email: trimmedEmail,
            purpose: 'password_reset',
          });
        }, 1500);
      } else {
        const cd = response?.cooldown_seconds || response?.cooldown;
        const msg = response?.message;
        const isNotFound =
          response?.status === 404 ||
          String(msg).toLowerCase().includes('not found') ||
          String(msg).toLowerCase().includes('no account');

        showToast({
          type: isNotFound ? 'warning' : 'error',
          title: isNotFound ? 'Account Not Found' : cd ? 'Cooldown Active' : 'Request Failed',
          message: formatApiMessage(msg) || 'Unable to send verification code.',
        });

        if (cd) {
          setTimeout(() => {
            navigation.navigate('OtpVerification', {
              email: trimmedEmail,
              purpose: 'password_reset',
              cooldown_seconds: cd,
            });
          }, 1500);
        }
      }
    } catch (err) {
      const resData = err?.response?.data;
      const status = err?.response?.status;
      const rawMsg = resData?.message || err?.message || 'Failed to request password reset code.';
      const cd = resData?.cooldown_seconds || resData?.cooldown;

      let title = 'Reset Error';
      let message = formatApiMessage(rawMsg);

      if (status === 404 || String(rawMsg).toLowerCase().includes('no account found')) {
        title = 'Account Not Found';
        message = rawMsg || 'No account found with this email address.';
      } else if (cd) {
        title = 'Cooldown Active';
      }

      showToast({
        type: status === 404 ? 'warning' : 'error',
        title,
        message,
      });

      if (cd) {
        setTimeout(() => {
          navigation.navigate('OtpVerification', {
            email: trimmedEmail,
            purpose: 'password_reset',
            cooldown_seconds: cd,
          });
        }, 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      <CustomToast toast={toast} onHide={hideToast} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexOne}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* TOP BAR / BACK BUTTON */}
            <View style={styles.topBar}>
              <TouchableOpacity
                style={[
                  styles.backButton,
                  { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                ]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* HEADER */}
            <View style={styles.headerBox}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor:
                      theme.mode === 'dark' ? 'rgba(246, 59, 5, 0.15)' : 'rgba(246, 59, 5, 0.08)',
                    borderColor: 'rgba(246, 59, 5, 0.3)',
                  },
                ]}
              >
                <Ionicons name="key-outline" size={32} color={theme.accent} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Forgot Password</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Enter your registered email address and we will send you a 6-digit verification code to reset your password.
              </Text>
            </View>

            {/* INPUT SECTION */}
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email Address</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.surfaceAlt,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={19}
                    color={theme.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.placeholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* ACTION BUTTON */}
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: theme.accent },
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleSendCode}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>

              {/* FOOTER LINK */}
              <TouchableOpacity
                style={styles.footerLink}
                onPress={() => navigation.navigate('Login')}
                activeOpacity={0.7}
              >
                <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                  Remember your password?{' '}
                  <Text style={[styles.footerTextBold, { color: theme.accent }]}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 8 : 12,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBox: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 28,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  inputGroup: {
    marginBottom: 22,
  },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  button: {
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.1,
  },
  footerLink: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  footerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  footerTextBold: {
    fontFamily: 'Inter-SemiBold',
  },
});

export default ForgotPasswordScreen;
