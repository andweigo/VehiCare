import auth from '@react-native-firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

  const isPasswordProvider = authMode === 'password';

  /*
   * PASSWORD VALIDATION
   */
  const passwordRequirements = getPasswordRequirements(newPassword);
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

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing fields', 'Please complete all password fields.');
      return;
    }

    if (!passwordStrong) {
      Alert.alert('Weak password', 'Your new password does not meet all password requirements.');
      return;
    }

    if (!passwordsMatch) {
      Alert.alert('Passwords do not match', 'Please make sure your new password and confirmation match.');
      return;
    }

    if (currentPassword === newPassword) {
      Alert.alert('Password unchanged', 'Your new password must be different from your current password.');
      return;
    }

    setSaving(true);

    try {
      await reauthenticateWithEmail(currentPassword);
      await updateFirebasePassword(newPassword);

      Alert.alert('Password updated', 'Your password has been changed successfully.', [
        {
          text: 'OK',
          onPress: closeModal,
        },
      ]);
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

      Alert.alert('Update failed', errorMessage);
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

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={closeModal}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoiding}
      >
        <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
          <SafeAreaView style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {/* HEADER */}
              <View style={styles.headerRow}>
                <View style={[styles.iconWrapper, { backgroundColor: theme.accentSoft }]}>
                  <Icon name="security" size={24} color={theme.accent} />
                </View>

                <View style={styles.headerText}>
                  <Text style={[styles.title, { color: theme.text }]}>
                    Password & Security
                  </Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Manage account security & credentials
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={closeModal}
                  disabled={saving}
                  style={[styles.closeButton, { backgroundColor: theme.surfaceAlt }]}
                >
                  <Icon name="close" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* AUTH PROVIDER BADGE */}
              <View style={[styles.statusBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Icon
                  name={
                    authMode === 'guest'
                      ? 'person-outline'
                      : authMode === 'google'
                      ? 'account-circle'
                      : 'email'
                  }
                  size={15}
                  color={theme.accent}
                />
                <Text style={[styles.statusText, { color: theme.text }]}>
                  {authProviderLabel}
                </Text>
              </View>

              {/* GUEST ACCOUNT CARD */}
              {authMode === 'guest' ? (
                <View style={[styles.infoCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                  <View style={[styles.infoIconCircle, { backgroundColor: `${theme.accent}18` }]}>
                    <Icon name="person-outline" size={24} color={theme.accent} />
                  </View>

                  <View style={styles.infoContent}>
                    <Text style={[styles.infoTitle, { color: theme.text }]}>
                      Guest Session Active
                    </Text>

                    <Text style={[styles.infoDescription, { color: theme.textSecondary }]}>
                      You are using VehiCare as a Guest. Guest accounts do not store passwords or security credentials on our server.
                    </Text>

                    <Text style={[styles.infoDescription, { color: theme.textSecondary, marginTop: 8 }]}>
                      Create an account to protect your vehicle details, change passwords, and sync seamlessly across devices.
                    </Text>
                  </View>
                </View>
              ) : authMode === 'google' ? (
                /* GOOGLE ACCOUNT CARD */
                <View style={[styles.infoCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                  <View style={[styles.infoIconCircle, { backgroundColor: `${theme.accent}18` }]}>
                    <Icon name="account-circle" size={24} color={theme.accent} />
                  </View>

                  <View style={styles.infoContent}>
                    <Text style={[styles.infoTitle, { color: theme.text }]}>
                      Google Account Detected
                    </Text>

                    <Text style={[styles.infoDescription, { color: theme.textSecondary }]}>
                      This account uses Google Sign-In. VehiCare does not store or manage a separate Google password.
                    </Text>

                    <Text style={[styles.infoDescription, { color: theme.textSecondary, marginTop: 8 }]}>
                      To change your password, manage your Google Account security settings.
                    </Text>
                  </View>
                </View>
              ) : (
                /* EMAIL PASSWORD CARD */
                <>
                  <View style={[styles.emailCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Account Email</Text>
                    <Text style={[styles.emailValue, { color: theme.text }]}>
                      {userEmail || 'No email available'}
                    </Text>
                  </View>

                  {/* CURRENT PASSWORD */}
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: theme.text }]}>
                      Current Password
                    </Text>

                    <View style={[styles.inputRow, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}>
                      <TextInput
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="Enter current password"
                        placeholderTextColor={theme.placeholder || theme.textSecondary}
                        secureTextEntry={!showCurrentPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { color: theme.text }]}
                      />

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setShowCurrentPassword(prev => !prev)}
                        style={styles.inputVisibility}
                      >
                        <Icon
                          name={showCurrentPassword ? 'visibility' : 'visibility-off'}
                          size={19}
                          color={theme.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* NEW PASSWORD */}
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: theme.text }]}>
                      New Password
                    </Text>

                    <View
                      style={[
                        styles.inputRow,
                        {
                          borderColor:
                            newPassword.length > 0
                              ? passwordStrong
                                ? '#35B86B'
                                : theme.border
                              : theme.border,
                          backgroundColor: theme.surfaceAlt,
                        },
                      ]}
                    >
                      <TextInput
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter new password"
                        placeholderTextColor={theme.placeholder || theme.textSecondary}
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { color: theme.text }]}
                      />

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setShowNewPassword(prev => !prev)}
                        style={styles.inputVisibility}
                      >
                        <Icon
                          name={showNewPassword ? 'visibility' : 'visibility-off'}
                          size={19}
                          color={theme.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* PASSWORD STRENGTH */}
                    {newPassword.length > 0 && (
                      <View style={styles.passwordStrengthContainer}>
                        <View style={styles.passwordStrengthHeader}>
                          <Text style={[styles.passwordStrengthLabel, { color: theme.textSecondary }]}>
                            Password Strength
                          </Text>

                          <Text style={[styles.passwordStrengthValue, { color: getStrengthColor() }]}>
                            {passwordStrength}
                          </Text>
                        </View>

                        <View style={[styles.strengthBarBackground, { backgroundColor: theme.border }]}>
                          <View
                            style={[
                              styles.strengthBar,
                              {
                                width: `${(passwordScore / 4) * 100}%`,
                                backgroundColor: getStrengthColor(),
                              },
                            ]}
                          />
                        </View>

                        {/* REQUIREMENTS */}
                        <View style={styles.requirementsContainer}>
                          <View style={styles.requirement}>
                            <View
                              style={[
                                styles.requirementIcon,
                                {
                                  backgroundColor: passwordRequirements.length
                                    ? '#35B86B'
                                    : theme.border,
                                },
                              ]}
                            >
                              <Icon
                                name={passwordRequirements.length ? 'check' : 'close'}
                                size={11}
                                color="#FFFFFF"
                              />
                            </View>
                            <Text style={[styles.requirementText, { color: theme.textSecondary }]}>
                              At least 8 characters
                            </Text>
                          </View>

                          <View style={styles.requirement}>
                            <View
                              style={[
                                styles.requirementIcon,
                                {
                                  backgroundColor: passwordRequirements.uppercase
                                    ? '#35B86B'
                                    : theme.border,
                                },
                              ]}
                            >
                              <Icon
                                name={passwordRequirements.uppercase ? 'check' : 'close'}
                                size={11}
                                color="#FFFFFF"
                              />
                            </View>
                            <Text style={[styles.requirementText, { color: theme.textSecondary }]}>
                              1 uppercase letter
                            </Text>
                          </View>

                          <View style={styles.requirement}>
                            <View
                              style={[
                                styles.requirementIcon,
                                {
                                  backgroundColor: passwordRequirements.number
                                    ? '#35B86B'
                                    : theme.border,
                                },
                              ]}
                            >
                              <Icon
                                name={passwordRequirements.number ? 'check' : 'close'}
                                size={11}
                                color="#FFFFFF"
                              />
                            </View>
                            <Text style={[styles.requirementText, { color: theme.textSecondary }]}>
                              1 number
                            </Text>
                          </View>

                          <View style={styles.requirement}>
                            <View
                              style={[
                                styles.requirementIcon,
                                {
                                  backgroundColor: passwordRequirements.special
                                    ? '#35B86B'
                                    : theme.border,
                                },
                              ]}
                            >
                              <Icon
                                name={passwordRequirements.special ? 'check' : 'close'}
                                size={11}
                                color="#FFFFFF"
                              />
                            </View>
                            <Text style={[styles.requirementText, { color: theme.textSecondary }]}>
                              1 special character
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* CONFIRM PASSWORD */}
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: theme.text }]}>
                      Confirm New Password
                    </Text>

                    <View
                      style={[
                        styles.inputRow,
                        {
                          borderColor:
                            confirmPassword.length > 0
                              ? passwordsMatch
                                ? '#35B86B'
                                : '#FF5A5F'
                              : theme.border,
                          backgroundColor: theme.surfaceAlt,
                        },
                      ]}
                    >
                      <TextInput
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm new password"
                        placeholderTextColor={theme.placeholder || theme.textSecondary}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.input, { color: theme.text }]}
                      />

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setShowConfirmPassword(prev => !prev)}
                        style={styles.inputVisibility}
                      >
                        <Icon
                          name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                          size={19}
                          color={theme.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>

                    {confirmPassword.length > 0 && (
                      <View style={styles.matchStatus}>
                        <View
                          style={[
                            styles.matchIcon,
                            {
                              backgroundColor: passwordsMatch ? '#35B86B' : '#FF5A5F',
                            },
                          ]}
                        >
                          <Icon
                            name={passwordsMatch ? 'check' : 'close'}
                            size={11}
                            color="#FFFFFF"
                          />
                        </View>

                        <Text
                          style={[
                            styles.matchText,
                            {
                              color: passwordsMatch ? '#35B86B' : '#FF5A5F',
                            },
                          ]}
                        >
                          {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* ACTIONS */}
              <View style={styles.actionsRow}>
                {authMode === 'guest' ? (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={closeModal}
                      style={[styles.actionButton, styles.cancelButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                    >
                      <Text style={[styles.actionText, { color: theme.textSecondary }]}>Close</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleCreateAccount}
                      style={[styles.actionButton, { backgroundColor: theme.accent }]}
                    >
                      <Text style={[styles.actionText, { color: '#FFFFFF' }]}>Create Account</Text>
                    </TouchableOpacity>
                  </>
                ) : authMode === 'google' ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={closeModal}
                    style={[styles.actionButton, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, borderWidth: 1 }]}
                  >
                    <Text style={[styles.actionText, { color: theme.text }]}>Close</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={closeModal}
                      style={[styles.actionButton, styles.cancelButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                      disabled={saving}
                    >
                      <Text style={[styles.actionText, { color: theme.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleUpdatePassword}
                      style={[styles.actionButton, { backgroundColor: theme.accent }]}
                      disabled={saving || !currentPassword || !passwordStrong || !passwordsMatch}
                    >
                      {saving ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.actionText, { color: '#FFFFFF' }]}>Update Password</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoiding: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  statusBadge: {
    borderRadius: 99,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },

  // Info Cards (Guest / Google)
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 20,
    gap: 14,
    alignItems: 'flex-start',
  },
  infoIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    marginBottom: 4,
  },
  infoDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
  },

  // Email Card
  emailCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  emailValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    marginTop: 2,
  },

  // Fields
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    marginBottom: 6,
  },
  inputRow: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    minHeight: 48,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  inputVisibility: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Strength Indicator
  passwordStrengthContainer: {
    marginTop: 10,
  },
  passwordStrengthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    height: 5,
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 10,
  },
  strengthBar: {
    height: '100%',
    borderRadius: 99,
  },
  requirementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  requirementIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requirementText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  matchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  matchIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  actionText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
  },
});

export default PasswordSecurityCard;
