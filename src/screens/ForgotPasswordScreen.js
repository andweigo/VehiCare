import { useCallback, useState } from 'react';
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
import { sendOtp } from '../api/authApi';
import CustomToast from '../components/CustomToast';
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
        showToast({
          type: 'error',
          title: 'Request Failed',
          message: response?.message || 'Unable to send verification code.',
        });
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.message || 'Failed to request password reset code.';
      showToast({
        type: 'error',
        title: 'Reset Error',
        message: apiMsg,
      });
    } finally {
      setLoading(false);
    }
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
            <View>
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
                  <Icon name="lock-reset" size={32} color={theme.accent} />
                </View>
                <Text style={[styles.title, { color: theme.text }]}>Forgot Password</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Enter the email address registered with your VehiCare account. We'll send you a 6-digit code to reset your password.
                </Text>
              </View>

              {/* EMAIL INPUT */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Email Address</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                  <Icon name="email" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Enter your email"
                    placeholderTextColor={theme.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </View>

            {/* SEND CODE BUTTON */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.accent }, loading && styles.buttonDisabled]}
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
    paddingBottom: 24,
    justifyContent: 'space-between',
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
    marginBottom: 28,
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
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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

export default ForgotPasswordScreen;
