
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import vehicleApi from '../api/vehicleApi';
import CustomToast from '../components/CustomToast';
import { useAuth } from '../context/AuthContext';
import { getDisplayValue } from '../utils/vehicleDisplay';

const ORANGE = '#F63B05';
const BACKGROUND = '#0A0A0A';
const CARD = '#151515';
const CARD_LIGHT = '#1C1C1C';
const BORDER = '#292929';
const TEXT = '#FFFFFF';
const MUTED = '#858585';
const RED = '#F87171';

const FIELDS = [
  {
    key: 'vehicle_brand_id',
    label: 'Brand',
    icon: 'business',
  },
  {
    key: 'vehicle_model_id',
    label: 'Model',
    icon: 'directions-car',
  },
  {
    key: 'vehicle_year_id',
    label: 'Year',
    icon: 'event',
  },
  {
    key: 'model_number',
    label: 'Model Number',
    icon: 'tag',
  },
];

const ISSUE_OPTIONS = [
  {
    key: 'entered_by_mistake',
    label: 'I entered it incorrectly',
  },
  {
    key: 'selected_wrong_option',
    label: 'I selected the wrong option',
  },
  {
    key: 'missing_details',
    label: 'Some information was missing',
  },
  {
    key: 'other',
    label: 'Other',
  },
];

const VehicleCorrectionRequestScreen = ({
  navigation,
  route,
}) => {
  const vehicle = route?.params?.vehicle;

  const [selectedFields, setSelectedFields] = useState([]);
  const [requestedValues, setRequestedValues] = useState({});
  const [selectedReasonOption, setSelectedReasonOption] =
    useState('');
  const [otherReasonDetail, setOtherReasonDetail] =
    useState('');

  const [loading, setLoading] = useState(true);
  const [fetchingActiveRequest, setFetchingActiveRequest] = useState(true);
  const [activeRequest, setActiveRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [issueMessage, setIssueMessage] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const { isAuthenticated } = useAuth();

  const currentValues = useMemo(() => {
    if (!vehicle) {
      return {};
    }

    return {
      vehicle_brand_id: getDisplayValue(
        vehicle?.vehicle_brand ??
          vehicle?.vehicleBrand ??
          vehicle?.custom_brand,
        'Not available',
      ),

      vehicle_model_id: getDisplayValue(
        vehicle?.vehicle_model ??
          vehicle?.vehicleModel ??
          vehicle?.custom_model,
        'Not available',
      ),

      vehicle_year_id: getDisplayValue(
        vehicle?.vehicle_year ??
          vehicle?.vehicleYear ??
          vehicle?.custom_year,
        'Not available',
      ),

      model_number: getDisplayValue(
        vehicle?.model_number,
        'Not available',
      ),
    };
  }, [vehicle]);

  useEffect(() => {
    if (!vehicle) {
      navigation.goBack();
      return;
    }

    if (vehicle.isArchived) {
      Alert.alert(
        'Archived Vehicle',
        'Restore this vehicle before submitting a correction request.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
      return;
    }

    const initialRequestedValues = {};

    FIELDS.forEach(field => {
      initialRequestedValues[field.key] =
        currentValues[field.key] === 'Not available'
          ? ''
          : currentValues[field.key] ?? '';
    });

    setRequestedValues(initialRequestedValues);
    setLoading(false);
  }, [navigation, vehicle, currentValues]);

  useEffect(() => {
    const loadActiveRequest = async () => {
      if (!vehicle) {
        setFetchingActiveRequest(false);
        return;
      }

      try {
        const request = await vehicleApi.getVehicleCorrectionRequestForVehicle(vehicle.id);
        setActiveRequest(request && request.id ? request : null);
      } catch (error) {
        // Ignore 404 / no active request states
        if (!error?.response?.status || error.response.status !== 404) {
          console.error('Error checking active correction request:', error);
        }
      } finally {
        setFetchingActiveRequest(false);
      }
    };

    loadActiveRequest();
  }, [vehicle]);

  const handleSelectField = key => {
    if (submitting) {
      return;
    }

    setIssueMessage(null);

    setSelectedFields(prev => {
      if (prev.includes(key)) {
        return prev.filter(item => item !== key);
      }

      return [...prev, key];
    });
  };

  const handleFieldValueChange = (key, value) => {
    setIssueMessage(null);

    setRequestedValues(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleReasonOptionSelect = key => {
    if (submitting) {
      return;
    }

    setIssueMessage(null);
    setSelectedReasonOption(key);

    if (key !== 'other') {
      setOtherReasonDetail('');
    }
  };

  const validateRequest = () => {
    if (!selectedFields.length) {
      return 'Please select at least one vehicle detail that needs correction.';
    }

    for (const field of selectedFields) {
      const requestedValue = String(
        requestedValues[field] ?? '',
      ).trim();

      if (!requestedValue) {
        return `Please enter the correct ${field === 'vehicle_brand_id'
          ? 'brand'
          : field === 'vehicle_model_id'
          ? 'model'
          : field === 'vehicle_year_id'
          ? 'year'
          : 'model number'
        }.`;
      }

      const currentValue = String(
        currentValues[field] ?? '',
      ).trim();

      if (
        currentValue !== 'Not available' &&
        requestedValue.toLowerCase() ===
          currentValue.toLowerCase()
      ) {
        return `The corrected ${field === 'vehicle_brand_id'
          ? 'brand'
          : field === 'vehicle_model_id'
          ? 'model'
          : field === 'vehicle_year_id'
          ? 'year'
          : 'model number'
        } must be different from the current value.`;
      }
    }

    if (!selectedReasonOption) {
      return 'Please select why this information needs correction.';
    }

    if (
      selectedReasonOption === 'other' &&
      !otherReasonDetail.trim()
    ) {
      return 'Please describe the issue when selecting Other.';
    }

    return null;
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3500);
  };

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      showToast('Please log in to submit a vehicle correction request.');
      return;
    }

    if (fetchingActiveRequest) {
      showToast('Checking for an existing request. Please wait.');
      return;
    }

    if (activeRequest) {
      showToast('You already have an active correction request for this vehicle.');
      return;
    }

    const validationError = validateRequest();

    if (validationError) {
      showToast(validationError);
      return;
    }

    setSubmitting(true);

    const requestedFields = [];
    const currentValuesPayload = {};
    const requestedValuesPayload = {};

    selectedFields.forEach(key => {
      requestedFields.push(key);

      currentValuesPayload[key] =
        currentValues[key] ?? null;

      requestedValuesPayload[key] =
        requestedValues[key]?.trim() ?? null;
    });

    const reasonText =
      selectedReasonOption === 'other'
        ? otherReasonDetail.trim()
        : ISSUE_OPTIONS.find(
            option =>
              option.key === selectedReasonOption,
          )?.label || '';

    try {
      await vehicleApi.submitVehicleCorrectionRequest({
        vehicle_id: vehicle.id,
        requested_fields: requestedFields,
        current_values: currentValuesPayload,
        requested_values: requestedValuesPayload,
        reason: reasonText,
      });

      showToast('Correction request submitted successfully.');

      setTimeout(() => {
        navigation.goBack();
      }, 2200);
    } catch (error) {
      if (error?.response?.status !== 422) {
        console.error(
          'Vehicle correction request error:',
          error,
        );
      }

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to submit your correction request. Please try again.';

      showToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={ORANGE}
          />

          <Text style={styles.loadingText}>
            Loading vehicle information...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={BACKGROUND}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.8}
            disabled={submitting}
          >
            <Icon
              name="arrow-back"
              size={22}
              color={TEXT}
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.eyebrow}>
              VEHICLE PROFILE
            </Text>

            <Text style={styles.title}>
              Request Correction
            </Text>

            <Text style={styles.subtitle}>
              Tell us which information is incorrect.
              Your request will be reviewed by a VehiCare
              administrator.
            </Text>
          </View>
        </View>

        {/* Protected Notice */}
        <View style={styles.protectedCard}>
          <View style={styles.protectedIcon}>
            <Icon
              name="lock-outline"
              size={20}
              color={ORANGE}
            />
          </View>

          <View style={styles.protectedContent}>
            <Text style={styles.protectedTitle}>
              Profile Protected
            </Text>

            <Text style={styles.protectedText}>
              Vehicle information cannot be directly
              edited. Submit a correction request if
              something was entered incorrectly.
            </Text>
          </View>
        </View>

        {/* Step 1 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>
                1
              </Text>
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                What needs correction?
              </Text>

              <Text style={styles.sectionSubtitle}>
                Select one or more incorrect fields.
              </Text>
            </View>
          </View>

          <View style={styles.fieldList}>
            {FIELDS.map(field => {
              const selected =
                selectedFields.includes(field.key);

              const currentValue = getDisplayValue(
                currentValues[field.key],
                'Not available',
              );

              return (
                <TouchableOpacity
                  key={field.key}
                  style={[
                    styles.fieldItem,
                    selected &&
                      styles.fieldItemSelected,
                  ]}
                  onPress={() =>
                    handleSelectField(field.key)
                  }
                  activeOpacity={0.8}
                  disabled={submitting}
                >
                  <View style={styles.fieldTopRow}>
                    <View
                      style={[
                        styles.fieldIcon,
                        selected &&
                          styles.fieldIconSelected,
                      ]}
                    >
                      <Icon
                        name={field.icon}
                        size={19}
                        color={
                          selected
                            ? ORANGE
                            : MUTED
                        }
                      />
                    </View>

                    <View
                      style={styles.fieldValueContainer}
                    >
                      <Text
                        style={styles.fieldLabel}
                      >
                        {field.label}
                      </Text>

                      <Text
                        style={styles.fieldValue}
                        numberOfLines={1}
                      >
                        {currentValue}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.checkbox,
                        selected &&
                          styles.checkboxSelected,
                      ]}
                    >
                      {selected && (
                        <Icon
                          name="check"
                          size={15}
                          color="#FFFFFF"
                        />
                      )}
                    </View>
                  </View>

                  {selected && (
                    <View
                      style={styles.correctValueContainer}
                    >
                      <Text
                        style={styles.correctValueLabel}
                      >
                        Correct {field.label}
                      </Text>

                      <TextInput
                        style={
                          styles.requestedValueInput
                        }
                        placeholder={`Enter correct ${field.label.toLowerCase()}`}
                        placeholderTextColor="#666666"
                        value={String(
                          requestedValues[
                            field.key
                          ] ?? '',
                        )}
                        onChangeText={value =>
                          handleFieldValueChange(
                            field.key,
                            value,
                          )
                        }
                        editable={!submitting}
                        autoCapitalize="words"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 2 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNumber}>
                2
              </Text>
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Why does it need correction?
              </Text>

              <Text style={styles.sectionSubtitle}>
                Help the administrator understand what
                happened.
              </Text>
            </View>
          </View>

          <View style={styles.issueOptionsContainer}>
            {ISSUE_OPTIONS.map(option => {
              const selected =
                selectedReasonOption ===
                option.key;

              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.issueOption,
                    selected &&
                      styles.issueOptionSelected,
                  ]}
                  onPress={() =>
                    handleReasonOptionSelect(
                      option.key,
                    )
                  }
                  activeOpacity={0.8}
                  disabled={submitting}
                >
                  {selected && (
                    <Icon
                      name="check"
                      size={15}
                      color="#FFFFFF"
                    />
                  )}

                  <Text
                    style={[
                      styles.issueOptionText,
                      selected &&
                        styles.issueOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {selectedReasonOption === 'other' && (
            <TextInput
              multiline
              placeholder="Describe the issue or mistake..."
              placeholderTextColor="#666666"
              style={styles.textArea}
              value={otherReasonDetail}
              onChangeText={setOtherReasonDetail}
              editable={!submitting}
              textAlignVertical="top"
            />
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.button,
            submitting &&
              styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <>
              <ActivityIndicator
                color="#FFFFFF"
                size="small"
              />

              <Text style={styles.buttonText}>
                Sending Request...
              </Text>
            </>
          ) : (
            <>
              <Icon
                name="send"
                size={19}
                color="#FFFFFF"
              />

              <Text style={styles.buttonText}>
                Submit Correction Request
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Icon
            name="verified-user"
            size={16}
            color={MUTED}
          />

          <Text style={styles.footerText}>
            Your vehicle profile will remain protected
            until your request is reviewed.
          </Text>
        </View>
      </ScrollView>
      <CustomToast
        visible={toastVisible}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 45,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BACKGROUND,
  },

  loadingText: {
    color: MUTED,
    fontSize: 13,
    marginTop: 12,
  },

  header: {
    marginBottom: 22,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  headerTextContainer: {
    paddingHorizontal: 2,
  },

  eyebrow: {
    color: ORANGE,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 7,
  },

  title: {
    color: TEXT,
    fontSize: 29,
    fontWeight: '800',
    letterSpacing: -0.7,
  },

  subtitle: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },

  protectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#17100D',
    borderWidth: 1,
    borderColor: '#422519',
    borderRadius: 18,
    padding: 14,
    marginBottom: 28,
  },

  protectedIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(246, 59, 5, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  protectedContent: {
    flex: 1,
  },

  protectedTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },

  protectedText: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
  },

  section: {
    marginBottom: 27,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },

  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: 'rgba(246, 59, 5, 0.13)',
    borderWidth: 1,
    borderColor: 'rgba(246, 59, 5, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  stepNumber: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: '800',
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '750',
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 10,
    marginTop: 3,
  },

  fieldList: {
    gap: 10,
  },

  fieldItem: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    padding: 14,
  },

  fieldItemSelected: {
    backgroundColor: '#1A0D06',
    borderColor: ORANGE,
  },

  fieldTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  fieldIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: CARD_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  fieldIconSelected: {
    backgroundColor: 'rgba(246, 59, 5, 0.12)',
  },

  fieldValueContainer: {
    flex: 1,
    minWidth: 0,
  },

  fieldLabel: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
  },

  fieldValue: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },

  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#444444',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  checkboxSelected: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },

  correctValueContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#292929',
  },

  correctValueLabel: {
    color: '#D0D0D0',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 7,
  },

  requestedValueInput: {
    minHeight: 45,
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: TEXT,
    fontSize: 13,
  },

  issueOptionsContainer: {
    gap: 9,
  },

  issueOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    paddingHorizontal: 14,
  },

  issueOptionSelected: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },

  issueOptionText: {
    color: '#D0D0D0',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },

  issueOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  textArea: {
    minHeight: 115,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    color: TEXT,
    fontSize: 13,
    padding: 15,
    marginTop: 10,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#24100F',
    borderWidth: 1,
    borderColor: '#54201D',
    borderRadius: 14,
    padding: 12,
    marginBottom: 15,
  },

  issueText: {
    flex: 1,
    color: RED,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 9,
  },

  button: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ORANGE,
    borderRadius: 16,
    paddingHorizontal: 18,
  },

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 9,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginTop: 17,
    paddingHorizontal: 10,
  },

  footerText: {
    flex: 1,
    color: '#666666',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    marginLeft: 7,
  },
});

export default VehicleCorrectionRequestScreen;
