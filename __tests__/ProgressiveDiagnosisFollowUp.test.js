import { formatAiResponseText, findRootComplaint } from '../src/screens/AskVehiCareScreen';

describe('Progressive AI Diagnostic Follow-Up & Cautious Brake Safety', () => {
  describe('Root Complaint Extraction (Ignoring Greetings & Clarification Options)', () => {
    it('correctly identifies the real symptom complaint when user began with hello and asked how to fix', () => {
      const chatMessages = [
        { role: 'assistant', text: 'Hello welgo! Describe any symptoms...' },
        { role: 'user', text: 'hello' },
        { role: 'assistant', text: 'Hello! Let me know if you are experiencing any starting issues...' },
        { role: 'user', text: 'why is my horn not working and my starter is failing' },
        { role: 'assistant', text: 'Loss of electrical power to accessories...' },
        { role: 'user', text: 'how can i fix it' },
        { role: 'assistant', text: 'Hey, no worries! What might be causing it: 1. Weak battery, 2. Blown fuse...' },
      ];

      const root = findRootComplaint(chatMessages, 'B. Lights are very dim or flicker');
      expect(root).toBe('why is my horn not working and my starter is failing');
    });

    it('does not select a multiple-choice option string as the root complaint', () => {
      const chatMessages = [
        { role: 'user', text: 'why is my horn not working and my starter is failing' },
        { role: 'assistant', text: 'When you press the starter button, do the lights dim?' },
        { role: 'user', text: 'B. Lights are very dim or flicker' },
      ];

      const root = findRootComplaint(chatMessages, 'B. Lights are very dim or flicker');
      expect(root).toBe('why is my horn not working and my starter is failing');
    });
  });

  describe('Progressive Follow-Up Turn Formatting (Rule 4: Update, don\'t restart & No Repetitive Greetings)', () => {
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

    it('formats a concluded diagnosis turn with acknowledgment header and final assessment without repeating "Hey, no worries!"', () => {
      const concludedDiagnosis = {
        type: 'diagnostic',
        status: 'diagnosis_ready',
        follow_up_ack: 'Got it. Because the lights dim or flicker when pressing the starter, current is flowing, which rules out a blown main fuse.',
        diagnostic_progress: 'This directly narrows the cause to battery capacity deficiency or high terminal resistance.',
        whats_happening: "Hey, no worries! We'll figure this out together. Here's what's happening: Electrical power deficiency affecting starter and horn due to battery depletion.",
        summary: 'Electrical power deficiency affecting starter and horn due to battery depletion.',
        severity: 'MODERATE',
        urgency: 'Routine',
        possible_causes: [
          {
            cause: 'Discharged or Worn Out Battery',
            reason: 'The battery stores the electricity needed for starting. Flickering lights confirm heavy voltage sag under starter load.',
          },
          {
            cause: 'Loose or Corroded Battery Terminals',
            reason: 'Corrosion creates high electrical resistance, causing lights to dim when high amperage is demanded.',
          },
        ],
        safe_diy_checks: ['Inspect battery terminal screws for tightness', 'Test battery resting and cranking voltage'],
        safety_guidance: 'If the symptom is mild and intermittent, you can continue carefully for short distances, but arrange a safe checkup.',
        mechanic_guidance: 'If the battery does not hold charge after a full cycle, have it replaced.',
      };

      const formatted = formatAiResponseText(concludedDiagnosis);

      // Must contain acknowledgment header and direct deduction
      expect(formatted).toContain('Got it. Because the lights dim or flicker');
      expect(formatted).toContain('rules out a blown main fuse');
      expect(formatted).toContain('directly narrows the cause');

      // Must NOT repeat "Hey, no worries! We'll figure this out together." in the body
      expect(formatted).not.toContain("Hey, no worries! We'll figure this out together.");

      // Must contain assessment causes
      expect(formatted).toContain('Discharged or Worn Out Battery');
      expect(formatted).toContain('Loose or Corroded Battery Terminals');
      // Must NOT contain contradicted causes like Blown Main Fuse
      expect(formatted).not.toContain('Blown Main Fuse');
    });

    it('replaces the robotic "Hey, no worries! We\'ll figure this out together" with varied natural openings', () => {
      const initialDiagnosisWithCannedIntro = {
        type: 'diagnostic',
        status: 'diagnosis_ready',
        whats_happening: "Hey, no worries! We'll figure this out together. Here's what's happening: Loss of electrical power to starter and horn.",
        summary: 'Loss of electrical power to starter and horn.',
        severity: 'MODERATE',
        urgency: 'Moderate',
        possible_causes: [{ cause: 'Weak or Depleted Battery' }],
        recommended_actions: ['Inspect battery terminals'],
      };

      const formatted = formatAiResponseText(initialDiagnosisWithCannedIntro);
      expect(formatted).not.toContain("Hey, no worries! We'll figure this out together.");
      expect(formatted).toContain('Loss of electrical power to starter and horn.');
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
