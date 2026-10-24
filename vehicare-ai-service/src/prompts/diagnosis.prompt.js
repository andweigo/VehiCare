import { extractEstablishedFacts, extractPreviousQuestions } from '../services/question-dedup.js';
import {
  isContextDependentFollowUp,
  isMaintenanceOrHowToIntent,
  isNoDefectClarification,
} from '../utils/symptom-normalizer.js';

export const isGeneralQuestion = (symptomsText, history = [], diagnosticState = null) => {
  if (!symptomsText || typeof symptomsText !== 'string') return true;

  // 1. Explicit no-defect clarifications and maintenance/DIY how-to requests are always general/maintenance
  if (isNoDefectClarification(symptomsText) || isMaintenanceOrHowToIntent(symptomsText)) {
    return true;
  }

  const text = symptomsText.toLowerCase().trim();
  const wordCount = text.split(/\s+/).length;

  const greetings = [
    'hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening',
    'kumusta', 'kamusta', 'help', 'salamat', 'thank you', 'thanks'
  ];
  if (greetings.includes(text) || (wordCount <= 5 && greetings.some(g => text.startsWith(g) || text.includes(g)))) {
    return true;
  }

  // 2. If there is prior conversation history or active diagnostic assessments:
  const hasHistory = Array.isArray(history) && history.length > 0;
  const hasDiagnosticAssessments = Array.isArray(diagnosticState?.assessments) && diagnosticState.assessments.length > 0;
  if (hasHistory || hasDiagnosticAssessments) {
    // If it's a context-dependent short follow-up to a diagnostic question (e.g. "yes", "front right", "only when cold"):
    if (isContextDependentFollowUp(symptomsText)) {
      return false;
    }
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

  if (hasHistory || hasDiagnosticAssessments) {
    return false;
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

  return `You are VehiCare AI, a knowledgeable, friendly automotive maintenance and vehicle assistant.

VEHICLE: ${vYear} ${vBrand} ${vModel} (${vType})
${langInstruction}
${historyText}

USER QUESTION / REQUEST:
"${symptoms}"

INSTRUCTIONS:
1. Stay strictly within the vehicle/automotive domain.
2. Tailor your answer specifically to the selected vehicle (${vYear} ${vBrand} ${vModel} - ${vType}) and its exact vehicle type, components, and specifications. Never give generic or mismatched advice for a different vehicle type or model.
3. If the user asks for maintenance, component replacement, DIY steps, or part changes (e.g. changing bulbs, oil, fluids, tires, spark plugs), provide:
   - Specific part/fluid specifications for ${vYear} ${vBrand} ${vModel} (e.g. bulb socket type/wattage, oil viscosity, torque spec).
   - Tools and materials needed.
   - Clear, numbered step-by-step instructions.
   - Important practical tips and precautions.
   - Do NOT include diagnostic causes, fault likelihoods, or medical-style hazard warnings when nothing is broken.
4. If the user asks a general automotive question, feature explanation, or greeting, provide a friendly, helpful, and concise answer.
5. Return ONLY valid JSON format. No markdown code blocks or extra text outside JSON.

JSON RESPONSE FORMAT:
{
  "type": "conversation",
  "status": "conversation",
  "response": "Your structured, helpful response here in plain text only (no markdown symbols such as #, *, or backticks). Use short labeled lines like 'Tools needed:' and numbered steps like '1.' separated by line breaks."
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
  mediaFallbackMode = false,
  originalMediaType = 'image',
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
    audio: 'Analyze the recording only for audible vehicle-generated sounds. Describe acoustic characteristics and patterns that are actually audible. Do not transcribe speech or treat spoken questions as symptom reports. Do not claim a mechanical fault unless the sound supports it; normal operating sounds may be normal, and uncertain sounds must be described as inconclusive. Do not claim visual observations.',
  };
  const modality = inputType === 'voice' ? 'audio' : inputType;
  const mediaInstruction = mediaFallbackMode
    ? `MEDIA UNINSPECTABLE (MEDIA RECOVERY FALLBACK):
- The original user-attached ${originalMediaType || 'media'} could not be inspected or processed due to a technical/media service error.
- You MUST base all diagnostic conclusions and observations EXCLUSIVELY on the user's written symptoms and available vehicle context.
- DO NOT claim, state, or imply that you analyzed or observed the image, video, or audio file.
- Set "observed" to only what was described in text by the user, or note that direct inspection was unavailable.
- DO NOT invent visual or acoustic findings that were not explicitly described in text by the user.
- If the written symptoms are insufficient or ambiguous to form a confident diagnosis, set status to "clarification_needed" and ask targeted questions rather than inventing findings.`
    : (hasMedia
      ? `${modalityInstructions[modality] || 'Analyze the attached media only for evidence supported by its content.'}${mediaMime ? ` Media MIME type: ${mediaMime}.` : ''}`
      : 'NO MEDIA ATTACHED: Base diagnosis on reported symptoms.');

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
  * Set "type": "vehicle_mismatch", "status": "vehicle_mismatch", and "vehicle_context_status": "mismatch".
  * In the response and summary, clearly alert the user that the uploaded image appears to depict a different vehicle (state the observed category/make/model vs the saved vehicle).
  * DO NOT generate maintenance tasks, smart recommendations, repair guidance, or cost breakdown for the wrong vehicle. Set "maintenance_tasks": [], "smart_recommendations": [], "possible_causes": [], "repair_guidance": null, "cost_breakdown": null.
  * Provide clarification options asking the user to choose: "Upload correct media", "Switch vehicle profile", or "Start separate consultation".
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
- INTENT RE-CLASSIFICATION & MAINTENANCE OVERRIDE:
  * If the user clarifies that nothing is broken, or that they simply want to perform routine maintenance, change, replace, install, or upgrade a component (e.g. "nothing lang, i just want to change it", "wala lang gusto ko lang palitan", "routine upgrade", "just want to replace bulb"):
    - Immediately OVERRIDE diagnostic continuity. Do NOT force a mechanical fault or invent causes (NEVER list "Desire for better illumination" or treat wanting to change/upgrade a part as a mechanical defect).
    - Do NOT provide medical-style driving warnings or hazard restrictions for non-existent faults.
    - Set type="conversation", status="conversation".
    - Provide a structured DIY guide tailored specifically to ${vYear} ${vBrand} ${vModel}:
      1. Specific part/bulb/fluid specifications for ${vYear} ${vBrand} ${vModel}.
      2. Tools and materials needed.
      3. Step-by-step instructions.
      4. Important practical tips and precautions.
- Otherwise, maintain diagnostic continuity and refine causes, severity, and next steps.${progressiveInstructions}`
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
- Never reference parts or systems that do not exist on a ${vType} (${vYear} ${vBrand} ${vModel}).
- If the user explicitly asks about or describes a completely different vehicle (e.g. asking about a motorcycle, truck, or a different car make/model like Ferrari or Honda Civic when the selected vehicle is ${vYear} ${vBrand} ${vModel}):
  * DO NOT silently switch context or apply maintenance/diagnostic records to the selected vehicle!
  * Set type: "vehicle_switch_confirmation_required", status: "vehicle_switch_confirmation_required", vehicle_context_status: "different_vehicle_mentioned", mentioned_vehicle: "<detected make/model/type>".
  * Set maintenance_tasks: [], smart_recommendations: [], repair_guidance: null, cost_breakdown: null, possible_causes: [].
  * In summary and response, clearly state that the question refers to a different vehicle (<detected make/model/type>) than the active profile (${vYear} ${vBrand} ${vModel}).
  * Set clarification_questions with options: ["A. Switch vehicle profile", "B. Start separate consultation", "C. Continue with current vehicle"].`;

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
- THREE DISTINCT INTENT MODES:
  1. MALFUNCTION / DEFECT DIAGNOSIS (type="diagnostic"):
     * Use ONLY when the user reports an actual vehicle malfunction, breakdown, abnormal noise (clicking, squeaking, knocking, grinding), fluid leak, warning light, smoke, smell, or abnormal vehicle behavior.
  2. MAINTENANCE / DIY REPLACEMENT / HOW-TO GUIDE (type="conversation"):
     * Use when the user asks how to perform routine maintenance, change, replace, install, clean, or upgrade a component (e.g. changing headlight bulbs, oil change, brake pad replacement, battery installation, tire rotation), OR
     * When the user clarifies that nothing is broken/faulty (e.g. "nothing lang, i just want to change it", "walang sira, gusto ko lang palitan", "routine upgrade", "just changing bulb").
     * Do NOT invent mechanical causes (NEVER list "Desire for better illumination" or treat wanting to change a part as a mechanical defect)!
     * Do NOT provide driving hazard or safety warnings when nothing is broken!
     * Provide a helpful, structured step-by-step DIY guide tailored specifically to ${vYear} ${vBrand} ${vModel}:
       - Specific part/bulb/fluid specifications for ${vYear} ${vBrand} ${vModel} (e.g. socket type, wattage, viscosity, capacity).
       - Tools and materials required.
       - Clear, numbered step-by-step replacement instructions.
       - Practical pro-tips and safety precautions (e.g. do not touch halogen glass with bare fingers, let engine cool).
     * Return format:
       {
         "type": "conversation",
         "status": "conversation",
         "response": "Your structured, step-by-step guide in plain text only (no markdown symbols such as #, *, or backticks). Use short labeled lines like 'Tools needed:' and numbered steps like '1.' separated by line breaks."
       }
  3. GENERAL CONVERSATION & GREETINGS (type="conversation"):
     * Greetings, appreciation, general vehicle questions, specifications, or automotive advice without defects.
     * Return format:
       {
         "type": "conversation",
         "status": "conversation",
         "response": "Friendly, direct answer tailored to ${vYear} ${vBrand} ${vModel}."
       }
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

When a vehicle mismatch is detected in media:
{
  "type": "vehicle_mismatch",
  "status": "vehicle_mismatch",
  "vehicle_context_status": "mismatch",
  "response": "The uploaded photo appears to depict a [Vehicle Category/Make/Model], which does not match your currently selected vehicle profile (${vYear} ${vBrand} ${vModel}). Would you like to upload the correct media, switch your active vehicle profile, or start a separate consultation?",
  "summary": "Vehicle mismatch detected between uploaded media and active vehicle profile.",
${imageClarificationFields}  "clarification_questions": [
    { "question": "How would you like to proceed?", "options": ["Upload correct media", "Switch vehicle profile", "Start separate consultation"] }
  ]
}

When a different vehicle is mentioned in text:
{
  "type": "vehicle_switch_confirmation_required",
  "status": "vehicle_switch_confirmation_required",
  "vehicle_context_status": "different_vehicle_mentioned",
  "mentioned_vehicle": "Name of mentioned vehicle",
  "response": "It looks like your question is about a different vehicle than your active profile (${vYear} ${vBrand} ${vModel}). Would you like to switch your vehicle profile or start a separate consultation so maintenance records stay accurate?",
  "summary": "Inquiry refers to a different vehicle than active vehicle profile.",
  "clarification_questions": [
    { "question": "How would you like to proceed?", "options": ["Switch vehicle profile", "Start separate consultation", "Continue with current vehicle"] }
  ]
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
