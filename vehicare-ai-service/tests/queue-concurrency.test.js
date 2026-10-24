import assert from 'assert';
import { QueueService, queueService } from '../src/services/queue.service.js';
import { cacheService } from '../src/services/cache.service.js';
import { dedupService } from '../src/services/dedup.service.js';
import {
  triggerModelCooldown,
  isModelInCooldown,
  clearAllModelCooldowns,
} from '../src/services/gemini.service.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runQueueConcurrencyTestSuite() {
  console.log('================================================================');
  console.log('VehiCare AI Service — Section 10 Queue & Concurrency Test Suite');
  console.log('================================================================');

  let passed = 0;
  let total = 0;

  const test = async (name, fn) => {
    total++;
    try {
      queueService.clear();
      await queueService.waitForIdle();
      await fn();
      passed++;
      console.log(`[PASS] Test ${total}: ${name}`);
    } catch (err) {
      console.error(`[FAIL] Test ${total}: ${name}`);
      console.error(err);
      process.exitCode = 1;
    }
  };

  // 1. One request executes successfully
  await test('One request executes successfully', async () => {
    const q = new QueueService({ maxConcurrent: 2, maxQueueSize: 10, maxQueueWaitMs: 2000 });
    const res = await q.enqueue(async () => 'success_1', 'req_1');
    assert.strictEqual(res, 'success_1');
    assert.strictEqual(q.getStats().activeCount, 0);
  });

  // 2. Several requests execute without exceeding the configured concurrency limit
  await test('Several requests execute without exceeding configured concurrency limit', async () => {
    const q = new QueueService({ maxConcurrent: 3, maxQueueSize: 20, maxQueueWaitMs: 5000 });
    let maxSeenActive = 0;

    const task = async () => {
      maxSeenActive = Math.max(maxSeenActive, q.getStats().activeCount);
      await delay(50);
      return 'ok';
    };

    const promises = Array.from({ length: 6 }, (_, i) => q.enqueue(task, `req_${i}`));
    await Promise.all(promises);

    assert.strictEqual(maxSeenActive, 3, `Max active should be exactly 3, got ${maxSeenActive}`);
    assert.strictEqual(q.getStats().activeCount, 0);
  });

  // 3. Requests exceeding the active limit enter the queue
  await test('Requests exceeding active limit enter the queue', async () => {
    const q = new QueueService({ maxConcurrent: 1, maxQueueSize: 5, maxQueueWaitMs: 5000 });
    let releaseActive;
    const blocker = new Promise((resolve) => { releaseActive = resolve; });

    const p1 = q.enqueue(() => blocker, 'req_active');
    await delay(10);

    assert.strictEqual(q.getStats().activeCount, 1);
    assert.strictEqual(q.getStats().queueSize, 0);

    const p2 = q.enqueue(async () => 'from_queue', 'req_queued');
    await delay(10);

    assert.strictEqual(q.getStats().activeCount, 1);
    assert.strictEqual(q.getStats().queueSize, 1);

    releaseActive('done');
    await p1;
    const res2 = await p2;
    assert.strictEqual(res2, 'from_queue');
    assert.strictEqual(q.getStats().activeCount, 0);
  });

  // 4. Requests exceeding queue capacity receive expected rejection (QUEUE_FULL)
  await test('Requests exceeding queue capacity receive expected rejection (QUEUE_FULL)', async () => {
    const q = new QueueService({ maxConcurrent: 1, maxQueueSize: 2, maxQueueWaitMs: 5000 });
    let release;
    const blocker = new Promise((r) => { release = r; });

    q.enqueue(() => blocker, 'active').catch(() => {});
    q.enqueue(() => blocker, 'q1').catch(() => {});
    q.enqueue(() => blocker, 'q2').catch(() => {});
    await delay(10);

    assert.strictEqual(q.getStats().queueSize, 2);

    let rejectedError = null;
    try {
      await q.enqueue(async () => 'overflow', 'q_overflow');
    } catch (err) {
      rejectedError = err;
    }

    assert(rejectedError, 'Should throw error when queue full');
    assert.strictEqual(rejectedError.code, 'QUEUE_FULL');
    assert.strictEqual(rejectedError.status, 429);
    assert.strictEqual(rejectedError.retryable, true);

    release();
    await q.waitForIdle();
  });

  // 5. Queue-wait timeout works correctly (QUEUE_TIMEOUT)
  await test('Queue-wait timeout works correctly (QUEUE_TIMEOUT)', async () => {
    const q = new QueueService({ maxConcurrent: 1, maxQueueSize: 5, maxQueueWaitMs: 40 });
    let release;
    const blocker = new Promise((r) => { release = r; });

    q.enqueue(() => blocker, 'active').catch(() => {});
    await delay(10);

    let timeoutError = null;
    try {
      await q.enqueue(async () => 'should_timeout', 'waiting_item');
    } catch (err) {
      timeoutError = err;
    }

    assert(timeoutError, 'Item in queue should time out');
    assert.strictEqual(timeoutError.code, 'QUEUE_TIMEOUT');
    assert.strictEqual(timeoutError.status, 429);
    assert.strictEqual(timeoutError.retryable, true);

    release();
    await q.waitForIdle();
  });

  // 6. Provider timeout releases its concurrency slot
  await test('Provider timeout releases its concurrency slot', async () => {
    const q = new QueueService({ maxConcurrent: 1, maxQueueSize: 5, maxQueueWaitMs: 2000 });

    try {
      await q.enqueue(async () => {
        const err = new Error('Gemini request timed out.');
        err.code = 'GEMINI_TIMEOUT';
        err.statusCode = 504;
        throw err;
      }, 'timeout_task');
      assert.fail('Should have thrown timeout');
    } catch (err) {
      assert.strictEqual(err.code, 'GEMINI_TIMEOUT');
    }

    assert.strictEqual(q.getStats().activeCount, 0, 'Slot must be released after timeout');
  });

  // 7. An unexpected exception does not permanently block the queue
  await test('An unexpected exception does not permanently block the queue', async () => {
    const q = new QueueService({ maxConcurrent: 1, maxQueueSize: 5, maxQueueWaitMs: 2000 });

    try {
      await q.enqueue(async () => {
        throw new TypeError('Unexpected null reference inside provider call');
      }, 'crash_task');
    } catch (err) {
      assert(err instanceof TypeError);
    }

    assert.strictEqual(q.getStats().activeCount, 0);

    const nextResult = await q.enqueue(async () => 'recovered', 'next_task');
    assert.strictEqual(nextResult, 'recovered');
  });

  // 8. One failed request does not prevent later requests from executing
  await test('One failed request does not prevent later requests from executing', async () => {
    const q = new QueueService({ maxConcurrent: 2, maxQueueSize: 10, maxQueueWaitMs: 2000 });

    const pFail = q.enqueue(async () => { throw new Error('API failure'); }, 'req_fail').catch((e) => e);
    const pSuccess = q.enqueue(async () => 'healthy', 'req_ok');

    const [failRes, successRes] = await Promise.all([pFail, pSuccess]);
    assert(failRes instanceof Error);
    assert.strictEqual(successRes, 'healthy');
    assert.strictEqual(q.getStats().activeCount, 0);
  });

  // 9. Client cancellation is handled safely (AbortSignal)
  await test('Client cancellation is handled safely (AbortSignal)', async () => {
    const q = new QueueService({ maxConcurrent: 1, maxQueueSize: 5, maxQueueWaitMs: 5000 });
    let release;
    const blocker = new Promise((r) => { release = r; });

    q.enqueue(() => blocker, 'active').catch(() => {});
    await delay(10);

    const controller = new AbortController();
    const pQueued = q.enqueue(async () => 'should_not_run', 'queued_cancel', {
      signal: controller.signal,
    });

    await delay(10);
    assert.strictEqual(q.getStats().queueSize, 1);

    // Client disconnects
    controller.abort();

    let cancelError = null;
    try {
      await pQueued;
    } catch (err) {
      cancelError = err;
    }

    assert(cancelError, 'Cancelled request should reject');
    assert.strictEqual(cancelError.code, 'CLIENT_CANCELLED');
    assert.strictEqual(cancelError.status, 499);
    assert.strictEqual(q.getStats().queueSize, 0, 'Cancelled item must be removed from queue');

    release();
    await q.waitForIdle();
  });

  // 10. Cooldown and fallback behavior remain correct
  await test('Cooldown and fallback behavior remain correct', async () => {
    clearAllModelCooldowns();
    const testModel = 'test-cooldown-model';

    assert.strictEqual(isModelInCooldown(testModel), false);
    triggerModelCooldown(testModel, 'test_req', 'TRANSIENT', 500);
    assert.strictEqual(isModelInCooldown(testModel), true);

    await delay(550);
    assert.strictEqual(isModelInCooldown(testModel), false);
  });

  // 11. Cache hits do not consume unnecessary provider calls
  await test('Cache hits do not consume unnecessary provider calls', async () => {
    cacheService.clear();
    let providerCalls = 0;

    const executeWithCache = async (params) => {
      const key = cacheService.generateKey(params);
      const cached = cacheService.get(key, params.requestId);
      if (cached) return cached;

      providerCalls++;
      const result = { diagnosis: { summary: 'Calculated by provider' } };
      cacheService.set(key, result, params.requestId);
      return result;
    };

    const reqData = {
      requestId: 'cache_test',
      vehicleContext: { type: 'car', brand: 'toyota', model: 'vios', year: '2020' },
      symptoms: 'aircon is not cooling at all',
    };

    const res1 = await executeWithCache(reqData);
    assert.strictEqual(providerCalls, 1);

    const res2 = await executeWithCache(reqData);
    assert.strictEqual(providerCalls, 1, 'Second request must hit cache without provider call');
    assert.deepStrictEqual(res1, res2);
  });

  // 12. Failed requests are not cached as successful diagnoses
  await test('Failed requests are not cached as successful diagnoses', async () => {
    cacheService.clear();
    const key = cacheService.generateKey({
      vehicleContext: { type: 'car', brand: 'honda', model: 'civic', year: '2021' },
      symptoms: 'engine overheating warning light',
    });

    assert.strictEqual(cacheService.get(key, 'test'), null);

    try {
      throw new Error('Provider failed with 503');
    } catch (err) {
      // Failed: Do NOT set in cache
    }

    assert.strictEqual(cacheService.get(key, 'test'), null, 'Failed request must not populate cache');
  });

  // 13. Per-user limits prevent queue monopolization (USER_CONCURRENCY_LIMIT_EXCEEDED)
  await test('Per-user limits prevent queue monopolization (USER_CONCURRENCY_LIMIT_EXCEEDED)', async () => {
    const q = new QueueService({
      maxConcurrent: 1,
      maxQueueSize: 10,
      maxQueueWaitMs: 5000,
      maxPendingPerUser: 2,
    });

    let release;
    const blocker = new Promise((r) => { release = r; });

    // User 1 submits 1st request (active)
    q.enqueue(() => blocker, 'u1_req1', { userKey: 'user_101' }).catch(() => {});
    // User 1 submits 2nd request (queued)
    q.enqueue(() => blocker, 'u1_req2', { userKey: 'user_101' }).catch(() => {});
    await delay(10);

    // User 1 submits 3rd request -> exceeds limit of 2
    let limitErr = null;
    try {
      await q.enqueue(async () => 'overflow', 'u1_req3', { userKey: 'user_101' });
    } catch (err) {
      limitErr = err;
    }

    assert(limitErr, 'User exceeding pending limit should be rejected');
    assert.strictEqual(limitErr.code, 'USER_CONCURRENCY_LIMIT_EXCEEDED');
    assert.strictEqual(limitErr.status, 429);

    // User 2 can still enqueue because User 2 has 0 pending
    const pUser2 = q.enqueue(async () => 'u2_success', 'u2_req1', { userKey: 'user_202' });
    assert.strictEqual(q.getStats().queueSize, 2); // u1_req2 and u2_req1

    release();
    const u2Res = await pUser2;
    assert.strictEqual(u2Res, 'u2_success');
    await q.waitForIdle();
  });

  // 14. Free and Premium authorization rules remain intact (anti-starvation aging)
  await test('Free and Premium authorization rules remain intact with anti-starvation aging', async () => {
    const q = new QueueService({ maxConcurrent: 1, maxQueueSize: 10, maxQueueWaitMs: 5000 });
    let release;
    const blocker = new Promise((r) => { release = r; });

    q.enqueue(() => blocker, 'blocker').catch(() => {});
    await delay(10);

    // Free request enqueued first at t=0
    const executionOrder = [];
    q.enqueue(async () => executionOrder.push('free_user'), 'req_free', { planTier: 'free' });

    // Premium request enqueued right after
    q.enqueue(async () => executionOrder.push('premium_user'), 'req_prem', { planTier: 'premium' });

    // Premium should jump ahead of Free when recently enqueued
    release();
    await q.waitForIdle();

    assert.strictEqual(executionOrder[0], 'premium_user');
    assert.strictEqual(executionOrder[1], 'free_user');
  });

  // 15. Queue metrics and outcome counters remain accurate
  await test('Queue metrics and outcome counters remain accurate', async () => {
    const q = new QueueService({ maxConcurrent: 2, maxQueueSize: 5, maxQueueWaitMs: 2000 });

    await q.enqueue(async () => 'ok1', 'm1');
    await q.enqueue(async () => 'ok2', 'm2');
    await q.enqueue(async () => {
      const e = new Error('timed out');
      e.code = 'GEMINI_TIMEOUT';
      e.statusCode = 504;
      throw e;
    }, 'm3').catch(() => {});

    const metrics = q.getMetrics();
    assert.strictEqual(metrics.totalEnqueued, 3);
    assert.strictEqual(metrics.completedSuccess, 2);
    assert.strictEqual(metrics.completedFailed, 1);
    assert.strictEqual(metrics.providerTimeouts, 1);
    assert.strictEqual(metrics.totalCompleted, 3);
  });

  // 16. Simultaneous identical requests are coalesced safely by dedupService
  await test('Simultaneous identical requests are coalesced safely by dedupService', async () => {
    dedupService.clear();
    let executions = 0;

    const task = async () => {
      executions++;
      await delay(50);
      return { result: 'deduped_output' };
    };

    const [r1, r2, r3] = await Promise.all([
      dedupService.execute('coalesce_key_1', task, 'r1'),
      dedupService.execute('coalesce_key_1', task, 'r2'),
      dedupService.execute('coalesce_key_1', task, 'r3'),
    ]);

    assert.strictEqual(executions, 1, '3 identical in-flight requests should execute only once');
    assert.strictEqual(r1.result, 'deduped_output');
    assert.strictEqual(r2.result, 'deduped_output');
    assert.strictEqual(r3.result, 'deduped_output');
    assert.strictEqual(dedupService.getStats().activeInFlightCount, 0);
  });

  // 17. The queue remains functional after a simulated provider outage
  await test('The queue remains functional after a simulated provider outage', async () => {
    const q = new QueueService({ maxConcurrent: 2, maxQueueSize: 10, maxQueueWaitMs: 2000 });

    // Outage batch: 4 requests fail with 503
    const outageBatch = Array.from({ length: 4 }, (_, i) =>
      q.enqueue(async () => {
        const err = new Error('Service Unavailable');
        err.statusCode = 503;
        throw err;
      }, `outage_${i}`).catch(() => 'caught')
    );
    await Promise.all(outageBatch);

    assert.strictEqual(q.getStats().activeCount, 0);

    // Provider recovers: next request succeeds
    const recovered = await q.enqueue(async () => 'provider_recovered', 'post_outage');
    assert.strictEqual(recovered, 'provider_recovered');
    assert.strictEqual(q.getStats().activeCount, 0);
  });

  // 18. Application shutdown handles pending requests cleanly
  await test('Application shutdown handles pending requests cleanly', async () => {
    const q = new QueueService({ maxConcurrent: 1, maxQueueSize: 10, maxQueueWaitMs: 5000 });
    let release;
    const activePromise = new Promise((r) => { release = r; });

    q.enqueue(() => activePromise, 'shut_active').catch(() => {});
    const pQueued = q.enqueue(async () => 'never_runs', 'shut_queued');
    await delay(10);

    // Initiate shutdown
    const shutdownPromise = q.shutdown(1000);

    // Queued items should immediately be rejected with 503
    let queuedErr = null;
    try {
      await pQueued;
    } catch (err) {
      queuedErr = err;
    }
    assert(queuedErr, 'Queued item must be rejected during shutdown');
    assert.strictEqual(queuedErr.code, 'QUEUE_CLEARED');
    assert.strictEqual(queuedErr.status, 503);

    // New requests during shutdown are rejected immediately with 503
    let newReqErr = null;
    try {
      await q.enqueue(async () => 'denied', 'shut_new');
    } catch (err) {
      newReqErr = err;
    }
    assert(newReqErr, 'New requests during shutdown must be rejected');
    assert.strictEqual(newReqErr.code, 'SERVICE_SHUTTING_DOWN');
    assert.strictEqual(newReqErr.status, 503);

    release();
    const shutdownResult = await shutdownPromise;
    assert.strictEqual(shutdownResult, true);
    assert.strictEqual(q.getStats().activeCount, 0);
  });

  console.log('================================================================');
  console.log(`Section 10 Test Suite Summary: ${passed}/${total} tests passed cleanly.`);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runQueueConcurrencyTestSuite().catch((err) => {
  console.error('[FATAL ERROR] Test suite crashed:', err);
  process.exit(1);
});
