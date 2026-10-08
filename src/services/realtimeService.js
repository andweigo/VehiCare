import apiClient from '../api/apiClient';
import { getToken } from './storageService';

let socket = null;
let socketId = null;
let isConnected = false;
let pingInterval = null;
let reconnectTimer = null;
let currentUserId = null;
let nextSubscriptionId = 1;

// Multi-component subscription registry: subscriptionId -> { subscriptionId, userId, channelNames, eventCallbacks }
const activeSubscriptions = new Map();
// Active channels authorized on WebSocket connection
const authorizedChannels = new Set();

/**
 * Extract host, port, scheme from apiClient base URL
 */
const getWebSocketUrlConfig = () => {
  const apiBase = apiClient.defaults.baseURL || 'http://127.0.0.1:8080/api';
  try {
    const isEncrypted = apiBase.startsWith('https://');
    const wsScheme = isEncrypted ? 'wss' : 'ws';
    const urlClean = apiBase.replace(/^https?:\/\//, '').split('/')[0];
    const parts = urlClean.split(':');
    const host = parts[0] || '127.0.0.1';
    // Reverb runs on 8080 by default in Laravel setup unless specified
    const port = parts[1] ? parseInt(parts[1], 10) : 8080;
    const appKey = 'vehicare_key_2026';

    const wsUrl = `${wsScheme}://${host}:${port}/app/${appKey}?protocol=7&client=js&version=8.4.0`;
    return { wsUrl, apiBase, host, port };
  } catch (e) {
    return {
      wsUrl: 'ws://127.0.0.1:8080/app/vehicare_key_2026?protocol=7&client=js&version=8.4.0',
      apiBase,
      host: '127.0.0.1',
      port: 8080,
    };
  }
};

/**
 * Start heartbeat ping loop to keep WebSocket alive
 */
const startPingInterval = () => {
  stopPingInterval();
  pingInterval = setInterval(() => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      try {
        socket.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
      } catch (e) {
        // Ignore ping error
      }
    }
  }, 25000);
};

const stopPingInterval = () => {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
};

/**
 * Authenticate and subscribe to a private channel over WebSocket
 */
const authenticateAndSubscribeChannel = async channelName => {
  if (!socket || socket.readyState !== WebSocket.OPEN || !socketId) {
    return;
  }

  const token = await getToken();
  if (!token) {
    return;
  }

  try {
    console.info(`[RealtimeService] Authorizing channel ${channelName} with socketId ${socketId}`);

    const response = await apiClient.post('/broadcasting/auth', {
      socket_id: socketId,
      channel_name: channelName,
    });

    const authData = response?.data?.auth || response?.data?.auth_token || response?.data?.data?.auth;
    const channelData = response?.data?.channel_data || response?.data?.data?.channel_data;

    if (authData) {
      const subscribeMsg = {
        event: 'pusher:subscribe',
        data: {
          auth: authData,
          channel: channelName,
          ...(channelData ? { channel_data: channelData } : {}),
        },
      };

      socket.send(JSON.stringify(subscribeMsg));
      authorizedChannels.add(channelName);
      console.info(`[RealtimeService] Subscribed WebSocket channel ${channelName}`);
    }
  } catch (error) {
    console.warn(
      `[RealtimeService] Channel auth failed for ${channelName} (REST fallback active):`,
      error?.response?.data || error?.message || error,
    );
  }
};

/**
 * Re-authorize all active unique channels on WebSocket connection
 */
const syncAllActiveChannels = () => {
  const uniqueChannels = new Set();
  activeSubscriptions.forEach(sub => {
    if (Array.isArray(sub.channelNames)) {
      sub.channelNames.forEach(ch => uniqueChannels.add(ch));
    } else if (sub.channelName) {
      uniqueChannels.add(sub.channelName);
    }
  });

  uniqueChannels.forEach(chName => {
    authenticateAndSubscribeChannel(chName);
  });
};

/**
 * Initialize WebSocket connection to Reverb
 */
export const initRealtimeClient = async userId => {
  if (userId) {
    currentUserId = userId;
  }

  const token = await getToken();
  if (!token) {
    return null;
  }

  if (socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN)) {
    return socket;
  }

  const { wsUrl } = getWebSocketUrlConfig();

  console.info('[RealtimeService] Connecting to Reverb WebSocket at:', wsUrl);

  try {
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.info('[RealtimeService] WebSocket connected successfully.');
      isConnected = true;
      startPingInterval();
      if (socketId) {
        syncAllActiveChannels();
      }
    };

    socket.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);
        const eventName = payload.event;
        const channelName = payload.channel;

        let data = payload.data;
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) {
            // keep string if not json
          }
        }

        // Handshake
        if (eventName === 'pusher:connection_established') {
          socketId = data?.socket_id;
          console.info('[RealtimeService] Pusher connection established. Socket ID:', socketId);
          syncAllActiveChannels();
          return;
        }

        // Respond to server-initiated ping (CRITICAL for Reverb connection keep-alive)
        if (eventName === 'pusher:ping') {
          try {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
            }
          } catch (e) {
            // Ignore
          }
          return;
        }

        // Pong response from server
        if (eventName === 'pusher:pong') {
          return;
        }

        // Normalize event names for flexible matching
        const normEvent = String(eventName || '').replace(/\\/g, '.').toLowerCase();

        // Dispatch incoming events to ALL matching active component subscriptions
        activeSubscriptions.forEach(sub => {
          const subChannels = Array.isArray(sub.channelNames) ? sub.channelNames : [sub.channelName];
          const isChannelMatch = !channelName || subChannels.includes(channelName);

          if (isChannelMatch) {
            const callbacks = sub.eventCallbacks || {};
            Object.keys(callbacks).forEach(targetEvent => {
              const fn = callbacks[targetEvent];
              if (typeof fn === 'function') {
                const normTarget = String(targetEvent || '').replace(/\\/g, '.').toLowerCase();

                const isMatch =
                  targetEvent === '*' ||
                  eventName === targetEvent ||
                  normEvent === normTarget ||
                  normEvent.endsWith(normTarget) ||
                  normTarget.endsWith(normEvent) ||
                  (normEvent.includes('notification') && normTarget.includes('notification'));

                if (isMatch) {
                  console.info(
                    `[RealtimeService] Real-time event '${eventName}' triggered callback for sub #${sub.subscriptionId}`,
                  );
                  try {
                    fn(data);
                  } catch (err) {
                    console.error('[RealtimeService] Callback execution error:', err);
                  }
                }
              }
            });
          }
        });
      } catch (err) {
        console.warn('[RealtimeService] Message processing error:', err);
      }
    };

    socket.onerror = err => {
      console.warn('[RealtimeService] WebSocket connection error (REST fallback active):', err?.message || err);
    };

    socket.onclose = evt => {
      console.info('[RealtimeService] WebSocket closed:', evt?.reason || evt?.code);
      isConnected = false;
      socketId = null;
      authorizedChannels.clear();
      stopPingInterval();

      // Auto reconnect after 5s
      if (currentUserId && !reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          if (currentUserId) {
            initRealtimeClient(currentUserId);
          }
        }, 5000);
      }
    };

    return socket;
  } catch (err) {
    console.warn('[RealtimeService] WebSocket init error (REST fallback active):', err);
    return null;
  }
};

/**
 * Subscribe to private user channels with reference counting
 * Returns an unsubscribe() function specific to this component call
 */
export const subscribeToPrivateUserChannel = async (userId, eventCallbacks = {}) => {
  if (!userId) return () => {};

  currentUserId = userId;

  // Support all standard Laravel notification channel formats
  const channelNames = [
    `private-user.${userId}`,
    `private-App.Models.User.${userId}`,
    `private-App.User.${userId}`,
  ];

  const subscriptionId = `sub_${nextSubscriptionId++}`;

  activeSubscriptions.set(subscriptionId, {
    subscriptionId,
    userId,
    channelNames,
    eventCallbacks,
  });

  console.info(`[RealtimeService] Registered component subscription #${subscriptionId} for user ${userId}`);

  // Ensure socket is active and authorized for these channels
  await initRealtimeClient(userId);

  if (socket && socket.readyState === WebSocket.OPEN && socketId) {
    channelNames.forEach(ch => {
      if (!authorizedChannels.has(ch)) {
        authenticateAndSubscribeChannel(ch);
      }
    });
  }

  // Return component-specific unsubscribe function
  return () => {
    console.info(`[RealtimeService] Unsubscribing component #${subscriptionId} for user ${userId}`);
    activeSubscriptions.delete(subscriptionId);

    channelNames.forEach(ch => {
      // Check if any other component still needs this channel
      const stillNeeded = Array.from(activeSubscriptions.values()).some(
        sub => Array.isArray(sub.channelNames) && sub.channelNames.includes(ch),
      );

      if (!stillNeeded && authorizedChannels.has(ch)) {
        authorizedChannels.delete(ch);
        if (socket && socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(
              JSON.stringify({
                event: 'pusher:unsubscribe',
                data: { channel: ch },
              }),
            );
            console.info(`[RealtimeService] Sent pusher:unsubscribe for ${ch}`);
          } catch (e) {
            // Ignore close errors
          }
        }
      }
    });
  };
};

/**
 * Disconnect WebSocket client completely
 */
export const disconnectRealtimeClient = () => {
  currentUserId = null;
  stopPingInterval();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  activeSubscriptions.clear();
  authorizedChannels.clear();
  if (socket) {
    try {
      socket.close();
    } catch (e) {
      // Ignore
    }
    socket = null;
    socketId = null;
    isConnected = false;
    console.info('[RealtimeService] Disconnected realtime client.');
  }
};

export default {
  initRealtimeClient,
  subscribeToPrivateUserChannel,
  disconnectRealtimeClient,
};
