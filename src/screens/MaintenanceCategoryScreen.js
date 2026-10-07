
import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import useMaintenanceRecommendations from '../hooks/useMaintenanceRecommendations';
import { useTheme } from '../theme/ThemeContext';
import { mapItemToCategoryId } from '../utils/maintenanceUtils';
import {
  getVehicleDisplayDetails,
  getVehicleDisplayName,
} from '../utils/vehicleDisplay';

const MaintenanceCategoryScreen = ({ route, navigation }) => {
  const { theme } = useTheme();
  const { categoryId, categoryName, categoryIcon } = route.params || {};

  const {
    vehicleProfile,
    allRecommendations,
    groupedCategories,
    markAsDone,
    undo,
  } = useMaintenanceRecommendations();

  /* -------------------------------------------------------
     CATEGORY
  ------------------------------------------------------- */

  const activeCategory = useMemo(() => {
    if (Array.isArray(groupedCategories)) {
      const match = groupedCategories.find(c => c.id === categoryId);

      if (match) {
        return match;
      }
    }

    return {
      id: categoryId || 'general',
      name: categoryName || 'Category Details',
      icon: categoryIcon || 'build',
      itemCount: 0,
      todoItems: [],
      historyItems: [],
      diagnosticItems: [],
      statusBadge: 'Up to date',
      statusColor: '#32D583',
    };
  }, [
    groupedCategories,
    categoryId,
    categoryName,
    categoryIcon,
  ]);

  /* -------------------------------------------------------
     TASKS
  ------------------------------------------------------- */

  const categoryTodoItems = useMemo(() => {
    if (Array.isArray(activeCategory?.todoItems)) {
      return activeCategory.todoItems;
    }

    return allRecommendations.filter(
      item => mapItemToCategoryId(item) === categoryId,
    );
  }, [
    activeCategory,
    allRecommendations,
    categoryId,
  ]);

  const categoryHistoryItems = useMemo(() => {
    return Array.isArray(activeCategory?.historyItems)
      ? activeCategory.historyItems
      : [];
  }, [activeCategory]);

  /* -------------------------------------------------------
     DIAGNOSTIC CONTEXT
  ------------------------------------------------------- */

  const diagnosticItems = useMemo(() => {
    return categoryTodoItems.filter(
      item => item.source === 'diagnostic',
    );
  }, [categoryTodoItems]);

  const hasDiagnosticItems = diagnosticItems.length > 0;

  const primaryDiagnostic = diagnosticItems.find(
    item => item.relatedProblem,
  );

  /* -------------------------------------------------------
     COUNTS
  ------------------------------------------------------- */

  const urgentCount = useMemo(() => {
    return categoryTodoItems.filter(
      item => item.priority === 'Urgent',
    ).length;
  }, [categoryTodoItems]);

  const importantCount = useMemo(() => {
    return categoryTodoItems.filter(
      item => item.priority === 'Important',
    ).length;
  }, [categoryTodoItems]);

  /* -------------------------------------------------------
     HELPERS
  ------------------------------------------------------- */

  const getPriorityConfig = priority => {
    if (priority === 'Urgent') {
      return {
        label: 'URGENT',
        icon: 'priority-high',
        color: '#FF5A5F',
        background: 'rgba(255, 90, 95, 0.12)',
      };
    }

    if (priority === 'Important') {
      return {
        label: 'IMPORTANT',
        icon: 'warning',
        color: theme.accent,
        background: theme.accentSoft,
      };
    }

    return {
      label: 'ROUTINE',
      icon: 'schedule',
      color: theme.textSecondary,
      background: theme.surfaceAlt,
    };
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* =====================================================
            HEADER
        ====================================================== */}

        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.backButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            activeOpacity={0.75}
            onPress={() => navigation.goBack()}
          >
            <Icon
              name="arrow-back"
              size={21}
              color={theme.text}
            />
          </TouchableOpacity>

          <View style={styles.headerTitleBox}>
            <Text
              style={[
                styles.eyebrow,
                { color: theme.accent },
              ]}
              numberOfLines={1}
            >
              {getVehicleDisplayName(
                vehicleProfile,
                'VEHICLE',
              ).toUpperCase()}
            </Text>

            <Text
              style={[
                styles.title,
                { color: theme.text },
              ]}
              numberOfLines={1}
            >
              {activeCategory.name}
            </Text>
          </View>
        </View>

        {/* =====================================================
            CATEGORY HERO
        ====================================================== */}

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.surface,
              borderColor: hasDiagnosticItems
                ? theme.accent
                : theme.border,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View
              style={[
                styles.heroIcon,
                {
                  backgroundColor: theme.accentSoft,
                },
              ]}
            >
              <Icon
                name={activeCategory.icon || 'build'}
                size={25}
                color={theme.accent}
              />
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: `${
                    activeCategory.statusColor ||
                    theme.accent
                  }18`,
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      activeCategory.statusColor ||
                      theme.accent,
                  },
                ]}
              />

              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color:
                      activeCategory.statusColor ||
                      theme.accent,
                  },
                ]}
              >
                {(
                  activeCategory.statusBadge ||
                  'UP TO DATE'
                ).toUpperCase()}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.heroTitle,
              { color: theme.text },
            ]}
          >
            {activeCategory.name}
          </Text>

          <Text
            style={[
              styles.heroDescription,
              { color: theme.textSecondary },
            ]}
          >
            {hasDiagnosticItems
              ? 'Maintenance actions identified from a recent VehiCare diagnostic.'
              : `Maintenance actions for ${getVehicleDisplayDetails(
                  vehicleProfile,
                  'this vehicle',
                )}.`}
          </Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text
                style={[
                  styles.heroStatNumber,
                  { color: theme.text },
                ]}
              >
                {categoryTodoItems.length}
              </Text>

              <Text
                style={[
                  styles.heroStatLabel,
                  { color: theme.textSecondary },
                ]}
              >
                Pending
              </Text>
            </View>

            <View
              style={[
                styles.heroDivider,
                { backgroundColor: theme.border },
              ]}
            />

            <View style={styles.heroStat}>
              <Text
                style={[
                  styles.heroStatNumber,
                  {
                    color:
                      urgentCount > 0
                        ? '#FF5A5F'
                        : theme.text,
                  },
                ]}
              >
                {urgentCount}
              </Text>

              <Text
                style={[
                  styles.heroStatLabel,
                  { color: theme.textSecondary },
                ]}
              >
                Urgent
              </Text>
            </View>

            <View
              style={[
                styles.heroDivider,
                { backgroundColor: theme.border },
              ]}
            />

            <View style={styles.heroStat}>
              <Text
                style={[
                  styles.heroStatNumber,
                  {
                    color:
                      importantCount > 0
                        ? theme.accent
                        : theme.text,
                  },
                ]}
              >
                {importantCount}
              </Text>

              <Text
                style={[
                  styles.heroStatLabel,
                  { color: theme.textSecondary },
                ]}
              >
                Important
              </Text>
            </View>
          </View>
        </View>

        {/* =====================================================
            AI DIAGNOSTIC INSIGHT
        ====================================================== */}

        {hasDiagnosticItems && (
          <View
            style={[
              styles.aiInsightCard,
              {
                backgroundColor: theme.accentSoft,
                borderColor: theme.accent,
              },
            ]}
          >
            <View style={styles.aiInsightHeader}>
              <View
                style={[
                  styles.aiIcon,
                  {
                    backgroundColor: theme.surface,
                  },
                ]}
              >
                <Icon
                  name="auto-awesome"
                  size={19}
                  color={theme.accent}
                />
              </View>

              <View style={styles.aiInsightHeaderText}>
                <Text
                  style={[
                    styles.aiEyebrow,
                    { color: theme.accent },
                  ]}
                >
                  AI DIAGNOSTIC INSIGHT
                </Text>

                <Text
                  style={[
                    styles.aiInsightTitle,
                    { color: theme.text },
                  ]}
                >
                  Why you're seeing this
                </Text>
              </View>
            </View>

            {primaryDiagnostic?.relatedProblem ? (
              <View style={styles.diagnosticProblem}>
                <Text
                  style={[
                    styles.relatedLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  RECENT DIAGNOSTIC
                </Text>

                <Text
                  style={[
                    styles.relatedProblem,
                    { color: theme.text },
                  ]}
                  numberOfLines={3}
                >
                  "{primaryDiagnostic.relatedProblem}"
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.aiInsightDescription,
                  { color: theme.textSecondary },
                ]}
              >
                These recommendations were generated from
                your vehicle's diagnostic history.
              </Text>
            )}

            <TouchableOpacity
              style={styles.viewDiagnosisButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('History')}
            >
              <Text
                style={[
                  styles.viewDiagnosisText,
                  { color: theme.accent },
                ]}
              >
                View Diagnosis
              </Text>

              <Icon
                name="arrow-forward"
                size={16}
                color={theme.accent}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* =====================================================
            RECOMMENDED ACTIONS
        ====================================================== */}

        <View style={styles.sectionHeader}>
          <View>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text },
              ]}
            >
              RECOMMENDED ACTIONS
            </Text>

            <Text
              style={[
                styles.sectionSubtitle,
                { color: theme.textSecondary },
              ]}
            >
              Prioritized actions for your vehicle
            </Text>
          </View>

          {categoryTodoItems.length > 0 && (
            <View
              style={[
                styles.countBadge,
                { backgroundColor: theme.surfaceAlt },
              ]}
            >
              <Text
                style={[
                  styles.countBadgeText,
                  { color: theme.textSecondary },
                ]}
              >
                {categoryTodoItems.length}
              </Text>
            </View>
          )}
        </View>

        {/* =====================================================
            EMPTY STATE
        ====================================================== */}

        {categoryTodoItems.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIcon,
                {
                  backgroundColor:
                    theme.success
                      ? `${theme.success}15`
                      : 'rgba(50,213,131,0.12)',
                },
              ]}
            >
              <Icon
                name="check"
                size={27}
                color={theme.success || '#32D583'}
              />
            </View>

            <Text
              style={[
                styles.emptyTitle,
                { color: theme.text },
              ]}
            >
              You're up to date
            </Text>

            <Text
              style={[
                styles.emptyDescription,
                { color: theme.textSecondary },
              ]}
            >
              No pending maintenance actions for{' '}
              {activeCategory.name}.
            </Text>

            <Text
              style={[
                styles.emptyHint,
                { color: theme.textSecondary },
              ]}
            >
              VehiCare will continue monitoring your
              vehicle and update recommendations when
              needed.
            </Text>
          </View>
        ) : (
          categoryTodoItems.map(item => {
            const priority = getPriorityConfig(
              item.priority,
            );

            const isDiagnostic =
              item.source === 'diagnostic';

            return (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isDiagnostic
                      ? theme.accent
                      : theme.border,
                  },
                ]}
              >
                {/* Diagnostic accent strip */}
                {isDiagnostic && (
                  <View
                    style={[
                      styles.diagnosticStrip,
                      { backgroundColor: theme.accent },
                    ]}
                  />
                )}

                {/* CARD HEADER */}

                <View style={styles.itemHeader}>
                  <View style={styles.sourceRow}>
                    <View
                      style={[
                        styles.sourceIcon,
                        {
                          backgroundColor:
                            isDiagnostic
                              ? theme.accentSoft
                              : theme.surfaceAlt,
                        },
                      ]}
                    >
                      <Icon
                        name={
                          isDiagnostic
                            ? 'auto-awesome'
                            : 'build'
                        }
                        size={14}
                        color={
                          isDiagnostic
                            ? theme.accent
                            : theme.textSecondary
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.sourceText,
                        {
                          color: isDiagnostic
                            ? theme.accent
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {isDiagnostic
                        ? 'AI DIAGNOSTIC'
                        : 'ROUTINE MAINTENANCE'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.priorityBadge,
                      {
                        backgroundColor:
                          priority.background,
                      },
                    ]}
                  >
                    <Icon
                      name={priority.icon}
                      size={12}
                      color={priority.color}
                    />

                    <Text
                      style={[
                        styles.priorityText,
                        { color: priority.color },
                      ]}
                    >
                      {priority.label}
                    </Text>
                  </View>
                </View>

                {/* TITLE */}

                <View style={styles.itemTitleRow}>
                  <View
                    style={[
                      styles.itemIcon,
                      {
                        backgroundColor:
                          isDiagnostic
                            ? theme.accentSoft
                            : theme.surfaceAlt,
                      },
                    ]}
                  >
                    <Icon
                      name={
                        isDiagnostic
                          ? 'warning'
                          : item.icon || 'build'
                      }
                      size={20}
                      color={
                        isDiagnostic
                          ? theme.accent
                          : theme.text
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.itemTitle,
                      { color: theme.text },
                    ]}
                  >
                    {item.title}
                  </Text>
                </View>

                {/* RELATED DIAGNOSIS */}

                {isDiagnostic &&
                item.relatedProblem ? (
                  <View
                    style={[
                      styles.relatedBox,
                      {
                        backgroundColor:
                          theme.surfaceAlt,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.relatedBoxLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      RELATED DIAGNOSIS
                    </Text>

                    <Text
                      style={[
                        styles.relatedBoxText,
                        { color: theme.text },
                      ]}
                      numberOfLines={2}
                    >
                      {item.relatedProblem}
                    </Text>
                  </View>
                ) : null}

                {/* DESCRIPTION */}

                <Text
                  style={[
                    styles.itemDescription,
                    { color: theme.textSecondary },
                  ]}
                >
                  {item.description}
                </Text>

                {/* FOOTER */}

                <View
                  style={[
                    styles.itemFooter,
                    { borderTopColor: theme.border },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.guideButton,
                      {
                        backgroundColor: theme.accentSoft,
                        borderColor: theme.accent,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() =>
                      navigation.navigate('MaintenanceGuide', { item })
                    }
                  >
                    <Icon
                      name="menu-book"
                      size={14}
                      color={theme.accent}
                    />
                    <Text
                      style={[
                        styles.guideButtonText,
                        { color: theme.accent },
                      ]}
                    >
                      Step-by-Step Guide →
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.itemFooterRight}>
                    <TouchableOpacity
                      style={[
                        styles.doneButton,
                        {
                          backgroundColor: theme.accent,
                        },
                      ]}
                      activeOpacity={0.85}
                      onPress={() => markAsDone(item)}
                    >
                      <Icon
                        name="check"
                        size={15}
                        color="#FFFFFF"
                      />

                      <Text
                        style={styles.doneButtonText}
                      >
                        Mark as Done
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* =====================================================
            COMPLETED HISTORY
        ====================================================== */}

        {categoryHistoryItems.length > 0 && (
          <View style={styles.completedSection}>
            <View style={styles.completedSectionHeader}>
              <View>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.text },
                  ]}
                >
                  COMPLETED
                </Text>

                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Maintenance already taken care of
                </Text>
              </View>

              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor:
                      theme.surfaceAlt,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countBadgeText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {categoryHistoryItems.length}
                </Text>
              </View>
            </View>

            {categoryHistoryItems.map(item => (
              <View
                key={item.id}
                style={[
                  styles.completedCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View
                  style={styles.completedLeft}
                >
                  <View
                    style={[
                      styles.completedIcon,
                      {
                        backgroundColor:
                          theme.success
                            ? `${theme.success}15`
                            : 'rgba(50,213,131,0.12)',
                      },
                    ]}
                  >
                    <Icon
                      name="check"
                      size={15}
                      color={
                        theme.success || '#32D583'
                      }
                    />
                  </View>

                  <View
                    style={styles.completedInfo}
                  >
                    <Text
                      style={[
                        styles.completedTitle,
                        { color: theme.text },
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>

                    {item.relatedProblem ? (
                      <Text
                        style={[
                          styles.completedSub,
                          {
                            color:
                              theme.textSecondary,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        From: {item.relatedProblem}
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.completedSub,
                          {
                            color:
                              theme.textSecondary,
                          },
                        ]}
                      >
                        Completed maintenance
                      </Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.undoButton,
                    {
                      borderColor: theme.border,
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => undo(item.id)}
                >
                  <Text
                    style={[
                      styles.undoText,
                      { color: theme.accent },
                    ]}
                  >
                    Undo
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
};

/* ===========================================================
   STYLES
=========================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginBottom: 20,
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
    letterSpacing: 1.7,
    marginBottom: 2,
  },

  title: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 25,
  },

  /* HERO */

  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },

  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statusBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.5,
  },

  heroTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 24,
    marginBottom: 5,
  },

  heroDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 18,
  },

  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },

  heroStat: {
    flex: 1,
    alignItems: 'center',
  },

  heroStatNumber: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 20,
  },

  heroStatLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 10.5,
    marginTop: 1,
  },

  heroDivider: {
    width: 1,
    height: 26,
  },

  /* AI INSIGHT */

  aiInsightCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 26,
  },

  aiInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },

  aiIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiInsightHeaderText: {
    flex: 1,
  },

  aiEyebrow: {
    fontFamily: 'Inter-Bold',
    fontSize: 8.5,
    letterSpacing: 1.1,
    marginBottom: 2,
  },

  aiInsightTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
  },

  diagnosticProblem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginBottom: 12,
  },

  relatedLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 8.5,
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  relatedProblem: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13.5,
    lineHeight: 19,
  },

  aiInsightDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },

  viewDiagnosisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
  },

  viewDiagnosisText: {
    fontFamily: 'Inter-Bold',
    fontSize: 12,
  },

  /* SECTIONS */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  sectionTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 14,
    letterSpacing: 0.7,
  },

  sectionSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },

  countBadge: {
    minWidth: 27,
    height: 27,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
  },

  /* EMPTY */

  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 26,
    alignItems: 'center',
    marginBottom: 26,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  emptyTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    marginBottom: 5,
  },

  emptyDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 8,
  },

  emptyHint: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    lineHeight: 16,
    textAlign: 'center',
  },

  /* TASK CARD */

  itemCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 13,
    overflow: 'hidden',
  },

  diagnosticStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },

  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  sourceIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sourceText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8.5,
    letterSpacing: 0.7,
  },

  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
  },

  priorityText: {
    fontFamily: 'Inter-Bold',
    fontSize: 8.5,
    letterSpacing: 0.4,
  },

  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },

  itemIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemTitle: {
    flex: 1,
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
    lineHeight: 21,
  },

  relatedBox: {
    borderRadius: 11,
    borderWidth: 1,
    padding: 10,
    marginBottom: 11,
  },

  relatedBoxLabel: {
    fontFamily: 'Inter-Bold',
    fontSize: 8,
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  relatedBoxText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
    lineHeight: 16,
  },

  itemDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },

  itemFooter: {
    borderTopWidth: 1,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
    gap: 8,
  },

  guideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },

  guideButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
  },

  itemFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  diagnosisLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
  },

  diagnosisLinkText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11.5,
  },

  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 11,
  },

  doneButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11.5,
    color: '#FFFFFF',
  },

  /* COMPLETED */

  completedSection: {
    marginTop: 13,
  },

  completedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 13,
  },

  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 9,
  },

  completedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },

  completedIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  completedInfo: {
    flex: 1,
  },

  completedTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13.5,
  },

  completedSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    marginTop: 2,
  },

  undoButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
  },

  undoText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10.5,
  },

  bottomSpace: {
    height: 10,
  },
});

export default MaintenanceCategoryScreen;
