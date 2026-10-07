/**
 * Robustly extract vehicle type string from any vehicle profile object shape.
 */
export const resolveVehicleTypeString = vehicleProfile => {
  if (!vehicleProfile) return '';

  const candidates = [
    vehicleProfile.vehicle_type,
    vehicleProfile.vehicleType,
    vehicleProfile.vehicle_type_name,
    vehicleProfile.vehicle_type_label,
    vehicleProfile.type,
    vehicleProfile.category,
    vehicleProfile.type_name,
    vehicleProfile.vehicle_category,
    vehicleProfile.model,
  ];

  for (let cand of candidates) {
    if (!cand) continue;
    if (typeof cand === 'string' && cand.trim()) return cand.trim();
    if (typeof cand === 'object') {
      const objVal = cand.name || cand.label || cand.type || cand.title || cand.value || cand.code || cand.category;
      if (typeof objVal === 'string' && objVal.trim()) return objVal.trim();
    }
  }

  return '';
};

/**
 * Resolve icon name based on vehicle type string.
 */
export const getVehicleIconName = vehicleTypeValue => {
  let typeText = resolveVehicleTypeString(vehicleTypeValue);
  if (!typeText && typeof vehicleTypeValue === 'string') {
    typeText = vehicleTypeValue;
  }

  const text = `${typeText || ''}`.toLowerCase().trim();

  if (
    text.includes('moto') ||
    text.includes('motor') ||
    text.includes('scooter')
  ) {
    return 'motorcycle';
  }

  if (
    text.includes('bicycle') ||
    text.includes('bike') ||
    text.includes('cycle')
  ) {
    return 'directions-bike';
  }

  if (text.includes('bus')) {
    return 'directions-bus';
  }

  if (
    text.includes('truck') ||
    text.includes('van') ||
    text.includes('pickup')
  ) {
    return 'local-shipping';
  }

  return 'directions-car';
};

/**
 * Get baseline preventive maintenance recommendations based on vehicle type.
 */
export const getVehicleRecommendations = vehicleProfile => {
  const normalizedType = resolveVehicleTypeString(vehicleProfile).toLowerCase();

  // BICYCLE / BIKE
  if (normalizedType.includes('bike') || normalizedType.includes('bicycle') || normalizedType.includes('cycle')) {
    return [
      {
        id: 'check-tire-pressure',
        title: 'Check tire pressure',
        description:
          'Keep your bicycle tires inflated for smoother rides and better handling.',
        category: 'Tires',
        icon: 'speed',
        priority: 'Recommended',
        scoreImpact: 3,
        source: 'preventive',
      },
      {
        id: 'inspect-bike-brakes',
        title: 'Inspect brake pads',
        description:
          'Check brake pad wear and braking response before riding.',
        category: 'Safety',
        icon: 'warning',
        priority: 'Important',
        scoreImpact: 4,
        source: 'preventive',
      },
      {
        id: 'clean-bike-chain',
        title: 'Clean and lubricate chain',
        description:
          'A clean, lubricated chain improves shifting and prevents drivetrain wear.',
        category: 'Maintenance',
        icon: 'construction',
        priority: 'Recommended',
        scoreImpact: 3,
        source: 'preventive',
      },
      {
        id: 'check-wheel-condition',
        title: 'Check wheel condition',
        description:
          'Inspect rims and spokes for damage or loose components.',
        category: 'Wheels',
        icon: 'circle',
        priority: 'Recommended',
        scoreImpact: 2,
        source: 'preventive',
      },
    ];
  }

  const shared = [
    {
      id: 'check-tire-pressure',
      title: 'Check tire pressure',
      description:
        'Make sure your tires are inflated to the pressure recommended for your vehicle.',
      category: 'Tires',
      icon: 'speed',
      priority: 'Recommended',
      scoreImpact: 3,
      source: 'preventive',
    },
    {
      id: 'check-engine-oil',
      title: 'Check engine oil',
      description:
        'Review oil level and quality so your engine stays properly lubricated.',
      category: 'Maintenance',
      icon: 'oil-barrel',
      priority: 'Recommended',
      scoreImpact: 4,
      source: 'preventive',
    },
    {
      id: 'inspect-brakes',
      title: 'Inspect brakes',
      description:
        'Inspect pads, rotors, and brake feel to keep your vehicle safe on the road.',
      category: 'Safety',
      icon: 'warning',
      priority: 'Important',
      scoreImpact: 5,
      source: 'preventive',
    },
    {
      id: 'check-lights',
      title: 'Check lights',
      description:
        'Verify headlights, taillights, and signals are working properly.',
      category: 'Visibility',
      icon: 'lightbulb',
      priority: 'Recommended',
      scoreImpact: 2,
      source: 'preventive',
    },
  ];

  // MOTORCYCLE / SCOOTER
  if (normalizedType.includes('moto') || normalizedType.includes('motor') || normalizedType.includes('scooter')) {
    return [
      ...shared,
      {
        id: 'inspect-drive-chain',
        title: 'Inspect drive chain',
        description:
          'Check chain tension and lubrication for smooth motorcycle performance.',
        category: 'Maintenance',
        icon: 'link',
        priority: 'Recommended',
        scoreImpact: 4,
        source: 'preventive',
      },
    ];
  }

  // CAR / TRUCK / DEFAULT
  return [
    ...shared,
    {
      id: 'check-battery',
      title: 'Check battery condition',
      description:
        'Verify battery charge and terminals so your vehicle starts reliably.',
      category: 'Electrical',
      icon: 'battery-charging-full',
      priority: 'Recommended',
      scoreImpact: 3,
      source: 'preventive',
    },
  ];
};

/**
 * Normalize raw diagnostic record into a consistent structure.
 */
export const normalizeDiagnosticRecord = record => {
  if (!record || typeof record !== 'object') return null;

  const id =
    record.id ||
    record.diagnosis_id ||
    record.diagnosisId ||
    record._id ||
    `diag-${Date.now()}`;

  const vehicleId =
    record.vehicle_id ??
    record.vehicleId ??
    record.vehicle?.id ??
    record.vehicle?.vehicle_id ??
    null;

  const rawProblem =
    record.problem ||
    record.diagnosis_title ||
    record.title ||
    record.summary ||
    record.issue ||
    (Array.isArray(record.symptoms) && record.symptoms[0]) ||
    'Vehicle Issue';

  let problem = typeof rawProblem === 'string' ? rawProblem : String(rawProblem);
  problem = problem
    .replace(/^troubleshooting\s+step-by-step\s+actions\s+for\s+/i, '')
    .replace(/^diagnosis\s+for\s+/i, '')
    .replace(/^diagnostic\s+result\s+for\s+/i, '')
    .replace(/^step\s*\d+[\s\:\.\-]*/i, '')
    .replace(/\s+on\s+your\s+\d{4}\s+.*$/i, '')
    .trim();

  if (problem) {
    problem = problem.charAt(0).toUpperCase() + problem.slice(1);
  }

  const rawSeverity =
    record.severity ||
    record.urgency ||
    record.priority ||
    'low';

  const severity = typeof rawSeverity === 'string' ? rawSeverity.toLowerCase() : 'low';

  const recommendedActions = Array.isArray(record.recommended_actions)
    ? record.recommended_actions
    : Array.isArray(record.recommendedActions)
    ? record.recommendedActions
    : Array.isArray(record.recommendations)
    ? record.recommendations
    : Array.isArray(record.actions)
    ? record.actions
    : [];

  const possibleCauses = Array.isArray(record.possible_causes)
    ? record.possible_causes
    : Array.isArray(record.possibleCauses)
    ? record.possibleCauses
    : Array.isArray(record.causes)
    ? record.causes
    : [];

  const troubleshootingSteps = Array.isArray(record.troubleshooting_steps)
    ? record.troubleshooting_steps
    : Array.isArray(record.troubleshootingSteps)
    ? record.troubleshootingSteps
    : Array.isArray(record.steps)
    ? record.steps
    : [];

  const createdAt = record.createdAt || record.created_at || record.timestamp || record.date || null;

  return {
    id: String(id),
    vehicleId: vehicleId !== null ? String(vehicleId) : null,
    problem,
    severity,
    recommendedActions,
    possibleCauses,
    troubleshootingSteps,
    createdAt,
    raw: record,
  };
};

/**
 * Determine category and MaterialIcon name for an action string.
 */
export const getCategoryAndIconFromAction = (actionText, problemText = '') => {
  const combined = `${actionText} ${problemText}`.toLowerCase();

  if (
    combined.includes('battery') ||
    combined.includes('voltage') ||
    combined.includes('alternator') ||
    combined.includes('fuse') ||
    combined.includes('electrical')
  ) {
    return { category: 'Electrical', icon: 'battery-alert' };
  }
  if (
    combined.includes('coolant') ||
    combined.includes('radiator') ||
    combined.includes('overheat') ||
    combined.includes('thermostat') ||
    combined.includes('temperature')
  ) {
    return { category: 'Cooling', icon: 'thermostat' };
  }
  if (
    combined.includes('brake') ||
    combined.includes('pad') ||
    combined.includes('rotor') ||
    combined.includes('stopping')
  ) {
    return { category: 'Safety', icon: 'warning' };
  }
  if (
    combined.includes('oil') ||
    combined.includes('lubricat') ||
    combined.includes('filter') ||
    combined.includes('engine')
  ) {
    return { category: 'Engine', icon: 'oil-barrel' };
  }
  if (
    combined.includes('tire') ||
    combined.includes('wheel') ||
    combined.includes('pressure') ||
    combined.includes('alignment')
  ) {
    return { category: 'Tires', icon: 'speed' };
  }
  if (
    combined.includes('chain') ||
    combined.includes('belt') ||
    combined.includes('transmission')
  ) {
    return { category: 'Maintenance', icon: 'link' };
  }
  if (
    combined.includes('light') ||
    combined.includes('headlight') ||
    combined.includes('lamp') ||
    combined.includes('signal')
  ) {
    return { category: 'Visibility', icon: 'lightbulb' };
  }

  return { category: 'Diagnostic', icon: 'build' };
};

/**
 * Map diagnostic severity string to priority metadata.
 */
export const mapSeverityToPriority = severityStr => {
  const sev = `${severityStr || ''}`.toLowerCase();

  if (
    sev.includes('critical') ||
    sev.includes('emergency') ||
    sev.includes('immediate') ||
    sev.includes('high') ||
    sev.includes('urgent')
  ) {
    return { priority: 'Urgent', scoreImpact: 8, sortOrder: 1 };
  }
  if (sev.includes('medium') || sev.includes('moderate')) {
    return { priority: 'Important', scoreImpact: 5, sortOrder: 2 };
  }
  return { priority: 'Recommended', scoreImpact: 3, sortOrder: 3 };
};

/**
 * Convert diagnostic records into deterministic maintenance items.
 */
export const extractDiagnosticRecommendations = diagnoses => {
  if (!Array.isArray(diagnoses) || diagnoses.length === 0) {
    return [];
  }

  const recommendations = [];

  diagnoses.forEach(diag => {
    const norm = normalizeDiagnosticRecord(diag);
    if (!norm) return;

    const { priority, scoreImpact, sortOrder } = mapSeverityToPriority(norm.severity);

    let rawActions = [];
    if (norm.recommendedActions && norm.recommendedActions.length > 0) {
      rawActions = norm.recommendedActions.map(a =>
        typeof a === 'string' ? a : a?.action || a?.text || a?.title || String(a),
      );
    } else if (norm.possibleCauses && norm.possibleCauses.length > 0) {
      const firstCause =
        typeof norm.possibleCauses[0] === 'string'
          ? norm.possibleCauses[0]
          : norm.possibleCauses[0]?.cause || norm.possibleCauses[0]?.name || 'component issue';
      rawActions = [`Inspect ${firstCause.toLowerCase()}`];
    } else if (norm.troubleshootingSteps && norm.troubleshootingSteps.length > 0) {
      const firstStep =
        typeof norm.troubleshootingSteps[0] === 'string'
          ? norm.troubleshootingSteps[0]
          : norm.troubleshootingSteps[0]?.step || norm.troubleshootingSteps[0]?.text || 'Verify issue';
      rawActions = [firstStep];
    } else {
      rawActions = [`Inspect ${norm.problem.toLowerCase()}`];
    }

    rawActions.forEach((actionText, index) => {
      if (!actionText || typeof actionText !== 'string' || !actionText.trim()) return;

      // Clean leading "Step 1:", "Step 2.", "Step 4:", "1.", "2)", etc.
      let cleanTitle = actionText.trim().replace(/^(step\s*\d+[\s\:\.\-]*|\d+[\s\:\.\-]+)/i, '').trim();
      if (cleanTitle) {
        cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
      } else {
        cleanTitle = actionText.trim();
      }

      const { category, icon } = getCategoryAndIconFromAction(cleanTitle, norm.problem);

      recommendations.push({
        id: `diagnostic-${norm.id}-${index}`,
        type: 'diagnostic',
        title: cleanTitle,
        description: `Recommended action for ${norm.problem}. Verify components and address early.`,
        category,
        icon,
        priority,
        scoreImpact,
        sortOrder,
        source: 'diagnostic',
        diagnosisId: norm.id,
        relatedProblem: norm.problem,
        createdAt: norm.createdAt,
      });
    });
  });

  return recommendations;
};

/**
 * Normalize title strings for deduplication.
 */
export const normalizeKey = str => {
  return `${str || ''}`
    .toLowerCase()
    .replace(/^(check|inspect|verify|clean|monitor|have)\s+/, '')
    .replace(/\s+(condition|system|level|pads|terminals|pressure|wear)$/, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

/**
 * Merge diagnostic maintenance items with preventive maintenance routines.
 */
export const mergeRecommendations = (diagnosticRecs, baselineRecs) => {
  const mergedMap = new Map();

  (diagnosticRecs || []).forEach(item => {
    const key = normalizeKey(item.title);
    if (!mergedMap.has(key)) {
      mergedMap.set(key, item);
    }
  });

  (baselineRecs || []).forEach(item => {
    const key = normalizeKey(item.title);
    if (!mergedMap.has(key)) {
      const sortOrder = item.priority === 'Important' ? 4 : 5;
      mergedMap.set(key, { ...item, type: 'preventive', sortOrder });
    }
  });

  const mergedList = Array.from(mergedMap.values());

  mergedList.sort((a, b) => {
    const orderA = a.sortOrder !== undefined ? a.sortOrder : 3;
    const orderB = b.sortOrder !== undefined ? b.sortOrder : 3;
    return orderA - orderB;
  });

  return mergedList;
};

/**
 * Return health indicator color matching SmartRecommendationsScreen.
 */
export const getHealthBarColor = (healthPercentage, theme) => {
  if (healthPercentage >= 80) {
    return theme?.success || '#35B86B';
  }
  if (healthPercentage >= 60) {
    return theme?.accent || '#F63B05';
  }
  if (healthPercentage >= 40) {
    return '#D6A23A';
  }
  return '#FF5A5F';
};

/**
 * Master category configuration mapping
 */
export const CATEGORY_CONFIG = {
  engine_oil: {
    id: 'engine_oil',
    name: 'Engine & Oil',
    icon: 'build',
  },
  brakes: {
    id: 'brakes',
    name: 'Brakes',
    icon: 'do-not-step',
  },
  battery_electrical: {
    id: 'battery_electrical',
    name: 'Battery & Electrical',
    icon: 'battery-full',
  },
  tires_wheels: {
    id: 'tires_wheels',
    name: 'Tires & Wheels',
    icon: 'tire-repair',
  },
  chain_drive: {
    id: 'chain_drive',
    name: 'Chain & Drive',
    icon: 'settings',
  },
  fluids: {
    id: 'fluids',
    name: 'Fluids',
    icon: 'opacity',
  },
  cooling_system: {
    id: 'cooling_system',
    name: 'Cooling System',
    icon: 'ac-unit',
  },
  lights: {
    id: 'lights',
    name: 'Lights & Electrical',
    icon: 'lightbulb-outline',
  },
  gears_drivetrain: {
    id: 'gears_drivetrain',
    name: 'Gears & Drivetrain',
    icon: 'settings',
  },
  bearings: {
    id: 'bearings',
    name: 'Bearings & Hubs',
    icon: 'radio-button-checked',
  },
  suspension: {
    id: 'suspension',
    name: 'Suspension & Steering',
    icon: 'tune',
  },
  exhaust: {
    id: 'exhaust',
    name: 'Exhaust & Emissions',
    icon: 'cloud',
  },
  fuel_system: {
    id: 'fuel_system',
    name: 'Fuel System',
    icon: 'local-gas-station',
  },
  transmission: {
    id: 'transmission',
    name: 'Transmission & Clutch',
    icon: 'settings-applications',
  },
  general: {
    id: 'general',
    name: 'General Maintenance',
    icon: 'directions-car',
  },
};

/**
 * Map item to a vehicle-specific category object dynamically based on diagnostic data and vehicle profile.
 */
export const getCategoryFromDiagnosticItem = (item, vehicleProfile) => {
  if (!item) return { id: 'general', name: 'General', icon: 'directions-car' };

  const normalizedType = resolveVehicleTypeString(vehicleProfile).toLowerCase();
  const rawCategory = `${item.category || ''}`.toLowerCase().trim();
  const text = `${item.title || ''} ${item.category || ''} ${item.description || ''} ${item.relatedProblem || ''}`.toLowerCase();

  const isBicycle = normalizedType.includes('bike') || normalizedType.includes('bicycle') || normalizedType.includes('cycle');
  const isMotorcycle = normalizedType.includes('moto') || normalizedType.includes('motor') || normalizedType.includes('scooter');

  // ELECTRICAL / BATTERY (Invalid for bicycles)
  if (!isBicycle && (rawCategory.includes('battery') || rawCategory.includes('electrical') || text.includes('battery') || text.includes('voltage') || text.includes('alternator') || text.includes('fuse') || text.includes('starter') || text.includes('starting') || text.includes('difficult to start') || text.includes('click'))) {
    return { id: 'electrical', name: 'Electrical', icon: 'battery-alert' };
  }

  // BRAKES
  if (rawCategory.includes('brake') || text.includes('brake') || text.includes('pad') || text.includes('rotor') || text.includes('grinding') || text.includes('stopping')) {
    return { id: 'brakes', name: 'Brakes', icon: 'do-not-step' };
  }

  // TIRES & WHEELS
  if (rawCategory.includes('tire') || rawCategory.includes('wheel') || text.includes('tire') || text.includes('tyre') || text.includes('wheel') || text.includes('pressure') || text.includes('alignment') || text.includes('rim') || text.includes('spoke')) {
    return { id: 'tires_wheels', name: 'Tires & Wheels', icon: 'tire-repair' };
  }

  // CHAIN & DRIVE (Motorcycle or Bicycle)
  if (rawCategory.includes('chain') || text.includes('chain') || text.includes('sprocket') || text.includes('drive chain')) {
    return { id: 'chain_drive', name: 'Chain & Drive', icon: 'settings' };
  }

  // ENGINE & OIL (Invalid for bicycles)
  if (!isBicycle && (rawCategory.includes('engine') || rawCategory.includes('oil') || text.includes('oil') || text.includes('engine') || text.includes('filter') || text.includes('lubricat'))) {
    return { id: 'engine_oil', name: 'Engine & Oil', icon: 'build' };
  }

  // COOLING SYSTEM (Invalid for bicycles)
  if (!isBicycle && (rawCategory.includes('cooling') || text.includes('coolant') || text.includes('radiator') || text.includes('overheat') || text.includes('thermostat'))) {
    return { id: 'cooling', name: 'Cooling System', icon: 'ac-unit' };
  }

  // FLUIDS (Invalid for bicycles)
  if (!isBicycle && (rawCategory.includes('fluid') || text.includes('transmission fluid') || text.includes('steering fluid') || text.includes('fluid'))) {
    return { id: 'fluids', name: 'Fluids', icon: 'opacity' };
  }

  // SUSPENSION
  if (rawCategory.includes('suspension') || text.includes('shock') || text.includes('strut') || text.includes('suspension') || text.includes('fork') || text.includes('steering')) {
    return { id: 'suspension', name: 'Suspension', icon: 'tune' };
  }

  // EXHAUST (Invalid for bicycles)
  if (!isBicycle && (rawCategory.includes('exhaust') || text.includes('muffler') || text.includes('exhaust') || text.includes('catalytic') || text.includes('emission'))) {
    return { id: 'exhaust', name: 'Exhaust', icon: 'cloud' };
  }

  // GEARS & DRIVETRAIN
  if (rawCategory.includes('gear') || text.includes('gear') || text.includes('derailleur') || text.includes('drivetrain') || text.includes('shifter')) {
    return { id: 'gears_drivetrain', name: 'Gears & Drivetrain', icon: 'settings' };
  }

  // BEARINGS & HUBS
  if (rawCategory.includes('bearing') || text.includes('bearing') || text.includes('hub')) {
    return { id: 'bearings', name: 'Bearings & Hubs', icon: 'radio-button-checked' };
  }

  // LIGHTS & ELECTRICAL (Invalid for bicycles)
  if (!isBicycle && (rawCategory.includes('light') || text.includes('light') || text.includes('headlight') || text.includes('signal') || text.includes('bulb'))) {
    return { id: 'lights', name: 'Lights & Electrical', icon: 'lightbulb-outline' };
  }

  // Dynamic fallback for custom category strings returned by AI
  if (rawCategory && rawCategory !== 'diagnostic' && rawCategory !== 'maintenance' && rawCategory !== 'safety' && rawCategory !== 'visibility') {
    const slug = rawCategory.replace(/[^a-z0-9]/g, '_');
    const name = item.category.charAt(0).toUpperCase() + item.category.slice(1);
    return { id: slug, name, icon: 'build' };
  }

  return { id: 'general', name: 'General', icon: isBicycle ? 'directions-bike' : isMotorcycle ? 'motorcycle' : 'directions-car' };
};

/**
 * Map item to a category ID dynamically.
 */
export const mapItemToCategoryId = (item, vehicleProfile) => {
  const catObj = getCategoryFromDiagnosticItem(item, vehicleProfile);
  return catObj.id;
};

/**
 * Get dynamic category list based on vehicle profile AND AI recommendations.
 */
export const getVehicleMaintenanceCategories = (vehicleProfile, recommendations = []) => {
  const normalizedType = resolveVehicleTypeString(vehicleProfile).toLowerCase();

  let baseCategoryIds = [];

  // BICYCLE / BIKE
  if (normalizedType.includes('bike') || normalizedType.includes('bicycle') || normalizedType.includes('cycle')) {
    baseCategoryIds = [
      'brakes',
      'tires_wheels',
      'chain_drive',
      'gears_drivetrain',
      'bearings',
      'general',
    ];
  } else if (normalizedType.includes('moto') || normalizedType.includes('motor') || normalizedType.includes('scooter')) {
    // MOTORCYCLE / SCOOTER
    baseCategoryIds = [
      'engine_oil',
      'brakes',
      'electrical',
      'tires_wheels',
      'chain_drive',
      'fluids',
      'lights',
      'general',
    ];
  } else {
    // CAR / TRUCK / DEFAULT
    baseCategoryIds = [
      'engine_oil',
      'brakes',
      'electrical',
      'tires_wheels',
      'fluids',
      'cooling',
      'lights',
      'general',
    ];
  }

  const categorySet = new Set(baseCategoryIds);

  // Dynamically inject any additional AI-discovered categories present in recommendations!
  (recommendations || []).forEach(item => {
    const catId = mapItemToCategoryId(item, vehicleProfile);
    if (catId && catId !== 'general') {
      categorySet.add(catId);
    }
  });

  return Array.from(categorySet).map(id => {
    if (CATEGORY_CONFIG[id]) return CATEGORY_CONFIG[id];
    return {
      id,
      name: id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      icon: 'build',
    };
  });
};

/**
 * Guarantee a structured step-by-step guide object for any recommendation item.
 */
export const ensureRecommendationGuide = (item, vehicleProfile) => {
  if (!item) return null;

  if (item.guide && Array.isArray(item.guide.steps) && item.guide.steps.length > 0) {
    return item.guide;
  }

  const titleText = `${item.title || ''}`.toLowerCase();
  const problemText = `${item.relatedProblem || ''}`.toLowerCase();
  const vehicleType = resolveVehicleTypeString(vehicleProfile).toLowerCase();

  const isBicycle = vehicleType.includes('bike') || vehicleType.includes('bicycle');
  const isMotorcycle = vehicleType.includes('moto') || vehicleType.includes('motor') || vehicleType.includes('scooter');

  // BATTERY / ELECTRICAL GUIDE
  if (titleText.includes('battery') || problemText.includes('starting') || problemText.includes('click')) {
    return {
      difficulty: 'Easy',
      estimatedTime: '10-15 minutes',
      whyItMatters:
        'Loose, corroded, or weak battery connections restrict electrical current flow and can cause clicking sounds, slow starting, or complete electrical failure.',
      tools: ['Protective gloves', 'Clean cloth', 'Wire brush or terminal cleaner', '10mm wrench or socket set'],
      safetyNotes: [
        'Turn the ignition switch completely OFF before touching electrical components.',
        'Keep metal wrenches away from contacting both battery terminals simultaneously.',
        'Wear protective gloves and eye protection if corrosion is present.',
      ],
      steps: [
        {
          number: 1,
          title: 'Turn Off Ignition & Ensure Safety',
          instructions: 'Park the vehicle on flat ground, engage the parking brake, and turn the ignition switch completely OFF.',
          check: 'The instrument panel, headlights, and all electrical accessories must be completely off.',
        },
        {
          number: 2,
          title: `Locate ${isMotorcycle ? 'Motorcycle' : 'Vehicle'} Battery`,
          instructions: isMotorcycle
            ? 'Find the battery compartment, usually located under the seat or behind the side fairing panel.'
            : 'Open the hood and locate the vehicle battery in the engine compartment.',
          check: 'You should see the battery casing with red positive (+) and black negative (-) terminal covers.',
        },
        {
          number: 3,
          title: 'Inspect Terminal Connections for Corrosion',
          instructions: 'Remove terminal covers and check for white/blue powder buildup, corrosion, or loose clamp bolts.',
          warning: 'Do not touch heavy battery acid corrosion with bare hands.',
          check: 'Verify if terminal clamps wiggle easily by hand.',
        },
        {
          number: 4,
          title: 'Clean & Tighten Terminal Clamps',
          instructions: 'Use a wire brush to scrub off corrosion. Use a 10mm wrench to securely tighten the terminal bolts.',
          check: 'Both terminal clamps should be firmly fixed to the battery posts without any movement.',
        },
        {
          number: 5,
          title: 'Reinstall Covers & Test Electrical System',
          instructions: 'Replace protective rubber covers onto terminals. Turn key to ON and attempt to start the vehicle.',
          check: 'The vehicle engine should crank smoothly without clicking sounds.',
        },
      ],
      completionCheck: {
        title: 'Test Vehicle Start',
        instructions: 'Turn ignition ON and verify that all electrical components operate normally.',
      },
      outcomes: {
        success: 'Vehicle started smoothly and electrical issue is resolved.',
        failure: 'Issue persists; battery testing or starter relay replacement may be required.',
      },
    };
  }

  // BRAKES GUIDE
  if (titleText.includes('brake') || problemText.includes('braking') || problemText.includes('grinding')) {
    return {
      difficulty: 'Medium',
      estimatedTime: '15-20 minutes',
      whyItMatters:
        'Worn brake pads or loose calipers reduce braking efficiency, increase stopping distance, and can cause permanent rotor damage.',
      tools: ['Flashlight', 'Measuring gauge / ruler', 'Protective gloves', 'Clean rag'],
      safetyNotes: [
        'Ensure the vehicle is fully parked and stable before inspecting brakes.',
        'Never touch brake components immediately after riding/driving as they get extremely hot.',
      ],
      steps: [
        {
          number: 1,
          title: 'Park Vehicle on Stable Ground',
          instructions: 'Park on a level surface, turn off the engine, and allow brake components to cool down.',
          check: 'Rotors and calipers must be cool to the touch.',
        },
        {
          number: 2,
          title: 'Visually Inspect Brake Pad Friction Material',
          instructions: 'Shine a flashlight through the caliper assembly to observe the remaining brake pad thickness.',
          check: 'Friction material should be greater than 3mm thickness. Less than 2mm requires immediate pad replacement.',
        },
        {
          number: 3,
          title: 'Inspect Rotor Surface for Grooves',
          instructions: 'Look closely at the metallic brake rotor surface for deep scores, rust, or uneven wear ridges.',
          warning: 'Deep scoring indicates metal-to-metal contact requiring rotor resurfacing or replacement.',
          check: 'Rotor surface should appear relatively smooth.',
        },
        {
          number: 4,
          title: 'Test Brake Lever / Pedal Firmness',
          instructions: isBicycle || isMotorcycle
            ? 'Squeeze the handlebar brake levers firmly and observe lever travel and resistance.'
            : 'Depress the brake pedal firmly and verify pedal feel.',
          check: 'Brake feel should be firm and responsive, not spongy or soft.',
        },
      ],
      completionCheck: {
        title: 'Perform Low-Speed Brake Test',
        instructions: 'Test brakes at very low speed in a safe parking area.',
      },
      outcomes: {
        success: 'Brakes respond firmly with no noise.',
        failure: 'Brakes feel soft or produce grinding noise; professional service recommended.',
      },
    };
  }

  // TIRES GUIDE
  if (titleText.includes('tire') || titleText.includes('pressure') || problemText.includes('tire')) {
    return {
      difficulty: 'Easy',
      estimatedTime: '5-10 minutes',
      whyItMatters:
        'Correct tire pressure ensures optimal traction, extends tread life, improves fuel efficiency, and prevents sudden tire blowouts.',
      tools: ['Tire pressure gauge', 'Air pump / inflator'],
      safetyNotes: [
        'Check tire pressure when tires are cold for accurate readings.',
        'Do not inflate beyond maximum PSI stamped on tire sidewall.',
      ],
      steps: [
        {
          number: 1,
          title: 'Locate Recommended PSI Rating',
          instructions: isBicycle || isMotorcycle
            ? 'Read the recommended PSI pressure printed directly on the tire sidewall or vehicle frame plaque.'
            : 'Check the tire information placard on the driver-side door jamb for front/rear cold tire pressures.',
          check: 'Note the exact PSI number (e.g. 33 PSI).',
        },
        {
          number: 2,
          title: 'Unscrew Valve Cap & Attach Pressure Gauge',
          instructions: 'Remove the dust cap on the wheel valve stem and press the pressure gauge firmly onto the valve.',
          check: 'Read the gauge measurement and compare with the recommended PSI.',
        },
        {
          number: 3,
          title: 'Adjust Inflation as Necessary',
          instructions: 'Add compressed air using an inflator if pressure is low, or press the valve core briefly to release air if over-inflated.',
          check: 'Re-measure until reading matches target PSI.',
        },
        {
          number: 4,
          title: 'Re-install Valve Caps & Inspect Tread Surface',
          instructions: 'Screw dust caps back tightly. Inspect tread pattern for embedded nails, cracks, or excessive wear.',
          check: 'Ensure valve caps are secure on all tires.',
        },
      ],
      completionCheck: {
        title: 'Verify All Tires',
        instructions: 'Confirm all tires match recommended pressure specifications.',
      },
      outcomes: {
        success: 'Tire pressures are set to specification.',
        failure: 'Tire continues to lose pressure; puncture repair required.',
      },
    };
  }

  // CHAIN & DRIVE GUIDE (Motorcycle or Bicycle)
  if (titleText.includes('chain') || problemText.includes('chain')) {
    return {
      difficulty: 'Easy',
      estimatedTime: '10-15 minutes',
      whyItMatters:
        'A clean, properly lubricated chain ensures smooth power transfer, reduces shifting effort, and prevents chain snap or derailment.',
      tools: ['Chain lubricant spray', 'Degreaser / rag', 'Nylon chain brush'],
      safetyNotes: [
        'Keep fingers completely clear of moving sprockets and gears.',
        'Never clean chain with the engine running or in gear.',
      ],
      steps: [
        {
          number: 1,
          title: 'Position Vehicle for Inspection',
          instructions: 'Place motorcycle or bicycle on its center stand or kickstand on level ground with engine switched off.',
          check: 'Rear wheel should rotate freely by hand.',
        },
        {
          number: 2,
          title: 'Clean Dirt and Old Grease from Chain',
          instructions: 'Apply chain cleaner or degreaser and scrub chain links with a nylon brush. Wipe dry with a clean cloth.',
          check: 'Remove grit, road dirt, and caked grease.',
        },
        {
          number: 3,
          title: 'Inspect Chain Slack & Sprocket Teeth',
          instructions: 'Push chain midway between sprockets to measure vertical slack. Inspect sprocket teeth for hooking or wear.',
          check: 'Chain slack should be within 25-35mm.',
        },
        {
          number: 4,
          title: 'Apply Fresh Chain Lubricant',
          instructions: 'Slowly rotate the rear wheel by hand while spraying lubricant evenly along the inside row of chain rollers.',
          check: 'All chain links should have a light, uniform coat of lubricant.',
        },
      ],
      completionCheck: {
        title: 'Test Drivetrain Operation',
        instructions: 'Rotate rear wheel manually to verify smooth, quiet movement.',
      },
      outcomes: {
        success: 'Chain operates smoothly without noise.',
        failure: 'Chain remains noisy or loose; tension adjustment required.',
      },
    };
  }

  // GENERAL DEFAULT GUIDE
  return {
    difficulty: 'Easy',
    estimatedTime: '10-15 minutes',
    whyItMatters: `Routine maintenance and inspection of ${item.title || 'vehicle components'} prevents unexpected mechanical failures and maintains safety.`,
    tools: ['Flashlight', 'Protective gloves', 'Basic tool set'],
    safetyNotes: [
      'Ensure vehicle engine is turned OFF before performing inspections.',
      'Allow hot engine or brake components to cool down.',
    ],
    steps: [
      {
        number: 1,
        title: 'Prepare Vehicle and Workspace',
        instructions: `Park your ${vehicleType || 'vehicle'} on flat, stable ground. Ensure ignition is switched OFF.`,
        check: 'Vehicle should be secure and motionless.',
      },
      {
        number: 2,
        title: `Inspect ${item.title || 'Component'} Condition`,
        instructions: `Visually inspect ${item.title || 'component'} for signs of wear, looseness, fluid leaks, or damage.`,
        check: 'Verify all mountings and connections are intact.',
      },
      {
        number: 3,
        title: 'Perform Cleaning or Required Adjustment',
        instructions: `Follow recommended maintenance procedures to clean, adjust, or service the ${item.title || 'component'}.`,
        check: 'Ensure all fasteners are properly tightened.',
      },
      {
        number: 4,
        title: 'Final Operation Verification',
        instructions: 'Turn vehicle ON and perform a brief functional check to confirm proper operation.',
        check: 'Component should function without abnormal noise or warning indicators.',
      },
    ],
    completionCheck: {
      title: 'Functional Check',
      instructions: 'Verify component operates as expected.',
    },
    outcomes: {
      success: 'Inspection completed successfully.',
      failure: 'Further service or repair may be required.',
    },
  };
};
