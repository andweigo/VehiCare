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
import { resetPassword as resetPasswordApi } from '../api/authApi';
import CustomToast from '../components/CustomToast';
import { useTheme } from '../theme/ThemeContext';
import {
  doPasswordsMatch,
  getPasswordRequirements,
  getPasswordScore,
  getPasswordStrengthLabel,
  isPasswordStrong,
} from '../utils/passwordValidation';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { theme } = useTheme();

  const email = route?.params?.email || '';
  const code = route?.params?.code || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback(({ type = 'info', title = '', message = '', duration = 3500 }) => {
    setToast({ type, title, message, duration });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const passwordRequirements = getPasswordRequirements(password);
  const passwordScore = getPasswordScore(password);
  const passwordStrength = getPasswordStrengthLabel(password);
  const passwordMatch = doPasswordsMatch(password, confirmPassword);
  const passwordStrong = isPasswordStrong(password);

  const handleResetPassword = async () => {
    Keyboard.dismiss();

    if (!password || !confirmPassword) {
      showToast({
        type: 'warning',
        title: 'Missing Fields',
        message: 'Please fill in both password fields.',
      });
      return;
    }

    if (!passwordStrong) {
      showToast({
        type: 'warning',
        title: 'Weak Password',
        message: 'Please choose a stronger password meeting all security requirements.',
      });
      return;
    }

    if (!passwordMatch) {
      showToast({
        type: 'error',
        title: 'Password Mismatch',
        message: 'New password and confirmation password do not match.',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await resetPasswordApi(email, code, password);

      if (response?.success) {
        showToast({
          type: 'success',
          title: 'Password Reset',
          message: 'Your password has been updated successfully. Please sign in.',
          duration: 2000,
        });

        setTimeout(() => {
          navigation.replace('Login');
        }, 2000);
      } else {
        showToast({
          type: 'error',
          title: 'Reset Failed',
          message: response?.message || 'Failed to reset password. Please try again.',
        });
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.message || 'Password reset failed.';
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
                <Ionicons name="shield-checkmark-outline" size={32} color={theme.accent} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Set New Password</Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                Create a new secure password for{' '}
                <Text style={{ color: theme.accent, fontFamily: 'Inter-SemiBold' }}>{email}</Text>.
              </Text>
            </View>

            {/* FORM CONTAINER */}
            <View style={styles.formContainer}>
              {/* NEW PASSWORD INPUT */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>New Password</Text>
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
                    name="lock-closed-outline"
                    size={19}
                    color={theme.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.passwordInput, { color: theme.text }]}
                    placeholder="Enter new password"
                    placeholderTextColor={theme.placeholder}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(p => !p)}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* PASSWORD STRENGTH INDICATOR (IDENTICAL TO REGISTERSCREEN) */}
              {password.length > 0 && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.passwordStrengthHeader}>
                    <Text
                      style={[
                        styles.passwordStrengthLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Password Strength
                    </Text>

                    <Text
                      style={[
                        styles.passwordStrengthValue,
                        passwordScore >= 4 && styles.passwordStrengthGood,
                        passwordStrong && styles.passwordStrong,
                      ]}
                    >
                      {passwordStrength}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.strengthBarBackground,
                      { backgroundColor: theme.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.strengthBar,
                        {
                          width: `${Math.min((passwordScore / 5) * 100, 100)}%`,
                        },
                        passwordScore <= 2 && styles.strengthBarWeak,
                        passwordScore === 3 && styles.strengthBarFair,
                        passwordScore === 4 && styles.strengthBarGood,
                        passwordScore === 5 && styles.strengthBarStrong,
                      ]}
                    />
                  </View>

                  <View style={styles.requirementsRow}>
                    {passwordRequirements.map(requirement => (
                      <View style={styles.requirement} key={requirement.label}>
                        <View
                          style={[
                            styles.requirementIcon,
                            requirement.valid && styles.requirementIconValid,
                          ]}
                        >
                          {requirement.valid && (
                            <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                          )}
                        </View>

                        <Text
                          style={[
                            styles.requirementText,
                            {
                              color: requirement.valid
                                ? '#35B86B'
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {requirement.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* CONFIRM PASSWORD INPUT */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Confirm Password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.surfaceAlt,
                      borderColor:
                        confirmPassword.length > 0
                          ? passwordMatch
                            ? '#35B86B'
                            : '#FF5A5F'
                          : theme.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={19}
                    color={theme.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, styles.passwordInput, { color: theme.text }]}
                    placeholder="Confirm your password"
                    placeholderTextColor={theme.placeholder}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(p => !p)}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* MATCH STATUS (IDENTICAL TO REGISTERSCREEN) */}
                {confirmPassword.length > 0 && (
                  <View style={styles.matchStatus}>
                    <View
                      style={[
                        styles.matchIcon,
                        passwordMatch ? styles.matchIconValid : styles.matchIconInvalid,
                      ]}
                    >
                      <Ionicons
                        name={passwordMatch ? 'checkmark' : 'close'}
                        size={11}
                        color="#FFFFFF"
                      />
                    </View>
                    <Text
                      style={[
                        styles.matchText,
                        passwordMatch ? styles.matchTextValid : styles.matchTextInvalid,
                      ]}
                    >
                      {passwordMatch ? 'Passwords match' : 'Passwords do not match'}
                    </Text>
                  </View>
                )}
              </View>

              {/* RESET BUTTON */}
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: theme.accent },
                  (loading || !passwordStrong || !passwordMatch) && styles.buttonDisabled,
                ]}
                onPress={handleResetPassword}
                disabled={loading || !passwordStrong || !passwordMatch}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Reset Password</Text>
                )}
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
    marginBottom: 24,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
    marginTop: 6,
  },
  inputGroup: {
    marginBottom: 16,
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
    paddingLeft: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
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

  /* PASSWORD STRENGTH (SAME AS REGISTERSCREEN) */
  passwordStrengthContainer: {
    marginTop: -2,
    marginBottom: 18,
  },
  passwordStrengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  passwordStrengthLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  passwordStrengthValue: {
    color: '#FF5A5F',
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  passwordStrengthGood: {
    color: '#D6A23A',
  },
  passwordStrong: {
    color: '#35B86B',
  },
  strengthBarBackground: {
    height: 5,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 13,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 10,
  },
  strengthBarWeak: {
    backgroundColor: '#FF5A5F',
  },
  strengthBarFair: {
    backgroundColor: '#D6A23A',
  },
  strengthBarGood: {
    backgroundColor: '#D6A23A',
  },
  strengthBarStrong: {
    backgroundColor: '#35B86B',
  },
  requirementsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementIcon: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  requirementIconValid: {
    backgroundColor: '#35B86B',
  },
  requirementText: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
  },

  /* MATCH STATUS */
  matchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  matchIcon: {
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  matchIconValid: {
    backgroundColor: '#35B86B',
  },
  matchIconInvalid: {
    backgroundColor: '#FF5A5F',
  },
  matchText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },
  matchTextValid: {
    color: '#35B86B',
  },
  matchTextInvalid: {
    color: '#FF5A5F',
  },

  /* BUTTON */
  button: {
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.1,
  },
});

export default ResetPasswordScreen;
