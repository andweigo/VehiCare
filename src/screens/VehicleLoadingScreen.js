import { useEffect, useRef, useState } from 'react';

import {
    Animated,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import LottieView from 'lottie-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useTheme } from '../theme/ThemeContext';

const CHECKLIST_STEPS = [
  'Saving vehicle profile',
  'Preparing vehicle information',
  'Setting up health profile',
  'Preparing recommendations',
  'Loading dashboard',
];

const getProgressStepIndex = value => {
  if (value < 20) return 0;
  if (value < 40) return 1;
  if (value < 60) return 2;
  if (value < 80) return 3;
  return 4;
};

const VehicleLoadingScreen = ({ navigation }) => {
  const { theme } = useTheme();

  const accent = theme.accent || '#F63B05';

  const progress = useRef(
    new Animated.Value(0),
  ).current;

  const statusOpacity = useRef(
    new Animated.Value(1),
  ).current;

  const statusTranslateY = useRef(
    new Animated.Value(0),
  ).current;

  const iconRotation = useRef(
    new Animated.Value(0),
  ).current;

  const [percent, setPercent] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] =
    useState(0);

  const previousStepIndex = useRef(0);

  useEffect(() => {
    let redirectTimer = null;
    let dashboardDelayTimer = null;

    const progressListener = progress.addListener(
      ({ value }) => {
        const roundedValue = Math.round(value);

        setPercent(roundedValue);

        const nextIndex =
          getProgressStepIndex(roundedValue);

        if (
          nextIndex !==
          previousStepIndex.current
        ) {
          previousStepIndex.current = nextIndex;

          Animated.parallel([
            Animated.timing(statusOpacity, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }),

            Animated.timing(statusTranslateY, {
              toValue: -6,
              duration: 180,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setCurrentStepIndex(nextIndex);

            statusTranslateY.setValue(6);

            Animated.parallel([
              Animated.timing(statusOpacity, {
                toValue: 1,
                duration: 350,
                useNativeDriver: true,
              }),

              Animated.timing(statusTranslateY, {
                toValue: 0,
                duration: 350,
                useNativeDriver: true,
              }),
            ]).start();
          });
        }
      },
    );

    /*
     * PHASE 1
     *
     * Load everything up to 90%.
     */
    const initialProgress = Animated.timing(
      progress,
      {
        toValue: 90,
        duration: 10500,
        useNativeDriver: false,
      },
    );

    /*
     * PHASE 2
     *
     * Pause at 90% while "Loading dashboard"
     * is displayed.
     */
    const dashboardLoadingDelay = Animated.delay(
      2500,
    );

    /*
     * PHASE 3
     *
     * Finish the last 10%.
     */
    const finalProgress = Animated.timing(
      progress,
      {
        toValue: 100,
        duration: 900,
        useNativeDriver: false,
      },
    );

    const progressSequence =
      Animated.sequence([
        initialProgress,
        dashboardLoadingDelay,
        finalProgress,
      ]);

    const rotationAnimation =
      Animated.loop(
        Animated.timing(iconRotation, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      );

    rotationAnimation.start();

    progressSequence.start(({ finished }) => {
      if (finished) {
        setPercent(100);

        dashboardDelayTimer = setTimeout(() => {
          navigation.replace('Dashboard');
        }, 800);
      }
    });

    return () => {
      progress.removeListener(progressListener);

      progressSequence.stop();
      rotationAnimation.stop();

      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }

      if (dashboardDelayTimer) {
        clearTimeout(dashboardDelayTimer);
      }
    };
  }, [
    navigation,
    progress,
    statusOpacity,
    statusTranslateY,
    iconRotation,
  ]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  const isComplete = percent >= 100;

  const iconRotate = iconRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <View style={styles.content}>

        {/* VEHICLE ANIMATION */}

        <View style={styles.animationWrap}>
          <LottieView
            source={require('../assets/animations/loadingwheel.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
        </View>

        {/* TITLE */}

        <View style={styles.titleContainer}>
          <Text
            style={[
              styles.primaryTitle,
              {
                color: accent,
              },
            ]}
          >
            VehiCare.
          </Text>

          <Text
            style={[
              styles.secondaryTitle,
              {
                color:
                  theme.textSecondary ||
                  '#F5F5F5',
              },
            ]}
          >
            Smarter care starts here.
          </Text>
        </View>

        {/* PROGRESS */}

        <View style={styles.progressSection}>
          <View
            style={[
              styles.progressTrack,
              {
                backgroundColor:
                  theme.surfaceAlt ||
                  '#242424',
              },
            ]}
          >
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: accent,
                  width: progressWidth,
                },
              ]}
            />
          </View>

          {/* STATUS */}

          <View style={styles.statusRow}>
            <Animated.View
              style={[
                styles.statusLeft,
                {
                  opacity: statusOpacity,
                  transform: [
                    {
                      translateY:
                        statusTranslateY,
                    },
                  ],
                },
              ]}
            >
              {isComplete ? (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={17}
                  color={accent}
                />
              ) : (
                <Animated.View
                  style={{
                    transform: [
                      {
                        rotate: iconRotate,
                      },
                    ],
                  }}
                >
                  <MaterialCommunityIcons
                    name="loading"
                    size={17}
                    color={accent}
                  />
                </Animated.View>
              )}

              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      theme.textSecondary ||
                      '#777777',
                  },
                ]}
              >
                {isComplete
                  ? 'Vehicle setup complete'
                  : CHECKLIST_STEPS[
                      currentStepIndex
                    ]}
              </Text>
            </Animated.View>

            <Text
              style={[
                styles.percent,
                {
                  color: accent,
                },
              ]}
            >
              {percent}%
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },

  /* VEHICLE ANIMATION */

  animationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  lottie: {
    width: 230,
    height: 230,
  },

  /* TITLE */

  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },

  primaryTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.9,
    textAlign: 'center',
  },

  secondaryTitle: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
    textAlign: 'center',
    marginTop: 3,
  },

  /* PROGRESS */

  progressSection: {
    width: '100%',
  },

  progressTrack: {
    width: '100%',
    height: 7,
    backgroundColor: '#242424',
    borderRadius: 999,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
  },

  /* STATUS */

  statusRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 13,
  },

  statusLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  statusText: {
    color: '#777777',
    fontSize: 12,
    fontWeight: '500',
  },

  percent: {
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 10,
  },
});

export default VehicleLoadingScreen;