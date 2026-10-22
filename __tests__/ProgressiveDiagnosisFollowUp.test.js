import { formatAiResponseText } from '../src/screens/AskVehiCareScreen';

describe('Progressive AI Diagnostic Follow-Up & Cautious Brake Safety', () => {
  describe('Progressive Follow-Up Turn Formatting (Rule 4: Update, don\'t restart)', () => {
    it('formats a progressive clarification response conversationally without repeating the 5-question report card', () => {
      const progressiveClarification = {
        type: 'diagnostic',
        status: 'needs_clarification',
        follow_up_ack: 'Got it. A high-pitched squeal can happen when brake friction surfaces vibrate or when dust builds up.',
        diagnostic_progress: 'That narrows the possibilities, but it doesn\'t confirm the cause.',
        response: 'Got it. A high-pitched squeal can happen when brake friction surfaces vibrate or when dust builds up. That narrows the possibilities, but it doesn\'t confirm the cause.\n\nOne question that helps narrow it down:\nDoes the sound change when you gently apply the rear brake?',
        clarification_questions: [
          {
            question: 'Does the sound change when you gently apply the rear brake?',
            options: ['Yes, it changes or stops', 'No, it stays the same', 'I\'m not sure'],
          },
        ],
      };

      const formatted = formatAiResponseText(progressiveClarification);

      // Must include acknowledgment and progression
      expect(formatted).toContain('Got it. A high-pitched squeal can happen');
      expect(formatted).toContain('That narrows the possibilities');
      expect(formatted).toContain('Does the sound change when you gently apply the rear brake?');

      // Must NOT dump the full 5-part card headers
      expect(formatted).not.toContain("What's happening to my vehicle?");
      expect(formatted).not.toContain('What might be causing it?');
      expect(formatted).not.toContain('Safe checks you can perform:');
      expect(formatted).not.toContain('When to ask a mechanic for help:');
    });

    it('formats a concluded diagnosis turn with acknowledgment header and final assessment', () => {
      const concludedDiagnosis = {
        type: 'diagnostic',
        status: 'diagnosis_ready',
        follow_up_ack: 'Thanks for clarifying. Because the squeal changes when you gently apply the brake, it points to brake friction surfaces or dust buildup.',
        diagnostic_progress: 'We have narrowed down the issue to brake pad friction material or dust accumulation.',
        summary: 'Brake pad dust accumulation and surface friction vibration.',
        severity: 'MODERATE',
        urgency: 'Routine',
        possible_causes: [
          {
            cause: 'Brake Dust Buildup',
            reason: 'Dust accumulates between the brake shoe/pad and drum/rotor, causing high-frequency vibration.',
          },
          {
            cause: 'Glazed Brake Friction Surface',
            reason: 'Excessive heat can glaze brake pads, causing squealing at low speeds.',
          },
        ],
        safe_diy_checks: ['Inspect brake friction material for excessive dust or wear.'],
        safety_guidance: 'Brakes are a critical safety system. Avoid high speeds and arrange a prompt inspection.',
        mechanic_guidance: 'If the squeal turns into grinding or pedal feel changes, consult a mechanic immediately.',
      };

      const formatted = formatAiResponseText(concludedDiagnosis);

      // Must contain acknowledgment header
      expect(formatted).toContain('Thanks for clarifying.');
      expect(formatted).toContain('We have narrowed down the issue');
      // Must contain assessment causes
      expect(formatted).toContain('Brake Dust Buildup');
      expect(formatted).toContain('Glazed Brake Friction Surface');
      // Must contain safe checks
      expect(formatted).toContain('Safe checks you can perform:');
      expect(formatted).toContain('Inspect brake friction material');
    });
  });

  describe('Cautious Brake Safety Rules', () => {
    it('never reassures that continued travel is safe for brake-related symptoms', () => {
      const brakeDataWithInsecureAdvice = {
        type: 'diagnostic',
        status: 'diagnosis_ready',
        summary: 'Rear brake squeaking noise during slow driving',
        severity: 'MODERATE',
        urgency: 'Moderate',
        possible_causes: [{ cause: 'Worn rear brake pads' }],
        safety_guidance: 'If the symptom is mild and intermittent, you can continue carefully for short distances, but arrange a safe checkup.',
        recommended_actions: ['Inspect rear brake pads'],
      };

      const formatted = formatAiResponseText(brakeDataWithInsecureAdvice);

      // Must NOT contain the old permissive language for brakes
      expect(formatted).not.toContain('you can continue carefully for short distances');
      // Must contain strict cautious brake advice
      expect(formatted).toContain('Brakes are a critical safety system');
      expect(formatted).toContain('arrange a professional inspection rather than assuming continued travel is safe');
    });

    it('advises safe stopping immediately if brake grinding or reduced braking feel is reported', () => {
      const severeBrakeData = {
        type: 'diagnostic',
        status: 'diagnosis_ready',
        summary: 'Grinding metal sound when pressing rear brake pedal',
        severity: 'HIGH',
        urgency: 'HIGH: Stop operating the vehicle safely',
        possible_causes: [{ cause: 'Brake pads worn down to metal backing plate' }],
        safety_guidance: 'Because brakes are a critical safety system, grinding indicates severe component wear. Stop in a safe place and arrange professional inspection rather than continuing travel.',
        recommended_actions: ['Stop driving and arrange towing or mobile mechanic'],
      };

      const formatted = formatAiResponseText(severeBrakeData);

      expect(formatted).toContain('Stop in a safe place');
      expect(formatted).toContain('rather than continuing travel');
    });

    it('allows mild non-brake issues to provide standard short-distance guidance', () => {
      const cosmeticData = {
        type: 'diagnostic',
        status: 'diagnosis_ready',
        summary: 'Cabin interior dome light flickers occasionally',
        severity: 'LOW',
        urgency: 'Routine',
        possible_causes: [{ cause: 'Loose bulb filament' }],
        safe_diy_checks: ['Ensure bulb is properly seated'],
        recommended_actions: ['Replace dome light bulb'],
      };

      const formatted = formatAiResponseText(cosmeticData);

      expect(formatted).toContain('What might be causing it?');
      expect(formatted).toContain('Loose bulb filament');
      expect(formatted).toContain('continue carefully for short distances');
    });
  });
});
