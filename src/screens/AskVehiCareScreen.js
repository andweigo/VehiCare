import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import NitroSound from 'react-native-nitro-sound';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import AILimitModal from '../components/AILimitModal';
import AIUsageDetailsModal from '../components/AIUsageDetailsModal';
import AiThinkingBubble from '../components/AiThinkingBubble';
import ConfirmActionModal from '../components/ConfirmActionModal';
import DiagnosisLimitModal from '../components/DiagnosisLimitModal';
import DiagnosticResultModal from '../components/DiagnosticResultModal';
import NearbyShopsModal from '../components/NearbyShopsModal';
import VideoPlayerModal from '../components/VideoPlayerModal';
import VoiceMessagePlayer from '../components/VoiceMessagePlayer';
import { vehicleApi } from '../api/vehicleApi';
import { fetchAIUsageStats } from '../services/aiUsageService';
import activityService from '../services/activity.service';

import { useAIUsage } from '../context/AIUsageContext';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useLanguage } from '../context/LanguageContext';
import { useSidebar } from '../context/SidebarContext';
import { useVehicle } from '../context/VehicleContext';

import {
  clearGuestDiagnosisCount,
  getGuestDiagnosisCount,
  incrementGuestDiagnosisCount,
} from '../services/storageService';

import { useTheme } from '../theme/ThemeContext';

import {
  getDisplayValue,
  getVehicleDisplayDetails,
  getVehicleDisplayName,
} from '../utils/vehicleDisplay';

/*
|--------------------------------------------------------------------------
| AI RESPONSE FORMATTER HELPER
| Safely formats structured AI responses into clean, human-readable text.
|--------------------------------------------------------------------------
*/
const STANDARD_OUT_OF_SCOPE_MSG =
  'Sorry, that question is unrelated to VehiCare. VehiCare is a vehicle-only diagnostic, repair, and maintenance system strictly for cars, motorcycles, and bicycles. I can only assist with vehicle diagnostics, troubleshooting, maintenance, repairs, and vehicle-related concerns.';

export const isExplicitlyUnrelated = (text, history = []) => {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();

  // Vehicle keywords
  const vehicleKeywords = [
    'car', 'auto', 'vehicle', 'motorcycle', 'motor', 'bike', 'bicycle', 'engine', 'brake',
    'tire', 'tyre', 'wheel', 'battery', 'oil', 'spark', 'chain', 'belt', 'clutch', 'transmission',
    'radiator', 'coolant', 'exhaust', 'muffler', 'suspension', 'steering', 'fuel', 'gasoline',
    'diesel', 'sniper', 'yamaha', 'honda', 'toyota', 'kawasaki', 'suzuki', 'vespa', 'bmw',
    'nissan', 'ford', 'hyundai', 'kia', 'mitsubishi', 'mazda', 'mechanic', 'repair', 'diagnostic',
    'symptom', 'noise', 'clicking', 'leak', 'smoke', 'overheating', 'starting', 'ignition', 'vehicare',
    'flat', 'puncture', 'rim', 'chain', 'pedal', 'derailleur', 'spoke', 'handlebar'
  ];

  const hasVehicleKeyword = vehicleKeywords.some(kw => lower.includes(kw));

  // Explicit off-topic question patterns
  const offTopicPatterns = [
    /what'?s the capital of/i,
    /capital of [a-z]+/i,
    /who is the president of/i,
    /who wrote [a-z]+/i,
    /solve (this )?(math|equation|\d+)/i,
    /recipe for/i,
    /how to cook/i,
    /write a (poem|story|song|essay) about/i,
    /tell me a joke about/i,
    /who won the (super bowl|world cup|nba|championship)/i,
    /weather in [a-z]+/i,
    /meaning of life/i,
    /who is [a-z]+ (actor|singer|president|celebrity)/i,
  ];

  const matchesOffTopic = offTopicPatterns.some(pattern => pattern.test(lower));

  if (matchesOffTopic && !hasVehicleKeyword) {
    return true;
  }

  return false;
};

const isPivotRejection = (str) => {
  if (typeof str !== 'string') return false;
  const lower = str.toLowerCase();
  return (
    lower.includes('however, as vehicare') ||
    lower.includes('however, as an ai') ||
    lower.includes('however, my main focus') ||
    (lower.includes('however') && lower.includes('vehicare ai')) ||
    (lower.includes('capital of') && lower.includes('vehicare'))
  );
};

export const findRootComplaint = (messages = [], fallbackText = '') => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return fallbackText || '';
  }

  const nonComplaintPatterns = [
    /^(hello|hi|hey|good morning|good afternoon|good evening|kumusta|kamusta|sup|yo|help|test)\b/i,
    /^(how can i fix|how to fix|what can i do|how do i fix|can you fix|fix it|guide me)\b/i,
    /^[a-d][.)]\s/i,
    /^(yes|no|none|not sure|i don't know|dont know|i'm not sure)$/i,
  ];

  const userMessages = messages.filter(m => (m.role === 'user' || m.sender === 'user') && (m.text || m.message));

  for (const m of userMessages) {
    const text = (m.text || m.message || '').trim();
    if (!text || text.length < 5) continue;
    const isNonComplaint = nonComplaintPatterns.some(pat => pat.test(text));
    if (!isNonComplaint) {
      return text;
    }
  }

  for (const m of messages) {
    if (m.diagnosisData && Array.isArray(m.diagnosisData.reported) && m.diagnosisData.reported.length > 0) {
      const rep = m.diagnosisData.reported[0];
      if (typeof rep === 'string' && rep.length >= 5 && !nonComplaintPatterns.some(pat => pat.test(rep))) {
        return rep;
      }
    }
  }

  for (const m of userMessages) {
    const text = (m.text || m.message || '').trim();
    if (text.length >= 5) return text;
  }

  return fallbackText || '';
};

export const FRIENDLY_OPENERS = [
  "Let's look into what might be going on here.",
  "Here is a breakdown of what these symptoms usually point to:",
  "Let's break down what could be happening step by step.",
  "Based on what you've described, here's what seems to be happening:",
  "Let's get this sorted out together.",
  "Here is what typically causes this kind of issue:",
  "No problem, let's track down what's behind this.",
  "Let's inspect what might be behind these symptoms:",
];

export const getRandomOpener = () => {
  const idx = Math.floor(Math.random() * FRIENDLY_OPENERS.length);
  return FRIENDLY_OPENERS[idx];
};

export const formatAiResponseText = (data) => {
  if (!data) {
    return 'How can I assist you with your vehicle today?';
  }

  // Check out of scope or pivot rejection
  if (data?.type === 'out_of_scope' || data?.status === 'out_of_scope') {
    return STANDARD_OUT_OF_SCOPE_MSG;
  }

  if (typeof data === 'string') {
    if (isPivotRejection(data)) {
      return STANDARD_OUT_OF_SCOPE_MSG;
    }
    const trimmed = data.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          data = parsed;
        }
      } catch (e) {
        return trimmed;
      }
    } else {
      return trimmed;
    }
  }

  // If data.response is an out-of-scope pivot string, sanitize immediately
  if (data && typeof data === 'object' && typeof data.response === 'string') {
    if (isPivotRejection(data.response) || data.type === 'out_of_scope') {
      return STANDARD_OUT_OF_SCOPE_MSG;
    }
    const respTrimmed = data.response.trim();
    if (respTrimmed.startsWith('{') && respTrimmed.endsWith('}')) {
      try {
        const parsedResp = JSON.parse(respTrimmed);
        if (parsedResp && typeof parsedResp === 'object') {
          data = parsedResp;
        }
      } catch (e) {
        // keep data
      }
    }
  }

  const isClarification =
    data.type === 'clarification' ||
    data.status === 'needs_clarification';

  if (isClarification) {
    const directText = (typeof data.response === 'string' && data.response.trim())
      || (typeof data.summary === 'string' && data.summary.trim())
      || (typeof data.whats_happening === 'string' && data.whats_happening.trim());

    if (directText) {
      const ackHeader = [data.follow_up_ack, data.diagnostic_progress].filter(Boolean).join('\n\n');
      return ackHeader ? `${ackHeader}\n\n${directText}` : directText;
    }
  }

  const isConversation =
    data.type === 'conversation' ||
    data.status === 'conversation' ||
    data.type === 'out_of_scope' ||
    data.status === 'out_of_scope' ||
    (Boolean(data.response) && !data.summary && !data.possible_causes);

  if (isConversation && data.response) {
    const respStr = typeof data.response === 'string' ? data.response.trim() : String(data.response);
    if (isPivotRejection(respStr)) {
      return STANDARD_OUT_OF_SCOPE_MSG;
    }
    if (respStr.startsWith('{') && respStr.endsWith('}')) {
      try {
        const nestedParsed = JSON.parse(respStr);
        if (nestedParsed && typeof nestedParsed === 'object' && (nestedParsed.summary || nestedParsed.possible_causes || nestedParsed.type === 'diagnostic')) {
          return formatAiResponseText(nestedParsed);
        }
      } catch (e) {
        // keep respStr
      }
    }
    return respStr;
  }

  const sections = [];

  // 1. What's happening to my vehicle? (Friendly, plain-language summary)
  const ackHeader = [data.follow_up_ack, data.diagnostic_progress].filter(Boolean).join('\n\n');
  let cleanWhatsHappening = (data.whats_happening || data.summary || data.response || '')
    .replace(/^Hey,?\s*no\s+worries!?\s*(We'll\s+(figure|narrow)\s+this\s+out\s+together\.?)?\s*/i, '')
    .replace(/^Here's\s+what('s)?\s+happening:?\s*/i, '')
    .trim();

  if (!cleanWhatsHappening) {
    cleanWhatsHappening = (data.summary || data.response || '').trim();
  }

  let whatsHappening;
  if (ackHeader) {
    whatsHappening = `${ackHeader}\n\nHere is what is most likely happening: ${cleanWhatsHappening}`.trim();
  } else {
    const hasCannedGreeting = /^Hey,?\s*no\s+worries/i.test(data.whats_happening || '');
    if (hasCannedGreeting || !data.whats_happening) {
      const isPhotoOverview = Boolean(data.image_vehicle_match && data.image_vehicle_match !== 'not_applicable');
      const opener = isPhotoOverview
        ? 'Based on visual inspection of your vehicle photo:'
        : getRandomOpener();
      whatsHappening = `${opener}\n${cleanWhatsHappening}`.trim();
    } else {
      whatsHappening = data.whats_happening.trim();
    }
  }
  sections.push(whatsHappening);

  // 2. What might be causing it? (Top 2-3 plausible causes in plain everyday language)
  const causes = Array.isArray(data.possible_causes)
    ? data.possible_causes
    : (Array.isArray(data.possibleCauses) ? data.possibleCauses : []);

  if (causes.length > 0) {
    const topCauses = causes.slice(0, 3);
    const causesList = topCauses.map((c, idx) => {
      const name = typeof c === 'string' ? c : (c?.cause || c?.name || 'Component Issue');
      const reason = typeof c === 'object' && c?.reason ? `\n   ${c.reason.trim()}` : '';
      return `${idx + 1}. ${name}${reason}`;
    }).join('\n\n');

    sections.push(`What might be causing it?\n\n${causesList}`);
  }

  // 3. Is it safe to keep using? (Cautious brake safety enforcement)
  const isBrakeIssue = Boolean(
    (Array.isArray(data.possible_causes) && data.possible_causes.some(c => /\bbrake\b/i.test(typeof c === 'string' ? c : (c?.cause || '')))) ||
    (Array.isArray(data.reported) && data.reported.some(r => /\bbrake\b/i.test(r))) ||
    (data.summary && /\bbrake\s+(noise|squeal|squeak|grind|pedal|lever|failure|problem|fluid|rotor|disc|caliper|pad)\b/i.test(data.summary)) ||
    (data.whats_happening && /\bbrake\s+(noise|squeal|squeak|grind|pedal|lever|failure|problem|fluid|rotor|disc|caliper|pad)\b/i.test(data.whats_happening))
  );

  if (data.safety_guidance) {
    let safetyText = data.safety_guidance.trim();
    if (isBrakeIssue && (safetyText.toLowerCase().includes('safe to continue') || safetyText.toLowerCase().includes('short distances'))) {
      safetyText = 'Brakes are a critical safety system. If you notice grinding, reduced braking feel, or abnormal brake behavior, stop safely and arrange a professional inspection rather than assuming continued travel is safe.';
    }
    sections.push(`Is it safe to use?\n${safetyText}`);
  } else if (data.severity || data.urgency) {
    const sev = String(data.severity || '').toUpperCase();
    if (isBrakeIssue) {
      sections.push(`Is it safe to use?\nBrakes are a critical safety system. If braking feels weaker, the sound is grinding, or the brake behaves abnormally, stop in a safe place and arrange an inspection rather than continuing travel.`);
    } else if (sev === 'CRITICAL' || sev === 'HIGH') {
      sections.push(`Is it safe to use?\nIf the issue is sudden, severe, or affects braking or steering, pull over somewhere safe and avoid continuing the ride until assessed. Arrange a safe inspection rather than assuming it's harmless.`);
    } else {
      sections.push(`Is it safe to use?\nIf the symptom is mild and intermittent, you can continue carefully for short distances, but arrange a safe checkup before long trips.`);
    }
  }

  // 4. Safe checks a beginner can perform
  const diyChecks = Array.isArray(data.safe_diy_checks) && data.safe_diy_checks.length > 0
    ? data.safe_diy_checks
    : (Array.isArray(data.recommended_actions) ? data.recommended_actions : (Array.isArray(data.recommendedActions) ? data.recommendedActions : []));

  if (diyChecks.length > 0) {
    const checksList = diyChecks.slice(0, 2).map(act => {
      const text = typeof act === 'string' ? act : (act?.action || act?.title || act?.text || String(act));
      return `• ${text.trim()}`;
    }).join('\n');
    sections.push(`Safe checks you can perform:\n${checksList}`);
  }

  // 5. When to ask a mechanic for help
  if (data.mechanic_guidance) {
    sections.push(`When to ask a mechanic for help:\n${data.mechanic_guidance.trim()}`);
  } else if (data.professional_help?.reason) {
    sections.push(`When to ask a mechanic for help:\n${data.professional_help.reason.trim()}`);
  } else if (String(data.severity || '').toUpperCase() === 'HIGH' || String(data.severity || '').toUpperCase() === 'CRITICAL') {
    sections.push(`When to ask a mechanic for help:\nIf unusual noises persist, warning lights stay on, or performance drops significantly, have a professional mechanic inspect it.`);
  }

  if (sections.length === 0) {
    return data.response || data.summary || 'Diagnostic evaluation complete.';
  }

  return sections.join('\n\n');
};

export default function AskVehiCareScreen({
  navigation,
  route,
}) {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const isDark = theme?.name === 'dark';
  const { openSidebar } = useSidebar();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const {
    currentSession,
    currentSessionId,
    messages: chatMessages,
    addMessage,
    addMessageToSession,
    removeMessageFromSession,
    requestStates,
    conversationUiState,
    updateConversationUiState,
    submitDiagnosticRequest,
    retryDiagnosticRequest,
    createNewSession,
    fetchChatSession,
    isLoading: isChatLoading,
  } = useChat();

  const {
    usage,
    refreshUsage,
    setQuotaExhausted,
    recordConsultationOptimistic,
    isDetailsModalVisible: isUsageDetailsModalVisible,
    openDetailsModal: openUsageDetailsModal,
    closeDetailsModal: closeUsageDetailsModal,
    feedbackNotice,
  } = useAIUsage();

  /*
  |--------------------------------------------------------------------------
  | VEHICLE CONTEXT
  |--------------------------------------------------------------------------
  */

  const {
    vehicles,
    activeVehicle,
    pendingVehicle,
    setActiveVehicleById,
  } = useVehicle();

  const vehicleProfile =
    isAuthenticated
      ? activeVehicle
      : pendingVehicle;

  const selectableVehicles = useMemo(
    () =>
      Array.isArray(vehicles)
        ? vehicles.filter(v => !v.isArchived && !v.archived_at)
        : [],
    [vehicles],
  );

  const vehicleName =
    getVehicleDisplayName(
      vehicleProfile,
      '',
    );

  const vehicleDetails =
    getVehicleDisplayDetails(
      vehicleProfile,
      'No vehicle selected',
    );

  const userName = user?.displayName || user?.name || '';

  /*
  |--------------------------------------------------------------------------
  | ALL STATE HOOKS (GROUPED FIRST)
  |--------------------------------------------------------------------------
  */

  const [isSendingLocally, setIsSendingLocally] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [guestUsageCount, setGuestUsageCount] = useState(0);
  const [showSignInLimitModal, setShowSignInLimitModal] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [nearbyModalVisible, setNearbyModalVisible] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [showAILimitModal, setShowAILimitModal] = useState(false);
  const [showMediaPickerModal, setShowMediaPickerModal] = useState(false);
  const [activePlaybackVideo, setActivePlaybackVideo] = useState(null);
  const [pendingVehicleToSwitch, setPendingVehicleToSwitch] = useState(null);
  const [showVehicleConfirmModal, setShowVehicleConfirmModal] = useState(false);
  const [showNewChatConfirmModal, setShowNewChatConfirmModal] = useState(false);
  const [freshChatNotice, setFreshChatNotice] = useState(null);
  const activeConversationUiState = conversationUiState[currentSessionId] || {};

  /*
  |--------------------------------------------------------------------------
  | ALL REF HOOKS (GROUPED SECOND)
  |--------------------------------------------------------------------------
  */

  const scrollRef = useRef(null);
  const textInputRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const screenMountedRef = useRef(false);
  const ownerUserId = user?.id || user?.uid || null;
  const setConversationField = useCallback((field, value) => {
    updateConversationUiState(currentSessionId, previous => ({
      ...previous,
      [field]: typeof value === 'function'
        ? value(previous[field] ?? (field === 'answeredQuestionIds' ? [] : null))
        : value,
    }));
  }, [currentSessionId, updateConversationUiState]);
  const message = activeConversationUiState.draft || '';
  const setMessage = useCallback(value => setConversationField('draft', value), [setConversationField]);
  const attachedImage = activeConversationUiState.attachedImage || null;
  const setAttachedImage = useCallback(value => setConversationField('attachedImage', value), [setConversationField]);
  const attachedVideo = activeConversationUiState.attachedVideo || null;
  const setAttachedVideo = useCallback(value => setConversationField('attachedVideo', value), [setConversationField]);
  const attachedAudio = activeConversationUiState.attachedAudio || null;
  const setAttachedAudio = useCallback(value => setConversationField('attachedAudio', value), [setConversationField]);
  const selectedQuestion = activeConversationUiState.selectedQuestion || null;
  const setSelectedQuestion = useCallback(value => setConversationField('selectedQuestion', value), [setConversationField]);
  const answeredQuestionIds = activeConversationUiState.answeredQuestionIds || [];
  const setAnsweredQuestionIds = useCallback(value => setConversationField('answeredQuestionIds', value), [setConversationField]);
  const isRequestPending = Object.values(requestStates).some(
    request => request.sessionId === currentSessionId && request.status === 'pending',
  );
  const isSending = isSendingLocally || isRequestPending;

  useEffect(() => {
    screenMountedRef.current = true;
    return () => {
      screenMountedRef.current = false;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | CALLBACKS & EFFECTS
  |--------------------------------------------------------------------------
  */

  const getDynamicWelcomeText = useCallback(() => {
    const greetingName = userName ? ` ${userName}` : '';
    const activeVeh = vehicleName ? ` ${vehicleName}` : ' your vehicle';

    if (language === 'fil') {
      return `Kamusta${greetingName}! Handa akong suriin ang iyong${activeVeh}. Ilarawan ang anumang sintomas o problema ng sasakyan.`;
    }
    if (language === 'taglish') {
      return `Hello${greetingName}! Ready akong i-analyze ang${activeVeh} mo. Describe any symptoms, sounds, or issues na napapansin mo.`;
    }
    return `Hello${greetingName}! I'm ready to analyze${activeVeh}. Describe any symptoms, sounds, or issues you're experiencing.`;
  }, [userName, vehicleName, language]);

  const loadUsageStats = useCallback(async () => {
    if (typeof refreshUsage === 'function') {
      const refreshed = await refreshUsage();
      if (refreshed) {
        if (screenMountedRef.current) setUsageStats(refreshed);
        return;
      }
    }
    const stats = await fetchAIUsageStats();
    if (stats && screenMountedRef.current) {
      setUsageStats(stats);
    }
  }, [refreshUsage]);

  const loadGuestUsage = useCallback(async () => {
    const count = await getGuestDiagnosisCount();
    setGuestUsageCount(count);
  }, []);

  const resetGuestUsage = useCallback(async () => {
    await clearGuestDiagnosisCount();
    setGuestUsageCount(0);
  }, []);

  const activeClarificationOptions = useMemo(() => {
    if (!selectedQuestion || isSending) {
      return [];
    }
    if (answeredQuestionIds.includes(selectedQuestion.id)) {
      return [];
    }
    return Array.isArray(selectedQuestion.options) ? selectedQuestion.options : [];
  }, [selectedQuestion, answeredQuestionIds, isSending]);

  useEffect(() => {
    if (isChatLoading) return;
    const freshWelcome = getDynamicWelcomeText();
    if (chatMessages.length === 0) {
      addMessage({
        id: `assistant-welcome-${Date.now()}`,
        role: 'assistant',
        sender: 'assistant',
        text: freshWelcome,
        message: freshWelcome,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    }
  }, [isChatLoading, chatMessages.length, getDynamicWelcomeText, addMessage]);

  const confirmNewChat = useCallback(() => {
    setShowNewChatConfirmModal(false);
    setMessage('');
    setAttachedImage(null);
    setAttachedVideo(null);
    setAttachedAudio(null);
    setSelectedDiagnosis(null);
    setIsSendingLocally(false);

    const rawId = vehicleProfile?.id || vehicleProfile?.vehicle_id;
    const vehicleId = (rawId && !isNaN(Number(rawId))) ? Number(rawId) : null;
    createNewSession(vehicleId, [
      {
        id: `assistant-welcome-${Date.now()}`,
        role: 'assistant',
        sender: 'assistant',
        text: getDynamicWelcomeText(),
        message: getDynamicWelcomeText(),
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);

    setFreshChatNotice(t('freshChatStarted', '✨ Fresh consultation started'));
    setTimeout(() => {
      if (screenMountedRef.current) {
        setFreshChatNotice(null);
      }
    }, 3500);

    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 80);
  }, [
    vehicleProfile,
    createNewSession,
    getDynamicWelcomeText,
    setMessage,
    setAttachedImage,
    setAttachedVideo,
    setAttachedAudio,
    t,
  ]);

  const handleNewChatPress = useCallback(() => {
    setShowNewChatConfirmModal(true);
  }, []);

  const historyId = route?.params?.historyId || route?.params?.sessionId;

  useEffect(() => {
    if (historyId) {
      const loadReopenedSession = async () => {
        const cleanId = String(historyId).replace(/^(chat:|diag-remote:|diagnosis:)/, '');
        const session = await fetchChatSession(cleanId);
        if (session) {
          scrollToBottom();
        }
      };
      loadReopenedSession();
    }
  }, [historyId, fetchChatSession]);

  useEffect(() => {
    loadUsageStats();
  }, [loadUsageStats, isAuthenticated]);

  useEffect(() => {
    loadGuestUsage();
  }, [loadGuestUsage]);

  useEffect(() => {
    if (isAuthenticated) {
      resetGuestUsage();
    } else {
      setGuestUsageCount(0);
    }
  }, [isAuthenticated, resetGuestUsage]);

  useEffect(() => {
    try {
      NitroSound.addPlaybackEndListener(() => {
        setPlayingAudioId(null);
      });

      NitroSound.addPlayBackListener(e => {
        if (e && e.duration > 0 && e.currentPosition >= e.duration) {
          setPlayingAudioId(null);
        }
      });
    } catch (err) {
      console.warn('[AskVehiCareScreen] Failed to attach sound listeners:', err);
    }

    return () => {
      try {
        NitroSound.removePlaybackEndListener();
        NitroSound.removePlayBackListener();
      } catch (err) {
        // ignore
      }
    };
  }, []);

  const handlePlayAudio = useCallback(async (messageId, audioUri) => {
    if (!audioUri) return;

    try {
      if (playingAudioId === messageId) {
        await NitroSound.stopPlayer();
        setPlayingAudioId(null);
        return;
      }

      await NitroSound.stopPlayer();
      setPlayingAudioId(messageId);
      await NitroSound.startPlayer(audioUri);
    } catch (err) {
      console.warn('[AskVehiCareScreen] Audio playback error:', err);
      setPlayingAudioId(null);
    }
  }, [playingAudioId]);

  /*
  |--------------------------------------------------------------------------
  | VEHICLE ICON
  |--------------------------------------------------------------------------
  */

  const getVehicleIconConfig = vehicle => {
    if (!vehicle) {
      return { name: 'directions-car' };
    }

    const typeStr = getDisplayValue(
      vehicle.vehicle_type ??
      vehicle.vehicleType ??
      vehicle.vehicle_type_name ??
      vehicle.type ??
      vehicle.custom_type,
      '',
    );

    const type = String(typeStr).toLowerCase();

    if (
      type.includes('motorcycle') ||
      type.includes('motorbike') ||
      type.includes('motor') ||
      type.includes('moto') ||
      type.includes('scooter') ||
      type.includes('moped') ||
      type.includes('two-wheeler') ||
      type.includes('2-wheeler') ||
      type.includes('tricycle')
    ) {
      return { name: 'two-wheeler' };
    }

    if (
      type.includes('bicycle') ||
      type.includes('cycle')
    ) {
      return { name: 'directions-bike' };
    }

    if (
      type.includes('bus') ||
      type.includes('minibus') ||
      type.includes('van') ||
      type.includes('coaster')
    ) {
      return { name: 'directions-bus' };
    }

    if (
      type.includes('truck') ||
      type.includes('pickup') ||
      type.includes('suv') ||
      type.includes('crossover') ||
      type.includes('jeep') ||
      type.includes('hauler')
    ) {
      return { name: 'local-shipping' };
    }

    return { name: 'directions-car' };
  };

  /*
  |--------------------------------------------------------------------------
  | VEHICLE DROPDOWN
  |--------------------------------------------------------------------------
  */

  const handleVehicleToggle = () => {
    setShowVehicleDropdown(
      current => !current,
    );
  };

  const handleVehicleSelect = async vehicle => {
    if (!vehicle) {
      return;
    }

    if (!isAuthenticated) {
      setShowVehicleDropdown(false);
      return;
    }

    const currentId = activeVehicle?.id || activeVehicle?.vehicle_id;
    if (currentId && String(currentId) === String(vehicle.id)) {
      setShowVehicleDropdown(false);
      return;
    }

    setPendingVehicleToSwitch(vehicle);
    setShowVehicleDropdown(false);
    setShowVehicleConfirmModal(true);
  };

  const confirmVehicleSwitch = async () => {
    if (!pendingVehicleToSwitch) return;

    const targetVehicle = pendingVehicleToSwitch;
    setPendingVehicleToSwitch(null);
    setShowVehicleConfirmModal(false);

    try {
      await setActiveVehicleById(targetVehicle.id);
    } catch (err) {
      console.warn('[AskVehiCareScreen] Error switching vehicle:', err);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | ADD VEHICLE
  |--------------------------------------------------------------------------
  */

  const handleAddVehicle = () => {
    setShowVehicleDropdown(false);

    if (!isAuthenticated) {
      Alert.alert(
        'Sign in required',
        'You need an account to add or manage your vehicle setup.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Sign In',
            onPress: () =>
              navigation.navigate(
                'Login',
              ),
          },
        ],
      );

      return;
    }

    navigation.navigate(
      'VehicleDetails',
    );
  };

  /*
  |--------------------------------------------------------------------------
  | DEVICE PERMISSIONS (CAMERA, MEDIA LIBRARY, AUDIO/MICROPHONE)
  |--------------------------------------------------------------------------
  */

  const requestAudioPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const isAlreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      );
      if (isAlreadyGranted) {
        return true;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission Required',
          message: 'VehiCare needs access to your microphone to record audio of vehicle sounds and symptoms.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      Alert.alert(
        'Microphone Access Required',
        'VehiCare needs microphone permission to record audio of your vehicle sound symptoms. Please grant permission in App Info settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
        ],
      );
      return false;
    } catch (err) {
      console.warn('[AskVehiCareScreen] Microphone permission error:', err);
      return false;
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const isAlreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.CAMERA,
      );
      if (isAlreadyGranted) {
        return true;
      }

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission Required',
          message: 'VehiCare needs access to your camera to take photos or record videos of your vehicle symptoms.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Camera Permission Permanently Denied',
          'Camera permission is needed to capture photos and videos of vehicle issues. Please enable it in App Info settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      } else {
        Alert.alert(
          'Camera Permission Denied',
          'VehiCare needs camera access to capture vehicle symptoms.',
        );
      }
      return false;
    } catch (err) {
      console.warn('[AskVehiCareScreen] Camera permission error:', err);
      return false;
    }
  };

  const requestMediaLibraryPermission = async (mediaType = 'photo') => {
    if (Platform.OS !== 'android') {
      return true;
    }

    // Android 13+ (API 33+) uses the system Photo Picker which requires no storage permissions.
    if (Platform.Version >= 33) {
      return true;
    }

    // Android 10-12 (API 29-32) supports scoped storage for system picker
    if (Platform.Version >= 29) {
      return true;
    }

    try {
      const targetPermission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
      const isAlreadyGranted = await PermissionsAndroid.check(targetPermission);
      if (isAlreadyGranted) {
        return true;
      }

      const granted = await PermissionsAndroid.request(targetPermission, {
        title: `${mediaType === 'video' ? 'Video' : 'Photo'} Library Permission Required`,
        message: `VehiCare needs access to pick ${mediaType === 'video' ? 'videos' : 'photos'} of vehicle symptoms.`,
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        Alert.alert(
          'Media Library Access Permanently Denied',
          `VehiCare needs permission to access your ${mediaType === 'video' ? 'videos' : 'photos'}. Please grant access in App Info settings.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
          ],
        );
      }
      return false;
    } catch (err) {
      console.warn('[AskVehiCareScreen] Media library permission error:', err);
      return false;
    }
  };

  /*
  |--------------------------------------------------------------------------
  | GUEST LIMIT
  |--------------------------------------------------------------------------
  */

  const MAX_GUEST_DIAGNOSES = 5;

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({
        animated: true,
      });
    }, 100);
  };



  const incrementGuestUsage =
    async () => {
      const next =
        await incrementGuestDiagnosisCount();

      if (screenMountedRef.current) setGuestUsageCount(next);

      return next;
    };

  const isGuestLimitExceeded =
    () => {
      return (
        !isAuthenticated &&
        guestUsageCount >=
          MAX_GUEST_DIAGNOSES
      );
    };

  const requireSignInForGuest =
    async () => {
      if (isGuestLimitExceeded()) {
        setShowSignInLimitModal(
          true,
        );

        return true;
      }

      return false;
    };

  /*
  |--------------------------------------------------------------------------
  | SEND MESSAGE
  |--------------------------------------------------------------------------
  */

  const handleOwnShopSelected = () => {
    Alert.prompt(
      'Preferred Repair Shop',
      'Enter the name of your preferred repair shop or mechanic:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Choice',
          onPress: async (shopName) => {
            if (shopName && shopName.trim()) {
              try {
                await vehicleApi.createServiceReferral({
                  diagnostic_id: selectedDiagnosis?.id || null,
                  shop_name: shopName.trim(),
                  is_custom_shop: true,
                  notes: 'User specified preferred external repair shop',
                });
                Alert.alert('Shop Selection Noted', `Recorded your preferred repair shop: "${shopName.trim()}".`);
              } catch (e) {
                // Ignore silent error
              }
            }
          },
        },
      ],
      'plain-text',
    );
  };

  const handleDiagnosticResponse = async resultData => {
    const isDiagnostic = resultData?.type === 'diagnostic';
    const isClarificationNeeded = resultData?.status === 'needs_clarification'
      || (resultData?.clarification_questions && resultData.clarification_questions.length > 0);

    if (isDiagnostic || isClarificationNeeded) {
      if (!isAuthenticated) {
        await incrementGuestUsage();
      }
      if (typeof recordConsultationOptimistic === 'function') {
        recordConsultationOptimistic();
      }
    }

    if (resultData?.status === 'diagnosis_ready' || (!isClarificationNeeded && isDiagnostic)) {
      if (screenMountedRef.current) setSelectedDiagnosis(resultData);

      const diagProblem =
        resultData?.diagnosis?.problem ||
        resultData?.problem ||
        resultData?.diagnosis_title ||
        resultData?.title ||
        'Vehicle Issue';
      const diagSummary =
        resultData?.diagnosis?.summary ||
        resultData?.summary ||
        resultData?.description ||
        `Completed diagnosis for ${diagProblem}.`;

      const isSavedVehicleTarget = resultData?.vehicle?.is_saved_vehicle !== false;
      const targetVehId = isSavedVehicleTarget ? (resultData?.vehicle?.id || activeVehicle?.id || activeVehicle?.vehicle_id) : null;
      const targetVehName = resultData?.vehicle?.name || activeVehicle?.name || activeVehicle?.make || 'Vehicle';

      activityService.addActivity({
        type: 'diagnosis_completed',
        title: `Diagnosis: ${diagProblem}`,
        description: diagSummary,
        vehicleId: targetVehId,
        vehicleName: targetVehName,
        userId: ownerUserId,
        metadata: {
          diagnosisId: resultData?.id || resultData?.diagnosis_id || null,
          severity: resultData?.diagnosis?.severity || resultData?.severity || 'medium',
          isAlternateVehicle: !isSavedVehicleTarget,
          imageVehicleMatch: resultData?.image_vehicle_match || 'not_applicable',
        },
      });

      if (resultData?.image_vehicle_match === 'possible_mismatch') {
        const details = resultData?.image_vehicle_details;
        const detectedDesc = [details?.category, details?.estimated_make, details?.estimated_model].filter(Boolean).join(' ') || 'a different vehicle';
        Alert.alert(
          'Vehicle Mismatch Detected',
          `The uploaded photo appears to depict ${detectedDesc} rather than your saved vehicle. VehiCare has evaluated the photo as an alternate vehicle without modifying your saved vehicle profile.`
        );
      }
    }

    await loadUsageStats();
  };

  const handleDiagnosticFailure = async error => {
    const responseReason = error?.response?.data?.reason;
    if (responseReason !== 'ai_limit_reached' && error?.response?.status !== 403) {
      return;
    }

    const errorData = error?.response?.data || {};
    if (typeof setQuotaExhausted === 'function') {
      setQuotaExhausted({
        limit: errorData.limit || 20,
        used: errorData.used || 20,
        remaining: 0,
        exhausted: true,
        period: errorData.period || 'monthly',
        reset_at: errorData.reset_at || null,
      });
    }

    if (screenMountedRef.current) {
      if (typeof openUsageDetailsModal === 'function') {
        openUsageDetailsModal();
      }
      setShowAILimitModal(true);
    }
    await loadUsageStats();
  };

  const sendMessage = async (overrideText = null) => {
    const isCustomOverride = typeof overrideText === 'string';
    const textToSend = isCustomOverride ? overrideText : message;
    const trimmed = textToSend.trim();
    if ((!trimmed && !attachedImage && !attachedVideo && !attachedAudio) || isSendingLocally) {
      return;
    }

    if (!isAuthenticated) {
      if (await requireSignInForGuest()) {
        return;
      }
    }

    const currentImage = attachedImage;
    const currentVideo = attachedVideo;
    const currentAudio = attachedAudio;
    setAttachedImage(null);
    setAttachedVideo(null);
    setAttachedAudio(null);

    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      sender: 'user',
      text: trimmed,
      message: trimmed,
      audioUri: currentAudio?.uri || null,
      imageUri: currentImage?.uri || null,
      videoUri: currentVideo?.uri || null,
      videoDuration: currentVideo?.durationSec || null,
      videoSizeMb: currentVideo?.fileSizeMb || null,
      time,
    };

    const requestSessionId = currentSessionId;
    const requestOwnerUserId = ownerUserId;
    if (
      !requestSessionId ||
      !addMessageToSession(requestSessionId, requestOwnerUserId, userMessage)
    ) {
      return;
    }

    if (trimmed && isExplicitlyUnrelated(trimmed, chatMessages)) {
      const outOfScopeReply = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        sender: 'assistant',
        text: STANDARD_OUT_OF_SCOPE_MSG,
        message: STANDARD_OUT_OF_SCOPE_MSG,
        diagnosisData: null,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      addMessageToSession(requestSessionId, requestOwnerUserId, outOfScopeReply);
      if (!isCustomOverride) {
        setMessage('');
      }
      setIsSendingLocally(false);
      return;
    }

    if (selectedQuestion?.id) {
      setAnsweredQuestionIds(prev => [...prev, selectedQuestion.id]);
      setSelectedQuestion(null);
    }
    if (!isCustomOverride) {
      setMessage('');
    }
    setIsSendingLocally(true);
    scrollToBottom();

    try {
      const rawId = vehicleProfile?.id || vehicleProfile?.vehicle_id;
      const vehicleId = (rawId && !isNaN(Number(rawId))) ? Number(rawId) : null;
      const rawType = vehicleProfile?.vehicle_type?.name || vehicleProfile?.vehicle_type || vehicleProfile?.type || 'car';
      const safeVehicleType = typeof rawType === 'string' ? rawType : (rawType?.name || rawType?.title || 'car');
      const rawName = vehicleName || activeVehicle?.name || activeVehicle?.make || 'Active Vehicle';
      const safeVehicleName = typeof rawName === 'string' ? rawName : (rawName?.name || rawName?.brand || 'Active Vehicle');

      const history = chatMessages.slice(-6).map(m => ({
        role: m.role || m.sender || 'user',
        content: m.text || m.message || '',
      }));
      const diagnosticState = {
        assessments: chatMessages
          .filter(m => m?.diagnosisData?.type === 'diagnostic')
          .slice(-3)
          .map(({ diagnosisData }) => ({
            status: diagnosisData.status === 'needs_clarification' ? 'needs_clarification' : 'diagnosis_ready',
            summary: typeof diagnosisData.summary === 'string' ? diagnosisData.summary.slice(0, 500) : '',
            reported: Array.isArray(diagnosisData.reported)
              ? diagnosisData.reported.filter(value => typeof value === 'string').slice(0, 5).map(value => value.slice(0, 200))
              : [],
            observed: Array.isArray(diagnosisData.observed)
              ? diagnosisData.observed.filter(value => typeof value === 'string').slice(0, 5).map(value => value.slice(0, 200))
              : [],
            possible_causes: Array.isArray(diagnosisData.possible_causes)
              ? diagnosisData.possible_causes.slice(0, 5).map(cause => ({
                cause: typeof cause === 'string' ? cause.slice(0, 200) : String(cause?.cause || '').slice(0, 200),
              }))
              : [],
            clarification_questions: Array.isArray(diagnosisData.clarification_questions)
              ? diagnosisData.clarification_questions.slice(0, 5).map(question => ({
                question: typeof question === 'string' ? question.slice(0, 300) : String(question?.question || '').slice(0, 300),
              }))
              : [],
          })),
      };

      const rootComplaint = findRootComplaint(chatMessages, trimmed);

      const activeSymptoms = trimmed || (currentAudio ? 'Voice consultation or audio recording of vehicle symptoms' : currentVideo ? 'Visual and audio vehicle video analysis' : 'Visual component analysis');
      const payload = {
        vehicle_id: vehicleId,
        vehicle_name: safeVehicleName,
        vehicle_type: safeVehicleType,
        symptoms: activeSymptoms,
        root_symptom: rootComplaint,
        input_type: currentAudio ? 'voice' : currentVideo ? 'video' : currentImage ? 'image' : 'text',
        video_duration: currentVideo?.durationSec || 0,
        audio_duration: currentAudio?.durationSec || 0,
        history,
        diagnostic_state: diagnosticState,
      };

      const media = currentAudio || currentVideo || currentImage;
      let requestPayload = payload;
      if (media) {
        requestPayload = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (key === 'history') {
            value.forEach((turn, index) => {
              requestPayload.append(`history[${index}][role]`, turn.role);
              requestPayload.append(`history[${index}][content]`, turn.content);
            });
          } else if (key === 'diagnostic_state') {
            requestPayload.append(key, JSON.stringify(value));
          } else {
            requestPayload.append(key, String(value));
          }
        });

        const mediaField = currentAudio ? 'audio' : currentVideo ? 'video' : 'image';
        requestPayload.append(mediaField, {
          uri: media.uri,
          name: media.fileName || (currentAudio ? 'voice_note.mp4' : currentVideo ? 'video.mp4' : 'photo.jpg'),
          type: media.mime || (currentAudio ? 'audio/mp4' : currentVideo ? 'video/mp4' : 'image/jpeg'),
        });
      }

      const outcome = await submitDiagnosticRequest({
        sessionId: requestSessionId,
        ownerUserId: requestOwnerUserId,
        userMessageId: userMessage.id,
        payload: requestPayload,
        formatResponse: formatAiResponseText,
      });

      if (outcome.busy) {
        if (trimmed && !isCustomOverride) {
          setMessage(trimmed);
        }
        removeMessageFromSession(requestSessionId, requestOwnerUserId, userMessage.id);
        return;
      }
      if (outcome.stale) return;
      if (outcome.error) {
        console.warn('[AskVehiCareScreen] AI request failed:', outcome.error?.message);
        await handleDiagnosticFailure(outcome.error);
        return;
      }
      if (outcome.data) {
        await handleDiagnosticResponse(outcome.data);
      }
    } catch (err) {
      console.error('[AskVehiCareScreen] AI Request Failed:', {
        axiosMessage: err?.message,
        httpStatus: err?.response?.status,
      });
    } finally {
      if (screenMountedRef.current) {
        setIsSendingLocally(false);
        scrollToBottom();
      }
    }
  };

  const handleRetryDiagnostic = async userMessageId => {
    if (!currentSessionId || isSendingLocally) return;
    setIsSendingLocally(true);
    try {
      const outcome = await retryDiagnosticRequest({
        sessionId: currentSessionId,
        ownerUserId,
        userMessageId,
        formatResponse: formatAiResponseText,
      });

      if (outcome.stale || outcome.busy) return;
      if (outcome.error) {
        await handleDiagnosticFailure(outcome.error);
        return;
      }
      if (outcome.data) {
        await handleDiagnosticResponse(outcome.data);
      }
    } catch (error) {
      console.error('[AskVehiCareScreen] Failed to retry AI request:', error?.message);
    } finally {
      if (screenMountedRef.current) {
        setIsSendingLocally(false);
        scrollToBottom();
      }
    }
  };

  /*
  |--------------------------------------------------------------------------
  | MEDIA SELECTION (PHOTOS & VIDEOS)
  |--------------------------------------------------------------------------
  */

  const handleMediaOption = (action) => {
    setShowMediaPickerModal(false);
    setTimeout(() => {
      if (typeof action === 'function') {
        action();
      }
    }, 200);
  };

  const capturePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        if (result.errorCode === 'camera_unavailable') {
          Alert.alert('Camera Unavailable', 'Camera hardware is not available on this device.');
        } else if (result.errorCode === 'permission') {
          Alert.alert('Camera Permission Needed', 'Camera permission was not granted. Please allow camera access in App Info settings.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]);
        } else {
          Alert.alert('Camera Error', result.errorMessage || 'Unable to open camera.');
        }
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Photo Error', 'No image file was captured.');
        return;
      }

      const rawUri = asset.uri;
      const fileName = asset.fileName || (rawUri ? rawUri.split('/').pop() : null) || 'camera_photo.jpg';
      const mime = asset.type || (fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

      setAttachedVideo(null);
      setAttachedImage({
        uri: rawUri,
        fileName,
        mime,
      });
    } catch (err) {
      console.warn('[AskVehiCareScreen] Camera Photo Error:', err);
      Alert.alert('Camera Error', 'An unexpected error occurred while launching the camera.');
    }
  };

  const selectPhoto = async () => {
    const hasPermission = await requestMediaLibraryPermission('photo');
    if (!hasPermission) return;

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        if (result.errorCode === 'permission') {
          Alert.alert('Photo Access Needed', 'Permission to access photos was not granted. Please allow access in App Info settings.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]);
        } else {
          Alert.alert('Gallery Error', result.errorMessage || 'Unable to open image gallery.');
        }
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) {
        Alert.alert('Gallery Error', 'No image file was selected.');
        return;
      }

      const rawUri = asset.uri;
      const fileName = asset.fileName || (rawUri ? rawUri.split('/').pop() : null) || 'photo.jpg';
      const mime = asset.type || (fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

      setAttachedVideo(null);
      setAttachedImage({
        uri: rawUri,
        fileName,
        mime,
      });
    } catch (err) {
      console.warn('[AskVehiCareScreen] Photo Pick Error:', err);
      Alert.alert('Gallery Error', 'An unexpected error occurred while selecting a photo.');
    }
  };

  const captureVideo = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await launchCamera({
        mediaType: 'video',
        videoQuality: Platform.OS === 'android' ? 'low' : 'medium',
        durationLimit: usageStats?.video?.max_duration_seconds || 30,
        saveToPhotos: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Video Camera Error', result.errorMessage || 'Unable to record video.');
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const videoConfig = usageStats?.video || { max_size_mb: 15, max_duration_seconds: 30 };
      const fileSizeMb = Number(((asset.fileSize || 0) / (1024 * 1024)).toFixed(1));
      const durationSec = Math.round(asset.duration || 0);

      if (fileSizeMb > Number(videoConfig.max_size_mb || 15)) {
        Alert.alert(
          'Video Too Large',
          `This video is ${fileSizeMb} MB. Your plan allows videos up to ${videoConfig.max_size_mb} MB.`
        );
        return;
      }

      if (durationSec > Number(videoConfig.max_duration_seconds || 30)) {
        Alert.alert(
          'Video Too Long',
          `This video is ${durationSec}s long. Your plan allows videos up to ${videoConfig.max_duration_seconds} seconds.`
        );
        return;
      }

      setAttachedImage(null);
      setAttachedVideo({
        uri: asset.uri,
        fileName: asset.fileName || 'recorded_video.mp4',
        fileSizeMb,
        durationSec,
        mime: asset.type || 'video/mp4',
      });
    } catch (err) {
      console.warn('[AskVehiCareScreen] Camera Video Error:', err);
    }
  };

  const selectVideo = async () => {
    const hasPermission = await requestMediaLibraryPermission('video');
    if (!hasPermission) return;

    try {
      const result = await launchImageLibrary({
        mediaType: 'video',
        selectionLimit: 1,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Gallery Video Error', result.errorMessage || 'Unable to select video.');
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const videoConfig = usageStats?.video || { max_size_mb: 15, max_duration_seconds: 30 };
      const fileSizeMb = Number(((asset.fileSize || 0) / (1024 * 1024)).toFixed(1));
      const durationSec = Math.round(asset.duration || 0);

      if (fileSizeMb > Number(videoConfig.max_size_mb || 15)) {
        Alert.alert(
          'Video Too Large',
          `This video is ${fileSizeMb} MB. Your plan allows videos up to ${videoConfig.max_size_mb} MB.`
        );
        return;
      }

      if (durationSec > Number(videoConfig.max_duration_seconds || 30)) {
        Alert.alert(
          'Video Too Long',
          `This video is ${durationSec}s long. Your plan allows videos up to ${videoConfig.max_duration_seconds} seconds.`
        );
        return;
      }

      setAttachedImage(null);
      setAttachedVideo({
        uri: asset.uri,
        fileName: asset.fileName || 'selected_video.mp4',
        fileSizeMb,
        durationSec,
        mime: asset.type || 'video/mp4',
      });
    } catch (err) {
      console.warn('[AskVehiCareScreen] Select Video Error:', err);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | RECORDING
  |--------------------------------------------------------------------------
  */

  const formatRecordingTime = secs => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const startRecording = async () => {
    if (!isAuthenticated) {
      if (await requireSignInForGuest()) {
        return;
      }
    }

    const permission = await requestAudioPermission();
    if (!permission) {
      return;
    }

    try {
      setAttachedAudio(null);
      setRecordingSeconds(0);
      await NitroSound.startRecorder();
      setIsRecording(true);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(sec => sec + 1);
      }, 1000);
    } catch (error) {
      Alert.alert('Recording error', 'Unable to start audio recording.');
    }
  };

  const stopRecording = async () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    try {
      const uri = await NitroSound.stopRecorder();
      setIsRecording(false);

      if (uri) {
        setAttachedImage(null);
        setAttachedVideo(null);
        setAttachedAudio({
          uri,
          durationSec: recordingSeconds || 1,
          fileName: 'voice_note.mp4',
          mime: 'audio/mp4',
        });
      }
    } catch (err) {
      console.warn('[AskVehiCareScreen] Stop recorder error:', err);
      setIsRecording(false);
    }
  };

  const cancelRecording = async () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    try {
      await NitroSound.stopRecorder();
    } catch (err) {
      // ignore
    }
    setIsRecording(false);
    setRecordingSeconds(0);
    setAttachedAudio(null);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };



  /*
  |--------------------------------------------------------------------------
  | LIMIT MODAL
  |--------------------------------------------------------------------------
  */

  const handleCloseLimitModal =
    () => {
      setShowSignInLimitModal(false);
    };

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <SafeAreaView
      style={[
        styles.screen,
        {
          backgroundColor:
            theme.background,
        },
      ]}
    >
      <StatusBar
        barStyle={
          theme.name === 'dark'
            ? 'light-content'
            : 'dark-content'
        }
        backgroundColor={
          theme.background
        }
      />

      <DiagnosisLimitModal
        visible={
          showSignInLimitModal
        }
        onClose={
          handleCloseLimitModal
        }
        onCreateAccount={() => {
          setShowSignInLimitModal(
            false,
          );

          navigation.navigate(
            'Register',
          );
        }}
        onSignIn={() => {
          setShowSignInLimitModal(
            false,
          );

          navigation.navigate(
            'Login',
          );
        }}
        onMaybeLater={
          handleCloseLimitModal
        }
      />

      {/* ==================================================
          HEADER (TIER 1)
      ================================================== */}

      <View
        style={[
          styles.header,
          {
            borderBottomColor:
              theme.border,
          },
        ]}
      >
        <Pressable
          style={[
            styles.backButton,
            {
              backgroundColor:
                theme.surfaceAlt,
            },
          ]}
          onPress={() =>
            navigation?.goBack()
          }
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={theme.text}
          />
        </Pressable>

        <View
          style={styles.headerCenter}
        >
          <View
            style={
              styles.headerTitleRow
            }
          >
            <Text
              style={[
                styles.headerTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              VehiCare
            </Text>

            <View
              style={[
                styles.aiBadge,
                {
                  backgroundColor:
                    theme.surfaceAlt,
                  borderColor:
                    theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.aiBadgeDot,
                  {
                    backgroundColor:
                      theme.accent,
                  },
                ]}
              />

              <Text
                style={[
                  styles.aiBadgeText,
                  {
                    color:
                      theme.accent,
                  },
                ]}
              >
                AI
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.headerSubtitle,
              {
                color:
                  theme.textSecondary,
              },
            ]}
            numberOfLines={1}
          >
            {t('askVehiCareSubtitle', 'Your intelligent vehicle assistant')}
          </Text>
        </View>

        {/* TOP RIGHT ACTION ROW: NEW CHAT (PEN ICON) + SIDEBAR TOGGLE */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable
            style={({ pressed }) => [
              styles.headerIconButton,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
              },
              pressed && styles.headerButtonPressed,
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleNewChatPress}
            accessibilityRole="button"
            accessibilityLabel="Start New Chat"
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={theme.accent || '#F63B05'}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.headerMenuButton,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
              },
              pressed && styles.headerButtonPressed,
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => openSidebar()}
            accessibilityRole="button"
            accessibilityLabel="Open Sidebar Menu"
          >
            <MaterialIcons
              name="menu"
              size={22}
              color={theme.text}
            />
          </Pressable>
        </View>
      </View>

      {/* AI CONSULTATION FEEDBACK BANNER */}
      {(feedbackNotice || freshChatNotice) && (
        <View
          testID="ai-consultation-feedback-banner"
          style={[
            styles.feedbackBanner,
            {
              backgroundColor: isDark ? 'rgba(246, 59, 5, 0.12)' : '#FFF2EE',
              borderColor: isDark ? 'rgba(246, 59, 5, 0.35)' : '#FDD8D0',
            },
          ]}
        >
          <Feather name="check-circle" size={14} color={theme.accent || '#F63B05'} />
          <Text style={[styles.feedbackBannerText, { color: theme.accent || '#F63B05' }]}>
            {freshChatNotice || feedbackNotice}
          </Text>
        </View>
      )}

      {/* ==================================================
          VEHICLE SELECTOR BAR (TIER 2)
      ================================================== */}

      <View
        style={[
          styles.vehicleSubBarContainer,
          {
            backgroundColor: theme.background,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <Pressable
          style={[
            styles.vehicleSubBar,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.border,
            },
          ]}
          onPress={handleVehicleToggle}
        >
          <View style={styles.vehicleSubBarLeft}>
            <MaterialIcons
              name={getVehicleIconConfig(vehicleProfile).name}
              size={17}
              color={theme.accent}
            />
            <Text style={[styles.vehicleSubBarLabel, { color: theme.textSecondary }]}>
              Active Vehicle:
            </Text>
            <Text style={[styles.vehicleSubBarTitle, { color: theme.text }]} numberOfLines={1}>
              {vehicleName}
            </Text>
          </View>

          <Ionicons
            name={showVehicleDropdown ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={theme.textSecondary}
          />
        </Pressable>

      </View>

      {/* VEHICLE SELECTION MODAL DROPDOWN */}
      <Modal
        visible={showVehicleDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVehicleDropdown(false)}
      >
        <TouchableOpacity
          style={styles.dropdownModalBackdrop}
          activeOpacity={1}
          onPress={() => setShowVehicleDropdown(false)}
        >
          <View
            style={[
              styles.vehicleDropdownModal,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                top: insets.top + (Platform.OS === 'ios' ? 104 : 96),
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Text
              style={[
                styles.dropdownLabel,
                { color: theme.textSecondary },
              ]}
            >
              DIAGNOSTIC VEHICLE
            </Text>

            {isAuthenticated && selectableVehicles.length > 0 ? (
              <ScrollView
                style={styles.vehicleList}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {selectableVehicles.map(vehicle => {
                  const isActive =
                    activeVehicle &&
                    String(activeVehicle.id) === String(vehicle.id);

                  return (
                    <TouchableOpacity
                      key={vehicle.id}
                      activeOpacity={0.75}
                      style={[
                        styles.vehicleOption,
                        {
                          backgroundColor: isActive ? theme.surfaceAlt : 'transparent',
                          borderColor: isActive ? theme.border : 'transparent',
                        },
                      ]}
                      onPress={() => handleVehicleSelect(vehicle)}
                    >
                      <View
                        style={[
                          styles.vehicleOptionIcon,
                          {
                            backgroundColor: isActive
                              ? theme.accent + '18'
                              : theme.surfaceAlt,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name={getVehicleIconConfig(vehicle).name}
                          size={18}
                          color={isActive ? theme.accent : theme.textSecondary}
                        />
                      </View>

                      <View style={styles.vehicleOptionInfo}>
                        <Text
                          style={[
                            styles.vehicleOptionName,
                            { color: theme.text },
                          ]}
                          numberOfLines={1}
                        >
                          {getVehicleDisplayName(vehicle, 'Vehicle')}
                        </Text>

                        <Text
                          style={[
                            styles.vehicleOptionDetails,
                            { color: theme.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {getVehicleDisplayDetails(
                            vehicle,
                            'Vehicle details unavailable',
                          )}
                        </Text>
                      </View>

                      {isActive && (
                        <View
                          style={[
                            styles.activeBadge,
                            { backgroundColor: theme.accent + '18' },
                          ]}
                        >
                          <View
                            style={[
                              styles.activeDot,
                              { backgroundColor: theme.accent },
                            ]}
                          />
                          <Text
                            style={[
                              styles.activeBadgeText,
                              { color: theme.accent },
                            ]}
                          >
                            ACTIVE
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyVehicleState}>
                <Ionicons
                  name="car-outline"
                  size={22}
                  color={theme.textSecondary}
                />
                <Text
                  style={[
                    styles.emptyVehicleText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {isAuthenticated
                    ? 'No vehicles found'
                    : 'Guest vehicle'}
                </Text>
              </View>
            )}

            {/* CURRENT VEHICLE */}
            <View
              style={[
                styles.currentVehicleBox,
                { borderTopColor: theme.border },
              ]}
            >
              <View style={styles.currentVehicleHeader}>
                <Text
                  style={[
                    styles.currentVehicleLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  CURRENTLY ANALYZING
                </Text>

                <View
                  style={[
                    styles.currentActiveBadge,
                    { backgroundColor: theme.accent + '18' },
                  ]}
                >
                  <View
                    style={[
                      styles.activeDot,
                      { backgroundColor: theme.accent },
                    ]}
                  />
                  <Text
                    style={[
                      styles.activeBadgeText,
                      { color: theme.accent },
                    ]}
                  >
                    ACTIVE
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.currentVehicleName,
                  { color: theme.text },
                ]}
                numberOfLines={1}
              >
                {vehicleName}
              </Text>

              <Text
                style={[
                  styles.currentVehicleDetails,
                  { color: theme.textSecondary },
                ]}
                numberOfLines={2}
              >
                {vehicleDetails}
              </Text>
            </View>

            {/* ADD VEHICLE */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.dropdownAction,
                { backgroundColor: theme.accent },
                !isAuthenticated && styles.dropdownActionDisabled,
              ]}
              onPress={handleAddVehicle}
            >
              <Ionicons
                name={isAuthenticated ? 'add' : 'lock-closed-outline'}
                size={16}
                color={isAuthenticated ? theme.surface : theme.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.dropdownActionText,
                  { color: isAuthenticated ? theme.surface : theme.textSecondary },
                ]}
              >
                {isAuthenticated ? 'Add New Vehicle' : 'Sign in to unlock'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ==================================================
          CHAT
      ================================================== */}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? 60
            : 20
        }
      >
        <ScrollView
          ref={scrollRef}
          style={styles.chat}
          contentContainerStyle={
            styles.chatContent
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
        >
          {chatMessages.map(
            item =>
              item.role ===
              'assistant' ? (
                <View
                  key={item.id}
                  style={
                    styles.assistantContainer
                  }
                >
                  <View
                    style={[
                      styles.aiAvatar,
                      {
                        borderColor:
                          theme.border,
                      },
                    ]}
                  >
                    <View
                      style={
                        styles.aiAvatarInner
                      }
                    >
                      <Image
                        source={require('../assets/logo.png')}
                        style={
                          styles.aiIcon
                        }
                        resizeMode="contain"
                      />
                    </View>
                  </View>

                  <View
                    style={
                      styles.assistantBody
                    }
                  >
                    <View
                      style={[
                        styles.assistantBubble,
                        {
                          backgroundColor:
                            theme.surfaceAlt,
                          borderColor:
                            theme.border,
                        },
                      ]}
                    >
                      {item.audioUri ? (
                        <VoiceMessagePlayer
                          audioUri={item.audioUri}
                          isPlaying={playingAudioId === item.id}
                          onTogglePlay={() => handlePlayAudio(item.id, item.audioUri)}
                          isUser={false}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.assistantText,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {typeof item.text === 'object' || typeof item.message === 'object'
                            ? formatAiResponseText(item.diagnosisData || item.text || item.message)
                            : (item.text || item.message || '')}
                        </Text>
                      )}

                      {(() => {
                        const clarQuestions = item.clarificationQuestions || item.diagnosisData?.clarification_questions || item.diagnosisData?.clarificationQuestions || [];
                        if (!Array.isArray(clarQuestions) || clarQuestions.length === 0) return null;

                        return (
                          <View style={{ marginTop: 12, gap: 8 }}>
                            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 10, color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Clarification Required (Tap to answer):
                            </Text>
                            {clarQuestions.map((qItem, qIdx) => {
                              const qId = `q-${item.id}-${qIdx}`;
                              const isAnswered = answeredQuestionIds.includes(qId);
                              const isSelected = selectedQuestion?.id === qId;

                              const qTitle = typeof qItem === 'string' ? qItem : (qItem.question || qItem.title || qItem.text || 'Clarification Question');

                              let opts = [];
                              if (typeof qItem === 'string') {
                                if (qItem.toLowerCase().includes(' or ')) {
                                  opts = qItem.split(/ or /i).map(p => p.replace(/[?.,!]/g, '').trim()).filter(Boolean);
                                }
                              } else if (qItem && typeof qItem === 'object') {
                                opts = Array.isArray(qItem.options) ? qItem.options.filter(Boolean) : [];
                                if (opts.length === 0 && qTitle.toLowerCase().includes(' or ')) {
                                  opts = qTitle.split(/ or /i).map(p => p.replace(/[?.,!]/g, '').trim()).filter(Boolean);
                                }
                              }

                              return (
                                <TouchableOpacity
                                  key={qId}
                                  style={[
                                    styles.questionChip,
                                    {
                                      backgroundColor: isAnswered
                                        ? 'rgba(16, 185, 129, 0.12)'
                                        : (isSelected ? theme.accent + '1E' : theme.surfaceAlt),
                                      borderColor: isAnswered
                                        ? '#10B981'
                                        : (isSelected ? theme.accent : theme.border),
                                    },
                                  ]}
                                  disabled={isAnswered || isSending}
                                  activeOpacity={0.8}
                                  onPress={() => {
                                    if (isSelected) {
                                      setSelectedQuestion(null);
                                    } else {
                                      setSelectedQuestion({
                                        id: qId,
                                        question: qTitle,
                                        options: opts,
                                      });
                                    }
                                  }}
                                >
                                  <View style={styles.questionChipHeader}>
                                    <Ionicons
                                      name={isAnswered ? "checkmark-circle" : (isSelected ? "help-circle" : "help-circle-outline")}
                                      size={16}
                                      color={isAnswered ? "#10B981" : (isSelected ? theme.accent : theme.textSecondary)}
                                    />
                                    <Text
                                      style={[
                                        styles.questionChipText,
                                        {
                                          color: isAnswered ? '#10B981' : (isSelected ? theme.accent : theme.text),
                                          fontFamily: isSelected || isAnswered ? 'Inter-SemiBold' : 'Inter-Medium',
                                        },
                                      ]}
                                    >
                                      {qTitle}
                                    </Text>
                                  </View>
                                  {isAnswered && (
                                    <View style={styles.lockedBadge}>
                                      <Text style={styles.lockedBadgeText}>ANSWERED</Text>
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        );
                      })()}

                      {item.diagnosisData && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              backgroundColor: isDark ? 'rgba(246, 59, 5, 0.15)' : '#FFF2EE',
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: theme.accent || '#F63B05',
                            }}
                            onPress={() => {
                              setSelectedDiagnosis(item.diagnosisData);
                              setResultModalVisible(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <Feather name="bar-chart-2" size={14} color={theme.accent || '#F63B05'} />
                            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 11, color: theme.accent || '#F63B05' }}>
                              View Detailed Assessment →
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: theme.border,
                              backgroundColor: theme.surfaceAlt || 'rgba(255, 255, 255, 0.05)',
                            }}
                            disabled={isSendingLocally}
                            onPress={handleNewChatPress}
                            activeOpacity={0.8}
                          >
                            <Feather name="plus-circle" size={13} color={theme.textSecondary} />
                            <Text style={{ fontFamily: 'Outfit-Medium', fontSize: 11, color: theme.text }}>
                              Start New Chat
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      {item.requestErrorFor && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                          {requestStates[`${currentSessionId}:${item.requestErrorFor}`]?.status === 'failed'
                            && requestStates[`${currentSessionId}:${item.requestErrorFor}`]?.retryable && (
                            <TouchableOpacity
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: theme.accent,
                                backgroundColor: theme.accentSoft || 'rgba(246, 59, 5, 0.08)',
                              }}
                              disabled={isSendingLocally}
                              onPress={() => handleRetryDiagnostic(item.requestErrorFor)}
                              activeOpacity={0.8}
                            >
                              <Feather name="rotate-ccw" size={13} color={theme.accent} />
                              <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 11, color: theme.accent }}>
                                Try Again
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: theme.border,
                              backgroundColor: theme.surfaceAlt || 'rgba(255, 255, 255, 0.05)',
                            }}
                            disabled={isSendingLocally}
                            onPress={() => setShowMediaPickerModal(true)}
                            activeOpacity={0.8}
                          >
                            <Feather name="paperclip" size={13} color={theme.textSecondary} />
                            <Text style={{ fontFamily: 'Outfit-Medium', fontSize: 11, color: theme.text }}>
                              Upload Another File
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: theme.border,
                              backgroundColor: theme.surfaceAlt || 'rgba(255, 255, 255, 0.05)',
                            }}
                            disabled={isSendingLocally}
                            onPress={() => {
                              textInputRef.current?.focus();
                            }}
                            activeOpacity={0.8}
                          >
                            <Feather name="edit-3" size={13} color={theme.textSecondary} />
                            <Text style={{ fontFamily: 'Outfit-Medium', fontSize: 11, color: theme.text }}>
                              Describe in Words
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: 6,
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: isDark ? 'rgba(246, 59, 5, 0.35)' : '#FDD8D0',
                              backgroundColor: isDark ? 'rgba(246, 59, 5, 0.12)' : '#FFF2EE',
                            }}
                            disabled={isSendingLocally}
                            onPress={handleNewChatPress}
                            activeOpacity={0.8}
                          >
                            <Feather name="plus-circle" size={13} color={theme.accent || '#F63B05'} />
                            <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 11, color: theme.accent || '#F63B05' }}>
                              Start New Chat
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    <Text
                      style={[
                        styles.assistantTime,
                        {
                          color:
                            theme.textSecondary,
                        },
                      ]}
                    >
                      {item.time}
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  key={item.id}
                  style={
                    styles.userMessageContainer
                  }
                >
                  <View
                    style={[
                      styles.userBubble,
                      {
                        backgroundColor: theme.accent,
                        padding: item.imageUri ? 4 : 12,
                        overflow: 'hidden',
                      },
                    ]}
                  >
                    {item.videoUri ? (
                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={() => setActivePlaybackVideo(item.videoUri)}
                        style={{ width: 220, padding: 6 }}
                      >
                        <View style={{ width: '100%', height: 120, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(246, 59, 5, 0.9)', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 3 }} />
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={{ fontFamily: 'Inter-Bold', fontSize: 11.5, color: theme.surface }}>
                            ▶ Play Video ({item.videoSizeMb || 'Media'} MB)
                          </Text>
                          <Text style={{ fontFamily: 'Inter-Medium', fontSize: 10, color: 'rgba(255, 255, 255, 0.85)' }}>
                            {item.videoDuration ? `${item.videoDuration}s` : ''}
                          </Text>
                        </View>
                        {item.text ? (
                          <Text style={[styles.userMessageText, { color: theme.surface, marginTop: 4 }]}>
                            {item.text}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    ) : item.audioUri ? (
                      <VoiceMessagePlayer
                        audioUri={item.audioUri}
                        isPlaying={playingAudioId === item.id}
                        onTogglePlay={() => handlePlayAudio(item.id, item.audioUri)}
                        isUser={true}
                      />
                    ) : item.imageUri ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setFullScreenImage(item.imageUri)}
                      >
                        <Image
                          source={{ uri: item.imageUri }}
                          style={styles.chatImageBubble}
                          resizeMode="cover"
                        />
                        {item.text ? (
                          <Text
                            style={[
                              styles.userMessageText,
                              {
                                color: theme.surface,
                                paddingHorizontal: 8,
                                paddingTop: 6,
                                paddingBottom: 4,
                              },
                            ]}
                          >
                            {item.text}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    ) : (
                      <Text
                        style={[
                          styles.userMessageText,
                          {
                            color: theme.surface,
                          },
                        ]}
                      >
                        {item.text}
                      </Text>
                    )}
                  </View>

                  <View
                    style={
                      styles.messageMeta
                    }
                  >
                    <Text
                      style={[
                        styles.messageTime,
                        {
                          color:
                            theme.textSecondary,
                        },
                      ]}
                    >
                      {item.time}
                    </Text>

                    <Ionicons
                      name="checkmark-done"
                      size={14}
                      color={
                        theme.accent
                      }
                    />
                  </View>
                </View>
              ),
          )}

          {isSending && <AiThinkingBubble />}
        </ScrollView>

        {/* DRAFT ATTACHED IMAGE OR VIDEO PREVIEW */}
        {attachedImage && (
          <View
            style={[
              styles.draftMediaCard,
              {
                backgroundColor: isDark ? '#141416' : '#FFFFFF',
                borderColor: isDark ? '#262629' : '#E2E8F0',
              },
            ]}
          >
            <TouchableOpacity
              style={styles.draftMediaContainer}
              activeOpacity={0.85}
              onPress={() => setFullScreenImage(attachedImage.uri)}
            >
              <Image source={{ uri: attachedImage.uri }} style={styles.draftMediaThumbnail} />
              <View style={styles.draftMediaOverlayBadge}>
                <Ionicons name="expand" size={11} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.draftMediaTextInfo}>
              <View style={styles.draftMediaTagRow}>
                <View
                  style={[
                    styles.draftMediaTag,
                    {
                      backgroundColor: isDark
                        ? 'rgba(16, 185, 129, 0.15)'
                        : '#DCFCE7',
                    },
                  ]}
                >
                  <Ionicons name="image" size={11} color="#10B981" />
                  <Text style={[styles.draftMediaTagText, { color: '#10B981' }]}>
                    PHOTO READY
                  </Text>
                </View>
              </View>
              <Text style={[styles.draftMediaTitle, { color: theme.text }]} numberOfLines={1}>
                {attachedImage.fileName || 'Attached Photo'}
              </Text>
              <Text style={[styles.draftMediaSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                Tap thumbnail to view • Ready for diagnosis
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.removeDraftMediaBtn,
                { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
              ]}
              onPress={() => setAttachedImage(null)}
              activeOpacity={0.75}
              accessibilityLabel="Remove photo"
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {attachedVideo && (
          <View
            style={[
              styles.draftMediaCard,
              {
                backgroundColor: isDark ? '#141416' : '#FFFFFF',
                borderColor: isDark ? '#262629' : '#E2E8F0',
              },
            ]}
          >
            <TouchableOpacity
              style={styles.draftMediaContainer}
              activeOpacity={0.85}
              onPress={() => setActivePlaybackVideo(attachedVideo.uri)}
            >
              <View
                style={[
                  styles.draftMediaThumbnail,
                  {
                    backgroundColor: isDark ? '#1C1C1F' : '#F1F5F9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                ]}
              >
                <Ionicons name="videocam" size={24} color={theme.accent} />
                <View style={styles.videoPlayCircle}>
                  <Ionicons name="play" size={12} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.draftMediaTextInfo}
              activeOpacity={0.85}
              onPress={() => setActivePlaybackVideo(attachedVideo.uri)}
            >
              <View style={styles.draftMediaTagRow}>
                <View
                  style={[
                    styles.draftMediaTag,
                    {
                      backgroundColor: isDark
                        ? 'rgba(246, 59, 5, 0.15)'
                        : '#FFF2EE',
                    },
                  ]}
                >
                  <Ionicons name="videocam" size={11} color={theme.accent} />
                  <Text style={[styles.draftMediaTagText, { color: theme.accent }]}>
                    VIDEO ({attachedVideo.fileSizeMb} MB)
                  </Text>
                </View>
              </View>
              <Text style={[styles.draftMediaTitle, { color: theme.text }]} numberOfLines={1}>
                {attachedVideo.fileName || 'Attached Video'}
              </Text>
              <Text style={[styles.draftMediaSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                Duration: {attachedVideo.durationSec}s • Tap to play preview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.removeDraftMediaBtn,
                { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
              ]}
              onPress={() => setAttachedVideo(null)}
              activeOpacity={0.75}
              accessibilityLabel="Remove video"
            >
              <Ionicons name="trash-outline" size={15} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* LIVE RECORDING BAR */}
        {isRecording && (
          <View style={[styles.draftImageBar, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
              <View style={[styles.recordingDot, { backgroundColor: '#EF4444' }]} />
              <Text style={[styles.draftImageTitle, { color: theme.text }]}>
                Recording... {formatRecordingTime(recordingSeconds)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.removeDraftImageBtn, { position: 'relative', top: 0, right: 0, backgroundColor: '#EF4444' }]}
              onPress={cancelRecording}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={12} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.removeDraftImageBtn, { position: 'relative', top: 0, right: 0, backgroundColor: theme.accent }]}
              onPress={stopRecording}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* DRAFT ATTACHED AUDIO PREVIEW */}
        {attachedAudio && !isRecording && (
          <View style={[styles.draftImageBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <VoiceMessagePlayer
                audioUri={attachedAudio.uri}
                isPlaying={playingAudioId === 'draft-audio'}
                onTogglePlay={() => handlePlayAudio('draft-audio', attachedAudio.uri)}
                isUser={false}
              />
            </View>
            <TouchableOpacity
              style={[styles.removeDraftImageBtn, { position: 'relative', top: 0, right: 0, backgroundColor: '#EF4444' }]}
              onPress={() => {
                if (playingAudioId === 'draft-audio') {
                  handlePlayAudio('draft-audio', attachedAudio.uri);
                }
                setAttachedAudio(null);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={12} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* FLOATING QUICK-REPLY ANSWER PILLS ABOVE INPUT */}
        {activeClarificationOptions.length > 0 && (
          <View style={[styles.quickReplyBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.quickReplyHeaderRow}>
              <Ionicons name="sparkles" size={13} color={theme.accent} />
              <Text style={[styles.quickReplyTitle, { color: theme.textSecondary }]}>
                Tap an answer to clarify:
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickReplyScroll}
            >
              {activeClarificationOptions.map((optText, optIdx) => (
                <TouchableOpacity
                  key={`quick-pill-${optIdx}`}
                  style={[styles.quickReplyPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.accent }]}
                  disabled={isSending}
                  activeOpacity={0.75}
                  onPress={() => sendMessage(optText)}
                >
                  <Text style={[styles.quickReplyPillText, { color: theme.accent }]}>
                    {optText}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ==================================================
            INPUT
        ================================================== */}

        <View
          style={[
            styles.inputArea,
            {
              backgroundColor:
                theme.background,
              borderTopColor:
                theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor:
                  theme.surfaceAlt,
                borderColor:
                  theme.border,
              },
            ]}
          >
            <Pressable
              style={[
                styles.addButton,
                {
                  backgroundColor:
                    theme.surfaceAlt,
                },
              ]}
              onPress={() => setShowMediaPickerModal(true)}
            >
              <Ionicons
                name="add"
                size={22}
                color={
                  theme.textSecondary
                }
              />
            </Pressable>

            <TextInput
              ref={textInputRef}
              value={message}
              onChangeText={
                setMessage
              }
              placeholder={t('askVehiCareInput', 'Ask VehiCare')}
              placeholderTextColor={
                theme.placeholder
              }
              style={[
                styles.textInput,
                {
                  color:
                    theme.text,
                },
              ]}
              multiline
              maxLength={1000}
              returnKeyType="send"
              onSubmitEditing={
                sendMessage
              }
            />

            <Pressable
              style={[
                styles.inputAction,
                {
                  backgroundColor:
                    theme.surfaceAlt,
                },
              ]}
              onPress={
                toggleRecording
              }
            >
              <Feather
                name={
                  isRecording
                    ? 'stop-circle'
                    : 'mic'
                }
                size={19}
                color={
                  isRecording
                    ? theme.accent
                    : theme.textSecondary
                }
              />
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  theme.surfaceAlt,
                borderColor:
                  theme.border,
              },
              (message.trim().length > 0 || Boolean(attachedImage) || Boolean(attachedVideo) || Boolean(attachedAudio)) && {
                backgroundColor:
                  theme.accent,
                borderColor:
                  theme.accent,
              },
            ]}
            onPress={sendMessage}
          >
            <Ionicons
              name="arrow-up"
              size={21}
              color={
                (message.trim().length > 0 || Boolean(attachedImage) || Boolean(attachedVideo) || Boolean(attachedAudio))
                  ? theme.surface
                  : theme.textSecondary
              }
            />
          </Pressable>
        </View>

        <Text
          style={[
            styles.disclaimer,
            {
              color:
                theme.textSecondary,
              backgroundColor:
                theme.background,
            },
          ]}
        >
          VehiCare AI provides assistance and does not replace professional mechanical inspection.
        </Text>
      </KeyboardAvoidingView>

      <DiagnosticResultModal
        visible={resultModalVisible}
        onClose={() => setResultModalVisible(false)}
        diagnosis={selectedDiagnosis}
        vehicleName={vehicleName}
        onFindNearbyShops={() => {
          setResultModalVisible(false);
          navigation.navigate('RepairShops', {
            initialOption: 'find',
            diagnosis: selectedDiagnosis,
          });
        }}
        onOwnShopSelected={() => {
          setResultModalVisible(false);
          navigation.navigate('RepairShops', {
            initialOption: 'own',
            diagnosis: selectedDiagnosis,
          });
        }}
        onUpgrade={() => navigation.navigate('ManagePlan')}
      />

      <NearbyShopsModal
        visible={nearbyModalVisible}
        onClose={() => setNearbyModalVisible(false)}
        diagnosticId={selectedDiagnosis?.id}
        vehicleType={vehicleProfile?.vehicle_type?.name || vehicleProfile?.type || 'car'}
      />

      <AIUsageDetailsModal
        visible={Boolean(isUsageDetailsModalVisible || showAILimitModal)}
        onClose={() => {
          if (typeof closeUsageDetailsModal === 'function') {
            closeUsageDetailsModal();
          }
          setShowAILimitModal(false);
        }}
        usage={usage || usageStats}
        onCreateAccount={() => {
          if (typeof closeUsageDetailsModal === 'function') {
            closeUsageDetailsModal();
          }
          setShowAILimitModal(false);
          navigation.navigate('Register');
        }}
        onSignIn={() => {
          if (typeof closeUsageDetailsModal === 'function') {
            closeUsageDetailsModal();
          }
          setShowAILimitModal(false);
          navigation.navigate('Login');
        }}
        onUpgrade={() => {
          if (typeof closeUsageDetailsModal === 'function') {
            closeUsageDetailsModal();
          }
          setShowAILimitModal(false);
          navigation.navigate('ManagePlan');
        }}
      />

      {/* MEDIA ATTACHMENT MODAL */}
      {/* ATTACH MEDIA BOTTOM SHEET MODAL */}
      {/* ATTACH MEDIA MODAL */}
      <Modal
        visible={showMediaPickerModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowMediaPickerModal(false)}
      >
        <View style={styles.mediaModalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowMediaPickerModal(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardWrap}
          >
            <View
              style={[
                styles.mediaModalCard,
                {
                  backgroundColor: isDark ? '#141416' : '#FFFFFF',
                  borderColor: isDark ? '#262629' : '#E2E8F0',
                },
              ]}
            >
              {/* Header Row: Badge Pill + Circular X Close Button */}
              <View style={styles.mediaModalHeaderRow}>
                <View
                  style={[
                    styles.mediaModalBadgePill,
                    {
                      backgroundColor: isDark
                        ? 'rgba(246, 59, 5, 0.15)'
                        : '#FFF2EE',
                    },
                  ]}
                >
                  <Ionicons name="attach" size={13} color={theme.accent} />
                  <Text style={[styles.mediaModalBadgeText, { color: theme.accent }]}>
                    ATTACH MEDIA
                  </Text>
                </View>

                <Pressable
                  onPress={() => setShowMediaPickerModal(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={[
                    styles.closeCircleBtn,
                    { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
                  ]}
                  accessibilityLabel="Close dialog"
                >
                  <Ionicons name="close" size={16} color={isDark ? '#A1A1AA' : '#64748B'} />
                </Pressable>
              </View>

              {/* Title & Subtitle */}
              <Text style={[styles.mediaModalTitle, { color: theme.text }]}>
                Upload Diagnostic Media
              </Text>
              <Text style={[styles.mediaModalSubtitle, { color: theme.textSecondary }]}>
                Attach photos or video of symptoms, dash indicators, or parts.
              </Text>

              <View
                style={[
                  styles.mediaModalDivider,
                  { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
                ]}
              />

              {/* 2x2 Option Grid */}
              <View style={styles.mediaOptionGrid}>
                {/* 1. Take Photo */}
                <TouchableOpacity
                  style={[
                    styles.mediaGridCard,
                    {
                      backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                      borderColor: isDark ? '#262629' : '#E2E8F0',
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => handleMediaOption(capturePhoto)}
                >
                  <View
                    style={[
                      styles.mediaGridIconBox,
                      {
                        backgroundColor: isDark
                          ? 'rgba(246, 59, 5, 0.15)'
                          : '#FFF2EE',
                      },
                    ]}
                  >
                    <Ionicons name="camera" size={20} color={theme.accent} />
                  </View>
                  <Text style={[styles.mediaGridTitle, { color: theme.text }]}>
                    Take Photo
                  </Text>
                  <Text style={[styles.mediaGridSubtitle, { color: theme.textSecondary }]}>
                    Camera snap
                  </Text>
                </TouchableOpacity>

                {/* 2. Choose Photo */}
                <TouchableOpacity
                  style={[
                    styles.mediaGridCard,
                    {
                      backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                      borderColor: isDark ? '#262629' : '#E2E8F0',
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => handleMediaOption(selectPhoto)}
                >
                  <View
                    style={[
                      styles.mediaGridIconBox,
                      {
                        backgroundColor: isDark
                          ? 'rgba(245, 158, 11, 0.15)'
                          : '#FEF3C7',
                      },
                    ]}
                  >
                    <Ionicons name="images" size={20} color="#F59E0B" />
                  </View>
                  <Text style={[styles.mediaGridTitle, { color: theme.text }]}>
                    Photo Gallery
                  </Text>
                  <Text style={[styles.mediaGridSubtitle, { color: theme.textSecondary }]}>
                    Select from library
                  </Text>
                </TouchableOpacity>

                {/* 3. Record Video */}
                <TouchableOpacity
                  style={[
                    styles.mediaGridCard,
                    {
                      backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                      borderColor: isDark ? '#262629' : '#E2E8F0',
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => handleMediaOption(captureVideo)}
                >
                  <View
                    style={[
                      styles.mediaGridIconBox,
                      {
                        backgroundColor: isDark
                          ? 'rgba(140, 123, 255, 0.15)'
                          : '#F3E8FF',
                      },
                    ]}
                  >
                    <Ionicons name="videocam" size={20} color="#8C7BFF" />
                  </View>
                  <Text style={[styles.mediaGridTitle, { color: theme.text }]}>
                    Record Video
                  </Text>
                  <Text style={[styles.mediaGridSubtitle, { color: theme.textSecondary }]}>
                    Max {usageStats?.video?.max_duration_seconds || 30}s
                  </Text>
                </TouchableOpacity>

                {/* 4. Choose Video */}
                <TouchableOpacity
                  style={[
                    styles.mediaGridCard,
                    {
                      backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
                      borderColor: isDark ? '#262629' : '#E2E8F0',
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => handleMediaOption(selectVideo)}
                >
                  <View
                    style={[
                      styles.mediaGridIconBox,
                      {
                        backgroundColor: isDark
                          ? 'rgba(16, 185, 129, 0.15)'
                          : '#DCFCE7',
                      },
                    ]}
                  >
                    <Ionicons name="film" size={20} color="#10B981" />
                  </View>
                  <Text style={[styles.mediaGridTitle, { color: theme.text }]}>
                    Video Gallery
                  </Text>
                  <Text style={[styles.mediaGridSubtitle, { color: theme.textSecondary }]}>
                    Max {usageStats?.video?.max_size_mb || 15} MB
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Footer Note */}
              <View
                style={[
                  styles.mediaModalTipRow,
                  {
                    backgroundColor: isDark ? '#1C1C1F' : '#F1F5F9',
                  },
                ]}
              >
                <Ionicons name="shield-checkmark" size={13} color={theme.accent} />
                <Text
                  style={[
                    styles.mediaModalTipText,
                    { color: theme.textSecondary },
                  ]}
                >
                  Media is securely inspected by VehiCare AI diagnostic models.
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* FULL SCREEN IMAGE PREVIEW MODAL */}
      <Modal
        visible={Boolean(fullScreenImage)}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={styles.fullScreenImageModal}>
          <TouchableOpacity
            style={styles.closeFullScreenBtn}
            onPress={() => setFullScreenImage(null)}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* FULL SCREEN VIDEO PLAYER MODAL */}
      <VideoPlayerModal
        visible={Boolean(activePlaybackVideo)}
        videoUri={activePlaybackVideo}
        onClose={() => setActivePlaybackVideo(null)}
      />

      {/* VEHICLE SWITCH CONFIRMATION MODAL */}
      <ConfirmActionModal
        visible={showVehicleConfirmModal}
        title="Change Active Vehicle?"
        message={`Switching your active vehicle to "${getVehicleDisplayName(pendingVehicleToSwitch, 'Selected Vehicle')}" will update your active vehicle across VehiCare.`}
        primaryLabel="Switch Vehicle"
        secondaryLabel="Cancel"
        onConfirm={confirmVehicleSwitch}
        onCancel={() => {
          setShowVehicleConfirmModal(false);
          setPendingVehicleToSwitch(null);
        }}
      />

      {/* NEW CHAT CONFIRMATION MODAL */}
      <ConfirmActionModal
        visible={showNewChatConfirmModal}
        badgeLabel="NEW CONVERSATION"
        icon="chat"
        title="Start New Chat?"
        message="Your current conversation will remain saved in your history, and a fresh chat session will start."
        primaryLabel="Start New Chat"
        secondaryLabel="Cancel"
        onConfirm={confirmNewChat}
        onCancel={() => setShowNewChatConfirmModal(false)}
      />
    </SafeAreaView>
  );
}

/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  flex: {
    flex: 1,
  },

  /*
  |--------------------------------------------------------------------------
  | HEADER
  |--------------------------------------------------------------------------
  */

  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },

  quotaPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 13,
    borderWidth: 1,
    gap: 5,
  },
  quotaPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  quotaPillText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Inter-SemiBold',
    letterSpacing: 0.2,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  feedbackBannerText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  newChatHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  newChatPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
  },
  newChatPillText: {
    fontSize: 13,
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.2,
  },
  headerMenuButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.96 }],
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  headerCenter: {
    flex: 1,
  },

  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 18,
  },

  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 7,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  aiBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },

  aiBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 7,
    letterSpacing: 0.7,
  },

  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 9.5,
    marginTop: 2,
  },

  /*
  |--------------------------------------------------------------------------
  | VEHICLE SELECTOR SUB-BAR
  |--------------------------------------------------------------------------
  */

  vehicleSubBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    zIndex: 90,
  },

  vehicleSubBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },

  vehicleSubBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },

  vehicleSubBarLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
  },

  vehicleSubBarTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12.5,
    flex: 1,
  },

  dropdownModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },

  vehicleDropdownModal: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    elevation: 25,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },

  vehicleDropdown: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    zIndex: 100,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },

  dropdownLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  vehicleList: {
    maxHeight: 230,
  },

  vehicleOption: {
    minHeight: 62,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 9,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  vehicleOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  vehicleOptionInfo: {
    flex: 1,
    minWidth: 0,
  },

  vehicleOptionName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    marginBottom: 3,
  },

  vehicleOptionDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
  },

  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 5,
    marginLeft: 6,
  },

  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },

  activeBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 7,
    letterSpacing: 0.6,
  },

  currentVehicleBox: {
    borderTopWidth: 1,
    paddingTop: 11,
    marginTop: 5,
    marginBottom: 10,
  },

  currentVehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },

  currentVehicleLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 7,
    letterSpacing: 0.8,
  },

  currentActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },

  currentVehicleName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    marginBottom: 3,
  },

  currentVehicleDetails: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    lineHeight: 14,
  },

  emptyVehicleState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },

  emptyVehicleText: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    marginTop: 6,
  },

  dropdownAction: {
    minHeight: 42,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  dropdownActionDisabled: {
    backgroundColor: '#2A2A2A',
  },

  dropdownActionText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
  },

  /*
  |--------------------------------------------------------------------------
  | CHAT
  |--------------------------------------------------------------------------
  */

  chat: {
    flex: 1,
  },

  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 25,
  },

  userMessageContainer: {
    alignItems: 'flex-end',
    marginBottom: 25,
  },

  userBubble: {
    maxWidth: '86%',
    borderRadius: 21,
    borderTopRightRadius: 6,
    paddingHorizontal: 17,
    paddingVertical: 13,
  },

  userMessageText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
  },

  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginRight: 4,
  },

  messageTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginRight: 5,
  },

  assistantContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 25,
  },

  assistantBody: {
    flex: 1,
    alignItems: 'flex-start',
  },

  assistantBubble: {
    borderRadius: 21,
    borderTopLeftRadius: 6,
    paddingHorizontal: 17,
    paddingVertical: 13,
  },

  assistantText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
  },

  assistantTime: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginTop: 6,
  },

  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },

  aiAvatarInner: {
    width: 25,
    height: 25,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiIcon: {
    width: 22,
    height: 22,
  },

  /*
  |--------------------------------------------------------------------------
  | INPUT
  |--------------------------------------------------------------------------
  */

  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
  },

  inputContainer: {
    flex: 1,
    minHeight: 46,
    maxHeight: 110,
    borderWidth: 1,
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 4,
  },

  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    maxHeight: 90,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === 'ios' ? 6 : 0,
    textAlignVertical: 'center',
    alignSelf: 'center',
  },

  inputAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    alignSelf: 'flex-end',
  },

  disclaimer: {
    fontFamily: 'Inter-Regular',
    fontSize: 7.5,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 7,
  },

  /* DRAFT MEDIA ATTACHMENT */
  draftImageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 12,
  },
  draftMediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 14,
    marginBottom: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  draftMediaContainer: {
    position: 'relative',
  },
  draftMediaThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  draftMediaOverlayBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayCircle: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftMediaTextInfo: {
    flex: 1,
  },
  draftMediaTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  draftMediaTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 4,
  },
  draftMediaTagText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  draftMediaTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    lineHeight: 17,
  },
  draftMediaSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    marginTop: 1.5,
  },
  removeDraftMediaBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftImageContainer: {
    position: 'relative',
  },
  draftImageThumbnail: {
    width: 52,
    height: 52,
    borderRadius: 12,
  },
  removeDraftImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  draftImageTextInfo: {
    flex: 1,
  },
  draftImageTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
  },
  draftImageSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    marginTop: 2,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  /* CHAT BUBBLE IMAGE */
  chatImageBubble: {
    width: 230,
    height: 160,
    borderRadius: 14,
  },

  /* FULL SCREEN IMAGE MODAL */
  fullScreenImageModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullScreenBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenImage: {
    width: '94%',
    height: '80%',
  },

  /* MEDIA PICKER MODAL */
  mediaModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  mediaModalCard: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  mediaModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mediaModalBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 999,
    gap: 6,
  },
  mediaModalBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  mediaModalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    lineHeight: 23,
    marginBottom: 3,
  },
  mediaModalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 12,
  },
  mediaModalDivider: {
    height: 1,
    marginBottom: 14,
  },
  mediaOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  mediaGridCard: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  mediaGridIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  mediaGridTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    textAlign: 'center',
  },
  mediaGridSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    textAlign: 'center',
  },
  mediaModalTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 2,
  },
  mediaModalTipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    flex: 1,
    lineHeight: 14,
  },

  /* QUICK REPLY PILLS ABOVE INPUT */
  quickReplyBar: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  quickReplyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  quickReplyTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  quickReplyScroll: {
    gap: 8,
    paddingRight: 16,
  },
  quickReplyPill: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  quickReplyPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },

  /* QUESTION CHIPS IN CHAT BUBBLE */
  questionChip: {
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questionChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  questionChipText: {
    fontSize: 12.5,
    lineHeight: 18,
    flex: 1,
  },
  lockedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  lockedBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8,
    color: '#10B981',
    letterSpacing: 0.5,
  },
});