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
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar
        barStyle={theme?.name === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={theme.background}
      />
      <CustomToast toast={toast} onHide={hideToast} />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons
          name="arrow-back"
          size={21}
          color={theme.text}
        />
      </TouchableOpacity>

      <Text style={[styles.logo, { color: theme.text }]}>VehiCare</Text>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Forgot password</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Enter your email to receive a 6-digit verification code.
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email</Text>
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
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.accent },
              loading && styles.buttonDisabled,
            ]}
            activeOpacity={0.85}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Send Verification Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.footerContainer}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={[styles.footer, { color: theme.textSecondary }]}>
              Remember your password?{' '}
              <Text style={[styles.orange, { color: theme.accent }]}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexOne: {
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    marginLeft: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    alignSelf: 'center',
    marginTop: -38,
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputWrapper: {
    height: 56,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 2,
    paddingVertical: 0,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  button: {
    height: 54,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },
  footer: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  orange: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
});

export default ForgotPasswordScreen;
