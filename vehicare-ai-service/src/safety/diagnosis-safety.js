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

  result.professional_help = professionalHelp;
  return result;
};
