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
import { SafeAreaView } from 'react-native-safe-area-context';

import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import AILimitModal from '../components/AILimitModal';
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
import { buildVehiCarePrompt } from '../config/aiPromptConfig';

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

const formatAiResponseText = (data) => {
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

  if (isClarification && data.response) {
    return typeof data.response === 'string' ? data.response.trim() : String(data.response);
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

  const parts = [];

  // 1. Conclusion / Title & Likely Issue
  const summaryText = data.summary || data.response;
  if (summaryText) {
    parts.push(`AI Assessment\nLikely Issue: ${summaryText}`);
  }

  // 2. Compact Confidence Indicator
  if (data.confidence) {
    const score = typeof data.confidence === 'object' && data.confidence.score !== undefined
      ? Math.round(Number(data.confidence.score))
      : (typeof data.confidence === 'string'
        ? (data.confidence.toUpperCase() === 'HIGH' ? 85 : data.confidence.toUpperCase() === 'MEDIUM' ? 65 : 40)
        : 75);
    const levelStr = typeof data.confidence === 'object' ? (data.confidence.level || 'MEDIUM') : String(data.confidence);
    parts.push(`Confidence: ${score}% · ${levelStr.toUpperCase()}`);
  }

  // 3. Single Primary Cause
  const causes = Array.isArray(data.possible_causes)
    ? data.possible_causes
    : (Array.isArray(data.possibleCauses) ? data.possibleCauses : []);

  if (causes.length > 0) {
    const primary = causes[0];
    const primaryName = typeof primary === 'string' ? primary : (primary?.cause || primary?.name || 'Primary component issue');
    const primaryReason = typeof primary === 'object' && primary?.reason ? `\n${primary.reason}` : '';
    parts.push(`Most Likely: ${primaryName}${primaryReason}`);
  }

  // 4. One Immediate Action
  const actions = Array.isArray(data.recommended_actions)
    ? data.recommended_actions
    : (Array.isArray(data.recommendedActions) ? data.recommendedActions : []);

  if (actions.length > 0) {
    const firstAction = typeof actions[0] === 'string' ? actions[0] : (actions[0]?.action || actions[0]?.text || String(actions[0]));
    parts.push(`Try This First: ${firstAction}`);
  }

  if (parts.length === 0) {
    return data.response || data.summary || 'Diagnostic evaluation complete.';
  }

  return parts.join('\n\n');
};

export default function AskVehiCareScreen({
  navigation,
  route,
}) {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const { openSidebar } = useSidebar();
  const { t, language } = useLanguage();
  const {
    currentSession,
    messages: chatMessages,
    addMessage,
    createNewSession,
    clearActiveChat,
    fetchChatSession,
    isLoading: isChatLoading,
  } = useChat();

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

  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [guestUsageCount, setGuestUsageCount] = useState(0);
  const [showSignInLimitModal, setShowSignInLimitModal] = useState(false);
  const [showVehicleDropdown, setShowVehicleDropdown] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [nearbyModalVisible, setNearbyModalVisible] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedVideo, setAttachedVideo] = useState(null);
  const [attachedAudio, setAttachedAudio] = useState(null);
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
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState([]);

  /*
  |--------------------------------------------------------------------------
  | ALL REF HOOKS (GROUPED SECOND)
  |--------------------------------------------------------------------------
  */

  const scrollRef = useRef(null);
  const recordingIntervalRef = useRef(null);

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
    const stats = await fetchAIUsageStats();
    if (stats) {
      setUsageStats(stats);
    }
  }, []);

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
    setIsSending(false);

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
  }, [vehicleProfile, createNewSession, getDynamicWelcomeText]);

  const handleNewChatPress = useCallback(() => {
    const hasUserMessages = chatMessages.some(m => (m.role === 'user' || m.sender === 'user'));
    if (hasUserMessages) {
      setShowNewChatConfirmModal(true);
    } else {
      confirmNewChat();
    }
  }, [chatMessages, confirmNewChat]);

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
          message: 'VehiCare needs access to your camera to take photos or record videos of your vehicle.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      Alert.alert(
        'Camera Access Required',
        'VehiCare needs camera access to take photos or record videos of vehicle issues. Please grant permission in App Info settings.',
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
      console.warn('[AskVehiCareScreen] Camera permission error:', err);
      return false;
    }
  };

  const requestMediaLibraryPermission = async (mediaType = 'photo') => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      let targetPermission = PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      if (Platform.Version >= 33) {
        targetPermission =
          mediaType === 'video'
            ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO
            : PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
      }

      const isAlreadyGranted = await PermissionsAndroid.check(targetPermission);
      if (isAlreadyGranted) {
        return true;
      }

      const granted = await PermissionsAndroid.request(targetPermission, {
        title: `${mediaType === 'video' ? 'Video' : 'Photo'} Library Permission Required`,
        message: `VehiCare needs access to your device storage to pick ${mediaType === 'video' ? 'videos' : 'photos'} of vehicle symptoms.`,
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      }

      if (Platform.Version >= 29) {
        return true;
      }

      Alert.alert(
        'Media Library Access Required',
        `VehiCare needs permission to access your ${mediaType === 'video' ? 'videos' : 'photos'}. Please grant access in App Info settings.`,
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

      setGuestUsageCount(next);

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

  const sendMessage = async (overrideText = null) => {
    const isCustomOverride = typeof overrideText === 'string';
    const textToSend = isCustomOverride ? overrideText : message;
    const trimmed = textToSend.trim();
    if ((!trimmed && !attachedImage && !attachedVideo && !attachedAudio) || isSending) {
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

    addMessage(userMessage);

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
      addMessage(outOfScopeReply);
      if (!isCustomOverride) {
        setMessage('');
      }
      setIsSending(false);
      return;
    }

    if (trimmed) {
      activityService.addActivity({
        type: 'chat_question',
        title: 'Asked VehiCare',
        description: `Asked: "${trimmed.slice(0, 50)}${trimmed.length > 50 ? '...' : ''}"`,
        vehicleId: activeVehicle?.id || activeVehicle?.vehicle_id,
        vehicleName: activeVehicle?.name || activeVehicle?.make || 'Active Vehicle',
      });
    }

    if (selectedQuestion?.id) {
      setAnsweredQuestionIds(prev => [...prev, selectedQuestion.id]);
      setSelectedQuestion(null);
    }
    if (!isCustomOverride) {
      setMessage('');
    }
    setIsSending(true);
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

      const activeSymptoms = trimmed || (currentAudio ? 'Audio recording of engine or vehicle noise' : currentVideo ? 'Visual and audio vehicle video analysis' : 'Visual component analysis');
      const mediaAttachedStr = currentAudio ? 'Audio file attached.' : currentVideo ? 'Video file attached.' : currentImage ? 'Image file attached.' : 'No media attached.';

      const systemPromptStr = buildVehiCarePrompt({
        vType: safeVehicleType,
        vBrand: activeVehicle?.brand || activeVehicle?.make || 'Unknown',
        vModel: activeVehicle?.model || 'Unknown',
        vYear: activeVehicle?.year || 'Unknown',
        langInstruction: language === 'fil' ? 'Respond in Tagalog/Filipino.' : language === 'taglish' ? 'Respond in Taglish.' : 'Respond in English.',
        historyText: history.length > 0 ? `HISTORY:\n${history.map(h => `${h.role}: ${h.content}`).join('\n')}` : '',
        symptoms: activeSymptoms,
        mediaInstruction: mediaAttachedStr,
      });

      const payload = {
        vehicle_id: vehicleId,
        vehicle_name: safeVehicleName,
        vehicle_type: safeVehicleType,
        symptoms: activeSymptoms,
        input_type: currentAudio ? 'voice' : currentVideo ? 'video' : currentImage ? 'image' : 'text',
        image_base64: currentImage?.base64 || null,
        video_base64: currentVideo?.base64 || null,
        video_mime: currentVideo?.mime || 'video/mp4',
        video_duration: currentVideo?.durationSec || 0,
        audio_base64: currentAudio?.base64 || null,
        history,
        system_prompt: systemPromptStr,
      };

      const resultData = await vehicleApi.submitDiagnostic(payload);

      const isDiagnostic = resultData?.type === 'diagnostic';
      const isClarificationNeeded = resultData?.status === 'needs_clarification' || (resultData?.clarification_questions && resultData.clarification_questions.length > 0);

      if (isDiagnostic || isClarificationNeeded) {
        if (!isAuthenticated) {
          await incrementGuestUsage();
        }
      }

      const formattedReplyText = formatAiResponseText(resultData);

      const reply = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        sender: 'assistant',
        text: formattedReplyText,
        message: formattedReplyText,
        diagnosisData: (isDiagnostic || isClarificationNeeded) ? resultData : null,
        clarificationQuestions: resultData?.clarification_questions || resultData?.clarificationQuestions || [],
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      addMessage(reply);

      if (resultData?.status === 'diagnosis_ready' || (!isClarificationNeeded && isDiagnostic)) {
        setSelectedDiagnosis(resultData);
      }

      await loadUsageStats();
    } catch (err) {
      console.error('[AskVehiCareScreen] AI Request Failed:', {
        axiosMessage: err?.message,
        httpStatus: err?.response?.status,
        responseData: err?.response?.data,
      });

      const responseReason = err?.response?.data?.reason;
      if (responseReason === 'ai_limit_reached' || err?.response?.status === 403) {
        setShowAILimitModal(true);
        await loadUsageStats();
        return;
      }

      const serverMessage = err?.response?.data?.message;
      const errorText = serverMessage
        ? `Request Error: ${serverMessage}`
        : 'Sorry, I encountered an issue reaching the assistant. Please check your network connection and try again.';

      const errorReply = {
        id: `assistant-err-${Date.now()}`,
        role: 'assistant',
        sender: 'assistant',
        text: errorText,
        message: errorText,
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      addMessage(errorReply);
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  /*
  |--------------------------------------------------------------------------
  | MEDIA SELECTION (PHOTOS & VIDEOS)
  |--------------------------------------------------------------------------
  */

  const capturePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        includeBase64: true,
        quality: 0.8,
      });

      if (result.didCancel || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      setAttachedVideo(null);
      setAttachedImage({
        uri: asset.uri,
        base64: asset.base64,
        fileName: asset.fileName || 'camera_photo.jpg',
      });
    } catch (err) {
      console.warn('[AskVehiCareScreen] Camera Photo Error:', err);
    }
  };

  const selectPhoto = async () => {
    const hasPermission = await requestMediaLibraryPermission('photo');
    if (!hasPermission) return;

    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      setAttachedVideo(null);
      setAttachedImage({
        uri: asset.uri,
        base64: asset.base64,
        fileName: asset.fileName || 'photo.jpg',
      });
    } catch (err) {
      console.warn('[AskVehiCareScreen] Photo Pick Error:', err);
    }
  };

  const captureVideo = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await launchCamera({
        mediaType: 'video',
        videoQuality: 'medium',
        durationLimit: usageStats?.video?.max_duration_seconds || 30,
        includeBase64: true,
      });

      if (result.didCancel || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const videoConfig = usageStats?.video || { max_size_mb: 15, max_duration_seconds: 30 };
      const fileSizeMb = ((asset.fileSize || 0) / (1024 * 1024)).toFixed(1);
      const durationSec = Math.round(asset.duration || 0);

      if (fileSizeMb > videoConfig.max_size_mb) {
        Alert.alert(
          'Video Too Large',
          `This video is ${fileSizeMb} MB. Your plan allows videos up to ${videoConfig.max_size_mb} MB.`
        );
        return;
      }

      if (durationSec > videoConfig.max_duration_seconds) {
        Alert.alert(
          'Video Too Long',
          `This video is ${durationSec}s long. Your plan allows videos up to ${videoConfig.max_duration_seconds} seconds.`
        );
        return;
      }

      setAttachedImage(null);
      setAttachedVideo({
        uri: asset.uri,
        base64: asset.base64 || null,
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
        includeBase64: true,
      });

      if (result.didCancel || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const videoConfig = usageStats?.video || { max_size_mb: 15, max_duration_seconds: 30 };
      const fileSizeMb = ((asset.fileSize || 0) / (1024 * 1024)).toFixed(1);
      const durationSec = Math.round(asset.duration || 0);

      if (fileSizeMb > videoConfig.max_size_mb) {
        Alert.alert(
          'Video Too Large',
          `This video is ${fileSizeMb} MB. Your plan allows videos up to ${videoConfig.max_size_mb} MB.`
        );
        return;
      }

      if (durationSec > videoConfig.max_duration_seconds) {
        Alert.alert(
          'Video Too Long',
          `This video is ${durationSec}s long. Your plan allows videos up to ${videoConfig.max_duration_seconds} seconds.`
        );
        return;
      }

      setAttachedImage(null);
      setAttachedVideo({
        uri: asset.uri,
        base64: asset.base64 || null,
        fileName: asset.fileName || 'video.mp4',
        fileSizeMb,
        durationSec,
        mime: asset.type || 'video/mp4',
      });
    } catch (err) {
      console.warn('[AskVehiCareScreen] Video Pick Error:', err);
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

        {/* TOP RIGHT ACTION ROW: NEW CHAT + SIDEBAR TOGGLE */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable
            style={[
              styles.newChatHeaderButton,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
              },
            ]}
            onPress={handleNewChatPress}
            accessibilityLabel="Start New Chat"
          >
            <Ionicons
              name="create-outline"
              size={19}
              color={theme.accent}
            />
          </Pressable>

          <Pressable
            style={[
              styles.newChatHeaderButton,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
              },
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => openSidebar()}
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

        {showVehicleDropdown && (
          <View
            style={[
              styles.vehicleDropdown,
              {
                backgroundColor:
                  theme.surface,
                borderColor:
                  theme.border,
              },
            ]}
          >
            <Text
              style={[
                styles.dropdownLabel,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              DIAGNOSTIC VEHICLE
            </Text>

            {isAuthenticated &&
            vehicles.length > 0 ? (
              <ScrollView
                style={
                  styles.vehicleList
                }
                nestedScrollEnabled
                showsVerticalScrollIndicator={
                  false
              }
              >
                {vehicles.map(
                  vehicle => {
                    const isActive =
                      activeVehicle &&
                      String(
                        activeVehicle.id,
                      ) ===
                        String(
                          vehicle.id,
                        );

                    return (
                      <Pressable
                        key={
                          vehicle.id
                        }
                        style={[
                          styles.vehicleOption,
                          {
                            backgroundColor:
                              isActive
                                ? theme.surfaceAlt
                                : 'transparent',
                            borderColor:
                              isActive
                                ? theme.border
                                : 'transparent',
                          },
                        ]}
                        onPress={() =>
                          handleVehicleSelect(
                            vehicle,
                          )
                        }
                      >
                        <View
                          style={[
                            styles.vehicleOptionIcon,
                            {
                              backgroundColor:
                                isActive
                                  ? theme.accent +
                                    '18'
                                  : theme.surfaceAlt,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={getVehicleIconConfig(vehicle).name}
                            size={18}
                            color={
                              isActive
                                ? theme.accent
                                : theme.textSecondary
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.vehicleOptionInfo
                          }
                        >
                          <Text
                            style={[
                              styles.vehicleOptionName,
                              {
                                color:
                                  theme.text,
                              },
                            ]}
                            numberOfLines={
                              1
                            }
                          >
                            {getVehicleDisplayName(
                              vehicle,
                              'Vehicle',
                            )}
                          </Text>

                          <Text
                            style={[
                              styles.vehicleOptionDetails,
                              {
                                color:
                                  theme.textSecondary,
                              },
                            ]}
                            numberOfLines={
                              1
                            }
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
                              {
                                backgroundColor:
                                  theme.accent +
                                  '18',
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.activeDot,
                                {
                                  backgroundColor:
                                    theme.accent,
                                },
                              ]}
                            />

                            <Text
                              style={[
                                styles.activeBadgeText,
                                {
                                  color:
                                    theme.accent,
                                },
                              ]}
                            >
                              ACTIVE
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  },
                )}
              </ScrollView>
            ) : (
              <View
                style={
                  styles.emptyVehicleState
                }
              >
                <Ionicons
                  name="car-outline"
                  size={22}
                  color={
                    theme.textSecondary
                  }
                />

                <Text
                  style={[
                    styles.emptyVehicleText,
                    {
                      color:
                        theme.textSecondary,
                    },
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
                  {
                    borderTopColor:
                      theme.border,
                  },
                ]}
              >
                <View
                  style={
                    styles.currentVehicleHeader
                  }
                >
                  <Text
                    style={[
                      styles.currentVehicleLabel,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    CURRENTLY ANALYZING
                  </Text>

                  <View
                    style={[
                      styles.currentActiveBadge,
                      {
                        backgroundColor:
                          theme.accent +
                          '18',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.activeDot,
                        {
                          backgroundColor:
                            theme.accent,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.activeBadgeText,
                        {
                          color:
                            theme.accent,
                        },
                      ]}
                    >
                      ACTIVE
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.currentVehicleName,
                    {
                      color:
                        theme.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {vehicleName}
                </Text>

                <Text
                  style={[
                    styles.currentVehicleDetails,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {vehicleDetails}
                </Text>
              </View>

              {/* ADD VEHICLE */}

              <Pressable
                style={[
                  styles.dropdownAction,
                  {
                    backgroundColor:
                      theme.accent,
                  },
                  !isAuthenticated &&
                    styles.dropdownActionDisabled,
                ]}
                onPress={
                  handleAddVehicle
                }
              >
                <Ionicons
                  name={
                    isAuthenticated
                      ? 'add'
                      : 'lock-closed-outline'
                  }
                  size={16}
                  color={
                    isAuthenticated
                      ? theme.surface
                      : theme.textSecondary
                  }
                  style={{
                    marginRight: 6,
                  }}
                />

                <Text
                  style={[
                    styles.dropdownActionText,
                    {
                      color:
                        isAuthenticated
                          ? theme.surface
                          : theme.textSecondary,
                    },
                  ]}
                >
                  {isAuthenticated
                    ? 'Add New Vehicle'
                    : 'Sign in to unlock'}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

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
                        <TouchableOpacity
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 10,
                            backgroundColor: 'rgba(246, 59, 5, 0.12)',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#F63B05',
                          }}
                          onPress={() => {
                            setSelectedDiagnosis(item.diagnosisData);
                            setResultModalVisible(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Feather name="bar-chart-2" size={14} color="#F63B05" />
                          <Text style={{ fontFamily: 'Outfit-Bold', fontSize: 11, color: '#F63B05' }}>
                            View Detailed Assessment →
                          </Text>
                        </TouchableOpacity>
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
          <View style={[styles.draftImageBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.draftImageContainer}>
              <Image source={{ uri: attachedImage.uri }} style={styles.draftImageThumbnail} />
              <TouchableOpacity
                style={styles.removeDraftImageBtn}
                onPress={() => setAttachedImage(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.draftImageTextInfo}>
              <Text style={[styles.draftImageTitle, { color: theme.text }]} numberOfLines={1}>
                Photo Attached
              </Text>
              <Text style={[styles.draftImageSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {attachedImage.fileName || 'Image ready to analyze'}
              </Text>
            </View>
          </View>
        )}

        {attachedVideo && (
          <View style={[styles.draftImageBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 }}
              activeOpacity={0.8}
              onPress={() => setActivePlaybackVideo(attachedVideo.uri)}
            >
              <View style={styles.draftImageContainer}>
                <View style={[styles.draftImageThumbnail, { backgroundColor: theme.accent + '22', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="play-circle" size={28} color={theme.accent} />
                </View>
                <TouchableOpacity
                  style={styles.removeDraftImageBtn}
                  onPress={() => setAttachedVideo(null)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.draftImageTextInfo}>
                <Text style={[styles.draftImageTitle, { color: theme.text }]} numberOfLines={1}>
                  Video Attached ({attachedVideo.fileSizeMb} MB) — Tap to Preview
                </Text>
                <Text style={[styles.draftImageSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                  Duration: {attachedVideo.durationSec}s • {attachedVideo.fileName}
                </Text>
              </View>
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
        onFindNearbyShops={() => setNearbyModalVisible(true)}
        onOwnShopSelected={handleOwnShopSelected}
      />

      <NearbyShopsModal
        visible={nearbyModalVisible}
        onClose={() => setNearbyModalVisible(false)}
        diagnosticId={selectedDiagnosis?.id}
        vehicleType={vehicleProfile?.vehicle_type?.name || vehicleProfile?.type || 'car'}
      />

      <AILimitModal
        visible={showAILimitModal}
        onClose={() => setShowAILimitModal(false)}
        plan={usageStats?.plan || (isAuthenticated ? 'free' : 'guest')}
        onCreateAccount={() => {
          setShowAILimitModal(false);
          navigation.navigate('Register');
        }}
        onSignIn={() => {
          setShowAILimitModal(false);
          navigation.navigate('Login');
        }}
        onUpgrade={() => {
          setShowAILimitModal(false);
          navigation.navigate('Profile');
        }}
      />

      {/* MEDIA ATTACHMENT MODAL */}
      {/* ATTACH MEDIA BOTTOM SHEET MODAL */}
      <Modal
        visible={showMediaPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMediaPickerModal(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity
            style={styles.sheetBackdrop}
            activeOpacity={1}
            onPress={() => setShowMediaPickerModal(false)}
          />

          <SafeAreaView
            style={[
              styles.mediaBottomSheet,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {/* Handle Bar */}
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />

            {/* Header Row */}
            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetHeaderLeft}>
                <View style={[styles.sheetIconWrapper, { backgroundColor: theme.accentSoft }]}>
                  <Ionicons name="attach" size={22} color={theme.accent} />
                </View>
                <Text style={[styles.sheetTitle, { color: theme.text }]}>Attach Media</Text>
              </View>

              <TouchableOpacity
                style={[styles.sheetCloseBtn, { backgroundColor: theme.surfaceAlt }]}
                onPress={() => setShowMediaPickerModal(false)}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]}>
              Upload a photo or short video of the symptom, sound, or component.
            </Text>

            {/* PHOTO SECTION */}
            <Text style={[styles.mediaSectionLabel, { color: theme.accent }]}>PHOTO</Text>
            <View style={styles.mediaGroupContainer}>
              <TouchableOpacity
                style={[styles.mediaOptionCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                activeOpacity={0.75}
                onPress={() => {
                  setShowMediaPickerModal(false);
                  capturePhoto();
                }}
              >
                <View style={[styles.optionIconBox, { backgroundColor: theme.accentSoft }]}>
                  <Ionicons name="camera" size={20} color={theme.accent} />
                </View>
                <View style={styles.mediaOptionTextContainer}>
                  <Text style={[styles.mediaOptionTitle, { color: theme.text }]}>Take Photo</Text>
                  <Text style={[styles.mediaOptionSub, { color: theme.textSecondary }]}>Capture a picture using camera</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mediaOptionCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                activeOpacity={0.75}
                onPress={() => {
                  setShowMediaPickerModal(false);
                  selectPhoto();
                }}
              >
                <View style={[styles.optionIconBox, { backgroundColor: theme.accentSoft }]}>
                  <Ionicons name="images" size={20} color={theme.accent} />
                </View>
                <View style={styles.mediaOptionTextContainer}>
                  <Text style={[styles.mediaOptionTitle, { color: theme.text }]}>Choose Photo</Text>
                  <Text style={[styles.mediaOptionSub, { color: theme.textSecondary }]}>Select an image from gallery</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* VIDEO SECTION */}
            <Text style={[styles.mediaSectionLabel, { color: theme.accent, marginTop: 14 }]}>VIDEO</Text>
            <View style={styles.mediaGroupContainer}>
              <TouchableOpacity
                style={[styles.mediaOptionCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                activeOpacity={0.75}
                onPress={() => {
                  setShowMediaPickerModal(false);
                  captureVideo();
                }}
              >
                <View style={[styles.optionIconBox, { backgroundColor: theme.accentSoft }]}>
                  <Ionicons name="videocam" size={20} color={theme.accent} />
                </View>
                <View style={styles.mediaOptionTextContainer}>
                  <Text style={[styles.mediaOptionTitle, { color: theme.text }]}>Record Video</Text>
                  <Text style={[styles.mediaOptionSub, { color: theme.textSecondary }]}>
                    Record up to {usageStats?.video?.max_duration_seconds || 30}s video using camera
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mediaOptionCard, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
                activeOpacity={0.75}
                onPress={() => {
                  setShowMediaPickerModal(false);
                  selectVideo();
                }}
              >
                <View style={[styles.optionIconBox, { backgroundColor: theme.accentSoft }]}>
                  <Ionicons name="film" size={20} color={theme.accent} />
                </View>
                <View style={styles.mediaOptionTextContainer}>
                  <Text style={[styles.mediaOptionTitle, { color: theme.text }]}>Choose Video</Text>
                  <Text style={[styles.mediaOptionSub, { color: theme.textSecondary }]}>
                    Up to {usageStats?.video?.max_size_mb || 15} MB • {usageStats?.video?.max_duration_seconds || 30} seconds
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
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

  newChatHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
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

  /* DRAFT IMAGE ATTACHMENT */
  draftImageBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 12,
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

  /* MEDIA PICKER BOTTOM SHEET MODAL */
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  mediaBottomSheet: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 24,
    borderTopWidth: 1,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.6,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 20,
  },
  sheetCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  mediaSectionLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  mediaGroupContainer: {
    gap: 8,
  },
  mediaOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  optionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaOptionTextContainer: {
    flex: 1,
  },
  mediaOptionTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14.5,
  },
  mediaOptionSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    marginTop: 2,
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