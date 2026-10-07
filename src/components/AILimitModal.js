import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

const WINDOW_HEIGHT = 700;

const AILimitModal = ({
  visible,
  onClose,
  plan = 'guest',
  onSignIn,
  onCreateAccount,
  onUpgrade,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const slideY = useRef(new Animated.Value(WINDOW_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideY]);

  const hide = callback => {
    Animated.timing(slideY, {
      toValue: WINDOW_HEIGHT,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      callback?.();
    });
  };

  const isGuest = plan === 'guest';
  const isFree = plan === 'free';
  const isPremium = plan === 'premium';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => hide(onClose)}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={() => hide(onClose)}
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              transform: [{ translateY: slideY }],
            },
          ]}
        >
          <SafeAreaView style={styles.content}>
            <View style={[styles.topMarker, { backgroundColor: theme.border }]} />

            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: theme.accent + '18' },
              ]}
            >
              <Feather
                name={isGuest ? 'lock' : isFree ? 'zap-off' : 'alert-circle'}
                size={28}
                color={theme.accent}
              />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>
              {isGuest
                ? "You've used all 5 guest AI consultations"
                : isFree
                ? "You've reached your Free AI consultation limit"
                : "You've reached your Premium AI consultation limit"}
            </Text>

            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {isGuest
                ? 'Create a VehiCare account to continue using Ask VehiCare and keep your vehicle diagnostic history.'
                : isFree
                ? 'Upgrade to Premium for higher monthly AI usage limits and extended video analysis.'
                : 'You have exhausted your Premium AI consultation allowance for this period. Please try again next billing cycle.'}
            </Text>

            {isGuest && (
              <>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.accent }]}
                  activeOpacity={0.85}
                  onPress={() => hide(onCreateAccount)}
                >
                  <Text style={styles.primaryButtonText}>
                    {t('createFreeAccount', 'Create Free Account')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { borderColor: theme.accent },
                  ]}
                  activeOpacity={0.85}
                  onPress={() => hide(onSignIn)}
                >
                  <Text style={[styles.secondaryButtonText, { color: theme.accent }]}>
                    {t('signIn', 'Sign In')}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {isFree && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.accent }]}
                activeOpacity={0.85}
                onPress={() => hide(onUpgrade)}
              >
                <Text style={styles.primaryButtonText}>
                  {t('upgradeToPremium', 'Upgrade to Premium')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.maybeLaterButton}
              activeOpacity={0.85}
              onPress={() => hide(onClose)}
            >
              <Text style={[styles.maybeLaterText, { color: theme.textSecondary }]}>
                {t('close', 'Close')}
              </Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  topMarker: {
    width: 48,
    height: 4,
    borderRadius: 2,
    marginBottom: 18,
  },
  iconWrapper: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontFamily: 'Outfit-SemiBold',
    color: '#FFFFFF',
    fontSize: 15,
  },
  secondaryButton: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
  },
  maybeLaterButton: {
    paddingVertical: 12,
  },
  maybeLaterText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
  },
});

export default AILimitModal;
