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

const ConfirmActionModal = ({
  visible,
  title,
  message,
  primaryLabel,
  secondaryLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
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
          <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>{message}</Text>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={onCancel}>
              <Text style={styles.modalButtonText}>{secondaryLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalButton,
                destructive
                  ? styles.modalDeleteButton
                  : styles.modalConfirmButton,
              ]}
              onPress={onConfirm}>
              <Text style={styles.modalButtonText}>{primaryLabel}</Text>
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
    borderWidth: 1,
    borderColor: '#292929',
  },
  modalTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 20,
    color: '#FFFFFF',
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
  modalDeleteButton: {
    backgroundColor: '#A32020',
  },
  modalButtonText: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontSize: 15,
  },
});

export default ConfirmActionModal;
