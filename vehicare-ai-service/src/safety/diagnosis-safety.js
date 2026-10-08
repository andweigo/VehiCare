const CRITICAL_KEYWORDS = [
  'brake failure',
  'no brakes',
  'brakes failed',
  'brakes not working',
  'fuel leak',
  'gasoline leak',
  'petrol leak',
  'engine fire',
  'smoke under hood',
  'heavy smoke',
  'steering failure',
  'cannot steer',
  'steering locked',
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

  const needsProfessional = ['HIGH', 'CRITICAL'].includes(result.severity) || professionalHelp.requires_specialist;
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
