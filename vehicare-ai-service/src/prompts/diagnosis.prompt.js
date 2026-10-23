import { extractEstablishedFacts, extractPreviousQuestions } from '../services/question-dedup.js';

export const isGeneralQuestion = (symptomsText, history = [], diagnosticState = null) => {
  if (!symptomsText || typeof symptomsText !== 'string') return true;

  // If there is prior conversation history with diagnostic turns or active diagnostic state,
  // do NOT classify as general question: it is a diagnostic follow-up/clarification answer!
  const hasHistory = Array.isArray(history) && history.length > 0;
  const hasDiagnosticAssessments = Array.isArray(diagnosticState?.assessments) && diagnosticState.assessments.length > 0;
  if (hasHistory || hasDiagnosticAssessments) {
    return false;
  }

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

export const formatHistory = (history = [], maxTurns = 4, currentSymptom = '') => {
  if (!Array.isArray(history) || history.length === 0) {
    return '';
  }

  const normalizedCurrent = String(currentSymptom || '').trim().toLowerCase();
  const filtered = history.filter((turn, idx) => {
    const text = String(turn?.content || turn?.text || '').trim();
    if (!text) return false;
    // Skip synthetic welcome messages
    if (/^(hello|kamusta).*ready to analyze/i.test(text)) return false;
    // Avoid duplicating the current user symptom if it was already appended as the last history item
    if (
      idx === history.length - 1 &&
      (turn?.role || '').toLowerCase() === 'user' &&
      normalizedCurrent &&
      text.toLowerCase() === normalizedCurrent
    ) {
      return false;
    }
    return true;
  });

  const recentTurns = filtered.slice(-maxTurns);
  const turns = recentTurns
    .map((turn) => {
      const role = (turn.role || '').toLowerCase() === 'user' ? 'User' : 'VehiCare AI';
      let content = (turn.content || turn.text || '').trim();
      const maxLen = role === 'VehiCare AI' ? 220 : 280;
      if (content.length > maxLen) {
        content = `${content.slice(0, maxLen - 3)}...`;
      }
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
2. Tailor your answer specifically to the selected vehicle (${vYear} ${vBrand} ${vModel} - ${vType}) and its vehicle type, components, and specifications. Never give generic or mismatched advice for a different vehicle type or model.
3. Provide a helpful, clear, and concise answer.
4. Return ONLY valid JSON format. No markdown code blocks or extra text outside JSON.

JSON RESPONSE FORMAT:
{
  "type": "conversation",
  "status": "conversation",
  "response": "Your concise, helpful response here."
}`;
};

export const formatHistoricalContext = (context = {}) => {
  if (!context || typeof context !== 'object') return '';
  const { recent_repairs = [], recent_maintenance = [], past_diagnostics = [] } = context;

  const sections = [];

  if (Array.isArray(recent_repairs) && recent_repairs.length > 0) {
    const repairsList = recent_repairs
      .slice(0, 3)
      .map(r => `  - [CONFIRMED REPAIR on ${r.date || 'past date'}]: ${String(r.title || '').slice(0, 120)} (Problem: ${String(r.problem || 'N/A').slice(0, 120)}, Solution: ${String(r.solution || 'N/A').slice(0, 120)}, Status: ${r.status})`)
      .join('\n');
    sections.push(`CONFIRMED PAST REPAIRS:\n${repairsList}`);
  }

  if (Array.isArray(recent_maintenance) && recent_maintenance.length > 0) {
    const maintList = recent_maintenance
      .slice(0, 3)
      .map(m => `  - [MAINTENANCE RECORD on ${m.date || 'past date'}]: ${String(m.title || '').slice(0, 120)} (${m.service_type || 'General Service'}, Status: ${m.status})`)
      .join('\n');
    sections.push(`RECORDED VEHICLE MAINTENANCE:\n${maintList}`);
  }

  if (Array.isArray(past_diagnostics) && past_diagnostics.length > 0) {
    const diagList = past_diagnostics
      .slice(0, 3)
      .map(d => `  - [PAST UNCONFIRMED HYPOTHESIS on ${d.date || 'past date'}]: Reported "${String(d.symptoms || '').slice(0, 140)}" -> Suspected: ${(d.suspected_causes || []).slice(0, 3).join(', ') || 'N/A'}`)
      .join('\n');
    sections.push(`PAST DIAGNOSTIC HYPOTHESES (Suspected Only, NOT Confirmed Repairs):\n${diagList}`);
  }

  if (sections.length === 0) return '';

  return `\n\nAUTHORIZED SAVED VEHICLE HISTORY:
${sections.join('\n\n')}

HISTORY SYNTHESIS RULES:
- Use this history to provide continuity if relevant to current symptoms (e.g. if a component was recently serviced or if symptoms recur).
- NEVER invent historical events not listed above.
- NEVER treat an unconfirmed past diagnostic hypothesis as a confirmed repair.
- If relevant, include a concise note in "history_insights". If history is unrelated to current issue, leave "history_insights" null.`;
};

export const buildDiagnosisPrompt = ({
  vehicleContext,
  symptoms,
  rootSymptom = null,
  userLanguage,
  history = [],
  hasMedia = false,
  inputType = 'text',
  mediaMime = '',
  entitlements = {},
  historicalContext = {},
  diagnosticState = { assessments: [] },
  isAlternateVehicle = false,
  targetVehicleDesc = null,
}) => {
  if (!hasMedia && isGeneralQuestion(symptoms, history, diagnosticState)) {
    return buildCompactGeneralPrompt({ vehicleContext, symptoms, userLanguage, history });
  }

  const vType = vehicleContext.type || 'Vehicle';
  const vBrand = vehicleContext.brand || 'Unknown';
  const vModel = vehicleContext.model || 'Unknown';
  const vYear = vehicleContext.year || 'Unknown';

  const langInstruction = matchLanguage(userLanguage);
  const historyText = formatHistory(history, 4, symptoms);

  const isPremium = Boolean(entitlements?.is_premium || entitlements?.plan === 'premium');
  const historyContextText = isPremium ? formatHistoricalContext(historicalContext) : '';
  const compactAssessments = Array.isArray(diagnosticState?.assessments) && diagnosticState.assessments.length
    ? diagnosticState.assessments.slice(-2).map((a) => ({
        status: a.status || undefined,
        summary: typeof a.summary === 'string' ? a.summary.slice(0, 150) : undefined,
        possible_causes: Array.isArray(a.possible_causes)
          ? a.possible_causes.slice(0, 3).map((c) => ({
              cause: c.cause || c.title || undefined,
              likelihood: c.likelihood || undefined,
            }))
          : undefined,
      }))
    : null;
  const diagnosticStateText = compactAssessments && compactAssessments.length
    ? `\n\n    PRIOR STRUCTURED DIAGNOSTIC STATE (unverified prior AI hypotheses):\n${JSON.stringify(compactAssessments)}`
    : '';

  const modalityInstructions = {
    image: 'Analyze the image only for visible evidence: identify components or warning indicators only when recognizable, describe visible damage/leaks/wear, and state when the image is unclear. Do not infer sounds or hidden mechanical faults.',
    video: 'Analyze the video over time, including visible changes and any audible sounds. Refer to approximate timestamps when useful. Distinguish what is seen/heard from possible causes; do not claim a component is faulty unless evidence supports it.',
    voice: 'Analyze the voice/audio recording: The recording may contain a spoken consultation from the user describing vehicle symptoms, concerns, or history (in English, Filipino/Tagalog, or Taglish), acoustic vehicle sounds (e.g. engine ticking, squealing, knocking, grinding, rattling, exhaust noises), or a combination of both. If speech is present, transcribe and extract the user\'s spoken symptoms and include them in "reported". If vehicle sounds are audible, describe their acoustic characteristics and pattern in "observed". Synthesize both spoken user symptoms and acoustic observations into the diagnostic assessment. Do not claim visual observations.',
    audio: 'Analyze the voice/audio recording: The recording may contain a spoken consultation from the user describing vehicle symptoms, concerns, or history (in English, Filipino/Tagalog, or Taglish), acoustic vehicle sounds (e.g. engine ticking, squealing, knocking, grinding, rattling, exhaust noises), or a combination of both. If speech is present, transcribe and extract the user\'s spoken symptoms and include them in "reported". If vehicle sounds are audible, describe their acoustic characteristics and pattern in "observed". Synthesize both spoken user symptoms and acoustic observations into the diagnostic assessment. Do not claim visual observations.',
  };
  const modality = inputType === 'voice' ? 'voice' : inputType;
  const mediaInstruction = hasMedia
    ? `${modalityInstructions[modality] || 'Analyze the attached media only for evidence supported by its content.'}${mediaMime ? ` Media MIME type: ${mediaMime}.` : ''}`
    : 'NO MEDIA ATTACHED: Base diagnosis on reported symptoms.';

  const isImageInput = hasMedia && (inputType === 'image' || (mediaMime && mediaMime.startsWith('image/')));

  const imageVerificationInstruction = isImageInput
    ? `IMAGE VEHICLE IDENTITY & MATCH VERIFICATION RULES:
- Inspect any vehicle visible in the uploaded image.
- Distinguish the saved vehicle profile (${vYear} ${vBrand} ${vModel}) from the vehicle depicted in the uploaded photo.
- Identify the broad vehicle category (e.g. "sedan", "SUV", "pickup", "motorcycle", "van", "truck") and estimate make/model ONLY when supported by clear visual evidence (badges, distinct body shape). Never invent a definitive model or year from insufficient visual evidence.
- Compare the vehicle in the image against the saved vehicle profile:
  * "match": If the visible vehicle is consistent with ${vBrand} ${vModel}.
  * "possible_mismatch": If the image clearly shows a different category (e.g. motorcycle instead of car), different brand logo, or visibly different vehicle model.
  * "uncertain": If the image is a close-up of a part/engine/wheel, interior, or ambiguous component where overall vehicle identity cannot be verified.
  * "not_applicable": If no vehicle is depicted.
- In JSON response, set "image_vehicle_match" to "match", "possible_mismatch", "uncertain", or "not_applicable".
- Provide "image_vehicle_details": {
    "category": string or null,
    "estimated_make": string or null,
    "estimated_model": string or null,
    "confidence": "high" | "moderate" | "low" | "uncertain",
    "details": "Brief visual notes explaining category or identity inference"
  }
- IF "possible_mismatch":
  * In the response summary, clearly alert the user that the uploaded image appears to depict a different vehicle (state the observed category/make/model vs the saved vehicle).
  * Prompt the user to clarify whether they want to diagnose the vehicle shown in the image or continue with their saved ${vBrand} ${vModel}.
  * Never automatically claim an uncertain image is the saved vehicle.`
    : '';

  const effectiveRootSymptom = rootSymptom && rootSymptom.trim() !== symptoms.trim()
    ? rootSymptom.trim()
    : null;

  const facts = extractEstablishedFacts(history, symptoms, effectiveRootSymptom || symptoms);
  const previousQuestions = extractPreviousQuestions(history, diagnosticState);
  const hasPriorClarification = previousQuestions.length > 0 || Boolean(effectiveRootSymptom);

  const knownFactsList = [
    facts.soundTypes.length > 0 ? `Sound characteristics: ${facts.soundTypes.join(', ')}` : null,
    facts.conditions.length > 0 ? `Operating conditions: ${facts.conditions.join(', ')}` : null,
    facts.locations.length > 0 ? `Reported location: ${facts.locations.join(', ')}` : null,
    facts.brakeApplicationKnown ? `Brake application effect: already described by user` : null,
  ].filter(Boolean);

  const prevQList = previousQuestions.map(q => `  - "${q}"`).join('\n');

  const progressiveInstructions = hasPriorClarification
    ? `\nPROGRESSIVE DIAGNOSIS CONVERSATION RULES:
- The user is participating in an active, progressive diagnostic conversation.
- ALREADY ESTABLISHED FACTS FROM USER:
${knownFactsList.length > 0 ? knownFactsList.map(f => `  * ${f}`).join('\n') : '  * (Initial symptom details)'}
- QUESTIONS ALREADY ASKED (DO NOT REPEAT):
${prevQList || '  * (None yet)'}

MANDATORY RULES FOR PROGRESSIVE FOLLOW-UP:
1. THE RESULT MUST NOT VARY AWAY FROM THE USER'S ANSWER:
   * Directly evaluate what the user's latest answer ("${symptoms}") physically proves or disproves.
   * Example: If the user answered "Lights are very dim or flicker" when pressing the starter/horn:
     - This PROVES electrical current is flowing through the main harness, which immediately RULES OUT a completely blown main fuse! Do NOT keep listing a blown fuse as a likely cause!
     - It proves severe voltage drop under load, directly confirming either an undercharged/dead battery or high resistance at loose/corroded battery terminals.
     - Cite the user's observation ("dimming/flickering lights") in the reasoning for the top plausible causes.
     - Never contradict the user's answer or drift to unrelated systems.
2. NEVER REPEAT THE SAME ANSWER OR CANNED GREETING:
   * DO NOT output "Hey, no worries! We'll figure this out together. Here's what's happening: ..." on follow-up turns!
   * Start directly with the progressive deduction in "whats_happening" and "follow_up_ack":
     "Got it. Because [specific observation], [what it indicates]..."
   * Explicitly state what is ruled out (e.g. "Rules out: Blown main fuse") and what is narrowed down (e.g. "Points directly to: Weak battery or high terminal resistance").
   * Do NOT repeat the exact same cause descriptions or previous safe checks. Tailor checks specifically to verify the narrowed causes (e.g. checking terminal bolt tightness and testing battery resting/cranking voltage).
3. REMEMBER ANSWERED QUESTIONS:
   * If sound type is already known (${facts.soundTypes.join(', ') || 'N/A'}), NEVER ask the user to identify or describe the sound again!
   * NEVER re-ask any previously asked question or rephrase it.
4. ASK AT MOST ONE MEANINGFUL QUESTION (OR CONCLUDE):
   * If further clarification is needed to distinguish causes, ask at most ONE new, high-value question in "clarification_questions" (with 2-4 options A, B, C, D).
   * If 2 or more clarification turns have already been answered, OR if enough facts are known, DO NOT ask any more questions! Set status="diagnosis_ready", clarification_questions=[], and provide the final narrowed assessment.`
    : '';

  const symptomSection = effectiveRootSymptom
    ? `ROOT / ORIGINAL DIAGNOSTIC COMPLAINT:
"${effectiveRootSymptom}"

LATEST USER FOLLOW-UP / ANSWER:
"${symptoms}"

FOLLOW-UP CONTINUITY INSTRUCTIONS:
- The user is answering a clarification question or adding details to the ROOT COMPLAINT.
- Short answers like "yes", "no", "only when hot", "after accelerating", "front right", or "when braking" MUST be interpreted strictly in the context of the clarification question asked and the root complaint.
- Do NOT abandon the original diagnostic topic or switch to a generic conversation.
- Maintain diagnostic continuity and refine causes, severity, and next steps.${progressiveInstructions}`
    : `CURRENT USER SYMPTOM / ISSUE:
"${symptoms}"${progressiveInstructions}`;

  const vehicleIdentityInstruction = isAlternateVehicle || !vehicleContext?.is_saved_vehicle
    ? `DIAGNOSTIC TARGET: TEMPORARY / ALTERNATE VEHICLE (${targetVehicleDesc || `${vYear} ${vBrand} ${vModel}` || 'Alternate Vehicle'})
- The user is diagnosing an alternate vehicle or a vehicle explicitly described in this session.
- Do NOT assume the user's permanent saved vehicle profile or its maintenance history applies to this vehicle.
- If essential technical details (such as engine type, fuel type, or transmission) are needed for accurate diagnosis of this alternate vehicle, ask a concise clarification question.
- Do NOT link this diagnosis to any saved vehicle maintenance schedule.`
    : `SAVED VEHICLE PROFILE: ${vYear} ${vBrand} ${vModel} (${vType})
- Tailor all diagnostic assessments, probable causes, component terminology, safe DIY checks, and follow-up responses specifically to this selected ${vYear} ${vBrand} ${vModel} (${vType}).
- Never reference parts or systems that do not exist on a ${vType} (${vYear} ${vBrand} ${vModel}).`;

  const tierInstruction = isPremium
    ? `SUBSCRIPTION TIER: PREMIUM — ADVANCED VEHICLE CARE
- Provide deeper diagnostic reasoning with specific supporting evidence for each plausible cause.
- Provide 2-3 adaptive clarification questions with multiple-choice options to help narrow down the cause before jumping to repairs.
- Provide comprehensive step-by-step repair guidance in "repair_guidance" (concise, maximum 4-6 clear actionable steps):
  {
    "difficulty": "Beginner" | "Intermediate" | "Advanced" | "Professional Only",
    "diy_friendly": true | false,
    "estimated_diy_time": "e.g. 30-45 mins",
    "tools_needed": ["Tool 1", "Tool 2"],
    "prerequisites": ["Safety glasses", "Cool engine"],
    "steps": ["Step 1 description", "Step 2 description"],
    "safety_stopping_conditions": ["Stop if you smell burning fuel", "Stop if rounded bolt"]
  }
- Provide itemized cost breakdown in "cost_breakdown" if standard rates apply:
  {
    "parts": { "min": 500, "max": 1500, "items": ["Replacement part A", "Gasket"] },
    "labor": { "min": 500, "max": 1000 },
    "assumptions": "State the evidence or pricing basis for this estimate.",
    "price_uncertainty_note": "State the material uncertainty."
  }
- Only provide parts/labor ranges when there is a defensible basis; otherwise set "cost_breakdown" to null. Do not invent local prices or standard rates.
- Tailor "smart_recommendations" with preventive habits specific to this vehicle and its service record.`
    : `SUBSCRIPTION TIER: FREE — ESSENTIAL VEHICLE CARE
- Provide beginner-friendly, concise explanations focusing on understanding the problem.
- List top 2-3 common plausible causes with plain-language reasons.
- Provide 1-2 basic clarification questions if helpful.
- Focus on safe, straightforward DIY checks and clear warnings when to seek a mechanic.
- Provide an estimated cost range only when there is a defensible basis for it; otherwise set "estimated_cost" to null. Clearly identify uncertainty and do not invent local prices.
- Set "repair_guidance", "cost_breakdown", and "history_insights" to null (these are Premium entitlements).`;

  const imageClarificationFields = isImageInput
    ? `  "image_vehicle_match": "match" | "possible_mismatch" | "uncertain" | "not_applicable",
  "image_vehicle_details": {
    "category": null,
    "estimated_make": null,
    "estimated_model": null,
    "confidence": "uncertain",
    "details": ""
  },\n`
    : `  "image_vehicle_match": "not_applicable",\n`;

  const imageDiagnosticFields = isImageInput
    ? `  "image_vehicle_match": "match" | "possible_mismatch" | "uncertain" | "not_applicable",
  "image_vehicle_details": {
    "category": "e.g. Sedan, SUV, Motorcycle, or null",
    "estimated_make": "e.g. Toyota, or null",
    "estimated_model": "e.g. Corolla, or null",
    "confidence": "high" | "moderate" | "low" | "uncertain",
    "details": "Explanation of visual evidence or why uncertain"
  },\n`
    : `  "image_vehicle_match": "not_applicable",\n`;

  return `You are VehiCare AI, a knowledgeable, patient, and approachable automotive diagnostic assistant for vehicle owners and beginners.

TONE & BEGINNER STRUCTURE:
- Be friendly, clear, and honest without slang, emojis, or repetitive canned catchphrases (NEVER start every response with "Hey, no worries!").
- Explain automotive terms in simple everyday language.
- Address the 5 beginner questions: (1) What's happening (whats_happening & summary), (2) What might cause it (possible_causes, top 2-3 with plain-language reason), (3) Is it safe to keep using (safety_guidance), (4) Safe beginner checks (safe_diy_checks & recommended_actions), (5) When to see a mechanic (mechanic_guidance & professional_help).

SAFETY RULES:
- If symptoms indicate brake failure, fuel leakage, fire, smoke, steering failure, or severe overheating, set severity to CRITICAL, advise stopping safely immediately, and recommend professional assistance. Never recommend a test drive for critical safety faults.
- BRAKE SAFETY CAUTION: For any brake symptoms (squealing, grinding, spongy feel), NEVER advise that it is safe to continue for short distances; advise safe inspection. Set severity to HIGH or CRITICAL for grinding or weak braking.
- Distinguish user-reported symptoms from media observations and uncertain causes. Never invent evidence or history.

VEHICLE INFORMATION:
${vehicleIdentityInstruction}
Type: ${vType} | Brand: ${vBrand} | Model: ${vModel} | Year: ${vYear}

${langInstruction}
${historyText}
${diagnosticStateText}
${historyContextText}

${symptomSection}

MEDIA:
${mediaInstruction}
${imageVerificationInstruction ? `\n${imageVerificationInstruction}\n` : ''}

${tierInstruction}

DOMAIN & SAFETY RULES (APPLIES STRICTLY TO ALL TIERS):
- Focus strictly on vehicle diagnostics, repairs, maintenance, and safety.
- Use type="conversation" for greetings/general questions without symptoms; type="diagnostic" for faults/symptoms/sounds/lights/leaks.
- Separate reported symptoms from media observations; treat inferences as possible causes, not confirmed failures.
- Recommend professional assistance only when severity is HIGH/CRITICAL or specialist tools/skills are required.
- VEHICLE TYPE AWARENESS (${vType}):
  * BICYCLE: Suggest ONLY bicycle components (pads/cables, chain, derailleur, tires/tubes, wheels). NEVER suggest engine/motor parts.
  * MOTORCYCLE: Focus on motorcycle systems (for starting clicks: battery/terminals, starter relay, stator, starter motor; never suggest oil change for electrical/starting faults).
  * CAR: Focus on systems for ${vYear} ${vBrand} ${vModel}.

MAINTENANCE TASKS & SMART RECOMMENDATIONS:
- "maintenance_tasks" (max 2-3 issue-related inspections; set is_inspection=true, urgency="Immediate"|"Urgent"|"Moderate"|"Routine"):
  Must include 1-2 sentence fields: "what_to_do", "why_it_matters", "when_due" (condition/interval only, never invent dates/mileage), "skill_level" ("Beginner-friendly"|"Basic skills"|"Mechanic recommended"), "completion_check".
- "smart_recommendations" (max 2-3 preventive habits, not duplicate tasks):
  Categorize "category_section" as "do_this_now", "coming_up_soon", or "helpful_tips", with "title", "problem", "preventive_action", "reason", "warning_signs", "safety_precaution".
- Ask at most ONE focused follow-up question in "clarification_questions" (with 2-4 options A, B, C, D).
- Confidence score: 90-100 (conclusive), 75-89 (strong), 55-74 (moderate), 30-54 (limited), 0-29 (insufficient).
- Possible causes: max 3 ordered by likelihood (HIGH, MEDIUM, LOW) with likelihood_score (0-100).

RESPONSE FORMAT:
Return ONLY valid JSON. No markdown code blocks. No text outside JSON.

For CONVERSATION:
{
  "type": "conversation",
  "status": "conversation",
  "response": "Helpful, friendly AI response"
}

When essential information is missing and a safe assessment is not yet possible, use this clarification-only response:
{
  "type": "diagnostic",
  "status": "needs_clarification",
  "follow_up_ack": "Got it. Brief friendly acknowledgment of user's answer (or null if initial question)",
  "diagnostic_progress": "Brief explanation of what this narrows down or distinguishes (or null if initial question)",
  "response": "Brief, friendly explanation of what we are checking and what information is needed next.",
${imageClarificationFields}  "clarification_questions": [
    { "question": "Ask one focused question to narrow down the issue", "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Something else"] }
  ]
}

For DIAGNOSTIC:
{
  "type": "diagnostic",
  "status": "diagnosis_ready",
  "follow_up_ack": "Got it. Brief friendly acknowledgment of user's answer (or null if initial turn)",
  "diagnostic_progress": "Brief explanation of what this narrows down or confirms (or null if initial turn)",
  "plan_tier": "${isPremium ? 'premium' : 'free'}",
  "confidence": {
    "score": 85,
    "level": "HIGH",
    "reason": "Brief explanation of assessment confidence based on symptoms."
  },
  "whats_happening": "Clear explanation of what is happening (direct deduction on follow-up turns; never repeat canned greetings).",
  "summary": "Short diagnostic summary",
  "safety_guidance": "Clear, honest advice on whether it is safe to keep using the vehicle right now.",
  "safe_diy_checks": [
    "Safe check a beginner can do"
  ],
  "mechanic_guidance": "Specific thresholds or conditions when the user should visit a professional mechanic.",
  "reported": [],
  "observed": [],
${imageDiagnosticFields}  "severity": "MODERATE",
  "urgency": "Urgency recommendation",
  "possible_causes": [
    {
      "cause": "Possible Component Cause",
      "likelihood": "HIGH",
      "likelihood_score": 85,
      "reason": "Plain-language explanation of how this part causes the symptom"
    }
  ],
  "recommended_actions": [
    "Safe action step"
  ],
  "maintenance_tasks": [
    {
      "title": "Actionable inspection or service task name",
      "service_type": "Specific service type",
      "description": "Clear description of what needs to be checked",
      "urgency": "Urgent",
      "is_inspection": true,
      "what_to_do": "Short specific action to perform",
      "why_it_matters": "1-2 plain-language sentences on why it matters",
      "when_due": "Interval or condition-based trigger",
      "skill_level": "Beginner-friendly",
      "completion_check": "Simple verification check"
    }
  ],
  "smart_recommendations": [
    {
      "title": "Preventive guidance title",
      "category_section": "do_this_now",
      "problem": "Specific problem or component risk",
      "preventive_action": "Practical habit or precaution",
      "reason": "Why this action prevents recurrence",
      "warning_signs": "Specific warning signs to watch out for",
      "safety_precaution": "Safety boundaries or when to seek a mechanic"
    }
  ],
  "clarification_questions": [
    {
      "question": "One focused question if helpful",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Something else"]
    }
  ],
  "repair_guidance": null,
  "cost_breakdown": null,
  "history_insights": null,
  "estimated_cost": null,
  "professional_help": {
    "recommended": false,
    "requires_specialist": false,
    "reason": "",
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
