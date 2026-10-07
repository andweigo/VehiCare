
import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CustomToast from '../components/CustomToast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

const PersonalInformationScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user, updateProfile } = useAuth();

  const initialName = user?.displayName || user?.name || '';
  const initialEmail = user?.email || '';
  const initialPhone = user?.phoneNumber || '';
  const initialSubscription = user?.subscription_plan || 'free';
  const createdAt = user?.created_at || user?.createdAt;

  const [fullName, setFullName] = useState(initialName);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const accountTypeLabel = useMemo(() => {
    return initialSubscription === 'premium'
      ? 'Premium'
      : 'Free';
  }, [initialSubscription]);

  const memberSinceLabel = useMemo(() => {
    if (!createdAt) {
      return 'Not available';
    }

    try {
      const date = new Date(createdAt);

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    } catch {
      return 'Not available';
    }
  }, [createdAt]);

  const hasChanges = useMemo(() => {
    return (
      fullName.trim() !== initialName.trim() ||
      phoneNumber.trim() !== initialPhone.trim() ||
      (photoURL || '').trim() !==
        (user?.photoURL || '').trim()
    );
  }, [
    fullName,
    phoneNumber,
    photoURL,
    initialName,
    initialPhone,
    user?.photoURL,
  ]);

  const profileInitial = useMemo(() => {
    const name =
      fullName.trim() || initialName.trim();

    return name.charAt(0).toUpperCase() || 'U';
  }, [fullName, initialName]);

  const showToast = message => {
    setToastMessage(message);
    setToastVisible(true);
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
      const uri = firstAsset?.uri;

      if (uri) {
        setPhotoURL(uri);
      }
    } catch (error) {
      console.error('Photo picker error:', error);
      showToast(
        'Unable to update photo. Please try again later.',
      );
    }
  };

  const handleSave = async () => {
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      showToast('Name is required before saving.');
      return;
    }

    if (!hasChanges) {
      showToast('No changes to save.');
      return;
    }

    setSaving(true);

    try {
      if (typeof updateProfile === 'function') {
        await updateProfile({
          displayName: trimmedName,
          photoURL: photoURL || null,
          phoneNumber:
            phoneNumber.trim() || null,
        });
      }

      showToast(
        'Your personal information has been updated.',
      );
    } catch (error) {
      console.error(
        'Save profile failed:',
        error,
      );

      showToast(
        'Unable to save your information right now. Please try again.',
      );
    } finally {
      setSaving(false);
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
              size={21}
              color={theme.text}
            />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text
              style={[
                styles.eyebrow,
                { color: theme.accent },
              ]}
            >
              ACCOUNT
            </Text>

            <Text
              style={[
                styles.headerTitle,
                { color: theme.text },
              ]}
            >
              Personal Information
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.textSecondary },
              ]}
            >
              Manage your personal details
            </Text>
          </View>
        </View>

        {/* PROFILE */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.profileTop}>
            <View style={styles.avatarWrapper}>
              {photoURL ? (
                <Image
                  source={{ uri: photoURL }}
                  style={[
                    styles.avatar,
                    {
                      borderColor: theme.border,
                    },
                  ]}
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
                      { color: theme.accent },
                    ]}
                  >
                    {profileInitial}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickPhoto}
                style={[
                  styles.cameraButton,
                  {
                    backgroundColor: theme.accent,
                    borderColor: theme.surface,
                  },
                ]}
              >
                <Icon
                  name="photo-camera"
                  size={15}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.profileIdentity}>
              <Text
                style={[
                  styles.profileName,
                  { color: theme.text },
                ]}
                numberOfLines={1}
              >
                {fullName || 'Your Name'}
              </Text>

              <Text
                style={[
                  styles.profileEmail,
                  {
                    color: theme.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {initialEmail || 'No email available'}
              </Text>

              <View style={styles.profileMeta}>
                <View
                  style={[
                    styles.planPill,
                    {
                      backgroundColor:
                        initialSubscription ===
                        'premium'
                          ? theme.accentSoft
                          : theme.surfaceAlt,
                    },
                  ]}
                >
                  <Icon
                    name={
                      initialSubscription ===
                      'premium'
                        ? 'workspace-premium'
                        : 'person-outline'
                    }
                    size={13}
                    color={
                      initialSubscription ===
                      'premium'
                        ? theme.accent
                        : theme.textSecondary
                    }
                  />

                  <Text
                    style={[
                      styles.planPillText,
                      {
                        color:
                          initialSubscription ===
                          'premium'
                            ? theme.accent
                            : theme.textSecondary,
                      },
                    ]}
                  >
                    {accountTypeLabel} Plan
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePickPhoto}
            style={[
              styles.photoAction,
              {
                borderColor: theme.border,
                backgroundColor: theme.surfaceAlt,
              },
            ]}
          >
            <Icon
              name="photo-camera"
              size={17}
              color={theme.accent}
            />

            <Text
              style={[
                styles.photoActionText,
                { color: theme.text },
              ]}
            >
              Change Profile Photo
            </Text>

            <Icon
              name="chevron-right"
              size={19}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* PERSONAL INFORMATION */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor:
                    theme.accentSoft,
                },
              ]}
            >
              <Icon
                name="person-outline"
                size={17}
                color={theme.accent}
              />
            </View>

            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.text },
                ]}
              >
                Personal Details
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color: theme.textSecondary,
                  },
                ]}
              >
                Keep your information up to date
              </Text>
            </View>
          </View>

          {/* FULL NAME */}
          <View style={styles.fieldGroup}>
            <Text
              style={[
                styles.fieldLabel,
                { color: theme.text },
              ]}
            >
              FULL NAME
            </Text>

            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor:
                    theme.surfaceAlt,
                  borderColor: theme.border,
                },
              ]}
            >
              <Icon
                name="person-outline"
                size={19}
                color={theme.textSecondary}
              />

              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Your name"
                placeholderTextColor={
                  theme.textSecondary
                }
                style={[
                  styles.textInput,
                  { color: theme.text },
                ]}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* EMAIL */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: theme.text },
                ]}
              >
                EMAIL ADDRESS
              </Text>

              <View style={styles.lockLabel}>
                <Icon
                  name="lock-outline"
                  size={13}
                  color={theme.textSecondary}
                />

                <Text
                  style={[
                    styles.lockText,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  READ ONLY
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor:
                    theme.surfaceAlt,
                  borderColor: theme.border,
                },
              ]}
            >
              <Icon
                name="email"
                size={18}
                color={theme.textSecondary}
              />

              <Text
                style={[
                  styles.readOnlyText,
                  { color: theme.text },
                ]}
                numberOfLines={1}
              >
                {initialEmail || 'Not available'}
              </Text>

              <Icon
                name="lock-outline"
                size={17}
                color={theme.textSecondary}
              />
            </View>

            <Text
              style={[
                styles.helperText,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              Your email is managed through
              account security settings.
            </Text>
          </View>

          {/* PHONE */}
          <View
            style={[
              styles.fieldGroup,
              { marginBottom: 0 },
            ]}
          >
            <Text
              style={[
                styles.fieldLabel,
                { color: theme.text },
              ]}
            >
              PHONE NUMBER
            </Text>

            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor:
                    theme.surfaceAlt,
                  borderColor: theme.border,
                },
              ]}
            >
              <Icon
                name="phone"
                size={18}
                color={theme.textSecondary}
              />

              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Add your phone number"
                placeholderTextColor={
                  theme.textSecondary
                }
                keyboardType="phone-pad"
                style={[
                  styles.textInput,
                  { color: theme.text },
                ]}
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* ACCOUNT INFORMATION */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIcon,
                {
                  backgroundColor:
                    theme.accentSoft,
                },
              ]}
            >
              <Icon
                name="verified-user"
                size={17}
                color={theme.accent}
              />
            </View>

            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.text },
                ]}
              >
                Account Information
              </Text>

              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color: theme.textSecondary,
                  },
                ]}
              >
                Overview of your VehiCare account
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View
                style={[
                  styles.infoIcon,
                  {
                    backgroundColor:
                      theme.surfaceAlt,
                  },
                ]}
              >
                <Icon
                  name={
                    initialSubscription ===
                    'premium'
                      ? 'workspace-premium'
                      : 'card-membership'
                  }
                  size={17}
                  color={
                    initialSubscription ===
                    'premium'
                      ? theme.accent
                      : theme.textSecondary
                  }
                />
              </View>

              <View>
                <Text
                  style={[
                    styles.infoLabel,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Account Type
                </Text>

                <Text
                  style={[
                    styles.infoSubtext,
                    { color: theme.text },
                  ]}
                >
                  Your current subscription
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.accountBadge,
                {
                  backgroundColor:
                    initialSubscription ===
                    'premium'
                      ? theme.accentSoft
                      : theme.surfaceAlt,
                },
              ]}
            >
              <Text
                style={[
                  styles.accountBadgeText,
                  {
                    color:
                      initialSubscription ===
                      'premium'
                        ? theme.accent
                        : theme.textSecondary,
                  },
                ]}
              >
                {accountTypeLabel}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.rowDivider,
              {
                backgroundColor: theme.border,
              },
            ]}
          />

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <View
                style={[
                  styles.infoIcon,
                  {
                    backgroundColor:
                      theme.surfaceAlt,
                  },
                ]}
              >
                <Icon
                  name="calendar-today"
                  size={16}
                  color={theme.textSecondary}
                />
              </View>

              <View>
                <Text
                  style={[
                    styles.infoLabel,
                    {
                      color:
                        theme.textSecondary,
                    },
                  ]}
                >
                  Member Since
                </Text>

                <Text
                  style={[
                    styles.infoSubtext,
                    { color: theme.text },
                  ]}
                >
                  Account creation date
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.infoValue,
                { color: theme.text },
              ]}
            >
              {memberSinceLabel}
            </Text>
          </View>
        </View>

        {/* PRIVACY NOTE */}
        <View
          style={[
            styles.privacyNote,
            {
              backgroundColor:
                theme.surfaceAlt,
              borderColor: theme.border,
            },
          ]}
        >
          <Icon
            name="shield"
            size={18}
            color={theme.accent}
          />

          <View style={styles.privacyContent}>
            <Text
              style={[
                styles.privacyTitle,
                { color: theme.text },
              ]}
            >
              Your information is protected
            </Text>

            <Text
              style={[
                styles.privacyText,
                {
                  color: theme.textSecondary,
                },
              ]}
            >
              Your personal information is only
              used to provide and personalize
              your VehiCare experience.
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* SAVE FOOTER */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving || !hasChanges}
          style={[
            styles.saveButton,
            {
              backgroundColor:
                saving || !hasChanges
                  ? theme.surfaceAlt
                  : theme.accent,
              borderColor:
                saving || !hasChanges
                  ? theme.border
                  : theme.accent,
            },
          ]}
        >
          {saving ? (
            <>
              <ActivityIndicator
                size="small"
                color={theme.textSecondary}
              />

              <Text
                style={[
                  styles.saveButtonText,
                  {
                    color:
                      theme.textSecondary,
                  },
                ]}
              >
                Saving Changes...
              </Text>
            </>
          ) : (
            <>
              <Icon
                name="check"
                size={19}
                color={
                  hasChanges
                    ? '#FFFFFF'
                    : theme.textSecondary
                }
              />

              <Text
                style={[
                  styles.saveButtonText,
                  {
                    color: hasChanges
                      ? '#FFFFFF'
                      : theme.textSecondary,
                  },
                ]}
              >
                Save Changes
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <CustomToast
        visible={toastVisible}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 24,
  },

  /* HEADER */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  headerContent: {
    flex: 1,
  },

  eyebrow: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 8,
    letterSpacing: 1.8,
    marginBottom: 3,
  },

  headerTitle: {
    fontFamily: 'Outfit-ExtraBold',
    fontSize: 22,
    letterSpacing: -0.4,
  },

  headerSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 3,
  },

  /* PROFILE */

  profileCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
  },

  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrapper: {
    position: 'relative',
    marginRight: 15,
  },

  avatar: {
    width: 82,
    height: 82,
    borderRadius: 24,
    borderWidth: 1,
  },

  avatarPlaceholder: {
    width: 82,
    height: 82,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarInitial: {
    fontFamily: 'Outfit-Bold',
    fontSize: 31,
  },

  cameraButton: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 29,
    height: 29,
    borderRadius: 10,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileIdentity: {
    flex: 1,
    minWidth: 0,
  },

  profileName: {
    fontFamily: 'Outfit-Bold',
    fontSize: 18,
  },

  profileEmail: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    marginTop: 4,
  },

  profileMeta: {
    flexDirection: 'row',
    marginTop: 9,
  },

  planPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  planPillText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    marginLeft: 5,
  },

  photoAction: {
    height: 43,
    borderRadius: 13,
    borderWidth: 1,
    marginTop: 17,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  photoActionText: {
    flex: 1,
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    marginLeft: 9,
  },

  /* SECTION */

  sectionCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 19,
  },

  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  sectionTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 15,
  },

  sectionSubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginTop: 2,
  },

  /* FIELDS */

  fieldGroup: {
    marginBottom: 18,
  },

  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  fieldLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  lockLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  lockText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 7,
    letterSpacing: 0.5,
    marginLeft: 4,
  },

  inputWrapper: {
    minHeight: 49,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  textInput: {
    flex: 1,
    minHeight: 47,
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
  },

  readOnlyText: {
    flex: 1,
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    marginLeft: 10,
  },

  helperText: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginTop: 7,
    lineHeight: 14,
  },

  /* ACCOUNT INFO */

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 55,
  },

  infoLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  infoLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
  },

  infoSubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    marginTop: 2,
  },

  infoValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 10,
    maxWidth: 120,
    textAlign: 'right',
  },

  accountBadge: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },

  accountBadgeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 9,
  },

  rowDivider: {
    height: 1,
    width: '100%',
    marginVertical: 5,
  },

  /* PRIVACY */

  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    marginBottom: 4,
  },

  privacyContent: {
    flex: 1,
    marginLeft: 10,
  },

  privacyTitle: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 12,
  },

  privacyText: {
    fontFamily: 'Inter-Regular',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },

  bottomSpace: {
    height: 80,
  },

  /* FOOTER */

  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
  },

  saveButton: {
    width: '100%',
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveButtonText: {
    fontFamily: 'Outfit-SemiBold',
    fontSize: 14,
    marginLeft: 7,
  },
});

export default PersonalInformationScreen;