import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';

const WAVE_BAR_HEIGHTS = [10, 16, 24, 14, 26, 20, 28, 18, 24, 12, 22, 26, 16, 22, 14, 10];

const VoiceMessagePlayer = ({
  audioUri,
  isPlaying,
  onTogglePlay,
  isUser = true,
}) => {
  const { theme } = useTheme();

  const animValues = useRef(
    WAVE_BAR_HEIGHTS.map(() => new Animated.Value(0.4))
  ).current;

  useEffect(() => {
    let animations = [];

    if (isPlaying) {
      animations = animValues.map((anim, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1.0,
              duration: 180 + (index % 7) * 50,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 180 + (index % 7) * 50,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
      });

      animations.forEach(anim => anim.start());
    } else {
      animValues.forEach(anim => {
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [isPlaying, animValues]);

  const playBtnBg = isUser ? 'rgba(255, 255, 255, 0.25)' : theme.accent + '1E';
  const playBtnIconColor = isUser ? '#FFFFFF' : theme.accent;
  const playBtnBorderColor = isUser ? 'rgba(255, 255, 255, 0.5)' : theme.accent + '44';
  const barActiveColor = isUser ? '#FFFFFF' : theme.accent;
  const barInactiveColor = isUser ? 'rgba(255, 255, 255, 0.45)' : theme.border;
  const labelColor = isUser ? 'rgba(255, 255, 255, 0.9)' : theme.textSecondary;

  return (
    <View style={styles.container}>
      {/* Play/Pause Button */}
      <TouchableOpacity
        style={[
          styles.playButton,
          {
            backgroundColor: playBtnBg,
            borderColor: playBtnBorderColor,
          },
        ]}
        onPress={onTogglePlay}
        activeOpacity={0.85}
      >
        <Ionicons
          name={isPlaying ? 'pause-sharp' : 'play-sharp'}
          size={16}
          color={playBtnIconColor}
          style={{ marginLeft: isPlaying ? 0 : 2 }}
        />
      </TouchableOpacity>

      {/* Waveform & Info */}
      <View style={styles.rightSection}>
        {/* Animated Waveform */}
        <View style={styles.waveformContainer}>
          {animValues.map((anim, i) => {
            const defaultHeight = WAVE_BAR_HEIGHTS[i % WAVE_BAR_HEIGHTS.length];
            return (
              <View key={i} style={[styles.barTrack, { height: 28 }]}>
                <Animated.View
                  style={[
                    styles.waveBar,
                    {
                      height: defaultHeight,
                      backgroundColor: isPlaying ? barActiveColor : barInactiveColor,
                      transform: [{ scaleY: anim }],
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* Status Footer */}
        <View style={styles.footerRow}>
          <Ionicons
            name="mic"
            size={11}
            color={labelColor}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.statusText, { color: labelColor }]}>
            {isPlaying ? 'Playing sound note...' : 'Voice Note • Tap to play'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 215,
    maxWidth: 260,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginRight: 10,
  },
  rightSection: {
    flex: 1,
    justifyContent: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 28,
    marginBottom: 4,
  },
  barTrack: {
    width: 3.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveBar: {
    width: 3.5,
    borderRadius: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    letterSpacing: 0.2,
  },
});

export default VoiceMessagePlayer;
