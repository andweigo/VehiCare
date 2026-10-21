import assert from 'assert';
import { isValidBase64, validateAndDecodeMedia } from '../src/services/gemini.service.js';
import { sanitizeForLogging } from '../src/utils/logger.js';
import { errorHandlerMiddleware } from '../src/middleware/error.middleware.js';

console.log('================================================================');
console.log('VehiCare AI Service - Media Error Handling & Logging Audit Suite');
console.log('================================================================');

// 1. Base64 Validation Tests
assert.strictEqual(isValidBase64(''), false, 'Empty string is invalid base64');
assert.strictEqual(isValidBase64('ABC'), false, 'Length not multiple of 4 is invalid');
assert.strictEqual(isValidBase64('AAAA'), true, '4 valid chars is valid base64');
assert.strictEqual(isValidBase64('AAA='), true, '1 padding char is valid base64');
assert.strictEqual(isValidBase64('AA=='), true, '2 padding chars is valid base64');
assert.strictEqual(isValidBase64('A==='), false, '3 padding chars is invalid base64');
assert.strictEqual(isValidBase64('AA==AAAA'), false, 'Padding in middle is invalid');
assert.strictEqual(isValidBase64('AA!A'), false, 'Special non-base64 characters are invalid');

// 2. Large Media Validation (3.82 MB video ~ 5.1M base64 chars) - No RangeError!
const ftypHeader = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32]);
const padding = Buffer.alloc(3823311 - ftypHeader.length, 0xaa);
const testVideoBuffer = Buffer.concat([ftypHeader, padding]);
const testVideoBase64 = testVideoBuffer.toString('base64');

assert.strictEqual(testVideoBase64.length > 5000000, true, 'Test video base64 is over 5 million characters');

let decoded;
assert.doesNotThrow(() => {
  decoded = validateAndDecodeMedia(testVideoBase64, 'video', 'video/mp4');
}, 'validateAndDecodeMedia should not throw RangeError on 3.8MB video base64');

assert.strictEqual(decoded.mediaType, 'video');
assert.strictEqual(decoded.mimeType, 'video/mp4');
assert.strictEqual(decoded.bytes.length, testVideoBuffer.length);
console.log('[PASS] Test 1: validateAndDecodeMedia processes 3.82MB video without RangeError or stack overflow');

// 3. Logger Sanitizer Tests
const sensitiveSample = {
  apiKey: 'AIzaSyDemoKey12345678901234567890123',
  authorization: 'Bearer supersecretjwttoken.part2.part3',
  password: 'mySecretPassword123',
  errorMessage: 'Error calling Gemini with key AIzaSyDemoKey12345678901234567890123 and token=my_secret_token',
  stack: 'Error: at line 42\n  at file.js:10:5 with Bearer token_secret_val',
  media_base64: 'AAAA'.repeat(100),
};

const sanitized = sanitizeForLogging(sensitiveSample);
assert.strictEqual(sanitized.apiKey, '[REDACTED]', 'apiKey must be redacted');
assert.strictEqual(sanitized.authorization, '[REDACTED]', 'authorization header must be redacted');
assert.strictEqual(sanitized.password, '[REDACTED]', 'password must be redacted');
assert.strictEqual(sanitized.media_base64.startsWith('[BASE64_DATA_LEN_'), true, 'media_base64 must be length-only placeholder');
assert.strictEqual(sanitized.errorMessage.includes('AIzaSy'), false, 'API key in errorMessage must be redacted');
assert.strictEqual(sanitized.errorMessage.includes('[REDACTED_API_KEY]'), true, 'API key replaced with [REDACTED_API_KEY]');
assert.strictEqual(sanitized.errorMessage.includes('token=[REDACTED]'), true, 'token parameter redacted');
assert.strictEqual(sanitized.stack.includes('Bearer [REDACTED_TOKEN]'), true, 'Bearer token in stack trace redacted');
console.log('[PASS] Test 2: sanitizeForLogging redacts API keys, Bearer tokens, passwords, and base64 payloads');

// 4. Error Middleware Tests
let capturedStatus = null;
let capturedBody = null;
const mockRes = {
  status: (code) => {
    capturedStatus = code;
    return {
      json: (data) => {
        capturedBody = data;
        return data;
      },
    };
  },
};
const mockReq = {
  headers: { 'x-request-id': 'req_test_123' },
  body: {},
};

// Test RangeError mapping
const testRangeError = new RangeError('Maximum call stack size exceeded');
errorHandlerMiddleware(testRangeError, mockReq, mockRes, () => {});

assert.strictEqual(capturedStatus, 400, 'RangeError should map to 400 bad request');
assert.strictEqual(capturedBody.error.code, 'INVALID_MEDIA', 'RangeError should map to INVALID_MEDIA instead of generic 500');
assert.strictEqual(capturedBody.error.retryable, false, 'RangeError should not be retryable');
assert.strictEqual(capturedBody.error.request_id, 'req_test_123');
console.log('[PASS] Test 3: errorHandlerMiddleware maps RangeError to 400 INVALID_MEDIA non-retryable');

// Test 413 Payload Too Large mapping
const testLargeError = new Error('Payload too large');
testLargeError.code = 'MEDIA_TOO_LARGE';
testLargeError.statusCode = 413;
errorHandlerMiddleware(testLargeError, mockReq, mockRes, () => {});

assert.strictEqual(capturedStatus, 413, 'MEDIA_TOO_LARGE should map to 413');
assert.strictEqual(capturedBody.error.code, 'MEDIA_TOO_LARGE');
assert.strictEqual(capturedBody.error.retryable, false);
console.log('[PASS] Test 4: errorHandlerMiddleware preserves 413 MEDIA_TOO_LARGE status and code');

console.log('================================================================');
console.log('Media Error Handling Suite: 4/4 tests passed cleanly.');
console.log('================================================================');
