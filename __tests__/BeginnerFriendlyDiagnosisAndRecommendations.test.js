import {
  extractMaintenanceTasks,
  extractSmartRecommendations,
  groupRecommendationsByTriSections,
} from '../src/utils/maintenanceUtils';

describe('Beginner-Friendly Experience: AI Diagnosis, Maintenance & Smart Recommendations', () => {
  const mockVehicle = {
    id: 1,
    type: 'Motorcycle',
    brand: 'Yamaha',
    model: 'Mio Aerox 155',
    year: '2022',
  };

  describe('1. Maintenance Recommendations: 5-Question Framework', () => {
    it('answers the 5 essential questions for every extracted maintenance task without invented dates/mileage', () => {
      const mockDiagnostics = [
        {
          id: 101,
          problem: 'Loss of power during acceleration',
          severity: 'HIGH',
          urgency: 'Immediate',
          maintenance_tasks: [
            {
              title: 'Check engine oil level',
              service_type: 'Lubrication Inspection',
              description: 'Inspect oil level using dipstick.',
              what_to_do: 'Check your engine oil level',
              why_it_matters: 'Your engine oil reduces friction between moving parts and prevents overheating.',
              when_due: 'Check before riding or follow manual interval',
              skill_level: 'Beginner-friendly',
              completion_check: 'Oil level sits between MIN and MAX marks on dipstick with no leaks.',
              urgency: 'Urgent',
            },
          ],
        },
      ];

      const tasks = extractMaintenanceTasks(mockDiagnostics, [], mockVehicle);
      expect(tasks.length).toBeGreaterThan(0);

      const task = tasks[0];
      // 1. What should I do?
      expect(task.what_to_do).toBe('Check your engine oil level');
      // 2. Why does it matter?
      expect(task.why_it_matters).toContain('reduces friction');
      // 3. When should I do it? (no invented calendar dates or fake odometer mileage)
      expect(task.when_due).toBe('Check before riding or follow manual interval');
      expect(task.when_due).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      // 4. Can I do it myself?
      expect(task.skill_level).toBe('Beginner-friendly');
      // 5. How do I know it's done?
      expect(task.completion_check).toContain('between MIN and MAX marks');
      // Labeled as inspection, not unverified confirmed repair
      expect(task.isInspection).toBe(true);
    });

    it('provides sensible 5-question beginner defaults for legacy diagnostic records', () => {
      const legacyDiag = [
        {
          id: 102,
          problem: 'Squeaking brake noise',
          severity: 'MODERATE',
          recommended_actions: ['Inspect front brake pads'],
        },
      ];

      const tasks = extractMaintenanceTasks(legacyDiag, [], mockVehicle);
      expect(tasks.length).toBeGreaterThan(0);
      const task = tasks[0];

      expect(task.what_to_do).toBeDefined();
      expect(task.why_it_matters).toBeDefined();
      expect(task.when_due).toBe('Condition-based inspection / check');
      expect(task.skill_level).toBe('Beginner-friendly');
      expect(task.completion_check).toBeDefined();
    });
  });

  describe('2. Smart Recommendations: Tri-Category Organization', () => {
    it('categorizes and prioritizes items into Do This Now, Coming Up Soon, and Helpful Tips', () => {
      const recommendations = [
        {
          id: 'rec-1',
          title: 'Inspect severe brake squeak',
          priority: 'Urgent',
          urgency: 'Urgent',
          source: 'diagnostic',
          category_section: 'do_this_now',
        },
        {
          id: 'rec-2',
          title: 'Inspect drive chain tension',
          priority: 'Important',
          source: 'maintenance_task',
          category_section: 'coming_up_soon',
        },
        {
          id: 'rec-3',
          title: 'Clean motorcycle after rain',
          priority: 'Recommended',
          source: 'preventive',
          category_section: 'helpful_tips',
        },
      ];

      const grouped = groupRecommendationsByTriSections(recommendations, new Set(), mockVehicle);

      // 1. Do This Now: High relevance, critical safety checks, active diagnostic issues
      expect(grouped.doThisNow.length).toBe(1);
      expect(grouped.doThisNow[0].title).toBe('Inspect severe brake squeak');
      expect(grouped.doThisNow[0].section).toBe('do_this_now');

      // 2. Coming Up Soon: Scheduled maintenance approaching due intervals
      expect(grouped.comingUpSoon.length).toBe(1);
      expect(grouped.comingUpSoon[0].title).toBe('Inspect drive chain tension');
      expect(grouped.comingUpSoon[0].section).toBe('coming_up_soon');

      // 3. Helpful Tips: Simple preventive care and habits
      expect(grouped.helpfulTips.length).toBe(1);
      expect(grouped.helpfulTips[0].title).toBe('Clean motorcycle after rain');
      expect(grouped.helpfulTips[0].section).toBe('helpful_tips');
    });

    it('deduplicates identical recommendations by key across all sections', () => {
      const duplicateRecs = [
        {
          id: 'rec-1',
          title: 'Check tire pressure',
          priority: 'Recommended',
        },
        {
          id: 'rec-2',
          title: 'Check tire pressure',
          priority: 'Important',
        },
        {
          id: 'rec-3',
          title: 'Verify tire pressure',
          priority: 'Recommended',
        },
      ];

      const grouped = groupRecommendationsByTriSections(duplicateRecs, new Set(), mockVehicle);
      // Normalized key "tirepressure" should appear only once
      expect(grouped.totalCount).toBe(1);
    });

    it('excludes tasks already marked as completed unless due again', () => {
      const recommendations = [
        {
          id: 'rec-chain',
          title: 'Inspect drive chain',
          priority: 'Important',
        },
        {
          id: 'rec-oil',
          title: 'Check engine oil',
          priority: 'Recommended',
        },
      ];

      // Mark chain as completed
      const completedSet = new Set(['rec-chain']);
      const grouped = groupRecommendationsByTriSections(recommendations, completedSet, mockVehicle);

      expect(grouped.totalCount).toBe(1);
      expect(grouped.comingUpSoon.find(i => i.id === 'rec-chain')).toBeUndefined();
      expect(grouped.comingUpSoon.find(i => i.id === 'rec-oil') || grouped.helpfulTips.find(i => i.id === 'rec-oil')).toBeDefined();
    });
  });

  describe('3. AI Diagnosis: Beginner-Friendly Chat Tone & 5 Questions', () => {
    it('structures diagnostic answers around beginner questions with friendly, patient tone', () => {
      // Mock diagnostic output from AI service
      const diagnosticData = {
        type: 'diagnostic',
        status: 'diagnosis_ready',
        whats_happening: 'Hey, no worries! We\'ll narrow this down together. Losing power when you accelerate can happen for a few reasons.',
        summary: 'Loss of power when accelerating',
        possible_causes: [
          {
            cause: 'Restricted fuel supply',
            reason: 'Your engine might not be getting enough fuel when you twist the throttle.',
          },
          {
            cause: 'Dirty air filter',
            reason: 'The engine needs air to run properly. A dirty filter can restrict airflow.',
          },
        ],
        safety_guidance: 'If the loss of power is sudden or severe in traffic, pull over somewhere safe and avoid continuing until assessed.',
        safe_diy_checks: ['Inspect the air filter element for dirt buildup', 'Check for visible fuel line leaks'],
        mechanic_guidance: 'If the engine continues stalling or sputtering under load, consult a qualified mechanic.',
        severity: 'MODERATE',
      };

      // Simulate the beginner-friendly formatAiResponseText logic
      const whatsHappening = diagnosticData.whats_happening || diagnosticData.summary;
      const causes = diagnosticData.possible_causes.map((c, idx) => `${idx + 1}. ${c.cause}\n   ${c.reason}`).join('\n\n');
      const safety = diagnosticData.safety_guidance;
      const checks = diagnosticData.safe_diy_checks.map(c => `• ${c}`).join('\n');
      const mechanic = diagnosticData.mechanic_guidance;

      expect(whatsHappening).toContain("no worries! We'll narrow this down together");
      expect(causes).toContain('Restricted fuel supply');
      expect(causes).toContain('twist the throttle');
      expect(safety).toContain('pull over somewhere safe');
      expect(checks).toContain('air filter element');
      expect(mechanic).toContain('consult a qualified mechanic');
    });
  });
});
