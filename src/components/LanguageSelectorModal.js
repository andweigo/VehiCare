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
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Icon name="language" size={22} color={theme.accent} />
              <Text style={[styles.title, { color: theme.text }]}>
                {t('selectLanguage', 'Select Language')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.surfaceAlt }]}
            >
              <Icon name="close" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Choose your preferred language for VehiCare interface and AI diagnostics.
          </Text>

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
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    marginBottom: 16,
    lineHeight: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    gap: 10,
  },
  langItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  flagText: {
    fontSize: 24,
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
    fontFamily: 'Inter-Bold',
    fontSize: 13,
  },
  langNative: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  langDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    marginTop: 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default LanguageSelectorModal;
