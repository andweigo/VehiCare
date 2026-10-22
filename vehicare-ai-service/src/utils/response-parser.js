/**
 * Attempt to repair a JSON string that was truncated by max_tokens or network cutoff.
 */
export const repairTruncatedJson = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return null;

  let text = rawText.trim();
  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  // Find the opening brace
  const start = text.indexOf('{');
  if (start === -1) return null;
  text = text.substring(start);

  // 1. Direct parse attempt
  try {
    return JSON.parse(text);
  } catch (_) {}

  // 2. Direct parse after stripping trailing text after last }
  const lastBrace = text.lastIndexOf('}');
  if (lastBrace > 0) {
    try {
      return JSON.parse(text.substring(0, lastBrace + 1));
    } catch (_) {}
  }

  // 3. Remove control characters
  try {
    const sanitized = text.replace(/[\x00-\x1F\x7F]/g, '');
    return JSON.parse(sanitized);
  } catch (_) {}

  // 4. Truncation repair:
  // Step 4a: Walk text tracking whether we stopped inside an open string
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === '\\') {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      }
    }
  }

  let repaired = text;
  // If stopped inside a string literal, close the quote
  if (inString) {
    repaired += '"';
  }

  // Step 4b: Clean trailing incomplete syntax (trailing commas, dangling colons/keys)
  let prev;
  do {
    prev = repaired;
    // 1. Strip trailing commas and whitespace
    repaired = repaired.replace(/,\s*$/, '').trim();

    // 2. Determine bracket stack and whether innermost is Object or Array
    const currentStack = [];
    let curInString = false;
    let curEscaped = false;
    let lastColonIndex = -1;
    let lastCommaOrBraceIndex = -1;

    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      if (curInString) {
        if (curEscaped) curEscaped = false;
        else if (char === '\\') curEscaped = true;
        else if (char === '"') curInString = false;
      } else {
        if (char === '"') {
          curInString = true;
        } else if (char === '{') {
          currentStack.push('}');
          lastCommaOrBraceIndex = i;
        } else if (char === '[') {
          currentStack.push(']');
          lastCommaOrBraceIndex = i;
        } else if (char === '}') {
          if (currentStack.length > 0 && currentStack[currentStack.length - 1] === '}') currentStack.pop();
          lastCommaOrBraceIndex = i;
        } else if (char === ']') {
          if (currentStack.length > 0 && currentStack[currentStack.length - 1] === ']') currentStack.pop();
          lastCommaOrBraceIndex = i;
        } else if (char === ':') {
          lastColonIndex = i;
        } else if (char === ',') {
          lastCommaOrBraceIndex = i;
        }
      }
    }

    const innermost = currentStack[currentStack.length - 1];

    if (innermost === '}') {
      // Inside an Object:
      // Case A: Trailing colon e.g. "key":
      if (/:\s*$/.test(repaired)) {
        repaired = repaired.replace(/"[^"\\]*(?:\\.[^"\\]*)*"\s*:\s*$/, '').trim();
        repaired = repaired.replace(/,\s*$/, '').trim();
      } else if (lastColonIndex < lastCommaOrBraceIndex) {
        // Case B: Incomplete KEY without colon or value in object e.g. { "a": 1, "b"
        repaired = repaired.replace(/,\s*"[^"\\]*(?:\\.[^"\\]*)*"\s*$/, '').trim();
      }
    }

    // Strip trailing commas again if exposed
    repaired = repaired.replace(/,\s*$/, '').trim();
  } while (repaired !== prev);

  // Step 4c: Recalculate bracket stack on cleaned string
  const stack = [];
  let cleanInString = false;
  let cleanEscaped = false;

  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (cleanInString) {
      if (cleanEscaped) {
        cleanEscaped = false;
      } else if (char === '\\') {
        cleanEscaped = true;
      } else if (char === '"') {
        cleanInString = false;
      }
    } else {
      if (char === '"') {
        cleanInString = true;
      } else if (char === '{') {
        stack.push('}');
      } else if (char === '[') {
        stack.push(']');
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '}') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === ']') {
          stack.pop();
        }
      }
    }
  }

  if (cleanInString) {
    repaired += '"';
  }

  // Close unclosed brackets LIFO
  while (stack.length > 0) {
    repaired += stack.pop();
  }

  // Step 4d: Parse repaired JSON
  try {
    return JSON.parse(repaired);
  } catch (_) {
    // Try removing control characters from repaired
    try {
      const sanitizedRepaired = repaired.replace(/[\x00-\x1F\x7F]/g, '');
      return JSON.parse(sanitizedRepaired);
    } catch (_) {}
  }

  return null;
};

/**
 * Salvage diagnostic or conversational fields via regex when JSON syntax is unrecoverable.
 */
export const extractSalvageableDiagnostic = (text) => {
  if (!text || typeof text !== 'string') return null;

  const extractString = (key) => {
    // Try matching closed string
    const matchClosed = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i'));
    if (matchClosed && matchClosed[1]) {
      return matchClosed[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim();
    }
    // Try matching unclosed string up to next key or end
    const matchOpen = text.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*?)(?:"|,\\s*"[a-zA-Z0-9_]+"|$)`, 'i'));
    if (matchOpen && matchOpen[1]) {
      return matchOpen[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim();
    }
    return null;
  };

  const responseText = extractString('response') || extractString('message');
  const summaryText = extractString('summary');
  const whatsHappeningText = extractString('whats_happening');
  const followUpAck = extractString('follow_up_ack');
  const diagnosticProgress = extractString('diagnostic_progress');
  const safetyGuidance = extractString('safety_guidance');
  const mechanicGuidance = extractString('mechanic_guidance');

  // If there's no meaningful conversational or diagnostic text, return null
  if (!responseText && !summaryText && !whatsHappeningText) {
    return null;
  }

  // Check if it's purely a conversation response
  const typeMatch = text.match(/"type"\s*:\s*"([a-zA-Z0-9_]+)"/i);
  const typeVal = typeMatch ? typeMatch[1].toLowerCase() : '';
  if (typeVal === 'conversation' || (responseText && !summaryText && !whatsHappeningText)) {
    return {
      type: 'conversation',
      status: 'conversation',
      response: responseText || summaryText || whatsHappeningText || 'I am here to assist with your vehicle diagnostics and care.',
    };
  }

  // Extract possible causes
  const causes = [];
  const causeRegex = /"cause"\s*:\s*"((?:[^"\\\\]|\\\\.)*?)"/gi;
  let match;
  while ((match = causeRegex.exec(text)) !== null && causes.length < 5) {
    const causeTitle = match[1].replace(/\\"/g, '"').trim();
    if (causeTitle) {
      causes.push({
        cause: causeTitle,
        likelihood: 'MEDIUM',
        likelihood_score: 65,
        reason: 'Identified from reported vehicle symptoms.',
      });
    }
  }

  // Extract severity
  const sevMatch = text.match(/"severity"\s*:\s*"(LOW|MODERATE|HIGH|CRITICAL)"/i);
  const severity = sevMatch ? sevMatch[1].toUpperCase() : 'MODERATE';

  // Extract urgency
  const urgency = extractString('urgency') || 'Schedule an inspection to verify this condition.';

  const finalSummary = summaryText || whatsHappeningText || responseText || 'Vehicle diagnostic assessment completed.';
  const finalWhatsHappening = whatsHappeningText || summaryText || finalSummary;

  return {
    type: 'diagnostic',
    status: 'diagnosis_ready',
    summary: finalSummary,
    whats_happening: finalWhatsHappening,
    follow_up_ack: followUpAck || null,
    diagnostic_progress: diagnosticProgress || null,
    safety_guidance: safetyGuidance || 'Inspect the reported component or consult a qualified mechanic.',
    mechanic_guidance: mechanicGuidance || 'Consult a certified mechanic if symptoms worsen or persist.',
    severity,
    urgency,
    possible_causes: causes.length > 0 ? causes : [
      {
        cause: 'Reported vehicle symptom',
        likelihood: 'MEDIUM',
        likelihood_score: 60,
        reason: finalSummary,
      },
    ],
    recommended_actions: ['Schedule an inspection with a qualified technician to verify these findings.'],
    clarification_questions: [],
  };
};

export const parseAndCleanJson = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  const repaired = repairTruncatedJson(rawText);
  if (repaired && typeof repaired === 'object') {
    return repaired;
  }

  const salvaged = extractSalvageableDiagnostic(rawText);
  if (salvaged && typeof salvaged === 'object') {
    return salvaged;
  }

  return null;
};
