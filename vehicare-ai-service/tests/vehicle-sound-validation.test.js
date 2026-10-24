import assert from 'node:assert/strict';
import {
  __resetMockCallGemini,
  __setMockCallGemini,
} from '../src/services/gemini.service.js';
import { classifyVehicleSound } from '../src/services/vehicle-sound-validation.service.js';

const base = {
  outcome: 'valid_vehicle_sound',
  vehicle_sound_detected: true,
  identifiable_vehicle_source: true,
  confidence: 'high',
  reason: 'A repeating engine rattle is clearly audible.',
  retry_guidance: 'Record near the engine in a quiet place.',
};

try {
  __setMockCallGemini(async params => {
    assert.equal(params.inputType, 'audio');
    return { text: JSON.stringify(base) };
  });
  const valid = await classifyVehicleSound({ mediaBase64: 'media', mediaMime: 'audio/mp4', requestId: 'test-valid' });
  assert.equal(valid.outcome, 'valid_vehicle_sound');

  __setMockCallGemini(async () => ({
    text: JSON.stringify({ ...base, outcome: 'irrelevant_audio', vehicle_sound_detected: false, identifiable_vehicle_source: false }),
  }));
  const speech = await classifyVehicleSound({ mediaBase64: 'media', mediaMime: 'audio/mp4', requestId: 'test-speech' });
  assert.equal(speech.outcome, 'irrelevant_audio');

  __setMockCallGemini(async () => ({ text: JSON.stringify({ ...base, confidence: 'medium' }) }));
  const uncertain = await classifyVehicleSound({ mediaBase64: 'media', mediaMime: 'audio/mp4', requestId: 'test-uncertain' });
  assert.equal(uncertain.outcome, 'inconclusive_audio');

  __setMockCallGemini(async () => ({ text: 'not json' }));
  const malformed = await classifyVehicleSound({ mediaBase64: 'media', mediaMime: 'audio/mp4', requestId: 'test-malformed' });
  assert.equal(malformed.outcome, 'inconclusive_audio');

  __setMockCallGemini(async () => {
    const error = new Error('provider unavailable');
    error.code = 'GEMINI_UNAVAILABLE';
    error.statusCode = 503;
    error.retryable = true;
    throw error;
  });
  await assert.rejects(
    () => classifyVehicleSound({ mediaBase64: 'media', mediaMime: 'audio/mp4', requestId: 'test-provider-error' }),
    error => error.code === 'GEMINI_UNAVAILABLE' && error.statusCode === 503,
  );

  console.log('Vehicle sound validation tests passed.');
} finally {
  __resetMockCallGemini();
}
