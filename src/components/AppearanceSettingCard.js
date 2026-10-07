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
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View
          style={[
            styles.modalOverlay,
            {
              backgroundColor: theme.modalOverlay,
            },
          ]}
        >
          {/* BACKDROP */}
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          />

          {/* MODAL */}
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {/* HANDLE */}
            <View
              style={[
                styles.modalHandle,
                {
                  backgroundColor: theme.border,
                },
              ]}
            />

            {/* HEADER */}
            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalIcon,
                  {
                    backgroundColor: theme.surfaceAlt,
                  },
                ]}
              >
                <Icon
                  name="palette"
                  size={21}
                  color={theme.accent}
                />
              </View>

              <View style={styles.modalHeaderText}>
                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  Theme preference
                </Text>

                <Text
                  style={[
                    styles.modalSubtitle,
                    {
                      color: theme.textSecondary,
                    },
                  ]}
                >
                  Choose how VehiCare should look.
                </Text>
              </View>
            </View>

            {/* THEME OPTIONS */}
            <View style={styles.optionsContainer}>
              {themeOptions.map(option => {
                const selected = themeName === option.id;

                return (
                  <TouchableOpacity
                    key={option.id}
                    activeOpacity={0.8}
                    onPress={() =>
                      handleSelectTheme(option.id)
                    }
                    style={[
                      styles.themeOption,
                      {
                        borderColor: selected
                          ? theme.accent
                          : theme.border,
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
                          backgroundColor: selected
                            ? theme.accent
                            : theme.surface,
                        },
                      ]}
                    >
                      <Icon
                        name={option.icon}
                        size={20}
                        color={
                          selected
                            ? '#FFFFFF'
                            : theme.textSecondary
                        }
                      />
                    </View>

                    {/* OPTION TEXT */}
                    <View style={styles.themeOptionText}>
                      <Text
                        style={[
                          styles.themeOptionLabel,
                          {
                            color: theme.text,
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
                          borderColor: selected
                            ? theme.accent
                            : theme.border,
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

            {/* CLOSE BUTTON */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setVisible(false)}
              style={[
                styles.cancelButton,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.cancelText,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Done
              </Text>
            </TouchableOpacity>
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
    justifyContent: 'flex-end',
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  modalCard: {
    width: '100%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },

  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 20,
  },

  /* HEADER */

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  modalIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  modalHeaderText: {
    flex: 1,
  },

  modalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    letterSpacing: -0.3,
  },

  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  /* OPTIONS */

  optionsContainer: {
    gap: 10,
  },

  themeOption: {
    width: '100%',
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 17,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  themeOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
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
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },

  themeOptionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 4,
  },

  /* RADIO */

  radioOuter: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
  },

  /* DONE BUTTON */

  cancelButton: {
    width: '100%',
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },

  cancelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
});

export default AppearanceSettingCard;