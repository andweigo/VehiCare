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

  if (isHighRiskSymptom) {
    result.severity = 'CRITICAL';
    result.urgency = 'CRITICAL: Stop operating the vehicle safely and request immediate technical/towing assistance.';
    if (!result.professional_help) {
      result.professional_help = {};
    }
    result.professional_help.recommended = true;
    result.professional_help.severity = 'CRITICAL';
    if (!result.professional_help.reason || result.professional_help.reason.includes('recommended')) {
      result.professional_help.reason = 'Immediate professional inspection required due to high-risk vehicle safety hazard.';
    }
  }

  // Ensure high/critical severity always triggers professional help recommendation
  if (['HIGH', 'CRITICAL'].includes(result.severity)) {
    if (!result.professional_help) {
      result.professional_help = { recommended: true, reason: 'High severity vehicle issue detected.', severity: result.severity };
    } else {
      result.professional_help.recommended = true;
    }
  }

  return result;
};
