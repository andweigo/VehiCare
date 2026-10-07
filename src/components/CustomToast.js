import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';

const ICON_MAP = {
  success: 'checkmark-circle-sharp',
  error: 'alert-circle-sharp',
  warning: 'warning-sharp',
  info: 'information-circle-sharp',
};

const COLOR_MAP = {
  success: '#10B981',
  error: '#F63B05',
  warning: '#F59E0B',
  info: '#3B82F6',
};

const CustomToast = ({
  visible,
  type = 'info',
  title,
  message,
  onHide,
}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(visible);

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-30)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);

      opacity.setValue(0);
      translateY.setValue(-30);
      scale.setValue(0.94);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 9,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 9,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -20,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.95,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [visible, mounted, opacity, translateY, scale]);

  if (!mounted) {
    return null;
  }

  const iconName = ICON_MAP[type] || ICON_MAP.info;
  const accentColor = COLOR_MAP[type] || theme.accent;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea} pointerEvents="box-none">
      <View style={styles.wrapper} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.toast,
            {
              opacity,
              backgroundColor: theme.surface || '#141414',
              borderColor: `${accentColor}40`,
              transform: [{ translateY }, { scale }],
            },
          ]}
        >
          {/* ACCENT BAR */}
          <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

          {/* ICON BADGE */}
          <View style={[styles.iconContainer, { backgroundColor: `${accentColor}1C` }]}>
            <Ionicons name={iconName} size={20} color={accentColor} />
          </View>

          {/* TEXT CONTENT */}
          <View style={styles.textContainer}>
            {title ? (
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                {title}
              </Text>
            ) : null}

            <Text
              style={[
                styles.message,
                { color: theme.textSecondary, marginTop: title ? 2 : 0 },
              ]}
              numberOfLines={2}
            >
              {message}
            </Text>
          </View>

          {/* CLOSE BUTTON */}
          {onHide ? (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onHide}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 40,
  },
  wrapper: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  toast: {
    width: '100%',
    maxWidth: 400,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3.5,
    height: 28,
    borderRadius: 4,
    marginRight: 12,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    letterSpacing: 0.1,
  },
  message: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default CustomToast;
