/**
 * Question Deduplication & Semantic Validation Service
 *
 * Implements deterministic deduplication and progression rules for AI diagnostics:
 * 1. Never re-asks what the user has already answered (sound type, location, condition).
 * 2. Rejects semantically duplicate questions comparing to conversation history.
 * 3. Enforces at most ONE high-value clarification question.
 * 4. Stops questioning when turn limit is reached (2 turns) or sufficient facts are established.
 */

const SOUND_KEYWORDS = [
  'squeal', 'squealing', 'squeak', 'squeaking', 'grind', 'grinding', 'scrape', 'scraping',
  'click', 'clicking', 'rattle', 'rattling', 'whine', 'whining', 'hum', 'humming',
  'chirp', 'chirping', 'thump', 'thumping', 'knock', 'knocking', 'hiss', 'hissing',
  'clunk', 'clunking', 'pop', 'popping', 'tick', 'ticking', 'screech', 'screeching',
  'buzz', 'buzzing',
];

const CONDITION_KEYWORDS = [
  'slowly', 'slow', 'low speed', 'accelerat', 'braking', 'idle', 'idling',
  'cold start', 'highway', 'turning', 'bumps', 'reverse', 'decelerating',
];

const LOCATION_KEYWORDS = [
  'rear brake', 'front brake', 'rear wheel', 'front wheel', 'brake pad', 'caliper',
  'drum', 'engine', 'exhaust', 'under hood', 'suspension', 'steering', 'transmission',
  'front right', 'front left', 'rear right', 'rear left',
];

const STOP_WORDS = new Set([
  'what', 'does', 'the', 'is', 'are', 'a', 'an', 'you', 'your', 'it', 'when',
  'most', 'frequently', 'please', 'can', 'help', 'to', 'narrow', 'down',
  'this', 'that', 'there', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about',
  'resemble', 'like', 'sound', 'noise', 'kind', 'type',
]);

/**
 * Tokenize and normalize question text for semantic comparison.
 */
export const tokenizeQuestion = (str = '') => {
  if (typeof str !== 'string') return [];
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
};

/**
 * Extract established facts from history, root symptom, and current answer.
 */
export const extractEstablishedFacts = (history = [], symptoms = '', rootSymptom = '') => {
  const allUserTexts = [];
  if (rootSymptom) allUserTexts.push(rootSymptom);
  if (Array.isArray(history)) {
    history.forEach(turn => {
      const role = String(turn?.role || turn?.sender || '').toLowerCase();
      if (role === 'user' && (turn?.content || turn?.text || turn?.message)) {
        allUserTexts.push(turn.content || turn.text || turn.message);
      }
    });
  }
  if (symptoms) allUserTexts.push(symptoms);

  const combined = allUserTexts.join(' ').toLowerCase();

  const soundTypes = SOUND_KEYWORDS.filter(kw => combined.includes(kw));
  const conditions = CONDITION_KEYWORDS.filter(kw => combined.includes(kw));
  const locations = LOCATION_KEYWORDS.filter(kw => combined.includes(kw));

  let brakeApplicationKnown = /gentl|press|apply|step|depress/i.test(combined) && /brake/i.test(combined);

  // Also check if any assistant question in history asked about applying/pressing the brake:
  if (!brakeApplicationKnown && Array.isArray(history)) {
    const hasBrakeQuestion = history.some(turn => {
      const role = String(turn?.role || turn?.sender || '').toLowerCase();
      if (role !== 'user') {
        const text = String(turn?.content || turn?.text || turn?.message || '');
        return isBrakeApplicationQuestion(text);
      }
      return false;
    });
    if (hasBrakeQuestion && symptoms) {
      brakeApplicationKnown = true;
    }
  }

  return {
    soundTypes,
    conditions,
    locations,
    brakeApplicationKnown,
    allUserTexts,
    combined,
  };
};

/**
 * Extract previously asked assistant questions from history and diagnostic state.
 */
export const extractPreviousQuestions = (history = [], diagnosticState = null) => {
  const previous = [];

  if (Array.isArray(diagnosticState?.assessments)) {
    diagnosticState.assessments.forEach(ass => {
      if (Array.isArray(ass?.clarification_questions)) {
        ass.clarification_questions.forEach(q => {
          const qText = typeof q === 'string' ? q : (q?.question || q?.title || q?.text || '');
          if (qText) previous.push(qText.trim());
        });
      }
    });
  }

  if (Array.isArray(history)) {
    history.forEach(turn => {
      const role = String(turn?.role || turn?.sender || '').toLowerCase();
      if (role !== 'user') {
        const text = String(turn?.content || turn?.text || turn?.message || '');
        // Extract embedded questions
        const matches = text.match(/([A-Z][^?]*\?)/g);
        if (matches) {
          matches.forEach(m => previous.push(m.trim()));
        }
      }
    });
  }

  return [...new Set(previous)];
};

/**
 * Check if a question is asking for sound type / resemblance.
 */
export const isSoundTypeQuestion = (questionStr = '') => {
  const lower = questionStr.toLowerCase();
  return (
    lower.includes('resemble') ||
    lower.includes('what kind of sound') ||
    lower.includes('what kind of noise') ||
    lower.includes('what does the sound') ||
    lower.includes('what does the noise') ||
    lower.includes('what sound') ||
    lower.includes('what noise') ||
    lower.includes('describe the sound') ||
    (lower.includes('squeal') && lower.includes('grind') && lower.includes('?'))
  );
};

/**
 * Check if a question is asking for driving condition / speed / when.
 */
export const isConditionQuestion = (questionStr = '') => {
  const lower = questionStr.toLowerCase();
  return (
    (lower.includes('when do you') && (lower.includes('hear') || lower.includes('notice') || lower.includes('observe'))) ||
    lower.includes('at what speed') ||
    lower.includes('under what condition') ||
    (lower.includes('accelerating') && lower.includes('braking') && lower.includes('idle'))
  );
};

/**
 * Check if a question is asking for vehicle location / which wheel.
 */
export const isLocationQuestion = (questionStr = '') => {
  const lower = questionStr.toLowerCase();
  return (
    lower.includes('which wheel') ||
    lower.includes('front or rear') ||
    lower.includes('where is the sound') ||
    lower.includes('which side') ||
    lower.includes('left or right')
  );
};

/**
 * Check if a question is asking about brake application effect.
 */
export const isBrakeApplicationQuestion = (questionStr = '') => {
  const lower = questionStr.toLowerCase();
  return (
    /appl(y|ying).*(brake|pedal|lever)/i.test(lower) ||
    /press(ing)?.*(brake|pedal|lever)/i.test(lower) ||
    /step(ping)?.*(brake|pedal)/i.test(lower) ||
    (lower.includes('brake') && (lower.includes('pedal') || lower.includes('lever') || lower.includes('gently apply')))
  );
};

/**
 * Semantic comparison between two questions.
 */
export const isSemanticDuplicate = (qA = '', qB = '') => {
  if (!qA || !qB) return false;
  const strA = qA.toLowerCase().trim();
  const strB = qB.toLowerCase().trim();

  if (strA === strB) return true;

  // Intent classification match
  if (isSoundTypeQuestion(strA) && isSoundTypeQuestion(strB)) return true;
  if (isConditionQuestion(strA) && isConditionQuestion(strB)) return true;
  if (isLocationQuestion(strA) && isLocationQuestion(strB)) return true;
  if (isBrakeApplicationQuestion(strA) && isBrakeApplicationQuestion(strB)) return true;

  // Token Jaccard similarity
  const tokensA = tokenizeQuestion(strA);
  const tokensB = tokenizeQuestion(strB);

  if (tokensA.length === 0 || tokensB.length === 0) return false;

  const setB = new Set(tokensB);
  const intersection = tokensA.filter(t => setB.has(t));
  const union = new Set([...tokensA, ...tokensB]);

  const jaccard = intersection.length / union.size;
  return jaccard >= 0.45;
};

/**
 * Filter, deduplicate, and select at most ONE high-value clarification question.
 */
export const filterAndSelectQuestions = ({
  proposedQuestions = [],
  history = [],
  diagnosticState = null,
  symptoms = '',
  rootSymptom = '',
  maxClarificationTurns = 2,
}) => {
  const facts = extractEstablishedFacts(history, symptoms, rootSymptom);
  const previousQuestions = extractPreviousQuestions(history, diagnosticState);

  // Count past assistant clarification turns
  const priorClarificationCount = previousQuestions.length;

  // Check if user requested diagnosis or wants to stop
  const userText = symptoms.toLowerCase().trim();
  const wantsToStop = [
    'diagnose', 'diagnosis now', 'verdict', 'what is it', 'give me the diagnosis',
    'i don\'t know', 'dont know', 'not sure', 'skip', 'just tell me',
  ].some(phrase => userText.includes(phrase));

  if (wantsToStop || priorClarificationCount >= maxClarificationTurns) {
    return {
      selectedQuestion: null,
      reason: wantsToStop ? 'user_requested_diagnosis' : 'turn_limit_reached',
      questions: [],
      facts,
    };
  }

  // Filter proposed questions
  const validQuestions = [];

  for (const item of proposedQuestions) {
    const qStr = typeof item === 'string' ? item : (item?.question || item?.title || item?.text || '');
    if (!qStr || qStr.length < 5) continue;

    // Rule 1: Sound type already known
    if (isSoundTypeQuestion(qStr) && facts.soundTypes.length > 0) {
      continue;
    }

    // Rule 2: Condition already known
    if (isConditionQuestion(qStr) && facts.conditions.length > 0) {
      continue;
    }

    // Rule 3: Location already known
    if (isLocationQuestion(qStr) && facts.locations.length > 0) {
      continue;
    }

    // Rule 4: Brake application already known
    if (isBrakeApplicationQuestion(qStr) && facts.brakeApplicationKnown) {
      continue;
    }

    // Rule 5: Semantic duplicate of previously asked question
    const isDuplicate = previousQuestions.some(prevQ => isSemanticDuplicate(qStr, prevQ));
    if (isDuplicate) {
      continue;
    }

    validQuestions.push(item);
  }

  // If a valid question survived, select at most ONE
  if (validQuestions.length > 0) {
    const chosen = validQuestions[0];
    const qText = typeof chosen === 'string' ? chosen : (chosen.question || chosen.title || chosen.text);
    const options = Array.isArray(chosen?.options) && chosen.options.length > 0
      ? chosen.options
      : ['Yes', 'No', 'I\'m not sure'];

    return {
      selectedQuestion: {
        question: qText,
        options,
      },
      reason: 'valid_question',
      questions: [{
        question: qText,
        options,
      }],
      facts,
    };
  }

  // If no proposed question survived but turns < max turns, check if we need an adaptive follow-up
  const isBrakeIssue = (rootSymptom + ' ' + facts.combined).toLowerCase().includes('brake');
  if (isBrakeIssue && facts.soundTypes.length > 0 && !facts.brakeApplicationKnown && priorClarificationCount < 2) {
    const adaptiveBrakeQuestion = {
      question: 'Does the sound change when you gently apply the rear brake?',
      options: ['Yes, it changes or stops', 'No, it stays the same', 'I\'m not sure'],
    };
    const isDup = previousQuestions.some(prevQ => isSemanticDuplicate(adaptiveBrakeQuestion.question, prevQ));
    if (!isDup) {
      return {
        selectedQuestion: adaptiveBrakeQuestion,
        reason: 'adaptive_high_value_question',
        questions: [adaptiveBrakeQuestion],
        facts,
      };
    }
  }

  // Otherwise, sufficient information exists -> conclude diagnosis
  return {
    selectedQuestion: null,
    reason: 'sufficient_information',
    questions: [],
    facts,
  };
};
