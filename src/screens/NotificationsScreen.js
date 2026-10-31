import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useVehicle } from '../context/VehicleContext';
import useRealtimeUpdates from '../hooks/useRealtimeUpdates';
import notificationService from '../services/notificationService';
import vehicleApi from '../api/vehicleApi';
import { requestNotificationPermission } from '../services/permissionService';
import { useTheme } from '../theme/ThemeContext';
import CustomModal from '../components/CustomModal';
import SkeletonLoader from '../components/SkeletonLoader';

const CATEGORY_KEYS = [
  'All',
  'Announcements',
  'Vehicle',
  'Diagnostics',
  'Maintenance',
  'Account',
];

/* ============================================================
   HELPERS
============================================================ */

const relativeTime = timestamp => {
  const diff = Date.now() - Number(timestamp);

  if (diff < 0) return 'Now';

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;

  return `${Math.floor(days / 30)}mo`;
};

const groupByDate = items => {
  const today = [];
  const yesterday = [];
  const earlier = [];

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  items.forEach(item => {
    const timestamp = Number(item.timestamp);
    if (timestamp >= startOfToday) {
      today.push(item);
    } else if (timestamp >= startOfYesterday) {
      yesterday.push(item);
    } else {
      earlier.push(item);
    }
  });

  const sections = [];
  if (today.length) sections.push({ title: 'TODAY', data: today });
  if (yesterday.length) sections.push({ title: 'YESTERDAY', data: yesterday });
  if (earlier.length) sections.push({ title: 'EARLIER', data: earlier });

  return sections;
};

const BRAND = '#F5501C';

const getNotificationMeta = (type, isDark = false) => {
  switch (type) {
    case 'announcement':
      return {
        icon: 'campaign',
        label: 'Announcement',
        color: isDark ? '#38BDF8' : '#0284C7',
        background: isDark ? 'rgba(56, 189, 248, 0.14)' : '#E0F2FE',
      };

    case 'maintenance':
      return {
        icon: 'build',
        label: 'Maintenance',
        color: isDark ? '#32D583' : '#15803D',
        background: isDark ? 'rgba(50, 213, 131, 0.14)' : '#DCFCE7',
      };

    case 'diagnostic':
      return {
        icon: 'medical-services',
        label: 'Diagnostics',
        color: BRAND,
        background: isDark ? 'rgba(245, 80, 28, 0.14)' : '#FEE4DA',
      };

    case 'account_security':
      return {
        icon: 'security',
        label: 'Account',
        color: isDark ? '#38BDF8' : '#0284C7',
        background: isDark ? 'rgba(56, 189, 248, 0.14)' : '#E0F2FE',
      };

    case 'vehicle_update':
    case 'vehicle_edit_approved':
      return {
        icon: 'check-circle',
        label: 'Vehicle',
        color: isDark ? '#32D583' : '#15803D',
        background: isDark ? 'rgba(50, 213, 131, 0.14)' : '#DCFCE7',
      };

    case 'vehicle_edit_rejected':
      return {
        icon: 'cancel',
        label: 'Vehicle',
        color: isDark ? '#EF4444' : '#DC2626',
        background: isDark ? 'rgba(239, 68, 68, 0.14)' : '#FEE2E2',
      };

    case 'vehicle_archived':
      return {
        icon: 'archive',
        label: 'Vehicle',
        color: isDark ? '#A1A1AA' : '#4B5563',
        background: isDark ? 'rgba(161, 161, 170, 0.14)' : '#F3F4F6',
      };

    case 'vehicle_restored':
      return {
        icon: 'unarchive',
        label: 'Vehicle',
        color: isDark ? '#38BDF8' : '#0284C7',
        background: isDark ? 'rgba(56, 189, 248, 0.14)' : '#E0F2FE',
      };

    default:
      return {
        icon: 'notifications',
        label: 'General',
        color: BRAND,
        background: isDark ? 'rgba(245, 80, 28, 0.14)' : '#FEE4DA',
      };
  }
};

/* ============================================================
   NOTIFICATION ROW COMPONENT
============================================================ */

const NotificationRow = ({ item, onPress, theme }) => {
  const unread = !item.isRead;
  const isDark = theme?.name === 'dark';
  const meta = getNotificationMeta(item.type, isDark);

  return (
    <TouchableOpacity
      activeOpacity={0.84}
      onPress={() => onPress(item)}
      style={[
        styles.notificationCard,
        {
          backgroundColor: isDark
            ? (unread ? '#1C1513' : '#16161A')
            : (unread ? '#FFF7ED' : theme.surface),
          borderColor: isDark
            ? (unread ? 'rgba(245, 80, 28, 0.40)' : '#232328')
            : (unread ? '#FED7AA' : theme.border),
        },
      ]}
    >
      {/* UNREAD ACCENT STRIP */}
      {unread && <View style={styles.unreadAccentBar} />}

      {/* ICON BADGE */}
      <View style={[styles.iconContainer, { backgroundColor: meta.background }]}>
        <Icon name={meta.icon} size={20} color={meta.color} />
      </View>

      {/* CONTENT BODY */}
      <View style={styles.notificationContent}>
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            style={[
              styles.notificationTitle,
              {
                color: isDark ? '#FFFFFF' : theme.text,
                fontFamily: unread ? 'Outfit-Bold' : 'Outfit-SemiBold',
              },
            ]}
          >
            {item.title}
          </Text>

          <Text style={[styles.timestamp, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
            {relativeTime(item.timestamp)}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          style={[styles.notificationMessage, { color: isDark ? '#A1A1AA' : theme.textSecondary }]}
        >
          {item.message}
        </Text>

        <View style={styles.metaRow}>
          <View
            style={[
              styles.categoryBadge,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F3F4F6',
              },
            ]}
          >
            <Icon name={meta.icon} size={11} color={meta.color} />
            <Text style={[styles.categoryText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>

          {unread && (
            <View style={styles.unreadLabel}>
              <View style={styles.unreadDot} />
              <Text style={styles.unreadText}>NEW</Text>
            </View>
          )}

          <View style={{ flex: 1 }} />

          <Icon name="chevron-right" size={16} color={isDark ? '#71717A' : '#9CA3AF'} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ============================================================
   CATEGORY CHIPS
============================================================ */

const SectionChips = ({ category, setCategory, notifications = [], theme }) => {
  const isDark = theme?.name === 'dark';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterPillsRow}
    >
      {CATEGORY_KEYS.map(key => {
        const active = key === category;

        const icon =
          key === 'All'
            ? 'notifications'
            : key === 'Vehicle'
            ? 'directions-car'
            : key === 'Diagnostics'
            ? 'medical-services'
            : key === 'Maintenance'
            ? 'build'
            : key === 'Announcements'
            ? 'campaign'
            : 'person';

        const unreadCount = notifications.filter(n => {
          if (n.isRead) return false;
          if (key === 'All') return true;
          return (n.category || '').toLowerCase() === key.toLowerCase();
        }).length;

        return (
          <TouchableOpacity
            key={key}
            activeOpacity={0.8}
            onPress={() => setCategory(key)}
            style={[
              styles.filterPill,
              active && styles.filterPillActive,
              {
                backgroundColor: active
                  ? BRAND
                  : (isDark ? '#16161A' : theme.surface),
                borderColor: active
                  ? BRAND
                  : (isDark ? '#232328' : theme.border),
              },
            ]}
          >
            <Icon
              name={icon}
              size={14}
              color={active ? '#FFFFFF' : (isDark ? '#8E8E93' : theme.textSecondary)}
            />

            <Text
              style={[
                styles.filterPillText,
                active && styles.filterPillTextActive,
                {
                  color: active ? '#FFFFFF' : (isDark ? '#8E8E93' : theme.textSecondary),
                },
              ]}
            >
              {key}
            </Text>

            {unreadCount > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  {
                    backgroundColor: active
                      ? 'rgba(255, 255, 255, 0.25)'
                      : (isDark ? 'rgba(245, 80, 28, 0.16)' : '#FEE4DA'),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    {
                      color: active ? '#FFFFFF' : BRAND,
                    },
                  ]}
                >
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

/* ============================================================
   ANNOUNCEMENT MODAL COMPONENT
============================================================ */

const AnnouncementModal = ({
  visible,
  title,
  message,
  date,
  badgeLabel = 'ANNOUNCEMENT',
  badgeIcon = 'campaign',
  onClose,
  theme,
}) => {
  if (!visible) return null;
  const isDark = theme?.name === 'dark';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.announcementModalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.announcementModalCard,
            {
              backgroundColor: isDark ? '#16161A' : '#FFFFFF',
              borderColor: isDark ? '#232328' : '#E2E8F0',
            },
          ]}
        >
          {/* Header Row: Category Badge + Circular Close Button */}
          <View style={styles.announcementHeaderRow}>
            <View
              style={[
                styles.announcementBadge,
                { backgroundColor: isDark ? 'rgba(245, 80, 28, 0.14)' : '#FFF2EE' },
              ]}
            >
              <Icon name={badgeIcon || 'campaign'} size={14} color={BRAND} />
              <Text style={styles.announcementBadgeText}>{badgeLabel || 'ANNOUNCEMENT'}</Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              style={[
                styles.announcementCloseBtn,
                {
                  backgroundColor: isDark ? '#202025' : '#F1F5F9',
                  borderWidth: 1,
                  borderColor: isDark ? '#2E2F35' : '#E2E8F0',
                },
              ]}
              accessibilityLabel="Close announcement"
            >
              <Icon name="close" size={16} color={isDark ? '#A1A1AA' : '#64748B'} />
            </TouchableOpacity>
          </View>

          {/* Title & Metadata */}
          <Text
            style={[styles.announcementTitle, { color: isDark ? '#FFFFFF' : theme.text }]}
            numberOfLines={2}
          >
            {title || 'Announcement'}
          </Text>

          {date ? (
            <Text style={[styles.announcementDate, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
              {date}
            </Text>
          ) : null}

          <View
            style={[
              styles.announcementDivider,
              { backgroundColor: isDark ? '#232328' : '#F1F5F9' },
            ]}
          />

          {/* Scrollable Body Text */}
          <ScrollView
            style={styles.announcementScroll}
            contentContainerStyle={styles.announcementScrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text
              style={[
                styles.announcementBody,
                { color: isDark ? '#D4D4D8' : '#334155' },
              ]}
            >
              {message}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ============================================================
   MAIN NOTIFICATIONS SCREEN
============================================================ */

const NotificationsScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const isDark = theme?.name === 'dark';
  const { openSidebar } = useSidebar();
  const { refreshActiveVehicle } = useVehicle();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('All');
  const [fetchError, setFetchError] = useState(null);
  const [modalState, setModalState] = useState({
    visible: false,
    title: '',
    message: '',
    icon: null,
  });
  const [announcementModal, setAnnouncementModal] = useState({
    visible: false,
    title: '',
    message: '',
    date: null,
    badgeLabel: 'ANNOUNCEMENT',
    badgeIcon: 'campaign',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef(null);
  const ITEMS_PER_PAGE = 15;
  const mountedRef = useRef(false);
  const loadInFlightRef = useRef(false);
  const refreshPendingRef = useRef(false);
  const loadRef = useRef(null);
  const handledPushClickRef = useRef(null);
  const locallyReadIdsRef = useRef(new Set());
  const currentUserIdRef = useRef(user?.id);
  currentUserIdRef.current = user?.id;

  const handleRealtimeNotification = useCallback(
    broadcastData => {
      console.info('[NotificationsScreen] Realtime notification received:', broadcastData);
      loadRef.current?.();
    },
    [],
  );

  useRealtimeUpdates(user?.id, {
    'Illuminate\\Notifications\\Events\\BroadcastNotificationCreated': handleRealtimeNotification,
    'payment.updated': handleRealtimeNotification,
  });

  /* ----------------------------------------------------------
     LOAD DATA
  ---------------------------------------------------------- */

  const load = useCallback(async () => {
    if (!mountedRef.current) return;

    if (loadInFlightRef.current) {
      refreshPendingRef.current = true;
      return;
    }

    loadInFlightRef.current = true;
    const requestedUserId = user?.id;
    try {
      setFetchError(null);
      const items = await notificationService.fetchNotifications();
      if (mountedRef.current && currentUserIdRef.current === requestedUserId) {
        const normalizedItems = Array.isArray(items)
          ? items.map(item =>
              locallyReadIdsRef.current.has(String(item.id))
                ? { ...item, isRead: true }
                : item,
            )
          : [];
        setNotifications(normalizedItems);
      }
    } catch (error) {
      if (mountedRef.current && currentUserIdRef.current === requestedUserId) {
        setFetchError(error?.message || 'Failed to load notifications. Please check your connection.');
      }
    } finally {
      loadInFlightRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        if (currentUserIdRef.current !== requestedUserId || refreshPendingRef.current) {
          refreshPendingRef.current = false;
          loadRef.current?.();
        }
      }
    }
  }, [user?.id]);
  loadRef.current = load;

  useEffect(() => {
    mountedRef.current = true;
    requestNotificationPermission({ showSettingsDialog: false }).catch(() => {});
    load();

    const timerId = setInterval(() => {
      load();
    }, 12000);

    return () => {
      mountedRef.current = false;
      clearInterval(timerId);
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    if (mountedRef.current) setRefreshing(false);
  }, [load]);

  const onMarkAll = useCallback(async () => {
    try {
      setNotifications(prev => {
        prev.forEach(n => {
          if (n?.id != null) locallyReadIdsRef.current.add(String(n.id));
        });
        return prev.map(n => ({ ...n, isRead: true }));
      });
      await notificationService.markAllAsRead();
      await load();
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  }, [load]);

  const onPressNotification = useCallback(
    async item => {
      if (!item) return;
      try {
        if (item.id != null) {
          const idStr = String(item.id);
          locallyReadIdsRef.current.add(idStr);
          setNotifications(prev =>
            prev.map(n => (String(n.id) === idStr ? { ...n, isRead: true } : n)),
          );
        }

        if (!item.isRead && item.id != null) {
          await notificationService.markAsRead(item.id);
        }

        load();

        const targetVehicleId = item.vehicleId || item.data?.vehicle_id;
        const normType = String(item.type || '').toLowerCase();
        const normCat = String(item.category || '').toLowerCase();
        const dateStr = item.timestamp
          ? new Date(item.timestamp).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : null;

        // 1. Diagnostic Alert Notification -> Navigate to History and open diagnostic details
        if (normType === 'diagnostic' || normCat === 'diagnostics') {
          const diagId = item.data?.diagnostic_id || item.data?.id || item.requestId;
          navigation.navigate('History', {
            selectedDiagnosticId: diagId,
            filter: 'diagnosis',
          });
          return;
        }

        // 2. Announcement Notification -> Display in sleek AnnouncementModal
        if (normType === 'announcement' || normCat === 'announcements') {
          setAnnouncementModal({
            visible: true,
            title: item.title || 'Announcement',
            message: item.message || '',
            date: dateStr,
            badgeLabel: 'ANNOUNCEMENT',
            badgeIcon: 'campaign',
          });
          return;
        }

        // 3. Maintenance Notification -> Navigate to Maintenance screen
        if (normType === 'maintenance' || normCat === 'maintenance') {
          navigation.navigate('Maintenance');
          return;
        }

        // 4. Payment / Subscription Notification -> Navigate to Manage Plan
        if (normType.includes('payment') || normType.includes('premium') || normType.includes('refund')) {
          navigation.navigate('ManagePlan');
          return;
        }

        switch (item.type) {
          case 'vehicle_edit_approved':
            if (targetVehicleId) {
              try {
                const updatedVehicle = await vehicleApi.getVehicleById(targetVehicleId);
                await refreshActiveVehicle();
                navigation.navigate('MyVehicles', { vehicle: updatedVehicle, openVehicleId: targetVehicleId });
              } catch (e) {
                console.warn('Failed to fetch updated vehicle details:', e?.message);
                await refreshActiveVehicle();
                navigation.navigate('MyVehicles', { openVehicleId: targetVehicleId });
              }
            } else {
              navigation.navigate('MyVehicles');
            }
            break;

          case 'vehicle_edit_rejected':
            {
              const adminNote = item.data?.admin_note || item.message || '';
              setModalState({
                visible: true,
                title: 'Vehicle Update Rejected',
                message: `Your request to update your vehicle was rejected by the administrator.\n\nReason:\n${adminNote || 'No specific reason provided.'}`,
                icon: 'error-outline',
              });
            }
            break;

          case 'vehicle_update':
          case 'vehicle_archived':
          case 'vehicle_restored':
            navigation.navigate('Vehicles');
            break;

          default:
            {
              const meta = getNotificationMeta(item.type, isDark);
              setAnnouncementModal({
                visible: true,
                title: item.title || 'Notification Details',
                message: item.message || '',
                date: dateStr,
                badgeLabel: (meta?.label || 'Notification').toUpperCase(),
                badgeIcon: meta?.icon || 'notifications',
              });
            }
            break;
        }
      } catch (error) {
        console.error('Failed processing notification click:', error);
      }
    },
    [navigation, refreshActiveVehicle, load, isDark],
  );

  // Open notification details and mark as read when launched/clicked from a push notification
  useEffect(() => {
    const openNotifId = route?.params?.openNotificationId;
    const openNotifPayload = route?.params?.openNotification;
    const pushTs = route?.params?._pushClickTs || openNotifId || openNotifPayload?.title;
    if (!pushTs || handledPushClickRef.current === pushTs) {
      return;
    }
    if (loading && !openNotifPayload) {
      return;
    }

    const matched = openNotifId
      ? notifications.find(n => String(n.id) === String(openNotifId))
      : null;
    const targetItem = matched || openNotifPayload || notifications.find(n => !n.isRead);
    if (!targetItem) {
      return;
    }

    handledPushClickRef.current = pushTs;
    onPressNotification(targetItem);
  }, [
    route?.params?.openNotificationId,
    route?.params?.openNotification,
    route?.params?._pushClickTs,
    notifications,
    loading,
    onPressNotification,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [category]);

  const filteredNotifications = useMemo(() => {
    if (category === 'All') return notifications;
    return notifications.filter(
      n => (n.category || '').toLowerCase() === category.toLowerCase(),
    );
  }, [notifications, category]);

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / ITEMS_PER_PAGE));

  const currentPageItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNotifications.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredNotifications, currentPage]);

  const sections = useMemo(
    () => groupByDate(currentPageItems),
    [currentPageItems],
  );

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications],
  );

  /* ==========================================================
     FOOTER PAGINATION RENDERER
  ========================================================== */

  const renderFooter = () => {
    if (filteredNotifications.length <= ITEMS_PER_PAGE) return null;

    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(filteredNotifications.length, currentPage * ITEMS_PER_PAGE);

    return (
      <View style={[styles.paginationCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.paginationInfoRow}>
          <Text style={[styles.paginationInfoText, { color: theme.textSecondary }]}>
            Showing <Text style={{ color: theme.text, fontFamily: 'Outfit-Bold' }}>{startItem}–{endItem}</Text> of <Text style={{ color: theme.text, fontFamily: 'Outfit-Bold' }}>{filteredNotifications.length}</Text>
          </Text>
          <View style={[styles.pageIndicatorPill, { backgroundColor: isDark ? '#27160F' : '#FFF4F0' }]}>
            <Text style={[styles.pageIndicatorText, { color: isDark ? '#F63B05' : '#C2410C' }]}>
              Page {currentPage} of {totalPages}
            </Text>
          </View>
        </View>

        <View style={styles.paginationControlsRow}>
          <TouchableOpacity
            disabled={currentPage === 1}
            onPress={() => {
              if (currentPage > 1) {
                setCurrentPage(p => p - 1);
                listRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: true });
              }
            }}
            activeOpacity={0.75}
            style={[
              styles.paginationNavButton,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                opacity: currentPage === 1 ? 0.35 : 1,
              },
            ]}
          >
            <Icon name="chevron-left" size={18} color={theme.text} />
            <Text style={[styles.paginationNavText, { color: theme.text }]}>Prev</Text>
          </TouchableOpacity>

          <View style={styles.pagePillsRow}>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => {
                const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                const isActive = p === currentPage;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && (
                      <Text style={[styles.paginationDots, { color: theme.textSecondary }]}>•••</Text>
                    )}
                    <TouchableOpacity
                      onPress={() => {
                        setCurrentPage(p);
                        listRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: true });
                      }}
                      activeOpacity={0.8}
                      style={[
                        styles.pagePill,
                        isActive
                          ? { backgroundColor: '#F63B05', borderColor: '#F63B05' }
                          : { backgroundColor: theme.surfaceAlt, borderColor: theme.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pagePillText,
                          {
                            color: isActive ? '#FFFFFF' : theme.textSecondary,
                            fontFamily: isActive ? 'Outfit-Bold' : 'Inter-Medium',
                          },
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
          </View>

          <TouchableOpacity
            disabled={currentPage === totalPages}
            onPress={() => {
              if (currentPage < totalPages) {
                setCurrentPage(p => p + 1);
                listRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: true });
              }
            }}
            activeOpacity={0.75}
            style={[
              styles.paginationNavButton,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                opacity: currentPage === totalPages ? 0.35 : 1,
              },
            ]}
          >
            <Text style={[styles.paginationNavText, { color: theme.text }]}>Next</Text>
            <Icon name="chevron-right" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  /* ==========================================================
     HEADER RENDERER
  ========================================================== */

  const renderHeader = () => (
    <>
      {/* SCREEN TOP HEADER */}
      <View style={styles.screenHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                backgroundColor: isDark ? '#16161A' : theme.surface,
                borderColor: isDark ? '#232328' : theme.border,
              },
            ]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            accessibilityLabel="Go back"
          >
            <Icon name="arrow-back" size={20} color={isDark ? '#FFFFFF' : theme.text} />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.eyebrow, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
              UPDATES & ACTIVITY
            </Text>
            <View style={styles.titleWithBadge}>
              <Text style={[styles.screenTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                Notifications
              </Text>
              {unreadCount > 0 && (
                <View style={styles.headerUnreadBadge}>
                  <Text style={styles.headerUnreadText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor: isDark ? 'rgba(245, 80, 28, 0.12)' : '#FFF2EE',
                  borderColor: isDark ? 'rgba(245, 80, 28, 0.35)' : '#FED7AA',
                },
              ]}
              onPress={onMarkAll}
              activeOpacity={0.8}
              accessibilityLabel="Mark all as read"
            >
              <Icon name="done-all" size={20} color={BRAND} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                backgroundColor: isDark ? '#16161A' : theme.surface,
                borderColor: isDark ? '#232328' : theme.border,
              },
            ]}
            onPress={openSidebar}
            activeOpacity={0.8}
            accessibilityLabel="Open Sidebar Menu"
          >
            <Icon name="menu" size={20} color={isDark ? '#FFFFFF' : theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* CATEGORY FILTER CHIPS */}
      <View style={styles.filterContainer}>
        <SectionChips
          category={category}
          setCategory={setCategory}
          notifications={notifications}
          theme={theme}
        />
      </View>

      {/* UNREAD STATUS BANNER */}
      {unreadCount > 0 && (
        <View
          style={[
            styles.unreadBanner,
            {
              backgroundColor: isDark ? '#1C1513' : '#FFF7ED',
              borderColor: isDark ? '#422418' : '#FED7AA',
            },
          ]}
        >
          <View style={styles.unreadBannerLeft}>
            <View style={styles.unreadBannerDot} />
            <Text style={[styles.unreadBannerText, { color: isDark ? '#C2B5AF' : theme.textSecondary }]}>
              <Text style={{ fontWeight: '700', color: isDark ? '#FFFFFF' : theme.text }}>
                {unreadCount} unread update{unreadCount === 1 ? '' : 's'}
              </Text>{' '}
              requiring attention
            </Text>
          </View>

          <TouchableOpacity
            onPress={onMarkAll}
            activeOpacity={0.8}
            style={styles.markAllInlineBtn}
          >
            <Icon name="done-all" size={13} color={BRAND} />
            <Text style={styles.markAllInlineText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  /* ==========================================================
     LOADING STATE
  ========================================================== */

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
        <SkeletonLoader variant="notifications" />
      </SafeAreaView>
    );
  }

  /* ==========================================================
     MAIN RENDER
  ========================================================== */

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />

      {sections.length === 0 ? (
        <SectionList
          sections={[]}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            fetchError ? (
              <View style={styles.emptyWrap}>
                <View
                  style={[
                    styles.emptyIconContainer,
                    { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEE2E2' },
                  ]}
                >
                  <Icon name="error-outline" size={32} color="#EF4444" />
                </View>

                <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Unable to Load Notifications
                </Text>

                <Text style={[styles.emptyDesc, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  {fetchError}
                </Text>

                <TouchableOpacity
                  style={styles.emptyPrimaryBtn}
                  onPress={onRefresh}
                  activeOpacity={0.8}
                >
                  <Icon name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.emptyPrimaryBtnText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyWrap}>
                <View
                  style={[
                    styles.emptyIconContainer,
                    { backgroundColor: isDark ? 'rgba(50, 213, 131, 0.12)' : '#DCFCE7' },
                  ]}
                >
                  <Icon name="notifications-none" size={32} color="#32D583" />
                </View>

                <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  You're All Caught Up
                </Text>

                <Text style={[styles.emptyDesc, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  {category === 'All'
                    ? "There aren't any notifications right now. We'll let you know when something needs your attention."
                    : `There aren't any ${category.toLowerCase()} notifications right now.`}
                </Text>

                {category !== 'All' && (
                  <TouchableOpacity
                    style={[
                      styles.clearFilterBtn,
                      {
                        backgroundColor: isDark ? '#16161A' : theme.surface,
                        borderColor: isDark ? '#232328' : theme.border,
                      },
                    ]}
                    onPress={() => setCategory('All')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.clearFilterBtnText, { color: isDark ? '#FFFFFF' : theme.text }]}>
                      View All Notifications
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.emptyListContent, { backgroundColor: theme.background }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />
          }
        />
      ) : (
        <SectionList
          ref={listRef}
          sections={sections}
          keyExtractor={item => String(item.id)}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          renderItem={({ item }) => (
            <NotificationRow
              item={item}
              onPress={onPressNotification}
              theme={theme}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeaderContainer, { backgroundColor: theme.background }]}>
              <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
                {title}
              </Text>
              <View style={[styles.sectionLine, { backgroundColor: theme.border }]} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND} />
          }
        />
      )}

      <AnnouncementModal
        visible={announcementModal.visible}
        title={announcementModal.title}
        message={announcementModal.message}
        date={announcementModal.date}
        badgeLabel={announcementModal.badgeLabel}
        badgeIcon={announcementModal.badgeIcon}
        onClose={() =>
          setAnnouncementModal({
            visible: false,
            title: '',
            message: '',
            date: null,
            badgeLabel: 'ANNOUNCEMENT',
            badgeIcon: 'campaign',
          })
        }
        theme={theme}
      />

      <CustomModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        type="info"
        icon={modalState.icon || 'campaign'}
        primaryLabel="Close"
        onConfirm={() => setModalState({ visible: false, title: '', message: '', icon: null })}
        onCancel={() => setModalState({ visible: false, title: '', message: '', icon: null })}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 13,
  },

  /* HEADER */
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  screenTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    letterSpacing: -0.4,
  },
  headerUnreadBadge: {
    backgroundColor: BRAND,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  headerUnreadText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10.5,
    color: '#FFFFFF',
  },

  /* UNREAD ATTENTION BANNER */
  unreadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  unreadBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  unreadBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND,
  },
  unreadBannerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  markAllInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 80, 28, 0.12)',
  },
  markAllInlineText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11.5,
    color: BRAND,
  },

  /* FILTER PILLS (Identical capsule design to SmartRecommendationsScreen) */
  filterContainer: {
    marginBottom: 12,
  },
  filterPillsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterPillActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  filterPillText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  filterPillTextActive: {
    fontFamily: 'Outfit-Bold',
    color: '#FFFFFF',
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
  },
  tabBadgeText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 9.5,
  },

  /* SECTION HEADER */
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  sectionHeader: {
    fontFamily: 'Inter-Bold',
    fontSize: 10.5,
    letterSpacing: 1.2,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },

  /* LIST CONTENT */
  listContent: {
    paddingBottom: 115,
  },
  emptyListContent: {
    paddingBottom: 115,
  },

  /* NOTIFICATION CARD */
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  unreadAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: BRAND,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14.5,
    flex: 1,
    letterSpacing: -0.2,
  },
  timestamp: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
  },
  notificationMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  categoryText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9.5,
    letterSpacing: 0.2,
  },
  unreadLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    backgroundColor: 'rgba(245, 80, 28, 0.12)',
  },
  unreadDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BRAND,
  },
  unreadText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 9,
    color: BRAND,
    letterSpacing: 0.5,
  },

  /* EMPTY STATE */
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 56,
  },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  emptyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: BRAND,
  },
  emptyPrimaryBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },
  clearFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearFilterBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12.5,
  },

  /* ANNOUNCEMENT MODAL */
  announcementModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  announcementModalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '72%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 14,
  },
  announcementHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  announcementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 16,
    gap: 5,
  },
  announcementBadgeText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 10.5,
    color: BRAND,
    letterSpacing: 0.6,
  },
  announcementCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  announcementTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 4,
  },
  announcementDate: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    marginBottom: 10,
  },
  announcementDivider: {
    height: 1,
    marginBottom: 12,
  },
  announcementScroll: {
    maxHeight: 260,
  },
  announcementScrollContent: {
    paddingBottom: 8,
  },
  announcementBody: {
    fontFamily: 'Inter-Regular',
    fontSize: 13.5,
    lineHeight: 21,
  },

  /* PAGINATION */
  paginationCard: {
    marginTop: 14,
    marginBottom: 28,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
  },
  paginationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paginationInfoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  pageIndicatorPill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  pageIndicatorText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  paginationControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paginationNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
  },
  paginationNavText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
  },
  pagePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pagePill: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagePillText: {
    fontSize: 12,
  },
  paginationDots: {
    fontSize: 10,
    letterSpacing: 1,
    paddingHorizontal: 2,
  },
});

export default NotificationsScreen;