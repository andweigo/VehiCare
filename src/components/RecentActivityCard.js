import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';
import { formatActivityTime, getActivityCategoryStyle, getActivityIcon } from '../utils/activityUtils';

const RecentActivityCard = ({ activities = [], onViewAll, onItemPress }) => {
  const { theme, themeName } = useTheme();
  const isDark = themeName === 'dark';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#141416' : '#FFFFFF',
          borderColor: isDark ? '#232326' : '#E8EDF2',
        },
      ]}
    >
      {/* CARD HEADER */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View
            style={[
              styles.headerIconCircle,
              {
                backgroundColor: isDark ? 'rgba(246, 59, 5, 0.14)' : '#FFF2EE',
              },
            ]}
          >
            <Icon name="history" size={18} color={theme.accent || '#F63B05'} />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Recent Activity</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Latest logs and updates
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onViewAll}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[
            styles.seeAllPill,
            {
              backgroundColor: isDark ? '#1C1C1F' : '#F8FAFC',
              borderColor: isDark ? '#2A2A2E' : '#E2E8F0',
            },
          ]}
        >
          <Text style={[styles.seeAllText, { color: theme.accent || '#F63B05' }]}>
            See All
          </Text>
          <Icon name="chevron-right" size={16} color={theme.accent || '#F63B05'} />
        </TouchableOpacity>
      </View>

      {/* HAIRLINE DIVIDER */}
      <View
        style={[
          styles.headerDivider,
          { backgroundColor: isDark ? '#202024' : '#F1F5F9' },
        ]}
      />

      {/* CONTENT / ACTIVITY ITEMS */}
      {activities.length === 0 ? (
        <View style={styles.emptyBox}>
          <View
            style={[
              styles.emptyIconCircle,
              {
                backgroundColor: isDark ? 'rgba(246, 59, 5, 0.1)' : '#FFF2EE',
              },
            ]}
          >
            <Icon name="history" size={24} color={theme.accent || '#F63B05'} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No recent activity</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Your vehicle diagnostics, maintenance, and consultations will appear here.
          </Text>
        </View>
      ) : (
        activities.map((activity, index) => {
          const categoryStyle = getActivityCategoryStyle(activity.type, isDark);
          const iconName = activity.icon || categoryStyle.icon || getActivityIcon(activity.type);
          const timeText = activity.time || formatActivityTime(activity.createdAt);

          return (
            <TouchableOpacity
              key={activity.id || index}
              style={[
                styles.activityItem,
                index < activities.length - 1 && [
                  styles.itemDivider,
                  { borderBottomColor: isDark ? '#1F1F23' : '#F1F5F9' },
                ],
              ]}
              activeOpacity={0.75}
              onPress={() => onItemPress && onItemPress(activity)}
            >
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: categoryStyle.background,
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                  },
                ]}
              >
                <Icon name={iconName} size={18} color={categoryStyle.color} />
              </View>

              <View style={styles.activityText}>
                <View style={styles.itemTopRow}>
                  <Text style={[styles.activityTitle, { color: theme.text }]} numberOfLines={1}>
                    {activity.title}
                  </Text>
                  <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                    {timeText}
                  </Text>
                </View>

                <Text style={[styles.activityDetail, { color: theme.textSecondary }]} numberOfLines={1}>
                  {activity.description || activity.detail || 'Activity logged'}
                </Text>

                {Boolean(activity.vehicleName) && (
                  <View
                    style={[
                      styles.vehicleBadge,
                      {
                        backgroundColor: isDark ? '#1C1C1F' : '#F1F5F9',
                        borderColor: isDark ? '#2B2B30' : '#E2E8F0',
                      },
                    ]}
                  >
                    <Icon name="directions-car" size={11} color={theme.textSecondary} />
                    <Text style={[styles.vehicleBadgeText, { color: theme.textSecondary }]}>
                      {activity.vehicleName}
                    </Text>
                  </View>
                )}
              </View>

              <Icon
                name="chevron-right"
                size={18}
                color={isDark ? '#52525B' : '#CBD5E1'}
                style={styles.chevronIcon}
              />
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    marginTop: 1,
  },
  seeAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  seeAllText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 12,
  },
  headerDivider: {
    height: 1,
    marginBottom: 4,
  },
  emptyBox: {
    paddingVertical: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    marginBottom: 4,
  },
  emptySub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  itemDivider: {
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: {
    flex: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  activityTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13.5,
    flex: 1,
  },
  timeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
  },
  activityDetail: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 6,
  },
  vehicleBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  chevronIcon: {
    marginLeft: 2,
  },
});

export default RecentActivityCard;
