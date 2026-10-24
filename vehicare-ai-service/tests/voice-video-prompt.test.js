import assert from 'node:assert/strict';
import { buildDiagnosisPrompt } from '../src/prompts/diagnosis.prompt.js';

console.log('================================================================');
console.log('VehiCare AI Service - Vehicle Sound & Video Prompt Test');
console.log('================================================================');

// Test 1: Audio input is only for vehicle sounds; it must not transcribe speech.
const audioPrompt = buildDiagnosisPrompt({
  vehicleContext: { type: 'Motorcycle', brand: 'Yamaha', model: 'Sniper 150', year: '2021' },
  symptoms: 'Audio recording of engine or vehicle noise',
  inputType: 'audio',
  hasMedia: true,
  mediaMime: 'audio/mp4',
});

assert.ok(audioPrompt.includes('audible vehicle-generated sounds'), 'Audio prompt should analyze vehicle sounds');
assert.ok(audioPrompt.includes('Do not transcribe speech'), 'Audio prompt must not transcribe spoken questions');
assert.ok(audioPrompt.includes('Do not claim visual observations'), 'Audio prompt must stay within the audio modality');
console.log('[PASS] Test 1: Audio prompt only analyzes vehicle sounds and rejects spoken-question transcription');

// Test 2: Video input prompt instructions
const videoPrompt = buildDiagnosisPrompt({
  vehicleContext: { type: 'Motorcycle', brand: 'Yamaha', model: 'Sniper 150', year: '2021' },
  symptoms: 'Visual and audio vehicle video analysis',
  inputType: 'video',
  hasMedia: true,
  mediaMime: 'video/mp4',
});

assert.ok(videoPrompt.includes('video over time'), 'Video prompt should analyze video over time');
assert.ok(videoPrompt.includes('audible sounds'), 'Video prompt should cover audible sounds');
console.log('[PASS] Test 2: Video prompt instructs Gemini on visual changes and audible sounds');

console.log('================================================================');
console.log('Vehicle Sound & Video Prompt Suite Results: 2/2 tests passed cleanly.');
console.log('================================================================');
