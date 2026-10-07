import { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Animated,
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
import TermsAndConditionsModal from '../components/TermsAndConditionsModal';

import { useAuth } from '../context/AuthContext';
import { useVehicle } from '../context/VehicleContext';

import useToast from '../hooks/useToast';

import { useTheme } from '../theme/ThemeContext';

import {
  doPasswordsMatch,
  getPasswordRequirements,
  getPasswordScore,
  getPasswordStrengthLabel,
  isPasswordStrong,
} from '../utils/passwordValidation';

import {
  getVehicleDisplayDetails,
  getVehicleDisplayName,
} from '../utils/vehicleDisplay';

const RegisterScreen = ({
  navigation,
  route,
}) => {
  const { theme } =
    useTheme();

  const {
    toast,
    showToast,
    hideToast,
  } = useToast();

  const { redirectTo } =
    route.params || {};

  const {
    register,
    registerGoogle,
  } = useAuth();

  const {
    activeVehicle,
    pendingVehicle,
    clearPendingVehicle,
    setActiveVehicle,
  } = useVehicle();

  const [
    name,
    setName,
  ] = useState('');

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    googleLoading,
    setGoogleLoading,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    termsVisible,
    setTermsVisible,
  ] = useState(false);

  const [
    acceptedTerms,
    setAcceptedTerms,
  ] = useState(false);

  const [
    termsError,
    setTermsError,
  ] = useState(false);

  const termsErrorTimeoutRef =
    useRef(null);

  const termsShake =
    useRef(
      new Animated.Value(0),
    ).current;

  const vehicleProfile =
    pendingVehicle ||
    activeVehicle;

  const hasSelectedVehicle =
    Boolean(
      vehicleProfile &&
        Object.keys(
          vehicleProfile,
        ).length > 0,
    );

  const vehicleName =
    hasSelectedVehicle
      ? getVehicleDisplayName(
          vehicleProfile,
          'Your Vehicle',
        )
      : 'No vehicle selected yet';

  const vehicleDetails =
    hasSelectedVehicle
      ? getVehicleDisplayDetails(
          vehicleProfile,
          'Pick a vehicle after you create your account',
        )
      : 'Pick a vehicle after you create your account';

  const passwordRequirements =
    getPasswordRequirements(
      password,
    );

  const passwordScore =
    getPasswordScore(
      password,
    );

  const passwordStrength =
    getPasswordStrengthLabel(
      password,
    );

  const passwordMatch =
    doPasswordsMatch(
      password,
      confirmPassword,
    );

  const passwordStrong =
    isPasswordStrong(
      password,
    );

  const isLoading =
    loading ||
    googleLoading;

  useEffect(() => {
    return () => {
      if (
        termsErrorTimeoutRef.current
      ) {
        clearTimeout(
          termsErrorTimeoutRef.current,
        );
      }
    };
  }, []);

  /*
   * =========================
   * ERROR HANDLING
   * =========================
   */

  const getRegisterErrorPayload =
    err => {
      const status =
        err?.response?.status;

      const apiMessage =
        String(
          err?.response?.data
            ?.message ||
            err?.message ||
            '',
        ).toLowerCase();

      const code =
        String(
          err?.code || '',
        ).toLowerCase();

      if (
        status === 503 ||
        apiMessage.includes(
          'unavailable',
        ) ||
        apiMessage.includes(
          'service unavailable',
        )
      ) {
        return {
          type: 'error',

          title:
            'Service Unavailable',

          message:
            'Registration service is unavailable. Please restart the app.',
        };
      }

      if (
        code.includes(
          'auth/email-already-in-use',
        ) ||
        apiMessage.includes(
          'email-already-in-use',
        ) ||
        apiMessage.includes(
          'already in use',
        ) ||
        apiMessage.includes(
          'account already exists',
        )
      ) {
        return {
          type: 'warning',

          title:
            'Account Already Exists',

          message:
            'An account already exists with this email. Please sign in instead.',
        };
      }

      if (
        code.includes(
          'auth/invalid-email',
        ) ||
        apiMessage.includes(
          'invalid email',
        )
      ) {
        return {
          type: 'warning',

          title:
            'Invalid Email',

          message:
            'Please enter a valid email address.',
        };
      }

      if (
        code.includes(
          'auth/weak-password',
        ) ||
        apiMessage.includes(
          'weak-password',
        )
      ) {
        return {
          type: 'warning',

          title:
            'Weak Password',

          message:
            'Please choose a stronger password.',
        };
      }

      return {
        type: 'error',

        title:
          'Registration Failed',

        message:
          'We could not create your account. Please try again.',
      };
    };

  const getGoogleSignInPayload =
    (
      err,
      accountExistsMessage,
    ) => {
      const rawCode =
        String(
          err?.code || '',
        ).toLowerCase();

      const rawMessage =
        String(
          err?.message ||
            err?.response?.data
              ?.message ||
            '',
        ).toLowerCase();

      const combined =
        `${rawCode} ${rawMessage}`;

      const accountConflict = [
        'auth/account-exists-with-different-credential',
        'auth/email-already-in-use',
        'auth/credential-already-in-use',
        'already registered',
        'already exists',
        'account already exists',
        'different credential',
        'credential already in use',
      ].some(keyword =>
        combined.includes(
          keyword,
        ),
      );

      if (accountConflict) {
        return {
          type: 'warning',

          title:
            'Account Already Exists',

          message:
            accountExistsMessage,
        };
      }

      if (
        combined.includes(
          'play services',
        ) ||
        combined.includes(
          'play-service',
        )
      ) {
        return {
          type: 'error',

          title:
            'Google Play Services',

          message:
            'Google Play Services is not available on this device.',
        };
      }

      if (
        combined.includes(
          'network',
        )
      ) {
        return {
          type: 'error',

          title:
            'Network Error',

          message:
            'Please check your internet connection and try again.',
        };
      }

      return {
        type: 'error',

        title:
          'Google Sign-In Failed',

        message:
          'We could not complete Google Sign-In. Please try again.',
      };
    };

  /*
   * =========================
   * TERMS SHAKE
   * =========================
   */

  const triggerTermsWarning =
    () => {
      setTermsError(true);

      if (
        termsErrorTimeoutRef.current
      ) {
        clearTimeout(
          termsErrorTimeoutRef.current,
        );
      }

      Animated.sequence([
        Animated.timing(
          termsShake,
          {
            toValue: 8,
            duration: 80,
            useNativeDriver: true,
          },
        ),

        Animated.timing(
          termsShake,
          {
            toValue: -8,
            duration: 80,
            useNativeDriver: true,
          },
        ),

        Animated.timing(
          termsShake,
          {
            toValue: 4,
            duration: 80,
            useNativeDriver: true,
          },
        ),

        Animated.timing(
          termsShake,
          {
            toValue: 0,
            duration: 80,
            useNativeDriver: true,
          },
        ),
      ]).start();

      termsErrorTimeoutRef.current =
        setTimeout(() => {
          setTermsError(false);

          termsErrorTimeoutRef.current =
            null;
        }, 900);
    };

  const delay = ms =>
    new Promise(resolve =>
      setTimeout(
        resolve,
        ms,
      ),
    );

  /*
   * =========================
   * REGISTER
   * =========================
   */

  const handleRegister =
    async () => {
      const shouldShakeTerms =
        !acceptedTerms;

      if (
        !name.trim() ||
        !email.trim() ||
        !password ||
        !confirmPassword
      ) {
        if (shouldShakeTerms) {
          triggerTermsWarning();
        }

        showToast({
          type: 'warning',

          title:
            'Missing Information',

          message:
            'Please fill in all fields.',
        });

        return;
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(
          email.trim(),
        )
      ) {
        if (shouldShakeTerms) {
          triggerTermsWarning();
        }

        showToast({
          type: 'warning',

          title:
            'Invalid Email',

          message:
            'Please enter a valid email address.',
        });

        return;
      }

      if (!passwordStrong) {
        if (shouldShakeTerms) {
          triggerTermsWarning();
        }

        showToast({
          type: 'warning',

          title:
            'Password Too Weak',

          message:
            'Please create a stronger password that meets all password requirements.',
        });

        return;
      }

      if (!passwordMatch) {
        if (shouldShakeTerms) {
          triggerTermsWarning();
        }

        showToast({
          type: 'error',

          title:
            'Passwords Do Not Match',

          message:
            'Please make sure both password fields match.',
        });

        return;
      }

      if (!acceptedTerms) {
        triggerTermsWarning();

        return;
      }

      if (
        typeof register !==
        'function'
      ) {
        showToast({
          type: 'error',

          title:
            'Service Unavailable',

          message:
            'Registration service is unavailable. Please restart the app.',
        });

        return;
      }

      setLoading(true);

      try {
        /*
         * Capture the guest vehicle BEFORE
         * authentication changes the VehicleContext.
         */

        const vehicleToSave =
          pendingVehicle ||
          activeVehicle ||
          null;

        const result =
          await register(
            name.trim(),
            email.trim(),
            password,
            vehicleToSave,
          );

        if (
          result?.claimedVehicle
        ) {
          setActiveVehicle(
            result.claimedVehicle,
          );
        }

        /*
         * The vehicle has now been sent to
         * Laravel and belongs to the account.
         *
         * Remove the temporary guest state.
         */

        await clearPendingVehicle();

        showToast({
          type: 'success',

          title:
            'Account Created',

          message:
            'Your account is ready. Redirecting…',

          duration: 1500,
        });

        await delay(1500);

        if (result?.requiresOtp) {
          navigation.replace('OtpVerification', {
            email: result?.email || email.trim(),
            purpose: 'registration',
            redirectTo,
          });
          return;
        }

        const shouldSkipVehicleSetup =
          result?.hasAccountVehicles &&
          redirectTo?.name ===
            'VehicleDetails';

        if (
          shouldSkipVehicleSetup
        ) {
          navigation.replace(
            'Dashboard',
          );
        } else if (
          redirectTo?.name
        ) {
          navigation.replace(
            redirectTo.name,
            redirectTo.params,
          );
        } else {
          navigation.replace(
            'Dashboard',
          );
        }
      } catch (err) {
        showToast(
          getRegisterErrorPayload(
            err,
          ),
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * =========================
   * GOOGLE REGISTER
   * =========================
   */

  const handleGoogleSignIn =
    async () => {
      if (
        typeof registerGoogle !==
        'function'
      ) {
        showToast({
          type: 'error',

          title:
            'Google Sign-In Unavailable',

          message:
            'Google Sign-In is not available. Please restart the app.',
        });

        return;
      }

      setGoogleLoading(true);

      try {
        /*
         * Capture the vehicle before auth changes.
         */

        const vehicleToSave =
          pendingVehicle ||
          activeVehicle ||
          null;

        const result =
          await registerGoogle(
            vehicleToSave,
          );

        if (
          result?.claimedVehicle
        ) {
          setActiveVehicle(
            result.claimedVehicle,
          );
        }

        /*
         * Vehicle is now owned by account.
         */

        await clearPendingVehicle();

        showToast({
          type: 'success',

          title:
            'Account Created',

          message:
            'Your account is ready. Redirecting…',

          duration: 1500,
        });

        await delay(1500);

        const shouldSkipVehicleSetup =
          result?.hasAccountVehicles &&
          redirectTo?.name ===
            'VehicleDetails';

        if (
          shouldSkipVehicleSetup
        ) {
          navigation.replace(
            'Dashboard',
          );
        } else if (
          redirectTo?.name
        ) {
          navigation.replace(
            redirectTo.name,
            redirectTo.params,
          );
        } else {
          navigation.replace(
            'Dashboard',
          );
        }
      } catch (err) {
        const payload =
          getGoogleSignInPayload(
            err,
            'This Google account is already registered. Please sign in instead.',
          );

        showToast(payload);
      } finally {
        setGoogleLoading(false);
      }
    };

  /*
   * =========================
   * UI
   * =========================
   */

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            theme.background,
        },
      ]}
      edges={[
        'top',
        'bottom',
      ]}
    >
      <StatusBar
        barStyle={
          theme.name === 'dark'
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={
          theme.background
        }
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
        onPress={() =>
          navigation.goBack()
        }
        activeOpacity={0.7}
      >
        <Ionicons
          name="arrow-back"
          size={21}
          color={theme.text}
        />
      </TouchableOpacity>

      <Text
        style={[
          styles.logo,
          {
            color: theme.text,
          },
        ]}
      >
        VehiCare
      </Text>

      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          style={styles.header}
        >
          <Text
            style={[
              styles.title,
              {
                color:
                  theme.text,
              },
            ]}
          >
            Create your account
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            Your vehicle is waiting.
            Let's save it to your
            VehiCare account.
          </Text>
        </View>

        <View
          style={[
            styles.vehicleCard,
            {
              backgroundColor:
                theme.surfaceAlt,

              borderColor:
                theme.accent,
            },
          ]}
        >
          <View
            style={[
              styles.vehicleBadge,
              {
                backgroundColor:
                  theme.accentSoft,
              },
            ]}
          >
            <Ionicons
              name={
                hasSelectedVehicle
                  ? 'car-outline'
                  : 'add-circle-outline'
              }
              size={18}
              color={theme.accent}
            />
          </View>

          <View
            style={
              styles.vehicleContent
            }
          >
            <Text
              style={[
                styles.vehicleTitle,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              YOUR VEHICLE
            </Text>

            <Text
              style={[
                styles.vehicleName,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              {vehicleName}
            </Text>

            <Text
              style={[
                styles.vehicleYear,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              {vehicleDetails}
            </Text>
          </View>
        </View>

        <View
          style={styles.inputGroup}
        >
          <Text
            style={[
              styles.inputLabel,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            Full Name
          </Text>

          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor:
                  theme.surfaceAlt,

                borderColor:
                  theme.border,
              },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={19}
              color={
                theme.textSecondary
              }
              style={
                styles.inputIcon
              }
            />

            <TextInput
              style={[
                styles.input,
                {
                  color:
                    theme.text,
                },
              ]}
              value={name}
              onChangeText={
                setName
              }
              placeholder="Enter your full name"
              placeholderTextColor={
                theme.placeholder
              }
              autoCapitalize="words"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>
        </View>

        <View
          style={styles.inputGroup}
        >
          <Text
            style={[
              styles.inputLabel,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            Email
          </Text>

          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor:
                  theme.surfaceAlt,

                borderColor:
                  theme.border,
              },
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={19}
              color={
                theme.textSecondary
              }
              style={
                styles.inputIcon
              }
            />

            <TextInput
              style={[
                styles.input,
                {
                  color:
                    theme.text,
                },
              ]}
              value={email}
              onChangeText={
                setEmail
              }
              placeholder="Enter your email"
              placeholderTextColor={
                theme.placeholder
              }
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>
        </View>

        <View
          style={
            styles.passwordSection
          }
        >
          <View
            style={styles.inputGroup}
          >
            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Password
            </Text>

            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor:
                    theme.surfaceAlt,

                  borderColor:
                    theme.border,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={19}
                color={
                  theme.textSecondary
                }
                style={
                  styles.inputIcon
                }
              />

              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    color:
                      theme.text,
                  },
                ]}
                value={password}
                onChangeText={
                  setPassword
                }
                placeholder="Enter your password"
                placeholderTextColor={
                  theme.placeholder
                }
                secureTextEntry={
                  !showPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />

              <TouchableOpacity
                style={
                  styles.eyeButton
                }
                onPress={() =>
                  setShowPassword(
                    previous =>
                      !previous,
                  )
                }
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-outline'
                      : 'eye-off-outline'
                  }
                  size={20}
                  color={
                    theme.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          {password.length >
            0 && (
            <View
              style={
                styles.passwordStrengthContainer
              }
            >
              <View
                style={
                  styles.passwordStrengthHeader
                }
              >
                <Text
                  style={[
                    styles.passwordStrengthLabel,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Password Strength
                </Text>

                <Text
                  style={[
                    styles.passwordStrengthValue,

                    passwordScore >=
                      4 &&
                      styles.passwordStrengthGood,

                    passwordStrong &&
                      styles.passwordStrong,
                  ]}
                >
                  {passwordStrength}
                </Text>
              </View>

              <View
                style={[
                  styles.strengthBarBackground,
                  {
                    backgroundColor:
                      theme.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.strengthBar,
                    {
                      width: `${Math.min(
                        (passwordScore /
                          5) *
                          100,
                        100,
                      )}%`,
                    },

                    passwordScore <=
                      2 &&
                      styles.strengthBarWeak,

                    passwordScore ===
                      3 &&
                      styles.strengthBarFair,

                    passwordScore ===
                      4 &&
                      styles.strengthBarGood,

                    passwordScore ===
                      5 &&
                      styles.strengthBarStrong,
                  ]}
                />
              </View>

              <View
                style={
                  styles.requirementsRow
                }
              >
                {passwordRequirements.map(
                  requirement => (
                    <View
                      style={
                        styles.requirement
                      }
                      key={
                        requirement.label
                      }
                    >
                      <View
                        style={[
                          styles.requirementIcon,
                          requirement.valid &&
                            styles.requirementIconValid,
                        ]}
                      >
                        {requirement.valid && (
                          <Ionicons
                            name="checkmark"
                            size={
                              11
                            }
                            color="#FFFFFF"
                          />
                        )}
                      </View>

                      <Text
                        style={[
                          styles.requirementText,
                          {
                            color:
                              requirement.valid
                                ? '#35B86B'
                                : theme.textSecondary,
                          },
                        ]}
                      >
                        {
                          requirement.label
                        }
                      </Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          )}
        </View>

        <View
          style={
            styles.confirmPasswordSection
          }
        >
          <View
            style={styles.inputGroup}
          >
            <Text
              style={[
                styles.inputLabel,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Confirm Password
            </Text>

            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor:
                    theme.surfaceAlt,

                  borderColor:
                    confirmPassword.length >
                    0
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
                color={
                  theme.textSecondary
                }
                style={
                  styles.inputIcon
                }
              />

              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    color:
                      theme.text,
                  },
                ]}
                value={
                  confirmPassword
                }
                onChangeText={
                  setConfirmPassword
                }
                placeholder="Confirm your password"
                placeholderTextColor={
                  theme.placeholder
                }
                secureTextEntry={
                  !showConfirmPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />

              <TouchableOpacity
                style={
                  styles.eyeButton
                }
                onPress={() =>
                  setShowConfirmPassword(
                    previous =>
                      !previous,
                  )
                }
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Ionicons
                  name={
                    showConfirmPassword
                      ? 'eye-outline'
                      : 'eye-off-outline'
                  }
                  size={20}
                  color={
                    theme.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          {confirmPassword.length >
            0 && (
            <View
              style={
                styles.matchStatus
              }
            >
              <View
                style={[
                  styles.matchIcon,

                  passwordMatch
                    ? styles.matchIconValid
                    : styles.matchIconInvalid,
                ]}
              >
                <Ionicons
                  name={
                    passwordMatch
                      ? 'checkmark'
                      : 'close'
                  }
                  size={11}
                  color="#FFFFFF"
                />
              </View>

              <Text
                style={[
                  styles.matchText,

                  passwordMatch
                    ? styles.matchTextValid
                    : styles.matchTextInvalid,
                ]}
              >
                {passwordMatch
                  ? 'Passwords match'
                  : 'Passwords do not match'}
              </Text>
            </View>
          )}
        </View>

        <Animated.View
          style={{
            transform: [
              {
                translateX:
                  termsShake,
              },
            ],
          }}
        >
          <TouchableOpacity
            style={
              styles.termsRow
            }
            onPress={() => {
              setAcceptedTerms(
                previous =>
                  !previous,
              );

              setTermsError(
                false,
              );
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.checkbox,

                acceptedTerms &&
                  styles.checkboxActive,
              ]}
            >
              {acceptedTerms && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color="#FFFFFF"
                />
              )}
            </View>

            <Text
              style={[
                styles.termsText,

                {
                  color:
                    theme.textSecondary,
                },

                termsError &&
                  styles.termsTextError,
              ]}
            >
              I agree to the{' '}

              <Text
                style={[
                  styles.termsLink,
                  {
                    color:
                      theme.accent,
                  },
                ]}
                onPress={() =>
                  setTermsVisible(
                    true,
                  )
                }
              >
                Terms and Conditions
              </Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor:
                theme.accent,
            },

            isLoading &&
              styles.buttonDisabled,
          ]}
          activeOpacity={0.85}
          onPress={
            handleRegister
          }
          disabled={isLoading}
        >
          {loading ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={
                styles.buttonText
              }
            >
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        <View
          style={
            styles.dividerContainer
          }
        >
          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  theme.border,
              },
            ]}
          />

          <Text
            style={[
              styles.dividerText,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            OR
          </Text>

          <View
            style={[
              styles.divider,
              {
                backgroundColor:
                  theme.border,
              },
            ]}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.googleButton,
            {
              backgroundColor:
                theme.surfaceAlt,

              borderColor:
                theme.border,
            },

            isLoading &&
              styles.buttonDisabled,
          ]}
          activeOpacity={0.85}
          onPress={
            handleGoogleSignIn
          }
          disabled={isLoading}
        >
          {googleLoading ? (
            <ActivityIndicator
              color={theme.text}
            />
          ) : (
            <View
              style={
                styles.googleButtonContent
              }
            >
              <Ionicons
                name="logo-google"
                color={theme.text}
                size={19}
              />

              <Text
                style={[
                  styles.googleButtonText,
                  {
                    color:
                      theme.text,
                  },
                ]}
              >
                Continue with Google
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View
          style={
            styles.footerContainer
          }
        >
          <Text
            style={[
              styles.footer,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            Already have an
            account?{' '}
          </Text>

          <TouchableOpacity
            onPress={() =>
              navigation.replace(
                'Login',
                {
                  redirectTo,
                },
              )
            }
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.orange,
                {
                  color:
                    theme.accent,
                },
              ]}
            >
              Sign in
            </Text>
          </TouchableOpacity>
        </View>

        <TermsAndConditionsModal
          visible={termsVisible}
          onClose={() =>
            setTermsVisible(
              false,
            )
          }
          onAgree={() => {
            setAcceptedTerms(
              true,
            );

            setTermsVisible(
              false,
            );
          }}
        />
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
    fontFamily:
      'Outfit-ExtraBold',
    fontSize: 18,
    letterSpacing: -0.3,
  },

  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },

  header: {
    marginBottom: 28,
  },

  title: {
    fontFamily:
      'Outfit-ExtraBold',
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
  },

  subtitle: {
    fontFamily:
      'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  vehicleCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 22,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },

  vehicleBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  vehicleContent: {
    flex: 1,
  },

  vehicleTitle: {
    fontFamily:
      'Inter-Medium',
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  vehicleName: {
    fontFamily:
      'Inter-SemiBold',
    fontSize: 15,
  },

  vehicleYear: {
    fontFamily:
      'Inter-Regular',
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
  },

  inputGroup: {
    marginBottom: 17,
  },

  inputLabel: {
    fontFamily:
      'Inter-Medium',
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
    fontFamily:
      'Inter-Regular',
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

  passwordSection: {
    marginBottom: 0,
  },

  confirmPasswordSection: {
    marginTop: 0,
  },

  passwordStrengthContainer: {
    marginTop: -5,
    marginBottom: 17,
    paddingHorizontal: 4,
  },

  passwordStrengthHeader: {
    flexDirection: 'row',
    justifyContent:
      'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  passwordStrengthLabel: {
    fontFamily:
      'Inter-Medium',
    fontSize: 12,
  },

  passwordStrengthValue: {
    color: '#FF5A5F',
    fontFamily:
      'Inter-SemiBold',
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
    justifyContent:
      'space-between',
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
    fontFamily:
      'Inter-Regular',
    fontSize: 10.5,
  },

  matchStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -5,
    marginBottom: 3,
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
    fontFamily:
      'Inter-SemiBold',
    fontSize: 11,
  },

  matchTextValid: {
    color: '#35B86B',
  },

  matchTextInvalid: {
    color: '#FF5A5F',
  },

  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 18,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#555555',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  checkboxActive: {
    backgroundColor: '#F63B05',
    borderColor: '#F63B05',
  },

  termsText: {
    flex: 1,
    fontFamily:
      'Inter-Regular',
    fontSize: 13,
    lineHeight: 20,
  },

  termsLink: {
    fontFamily:
      'Inter-SemiBold',
  },

  termsTextError: {
    color: '#FF5A5F',
  },

  button: {
    height: 54,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: '#FFFFFF',
    fontFamily:
      'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.1,
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
    fontFamily:
      'Inter-Medium',
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
    fontFamily:
      'Inter-SemiBold',
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
    fontFamily:
      'Inter-Regular',
    fontSize: 12,
  },

  orange: {
    fontFamily:
      'Inter-SemiBold',
    fontSize: 12,
  },
});

export default RegisterScreen;