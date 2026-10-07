import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../theme/ThemeContext';
import { getDisplayValue } from '../utils/vehicleDisplay';

const LOGO_SOURCE = require('../assets/logo.png');

const WINDOW_HEIGHT = Dimensions.get('window').height;
const CLOSE_THRESHOLD = 140;

const getVehicleIconName = vehicleType => {
  const text = `${vehicleType || ''}`.toLowerCase();

  if (
    text.includes('moto') ||
    text.includes('bike') ||
    text.includes('scooter')
  ) {
    return 'motorcycle';
  }

  if (text.includes('bus')) {
    return 'directions-bus';
  }

  if (
    text.includes('truck') ||
    text.includes('van') ||
    text.includes('pickup')
  ) {
    return 'local-shipping';
  }

  return 'directions-car';
};

const NeedHelpSignInModal = ({
  visible,
  onClose,
  onGoogleSignIn,
  onSignInPress,
  onSignUpPress,
  vehicleName,
  vehicleMeta,
  vehicleType,
}) => {
  const { theme } = useTheme();

  const panY = useRef(
    new Animated.Value(WINDOW_HEIGHT),
  ).current;

  const accent = theme.accent || '#F63B05';
  const background = theme.surface || '#0A0A0A';
  const cardBackground =
    theme.surfaceAlt || '#17110E';
  const border =
    theme.border || '#30251F';
  const textPrimary =
    theme.text || '#FFFFFF';
  const textSecondary =
    theme.textSecondary || '#AFA19C';
  const accentSoft =
    theme.accentSoft ||
    'rgba(246, 59, 5, 0.14)';

  const vehicleProfile = {
    name: getDisplayValue(
      vehicleName,
      'Your Vehicle',
    ),
    meta: getDisplayValue(
      vehicleMeta,
      'Vehicle details unavailable',
    ),
    type: getDisplayValue(
      vehicleType,
      '',
    ),
  };

  const vehicleIcon = useMemo(
    () =>
      getVehicleIconName(
        vehicleProfile.type ||
          vehicleProfile.meta,
      ),
    [
      vehicleProfile.type,
      vehicleProfile.meta,
    ],
  );

  const openSheet = () => {
    Animated.spring(panY, {
      toValue: 0,
      damping: 22,
      stiffness: 180,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = callback => {
    Animated.timing(panY, {
      toValue: WINDOW_HEIGHT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      if (typeof callback === 'function') {
        callback();
      }
    });
  };

  useEffect(() => {
    if (visible) {
      openSheet();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      onMoveShouldSetPanResponder: (
        _,
        gestureState,
      ) =>
        Math.abs(gestureState.dy) > 6 &&
        Math.abs(gestureState.dx) < 12,

      onPanResponderMove: (
        _,
        gestureState,
      ) => {
        if (gestureState.dy > 0) {
          panY.setValue(
            gestureState.dy,
          );
        }
      },

      onPanResponderRelease: (
        _,
        gestureState,
      ) => {
        if (
          gestureState.dy >
            CLOSE_THRESHOLD ||
          gestureState.vy > 0.5
        ) {
          closeSheet(onClose);
        } else {
          openSheet();
        }
      },

      onPanResponderTerminate: () => {
        openSheet();
      },

      onPanResponderTerminationRequest:
        () => true,
    }),
  ).current;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={() =>
        closeSheet(onClose)
      }
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() =>
            closeSheet(onClose)
          }
        />

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.sheet,
            {
              backgroundColor:
                background,
              borderColor: border,
              transform: [
                {
                  translateY: panY,
                },
              ],
            },
          ]}
        >
          <SafeAreaView
            style={[
              styles.content,
              {
                backgroundColor:
                  background,
              },
            ]}
          >
            {/* Handle */}
            <View style={styles.handle}>
              <View
                style={[
                  styles.handleBar,
                  {
                    backgroundColor:
                      textSecondary,
                  },
                ]}
              />
            </View>

            {/* Logo */}
            <View
              style={[
                styles.logoContainer,
                {
                  backgroundColor:
                    accentSoft,
                },
              ]}
            >
              <Image
                source={LOGO_SOURCE}
                style={styles.logo}
                resizeMode="cover"
              />
            </View>

            {/* Title */}
            <Text
              style={[
                styles.title,
                {
                  color: textPrimary,
                },
              ]}
            >
              Sign in to continue
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color: textSecondary,
                },
              ]}
            >
              Save your vehicle and unlock
              personalized assistance.
            </Text>

            {/* Vehicle */}
            <View
              style={[
                styles.vehicleCard,
                {
                  backgroundColor:
                    cardBackground,
                  borderColor: border,
                },
              ]}
            >
              <View
                style={[
                  styles.vehicleIcon,
                  {
                    backgroundColor:
                      accentSoft,
                  },
                ]}
              >
                <Icon
                  name={vehicleIcon}
                  size={22}
                  color={accent}
                />
              </View>

              <View
                style={styles.vehicleInfo}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.vehicleName,
                    {
                      color:
                        textPrimary,
                    },
                  ]}
                >
                  {vehicleProfile.name}
                </Text>

                <Text
                  numberOfLines={1}
                  style={[
                    styles.vehicleMeta,
                    {
                      color:
                        textSecondary,
                    },
                  ]}
                >
                  {vehicleProfile.meta}
                </Text>
              </View>
            </View>

            {/* Google Sign In */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor:
                    accent,
                },
              ]}
              activeOpacity={0.85}
              onPress={onGoogleSignIn}
            >
              <View
                style={
                  styles.buttonContent
                }
              >
                <MaterialCommunityIcons
                  name="google"
                  size={18}
                  color="#FFFFFF"
                  style={
                    styles.buttonIcon
                  }
                />

                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Continue with Google
                </Text>
              </View>
            </TouchableOpacity>

            {/* Divider */}
            <View
              style={styles.dividerRow}
            >
              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor:
                      border,
                  },
                ]}
              />

              <Text
                style={[
                  styles.dividerText,
                  {
                    color:
                      textSecondary,
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
                      border,
                  },
                ]}
              />
            </View>

            {/* Create Account */}
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                {
                  borderColor: accent,
                },
              ]}
              activeOpacity={0.85}
              onPress={onSignUpPress}
            >
              <Text
                style={[
                  styles.secondaryButtonText,
                  {
                    color: accent,
                  },
                ]}
              >
                Create an account
              </Text>
            </TouchableOpacity>

            {/* Existing Account */}
            <View
              style={styles.accountRow}
            >
              <Text
                style={[
                  styles.accountText,
                  {
                    color:
                      textSecondary,
                  },
                ]}
              >
                Already have an account?
              </Text>

              <TouchableOpacity
                onPress={onSignInPress}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.link,
                    {
                      color: accent,
                    },
                  ]}
                >
                  Sign in
                </Text>
              </TouchableOpacity>
            </View>

            {/* Continue as Guest */}
            <TouchableOpacity
              onPress={() =>
                closeSheet(onClose)
              }
              style={styles.laterButton}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.laterText,
                  {
                    color:
                      textSecondary,
                  },
                ]}
              >
                Later
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor:
      'rgba(0, 0, 0, 0.58)',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  sheet: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    overflow: 'hidden',
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 18,
    alignItems: 'center',
  },

  handle: {
    width: '100%',
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  handleBar: {
    width: 42,
    height: 4,
    borderRadius: 10,
    opacity: 0.45,
  },

  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  logo: {
    width: '100%',
    height: '100%',
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 5,
    letterSpacing: -0.3,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 290,
    marginBottom: 18,
  },

  vehicleCard: {
    width: '100%',
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  vehicleIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  vehicleInfo: {
    flex: 1,
  },

  vehicleName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },

  vehicleMeta: {
    fontSize: 11.5,
  },

  primaryButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    paddingHorizontal: 16,
  },

  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonIcon: {
    marginRight: 10,
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  dividerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  divider: {
    flex: 1,
    height: 1,
  },

  dividerText: {
    fontSize: 10,
    fontWeight: '700',
    marginHorizontal: 12,
    letterSpacing: 0.5,
  },

  secondaryButton: {
    width: '100%',
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },

  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  accountText: {
    fontSize: 13,
    marginRight: 6,
    opacity: 1,
  },

  link: {
    fontSize: 13,
    fontWeight: '800',
  },

  laterButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },

  laterText: {
    fontSize: 12,
    opacity: 0.65,
  },
});

export default NeedHelpSignInModal;