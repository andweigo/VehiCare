const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

describe('VehiCare Panel Feedback Enhancements Verification', () => {
  describe('Babel Compilation of Modified Mobile Screens & Hooks', () => {
    const modifiedFiles = [
      'src/screens/DashboardScreen.js',
      'src/screens/ManagePlanScreen.js',
      'src/screens/VehicleDetailsScreen.js',
      'src/components/VehicleDetailsSteps.js',
      'src/hooks/useVehicleDetails.js',
      'src/hooks/useCustomVehicleModal.js',
      'src/components/CustomVehicleModal.js',
      'src/screens/VehicleCorrectionRequestScreen.js',
      'src/screens/AskVehiCareScreen.js',
      'src/screens/MaintenanceScreen.js',
      'src/screens/MaintenanceGuideScreen.js',
      'src/screens/SmartRecommendationsScreen.js',
      'src/components/TermsAndConditionsModal.js',
      'src/data/legalDocuments.js',
      'src/components/VehicleHealthSpeedometer.js',
      'src/hooks/useMaintenanceRecommendations.js',
      'src/hooks/useVehicleHealth.js',
      'src/screens/VehicleHealthScreen.js',
      'src/components/VehicleHealthCard.js',
      'src/utils/maintenanceUtils.js',
    ];

    test.each(modifiedFiles)('%s compiles without syntax errors', relativePath => {
      const fullPath = path.resolve(__dirname, '..', relativePath);
      const code = fs.readFileSync(fullPath, 'utf8');
      const transformed = babel.transformSync(code, {
        filename: fullPath,
        configFile: path.resolve(__dirname, '..', 'babel.config.js'),
      });
      expect(transformed).toBeTruthy();
      expect(typeof transformed.code).toBe('string');
      expect(transformed.code.length).toBeGreaterThan(0);
    });
  });

  describe('VIN Terminology & Validation Verification', () => {
    it('replaces "Vehicle Model Number" with "Vehicle Identification Number (VIN)" in VehicleDetailsSteps.js', () => {
      const code = fs.readFileSync(
        path.resolve(__dirname, '..', 'src/components/VehicleDetailsSteps.js'),
        'utf8',
      );
      expect(code).toContain('Vehicle Identification Number (VIN)');
      expect(code).not.toContain('Enter your vehicle model number');
    });

    it('enforces 17-character ISO 3779 VIN validation (excluding I, O, Q) for non-bicycles in useVehicleDetails.js', () => {
      const code = fs.readFileSync(
        path.resolve(__dirname, '..', 'src/hooks/useVehicleDetails.js'),
        'utf8',
      );
      expect(code).toContain('/^[A-HJ-NPR-Z0-9]{17}$/');
      expect(code).toContain('!isBicycle');
    });
  });

  describe('Premium Custom Vehicle Suggestion Verification', () => {
    it('supports prefilled custom vehicle modal opening and Free plan upgrade prompt in VehicleDetailsSteps.js', () => {
      const code = fs.readFileSync(
        path.resolve(__dirname, '..', 'src/components/VehicleDetailsSteps.js'),
        'utf8',
      );
      expect(code).toContain('as a custom vehicle');
      expect(code).toContain('Adding an additional custom vehicle requires Premium. Upgrade Plan');
    });
  });

  describe('Maintenance Creation Button & Direct Navigation Verification', () => {
    it('renders "View Maintenance" button after backend confirmation in AskVehiCareScreen.js and focuses record in MaintenanceScreen.js', () => {
      const askCode = fs.readFileSync(
        path.resolve(__dirname, '..', 'src/screens/AskVehiCareScreen.js'),
        'utf8',
      );
      const maintCode = fs.readFileSync(
        path.resolve(__dirname, '..', 'src/screens/MaintenanceScreen.js'),
        'utf8',
      );
      expect(askCode).toContain('View Maintenance');
      expect(askCode).toContain('handleNavigateToMaintenanceRecord');
      expect(maintCode).toContain('focusRecordId');
      expect(maintCode).toContain('createdRecord');
    });
  });

  describe('Real-Time Subscription Synchronization Verification', () => {
    it('includes automatic polling fallback, AppState foreground listener, and Pending Verification messaging in ManagePlanScreen.js', () => {
      const planCode = fs.readFileSync(
        path.resolve(__dirname, '..', 'src/screens/ManagePlanScreen.js'),
        'utf8',
      );
      expect(planCode).toContain('AppState.addEventListener');
      expect(planCode).toContain("restrictionState === 'pending_verification'");
      expect(planCode).toContain('Payment Submitted — Pending Verification');
    });
  });

  describe('Conversational Vehicle Addition Modal Verification', () => {
    it('displays CustomModal on successful vehicle addition and does not reference undefined setFeedbackNotice in AskVehiCareScreen.js', () => {
      const askCode = fs.readFileSync(
        path.resolve(__dirname, '..', 'src/screens/AskVehiCareScreen.js'),
        'utf8',
      );
      expect(askCode).not.toContain('setFeedbackNotice');
      expect(askCode).toContain('Vehicle Added Successfully');
      expect(askCode).toContain('actionResultModal');
      expect(askCode).toContain('<CustomModal');
    });
  });

  describe('Dynamic Vehicle Health & Progressive Color Scaling Verification', () => {
    it('strictly scopes vehicle health state per activeVehicleId and uses progressive score-based colors in VehicleHealthSpeedometer.js', () => {
      const speedometerCode = fs.readFileSync(
        path.resolve(__dirname, '..', 'src/components/VehicleHealthSpeedometer.js'),
        'utf8',
      );
      const maintHookCode = fs.readFileSync(
        path.resolve(__dirname, '..', 'src/hooks/useMaintenanceRecommendations.js'),
        'utf8',
      );
      const { getHealthBarColor } = require('../src/utils/maintenanceUtils');

      // Speedometer uses scorePalette driven by score so ATTENTION badge does not lock the color
      expect(speedometerCode).toContain('scorePalette');
      expect(speedometerCode).toContain('color: scorePalette.color');

      // Hook strictly isolates vehicles via loadedVehicleId & vehicleDataMemoryCache
      expect(maintHookCode).toContain('vehicleDataMemoryCache');
      expect(maintHookCode).toContain('loadedVehicleId === activeVehicleId');
      expect(maintHookCode).toContain('itemVid !== null && String(itemVid) === String(activeVehicleId)');

      // Progressive health colors: higher health = better color
      expect(getHealthBarColor(95)).toBe('#10B981');
      expect(getHealthBarColor(85)).toBe('#32D583');
      expect(getHealthBarColor(75)).toBe('#84CC16');
      expect(getHealthBarColor(65)).toBe('#F5B942');
      expect(getHealthBarColor(50)).toBe('#FF7337');
      expect(getHealthBarColor(30)).toBe('#EF4444');
    });
  });

  describe('Maintenance Guide Completion Sync, Final Verification & AI Step Clarification Verification', () => {
    it('collapses Step Clarification by default, removes quick question setup, connects to AI usage, and handles Final Verification & system-wide completion sync', () => {
      const guideCode = fs.readFileSync(
        path.resolve(__dirname, '..', 'src/screens/MaintenanceGuideScreen.js'),
        'utf8',
      );
      const maintHookCode = fs.readFileSync(
        path.resolve(__dirname, '..', 'src/hooks/useMaintenanceRecommendations.js'),
        'utf8',
      );
      const maintScreenCode = fs.readFileSync(
        path.resolve(__dirname, '..', 'src/screens/MaintenanceScreen.js'),
        'utf8',
      );

      // 1. Quick question setup, top step pill buttons, and cramped AI POWERED badge removed
      expect(guideCode).not.toContain('QUICK_CLARIFICATION_OPTIONS');
      expect(guideCode).not.toContain('QUICK QUESTIONS FOR STEP');
      expect(guideCode).not.toContain('HORIZONTAL STEP PILLS CAROUSEL');
      expect(guideCode).not.toContain('>AI POWERED<');

      // 2. Step Clarification is collapsed by default and strictly scoped to the current/given steps
      expect(guideCode).toContain('const [isClarificationOpen, setIsClarificationOpen] = useState(false);');
      expect(guideCode).toContain('testID="step-clarification-toggle"');
      expect(guideCode).toContain('isStepFocusedQuery');
      expect(guideCode).toContain('This assistant only clarifies Step');

      // 3. Step Clarification taps into real AI and reflects in AI usage
      expect(guideCode).toContain('useAIUsage');
      expect(guideCode).toContain('recordConsultationOptimistic');
      expect(guideCode).toContain('refreshUsage');
      expect(guideCode).toContain('vehicleApi.submitDiagnostic(payload)');

      // 4. Final Verification button performs an action
      expect(guideCode).toContain('handleFinalVerificationPress');
      expect(guideCode).toContain("testID={isLastStep ? 'final-verification-btn' : 'next-step-btn'}");

      // 5. Marked as Complete reflects across the system
      expect(maintHookCode).toContain('effectiveMaintenanceRecords.forEach');
      expect(maintScreenCode).toContain('isRecommendationCompleted(item)');

      // 6. Dashboard "How can we help?" replaces redundant Vehicle health card with Manage plan
      const dashboardCode = fs.readFileSync(
        path.resolve(__dirname, '..', 'src/screens/DashboardScreen.js'),
        'utf8',
      );
      expect(dashboardCode).toContain("title: 'Manage plan'");
      expect(dashboardCode).toContain("description: 'Plan & subscription'");
      expect(dashboardCode).toContain("title: 'Smart tips'");
      expect(dashboardCode).not.toContain("title: 'Vehicle health'");
    });
  });
});
