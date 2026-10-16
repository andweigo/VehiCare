import assert from 'assert';
import config from '../src/config/env.js';
import { cacheService } from '../src/services/cache.service.js';
import { dedupService } from '../src/services/dedup.service.js';
import { queueService } from '../src/services/queue.service.js';
import { processDiagnosisRequest } from '../src/services/diagnosis.service.js';
import { __setMockCallGemini, __resetMockCallGemini } from '../src/services/gemini.service.js';
import { isContextDependentFollowUp, isRepairGuideIntent } from '../src/utils/symptom-normalizer.js';

console.log('================================================================');
console.log('VehiCare AI Service - Comprehensive Cache Audit & Validation Suite');
console.log('================================================================');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runCacheTests() {
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

  // Sample successful diagnosis response payload
  const mockDiagnosticResponse = {
    type: 'diagnostic',
    status: 'diagnosis_ready',
    confidence: { score: 85, level: 'HIGH', reason: 'High match' },
    summary: 'Worn front brake pads causing squeaking noise.',
    reported: ['Squeaking noise when braking'],
    observed: [],
    severity: 'MODERATE',
    urgency: 'Inspection recommended within 500km.',
    possible_causes: [
      { cause: 'Worn brake pads', likelihood: 'HIGH', likelihood_score: 85, reason: 'Wear indicator contacting rotor' }
    ],
    recommended_actions: ['Replace front brake pads'],
    clarification_questions: [],
    estimated_cost: { min: 1500, max: 3500, currency: 'PHP' },
    professional_help: { recommended: false, requires_specialist: false, reason: '', severity: 'MODERATE' },
  };

  const sampleVehicle = {
    type: 'Car',
    brand: 'Toyota',
    model: 'Corolla',
    year: '2020',
    model_number: 'Altis-1.8G',
  };

  // ==========================================================================
  // REQUIREMENT 1 & 2: First request calls Gemini & caches; second request hits cache without Gemini
  // ==========================================================================
  await test('Req 1 & 2: First request calls Gemini; identical request hits cache without calling Gemini', async () => {
    let geminiCallCount = 0;

    // Temporarily mock callGemini
    __setMockCallGemini(async () => {
      geminiCallCount++;
      return {
        text: JSON.stringify(mockDiagnosticResponse),
        modelUsed: 'gemini-3.8-flash',
        fallbackUsed: false,
        durationMs: 45,
      };
    });

    try {
      const payload = {
        request_id: 'req_first',
        user_context: { id: 101, language: 'en' },
        vehicle_context: sampleVehicle,
        diagnosis: {
          symptoms: 'Squeaking noise when braking at low speed',
          input_type: 'text',
          history: [],
        },
      };

      // First call -> Cache MISS -> Calls Gemini -> Caches result
      const firstResult = await processDiagnosisRequest(payload);
      assert.strictEqual(firstResult.success, true);
      assert.strictEqual(firstResult.ai_source, 'gemini');
      assert.strictEqual(geminiCallCount, 1, 'Gemini must be called on first request');

      // Second identical call -> Cache HIT -> Returns cached without calling Gemini
      const secondPayload = {
        ...payload,
        request_id: 'req_second',
        diagnosis: {
          ...payload.diagnosis,
          symptoms: '  squeaking noise when braking at low speed.  ', // Harmless whitespace/casing difference
        },
      };
      const secondResult = await processDiagnosisRequest(secondPayload);
      assert.strictEqual(secondResult.success, true);
      assert.strictEqual(secondResult.ai_source, 'cache', 'Second request must be served from cache');
      assert.strictEqual(geminiCallCount, 1, 'Gemini call count must remain 1 (no extra Gemini call)');
      assert.strictEqual(secondResult.diagnosis.summary, mockDiagnosticResponse.summary);

      // Verify stats
      const stats = cacheService.getStats();
      assert.strictEqual(stats.hits, 1);
      assert.strictEqual(stats.misses, 1);
    } finally {
      __resetMockCallGemini();
    }
  });

  // ==========================================================================
  // REQUIREMENT 3: Expired entries trigger a fresh request
  // ==========================================================================
  await test('Req 3: Expired cache entries trigger a fresh request', async () => {
    const params = {
      requestType: 'diagnostic',
      vehicleContext: sampleVehicle,
      symptoms: 'Grinding noise',
      userLanguage: 'en',
    };
    const key = cacheService.generateKey(params);
    assert.ok(key, 'Key must be generated');

    // Seed cache with expired entry
    cacheService.cache.set(key, {
      data: mockDiagnosticResponse,
      expiresAt: Date.now() - 500, // Expired in the past
    });

    // Lookup should detect expiration, delete entry, and return null
    const result = cacheService.get(key, 'req_expired_check');
    assert.strictEqual(result, null, 'Expired entry must return null (cache miss)');
    assert.strictEqual(cacheService.cache.has(key), false, 'Expired entry must be removed from Map');

    const stats = cacheService.getStats();
    assert.strictEqual(stats.expirations, 1);
  });

  // ==========================================================================
  // REQUIREMENT 4: Different vehicle contexts do not share diagnostic results
  // ==========================================================================
  await test('Req 4: Different vehicle contexts produce distinct cache keys', async () => {
    const base = {
      requestType: 'diagnostic',
      symptoms: 'Vibrating steering wheel at high speed',
      userLanguage: 'en',
    };

    const keySedan = cacheService.generateKey({
      ...base,
      vehicleContext: { type: 'Car', brand: 'Toyota', model: 'Corolla', year: '2020' },
    });
    const keySuv = cacheService.generateKey({
      ...base,
      vehicleContext: { type: 'Car', brand: 'Toyota', model: 'Fortuner', year: '2020' },
    });
    const keyMotorcycle = cacheService.generateKey({
      ...base,
      vehicleContext: { type: 'Motorcycle', brand: 'Honda', model: 'Click', year: '2022' },
    });
    const keyDifferentYear = cacheService.generateKey({
      ...base,
      vehicleContext: { type: 'Car', brand: 'Toyota', model: 'Corolla', year: '2015' },
    });
    const keyDifferentTrim = cacheService.generateKey({
      ...base,
      vehicleContext: { type: 'Car', brand: 'Toyota', model: 'Corolla', year: '2020', model_number: 'Hybrid' },
    });

    assert.notStrictEqual(keySedan, keySuv, 'Different models must have distinct keys');
    assert.notStrictEqual(keySedan, keyMotorcycle, 'Different vehicle types must have distinct keys');
    assert.notStrictEqual(keySedan, keyDifferentYear, 'Different years must have distinct keys');
    assert.notStrictEqual(keySedan, keyDifferentTrim, 'Different model numbers/trims must have distinct keys');
  });

  // ==========================================================================
  // REQUIREMENT 5: Different languages do not share results
  // ==========================================================================
  await test('Req 5: Different languages produce distinct cache keys', async () => {
    const paramsEn = {
      requestType: 'diagnostic',
      vehicleContext: sampleVehicle,
      symptoms: 'Engine oil indicator blinking',
      userLanguage: 'en',
    };
    const paramsFil = {
      ...paramsEn,
      userLanguage: 'fil',
    };
    const paramsTaglish = {
      ...paramsEn,
      userLanguage: 'taglish',
    };

    const keyEn = cacheService.generateKey(paramsEn);
    const keyFil = cacheService.generateKey(paramsFil);
    const keyTaglish = cacheService.generateKey(paramsTaglish);

    assert.notStrictEqual(keyEn, keyFil, 'English and Filipino must not share cache keys');
    assert.notStrictEqual(keyEn, keyTaglish, 'English and Taglish must not share cache keys');
    assert.notStrictEqual(keyFil, keyTaglish, 'Filipino and Taglish must not share cache keys');
  });

  // ==========================================================================
  // REQUIREMENT 6: Different media content does not share results
  // ==========================================================================
  await test('Req 6: Different media content produce distinct cache keys and corrupt media is bypassed', async () => {
    const validJpgA = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x01]).toString('base64');
    const validJpgB = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x02]).toString('base64');

    const paramsMediaA = {
      requestType: 'diagnostic',
      vehicleContext: sampleVehicle,
      symptoms: 'Inspect this warning light',
      mediaBase64: validJpgA,
      inputType: 'image',
      mediaMime: 'image/jpeg',
    };
    const paramsMediaB = {
      ...paramsMediaA,
      mediaBase64: validJpgB,
    };

    const keyA = cacheService.generateKey(paramsMediaA);
    const keyB = cacheService.generateKey(paramsMediaB);

    assert.ok(keyA, 'Key A must be generated');
    assert.ok(keyB, 'Key B must be generated');
    assert.notStrictEqual(keyA, keyB, 'Different image content must have different keys');

    // Unhashable / empty media string must return null (bypass cache)
    const keyEmptyMedia = cacheService.generateKey({
      ...paramsMediaA,
      mediaBase64: '   ',
    });
    assert.strictEqual(keyEmptyMedia, null, 'Unreliable media must bypass caching');
  });

  // ==========================================================================
  // REQUIREMENT 7: Failed or timed-out Gemini requests are not cached
  // ==========================================================================
  await test('Req 7: Failed or timed-out Gemini requests are never cached', async () => {
    __setMockCallGemini(async () => {
      const error = new Error('Resource exhausted / Rate limit reached (HTTP 429)');
      error.status = 429;
      error.code = 'RESOURCE_EXHAUSTED';
      throw error;
    });

    try {
      const payload = {
        request_id: 'req_failed_429',
        user_context: { id: 1, language: 'en' },
        vehicle_context: sampleVehicle,
        diagnosis: {
          symptoms: 'Battery light turns on while driving',
          input_type: 'text',
          history: [],
        },
      };

      await assert.rejects(
        processDiagnosisRequest(payload),
        (err) => err.status === 429
      );

      // Verify that no cache entry was stored
      const key = cacheService.generateKey({
        requestType: 'diagnostic',
        vehicleContext: sampleVehicle,
        symptoms: payload.diagnosis.symptoms,
        userLanguage: 'en',
      });
      assert.strictEqual(cacheService.get(key, 'req_check'), null, 'Failed request must NOT be cached');
      assert.strictEqual(cacheService.cache.size, 0, 'Cache must remain empty');
    } finally {
      __resetMockCallGemini();
    }
  });

  // ==========================================================================
  // REQUIREMENT 8: Concurrent identical requests share a single computation (Single-Flight)
  // ==========================================================================
  await test('Req 8: Concurrent identical requests share a single in-flight computation', async () => {
    let actualGeminiExecutions = 0;

    __setMockCallGemini(async () => {
      actualGeminiExecutions++;
      await delay(80); // Simulate network latency
      return {
        text: JSON.stringify(mockDiagnosticResponse),
        modelUsed: 'gemini-3.8-flash',
        fallbackUsed: false,
        durationMs: 80,
      };
    });

    try {
      const payload = {
        user_context: { id: 50, language: 'en' },
        vehicle_context: sampleVehicle,
        diagnosis: {
          symptoms: 'Black smoke coming out of exhaust pipe',
          input_type: 'text',
          history: [],
        },
      };

      // Launch 4 concurrent requests at the exact same moment
      const requests = Array.from({ length: 4 }, (_, idx) =>
        processDiagnosisRequest({ ...payload, request_id: `req_concurrent_${idx}` })
      );

      const results = await Promise.all(requests);
      assert.strictEqual(results.length, 4);
      assert.strictEqual(actualGeminiExecutions, 1, 'All 4 requests must share exactly 1 Gemini call');

      for (const res of results) {
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.diagnosis.summary, mockDiagnosticResponse.summary);
      }
    } finally {
      __resetMockCallGemini();
    }
  });

  // ==========================================================================
  // REQUIREMENT 9: Maximum entry limit and LRU eviction strategy work
  // ==========================================================================
  await test('Req 9: LRU eviction respects maxEntries limit', async () => {
    cacheService.maxEntries = 3;

    cacheService.set('key_alpha', { type: 'conversation', response: 'alpha' }, 'r1');
    cacheService.set('key_beta', { type: 'conversation', response: 'beta' }, 'r2');
    cacheService.set('key_gamma', { type: 'conversation', response: 'gamma' }, 'r3');

    assert.strictEqual(cacheService.cache.size, 3);

    // Access key_alpha to make key_beta the least recently used
    const hitAlpha = cacheService.get('key_alpha', 'r_touch');
    assert.strictEqual(hitAlpha.response, 'alpha');

    // Insert 4th entry -> key_beta must be evicted
    cacheService.set('key_delta', { type: 'conversation', response: 'delta' }, 'r4');

    assert.strictEqual(cacheService.cache.size, 3, 'Cache size must remain capped at 3');
    assert.strictEqual(cacheService.get('key_beta', 'r_chk'), null, 'key_beta must have been evicted');
    assert.ok(cacheService.get('key_alpha', 'r_chk') !== null, 'key_alpha must be retained');
    assert.ok(cacheService.get('key_gamma', 'r_chk') !== null, 'key_gamma must be retained');
    assert.ok(cacheService.get('key_delta', 'r_chk') !== null, 'key_delta must be retained');

    const stats = cacheService.getStats();
    assert.strictEqual(stats.evictions, 1, 'Stats must record 1 eviction');

    cacheService.maxEntries = config.cache.maxEntries;
  });

  // ==========================================================================
  // REQUIREMENT 10: Cache failures do not crash the service
  // ==========================================================================
  await test('Req 10: Cache errors safely fall back to Gemini without crashing', async () => {
    let geminiCalled = false;

    __setMockCallGemini(async () => {
      geminiCalled = true;
      return {
        text: JSON.stringify(mockDiagnosticResponse),
        modelUsed: 'gemini-3.8-flash',
        fallbackUsed: false,
        durationMs: 25,
      };
    });

    // Simulate an unexpected error inside cacheService.get
    const originalGet = cacheService.get;
    cacheService.get = () => {
      throw new Error('Simulated unexpected cache storage error');
    };

    try {
      const payload = {
        request_id: 'req_resilience',
        user_context: { id: 1, language: 'en' },
        vehicle_context: sampleVehicle,
        diagnosis: {
          symptoms: 'Check engine light is flashing',
          input_type: 'text',
          history: [],
        },
      };

      // Despite cache.get throwing, processDiagnosisRequest should catch, fall back, and succeed
      const result = await processDiagnosisRequest(payload);
      assert.strictEqual(result.success, true);
      assert.strictEqual(geminiCalled, true, 'Gemini must be called despite cache failure');
      assert.strictEqual(result.diagnosis.summary, mockDiagnosticResponse.summary);
    } finally {
      cacheService.get = originalGet;
      __resetMockCallGemini();
    }
  });

  // ==========================================================================
  // REQUIREMENT 11: Context-dependent follow-up questions without history are bypassed
  // ==========================================================================
  await test('Req 11: Context-dependent follow-up questions without history bypass caching', async () => {
    assert.strictEqual(isContextDependentFollowUp('What should I do next?'), true);
    assert.strictEqual(isContextDependentFollowUp('what next'), true);
    assert.strictEqual(isContextDependentFollowUp('ano susunod'), true);
    assert.strictEqual(isContextDependentFollowUp('Brake pads grinding noise'), false);

    const followUpNoHistory = {
      requestType: 'conversation',
      vehicleContext: sampleVehicle,
      symptoms: 'What should I do next?',
      userLanguage: 'en',
      history: [],
    };

    const key = cacheService.generateKey(followUpNoHistory);
    assert.strictEqual(key, null, 'Context-dependent question without history must yield null key');

    // Follow-up with history is scoped with user ID and permitted
    const followUpWithHistory = {
      ...followUpNoHistory,
      userContext: { id: 42 },
      history: [
        { role: 'user', content: 'My alternator failed.' },
        { role: 'assistant', content: 'You need to test the voltage.' },
      ],
    };
    const keyWithHistory = cacheService.generateKey(followUpWithHistory);
    assert.ok(keyWithHistory, 'Context-dependent question with history receives scoped key');
  });

  // ==========================================================================
  // REQUIREMENT 12: Repair guide intent receives 24h TTL (REPAIR_GUIDE_CACHE_TTL_SECONDS)
  // ==========================================================================
  await test('Req 12: Repair guide queries receive the configured 24-hour TTL', async () => {
    assert.strictEqual(isRepairGuideIntent('How to replace brake pads step by step'), true);
    assert.strictEqual(isRepairGuideIntent('Paano ayusin ang preno'), true);
    assert.strictEqual(isRepairGuideIntent('Engine overheating'), false);

    const repairParams = {
      requestType: 'repair',
      vehicleContext: sampleVehicle,
      symptoms: 'How to replace spark plugs on 2020 Corolla',
      userLanguage: 'en',
    };

    cacheService.set(repairParams, mockDiagnosticResponse, 'req_repair_ttl');
    const key = cacheService.generateKey(repairParams);
    const item = cacheService.cache.get(key);
    assert.ok(item, 'Item must be cached');

    const expectedTtlMs = config.cache.repairGuideTtlSeconds * 1000;
    const remainingMs = item.expiresAt - Date.now();
    assert.ok(
      Math.abs(remainingMs - expectedTtlMs) < 2000,
      `Expected TTL ~${expectedTtlMs}ms but got ${remainingMs}ms`
    );
  });

  console.log('================================================================');
  console.log(`Cache Suite Results: ${passedCount}/${totalCount} tests passed cleanly.`);
  console.log('================================================================');

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runCacheTests().catch((err) => {
  console.error('[FATAL CACHE TEST FAILURE]', err);
  process.exit(1);
});
