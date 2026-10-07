import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const ConfirmSignOutModal = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const { theme } = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
          <Text style={[styles.modalTitle, { color: theme.text }]}>Sign Out</Text>
          <Text style={[styles.modalMessage, { color: theme.textSecondary }]}> 
            Are you sure you want to sign out? This will clear your current session.
          </Text>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={onCancel}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalConfirmButton]}
              onPress={onConfirm}>
              <Text style={styles.modalButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#121212',
    borderRadius: 22,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  modalTitle: {
    fontFamily: 'Outfit-SemiBold',
    color: '#FFFFFF',
    fontSize: 20,
    marginBottom: 12,
  },
  modalMessage: {
    fontFamily: 'Inter-Regular',
    color: '#CCCCCC',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#292929',
    marginRight: 10,
  },
  modalConfirmButton: {
    backgroundColor: '#F63B05',
  },
  modalButtonText: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontSize: 15,
  },
});

export default ConfirmSignOutModal;
