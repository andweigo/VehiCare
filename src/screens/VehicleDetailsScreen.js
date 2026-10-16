import { useEffect, useRef } from 'react';

import {
    ActivityIndicator,
    BackHandler,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const { isAuthenticated, isGuest, exitGuestMode } = useAuth();
  const { theme } = useTheme();

  const isNavigatingForwardRef = useRef(false);

  const handleBack = () => {
    if (step > 1) {
      previousStep();
    } else {
      if (isGuest && typeof exitGuestMode === 'function') {
        exitGuestMode();
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Welcome');
      }
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step > 1) {
        previousStep();
        return true;
      }
      if (isGuest && typeof exitGuestMode === 'function') {
        exitGuestMode();
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      navigation.navigate('Welcome');
      return true;
    });

    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (isNavigatingForwardRef.current) {
        return;
      }

      const actionType = e.data.action?.type;
      if (actionType && actionType !== 'GO_BACK' && actionType !== 'POP') {
        return;
      }

      if (step > 1) {
        e.preventDefault();
        previousStep();
        return;
      }

      if (isGuest && typeof exitGuestMode === 'function') {
        exitGuestMode();
      }
    });

    return () => {
      backHandler.remove();
      unsubscribe();
    };
  }, [step, previousStep, isGuest, exitGuestMode, navigation]);

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

      isNavigatingForwardRef.current = true;
      const response = await saveVehicle();

      if (!response) {
        isNavigatingForwardRef.current = false;
        return;
      }

      if (isAddFromMyVehicles) {
        navigation.replace('Vehicles');
      } else {
        navigation.replace('VehicleLoading', { vehicle: response });
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
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <StatusBar
        barStyle={theme.name === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <VehicleDetailsSteps
            vehicleDetails={vehicleDetails}
            handlers={handlers}
          />
        </ScrollView>

        <View style={[styles.bottom, { backgroundColor: theme.background }]}>
          {(step > 1 || navigation.canGoBack() || !isAuthenticated || isGuest) && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              disabled={savingVehicle}
            >
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
            }
          >
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  bottom: {
    paddingBottom: 20,
    paddingTop: 12,
  },
  button: {
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
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
    paddingVertical: 10,
    marginBottom: 4,
  },
  backText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
});

export default VehicleDetailsScreen;
