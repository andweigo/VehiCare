import { useState } from 'react';
import {
  ActivityIndicator,
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
import CustomToast from '../components/CustomToast';
import { useAuth } from '../context/AuthContext';
import useToast from '../hooks/useToast';
import { useTheme } from '../theme/ThemeContext';

const LoginScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { toast, showToast, hideToast } = useToast();
  const { redirectTo } = route.params || {};

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login, loginGoogle } = useAuth();
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  const getLoginErrorPayload = err => {
    const status = err?.response?.status;
    const apiMessage = String(
      err?.response?.data?.message || err?.message || '',
    ).toLowerCase();
    const code = String(err?.code || '').toLowerCase();

    if (
      status === 503 ||
      apiMessage.includes('unavailable') ||
      apiMessage.includes('service unavailable')
    ) {
      return {
        type: 'error',
        title: 'Service Unavailable',
        message:
          'Authentication service is unavailable. Please restart the app.',
      };
    }

    if (code.includes('auth/user-not-found') || apiMessage.includes('user-not-found')) {
      return {
        type: 'warning',
        title: 'Account Not Found',
        message:
          'No account found with this email. Please register or check the email.',
      };
    }

    if (code.includes('auth/wrong-password') || apiMessage.includes('wrong-password')) {
      return {
        type: 'warning',
        title: 'Incorrect Password',
        message: 'The password is incorrect. Please try again.',
      };
    }

    if (code.includes('auth/invalid-email') || apiMessage.includes('invalid email')) {
      return {
        type: 'warning',
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
      };
    }

    if (code.includes('auth/too-many-requests') || apiMessage.includes('too many requests')) {
      return {
        type: 'error',
        title: 'Too Many Attempts',
        message:
          'Too many sign-in attempts. Please wait and try again later.',
      };
    }

    return {
      type: 'error',
      title: 'Sign In Failed',
      message:
        'Please check your email and password and try again.',
    };
  };

  const getGoogleSignInPayload = (
    err,
    accountExistsMessage,
  ) => {
    const rawCode = String(err?.code || '').toLowerCase();
    const rawMessage = String(
      err?.message || err?.response?.data?.message || '',
    ).toLowerCase();
    const rawErrors = String(
      err?.response?.data?.errors?.id_token?.[0] || err?.response?.data?.errors?.email?.[0] || '',
    ).toLowerCase();
    const combined = `${rawCode} ${rawMessage} ${rawErrors}`;

    const accountNotFound = [
      'no vehicare account is linked',
      'please create an account first',
      'no account found',
    ].some(keyword => combined.includes(keyword));

    if (accountNotFound) {
      return {
        type: 'error',
        title: 'Account not found',
        message:
          'No VehiCare account is linked to this Google account. Please create an account first.',
      };
    }

    const accountConflict = [
      'auth/account-exists-with-different-credential',
      'auth/email-already-in-use',
      'auth/credential-already-in-use',
      'already registered',
      'already exists',
      'account already exists',
      'different credential',
      'credential already in use',
    ].some(keyword => combined.includes(keyword));

    if (accountConflict) {
      return {
        type: 'error',
        title: 'Account already exists',
        message: accountExistsMessage,
      };
    }

    if (
      combined.includes('play services') ||
      combined.includes('play-service') ||
      combined.includes('play services not available')
    ) {
      return {
        type: 'error',
        title: 'Google Play Services',
        message:
          'Google Play Services is not available on this device.',
      };
    }

    if (combined.includes('network')) {
      return {
        type: 'error',
        title: 'Network Error',
        message:
          'Please check your internet connection and try again.',
      };
    }

    return {
      type: 'error',
      title: 'Google Sign-In Failed',
      message:
        'We could not sign you in with this Google account. Please try again.',
    };
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showToast({
        type: 'warning',
        title: 'Missing Information',
        message:
          'Please enter both email and password.',
      });
      return;
    }

    if (typeof login !== 'function') {
      console.error('Login handler unavailable:', typeof login);
      showToast({
        type: 'error',
        title: 'Service Unavailable',
        message:
          'Authentication service is unavailable. Please restart the app.',
      });
      return;
    }

    setLoading(true);

    try {
      const result = await login(email.trim(), password);

      showToast({
        type: 'success',
        title: 'Signed In',
        message: 'Welcome back!',
        duration: 1500,
      });

      await delay(1500);

      const shouldSkipVehicleSetup =
        result?.hasAccountVehicles &&
        redirectTo?.name === 'VehicleDetails';

      if (shouldSkipVehicleSetup) {
        navigation.replace('Dashboard');
      } else if (redirectTo?.name) {
        navigation.replace(redirectTo.name, redirectTo.params);
      } else {
        navigation.replace('Dashboard');
      }
    } catch (err) {
      showToast(getLoginErrorPayload(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleGoogleSignIn = async () => {
    if (typeof loginGoogle !== 'function') {
      console.error(
        'Google sign-in handler unavailable:',
        typeof loginGoogle,
      );
      showToast({
        type: 'error',
        title: 'Google Sign-In Unavailable',
        message:
          'Google Sign-In is not available. Please restart the app.',
      });
      return;
    }

    setGoogleLoading(true);

    try {
      const result = await loginGoogle();

      showToast({
        type: 'success',
        title: 'Signed In',
        message: 'Welcome back!',
        duration: 1500,
      });
      await delay(1500);

      if (result?.requiresOtp) {
        navigation.replace('OtpVerification', {
          email: result?.email,
          purpose: 'registration',
          redirectTo,
        });
        return;
      }

      const shouldSkipVehicleSetup =
        result?.hasAccountVehicles &&
        redirectTo?.name === 'VehicleDetails';

      if (shouldSkipVehicleSetup) {
        navigation.replace('Dashboard');
      } else if (redirectTo?.name) {
        navigation.replace(redirectTo.name, redirectTo.params);
      } else {
        navigation.replace('Dashboard');
      }
    } catch (err) {
      const rawMessage = String(err?.message || '').toLowerCase();
      const isCancelled = rawMessage.includes('cancel') || rawMessage.includes('cancelled');

      if (!isCancelled) {
        showToast(
          getGoogleSignInPayload(
            err,
            'This Google account is already registered. Please use the correct sign-in method.',
          ),
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const isLoading = loading || googleLoading;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
    >
      <StatusBar
        barStyle={
          theme.name === 'dark' ? 'light-content' : 'dark-content'
        }
        backgroundColor={theme.background}
      />

      <CustomToast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onHide={hideToast}
      />

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

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Continue taking care of your vehicle.</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Email</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>            
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
              editable={!isLoading}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Password</Text>
          <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>            
            <Ionicons
              name="lock-closed-outline"
              size={19}
              color={theme.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, styles.passwordInput, { color: theme.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(previous => !previous)}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleForgotPassword}
          activeOpacity={0.7}
          style={styles.forgotButton}
        >
          <Text style={[styles.forgot, { color: theme.accent }]}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.accent }, isLoading && styles.buttonDisabled]}
          activeOpacity={0.85}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textSecondary }]}>OR</Text>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }, isLoading && styles.buttonDisabled]}
          activeOpacity={0.85}
          onPress={handleGoogleSignIn}
          disabled={isLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color={theme.text} />
          ) : (
            <View style={styles.googleButtonContent}>
              <Ionicons name="logo-google" color={theme.text} size={19} />
              <Text style={[styles.googleButtonText, { color: theme.text }]}>Continue with Google</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.footerContainer}>
          <Text style={[styles.footer, { color: theme.textSecondary }]}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => navigation.replace('Register', { redirectTo })}
            activeOpacity={0.7}
          >
            <Text style={[styles.orange, { color: theme.accent }]}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
    marginBottom: 17,
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
  passwordInput: {
    paddingRight: 8,
  },
  eyeButton: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -2,
    marginBottom: 20,
    paddingVertical: 5,
  },
  forgot: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  button: {
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 23,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    letterSpacing: 1,
    marginHorizontal: 14,
  },
  googleButton: {
    height: 54,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    marginLeft: 10,
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

export default LoginScreen;
