import assert from 'assert';
import { processDiagnosisRequest, isSyntheticPlaceholder } from '../src/services/diagnosis.service.js';
import { cacheService } from '../src/services/cache.service.js';
import { dedupService } from '../src/services/dedup.service.js';
import { queueService } from '../src/services/queue.service.js';
import { __setMockCallGemini, __resetMockCallGemini } from '../src/services/gemini.service.js';

console.log('================================================================');
console.log('VehiCare AI Service - Multimodal Fallback & Reliability (C2) Suite');
console.log('================================================================');

async function runTests() {
  let passedCount = 0;
  let totalCount = 0;

  async function test(name, fn) {
    totalCount++;
    cacheService.clear();
    dedupService.clear();
    queueService.clear();
    try {
      await fn();
      console.log(`[PASS] Test ${totalCount}: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`[FAIL] Test ${totalCount}: ${name}`);
      console.error(`       Error: ${err.message}`);
      if (err.stack) console.error(err.stack);
    }
  }

  const sampleVehicle = {
    type: 'Car',
    brand: 'Toyota',
    model: 'Corolla',
    year: '2020',
  };

  const sampleDiagnosticResponse = {
    type: 'diagnostic',
    status: 'diagnosis_ready',
    confidence: { score: 80, level: 'HIGH', reason: 'Symptoms match typical alternator bearing failure' },
    summary: 'Alternator bearing wear causing whining noise during acceleration.',
    reported: ['High-pitched whining noise'],
    observed: [],
    severity: 'MODERATE',
    urgency: 'Inspection recommended within 500km.',
    possible_causes: [
      { cause: 'Worn alternator bearing', likelihood: 'HIGH', likelihood_score: 85, reason: 'Bearing dry or damaged' }
    ],
    recommended_actions: ['Test alternator charging output and inspect drive belt tensioner'],
    clarification_questions: [],
    estimated_cost: { min: 2500, max: 6000, currency: 'PHP' },
    professional_help: { recommended: true, requires_specialist: false, reason: 'Alternator replacement required', severity: 'MODERATE' },
  };

  const sampleMediaBase64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]).toString('base64');

  // Test 1: Helper isSyntheticPlaceholder identification
  await test('isSyntheticPlaceholder accurately detects synthetic labels vs real symptoms', async () => {
    assert.strictEqual(isSyntheticPlaceholder('Audio recording of engine or vehicle noise'), true);
    assert.strictEqual(isSyntheticPlaceholder('visual and audio vehicle video analysis'), true);
    assert.strictEqual(isSyntheticPlaceholder('Visual component analysis'), true);
    assert.strictEqual(isSyntheticPlaceholder(''), true);
    assert.strictEqual(isSyntheticPlaceholder('car'), true); // under 5 chars
    assert.strictEqual(isSyntheticPlaceholder('Engine squeals loudly when aircon is turned on'), false);
    assert.strictEqual(isSyntheticPlaceholder('Clicking sound from front wheel when making sharp turn'), false);
  });

  // Test 2: Successful multimodal diagnosis proceeds normally
  await test('Successful multimodal diagnosis returns normal gemini source and no fallback', async () => {
    let callCount = 0;
    __setMockCallGemini(async (params) => {
      callCount++;
      assert.strictEqual(Boolean(params.mediaBase64), true, 'First call should have media');
      return {
        text: JSON.stringify(sampleDiagnosticResponse),
        modelUsed: 'gemini-3.8-flash',
        fallbackUsed: false,
        durationMs: 50,
      };
    });

    try {
      const payload = {
        request_id: 'req_media_success',
        user_context: { id: 1, language: 'en' },
        vehicle_context: sampleVehicle,
        diagnosis: {
          symptoms: 'Engine makes whining noise when accelerating',
          input_type: 'audio',
          media_base64: sampleMediaBase64,
          media_mime: 'image/jpeg',
          history: [],
        },
      };

      const result = await processDiagnosisRequest(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ai_source, 'gemini');
      assert.strictEqual(result.media_fallback, false);
      assert.strictEqual(callCount, 1);
    } finally {
      __resetMockCallGemini();
    }
  });

  // Test 3: MEDIA_UPLOAD_FAILED with usable textual symptoms triggers graceful fallback to text
  await test('Recoverable media failure with usable symptoms falls back to text diagnosis cleanly', async () => {
    let callIndex = 0;
    const recordedCalls = [];

    __setMockCallGemini(async (params) => {
      callIndex++;
      recordedCalls.push(params);
      if (callIndex === 1) {
        const error = new Error('Gemini could not accept the uploaded media.');
        error.code = 'MEDIA_UPLOAD_FAILED';
        error.statusCode = 502;
        error.retryable = false;
        throw error;
      }
      // Second call (fallback) succeeds
      return {
        text: JSON.stringify(sampleDiagnosticResponse),
        modelUsed: 'gemini-3.8-flash',
        fallbackUsed: false,
        durationMs: 30,
      };
    });

    try {
      const payload = {
        request_id: 'req_media_fallback',
        user_context: { id: 1, language: 'en' },
        vehicle_context: sampleVehicle,
        diagnosis: {
          symptoms: 'Engine makes a high-pitched whining sound when accelerating',
          input_type: 'audio',
          media_base64: sampleMediaBase64,
          media_mime: 'image/jpeg',
          history: [],
        },
      };

      const result = await processDiagnosisRequest(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.ai_source, 'gemini_text_fallback');
      assert.strictEqual(result.media_fallback, true);
      assert.ok(result.media_notice.includes('could not be processed'));
      assert.strictEqual(recordedCalls.length, 2, 'Should attempt media then fallback to text');
      assert.strictEqual(recordedCalls[0].inputType, 'audio');
      assert.strictEqual(recordedCalls[1].inputType, 'text');
      assert.strictEqual(recordedCalls[1].mediaBase64, null);

      // Verify clarification questions prompt user for details
      const clarification = result.diagnosis.clarification_questions.find(q =>
        q.question.includes('Media analysis could not be completed')
      );
      assert.ok(clarification, 'Must include clarification notice regarding media inability');
    } finally {
      __resetMockCallGemini();
    }
  });

  // Test 4: MEDIA_UPLOAD_FAILED WITHOUT usable symptoms returns structured 422 error
  await test('Media failure without usable text symptoms returns structured error without fabricating diagnosis', async () => {
    __setMockCallGemini(async () => {
      const error = new Error('Gemini could not accept the uploaded media.');
      error.code = 'MEDIA_UPLOAD_FAILED';
      error.statusCode = 502;
      error.retryable = false;
      throw error;
    });

    try {
      const payload = {
        request_id: 'req_media_no_text',
        user_context: { id: 1, language: 'en' },
        vehicle_context: sampleVehicle,
        diagnosis: {
          symptoms: 'Audio recording of engine or vehicle noise', // Default synthetic placeholder
          input_type: 'voice',
          media_base64: sampleMediaBase64,
          media_mime: 'image/jpeg',
          history: [],
        },
      };

      await assert.rejects(
        processDiagnosisRequest(payload),
        (err) => {
          assert.strictEqual(err.statusCode, 422, 'Must return 422 for unprocessable media without text');
          assert.strictEqual(err.code, 'MEDIA_UPLOAD_FAILED');
          assert.ok(err.message.includes('could not be processed'));
          return true;
        }
      );
    } finally {
      __resetMockCallGemini();
    }
  });

  console.log('================================================================');
  console.log(`Multimodal Suite Results: ${passedCount}/${totalCount} tests passed cleanly.`);
  console.log('================================================================');

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[FATAL MULTIMODAL TEST FAILURE]', err);
  process.exit(1);
});
