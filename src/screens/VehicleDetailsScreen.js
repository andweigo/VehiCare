import { useEffect } from 'react';

import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import CustomVehicleModal from '../components/CustomVehicleModal';
import VehicleDetailsSteps from '../components/VehicleDetailsSteps';
import { useAuth } from '../context/AuthContext';
import { useVehicle } from '../context/VehicleContext';
import useCustomVehicleModal from '../hooks/useCustomVehicleModal';
import useVehicleDetails from '../hooks/useVehicleDetails';
import { useTheme } from '../theme/ThemeContext';

const VehicleDetailsScreen = ({ navigation, route }) => {
  const routeFrom = route?.params?.from;
  const isAddFromMyVehicles = routeFrom === 'MyVehicles';

  const {
    step,
    vehicleType,
    vehicleTypeId,
    setVehicleType,
    brand,
    brandId,
    setBrand,
    model,
    modelId,
    setModel,
    year,
    yearId,
    setYear,
    modelNumber,
    setModelNumber,
    brandSearch,
    setBrandSearch,
    modelSearch,
    setModelSearch,
    yearSearch,
    setYearSearch,
    vehicleTypes,
    filteredBrands,
    filteredModels,
    filteredYears,
    loadingVehicleTypes,
    loadingBrands,
    loadingModels,
    loadingYears,
    savingVehicle,
    vehicleTypesError,
    brandsError,
    modelsError,
    yearsError,
    saveError,
    activeDropdown,
    openDropdown,
    toggleDropdown,
    isCustomVehicle,
    setCustomVehicleProfile,
    canContinueStep1,
    canContinueStep2,
    nextStep,
    previousStep,
    saveVehicle,
    validationResult,
    loadingValidation,
    validateCurrentVehicle,
    resetValidationAlerts,
  } = useVehicleDetails({
    initialMode: route?.params?.mode ?? 'create',
    initialVehicle: route?.params?.vehicle ?? null,
  });

  const { activeVehicle } = useVehicle();
  const { isAuthenticated } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    if (
      isAuthenticated &&
      activeVehicle &&
      !isAddFromMyVehicles
    ) {
      navigation.replace('Dashboard');
    }
  }, [
    isAuthenticated,
    activeVehicle,
    navigation,
    isAddFromMyVehicles,
  ]);

  const customVehicleModal = useCustomVehicleModal({
    brand,
    model,
    year,
    onSave: setCustomVehicleProfile,
  });

  const handleContinue = async () => {
    if (step === 1) {
      if (!canContinueStep1) {
        return;
      }

      nextStep();
      return;
    }

    if (step === 2) {
      if (!canContinueStep2 || savingVehicle) {
        return;
      }

      const response = await saveVehicle();

      if (!response) {
        return;
      }

      if (isAddFromMyVehicles) {
        navigation.replace('Vehicles');
      } else {
        navigation.replace('VehicleLoading');
      }
    }
  };

  const handleVehicleTypeSelect = item => {
    resetValidationAlerts?.();
    setVehicleType(item.name, item.id);
  };

  const handleBrandChange = text => {
    resetValidationAlerts?.();
    setBrandSearch(text);

    if (text !== brand) {
      setBrand('', null);
    }

    openDropdown('brand');
  };

  const handleBrandSelect = item => {
    resetValidationAlerts?.();
    setBrandSearch(item.name);
    setBrand(item.name, item.id);
  };

  const handleModelChange = text => {
    if (!brandId && !isCustomVehicle) {
      return;
    }

    resetValidationAlerts?.();
    setModelSearch(text);
    openDropdown('model');
  };

  const handleModelSelect = item => {
    resetValidationAlerts?.();
    setModelSearch(item.name);
    setModel(item.name, item.id);
  };

  const handleYearChange = text => {
    if (!modelId && !isCustomVehicle) {
      return;
    }

    resetValidationAlerts?.();
    const numericValue = text.replace(/[^0-9]/g, '');

    setYearSearch(numericValue);
    openDropdown('year');
  };

  const handleYearSelect = item => {
    const selectedYear = String(item.year);

    setYearSearch(selectedYear);
    setYear(selectedYear, item.id);
    validateCurrentVehicle({ year: selectedYear });
  };

  const vehicleDetails = {
    step,
    vehicleType,
    vehicleTypeId,
    brand,
    brandId,
    model,
    modelId,
    year,
    yearId,
    modelNumber,
    brandSearch,
    modelSearch,
    yearSearch,
    vehicleTypes,
    filteredBrands,
    filteredModels,
    filteredYears,
    loadingVehicleTypes,
    loadingBrands,
    loadingModels,
    loadingYears,
    savingVehicle,
    vehicleTypesError,
    brandsError,
    modelsError,
    yearsError,
    saveError,
    activeDropdown,
    isCustomVehicle,
    validationResult,
    loadingValidation,
  };

  const handlers = {
    handleVehicleTypeSelect,
    handleBrandChange,
    handleBrandSelect,
    handleModelChange,
    handleModelSelect,
    handleYearChange,
    handleYearSelect,
    openDropdown,
    toggleDropdown,
    setModelNumber,
    openCustomVehicleModal: customVehicleModal.openCustomVehicleModal,
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}>
        <VehicleDetailsSteps
          vehicleDetails={vehicleDetails}
          handlers={handlers}
        />
      </ScrollView>

      <View style={[styles.bottom, { backgroundColor: theme.background }]}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={previousStep}
            disabled={savingVehicle}>
            <Text style={[styles.backText, { color: theme.textSecondary }]}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.accent },
            ((step === 1 && !canContinueStep1) ||
              (step === 2 && !canContinueStep2) ||
              savingVehicle) &&
              [styles.buttonDisabled, { backgroundColor: theme.border }],
          ]}
          onPress={handleContinue}
          disabled={
            savingVehicle ||
            (step === 1 && !canContinueStep1) ||
            (step === 2 && !canContinueStep2)
          }>
          {savingVehicle ? (
            <View style={styles.savingContent}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.buttonText}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>
              {step === 2 ? 'Save & Continue' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <CustomVehicleModal
        visible={customVehicleModal.visible}
        brand={customVehicleModal.customBrand}
        model={customVehicleModal.customModel}
        year={customVehicleModal.customYear}
        error={customVehicleModal.error}
        onBrandChange={customVehicleModal.setCustomBrand}
        onModelChange={customVehicleModal.setCustomModel}
        onYearChange={customVehicleModal.setCustomYear}
        onSave={customVehicleModal.handleSaveCustomVehicleProfile}
        onCancel={customVehicleModal.closeCustomVehicleModal}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  bottom: {
    paddingBottom: 28,
    paddingTop: 12,
    backgroundColor: '#0A0A0A',
  },
  button: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F63B05',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#292929',
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    fontSize: 16,
  },
  savingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
  },
  backText: {
    fontFamily: 'Inter-Medium',
    color: '#888888',
    fontSize: 14,
  },
});

export default VehicleDetailsScreen;
