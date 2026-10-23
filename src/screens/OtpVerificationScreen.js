import { useCallback, useEffect, useRef, useState } from 'react';
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
import { resendOtp, verifyOtp } from '../api/authApi';
import CustomToast from '../components/CustomToast';
import { useAuth } from '../context/AuthContext';
import { useVehicle } from '../context/VehicleContext';
import { getGuestVehicle } from '../services/storageService';
import { useTheme } from '../theme/ThemeContext';

const DEFAULT_OTP_EXPIRY_SECONDS = 600; // 10 minutes

/**
 * Format total seconds into a clean, human-friendly duration string.
 * Example: 218 -> "3m 38s", 60 -> "1m", 45 -> "45s"
 */
export const formatCooldownTime = totalSeconds => {
  const secs = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
  if (secs < 60) {
    return `${secs}s`;
  }
  const mins = Math.floor(secs / 60);
  const remainingSecs = secs % 60;
  if (remainingSecs === 0) {
    return `${mins}m`;
  }
  return `${mins}m ${remainingSecs}s`;
};

/**
 * Clean and format API error messages that contain unrounded decimal seconds.
 * Example: "Please wait 217.779071 seconds before requesting a new code."
 *       -> "Please wait 3m 38s before requesting a new code."
 */
export const formatApiMessage = msg => {
  if (!msg || typeof msg !== 'string') return '';
  return msg.replace(/(\d+(?:\.\d+)?)\s*seconds?/gi, (_, match) => {
    const formatted = formatCooldownTime(parseFloat(match));
    return formatted.includes('m') ? formatted : `${formatted} seconds`;
  });
};

const OtpVerificationScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { verifyUserEmail, completeRegistrationAuth } = useAuth();
  const { pendingVehicle, setActiveVehicle, clearPendingVehicle } = useVehicle();

  const email = route?.params?.email || '';
  const purpose = route?.params?.purpose || 'registration';
  const redirectTo = route?.params?.redirectTo || null;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(
    route?.params?.cooldown_seconds ? Math.ceil(route.params.cooldown_seconds) : 0,
  );
  const [expiresIn, setExpiresIn] = useState(
    route?.params?.expires_in_seconds
      ? Math.ceil(route.params.expires_in_seconds)
      : DEFAULT_OTP_EXPIRY_SECONDS,
  );
  const [toast, setToast] = useState(null);

  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const expiryTimerRef = useRef(null);

  const showToast = useCallback(({ type = 'info', title = '', message = '', duration = 3500 }) => {
    setToast({ type, title, message, duration });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Focus input automatically on mount
  useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  // Code expiration countdown timer (10 minutes)
  useEffect(() => {
    if (expiresIn <= 0) {
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
      return;
    }

    expiryTimerRef.current = setInterval(() => {
      setExpiresIn(prev => {
        if (prev <= 1) {
          clearInterval(expiryTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (expiryTimerRef.current) clearInterval(expiryTimerRef.current);
    };
  }, [expiresIn]);

  const isCodeExpired = expiresIn <= 0;

  const handleVerify = async (submittedOtp = null) => {
    Keyboard.dismiss();
    const code = submittedOtp !== null && typeof submittedOtp === 'string' ? submittedOtp : otp;

    if (isCodeExpired) {
      showToast({
        type: 'warning',
        title: 'Verification Code Expired',
        message: 'Your verification code has expired. Please tap Resend Code to get a new code.',
      });
      return;
    }

    if (!code || code.length !== 6) {
      showToast({
        type: 'warning',
        title: 'Incomplete Code',
        message: 'Please enter the complete 6-digit verification code.',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await verifyOtp(email, purpose, code);

      if (response?.success) {
        showToast({
          type: 'success',
          title: 'Code Verified',
          message:
            purpose === 'password_reset'
              ? 'Verification code confirmed. Setting new password...'
              : 'Email verified successfully!',
          duration: 1500,
        });

        setTimeout(async () => {
          if (purpose === 'registration') {
            const verifiedToken = response?.token || response?.data?.token;
            const verifiedUser = response?.user || response?.data?.user;
            const storedGuest =
              typeof getGuestVehicle === 'function' ? await getGuestVehicle() : null;
            const guestVehicle =
              route?.params?.guestVehicle || pendingVehicle || storedGuest || null;

            if (verifiedToken && verifiedUser) {
              try {
                const completeResult = await completeRegistrationAuth(
                  verifiedToken,
                  verifiedUser,
                  guestVehicle,
                );

                if (guestVehicle) {
                  try {
                    await clearPendingVehicle();
                  } catch (e) {
                    // non-fatal
                  }
                }

                if (completeResult?.claimedVehicle) {
                  setActiveVehicle(completeResult.claimedVehicle);
                }

                const shouldSkipVehicleSetup =
                  completeResult?.hasAccountVehicles &&
                  redirectTo?.name === 'VehicleDetails';

                if (redirectTo?.name && !shouldSkipVehicleSetup) {
                  try {
                    navigation.replace(redirectTo.name, redirectTo.params);
                  } catch (navErr) {
                    // Handled automatically by auth state transition
                  }
                } else if (completeResult?.hasAccountVehicles) {
                  try {
                    navigation.replace('VehicleLoading', {
                      vehicle: completeResult.claimedVehicle,
                    });
                  } catch (navErr) {
                    // Handled automatically by auth state transition
                  }
                } else {
                  try {
                    navigation.replace('VehicleDetails');
                  } catch (navErr) {
                    // Handled automatically by auth state transition
                  }
                }
              } catch (authErr) {
                console.error('[OtpVerificationScreen] Registration completion error:', authErr);
                await verifyUserEmail();
                try {
                  navigation.replace('Dashboard');
                } catch (navErr) {
                  // Handled automatically by auth state transition
                }
              }
            } else {
              await verifyUserEmail();
              if (redirectTo?.name && redirectTo.name !== 'VehicleDetails') {
                try {
                  navigation.replace(redirectTo.name, redirectTo.params);
                } catch (navErr) {
                  // Handled automatically by auth state transition
                }
              } else {
                try {
                  navigation.replace('Dashboard');
                } catch (navErr) {
                  // Handled automatically by auth state transition
                }
              }
            }
          } else if (purpose === 'password_reset') {
            try {
              navigation.replace('ResetPassword', { email, code });
            } catch (navErr) {
              // Handled safely
            }
          }
        }, 1500);
      } else {
        const msg = formatApiMessage(response?.message) || 'Invalid verification code. Please try again.';
        const isExpiredMsg = String(msg).toLowerCase().includes('expired');
        if (isExpiredMsg) {
          setExpiresIn(0);
        }
        showToast({
          type: isExpiredMsg ? 'warning' : 'error',
          title: isExpiredMsg ? 'Verification Code Expired' : 'Verification Failed',
          message: msg,
        });
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.message || err?.message || 'Verification failed. Please try again.';
      const formattedMsg = formatApiMessage(apiMsg);
      const isExpiredMsg = String(formattedMsg).toLowerCase().includes('expired');
      if (isExpiredMsg) {
        setExpiresIn(0);
      }
      showToast({
        type: isExpiredMsg ? 'warning' : 'error',
        title: isExpiredMsg ? 'Verification Code Expired' : 'Verification Error',
        message: formattedMsg,
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
        const cd = response?.cooldown_seconds || response?.cooldown || 60;
        const exp = response?.expires_in_seconds || DEFAULT_OTP_EXPIRY_SECONDS;
        setCooldown(Math.ceil(cd));
        setExpiresIn(Math.ceil(exp));
        setOtp('');
        showToast({
          type: 'success',
          title: 'Code Sent',
          message: 'A new 6-digit verification code has been sent to your email.',
        });
      } else {
        const cd = response?.cooldown_seconds || response?.cooldown;
        if (cd) setCooldown(Math.ceil(cd));
        showToast({
          type: 'error',
          title: 'Resend Failed',
          message: formatApiMessage(response?.message) || 'Unable to resend code.',
        });
      }
    } catch (err) {
      const resData = err?.response?.data;
      const rawMsg = resData?.message || err?.message || 'Failed to resend verification code.';
      const cd = resData?.cooldown_seconds || resData?.cooldown;
      if (cd) setCooldown(Math.ceil(cd));

      showToast({
        type: 'error',
        title: 'Resend Cooldown Active',
        message: formatApiMessage(rawMsg),
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
            <Text style={[styles.title, { color: theme.text }]}>
              {purpose === 'password_reset' ? 'Verification' : 'Verify email'}
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Enter the 6-digit code sent to{' '}
              <Text style={{ color: theme.accent, fontFamily: 'Inter-SemiBold' }}>{email}</Text>
            </Text>
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

          {/* CODE EXPIRATION STATUS */}
          {isCodeExpired ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(255, 90, 95, 0.12)',
                borderColor: '#FF5A5F',
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginBottom: 14,
              }}
            >
              <Ionicons name="time-outline" size={18} color="#FF5A5F" />
              <Text
                style={{
                  fontFamily: 'Inter-Medium',
                  fontSize: 12.5,
                  color: '#FF5A5F',
                  flex: 1,
                }}
              >
                Your verification code has expired. Please tap Resend Code below to receive a new code.
              </Text>
            </View>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                marginBottom: 12,
              }}
            >
              <Ionicons name="time-outline" size={15} color={theme.textSecondary} />
              <Text style={{ fontFamily: 'Inter-Medium', fontSize: 12.5, color: theme.textSecondary }}>
                Code expires in{' '}
                <Text style={{ color: theme.text, fontFamily: 'Inter-SemiBold' }}>
                  {formatCooldownTime(expiresIn)}
                </Text>
              </Text>
            </View>
          )}

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: theme.accent },
              (loading || otp.length !== 6 || isCodeExpired) && styles.buttonDisabled,
            ]}
            onPress={() => handleVerify()}
            disabled={loading || otp.length !== 6 || isCodeExpired}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Verify Code</Text>
            )}
          </TouchableOpacity>

          {/* RESEND SECTION */}
          <View style={styles.resendContainer}>
            <Text style={[styles.resendLabel, { color: theme.textSecondary }]}>
              Didn't receive the code?
            </Text>
            {cooldown > 0 ? (
              <Text style={[styles.cooldownText, { color: theme.accent }]}>
                Resend available in {formatCooldownTime(cooldown)}
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={resending}
                activeOpacity={0.7}
                style={{ paddingVertical: 4 }}
              >
                <Text style={[styles.resendLink, { color: theme.accent }]}>
                  {resending ? 'Sending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
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
    marginBottom: 28,
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 24,
  },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  button: {
    height: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  resendContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  resendLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginBottom: 4,
  },
  cooldownText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },
  resendLink: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
});

export default OtpVerificationScreen;
