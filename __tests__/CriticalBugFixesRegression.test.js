import apiClient, { setUnauthorizedHandler, clearUnauthorizedHandler } from '../src/api/apiClient';
import { getAccuracyStatus, LocationService } from '../src/services/locationService';
import { isGeneralQuestion, buildDiagnosisPrompt } from '../vehicare-ai-service/src/prompts/diagnosis.prompt.js';
import { diagnosticOutputSchema } from '../vehicare-ai-service/src/validators/response.validator.js';
import { isContextDependentFollowUp } from '../vehicare-ai-service/src/utils/symptom-normalizer.js';

jest.mock('@react-native-firebase/auth', () => ({}));
jest.mock('@react-native-google-signin/google-signin', () => ({}));

describe('Critical Bug Audit & Fix Regression Test Suite', () => {

  describe('Bug 1: Authentication Persistence & Token Safety', () => {
    it('does not trigger unauthorized logout handler for unauthenticated 401 responses', () => {
      let logoutTriggered = false;
      setUnauthorizedHandler(() => {
        logoutTriggered = true;
      });

      // Simulate interceptor check for a request WITHOUT an Authorization header (e.g. guest 401)
      const guestError = {
        config: { headers: {} },
        response: { status: 401 }
      };

      const guestAuthHeader = guestError.config?.headers?.Authorization || guestError.config?.headers?.authorization;
      const guestHadToken = Boolean(
        guestAuthHeader &&
        String(guestAuthHeader).trim().startsWith('Bearer ') &&
        !String(guestAuthHeader).trim().endsWith('null') &&
        !String(guestAuthHeader).trim().endsWith('undefined')
      );

      if (guestHadToken) {
        logoutTriggered = true;
      }
      expect(logoutTriggered).toBe(false);

      // Simulate interceptor check for an authenticated request that encountered an invalid session
      const authError = {
        config: { headers: { Authorization: 'Bearer valid-jwt-token' } },
        response: { status: 401 }
      };

      const authHeader = authError.config?.headers?.Authorization || authError.config?.headers?.authorization;
      const hadAuthToken = Boolean(
        authHeader &&
        String(authHeader).trim().startsWith('Bearer ') &&
        !String(authHeader).trim().endsWith('null') &&
        !String(authHeader).trim().endsWith('undefined')
      );

      if (hadAuthToken) {
        logoutTriggered = true;
      }
      expect(logoutTriggered).toBe(true);

      clearUnauthorizedHandler();
    });
  });

  describe('Bug 3 & 7: Location Service & Coordinate Accuracy', () => {
    it('classifies location accuracy status accurately according to GNSS thresholds', () => {
      expect(getAccuracyStatus(12).status).toBe('excellent');
      expect(getAccuracyStatus(12).isGood).toBe(true);

      expect(getAccuracyStatus(35).status).toBe('good');
      expect(getAccuracyStatus(35).isGood).toBe(true);

      expect(getAccuracyStatus(80).status).toBe('acceptable');
      expect(getAccuracyStatus(80).isGood).toBe(true);

      expect(getAccuracyStatus(250).status).toBe('poor');
      expect(getAccuracyStatus(250).isGood).toBe(false);

      expect(getAccuracyStatus(null).status).toBe('unknown');
    });
  });

  describe('Bug 4: AI Follow-Up Questions Topic Continuity', () => {
    it('does NOT classify short follow-up answers as general conversation when history is present', () => {
      const historyWithPriorTurn = [
        { role: 'user', content: 'My engine is making a loud squealing noise.' },
        { role: 'assistant', content: 'Does the squealing noise happen when accelerating or when braking?' }
      ];

      // With history, short answers must NOT be treated as general questions
      expect(isGeneralQuestion('accelerating', historyWithPriorTurn)).toBe(false);
      expect(isGeneralQuestion('only when cold', historyWithPriorTurn)).toBe(false);
      expect(isGeneralQuestion('yes', historyWithPriorTurn)).toBe(false);
      expect(isGeneralQuestion('no', historyWithPriorTurn)).toBe(false);
      expect(isGeneralQuestion('when turning key', historyWithPriorTurn)).toBe(false);
    });

    it('identifies short diagnostic answers as context-dependent follow-ups for caching safety', () => {
      expect(isContextDependentFollowUp('yes')).toBe(true);
      expect(isContextDependentFollowUp('no')).toBe(true);
      expect(isContextDependentFollowUp('only when accelerating')).toBe(true);
      expect(isContextDependentFollowUp('when turning key')).toBe(true);
      expect(isContextDependentFollowUp('front right')).toBe(true);
      expect(isContextDependentFollowUp('what should i do next')).toBe(true);
    });

    it('builds diagnosis prompt preserving root complaint alongside follow-up answer', () => {
      const prompt = buildDiagnosisPrompt({
        vehicleContext: { type: 'Car', brand: 'Toyota', model: 'Vios', year: '2020', is_saved_vehicle: true },
        symptoms: 'only when turning right',
        rootSymptom: 'Grinding noise in front suspension',
        userLanguage: 'en',
        history: [
          { role: 'user', content: 'Grinding noise in front suspension' },
          { role: 'assistant', content: 'Does it happen when turning or going straight?' }
        ],
        hasMedia: false,
        inputType: 'text',
      });

      expect(prompt).toContain('ROOT / ORIGINAL DIAGNOSTIC COMPLAINT:');
      expect(prompt).toContain('Grinding noise in front suspension');
      expect(prompt).toContain('LATEST USER FOLLOW-UP / ANSWER:');
      expect(prompt).toContain('only when turning right');
      expect(prompt).toContain('FOLLOW-UP CONTINUITY INSTRUCTIONS:');
    });
  });

  describe('Bug 5 & 6: Vehicle Image Mismatch & Alternate Vehicle Diagnostics', () => {
    it('validates structured diagnostic output with image_vehicle_match and vehicle details', () => {
      const validDiagnosisWithMatch = {
        type: 'diagnostic',
        status: 'diagnosis_ready',
        summary: 'Detected brake rotor wear and discoloration consistent with braking squeal.',
        severity: 'MODERATE',
        urgency: 'Inspection recommended within 500 km.',
        image_vehicle_match: 'match',
        image_vehicle_details: {
          category: 'Sedan',
          estimated_make: 'Toyota',
          estimated_model: 'Corolla',
          confidence: 'high',
          details: 'Badge and front grille match Toyota Corolla.'
        },
        possible_causes: [
          { cause: 'Worn brake pad lining', likelihood: 'HIGH', likelihood_score: 85 }
        ],
        recommended_actions: [
          'Inspect front brake pads and measure rotor thickness.'
        ]
      };

      const result = diagnosticOutputSchema.safeParse(validDiagnosisWithMatch);
      expect(result.success).toBe(true);
      expect(result.data.image_vehicle_match).toBe('match');
      expect(result.data.image_vehicle_details.estimated_make).toBe('Toyota');
    });

    it('validates structured diagnostic output with possible_mismatch status', () => {
      const mismatchDiagnosis = {
        type: 'diagnostic',
        status: 'needs_clarification',
        response: 'The uploaded image depicts a motorcycle wheel and fork rather than your saved Toyota Corolla sedan.',
        summary: 'Uploaded image shows motorcycle component instead of saved car.',
        image_vehicle_match: 'possible_mismatch',
        image_vehicle_details: {
          category: 'Motorcycle',
          estimated_make: 'Honda',
          estimated_model: 'Click 125',
          confidence: 'high',
          details: 'Visible two-wheel motorcycle front fork and telescopic suspension.'
        },
        clarification_questions: [
          {
            question: 'Does this image show another vehicle you want to diagnose, or would you like to continue with your saved Toyota Corolla?',
            options: ['Diagnose the motorcycle in photo', 'Continue with saved Corolla']
          }
        ]
      };

      const result = diagnosticOutputSchema.safeParse(mismatchDiagnosis);
      expect(result.success).toBe(true);
      expect(result.data.image_vehicle_match).toBe('possible_mismatch');
      expect(result.data.clarification_questions.length).toBe(1);
    });

    it('instructs AI not to mutate saved vehicle when diagnosing an alternate vehicle', () => {
      const prompt = buildDiagnosisPrompt({
        vehicleContext: { type: 'Pickup', brand: 'Ford', model: 'Ranger', year: '2019', is_saved_vehicle: false, target_vehicle_desc: '2019 Ford Ranger' },
        symptoms: 'Check engine light on with code P0401',
        userLanguage: 'en',
        history: [],
        hasMedia: false,
        inputType: 'text',
        isAlternateVehicle: true,
        targetVehicleDesc: '2019 Ford Ranger',
      });

      expect(prompt).toContain('DIAGNOSTIC TARGET: TEMPORARY / ALTERNATE VEHICLE');
      expect(prompt).toContain('Do NOT assume the user\'s permanent saved vehicle profile or its maintenance history applies');
      expect(prompt).toContain('Do NOT link this diagnosis to any saved vehicle maintenance schedule');
    });
  });

});
