import {
  extractMaintenanceTasks,
  extractSmartRecommendations,
  getVehicleRecommendations,
  isRepairConfirmedForTask,
  isTaskCompatibleWithVehicle,
  mergeRecommendations,
  normalizeKey,
} from '../src/utils/maintenanceUtils';

describe('Diagnosis-Driven Maintenance and Smart Recommendations Suite', () => {
  const sampleMotorcycle = {
    type: 'Motorcycle',
    brand: 'Yamaha',
    model: 'Mio Aerox 155',
    year: '2023',
  };

  const sampleBicycle = {
    type: 'Bicycle',
    brand: 'Trek',
    model: 'Marlin 7',
    year: '2022',
  };

  const sampleCar = {
    type: 'Car',
    brand: 'Toyota',
    model: 'Corolla Altis',
    year: '2021',
  };

  describe('Vehicle Type Baseline Filtering & Appropriateness', () => {
    it('never suggests engine oil, spark plugs, or motor components for a bicycle', () => {
      const bikeRecs = getVehicleRecommendations(sampleBicycle);
      const allText = bikeRecs
        .map(r => `${r.title} ${r.description} ${r.category}`)
        .join(' ')
        .toLowerCase();

      expect(allText).not.toContain('engine oil');
      expect(allText).not.toContain('spark plug');
      expect(allText).not.toContain('radiator');
      expect(allText).not.toContain('transmission');
      expect(allText).toContain('chain');
      expect(allText).toContain('brake');
      expect(allText).toContain('tire');
    });

    it('correctly detects vehicle incompatible text via isTaskCompatibleWithVehicle', () => {
      expect(isTaskCompatibleWithVehicle('Change engine oil and replace oil filter', sampleBicycle)).toBe(false);
      expect(isTaskCompatibleWithVehicle('Replace spark plugs and check ignition coil', sampleBicycle)).toBe(false);
      expect(isTaskCompatibleWithVehicle('Inspect rim brake pads and adjust cable tension', sampleBicycle)).toBe(true);
      expect(isTaskCompatibleWithVehicle('Change engine oil and replace oil filter', sampleCar)).toBe(true);
      expect(isTaskCompatibleWithVehicle('Change engine oil', sampleMotorcycle)).toBe(true);
    });
  });

  describe('Scenario A: Motorcycle starting clicking sound', () => {
    const clickingDiag = {
      id: 'diag-moto-click-1',
      symptoms: ['Clicking noise when pressing electric start button'],
      problem: 'Electric starter clicking sound',
      severity: 'moderate',
      maintenance_tasks: [
        {
          title: 'Inspect battery terminals and voltage',
          service_type: 'Electrical Inspection',
          description: 'Measure resting voltage with multimeter (>= 12.6V) and tighten terminals.',
          urgency: 'Urgent',
          is_inspection: true,
        },
      ],
      smart_recommendations: [
        {
          title: 'Prevent Battery Drain During Prolonged Parking',
          problem: 'Starter relay clicking caused by low battery cranking capacity',
          preventive_action: 'Connect a motorcycle trickle charger when vehicle is parked for more than a week.',
          reason: 'Prevents lead-acid sulfation and maintains cold cranking amps.',
          warning_signs: 'Dimming headlamp on ignition, slow cranking, or clicking sound.',
          safety_precaution: 'Never jump-start a motorcycle with an automobile engine running.',
        },
      ],
      possible_causes: [
        { cause: 'Low battery voltage or corroded terminals', likelihood: 'HIGH', likelihood_score: 90 },
        { cause: 'Defective starter relay solenoid', likelihood: 'MEDIUM', likelihood_score: 65 },
      ],
    };

    it('extracts maintenance tasks as uncertain INSPECTIONS, never confirmed repairs', () => {
      const tasks = extractMaintenanceTasks([clickingDiag], [], sampleMotorcycle);
      expect(tasks.length).toBe(1);
      expect(tasks[0].isInspection).toBe(true);
      expect(tasks[0].title).toBe('Inspect battery terminals and voltage');
      expect(tasks[0].serviceType).toBe('Electrical Inspection');
      expect(tasks[0].isResolved).toBe(false);
    });

    it('extracts educational preventive smart recommendations with problem, reason, and safety boundary', () => {
      const recs = extractSmartRecommendations([clickingDiag], [], sampleMotorcycle);
      const diagRec = recs.find(r => r.id.startsWith('smart-rec-diag-moto-click-1'));

      expect(diagRec).toBeDefined();
      expect(diagRec.title).toBe('Prevent Battery Drain During Prolonged Parking');
      expect(diagRec.reason).toContain('sulfation');
      expect(diagRec.warning_signs).toContain('Dimming headlamp');
      expect(diagRec.safety_precaution).toContain('Never jump-start');
    });

    it('does not generate unrelated generic oil change as the solution for electrical clicking', () => {
      const tasks = extractMaintenanceTasks([clickingDiag], [], sampleMotorcycle);
      const titles = tasks.map(t => t.title.toLowerCase());
      expect(titles).not.toContain('change engine oil');
      expect(titles).not.toContain('engine oil replacement');
    });
  });

  describe('Scenario B: Deduplication on repeated submissions', () => {
    const diagSubmission1 = {
      id: 'diag-sub-1',
      problem: 'Motorcycle clicking on start',
      maintenance_tasks: [
        { title: 'Inspect battery terminals and voltage', service_type: 'Electrical', urgency: 'Urgent' },
      ],
    };

    const diagSubmission2 = {
      id: 'diag-sub-2',
      problem: 'Motorcycle clicking on start',
      maintenance_tasks: [
        { title: 'Inspect battery terminals and voltage', service_type: 'Electrical', urgency: 'Urgent' },
      ],
    };

    it('deduplicates equivalent unresolved inspection tasks across multiple diagnoses', () => {
      const tasks = extractMaintenanceTasks([diagSubmission1, diagSubmission2], [], sampleMotorcycle);
      expect(tasks.length).toBe(1);
      expect(tasks[0].title).toBe('Inspect battery terminals and voltage');
    });

    it('normalizes task keys consistently regardless of prefix words', () => {
      expect(normalizeKey('Inspect battery terminals')).toBe(normalizeKey('Check battery terminals'));
      expect(normalizeKey('Verify brake pads')).toBe(normalizeKey('Inspect brake pads'));
    });
  });

  describe('Scenario C: Confirmed Repair Resolution', () => {
    const brakeDiag = {
      id: 'diag-brake-101',
      problem: 'Squeaking front brakes',
      maintenance_tasks: [
        { title: 'Inspect front brake pads and rotors', service_type: 'Brake Service', urgency: 'Urgent' },
      ],
    };

    it('identifies confirmed repair by direct diagnostic_id match and resolves task', () => {
      const confirmedRepairs = [
        {
          id: 55,
          diagnostic_id: 'diag-brake-101',
          title: 'Replaced Front Brake Pads',
          status: 'completed',
          performed_at: '2026-10-14T10:00:00Z',
        },
      ];

      const tasks = extractMaintenanceTasks([brakeDiag], confirmedRepairs, sampleCar);
      expect(tasks.length).toBe(1);
      expect(tasks[0].isResolved).toBe(true);
      expect(tasks[0].resolvedBy).toBe('Replaced Front Brake Pads');
    });

    it('identifies confirmed repair by component keyword match when diagnostic_id is unlinked', () => {
      const confirmedRepairs = [
        {
          id: 56,
          title: 'Installed new ceramic brake pads',
          status: 'completed',
          performed_at: '2026-10-14T11:00:00Z',
        },
      ];

      const match = isRepairConfirmedForTask({ title: 'Inspect front brake pads', diagnosisId: 'other-id' }, confirmedRepairs);
      expect(match).not.toBeNull();
      expect(match.title).toBe('Installed new ceramic brake pads');
    });

    it('ignores in-progress or pending repairs until confirmed completed', () => {
      const pendingRepairs = [
        {
          id: 57,
          diagnostic_id: 'diag-brake-101',
          title: 'Ordered Brake Pads',
          status: 'in_progress',
        },
      ];

      const tasks = extractMaintenanceTasks([brakeDiag], pendingRepairs, sampleCar);
      expect(tasks[0].isResolved).toBe(false);
    });
  });

  describe('Scenario D: Bicycle Braking and Drivetrain', () => {
    const bicycleDiag = {
      id: 'diag-bike-1',
      problem: 'Bicycle chain slipping and squeaking brakes',
      maintenance_tasks: [
        { title: 'Inspect rim brake pad wear and cable tension', service_type: 'Brakes', urgency: 'Urgent' },
        { title: 'Inspect bicycle chain stretch and derailleur alignment', service_type: 'Drivetrain', urgency: 'Routine' },
        // Malformed or AI hallucination of motor part
        { title: 'Check engine oil level', service_type: 'Engine', urgency: 'Routine' },
      ],
      smart_recommendations: [
        {
          title: 'Bicycle Chain Lubrication and Cleaning Routine',
          problem: 'Chain squeak and gear skipping',
          preventive_action: 'Degrease and apply wet or dry bicycle chain lube every 150km.',
          reason: 'Prevents cassette and chainring wear from grit grinding.',
          warning_signs: 'Stiff chain links or chain suck when pedaling backwards.',
          safety_precaution: 'Ensure chain lube does not touch disc rotors or rim brake tracks.',
        },
        // Incompatible AI recommendation
        {
          title: 'Check Motor Oil Filter',
          problem: 'Engine lubrication',
          preventive_action: 'Replace oil filter.',
          reason: 'Engine health.',
        },
      ],
    };

    it('filters out hallucinated motor engine tasks on bicycles while retaining bicycle systems', () => {
      const tasks = extractMaintenanceTasks([bicycleDiag], [], sampleBicycle);
      const titles = tasks.map(t => t.title.toLowerCase());

      expect(titles).toContain('inspect rim brake pad wear and cable tension');
      expect(titles).toContain('inspect bicycle chain stretch and derailleur alignment');
      expect(titles).not.toContain('check engine oil level');
    });

    it('filters out hallucinated motor engine recommendations on bicycles while retaining bicycle recommendations', () => {
      const recs = extractSmartRecommendations([bicycleDiag], [], sampleBicycle);
      const titles = recs.map(r => r.title.toLowerCase());

      expect(titles).toContain('bicycle chain lubrication and cleaning routine');
      expect(titles).not.toContain('check motor oil filter');
    });
  });
});
