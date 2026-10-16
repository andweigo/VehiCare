import { buildDiagnosisPrompt, formatHistoricalContext } from '../src/prompts/diagnosis.prompt.js';
import { cacheService } from '../src/services/cache.service.js';
import { diagnosticOutputSchema } from '../src/validators/response.validator.js';

let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (!condition) {
    console.error(`[FAIL] Test ${totalCount}: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedCount++;
  console.log(`[PASS] Test ${totalCount}: ${message}`);
}

console.log('================================================================');
console.log('VehiCare Node.js AI Service: Free vs Premium Entitlements Suite');
console.log('================================================================\n');

// 1. Free Prompt Structure
const freePrompt = buildDiagnosisPrompt({
  vehicleContext: { type: 'Motorcycle', brand: 'Yamaha', model: 'Mio Aerox', year: 2022 },
  symptoms: 'Clicking sound when starting, engine does not turn over',
  userLanguage: 'en',
  entitlements: { plan: 'free', is_premium: false, response_depth: 'essential' },
  historicalContext: {},
});

assert(freePrompt.includes('SUBSCRIPTION TIER: FREE — ESSENTIAL VEHICLE CARE'), 'Free prompt contains Free tier header');
assert(freePrompt.includes('Set "repair_guidance", "cost_breakdown", and "history_insights" to null'), 'Free prompt instructs null premium fields');
assert(freePrompt.includes('DOMAIN & SAFETY RULES (APPLIES STRICTLY TO ALL TIERS)'), 'Free prompt contains shared safety rules');

// 2. Premium Prompt Structure without History
const premiumPrompt = buildDiagnosisPrompt({
  vehicleContext: { type: 'Motorcycle', brand: 'Yamaha', model: 'Mio Aerox', year: 2022 },
  symptoms: 'Clicking sound when starting, engine does not turn over',
  userLanguage: 'en',
  entitlements: { plan: 'premium', is_premium: true, response_depth: 'deep_structured' },
  historicalContext: {},
});

assert(premiumPrompt.includes('SUBSCRIPTION TIER: PREMIUM — ADVANCED VEHICLE CARE'), 'Premium prompt contains Premium tier header');
assert(premiumPrompt.includes('comprehensive step-by-step repair guidance in "repair_guidance"'), 'Premium prompt instructs repair guidance');
assert(premiumPrompt.includes('itemized cost breakdown in "cost_breakdown"'), 'Premium prompt instructs cost breakdown');

// 3. Premium Prompt with Authorized History
const mockHistory = {
  recent_repairs: [
    { title: 'Replaced battery', problem: 'No crank', solution: 'New Yuasa 12V battery', status: 'completed', date: '2026-05-10' },
  ],
  recent_maintenance: [
    { title: 'Electrical Inspection', service_type: 'Electrical Inspection', status: 'completed', date: '2026-06-01' },
  ],
  past_diagnostics: [
    { symptoms: 'Hard start in morning', suspected_causes: ['Weak battery', 'Spark plug wear'], date: '2026-04-12' },
  ],
};

const premiumWithHistoryPrompt = buildDiagnosisPrompt({
  vehicleContext: { type: 'Motorcycle', brand: 'Yamaha', model: 'Mio Aerox', year: 2022 },
  symptoms: 'Clicking sound when starting, engine does not turn over',
  userLanguage: 'en',
  entitlements: { plan: 'premium', is_premium: true, response_depth: 'deep_structured' },
  historicalContext: mockHistory,
});

assert(premiumWithHistoryPrompt.includes('AUTHORIZED SAVED VEHICLE HISTORY:'), 'Premium prompt includes history section');
assert(premiumWithHistoryPrompt.includes('[CONFIRMED REPAIR on 2026-05-10]: Replaced battery'), 'Includes confirmed repair with date');
assert(premiumWithHistoryPrompt.includes('[PAST UNCONFIRMED HYPOTHESIS on 2026-04-12]'), 'Strictly labels unconfirmed past hypothesis');
assert(premiumWithHistoryPrompt.includes('NEVER treat an unconfirmed past diagnostic hypothesis as a confirmed repair'), 'Includes anti-hallucination rule');

// 4. Free Prompt ignores history even if passed accidentally
const freeWithHistoryPrompt = buildDiagnosisPrompt({
  vehicleContext: { type: 'Motorcycle', brand: 'Yamaha', model: 'Mio Aerox', year: 2022 },
  symptoms: 'Clicking sound when starting, engine does not turn over',
  userLanguage: 'en',
  entitlements: { plan: 'free', is_premium: false, response_depth: 'essential' },
  historicalContext: mockHistory,
});

assert(!freeWithHistoryPrompt.includes('AUTHORIZED SAVED VEHICLE HISTORY:'), 'Free prompt never leaks history even if present in context');

// 5. Cache Key Isolation between Free and Premium
const freeKey = cacheService.generateKey({
  requestType: 'diagnostic',
  vehicleContext: { type: 'Motorcycle', brand: 'Yamaha', model: 'Mio Aerox', year: 2022 },
  symptoms: 'Clicking sound when starting',
  userLanguage: 'en',
  plan: 'free',
});

const premiumKey = cacheService.generateKey({
  requestType: 'diagnostic',
  vehicleContext: { type: 'Motorcycle', brand: 'Yamaha', model: 'Mio Aerox', year: 2022 },
  symptoms: 'Clicking sound when starting',
  userLanguage: 'en',
  plan: 'premium',
});

assert(Boolean(freeKey), 'Free cache key is generated');
assert(Boolean(premiumKey), 'Premium cache key is generated');
assert(freeKey !== premiumKey, 'Free and Premium produce distinct cache keys for identical symptoms');
assert(freeKey.includes(':free:'), 'Free key is scoped by :free:');
assert(premiumKey.includes(':premium:'), 'Premium key is scoped by :premium:');

// 6. Schema Validation for Free Output
const freeOutput = {
  type: 'diagnostic',
  status: 'diagnosis_ready',
  plan_tier: 'free',
  confidence: { score: 75, level: 'MODERATE', reason: 'Common starting symptom' },
  summary: 'Your motorcycle may have a weak battery or starter relay issue.',
  reported: ['Clicking sound when starting'],
  severity: 'MODERATE',
  urgency: 'Inspection recommended.',
  possible_causes: [
    { cause: 'Weak battery charge', likelihood: 'HIGH', likelihood_score: 80, reason: 'Low voltage causes relay clicking.' },
  ],
  recommended_actions: ['Check battery terminals', 'Test headlight brightness when starting'],
  maintenance_tasks: [
    { title: 'Inspect battery and connections', service_type: 'Electrical Inspection', urgency: 'Urgent', is_inspection: true },
  ],
  smart_recommendations: [
    { title: 'Battery maintenance', problem: 'Low voltage', preventive_action: 'Keep terminals clean and check voltage regularly.', reason: 'Prevents sudden no-crank failure.' },
  ],
  clarification_questions: [
    { question: 'Do the dash lights dim when you press the starter?', options: ['Yes, dims significantly', 'No, stays bright'] },
  ],
  repair_guidance: null,
  cost_breakdown: null,
  history_insights: null,
  estimated_cost: { min: 800, max: 2500, currency: 'PHP' },
};

const freeValidation = diagnosticOutputSchema.safeParse(freeOutput);
assert(freeValidation.success, 'Free diagnostic output passes schema validation');
assert(freeValidation.data.repair_guidance === null, 'Free repair_guidance is null');
assert(freeValidation.data.cost_breakdown === null, 'Free cost_breakdown is null');

// 7. Schema Validation for Premium Output
const premiumOutput = {
  ...freeOutput,
  plan_tier: 'premium',
  repair_guidance: {
    difficulty: 'Beginner',
    diy_friendly: true,
    estimated_diy_time: '20-30 mins',
    tools_needed: ['10mm wrench', 'Digital multimeter'],
    prerequisites: ['Turn key to OFF', 'Wear protective gloves'],
    steps: [
      'Locate the battery under the seat compartment.',
      'Check if cables are securely fastened to both terminals.',
      'Measure resting voltage with multimeter (healthy is 12.4V - 12.8V).',
    ],
    safety_stopping_conditions: [
      'Stop immediately if you notice swelling on the battery case.',
      'Stop if sparks or burning odor are observed.',
    ],
  },
  cost_breakdown: {
    parts: { min: 900, max: 1800, items: ['Maintenance-free 12V 5Ah motorcycle battery'] },
    labor: { min: 200, max: 400 },
    assumptions: 'Based on standard aftermarket battery and local shop installation rates in PHP.',
    price_uncertainty_note: 'Prices may vary if OEM brand is preferred.',
  },
  history_insights: 'Note: A battery replacement was recorded on 2026-05-10. Since clicking recurs, inspect the alternator charging stator or starter relay rather than replacing the battery immediately.',
};

const premiumValidation = diagnosticOutputSchema.safeParse(premiumOutput);
assert(premiumValidation.success, 'Premium diagnostic output passes schema validation');
assert(premiumValidation.data.repair_guidance.diy_friendly === true, 'Premium repair_guidance contains diy_friendly');
assert(premiumValidation.data.cost_breakdown.parts.min === 900, 'Premium cost_breakdown contains itemized parts');
assert(Boolean(premiumValidation.data.history_insights), 'Premium history_insights is populated');

console.log(`\n================================================================`);
console.log(`Entitlements Suite Results: ${passedCount}/${totalCount} tests passed cleanly.`);
console.log(`================================================================\n`);
