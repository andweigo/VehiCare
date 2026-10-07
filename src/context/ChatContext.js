import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from './AuthContext';
import { useVehicle } from './VehicleContext';
import vehicleApi from '../api/vehicleApi';
import {
  loadActiveChatSessions,
  saveActiveChatSessions,
} from '../services/storageService';

const ChatContext = createContext(null);

/*
|--------------------------------------------------------------------------
| HELPER: RESOLVE VEHICLE KEY
|--------------------------------------------------------------------------
*/
const getVehicleKey = (vehicleId) => {
  if (vehicleId !== null && vehicleId !== undefined && vehicleId !== '') {
    return String(vehicleId);
  }
  return 'default';
};

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated, logoutSignal } = useAuth();
  const { activeVehicle, pendingVehicle } = useVehicle();

  const userId = user?.id || user?.uid || null;

  // Resolve active vehicle & vehicle key based on auth status
  const resolvedVehicle = isAuthenticated ? activeVehicle : pendingVehicle;
  const vehicleId = resolvedVehicle?.id || resolvedVehicle?.vehicle_id || null;
  const vehicleKey = getVehicleKey(vehicleId);

  // States
  const [sessionsMap, setSessionsMap] = useState({});
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ref locks to prevent race conditions & duplicate session creations
  const sessionsMapRef = useRef(sessionsMap);
  sessionsMapRef.current = sessionsMap;

  const isCreatingSessionRef = useRef(false);
  const saveQueueRef = useRef(Promise.resolve());
  const prevVehicleKeyRef = useRef(vehicleKey);

  /*
  |--------------------------------------------------------------------------
  | SYNC SESSION TO LARAVEL BACKEND
  |--------------------------------------------------------------------------
  */
  const syncSessionToServer = useCallback(async (session) => {
    if (!isAuthenticated || !session || !session.id) return session;
    try {
      const payload = {
        id: session.id,
        vehicle_id: session.vehicleId || vehicleId,
        title: session.title || 'Ask VehiCare Chat',
        type: session.type || 'general',
        status: session.status || 'active',
        messages: (session.messages || []).map(m => ({
          role: m.role || m.sender || 'user',
          sender: m.sender || m.role || 'user',
          text: m.text || m.message || '',
        })),
      };
      await vehicleApi.syncChatSession(payload);
    } catch (err) {
      console.warn('[ChatContext] Failed to sync session to server:', err?.message);
    }
    return session;
  }, [isAuthenticated, vehicleId]);

  /*
  |--------------------------------------------------------------------------
  | PERSIST SESSIONS MAP TO STORAGE (SERIALIZED QUEUE) + SERVER SYNC
  |--------------------------------------------------------------------------
  */
  const persistSessionsMap = useCallback((nextMap) => {
    setSessionsMap(nextMap);
    sessionsMapRef.current = nextMap;

    saveQueueRef.current = saveQueueRef.current
      .then(async () => {
        await saveActiveChatSessions(userId, {
          activeVehicleKey: vehicleKey,
          sessions: nextMap,
        });

        // If authenticated, sync active session to Laravel
        if (isAuthenticated) {
          const activeSess = Object.values(nextMap).find(s => s && s.status === 'active' && getVehicleKey(s.vehicleId) === vehicleKey);
          if (activeSess && (activeSess.messages || []).length > 0) {
            await syncSessionToServer(activeSess);
          }
        }
      })
      .catch((err) => {
        console.error('[ChatContext] Failed to persist chat sessions:', err);
      });
  }, [userId, vehicleKey, isAuthenticated, syncSessionToServer]);

  /*
  |--------------------------------------------------------------------------
  | CREATE NEW SESSION (VEHICLE-SPECIFIC & DUPLICATE-GUARDED)
  |--------------------------------------------------------------------------
  */
  const createNewSession = useCallback((targetVehicleId = null, initialMessages = []) => {
    if (isCreatingSessionRef.current) {
      return currentSessionId ? sessionsMapRef.current[currentSessionId] : null;
    }
    isCreatingSessionRef.current = true;

    try {
      const targetId = targetVehicleId !== null ? targetVehicleId : vehicleId;
      const targetKey = getVehicleKey(targetId);
      const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();

      const newSession = {
        id: newId,
        vehicleId: targetId,
        userId: userId,
        type: 'general',
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
        messages: initialMessages,
      };

      const currentMap = { ...sessionsMapRef.current };

      // Mark previous active sessions for target vehicle as completed in history
      Object.keys(currentMap).forEach(key => {
        const sess = currentMap[key];
        if (sess && getVehicleKey(sess.vehicleId) === targetKey && sess.status === 'active') {
          currentMap[key] = {
            ...sess,
            status: 'completed',
            updatedAt: nowIso,
          };
        }
      });

      currentMap[newId] = newSession;
      setCurrentSessionId(newId);
      persistSessionsMap(currentMap);
      return newSession;
    } finally {
      setTimeout(() => {
        isCreatingSessionRef.current = false;
      }, 300);
    }
  }, [vehicleId, userId, currentSessionId, persistSessionsMap]);

  /*
  |--------------------------------------------------------------------------
  | INITIALIZE FRESH CHAT SESSION ON APP LAUNCH / LOGIN
  |--------------------------------------------------------------------------
  */
  const initializeFreshChatSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedData = await loadActiveChatSessions(userId);
      let existingMap = {};
      if (storedData && typeof storedData === 'object' && storedData.sessions) {
        const rawSessions = storedData.sessions || {};
        Object.keys(rawSessions).forEach(k => {
          const s = rawSessions[k];
          if (s && (!s.userId || !userId || String(s.userId) === String(userId))) {
            existingMap[k] = s;
          }
        });
      }

      const nowIso = new Date().toISOString();
      const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Mark all previous active sessions as completed so history is preserved
      const updatedMap = { ...existingMap };
      Object.keys(updatedMap).forEach(key => {
        const sess = updatedMap[key];
        if (sess && sess.status === 'active') {
          updatedMap[key] = {
            ...sess,
            status: 'completed',
            updatedAt: nowIso,
          };
        }
      });

      // Create a fresh empty chat session for current vehicle
      const freshSession = {
        id: newId,
        vehicleId: vehicleId,
        userId: userId,
        type: 'general',
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
        messages: [],
      };

      updatedMap[newId] = freshSession;
      setSessionsMap(updatedMap);
      sessionsMapRef.current = updatedMap;
      setCurrentSessionId(newId);

      await saveActiveChatSessions(userId, {
        activeVehicleKey: vehicleKey,
        sessions: updatedMap,
      });
    } catch (error) {
      console.warn('[ChatContext] Error initializing fresh chat session:', error);
      const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fallbackSession = {
        id: newId,
        vehicleId: vehicleId,
        userId: userId,
        type: 'general',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      setSessionsMap({ [newId]: fallbackSession });
      sessionsMapRef.current = { [newId]: fallbackSession };
      setCurrentSessionId(newId);
    } finally {
      setIsLoading(false);
    }
  }, [userId, vehicleId, vehicleKey]);

  // Initial load or user login/logout change
  useEffect(() => {
    setSessionsMap({});
    sessionsMapRef.current = {};
    setCurrentSessionId(null);

    if (logoutSignal) {
      setIsLoading(false);
    } else {
      initializeFreshChatSession();
    }
  }, [initializeFreshChatSession, logoutSignal, userId]);

  // Handle active vehicle switching: start fresh session for new vehicle
  useEffect(() => {
    if (isLoading) return;

    if (prevVehicleKeyRef.current !== vehicleKey) {
      prevVehicleKeyRef.current = vehicleKey;
      createNewSession(vehicleId);
    }
  }, [vehicleKey, vehicleId, isLoading, createNewSession]);

  /*
  |--------------------------------------------------------------------------
  | CURRENT SESSION COMPUTED STATE
  |--------------------------------------------------------------------------
  */
  const currentSession = useMemo(() => {
    if (currentSessionId && sessionsMap[currentSessionId]) {
      return sessionsMap[currentSessionId];
    }
    return null;
  }, [currentSessionId, sessionsMap]);

  const messages = useMemo(() => {
    return currentSession?.messages || [];
  }, [currentSession]);

  /*
  |--------------------------------------------------------------------------
  | SAVE ACTIVE CHAT
  |--------------------------------------------------------------------------
  */
  const saveActiveChat = useCallback(async (sessionToSave) => {
    if (!sessionToSave || !sessionToSave.id) return;
    const currentMap = { ...sessionsMapRef.current, [sessionToSave.id]: sessionToSave };
    persistSessionsMap(currentMap);
  }, [persistSessionsMap]);

  /*
  |--------------------------------------------------------------------------
  | ADD MESSAGE TO CURRENT SESSION
  |--------------------------------------------------------------------------
  */
  const addMessage = useCallback((messageObj) => {
    if (!messageObj) return;

    const nowIso = new Date().toISOString();
    const timeStr = messageObj.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const normalizedMsg = {
      id: messageObj.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender: messageObj.sender || messageObj.role || 'user',
      role: messageObj.role || messageObj.sender || 'user',
      message: messageObj.message || messageObj.text || '',
      text: messageObj.text || messageObj.message || '',
      createdAt: messageObj.createdAt || nowIso,
      time: timeStr,
      ...messageObj,
    };

    const currentMap = { ...sessionsMapRef.current };
    let activeSess = currentSessionId ? currentMap[currentSessionId] : null;

    if (!activeSess || getVehicleKey(activeSess.vehicleId) !== vehicleKey) {
      const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      activeSess = {
        id: newId,
        vehicleId: vehicleId,
        userId: userId,
        type: 'general',
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
        messages: [],
      };
      currentMap[newId] = activeSess;
      setCurrentSessionId(newId);
    }

    const alreadyExists = activeSess.messages.some(m => m.id === normalizedMsg.id);
    const updatedMessages = alreadyExists
      ? activeSess.messages.map(m => (m.id === normalizedMsg.id ? { ...m, ...normalizedMsg } : m))
      : [...activeSess.messages, normalizedMsg];

    // Derive title from user's first prompt if title is default
    let sessionTitle = activeSess.title;
    if ((!sessionTitle || sessionTitle === 'Ask VehiCare Chat') && normalizedMsg.role === 'user' && normalizedMsg.text) {
      const promptText = normalizedMsg.text.trim();
      sessionTitle = promptText.length > 35 ? `${promptText.substring(0, 35)}...` : promptText;
    }

    const updatedSession = {
      ...activeSess,
      title: sessionTitle || 'Ask VehiCare Chat',
      messages: updatedMessages,
      updatedAt: nowIso,
    };

    currentMap[updatedSession.id] = updatedSession;
    persistSessionsMap(currentMap);
  }, [currentSessionId, vehicleKey, vehicleId, userId, persistSessionsMap]);

  /*
  |--------------------------------------------------------------------------
  | UPDATE MESSAGE IN CURRENT SESSION
  |--------------------------------------------------------------------------
  */
  const updateMessage = useCallback((messageId, updates) => {
    if (!messageId || !updates) return;

    const currentMap = { ...sessionsMapRef.current };
    let activeSess = currentSession;
    if (!activeSess) return;

    const updatedMessages = activeSess.messages.map(m =>
      m.id === messageId ? { ...m, ...updates } : m
    );

    const updatedSession = {
      ...activeSess,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    };

    currentMap[updatedSession.id] = updatedSession;
    persistSessionsMap(currentMap);
  }, [currentSession, persistSessionsMap]);

  /*
  |--------------------------------------------------------------------------
  | CLEAR / COMPLETE ACTIVE CHAT
  |--------------------------------------------------------------------------
  */
  const clearActiveChat = useCallback(() => {
    if (!currentSession) return;
    const currentMap = { ...sessionsMapRef.current };
    delete currentMap[currentSession.id];
    setCurrentSessionId(null);
    persistSessionsMap(currentMap);
  }, [currentSession, persistSessionsMap]);

  const completeCurrentSession = useCallback(() => {
    if (!currentSession) return;
    const currentMap = { ...sessionsMapRef.current };
    currentMap[currentSession.id] = {
      ...currentSession,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    };
    setCurrentSessionId(null);
    persistSessionsMap(currentMap);
  }, [currentSession, persistSessionsMap]);

  /*
  |--------------------------------------------------------------------------
  | FETCH CHAT HISTORY & REOPEN SESSION FROM LARAVEL
  |--------------------------------------------------------------------------
  */
  const fetchChatHistory = useCallback(async () => {
    if (!isAuthenticated) return [];
    return await vehicleApi.getChatSessions();
  }, [isAuthenticated]);

  const fetchChatSession = useCallback(async (sessionId) => {
    if (!sessionId) return null;
    const cleanId = String(sessionId).replace(/^chat:/, '');

    // Check local map first
    const currentMap = { ...sessionsMapRef.current };
    if (currentMap[cleanId]) {
      setCurrentSessionId(cleanId);
      return currentMap[cleanId];
    }

    // Otherwise fetch from Laravel
    if (isAuthenticated) {
      try {
        const serverSession = await vehicleApi.getChatSessionById(cleanId);
        if (serverSession && serverSession.id) {
          const formattedSession = {
            id: serverSession.id,
            vehicleId: serverSession.vehicle?.id || null,
            vehicleName: serverSession.vehicle?.name || null,
            title: serverSession.title,
            type: serverSession.type || 'general',
            status: serverSession.status || 'completed',
            createdAt: serverSession.created_at,
            updatedAt: serverSession.updated_at,
            messages: (serverSession.messages || []).map(m => ({
              id: m.id,
              sender: m.sender || m.role || 'user',
              role: m.role || m.sender || 'user',
              message: m.text || m.message || '',
              text: m.text || m.message || '',
              createdAt: m.created_at,
            })),
          };

          const updatedMap = { ...sessionsMapRef.current, [formattedSession.id]: formattedSession };
          setSessionsMap(updatedMap);
          sessionsMapRef.current = updatedMap;
          setCurrentSessionId(formattedSession.id);
          return formattedSession;
        }
      } catch (err) {
        console.warn('[ChatContext] Failed to fetch session by ID:', err?.message);
      }
    }

    return null;
  }, [isAuthenticated]);

  const completeSession = useCallback(async (sessionId) => {
    if (!sessionId) return true;
    const cleanId = String(sessionId).replace(/^chat:/, '');
    if (isAuthenticated) {
      try {
        await vehicleApi.completeChatSession(cleanId);
      } catch (err) {
        console.warn('[ChatContext] Failed to mark session completed on server:', err?.message);
      }
    }
    return true;
  }, [isAuthenticated]);

  return (
    <ChatContext.Provider
      value={{
        currentSession,
        messages,
        currentSessionId,
        isLoading,
        loadActiveChat: initializeFreshChatSession,
        saveActiveChat,
        createNewSession,
        addMessage,
        updateMessage,
        clearActiveChat,
        completeCurrentSession,
        syncSessionToServer,
        fetchChatHistory,
        fetchChatSession,
        completeSession,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
