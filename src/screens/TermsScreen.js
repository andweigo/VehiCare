import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const Section = ({ title, children, theme }) => (
  <View style={styles.section}>
    <Text style={[styles.sectionTitle, { color: theme.text }]}>
      {title}
    </Text>
    {children}
  </View>
);

const Bullet = ({ text, theme }) => (
  <View style={styles.bulletRow}>
    <View style={[styles.bullet, { backgroundColor: theme.accent }]} />
    <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
      {text}
    </Text>
  </View>
);

const TermsScreen = ({ navigation }) => {
  const { theme } = useTheme();

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
          <Text style={[styles.headerEyebrow, { color: theme.accent }]}>
            LEGAL
          </Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Terms & Conditions
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}>
            Last Updated: August 2026
          </Text>

          <Text style={[styles.intro, { color: theme.textSecondary }]}>
            Welcome to VehiCare. By creating an account or using the VehiCare
            application, you agree to these Terms and Conditions. Please read
            them carefully before using our services.
          </Text>

          {/* 1. Acceptance */}
          <Section title="1. Acceptance of Terms" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              By accessing or using VehiCare, you acknowledge that you have read,
              understood, and agree to be bound by these Terms and Conditions.
            </Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              If you do not agree with these terms, please do not create an
              account or use features that require acceptance of these terms.
            </Text>
          </Section>

          {/* 2. About VehiCare */}
          <Section title="2. About VehiCare" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              VehiCare is an intelligent multi-vehicle diagnostics and repair
              assistance application designed to help vehicle owners understand
              possible vehicle problems and maintenance needs.
            </Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              VehiCare may provide:
            </Text>
            <Bullet text="Vehicle profile management" theme={theme} />
            <Bullet text="Vehicle maintenance reminders" theme={theme} />
            <Bullet text="AI-assisted vehicle diagnosis" theme={theme} />
            <Bullet text="Troubleshooting suggestions" theme={theme} />
            <Bullet text="Possible causes of reported vehicle problems" theme={theme} />
            <Bullet text="General repair and maintenance information" theme={theme} />
            <Bullet text="Estimated repair cost information" theme={theme} />
            <Bullet text="Recommendations for professional assistance when appropriate" theme={theme} />
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              VehiCare is intended as an assistance and information tool and is
              not a replacement for a qualified mechanic, automotive
              technician, electrician, or other professional.
            </Text>
          </Section>

          {/* 3. User Account */}
          <Section title="3. User Account" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              Some VehiCare features require you to create an account.
            </Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              When creating an account, you agree to:
            </Text>
            <Bullet text="Provide accurate information." theme={theme} />
            <Bullet text="Use your own account credentials." theme={theme} />
            <Bullet text="Keep your account information secure." theme={theme} />
            <Bullet text="Not impersonate another person." theme={theme} />
            <Bullet text="Not attempt to access another user's account." theme={theme} />
            <Bullet text="Notify the appropriate VehiCare support channel if you believe your account has been compromised." theme={theme} />
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              Each email address may only be associated with one VehiCare account.
            </Text>
          </Section>

          {/* 4. Guest Access */}
          <Section title="4. Guest Access" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              VehiCare may allow users to access certain features without
              creating an account.
            </Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              Guest users may have limited access to certain features, including
              AI diagnosis or chat functionality.
            </Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              Guest usage may be subject to limitations such as:
            </Text>
            <Bullet text="A limited number of diagnosis requests or conversations." theme={theme} />
            <Bullet text="Limited vehicle profile storage." theme={theme} />
            <Bullet text="Limited access to certain features." theme={theme} />
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              If a guest user creates an account, their locally stored vehicle
              information may be transferred to their newly authenticated account
              when applicable.
            </Text>
          </Section>

          {/* 5. Vehicle Information */}
          <Section title="5. Vehicle Information" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              Users may create and manage vehicle profiles within VehiCare.
            </Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              Vehicle information may include:
            </Text>
            <Bullet text="Vehicle type" theme={theme} />
            <Bullet text="Brand" theme={theme} />
            <Bullet text="Model" theme={theme} />
            <Bullet text="Year" theme={theme} />
            <Bullet text="Model number" theme={theme} />
            <Bullet text="Custom vehicle information" theme={theme} />
            <Bullet text="Vehicle nickname" theme={theme} />
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              You are responsible for ensuring that the information you provide
              is reasonably accurate.
            </Text>
          </Section>

          {/* 6. AI Diagnosis */}
          <Section title="6. AI Diagnosis and Recommendations" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              VehiCare may use artificial intelligence to analyze information
              provided by users and generate possible explanations,
              troubleshooting suggestions, maintenance recommendations, or
              other assistance.
            </Text>
            <View style={[styles.warningBox, { backgroundColor: 'rgba(246, 59, 5, 0.08)', borderColor: theme.accent }]}>
              <Icon name="warning-amber" size={18} color={theme.accent} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.warningText, { color: theme.accent }]}>
                AI-generated information may be incomplete, inaccurate, or
                unsuitable for a particular vehicle or situation.
              </Text>
            </View>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              VehiCare does not guarantee that an AI-generated diagnosis will
              correctly identify a vehicle problem.
            </Text>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              Users should not rely solely on VehiCare when dealing with:
            </Text>
            <Bullet text="Brake failures" theme={theme} />
            <Bullet text="Steering problems" theme={theme} />
            <Bullet text="Electrical hazards" theme={theme} />
            <Bullet text="Fuel system problems" theme={theme} />
            <Bullet text="Serious mechanical damage" theme={theme} />
            <Bullet text="Any situation that may cause injury or property damage" theme={theme} />
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              When a problem appears serious or beyond the scope of general
              troubleshooting, users should seek assistance from a qualified
              professional.
            </Text>
          </Section>
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  lastUpdated: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  intro: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Inter-Regular',
    marginBottom: 20,
  },
  section: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Inter-Regular',
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 4,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    fontFamily: 'Inter-SemiBold',
  },
});

export default TermsScreen;
