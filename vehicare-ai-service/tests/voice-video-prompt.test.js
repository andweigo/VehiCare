import assert from 'node:assert/strict';
import { buildDiagnosisPrompt } from '../src/prompts/diagnosis.prompt.js';

console.log('================================================================');
console.log('VehiCare AI Service - Voice & Video Prompt Test');
console.log('================================================================');

// Test 1: Voice input prompt instructions
const voicePrompt = buildDiagnosisPrompt({
  vehicleContext: { type: 'Motorcycle', brand: 'Yamaha', model: 'Sniper 150', year: '2021' },
  symptoms: 'Voice consultation or audio recording of vehicle symptoms',
  inputType: 'voice',
  hasMedia: true,
  mediaMime: 'audio/mp4',
});

assert.ok(voicePrompt.includes('spoken consultation'), 'Voice prompt should mention spoken consultation');
assert.ok(voicePrompt.includes('reported'), 'Voice prompt should extract spoken symptoms to reported');
assert.ok(voicePrompt.includes('acoustic vehicle sounds') || voicePrompt.includes('vehicle sounds'), 'Voice prompt should cover vehicle sounds');
console.log('[PASS] Test 1: Voice prompt instructs Gemini to handle both spoken consultations and mechanical sounds');

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
console.log('Voice & Video Prompt Suite Results: 2/2 tests passed cleanly.');
console.log('================================================================');
