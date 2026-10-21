import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const getIconConfig = (type, customIcon, customIconColor, theme) => {
  if (customIcon) {
    return { name: customIcon, color: customIconColor || theme.accent };
  }

  switch (type) {
    case 'success':
      return { name: 'check-circle', color: '#10B981' };
    case 'error':
      return { name: 'error-outline', color: '#EF4444' };
    case 'warning':
      return { name: 'warning-amber', color: '#F59E0B' };
    case 'premium':
      return { name: 'star', color: theme.accent };
    case 'info':
    default:
      return { name: 'info-outline', color: theme.accent };
  }
};

const CustomModal = ({
  visible = false,
  title = '',
  message = '',
  type = 'info',
  icon,
  iconColor,
  primaryLabel = 'OK',
  secondaryLabel = null,
  onConfirm,
  onCancel,
  destructive = false,
}) => {
  const { theme } = useTheme();
  const iconConfig = getIconConfig(type, icon, iconColor, theme);

  const handleConfirm = () => {
    if (typeof onConfirm === 'function') {
      onConfirm();
    } else if (typeof onCancel === 'function') {
      onCancel();
    }
  };

  const handleCancel = () => {
    if (typeof onCancel === 'function') {
      onCancel();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay || 'rgba(0, 0, 0, 0.7)' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {iconConfig?.name && (
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
              ]}
            >
              <Icon name={iconConfig.name} size={30} color={iconConfig.color} />
            </View>
          )}

          {Boolean(title) && (
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {title}
            </Text>
          )}

          {Boolean(message) && (
            <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
              {message}
            </Text>
          )}

          <View style={styles.modalActions}>
            {Boolean(secondaryLabel) && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.modalButton,
                  styles.modalCancelButton,
                  { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                ]}
                onPress={handleCancel}
              >
                <Text
                  style={[styles.modalCancelButtonText, { color: theme.textSecondary }]}
                >
                  {secondaryLabel}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.modalButton,
                styles.modalPrimaryButton,
                !secondaryLabel && styles.fullWidthButton,
                destructive
                  ? styles.modalDeleteButton
                  : { backgroundColor: theme.accent },
              ]}
              onPress={handleConfirm}
            >
              <Text style={styles.modalPrimaryButtonText}>{primaryLabel}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#141414',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#292929',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#292929',
  },
  modalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  modalMessage: {
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalActions: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: {
    flex: 1,
    width: '100%',
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalCancelButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  modalPrimaryButton: {
    backgroundColor: '#F63B05',
  },
  modalDeleteButton: {
    backgroundColor: '#EF4444',
  },
  modalPrimaryButtonText: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default CustomModal;
