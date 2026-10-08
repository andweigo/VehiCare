
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

import vehicleApi from '../api/vehicleApi';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useVehicle } from '../context/VehicleContext';
import activityService from '../services/activity.service';
import {
  getHistoryStorageKey,
  getVehiclesStorageKey,
  loadActiveChatSessions,
} from '../services/storageService';
import { getVehicleRecommendations } from '../utils/maintenanceUtils';
import { getVehicleDisplayName } from '../utils/vehicleDisplay';
import ConfidenceCard from '../components/ConfidenceCard';
import PossibleCauseCard from '../components/PossibleCauseCard';

const ORANGE = '#F63B05';
const BACKGROUND = '#0A0A0A';
const CARD = '#151515';
const CARD_LIGHT = '#1C1C1C';
const BORDER = '#292929';
const TEXT = '#FFFFFF';
const MUTED = '#858585';
const GREEN = '#32D583';
const YELLOW = '#F5B942';
const RED = '#FF5757';


const FILTERS = [
  {
    id: 'all',
    label: 'All',
    icon: 'history',
  },
  {
    id: 'diagnosis',
    label: 'Diagnoses',
    icon: 'medical-services',
  },
  {
    id: 'chat',
    label: 'Chats',
    icon: 'chat-bubble-outline',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: 'build',
  },
  {
    id: 'repair',
    label: 'Repairs',
    icon: 'handyman',
  },
];

const SORT_OPTIONS = [
  {
    id: 'recent',
    label: 'Most Recent',
  },
  {
    id: 'oldest',
    label: 'Oldest',
  },
  {
    id: 'updated',
    label: 'Recently Updated',
  },
];

export const normalizeItemType = (rawType = '') => {
  const t = String(rawType || '').toLowerCase().trim();
  if (
    t === 'maintenance' ||
    t === 'maintenance_completed' ||
    t === 'maintenance_undone' ||
    t === 'service' ||
    t.includes('maint')
  ) {
    return 'maintenance';
  }
  if (
    t === 'repair' ||
    t === 'repair_assistance' ||
    t === 'referral' ||
    t === 'service_referral' ||
    t === 'shop_visit' ||
    t.includes('repair') ||
    t.includes('referral') ||
    t.includes('shop')
  ) {
    return 'repair';
  }
  if (t === 'diagnosis' || t === 'diagnostic' || t.includes('diag')) {
    return 'diagnosis';
  }
  if (t === 'chat' || t === 'consultation' || t.includes('chat') || t.includes('consult')) {
    return 'chat';
  }
  return t || 'activity';
};

const getTypeConfig = type => {
  const normType = normalizeItemType(type);
  switch (normType) {
    case 'diagnosis':
      return {
        icon: 'medical-services',
        label: 'AI Diagnosis',
        color: ORANGE,
        background: '#27160F',
      };

    case 'chat':
      return {
        icon: 'chat-bubble-outline',
        label: 'AI Consultation',
        color: '#8C7BFF',
        background: '#19162A',
      };

    case 'maintenance':
      return {
        icon: 'build',
        label: 'Maintenance',
        color: GREEN,
        background: '#13241A',
      };

    case 'repair':
      return {
        icon: 'handyman',
        label: 'Repair Assistance',
        color: YELLOW,
        background: '#29220F',
      };

    case 'referral':
      return {
        icon: 'location-on',
        label: 'Service Referral',
        color: '#4DA6FF',
        background: '#111E2B',
      };

    case 'reminder':
      return {
        icon: 'notifications-none',
        label: 'Maintenance Reminder',
        color: '#C084FC',
        background: '#21172A',
      };

    default:
      return {
        icon: 'history',
        label: 'Activity',
        color: MUTED,
        background: CARD_LIGHT,
      };
  }
};

const getUrgencyConfig = urgency => {
  switch (`${urgency || ''}`.toLowerCase()) {
    case 'high':
    case 'urgent':
    case 'critical':
      return {
        label: 'Urgent',
        color: RED,
        background: '#321616',
      };

    case 'moderate':
    case 'medium':
      return {
        label: 'Moderate',
        color: YELLOW,
        background: '#29220F',
      };

    case 'low':
      return {
        label: 'Low',
        color: GREEN,
        background: '#13241A',
      };

    default:
      return null;
  }
};

const formatDate = timestamp => {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return `Today, ${date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }

  if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getDateGroup = timestamp => {
  if (!timestamp) {
    return 'Earlier';
  }

  const date = new Date(timestamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const getSearchText = item => {
  return [
    item.title,
    item.summary,
    item.description,
    item.vehicleName,
    item.vehicleBrand,
    item.vehicleModel,
    item.type,
    item.urgency,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

const normalizeSymptoms = symptoms => {
  if (Array.isArray(symptoms)) {
    return symptoms
      .map(s =>
        typeof s === 'string'
          ? s
          : s?.symptom || s?.text || String(s),
      )
      .filter(Boolean);
  }

  if (typeof symptoms === 'string' && symptoms.trim()) {
    return [symptoms.trim()];
  }

  return [];
};

const normalizeHistoryItem = item => {
  const normalizedType = normalizeItemType(item?.type);
  return {
    ...item,
    id:
      item?.id ||
      `${normalizedType}-${item?.createdAt || Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: normalizedType,
    rawType: item?.type || normalizedType,
    title:
      item?.title ||
      (normalizedType === 'maintenance'
        ? 'Maintenance Service'
        : normalizedType === 'repair'
        ? 'Repair Service'
        : normalizedType === 'diagnosis'
        ? 'AI Diagnosis Report'
        : 'VehiCare Activity'),
    summary:
      typeof item?.summary === 'string'
        ? item.summary
        : item?.description ||
          (normalizedType === 'maintenance'
            ? 'Vehicle maintenance service logged.'
            : 'No summary available.'),
    createdAt: item?.createdAt || item?.date || new Date().toISOString(),
    updatedAt:
      item?.updatedAt || item?.createdAt || new Date().toISOString(),
    symptoms: normalizeSymptoms(item?.symptoms),
  };
};

const HistoryScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const { openSidebar } = useSidebar();
  const { activeVehicle: contextActiveVehicle, vehicles: contextVehicles } = useVehicle();

  const [history, setHistory] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('recent');
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  const [sortVisible, setSortVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const activeVehicle = useMemo(
    () =>
      contextActiveVehicle ||
      vehicles.find(
        vehicle =>
          vehicle?.isActive ||
          vehicle?.is_active ||
          vehicle?.active,
      ) ||
      (Array.isArray(contextVehicles) && contextVehicles[0]) ||
      vehicles[0] ||
      null,
    [contextActiveVehicle, contextVehicles, vehicles],
  );

  const loadHistory = useCallback(
    async (isRefresh = false, pageNum = 1) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else if (pageNum === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

        const userId = user?.id || user?.uid || null;

        let combinedItems = [];
        let totalPages = 1;

        // 1. Fetch remote items from backend API if authenticated
        if (isAuthenticated) {
          try {
            const response = await vehicleApi.getHistory({
              type: filter === 'all' ? undefined : filter,
              search: search.trim(),
              sort,
              page: pageNum,
              per_page: 30,
            });

            const remoteItems = response?.data || [];
            totalPages = response?.meta?.last_page || 1;

            if (Array.isArray(remoteItems)) {
              combinedItems.push(...remoteItems.map(normalizeHistoryItem));
            }
          } catch (apiErr) {
            console.warn('API error in getHistory:', apiErr?.message);
          }
        }

        // 2. Concurrently load local storage history, user activities, and completed maintenance
        try {
          const historyKey = getHistoryStorageKey(userId);
          const vehiclesKey = getVehiclesStorageKey(userId);
          const [
            storedHistory,
            storedVehicles,
            activeSessions,
            userActivities,
          ] = await Promise.all([
            AsyncStorage.getItem(historyKey).catch(() => null),
            AsyncStorage.getItem(vehiclesKey).catch(() => null),
            loadActiveChatSessions(userId).catch(() => null),
            activityService.getAllActivities(userId).catch(() => []),
          ]);

          if (storedHistory) {
            try {
              const parsed = JSON.parse(storedHistory);
              if (Array.isArray(parsed)) {
                combinedItems.push(...parsed.map(normalizeHistoryItem));
              }
            } catch (error) {
              console.warn('Failed to parse stored history:', error);
            }
          }

          if (storedVehicles) {
            try {
              const parsedVehicles = JSON.parse(storedVehicles);
              if (Array.isArray(parsedVehicles)) {
                setVehicles(parsedVehicles);
              }
            } catch (error) {
              console.warn('Failed to parse stored vehicles:', error);
            }
          }

          // Merge activities (tracks maintenance completions, repair referrals, etc.)
          if (Array.isArray(userActivities) && userActivities.length > 0) {
            userActivities.forEach(act => {
              const nType = normalizeItemType(act.type);
              combinedItems.push(
                normalizeHistoryItem({
                  id: act.id,
                  type: nType,
                  title: act.title,
                  summary: act.description || act.title,
                  vehicleName: act.vehicleName || 'Your Vehicle',
                  vehicleId: act.vehicleId,
                  createdAt: act.createdAt,
                  updatedAt: act.createdAt,
                  metadata: act.metadata,
                }),
              );
            });
          }

          // Merge active chat consultations
          if (activeSessions && typeof activeSessions === 'object') {
            Object.keys(activeSessions).forEach(sessionKey => {
              const session = activeSessions[sessionKey];

              if (
                session &&
                Array.isArray(session.messages) &&
                session.messages.length > 0 &&
                (!session.userId || !userId || String(session.userId) === String(userId))
              ) {
                const lastUserMsg = session.messages
                  .slice()
                  .reverse()
                  .find(m => m.role === 'user' || m.sender === 'user');

                const lastAiMsg = session.messages
                  .slice()
                  .reverse()
                  .find(m => m.role === 'assistant' || m.sender === 'assistant');

                const summaryText =
                  lastAiMsg?.summary ||
                  lastAiMsg?.text ||
                  lastAiMsg?.message ||
                  lastUserMsg?.text ||
                  'VehiCare AI Chat';

                combinedItems.push(
                  normalizeHistoryItem({
                    id: `chat:${sessionKey}`,
                    type: 'chat',
                    title: session.vehicleName
                      ? `Chat (${session.vehicleName})`
                      : 'Ask VehiCare Chat',
                    summary:
                      typeof summaryText === 'string'
                        ? summaryText
                        : 'Vehicle diagnostic consultation',
                    vehicleName: session.vehicleName || 'Vehicle',
                    createdAt:
                      session.createdAt ||
                      session.updatedAt ||
                      new Date().toISOString(),
                    updatedAt:
                      session.updatedAt ||
                      session.createdAt ||
                      new Date().toISOString(),
                    session_id: sessionKey,
                    messages: session.messages,
                  }),
                );
              }
            });
          }

          // 3. Load completed maintenance items for active vehicle
          const targetVehicle = activeVehicle || contextActiveVehicle || (vehicles && vehicles[0]) || null;
          const targetVehicleId = targetVehicle?.id ?? targetVehicle?.vehicle_id ?? null;
          const vName = targetVehicle ? getVehicleDisplayName(targetVehicle, 'Your Vehicle') : 'Your Vehicle';

          if (targetVehicle) {
            const completedMaintKey = targetVehicleId
              ? `@vehicare_completed_maintenance_${targetVehicleId}`
              : '@vehicare_completed_maintenance';

            const [savedCompleted, savedGeneralCompleted] = await Promise.all([
              AsyncStorage.getItem(completedMaintKey).catch(() => null),
              AsyncStorage.getItem('@vehicare_completed_maintenance').catch(() => null),
            ]);

            const completedIds = new Set();
            if (savedCompleted) {
              try {
                const arr = JSON.parse(savedCompleted);
                if (Array.isArray(arr)) arr.forEach(id => completedIds.add(String(id)));
              } catch (e) {}
            }
            if (savedGeneralCompleted) {
              try {
                const arr = JSON.parse(savedGeneralCompleted);
                if (Array.isArray(arr)) arr.forEach(id => completedIds.add(String(id)));
              } catch (e) {}
            }

            if (completedIds.size > 0) {
              const vehicleRecs = getVehicleRecommendations(targetVehicle);
              vehicleRecs.forEach(rec => {
                if (completedIds.has(String(rec.id))) {
                  combinedItems.push(
                    normalizeHistoryItem({
                      id: `completed-maint-${rec.id}-${targetVehicleId || 'v'}`,
                      type: 'maintenance',
                      title: rec.title,
                      summary: rec.description || `Completed routine maintenance for ${vName}.`,
                      vehicleName: vName,
                      vehicleId: targetVehicleId,
                      createdAt: new Date().toISOString(),
                      category: rec.category,
                      priority: rec.priority,
                      isCompleted: true,
                    }),
                  );
                }
              });
            }
          }
        } catch (localErr) {
          console.warn('Local history storage check error:', localErr);
        }

        // Deduplicate items by ID
        const seenIds = new Set();
        const uniqueItems = [];

        combinedItems.forEach(item => {
          if (item && item.id && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            uniqueItems.push(item);
          }
        });

        if (pageNum === 1) {
          setHistory(uniqueItems);
        } else {
          setHistory(prev => {
            const prevSeen = new Set(prev.map(item => item.id));
            const newEntries = uniqueItems.filter(item => !prevSeen.has(item.id));
            return [...prev, ...newEntries];
          });
        }

        setPage(pageNum);
        setHasMore(pageNum < totalPages);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [user, isAuthenticated, filter, search, sort, activeVehicle, contextActiveVehicle, vehicles],
  );

  const handleRefresh = useCallback(() => {
    loadHistory(true, 1);
  }, [loadHistory]);

  const handleLoadMore = useCallback(() => {
    if (
      !loadingMore &&
      hasMore &&
      isAuthenticated
    ) {
      loadHistory(false, page + 1);
    }
  }, [
    loadingMore,
    hasMore,
    isAuthenticated,
    page,
    loadHistory,
  ]);

  useEffect(() => {
    loadHistory();

    const unsubscribe =
      navigation?.addListener?.('focus', () => {
        loadHistory(false, 1);
      });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigation, loadHistory]);

  const filteredHistory = useMemo(() => {
    let result = [...history];

    if (filter !== 'all') {
      result = result.filter(
        item => normalizeItemType(item.type) === filter,
      );
    }

    const searchTerm = search.trim().toLowerCase();

    if (searchTerm) {
      result = result.filter(item =>
        getSearchText(item).includes(searchTerm),
      );
    }

    if (sort === 'recent') {
      result.sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt),
      );
    }

    if (sort === 'oldest') {
      result.sort(
        (a, b) =>
          new Date(a.createdAt) -
          new Date(b.createdAt),
      );
    }

    if (sort === 'updated') {
      result.sort(
        (a, b) =>
          new Date(b.updatedAt) -
          new Date(a.updatedAt),
      );
    }

    return result;
  }, [
    history,
    filter,
    search,
    sort,
  ]);

  const groupedHistory = useMemo(() => {
    const groups = [];

    filteredHistory.forEach(item => {
      const groupName = getDateGroup(
        item.createdAt,
      );

      const existingGroup = groups.find(
        group => group.title === groupName,
      );

      if (existingGroup) {
        existingGroup.items.push(item);
      } else {
        groups.push({
          title: groupName,
          items: [item],
        });
      }
    });

    return groups;
  }, [filteredHistory]);

  const renderFilter = item => {
    const active = filter === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.8}
        style={[
          styles.filterButton,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
          active && {
            backgroundColor: theme.accent,
            borderColor: theme.accent,
          },
        ]}
        onPress={() => setFilter(item.id)}
      >
        <Icon
          name={item.icon}
          size={15}
          color={
            active
              ? '#FFFFFF'
              : theme.textSecondary
          }
        />

        <Text
          style={[
            styles.filterText,
            {
              color: active
                ? '#FFFFFF'
                : theme.textSecondary,
            },
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderHistoryItem = (
    item,
    index,
  ) => {
    const config = getTypeConfig(
      item.type,
    );

    const urgency =
      getUrgencyConfig(item.urgency);

    const vehicleName =
      item.vehicleName ||
      (activeVehicle
        ? getVehicleDisplayName(
            activeVehicle,
            'Your Vehicle',
          )
        : 'Your Vehicle');

    return (
      <TouchableOpacity
        key={
          item.id ||
          `hist-item-${index}`
        }
        activeOpacity={0.88}
        style={[
          styles.historyCard,
          {
            backgroundColor:
              theme.surface,
            borderColor:
              theme.border,
          },
        ]}
        onPress={() =>
          setSelectedItem(item)
        }
      >
        <View style={styles.historyTop}>
          <View
            style={[
              styles.historyIcon,
              {
                backgroundColor:
                  config.background,
              },
            ]}
          >
            <Icon
              name={config.icon}
              size={22}
              color={config.color}
            />
          </View>

          <View
            style={styles.historyContent}
          >
            <View
              style={
                styles.historyTitleRow
              }
            >
              <Text
                style={[
                  styles.historyTitle,
                  {
                    color:
                      theme.text,
                  },
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>

              <Icon
                name="chevron-right"
                size={20}
                color={
                  theme.textSecondary
                }
              />
            </View>

            <Text
              style={[
                styles.historyType,
                {
                  color:
                    config.color,
                },
              ]}
            >
              {config.label}
            </Text>

            <Text
              style={[
                styles.historySummary,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
              numberOfLines={2}
            >
              {item.summary}
            </Text>

            <View
              style={
                styles.historyMeta
              }
            >
              <Text
                style={[
                  styles.historyVehicle,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {item.vehicleName ||
                  vehicleName}
              </Text>

              <View
                style={[
                  styles.metaDot,
                  {
                    backgroundColor:
                      theme.border,
                  },
                ]}
              />

              <Text
                style={[
                  styles.historyDate,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                {formatDate(
                  item.createdAt,
                )}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.cardFooter,
            {
              borderTopColor:
                theme.border,
            },
          ]}
        >
          {urgency ? (
            <View
              style={[
                styles.urgencyBadge,
                {
                  backgroundColor:
                    urgency.background,
                },
              ]}
            >
              <View
                style={[
                  styles.urgencyDot,
                  {
                    backgroundColor:
                      urgency.color,
                  },
                ]}
              />

              <Text
                style={[
                  styles.urgencyText,
                  {
                    color:
                      urgency.color,
                  },
                ]}
              >
                {urgency.label}
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.summaryBadge
              }
            >
              <Icon
                name="auto-awesome"
                size={12}
                color={config.color}
              />

              <Text
                style={[
                  styles.summaryBadgeText,
                  {
                    color:
                      config.color,
                  },
                ]}
              >
                Summary available
              </Text>
            </View>
          )}

          <Text
            style={styles.viewText}
          >
            View details
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroup = ({
    item,
  }) => (
    <View style={styles.group}>
      <Text
        style={[
          styles.groupTitle,
          {
            color:
              theme.textSecondary,
          },
        ]}
      >
        {item.title}
      </Text>

      {item.items.map(
        (historyItem, idx) =>
          renderHistoryItem(
            historyItem,
            idx,
          ),
      )}
    </View>
  );

  const renderEmpty = () => {
    let emptyIcon = 'history';
    let emptyTitle = 'No Activity Found';
    let emptyDesc = 'Your VehiCare diagnoses, consultations, and maintenance activity will appear here.';
    let actionBtnText = null;
    let actionBtnRoute = null;

    if (search) {
      emptyTitle = 'No Results Found';
      emptyDesc = `No activity matches "${search}". Try searching for another term.`;
    } else if (filter === 'maintenance') {
      emptyIcon = 'build';
      emptyTitle = 'No Maintenance Records Yet';
      emptyDesc = 'Completed checklist tasks and service logs will appear here. Complete routine tasks in the Maintenance screen to track upkeep.';
      actionBtnText = 'Go to Maintenance';
      actionBtnRoute = 'Maintenance';
    } else if (filter === 'repair') {
      emptyIcon = 'handyman';
      emptyTitle = 'No Repair Records Yet';
      emptyDesc = 'Records of repair shop visits, technician consultations, and service referrals will be tracked here.';
      actionBtnText = 'Find Repair Shops';
      actionBtnRoute = 'RepairShops';
    } else if (filter === 'diagnosis') {
      emptyIcon = 'medical-services';
      emptyTitle = 'No AI Diagnoses Yet';
      emptyDesc = 'Run a vehicle check with VehiCare AI to see detailed problem reports and recommendations here.';
      actionBtnText = 'Run Diagnosis';
      actionBtnRoute = 'AskVehiCare';
    } else if (filter === 'chat') {
      emptyIcon = 'chat-bubble-outline';
      emptyTitle = 'No Consultations Yet';
      emptyDesc = 'Conversations with VehiCare AI assistant will be saved here for quick reference.';
      actionBtnText = 'Ask VehiCare AI';
      actionBtnRoute = 'AskVehiCare';
    }

    return (
      <View style={styles.emptyContainer}>
        <View
          style={[
            styles.emptyIcon,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.border,
            },
          ]}
        >
          <Icon name={emptyIcon} size={38} color={theme.accent} />
        </View>

        <Text style={[styles.emptyTitle, { color: theme.text }]}>{emptyTitle}</Text>
        <Text style={[styles.emptyDescription, { color: theme.textSecondary }]}>{emptyDesc}</Text>

        {actionBtnText && actionBtnRoute && (
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: theme.accent, marginTop: 14 }]}
            onPress={() => navigation.navigate(actionBtnRoute)}
            activeOpacity={0.8}
          >
            <Text style={styles.clearButtonText}>{actionBtnText}</Text>
          </TouchableOpacity>
        )}

        {(search || (filter !== 'all' && !actionBtnText)) && (
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: theme.accent, marginTop: 14 }]}
            onPress={() => {
              setSearch('');
              setFilter('all');
            }}
          >
            <Text style={styles.clearButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor:
              theme.background,
          },
        ]}
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color={
              theme.accent
            }
          />

          <Text
            style={[
              styles.loadingText,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            Loading your history...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor:
            theme.background,
        },
      ]}
      edges={['top']}
    >
      {/* HEADER */}

      <View
        style={styles.header}
      >
        <View
          style={
            styles.headerLeft
          }
        >
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor:
                  theme.surface,
                borderColor:
                  theme.border,
              },
            ]}
            activeOpacity={0.75}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Icon
              name="arrow-back"
              size={22}
              color={theme.text}
            />
          </TouchableOpacity>

          <View>
            <Text
              style={[
                styles.eyebrow,
                {
                  color:
                    theme.accent,
                },
              ]}
            >
              VEHICARE
            </Text>

            <Text
              style={[
                styles.title,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              History
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Your recent vehicle activity
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.menuButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
          activeOpacity={0.75}
          onPress={openSidebar}
          accessibilityLabel="Open Sidebar Menu"
        >
          <Icon name="menu" size={22} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* SEARCH */}

      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor:
              theme.surface,
            borderColor:
              theme.border,
          },
        ]}
      >
        <Icon
          name="search"
          size={21}
          color={
            theme.textSecondary
          }
        />

        <TextInput
          style={[
            styles.searchInput,
            {
              color:
                theme.text,
            },
          ]}
          placeholder="Search your history..."
          placeholderTextColor={
            theme.placeholder
          }
          value={search}
          onChangeText={
            setSearch
          }
          returnKeyType="search"
        />

        {search.length > 0 && (
          <TouchableOpacity
            onPress={() =>
              setSearch('')
            }
          >
            <Icon
              name="close"
              size={19}
              color={
                theme.textSecondary
              }
            />
          </TouchableOpacity>
        )}
      </View>

      {/* SORT */}

      <View
        style={styles.sortRow}
      >
        <TouchableOpacity
          style={[
            styles.sortButton,
            {
              backgroundColor:
                theme.surface,
              borderColor:
                theme.border,
            },
          ]}
          activeOpacity={0.8}
          onPress={() =>
            setSortVisible(true)
          }
        >
          <Icon
            name="sort"
            size={18}
            color={
              theme.accent
            }
          />

          <Text
            style={[
              styles.sortLabel,
              {
                color:
                  theme.textSecondary,
              },
            ]}
          >
            Sort:
          </Text>

          <Text
            style={[
              styles.sortValue,
              {
                color:
                  theme.text,
              },
            ]}
          >
            {
              SORT_OPTIONS.find(
                option =>
                  option.id ===
                  sort,
              )?.label
            }
          </Text>

          <Icon
            name="keyboard-arrow-down"
            size={18}
            color={
              theme.textSecondary
            }
          />
        </TouchableOpacity>

        <Text
          style={[
            styles.resultCount,
            {
              color:
                theme.textSecondary,
            },
          ]}
        >
          {filteredHistory.length}{' '}
          {filteredHistory.length ===
          1
            ? 'activity'
            : 'activities'}
        </Text>
      </View>

      {/* FILTER PILLS */}

      <View
        style={styles.filterContainer}
      >
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={item =>
            item.id
          }
          renderItem={({
            item,
          }) =>
            renderFilter(item)
          }
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.filterList
          }
        />
      </View>

      {/* HISTORY */}

      <FlatList
        data={groupedHistory}
        keyExtractor={(
          item,
          index,
        ) =>
          `${item.title}-${index}`
        }
        renderItem={renderGroup}
        ListEmptyComponent={
          renderEmpty
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.historyList,
          groupedHistory.length ===
            0 &&
            styles.historyListEmpty,
        ]}
        refreshing={refreshing}
        onRefresh={
          handleRefresh
        }
        onEndReached={
          handleLoadMore
        }
        onEndReachedThreshold={
          0.5
        }
        ListFooterComponent={
          loadingMore ? (
            <View
              style={
                styles.loadingMore
              }
            >
              <ActivityIndicator
                size="small"
                color={
                  theme.accent
                }
              />
            </View>
          ) : null
        }
      />

      {/* SORT MODAL */}

      <Modal
        visible={sortVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSortVisible(false)
        }
      >
        <TouchableOpacity
          activeOpacity={1}
          style={
            styles.modalOverlay
          }
          onPress={() =>
            setSortVisible(false)
          }
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[
              styles.sortModal,
              {
                backgroundColor:
                  theme.background,
                borderColor:
                  theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.modalHandle,
                {
                  backgroundColor:
                    theme.border,
                },
              ]}
            />

            <Text
              style={[
                styles.modalTitle,
                {
                  color:
                    theme.text,
                },
              ]}
            >
              Sort History
            </Text>

            <Text
              style={[
                styles.modalSubtitle,
                {
                  color:
                    theme.textSecondary,
                },
              ]}
            >
              Choose how your activity
              is displayed.
            </Text>

            <View
              style={
                styles.sortOptions
              }
            >
              {SORT_OPTIONS.map(
                option => {
                  const selected =
                    sort ===
                    option.id;

                  return (
                    <TouchableOpacity
                      key={
                        option.id
                      }
                      style={[
                        styles.sortOption,
                        {
                          backgroundColor:
                            theme.surface,
                          borderColor:
                            theme.border,
                        },
                        selected && {
                          backgroundColor:
                            theme.accentSoft,
                          borderColor:
                            theme.accent,
                        },
                      ]}
                      onPress={() => {
                        setSort(
                          option.id,
                        );
                        setSortVisible(
                          false,
                        );
                      }}
                    >
                      <View
                        style={[
                          styles.sortOptionIcon,
                          {
                            backgroundColor:
                              theme.surfaceAlt,
                          },
                        ]}
                      >
                        <Icon
                          name={
                            option.id ===
                            'recent'
                              ? 'schedule'
                              : option.id ===
                                'oldest'
                              ? 'history'
                              : 'update'
                          }
                          size={20}
                          color={
                            selected
                              ? theme.accent
                              : theme.textSecondary
                          }
                        />
                      </View>

                      <Text
                        style={[
                          styles.sortOptionText,
                          {
                            color:
                              selected
                                ? theme.text
                                : theme.textSecondary,
                          },
                        ]}
                      >
                        {
                          option.label
                        }
                      </Text>

                      {selected && (
                        <Icon
                          name="check"
                          size={21}
                          color={
                            theme.accent
                          }
                        />
                      )}
                    </TouchableOpacity>
                  );
                },
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* HISTORY DETAIL MODAL */}

      <Modal
        visible={Boolean(
          selectedItem,
        )}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setSelectedItem(null)
        }
      >
        <View
          style={
            styles.detailOverlay
          }
        >
          <SafeAreaView
            style={[
              styles.detailModal,
              {
                backgroundColor:
                  theme.background,
              },
            ]}
          >
            {selectedItem && (
              <>
                <View
                  style={[
                    styles.detailHeader,
                    {
                      borderBottomColor:
                        theme.border,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.detailClose,
                      {
                        backgroundColor:
                          theme.surface,
                      },
                    ]}
                    onPress={() =>
                      setSelectedItem(
                        null,
                      )
                    }
                  >
                    <Icon
                      name="close"
                      size={22}
                      color={
                        theme.text
                      }
                    />
                  </TouchableOpacity>

                  <Text
                    style={[
                      styles.detailHeaderTitle,
                      {
                        color:
                          theme.text,
                      },
                    ]}
                  >
                    Activity Details
                  </Text>

                  <View
                    style={
                      styles.detailHeaderSpacer
                    }
                  />
                </View>

                <FlatList
                  data={[
                    selectedItem,
                  ]}
                  keyExtractor={item =>
                    item.id
                  }
                  showsVerticalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.detailContent
                  }
                  renderItem={({
                    item,
                  }) => {
                    const config =
                      getTypeConfig(
                        item.type,
                      );

                    const urgency =
                      getUrgencyConfig(
                        item.urgency,
                      );

                    const isCritical =
                      item.urgency ===
                        'high' ||
                      item.urgency ===
                        'urgent' ||
                      item.urgency ===
                        'critical' ||
                      item.severity ===
                        'HIGH' ||
                      item.severity ===
                        'CRITICAL';

                    return (
                      <>
                        <View
                          style={[
                            styles.detailIcon,
                            {
                              backgroundColor:
                                config.background,
                            },
                          ]}
                        >
                          <Icon
                            name={
                              config.icon
                            }
                            size={30}
                            color={
                              config.color
                            }
                          />
                        </View>

                        <Text
                          style={[
                            styles.detailTitle,
                            {
                              color:
                                theme.text,
                            },
                          ]}
                        >
                          {
                            item.title
                          }
                        </Text>

                        <Text
                          style={[
                            styles.detailType,
                            {
                              color:
                                config.color,
                            },
                          ]}
                        >
                          {
                            config.label
                          }{' '}
                          •{' '}
                          {formatDate(
                            item.createdAt,
                          )}
                        </Text>

                        {item.vehicleName && (
                          <View
                            style={[
                              styles.detailVehicle,
                              {
                                backgroundColor:
                                  theme.surface,
                                borderColor:
                                  theme.border,
                              },
                            ]}
                          >
                            <Icon
                              name="directions-car"
                              size={
                                17
                              }
                              color={
                                theme.accent
                              }
                            />

                            <Text
                              style={[
                                styles.detailVehicleText,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              {
                                item.vehicleName
                              }
                            </Text>
                          </View>
                        )}

                        {/* CRITICAL WARNING */}

                        {isCritical && (
                          <View
                            style={[
                              styles.recommendationCard,
                              {
                                backgroundColor:
                                  '#2B1212',
                                borderColor:
                                  '#802525',
                                marginTop:
                                  16,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.recommendationIcon,
                                {
                                  backgroundColor:
                                    '#451717',
                                },
                              ]}
                            >
                              <Icon
                                name="warning"
                                size={
                                  22
                                }
                                color={
                                  RED
                                }
                              />
                            </View>

                            <View
                              style={
                                styles.recommendationContent
                              }
                            >
                              <Text
                                style={[
                                  styles.recommendationTitle,
                                  {
                                    color:
                                      RED,
                                  },
                                ]}
                              >
                                ⚠️ SAFETY
                                CRITICAL
                              </Text>

                              <Text
                                style={[
                                  styles.recommendationText,
                                  {
                                    color:
                                      '#FFA8A8',
                                  },
                                ]}
                              >
                                Avoid driving
                                the vehicle
                                until the
                                issue has
                                been inspected
                                by a qualified
                                professional
                                mechanic.
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* SUMMARY */}

                        <View
                          style={[
                            styles.detailSection,
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
                              styles.detailSectionTitle,
                              {
                                color:
                                  theme.accent,
                              },
                            ]}
                          >
                            SUMMARY
                          </Text>

                          <Text
                            style={[
                              styles.detailSummary,
                              {
                                color:
                                  theme.textSecondary,
                              },
                            ]}
                          >
                            {
                              item.summary
                            }
                          </Text>
                        </View>

                        {/* SYMPTOMS */}

                        {Array.isArray(
                          item.symptoms,
                        ) &&
                          item.symptoms
                            .length >
                            0 && (
                            <View
                              style={[
                                styles.detailSection,
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
                                  styles.detailSectionTitle,
                                  {
                                    color:
                                      theme.accent,
                                  },
                                ]}
                              >
                                SYMPTOMS
                              </Text>

                              {item.symptoms.map(
                                (
                                  symptom,
                                  index,
                                ) => (
                                  <View
                                    key={
                                      index
                                    }
                                    style={
                                      styles.detailBullet
                                    }
                                  >
                                    <View
                                      style={[
                                        styles.bullet,
                                        {
                                          backgroundColor:
                                            theme.accent,
                                        },
                                      ]}
                                    />

                                    <Text
                                      style={[
                                        styles.detailBulletText,
                                        {
                                          color:
                                            theme.textSecondary,
                                        },
                                      ]}
                                    >
                                      {typeof symptom ===
                                      'string'
                                        ? symptom
                                        : String(
                                            symptom,
                                          )}
                                    </Text>
                                  </View>
                                ),
                              )}
                            </View>
                          )}

                        {/* ASSESSMENT CONFIDENCE */}
                        {item.confidence && (
                          <ConfidenceCard confidence={item.confidence} />
                        )}

                        {/* POSSIBLE CAUSES */}
                        {Array.isArray(
                          item.possibleCauses ||
                            item.possible_causes,
                        ) &&
                          (
                            item.possibleCauses ||
                            item.possible_causes
                          ).length >
                            0 && (
                            <View style={{ marginBottom: 18 }}>
                              <View style={styles.sectionHeaderRow}>
                                <View>
                                  <Text
                                    style={[
                                      styles.detailSectionTitle,
                                      {
                                        color:
                                          theme.accent,
                                      },
                                    ]}
                                  >
                                    POSSIBLE CAUSES
                                  </Text>
                                  <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9, color: theme.textSecondary, marginTop: 2 }}>
                                    Ranked based on the symptoms provided
                                  </Text>
                                </View>

                                <View style={[styles.causeCount, { backgroundColor: theme.surfaceAlt }]}>
                                  <Text style={[styles.causeCountText, { color: theme.textSecondary }]}>
                                    {(item.possibleCauses || item.possible_causes).length}
                                  </Text>
                                </View>
                              </View>

                              {(
                                item.possibleCauses ||
                                item.possible_causes
                              ).map((causeObj, index) => (
                                <PossibleCauseCard
                                  key={`cause-${index}`}
                                  cause={causeObj}
                                  index={index}
                                />
                              ))}
                            </View>
                          )}

                        {/* RECOMMENDED ACTIONS */}

                        {Array.isArray(
                          item.recommendedActions ||
                            item.recommended_actions,
                        ) &&
                          (
                            item.recommendedActions ||
                            item.recommended_actions
                          ).length >
                            0 && (
                            <View
                              style={[
                                styles.detailSection,
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
                                  styles.detailSectionTitle,
                                  {
                                    color:
                                      theme.accent,
                                  },
                                ]}
                              >
                                RECOMMENDED
                                ACTIONS
                              </Text>

                              {(
                                item.recommendedActions ||
                                item.recommended_actions
                              ).map(
                                (
                                  action,
                                  index,
                                ) => (
                                  <View
                                    key={
                                      index
                                    }
                                    style={
                                      styles.detailBullet
                                    }
                                  >
                                    <View
                                      style={[
                                        styles.bullet,
                                        {
                                          backgroundColor:
                                            GREEN,
                                        },
                                      ]}
                                    />

                                    <Text
                                      style={[
                                        styles.detailBulletText,
                                        {
                                          color:
                                            theme.textSecondary,
                                        },
                                      ]}
                                    >
                                      {typeof action ===
                                      'string'
                                        ? action
                                        : action?.action ||
                                          String(
                                            action,
                                          )}
                                    </Text>
                                  </View>
                                ),
                              )}
                            </View>
                          )}

                        {/* ESTIMATED COST */}

                        {(item.estimatedCost ||
                          item.estimated_cost) && (
                          <View
                            style={[
                              styles.detailSection,
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
                                styles.detailSectionTitle,
                                {
                                  color:
                                    theme.accent,
                                },
                              ]}
                            >
                              ESTIMATED
                              COST
                            </Text>

                            <Text
                              style={[
                                styles.detailSummary,
                                {
                                  color:
                                    theme.text,
                                },
                              ]}
                            >
                              ₱
                              {Number(
                                item
                                  .estimatedCost
                                  ?.min ??
                                  item
                                    .estimated_cost
                                    ?.min ??
                                  item.estimated_cost_min ??
                                  0,
                              ).toLocaleString()}{' '}
                              – ₱
                              {Number(
                                item
                                  .estimatedCost
                                  ?.max ??
                                  item
                                    .estimated_cost
                                    ?.max ??
                                  item.estimated_cost_max ??
                                  0,
                              ).toLocaleString()}
                            </Text>
                          </View>
                        )}

                        {/* RECOMMENDATION */}

                        {item.recommendation && (
                          <View
                            style={[
                              styles.recommendationCard,
                              {
                                backgroundColor:
                                  theme.surface,
                                borderColor:
                                  theme.border,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.recommendationIcon,
                                {
                                  backgroundColor:
                                    theme.accentSoft,
                                },
                              ]}
                            >
                              <Icon
                                name="auto-awesome"
                                size={
                                  20
                                }
                                color={
                                  theme.accent
                                }
                              />
                            </View>

                            <View
                              style={
                                styles.recommendationContent
                              }
                            >
                              <Text
                                style={[
                                  styles.recommendationTitle,
                                  {
                                    color:
                                      theme.text,
                                  },
                                ]}
                              >
                                VehiCare
                                Recommendation
                              </Text>

                              <Text
                                style={[
                                  styles.recommendationText,
                                  {
                                    color:
                                      theme.textSecondary,
                                  },
                                ]}
                              >
                                {
                                  item.recommendation
                                }
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* URGENCY */}

                        {urgency && (
                          <View
                            style={
                              styles.detailUrgency
                            }
                          >
                            <Text
                              style={[
                                styles.detailSectionTitle,
                                {
                                  color:
                                    theme.textSecondary,
                                },
                              ]}
                            >
                              URGENCY
                            </Text>

                            <View
                              style={[
                                styles.detailUrgencyBadge,
                                {
                                  backgroundColor:
                                    urgency.background,
                                },
                              ]}
                            >
                              <View
                                style={[
                                  styles.urgencyDot,
                                  {
                                    backgroundColor:
                                      urgency.color,
                                  },
                                ]}
                              />

                              <Text
                                style={[
                                  styles.detailUrgencyText,
                                  {
                                    color:
                                      urgency.color,
                                  },
                                ]}
                              >
                                {
                                  urgency.label
                                }
                              </Text>
                            </View>
                          </View>
                        )}

                        {/* CHAT */}

                        {item.type ===
                          'chat' && (
                          <TouchableOpacity
                            style={[
                              styles.viewConversationButton,
                              {
                                backgroundColor:
                                  theme.accent,
                              },
                            ]}
                            onPress={() => {
                              setSelectedItem(
                                null,
                              );

                              navigation.navigate(
                                'AskVehiCare',
                                {
                                  historyId:
                                    item.session_id ||
                                    item.id,
                                },
                              );
                            }}
                          >
                            <Icon
                              name="chat"
                              size={18}
                              color="#FFFFFF"
                            />

                            <Text
                              style={
                                styles.viewConversationText
                              }
                            >
                              View Conversation
                            </Text>
                          </TouchableOpacity>
                        )}
                      </>
                    );
                  }}
                />
              </>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  /* HEADER */

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 12,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
    borderWidth: 1,
  },

  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.8,
    marginBottom: 2,
  },

  title: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 28,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 3,
  },

  /* SEARCH */

  searchContainer: {
    marginHorizontal: 20,
    height: 48,
    borderRadius: 15,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginLeft: 9,
    paddingVertical: 0,
  },

  /* SORT */

  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 13,
  },

  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  sortLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginLeft: 6,
  },

  sortValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    marginLeft: 4,
  },

  resultCount: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
  },

  /* FILTERS */

  /*
   * IMPORTANT:
   * The filter list is wrapped in a fixed-height container.
   * This prevents the history FlatList from rendering
   * underneath the filter pills.
   */

  filterContainer: {
    height: 54,
    marginTop: 10,
    width: '100%',
  },

  filterList: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 7,
    paddingVertical: 5,
  },

  filterButton: {
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
  },

  filterText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    marginLeft: 5,
  },

  /* HISTORY */

  historyList: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 45,
  },

  historyListEmpty: {
    flexGrow: 1,
  },

  group: {
    marginBottom: 20,
  },

  groupTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 9,
  },

  historyCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },

  historyTop: {
    flexDirection: 'row',
  },

  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  historyContent: {
    flex: 1,
    minWidth: 0,
  },

  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  historyTitle: {
    flex: 1,
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
  },

  historyType: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    marginTop: 2,
  },

  historySummary: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 7,
  },

  historyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  historyVehicle: {
    fontFamily: 'Inter-Regular',
    fontSize: 8,
    maxWidth: 130,
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 3,
    marginHorizontal: 6,
  },

  historyDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 8,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 13,
    paddingTop: 11,
  },

  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },

  urgencyDot: {
    width: 5,
    height: 5,
    borderRadius: 5,
    marginRight: 5,
  },

  urgencyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
  },

  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  summaryBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    marginLeft: 4,
  },

  viewText: {
    color: MUTED,
    fontFamily: 'Inter-Regular',
    fontSize: 8,
  },

  /* EMPTY */

  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 65,
  },

  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 20,
  },

  emptyDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 310,
    marginTop: 8,
  },

  clearButton: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    marginTop: 18,
  },

  clearButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
  },

  /* LOADING */

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 12,
  },

  loadingMore: {
    paddingVertical: 15,
    alignItems: 'center',
  },

  /* SORT MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },

  sortModal: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },

  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 4,
    alignSelf: 'center',
    marginBottom: 22,
  },

  modalTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 21,
  },

  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 4,
    marginBottom: 18,
  },

  sortOptions: {
    gap: 8,
  },

  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
  },

  sortOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  sortOptionText: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },

  /* DETAIL MODAL */

  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },

  detailModal: {
    flex: 1,
    marginTop: 45,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },

  detailHeader: {
    height: 65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },

  detailClose: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  detailHeaderTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 16,
  },

  detailHeaderSpacer: {
    width: 38,
  },

  detailContent: {
    padding: 22,
    paddingBottom: 50,
  },

  detailIcon: {
    width: 62,
    height: 62,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  detailTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 25,
  },

  detailType: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    marginTop: 5,
  },

  detailVehicle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    marginTop: 18,
  },

  detailVehicleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    marginLeft: 7,
  },

  detailSection: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    marginTop: 18,
  },

  detailSectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 1.3,
    marginBottom: 9,
  },

  detailSummary: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    lineHeight: 21,
  },

  detailBullet: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  bullet: {
    width: 5,
    height: 5,
    borderRadius: 5,
    marginTop: 7,
    marginRight: 9,
  },

  detailBulletText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 19,
  },

  recommendationCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
    marginTop: 18,
  },

  recommendationIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  recommendationContent: {
    flex: 1,
  },

  recommendationTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
  },

  recommendationText: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },

  detailUrgency: {
    marginTop: 20,
  },

  detailUrgencyBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  detailUrgencyText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    marginLeft: 5,
  },

  viewConversationButton: {
    height: 50,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },

  viewConversationText: {
    color: '#FFFFFF',
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
    marginLeft: 7,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  causeCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  causeCountText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
  },
});

export default HistoryScreen;
