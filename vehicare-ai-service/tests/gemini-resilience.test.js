import assert from 'assert';
import config from '../src/config/env.js';
import {
  callGemini,
  extractGeminiErrorInfo,
  sanitizeErrorMessage,
  isModelInCooldown,
  triggerModelCooldown,
  clearModelCooldown,
  clearAllModelCooldowns,
  normalizeGeminiError,
  resolveTotalBudgetMs,
  __setMockCallGemini,
  __resetMockCallGemini,
} from '../src/services/gemini.service.js';
import { errorHandlerMiddleware } from '../src/middleware/error.middleware.js';

console.log('================================================================');
console.log('VehiCare AI Service - Gemini Resilience & Fallback Audit Suite');
console.log('================================================================');

let passedTests = 0;
let totalTests = 0;

const test = async (name, fn) => {
  totalTests++;
  clearAllModelCooldowns();
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

const createMockClient = (handlersByModel) => {
  const callCounts = {};
  return {
    callCounts,
    models: {
      generateContent: async ({ model, config: genConfig }) => {
        callCounts[model] = (callCounts[model] || 0) + 1;
        const handler = handlersByModel[model];
        if (typeof handler === 'function') {
          return await handler(callCounts[model], genConfig);
        }
        return { text: JSON.stringify({ type: 'conversation', response: 'Default mock response' }) };
      },
    },
  };
};

// 1. Error extraction and sanitization
await test('extractGeminiErrorInfo properly parses status, code, retryDelay, and sanitizes API keys', async () => {
  const rawKey = 'AIzaSyDxAbc1234567890SecretKeyPayload';
  const rawJsonError = new Error(JSON.stringify({
    error: {
      code: 429,
      status: 'RESOURCE_EXHAUSTED',
      message: `Quota exceeded for key=${rawKey}. Please retry in 58436s.`,
      details: [
        {
          '@type': 'type.googleapis.com/google.rpc.RetryInfo',
          retryDelay: '58436s',
        },
      ],
    },
  }));
  rawJsonError.status = 429;

  const info = extractGeminiErrorInfo(rawJsonError);
  assert.strictEqual(info.status, 429);
  assert.strictEqual(info.code, 'RESOURCE_EXHAUSTED');
  assert.strictEqual(info.isRateLimit, true);
  assert.strictEqual(info.isTransient, true);
  assert.strictEqual(info.retryDelayMs, 58436000);
  assert.strictEqual(info.message.includes(rawKey), false, 'API key must not be present in sanitized message');

  const cleanMsg = sanitizeErrorMessage(`Unauthorized call with key ${rawKey} and Bearer abc.xyz123`);
  assert.strictEqual(cleanMsg.includes(rawKey), false);
  assert.strictEqual(cleanMsg.includes('abc.xyz123'), false);
});

// 2. Upstream 429 with long retryDelay immediately falls back without wasted retries
await test('Upstream 429 with long retry delay skips retrying primary model and succeeds on fallback', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  const client = createMockClient({
    [primary]: () => {
      const err = new Error(JSON.stringify({
        error: {
          code: 429,
          status: 'RESOURCE_EXHAUSTED',
          message: 'Quota exceeded for free tier. Please retry in 16 hours.',
          details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '57600s' }],
        },
      }));
      err.status = 429;
      throw err;
    },
    [fallback]: () => {
      return { text: JSON.stringify({ type: 'diagnostic', status: 'diagnosis_ready', summary: 'Fallback succeeded' }) };
    },
  });

  const result = await callGemini({
    prompt: 'Check brake noise',
    requestId: 'req_test_429_fallback',
    requestType: 'diagnostic',
    inputType: 'text',
    startTime: Date.now(),
    totalBudgetMs: 20000,
  }, client);

  assert.strictEqual(client.callCounts[primary], 1, 'Primary model must not be retried when retryDelay is 16h');
  assert.strictEqual(client.callCounts[fallback], 1, 'Fallback model must be attempted');
  assert.strictEqual(result.fallbackUsed, true);
  assert.strictEqual(result.modelUsed, fallback);
  assert.strictEqual(isModelInCooldown(primary), true, 'Primary model should be placed in cooldown');
  assert.strictEqual(isModelInCooldown(fallback), false, 'Healthy fallback model must NOT be in cooldown');
});

// 3. Upstream 429 with short retry delay retries primary model with backoff
await test('Upstream 429 with short retry delay retries primary model and succeeds', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  const client = createMockClient({
    [primary]: (attempt) => {
      if (attempt === 1) {
        const err = new Error(JSON.stringify({
          error: {
            code: 429,
            status: 'RESOURCE_EXHAUSTED',
            message: 'Rate limit exceeded. Please wait a brief moment.',
            details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '0.1s' }],
          },
        }));
        err.status = 429;
        throw err;
      }
      return { text: JSON.stringify({ type: 'diagnostic', status: 'diagnosis_ready', summary: 'Primary retry succeeded' }) };
    },
  });

  const result = await callGemini({
    prompt: 'Check battery voltage',
    requestId: 'req_test_429_short_retry',
    requestType: 'diagnostic',
    inputType: 'text',
    startTime: Date.now(),
    totalBudgetMs: 20000,
  }, client);

  assert.strictEqual(client.callCounts[primary], 2, 'Primary model should retry after transient 429 with short delay');
  assert.strictEqual(client.callCounts[fallback] || 0, 0, 'Fallback model should not be called if primary retry succeeds');
  assert.strictEqual(result.fallbackUsed, false);
  assert.strictEqual(result.modelUsed, primary);
  assert.strictEqual(isModelInCooldown(primary), false, 'Successful retry should clear cooldown');
});

// 4. Upstream 503 High Demand triggers fallback
await test('Upstream 503 high demand triggers fallback and succeeds on secondary model', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  const client = createMockClient({
    [primary]: () => {
      const err = new Error(JSON.stringify({
        error: {
          code: 503,
          status: 'UNAVAILABLE',
          message: 'This model is currently experiencing high demand. Spikes in demand are usually temporary.',
        },
      }));
      err.status = 503;
      throw err;
    },
    [fallback]: () => {
      return { text: JSON.stringify({ type: 'diagnostic', status: 'diagnosis_ready', summary: 'Fallback succeeded after 503' }) };
    },
  });

  const result = await callGemini({
    prompt: 'Check transmission slipping',
    requestId: 'req_test_503_fallback',
    requestType: 'diagnostic',
    inputType: 'text',
    startTime: Date.now(),
    totalBudgetMs: 20000,
  }, client);

  assert.strictEqual(client.callCounts[fallback], 1);
  assert.strictEqual(result.fallbackUsed, true);
  assert.strictEqual(result.modelUsed, fallback);
});

// 5. Upstream 504 / generation timeout falls back within remaining request budget
await test('Upstream 504 timeout on primary model falls back and completes within budget', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  const client = createMockClient({
    [primary]: async () => {
      // Simulate timeout by throwing 504 / DEADLINE_EXCEEDED
      const err = new Error('Upstream gateway timeout: deadline exceeded');
      err.status = 504;
      err.code = 'DEADLINE_EXCEEDED';
      throw err;
    },
    [fallback]: () => {
      return { text: JSON.stringify({ type: 'diagnostic', status: 'diagnosis_ready', summary: 'Fallback succeeded after 504' }) };
    },
  });

  const startTime = Date.now();
  const result = await callGemini({
    prompt: 'Engine overheating issue',
    requestId: 'req_test_504_fallback',
    requestType: 'diagnostic',
    inputType: 'text',
    startTime,
    totalBudgetMs: 24000,
  }, client);

  assert.strictEqual(result.fallbackUsed, true);
  assert.strictEqual(result.modelUsed, fallback);
  assert.ok(Date.now() - startTime < 24000, 'Total execution must not exceed request budget');
});

// 6. Non-retryable 400 / 401 invalid API key aborts immediately without attempting fallback
await test('Non-retryable 400/401 API_KEY_INVALID aborts immediately without retrying or fallback', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  const client = createMockClient({
    [primary]: () => {
      const err = new Error(JSON.stringify({
        error: {
          code: 400,
          status: 'INVALID_ARGUMENT',
          message: 'API key not valid. Please pass a valid API key.',
          details: [{ reason: 'API_KEY_INVALID' }],
        },
      }));
      err.status = 400;
      throw err;
    },
    [fallback]: () => {
      return { text: 'Should never be called' };
    },
  });

  let caughtError = null;
  try {
    await callGemini({
      prompt: 'Check coolant level',
      requestId: 'req_test_invalid_key',
      requestType: 'diagnostic',
      inputType: 'text',
      startTime: Date.now(),
      totalBudgetMs: 20000,
    }, client);
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError, 'Must throw error on invalid API key');
  assert.strictEqual(caughtError.retryable, false, 'Invalid API key error must NOT be retryable');
  assert.strictEqual(client.callCounts[primary], 1, 'Primary must only be called once');
  assert.strictEqual(client.callCounts[fallback] || 0, 0, 'Fallback must NOT be attempted when API key is invalid');
});

// 7. Non-retryable 404 model not found falls back immediately to next model
await test('404 model not found triggers immediate fallback to next candidate model', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  const client = createMockClient({
    [primary]: () => {
      const err = new Error(JSON.stringify({
        error: {
          code: 404,
          status: 'NOT_FOUND',
          message: 'This model models/old-model is no longer available.',
        },
      }));
      err.status = 404;
      throw err;
    },
    [fallback]: () => {
      return { text: JSON.stringify({ type: 'diagnostic', status: 'diagnosis_ready', summary: 'Fallback model succeeded' }) };
    },
  });

  const result = await callGemini({
    prompt: 'Check brake pads',
    requestId: 'req_test_404_fallback',
    requestType: 'diagnostic',
    inputType: 'text',
    startTime: Date.now(),
    totalBudgetMs: 20000,
  }, client);

  assert.strictEqual(client.callCounts[primary], 1, 'Deprecated 404 model must not be retried');
  assert.strictEqual(client.callCounts[fallback], 1, 'Fallback model must be used');
  assert.strictEqual(result.fallbackUsed, true);
  assert.strictEqual(result.modelUsed, fallback);
});

// 8. All models failed returns clean 503 without crashing or leaking secrets
await test('All models failed throws clean retryable 503 error', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  const client = createMockClient({
    [primary]: () => {
      const err = new Error('Primary model unavailable (503)');
      err.status = 503;
      throw err;
    },
    [fallback]: () => {
      const err = new Error('Fallback model unavailable (503)');
      err.status = 503;
      throw err;
    },
  });

  let caughtError = null;
  try {
    await callGemini({
      prompt: 'Check tire pressure',
      requestId: 'req_test_all_failed',
      requestType: 'diagnostic',
      inputType: 'text',
      startTime: Date.now(),
      totalBudgetMs: 20000,
    }, client);
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError);
  assert.strictEqual(caughtError.retryable, true);
  assert.strictEqual(caughtError.statusCode, 503);

  // Test Express error middleware formatting
  let sentStatus = null;
  let sentJson = null;
  const mockRes = {
    status: (s) => {
      sentStatus = s;
      return mockRes;
    },
    json: (d) => {
      sentJson = d;
      return mockRes;
    },
  };

  errorHandlerMiddleware(caughtError, { headers: { 'x-request-id': 'req_test_all_failed' } }, mockRes, () => {});
  assert.strictEqual(sentStatus, 503);
  assert.strictEqual(sentJson.success, false);
  assert.strictEqual(sentJson.error.retryable, true);
  assert.strictEqual(sentJson.error.code, 'GEMINI_OVERLOADED');
  assert.strictEqual(typeof sentJson.error.message, 'string');
  assert.strictEqual(sentJson.error.stack, undefined, 'Stack trace must NEVER be sent to client');
});

// 9. Low remaining time budget avoids timeout and aborts early
await test('callGemini aborts fast when overall deadline is already expired (< 2s)', async () => {
  const primary = config.gemini.model;
  const client = createMockClient({
    [primary]: () => ({ text: 'ok' }),
  });

  let caughtError = null;
  try {
    await callGemini({
      prompt: 'Quick ping',
      requestId: 'req_test_budget_exhausted',
      requestType: 'diagnostic',
      inputType: 'text',
      startTime: Date.now() - 24500, // already 24.5s elapsed
      totalBudgetMs: 25000,          // only 500ms remaining
    }, client);
  } catch (err) {
    caughtError = err;
  }

  assert.ok(caughtError);
  assert.strictEqual(client.callCounts[primary] || 0, 0, 'Gemini must not be called when time budget is depleted');
});

// 10. Cooldown on primary model does not block fallback model on subsequent requests
await test('Cooldown on primary model allows subsequent requests to immediately use fallback model', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  triggerModelCooldown(primary, 'req_cooldown_test', 'TRANSIENT_FAILURE', 15000);
  assert.strictEqual(isModelInCooldown(primary), true);
  assert.strictEqual(isModelInCooldown(fallback), false);

  const client = createMockClient({
    [primary]: () => { throw new Error('Primary in cooldown should not be called'); },
    [fallback]: () => {
      return { text: JSON.stringify({ type: 'conversation', response: 'Fallback answered immediately' }) };
    },
  });

  const result = await callGemini({
    prompt: 'Check steering vibration',
    requestId: 'req_cooldown_exec',
    requestType: 'diagnostic',
    inputType: 'text',
    startTime: Date.now(),
    totalBudgetMs: 20000,
  }, client);

  assert.strictEqual(client.callCounts[primary] || 0, 0, 'Primary model in cooldown must be skipped');
  assert.strictEqual(client.callCounts[fallback], 1, 'Fallback model must be used directly');
  assert.strictEqual(result.fallbackUsed, true);
});

// 11. Primary model succeeds cleanly on first attempt without invoking fallback
await test('Primary model succeeds cleanly on first attempt when healthy', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  const client = createMockClient({
    [primary]: () => ({
      text: JSON.stringify({ type: 'diagnostic', status: 'diagnosis_ready', summary: 'Primary model succeeded' }),
    }),
    [fallback]: () => {
      throw new Error('Fallback should not be called when primary succeeds');
    },
  });

  const result = await callGemini({
    prompt: 'Check engine oil level',
    requestId: 'req_primary_success',
    requestType: 'diagnostic',
    inputType: 'text',
    startTime: Date.now(),
  }, client);

  assert.strictEqual(client.callCounts[primary], 1);
  assert.strictEqual(client.callCounts[fallback] || 0, 0);
  assert.strictEqual(result.fallbackUsed, false);
  assert.strictEqual(result.modelUsed, primary);
});

// 12. Real timeout via AbortController cancels primary without retrying primary and prevents duplicate response
await test('Primary timeout aborts via AbortSignal, skips primary retry, succeeds on fallback, and ignores late primary resolution', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;
  let primaryAbortFired = false;
  let latePrimaryResolved = false;

  const client = createMockClient({
    [primary]: (_attempt, genConfig) => new Promise((resolve) => {
      if (genConfig?.abortSignal) {
        genConfig.abortSignal.addEventListener('abort', () => {
          primaryAbortFired = true;
        });
      }
      // Resolve after primary timeout has already fired
      setTimeout(() => {
        latePrimaryResolved = true;
        resolve({ text: JSON.stringify({ type: 'diagnostic', summary: 'Stale late primary response' }) });
      }, 2800);
    }),
    [fallback]: () => ({
      text: JSON.stringify({ type: 'diagnostic', status: 'diagnosis_ready', summary: 'Clean fallback response' }),
    }),
  });

  // Give 6500ms budget so primary gets ~2500ms (with 4000ms reserved for fallback), times out at 2500ms, and fallback succeeds immediately
  const result = await callGemini({
    prompt: 'Check alternator charging voltage',
    requestId: 'req_abort_timeout_test',
    requestType: 'diagnostic',
    inputType: 'text',
    startTime: Date.now(),
    totalBudgetMs: 6500,
  }, client);

  assert.strictEqual(primaryAbortFired, true, 'AbortSignal must fire when primary attempt times out');
  assert.strictEqual(client.callCounts[primary], 1, 'Timed-out primary model must NOT be retried');
  assert.strictEqual(client.callCounts[fallback], 1, 'Fallback model must be called once after primary timeout');
  assert.strictEqual(result.fallbackUsed, true);
  assert.strictEqual(result.modelUsed, fallback);
  assert.ok(result.text.includes('Clean fallback response'), 'Must return fallback response, not late primary response');
  assert.strictEqual(latePrimaryResolved, false, 'Fallback should complete without waiting for stale primary timer');
  assert.strictEqual(isModelInCooldown(primary), true, 'Timed-out primary model must be placed in cooldown');
});

// 13. Tight remaining budget (< 6s) skips primary model and routes directly to fallback
await test('Tight remaining budget (< 6s) skips primary model safely and uses fallback model', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  const client = createMockClient({
    [primary]: () => {
      throw new Error('Primary should be skipped when < 6s remains');
    },
    [fallback]: () => ({
      text: JSON.stringify({ type: 'diagnostic', status: 'diagnosis_ready', summary: 'Fast fallback under tight budget' }),
    }),
  });

  const result = await callGemini({
    prompt: 'Check radiator fan',
    requestId: 'req_tight_budget_fallback',
    requestType: 'diagnostic',
    inputType: 'text',
    startTime: Date.now() - 20500,
    totalBudgetMs: 25000, // 4500ms remaining
  }, client);

  assert.strictEqual(client.callCounts[primary] || 0, 0, 'Primary model must be skipped when < 6s remains');
  assert.strictEqual(client.callCounts[fallback], 1, 'Fallback model must execute with remaining budget');
  assert.strictEqual(result.fallbackUsed, true);
  assert.strictEqual(result.modelUsed, fallback);
});

// 14. Audio/video Files API upload cleanup runs on both success and failure, and media budgets scale by inputType
await test('Media Files API uploads are cleaned up after both success and failure', async () => {
  assert.ok(resolveTotalBudgetMs('video', true) > resolveTotalBudgetMs('text', false), 'Video budget must exceed text budget');
  assert.ok(resolveTotalBudgetMs('audio', true) > resolveTotalBudgetMs('text', false), 'Audio budget must exceed text budget');
  assert.ok(resolveTotalBudgetMs('image', true) > resolveTotalBudgetMs('text', false), 'Image budget must exceed text budget');

  // Create valid MP4 header (ftyp box at offset 4..8)
  const mp4Bytes = Buffer.alloc(32);
  mp4Bytes.writeUInt32BE(32, 0);
  mp4Bytes.write('ftypisom', 4, 'ascii');
  const validMp4Base64 = mp4Bytes.toString('base64');

  const deletedFiles = [];
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  const successMediaClient = {
    files: {
      upload: async () => ({ name: 'files/audio_success_1', uri: 'https://generativelanguage.googleapis.com/v1beta/files/audio_success_1', state: 'ACTIVE', mimeType: 'audio/mp4' }),
      get: async () => ({ name: 'files/audio_success_1', uri: 'https://generativelanguage.googleapis.com/v1beta/files/audio_success_1', state: 'ACTIVE', mimeType: 'audio/mp4' }),
      delete: async ({ name }) => { deletedFiles.push(name); },
    },
    models: {
      generateContent: async () => ({
        text: JSON.stringify({ type: 'diagnostic', status: 'diagnosis_ready', summary: 'Audio analyzed' }),
      }),
    },
  };

  const audioRes = await callGemini({
    prompt: 'Analyze engine sound',
    mediaBase64: validMp4Base64,
    mediaMime: 'audio/mp4',
    inputType: 'audio',
    requestId: 'req_audio_cleanup_ok',
  }, successMediaClient);

  assert.ok(audioRes.text.includes('Audio analyzed'));
  assert.ok(deletedFiles.includes('files/audio_success_1'), 'Uploaded file must be cleaned up after success');

  const failMediaClient = {
    files: {
      upload: async () => ({ name: 'files/video_fail_1', uri: 'https://generativelanguage.googleapis.com/v1beta/files/video_fail_1', state: 'ACTIVE', mimeType: 'video/mp4' }),
      get: async () => ({ name: 'files/video_fail_1', uri: 'https://generativelanguage.googleapis.com/v1beta/files/video_fail_1', state: 'ACTIVE', mimeType: 'video/mp4' }),
      delete: async ({ name }) => { deletedFiles.push(name); },
    },
    models: {
      generateContent: async () => {
        const err = new Error('Model unavailable');
        err.status = 503;
        throw err;
      },
    },
  };

  clearAllModelCooldowns();
  let videoFailed = false;
  try {
    await callGemini({
      prompt: 'Analyze exhaust smoke video',
      mediaBase64: validMp4Base64,
      mediaMime: 'video/mp4',
      inputType: 'video',
      requestId: 'req_video_cleanup_fail',
      totalBudgetMs: 15000,
    }, failMediaClient);
  } catch (_err) {
    videoFailed = true;
  }

  assert.strictEqual(videoFailed, true);
  assert.ok(deletedFiles.includes('files/video_fail_1'), 'Uploaded file must be cleaned up even when both primary and fallback models fail');
});

// 15. Mock Gemini handlers (__setMockCallGemini / __resetMockCallGemini) continue to work
await test('Mock Gemini handlers (__setMockCallGemini / __resetMockCallGemini) work as expected', async () => {
  __setMockCallGemini(async (params) => ({
    text: JSON.stringify({ type: 'conversation', response: `Mocked for ${params.requestId}` }),
    modelUsed: 'mock-gemini',
    fallbackUsed: false,
    durationMs: 5,
  }));

  try {
    const res = await callGemini({ prompt: 'Hello', requestId: 'req_mock_handler' });
    assert.strictEqual(res.modelUsed, 'mock-gemini');
    assert.ok(res.text.includes('req_mock_handler'));
  } finally {
    __resetMockCallGemini();
  }
});

// 16. Fallback model in cooldown leaves primary model as the active candidate
await test('Cooldown on fallback model allows primary model to execute normally', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  triggerModelCooldown(fallback, 'req_cooldown_fallback_test', 'TRANSIENT_FAILURE', 15000);
  assert.strictEqual(isModelInCooldown(primary), false);
  assert.strictEqual(isModelInCooldown(fallback), true);

  const client = createMockClient({
    [primary]: () => ({
      text: JSON.stringify({ type: 'diagnostic', status: 'diagnosis_ready', summary: 'Primary model answered' }),
    }),
    [fallback]: () => { throw new Error('Fallback in cooldown must not be called'); },
  });

  const result = await callGemini({
    prompt: 'Check steering wheel play',
    requestId: 'req_fallback_cooldown_exec',
    requestType: 'diagnostic',
    inputType: 'text',
    startTime: Date.now(),
    totalBudgetMs: 20000,
  }, client);

  assert.strictEqual(client.callCounts[primary], 1, 'Primary model must be called');
  assert.strictEqual(client.callCounts[fallback] || 0, 0, 'Fallback model in cooldown must be skipped');
  assert.strictEqual(result.fallbackUsed, false);
  assert.strictEqual(result.modelUsed, primary);
});

// 17. Both primary and fallback models in cooldown rejects with HTTP 503 GEMINI_OVERLOADED without calling client
await test('Both models in cooldown rejects with HTTP 503 GEMINI_OVERLOADED without calling client', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  triggerModelCooldown(primary, 'req_both_cooldown', 'OVERLOADED', 20000);
  triggerModelCooldown(fallback, 'req_both_cooldown', 'OVERLOADED', 20000);

  const client = createMockClient({
    [primary]: () => { throw new Error('Primary in cooldown must not be called'); },
    [fallback]: () => { throw new Error('Fallback in cooldown must not be called'); },
  });

  let caught = null;
  try {
    await callGemini({
      prompt: 'Check engine check light',
      requestId: 'req_both_cooldown_exec',
      requestType: 'diagnostic',
      inputType: 'text',
      startTime: Date.now(),
      totalBudgetMs: 20000,
    }, client);
  } catch (err) {
    caught = err;
  }

  assert.ok(caught, 'Must reject when both models are in cooldown');
  assert.strictEqual(caught.statusCode, 503, 'Must return HTTP 503');
  assert.strictEqual(caught.code, 'GEMINI_OVERLOADED', 'Error code must be GEMINI_OVERLOADED');
  assert.strictEqual(caught.retryable, true, 'Error must be marked retryable');
  assert.strictEqual(client.callCounts[primary] || 0, 0, 'Primary must not be called');
  assert.strictEqual(client.callCounts[fallback] || 0, 0, 'Fallback must not be called');

  // Verify error middleware formats this cleanly as 503
  let sentStatus = null;
  let sentJson = null;
  const mockRes = {
    status: (s) => { sentStatus = s; return mockRes; },
    json: (d) => { sentJson = d; return mockRes; },
  };
  errorHandlerMiddleware(caught, { headers: { 'x-request-id': 'req_both_cooldown_exec' } }, mockRes, () => {});
  assert.strictEqual(sentStatus, 503);
  assert.strictEqual(sentJson.success, false);
  assert.strictEqual(sentJson.error.code, 'GEMINI_OVERLOADED');
  assert.strictEqual(sentJson.error.retryable, true);
});

// 18. Cooldown expiration restores model availability
await test('Expired cooldown allows model to be selected again', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  // Set cooldown to expire in the past
  triggerModelCooldown(primary, 'req_expire_test', 'TRANSIENT', -100);
  assert.strictEqual(isModelInCooldown(primary), false, 'Expired cooldown must return false');

  const client = createMockClient({
    [primary]: () => ({
      text: JSON.stringify({ type: 'diagnostic', status: 'diagnosis_ready', summary: 'Restored primary model answered' }),
    }),
  });

  const result = await callGemini({
    prompt: 'Check brake pads',
    requestId: 'req_cooldown_restored',
    requestType: 'diagnostic',
    inputType: 'text',
    startTime: Date.now(),
    totalBudgetMs: 20000,
  }, client);

  assert.strictEqual(client.callCounts[primary], 1);
  assert.strictEqual(result.fallbackUsed, false);
});

// 19. Primary timeout followed by fallback timeout reports clean 504 GEMINI_TIMEOUT
await test('Primary timeout followed by fallback timeout returns clean 504 GEMINI_TIMEOUT', async () => {
  const primary = config.gemini.model;
  const fallback = config.gemini.fallbackModel;

  const client = createMockClient({
    [primary]: () => {
      const err = new Error('Primary gateway timeout');
      err.status = 504;
      err.code = 'DEADLINE_EXCEEDED';
      throw err;
    },
    [fallback]: () => {
      const err = new Error('Fallback gateway timeout');
      err.status = 504;
      err.code = 'DEADLINE_EXCEEDED';
      throw err;
    },
  });

  let caught = null;
  try {
    await callGemini({
      prompt: 'Check clutch slippage',
      requestId: 'req_both_timeout',
      requestType: 'diagnostic',
      inputType: 'text',
      startTime: Date.now(),
      totalBudgetMs: 20000,
    }, client);
  } catch (err) {
    caught = err;
  }

  assert.ok(caught);
  assert.strictEqual(caught.statusCode, 504, 'Must report 504 timeout');
  assert.strictEqual(caught.code, 'GEMINI_TIMEOUT', 'Must report GEMINI_TIMEOUT code');
  assert.strictEqual(caught.retryable, true, 'Timeout must be retryable');
  assert.strictEqual(client.callCounts[primary], 1);
  assert.strictEqual(client.callCounts[fallback], 1);
});

console.log('================================================================');
console.log(`Gemini Resilience Suite Results: ${passedTests}/${totalTests} tests passed cleanly.`);
console.log('================================================================');
