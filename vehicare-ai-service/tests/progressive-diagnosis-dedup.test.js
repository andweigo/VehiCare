/**
 * VehiCare AI Service - Progressive Diagnosis & Deduplication Regression Suite
 *
 * Verifies all 10 regression verification criteria:
 * 1. A sound-type question is not repeated after the user identifies the sound.
 * 2. Short replies are interpreted using the original complaint.
 * 3. A new answer changes the assessment or next question when relevant.
 * 4. Semantically duplicate questions are rejected.
 * 5. Already answered questions are not asked again.
 * 6. The AI stops asking questions when sufficient information is available.
 * 7. Safety-critical symptoms trigger immediate appropriate warnings.
 * 8. Follow-up responses preserve the correct vehicle and diagnostic session.
 * 9. Unrelated new complaints can start a separate diagnostic thread without losing the previous one.
 * 10. Existing text and multimodal diagnosis flows continue to work.
 */

import assert from 'node:assert';
import {
  extractEstablishedFacts,
  extractPreviousQuestions,
  filterAndSelectQuestions,
  isSemanticDuplicate,
  isSoundTypeQuestion,
  isConditionQuestion,
  isLocationQuestion,
} from '../src/services/question-dedup.js';
import { applySafetyRules } from '../src/safety/diagnosis-safety.js';
import { buildDiagnosisPrompt, isGeneralQuestion } from '../src/prompts/diagnosis.prompt.js';
import { diagnosticOutputSchema } from '../src/validators/response.validator.js';

console.log('================================================================');
console.log('VehiCare AI Service - Progressive Diagnosis Regression Suite');
console.log('================================================================');

// -------------------------------------------------------------
// Criterion 1: A sound-type question is not repeated after user identifies the sound
// -------------------------------------------------------------
{
  const history = [
    { role: 'user', content: 'My rear brake makes an unusual sound when I drive slowly.' },
    { role: 'assistant', content: 'What does the sound resemble most?\nA. High-pitched squealing or squeaking\nB. Grinding or scraping' },
  ];
  const symptoms = 'High-pitched squealing or squeaking';
  const rootSymptom = 'My rear brake makes an unusual sound when I drive slowly.';

  const facts = extractEstablishedFacts(history, symptoms, rootSymptom);
  assert(facts.soundTypes.includes('squeal') || facts.soundTypes.includes('squeak'), 'Sound type squeal/squeak must be detected');

  const proposedQuestions = [
    {
      question: 'What does the sound resemble most?',
      options: ['Squealing', 'Grinding', 'Clicking'],
    },
    {
      question: 'Does the sound change when you gently apply the rear brake?',
      options: ['Yes, it changes or stops', 'No, it stays the same', 'I\'m not sure'],
    },
  ];

  const result = filterAndSelectQuestions({
    proposedQuestions,
    history,
    diagnosticState: null,
    symptoms,
    rootSymptom,
    maxClarificationTurns: 2,
  });

  assert.strictEqual(result.questions.length, 1, 'Must select at most ONE question');
  assert(
    !isSoundTypeQuestion(result.selectedQuestion.question),
    'Sound-type question must NOT be selected after user already identified squealing'
  );
  assert.strictEqual(
    result.selectedQuestion.question,
    'Does the sound change when you gently apply the rear brake?',
    'Should choose the high-value brake application question instead'
  );
  console.log('[PASS] Criterion 1: Sound-type question is not repeated after user identifies sound');
}

// -------------------------------------------------------------
// Criterion 2: Short replies are interpreted using original complaint
// -------------------------------------------------------------
{
  const history = [
    { role: 'user', content: 'My engine is losing power during acceleration' },
    { role: 'assistant', content: 'Does the engine sputter or rev without moving?' },
  ];
  const shortReply = 'yes';
  const diagnosticState = { assessments: [{ status: 'needs_clarification' }] };

  const isGen = isGeneralQuestion(shortReply, history, diagnosticState);
  assert.strictEqual(isGen, false, 'Short reply "yes" with history must NOT be classified as general question');

  const prompt = buildDiagnosisPrompt({
    vehicleContext: { brand: 'Yamaha', model: 'Mio Aerox 155', year: '2022', type: 'Motorcycle' },
    symptoms: shortReply,
    rootSymptom: 'My engine is losing power during acceleration',
    userLanguage: 'en',
    history,
  });

  assert(prompt.includes('ROOT / ORIGINAL DIAGNOSTIC COMPLAINT:'), 'Prompt must include original complaint section');
  assert(prompt.includes('My engine is losing power during acceleration'), 'Prompt must contain the root complaint');
  assert(prompt.includes('LATEST USER FOLLOW-UP / ANSWER:'), 'Prompt must mark short reply as follow-up');
  console.log('[PASS] Criterion 2: Short replies are interpreted using original complaint');
}

// -------------------------------------------------------------
// Criterion 3: New answer changes the assessment or next question when relevant
// -------------------------------------------------------------
{
  const historyBefore = [
    { role: 'user', content: 'My rear brake makes an unusual sound when I drive slowly.' },
    { role: 'assistant', content: 'What does the sound resemble most?' },
  ];

  // Case A: User answers "High-pitched squealing or squeaking"
  const squealResult = filterAndSelectQuestions({
    proposedQuestions: [
      { question: 'What does the sound resemble?' },
      { question: 'Does the sound change when you gently apply the rear brake?' },
    ],
    history: historyBefore,
    symptoms: 'High-pitched squealing or squeaking',
    rootSymptom: 'My rear brake makes an unusual sound when I drive slowly.',
  });

  // Case B: User answers "Grinding or scraping" -> safety risk changes!
  const grindingSafety = applySafetyRules(
    { summary: 'Rear brake inspection', severity: 'MODERATE', possible_causes: [{ cause: 'Brake pad wear' }] },
    'Grinding or scraping from rear brake'
  );

  assert.strictEqual(squealResult.selectedQuestion.question, 'Does the sound change when you gently apply the rear brake?');
  assert.strictEqual(grindingSafety.severity, 'HIGH', 'Grinding noise must elevate severity to HIGH');
  assert(grindingSafety.safety_guidance.includes('Because brakes are a critical safety system'), 'Must include brake safety guidance');
  console.log('[PASS] Criterion 3: New answer changes assessment and next question when relevant');
}

// -------------------------------------------------------------
// Criterion 4: Semantically duplicate questions are rejected
// -------------------------------------------------------------
{
  assert.strictEqual(
    isSemanticDuplicate('What does the sound resemble most?', 'What kind of noise does it make?'),
    true,
    'Rephrased sound questions must be detected as semantic duplicates'
  );

  assert.strictEqual(
    isSemanticDuplicate('When do you observe this symptom most frequently?', 'At what speed or condition do you hear it?'),
    true,
    'Rephrased condition/timing questions must be detected as semantic duplicates'
  );

  assert.strictEqual(
    isSemanticDuplicate('Does the sound change when you gently apply the rear brake?', 'Does applying the brake alter the noise?'),
    true,
    'Rephrased brake application questions must be detected as semantic duplicates'
  );

  console.log('[PASS] Criterion 4: Semantically duplicate questions are rejected');
}

// -------------------------------------------------------------
// Criterion 5: Already answered questions are not asked again
// -------------------------------------------------------------
{
  const history = [
    { role: 'user', content: 'My rear brake makes an unusual sound when I drive slowly.' },
    { role: 'assistant', content: 'Does the sound change when you gently apply the rear brake?\nA. Yes\nB. No' },
  ];
  const symptoms = 'Yes, it changes or stops';
  const rootSymptom = 'My rear brake makes an unusual sound when I drive slowly.';

  const facts = extractEstablishedFacts(history, symptoms, rootSymptom);
  assert.strictEqual(facts.brakeApplicationKnown, true, 'Brake application effect must be marked as known');

  const result = filterAndSelectQuestions({
    proposedQuestions: [
      { question: 'Does pressing the brake pedal change the sound?' },
      { question: 'Does the noise change when you apply the rear brake?' },
    ],
    history,
    symptoms,
    rootSymptom,
  });

  assert.strictEqual(result.questions.length, 0, 'Must reject questions about already answered brake application');
  console.log('[PASS] Criterion 5: Already answered questions are not asked again');
}

// -------------------------------------------------------------
// Criterion 6: AI stops asking questions when sufficient information is available
// -------------------------------------------------------------
{
  // 2 prior questions already asked in history
  const history = [
    { role: 'user', content: 'My rear brake makes an unusual sound when I drive slowly.' },
    { role: 'assistant', content: 'What does the sound resemble most?' },
    { role: 'user', content: 'High-pitched squealing or squeaking' },
    { role: 'assistant', content: 'Does the sound change when you gently apply the rear brake?' },
  ];
  const symptoms = 'Yes, it stops';
  const rootSymptom = 'My rear brake makes an unusual sound when I drive slowly.';

  const result = filterAndSelectQuestions({
    proposedQuestions: [{ question: 'Have you noticed any smell?' }],
    history,
    symptoms,
    rootSymptom,
    maxClarificationTurns: 2,
  });

  assert.strictEqual(result.questions.length, 0, 'Must stop asking questions after turn limit reached');
  assert.strictEqual(result.reason, 'turn_limit_reached', 'Reason must be turn_limit_reached');
  console.log('[PASS] Criterion 6: AI stops asking questions when sufficient information is available');
}

// -------------------------------------------------------------
// Criterion 7: Safety-critical symptoms trigger immediate appropriate warnings
// -------------------------------------------------------------
{
  // 7a: Brake failure
  const criticalDiag = applySafetyRules(
    { summary: 'Brake pedal soft', severity: 'MODERATE' },
    'My brakes failed and the pedal goes to the floor'
  );
  assert.strictEqual(criticalDiag.severity, 'CRITICAL', 'Brake failure must be CRITICAL');
  assert(criticalDiag.urgency.includes('Stop operating the vehicle safely'), 'Must mandate safe stopping');

  // 7b: Brake squeal mild - ensure it NEVER advises "safe to continue for short distances"
  const mildBrakeDiag = applySafetyRules(
    { summary: 'Rear brake squeal', severity: 'MODERATE', safety_guidance: 'It is safe to continue for short distances.' },
    'Rear brake makes squealing noise'
  );
  assert(
    !mildBrakeDiag.safety_guidance.includes('safe to continue for short distances'),
    'Brake guidance must NEVER reassure that continued travel is safe'
  );
  assert(
    mildBrakeDiag.safety_guidance.includes('Brakes are a critical safety system'),
    'Brake guidance must emphasize critical safety system'
  );
  console.log('[PASS] Criterion 7: Safety-critical symptoms trigger immediate appropriate warnings without false reassurance');
}

// -------------------------------------------------------------
// Criterion 8: Follow-up responses preserve correct vehicle and diagnostic session
// -------------------------------------------------------------
{
  const vehicle = { brand: 'Toyota', model: 'Vios', year: '2021', type: 'Car', is_saved_vehicle: true };
  const prompt = buildDiagnosisPrompt({
    vehicleContext: vehicle,
    symptoms: 'Yes, it changes when braking',
    rootSymptom: 'Squealing noise from front left wheel',
    userLanguage: 'en',
    history: [{ role: 'user', content: 'Squealing noise from front left wheel' }],
  });

  assert(prompt.includes('SAVED VEHICLE PROFILE: 2021 Toyota Vios (Car)'), 'Preserves vehicle profile across follow-up');
  assert(prompt.includes('Squealing noise from front left wheel'), 'Preserves original root complaint');
  console.log('[PASS] Criterion 8: Follow-up responses preserve correct vehicle and session context');
}

// -------------------------------------------------------------
// Criterion 9: Unrelated new complaints can start a separate diagnostic thread
// -------------------------------------------------------------
{
  // If user opens a new complaint with distinct root symptom
  const freshPrompt = buildDiagnosisPrompt({
    vehicleContext: { brand: 'Honda', model: 'Click 125i', year: '2023', type: 'Motorcycle' },
    symptoms: 'Headlight does not turn on',
    rootSymptom: null, // Fresh thread
    history: [],
  });

  assert(freshPrompt.includes('CURRENT USER SYMPTOM / ISSUE:\n"Headlight does not turn on"'));
  assert(!freshPrompt.includes('ROOT / ORIGINAL DIAGNOSTIC COMPLAINT:'));
  console.log('[PASS] Criterion 9: Unrelated new complaints start a fresh diagnostic thread');
}

// -------------------------------------------------------------
// Criterion 10: Existing text and multimodal diagnosis flows continue to work
// -------------------------------------------------------------
{
  const validOutput = {
    type: 'diagnostic',
    status: 'needs_clarification',
    follow_up_ack: 'Got it. A high-pitched squeal can happen when brake friction surfaces vibrate or dust builds up.',
    diagnostic_progress: 'That narrows the possibilities, but doesn\'t confirm the cause.',
    response: 'Got it. A high-pitched squeal can happen when brake friction surfaces vibrate.\n\nOne question that helps narrow it down:\nDoes the sound change when you gently apply the rear brake?',
    clarification_questions: [
      {
        question: 'Does the sound change when you gently apply the rear brake?',
        options: ['Yes, it changes or stops', 'No, it stays the same', 'I\'m not sure'],
      },
    ],
  };

  const parsed = diagnosticOutputSchema.safeParse(validOutput);
  assert.strictEqual(parsed.success, true, 'Schema must successfully validate progressive response with follow_up_ack');
  assert.strictEqual(parsed.data.follow_up_ack, validOutput.follow_up_ack);
  assert.strictEqual(parsed.data.diagnostic_progress, validOutput.diagnostic_progress);
  console.log('[PASS] Criterion 10: Existing schema and diagnostic validation continue to work');
}

console.log('================================================================');
console.log('All 10 Progressive Diagnosis Regression Criteria Passed Cleanly!');
console.log('================================================================');
