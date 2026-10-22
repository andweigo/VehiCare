import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const ConfirmActionModal = ({
  visible,
  title,
  message,
  primaryLabel = 'Confirm',
  secondaryLabel = 'Cancel',
  onConfirm,
  onCancel,
  destructive = false,
  badgeLabel,
  icon,
}) => {
  const { theme } = useTheme();
  const isDark = theme?.name === 'dark';

  const defaultBadgeLabel = destructive ? 'WARNING' : 'CONFIRMATION';
  const resolvedBadgeLabel = badgeLabel || defaultBadgeLabel;
  const resolvedIcon = icon || (destructive ? 'warning-amber' : 'help-outline');
  const badgeColor = destructive ? '#EF4444' : (theme.accent || '#F63B05');
  const badgeBg = destructive
    ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2')
    : (isDark ? 'rgba(246, 59, 5, 0.15)' : '#FFF2EE');

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancel}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardWrap}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: isDark ? '#141416' : '#FFFFFF',
                borderColor: isDark ? '#262629' : '#E2E8F0',
              },
            ]}
          >
            {/* Header Row: Badge Pill + Circular X Close Button */}
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.badgePill,
                  { backgroundColor: badgeBg },
                ]}
              >
                <Icon name={resolvedIcon} size={14} color={badgeColor} />
                <Text style={[styles.badgeText, { color: badgeColor }]}>
                  {resolvedBadgeLabel}
                </Text>
              </View>

              <Pressable
                onPress={onCancel}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={[
                  styles.closeCircleBtn,
                  { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
                ]}
                accessibilityLabel="Close dialog"
              >
                <Icon name="close" size={16} color={isDark ? '#A1A1AA' : '#64748B'} />
              </Pressable>
            </View>

            {/* Title */}
            {Boolean(title) && (
              <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={2}>
                {title}
              </Text>
            )}

            {/* Hairline Divider */}
            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
              ]}
            />

            {/* Message Body */}
            {Boolean(message) && (
              <Text style={[styles.modalMessage, { color: theme.textSecondary }]}>
                {message}
              </Text>
            )}

            {/* Action Buttons Row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[
                  styles.actionButton,
                  styles.cancelButton,
                  {
                    backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                    borderColor: isDark ? '#2B2B30' : '#E2E8F0',
                  },
                ]}
                onPress={onCancel}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                  {secondaryLabel}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.actionButton,
                  styles.confirmButton,
                  destructive
                    ? { backgroundColor: '#EF4444' }
                    : { backgroundColor: theme.accent || '#F63B05' },
                ]}
                onPress={onConfirm}
              >
                <Text style={styles.confirmButtonText}>{primaryLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 999,
    gap: 6,
  },
  badgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  closeCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    lineHeight: 23,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  modalMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  confirmButton: {},
  confirmButtonText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});

export default ConfirmActionModal;
