import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const AuthenticationPrompt = ({
  visible,
  onClose,
  onEmailPress,
  onSignInPress,
  requestedFeature,
}) => {
  const featureText = requestedFeature
    ? `to continue to ${requestedFeature}`
    : 'to continue';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Sign in to continue</Text>

          <Text style={styles.description}>
            Create a VehiCare account to use personalized vehicle features.
            Your current vehicle will be saved to your account.
          </Text>

          <TouchableOpacity
            style={styles.emailButton}
            activeOpacity={0.85}
            onPress={onEmailPress}>
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={onSignInPress}>
              <Text style={styles.signInText}> Sign in</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            activeOpacity={0.8}
            onPress={onClose}>
            <Text style={styles.closeText}>Not now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#151515',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#292929',
  },
  title: {
    fontFamily: 'Outfit-ExtraBold',
    color: '#FFFFFF',
    fontSize: 24,
    marginBottom: 12,
  },
  description: {
    fontFamily: 'Inter-Regular',
    color: '#A1A1A1',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
  },
  emailButton: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#292929',
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emailButtonText: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  footerText: {
    fontFamily: 'Inter-Regular',
    color: '#777777',
    fontSize: 13,
  },
  signInText: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontSize: 13,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  closeText: {
    fontFamily: 'Inter-Medium',
    color: '#777777',
    fontSize: 14,
  },
});

export default AuthenticationPrompt;
