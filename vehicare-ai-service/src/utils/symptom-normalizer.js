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
 * Check if a query or diagnosis represents repair guidance (e.g. "how to repair", "how to fix").
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
  return repairPatterns.some((pattern) => lower.includes(pattern));
};
