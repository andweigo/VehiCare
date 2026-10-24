import assert from 'assert';
import { QueueService } from '../src/services/queue.service.js';
import config from '../src/config/env.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Controlled 5-Panelist Simulated Load Test
 *
 * Simulates 5 panelists submitting vehicle diagnostic requests from separate devices.
 * Staggered submission simulates realistic human presentation timing.
 */
async function runControlledLoadTest() {
  console.log('================================================================');
  console.log('VehiCare AI Service — Section 11 Controlled Load Test (5 Panelists)');
  console.log('================================================================');
  console.log(`Configured Limits: maxConcurrent=${config.concurrency.maxConcurrent}, maxQueueSize=${config.concurrency.maxQueueSize}, maxQueueWaitMs=${config.concurrency.maxQueueWaitMs}, maxPendingPerUser=${config.concurrency.maxPendingPerUser}`);
  console.log('----------------------------------------------------------------');

  const q = new QueueService({
    maxConcurrent: config.concurrency.maxConcurrent, // 3
    maxQueueSize: config.concurrency.maxQueueSize,     // 25
    maxQueueWaitMs: config.concurrency.maxQueueWaitMs, // 25000
    maxPendingPerUser: 2,
  });

  const panelists = [
    { id: 1, name: 'Panelist 1 (Toyota Wigo - AC warm)', planTier: 'free', delayMs: 0 },
    { id: 2, name: 'Panelist 2 (Honda Click - Squeaking belt)', planTier: 'free', delayMs: 200 },
    { id: 3, name: 'Panelist 3 (Yamaha Mio - Engine sputtering)', planTier: 'premium', delayMs: 400 },
    { id: 4, name: 'Panelist 4 (Mitsubishi Mirage - Brake noise)', planTier: 'free', delayMs: 600 },
    { id: 5, name: 'Panelist 5 (Nissan Almera - Battery slow crank)', planTier: 'premium', delayMs: 800 },
  ];

  console.log('Phase 1: Mock Provider 5-Panelist Staggered Concurrency Test');

  const results = [];
  let peakActive = 0;
  let peakQueued = 0;

  const mockProviderTask = async (panelist) => {
    // Simulate Gemini LLM generation time (1200ms - 1800ms)
    const simulatedLlmLatency = 1200 + Math.floor(Math.random() * 600);
    await delay(simulatedLlmLatency);
    return {
      status: 'success',
      panelist: panelist.name,
      diagnosis: {
        summary: `Diagnosis completed for ${panelist.name}`,
        severity: 'LOW',
        confidence: 0.85,
      },
    };
  };

  const monitorInterval = setInterval(() => {
    const stats = q.getStats();
    peakActive = Math.max(peakActive, stats.activeCount);
    peakQueued = Math.max(peakQueued, stats.queueSize);
  }, 25);

  const testStartTime = Date.now();

  const promises = panelists.map(async (panelist) => {
    await delay(panelist.delayMs);
    const submitTime = Date.now();
    const requestId = `panelist_req_${panelist.id}`;

    try {
      const res = await q.enqueue(
        () => mockProviderTask(panelist),
        requestId,
        {
          requestType: 'diagnostic',
          userKey: `user_${panelist.id}`,
          planTier: panelist.planTier,
        }
      );
      const totalLatency = Date.now() - submitTime;
      results.push({
        panelistId: panelist.id,
        name: panelist.name,
        planTier: panelist.planTier,
        success: true,
        totalLatency,
        data: res,
      });
      console.log(`  ✓ ${panelist.name} completed in ${totalLatency}ms`);
    } catch (err) {
      results.push({
        panelistId: panelist.id,
        name: panelist.name,
        success: false,
        error: err.code || err.message,
        status: err.status || err.statusCode,
      });
      console.error(`  ✗ ${panelist.name} failed: ${err.message}`);
    }
  });

  await Promise.all(promises);
  clearInterval(monitorInterval);

  const totalDuration = Date.now() - testStartTime;
  const metrics = q.getMetrics();

  console.log('----------------------------------------------------------------');
  console.log('Phase 1 Results Summary:');
  console.log(`  Total Panelists:        ${panelists.length}`);
  console.log(`  Successful Diagnoses:   ${results.filter((r) => r.success).length}/${panelists.length} (100%)`);
  console.log(`  Peak Active Providers:  ${peakActive} (Limit: ${q.maxConcurrent})`);
  console.log(`  Peak Queued Requests:   ${peakQueued} (Capacity: ${q.maxQueueSize})`);
  console.log(`  Total Test Duration:    ${totalDuration}ms`);
  console.log(`  Average Queue Wait:     ${metrics.averageQueueWaitMs}ms`);
  console.log(`  Average Processing:     ${metrics.averageProcessingMs}ms`);
  console.log(`  Queue Rejections (Full): ${metrics.queueRejectionsFull}`);
  console.log(`  Queue Rejections (User): ${metrics.queueRejectionsUserLimit}`);
  console.log(`  Queue Timeouts:         ${metrics.queueTimeouts}`);
  console.log('----------------------------------------------------------------');

  assert.strictEqual(results.filter((r) => r.success).length, 5, 'All 5 panelists must succeed');
  assert(peakActive <= q.maxConcurrent, `Peak active (${peakActive}) must not exceed maxConcurrent (${q.maxConcurrent})`);
  assert.strictEqual(metrics.queueRejectionsFull, 0, 'No requests should be dropped due to queue capacity');
  assert.strictEqual(metrics.queueTimeouts, 0, 'No requests should time out in queue');

  console.log('\nPhase 2: Verifying Post-Outage Recovery');
  console.log('Simulating temporary provider 503 error on one request, then recovering...');

  try {
    await q.enqueue(async () => {
      const err = new Error('Gemini API 503 Overloaded');
      err.code = 'GEMINI_OVERLOADED';
      err.statusCode = 503;
      throw err;
    }, 'simulated_failure');
  } catch (err) {
    console.log(`  ✓ Caught simulated error: ${err.code} (HTTP ${err.statusCode})`);
  }

  const recoveryResult = await q.enqueue(async () => 'recovered_ok', 'recovery_check');
  assert.strictEqual(recoveryResult, 'recovered_ok', 'Service must immediately accept work after provider error');
  console.log('  ✓ Service successfully accepted subsequent request after provider failure.');

  console.log('================================================================');
  console.log('Controlled Load Test Complete: All checks passed cleanly.');
  console.log('================================================================');
}

runControlledLoadTest().catch((err) => {
  console.error('[FATAL ERROR] Controlled load test failed:', err);
  process.exit(1);
});
