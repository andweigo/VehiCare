
import { useEffect, useRef } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const OnboardingSlide = ({
  icon,
  title,
  description,
  isActive = true,
}) => {
  const { theme } = useTheme();

  const iconScale = useRef(
    new Animated.Value(0.88),
  ).current;

  const iconOpacity = useRef(
    new Animated.Value(0),
  ).current;

  const textOpacity = useRef(
    new Animated.Value(0),
  ).current;

  const textTranslateY = useRef(
    new Animated.Value(14),
  ).current;

  useEffect(() => {
    if (!isActive) {
      return;
    }

    iconScale.setValue(0.88);
    iconOpacity.setValue(0);
    textOpacity.setValue(0);
    textTranslateY.setValue(14);

    Animated.parallel([
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver: true,
      }),

      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),

      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        delay: 40,
        useNativeDriver: true,
      }),

      Animated.timing(textTranslateY, {
        toValue: 0,
        duration: 400,
        delay: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    isActive,
    iconOpacity,
    iconScale,
    textOpacity,
    textTranslateY,
  ]);

  return (
    <View
      style={[
        styles.slide,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      {/* ICON */}
      <Animated.View
        style={[
          styles.iconWrapper,
          {
            opacity: iconOpacity,
            transform: [
              {
                scale: iconScale,
              },
            ],
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={58}
          color={theme.accent}
        />
      </Animated.View>

      {/* TEXT */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
            transform: [
              {
                translateY: textTranslateY,
              },
            ],
          },
        ]}
      >
        <Text
          style={[
            styles.eyebrow,
            {
              color: theme.accent,
            },
          ]}
        >
          VEHICARE FEATURE
        </Text>

        <Text
          style={[
            styles.title,
            {
              color: theme.text,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.description,
            {
              color: theme.textSecondary,
            },
          ]}
        >
          {description}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 20,
  },

  iconWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 34,
  },

  textContainer: {
    width: '100%',
    alignItems: 'center',
  },

  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.6,
    marginBottom: 11,
    textAlign: 'center',
  },

  title: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.5,
    textAlign: 'center',
    maxWidth: 330,
    marginBottom: 14,
  },

  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 330,
  },
});

export default OnboardingSlide;
