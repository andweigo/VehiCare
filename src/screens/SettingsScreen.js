import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import SkeletonLoader, { useScreenSkeleton } from '../components/SkeletonLoader';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../theme/ThemeContext';

const ORANGE = '#F5501C';

const SettingsScreen = ({ navigation }) => {
  const { theme, themeName } = useTheme();
  const isDark = themeName === 'dark';
  const { openSidebar } = useSidebar();

  const navigateToHelpSupport = () => {
    let root = navigation;
    while (
      root &&
      root.getParent &&
      root.getParent() &&
      root.getParent() !== root
    ) {
      const parent = root.getParent();
      if (!parent) break;
      root = parent;
    }

    if (root?.navigate) {
      root.navigate('HelpSupport');
    } else {
      navigation.navigate('HelpSupport');
    }
  };

  const showSkeleton = useScreenSkeleton(false, 'Settings');

  if (showSkeleton) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[
          styles.container,
          { backgroundColor: isDark ? '#0A0A0A' : theme.background },
        ]}
      >
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#0A0A0A' : theme.background}
        />
        <SkeletonLoader variant="settings" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.container,
        { backgroundColor: isDark ? '#0A0A0A' : theme.background },
      ]}
    >
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#0A0A0A' : theme.background}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================================================
            1. TOP HEADER
        ================================================== */}
        <View style={styles.header}>
          <View style={styles.headerLeftGroup}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => navigation.goBack()}
              style={[
                styles.backButton,
                {
                  backgroundColor: isDark ? '#16161A' : theme.surface,
                  borderColor: isDark ? '#24242A' : theme.border,
                },
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="arrow-back" size={22} color={isDark ? '#FFFFFF' : theme.text} />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>SUPPORT & INFORMATION</Text>
              <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                Settings
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={openSidebar}
            style={[
              styles.menuButton,
              {
                backgroundColor: isDark ? '#16161A' : theme.surface,
                borderColor: isDark ? '#24242A' : theme.border,
              },
            ]}
            accessibilityLabel="Open Sidebar Menu"
          >
            <Icon name="menu" size={22} color={isDark ? '#FFFFFF' : theme.text} />
          </TouchableOpacity>
        </View>

        {/* ==================================================
            2. SUPPORT SECTION
        ================================================== */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>SUPPORT</Text>

          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: isDark ? '#16161A' : theme.surface,
                borderColor: isDark ? '#232328' : theme.border,
              },
            ]}
          >
            {/* Help & Support */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.75}
              onPress={navigateToHelpSupport}
            >
              <View
                style={[
                  styles.settingIconBox,
                  { backgroundColor: isDark ? '#202025' : '#F3F4F6' },
                ]}
              >
                <Icon name="help-outline" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>

              <View style={styles.settingTextCol}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Help & Support
                </Text>
                <Text style={[styles.settingSubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  Find answers & get in touch
                </Text>
              </View>

              <Icon name="chevron-right" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.cardDivider, { backgroundColor: isDark ? '#232328' : theme.border }]} />

            {/* Send Feedback */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('SendFeedback')}
            >
              <View
                style={[
                  styles.settingIconBox,
                  { backgroundColor: isDark ? '#202025' : '#F3F4F6' },
                ]}
              >
                <Icon name="chat-bubble-outline" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>

              <View style={styles.settingTextCol}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Send Feedback
                </Text>
                <Text style={[styles.settingSubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  Share an idea
                </Text>
              </View>

              <Icon name="chevron-right" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.cardDivider, { backgroundColor: isDark ? '#232328' : theme.border }]} />

            {/* Report a Problem */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('ReportProblem')}
            >
              <View
                style={[
                  styles.settingIconBox,
                  { backgroundColor: isDark ? '#202025' : '#F3F4F6' },
                ]}
              >
                <Icon name="warning-amber" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>

              <View style={styles.settingTextCol}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Report a Problem
                </Text>
                <Text style={[styles.settingSubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  Tell us what went wrong
                </Text>
              </View>

              <Icon name="chevron-right" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================================================
            3. ABOUT SECTION
        ================================================== */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>ABOUT</Text>

          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: isDark ? '#16161A' : theme.surface,
                borderColor: isDark ? '#232328' : theme.border,
              },
            ]}
          >
            {/* About VehiCare */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('About')}
            >
              <View
                style={[
                  styles.settingIconBox,
                  { backgroundColor: isDark ? '#202025' : '#F3F4F6' },
                ]}
              >
                <Icon name="info-outline" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>

              <View style={styles.settingTextCol}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  About VehiCare
                </Text>
              </View>

              <Icon name="chevron-right" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.cardDivider, { backgroundColor: isDark ? '#232328' : theme.border }]} />

            {/* Terms & Conditions */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Terms')}
            >
              <View
                style={[
                  styles.settingIconBox,
                  { backgroundColor: isDark ? '#202025' : '#F3F4F6' },
                ]}
              >
                <Icon name="description" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>

              <View style={styles.settingTextCol}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Terms & Conditions
                </Text>
              </View>

              <Icon name="chevron-right" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.cardDivider, { backgroundColor: isDark ? '#232328' : theme.border }]} />

            {/* Privacy Policy */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Privacy')}
            >
              <View
                style={[
                  styles.settingIconBox,
                  { backgroundColor: isDark ? '#202025' : '#F3F4F6' },
                ]}
              >
                <Icon name="shield" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>

              <View style={styles.settingTextCol}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Privacy Policy
                </Text>
              </View>

              <Icon name="chevron-right" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================================================
            4. BRANDING LOGO & FOOTER
        ================================================== */}
        <View style={styles.brandFooter}>
          <View style={styles.brandIconBox}>
            <Icon name="directions-car" size={22} color={ORANGE} />
          </View>

          <Text style={[styles.brandTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
            VehiCare
          </Text>

          <Text style={[styles.brandTagline, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
            Intelligent Vehicle Care
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
    paddingBottom: 110,
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 26,
    letterSpacing: -0.3,
  },

  /* SECTION WRAP */
  sectionWrap: {
    marginBottom: 22,
  },
  sectionHeading: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  cardGroup: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingTextCol: {
    flex: 1,
    minWidth: 0,
  },
  settingTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
  },
  settingSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    marginLeft: 70,
  },

  /* BRAND FOOTER */
  brandFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  brandIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#2A1A14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
    marginTop: 10,
  },
  brandTagline: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 2,
  },
});

export default SettingsScreen;
