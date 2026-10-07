import crypto from 'crypto';

export const normalizeText = (text) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let normalized = text.toLowerCase().trim();

  // Strip punctuation and non-alphanumeric chars (preserving spaces)
  normalized = normalized.replace(/[^\w\s]/gi, ' ');

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
  return crypto.createHash('sha256').update(cleanBase64).digest('hex').substring(0, 16);
};
