import crypto from 'crypto';

export const normalizeText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let normalized = text.toLowerCase().trim();

  // Strip punctuation and symbols while preserving Unicode letters and digits across English and Filipino
  normalized = normalized.replace(/[^\p{L}\p{N}\s]/gu, ' ');

  // Collapse multiple whitespaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
};

export const normalizeSymptom = (symptoms) => {
  const norm = normalizeText(symptoms);
  if (!norm) return '';

  const fillers = ['my', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'it', 'when', 'i'];
  const words = norm.split(' ').filter((w) => w && !fillers.includes(w));

  return words.join('_');
};

export const hashMedia = (mediaBase64) => {
  if (!mediaBase64 || typeof mediaBase64 !== 'string') return null;
  const cleanBase64 = mediaBase64.replace(/^data:[^;]+;base64,/i, '').trim();
  if (!cleanBase64) return null;
  return crypto.createHash('sha256').update(cleanBase64).digest('hex');
};

/**
 * Check if a query is a context-dependent follow-up question (e.g. "what should I do next?").
 * These must not be cached without conversation history to prevent cross-user context pollution.
 */
export const isContextDependentFollowUp = (text) => {
  if (!text || typeof text !== 'string') return false;
  const normalized = normalizeText(text);

  const shortAnswers = [
    'yes', 'no', 'yep', 'nope', 'yeah', 'nah', 'oo', 'hindi',
    'only when accelerating', 'only when cold', 'only when hot',
    'when turning key', 'after driving', 'front right', 'front left',
    'rear right', 'rear left', 'none', 'wala', 'meron', 'hindi ko alam',
    'i don t know', 'dont know', 'not sure',
  ];
  if (shortAnswers.includes(normalized)) return true;

  const followUpPhrases = [
    'what next',
    'what should i do next',
    'what to do next',
    'what now',
    'what should i do now',
    'how about that',
    'what about that',
    'tell me more',
    'and then',
    'why is that',
    'what else',
    'explain more',
    'how do i do that',
    'ano susunod',
    'anong gagawin ko',
    'ano sunod',
  ];

  return followUpPhrases.some((phrase) => normalized === phrase || normalized.startsWith(`${phrase} `));
};

/**
 * Check if the text explicitly states there is no defect, fault, or problem (e.g. user clarifies they just want to change or upgrade a part).
 */
export const isNoDefectClarification = (text) => {
  if (!text || typeof text !== 'string') return false;
  const norm = normalizeText(text);
  if (!norm) return false;

  const noDefectPhrases = [
    'nothing lang',
    'wala lang',
    'walang sira',
    'walang problema',
    'wala naman sira',
    'walang basag',
    'no problem',
    'nothing wrong',
    'nothing is wrong',
    'nothing broken',
    'nothing is broken',
    'not broken',
    'just want to change',
    'i just want to change',
    'gusto ko lang palitan',
    'gusto ko lang magpalit',
    'palitan ko lang',
    'just want to replace',
    'just want to upgrade',
    'gusto ko lang i upgrade',
    'gusto ko lang upgrade',
    'routine change',
    'routine maintenance',
    'routine replacement',
    'preventive maintenance',
  ];

  return noDefectPhrases.some((phrase) => norm.includes(phrase));
};

/**
 * Check if a query represents maintenance, DIY how-to replacement, cleaning, or upgrade guidance.
 */
export const isMaintenanceOrHowToIntent = (text) => {
  if (!text || typeof text !== 'string') return false;
  if (isNoDefectClarification(text)) return true;

  const norm = normalizeText(text);
  if (!norm) return false;

  const maintenancePhrases = [
    'how to change',
    'how do i change',
    'help me change',
    'help me replace',
    'change my',
    'change the',
    'replace my',
    'replace the',
    'how to replace',
    'how do i replace',
    'want to change',
    'want to replace',
    'paano magpalit',
    'paano palitan',
    'palit ng',
    'palitan ang',
    'how to install',
    'how do i install',
    'paano mag install',
    'how to upgrade',
    'paano mag upgrade',
    'how to clean',
    'paano maglinis',
    'how to change oil',
    'how do i change oil',
    'paano mag change oil',
    'change oil guide',
    'oil change steps',
    'how to bleed',
    'paano mag bleed',
    'maintenance guide',
    'diy guide',
    'diy steps',
    'step by step guide',
    'how to maintain',
    'how do i maintain',
  ];

  const matchesMaintenance = maintenancePhrases.some((phrase) => norm.includes(phrase));
  if (!matchesMaintenance) return false;

  const activeDefectWords = [
    'smoke', 'smoking', 'leak', 'leaking', 'knock', 'knocking', 'grind', 'grinding',
    'won t start', 'wont start', 'cannot start', 'overheating', 'overheat',
    'squeal', 'squealing', 'rattle', 'shaking', 'vibrating', 'broken', 'damaged',
    'failed', 'failure', 'stuck', 'sira'
  ];
  const hasActiveDefect = activeDefectWords.some((word) => norm.includes(word));
  if (hasActiveDefect) {
    return false;
  }

  return true;
};

/**
 * Check if a query or diagnosis represents repair guidance (e.g. "how to repair", "how to fix", maintenance guides).
 */
export const isRepairGuideIntent = (text) => {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  const repairPatterns = [
    'how to repair',
    'how to fix',
    'repair guide',
    'repair steps',
    'step by step repair',
    'replacement guide',
    'how to replace',
    'paano ayusin',
    'paano palitan',
    'diy repair',
  ];
  return repairPatterns.some((pattern) => lower.includes(pattern)) || isMaintenanceOrHowToIntent(text);
};
