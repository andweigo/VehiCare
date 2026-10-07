
import { useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import AppearanceSettingCard from '../components/AppearanceSettingCard';
import LanguageSelectorModal from '../components/LanguageSelectorModal';
import PasswordSecurityCard from '../components/PasswordSecurityCard';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../theme/ThemeContext';

const ProfileScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { openSidebar } = useSidebar();
  const { user, logout, updateProfile } = useAuth();
  const { language, t } = useLanguage();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);

  const languageLabel =
    language === 'fil'
      ? 'Filipino (Tagalog)'
      : language === 'taglish'
      ? 'Taglish'
      : 'English (US)';

  const isGuest = !user;
  const plan = user?.subscription_plan || null;
  const vehicleLimit = user?.vehicle_limit ?? null;

  const displayName =
    user?.displayName ||
    user?.name ||
    'Guest User';

  const email =
    user?.email ||
    'guest@vehicare.local';

  const initial =
    displayName
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || 'U';

  const isPremium = plan === 'premium';
  const isFree = plan === 'free';

  const handleEdit = () => {
    if (!user) {
      return;
    }

    setEditName(user.displayName || user.name || '');
    setEditPhotoURL(user.photoURL || '');
    setEditModalVisible(true);
  };

  const handlePickPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel) {
        return;
      }

      const firstAsset = result.assets?.[0];
      const uri = firstAsset?.uri || null;

      if (uri) {
        setEditPhotoURL(uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Unable to select photo', 'Please try again later.');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      return;
    }

    const trimmedName = String(editName || '').trim();
    const selectedPhoto = String(editPhotoURL || '').trim();

    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter your display name.');
      return;
    }

    const changes = {
      displayName: trimmedName,
      photoURL: selectedPhoto || null,
    };

    try {
      setSavingEdit(true);
      await updateProfile(changes);
      setEditModalVisible(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert(
        'Unable to Save',
        'Something went wrong while updating your profile. Please try again.',
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateAccount = () => {
    navigation.navigate('Register');
  };

  const handleUpgrade = () => {
    Alert.alert(
      'Upgrade to Premium',
      'The premium subscription flow is not configured yet.',
    );
  };

  const handleManagePlan = () => {
    navigation.navigate('ManagePlan');
  };

  const handleSignOut = async () => {
    try {
      await logout();

      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }],
      });
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const renderSettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    danger = false,
  }) => (
    <TouchableOpacity
      activeOpacity={0.75}
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

        {subtitle && (
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
        )}
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
      <Modal
        transparent
        animationType="fade"
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}> 
            <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Profile</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Update your name and profile picture from your gallery.</Text>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.text }]}>Display Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Your display name"
                placeholderTextColor={theme.textSecondary}
                style={[styles.modalInput, { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border }]}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.text }]}>Profile Photo</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePickPhoto}
                style={[
                  styles.photoPicker,
                  {
                    backgroundColor: theme.surfaceAlt,
                    borderColor: theme.border,
                  },
                ]}
              >
                {editPhotoURL ? (
                  <Image
                    source={{ uri: editPhotoURL }}
                    style={styles.photoPreview}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Icon name="photo-camera" size={22} color={theme.textSecondary} />
                    <Text style={[styles.photoPlaceholderText, { color: theme.textSecondary }]}>Tap to select an image</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setEditModalVisible(false)}
                style={[styles.modalButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSaveProfile}
                style={[styles.modalButton, { backgroundColor: theme.accent }]}
                disabled={savingEdit}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <PasswordSecurityCard
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        navigation={navigation}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ==================================================
            HEADER
        ================================================== */}

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
              size={21}
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
              Profile
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              Manage your VehiCare account
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
              size={21}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>

        {/* ==================================================
            PROFILE HERO
        ================================================== */}

        <View
          style={[
            styles.profileHero,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.profileAccent,
              {
                backgroundColor: theme.accent,
              },
            ]}
          />

          <View style={styles.profileTop}>
            <View style={styles.avatarContainer}>
              {user?.photoURL ? (
                <Image
                  source={{ uri: user.photoURL }}
                  style={styles.avatar}
                />
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    {
                      backgroundColor:
                        theme.accentSoft,
                      borderColor:
                        theme.accentSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.avatarInitial,
                      {
                        color: theme.accent,
                      },
                    ]}
                  >
                    {initial}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.onlineDot,
                  {
                    backgroundColor: theme.accent,
                    borderColor: theme.surface,
                  },
                ]}
              />
            </View>

            <View style={styles.profileDetails}>
              <View style={styles.nameRow}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.profileName,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {displayName}
                </Text>

                {!isGuest && (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={handleEdit}
                    style={[
                      styles.editIconButton,
                      {
                        backgroundColor:
                          theme.surfaceAlt,
                      },
                    ]}
                  >
                    <Icon
                      name="edit"
                      size={15}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <Text
                numberOfLines={1}
                style={[
                  styles.profileEmail,
                  {
                    color: theme.textSecondary,
                  },
                ]}
              >
                {email}
              </Text>

              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.planBadge,
                    {
                      backgroundColor:
                        isPremium
                          ? theme.accentSoft
                          : theme.surfaceAlt,
                    },
                  ]}
                >
                  <Icon
                    name={
                      isPremium
                        ? 'workspace-premium'
                        : 'person'
                    }
                    size={12}
                    color={
                      isPremium
                        ? theme.accent
                        : theme.textSecondary
                    }
                  />

                  <Text
                    style={[
                      styles.planBadgeText,
                      {
                        color: isPremium
                          ? theme.accent
                          : theme.textSecondary,
                      },
                    ]}
                  >
                    {isPremium
                      ? 'Premium'
                      : isFree
                      ? 'Free Plan'
                      : 'Guest'}
                  </Text>
                </View>

                {isGuest && (
                  <Text
                    style={[
                      styles.guestLabel,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    Limited access
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* PROFILE STATS */}

          <View
            style={[
              styles.profileStats,
              {
                borderTopColor: theme.border,
              },
            ]}
          >
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: theme.text,
                  },
                ]}
              >
                {vehicleLimit ?? 1}
              </Text>

              <Text
                style={[
                  styles.statLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Vehicle Limit
              </Text>
            </View>

            <View
              style={[
                styles.statDivider,
                {
                  backgroundColor:
                    theme.border,
                },
              ]}
            />

            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: theme.text,
                  },
                ]}
              >
                {isPremium
                  ? 'Full'
                  : 'Basic'}
              </Text>

              <Text
                style={[
                  styles.statLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Access
              </Text>
            </View>

            <View
              style={[
                styles.statDivider,
                {
                  backgroundColor:
                    theme.border,
                },
              ]}
            />

            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  {
                    color: theme.accent,
                  },
                ]}
              >
                {isGuest
                  ? 'Guest'
                  : 'Active'}
              </Text>

              <Text
                style={[
                  styles.statLabel,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Status
              </Text>
            </View>
          </View>
        </View>

        {/* ==================================================
            SUBSCRIPTION
        ================================================== */}

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeading}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              YOUR PLAN
            </Text>

            <Text
              style={[
                styles.sectionCaption,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              Subscription
            </Text>
          </View>

          <View
            style={[
              styles.subscriptionCard,
              {
                backgroundColor:
                  isPremium
                    ? theme.accentSoft
                    : theme.surface,
                borderColor:
                  isPremium
                    ? theme.accent
                    : theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.subscriptionIcon,
                {
                  backgroundColor:
                    isPremium
                      ? theme.accent
                      : theme.surfaceAlt,
                },
              ]}
            >
              <Icon
                name={
                  isPremium
                    ? 'workspace-premium'
                    : 'card-membership'
                }
                size={24}
                color={
                  isPremium
                    ? '#FFFFFF'
                    : theme.accent
                }
              />
            </View>

            <View style={styles.subscriptionContent}>
              <View style={styles.subscriptionTitleRow}>
                <Text
                  style={[
                    styles.subscriptionTitle,
                    {
                      color: theme.text,
                    },
                  ]}
                >
                  {isPremium
                    ? 'Premium Plan'
                    : isFree
                    ? 'Free Plan'
                    : 'Guest Access'}
                </Text>

                {isPremium && (
                  <View
                    style={[
                      styles.activeBadge,
                      {
                        backgroundColor:
                          theme.accent,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.activeBadgeText
                      }
                    >
                      ACTIVE
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.subscriptionDescription,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                {isGuest
                  ? 'Create an account to save your vehicles and activity.'
                  : isPremium
                  ? 'You have access to the full VehiCare experience.'
                  : 'Upgrade to unlock more VehiCare features.'}
              </Text>

              {vehicleLimit != null && (
                <View style={styles.limitRow}>
                  <Icon
                    name="directions-car"
                    size={14}
                    color={theme.textSecondary}
                  />

                  <Text
                    style={[
                      styles.limitText,
                      {
                        color:
                          theme.textSecondary,
                      },
                    ]}
                  >
                    Up to {vehicleLimit}{' '}
                    {vehicleLimit === 1
                      ? 'vehicle'
                      : 'vehicles'}
                  </Text>
                </View>
              )}

              <View style={styles.subscriptionAction}>
                {isGuest && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={
                      handleCreateAccount
                    }
                    style={[
                      styles.primaryButton,
                      {
                        backgroundColor:
                          theme.accent,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      Create Account
                    </Text>

                    <Icon
                      name="arrow-forward"
                      size={16}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                )}

                {!isGuest && isFree && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleManagePlan}
                    style={[
                      styles.secondaryButton,
                      {
                        borderColor: theme.accent,
                        alignSelf: 'flex-end',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        {
                          color: theme.accent,
                        },
                      ]}
                    >
                      Manage Plan
                    </Text>

                    <Icon
                      name="chevron-right"
                      size={17}
                      color={theme.accent}
                    />
                  </TouchableOpacity>
                )}

                {!isGuest && isPremium && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleManagePlan}
                    style={[
                      styles.secondaryButton,
                      {
                        borderColor:
                          theme.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        {
                          color:
                            theme.accent,
                        },
                      ]}
                    >
                      Manage Plan
                    </Text>

                    <Icon
                      name="chevron-right"
                      size={17}
                      color={theme.accent}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ==================================================
            ACCOUNT
        ================================================== */}

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeading}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              {t('account', 'ACCOUNT')}
            </Text>
          </View>

          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor:
                  theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            {renderSettingItem({
              icon: 'person-outline',
              title: t('personalInformation', 'Personal Information'),
              subtitle: t('personalInfoSubtitle', 'Manage your account details'),
              onPress: () => navigation.navigate('PersonalInformation'),
            })}

            <View
              style={[
                styles.rowDivider,
                {
                  backgroundColor:
                    theme.border,
                },
              ]}
            />

            {renderSettingItem({
              icon: 'lock-outline',
              title: t('passwordSecurity', 'Password & Security'),
              subtitle: t('passwordSecuritySubtitle', 'Protect your VehiCare account'),
              onPress: () => setPasswordModalVisible(true),
            })}
          </View>
        </View>

        {/* ==================================================
            PREFERENCES
        ================================================== */}

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeading}>
            <Text
              style={[
                styles.sectionTitle,
                {
                  color: theme.text,
                },
              ]}
            >
              {t('preferences', 'PREFERENCES')}
            </Text>
          </View>

          <View
            style={[
              styles.settingsCard,
              {
                backgroundColor:
                  theme.surface,
                borderColor: theme.border,
              },
            ]}
          >
            <AppearanceSettingCard />

            <View
              style={[
                styles.rowDivider,
                {
                  backgroundColor:
                    theme.border,
                },
              ]}
            />

            {renderSettingItem({
              icon: 'language',
              title: t('language', 'Language Preference'),
              subtitle: languageLabel,
              onPress: () => setLanguageModalVisible(true),
            })}

            <View
              style={[
                styles.rowDivider,
                {
                  backgroundColor:
                    theme.border,
                },
              ]}
            />

            {renderSettingItem({
              icon: 'notifications-none',
              title: t('notifications', 'Notifications'),
              subtitle: t('notificationSubtitle', 'Manage notification preferences'),
              onPress: () => navigation.navigate('NotificationPreferences'),
            })}
          </View>
        </View>

        {/* ==================================================
            SUPPORT & ABOUT (moved to Settings screen)
        ================================================== */}

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('support', 'SUPPORT & ABOUT')}</Text>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
            {renderSettingItem({
              icon: 'help-outline',
              title: t('helpSupport', 'Support & About'),
              subtitle: t('helpSupportSubtitle', 'Help, support and app information'),
              onPress: () => navigation.navigate('Settings'),
            })}
          </View>
        </View>

        {/* ==================================================
            SIGN OUT
        ================================================== */}

        {!isGuest && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSignOut}
            style={[
              styles.signOutButton,
              {
                backgroundColor:
                  'rgba(239, 68, 68, 0.08)',
                borderColor:
                  'rgba(239, 68, 68, 0.20)',
              },
            ]}
          >
            <Icon
              name="logout"
              size={19}
              color="#EF4444"
            />

            <Text style={styles.signOutText}>
              Sign Out
            </Text>
          </TouchableOpacity>
        )}

        {/* VERSION */}

        <Text
          style={[
            styles.versionText,
            {
              color: theme.textSecondary,
            },
          ]}
        >
          VehiCare • Intelligent Vehicle Care
        </Text>

        <LanguageSelectorModal
          visible={languageModalVisible}
          onClose={() => setLanguageModalVisible(false)}
        />
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
    paddingTop: 10,
    paddingBottom: 100,
  },

  /* ========================================================
     HEADER
  ======================================================== */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
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
    fontSize: 26,
    letterSpacing: -0.5,
  },

  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    marginTop: 2,
  },

  /* ========================================================
     PROFILE HERO
  ======================================================== */

  profileHero: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },

  profileAccent: {
    height: 3,
    width: '100%',
  },

  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 15,
  },

  avatarContainer: {
    position: 'relative',
    marginRight: 13,
  },

  avatar: {
    width: 67,
    height: 67,
    borderRadius: 19,
  },

  avatarPlaceholder: {
    width: 67,
    height: 67,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarInitial: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 25,
  },

  onlineDot: {
    position: 'absolute',
    width: 13,
    height: 13,
    borderRadius: 7,
    right: -1,
    bottom: -1,
    borderWidth: 3,
  },

  profileDetails: {
    flex: 1,
    minWidth: 0,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  profileName: {
    flex: 1,
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    letterSpacing: -0.2,
  },

  editIconButton: {
    width: 29,
    height: 29,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  profileEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    marginTop: 4,
  },

  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },

  planBadge: {
    height: 25,
    paddingHorizontal: 9,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  planBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    marginLeft: 5,
  },

  guestLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginLeft: 8,
  },

  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingVertical: 13,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
  },

  statValue: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
  },

  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 8,
    marginTop: 2,
  },

  statDivider: {
    width: 1,
    height: 25,
  },

  /* ========================================================
     SECTIONS
  ======================================================== */

  sectionBlock: {
    marginTop: 22,
  },

  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 9,
  },

  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 1.5,
  },

  sectionCaption: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginLeft: 7,
  },

  /* ========================================================
     SUBSCRIPTION
  ======================================================== */

  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },

  subscriptionIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  subscriptionContent: {
    flex: 1,
    minWidth: 0,
  },

  subscriptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  subscriptionTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 15,
  },

  activeBadge: {
    marginLeft: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },

  activeBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 6,
    letterSpacing: 0.5,
  },

  subscriptionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
  },

  limitText: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginLeft: 5,
  },

  subscriptionAction: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },

  primaryButton: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    marginHorizontal: 5,
  },

  secondaryButton: {
    minHeight: 35,
    paddingHorizontal: 11,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  secondaryButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
  },

  /* ========================================================
     SETTINGS
  ======================================================== */

  settingsCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 5,
  },

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
  },

  /* ========================================================
     SIGN OUT
  ======================================================== */

  signOutButton: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },

  signOutText: {
    color: '#EF4444',
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    marginLeft: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },

  modalContainer: {
    width: '100%',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },

  modalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    marginBottom: 4,
  },

  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginBottom: 18,
    lineHeight: 16,
  },

  modalField: {
    marginBottom: 14,
  },

  modalLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    marginBottom: 8,
  },

  modalInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },

  photoPicker: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoPreview: {
    width: '100%',
    height: 120,
    borderRadius: 14,
  },

  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  photoPlaceholderText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginTop: 8,
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
  },

  modalButton: {
    minWidth: 110,
    minHeight: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginLeft: 10,
  },

  modalButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },

  versionText: {
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    fontSize: 8,
    marginTop: 18,
  },
});

export default ProfileScreen;
