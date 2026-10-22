import assert from 'node:assert/strict';
import { parseAndCleanJson, repairTruncatedJson, extractSalvageableDiagnostic } from '../src/utils/response-parser.js';

console.log('================================================================');
console.log('VehiCare AI Service - Response Parser & JSON Repair Test Suite');
console.log('================================================================');

// Test 1: Perfectly valid JSON
const validJson = JSON.stringify({
  type: 'diagnostic',
  status: 'diagnosis_ready',
  summary: 'Normal diagnostic summary',
  confidence: { score: 90, level: 'HIGH', reason: 'Clear signs' },
  possible_causes: [{ cause: 'Worn battery', likelihood: 'HIGH', likelihood_score: 90 }],
});
const parsedValid = parseAndCleanJson(validJson);
assert.equal(parsedValid?.summary, 'Normal diagnostic summary');
console.log('[PASS] Test 1: Parses standard valid JSON');

// Test 2: JSON wrapped in markdown code fences
const fencedJson = '```json\n' + validJson + '\n```';
const parsedFenced = parseAndCleanJson(fencedJson);
assert.equal(parsedFenced?.summary, 'Normal diagnostic summary');
console.log('[PASS] Test 2: Parses JSON enclosed in markdown code fences');

// Test 3: Truncated inside a nested string literal in array
const truncatedNested = `{
  "type": "diagnostic",
  "status": "diagnosis_ready",
  "summary": "Front brake pads worn down",
  "possible_causes": [
    {
      "cause": "Worn brake pads",
      "likelihood": "HIGH",
      "likelihood_score": 85,
      "reason": "Wear indicator touching rotor
`;
const parsedNested = parseAndCleanJson(truncatedNested);
assert.ok(parsedNested, 'Should parse truncated nested JSON');
assert.equal(parsedNested.summary, 'Front brake pads worn down');
assert.equal(parsedNested.possible_causes[0].cause, 'Worn brake pads');
assert.equal(parsedNested.possible_causes[0].reason, 'Wear indicator touching rotor');
console.log('[PASS] Test 3: Successfully repairs and parses JSON truncated inside a nested string literal');

// Test 4: Truncated mid-key or with dangling colon
const truncatedDanglingColon = `{
  "type": "diagnostic",
  "status": "diagnosis_ready",
  "summary": "Alternator failure",
  "possible_causes": [
    { "cause": "Faulty regulator", "likelihood": "HIGH" }
  ],
  "repair_guidance": {
    "difficulty": "Intermediate",
    "steps": [
      "Disconnect battery",
      "Remove serpentine belt"
    ],
    "estimated_time": `;
const parsedDangling = parseAndCleanJson(truncatedDanglingColon);
assert.ok(parsedDangling, 'Should parse JSON with dangling colon');
assert.equal(parsedDangling.summary, 'Alternator failure');
assert.equal(parsedDangling.repair_guidance.difficulty, 'Intermediate');
assert.equal(parsedDangling.repair_guidance.steps.length, 2);
console.log('[PASS] Test 4: Successfully cleans dangling keys/colons and closes open brackets');

// Test 5: Truncated with trailing comma
const truncatedTrailingComma = `{
  "type": "diagnostic",
  "status": "diagnosis_ready",
  "summary": "Low coolant level",
  "safe_diy_checks": [
    "Check expansion tank",
    "Inspect radiator cap",
  `;
const parsedComma = parseAndCleanJson(truncatedTrailingComma);
assert.ok(parsedComma, 'Should parse JSON with trailing comma in array');
assert.equal(parsedComma.summary, 'Low coolant level');
assert.equal(parsedComma.safe_diy_checks.length, 2);
console.log('[PASS] Test 5: Successfully cleans trailing commas in arrays/objects');

// Test 6: Extreme truncation where bracket structure cannot be reconstructed - regex salvage
const severelyDamaged = `{"type": "diagnostic", "summary": "Engine overheating caused by sticking thermostat", "whats_happening": "The thermostat is stuck closed preventing coolant flow", "severity": "HIGH", "possible_causes": [{"cause": "Stuck Thermostat", "likelihood": "HIGH"`;
const salvaged = parseAndCleanJson(severelyDamaged);
assert.ok(salvaged, 'Should salvage diagnostic fields');
assert.equal(salvaged.summary, 'Engine overheating caused by sticking thermostat');
assert.equal(salvaged.severity, 'HIGH');
assert.ok(salvaged.possible_causes.some(c => c.cause === 'Stuck Thermostat'));
console.log('[PASS] Test 6: Resiliently salvages diagnostic fields even when severely cut off');

// Test 7: Conversation response truncated
const truncatedConversation = `{"type": "conversation", "response": "Hello! I can definitely help you troubleshoot your vehicle issues. What seems to be the trouble?`;
const parsedConv = parseAndCleanJson(truncatedConversation);
assert.ok(parsedConv, 'Should parse truncated conversation response');
assert.equal(parsedConv.type, 'conversation');
assert.ok(parsedConv.response.includes('Hello! I can definitely help'));
console.log('[PASS] Test 7: Successfully parses truncated conversational response');

console.log('================================================================');
console.log('Response Parser Suite Results: 7/7 tests passed cleanly.');
console.log('================================================================');
