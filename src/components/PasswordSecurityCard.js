import auth from '@react-native-firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAuth } from '../context/AuthContext';
import { setGooglePassword } from '../api/authApi';
import CustomToast from './CustomToast';
import useToast from '../hooks/useToast';
import {
  reauthenticateWithEmail,
  updatePassword as updateFirebasePassword,
} from '../services/firebaseAuthService';
import { useTheme } from '../theme/ThemeContext';
import {
  doPasswordsMatch,
  getPasswordRequirements,
  getPasswordScore,
  getPasswordStrengthLabel,
  isPasswordStrong,
} from '../utils/passwordValidation';

const PasswordSecurityCard = ({ visible, onClose, navigation }) => {
  const { theme } = useTheme();
  const { user, token } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [authMode, setAuthMode] = useState('guest'); // 'guest' | 'google' | 'password'
  const [userEmail, setUserEmail] = useState('');
  const { toast, showToast, hideToast } = useToast();

  const isPasswordProvider = authMode === 'password' || authMode === 'google';

  /*
   * PASSWORD VALIDATION
   */
  const passwordRequirements = getPasswordRequirements(newPassword);
  const passwordRequirementFlags = {
    length: passwordRequirements[0]?.valid,
    uppercase: passwordRequirements[1]?.valid,
    lowercase: passwordRequirements[2]?.valid,
    number: passwordRequirements[3]?.valid,
    special: passwordRequirements[4]?.valid,
  };
  const passwordScore = getPasswordScore(newPassword);
  const passwordStrength = getPasswordStrengthLabel(newPassword);
  const passwordStrong = isPasswordStrong(newPassword);
  const passwordsMatch = doPasswordsMatch(newPassword, confirmPassword);

  /*
   * DETECT AUTH PROVIDER
   */
  useEffect(() => {
    if (!visible) {
      return;
    }

    const currentUser = auth().currentUser;
    const hasToken = Boolean(token);
    const isGuestUser = !hasToken || Boolean(user?.isGuest) || (!currentUser && !user?.email);

    if (isGuestUser) {
      setAuthMode('guest');
      setUserEmail('');
      return;
    }

    const providers = currentUser?.providerData || [];
    const isGoogle =
      providers.some(p => p.providerId === 'google.com') ||
      user?.auth_provider === 'google' ||
      user?.provider === 'google';

    if (isGoogle) {
      setAuthMode('google');
      setUserEmail(currentUser?.email || user?.email || '');
    } else {
      setAuthMode('password');
      setUserEmail(currentUser?.email || user?.email || '');
    }
  }, [visible, token, user]);

  const authProviderLabel =
    authMode === 'guest'
      ? 'Guest Session'
      : authMode === 'google'
      ? 'Google Sign-In'
      : 'Email & Password';

  /*
   * RESET
   */
  const resetFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);

    setSaving(false);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    resetFields();
    onClose?.();
  };

  const handleCreateAccount = () => {
    closeModal();
    if (navigation?.navigate) {
      navigation.navigate('Register');
    }
  };

  /*
   * UPDATE PASSWORD
   */
  const handleUpdatePassword = async () => {
    if (!isPasswordProvider) {
      return;
    }

    if ((authMode === 'password' && !currentPassword.trim()) || !newPassword.trim() || !confirmPassword.trim()) {
      showToast({ type: 'warning', title: 'Missing fields', message: 'Please complete all password fields.' });
      return;
    }

    if (!passwordStrong) {
      showToast({ type: 'warning', title: 'Weak password', message: 'Your new password does not meet all password requirements.' });
      return;
    }

    if (!passwordsMatch) {
      showToast({ type: 'warning', title: 'Passwords do not match', message: 'Please make sure your new password and confirmation match.' });
      return;
    }

    if (currentPassword === newPassword) {
      showToast({ type: 'warning', title: 'Password unchanged', message: 'Your new password must be different from your current password.' });
      return;
    }

    setSaving(true);

    try {
      if (authMode === 'google') {
        await setGooglePassword(newPassword);
      } else {
        await reauthenticateWithEmail(currentPassword);
        await updateFirebasePassword(newPassword);
      }

      showToast({ type: 'success', title: 'Password updated', message: 'Your password has been changed successfully.', duration: 1800 });
      setTimeout(closeModal, 1800);
    } catch (error) {
      const code = String(error?.code || '').toLowerCase();
      let errorMessage = 'Unable to update password. Please try again.';

      if (code.includes('wrong-password') || code.includes('invalid-credential')) {
        errorMessage = 'Your current password is incorrect. Please try again.';
      } else if (code.includes('requires-recent-login')) {
        errorMessage = 'Security timeout. Please sign out and sign in again before updating your password.';
      } else if (code.includes('network')) {
        errorMessage = 'A network error occurred. Please check your internet connection.';
      }

      const serverMessage = error?.response?.data?.message;
      showToast({ type: 'error', title: 'Update failed', message: serverMessage || errorMessage });
    } finally {
      setSaving(false);
    }
  };

  /*
   * PASSWORD STRENGTH COLORS
   */
  const getStrengthColor = () => {
    if (!newPassword) {
      return theme.textSecondary;
    }

    if (passwordScore <= 2) {
      return '#FF5A5F';
    }

    if (passwordScore === 3) {
      return '#D6A23A';
    }

    return '#35B86B';
  };

  const isDark = theme?.name === 'dark';

  if (!visible) {
    return null;
  }

  return (
    <>
      <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={closeModal}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={closeModal}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#141416' : '#FFFFFF',
                borderColor: isDark ? '#262629' : '#E2E8F0',
              },
            ]}
          >
            {/* Header Row: Badge Pill + Circular Close Button */}
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.badgePill,
                  { backgroundColor: isDark ? 'rgba(246, 59, 5, 0.15)' : '#FFF2EE' },
                ]}
              >
                <Icon name="lock-outline" size={13} color={theme.accent || '#F63B05'} />
                <Text style={[styles.badgeText, { color: theme.accent || '#F63B05' }]}>
                  SECURITY & AUTH
                </Text>
              </View>

              <TouchableOpacity
                onPress={closeModal}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
                disabled={saving}
                style={[
                  styles.closeCircleBtn,
                  { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
                ]}
                accessibilityLabel="Close security dialog"
              >
                <Icon name="close" size={16} color={isDark ? '#A1A1AA' : '#64748B'} />
              </TouchableOpacity>
            </View>

            {/* Title & Subtitle */}
            <Text style={[styles.title, { color: theme.text }]}>
              Password & Security
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Manage your credentials and account protection.
            </Text>

            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
              ]}
            />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* AUTH PROVIDER SESSION BAR */}
              <View
                style={[
                  styles.authSessionPill,
                  {
                    backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                    borderColor: isDark ? '#2B2B30' : '#E2E8F0',
                  },
                ]}
              >
                <View
                  style={[
                    styles.authDot,
                    {
                      backgroundColor:
                        authMode === 'guest'
                          ? '#F59E0B'
                          : '#10B981',
                    },
                  ]}
                />
                <Text style={[styles.authSessionLabel, { color: theme.textSecondary }]}>
                  Session:
                </Text>
                <Text style={[styles.authSessionValue, { color: theme.text }]}>
                  {authProviderLabel}
                </Text>
                {authMode === 'password' && userEmail ? (
                  <Text
                    style={[styles.authSessionEmail, { color: theme.textSecondary }]}
                    numberOfLines={1}
                  >
                    • {userEmail}
                  </Text>
                ) : null}
              </View>

              {/* GUEST ACCOUNT CARD */}
              {authMode === 'guest' ? (
                <View
                  style={[
                    styles.infoCard,
                    {
                      backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                      borderColor: isDark ? '#2B2B30' : '#E2E8F0',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.infoIconCircle,
                      { backgroundColor: isDark ? 'rgba(246, 59, 5, 0.16)' : '#FFF2EE' },
                    ]}
                  >
                    <Icon name="person-outline" size={22} color={theme.accent || '#F63B05'} />
                  </View>

                  <View style={styles.infoContent}>
                    <Text style={[styles.infoTitle, { color: theme.text }]}>
                      Guest Session Active
                    </Text>

                    <Text style={[styles.infoDescription, { color: theme.textSecondary }]}>
                      You are exploring VehiCare in guest mode. Guest sessions do not store passwords or credentials on our secure servers.
                    </Text>

                    <Text style={[styles.infoDescription, { color: theme.textSecondary, marginTop: 6 }]}>
                      Create an account to protect your vehicle data, change passwords, and sync across devices.
                    </Text>
                  </View>
                </View>
              ) : (
                /* PASSWORD FORM */
                <View style={styles.formContainer}>
                  {/* CURRENT PASSWORD */}
                  {authMode === 'password' && <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                      CURRENT PASSWORD
                    </Text>

                    <View
                      style={[
                        styles.inputRow,
                        {
                          borderColor: isDark ? '#2B2B30' : '#E2E8F0',
                          backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                        },
                      ]}
                    >
                      <Icon
                        name="lock-outline"
                        size={17}
                        color={theme.textSecondary}
                        style={{ marginRight: 10 }}
                      />
                      <TextInput
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Enter your current password"
                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                        secureTextEntry={!showCurrentPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { color: theme.text }]}
                      />

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setShowCurrentPassword(prev => !prev)}
                        style={styles.inputVisibility}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon
                          name={showCurrentPassword ? 'visibility' : 'visibility-off'}
                          size={18}
                          color={theme.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>}

                  {/* NEW PASSWORD */}
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                      NEW PASSWORD
                    </Text>

                    <View
                      style={[
                        styles.inputRow,
                        {
                          borderColor:
                            newPassword.length > 0
                              ? passwordStrong
                                ? '#10B981'
                                : (isDark ? '#2B2B30' : '#E2E8F0')
                              : (isDark ? '#2B2B30' : '#E2E8F0'),
                          backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                        },
                      ]}
                    >
                      <Icon
                        name="vpn-key"
                        size={17}
                        color={theme.textSecondary}
                        style={{ marginRight: 10 }}
                      />
                      <TextInput
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Create a strong new password"
                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { color: theme.text }]}
                      />

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setShowNewPassword(prev => !prev)}
                        style={styles.inputVisibility}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon
                          name={showNewPassword ? 'visibility' : 'visibility-off'}
                          size={18}
                          color={theme.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* PASSWORD STRENGTH */}
                    {newPassword.length > 0 && (
                      <View style={styles.passwordStrengthContainer}>
                        <View style={styles.passwordStrengthHeader}>
                          <Text style={[styles.passwordStrengthLabel, { color: theme.textSecondary }]}>
                            Strength
                          </Text>
                          <Text style={[styles.passwordStrengthValue, { color: getStrengthColor() }]}>
                            {passwordStrength}
                          </Text>
                        </View>

                        <View style={[styles.strengthBarBackground, { backgroundColor: isDark ? '#2B2B30' : '#E2E8F0' }]}>
                          <View
                            style={[
                              styles.strengthBar,
                              {
                                width: `${Math.min((passwordScore / 5) * 100, 100)}%`,
                                backgroundColor: getStrengthColor(),
                              },
                            ]}
                          />
                        </View>

                        {/* REQUIREMENTS CHIPS */}
                        <View style={styles.requirementsGrid}>
                          <View
                            style={[
                              styles.requirementChip,
                              {
                                backgroundColor: passwordRequirementFlags.length
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : (isDark ? '#222226' : '#F1F5F9'),
                                borderColor: passwordRequirementFlags.length
                                  ? 'rgba(16, 185, 129, 0.3)'
                                  : 'transparent',
                              },
                            ]}
                          >
                            <Icon
                              name={passwordRequirementFlags.length ? 'check' : 'remove'}
                              size={12}
                              color={passwordRequirementFlags.length ? '#10B981' : theme.textSecondary}
                            />
                            <Text
                              style={[
                                styles.requirementText,
                                {
                                  color: passwordRequirementFlags.length ? '#10B981' : theme.textSecondary,
                                },
                              ]}
                            >
                              8+ chars
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.requirementChip,
                              {
                                backgroundColor: passwordRequirementFlags.lowercase
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : (isDark ? '#222226' : '#F1F5F9'),
                                borderColor: passwordRequirementFlags.lowercase
                                  ? 'rgba(16, 185, 129, 0.3)'
                                  : 'transparent',
                              },
                            ]}
                          >
                            <Icon
                              name={passwordRequirementFlags.lowercase ? 'check' : 'remove'}
                              size={12}
                              color={passwordRequirementFlags.lowercase ? '#10B981' : theme.textSecondary}
                            />
                            <Text
                              style={[styles.requirementText, {
                                color: passwordRequirementFlags.lowercase ? '#10B981' : theme.textSecondary,
                              }]}
                            >
                              1 lowercase
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.requirementChip,
                              {
                                backgroundColor: passwordRequirementFlags.uppercase
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : (isDark ? '#222226' : '#F1F5F9'),
                                borderColor: passwordRequirementFlags.uppercase
                                  ? 'rgba(16, 185, 129, 0.3)'
                                  : 'transparent',
                              },
                            ]}
                          >
                            <Icon
                              name={passwordRequirementFlags.uppercase ? 'check' : 'remove'}
                              size={12}
                              color={passwordRequirementFlags.uppercase ? '#10B981' : theme.textSecondary}
                            />
                            <Text
                              style={[
                                styles.requirementText,
                                {
                                  color: passwordRequirementFlags.uppercase ? '#10B981' : theme.textSecondary,
                                },
                              ]}
                            >
                              1 uppercase
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.requirementChip,
                              {
                                backgroundColor: passwordRequirementFlags.number
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : (isDark ? '#222226' : '#F1F5F9'),
                                borderColor: passwordRequirementFlags.number
                                  ? 'rgba(16, 185, 129, 0.3)'
                                  : 'transparent',
                              },
                            ]}
                          >
                            <Icon
                              name={passwordRequirementFlags.number ? 'check' : 'remove'}
                              size={12}
                              color={passwordRequirementFlags.number ? '#10B981' : theme.textSecondary}
                            />
                            <Text
                              style={[
                                styles.requirementText,
                                {
                                  color: passwordRequirementFlags.number ? '#10B981' : theme.textSecondary,
                                },
                              ]}
                            >
                              1 number
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.requirementChip,
                              {
                                backgroundColor: passwordRequirementFlags.special
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : (isDark ? '#222226' : '#F1F5F9'),
                                borderColor: passwordRequirementFlags.special
                                  ? 'rgba(16, 185, 129, 0.3)'
                                  : 'transparent',
                              },
                            ]}
                          >
                            <Icon
                              name={passwordRequirementFlags.special ? 'check' : 'remove'}
                              size={12}
                              color={passwordRequirementFlags.special ? '#10B981' : theme.textSecondary}
                            />
                            <Text
                              style={[
                                styles.requirementText,
                                {
                                  color: passwordRequirementFlags.special ? '#10B981' : theme.textSecondary,
                                },
                              ]}
                            >
                              1 symbol
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* CONFIRM PASSWORD */}
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                      CONFIRM NEW PASSWORD
                    </Text>

                    <View
                      style={[
                        styles.inputRow,
                        {
                          borderColor:
                            confirmPassword.length > 0
                              ? passwordsMatch
                                ? '#10B981'
                                : '#FF5A5F'
                              : (isDark ? '#2B2B30' : '#E2E8F0'),
                          backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                        },
                      ]}
                    >
                      <Icon
                        name="check-circle-outline"
                        size={17}
                        color={theme.textSecondary}
                        style={{ marginRight: 10 }}
                      />
                      <TextInput
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Re-enter your new password"
                        placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { color: theme.text }]}
                      />

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setShowConfirmPassword(prev => !prev)}
                        style={styles.inputVisibility}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon
                          name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                          size={18}
                          color={theme.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    {confirmPassword.length > 0 && (
                      <View style={styles.matchStatus}>
                        <Icon
                          name={passwordsMatch ? 'check-circle' : 'cancel'}
                          size={13}
                          color={passwordsMatch ? '#10B981' : '#FF5A5F'}
                        />
                        <Text
                          style={[
                            styles.matchText,
                            {
                              color: passwordsMatch ? '#10B981' : '#FF5A5F',
                            },
                          ]}
                        >
                          {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* ACTIONS */}
              <View style={styles.actionsRow}>
                {authMode === 'guest' ? (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={closeModal}
                      style={[
                        styles.actionButton,
                        styles.cancelButton,
                        {
                          borderColor: isDark ? '#2B2B30' : '#E2E8F0',
                          backgroundColor: isDark ? '#1C1C1F' : '#F1F5F9',
                        },
                      ]}
                    >
                      <Text style={[styles.actionText, { color: theme.textSecondary }]}>Close</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleCreateAccount}
                      style={[styles.actionButton, { backgroundColor: theme.accent || '#F63B05' }]}
                    >
                      <Text style={[styles.actionText, { color: '#FFFFFF' }]}>Create Account</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={closeModal}
                      style={[
                        styles.actionButton,
                        styles.cancelButton,
                        {
                          borderColor: isDark ? '#2B2B30' : '#E2E8F0',
                          backgroundColor: isDark ? '#1C1C1F' : '#F1F5F9',
                        },
                      ]}
                      disabled={saving}
                    >
                      <Text style={[styles.actionText, { color: theme.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleUpdatePassword}
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: theme.accent || '#F63B05',
                          opacity: saving || (authMode === 'password' && !currentPassword) || !passwordStrong || !passwordsMatch ? 0.45 : 1,
                        },
                      ]}
                      disabled={saving || (authMode === 'password' && !currentPassword) || !passwordStrong || !passwordsMatch}
                    >
                      {saving ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={[styles.actionText, { color: '#FFFFFF' }]}>Update Password</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
      </Modal>
      <CustomToast toast={toast} onHide={hideToast} />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 420,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    maxHeight: '90%',
  },
  scrollContent: {
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  closeCircleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: 16,
  },

  // Auth Session Pill
  authSessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 7,
  },
  authDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  authSessionLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
  },
  authSessionValue: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
  },
  authSessionEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    flex: 1,
  },

  // Info Cards (Guest / Google)
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14.5,
    marginBottom: 4,
  },
  infoDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
  },

  // Form
  formContainer: {
    marginBottom: 4,
  },
  field: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10.5,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  inputRow: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    minHeight: 44,
    fontFamily: 'Inter-Medium',
    fontSize: 13,
    paddingVertical: 0,
  },
  inputVisibility: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Password Strength
  passwordStrengthContainer: {
    marginTop: 8,
  },
  passwordStrengthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  passwordStrengthLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
  },
  passwordStrengthValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
  },
  strengthBarBackground: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 2,
  },
  requirementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  requirementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  requirementText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10.5,
  },
  matchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 5,
  },
  matchText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  actionButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  actionText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
  },
});

export default PasswordSecurityCard;
