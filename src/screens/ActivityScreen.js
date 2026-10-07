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
  getActivityIcon,
  groupActivitiesByDate,
  handleActivityPress,
} from '../utils/activityUtils';

const ActivityScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { activities, loading } = useRecentActivities(50);

  const sections = useMemo(() => groupActivitiesByDate(activities), [activities]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={22} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={[styles.eyebrow, { color: theme.accent }]}>
            CROSS-APP TIMELINE
          </Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Recent Activity
          </Text>
        </View>
      </View>

      {/* SECTION LIST */}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeaderBox}>
            <Text style={[styles.sectionHeaderText, { color: theme.accent }]}>
              {title}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.activityCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => handleActivityPress(item, navigation)}
          >
            <View style={[styles.iconBox, { backgroundColor: theme.accentSoft }]}>
              <Icon
                name={getActivityIcon(item.type)}
                size={20}
                color={theme.accent}
              />
            </View>

            <View style={styles.cardContent}>
              <View style={styles.cardTopRow}>
                <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.cardTime, { color: theme.textSecondary }]}>
                  {formatActivityTime(item.createdAt)}
                </Text>
              </View>

              {item.description ? (
                <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}

              {item.vehicleName ? (
                <View style={[styles.vehiclePill, { backgroundColor: theme.surfaceAlt }]}>
                  <Icon name="directions-car" size={11} color={theme.textSecondary} />
                  <Text style={[styles.vehiclePillText, { color: theme.textSecondary }]}>
                    {item.vehicleName}
                  </Text>
                </View>
              ) : null}
            </View>

            <Icon name="chevron-right" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Icon name="history" size={40} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Recent Activity</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                Your VehiCare activity timeline will appear here as you use the app.
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
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerTitleBox: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 9,
    letterSpacing: 1.8,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 22,
  },

  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeaderBox: {
    paddingVertical: 10,
    marginTop: 6,
  },
  sectionHeaderText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 11.5,
    letterSpacing: 1.2,
  },

  activityCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
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
    marginBottom: 3,
  },
  cardTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 14,
    flex: 1,
    marginRight: 6,
  },
  cardTime: {
    fontFamily: 'Inter-Medium',
    fontSize: 11,
  },
  cardDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  vehiclePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    marginTop: 2,
  },
  vehiclePillText: {
    fontFamily: 'Inter-Medium',
    fontSize: 10.5,
  },

  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  emptySub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
});

export default ActivityScreen;
