import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { fetchAIUsageStats } from '../services/aiUsageService';

const ASYNC_STORAGE_KEY = '@vehicare_ai_usage_v2';

const DEFAULT_USAGE = {
  plan: 'free',
  used: 0,
  limit: 20,
  remaining: 20,
  period: 'monthly',
  reset_at: null,
  exhausted: false,
};

export const AIUsageContext = createContext(null);

export const AIUsageProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [usage, setUsage] = useState(DEFAULT_USAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  // Normalize backend or cached payload into safe authoritative structure
  const normalizeUsage = useCallback((raw, authState) => {
    const rawPlan = raw?.plan || (authState ? 'free' : 'guest');
    const safePlan = ['guest', 'free', 'premium'].includes(rawPlan) ? rawPlan : 'free';
    const fallbackLimit = safePlan === 'premium' ? 100 : safePlan === 'guest' ? 5 : 20;

    const limit = typeof raw?.limit === 'number' && !isNaN(raw.limit) ? raw.limit : fallbackLimit;
    const used = typeof raw?.used === 'number' && !isNaN(raw.used) ? raw.used : 0;
    const remaining = typeof raw?.remaining === 'number' && !isNaN(raw.remaining)
      ? raw.remaining
      : Math.max(0, limit - used);

    const exhausted = Boolean(raw?.exhausted || remaining <= 0 || used >= limit);
    const period = raw?.period || (safePlan === 'guest' ? 'total' : 'monthly');
    const reset_at = raw?.reset_at || null;

    return {
      plan: safePlan,
      used,
      limit,
      remaining,
      period,
      reset_at,
      exhausted,
      video: raw?.video,
      media: raw?.media,
    };
  }, []);

  // Fetch authoritative usage stats from backend
  const refreshUsage = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchAIUsageStats();
      if (data) {
        const normalized = normalizeUsage(data, isAuthenticated);
        setUsage(normalized);
        try {
          await AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(normalized));
        } catch (_) {}
        return normalized;
      }
    } catch (err) {
      console.warn('[AIUsageContext] Refresh error:', err?.message || err);
      setError(err?.message || 'Failed to refresh AI usage');
    } finally {
      setLoading(false);
    }
    return null;
  }, [isAuthenticated, normalizeUsage]);

  // Load cached stats on initial mount, then fetch fresh
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
        if (cached && isMounted) {
          const parsed = JSON.parse(cached);
          setUsage(normalizeUsage(parsed, isAuthenticated));
        }
      } catch (_) {}

      if (isMounted) {
        await refreshUsage();
      }
    })();

    return () => {
      isMounted = false;
      if (noticeTimerRef.current) {
        clearTimeout(noticeTimerRef.current);
      }
    };
  }, [user?.id, isAuthenticated, refreshUsage, normalizeUsage]);

  // Immediate quota exhausted setter (e.g., upon HTTP 403)
  const setQuotaExhausted = useCallback((overrides = {}) => {
    setUsage(prev => {
      const fallbackLimit = prev?.plan === 'premium' ? 100 : prev?.plan === 'guest' ? 5 : 20;
      const limit = overrides.limit ?? prev?.limit ?? fallbackLimit;
      const updated = {
        ...prev,
        ...overrides,
        used: overrides.used ?? limit,
        limit,
        remaining: 0,
        exhausted: true,
        period: overrides.period ?? prev?.period ?? (prev?.plan === 'guest' ? 'total' : 'monthly'),
        reset_at: overrides.reset_at ?? prev?.reset_at ?? null,
      };
      AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  // Subtle feedback after a consultation without interrupting chat
  const triggerConsultationFeedback = useCallback((remainingCount) => {
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    const message = remainingCount > 0
      ? `AI consultation recorded • ${remainingCount} remaining this period`
      : 'AI consultation recorded • Monthly limit reached';
    setFeedbackNotice(message);
    noticeTimerRef.current = setTimeout(() => {
      setFeedbackNotice(null);
    }, 4000);
  }, []);

  // Optimistic update when consultation completes
  const recordConsultationOptimistic = useCallback(() => {
    setUsage(prev => {
      const newUsed = prev.used + 1;
      const newRemaining = Math.max(0, prev.limit - newUsed);
      const isExhausted = newRemaining <= 0;
      const updated = {
        ...prev,
        used: newUsed,
        remaining: newRemaining,
        exhausted: isExhausted,
      };
      AsyncStorage.setItem(ASYNC_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
      triggerConsultationFeedback(newRemaining);
      return updated;
    });

    // Refresh asynchronously to stay authoritative
    setTimeout(() => {
      refreshUsage().catch(() => {});
    }, 800);
  }, [refreshUsage, triggerConsultationFeedback]);

  const openDetailsModal = useCallback(() => {
    setIsDetailsModalVisible(true);
  }, []);

  const closeDetailsModal = useCallback(() => {
    setIsDetailsModalVisible(false);
  }, []);

  const value = {
    usage,
    loading,
    error,
    refreshUsage,
    setQuotaExhausted,
    recordConsultationOptimistic,
    isDetailsModalVisible,
    openDetailsModal,
    closeDetailsModal,
    feedbackNotice,
  };

  return (
    <AIUsageContext.Provider value={value}>
      {children}
    </AIUsageContext.Provider>
  );
};

export const useAIUsage = () => {
  const context = useContext(AIUsageContext);
  if (!context) {
    // Graceful fallback if called outside provider (e.g. isolated test)
    return {
      usage: DEFAULT_USAGE,
      loading: false,
      error: null,
      refreshUsage: async () => DEFAULT_USAGE,
      setQuotaExhausted: () => {},
      recordConsultationOptimistic: () => {},
      isDetailsModalVisible: false,
      openDetailsModal: () => {},
      closeDetailsModal: () => {},
      feedbackNotice: null,
    };
  }
  return context;
};

export default AIUsageContext;
