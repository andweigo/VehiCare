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

const PrivacyScreen = ({ navigation }) => {
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
            LEGAL & PRIVACY
          </Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Privacy Policy
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
            VehiCare ("we", "our", or "the app") values your privacy. This Privacy
            Policy explains how information is collected, processed, and protected
            when you use the VehiCare mobile application and its associated services.
          </Text>

          {/* 1. Information We Collect */}
          <Section title="1. Information We Collect" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              VehiCare collects information required to provide intelligent vehicle
              diagnostics and maintenance management:
            </Text>
            <Bullet text="Account Data: Name, email address, password (stored hashed on the Laravel backend), and optional profile photo." theme={theme} />
            <Bullet text="Vehicle Profiles: Vehicle category (Car, Motorcycle, Bicycle), brand, model, year, and optional model number." theme={theme} />
            <Bullet text="Diagnostic Inquiries & Media: Symptom descriptions, warning light indicators, user-captured component photos, recorded engine sound clips, and video clips uploaded for AI diagnostic consultations." theme={theme} />
            <Bullet text="Maintenance & Service Logs: Completed maintenance records, inspection dates, and tracked mileage intervals." theme={theme} />
            <Bullet text="Local Storage: Temporary guest vehicle state, guest diagnosis counts (up to 5), and theme/language preferences stored locally via AsyncStorage." theme={theme} />
          </Section>

          {/* 2. How We Use Your Information */}
          <Section title="2. How We Use Your Information" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              The information we collect is used strictly to power your vehicle experience:
            </Text>
            <Bullet text="Generating AI-assisted diagnosis reports, probable cause estimations, and repair recommendations." theme={theme} />
            <Bullet text="Tailoring maintenance schedules and reminder notifications for your registered vehicle profiles." theme={theme} />
            <Bullet text="Preserving your consultation history so you can review previous vehicle issues." theme={theme} />
            <Bullet text="Locating nearby repair shops and service centers based on approximate device location when requested." theme={theme} />
            <Bullet text="Authenticating and securing your account through Laravel Sanctum and Firebase Authentication." theme={theme} />
          </Section>

          {/* 3. AI Processing & Third-Party Services */}
          <Section title="3. AI Processing & Third-Party Services" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              To provide advanced multimodal diagnostics and reliable authentication, VehiCare integrates the following trusted services:
            </Text>
            <Bullet text="Google Gemini API: Multimodal AI service that processes submitted symptom text, photos, audio recordings, and videos to return structured vehicle diagnostic insights." theme={theme} />
            <Bullet text="Firebase Authentication: Manages secure user identity, password resets, and Google Sign-In authentication." theme={theme} />
            <Bullet text="Laravel Sanctum API Backend: Authenticates mobile API requests via secure Bearer tokens and persists account data in MySQL." theme={theme} />
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              VehiCare does not sell, rent, or trade your personal information or vehicle data to third-party advertisers.
            </Text>
          </Section>

          {/* 4. Device Permissions */}
          <Section title="4. Device Permissions & Usage" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              VehiCare only requests device permissions when necessary to support specific features:
            </Text>
            <Bullet text="Camera: Only requested when you choose to photograph vehicle damage, fluid leaks, or dashboard warning lights." theme={theme} />
            <Bullet text="Photo Library: Only requested when you choose to attach an existing photo or video clip to an AI diagnosis or bug report." theme={theme} />
            <Bullet text="Microphone: Only requested when you tap the audio recording button in Ask VehiCare to capture abnormal engine sounds." theme={theme} />
            <Bullet text="Location: Used only to find automotive, motorcycle, or bicycle repair shops near you in the Repair Shops finder." theme={theme} />
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              You can revoke any permission at any time through your device operating system settings.
            </Text>
          </Section>

          {/* 5. Data Retention & Control */}
          <Section title="5. Data Retention & Account Control" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              You have direct control over your vehicle and personal information:
            </Text>
            <Bullet text="Vehicle Records: You can edit or delete vehicle profiles from My Garage at any time." theme={theme} />
            <Bullet text="Profile Information: You can update your display name and profile photo in the Profile screen." theme={theme} />
            <Bullet text="Guest Data: Guest user data resides strictly on your local device and is completely cleared if you clear application storage or sign out." theme={theme} />
            <Bullet text="Account Deletion: Registered users may request complete account and data removal through the Help & Support screen or Contact Support." theme={theme} />
          </Section>

          {/* 6. AI Diagnostic Disclaimer */}
          <Section title="6. Important Advisory Disclaimer" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              VehiCare's AI diagnostic suggestions and estimated repair costs are informational and advisory. They are not a substitute for hands-on inspection by a certified mechanic or automotive technician.
            </Text>
          </Section>

          {/* 7. Contact Us */}
          <Section title="7. Contact Us" theme={theme}>
            <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
              If you have any questions or concerns regarding this Privacy Policy or your data, you can reach out via:
            </Text>
            <Bullet text="Help & Support screen inside the VehiCare application." theme={theme} />
            <Bullet text="The Send Feedback or Report a Problem option in Settings." theme={theme} />
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
});

export default PrivacyScreen;
