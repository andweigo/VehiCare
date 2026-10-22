import { useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useTheme } from '../theme/ThemeContext';

const themeOptions = [
  {
    id: 'dark',
    label: 'Dark mode',
    description: 'Use the dark VehiCare appearance',
    icon: 'dark-mode',
  },
  {
    id: 'light',
    label: 'Light mode',
    description: 'Use the light VehiCare appearance',
    icon: 'light-mode',
  },
];

const AppearanceSettingCard = ({
  icon = 'palette',
  title = 'Appearance',
  subtitle = 'Customize the app theme',
}) => {
  const { theme, themeName, setThemeName } = useTheme();
  const [visible, setVisible] = useState(false);

  const handleSelectTheme = async selectedTheme => {
    if (selectedTheme === themeName) {
      setVisible(false);
      return;
    }

    await setThemeName(selectedTheme);
    setVisible(false);
  };

  return (
    <>
      {/* SETTING ITEM */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => setVisible(true)}
        style={[
          styles.settingItem,
          {
            backgroundColor: theme.surface,
          },
        ]}
      >
        <View
          style={[
            styles.settingIcon,
            {
              backgroundColor: theme.accentSoft || theme.surfaceAlt,
            },
          ]}
        >
          <Icon
            name={icon}
            size={19}
            color={theme.accent}
          />
        </View>

        <View style={styles.settingContent}>
          <Text
            style={[
              styles.settingTitle,
              {
                color: theme.text,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.settingSubtitle,
              {
                color: theme.textSecondary,
              },
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>

        <View style={styles.chevronContainer}>
          <Icon
            name="chevron-right"
            size={20}
            color={theme.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* THEME MODAL */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {/* BACKDROP */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          />

          {/* MODAL CARD */}
          <View
            style={[
              styles.modalCard,
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
                <Icon name="palette" size={14} color={theme.accent || '#F63B05'} />
                <Text style={[styles.badgeText, { color: theme.accent || '#F63B05' }]}>
                  APPEARANCE
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
                style={[
                  styles.closeCircleBtn,
                  { backgroundColor: theme.surfaceAlt },
                ]}
                accessibilityLabel="Close appearance dialog"
              >
                <Icon name="close" size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Title & Subtitle */}
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Theme preference
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Choose how VehiCare should look on your device.
            </Text>

            <View
              style={[
                styles.divider,
                { backgroundColor: theme.border },
              ]}
            />

            {/* THEME OPTIONS */}
            <View style={styles.optionsContainer}>
              {themeOptions.map(option => {
                const selected = themeName === option.id;

                return (
                  <TouchableOpacity
                    key={option.id}
                    activeOpacity={0.8}
                    onPress={() => handleSelectTheme(option.id)}
                    style={[
                      styles.themeOption,
                      {
                        borderColor: selected ? theme.accent : theme.border,
                        backgroundColor: selected
                          ? theme.accentSoft || theme.surfaceAlt
                          : theme.surfaceAlt,
                      },
                    ]}
                  >
                    {/* OPTION ICON */}
                    <View
                      style={[
                        styles.themeOptionIcon,
                        {
                          backgroundColor: selected ? theme.accent : theme.surface,
                        },
                      ]}
                    >
                      <Icon
                        name={option.icon}
                        size={18}
                        color={selected ? '#FFFFFF' : theme.textSecondary}
                      />
                    </View>

                    {/* OPTION TEXT */}
                    <View style={styles.themeOptionText}>
                      <Text
                        style={[
                          styles.themeOptionLabel,
                          {
                            color: theme.text,
                            fontFamily: selected ? 'Outfit-Bold' : 'Inter-SemiBold',
                          },
                        ]}
                      >
                        {option.label}
                      </Text>

                      <Text
                        style={[
                          styles.themeOptionDescription,
                          {
                            color: theme.textSecondary,
                          },
                        ]}
                      >
                        {option.description}
                      </Text>
                    </View>

                    {/* SELECTED INDICATOR */}
                    <View
                      style={[
                        styles.radioOuter,
                        {
                          borderColor: selected ? theme.accent : theme.border,
                        },
                      ]}
                    >
                      {selected && (
                        <View
                          style={[
                            styles.radioInner,
                            {
                              backgroundColor: theme.accent,
                            },
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  /* SETTING ITEM */

  settingItem: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  settingIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  settingContent: {
    flex: 1,
    minWidth: 0,
  },

  settingTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },

  settingSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginTop: 3,
  },

  settingMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
  },

  /* MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  modalCard: {
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

  /* HEADER ROW */
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

  modalSubtitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 10,
  },

  divider: {
    height: 1,
    marginBottom: 14,
  },

  /* OPTIONS */

  optionsContainer: {
    gap: 10,
  },

  themeOption: {
    width: '100%',
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  themeOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  themeOptionText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },

  themeOptionLabel: {
    fontSize: 13.5,
  },

  themeOptionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },

  /* RADIO */

  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default AppearanceSettingCard;