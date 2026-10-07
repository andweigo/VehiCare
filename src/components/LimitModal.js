import { useEffect, useMemo, useRef } from 'react';
import {
    Animated,
    Image,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

const LOGO_SOURCE = require('../assets/logo.png');

const WINDOW_HEIGHT = 700;

const LimitModal = ({
  visible,
  iconName = 'directions-car',
  onPrimaryPress,
  onSecondaryPress,
  onClose,
  vehicleCount = 1,
}) => {
  const { user } = useAuth();
  const { theme } = useTheme();

  /*
   * Calculate plan info
   */
  const planInfo = useMemo(() => {
    const subscription =
      user?.subscription_plan ||
      'free';

    const isPremium =
      subscription === 'premium';

    const vehicleLimit =
      user?.vehicle_limit ??
      (isPremium ? 5 : 1);

    return {
      isPremium,
      subscription,
      vehicleLimit,
      currentUsage:
        vehicleCount || 1,
      percentageUsed: Math.min(
        100,
        Math.round(
          ((vehicleCount || 1) /
            vehicleLimit) *
            100,
        ),
      ),
    };
  }, [user, vehicleCount]);

  /*
   * Generate content based on plan
   */
  const content = useMemo(
    () => ({
      title: planInfo.isPremium
        ? 'Vehicle Limit Reached'
        : 'Vehicle Limit Reached',
      subtitle: planInfo.isPremium
        ? `You've reached your limit of ${planInfo.vehicleLimit} vehicles. Premium accounts can manage up to ${planInfo.vehicleLimit} vehicles.`
        : 'Free accounts can only manage one vehicle. Upgrade to Premium to add more vehicles and switch between them.',
      primaryButtonLabel: planInfo.isPremium
        ? 'OK'
        : 'Upgrade to Premium',
      secondaryButtonLabel:
        'Maybe Later',
    }),
    [planInfo],
  );

  const styles = getStyles(theme);

  const slideY = useRef(
    new Animated.Value(WINDOW_HEIGHT),
  ).current;

  const backdropOpacity = useRef(
    new Animated.Value(0),
  ).current;

  const iconScale = useRef(
    new Animated.Value(0.82),
  ).current;

  useEffect(() => {
    if (visible) {
      slideY.setValue(WINDOW_HEIGHT);
      backdropOpacity.setValue(0);
      iconScale.setValue(0.82);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),

        Animated.spring(slideY, {
          toValue: 0,
          tension: 65,
          friction: 10,
          useNativeDriver: true,
        }),

        Animated.spring(iconScale, {
          toValue: 1,
          tension: 90,
          friction: 7,
          delay: 80,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [
    visible,
    slideY,
    backdropOpacity,
    iconScale,
  ]);

  const hide = callback => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),

      Animated.timing(slideY, {
        toValue: WINDOW_HEIGHT,
        duration: 190,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback?.();
    });
  };

  const handleClose = () => {
    hide(onClose);
  };

  const handlePrimaryPress = () => {
    hide(onPrimaryPress);
  };

  const handleSecondaryPress = () => {
    hide(onSecondaryPress || onClose);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* BACKDROP */}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        />

        {/* OUTSIDE TAP */}

        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* BOTTOM SHEET */}

        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [
                {
                  translateY: slideY,
                },
              ],
            },
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* HANDLE */}

            <View style={styles.handle} />

            {/* CLOSE BUTTON */}

            <TouchableOpacity
              style={styles.closeButton}
              activeOpacity={0.8}
              onPress={handleClose}
            >
              <MaterialIcons
                name="close"
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            {/* LOGO */}

            <Animated.View
              style={[
                styles.iconOuter,
                {
                  transform: [
                    {
                      scale: iconScale,
                    },
                  ],
                },
              ]}
            >
              <Image
                source={LOGO_SOURCE}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>

            {/* EYEBROW */}

            <View style={styles.limitLabel}>
              <MaterialIcons
                name="info-outline"
                size={13}
                color={theme.accent}
              />

              <Text style={styles.limitLabelText}>
                VEHICLE LIMIT
              </Text>
            </View>

            {/* TITLE */}

            <Text style={styles.title}>
              {content.title}
            </Text>

            {/* DESCRIPTION */}

            <Text style={styles.subtitle}>
              {content.subtitle}
            </Text>

            {/* VEHICLE CAPACITY */}

            <View style={styles.capacityCard}>
              <View style={styles.capacityHeader}>
                <View>
                  <Text
                    style={
                      styles.capacityLabel
                    }
                  >
                    Current plan
                  </Text>

                  <Text
                    style={
                      styles.capacityPlan
                    }
                  >
                    {planInfo.isPremium
                      ? 'Premium'
                      : 'Free'}
                  </Text>
                </View>

                <View
                  style={
                    styles.capacityCount
                  }
                >
                  <Text
                    style={
                      styles.capacityCurrent
                    }
                  >
                    {planInfo.currentUsage}
                  </Text>

                  <Text
                    style={
                      styles.capacitySlash
                    }
                  >
                    /
                  </Text>

                  <Text
                    style={
                      styles.capacityMax
                    }
                  >
                    {planInfo.vehicleLimit}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.progressTrack
                }
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${planInfo.percentageUsed}%`,
                    },
                  ]}
                />
              </View>

              <View
                style={
                  styles.capacityFooter
                }
              >
                <Text
                  style={
                    styles.capacityFooterText
                  }
                >
                  Vehicle slots used
                </Text>

                <Text
                  style={[
                    styles.capacityFooterText,
                    styles.capacityFooterAccent,
                  ]}
                >
                  {planInfo.percentageUsed}%
                </Text>
              </View>
            </View>

            {/* PREMIUM BENEFITS */}

            {!planInfo.isPremium && (
              <View style={styles.premiumRow}>
                <View
                  style={
                    styles.premiumIcon
                  }
                >
                  <MaterialIcons
                    name="auto-awesome"
                    size={15}
                    color={theme.accent}
                  />
                </View>

                <View
                  style={
                    styles.premiumTextWrapper
                  }
                >
                  <Text
                    style={
                      styles.premiumTitle
                    }
                  >
                    Upgrade to Premium
                  </Text>

                  <Text
                    style={
                      styles.premiumSubtitle
                    }
                  >
                    Manage up to {planInfo.vehicleLimit} vehicles
                  </Text>
                </View>

                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={theme.textSecondary}
                />
              </View>
            )}

            {/* PRIMARY BUTTON */}

            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.85}
              onPress={
                handlePrimaryPress
              }
            >
            

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                {content.primaryButtonLabel}
              </Text>
            </TouchableOpacity>

            {/* SECONDARY BUTTON */}

            {!planInfo.isPremium && (
              <TouchableOpacity
                style={styles.secondaryButton}
                activeOpacity={0.75}
                onPress={
                  handleSecondaryPress
                }
              >
                <Text
                  style={
                    styles.secondaryButtonText
                  }
                >
                  {content.secondaryButtonLabel}
                </Text>
              </TouchableOpacity>
            )}
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const getStyles = (theme) => StyleSheet.create({
  /*
   * ============================================
   * CONTAINER
   * ============================================
   */

  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.overlay,
  },

  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },

  /*
   * ============================================
   * SHEET
   * ============================================
   */

  sheet: {
    width: '100%',

    backgroundColor: theme.surface,

    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,

    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,

    borderColor: theme.border,

    overflow: 'hidden',

    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 20,

    elevation: 20,
  },

  safeArea: {
    alignItems: 'center',

    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 12,
  },

  /*
   * ============================================
   * HANDLE
   * ============================================
   */

  handle: {
    width: 38,
    height: 4,

    borderRadius: 4,

    backgroundColor: theme.muted,

    marginBottom: 5,
  },

  /*
   * ============================================
   * CLOSE
   * ============================================
   */

  closeButton: {
    position: 'absolute',

    top: 16,
    right: 18,

    width: 34,
    height: 34,

    borderRadius: 12,

    backgroundColor: theme.surfaceAlt,

    borderWidth: 1,
    borderColor: theme.border,

    alignItems: 'center',
    justifyContent: 'center',

    zIndex: 10,
  },

  /*
   * ============================================
   * ICON
   * ============================================
   */

  iconOuter: {
    width: 70,
    height: 70,

    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 10,
    marginBottom: 10,
  },

  iconGlow: {
    position: 'absolute',

    width: 70,
    height: 70,

    borderRadius: 35,

    backgroundColor: theme.accent,

    opacity: 0.07,
  },

  iconWrapper: {
    width: 58,
    height: 58,

    borderRadius: 19,

    backgroundColor: theme.surfaceAlt,

    borderWidth: 1,
    borderColor: theme.border,

    alignItems: 'center',
    justifyContent: 'center',
  },

  logoImage: {
    width: 60,
    height: 60,
  },

  /*
   * ============================================
   * LABEL
   * ============================================
   */

  limitLabel: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 9,
    paddingVertical: 5,

    borderRadius: 8,

    backgroundColor: theme.accentSoft,

    borderWidth: 1,
    borderColor: theme.accent,

    marginBottom: 9,
  },

  limitLabelText: {
    fontFamily: 'Inter-SemiBold',

    fontSize: 8,

    letterSpacing: 1,

    color: theme.accent,

    marginLeft: 5,
  },

  /*
   * ============================================
   * TITLE
   * ============================================
   */

  title: {
    fontFamily: 'Outfit-SemiBold',

    fontSize: 23,

    lineHeight: 28,

    color: theme.text,

    textAlign: 'center',

    marginBottom: 7,
  },

  subtitle: {
    fontFamily: 'Inter-Regular',

    fontSize: 11,

    lineHeight: 18,

    color: theme.textSecondary,

    textAlign: 'center',

    maxWidth: 330,

    marginBottom: 17,
  },

  /*
   * ============================================
   * CAPACITY CARD
   * ============================================
   */

  capacityCard: {
    width: '100%',

    backgroundColor: theme.surfaceAlt,

    borderRadius: 16,

    borderWidth: 1,
    borderColor: theme.border,

    padding: 14,

    marginBottom: 10,
  },

  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 11,
  },

  capacityLabel: {
    fontFamily: 'Inter-Regular',

    fontSize: 9,

    color: theme.textSecondary,

    marginBottom: 2,
  },

  capacityPlan: {
    fontFamily: 'Outfit-SemiBold',

    fontSize: 14,

    color: theme.text,
  },

  capacityCount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },

  capacityCurrent: {
    fontFamily: 'Outfit-SemiBold',

    fontSize: 18,

    color: theme.text,
  },

  capacitySlash: {
    fontFamily: 'Inter-Regular',

    fontSize: 12,

    color: theme.placeholder,

    marginHorizontal: 3,
  },

  capacityMax: {
    fontFamily: 'Inter-Regular',

    fontSize: 12,

    color: theme.textSecondary,
  },

  progressTrack: {
    width: '100%',
    height: 5,

    borderRadius: 5,

    backgroundColor: theme.border,

    overflow: 'hidden',

    marginBottom: 8,
  },

  progressFill: {
    width: '100%',
    height: '100%',

    borderRadius: 5,

    backgroundColor: theme.accent,
  },

  capacityFooter: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  capacityFooterText: {
    fontFamily: 'Inter-Regular',

    fontSize: 8,

    color: theme.textSecondary,
  },

  capacityFooterAccent: {
    color: theme.accent,

    fontFamily: 'Inter-SemiBold',
  },

  /*
   * ============================================
   * PREMIUM ROW
   * ============================================
   */

  premiumRow: {
    width: '100%',

    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: theme.surfaceAlt,

    borderRadius: 15,

    borderWidth: 1,
    borderColor: theme.border,

    paddingHorizontal: 12,
    paddingVertical: 10,

    marginBottom: 14,
  },

  premiumIcon: {
    width: 32,
    height: 32,

    borderRadius: 10,

    backgroundColor: theme.accentSoft,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  premiumTextWrapper: {
    flex: 1,
  },

  premiumTitle: {
    fontFamily: 'Inter-SemiBold',

    fontSize: 10,

    color: theme.text,

    marginBottom: 2,
  },

  premiumSubtitle: {
    fontFamily: 'Inter-Regular',

    fontSize: 8.5,

    color: theme.textSecondary,
  },

  /*
   * ============================================
   * PRIMARY BUTTON
   * ============================================
   */

  primaryButton: {
    width: '100%',

    height: 50,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: theme.accent,

    borderRadius: 14,

    marginBottom: 9,

    shadowColor: theme.accent,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,

    elevation: 4,
  },

  primaryButtonText: {
    fontFamily: 'Inter-SemiBold',

    fontSize: 12,

    color: theme.text,

    marginLeft: 7,
  },

  /*
   * ============================================
   * SECONDARY BUTTON
   * ============================================
   */

  secondaryButton: {
    width: '100%',

    height: 45,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 13,
  },

  secondaryButtonText: {
    fontFamily: 'Inter-SemiBold',

    fontSize: 10.5,

    color: theme.textSecondary,
  },
});

export default LimitModal;