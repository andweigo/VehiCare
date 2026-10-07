import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { subscribeToPrivateUserChannel } from '../services/realtimeService';

/**
 * Custom React hook to subscribe to private user real-time WebSocket events.
 * Reference counts subscriptions so background components (BottomTabBar, Sidebar)
 * remain active when foreground screens mount and unmount.
 *
 * @param {number|string} userId - Current logged-in user ID
 * @param {Object} eventCallbacks - Map of event names to callback functions
 */
export const useRealtimeUpdates = (userId, eventCallbacks = {}) => {
  const callbacksRef = useRef(eventCallbacks);
  callbacksRef.current = eventCallbacks;

  useEffect(() => {
    if (!userId) {
      return;
    }

    let unsubscribeFn = null;
    let isMounted = true;

    const setupSubscription = async () => {
      if (!isMounted) return;
      if (typeof unsubscribeFn === 'function') {
        unsubscribeFn();
      }
      unsubscribeFn = await subscribeToPrivateUserChannel(userId, callbacksRef.current);
    };

    setupSubscription();

    // Re-subscribe when returning from app background
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active' && isMounted) {
        setupSubscription();
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
      if (typeof unsubscribeFn === 'function') {
        unsubscribeFn();
      }
    };
  }, [userId]);
};

export default useRealtimeUpdates;
