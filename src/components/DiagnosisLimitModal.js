import { useEffect, useRef } from 'react';
import {
    Animated,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const LOGO_SOURCE = require('../assets/logo.png');
const WINDOW_HEIGHT = 700;

const DiagnosisLimitModal = ({ visible, onClose, onCreateAccount, onSignIn, onMaybeLater }) => {
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => hide(onClose)}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={() => hide(onClose)} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>
          <SafeAreaView style={styles.content}>
            <View style={styles.topMarker} />
            <View style={styles.iconWrapper}>
              <Icon name="insights" size={32} color="#F63B05" />
            </View>
            <Text style={styles.title}>You've used your 5 free diagnoses</Text>
            <Text style={styles.subtitle}>
              You've already seen what VehiCare can do.
              Create a free account to keep your diagnostic history and get more personalized vehicle assistance.
            </Text>

            <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={onCreateAccount}>
              <Text style={styles.primaryButtonText}>Create Free Account</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={onSignIn}>
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.maybeLaterButton} activeOpacity={0.85} onPress={onMaybeLater || onClose}>
              <Text style={styles.maybeLaterText}>Maybe Later</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    justifyContent: 'flex-end',
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    backgroundColor: '#4D4D4D',
    marginBottom: 18,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(246, 59, 5, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: 'Outfit-ExtraBold',
    color: '#FFFFFF',
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 14,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    color: '#D3B8AE',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 26,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#F63B05',
    borderRadius: 16,
    paddingVertical: 16,
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
    borderColor: '#F63B05',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontFamily: 'Outfit-SemiBold',
    color: '#F63B05',
    fontSize: 15,
  },
  maybeLaterButton: {
    paddingVertical: 14,
  },
  maybeLaterText: {
    fontFamily: 'Inter-Regular',
    color: '#B5B5B5',
    fontSize: 14,
  },
});

export default DiagnosisLimitModal;
