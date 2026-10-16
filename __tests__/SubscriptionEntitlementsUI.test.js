import React from 'react';
import renderer, { act } from 'react-test-renderer';
import DiagnosticResultModal from '../src/components/DiagnosticResultModal';
import SubscriptionManagementCard from '../src/components/SubscriptionManagementCard';

jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      background: '#0D0D0D',
      surface: '#151515',
      surfaceAlt: '#1C1C1E',
      border: '#292929',
      accent: '#F5501C',
      accentSoft: '#F5501C20',
      text: '#FFFFFF',
      textSecondary: '#8E8E93',
      modalOverlay: 'rgba(0,0,0,0.7)',
    },
  }),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

describe('Subscription Entitlements UI Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DiagnosticResultModal: Free vs Premium', () => {
    const freeDiagnosis = {
      id: 101,
      plan_tier: 'free',
      summary: 'Essential check indicates your starter motor circuit or battery may be depleted.',
      severity: 'LOW',
      confidence: 85,
      possible_causes: [
        {
          cause: 'Weak Battery Charge',
          likelihood: 'HIGH',
          reasoning: 'Voltage drops under cranking load.',
        },
      ],
      recommended_actions: [
        'Check battery terminal connections for corrosion.',
        'Charge or test 12V battery with a voltmeter.',
      ],
      estimated_cost: {
        min: 1500,
        max: 3500,
        currency: 'PHP',
      },
      repair_guidance: null,
      cost_breakdown: null,
      history_insights: null,
    };

    const premiumDiagnosis = {
      id: 202,
      plan_tier: 'premium',
      summary: 'Deep diagnostic analysis reveals starter solenoid contact pitting compounded by high resistance.',
      severity: 'MODERATE',
      confidence: 92,
      history_insights: 'Correlated with your August 2026 battery replacement; the battery tested good, isolating the starter.',
      possible_causes: [
        {
          cause: 'Worn Starter Solenoid Contacts',
          likelihood: 'HIGH',
          evidence: 'Clicking sound with full 12.6V battery rest voltage.',
        },
      ],
      recommended_actions: [
        'Bench-test starter motor relay and solenoid contacts.',
      ],
      estimated_cost: {
        min: 2200,
        max: 4500,
        currency: 'PHP',
      },
      repair_guidance: {
        summary: 'Starter solenoid overhaul and relay terminal cleaning.',
        difficulty: 'intermediate',
        diy_friendly: true,
        estimated_time: '1-2 hours',
        tools_needed: ['10mm socket', 'Multimeter', 'Wire brush'],
        prerequisites: ['Disconnect negative battery terminal'],
        steps: [
          {
            step_number: 1,
            title: 'Disconnect Battery',
            description: 'Detach the negative lead to prevent short circuits.',
            caution: 'Ensure ignition switch is in OFF position.',
          },
          {
            step_number: 2,
            title: 'Remove Starter Relay',
            description: 'Unclip harness connector and test continuity.',
            caution: null,
          },
        ],
        safety_stopping_conditions: [
          'If strong fuel odors or liquid fuel is observed near the starter.',
          'If starter wiring harness shows signs of thermal melting.',
        ],
      },
      cost_breakdown: {
        parts: {
          min: 1200,
          max: 2500,
          items: [
            { name: 'Starter Solenoid Repair Kit', cost_range: '₱1,200 - ₱1,800' },
            { name: 'Replacement Relay', cost_range: '₱500 - ₱700' },
          ],
        },
        labor: {
          min: 1000,
          max: 2000,
          estimated_hours: 1.5,
        },
        assumptions: 'Standard OEM replacement parts in local shops.',
        uncertainty_note: 'Labor rates may vary by location and shop classification.',
      },
    };

    it('renders Free tier header badge and upgrade banner for Free diagnosis', () => {
      let tree;
      act(() => {
        tree = renderer.create(
          <DiagnosticResultModal
            visible={true}
            onClose={jest.fn()}
            diagnosis={freeDiagnosis}
            vehicleName="Honda Click 125i"
          />
        );
      });

      const root = tree.root;
      const allTexts = root.findAllByType('Text').map(t => {
        if (Array.isArray(t.props.children)) {
          return t.props.children.join('');
        }
        return String(t.props.children || '');
      });

      // Free tier header
      expect(allTexts).toContain('ESSENTIAL VEHICLE CARE REPORT');
      expect(allTexts).not.toContain('PREMIUM VEHICLE CARE ANALYSIS');

      // Subtle Upgrade banner present for free tier
      expect(allTexts.some(t => t.includes('Need Deeper Repair Insights?'))).toBe(true);
      expect(allTexts.some(t => t.includes('Explore Premium'))).toBe(true);

      // Premium fields absent
      expect(allTexts.some(t => t.includes('VEHICLE HISTORY INSIGHTS'))).toBe(false);
      expect(allTexts.some(t => t.includes('STEP-BY-STEP REPAIR GUIDANCE'))).toBe(false);
      expect(allTexts.some(t => t.includes('ITEMIZED REPAIR & PARTS BREAKDOWN'))).toBe(false);
    });

    it('triggers onUpgrade or navigation when user taps Explore Premium', () => {
      const onUpgradeMock = jest.fn();
      let tree;
      act(() => {
        tree = renderer.create(
          <DiagnosticResultModal
            visible={true}
            onClose={jest.fn()}
            diagnosis={freeDiagnosis}
            vehicleName="Honda Click 125i"
            onUpgrade={onUpgradeMock}
          />
        );
      });

      const root = tree.root;
      const upgradeBtn = root.findAllByProps({ activeOpacity: 0.85 }).find(node => {
        const textNodes = node.findAllByType('Text');
        return textNodes.some(t => t.props.children === 'Explore Premium');
      });

      expect(upgradeBtn).toBeTruthy();
      act(() => {
        upgradeBtn.props.onPress();
      });

      expect(onUpgradeMock).toHaveBeenCalled();
    });

    it('renders Premium tier badge, history insights, repair guide, and itemized costs without upgrade banner', () => {
      let tree;
      act(() => {
        tree = renderer.create(
          <DiagnosticResultModal
            visible={true}
            onClose={jest.fn()}
            diagnosis={premiumDiagnosis}
            vehicleName="Yamaha NMAX 155"
          />
        );
      });

      const root = tree.root;
      const allTexts = root.findAllByType('Text').map(t => {
        if (Array.isArray(t.props.children)) {
          return t.props.children.join('');
        }
        return String(t.props.children || '');
      });

      // Premium header badge
      expect(allTexts).toContain('PREMIUM VEHICLE CARE ANALYSIS');
      expect(allTexts).not.toContain('ESSENTIAL VEHICLE CARE REPORT');

      // History Insights
      expect(allTexts).toContain('VEHICLE HISTORY INSIGHTS');
      expect(allTexts.some(t => t.includes('Correlated with your August 2026 battery replacement'))).toBe(true);

      // Step-by-Step Repair Guidance
      expect(allTexts).toContain('STEP-BY-STEP REPAIR GUIDANCE');
      expect(allTexts).toContain('DIY FRIENDLY');
      expect(allTexts).toContain('INTERMEDIATE');
      expect(allTexts).toContain('1-2 hours');
      expect(allTexts).toContain('10mm socket');
      expect(allTexts).toContain('Disconnect negative battery terminal');
      expect(allTexts).toContain('Disconnect Battery');
      expect(allTexts).toContain('Ensure ignition switch is in OFF position.');
      expect(allTexts).toContain('WHEN TO STOP & CALL A MECHANIC');
      expect(allTexts.some(t => t.includes('strong fuel odors'))).toBe(true);

      // Itemized Cost Breakdown
      expect(allTexts).toContain('ITEMIZED REPAIR & PARTS BREAKDOWN');
      expect(allTexts).toContain('Parts & Materials');
      expect(allTexts).toContain('Labor Estimate');
      expect(allTexts.some(t => t.includes('Starter Solenoid Repair Kit'))).toBe(true);
      expect(allTexts.some(t => t.includes('~1.5 hrs standard labor'))).toBe(true);

      // Upgrade banner MUST NOT appear for Premium users
      expect(allTexts.some(t => t.includes('Need Deeper Repair Insights?'))).toBe(false);
      expect(allTexts.some(t => t.includes('Explore Premium'))).toBe(false);
    });
  });

  describe('SubscriptionManagementCard Quota Display', () => {
    it('displays 100 consultations/month quota for active premium subscription', () => {
      let tree;
      act(() => {
        tree = renderer.create(
          <SubscriptionManagementCard
            isPremium={true}
            subscriptionStatus="active"
            subscriptionInterval="monthly"
            vehicleLimit={5}
          />
        );
      });

      const root = tree.root;
      const allTexts = root.findAllByType('Text').map(t => String(t.props.children || ''));

      expect(allTexts).toContain('AI Consultation Quota');
      expect(allTexts).toContain('100 / month');
      expect(allTexts).toContain('5 vehicles');
    });

    it('displays 20 consultations/month quota for free subscription', () => {
      let tree;
      act(() => {
        tree = renderer.create(
          <SubscriptionManagementCard
            isPremium={false}
            subscriptionStatus="none"
            vehicleLimit={1}
          />
        );
      });

      const root = tree.root;
      const allTexts = root.findAllByType('Text').map(t => String(t.props.children || ''));

      expect(allTexts).toContain('AI Consultation Quota');
      expect(allTexts).toContain('20 / month');
      expect(allTexts).toContain('1 vehicle');
    });
  });
});
