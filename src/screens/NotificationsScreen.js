import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useTheme } from '../theme/ThemeContext';

const CATEGORY_KEYS = [
  'All',
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

const getNotificationMeta = (type, isDark = false) => {
  switch (type) {
    case 'maintenance':
      return {
        icon: 'build',
        label: 'Maintenance',
        color: isDark ? '#32D583' : '#15803D',
        background: isDark ? '#13241A' : '#DCFCE7',
      };

    case 'diagnostic':
      return {
        icon: 'medical-services',
        label: 'Diagnostics',
        color: isDark ? '#F63B05' : '#C2410C',
        background: isDark ? '#27160F' : '#FEE4DA',
      };

    case 'account_security':
      return {
        icon: 'security',
        label: 'Account',
        color: isDark ? '#38BDF8' : '#0284C7',
        background: isDark ? '#122438' : '#E0F2FE',
      };

    case 'vehicle_update':
    case 'vehicle_edit_approved':
      return {
        icon: 'check-circle',
        label: 'Vehicle',
        color: isDark ? '#32D583' : '#15803D',
        background: isDark ? '#13241A' : '#DCFCE7',
      };

    case 'vehicle_edit_rejected':
      return {
        icon: 'cancel',
        label: 'Vehicle',
        color: isDark ? '#FF5A5F' : '#DC2626',
        background: isDark ? '#381617' : '#FEE2E2',
      };

    case 'vehicle_archived':
      return {
        icon: 'archive',
        label: 'Vehicle',
        color: isDark ? '#A3A3A3' : '#4B5563',
        background: isDark ? '#262626' : '#F3F4F6',
      };

    case 'vehicle_restored':
      return {
        icon: 'unarchive',
        label: 'Vehicle',
        color: isDark ? '#38BDF8' : '#0284C7',
        background: isDark ? '#122438' : '#E0F2FE',
      };

    default:
      return {
        icon: 'notifications',
        label: 'General',
        color: isDark ? '#F63B05' : '#C2410C',
        background: isDark ? '#27160F' : '#FEE4DA',
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
      activeOpacity={0.88}
      onPress={() => onPress(item)}
      style={[
        styles.notificationCard,
        {
          backgroundColor: unread
            ? (isDark ? 'rgba(246, 59, 5, 0.08)' : '#FFF4F0')
            : theme.surface,
          borderColor: unread ? '#F63B05' : theme.border,
        },
      ]}
    >
      {/* UNREAD ACCENT STRIP */}
      {unread && (
        <View style={styles.unreadAccent} />
      )}

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
                color: theme.text,
                fontFamily: unread ? 'Outfit-Bold' : 'Outfit-SemiBold',
              },
            ]}
          >
            {item.title}
          </Text>

          <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
            {relativeTime(item.timestamp)}
          </Text>
        </View>

        <Text
          numberOfLines={2}
          style={[styles.notificationMessage, { color: theme.textSecondary }]}
        >
          {item.message}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.categoryBadge, { backgroundColor: isDark ? (theme.surfaceAlt || '#1C1C1C') : '#F3F4F6' }]}>
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
        </View>
      </View>

      {/* CHEVRON */}
      <View style={styles.chevronContainer}>
        <Icon name="chevron-right" size={18} color={theme.textSecondary} />
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
      contentContainerStyle={styles.chipContent}
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
            : 'person';

        const unreadCount = notifications.filter(n => {
          if (n.isRead) return false;
          if (key === 'All') return true;
          return (n.category || '').toLowerCase() === key.toLowerCase();
        }).length;

        const activeBg = isDark ? '#27160F' : '#FFF4F0';
        const activeColor = isDark ? '#F63B05' : '#C2410C';

        return (
          <TouchableOpacity
            key={key}
            activeOpacity={0.82}
            onPress={() => setCategory(key)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? activeBg : (theme.surface || '#151515'),
                borderColor: active ? '#F63B05' : (theme.border || '#292929'),
              },
            ]}
          >
            <Icon
              name={icon}
              size={15}
              color={active ? activeColor : theme.textSecondary}
            />

            <Text
              style={[
                styles.chipText,
                {
                  color: active ? activeColor : theme.textSecondary,
                  fontFamily: active ? 'Outfit-Bold' : 'Inter-Medium',
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
                    backgroundColor: active ? '#F63B05' : (isDark ? 'rgba(246, 59, 5, 0.2)' : '#FEE4DA'),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    {
                      color: active ? '#FFFFFF' : (isDark ? '#F63B05' : '#C2410C'),
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
   MAIN NOTIFICATIONS SCREEN
============================================================ */

const NotificationsScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const isDark = theme?.name === 'dark';
  const { openSidebar } = useSidebar();
  const { refreshActiveVehicle } = useVehicle();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('All');

  const handleRealtimeNotification = useCallback(
    async (broadcastData) => {
      console.info('[NotificationsScreen] Realtime notification received:', broadcastData);
      try {
        const items = await notificationService.fetchNotifications();
        setNotifications(Array.isArray(items) ? items : []);
      } catch (e) {
        console.warn('Error syncing notifications in realtime:', e);
      }
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
    try {
      const items = await notificationService.fetchNotifications();
      setNotifications(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const timerId = setInterval(() => {
      notificationService.fetchNotifications().then(items => {
        if (Array.isArray(items)) {
          setNotifications(items);
        }
      }).catch(() => {});
    }, 12000);

    return () => clearInterval(timerId);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onMarkAll = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      const items = await notificationService.fetchNotifications();
      setNotifications(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  }, []);

  const onPressNotification = useCallback(
    async item => {
      try {
        if (!item.isRead) {
          await notificationService.markAsRead(item.id);
        }

        const items = await notificationService.fetchNotifications();
        setNotifications(Array.isArray(items) ? items : []);

        const targetVehicleId = item.vehicleId || item.data?.vehicle_id;

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
              Alert.alert(
                'Vehicle Update Rejected',
                `Your request to update your vehicle was rejected by the administrator.\n\nReason:\n${adminNote || 'No specific reason provided.'}`,
                [{ text: 'OK', role: 'cancel' }]
              );
            }
            break;

          case 'maintenance':
            navigation.navigate('Maintenance');
            break;

          case 'diagnostic':
            navigation.navigate('Diagnostics');
            break;

          case 'vehicle_update':
          case 'vehicle_archived':
          case 'vehicle_restored':
            navigation.navigate('Vehicles');
            break;

          default:
            break;
        }
      } catch (error) {
        console.error('Failed processing notification click:', error);
      }
    },
    [navigation, refreshActiveVehicle],
  );

  const filteredNotifications = useMemo(() => {
    if (category === 'All') return notifications;
    return notifications.filter(
      n => (n.category || '').toLowerCase() === category.toLowerCase(),
    );
  }, [notifications, category]);

  const sections = useMemo(
    () => groupByDate(filteredNotifications),
    [filteredNotifications],
  );

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.isRead).length,
    [notifications],
  );

  /* ==========================================================
     HEADER RENDERER
  ========================================================== */

  const renderHeader = () => (
    <>
      {/* HEADER TOP BAR */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Icon name="arrow-back" size={21} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={[styles.eyebrow, { color: theme.accent }]}>VEHICARE</Text>
            <View style={styles.titleRowHeader}>
              <Text style={[styles.titleMain, { color: theme.text }]}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={[styles.countBadge, { backgroundColor: isDark ? '#27160F' : '#FEE4DA', borderColor: '#F63B05' }]}>
                  <Text style={[styles.countText, { color: isDark ? '#F63B05' : '#C2410C' }]}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Stay updated with your VehiCare activity
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={[styles.markButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={onMarkAll}
                activeOpacity={0.8}
                accessibilityLabel="Mark all as read"
              >
                <Icon name="done-all" size={18} color={theme.accent} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.menuButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={openSidebar}
              activeOpacity={0.8}
              accessibilityLabel="Open Sidebar Menu"
            >
              <Icon name="menu" size={21} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* UNREAD STATUS SUMMARY BANNER */}
      <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.summaryIcon, { backgroundColor: isDark ? '#27160F' : '#FEE4DA' }]}>
          <Icon
            name={unreadCount > 0 ? 'notifications-active' : 'notifications-none'}
            size={22}
            color={isDark ? '#F63B05' : '#C2410C'}
          />
        </View>

        <View style={styles.summaryContent}>
          <View style={styles.summaryTitleRow}>
            <Text style={[styles.summaryTitle, { color: theme.text }]}>
              {unreadCount > 0 ? `${unreadCount} Unread Notifications` : 'All Caught Up'}
            </Text>

            <View style={[styles.summaryStatus, { backgroundColor: unreadCount > 0 ? (isDark ? '#27160F' : '#FEE4DA') : (isDark ? '#13241A' : '#DCFCE7') }]}>
              <View style={[styles.summaryStatusDot, { backgroundColor: unreadCount > 0 ? '#F63B05' : (isDark ? '#32D583' : '#15803D') }]} />
              <Text style={[styles.summaryStatusText, { color: unreadCount > 0 ? (isDark ? '#F63B05' : '#C2410C') : (isDark ? '#32D583' : '#15803D') }]}>
                {unreadCount > 0 ? 'UNREAD' : 'UP TO DATE'}
              </Text>
            </View>
          </View>

          <Text style={[styles.summarySub, { color: theme.textSecondary }]}>
            {unreadCount > 0
              ? 'Tap any notification below to review details or navigate to action.'
              : 'You have read all notifications. New updates will appear here.'}
          </Text>
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
    </>
  );

  /* ==========================================================
     LOADING STATE
  ========================================================== */

  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.background} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading notifications...
          </Text>
        </View>
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
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? '#27160F' : '#FEE4DA' }]}>
                <Icon name="notifications-none" size={38} color={isDark ? '#F63B05' : '#C2410C'} />
              </View>

              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                You're All Caught Up
              </Text>

              <Text style={[styles.emptyDesc, { color: theme.textSecondary }]}>
                {category === 'All'
                  ? "There aren't any notifications right now. We'll let you know when something needs your attention."
                  : `There aren't any ${category.toLowerCase()} notifications right now.`}
              </Text>

              {category !== 'All' && (
                <TouchableOpacity
                  style={[styles.clearFilterButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={() => setCategory('All')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.clearFilterText, { color: theme.accent }]}>
                    View All Notifications
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.emptyListContent, { backgroundColor: theme.background }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
          }
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => String(item.id)}
          ListHeaderComponent={renderHeader}
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
          }
        />
      )}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  markButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  titleRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleMain: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  countBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  countText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
  },

  /* SUMMARY BANNER */
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 2,
  },
  summaryTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    flex: 1,
  },
  summaryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  summaryStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  summaryStatusText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  summarySub: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    lineHeight: 15,
  },

  /* CHIPS */
  filterContainer: {
    marginBottom: 12,
  },
  chipContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  chipText: {
    fontSize: 12,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  tabBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
  },

  /* SECTION HEADER */
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  sectionHeader: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },

  /* LIST CONTENT */
  listContent: {
    paddingBottom: 40,
  },
  emptyListContent: {
    paddingBottom: 40,
  },

  /* NOTIFICATION ROW */
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
  },
  unreadAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#F63B05',
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
    marginBottom: 3,
  },
  notificationTitle: {
    fontSize: 14,
    flex: 1,
  },
  timestamp: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  notificationMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
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
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
  },
  unreadLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F63B05',
  },
  unreadText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    color: '#F63B05',
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    marginTop: 10,
  },

  /* EMPTY STATE */
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 50,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    marginBottom: 6,
  },
  emptyDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  clearFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearFilterText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
  },
});

export default NotificationsScreen;