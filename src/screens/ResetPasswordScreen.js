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

  const getMeterColor = () => {
    if (passwordScore <= 1) return '#FF5757';
    if (passwordScore <= 3) return '#F5B942';
    return '#32D583';
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
                  <Icon name="vpn-key" size={32} color={theme.accent} />
                </View>
                <Text style={[styles.title, { color: theme.text }]}>Set New Password</Text>
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  Create a new secure password for <Text style={{ color: theme.accent }}>{email}</Text>.
                </Text>
              </View>

              {/* NEW PASSWORD INPUT */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>New Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                  <Icon name="lock-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Enter new password"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(p => !p)} activeOpacity={0.7}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* PASSWORD STRENGTH METER */}
              {password.length > 0 && (
                <View style={styles.meterContainer}>
                  <View style={styles.meterRow}>
                    <View style={[styles.meterBarBackground, { backgroundColor: theme.border }]}>
                      <View
                        style={[
                          styles.meterBarFill,
                          { width: `${(passwordScore / 5) * 100}%`, backgroundColor: getMeterColor() },
                        ]}
                      />
                    </View>
                    <Text style={[styles.strengthLabel, { color: getMeterColor() }]}>
                      {passwordStrength}
                    </Text>
                  </View>

                  <View style={styles.reqGrid}>
                    {passwordRequirements.map((req, idx) => (
                      <View key={idx} style={styles.reqItem}>
                        <Icon
                          name={req.met ? 'check-circle' : 'cancel'}
                          size={15}
                          color={req.met ? '#32D583' : '#666666'}
                        />
                        <Text style={[styles.reqText, { color: req.met ? '#FFFFFF' : '#A3A3A3', fontWeight: req.met ? '600' : '400' }]}>
                          {req.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* CONFIRM PASSWORD INPUT */}
              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Confirm New Password</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                  <Icon name="lock-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Confirm new password"
                    placeholderTextColor={theme.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(p => !p)} activeOpacity={0.7}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && !passwordMatch && (
                  <Text style={styles.mismatchError}>Passwords do not match</Text>
                )}
              </View>
            </View>

            {/* RESET BUTTON */}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.accent }, (loading || !passwordStrong || !passwordMatch) && styles.buttonDisabled]}
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
    marginBottom: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justify: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
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
  meterContainer: {
    marginBottom: 16,
  },
  meterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  meterBarBackground: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 12,
  },
  meterBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
    width: 70,
    textAlign: 'right',
  },
  reqGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reqItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    gap: 4,
  },
  reqText: {
    fontSize: 12,
    flexShrink: 1,
  },
  mismatchError: {
    color: '#FF5757',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  button: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justify: 'center',
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

export default ResetPasswordScreen;
