import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../theme/ThemeContext';

const renderSettingItem = ({
  icon,
  title,
  subtitle,
  onPress,
  theme,
  danger = false,
}) => (
  <TouchableOpacity
    activeOpacity={0.72}
    onPress={onPress}
    style={[
      styles.settingItem,
      {
        backgroundColor: theme.surface,
      },
    ]}
  >
    <View
      style={[
        styles.settingIcon,
        {
          backgroundColor: danger
            ? 'rgba(239, 68, 68, 0.10)'
            : theme.accentSoft || theme.surfaceAlt,
        },
      ]}
    >
      <Icon
        name={icon}
        size={19}
        color={danger ? '#EF4444' : theme.accent}
      />
    </View>

    <View style={styles.settingContent}>
      <Text
        style={[
          styles.settingTitle,
          {
            color: danger ? '#EF4444' : theme.text,
          },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          numberOfLines={1}
          style={[
            styles.settingSubtitle,
            {
              color: theme.textSecondary,
            },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>

    <View style={styles.chevronContainer}>
      <Icon
        name="chevron-right"
        size={20}
        color={theme.textSecondary}
      />
    </View>
  </TouchableOpacity>
);

const SettingsScreen = ({ navigation }) => {
  const { theme } = useTheme();
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

      if (!parent) {
        break;
      }

      root = parent;
    }

    if (root?.navigate) {
      root.navigate('HelpSupport');
    } else {
      navigation.navigate('HelpSupport');
    }
  };

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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => navigation.goBack()}
            style={[
              styles.backButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <Icon
              name="arrow-back"
              size={20}
              color={theme.text}
            />
          </TouchableOpacity>

          <View style={styles.headerText}>
            <Text
              style={[
                styles.headerTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              Settings
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              Help, support and app information
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={openSidebar}
            style={[
              styles.backButton,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            accessibilityLabel="Open Sidebar Menu"
          >
            <Icon
              name="menu"
              size={20}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>

        {/* SUPPORT */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeading}>

            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              SUPPORT
            </Text>
          </View>

          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {renderSettingItem({
              icon: 'help-outline',
              title: 'Help & Support',
              subtitle: 'Get help with VehiCare',
              onPress: navigateToHelpSupport,
              theme,
            })}

            <View
              style={[
                styles.rowDivider,
                {
                  backgroundColor: theme.border,
                },
              ]}
            />

            {renderSettingItem({
              icon: 'rate-review',
              title: 'Send Feedback',
              subtitle: 'Tell us how we can improve',
              onPress: () =>
                Alert.alert(
                  'Feedback',
                  'Open feedback form'
                ),
              theme,
            })}

            <View
              style={[
                styles.rowDivider,
                {
                  backgroundColor: theme.border,
                },
              ]}
            />

            {renderSettingItem({
              icon: 'report-problem',
              title: 'Report a Problem',
              subtitle: 'Report an issue with the app',
              onPress: () =>
                Alert.alert(
                  'Report a Problem',
                  'Report a problem'
                ),
              theme,
            })}
          </View>
        </View>

        {/* ABOUT */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeading}>
        
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              ABOUT
            </Text>
          </View>

          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {renderSettingItem({
              icon: 'info-outline',
              title: 'About VehiCare',
              subtitle: 'Learn more about VehiCare',
              onPress: () =>
                navigation.navigate('About'),
              theme,
            })}

            <View
              style={[
                styles.rowDivider,
                {
                  backgroundColor: theme.border,
                },
              ]}
            />

            {renderSettingItem({
              icon: 'description',
              title: 'Terms & Conditions',
              subtitle: 'Review our terms',
              onPress: () =>
                navigation.navigate('Terms'),
              theme,
            })}

            <View
              style={[
                styles.rowDivider,
                {
                  backgroundColor: theme.border,
                },
              ]}
            />

            {renderSettingItem({
              icon: 'privacy-tip',
              title: 'Privacy Policy',
              subtitle: 'Learn how your data is handled',
              onPress: () =>
                navigation.navigate('Privacy'),
              theme,
            })}
          </View>
        </View>

        {/* APP INFO */}
        <View style={styles.appInfo}>
          <View
            style={[
              styles.appIcon,
              {
                backgroundColor: theme.accentSoft || theme.surfaceAlt,
              },
            ]}
          >
            <Icon
              name="directions-car"
              size={19}
              color={theme.accent}
            />
          </View>

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
    paddingBottom: 50,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 27,
    letterSpacing: -0.7,
  },

  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 10.5,
    marginTop: 3,
  },

  /* SECTIONS */

  sectionBlock: {
    marginTop: 24,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
    paddingHorizontal: 2,
  },

  sectionIndicator: {
    width: 4,
    height: 12,
    borderRadius: 3,
    marginRight: 7,
  },

  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 1.6,
  },

  /* CARD */

  settingsCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 5,
  },

  /* SETTING */

  settingItem: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },

  settingIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  settingContent: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  settingTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12.5,
  },

  settingSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 9.5,
    marginTop: 4,
  },

  chevronContainer: {
    width: 26,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  rowDivider: {
    height: 1,
    marginHorizontal: 8,
    opacity: 0.8,
  },

  /* APP INFO */

  appInfo: {
    alignItems: 'center',
    marginTop: 42,
    marginBottom: 10,
  },

  appIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  appName: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 13,
  },

  appVersion: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginTop: 3,
  },
});

export default SettingsScreen;