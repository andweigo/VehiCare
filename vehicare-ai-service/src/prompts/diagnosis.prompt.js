export const isGeneralQuestion = (symptomsText) => {
  if (!symptomsText || typeof symptomsText !== 'string') return true;

  const text = symptomsText.toLowerCase().trim();
  const wordCount = text.split(/\s+/).length;

  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'kumusta', 'kamusta', 'help'];
  if (greetings.includes(text) || (wordCount <= 2 && greetings.some(g => text.startsWith(g)))) {
    return true;
  }

  const generalKeywords = [
    'what is', 'what are', 'how to maintain', 'how do i maintain', 'how does', 'why do',
    'function of', 'purpose of', 'schedule', 'maintenance tip', 'explain', 'meaning of'
  ];

  const diagnosticKeywords = [
    'smoke', 'leak', 'noise', 'sound', 'squeak', 'grind', 'knock', 'rattle', 'whine',
    'light', 'indicator', 'won\'t start', 'cannot start', 'wont start', 'overheating',
    'smell', 'vibrate', 'shaking', 'slip', 'broken', 'damaged', 'stuck', 'failed',
    'defective', 'problem', 'issue', 'symptom', 'fault'
  ];

  const hasDiagnosticWord = diagnosticKeywords.some(kw => text.includes(kw));
  if (hasDiagnosticWord) {
    return false;
  }

  const hasGeneralWord = generalKeywords.some(kw => text.includes(kw));
  if (hasGeneralWord && wordCount <= 12) {
    return true;
  }

  return false;
};

export const formatHistory = (history = [], maxTurns = 4) => {
  if (!Array.isArray(history) || history.length === 0) {
    return '';
  }

  // Use only recent turns
  const recentTurns = history.slice(-maxTurns);
  const turns = recentTurns
    .map((turn) => {
      const role = (turn.role || '').toLowerCase() === 'user' ? 'User' : 'VehiCare AI';
      const content = (turn.content || turn.text || '').trim();
      return content ? `${role}: ${content}` : null;
    })
    .filter(Boolean);

  if (turns.length === 0) return '';
  return `\n\nRECENT CONVERSATION HISTORY:\n${turns.join('\n')}`;
};

export const buildCompactGeneralPrompt = ({ vehicleContext, symptoms, userLanguage, history = [] }) => {
  const vType = vehicleContext.type || 'Vehicle';
  const vBrand = vehicleContext.brand || 'Unknown';
  const vModel = vehicleContext.model || 'Unknown';
  const vYear = vehicleContext.year || 'Unknown';

  const langInstruction = matchLanguage(userLanguage);
  const historyText = formatHistory(history, 3);

  return `You are VehiCare AI, a helpful automotive maintenance and general vehicle assistant.

VEHICLE: ${vYear} ${vBrand} ${vModel} (${vType})
${langInstruction}
${historyText}

USER QUESTION:
"${symptoms}"

INSTRUCTIONS:
1. Stay strictly within the vehicle/automotive domain.
2. Provide a helpful, clear, and concise answer.
3. Return ONLY valid JSON format. No markdown code blocks or extra text outside JSON.

JSON RESPONSE FORMAT:
{
  "type": "conversation",
  "status": "conversation",
  "response": "Your concise, helpful response here."
}`;
};

export const buildDiagnosisPrompt = ({ vehicleContext, symptoms, userLanguage, history = [], hasMedia = false }) => {
  if (!hasMedia && isGeneralQuestion(symptoms)) {
    return buildCompactGeneralPrompt({ vehicleContext, symptoms, userLanguage, history });
  }

  const vType = vehicleContext.type || 'Vehicle';
  const vBrand = vehicleContext.brand || 'Unknown';
  const vModel = vehicleContext.model || 'Unknown';
  const vYear = vehicleContext.year || 'Unknown';

  const langInstruction = matchLanguage(userLanguage);
  const historyText = formatHistory(history, 4);

  const mediaInstruction = hasMedia
    ? 'MEDIA ATTACHED: Carefully inspect visible leaks, warning indicators, component wear, smoke, or damage.'
    : 'NO MEDIA ATTACHED: Base diagnosis on reported symptoms.';

  return `You are VehiCare AI, an expert automotive diagnostic and maintenance assistant.

VEHICLE INFORMATION:
Type: ${vType}
Brand: ${vBrand}
Model: ${vModel}
Year: ${vYear}

${langInstruction}
${historyText}

CURRENT USER SYMPTOM / ISSUE:
"${symptoms}"

MEDIA:
${mediaInstruction}

DOMAIN & SAFETY RULES:
- Focus strictly on vehicle diagnostics, repairs, maintenance, and safety.
- For general greetings or basic vehicle questions without symptoms, set type="conversation".
- For reported faults, symptoms, sounds, warning lights, or leaks, set type="diagnostic".

CONFIDENCE SCORING:
- 90-100: Very strong symptom match and conclusive details
- 75-89: Strong assessment with good supporting evidence
- 55-74: Reasonable assessment with multiple possibilities remaining
- 30-54: Limited evidence
- 0-29: Insufficient information

POSSIBLE CAUSES:
- Maximum 5 causes ordered by diagnostic likelihood.
- Each cause MUST have likelihood (HIGH, MEDIUM, LOW) and likelihood_score (0-100).

RESPONSE FORMAT:
Return ONLY valid JSON. No markdown code blocks. No text outside JSON.

For CONVERSATION:
{
  "type": "conversation",
  "status": "conversation",
  "response": "Helpful AI response"
}

For DIAGNOSTIC:
{
  "type": "diagnostic",
  "status": "diagnosis_ready",
  "confidence": {
    "score": 85,
    "level": "HIGH",
    "reason": "Brief explanation of assessment confidence based on symptoms."
  },
  "summary": "Short diagnostic summary",
  "reported": ["${symptoms}"],
  "observed": [],
  "severity": "MODERATE",
  "urgency": "Urgency recommendation",
  "possible_causes": [
    {
      "cause": "Possible Component Cause",
      "likelihood": "HIGH",
      "likelihood_score": 85,
      "reason": "Reasoning for cause"
    }
  ],
  "recommended_actions": [
    "Safe action step"
  ],
  "clarification_questions": [
    {
      "question": "Clarification question if helpful",
      "options": ["Option 1", "Option 2"]
    }
  ],
  "estimated_cost": {
    "min": 1000,
    "max": 3500,
    "currency": "PHP"
  },
  "professional_help": {
    "recommended": false,
    "reason": "Reason for recommendation",
    "severity": "MODERATE"
  }
}`;
};

const matchLanguage = (lang) => {
  const l = (lang || 'en').toLowerCase();
  if (l === 'fil') return 'MANDATORY LANGUAGE: Filipino/Tagalog. Respond naturally in Filipino.';
  if (l === 'taglish') return 'MANDATORY LANGUAGE: Taglish. Respond naturally using a conversational mix of Tagalog and English.';
  return 'LANGUAGE: Detect user language or default to English.';
};
