import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

const LANGUAGES = [
  {
    code: 'en',
    name: 'English (US)',
    nativeName: 'English',
    flag: '🇬🇧',
    description: 'Standard English interface & diagnostic responses',
  },
  {
    code: 'fil',
    name: 'Filipino (Tagalog)',
    nativeName: 'Wikang Filipino',
    flag: '🇵🇭',
    description: 'Filipino interface & pagsusuri sa wikang Tagalog',
  },
  {
    code: 'taglish',
    name: 'Taglish',
    nativeName: 'Tagalog-English Hybrid',
    flag: '🇵🇭',
    description: 'Conversational Tagalog-English mix for everyday comfort',
  },
];

const LanguageSelectorModal = ({ visible, onClose, onSelectSuccess }) => {
  const { theme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const handleSelect = async (code) => {
    await setLanguage(code);
    if (onSelectSuccess) {
      onSelectSuccess(code);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Header Row: Badge Pill + Circular X Close Button */}
          <View style={styles.headerRow}>
            <View
              style={[
                styles.badgePill,
                { backgroundColor: theme.accentSoft || 'rgba(246, 59, 5, 0.15)' },
              ]}
            >
              <Icon name="language" size={14} color={theme.accent || '#F63B05'} />
              <Text style={[styles.badgeText, { color: theme.accent || '#F63B05' }]}>
                LANGUAGE
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              style={[styles.closeCircleBtn, { backgroundColor: theme.surfaceAlt }]}
              accessibilityLabel="Close language selector"
            >
              <Icon name="close" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Title & Subtitle */}
          <Text style={[styles.title, { color: theme.text }]}>
            {t('selectLanguage', 'Select Language')}
          </Text>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Choose your preferred language for VehiCare interface and AI diagnostics.
          </Text>

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.border },
            ]}
          />

          {/* Options */}
          <View style={styles.optionsList}>
            {LANGUAGES.map((item) => {
              const isSelected = language === item.code;

              return (
                <TouchableOpacity
                  key={item.code}
                  activeOpacity={0.72}
                  onPress={() => handleSelect(item.code)}
                  style={[
                    styles.langItem,
                    {
                      backgroundColor: isSelected
                        ? theme.accentSoft || 'rgba(246, 59, 5, 0.12)'
                        : theme.surfaceAlt,
                      borderColor: isSelected ? theme.accent : theme.border,
                    },
                  ]}
                >
                  <Text style={styles.flagText}>{item.flag}</Text>

                  <View style={styles.langContent}>
                    <View style={styles.langTitleRow}>
                      <Text style={[styles.langName, { color: theme.text }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.langNative, { color: theme.textSecondary }]}>
                        ({item.nativeName})
                      </Text>
                    </View>
                    <Text style={[styles.langDesc, { color: theme.textSecondary }]}>
                      {item.description}
                    </Text>
                  </View>

                  {isSelected && (
                    <View
                      style={[
                        styles.checkCircle,
                        { backgroundColor: theme.accent },
                      ]}
                    >
                      <Icon name="check" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
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
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },
  optionsList: {
    gap: 10,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  flagText: {
    fontSize: 22,
    marginRight: 12,
  },
  langContent: {
    flex: 1,
    paddingRight: 8,
  },
  langTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  langName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
  },
  langNative: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  langDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    marginTop: 2,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LanguageSelectorModal;
