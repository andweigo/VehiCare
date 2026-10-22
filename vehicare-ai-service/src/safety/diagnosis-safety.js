const CRITICAL_KEYWORDS = [
  'brake failure',
  'no brakes',
  'brakes failed',
  'brakes not working',
  'brake pedal goes to the floor',
  'brake fluid leak',
  'brake fluid leaking',
  'fuel leak',
  'gasoline leak',
  'petrol leak',
  'smell of gasoline',
  'smell of petrol',
  'engine fire',
  'vehicle fire',
  'fire under hood',
  'smoke under hood',
  'smoke from engine',
  'heavy smoke',
  'steering failure',
  'cannot steer',
  'steering locked',
  'steering wheel locked',
  'electrical fire',
  'burning smell',
  'severe overheating',
  'coolant boiling',
];

export const applySafetyRules = (diagnosisData, symptomsText) => {
  const lowerSymptoms = (symptomsText || '').toLowerCase();
  const isHighRiskSymptom = CRITICAL_KEYWORDS.some((kw) => lowerSymptoms.includes(kw));
  const isBrakeRelated =
    lowerSymptoms.includes('brake') ||
    String(diagnosisData.summary || '').toLowerCase().includes('brake') ||
    String(diagnosisData.whats_happening || '').toLowerCase().includes('brake') ||
    (Array.isArray(diagnosisData.possible_causes) && diagnosisData.possible_causes.some(c => String(c?.cause || '').toLowerCase().includes('brake')));

  const isBrakeGrindingOrWeak = isBrakeRelated && (
    lowerSymptoms.includes('grind') ||
    lowerSymptoms.includes('scraping') ||
    lowerSymptoms.includes('weak') ||
    lowerSymptoms.includes('spongy') ||
    lowerSymptoms.includes('soft pedal') ||
    lowerSymptoms.includes('soft lever') ||
    lowerSymptoms.includes('pulling')
  );

  const result = { ...diagnosisData };
  const professionalHelp = {
    recommended: false,
    requires_specialist: Boolean(result.professional_help?.requires_specialist),
    reason: '',
    severity: result.severity || 'MODERATE',
    ...result.professional_help,
  };

  if (isHighRiskSymptom) {
    result.severity = 'CRITICAL';
    result.urgency = 'CRITICAL: Stop operating the vehicle safely and request immediate technical/towing assistance.';
  } else if (isBrakeGrindingOrWeak && result.severity !== 'CRITICAL') {
    result.severity = 'HIGH';
    result.urgency = 'HIGH: Stop operating the vehicle safely and arrange an immediate brake inspection.';
  }

  if (result.severity === 'CRITICAL') {
    result.urgency = 'CRITICAL: Stop operating the vehicle safely and request immediate technical/towing assistance.';
    if (result.status === 'needs_clarification') {
      result.response = 'Your symptoms may indicate an immediate safety risk. Stop operating the vehicle when safe, keep clear of smoke, fire, or leaking fuel, and contact roadside assistance or emergency services as appropriate.';
      result.clarification_questions = [{
        question: 'Are you safely stopped and away from traffic, smoke, fire, and fuel leaks?',
        options: ['Yes', 'No'],
      }];
    }
    result.recommended_actions = [
      'Stop the vehicle in a safe location and do not continue driving.',
      'Keep clear of smoke, fire, and leaking fuel; do not attempt a repair.',
      'Contact roadside assistance or emergency services as appropriate.',
    ];
    result.maintenance_tasks = [];
    result.smart_recommendations = [];
    result.repair_guidance = null;
    professionalHelp.reason = 'Immediate professional inspection is required because this may be a serious safety hazard.';
  }

  const needsProfessional = ['HIGH', 'CRITICAL'].includes(result.severity) || professionalHelp.requires_specialist;
  if (result.severity === 'HIGH') {
    result.urgency = 'HIGH: Arrange prompt professional inspection and do not operate the vehicle if it may be unsafe.';
    if (result.status === 'needs_clarification') {
      result.response = 'This may involve a serious safety concern. Arrange prompt professional inspection and avoid operating the vehicle if braking, steering, smoke, fire, or fuel symptoms are present.';
    }
    result.recommended_actions = [
      'Arrange prompt inspection by a qualified automotive professional.',
      'Avoid operating the vehicle if braking, steering, smoke, fire, or fuel symptoms are present.',
    ];
    result.maintenance_tasks = [];
    result.smart_recommendations = [];
    result.repair_guidance = null;
    professionalHelp.reason = 'Professional inspection is advised because this issue may be unsafe or cause further damage.';
  }
  professionalHelp.recommended = needsProfessional;
  professionalHelp.severity = result.severity || 'MODERATE';

  if (!needsProfessional) {
    professionalHelp.reason = '';
  } else if (!professionalHelp.reason) {
    professionalHelp.reason = result.severity === 'CRITICAL'
      ? 'Immediate professional inspection is required because this may be a serious safety hazard.'
      : result.severity === 'HIGH'
        ? 'Professional inspection is advised because this issue may be unsafe or cause further damage.'
        : 'This repair may require specialist tools or training beyond routine owner maintenance.';
  }

  if (isBrakeRelated) {
    if (isBrakeGrindingOrWeak || result.severity === 'HIGH' || result.severity === 'CRITICAL') {
      result.safety_guidance = 'Because brakes are a critical safety system, grinding or abnormal braking feel indicates severe component wear or failure risk. Stop in a safe location and arrange professional inspection rather than continuing travel.';
    } else {
      const guidance = result.safety_guidance || '';
      if (!guidance || guidance.toLowerCase().includes('safe to continue') || guidance.toLowerCase().includes('short distances')) {
        result.safety_guidance = 'Brakes are a critical safety system. Avoid high speeds or hard driving and arrange a prompt inspection. If the sound turns to grinding, braking feels weaker, or the brake behaves abnormally, stop in a safe place and arrange an inspection rather than assuming continued travel is safe.';
      }
    }
  }

  result.professional_help = professionalHelp;
  return result;
};
