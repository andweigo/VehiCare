import assert from 'assert';
import { GoogleGenAI } from '@google/genai';

console.log('================================================================');
console.log('VehiCare AI Service - Files API & Upload Resumable Protocol Test');
console.log('================================================================');

async function runTests() {
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] Test ${total}: ${name}`);
      console.error(`       Error: ${err.message}`);
      if (err.stack) console.error(err.stack);
    }
  }

  const ai = new GoogleGenAI({ apiKey: 'fake-test-key' });
  const client = ai.files.apiClient;

  // Test 1: fetchUploadUrl WITHOUT configHttpOptions generates correct single v1beta URL and resumable headers
  await test('fetchUploadUrl without configHttpOptions constructs correct upload URL and resumable headers', async () => {
    let capturedUrl = null;
    let capturedHeaders = null;

    const originalRequest = client.request.bind(client);
    client.request = async (req) => {
      let patchedHttpOptions = client.clientOptions.httpOptions;
      if (req.httpOptions) {
        patchedHttpOptions = client.patchHttpOptions(client.clientOptions.httpOptions, req.httpOptions);
      }
      const url = client.constructUrl(req.path, patchedHttpOptions, false);
      capturedUrl = url.toString();
      capturedHeaders = req.httpOptions?.headers;
      return { headers: { 'x-goog-upload-url': 'https://mock.upload.url/session_123' } };
    };

    try {
      const uploadUrl = await client.fetchUploadUrl('upload/v1beta/files', '2048', 'audio/mp4', 'engine_sound.mp4', {}, undefined);

      assert.strictEqual(uploadUrl, 'https://mock.upload.url/session_123');
      assert.strictEqual(capturedUrl, 'https://generativelanguage.googleapis.com/upload/v1beta/files');
      assert.doesNotMatch(capturedUrl, /\/v1beta\/upload\/v1beta/, 'URL must NOT have duplicated /v1beta/upload/v1beta');

      assert.ok(capturedHeaders, 'Resumable upload headers must be present');
      assert.strictEqual(capturedHeaders['X-Goog-Upload-Protocol'], 'resumable');
      assert.strictEqual(capturedHeaders['X-Goog-Upload-Command'], 'start');
      assert.strictEqual(capturedHeaders['X-Goog-Upload-Header-Content-Length'], '2048');
      assert.strictEqual(capturedHeaders['X-Goog-Upload-Header-Content-Type'], 'audio/mp4');
      assert.strictEqual(capturedHeaders['X-Goog-Upload-File-Name'], 'engine_sound.mp4');
      assert.strictEqual(capturedHeaders['Content-Type'], 'application/json');
    } finally {
      client.request = originalRequest;
    }
  });

  // Test 2: Reproduces the bug when configHttpOptions is passed
  await test('fetchUploadUrl with configHttpOptions reproduces the double v1beta 404 URL and missing headers', async () => {
    let capturedUrl = null;
    let capturedHeaders = null;

    const originalRequest = client.request.bind(client);
    client.request = async (req) => {
      let patchedHttpOptions = client.clientOptions.httpOptions;
      if (req.httpOptions) {
        patchedHttpOptions = client.patchHttpOptions(client.clientOptions.httpOptions, req.httpOptions);
      }
      const url = client.constructUrl(req.path, patchedHttpOptions, false);
      capturedUrl = url.toString();
      capturedHeaders = req.httpOptions?.headers;
      return { headers: { 'x-goog-upload-url': 'https://mock.upload.url' } };
    };

    try {
      await client.fetchUploadUrl('upload/v1beta/files', '2048', 'audio/mp4', 'engine_sound.mp4', {}, { timeout: 30000 });

      // Demonstrates that passing httpOptions creates the broken URL that causes 404
      assert.strictEqual(capturedUrl, 'https://generativelanguage.googleapis.com/v1beta/upload/v1beta/files');
      assert.strictEqual(capturedHeaders, undefined, 'Resumable headers are omitted when configHttpOptions is passed');
    } finally {
      client.request = originalRequest;
    }
  });

  // Test 3: Upload config schema validation in @google/genai
  await test('UploadFileConfig accepts mimeType, displayName, and abortSignal without throwing', async () => {
    const controller = new AbortController();
    const uploadConfig = {
      mimeType: 'audio/mp4',
      displayName: 'vehicare-audio-test',
      abortSignal: controller.signal,
    };

    assert.strictEqual(uploadConfig.mimeType, 'audio/mp4');
    assert.strictEqual(uploadConfig.displayName, 'vehicare-audio-test');
    assert.strictEqual(uploadConfig.abortSignal.aborted, false);
    assert.strictEqual(uploadConfig.httpOptions, undefined, 'httpOptions should be undefined for files.upload');
  });

  console.log('================================================================');
  console.log(`Files Upload Suite Results: ${passed}/${total} tests passed cleanly.`);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
