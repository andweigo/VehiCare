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
import { getAiErrorMessage } from '../utils/aiErrorHelper';
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

const getRequestKey = (sessionId, messageId) => `${sessionId}:${messageId}`;
const formDataRequestIds = new WeakMap();

const withRequestId = (payload) => {
  if (typeof FormData !== 'undefined' && payload instanceof FormData) {
    if (formDataRequestIds.has(payload)) return payload;
    const requestId = `diag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
    payload.append('request_id', requestId);
    formDataRequestIds.set(payload, requestId);
    return payload;
  }
  return {
    ...payload,
    request_id: payload?.request_id || `diag_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`,
  };
};

export const ChatProvider = ({ children }) => {
  const { user, token, isAuthenticated, logoutSignal } = useAuth();
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
  const [requestStates, setRequestStates] = useState({});
  const [conversationUiState, setConversationUiState] = useState({});

  // Ref locks to prevent race conditions & duplicate session creations
  const sessionsMapRef = useRef(sessionsMap);
  sessionsMapRef.current = sessionsMap;

  const isCreatingSessionRef = useRef(false);
  const saveQueueRef = useRef(Promise.resolve());
  const prevVehicleKeyRef = useRef(vehicleKey);
  const prevUserIdRef = useRef(userId);
  const prevLogoutSignalRef = useRef(logoutSignal);
  const initialLoadDoneRef = useRef(false);
  const identityLoadPendingRef = useRef(false);
  const requestPayloadsRef = useRef(new Map());
  const inFlightRequestsRef = useRef(new Set());
  const identityEpochRef = useRef({ userId, logoutSignal, epoch: 0 });

  if (
    identityEpochRef.current.userId !== userId ||
    identityEpochRef.current.logoutSignal !== logoutSignal
  ) {
    identityEpochRef.current = {
      userId,
      logoutSignal,
      epoch: identityEpochRef.current.epoch + 1,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | SYNC SESSION TO LARAVEL BACKEND
  |--------------------------------------------------------------------------
  */
  const syncSessionToServer = useCallback(async (session) => {
    if (
      !isAuthenticated ||
      !session ||
      !session.id ||
      identityEpochRef.current.userId !== userId ||
      String(session.userId ?? '') !== String(userId ?? '')
    ) return session;
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
      await vehicleApi.syncChatSession(payload, token);
    } catch (err) {
      console.warn('[ChatContext] Failed to sync session to server:', err?.message);
    }
    return session;
  }, [isAuthenticated, token, userId, vehicleId]);

  /*
  |--------------------------------------------------------------------------
  | PERSIST SESSIONS MAP TO STORAGE (SERIALIZED QUEUE) + SERVER SYNC
  |--------------------------------------------------------------------------
  */
  const persistSessionsMap = useCallback((nextMap, sessionToSync = null) => {
    const ownerEpoch = identityEpochRef.current.epoch;
    setSessionsMap(nextMap);
    sessionsMapRef.current = nextMap;

    saveQueueRef.current = saveQueueRef.current
      .then(async () => {
        await saveActiveChatSessions(userId, {
          activeVehicleKey: vehicleKey,
          sessions: nextMap,
        });

        // If authenticated, sync active session to Laravel
        if (isAuthenticated && identityEpochRef.current.epoch === ownerEpoch) {
          const session = sessionToSync || Object.values(nextMap).find(
            s => s && s.status === 'active' && getVehicleKey(s.vehicleId) === vehicleKey
          );
          if (session && (session.messages || []).length > 0) {
            await syncSessionToServer(session);
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
  | START FRESH AFTER APP START; REUSE IN-MEMORY SESSIONS DURING THE SESSION
  |--------------------------------------------------------------------------
  */
  const restoreOrCreateActiveSession = useCallback(async (forcedVehicleId = null, freshStart = false) => {
    const ownerEpoch = identityEpochRef.current.epoch;
    identityLoadPendingRef.current = true;
    setIsLoading(true);
    try {
      let existingMap = { ...sessionsMapRef.current };
      if (freshStart) {
        const storedData = await loadActiveChatSessions(userId);
        existingMap = {};
        if (storedData && typeof storedData === 'object' && storedData.sessions) {
          Object.keys(storedData.sessions).forEach(key => {
            const session = storedData.sessions[key];
            if (
              session &&
              (session.userId == null || String(session.userId) === String(userId ?? ''))
            ) {
              existingMap[key] = {
                ...session,
                userId: session.userId ?? userId,
              };
            }
          });
        }

        if (identityEpochRef.current.epoch !== ownerEpoch) return null;

        Object.keys(existingMap).forEach(key => {
          if (existingMap[key]?.status === 'active') {
            existingMap[key] = {
              ...existingMap[key],
              status: 'completed',
              updatedAt: new Date().toISOString(),
            };
          }
        });
      }

      const targetId = forcedVehicleId !== null ? forcedVehicleId : vehicleId;
      const targetKey = getVehicleKey(targetId);

      // Only reuse sessions already in memory; persisted active sessions are history on cold start.
      const existingActive = freshStart ? null : Object.values(existingMap).find(
        s => s && s.status === 'active' && getVehicleKey(s.vehicleId) === targetKey
      );

      if (existingActive) {
        setSessionsMap(existingMap);
        sessionsMapRef.current = existingMap;
        setCurrentSessionId(existingActive.id);
        return existingActive;
      }

      if (identityEpochRef.current.epoch !== ownerEpoch) return null;

      // No active session for this vehicle yet: create a fresh active session
      const nowIso = new Date().toISOString();
      const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const freshSession = {
        id: newId,
        vehicleId: targetId,
        userId: userId,
        type: 'general',
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso,
        messages: [],
      };

      const updatedMap = { ...existingMap, [newId]: freshSession };
      setSessionsMap(updatedMap);
      sessionsMapRef.current = updatedMap;
      setCurrentSessionId(newId);

      await saveActiveChatSessions(userId, {
        activeVehicleKey: targetKey,
        sessions: updatedMap,
      });

      return freshSession;
    } catch (error) {
      if (identityEpochRef.current.epoch !== ownerEpoch) return null;
      console.warn('[ChatContext] Error restoring/initializing chat session:', error);
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
      const fallbackMap = { ...sessionsMapRef.current, [newId]: fallbackSession };
      setSessionsMap(fallbackMap);
      sessionsMapRef.current = fallbackMap;
      setCurrentSessionId(newId);
      return fallbackSession;
    } finally {
      if (identityEpochRef.current.epoch === ownerEpoch) {
        identityLoadPendingRef.current = false;
        setIsLoading(false);
      }
    }
  }, [userId, vehicleId]);

  // Initial load on mount or when user identity changes (login/logout)
  useEffect(() => {
    const userChanged = prevUserIdRef.current !== userId;
    const logoutOccurred = prevLogoutSignalRef.current !== logoutSignal;
    prevUserIdRef.current = userId;
    prevLogoutSignalRef.current = logoutSignal;

    if (logoutOccurred) {
      setSessionsMap({});
      sessionsMapRef.current = {};
      setCurrentSessionId(null);
      setRequestStates({});
      setConversationUiState({});
      requestPayloadsRef.current.clear();
      identityLoadPendingRef.current = false;
      setIsLoading(false);
      initialLoadDoneRef.current = false;
      return;
    }

    if (!initialLoadDoneRef.current || userChanged) {
      initialLoadDoneRef.current = true;
      setRequestStates({});
      if (userChanged) setConversationUiState({});
      requestPayloadsRef.current.clear();
      restoreOrCreateActiveSession(null, true);
    }
  }, [restoreOrCreateActiveSession, logoutSignal, userId]);

  // Handle active vehicle switching: restore existing active session for new vehicle or create one
  useEffect(() => {
    if (isLoading || identityLoadPendingRef.current || !initialLoadDoneRef.current) return;

    if (prevVehicleKeyRef.current !== vehicleKey) {
      prevVehicleKeyRef.current = vehicleKey;

      const currentMap = sessionsMapRef.current || {};
      const existingActiveForNewVehicle = Object.values(currentMap).find(
        s => s && s.status === 'active' && getVehicleKey(s.vehicleId) === vehicleKey
      );

      if (existingActiveForNewVehicle) {
        setCurrentSessionId(existingActiveForNewVehicle.id);
      } else {
        restoreOrCreateActiveSession(vehicleId);
      }
    }
  }, [vehicleKey, vehicleId, isLoading, restoreOrCreateActiveSession]);

  /*
  |--------------------------------------------------------------------------
  | CURRENT SESSION COMPUTED STATE
  |--------------------------------------------------------------------------
  */
  const currentSession = useMemo(() => {
    const session = currentSessionId ? sessionsMap[currentSessionId] : null;
    if (!session || String(session.userId ?? '') !== String(userId ?? '')) return null;
    return session;
  }, [currentSessionId, sessionsMap, userId]);

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
    if (activeSess && String(activeSess.userId ?? '') !== String(userId ?? '')) return;

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

  const addMessageToSession = useCallback((sessionId, ownerUserId, messageObj) => {
    if (
      !sessionId ||
      !messageObj ||
      String(identityEpochRef.current.userId ?? '') !== String(ownerUserId ?? '')
    ) return false;

    const currentMap = { ...sessionsMapRef.current };
    const activeSess = currentMap[sessionId];
    if (
      !activeSess ||
      String(activeSess.userId ?? '') !== String(ownerUserId ?? '')
    ) return false;

    const nowIso = new Date().toISOString();
    const normalizedMsg = {
      id: messageObj.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sender: messageObj.sender || messageObj.role || 'user',
      role: messageObj.role || messageObj.sender || 'user',
      message: messageObj.message || messageObj.text || '',
      text: messageObj.text || messageObj.message || '',
      createdAt: messageObj.createdAt || nowIso,
      time: messageObj.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      ...messageObj,
    };

    const messages = activeSess.messages || [];
    const alreadyExists = messages.some(message => message.id === normalizedMsg.id);
    const updatedMessages = alreadyExists
      ? messages.map(message => (
        message.id === normalizedMsg.id ? { ...message, ...normalizedMsg } : message
      ))
      : [...messages, normalizedMsg];
    const updatedSession = {
      ...activeSess,
      messages: updatedMessages,
      updatedAt: nowIso,
    };

    currentMap[sessionId] = updatedSession;
    persistSessionsMap(currentMap, updatedSession);
    return true;
  }, [persistSessionsMap]);

  const removeMessageFromSession = useCallback((sessionId, ownerUserId, messageId) => {
    if (
      !sessionId ||
      !messageId ||
      String(identityEpochRef.current.userId ?? '') !== String(ownerUserId ?? '')
    ) return false;

    const currentMap = { ...sessionsMapRef.current };
    const session = currentMap[sessionId];
    if (!session || String(session.userId ?? '') !== String(ownerUserId ?? '')) return false;

    const updatedSession = {
      ...session,
      messages: (session.messages || []).filter(message => message.id !== messageId),
      updatedAt: new Date().toISOString(),
    };
    currentMap[sessionId] = updatedSession;
    persistSessionsMap(currentMap, updatedSession);
    return true;
  }, [persistSessionsMap]);

  const executeDiagnosticRequest = useCallback(async ({
    sessionId,
    ownerUserId,
    userMessageId,
    payload,
    formatResponse,
  }) => {
    const key = getRequestKey(sessionId, userMessageId);
    const ownerEpoch = identityEpochRef.current.epoch;
    const session = sessionsMapRef.current[sessionId];
    if (
      !session ||
      String(identityEpochRef.current.userId ?? '') !== String(ownerUserId ?? '') ||
      String(session.userId ?? '') !== String(ownerUserId ?? '')
    ) return { stale: true };

    if (inFlightRequestsRef.current.has(sessionId)) return { busy: true };
    inFlightRequestsRef.current.add(sessionId);

    try {
      const requestPayload = withRequestId(payload);
      requestPayloadsRef.current.set(key, { payload: requestPayload, ownerUserId, sessionId });
      setRequestStates(previous => ({
        ...previous,
        [key]: { status: 'pending', sessionId, userMessageId },
      }));
      removeMessageFromSession(sessionId, ownerUserId, `assistant-err-${userMessageId}`);

      let data;
      try {
        data = await vehicleApi.submitDiagnostic(requestPayload, token);
      } catch (error) {
        if (
          identityEpochRef.current.epoch !== ownerEpoch ||
          String(identityEpochRef.current.userId ?? '') !== String(ownerUserId ?? '')
        ) {
          setRequestStates(previous => {
            const next = { ...previous };
            delete next[key];
            return next;
          });
          requestPayloadsRef.current.delete(key);
          return { stale: true };
        }

        const inputType = requestPayload?.input_type
          || requestPayload?.diagnosis?.input_type
          || (requestPayload?.video ? 'video' : requestPayload?.image ? 'image' : requestPayload?.audio ? 'voice' : 'text');
        const plan = isAuthenticated ? 'free' : 'guest';
        const errorDetails = getAiErrorMessage({ error, inputType, plan });
        const errorText = errorDetails.message;
        const isRetryable = errorDetails.retryable;

        const savedError = addMessageToSession(sessionId, ownerUserId, {
          id: `assistant-err-${userMessageId}`,
          role: 'assistant',
          sender: 'assistant',
          text: errorText,
          message: errorText,
          requestErrorFor: userMessageId,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });
        setRequestStates(previous => ({
          ...previous,
          [key]: {
            status: savedError ? 'failed' : 'stale',
            sessionId,
            userMessageId,
            error: savedError ? errorText : undefined,
            retryable: savedError && isRetryable,
          },
        }));
        if (!savedError) requestPayloadsRef.current.delete(key);
        return { error };
      }

      if (
        identityEpochRef.current.epoch !== ownerEpoch ||
        String(identityEpochRef.current.userId ?? '') !== String(ownerUserId ?? '')
      ) return { stale: true };

      let text = formatResponse(data);
      if (data?.media_notice) {
        text = `⚠️ Note: ${data.media_notice}\n\n${text}`;
      }
      const assistantMessage = {
        id: `assistant-${userMessageId}`,
        role: 'assistant',
        sender: 'assistant',
        text,
        message: text,
        diagnosisData: (data?.type === 'diagnostic' || data?.status === 'needs_clarification'
          || (data?.clarification_questions && data.clarification_questions.length > 0)) ? data : null,
        clarificationQuestions: data?.clarification_questions || data?.clarificationQuestions || [],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      if (!addMessageToSession(sessionId, ownerUserId, assistantMessage)) {
        setRequestStates(previous => ({
          ...previous,
          [key]: { status: 'stale', sessionId, userMessageId },
        }));
        requestPayloadsRef.current.delete(key);
        return { stale: true };
      }
      setRequestStates(previous => ({
        ...previous,
        [key]: { status: 'succeeded', sessionId, userMessageId },
      }));
      requestPayloadsRef.current.delete(key);
      return { data };
    } catch (error) {
      if (
        identityEpochRef.current.epoch !== ownerEpoch ||
        String(identityEpochRef.current.userId ?? '') !== String(ownerUserId ?? '')
      ) {
        setRequestStates(previous => {
          const next = { ...previous };
          delete next[key];
          return next;
        });
        requestPayloadsRef.current.delete(key);
        return { stale: true };
      }

      addMessageToSession(sessionId, ownerUserId, {
        id: `assistant-err-${userMessageId}`,
        role: 'assistant',
        sender: 'assistant',
        text: 'The diagnostic response was received but could not be displayed. Please review your diagnostic history.',
        message: 'The diagnostic response was received but could not be displayed. Please review your diagnostic history.',
        requestErrorFor: userMessageId,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setRequestStates(previous => ({
        ...previous,
        [key]: {
          status: 'failed',
          sessionId,
          userMessageId,
          error: 'The diagnostic response was received but could not be displayed. Please review your diagnostic history.',
          retryable: false,
        },
      }));
      requestPayloadsRef.current.delete(key);
      console.error('[ChatContext] Failed to format diagnostic response:', error?.message);
      return { processingError: error };
    } finally {
      inFlightRequestsRef.current.delete(sessionId);
    }
  }, [addMessageToSession, removeMessageFromSession, token]);

  const retryDiagnosticRequest = useCallback(async ({
    sessionId,
    ownerUserId,
    userMessageId,
    formatResponse,
  }) => {
    const key = getRequestKey(sessionId, userMessageId);
    const request = requestPayloadsRef.current.get(key);
    const status = requestStates[key];
    if (
      !request ||
      !status ||
      status.status !== 'failed' ||
      !status.retryable ||
      String(request.ownerUserId ?? '') !== String(ownerUserId ?? '')
    ) return { stale: true };

    return executeDiagnosticRequest({
      sessionId,
      ownerUserId,
      userMessageId,
      payload: request.payload,
      formatResponse,
    });
  }, [executeDiagnosticRequest, requestStates]);

  const updateConversationUiState = useCallback((sessionId, updates) => {
    if (!sessionId) return;
    const session = sessionsMapRef.current[sessionId];
    if (
      !session ||
      String(session.userId ?? '') !== String(identityEpochRef.current.userId ?? '')
    ) return;
    setConversationUiState(previous => {
      const current = previous[sessionId] || {};
      const updated = typeof updates === 'function'
        ? updates(current)
        : { ...current, ...updates };
      return { ...previous, [sessionId]: updated };
    });
  }, []);

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

  const removeMessage = useCallback((messageId) => {
    if (!messageId) return;

    const currentMap = { ...sessionsMapRef.current };
    let activeSess = currentSession;
    if (!activeSess) return;

    const updatedMessages = activeSess.messages.filter(m => m.id !== messageId);
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
    setConversationUiState(previous => {
      const updated = { ...previous };
      delete updated[currentSession.id];
      return updated;
    });
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
    const ownerUserId = userId;
    const ownerEpoch = identityEpochRef.current.epoch;

    // Check local map first
    const currentMap = { ...sessionsMapRef.current };
    if (currentMap[cleanId]) {
      if (String(currentMap[cleanId].userId ?? '') !== String(ownerUserId ?? '')) return null;
      setCurrentSessionId(cleanId);
      return currentMap[cleanId];
    }

    // Otherwise fetch from Laravel
    if (isAuthenticated) {
      try {
        const serverSession = await vehicleApi.getChatSessionById(cleanId);
        if (
          identityEpochRef.current.epoch !== ownerEpoch ||
          String(identityEpochRef.current.userId ?? '') !== String(ownerUserId ?? '')
        ) return null;
        if (serverSession && serverSession.id) {
          const formattedSession = {
            id: serverSession.id,
            userId: ownerUserId,
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
  }, [isAuthenticated, userId]);

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
        currentSessionId: currentSession?.id || null,
        isLoading,
        loadActiveChat: restoreOrCreateActiveSession,
        initializeFreshChatSession: restoreOrCreateActiveSession,
        restoreOrCreateActiveSession,
        saveActiveChat,
        createNewSession,
        addMessage,
        addMessageToSession,
        removeMessageFromSession,
        updateMessage,
        removeMessage,
        requestStates,
        conversationUiState,
        updateConversationUiState,
        submitDiagnosticRequest: executeDiagnosticRequest,
        retryDiagnosticRequest,
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
