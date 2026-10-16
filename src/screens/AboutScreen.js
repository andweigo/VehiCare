import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const AboutScreen = ({ navigation }) => {
  const { theme } = useTheme();

  const features = [
    {
      icon: 'directions-car',
      title: 'Multi-Vehicle Garage',
      desc: 'Seamless support for cars, motorcycles, and bicycles with individualized profiles.',
    },
    {
      icon: 'psychology',
      title: 'Multimodal AI Diagnostics',
      desc: 'Analyze symptoms through natural text descriptions, camera photos, audio sound clips, and video.',
    },
    {
      icon: 'build',
      title: 'Smart Maintenance Schedules',
      desc: 'Preventive service checklists, smart reminders, and actionable DIY maintenance guides.',
    },
    {
      icon: 'history',
      title: 'Service & Diagnostic History',
      desc: 'Complete digital logbook tracking vehicle health records and past consultations.',
    },
    {
      icon: 'storefront',
      title: 'Nearby Repair Shop Locator',
      desc: 'Discover trusted local repair shops, mechanics, and bicycle service centers.',
    },
    {
      icon: 'sync-alt',
      title: 'Guest & Cloud Synchronization',
      desc: 'Try instantly as a guest, then seamlessly migrate your vehicle data upon registration.',
    },
  ];

  const vehicleTypes = [
    { name: 'Cars & Light Trucks', icon: 'directions-car', details: 'Sedans, SUVs, Pickups, Vans, Hatchbacks' },
    { name: 'Motorcycles & Scooters', icon: 'motorcycle', details: 'Underbones, Automatic Scooters, Big Bikes' },
    { name: 'Bicycles', icon: 'directions-bike', details: 'Mountain, Road, Commuter, and City Bicycles' },
  ];

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
            ABOUT
          </Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            About VehiCare
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* BRAND HERO */}
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={[styles.appName, { color: theme.text }]}>
            VehiCare
          </Text>

          <Text style={[styles.tagline, { color: theme.accent }]}>
            An Intelligent Multi-Vehicle Diagnostics & Repair Assistance System
          </Text>

          <View style={[styles.versionBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <Text style={[styles.versionText, { color: theme.textSecondary }]}>
              Version 1.0.0 (Build 100)
            </Text>
          </View>

          <Text style={[styles.purposeText, { color: theme.textSecondary }]}>
            VehiCare is a capstone-engineered mobile diagnostic companion designed
            to empower vehicle owners with transparent, accessible, and intelligent
            maintenance intelligence. By combining symptom recognition with practical
            repair guidance, VehiCare helps drivers and riders prevent costly breakdowns
            and maintain vehicle longevity.
          </Text>
        </View>

        {/* CORE FEATURES */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>
            Core Implemented Features
          </Text>
          <Text style={[styles.sectionSubheading, { color: theme.textSecondary }]}>
            Engineered capabilities built into VehiCare
          </Text>

          <View
            style={[
              styles.featuresCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {features.map((feat, idx) => (
              <View
                key={idx}
                style={[
                  styles.featureRow,
                  {
                    borderBottomColor: theme.border,
                    borderBottomWidth: idx === features.length - 1 ? 0 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIconWrap,
                    { backgroundColor: theme.accentSoft },
                  ]}
                >
                  <Icon name={feat.icon} size={20} color={theme.accent} />
                </View>

                <View style={styles.featureContent}>
                  <Text style={[styles.featureTitle, { color: theme.text }]}>
                    {feat.title}
                  </Text>
                  <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>
                    {feat.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* SUPPORTED VEHICLES */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>
            Supported Vehicle Categories
          </Text>
          <Text style={[styles.sectionSubheading, { color: theme.textSecondary }]}>
            Specialized diagnostics for three major mobility types
          </Text>

          <View
            style={[
              styles.vehiclesCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {vehicleTypes.map((v, idx) => (
              <View
                key={idx}
                style={[
                  styles.vehicleTypeRow,
                  {
                    borderBottomColor: theme.border,
                    borderBottomWidth: idx === vehicleTypes.length - 1 ? 0 : 1,
                  },
                ]}
              >
                <View style={[styles.vehicleIconWrap, { backgroundColor: theme.surfaceAlt }]}>
                  <Icon name={v.icon} size={22} color={theme.accent} />
                </View>
                <View style={styles.vehicleTypeContent}>
                  <Text style={[styles.vehicleTypeName, { color: theme.text }]}>
                    {v.name}
                  </Text>
                  <Text style={[styles.vehicleTypeDetails, { color: theme.textSecondary }]}>
                    {v.details}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* DEVELOPMENT CREDITS */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeading, { color: theme.text }]}>
            Development Team & Credits
          </Text>
          <View
            style={[
              styles.creditsCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.creditsRow}>
              <Icon name="code" size={20} color={theme.accent} style={{ marginRight: 10 }} />
              <Text style={[styles.creditsTitle, { color: theme.text }]}>
                VehiCare Capstone Engineering Team
              </Text>
            </View>
            <Text style={[styles.creditsText, { color: theme.textSecondary }]}>
              Developed as an intelligent mobile engineering capstone project using
              React Native, Laravel 12 Sanctum, Google Gemini AI, and Firebase Authentication.
            </Text>
          </View>
        </View>

        {/* AI DISCLAIMER */}
        <View
          style={[
            styles.disclaimerCard,
            {
              backgroundColor: theme.surfaceAlt,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={[styles.disclaimerIcon, { backgroundColor: theme.accentSoft }]}>
            <Icon name="health-and-safety" size={20} color={theme.accent} />
          </View>
          <View style={styles.disclaimerContent}>
            <Text style={[styles.disclaimerTitle, { color: theme.text }]}>
              AI Diagnostics Advisory Disclaimer
            </Text>
            <Text style={[styles.disclaimerText, { color: theme.textSecondary }]}>
              VehiCare's AI diagnostics, probable cause analyses, and repair recommendations
              are intended for informational and advisory purposes only. VehiCare is not
              a certified mechanic. Always verify findings with a certified automotive,
              motorcycle, or bicycle technician before conducting major repairs.
            </Text>
          </View>
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
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 12,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: 'Outfit-ExtraBold',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  versionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter-Medium',
  },
  purposeText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    marginBottom: 4,
  },
  sectionSubheading: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
  },
  featuresCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  vehiclesCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  vehicleTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  vehicleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vehicleTypeContent: {
    flex: 1,
  },
  vehicleTypeName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    marginBottom: 2,
  },
  vehicleTypeDetails: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
  },
  creditsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  creditsTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },
  creditsText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  disclaimerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  disclaimerContent: {
    flex: 1,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
});

export default AboutScreen;
