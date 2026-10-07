
import { useEffect, useState } from 'react';
import vehicleApi from '../api/vehicleApi';
import { useAuth } from '../context/AuthContext';
import { useVehicle } from '../context/VehicleContext';

const useVehicleDetails = ({ initialMode = 'create', initialVehicle = null } = {}) => {
  if (!vehicleApi) {
    console.error('vehicleApi is not defined');
    throw new Error('vehicleApi is not properly imported');
  }

  if (typeof vehicleApi.getVehicleTypes !== 'function') {
    console.error('vehicleApi.getVehicleTypes is not a function');
    throw new Error('vehicleApi.getVehicleTypes method is missing');
  }
  /*
   * =========================
   * STEP
   * =========================
   */

  const [step, setStep] = useState(1);

  /*
   * =========================
   * VEHICLE SELECTION
   * =========================
   */

  const [vehicleType, setVehicleTypeState] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState(null);

  const [brand, setBrandState] = useState('');
  const [brandId, setBrandId] = useState(null);

  const [model, setModelState] = useState('');
  const [modelId, setModelId] = useState(null);

  const [year, setYearState] = useState('');
  const [yearId, setYearId] = useState(null);

  const [isCustomVehicle, setIsCustomVehicle] = useState(false);

  const [modelNumber, setModelNumber] = useState('');

  const [mode, setMode] = useState(initialMode);
  const [vehicleId, setVehicleId] = useState(initialVehicle?.id ?? null);

  const [initialisingVehicle, setInitialisingVehicle] = useState(false);

  /*
   * =========================
   * SEARCH INPUTS
   * =========================
   */

  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [yearSearch, setYearSearch] = useState('');

  /*
   * =========================
   * API DATA
   * =========================
   */

  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [models, setModels] = useState([]);
  const [years, setYears] = useState([]);

  /*
   * =========================
   * LOADING
   * =========================
   */

  const [loadingVehicleTypes, setLoadingVehicleTypes] =
    useState(false);

  const [loadingBrands, setLoadingBrands] =
    useState(false);

  const [loadingModels, setLoadingModels] =
    useState(false);

  const [loadingYears, setLoadingYears] =
    useState(false);

  const [savingVehicle, setSavingVehicle] =
    useState(false);

  const { token } = useAuth();
  const { savePendingVehicle, setActiveVehicle } = useVehicle();

  /*
   * =========================
   * ERRORS
   * =========================
   */

  const [vehicleTypesError, setVehicleTypesError] =
    useState(null);

  const [brandsError, setBrandsError] =
    useState(null);

  const [modelsError, setModelsError] =
    useState(null);

  const [yearsError, setYearsError] =
    useState(null);

  const [saveError, setSaveError] =
    useState(null);

  const [validationResult, setValidationResult] = useState(null);
  const [loadingValidation, setLoadingValidation] = useState(false);

  const resetValidationAlerts = () => {
    setValidationResult(null);
    setSaveError(null);
  };

  const validateCurrentVehicle = async (overrideParams = {}) => {
    try {
      setLoadingValidation(true);
      const vType = overrideParams.vehicleType || vehicleType || 'Car';
      const vBrand = overrideParams.brand || brand || '';
      const vModel = overrideParams.model || model || '';
      const vYear = overrideParams.year || year || '';

      const payload = {
        vehicle_type: vType,
        brand: vBrand,
        model: vModel,
        year: vYear ? Number(vYear) : null,
        custom_brand: overrideParams.customBrand || (isCustomVehicle ? brand : null),
        custom_model: overrideParams.customModel || (isCustomVehicle ? model : null),
        custom_year: overrideParams.customYear || (isCustomVehicle ? year : null),
        model_number: overrideParams.modelNumber || modelNumber || null,
      };

      const result = await vehicleApi.validateVehicle(payload);
      setValidationResult(result);
      return result;
    } catch (e) {
      console.warn('Vehicle validation failed:', e);
      const fallback = { is_valid: true, status: 'validation_unavailable', reason: 'Verification unavailable.' };
      setValidationResult(fallback);
      return fallback;
    } finally {
      setLoadingValidation(false);
    }
  };

  const [initialVehicleLoaded, setInitialVehicleLoaded] =
    useState(false);

  const loadInitialVehicle = async vehicle => {
    if (!vehicle) {
      return;
    }

    setInitialisingVehicle(true);

    const customVehicle = Boolean(
      vehicle?.custom_brand ||
      vehicle?.custom_model ||
      vehicle?.custom_year,
    );

    const vehicleTypeIdValue =
      vehicle?.vehicle_type_id ||
      vehicle?.vehicleType?.id ||
      null;

    const vehicleTypeValue =
      vehicle?.vehicle_type?.name ||
      vehicle?.vehicle_type ||
      vehicle?.vehicleType?.name ||
      '';

    const brandValue = customVehicle
      ? String(vehicle?.custom_brand || '').trim()
      : String(
          vehicle?.vehicle_brand?.name ||
          vehicle?.vehicle_brand ||
          vehicle?.vehicleBrand?.name ||
          '',
        ).trim();

    const brandIdValue = customVehicle
      ? null
      : vehicle?.vehicle_brand_id ||
        vehicle?.vehicle_brand?.id ||
        vehicle?.vehicleBrand?.id ||
        null;

    const modelValue = customVehicle
      ? String(vehicle?.custom_model || '').trim()
      : String(
          vehicle?.vehicle_model?.name ||
          vehicle?.vehicle_model ||
          vehicle?.vehicleModel?.name ||
          '',
        ).trim();

    const modelIdValue = customVehicle
      ? null
      : vehicle?.vehicle_model_id ||
        vehicle?.vehicle_model?.id ||
        vehicle?.vehicleModel?.id ||
        null;

    const yearValue = customVehicle
      ? String(vehicle?.custom_year || '').trim()
      : String(
          vehicle?.vehicle_year?.year ||
          vehicle?.vehicle_year ||
          vehicle?.vehicleYear?.year ||
          '',
        ).trim();

    const yearIdValue = customVehicle
      ? null
      : vehicle?.vehicle_year_id ||
        vehicle?.vehicle_year?.id ||
        vehicle?.vehicleYear?.id ||
        null;

    setVehicleTypeState(String(vehicleTypeValue));
    setVehicleTypeId(vehicleTypeIdValue);

    setBrandState(brandValue);
    setBrandId(brandIdValue);
    setBrandSearch(brandValue);

    setModelState(modelValue);
    setModelId(modelIdValue);
    setModelSearch(modelValue);

    setYearState(yearValue);
    setYearId(yearIdValue);
    setYearSearch(yearValue);

    setIsCustomVehicle(customVehicle);
    setModelNumber(String(vehicle?.model_number || ''));

    setActiveDropdown(null);

    try {
      if (vehicleTypeIdValue && !customVehicle) {
        const fetchedBrands = await vehicleApi.getBrands(vehicleTypeIdValue);
        setBrands(Array.isArray(fetchedBrands) ? fetchedBrands : []);
      }

      if (brandIdValue && !customVehicle) {
        const fetchedModels = await vehicleApi.getModels(brandIdValue);
        setModels(Array.isArray(fetchedModels) ? fetchedModels : []);
      }

      if (modelIdValue && !customVehicle) {
        const fetchedYears = await vehicleApi.getYears(modelIdValue);
        setYears(Array.isArray(fetchedYears) ? fetchedYears : []);
      }
    } catch (error) {
      console.warn('Unable to pre-load vehicle details for correction:', error?.message || error);
    } finally {
      setInitialVehicleLoaded(true);
      setInitialisingVehicle(false);
    }
  };

  useEffect(() => {
    setMode(initialMode);
    setVehicleId(initialVehicle?.id ?? null);

    if (initialMode === 'correct' && initialVehicle && !initialVehicleLoaded) {
      loadInitialVehicle(initialVehicle);
    }
  }, [initialMode, initialVehicle]);

  /*
   * =========================
   * DROPDOWN
   * =========================
   */

  const [activeDropdown, setActiveDropdown] =
    useState(null);

  /*
   * =========================
   * LOAD VEHICLE TYPES
   * =========================
   */

  useEffect(() => {
    const loadVehicleTypes = async () => {
      try {
        setLoadingVehicleTypes(true);
        setVehicleTypesError(null);

        if (typeof vehicleApi.getVehicleTypes !== 'function') {
          throw new Error('vehicleApi.getVehicleTypes is not a function');
        }

        const response = await vehicleApi.getVehicleTypes();

        if (!Array.isArray(response)) {
          console.warn('Response is not an array:', response);
          setVehicleTypes([]);
        } else {
          setVehicleTypes(response);
        }
      } catch (error) {
        console.error(
          'Failed to load vehicle types:',
          error,
        );

        const errorMessage = 
          error?.response?.data?.message ||
          error?.message ||
          'Unable to load vehicle types.';

        setVehicleTypesError(errorMessage);
        setVehicleTypes([]);
      } finally {
        setLoadingVehicleTypes(false);
      }
    };

    try {
      loadVehicleTypes();
    } catch (error) {
      console.error('Unexpected error in loadVehicleTypes:', error);
      setVehicleTypesError('Unexpected error loading vehicle types');
      setLoadingVehicleTypes(false);
    }
  }, []);

  /*
   * =========================
   * FILTERED DATA
   * =========================
   */

  const filteredBrands = brands.filter(item =>
    String(item.name || '')
      .toLowerCase()
      .includes(brandSearch.toLowerCase()),
  );

  const filteredModels = models.filter(item =>
    String(item.name || '')
      .toLowerCase()
      .includes(modelSearch.toLowerCase()),
  );

  const filteredYears = years.filter(item =>
    String(item.year || '').includes(yearSearch),
  );

  /*
   * =========================
   * VEHICLE TYPE
   * =========================
   */

  const setVehicleType = async (
    type,
    typeId = null,
  ) => {
    try {
      setVehicleTypeState(type);
      setVehicleTypeId(typeId);

      /*
       * Reset brand
       */

      setBrandState('');
      setBrandId(null);
      setBrandSearch('');

      /*
       * Reset model
       */

      setModelState('');
      setModelId(null);
      setModelSearch('');

      /*
       * Reset year
       */

      setYearState('');
      setYearId(null);
      setYearSearch('');

      /*
       * Reset model number
       */

      setModelNumber('');

      /*
       * Clear API data
       */

      setBrands([]);
      setModels([]);
      setYears([]);

      /*
       * Close dropdown
       */

      setActiveDropdown(null);

      /*
       * No ID means nothing to load
       */

      if (!typeId) {
        return;
      }

      try {
        setLoadingBrands(true);
        setBrandsError(null);

        if (typeof vehicleApi.getBrands !== 'function') {
          throw new Error('vehicleApi.getBrands is not a function');
        }

        const response = await vehicleApi.getBrands(typeId);

        if (!Array.isArray(response)) {
          console.warn('Brands response is not an array:', response);
          setBrands([]);
        } else {
          setBrands(response);
        }
      } catch (error) {
        console.error(
          'Failed to load vehicle brands:',
          error,
        );

        const errorMessage = 
          error?.response?.data?.message ||
          error?.message ||
          'Unable to load vehicle brands.';

        setBrandsError(errorMessage);
        setBrands([]);
      } finally {
        setLoadingBrands(false);
      }
    } catch (error) {
      console.error('Unexpected error in setVehicleType:', error);
      setBrandsError('Unexpected error loading brands');
    }
  };

  /*
   * =========================
   * BRAND
   * =========================
   */

  const setBrand = async (
    selectedBrand,
    selectedBrandId = null,
  ) => {
    try {
      resetValidationAlerts();
      setBrandState(selectedBrand);
      setBrandId(selectedBrandId);
      setIsCustomVehicle(false);

      /*
       * Reset model
       */

      setModelState('');
      setModelId(null);
      setModelSearch('');

      /*
       * Reset year
       */

      setYearState('');
      setYearId(null);
      setYearSearch('');

      /*
       * Clear old API data
       */

      setModels([]);
      setYears([]);

      /*
       * Close dropdown
       */

      setActiveDropdown(null);

      /*
       * No ID means nothing to load
       */

      if (!selectedBrandId) {
        return;
      }

      try {
        setLoadingModels(true);
        setModelsError(null);

        if (typeof vehicleApi.getModels !== 'function') {
          throw new Error('vehicleApi.getModels is not a function');
        }

        const response = await vehicleApi.getModels(selectedBrandId);

        if (!Array.isArray(response)) {
          console.warn('Models response is not an array:', response);
          setModels([]);
        } else {
          setModels(response);
        }
      } catch (error) {
        console.error(
          'Failed to load vehicle models:',
          error,
        );

        const errorMessage = 
          error?.response?.data?.message ||
          error?.message ||
          'Unable to load vehicle models.';

        setModelsError(errorMessage);
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    } catch (error) {
      console.error('Unexpected error in setBrand:', error);
      setModelsError('Unexpected error loading models');
    }
  };

  /*
   * =========================
   * MODEL
   * =========================
   */

  const setModel = async (
    selectedModel,
    selectedModelId = null,
  ) => {
    try {
      resetValidationAlerts();
      setModelState(selectedModel);
      setModelId(selectedModelId);
      setIsCustomVehicle(false);
      setModelSearch(selectedModel);

      /*
       * Reset year
       */

      setYearState('');
      setYearId(null);
      setYearSearch('');

      /*
       * Clear old years
       */

      setYears([]);

      /*
       * Close dropdown
       */

      setActiveDropdown(null);

      /*
       * No ID means nothing to load
       */

      if (!selectedModelId) {
        return;
      }

      try {
        setLoadingYears(true);
        setYearsError(null);

        if (typeof vehicleApi.getValidatedYears !== 'function' && typeof vehicleApi.getYears !== 'function') {
          throw new Error('vehicleApi.getYears is not a function');
        }

        const getYearsFn = vehicleApi.getValidatedYears || vehicleApi.getYears;
        const response = await getYearsFn(selectedModelId);

        if (!Array.isArray(response)) {
          console.warn('Years response is not an array:', response);
          setYears([]);
        } else {
          setYears(response);
        }
      } catch (error) {
        console.error(
          'Failed to load vehicle years:',
          error,
        );

        const errorMessage = 
          error?.response?.data?.message ||
          error?.message ||
          'Unable to load vehicle years.';

        setYearsError(errorMessage);
        setYears([]);
      } finally {
        setLoadingYears(false);
      }
    } catch (error) {
      console.error('Unexpected error in setModel:', error);
      setYearsError('Unexpected error loading years');
    }
  };

  /*
   * =========================
   * YEAR
   * =========================
   */

  const setYear = (
    selectedYear,
    selectedYearId = null,
  ) => {
    resetValidationAlerts();
    setYearState(String(selectedYear));
    setYearId(selectedYearId);
    setIsCustomVehicle(false);
    setYearSearch(String(selectedYear));

    setActiveDropdown(null);
  };

  const setCustomVehicle = (enabled) => {
    setIsCustomVehicle(enabled);

    if (enabled) {
      setBrandId(null);
      setModelId(null);
      setYearId(null);
      setActiveDropdown(null);
    }
  };

  const setCustomVehicleProfile = (
    customBrand,
    customModel,
    customYear,
  ) => {
    const normalizedBrand = String(customBrand || '').trim();
    const normalizedModel = String(customModel || '').trim();
    const normalizedYear = String(customYear || '').trim();

    setIsCustomVehicle(true);
    setBrandState(normalizedBrand);
    setBrandId(null);
    setBrandSearch(normalizedBrand);

    setModelState(normalizedModel);
    setModelId(null);
    setModelSearch(normalizedModel);

    setYearState(normalizedYear);
    setYearId(null);
    setYearSearch(normalizedYear);

    setActiveDropdown(null);

    validateCurrentVehicle({
      brand: normalizedBrand,
      model: normalizedModel,
      year: normalizedYear,
      customBrand: normalizedBrand,
      customModel: normalizedModel,
      customYear: normalizedYear,
    });
  };

  /*
   * =========================
   * DROPDOWN
   * =========================
   */

  const openDropdown = dropdown => {
    setActiveDropdown(dropdown);
  };

  const closeDropdown = () => {
    setActiveDropdown(null);
  };

  const toggleDropdown = dropdown => {
    setActiveDropdown(current =>
      current === dropdown
        ? null
        : dropdown,
    );
  };

  /*
   * =========================
   * STEP NAVIGATION
   * =========================
   */

  const nextStep = () => {
    setActiveDropdown(null);

    setStep(current =>
      Math.min(current + 1, 2),
    );
  };

  const previousStep = () => {
    setActiveDropdown(null);

    setStep(current =>
      Math.max(current - 1, 1),
    );
  };

  /*
   * =========================
   * VALIDATION
   * =========================
   */

  const canContinueStep1 =
    Boolean(vehicleTypeId);

  const canContinueStep2 =
    Boolean(
      vehicleTypeId &&
        brand &&
        model &&
        year &&
        (isCustomVehicle || (brandId && modelId && yearId)),
    );

  /*
   * =========================
   * SAVE VEHICLE
   * =========================
   */

  const saveVehicle = async () => {
    try {
      if (!canContinueStep2) {
        setSaveError(
          'Please complete all required vehicle details.',
        );

        return null;
      }

      try {
        setSavingVehicle(true);
        setSaveError(null);

        // Perform AI vehicle validation check before saving
        const vCheck = await validateCurrentVehicle();
        if (vCheck && (vCheck.status === 'invalid' || vCheck.year_valid === false)) {
          setSaveError(
            vCheck.reason || 'The selected vehicle or model-year combination is invalid according to vehicle production records.'
          );
          setSavingVehicle(false);
          return null;
        }

        if (typeof vehicleApi.saveVehicle !== 'function') {
          throw new Error('vehicleApi.saveVehicle is not a function');
        }

        const payload = {
          vehicle_type_id: vehicleTypeId,
          vehicle_brand_id: isCustomVehicle ? null : brandId,
          vehicle_model_id: isCustomVehicle ? null : modelId,
          vehicle_year_id: isCustomVehicle ? null : yearId,
          custom_brand: isCustomVehicle ? brand.trim() : null,
          custom_model: isCustomVehicle ? model.trim() : null,
          custom_year: isCustomVehicle ? year.trim() : null,
          model_number:
            modelNumber.trim() || null,
        };

        console.log(
          'Saving vehicle:',
          payload,
        );

        const guestVehiclePayload = {
          vehicle_type_id: vehicleTypeId,
          vehicle_type: vehicleType,
          vehicle_brand_id: isCustomVehicle ? null : brandId,
          vehicle_brand: brand,
          vehicle_model_id: isCustomVehicle ? null : modelId,
          vehicle_model: model,
          vehicle_year_id: isCustomVehicle ? null : yearId,
          vehicle_year: year,
          custom_brand: isCustomVehicle ? brand.trim() : null,
          custom_model: isCustomVehicle ? model.trim() : null,
          custom_year: isCustomVehicle ? year.trim() : null,
          model_number: modelNumber.trim() || null,
          isActive: false,
        };

        const hasLaravelToken = Boolean(token && String(token).trim());
        const shouldSyncToBackend = hasLaravelToken && !String(token).startsWith('firebase-');

        if (shouldSyncToBackend) {
          try {
            const response =
              mode === 'correct' && vehicleId
                ? await vehicleApi.updateVehicle(vehicleId, payload)
                : await vehicleApi.saveVehicle(payload);

            console.log(
              mode === 'correct'
                ? 'Vehicle corrected successfully:'
                : 'Vehicle saved successfully:',
              response,
            );

            /*
             * Do NOT automatically set new vehicles as active.
             * Users should decide when to activate vehicles.
             */
            return response;
          } catch (error) {
            console.warn('Backend save failed for authenticated user.', error?.message || error);

            const errorMessage = 
              error?.response?.data?.message ||
              error?.message ||
              String(error) ||
              'Unable to save vehicle.';

            setSaveError(errorMessage);
            return null;
          }
        }

        if (mode === 'correct') {
          await savePendingVehicle(guestVehiclePayload);

          return {
            ...guestVehiclePayload,
            savedLocally: true,
          };
        }

        console.warn(
          'No auth token found. Saving vehicle locally only.',
        );

        await savePendingVehicle(guestVehiclePayload);

        return {
          ...guestVehiclePayload,
          savedLocally: true,
        };
      } catch (error) {
        console.error(
          'Failed to save vehicle:',
          error?.message || error,
        );

        console.error(
          'Response:',
          error?.response?.data || error,
        );

        const errorMessage = 
          error?.response?.data?.message ||
          error?.message ||
          String(error) ||
          'Unable to save vehicle.';

        setSaveError(errorMessage);

        return null;
      } finally {
        setSavingVehicle(false);
      }
    } catch (error) {
      console.error('Unexpected error in saveVehicle:', error);
      setSaveError('Unexpected error saving vehicle');
      setSavingVehicle(false);
      return null;
    }
  };

  /*
   * =========================
   * RETURN
   * =========================
   */

  return {
    /*
     * Step
     */

    step,

    /*
     * Vehicle type
     */

    vehicleType,
    vehicleTypeId,
    setVehicleType,

    /*
     * Brand
     */

    brand,
    brandId,
    setBrand,

    /*
     * Model
     */

    model,
    modelId,
    setModel,

    /*
     * Year
     */

    year,
    yearId,
    setYear,

    /*
     * Model number
     */

    modelNumber,
    setModelNumber,

    /*
     * Search
     */

    brandSearch,
    setBrandSearch,

    modelSearch,
    setModelSearch,

    yearSearch,
    setYearSearch,

    /*
     * API data
     */

    vehicleTypes,
    brands,
    models,
    years,

    /*
     * Filtered data
     */

    filteredBrands,
    filteredModels,
    filteredYears,

    /*
     * Custom vehicle mode
     */
    isCustomVehicle,
    setCustomVehicle,

    /*
     * Loading
     */

    loadingVehicleTypes,
    loadingBrands,
    loadingModels,
    loadingYears,
    savingVehicle,

    /*
     * Errors
     */

    vehicleTypesError,
    brandsError,
    modelsError,
    yearsError,
    saveError,

    /*
     * Dropdown
     */

    activeDropdown,
    openDropdown,
    closeDropdown,
    toggleDropdown,

    /*
     * Validation
     */

    canContinueStep1,
    canContinueStep2,
    validationResult,
    loadingValidation,
    validateCurrentVehicle,
    resetValidationAlerts,

    /*
     * Navigation
     */

    nextStep,
    previousStep,

    /*
     * Save
     */

    mode,
    saveVehicle,
    setCustomVehicleProfile,
  };
};

export default useVehicleDetails;
