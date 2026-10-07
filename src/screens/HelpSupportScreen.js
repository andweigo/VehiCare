
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    LayoutAnimation,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const QUICK_CARDS = [
  {
    key: 'getting_started',
    title: 'Getting Started',
    icon: 'rocket-launch',
    description: 'Learn the basics of VehiCare',
  },
  {
    key: 'vehicle_setup',
    title: 'Vehicle Setup',
    icon: 'directions-car',
    description: 'Manage your vehicle profiles',
  },
  {
    key: 'ai_diagnostics',
    title: 'AI Diagnostics',
    icon: 'health-and-safety',
    description: 'Understand your vehicle diagnosis',
  },
  {
    key: 'maintenance',
    title: 'Maintenance',
    icon: 'build',
    description: 'Manage maintenance and reminders',
  },
];

const FAQ_ITEMS = [
  {
    id: 'add_vehicle',
    q: 'How do I add a vehicle?',
    a:
      "Open 'My Vehicles' and tap 'Add Vehicle'. Fill in the basic details and save. You can edit vehicle information anytime from its profile.",
  },
  {
    id: 'diagnose',
    q: 'How does VehiCare diagnose vehicle problems?',
    a:
      'VehiCare uses symptom inputs, vehicle data, and AI models to suggest likely causes and repair recommendations. Results are informational — always verify with a mechanic.',
  },
  {
    id: 'guest',
    q: 'Can I use VehiCare without an account?',
    a:
      "Yes — you can try basic features as a guest, but saving vehicles, history, and premium features require an account.",
  },
  {
    id: 'vehicle_limit',
    q: 'How many vehicles can I add?',
    a:
      'The number of vehicles depends on your subscription: Free users have a limited number; Premium increases that limit. Check your plan in Profile.',
  },
  {
    id: 'premium_included',
    q: 'What is included in Premium?',
    a:
      'Premium includes unlimited vehicles (or higher limits), priority support, enhanced diagnostics, and exclusive content. Contact support to learn more.',
  },
  {
    id: 'ai_accuracy',
    q: 'How accurate is the AI diagnosis?',
    a:
      'AI assists by analyzing symptoms and patterns. Accuracy varies by input quality and available vehicle data — always confirm recommendations with a qualified mechanic.',
  },
  {
    id: 'cost_estimates',
    q: 'How are repair cost estimates calculated?',
    a:
      'Estimates are derived from typical labor rates, parts pricing, and historical data. They are indicative and may vary by location and shop.',
  },
  {
    id: 'recommend_shop',
    q: 'When does VehiCare recommend a repair shop?',
    a:
      'VehiCare suggests repair shops when an issue is likely beyond basic troubleshooting or when professional inspection/repair is recommended.',
  },
];

const SUPPORT_CATEGORIES = [
  {
    key: 'account',
    title: 'Account & Security',
    icon: 'person',
    desc: 'Login, password, and account issues',
    screen: 'Profile',
  },
  {
    key: 'vehicle',
    title: 'Vehicle & Garage',
    icon: 'directions-car',
    desc: 'Vehicle profiles and setup',
    screen: 'Vehicles',
  },
  {
    key: 'diagnostics',
    title: 'Diagnostics',
    icon: 'health-and-safety',
    desc: 'Understanding diagnostic results',
    screen: 'Diagnostics',
  },
  {
    key: 'maintenance',
    title: 'Maintenance',
    icon: 'build',
    desc: 'Maintenance schedules and reminders',
    screen: 'Maintenance',
  },
  {
    key: 'subscription',
    title: 'Subscription & Premium',
    icon: 'workspace-premium',
    desc: 'Billing and premium features',
    screen: null,
  },
  {
    key: 'technical',
    title: 'Technical Issues',
    icon: 'settings-suggest',
    desc: 'App crashes, device issues',
    screen: null,
  },
];

const RESOURCES = [
  {
    key: 'user_guide',
    title: 'User Guide',
    icon: 'menu-book',
    screen: null,
  },
  {
    key: 'getting_started',
    title: 'Getting Started',
    icon: 'rocket-launch',
    screen: null,
  },
  {
    key: 'diagnostics_guide',
    title: 'Vehicle Diagnostics Guide',
    icon: 'search',
    screen: null,
  },
  {
    key: 'maintenance_guide',
    title: 'Maintenance Guide',
    icon: 'build',
    screen: null,
  },
];

const HelpSupportScreen = ({ navigation }) => {
  const { theme } = useTheme();

  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState({});
  const [faq, setFaq] = useState(FAQ_ITEMS);

  useEffect(() => {
    if (!query.trim()) {
      setFaq(FAQ_ITEMS);
      return;
    }

    const q = query.trim().toLowerCase();

    const filtered = FAQ_ITEMS.filter(
      item =>
        item.q.toLowerCase().includes(q) ||
        item.a.toLowerCase().includes(q),
    );

    setFaq(filtered);
  }, [query]);

  const toggleExpand = useCallback(id => {
    LayoutAnimation.configureNext(
      LayoutAnimation.Presets.easeInEaseOut,
    );

    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const onQuickCardPress = useCallback(card => {
    Alert.alert(card.title, card.description);
  }, []);

  const onContactSupport = useCallback(() => {
    Alert.alert(
      'Contact Support',
      'Open support contact form (placeholder)',
    );
  }, []);

  const onReportProblem = useCallback(() => {
    Alert.alert(
      'Report a Problem',
      'Open problem report flow (placeholder)',
    );
  }, []);

  const onCategoryPress = useCallback(
    cat => {
      if (cat.screen && navigation) {
        navigation.navigate(cat.screen);
        return;
      }

      Alert.alert(cat.title, cat.desc);
    },
    [navigation],
  );

  const onResourcePress = useCallback(
    resource => {
      if (resource.screen && navigation) {
        navigation.navigate(resource.screen);
        return;
      }

      Alert.alert(
        resource.title,
        'Open resource (placeholder)',
      );
    },
    [navigation],
  );

  const filteredFaq = useMemo(() => faq, [faq]);

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
        },
      ]}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <View style={styles.header}>
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
          >
            <Icon
              name="arrow-back"
              size={21}
              color={theme.text}
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text
              style={[
                styles.eyebrow,
                {
                  color: theme.accent,
                },
              ]}
            >
              VEHICARE
            </Text>

            <Text
              style={[
                styles.title,
                {
                  color: theme.text,
                },
              ]}
            >
              Help & Support
            </Text>

            <Text
              style={[
                styles.subtitle,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              We're here to help you get the most out of
              VehiCare
            </Text>
          </View>
        </View>

        {/* SEARCH */}

        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Icon
            name="search"
            size={20}
            color={theme.textSecondary}
          />

          <TextInput
            placeholder="Search for help..."
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.searchInput,
              {
                color: theme.text,
              },
            ]}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            underlineColorAndroid="transparent"
          />

          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => setQuery('')}
              activeOpacity={0.7}
            >
              <Icon
                name="close"
                size={19}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* QUICK HELP */}

        <View style={styles.quickSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickScrollContent}
          >
            {QUICK_CARDS.map(card => (
              <TouchableOpacity
                key={card.key}
                style={[
                  styles.quickCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() => onQuickCardPress(card)}
              >
                <View
                  style={[
                    styles.quickIcon,
                    {
                      backgroundColor: theme.accentSoft,
                    },
                  ]}
                >
                  <Icon
                    name={card.icon}
                    size={20}
                    color={theme.accent}
                  />
                </View>

                <View style={styles.quickContent}>
                  <Text
                    style={[
                      styles.quickTitle,
                      {
                        color: theme.text,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {card.title}
                  </Text>

                  <Text
                    style={[
                      styles.quickDesc,
                      {
                        color: theme.textSecondary,
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {card.description}
                  </Text>
                </View>

                <Icon
                  name="arrow-forward"
                  size={16}
                  color={theme.textSecondary}
                  style={styles.quickArrow}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* FAQ */}

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeadingRow}>
            <View>
              <Text
                style={[
                  styles.sectionHeading,
                  {
                    color: theme.text,
                  },
                ]}
              >
                Frequently Asked Questions
              </Text>

              <Text
                style={[
                  styles.sectionSubheading,
                  {
                    color: theme.textSecondary,
                  },
                ]}
              >
                Find quick answers to common questions
              </Text>
            </View>

            <View
              style={[
                styles.faqCount,
                {
                  backgroundColor: theme.accentSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.faqCountText,
                  {
                    color: theme.accent,
                  },
                ]}
              >
                {filteredFaq.length}
              </Text>
            </View>
          </View>

          {query.trim().length > 0 &&
            filteredFaq.length === 0 && (
              <View
                style={[
                  styles.emptyFaq,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                  },
                ]}
              >
                <Icon
                  name="search-off"
                  size={26}
                  color={theme.textSecondary}
                />

                <Text
                  style={[
                    styles.emptyFaqTitle,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  No results found
                </Text>

                <Text
                  style={[
                    styles.emptyFaqText,
                    {
                      color: theme.textSecondary,
                    },
                  ]}
                >
                  Try searching with a different keyword.
                </Text>
              </View>
            )}

          {filteredFaq.map(item => {
            const isOpen = Boolean(
              expanded[item.id],
            );

            return (
              <View
                key={item.id}
                style={[
                  styles.faqItem,
                  {
                    borderColor: isOpen
                      ? theme.accent
                      : theme.border,
                    backgroundColor: theme.surface,
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    toggleExpand(item.id)
                  }
                  style={styles.faqHeader}
                >
                  <View style={styles.faqNumber}>
                    <Text
                      style={[
                        styles.faqNumberText,
                        {
                          color: theme.accent,
                        },
                      ]}
                    >
                      {String(
                        FAQ_ITEMS.findIndex(
                          faqItem =>
                            faqItem.id === item.id,
                        ) + 1,
                      ).padStart(2, '0')}
                    </Text>
                  </View>

                  <View
                    style={styles.faqQuestionRow}
                  >
                    <Text
                      style={[
                        styles.faqQuestion,
                        {
                          color: theme.text,
                        },
                      ]}
                    >
                      {item.q}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.faqChevron,
                      {
                        backgroundColor: isOpen
                          ? theme.accentSoft
                          : theme.surfaceAlt,
                      },
                    ]}
                  >
                    <Icon
                      name={
                        isOpen
                          ? 'remove'
                          : 'add'
                      }
                      size={17}
                      color={
                        isOpen
                          ? theme.accent
                          : theme.textSecondary
                      }
                    />
                  </View>
                </TouchableOpacity>

                {isOpen && (
                  <View
                    style={[
                      styles.faqAnswer,
                      {
                        borderTopColor:
                          theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.faqAnswerText,
                        {
                          color:
                            theme.textSecondary,
                        },
                      ]}
                    >
                      {item.a}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* CONTACT SUPPORT */}

        <View
          style={[
            styles.contactCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.contactIcon,
              
            ]}
          >
            <Icon
              name="support-agent"
              size={26}
              color={theme.accent}
            />
          </View>

          <View style={styles.contactContent}>
            <Text
              style={[
                styles.contactTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              Still need help?
            </Text>

            <Text
              style={[
                styles.contactDesc,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              Our support team is ready to help with
              account, vehicle, diagnostics, or technical
              concerns.
            </Text>

            <View style={styles.contactActions}>
              <TouchableOpacity
                style={[
                  styles.primaryAction,
                  {
                    backgroundColor: theme.accent,
                  },
                ]}
                activeOpacity={0.85}
                onPress={onContactSupport}
              >
                <Icon
                  name="mail-outline"
                  size={16}
                  color="#FFFFFF"
                />

                <Text
                  style={styles.primaryActionText}
                >
                  Contact Support
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryAction,
                  {
                    borderColor: theme.border,
                  },
                ]}
                activeOpacity={0.85}
                onPress={onReportProblem}
              >
                <Icon
                  name="report-problem"
                  size={16}
                  color={theme.text}
                />

                <Text
                  style={[
                    styles.secondaryActionText,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  Report Problem
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* SUPPORT CATEGORIES */}

        <View style={styles.sectionBlock}>
          <Text
            style={[
              styles.sectionHeading,
              {
                color: theme.text,
              },
            ]}
          >
            Support
          </Text>

          <Text
            style={[
              styles.sectionSubheading,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            Browse help by category
          </Text>

          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {SUPPORT_CATEGORIES.map(
              (cat, index) => (
                <TouchableOpacity
                  key={cat.key}
                  activeOpacity={0.8}
                  onPress={() =>
                    onCategoryPress(cat)
                  }
                  style={[
                    styles.categoryRow,
                    {
                      borderBottomColor:
                        theme.border,
                      borderBottomWidth:
                        index ===
                        SUPPORT_CATEGORIES.length -
                          1
                          ? 0
                          : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      {
                        backgroundColor:
                          theme.surfaceAlt,
                      },
                    ]}
                  >
                    <Icon
                      name={cat.icon}
                      size={18}
                      color={theme.accent}
                    />
                  </View>

                  <View
                    style={styles.categoryContent}
                  >
                    <Text
                      style={[
                        styles.categoryTitle,
                        {
                          color: theme.text,
                        },
                      ]}
                    >
                      {cat.title}
                    </Text>

                    <Text
                      style={[
                        styles.categoryDesc,
                        {
                          color:
                            theme.textSecondary,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.desc}
                    </Text>
                  </View>

                  <Icon
                    name="chevron-right"
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              ),
            )}
          </View>
        </View>

        {/* RESOURCES */}

        <View style={styles.sectionBlock}>
          <Text
            style={[
              styles.sectionHeading,
              {
                color: theme.text,
              },
            ]}
          >
            Helpful Resources
          </Text>

          <Text
            style={[
              styles.sectionSubheading,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            Guides to help you use VehiCare
          </Text>

          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {RESOURCES.map(
              (resource, index) => (
                <TouchableOpacity
                  key={resource.key}
                  activeOpacity={0.8}
                  onPress={() =>
                    onResourcePress(resource)
                  }
                  style={[
                    styles.resourceRow,
                    {
                      borderBottomColor:
                        theme.border,
                      borderBottomWidth:
                        index ===
                        RESOURCES.length - 1
                          ? 0
                          : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.resourceIcon,
                      {
                        backgroundColor:
                          theme.surfaceAlt,
                      },
                    ]}
                  >
                    <Icon
                      name={resource.icon}
                      size={18}
                      color={theme.accent}
                    />
                  </View>

                  <View
                    style={styles.resourceContent}
                  >
                    <Text
                      style={[
                        styles.resourceTitle,
                        {
                          color: theme.text,
                        },
                      ]}
                    >
                      {resource.title}
                    </Text>
                  </View>

                  <Icon
                    name="chevron-right"
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              ),
            )}
          </View>
        </View>

        {/* SAFETY NOTICE */}

        <View
          style={[
            styles.safetyCard,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.safetyIcon,
              {
                backgroundColor: theme.accentSoft,
              },
            ]}
          >
            <Icon
              name="warning"
              size={18}
              color={theme.accent}
            />
          </View>

          <View style={styles.safetyContent}>
            <Text
              style={[
                styles.safetyTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              Safety First
            </Text>

            <Text
              style={[
                styles.safetyText,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              VehiCare provides informational guidance
              and AI-assisted diagnostics. Always follow
              proper safety procedures and consult a
              qualified mechanic for serious or uncertain
              vehicle problems.
            </Text>
          </View>
        </View>

        {/* APP INFO */}

        <View style={styles.appInfo}>
          <Text
            style={[
              styles.appName,
              {
                color: theme.text,
              },
            ]}
          >
            VehiCare
          </Text>

          <Text
            style={[
              styles.appVersion,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            Version 1.0.0
          </Text>

          <Text
            style={[
              styles.appHelpText,
              {
                color: theme.textSecondary,
              },
            ]}
          >
            Driving Smarter. Diagnosing Faster. Maintaining Better.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 60,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 12,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 1.8,
    marginBottom: 4,
  },

  title: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 24,
    letterSpacing: -0.3,
  },

  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },

  /* SEARCH */

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    marginTop: 12,
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },

  /* QUICK HELP */

  quickSection: {
    marginBottom: 12,
  },

  quickScrollContent: {
    paddingRight: 20,
  },

  quickCard: {
    width: 160,
    minHeight: 126,
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    marginRight: 10,
  },

  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  quickContent: {
    flex: 1,
  },

  quickTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
  },

  quickDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 4,
  },

  quickArrow: {
    position: 'absolute',
    right: 12,
    bottom: 12,
  },

  /* SECTIONS */

  sectionBlock: {
    marginTop: 18,
  },

  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  sectionHeading: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
  },

  sectionSubheading: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    marginTop: 3,
    marginBottom: 8,
  },

  faqCount: {
    minWidth: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  faqCountText: {
    fontFamily: 'Inter-Bold',
    fontSize: 11,
  },

  /* FAQ */

  faqItem: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },

  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 42,
  },

  faqNumber: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  faqNumberText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
  },

  faqQuestionRow: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  faqQuestion: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    lineHeight: 18,
  },

  faqChevron: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  faqAnswer: {
    marginTop: 10,
    paddingTop: 10,
    paddingLeft: 38,
    borderTopWidth: 1,
  },

  faqAnswerText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    lineHeight: 18,
  },

  emptyFaq: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    marginTop: 8,
    alignItems: 'center',
  },

  emptyFaqTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    marginTop: 8,
  },

  emptyFaqText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },

  /* CONTACT */

 contactCard: {
  borderRadius: 16,
  borderWidth: 1,
  padding: 16,
  marginTop: 16,
  marginBottom: 12,
},

contactContent: {
  width: '100%',
},

contactTitle: {
  fontFamily: 'Outfit-SemiBold',
  fontSize: 17,
  marginBottom: 5,
},

contactDesc: {
  fontFamily: 'Inter-Regular',
  fontSize: 12,
  lineHeight: 18,
  marginBottom: 14,
},

contactActions: {
  width: '100%',
  gap: 9,
},

primaryAction: {
  width: '100%',
  height: 42,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 14,
  borderRadius: 11,
},

primaryActionText: {
  color: '#FFFFFF',
  fontFamily: 'Inter-SemiBold',
  fontSize: 12,
  marginLeft: 7,
},

secondaryAction: {
  width: '100%',
  height: 42,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 14,
  borderRadius: 11,
  borderWidth: 1,
},

secondaryActionText: {
  fontFamily: 'Inter-SemiBold',
  fontSize: 12,
  marginLeft: 7,
},

  /* SUPPORT */

  settingsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },

  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },

  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  categoryContent: {
    flex: 1,
    minWidth: 0,
  },

  categoryTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
  },

  categoryDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 2,
  },

  /* RESOURCES */

  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },

  resourceIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  resourceContent: {
    flex: 1,
  },

  resourceTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
  },

  /* SAFETY */

  safetyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 18,
  },

  safetyIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  safetyContent: {
    marginLeft: 10,
    flex: 1,
  },

  safetyTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
  },

  safetyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
    marginTop: 4,
    lineHeight: 17,
  },

  /* APP INFO */

  appInfo: {
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 40,
  },

  appName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
  },

  appVersion: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 4,
  },

  appHelpText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 6,
  },
});

export default HelpSupportScreen;
