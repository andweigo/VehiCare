import assert from 'assert';
import config from '../src/config/env.js';
import { cacheService } from '../src/services/cache.service.js';
import { dedupService } from '../src/services/dedup.service.js';
import { queueService } from '../src/services/queue.service.js';
import { buildDiagnosisPrompt, isGeneralQuestion } from '../src/prompts/diagnosis.prompt.js';
import { applySafetyRules } from '../src/safety/diagnosis-safety.js';
import { normalizeText, hashMedia } from '../src/utils/symptom-normalizer.js';

console.log('==================================================');
console.log('VehiCare AI Service - Comprehensive Performance & Load Tests');
console.log('==================================================');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    }
  }

  // TEST 1: Cache Miss -> Store -> Cache Hit
  await test('Cache MISS followed by Cache HIT for identical normalized text', async () => {
    const params = {
      requestType: 'diagnostic',
      vehicleContext: { type: 'Motorcycle', brand: 'Yamaha', model: 'Mio', year: '2022' },
      symptoms: 'How can I maintain my bicycle?',
      userLanguage: 'en',
    };

    const key = cacheService.generateKey(params);
    assert.strictEqual(cacheService.get(key, 'req1'), null);

    const data = { type: 'conversation', status: 'conversation', response: 'Keep tires inflated and chain lubricated.' };
    cacheService.set(params, data, 'req1');

    const hit = cacheService.get(key, 'req2');
    assert.deepStrictEqual(hit, data);

    const paramsCaseDiff = { ...params, symptoms: '  how can i maintain my bicycle?  ' };
    const hitCaseDiff = cacheService.get(cacheService.generateKey(paramsCaseDiff), 'req3');
    assert.deepStrictEqual(hitCaseDiff, data);
  });

  // TEST 2: Media-Aware Cache Key
  await test('Media-aware cache keys separate requests with different media', async () => {
    const paramsNoMedia = {
      requestType: 'diagnostic',
      vehicleContext: { brand: 'Honda', model: 'Click' },
      symptoms: 'Engine noise',
    };
    const paramsMediaA = { ...paramsNoMedia, mediaBase64: 'base64_data_A' };
    const paramsMediaB = { ...paramsNoMedia, mediaBase64: 'base64_data_B' };

    const keyNoMedia = cacheService.generateKey(paramsNoMedia);
    const keyMediaA = cacheService.generateKey(paramsMediaA);
    const keyMediaB = cacheService.generateKey(paramsMediaB);

    assert.notStrictEqual(keyNoMedia, keyMediaA);
    assert.notStrictEqual(keyMediaA, keyMediaB);
  });

  // TEST 3: Identical In-Flight Deduplication (Prevent Request Stampede)
  await test('5 identical simultaneous requests produce only 1 actual execution', async () => {
    const key = 'test_dedup_key';
    let executionCount = 0;

    const mockSlowGemini = async () => {
      executionCount++;
      await delay(100);
      return { status: 'success', executionCount };
    };

    const promises = Array.from({ length: 5 }, (_, i) =>
      dedupService.execute(key, mockSlowGemini, `req_${i}`)
    );

    const results = await Promise.all(promises);

    assert.strictEqual(executionCount, 1, `Expected 1 execution but got ${executionCount}`);
    assert.strictEqual(results.length, 5);
    for (const res of results) {
      assert.strictEqual(res.executionCount, 1);
    }
  });

  // TEST 4: Concurrency Limiting (Max 2 Active Executions)
  await test('Concurrency limiter enforces maximum concurrent active executions', async () => {
    let activeGeminiCalls = 0;
    let maxActiveSeen = 0;

    const mockTask = async (id) => {
      activeGeminiCalls++;
      if (activeGeminiCalls > maxActiveSeen) {
        maxActiveSeen = activeGeminiCalls;
      }
      await delay(50);
      activeGeminiCalls--;
      return `task_${id}_done`;
    };

    const tasks = Array.from({ length: 5 }, (_, i) =>
      queueService.enqueue(() => mockTask(i), `req_${i}`, 'diagnostic')
    );

    const results = await Promise.all(tasks);
    assert.strictEqual(results.length, 5);
    assert.ok(maxActiveSeen <= config.concurrency.maxConcurrent, `Max active calls reached ${maxActiveSeen}, expected <= ${config.concurrency.maxConcurrent}`);
  });

  // TEST 5: Queue Overflow (Return Controlled Busy Response)
  await test('Queue returns controlled busy error when max queue capacity is exceeded', async () => {
    queueService.maxQueueSize = 2;
    queueService.maxConcurrent = 1;

    const slowTask = () => new Promise((resolve) => setTimeout(resolve, 200));

    queueService.enqueue(slowTask, 'req_active', 'diagnostic').catch(() => {});
    queueService.enqueue(slowTask, 'req_q1', 'diagnostic').catch(() => {});
    queueService.enqueue(slowTask, 'req_q2', 'diagnostic').catch(() => {});

    let queueFullThrown = false;
    try {
      await queueService.enqueue(slowTask, 'req_overflow', 'diagnostic');
    } catch (err) {
      if (err.code === 'QUEUE_FULL') {
        queueFullThrown = true;
      }
    }

    assert.strictEqual(queueFullThrown, true, 'Expected QUEUE_FULL error for overflow request');

    queueService.maxQueueSize = config.concurrency.maxQueueSize;
    queueService.maxConcurrent = config.concurrency.maxConcurrent;
  });

  // TEST 6: Queue Timeout
  await test('Request in queue times out if wait time exceeds maxQueueWaitMs', async () => {
    queueService.maxQueueWaitMs = 100;
    queueService.maxConcurrent = 1;

    const blockingTask = () => new Promise((resolve) => setTimeout(resolve, 300));
    queueService.enqueue(blockingTask, 'req_blocker', 'diagnostic').catch(() => {});

    let timeoutThrown = false;
    try {
      await queueService.enqueue(() => Promise.resolve('ok'), 'req_waiting', 'diagnostic');
    } catch (err) {
      if (err.code === 'QUEUE_TIMEOUT') {
        timeoutThrown = true;
      }
    }

    assert.strictEqual(timeoutThrown, true, 'Expected QUEUE_TIMEOUT error');

    queueService.maxQueueWaitMs = config.concurrency.maxQueueWaitMs;
    queueService.maxConcurrent = config.concurrency.maxConcurrent;
  });

  // TEST 7: LRU Cache Eviction
  await test('LRU Cache evicts oldest item when max entries is reached', async () => {
    cacheService.maxEntries = 3;

    cacheService.set('key1', { val: 1 }, 'req1');
    cacheService.set('key2', { val: 2 }, 'req2');
    cacheService.set('key3', { val: 3 }, 'req3');

    assert.ok(cacheService.get('key1', 'req_chk') !== null);

    cacheService.set('key4', { val: 4 }, 'req4');

    assert.strictEqual(cacheService.get('key2', 'req_chk'), null, 'key2 should have been evicted');
    assert.ok(cacheService.get('key1', 'req_chk') !== null);
    assert.ok(cacheService.get('key4', 'req_chk') !== null);

    cacheService.maxEntries = config.cache.maxEntries;
  });

  // TEST 8: Cache Expiry (TTL)
  await test('Expired cache entry produces a Cache MISS', async () => {
    const key = 'test_ttl_key';
    cacheService.cache.set(key, {
      data: { status: 'ok' },
      expiresAt: Date.now() - 1000,
    });

    const result = cacheService.get(key, 'req_exp');
    assert.strictEqual(result, null, 'Expired entry must return null');
  });

  // TEST 9: Prompt Complexity Detection
  await test('General questions are correctly detected for prompt optimization', () => {
    assert.strictEqual(isGeneralQuestion('Hello'), true);
    assert.strictEqual(isGeneralQuestion('How do I maintain my bicycle?'), true);
    assert.strictEqual(isGeneralQuestion('What is a brake pad?'), true);
    assert.strictEqual(isGeneralQuestion('My engine is emitting heavy black smoke'), false);
    assert.strictEqual(isGeneralQuestion('Brake squeaking sound when stopping'), false);
  });

  // TEST 10: Modality-specific media analysis instructions
  await test('Media prompts give image, video, and audio distinct evidence instructions', () => {
    const common = {
      vehicleContext: { type: 'Car', brand: 'Honda', model: 'Civic', year: '2020' },
      symptoms: 'Please inspect this media',
      userLanguage: 'en',
      hasMedia: true,
    };
    const imagePrompt = buildDiagnosisPrompt({ ...common, inputType: 'image', mediaMime: 'image/jpeg' });
    const videoPrompt = buildDiagnosisPrompt({ ...common, inputType: 'video', mediaMime: 'video/mp4' });
    const audioPrompt = buildDiagnosisPrompt({ ...common, inputType: 'voice', mediaMime: 'audio/mp4' });

    assert.ok(imagePrompt.includes('Do not infer sounds'));
    assert.ok(videoPrompt.includes('over time'));
    assert.ok(audioPrompt.includes('Do not claim visual observations'));
  });

  // TEST 11: Professional help is reserved for severe or specialist repairs
  await test('Professional assistance is limited to severe or specialist-level issues', () => {
    const apply = (severity, requiresSpecialist = false, symptoms = '') => applySafetyRules({
      severity,
      professional_help: {
        recommended: true,
        requires_specialist: requiresSpecialist,
        reason: 'Model supplied generic recommendation',
      },
    }, symptoms);

    const routine = apply('MODERATE');
    assert.strictEqual(routine.professional_help.recommended, false);
    assert.strictEqual(routine.professional_help.reason, '');

    assert.strictEqual(apply('MODERATE', true).professional_help.recommended, true);
    assert.strictEqual(apply('HIGH').professional_help.recommended, true);
    assert.strictEqual(apply('LOW', false, 'brakes not working').severity, 'CRITICAL');
    assert.strictEqual(apply('LOW', false, 'brakes not working').professional_help.recommended, true);
  });

  // TEST 12: Cache keys distinguish identical bytes with different media types
  await test('Media cache keys separate identical bytes analyzed as different modalities', () => {
    const common = {
      requestType: 'diagnostic',
      vehicleContext: { brand: 'Honda', model: 'Civic' },
      symptoms: 'Please inspect this media',
      mediaBase64: 'same_media_bytes',
    };
    const imageKey = cacheService.generateKey({ ...common, inputType: 'image', mediaMime: 'image/jpeg' });
    const audioKey = cacheService.generateKey({ ...common, inputType: 'voice', mediaMime: 'audio/mp4' });
    assert.notStrictEqual(imageKey, audioKey);
  });

  // TEST 13: Concurrency Benchmark (5, 10, 20 Simultaneous Requests)
  await test('Load Test Benchmark: 5, 10, and 20 simultaneous requests', async () => {
    let totalGeminiCalls = 0;

    async function simulateDeviceBatch(batchSize, duplicateRatio = 0.4) {
      cacheService.clear();
      dedupService.clear();
      queueService.clear();

      let currentActiveGemini = 0;
      let batchMaxActiveGemini = 0;

      const mockGeminiCall = async (symptoms) => {
        totalGeminiCalls++;
        currentActiveGemini++;
        if (currentActiveGemini > batchMaxActiveGemini) {
          batchMaxActiveGemini = currentActiveGemini;
        }

        await delay(80);

        currentActiveGemini--;
        return {
          type: 'diagnostic',
          status: 'diagnosis_ready',
          summary: `Diagnosis for ${symptoms}`,
        };
      };

      const startTime = Date.now();
      let cacheHits = 0;
      let inFlightHits = 0;

      const requests = Array.from({ length: batchSize }, (_, i) => {
        const isDuplicate = i > 0 && Math.random() < duplicateRatio;
        const symptoms = isDuplicate ? 'Symptom Question A' : `Unique Symptom Question ${i}`;
        const key = cacheService.generateKey({
          requestType: 'diagnostic',
          vehicleContext: { brand: 'TestBrand', model: 'TestModel' },
          symptoms,
          userLanguage: 'en',
        });

        const cached = cacheService.get(key, `req_${i}`);
        if (cached) {
          cacheHits++;
          return Promise.resolve(cached);
        }

        if (dedupService.has(key)) {
          inFlightHits++;
        }

        return dedupService.execute(key, async () => {
          return await queueService.enqueue(() => mockGeminiCall(symptoms), `req_${i}`, 'diagnostic');
        }, `req_${i}`);
      });

      const results = await Promise.all(requests);
      await delay(100);
      const totalTimeMs = Date.now() - startTime;

      assert.ok(
        batchMaxActiveGemini <= config.concurrency.maxConcurrent,
        `Batch size ${batchSize}: Max concurrent calls reached ${batchMaxActiveGemini}, expected <= ${config.concurrency.maxConcurrent}`
      );

      return {
        batchSize,
        totalTimeMs,
        resultsCount: results.length,
        cacheHits,
        inFlightHits,
        batchMaxActiveGemini,
      };
    }

    console.log('\n   --- Running 5 Simultaneous Devices ---');
    const res5 = await simulateDeviceBatch(5, 0.4);
    console.log(`   Completed in ${res5.totalTimeMs}ms | Cache Hits: ${res5.cacheHits} | In-Flight Hits: ${res5.inFlightHits} | Max Active: ${res5.batchMaxActiveGemini}`);

    console.log('   --- Running 10 Simultaneous Devices ---');
    const res10 = await simulateDeviceBatch(10, 0.4);
    console.log(`   Completed in ${res10.totalTimeMs}ms | Cache Hits: ${res10.cacheHits} | In-Flight Hits: ${res10.inFlightHits} | Max Active: ${res10.batchMaxActiveGemini}`);

    console.log('   --- Running 20 Simultaneous Devices ---');
    const res20 = await simulateDeviceBatch(20, 0.4);
    console.log(`   Completed in ${res20.totalTimeMs}ms | Cache Hits: ${res20.cacheHits} | In-Flight Hits: ${res20.inFlightHits} | Max Active: ${res20.batchMaxActiveGemini}`);

    console.log(`\n   Total Gemini Calls Made Across Batches: ${totalGeminiCalls}`);
  });

  console.log('==================================================');
  console.log(`Summary: ${passedCount}/${totalCount} tests passed cleanly.`);
  console.log('==================================================');

  if (passedCount < totalCount) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[FATAL TEST FAILURE]', err);
  process.exit(1);
});
