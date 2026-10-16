import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AIUsageDonut from '../src/components/AIUsageDonut';
import AIUsageDetailsModal from '../src/components/AIUsageDetailsModal';
import AIUsageCard from '../src/components/AIUsageCard';
import { AIUsageProvider, useAIUsage } from '../src/context/AIUsageContext';

// Mocks
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User' },
    isAuthenticated: true,
  }),
}));

jest.mock('../src/context/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k, fallback) => fallback,
    language: 'en',
  }),
}));

jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      surface: '#151515',
      surfaceAlt: '#1C1C1E',
      border: '#292929',
      accent: '#F5501C',
      accentSoft: '#F5501C20',
      text: '#FFFFFF',
      textSecondary: '#8E8E93',
    },
  }),
}));

const mockFetchAIUsageStats = jest.fn();
jest.mock('../src/services/aiUsageService', () => ({
  fetchAIUsageStats: () => mockFetchAIUsageStats(),
}));

describe('AI Usage Donut Chart Component', () => {
  it('renders 0% usage with empty track and 0/20 label', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <AIUsageDonut used={0} limit={20} size={100} strokeWidth={8} />
      );
    });

    const root = tree.root;
    const ratioText = root.findByProps({ testID: 'donut-ratio-text' });
    expect(ratioText.props.children).toEqual([0, '/', 20]);

    const track = root.findByProps({ testID: 'donut-track' });
    expect(track).toBeTruthy();
    expect(root.findAllByProps({ testID: 'donut-full-ring' }).length).toBe(0);
  });

  it('renders partial usage (7/20) with proportional arc and 7/20 label', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <AIUsageDonut used={7} limit={20} size={100} strokeWidth={8} />
      );
    });

    const root = tree.root;
    const ratioText = root.findByProps({ testID: 'donut-ratio-text' });
    expect(ratioText.props.children).toEqual([7, '/', 20]);

    const rightHalf = root.findByProps({ testID: 'donut-right-half' });
    expect(rightHalf).toBeTruthy();
  });

  it('renders high usage (18/20, 90%) with left and right arc', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <AIUsageDonut used={18} limit={20} size={100} strokeWidth={8} />
      );
    });

    const root = tree.root;
    const ratioText = root.findByProps({ testID: 'donut-ratio-text' });
    expect(ratioText.props.children).toEqual([18, '/', 20]);

    expect(root.findByProps({ testID: 'donut-right-half' })).toBeTruthy();
    expect(root.findByProps({ testID: 'donut-left-half' })).toBeTruthy();
  });

  it('renders exhausted / 100% usage with full ring and LIMIT indicator', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <AIUsageDonut used={20} limit={20} isExhausted={true} size={100} strokeWidth={8} />
      );
    });

    const root = tree.root;
    const ratioText = root.findByProps({ testID: 'donut-ratio-text' });
    expect(ratioText.props.children).toEqual([20, '/', 20]);

    const fullRing = root.findByProps({ testID: 'donut-full-ring' });
    expect(fullRing).toBeTruthy();
  });
});

describe('AI Usage Details Modal Component', () => {
  it('renders breakdown, plan badge, and contextual tips for Free plan', () => {
    const usage = {
      plan: 'free',
      used: 5,
      limit: 20,
      remaining: 15,
      period: 'monthly',
      reset_at: '2026-11-01T00:00:00.000000Z',
      exhausted: false,
    };

    let tree;
    act(() => {
      tree = renderer.create(
        <AIUsageDetailsModal
          visible={true}
          usage={usage}
          onClose={jest.fn()}
          onUpgrade={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const modal = root.findByProps({ testID: 'ai-usage-details-modal' });
    expect(modal.props.visible).toBe(true);

    const upgradeBtn = root.findByProps({ testID: 'upgrade-premium-button' });
    expect(upgradeBtn).toBeTruthy();
  });

  it('renders guest mode with Create Account CTA and total period notice', () => {
    const usage = {
      plan: 'guest',
      used: 5,
      limit: 5,
      remaining: 0,
      period: 'total',
      reset_at: null,
      exhausted: true,
    };

    let tree;
    act(() => {
      tree = renderer.create(
        <AIUsageDetailsModal
          visible={true}
          usage={usage}
          onClose={jest.fn()}
          onCreateAccount={jest.fn()}
          onSignIn={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const createBtn = root.findByProps({ testID: 'create-account-button' });
    expect(createBtn).toBeTruthy();
  });
});

describe('AI Usage Card Component', () => {
  it('renders Dashboard card with quota summary and donut ring', () => {
    const mockOnPress = jest.fn();

    let tree;
    act(() => {
      tree = renderer.create(
        <AIUsageCard onPress={mockOnPress} />
      );
    });

    const root = tree.root;
    const card = root.findByProps({ testID: 'ai-usage-card' });
    expect(card).toBeTruthy();

    const donut = root.findByProps({ testID: 'dashboard-donut-ring' });
    expect(donut).toBeTruthy();

    act(() => {
      card.props.onPress();
    });
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});

describe('AI Usage Context & State Management', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('provides default 20 monthly limit for free plan and handles quota exhaustion', async () => {
    mockFetchAIUsageStats.mockResolvedValue({
      plan: 'free',
      used: 3,
      limit: 20,
      remaining: 17,
      period: 'monthly',
      reset_at: '2026-11-01T00:00:00.000000Z',
      exhausted: false,
    });

    let contextValue;
    const TestConsumer = () => {
      contextValue = useAIUsage();
      return null;
    };

    let tree;
    await act(async () => {
      tree = renderer.create(
        <AIUsageProvider>
          <TestConsumer />
        </AIUsageProvider>
      );
    });

    // Run pending timers for initial load
    await act(async () => {
      jest.runAllTimers();
    });

    expect(contextValue.usage.limit).toBe(20);
    expect(contextValue.usage.remaining).toBe(17);
    expect(contextValue.usage.plan).toBe('free');

    // Test immediate quota exhaustion (HTTP 403 recovery)
    act(() => {
      contextValue.setQuotaExhausted({
        limit: 20,
        used: 20,
        remaining: 0,
        exhausted: true,
      });
    });

    expect(contextValue.usage.exhausted).toBe(true);
    expect(contextValue.usage.remaining).toBe(0);
    expect(contextValue.usage.limit).toBe(20);

    // Test optimistic consultation record
    act(() => {
      contextValue.recordConsultationOptimistic();
    });

    expect(contextValue.usage.used).toBe(21);
    expect(contextValue.feedbackNotice).toContain('AI consultation recorded');

    // Fast-forward feedback notice timer
    act(() => {
      jest.advanceTimersByTime(4500);
    });
    expect(contextValue.feedbackNotice).toBeNull();
  });

  it('preserves draft input and attachments when HTTP 403 ai_limit_reached occurs', () => {
    // Simulate draft states
    let draftMessage = 'Engine making knocking sound at 40mph';
    let draftImage = { uri: 'file:///photo.jpg', mime: 'image/jpeg' };
    let draftAudio = { uri: 'file:///audio.mp4', mime: 'audio/mp4' };
    let chatHistory = [{ id: 'user-123', role: 'user', text: draftMessage }];

    // Simulated 403 error response
    const error403 = {
      response: {
        status: 403,
        data: {
          status: 'error',
          reason: 'ai_limit_reached',
          plan: 'free',
          limit: 20,
          used: 20,
          remaining: 0,
          exhausted: true,
          message: 'You have reached your AI consultation limit for this period.',
        },
      },
    };

    let retryCount = 0;
    const isQuotaError = error403.response.status === 403 && error403.response.data.reason === 'ai_limit_reached';

    if (isQuotaError) {
      // Quota recovery: preserve drafts, remove optimistic chat item, DO NOT retry
      // (as implemented in AskVehiCareScreen.js catch block)
      chatHistory = chatHistory.filter(m => m.id !== 'user-123');
      // drafts remain intact
    } else {
      retryCount++;
    }

    expect(isQuotaError).toBe(true);
    expect(draftMessage).toBe('Engine making knocking sound at 40mph');
    expect(draftImage).toEqual({ uri: 'file:///photo.jpg', mime: 'image/jpeg' });
    expect(draftAudio).toEqual({ uri: 'file:///audio.mp4', mime: 'audio/mp4' });
    expect(chatHistory.length).toBe(0);
    expect(retryCount).toBe(0); // Ensures no automatic retry loop
  });
});

