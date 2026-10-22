import { useMemo } from 'react';
import {
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import useRecentActivities from '../hooks/useRecentActivities';
import { useTheme } from '../theme/ThemeContext';
import {
  formatActivityTime,
  getActivityCategoryStyle,
  getActivityIcon,
  groupActivitiesByDate,
  handleActivityPress,
} from '../utils/activityUtils';

const getActivityBadgeLabel = type => {
  const norm = String(type || '').toLowerCase();
  if (norm.includes('diag') || norm.includes('symptom')) return 'DIAGNOSTIC';
  if (norm.includes('maint') || norm.includes('service') || norm.includes('oil')) return 'MAINTENANCE';
  if (norm.includes('chat') || norm.includes('consult')) return 'AI CONSULT';
  if (norm.includes('vehicle')) return 'VEHICLE';
  if (norm.includes('reminder') || norm.includes('notif')) return 'REMINDER';
  if (norm.includes('repair') || norm.includes('shop')) return 'REPAIR';
  return 'ACTIVITY';
};

const ActivityScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const isDark = theme?.name === 'dark';
  const { activities, loading } = useRecentActivities(50);

  const sections = useMemo(() => groupActivitiesByDate(activities), [activities]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: isDark ? '#1C1C1F' : '#FFFFFF',
              borderColor: isDark ? '#2B2B30' : '#E2E8F0',
            },
          ]}
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>
            TIMELINE
          </Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Recent Activity
          </Text>
        </View>

        {activities.length > 0 && (
          <View
            style={[
              styles.countPill,
              {
                backgroundColor: isDark ? 'rgba(246, 59, 5, 0.12)' : '#FFF2EE',
              },
            ]}
          >
            <Text style={[styles.countPillText, { color: theme.accent }]}>
              {activities.length} LOGS
            </Text>
          </View>
        )}
      </View>

      {/* SECTION LIST */}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeaderBox}>
            <View
              style={[
                styles.sectionPill,
                { backgroundColor: isDark ? '#1A1A1D' : '#F1F5F9' },
              ]}
            >
              <Text
                style={[
                  styles.sectionHeaderText,
                  { color: isDark ? '#A1A1AA' : '#64748B' },
                ]}
              >
                {title}
              </Text>
            </View>
            <View
              style={[
                styles.sectionLine,
                { backgroundColor: isDark ? '#262629' : '#F1F5F9' },
              ]}
            />
          </View>
        )}
        renderItem={({ item }) => {
          const categoryStyle = getActivityCategoryStyle(item.type, isDark);
          const badgeLabel = getActivityBadgeLabel(item.type);

          return (
            <TouchableOpacity
              style={[
                styles.activityCard,
                {
                  backgroundColor: isDark ? '#141416' : '#FFFFFF',
                  borderColor: isDark ? '#232326' : '#E8EDF2',
                },
              ]}
              activeOpacity={0.8}
              onPress={() => handleActivityPress(item, navigation)}
            >
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: categoryStyle.background },
                ]}
              >
                <Icon
                  name={categoryStyle.icon || getActivityIcon(item.type)}
                  size={19}
                  color={categoryStyle.color}
                />
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: categoryStyle.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        { color: categoryStyle.color },
                      ]}
                    >
                      {badgeLabel}
                    </Text>
                  </View>
                  <Text
                    style={[styles.cardTime, { color: theme.textSecondary }]}
                  >
                    {formatActivityTime(item.createdAt)}
                  </Text>
                </View>

                <Text
                  style={[styles.cardTitle, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>

                {item.description ? (
                  <Text
                    style={[styles.cardDesc, { color: theme.textSecondary }]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                ) : null}

                {item.vehicleName ? (
                  <View
                    style={[
                      styles.vehiclePill,
                      {
                        backgroundColor: isDark ? '#1A1A1D' : '#F1F5F9',
                      },
                    ]}
                  >
                    <Icon
                      name="directions-car"
                      size={11}
                      color={theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.vehiclePillText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {item.vehicleName}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Icon
                name="chevron-right"
                size={18}
                color={isDark ? '#52525B' : '#CBD5E1'}
              />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: isDark ? '#141416' : '#FFFFFF',
                  borderColor: isDark ? '#232326' : '#E8EDF2',
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: isDark
                      ? 'rgba(246, 59, 5, 0.12)'
                      : '#FFF2EE',
                  },
                ]}
              >
                <Icon name="history" size={32} color={theme.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                No Recent Activity
              </Text>
              <Text
                style={[styles.emptySub, { color: theme.textSecondary }]}
              >
                Your vehicle diagnostics, maintenance, and chat activities will
                appear in this timeline as you use VehiCare.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitleBox: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: 'Inter-Bold',
    fontSize: 9.5,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 21,
    lineHeight: 26,
  },
  countPill: {
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 999,
  },
  countPillText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9.5,
    letterSpacing: 0.8,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 115,
  },

  sectionHeaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  sectionPill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  sectionHeaderText: {
    fontFamily: 'Inter-Bold',
    fontSize: 10,
    letterSpacing: 1.1,
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },

  activityCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 13,
    marginBottom: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 6.5,
    paddingVertical: 2,
    borderRadius: 4.5,
  },
  typeBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  cardTime: {
    fontFamily: 'Inter-Medium',
    fontSize: 10.5,
  },
  cardTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 2,
  },
  cardDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 4,
  },
  vehiclePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    gap: 4,
    marginTop: 2,
  },
  vehiclePillText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10,
  },

  emptyBox: {
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
    marginTop: 20,
    gap: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  emptySub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});

export default ActivityScreen;
