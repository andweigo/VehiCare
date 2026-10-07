export const parseAndCleanJson = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  let clean = rawText.trim();

  // Strip markdown code fences ```json ... ```
  clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // Extract JSON object bounds if needed
  if (!clean.startsWith('{') || !clean.endsWith('}')) {
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      clean = clean.substring(start, end + 1);
    }
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    // Attempt sanitizing unescaped control characters
    try {
      const sanitized = clean.replace(/[\x00-\x1F\x7F]/g, '');
      return JSON.parse(sanitized);
    } catch (e2) {
      // Auto-repair missing closing braces or quotes
      try {
        let repaired = clean.replace(/,\s*([\}\]])/g, '$1');
        const openBraces = (repaired.match(/\{/g) || []).length - (repaired.match(/\}/g) || []).length;
        const openBrackets = (repaired.match(/\[/g) || []).length - (repaired.match(/\]/g) || []).length;

        for (let i = 0; i < openBrackets; i++) repaired += ']';
        for (let i = 0; i < openBraces; i++) repaired += '}';

        return JSON.parse(repaired);
      } catch (e3) {
        return null;
      }
    }
  }
};
