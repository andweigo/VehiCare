import { useEffect, useState } from 'react';

import {
  Keyboard,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useTheme } from '../theme/ThemeContext';

const CustomVehicleModal = ({
  visible,
  brand,
  model,
  year,
  error,
  onBrandChange,
  onModelChange,
  onYearChange,
  onSave,
  onCancel,
}) => {
  const { theme } = useTheme();

  const [keyboardHeight, setKeyboardHeight] =
    useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios'
        ? 'keyboardWillShow'
        : 'keyboardDidShow';

    const hideEvent =
      Platform.OS === 'ios'
        ? 'keyboardWillHide'
        : 'keyboardDidHide';

    const keyboardShowListener =
      Keyboard.addListener(
        showEvent,
        event => {
          setKeyboardHeight(
            event.endCoordinates?.height || 0,
          );
        },
      );

    const keyboardHideListener =
      Keyboard.addListener(
        hideEvent,
        () => {
          setKeyboardHeight(0);
        },
      );

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  /*
   * When the keyboard is open, the modal
   * moves completely above it.
   *
   * When the keyboard closes, it returns
   * to the bottom of the screen.
   */

  const bottomOffset =
    keyboardHeight > 0
      ? keyboardHeight
      : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      onRequestClose={onCancel}
    >
      <View
        style={[
          styles.overlay,
          {
            backgroundColor:
              theme.modalOverlay,
          },
        ]}
      >
        {/* BACKDROP */}

        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onCancel}
        />

        {/* BOTTOM SHEET */}

        <View
          style={[
            styles.sheetWrapper,
            {
              bottom: bottomOffset,
            },
          ]}
        >
          <SafeAreaView
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  theme.background,
                borderColor:
                  theme.border,
              },
            ]}
          >
            {/* TITLE */}

            <Text
              style={[
                styles.title,
                {
                  color: theme.text,
                },
              ]}
            >
              Custom Vehicle
            </Text>

            {/* BRAND */}

            <View style={styles.field}>
              <Text
                style={[
                  styles.label,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Brand
              </Text>

              <TextInput
                value={brand}
                onChangeText={onBrandChange}
                style={[
                  styles.input,
                  {
                    backgroundColor:
                      theme.surface,
                    borderColor:
                      theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Enter brand"
                placeholderTextColor={
                  theme.placeholder
                }
                returnKeyType="next"
              />
            </View>

            {/* MODEL */}

            <View style={styles.field}>
              <Text
                style={[
                  styles.label,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Model
              </Text>

              <TextInput
                value={model}
                onChangeText={onModelChange}
                style={[
                  styles.input,
                  {
                    backgroundColor:
                      theme.surface,
                    borderColor:
                      theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Enter model"
                placeholderTextColor={
                  theme.placeholder
                }
                returnKeyType="next"
              />
            </View>

            {/* YEAR */}

            <View style={styles.field}>
              <Text
                style={[
                  styles.label,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Year
              </Text>

              <TextInput
                value={year}
                onChangeText={onYearChange}
                style={[
                  styles.input,
                  {
                    backgroundColor:
                      theme.surface,
                    borderColor:
                      theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="Enter year"
                placeholderTextColor={
                  theme.placeholder
                }
                keyboardType="numeric"
                maxLength={4}
                returnKeyType="done"
              />
            </View>

            {/* ERROR */}

            {error ? (
              <Text style={styles.errorText}>
                {error}
              </Text>
            ) : null}

            {/* BUTTONS */}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  {
                    backgroundColor:
                      theme.surfaceAlt,
                    borderColor:
                      theme.border,
                  },
                ]}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.cancelText,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor:
                      theme.accent,
                  },
                ]}
                onPress={onSave}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  /*
   * The sheet is positioned at the bottom.
   *
   * When the keyboard opens, the `bottom`
   * value moves the ENTIRE sheet above it.
   */

  sheetWrapper: {
    position: 'absolute',

    left: 0,
    right: 0,
    bottom: 0,

    width: '100%',
  },

  modalCard: {
    width: '100%',

    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,

    borderTopWidth: 1,

    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',

    marginBottom: 20,
  },

  field: {
    marginBottom: 16,
  },

  label: {
    fontSize: 12,

    marginBottom: 8,

    letterSpacing: 0.4,
  },

  input: {
    width: '100%',

    height: 50,

    borderRadius: 16,

    paddingHorizontal: 16,

    fontSize: 15,

    borderWidth: 1,
  },

  errorText: {
    color: '#FF6B6B',

    fontSize: 13,

    marginBottom: 14,
  },

  actions: {
    flexDirection: 'row',

    gap: 12,

    marginTop: 4,
  },

  button: {
    flex: 1,

    height: 50,

    borderRadius: 16,

    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelButton: {
    borderWidth: 1,
  },

  buttonText: {
    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: '700',
  },

  cancelText: {
    fontSize: 15,

    fontWeight: '700',
  },
});

export default CustomVehicleModal;