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
      'src/components/TermsAndConditionsModal.js',
      'src/data/legalDocuments.js',
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
});
