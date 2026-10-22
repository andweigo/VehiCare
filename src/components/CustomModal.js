import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const getTypeConfig = (type, customIcon, customIconColor, theme) => {
  const isDark = theme?.name === 'dark';
  const accent = theme.accent || '#F63B05';

  switch (type) {
    case 'success':
      return {
        label: 'SUCCESS',
        name: customIcon || 'check-circle',
        color: '#10B981',
        bg: isDark ? 'rgba(16, 185, 129, 0.15)' : '#DCFCE7',
      };
    case 'error':
      return {
        label: 'NOTICE',
        name: customIcon || 'error-outline',
        color: '#EF4444',
        bg: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
      };
    case 'warning':
      return {
        label: 'WARNING',
        name: customIcon || 'warning-amber',
        color: '#F59E0B',
        bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
      };
    case 'premium':
      return {
        label: 'PREMIUM',
        name: customIcon || 'star',
        color: '#F59E0B',
        bg: isDark ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
      };
    case 'info':
    default:
      return {
        label: 'NOTICE',
        name: customIcon || 'info-outline',
        color: customIconColor || accent,
        bg: isDark ? 'rgba(246, 59, 5, 0.15)' : '#FFF2EE',
      };
  }
};

const CustomModal = ({
  visible = false,
  title = '',
  message = '',
  type = 'info',
  badgeLabel,
  icon,
  iconColor,
  date,
  primaryLabel = 'OK',
  secondaryLabel = null,
  onConfirm,
  onCancel,
  destructive = false,
  children,
}) => {
  const { theme } = useTheme();
  const isDark = theme?.name === 'dark';
  const typeConfig = getTypeConfig(type, icon, iconColor, theme);

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

  const resolvedTitle = title || 'Notice';
  const resolvedBadgeLabel = badgeLabel || typeConfig.label;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleCancel}
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
                  { backgroundColor: typeConfig.bg },
                ]}
              >
                <Icon name={typeConfig.name} size={14} color={typeConfig.color} />
                <Text style={[styles.badgeText, { color: typeConfig.color }]}>
                  {resolvedBadgeLabel}
                </Text>
              </View>

              <Pressable
                onPress={handleCancel}
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
            <Text
              style={[styles.modalTitle, { color: theme.text }]}
              numberOfLines={2}
            >
              {resolvedTitle}
            </Text>

            {/* Optional Date / Subtitle */}
            {date ? (
              <Text style={[styles.modalDate, { color: theme.textSecondary }]}>
                {date}
              </Text>
            ) : null}

            <View
              style={[
                styles.divider,
                { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
              ]}
            />

            {/* Body */}
            {children ? (
              <View style={styles.childrenWrap}>{children}</View>
            ) : Boolean(message) ? (
              <ScrollView
                style={styles.bodyScroll}
                contentContainerStyle={styles.bodyScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <Text
                  style={[
                    styles.modalBodyText,
                    { color: isDark ? '#D4D4D8' : '#334155' },
                  ]}
                >
                  {message}
                </Text>
              </ScrollView>
            ) : null}

            {/* Actions */}
            <View style={styles.actionsRow}>
              {Boolean(secondaryLabel) && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.actionBtn,
                    styles.secondaryBtn,
                    {
                      backgroundColor: theme.surfaceAlt || (isDark ? '#202024' : '#F1F5F9'),
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={handleCancel}
                >
                  <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>
                    {secondaryLabel}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.actionBtn,
                  styles.primaryBtn,
                  destructive
                    ? { backgroundColor: '#EF4444' }
                    : { backgroundColor: theme.accent || '#F63B05' },
                ]}
                onPress={handleConfirm}
              >
                <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 16,
    gap: 5,
  },
  badgeText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10.5,
    letterSpacing: 0.6,
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
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 4,
  },
  modalDate: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  childrenWrap: {
    width: '100%',
  },
  bodyScroll: {
    maxHeight: 260,
  },
  bodyScrollContent: {
    paddingBottom: 8,
  },
  modalBodyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 21,
  },
  actionsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
  },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  primaryBtn: {},
  primaryBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
    color: '#FFFFFF',
  },
});

export default CustomModal;
