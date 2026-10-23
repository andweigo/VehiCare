import assert from 'assert';
import {
  isGeneralQuestion,
  buildCompactGeneralPrompt,
  buildDiagnosisPrompt,
} from '../src/prompts/diagnosis.prompt.js';
import {
  isMaintenanceOrHowToIntent,
  isNoDefectClarification,
  isRepairGuideIntent,
  isContextDependentFollowUp,
} from '../src/utils/symptom-normalizer.js';

console.log('================================================================');
console.log('VehiCare AI Service - 3-Intent Classification & Routing Suite');
console.log('================================================================');

// -------------------------------------------------------------
// Test 1: Normal / General Conversation
// -------------------------------------------------------------
{
  assert.strictEqual(isGeneralQuestion('hello'), true, 'Greeting "hello" must be general question');
  assert.strictEqual(isGeneralQuestion('kumusta'), true, 'Greeting "kumusta" must be general question');
  assert.strictEqual(isGeneralQuestion('good morning'), true, 'Greeting "good morning" must be general question');
  assert.strictEqual(isGeneralQuestion('thank you very much'), true, 'Appreciation must be general question');
  assert.strictEqual(isGeneralQuestion('what is the function of a catalytic converter?'), true, 'Automotive concept question must be general question');
  console.log('[PASS] Test 1: Normal conversation and greetings correctly classified');
}

// -------------------------------------------------------------
// Test 2: Maintenance / How-To / Upgrade / Replacement Guides
// -------------------------------------------------------------
{
  const maintenanceQueries = [
    'can you help me change my lights?',
    'how to change headlight bulb',
    'how do i replace my brake pads',
    'help me change my motorcycle bulb',
    'paano magpalit ng spark plug',
    'paano mag change oil sa sniper 150',
    'how to install new battery',
    'how to upgrade headlights to led',
    'how to clean motorcycle carburetor',
  ];

  for (const q of maintenanceQueries) {
    assert.strictEqual(
      isMaintenanceOrHowToIntent(q),
      true,
      `Query "${q}" must be recognized as maintenance or how-to intent`
    );
    assert.strictEqual(
      isGeneralQuestion(q),
      true,
      `Query "${q}" must be routed as general/maintenance question`
    );
  }
  console.log('[PASS] Test 2: Maintenance and DIY how-to queries correctly recognized');
}

// -------------------------------------------------------------
// Test 3: No-Defect Clarification ("nothing lang, i just want to change it")
// -------------------------------------------------------------
{
  const noDefectReplies = [
    'nothing lang, i just want to change it',
    'wala lang, gusto ko lang palitan',
    'nothing is broken, just upgrading',
    'walang sira, routine maintenance lang',
    'no problem, i just want to change the bulb',
  ];

  const dummyHistory = [
    { role: 'user', content: 'can you help me change my lights?' },
    { role: 'assistant', content: 'Sure! What vehicle and what type of lights?' },
  ];

  for (const reply of noDefectReplies) {
    assert.strictEqual(
      isNoDefectClarification(reply),
      true,
      `Reply "${reply}" must be recognized as no-defect clarification`
    );
    assert.strictEqual(
      isGeneralQuestion(reply, dummyHistory),
      true,
      `Reply "${reply}" with history must be classified as general/maintenance, NOT forced diagnostic`
    );
  }
  console.log('[PASS] Test 3: User disclaimers of defects override diagnostic continuity');
}

// -------------------------------------------------------------
// Test 4: Problem Diagnosis / Malfunction Queries
// -------------------------------------------------------------
{
  const diagnosticQueries = [
    'My engine is emitting heavy black smoke and knocking',
    'Brake squeaking and grinding loudly when stopping',
    'Engine won\'t start, only clicking sound',
    'Coolant leaking from radiator under the car',
    'Steering wheel vibrating violently at 60kmh',
  ];

  for (const q of diagnosticQueries) {
    assert.strictEqual(
      isGeneralQuestion(q),
      false,
      `Symptom query "${q}" must NOT be classified as general question`
    );
  }
  console.log('[PASS] Test 4: True mechanical symptoms correctly routed to diagnostic mode');
}

// -------------------------------------------------------------
// Test 5: Context-dependent short replies with history remain diagnostic
// -------------------------------------------------------------
{
  const diagHistory = [
    { role: 'user', content: 'My motorcycle makes a clicking sound when pressing the starter' },
    { role: 'assistant', content: 'Do the headlights dim or flicker when you press the button?' },
  ];
  const diagnosticState = { assessments: [{ status: 'needs_clarification' }] };

  assert.strictEqual(isContextDependentFollowUp('yes'), true);
  assert.strictEqual(
    isGeneralQuestion('yes', diagHistory, diagnosticState),
    false,
    'Short follow-up answer "yes" in diagnostic flow must remain diagnostic'
  );
  assert.strictEqual(
    isGeneralQuestion('only when cold', diagHistory, diagnosticState),
    false,
    'Condition answer "only when cold" in diagnostic flow must remain diagnostic'
  );
  console.log('[PASS] Test 5: Context-dependent follow-up answers preserve diagnostic continuity');
}

// -------------------------------------------------------------
// Test 6: Prompt Generation for Maintenance Guides Omits Defect Causes
// -------------------------------------------------------------
{
  const vehicle = { brand: 'Yamaha', model: 'Sniper 150', year: '2021', type: 'Motorcycle' };
  const prompt = buildCompactGeneralPrompt({
    vehicleContext: vehicle,
    symptoms: 'can you help me change my lights?',
    userLanguage: 'en',
    history: [],
  });

  assert(prompt.includes('Yamaha Sniper 150'), 'Prompt must include vehicle context');
  assert(prompt.includes('Tools and materials needed'), 'Prompt must instruct tool listing');
  assert(prompt.includes('Specific part/fluid specifications'), 'Prompt must instruct part specs');
  assert(prompt.includes('Do NOT include diagnostic causes'), 'Prompt must prohibit diagnostic defect causes');
  assert(prompt.includes('"type": "conversation"'), 'Prompt must specify conversation output format');
  console.log('[PASS] Test 6: Compact general/maintenance prompt instructs DIY guidance without defect causes');
}

// -------------------------------------------------------------
// Test 7: buildDiagnosisPrompt routes no-defect follow-up to compact prompt or includes Maintenance Override
// -------------------------------------------------------------
{
  const vehicle = { brand: 'Yamaha', model: 'Sniper 150', year: '2021', type: 'Motorcycle' };
  const history = [
    { role: 'user', content: 'can you help me change my lights?' },
    { role: 'assistant', content: 'What light do you want to change?' },
  ];

  // Case A: Text-only no-defect follow-up routes directly to compact prompt
  const textPrompt = buildDiagnosisPrompt({
    vehicleContext: vehicle,
    symptoms: 'headlight, nothing lang, i just want to change it',
    rootSymptom: 'can you help me change my lights?',
    userLanguage: 'en',
    history,
  });
  assert(textPrompt.includes('"type": "conversation"'), 'Text-only prompt must route to conversation format');
  assert(textPrompt.includes('Tools and materials needed'), 'Text-only prompt must include DIY tools instruction');

  // Case B: With media attached, full prompt includes Intent rules & Maintenance Override
  const mediaPrompt = buildDiagnosisPrompt({
    vehicleContext: vehicle,
    symptoms: 'headlight, nothing lang, i just want to change it',
    rootSymptom: 'can you help me change my lights?',
    userLanguage: 'en',
    history,
    hasMedia: true,
    inputType: 'image',
  });

  assert(mediaPrompt.includes('INTENT RE-CLASSIFICATION & MAINTENANCE OVERRIDE:'), 'Must include maintenance override rule');
  assert(mediaPrompt.includes('OVERRIDE diagnostic continuity'), 'Must instruct model to override diagnostic continuity');
  assert(mediaPrompt.includes('Do NOT force a mechanical fault or invent causes'), 'Must prohibit fake causes');
  assert(mediaPrompt.includes('THREE DISTINCT INTENT MODES:'), 'Must clearly specify the 3 intent modes');
  console.log('[PASS] Test 7: Diagnostic prompt includes explicit intent re-classification & maintenance override');
}

console.log('================================================================');
console.log('Intent Classification Suite Results: All 7 tests passed cleanly!');
console.log('================================================================');
