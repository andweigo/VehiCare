
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import OnboardingPagination from '../components/OnboardingPagination';
import OnboardingSlide from '../components/OnboardingSlide';
import { useTheme } from '../theme/ThemeContext';

const slides = [
  {
    icon: 'medical-services',
    title: 'Diagnose Vehicle Problems',
    description:
      'Describe a problem using text, voice, or images and let VehiCare help identify possible causes and solutions.',
  },
  {
    icon: 'build',
    title: 'Never Miss Maintenance',
    description:
      'Keep track of your vehicle’s maintenance needs with smart reminders and helpful recommendations.',
  },
  {
    icon: 'directions-car',
    title: 'Your Vehicles, All in One Place',
    description:
      'Manage your cars, motorcycles, and bicycles in one place with personalized diagnostics and maintenance assistance for each vehicle.',
  },
];

const INTRO_DURATION = 1800;

const WelcomeScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();

  const [introComplete, setIntroComplete] = useState(false);
  const [showAuthActions, setShowAuthActions] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const scrollViewRef = useRef(null);

  // =========================
  // INTRO ANIMATION
  // =========================

  const logoScale = useRef(
    new Animated.Value(0.72),
  ).current;

  const logoOpacity = useRef(
    new Animated.Value(0),
  ).current;

  const introTextOpacity = useRef(
    new Animated.Value(0),
  ).current;

  const introTextTranslateY = useRef(
    new Animated.Value(12),
  ).current;

  // =========================
  // ONBOARDING ANIMATION
  // =========================

  const onboardingOpacity = useRef(
    new Animated.Value(0),
  ).current;

  const onboardingTranslateY = useRef(
    new Animated.Value(18),
  ).current;

  // =========================
  // AUTH ANIMATION
  // =========================

  const authOpacity = useRef(
    new Animated.Value(0),
  ).current;

  const authTranslateY = useRef(
    new Animated.Value(24),
  ).current;

  // =========================
  // PAGINATION
  // =========================

  const scrollX = useRef(
    new Animated.Value(0),
  ).current;

  // =========================
  // INTRO ANIMATION
  // =========================

  useEffect(() => {
    const introAnimation = Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 65,
          useNativeDriver: true,
        }),

        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(introTextOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),

        Animated.timing(introTextTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ]);

    introAnimation.start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),

        Animated.timing(introTextOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),

        Animated.timing(introTextTranslateY, {
          toValue: -10,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIntroComplete(true);

        Animated.parallel([
          Animated.timing(onboardingOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),

          Animated.timing(onboardingTranslateY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, INTRO_DURATION);

    return () => {
      clearTimeout(timer);
      introAnimation.stop();
    };
  }, [
    introTextOpacity,
    introTextTranslateY,
    logoOpacity,
    logoScale,
    onboardingOpacity,
    onboardingTranslateY,
  ]);

  // =========================
  // AUTHENTICATION ANIMATION
  // =========================

  useEffect(() => {
    if (!showAuthActions) {
      return;
    }

    authOpacity.setValue(0);
    authTranslateY.setValue(24);

    Animated.parallel([
      Animated.timing(authOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),

      Animated.spring(authTranslateY, {
        toValue: 0,
        friction: 8,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    showAuthActions,
    authOpacity,
    authTranslateY,
  ]);

  // =========================
  // NAVIGATION
  // =========================

  const handleContinueAsGuest = () => {
    navigation.navigate('VehicleDetails');
  };

  const handleSignIn = () => {
    navigation.navigate('Login', {
      redirectTo: {
        name: 'VehicleDetails',
      },
    });
  };

  const handleCreateAccount = () => {
    navigation.navigate('Register', {
      redirectTo: {
        name: 'VehicleDetails',
      },
    });
  };

  // =========================
  // ONBOARDING
  // =========================

  const scrollToIndex = index => {
    const node = scrollViewRef.current;

    if (!node) {
      return;
    }

    if (typeof node.scrollTo === 'function') {
      node.scrollTo({
        x: index * width,
        animated: true,
      });

      return;
    }

    if (typeof node.getNode === 'function') {
      node.getNode().scrollTo({
        x: index * width,
        animated: true,
      });
    }
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      scrollToIndex(currentIndex + 1);
      return;
    }

    handleOnboardingFinish();
  };

  const handleSkip = () => {
    handleOnboardingFinish();
  };

  const handleOnboardingFinish = () => {
    Animated.parallel([
      Animated.timing(onboardingOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),

      Animated.timing(onboardingTranslateY, {
        toValue: -12,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowAuthActions(true);
    });
  };

  const handleMomentumScrollEnd = event => {
    const offset = event.nativeEvent.contentOffset.x;

    const nextIndex = Math.round(
      offset / width,
    );

    if (
      nextIndex >= 0 &&
      nextIndex < slides.length &&
      nextIndex !== currentIndex
    ) {
      setCurrentIndex(nextIndex);
    }
  };

  // =========================
  // INTRO
  // =========================

  const renderIntro = () => {
    return (
      <Animated.View
        style={[
          styles.introContainer,
          {
            opacity: logoOpacity,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                {
                  scale: logoScale,
                },
              ],
            },
          ]}
        >
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.introText,
            {
              opacity: introTextOpacity,
              transform: [
                {
                  translateY:
                    introTextTranslateY,
                },
              ],
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: theme.text,
              },
            ]}
          >
            VehiCare
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            {'An Intelligent Multi-Vehicle Diagnostics\n& Repair Assistance'}
          </Text>
        </Animated.View>
      </Animated.View>
    );
  };

  // =========================
  // ONBOARDING
  // =========================

  const renderOnboarding = () => {
    return (
      <Animated.View
        style={[
          styles.onboardingContainer,
          {
            opacity: onboardingOpacity,
            transform: [
              {
                translateY:
                  onboardingTranslateY,
              },
            ],
          },
        ]}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.7}
            style={styles.skipButton}
          >
            <Text
              style={[
                styles.skipText,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              Skip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.7}
            style={styles.nextTopButton}
          >
            <Text
              style={[
                styles.nextTopText,
                {
                  color: theme.accent,
                },
              ]}
            >
              {currentIndex ===
              slides.length - 1
                ? 'Get Started'
                : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>

        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
          onMomentumScrollEnd={
            handleMomentumScrollEnd
          }
          onScroll={Animated.event(
            [
              {
                nativeEvent: {
                  contentOffset: {
                    x: scrollX,
                  },
                },
              },
            ],
            {
              useNativeDriver: true,
            },
          )}
        >
          {slides.map((slide, index) => (
            <View
              key={`slide-${index}`}
              style={[
                styles.slidePage,
                {
                  width,
                },
              ]}
            >
              <OnboardingSlide
                icon={slide.icon}
                title={slide.title}
                description={
                  slide.description
                }
                isActive={
                  currentIndex === index
                }
              />
            </View>
          ))}
        </Animated.ScrollView>

        <View style={styles.bottomControls}>
          <View
            style={
              styles.paginationContainer
            }
          >
            <OnboardingPagination
              currentIndex={currentIndex}
              total={slides.length}
              scrollX={scrollX}
              pageWidth={width}
            />
          </View>
        </View>
      </Animated.View>
    );
  };

  // =========================
  // AUTHENTICATION
  // =========================

  const renderAuthActions = () => {
    return (
      <Animated.View
        style={[
          styles.authContainer,
          {
            opacity: authOpacity,
            transform: [
              {
                translateY:
                  authTranslateY,
              },
            ],
          },
        ]}
      >
        <View style={styles.authContent}>
          <View style={styles.authHeader}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.authLogo}
              resizeMode="contain"
            />

            <Text
              style={[
                styles.authTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              Welcome to VehiCare
            </Text>

            <Text
              style={[
                styles.authSubtitle,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Your vehicle's smarter assistant.
            </Text>
          </View>

          <View style={styles.authButtons}>
            {/* SIGN IN */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor:
                    theme.accent,
                },
              ]}
              onPress={handleSignIn}
              activeOpacity={0.85}
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Sign In
              </Text>
            </TouchableOpacity>

            {/* DIVIDER */}
            <View
              style={styles.dividerRow}
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

            {/* GUEST */}
            <TouchableOpacity
              style={[
                styles.guestButton,
                {
                  backgroundColor:
                    theme.surface,
                  borderColor:
                    theme.border,
                },
              ]}
              onPress={
                handleContinueAsGuest
              }
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.guestButtonText,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Continue as Guest
              </Text>
            </TouchableOpacity>

            {/* CREATE ACCOUNT */}
            <View
              style={styles.createAccountRow}
            >
              <Text
                style={[
                  styles.createAccountLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Don't have an account?
              </Text>

              <TouchableOpacity
                onPress={
                  handleCreateAccount
                }
                activeOpacity={0.7}
                style={
                  styles.createAccountButton
                }
              >
                <Text
                  style={[
                    styles.tertiaryButtonText,
                    {
                      color:
                        theme.accent,
                    },
                  ]}
                >
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.footer,
            {
              color:
                theme.textSecondary,
            },
          ]}
        >
          Driving Smarter. Diagnosing Faster.
          Maintaining Better.
        </Text>
      </Animated.View>
    );
  };

  // =========================
  // RETURN
  // =========================

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.background,
        },
      ]}
      edges={['top', 'bottom']}
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

      {!introComplete &&
        renderIntro()}

      {introComplete &&
        !showAuthActions &&
        renderOnboarding()}

      {showAuthActions &&
        renderAuthActions()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  // =========================
  // INTRO
  // =========================

  introContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  logoContainer: {
    width: 104,
    height: 104,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },

  logo: {
    width: 180,
    height: 180,
  },

  introText: {
    alignItems: 'center',
  },

  title: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 40,
    letterSpacing: -1.2,
    textAlign: 'center',
  },

  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 12,
  },

  // =========================
  // ONBOARDING
  // =========================

  onboardingContainer: {
    flex: 1,
  },

  topBar: {
    height: 76,
    paddingHorizontal: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  skipButton: {
    minWidth: 64,
    height: 42,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  skipText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    letterSpacing: 0.2,
  },

  nextTopButton: {
    minWidth: 64,
    height: 42,
    paddingHorizontal: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  nextTopText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    letterSpacing: 0.2,
  },

  slidePage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  bottomControls: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },

  paginationContainer: {
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // =========================
  // AUTHENTICATION
  // =========================

  authContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
  },

  authContent: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
  },

  authHeader: {
    alignItems: 'center',
    marginBottom: 42,
  },

  authLogo: {
    width: 180,
    height: 180,
    marginBottom: 22,
  },

  authTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.7,
    textAlign: 'center',
  },

  authSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },

  authButtons: {
    width: '100%',
  },

  // =========================
  // PRIMARY SIGN IN
  // =========================

  primaryButton: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0.1,
  },

  // =========================
  // DIVIDER
  // =========================

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 22,
  },

  divider: {
    flex: 1,
    height: 1,
  },

  dividerText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
    letterSpacing: 1.2,
    marginHorizontal: 14,
  },

  // =========================
  // GUEST
  // =========================

  guestButton: {
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  guestButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
    letterSpacing: 0.1,
  },

  // =========================
  // CREATE ACCOUNT
  // =========================

  createAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },

  createAccountLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },

  createAccountButton: {
    marginLeft: 5,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  tertiaryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },

  // =========================
  // FOOTER
  // =========================

  footer: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    opacity: 0.65,
    paddingHorizontal: 20,
  },
});

export default WelcomeScreen;