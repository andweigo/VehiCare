import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import ConfirmSignOutModal from '../components/ConfirmSignOutModal';
import LanguageSelectorModal from '../components/LanguageSelectorModal';
import PasswordSecurityCard from '../components/PasswordSecurityCard';
import SkeletonLoader, { useScreenSkeleton } from '../components/SkeletonLoader';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSidebar } from '../context/SidebarContext';
import { useVehicle } from '../context/VehicleContext';
import { useTheme } from '../theme/ThemeContext';
import {
  PROFILE_PHOTO_PICKER_OPTIONS,
  resolveProfilePhoto,
  toPersistablePhoto,
} from '../utils/profilePhoto';

const ORANGE = '#F5501C';

const ProfileScreen = ({ navigation }) => {
  const { theme, themeName, setThemeName, toggleTheme } = useTheme();
  const isDark = themeName === 'dark';
  const { openSidebar } = useSidebar();
  const { user, logout, updateProfile, refreshUser } = useAuth();
  const { language } = useLanguage();
  const { vehicles } = useVehicle();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [appearanceModalVisible, setAppearanceModalVisible] = useState(false);
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

  const languageLabel =
    language === 'fil'
      ? 'Filipino (Tagalog)'
      : language === 'taglish'
      ? 'Taglish'
      : 'English (US)';

  const refreshUserRef = useRef(refreshUser);
  const userRef = useRef(user);

  useEffect(() => {
    refreshUserRef.current = refreshUser;
    userRef.current = user;
  });

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      if (userRef.current && typeof refreshUserRef.current === 'function') {
        refreshUserRef.current().catch(() => {});
      }
    });
    return unsubscribe;
  }, [navigation]);

  const isGuest = !user;
  const plan = user?.subscription_plan || 'premium';
  const isPremium = plan === 'premium';
  const vehicleLimit = user?.vehicle_limit ?? (isPremium ? 5 : 1);

  const nonArchivedVehicles = (vehicles || []).filter(v => !v.isArchived);
  const activeVehicleCount = nonArchivedVehicles.length > 0 ? nonArchivedVehicles.length : 3;

  const profilePhoto = resolveProfilePhoto(user);
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);

  useEffect(() => {
    setPhotoLoadFailed(false);
  }, [profilePhoto]);

  const showProfilePhoto = Boolean(profilePhoto) && !photoLoadFailed;

  const displayName =
    user?.displayName ||
    user?.name ||
    'Test';

  const email =
    user?.email ||
    'weigo599@gmail.com';

  const initial =
    displayName
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || 'W';

  const handleEdit = () => {
    setEditName(user?.displayName || user?.name || '');
    setEditPhotoURL(resolveProfilePhoto(user) || '');
    setEditModalVisible(true);
  };

  const handlePickPhoto = async () => {
    try {
      const result = await launchImageLibrary(PROFILE_PHOTO_PICKER_OPTIONS);
      if (result.didCancel) return;
      const photo = toPersistablePhoto(result.assets?.[0]);
      if (photo) {
        setEditPhotoURL(photo);
      } else if (result.assets?.length) {
        Alert.alert('Unable to use photo', 'Please choose a different image.');
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Unable to select photo', 'Please try again later.');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      setEditModalVisible(false);
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
      Alert.alert('Unable to Save', error?.message || 'Something went wrong while updating your profile.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleManagePlan = () => {
    navigation.navigate('ManagePlan');
  };

  const handleSignOutConfirm = async () => {
    setSignOutModalVisible(false);
    try {
      await logout();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const toggleAppearance = () => {
    if (typeof toggleTheme === 'function') {
      toggleTheme();
    } else if (typeof setThemeName === 'function') {
      setThemeName(isDark ? 'light' : 'dark');
    }
  };

  const showSkeleton = useScreenSkeleton(false, user?.id);

  if (showSkeleton) {
    return (
      <SafeAreaView
        edges={['top']}
        style={[
          styles.container,
          { backgroundColor: isDark ? '#0A0A0A' : theme.background },
        ]}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0A0A0A' : theme.background} />
        <SkeletonLoader variant="profile" />
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
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0A0A0A' : theme.background} />

      {/* EDIT MODAL */}
      <Modal
        transparent
        animationType="fade"
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setEditModalVisible(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardWrap}
          >
            <View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: isDark ? '#16161A' : '#FFFFFF',
                  borderColor: isDark ? '#232328' : '#E2E8F0',
                },
              ]}
            >
              <View style={styles.modalHeaderRow}>
                <View
                  style={[
                    styles.modalBadgePill,
                    { backgroundColor: 'rgba(245, 80, 28, 0.15)' },
                  ]}
                >
                  <Icon name="edit" size={13} color={ORANGE} />
                  <Text style={[styles.modalBadgeText, { color: ORANGE }]}>
                    EDIT PROFILE
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setEditModalVisible(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                  style={[
                    styles.closeCircleBtn,
                    { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
                  ]}
                >
                  <Icon name="close" size={16} color={isDark ? '#A1A1AA' : '#64748B'} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>Edit Profile</Text>
              <Text style={[styles.modalSubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                Update your name and profile picture from your gallery.
              </Text>

              <View style={[styles.modalDivider, { backgroundColor: isDark ? '#232328' : '#F1F5F9' }]} />

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: isDark ? '#FFFFFF' : theme.text }]}>Display Name</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Your display name"
                  placeholderTextColor={isDark ? '#8E8E93' : theme.textSecondary}
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDark ? '#202025' : theme.surfaceAlt,
                      color: isDark ? '#FFFFFF' : theme.text,
                      borderColor: isDark ? '#2C2C35' : theme.border,
                    },
                  ]}
                />
              </View>

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: isDark ? '#FFFFFF' : theme.text }]}>Profile Photo</Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handlePickPhoto}
                  style={[
                    styles.photoPicker,
                    {
                      backgroundColor: isDark ? '#202025' : theme.surfaceAlt,
                      borderColor: isDark ? '#2C2C35' : theme.border,
                    },
                  ]}
                >
                  {editPhotoURL ? (
                    <Image source={{ uri: editPhotoURL }} style={styles.photoPreview} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Icon name="photo-camera" size={22} color={isDark ? '#8E8E93' : theme.textSecondary} />
                      <Text style={[styles.photoPlaceholderText, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                        Tap to select an image
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setEditModalVisible(false)}
                  style={[
                    styles.modalCancelBtn,
                    {
                      borderColor: isDark ? '#2C2C35' : theme.border,
                      backgroundColor: isDark ? '#1C1C1E' : '#F8FAFC',
                    },
                  ]}
                >
                  <Text style={[styles.modalCancelBtnText, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSaveProfile}
                  style={[styles.modalSaveBtn, { backgroundColor: ORANGE }]}
                  disabled={savingEdit}
                >
                  <Text style={styles.modalSaveBtnText}>{savingEdit ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <PasswordSecurityCard
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        navigation={navigation}
      />

      {/* Language Preference Modal */}
      <LanguageSelectorModal
        visible={languageModalVisible}
        onClose={() => setLanguageModalVisible(false)}
      />

      {/* Appearance Theme Selector Modal */}
      <Modal
        visible={appearanceModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAppearanceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setAppearanceModalVisible(false)}
          />
          <View
            style={[
              styles.themeModalCard,
              {
                backgroundColor: isDark ? '#16161A' : theme.surface,
                borderColor: isDark ? '#232328' : theme.border,
              },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <View
                style={[
                  styles.modalBadgePill,
                  { backgroundColor: 'rgba(245, 80, 28, 0.15)' },
                ]}
              >
                <Icon name="palette" size={13} color={ORANGE} />
                <Text style={[styles.modalBadgeText, { color: ORANGE }]}>
                  APPEARANCE
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setAppearanceModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
                style={[
                  styles.closeCircleBtn,
                  { backgroundColor: isDark ? '#222226' : '#F1F5F9' },
                ]}
              >
                <Icon name="close" size={16} color={isDark ? '#A1A1AA' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
              Theme Preference
            </Text>
            <Text style={[styles.modalSubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
              Choose how VehiCare should look on your device.
            </Text>

            <View style={[styles.modalDivider, { backgroundColor: isDark ? '#232328' : '#F1F5F9' }]} />

            <View style={styles.themeOptionsContainer}>
              {[
                {
                  id: 'dark',
                  label: 'Dark mode',
                  desc: 'High contrast dark appearance',
                  icon: 'dark-mode',
                },
                {
                  id: 'light',
                  label: 'Light mode',
                  desc: 'Clean light appearance',
                  icon: 'light-mode',
                },
              ].map(opt => {
                const isSelected = themeName === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={0.8}
                    onPress={async () => {
                      await setThemeName(opt.id);
                      setAppearanceModalVisible(false);
                    }}
                    style={[
                      styles.themeOptionRow,
                      {
                        backgroundColor: isSelected
                          ? 'rgba(245, 80, 28, 0.12)'
                          : (isDark ? '#202025' : '#F3F4F6'),
                        borderColor: isSelected ? ORANGE : (isDark ? '#2A2A30' : theme.border),
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.themeOptionIconBox,
                        {
                          backgroundColor: isSelected ? ORANGE : (isDark ? '#282830' : '#E5E7EB'),
                        },
                      ]}
                    >
                      <Icon
                        name={opt.icon}
                        size={18}
                        color={isSelected ? '#FFFFFF' : (isDark ? '#8E8E93' : theme.textSecondary)}
                      />
                    </View>

                    <View style={styles.themeOptionTextCol}>
                      <Text
                        style={[
                          styles.themeOptionLabel,
                          {
                            color: isDark ? '#FFFFFF' : theme.text,
                            fontFamily: isSelected ? 'Outfit-Bold' : 'Inter-SemiBold',
                          },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={[
                          styles.themeOptionDesc,
                          { color: isDark ? '#8E8E93' : theme.textSecondary },
                        ]}
                      >
                        {opt.desc}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        { borderColor: isSelected ? ORANGE : (isDark ? '#404048' : '#D1D5DB') },
                      ]}
                    >
                      {isSelected && <View style={styles.radioInnerCircle} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
              <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
              <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                Profile
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
            2. USER HERO CARD
        ================================================== */}
        <View
          style={[
            styles.userHeroCard,
            {
              backgroundColor: isDark ? '#16161A' : theme.surface,
              borderColor: isDark ? '#232328' : theme.border,
            },
          ]}
        >
          {/* Top Row: Avatar + Name + Email + Edit Pencil */}
          <View style={styles.userTopRow}>
            <View style={styles.avatarWrap}>
              {showProfilePhoto ? (
                <Image
                  source={{ uri: profilePhoto }}
                  style={styles.avatarImage}
                  onError={() => setPhotoLoadFailed(true)}
                />
              ) : (
                <View style={styles.avatarPlaceholderBox}>
                  <Text style={styles.avatarInitialText}>{initial}</Text>
                </View>
              )}
            </View>

            <View style={styles.userInfoCol}>
              <Text style={[styles.userNameText, { color: isDark ? '#FFFFFF' : theme.text }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[styles.userEmailText, { color: isDark ? '#8E8E93' : theme.textSecondary }]} numberOfLines={1}>
                {email}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleEdit}
              style={styles.editPencilBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="edit" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View
            style={[
              styles.userDivider,
              { backgroundColor: isDark ? '#232328' : theme.border },
            ]}
          />

          {/* 3-Column Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={[styles.statValueText, { color: isDark ? '#FFFFFF' : theme.text }]}>
                {vehicleLimit}
              </Text>
              <Text style={[styles.statLabelText, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                Vehicle limit
              </Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[styles.statValueText, { color: isDark ? '#FFFFFF' : theme.text }]}>
                Full
              </Text>
              <Text style={[styles.statLabelText, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                Access
              </Text>
            </View>

            <View style={styles.statCol}>
              <Text style={[styles.statValueText, { color: ORANGE }]}>
                Active
              </Text>
              <Text style={[styles.statLabelText, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                Status
              </Text>
            </View>
          </View>
        </View>

        {/* ==================================================
            3. PLAN CARD
        ================================================== */}
        <View
          style={[
            styles.planCard,
            {
              backgroundColor: isDark ? '#16161A' : theme.surface,
              borderColor: isDark ? '#232328' : theme.border,
            },
          ]}
        >
          <View style={styles.planTopRow}>
            <View style={styles.planTitleGroup}>
              <Icon name="verified" size={20} color={ORANGE} />
              <Text style={[styles.planTitleText, { color: isDark ? '#FFFFFF' : theme.text }]}>
                {isPremium ? 'Premium Plan' : 'Free Plan'}
              </Text>
            </View>

            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Active</Text>
            </View>
          </View>

          <View style={styles.planBottomRow}>
            <Text style={[styles.planVehicleCountText, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
              {activeVehicleCount} of {vehicleLimit} vehicles
            </Text>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={handleManagePlan}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.managePlanLink}>Manage Plan ↗</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================================================
            4. ACCOUNT SECTION
        ================================================== */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>ACCOUNT</Text>

          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: isDark ? '#16161A' : theme.surface,
                borderColor: isDark ? '#232328' : theme.border,
              },
            ]}
          >
            {/* Personal Information */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('PersonalInformation')}
            >
              <View
                style={[
                  styles.settingIconBox,
                  { backgroundColor: isDark ? '#202025' : '#F3F4F6' },
                ]}
              >
                <Icon name="person-outline" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>

              <View style={styles.settingTextCol}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Personal Information
                </Text>
                <Text style={[styles.settingSubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  Name, email & profile
                </Text>
              </View>

              <Icon name="chevron-right" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.cardDivider, { backgroundColor: isDark ? '#232328' : theme.border }]} />

            {/* Password & Security */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.75}
              onPress={() => setPasswordModalVisible(true)}
            >
              <View
                style={[
                  styles.settingIconBox,
                  { backgroundColor: isDark ? '#202025' : '#F3F4F6' },
                ]}
              >
                <Icon name="lock-outline" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>

              <View style={styles.settingTextCol}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Password & Security
                </Text>
                <Text style={[styles.settingSubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  Sign-in & account protection
                </Text>
              </View>

              <Icon name="chevron-right" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================================================
            5. PREFERENCES SECTION
        ================================================== */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionHeading}>PREFERENCES</Text>

          <View
            style={[
              styles.cardGroup,
              {
                backgroundColor: isDark ? '#16161A' : theme.surface,
                borderColor: isDark ? '#232328' : theme.border,
              },
            ]}
          >
            {/* Appearance */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.75}
              onPress={() => setAppearanceModalVisible(true)}
            >
              <View
                style={[
                  styles.settingIconBox,
                  { backgroundColor: isDark ? '#202025' : '#F3F4F6' },
                ]}
              >
                <Icon name="palette" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>

              <View style={styles.settingTextCol}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Appearance
                </Text>
                <Text style={[styles.settingSubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  {isDark ? 'Dark theme' : 'Light theme'}
                </Text>
              </View>

              <View style={styles.rightValueRow}>
                <Text style={styles.appearanceValueText}>
                  {isDark ? 'Dark' : 'Light'}
                </Text>
                <Icon name="chevron-right" size={18} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>
            </TouchableOpacity>

            <View style={[styles.cardDivider, { backgroundColor: isDark ? '#232328' : theme.border }]} />

            {/* Language Preference */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.75}
              onPress={() => setLanguageModalVisible(true)}
            >
              <View
                style={[
                  styles.settingIconBox,
                  { backgroundColor: isDark ? '#202025' : '#F3F4F6' },
                ]}
              >
                <Icon name="language" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>

              <View style={styles.settingTextCol}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Language
                </Text>
                <Text style={[styles.settingSubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  App interface & diagnostics
                </Text>
              </View>

              <View style={styles.rightValueRow}>
                <Text style={styles.appearanceValueText}>
                  {languageLabel}
                </Text>
                <Icon name="chevron-right" size={18} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>
            </TouchableOpacity>

            <View style={[styles.cardDivider, { backgroundColor: isDark ? '#232328' : theme.border }]} />

            {/* Notifications */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('NotificationPreferences')}
            >
              <View
                style={[
                  styles.settingIconBox,
                  { backgroundColor: isDark ? '#202025' : '#F3F4F6' },
                ]}
              >
                <Icon name="notifications-none" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>

              <View style={styles.settingTextCol}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Notifications
                </Text>
                <Text style={[styles.settingSubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  Alerts, reminders & quiet hours
                </Text>
              </View>

              <Icon name="chevron-right" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.cardDivider, { backgroundColor: isDark ? '#232328' : theme.border }]} />

            {/* Settings */}
            <TouchableOpacity
              style={styles.settingRow}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Settings')}
            >
              <View
                style={[
                  styles.settingIconBox,
                  { backgroundColor: isDark ? '#202025' : '#F3F4F6' },
                ]}
              >
                <Icon name="tune" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
              </View>

              <View style={styles.settingTextCol}>
                <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : theme.text }]}>
                  Settings
                </Text>
                <Text style={[styles.settingSubtitle, { color: isDark ? '#8E8E93' : theme.textSecondary }]}>
                  Help, support & app information
                </Text>
              </View>

              <Icon name="chevron-right" size={20} color={isDark ? '#8E8E93' : theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ==================================================
            6. SIGN OUT (When authenticated)
        ================================================== */}
        {!isGuest && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSignOutModalVisible(true)}
            style={styles.signOutButton}
          >
            <Icon name="logout" size={18} color="#EF4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        <ConfirmSignOutModal
          visible={signOutModalVisible}
          onConfirm={handleSignOutConfirm}
          onCancel={() => setSignOutModalVisible(false)}
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

  /* USER HERO CARD */
  userHeroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  userTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginRight: 14,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholderBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2A1A14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitialText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 22,
    color: ORANGE,
  },
  userInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  userNameText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 17,
  },
  userEmailText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginTop: 2,
  },
  editPencilBtn: {
    padding: 4,
  },
  userDivider: {
    height: 1,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statValueText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },
  statLabelText: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 3,
  },

  /* PLAN CARD */
  planCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  planTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planTitleText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 16,
  },
  activePill: {
    backgroundColor: ORANGE,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  activePillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    color: '#FFFFFF',
  },
  planBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planVehicleCountText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },
  managePlanLink: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: ORANGE,
  },

  /* SECTION WRAPS & CARDS */
  sectionWrap: {
    marginBottom: 20,
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
  rightValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appearanceValueText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
    color: ORANGE,
  },
  cardDivider: {
    height: 1,
    marginLeft: 70,
  },

  /* SIGN OUT */
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.20)',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 6,
    marginBottom: 20,
  },
  signOutText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    color: '#EF4444',
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  keyboardWrap: {
    width: '100%',
    maxWidth: 420,
  },
  modalContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  modalBadgeText: {
    fontFamily: 'Inter-Bold',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  closeCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    marginBottom: 14,
  },
  modalDivider: {
    height: 1,
    marginBottom: 16,
  },
  modalField: {
    marginBottom: 14,
  },
  modalLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  photoPicker: {
    height: 110,
    borderWidth: 1,
    borderRadius: 14,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoPlaceholderText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  modalSaveBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    fontFamily: 'Outfit-Bold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  /* THEME MODAL */
  themeModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  themeOptionsContainer: {
    gap: 10,
  },
  themeOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  themeOptionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  themeOptionTextCol: {
    flex: 1,
  },
  themeOptionLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  themeOptionDesc: {
    fontFamily: 'Inter-Regular',
    fontSize: 11.5,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ORANGE,
  },
});

export default ProfileScreen;
