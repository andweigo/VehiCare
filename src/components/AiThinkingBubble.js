import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const THINKING_MESSAGES = [
  'Analyzing vehicle symptoms...',
  'Evaluating diagnostic telemetry...',
  'Searching automotive fault database...',
  'Formulating repair recommendation...',
];

const AiThinkingBubble = () => {
  const { theme } = useTheme();

  // Animated values for 3 staggered dots
  const dot1Anim = useRef(new Animated.Value(0)).current;
  const dot2Anim = useRef(new Animated.Value(0)).current;
  const dot3Anim = useRef(new Animated.Value(0)).current;

  // Pulse glow animation for AI avatar
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Message index animation
  const [messageIndex, setMessageIndex] = React.useState(0);

  useEffect(() => {
    // 3 Dots Staggered Animation Loop
    const createDotAnimation = (anim, delay) => {
      return Animated.sequence([
        Animated.delay(delay),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 350,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 350,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.delay(500),
          ])
        ),
      ]);
    };

    const anim1 = createDotAnimation(dot1Anim, 0);
    const anim2 = createDotAnimation(dot2Anim, 180);
    const anim3 = createDotAnimation(dot3Anim, 360);

    anim1.start();
    anim2.start();
    anim3.start();

    // Pulse Avatar Glow Loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Rotate status messages every 2.5s
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % THINKING_MESSAGES.length);
    }, 2500);

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
      pulseLoop.stop();
      clearInterval(interval);
    };
  }, [dot1Anim, dot2Anim, dot3Anim, pulseAnim]);

  const getDotStyle = (anim) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 1],
    }),
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -5],
        }),
      },
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.25],
        }),
      },
    ],
  });

  return (
    <View style={styles.assistantContainer}>
      {/* AI Avatar with Glowing Pulse */}
      <Animated.View
        style={[
          styles.aiAvatar,
          {
            borderColor: theme.accent,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <View style={styles.aiAvatarInner}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.aiIcon}
            resizeMode="contain"
          />
        </View>
      </Animated.View>

      <View style={styles.assistantBody}>
        {/* Thinking Bubble */}
        <View
          style={[
            styles.assistantBubble,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Animated 3 Pulsing Dots */}
          <View style={styles.dotsRow}>
            <Animated.View
              style={[
                styles.dot,
                { backgroundColor: theme.accent },
                getDotStyle(dot1Anim),
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                { backgroundColor: theme.accent },
                getDotStyle(dot2Anim),
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                { backgroundColor: theme.accent },
                getDotStyle(dot3Anim),
              ]}
            />
          </View>
        </View>

        {/* Dynamic Status Subtext */}
        <Text style={[styles.thinkingSubtext, { color: theme.textSecondary }]}>
          {THINKING_MESSAGES[messageIndex]}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  assistantContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingRight: 40,
    alignItems: 'flex-start',
  },
  aiAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    marginRight: 10,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  aiAvatarInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  aiIcon: {
    width: 20,
    height: 20,
  },
  assistantBody: {
    flex: 1,
  },
  assistantBubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    alignSelf: 'flex-start',
    minWidth: 80,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    height: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  thinkingSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    marginTop: 5,
    marginLeft: 4,
    fontStyle: 'italic',
  },
});

export default AiThinkingBubble;
