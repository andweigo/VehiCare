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

import { HELP_RESOURCES } from '../data/helpResources';
import { useTheme } from '../theme/ThemeContext';

const HelpArticleScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const articleId = route?.params?.articleId;

  const article = useMemo(() => {
    return HELP_RESOURCES.find(item => item.id === articleId) || HELP_RESOURCES[0];
  }, [articleId]);

  const handleAction = () => {
    if (article?.actionScreen && navigation) {
      navigation.navigate(article.actionScreen);
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
          accessibilityLabel="Back"
        >
          <Icon name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text
            style={[styles.headerEyebrow, { color: theme.accent }]}
            numberOfLines={1}
          >
            {article.categoryTitle.toUpperCase()}
          </Text>
          <Text
            style={[styles.headerTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            Help Guide
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HERO CARD */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.metaRow}>
            <View
              style={[
                styles.categoryBadge,
                {
                  backgroundColor: theme.accentSoft,
                },
              ]}
            >
              <Text style={[styles.categoryBadgeText, { color: theme.accent }]}>
                {article.categoryTitle}
              </Text>
            </View>

            <View style={styles.readTimeRow}>
              <Icon
                name="schedule"
                size={14}
                color={theme.textSecondary}
                style={styles.readTimeIcon}
              />
              <Text style={[styles.readTimeText, { color: theme.textSecondary }]}>
                {article.readTime}
              </Text>
            </View>
          </View>

          <View style={styles.titleRow}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: theme.accentSoft,
                },
              ]}
            >
              <Icon name={article.icon} size={24} color={theme.accent} />
            </View>
            <Text style={[styles.articleTitle, { color: theme.text }]}>
              {article.title}
            </Text>
          </View>

          <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
            {article.summary}
          </Text>
        </View>

        {/* SECTIONS */}
        {article.sections?.map((sec, secIdx) => (
          <View
            key={secIdx}
            style={[
              styles.sectionCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {sec.heading ? (
              <View style={styles.sectionHeadingRow}>
                <View
                  style={[
                    styles.sectionBullet,
                    { backgroundColor: theme.accent },
                  ]}
                />
                <Text style={[styles.sectionHeading, { color: theme.text }]}>
                  {sec.heading}
                </Text>
              </View>
            ) : null}

            {sec.text ? (
              <Text style={[styles.bodyText, { color: theme.textSecondary }]}>
                {sec.text}
              </Text>
            ) : null}

            {sec.bullets?.map((bullet, bIdx) => (
              <View key={bIdx} style={styles.bulletItem}>
                <View
                  style={[
                    styles.bulletDot,
                    {
                      backgroundColor: theme.accent,
                    },
                  ]}
                />
                <Text
                  style={[styles.bulletText, { color: theme.textSecondary }]}
                >
                  {bullet}
                </Text>
              </View>
            ))}

            {sec.tip ? (
              <View
                style={[
                  styles.calloutCard,
                  styles.tipCard,
                  {
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.accent,
                  },
                ]}
              >
                <Icon
                  name="lightbulb-outline"
                  size={18}
                  color={theme.accent}
                  style={styles.calloutIcon}
                />
                <View style={styles.calloutBody}>
                  <Text style={[styles.calloutTitle, { color: theme.accent }]}>
                    Pro Tip
                  </Text>
                  <Text
                    style={[styles.calloutText, { color: theme.textSecondary }]}
                  >
                    {sec.tip}
                  </Text>
                </View>
              </View>
            ) : null}

            {sec.warning ? (
              <View
                style={[
                  styles.calloutCard,
                  styles.warningCard,
                  {
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    borderColor: '#EF4444',
                  },
                ]}
              >
                <Icon
                  name="warning-amber"
                  size={18}
                  color="#EF4444"
                  style={styles.calloutIcon}
                />
                <View style={styles.calloutBody}>
                  <Text style={[styles.calloutTitle, { color: '#EF4444' }]}>
                    Important Notice
                  </Text>
                  <Text
                    style={[styles.calloutText, { color: theme.textSecondary }]}
                  >
                    {sec.warning}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        ))}

        {/* BOTTOM ACTION */}
        <View style={styles.bottomActions}>
          {article.actionLabel && article.actionScreen ? (
            <TouchableOpacity
              style={[
                styles.primaryActionButton,
                {
                  backgroundColor: theme.accent,
                },
              ]}
              activeOpacity={0.85}
              onPress={handleAction}
            >
              <Text style={styles.primaryActionText}>
                {article.actionLabel}
              </Text>
              <Icon name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              styles.backToGuidesButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={16} color={theme.text} />
            <Text style={[styles.backToGuidesText, { color: theme.text }]}>
              Back to Help & Support
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },
  readTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readTimeIcon: {
    marginRight: 4,
  },
  readTimeText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  articleTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    lineHeight: 26,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Inter-Regular',
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionBullet: {
    width: 6,
    height: 18,
    borderRadius: 3,
    marginRight: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Inter-Regular',
    marginBottom: 10,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  calloutCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
  },
  tipCard: {},
  warningCard: {},
  calloutIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  calloutBody: {
    flex: 1,
  },
  calloutTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calloutText: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  bottomActions: {
    marginTop: 10,
    gap: 10,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },
  backToGuidesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  backToGuidesText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
});

export default HelpArticleScreen;
