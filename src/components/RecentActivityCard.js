import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';
import { formatActivityTime, getActivityCategoryStyle, getActivityIcon } from '../utils/activityUtils';

const RecentActivityCard = ({ activities = [], onViewAll, onItemPress }) => {
  const { theme, themeName } = useTheme();
  const isDark = themeName === 'dark';

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon name="history" size={20} color={theme.accent} />
          <Text style={[styles.title, { color: theme.text }]}>Recent Activity</Text>
        </View>

        <TouchableOpacity onPress={onViewAll} activeOpacity={0.7} style={styles.viewAllButton}>
          <Text style={[styles.viewAllText, { color: theme.accent }]}>See All</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Your latest actions, completed maintenance, and AI diagnostic updates across VehiCare.
      </Text>

      {activities.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No recent activity</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Your VehiCare activity will appear here as you use the app.
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
                index < activities.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
              activeOpacity={0.75}
              onPress={() => onItemPress && onItemPress(activity)}
            >
              <View style={[styles.iconBox, { backgroundColor: categoryStyle.background }]}>
                <Icon name={iconName} size={17} color={categoryStyle.color} />
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

                {activity.vehicleName ? (
                  <View style={[styles.vehicleBadge, { backgroundColor: theme.surfaceAlt }]}>
                    <Text style={[styles.vehicleBadgeText, { color: theme.textSecondary }]}>
                      {activity.vehicleName}
                    </Text>
                  </View>
                ) : null}
              </View>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewAllText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
    marginBottom: 4,
  },
  emptySub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    textAlign: 'center',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
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
    fontSize: 14,
    flex: 1,
  },
  timeText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
  },
  activityDetail: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  vehicleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  vehicleBadgeText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
  },
});

export default RecentActivityCard;
