import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ensureRecommendationGuide } from '../src/utils/maintenanceUtils';
import MaintenanceGuideScreen from '../src/screens/MaintenanceGuideScreen';

const mockVehicle = {
  id: 1,
  type: 'Motorcycle',
  brand: 'Yamaha',
  model: 'Mio Aerox',
  year: '2022',
};

const mockMarkAsDone = jest.fn().mockResolvedValue(true);
const mockIsRecommendationCompleted = jest.fn().mockReturnValue(false);

jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#0D0D0D',
      surface: '#171717',
      surfaceAlt: '#212121',
      border: '#2E2E2E',
      text: '#F5F5F5',
      textSecondary: '#8E8E93',
      accent: '#F63B05',
      accentSoft: 'rgba(246, 59, 5, 0.12)',
      success: '#32D583',
    },
  }),
}));

jest.mock('../src/context/VehicleContext', () => ({
  useVehicle: () => ({
    activeVehicle: mockVehicle,
    pendingVehicle: mockVehicle,
  }),
}));

jest.mock('../src/hooks/useMaintenanceRecommendations', () => () => ({
  markAsDone: mockMarkAsDone,
  isRecommendationCompleted: mockIsRecommendationCompleted,
}));

describe('MaintenanceGuide and Smart Recommendations Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureRecommendationGuide utility', () => {
    it('creates a step-by-step guide with diagnostic troubleshooting steps when provided', () => {
      const itemWithDiag = {
        title: 'Fix Battery Drain',
        source: 'diagnostic',
        diagnosticRecord: {
          troubleshooting_steps: [
            'Inspect battery terminal screws for looseness',
            'Measure resting voltage with a multimeter',
            'Check for parasitic draw from accessories',
          ],
        },
      };

      const guide = ensureRecommendationGuide(itemWithDiag, mockVehicle);
      expect(guide).toBeDefined();
      expect(guide.steps).toHaveLength(3);
      expect(guide.steps[0].instructions).toContain('Inspect battery terminal screws');
      expect(guide.steps[1].instructions).toContain('Measure resting voltage');
      expect(guide.completionCheck).toBeDefined();
    });

    it('creates domain-specific guide for brake inspection when no custom steps provided', () => {
      const itemBrakes = {
        title: 'Inspect Brake Pads',
        relatedProblem: 'Grinding sound when slowing down',
      };

      const guide = ensureRecommendationGuide(itemBrakes, mockVehicle);
      expect(guide).toBeDefined();
      expect(guide.steps.length).toBeGreaterThanOrEqual(4);
      expect(guide.tools).toContain('Flashlight');
    });
  });

  describe('MaintenanceGuideScreen Component', () => {
    it('renders diagnostic finding details and step 1 with checkbox requirement', () => {
      const mockItem = {
        title: 'Inspect Battery Terminal Clamps',
        source: 'diagnostic',
        relatedProblem: 'Engine click on starting',
        diagnosticRecord: {
          severity: 'high',
          summary: 'Loose terminal posts prevent starter motor from cranking.',
          possible_causes: ['Loose terminal bolt', 'Corrosion buildup'],
          symptoms: ['Repeated clicking sound'],
        },
      };

      const mockNav = {
        navigate: jest.fn(),
        goBack: jest.fn(),
      };

      let component;
      act(() => {
        component = renderer.create(
          <MaintenanceGuideScreen
            route={{ params: { item: mockItem } }}
            navigation={mockNav}
          />,
        );
      });

      const root = component.root;
      // Header check
      const titles = root.findAllByProps({ children: 'Inspect Battery Terminal Clamps' });
      expect(titles.length).toBeGreaterThanOrEqual(1);
      // Diagnostic finding banner check
      expect(root.findByProps({ children: 'DIAGNOSTIC FINDING & CAUSES' })).toBeDefined();
      expect(root.findByProps({ children: 'Engine click on starting' })).toBeDefined();
      // Step 1 check
      expect(root.findByProps({ children: 'STEP 1 OF 5' })).toBeDefined();

      // Checkbox helper notice should be displayed when step 1 is not yet checked
      const notice = root.findAllByProps({
        children: 'Please check the box above to confirm this step before proceeding.',
      });
      expect(notice.length).toBeGreaterThanOrEqual(1);
    });

    it('enforces checkbox before allowing next step navigation', () => {
      const mockItem = {
        title: 'Tire Pressure Inspection',
        guide: {
          steps: [
            { number: 1, title: 'Step 1', instructions: 'Check PSI' },
            { number: 2, title: 'Step 2', instructions: 'Inflate tire' },
          ],
        },
      };

      const mockNav = { navigate: jest.fn(), goBack: jest.fn() };

      let component;
      act(() => {
        component = renderer.create(
          <MaintenanceGuideScreen
            route={{ params: { item: mockItem } }}
            navigation={mockNav}
          />,
        );
      });

      const root = component.root;

      // Find the Next Step text node and its parent touchable
      const nextText = root.findAllByType('Text').find(n => n.props && n.props.children === 'Next Step');
      expect(nextText).toBeDefined();
      let nextBtn = nextText.parent;
      while (nextBtn && (!nextBtn.props || nextBtn.props.disabled === undefined)) {
        nextBtn = nextBtn.parent;
      }

      // Initially nextBtn is disabled because step 1 checkbox is not completed
      expect(nextBtn.props.disabled).toBe(true);

      // Find checkbox button and tap it to complete step 1
      const checkBtn = root.findByProps({ accessibilityLabel: 'Toggle step completion' });
      expect(checkBtn).toBeDefined();

      act(() => {
        checkBtn.props.onPress();
      });

      // Now nextBtn is enabled
      expect(nextBtn.props.disabled).toBe(false);

      // Tap Next Step to advance to step 2 (final step)
      act(() => {
        nextBtn.props.onPress();
      });

      // Now on step 2 of 2
      expect(root.findByProps({ children: 'STEP 2 OF 2' })).toBeDefined();
    });

    it('automatically logs maintenance and displays completion state upon final verification resolution', async () => {
      const mockItem = {
        id: 'test-rec-1',
        title: 'Chain Lubrication',
        guide: {
          steps: [{ number: 1, title: 'Step 1', instructions: 'Lube chain' }],
          completionCheck: {
            title: 'Verify Smooth Drivetrain',
            instructions: 'Spin rear wheel and verify smooth chain travel.',
          },
          outcomes: {
            success: 'Chain operates smoothly without noise.',
            failure: 'Chain still squeaks.',
          },
        },
      };

      const mockNav = { navigate: jest.fn(), goBack: jest.fn() };

      let component;
      act(() => {
        component = renderer.create(
          <MaintenanceGuideScreen
            route={{ params: { item: mockItem } }}
            navigation={mockNav}
          />,
        );
      });

      const root = component.root;

      // Find "Yes, issue resolved" text and parent touchable
      const yesText = root.findAllByType('Text').find(n => n.props && n.props.children === 'Yes, issue resolved');
      expect(yesText).toBeDefined();
      let yesBtn = yesText.parent;
      while (yesBtn && (!yesBtn.props || !yesBtn.props.onPress)) {
        yesBtn = yesBtn.parent;
      }

      await act(async () => {
        await yesBtn.props.onPress();
      });

      // markAsDone should be invoked
      expect(mockMarkAsDone).toHaveBeenCalledWith(mockItem);

      // Celebration banner should be rendered
      expect(root.findByProps({ children: 'Maintenance Verified & Completed!' })).toBeDefined();
      expect(root.findByProps({ children: 'Back to Maintenance' })).toBeDefined();
    });
  });
});
