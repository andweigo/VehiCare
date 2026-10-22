export const normalizeVehicleProfile = vehicleProfile => {
  if (!vehicleProfile || typeof vehicleProfile !== 'object') {
    return {};
  }

  const normalized = { ...vehicleProfile };

  const rawVehicleType =
    normalized.vehicle_type ??
    normalized.vehicleType ??
    normalized.vehicle_type_name ??
    normalized.type ??
    normalized.category ??
    null;

  if (rawVehicleType && !normalized.vehicle_type) {
    normalized.vehicle_type = rawVehicleType;
  }

  const rawVehicleBrand =
    normalized.custom_brand ??
    normalized.vehicle_brand ??
    normalized.vehicleBrand ??
    normalized.brand ??
    null;

  if (rawVehicleBrand && !normalized.vehicle_brand) {
    normalized.vehicle_brand = rawVehicleBrand;
  }

  const rawVehicleModel =
    normalized.custom_model ??
    normalized.vehicle_model ??
    normalized.vehicleModel ??
    normalized.model ??
    null;

  if (rawVehicleModel && !normalized.vehicle_model) {
    normalized.vehicle_model = rawVehicleModel;
  }

  const rawVehicleYear =
    normalized.custom_year ??
    normalized.vehicle_year ??
    normalized.vehicleYear ??
    normalized.year ??
    null;

  if (rawVehicleYear && !normalized.vehicle_year) {
    normalized.vehicle_year = rawVehicleYear;
  }

  return normalized;
};

export const getDisplayValue = (value, fallback = '') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text || fallback;
  }

  if (Array.isArray(value)) {
    return value.map(item => getDisplayValue(item, '')).filter(Boolean).join(', ') || fallback;
  }

  if (typeof value === 'object') {
    const nestedCandidates = ['name', 'year', 'label', 'title', 'value', 'code', 'type'];

    for (const key of nestedCandidates) {
      const nestedValue = value[key];
      if (nestedValue === null || nestedValue === undefined) {
        continue;
      }

      const coerced = getDisplayValue(nestedValue, '');
      if (coerced) {
        return coerced;
      }
    }

    if (value.id !== undefined && value.id !== null) {
      const coerced = getDisplayValue(value.id, '');
      if (coerced) {
        return coerced;
      }
    }

    return fallback;
  }

  return fallback;
};

export const getVehicleDisplayName = (vehicleProfile, fallback = 'Your Vehicle') => {
  const normalizedVehicle = normalizeVehicleProfile(vehicleProfile);

  if (!Object.keys(normalizedVehicle).length) {
    return fallback;
  }

  const customBrand = getDisplayValue(normalizedVehicle.custom_brand, '');
  const customModel = getDisplayValue(normalizedVehicle.custom_model, '');
  const vehicleBrand = getDisplayValue(
    normalizedVehicle.vehicle_brand ?? normalizedVehicle.vehicleBrand,
    '',
  );
  const vehicleModel = getDisplayValue(
    normalizedVehicle.vehicle_model ?? normalizedVehicle.vehicleModel,
    '',
  );
  const vehicleType = getDisplayValue(
    normalizedVehicle.vehicle_type ?? normalizedVehicle.vehicleType,
    '',
  );

  if (customModel) {
    return `${customBrand} ${customModel}`.trim() || fallback;
  }

  if (vehicleModel) {
    return `${vehicleBrand} ${vehicleModel}`.trim() || fallback;
  }

  return vehicleType || fallback;
};

export const getVehicleDisplayDetails = (vehicleProfile, fallback = '') => {
  const normalizedVehicle = normalizeVehicleProfile(vehicleProfile);

  if (!Object.keys(normalizedVehicle).length) {
    return fallback;
  }

  const year = getDisplayValue(
    normalizedVehicle.vehicle_year ?? normalizedVehicle.vehicleYear ?? normalizedVehicle.custom_year,
    '',
  );
  const vehicleType = getDisplayValue(
    normalizedVehicle.vehicle_type ?? normalizedVehicle.vehicleType,
    '',
  );

  if (!year && !vehicleType) {
    return fallback;
  }

  return [year, vehicleType].filter(Boolean).join(' • ');
};
