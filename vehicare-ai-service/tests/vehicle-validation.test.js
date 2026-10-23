import assert from 'assert';
import { processDiagnosisRequest } from '../src/services/diagnosis.service.js';
import { __setMockCallGemini, __resetMockCallGemini } from '../src/services/gemini.service.js';
import { cacheService } from '../src/services/cache.service.js';
import { diagnosticOutputSchema } from '../src/validators/response.validator.js';

console.log('================================================================');
console.log('VehiCare AI Service - Vehicle Validation & Mismatch Suite');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

const test = async (name, fn) => {
  totalTests++;
  cacheService.clear();
  __resetMockCallGemini();
  try {
    await fn();
    console.log(`[PASS] Test ${totalTests}: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${name}`);
    console.error(err);
    process.exit(1);
  }
};

const savedVehicle = {
  id: 10,
  make: 'Lamborghini',
  brand: 'Lamborghini',
  model: 'Urus',
  year: 2022,
  type: 'SUV',
  is_saved_vehicle: true,
};

// Test 1: Image vehicle mismatch wipes maintenance tasks and causes, and returns vehicle_mismatch
await test('Image vehicle mismatch enforces vehicle_mismatch type and strips maintenance tasks', async () => {
  __setMockCallGemini(async ({ prompt }) => {
    return {
      text: JSON.stringify({
        type: 'vehicle_mismatch',
        status: 'vehicle_mismatch',
        image_vehicle_match: 'possible_mismatch',
        image_vehicle_details: {
          category: 'Motorcycle',
          estimated_make: 'Yamaha',
          estimated_model: 'Mio',
          confidence: 'high',
          details: 'Image clearly shows a motorcycle brake disc and spoke wheel, not an SUV.',
        },
        vehicle_context_status: 'mismatch',
        summary: 'The uploaded photo depicts a motorcycle, which does not match your Lamborghini Urus profile.',
        response: 'The uploaded photo depicts a motorcycle, which does not match your Lamborghini Urus profile.',
        maintenance_tasks: [
          {
            title: 'Motorcycle Brake Pad Replacement',
            service_type: 'Brake Inspection',
            description: 'Inspect motorcycle brake caliper',
            urgency: 'Urgent',
            is_inspection: true,
            what_to_do: 'Check pads',
            why_it_matters: 'Braking power',
            when_due: 'Immediate',
            skill_level: 'Mechanic recommended',
            completion_check: 'Check thickness',
          },
        ],
        smart_recommendations: [
          {
            title: 'Motorcycle Chain Lubrication',
            category_section: 'do_this_now',
            problem: 'Chain wear',
            preventive_action: 'Lube chain',
            reason: 'Prevent chain slip',
            warning_signs: 'Dry sound',
            safety_precaution: 'Engine off',
          },
        ],
        possible_causes: [
          {
            cause: 'Motorcycle Rotor Wear',
            likelihood: 'HIGH',
            likelihood_score: 90,
            reason: 'Thin motorcycle rotor',
          },
        ],
        clarification_questions: [
          {
            question: 'How would you like to proceed?',
            options: ['Upload correct media', 'Switch vehicle profile', 'Start separate consultation'],
          },
        ],
      }),
      modelUsed: 'gemini-3.6-flash',
      fallbackUsed: false,
      durationMs: 40,
    };
  });

  const payload = {
    request_id: 'req_mismatch_1',
    user_context: { id: 1, language: 'en', plan: 'free' },
    vehicle_context: savedVehicle,
    diagnosis: {
      symptoms: 'Rear brake squeal',
      input_type: 'image',
      media_base64: 'AAAA'.repeat(20),
      media_mime: 'image/jpeg',
      history: [],
    },
    entitlements: { plan: 'free' },
  };

  const result = await processDiagnosisRequest(payload);
  assert(result.success, 'Request must succeed');
  assert.strictEqual(result.diagnosis.type, 'vehicle_mismatch', 'Type must be vehicle_mismatch');
  assert.strictEqual(result.diagnosis.status, 'vehicle_mismatch', 'Status must be vehicle_mismatch');
  assert.strictEqual(result.diagnosis.image_vehicle_match, 'possible_mismatch');
  assert.strictEqual(result.diagnosis.vehicle_context_status, 'mismatch');
  assert.strictEqual(result.diagnosis.maintenance_tasks.length, 0, 'Maintenance tasks must be emptied for mismatch');
  assert.strictEqual(result.diagnosis.smart_recommendations.length, 0, 'Smart recommendations must be emptied for mismatch');
  assert.strictEqual(result.diagnosis.possible_causes.length, 0, 'Possible causes must be emptied for mismatch');
  assert.strictEqual(result.diagnosis.repair_guidance, null);
  assert.strictEqual(result.diagnosis.cost_breakdown, null);

  // Validate with Zod schema
  const parsed = diagnosticOutputSchema.safeParse(result.diagnosis);
  assert(parsed.success, `Schema validation failed: ${JSON.stringify(parsed.error?.issues)}`);

  // Ensure it was NOT cached
  const cached = cacheService.get('diagnostic:free:car:lamborghini:urus:2022:req_mismatch_1');
  assert.strictEqual(cached, null, 'Vehicle mismatch result must never be cached');
});

// Test 2: Different vehicle mentioned requires switch confirmation and strips tasks
await test('Different vehicle mentioned enforces vehicle_switch_confirmation_required', async () => {
  __setMockCallGemini(async ({ prompt }) => {
    return {
      text: JSON.stringify({
        type: 'vehicle_switch_confirmation_required',
        status: 'vehicle_switch_confirmation_required',
        vehicle_context_status: 'different_vehicle_mentioned',
        mentioned_vehicle: 'Ferrari F8',
        summary: 'Inquiry mentions Ferrari F8 while Lamborghini Urus is currently selected.',
        response: 'Your inquiry mentions a Ferrari F8, which is different from your selected Lamborghini Urus. Would you like to switch vehicle profiles or start a separate consultation?',
        maintenance_tasks: [
          {
            title: 'Ferrari Oil Change',
            service_type: 'Oil Service',
            description: 'Check oil',
            urgency: 'Moderate',
            is_inspection: true,
            what_to_do: 'Inspect oil',
            why_it_matters: 'Engine protection',
            when_due: 'Routine',
            skill_level: 'Basic skills',
            completion_check: 'Check dipstick',
          },
        ],
        possible_causes: [
          {
            cause: 'Ferrari turbo hose leak',
            likelihood: 'HIGH',
            likelihood_score: 80,
            reason: 'Hose failure',
          },
        ],
        clarification_questions: [
          {
            question: 'How would you like to proceed?',
            options: ['Switch vehicle profile', 'Start separate consultation', 'Continue with current vehicle'],
          },
        ],
      }),
      modelUsed: 'gemini-3.6-flash',
      fallbackUsed: false,
      durationMs: 35,
    };
  });

  const payload = {
    request_id: 'req_switch_1',
    user_context: { id: 1, language: 'en', plan: 'free' },
    vehicle_context: savedVehicle,
    diagnosis: {
      symptoms: 'How do I change the oil on my Ferrari F8?',
      input_type: 'text',
      history: [],
    },
    entitlements: { plan: 'free' },
  };

  const result = await processDiagnosisRequest(payload);
  assert(result.success, 'Request must succeed');
  assert.strictEqual(result.diagnosis.type, 'vehicle_switch_confirmation_required');
  assert.strictEqual(result.diagnosis.status, 'vehicle_switch_confirmation_required');
  assert.strictEqual(result.diagnosis.vehicle_context_status, 'different_vehicle_mentioned');
  assert.strictEqual(result.diagnosis.maintenance_tasks.length, 0, 'Maintenance tasks must be emptied for switch confirmation');
  assert.strictEqual(result.diagnosis.possible_causes.length, 0, 'Possible causes must be emptied for switch confirmation');

  const parsed = diagnosticOutputSchema.safeParse(result.diagnosis);
  assert(parsed.success, `Schema validation failed: ${JSON.stringify(parsed.error?.issues)}`);
});

console.log(`================================================================`);
console.log(`Vehicle Validation Suite Results: ${passedTests}/${totalTests} tests passed cleanly.`);
console.log(`================================================================`);
