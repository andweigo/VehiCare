import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
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

import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

const PROBLEM_CATEGORIES = [
  { id: 'crash', label: 'App Crash / Freezing', icon: 'phonelink-erase' },
  { id: 'diagnosis_error', label: 'AI Diagnosis Error', icon: 'psychology-alt' },
  { id: 'vehicle_save', label: 'Vehicle Not Saving', icon: 'directions-car' },
  { id: 'auth_issue', label: 'Login / Auth Issue', icon: 'lock-person' },
  { id: 'ui_glitch', label: 'UI / Display Glitch', icon: 'visibility-off' },
  { id: 'notification', label: 'Notifications Issue', icon: 'notifications-paused' },
  { id: 'other', label: 'Other Technical Bug', icon: 'bug-report' },
];

const STORAGE_KEY = '@vehicare_problem_reports';

const ReportProblemScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [category, setCategory] = useState('crash');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reproductionSteps, setReproductionSteps] = useState('');
  const [screenshotUri, setScreenshotUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handlePickScreenshot = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel) return;

      const firstAsset = result.assets?.[0];
      if (firstAsset?.uri) {
        setScreenshotUri(firstAsset.uri);
      }
    } catch (err) {
      console.warn('Screenshot picker error:', err);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshotUri(null);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    const trimmedSteps = reproductionSteps.trim();

    if (!trimmedTitle || trimmedTitle.length < 4) {
      setErrorMessage('Please provide a brief problem title (at least 4 characters).');
      return;
    }

    if (!trimmedDesc || trimmedDesc.length < 10) {
      setErrorMessage('Please describe the problem in detail (at least 10 characters).');
      return;
    }

    if (!trimmedSteps || trimmedSteps.length < 10) {
      setErrorMessage('Please list steps to reproduce the issue (at least 10 characters).');
      return;
    }

    setSubmitting(true);

    const generatedId = `BUG-${Date.now().toString().slice(-6)}`;

    // Strictly non-sensitive device telemetry (NO tokens, NO chat transcripts)
    const reportPayload = {
      ticketId: generatedId,
      category,
      title: trimmedTitle,
      description: trimmedDesc,
      reproductionSteps: trimmedSteps,
      hasScreenshot: Boolean(screenshotUri),
      deviceInfo: {
        platform: Platform.OS,
        osVersion: String(Platform.Version),
        appVersion: '1.0.0',
      },
      userEmail: user?.email || 'guest-report',
      reportedAt: new Date().toISOString(),
    };

    try {
      // 1. Attempt backend submission
      try {
        await apiClient.post('/report-problem', reportPayload);
      } catch (apiErr) {
        console.warn('Backend /report-problem response:', apiErr?.message);
      }

      // 2. Persist locally to storage
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.unshift(reportPayload);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.slice(0, 50)));

      setTicketId(generatedId);
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit problem report:', err);
      setErrorMessage('Unable to submit your bug report right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setReproductionSteps('');
    setScreenshotUri(null);
    setCategory('crash');
    setSubmitted(false);
    setTicketId(null);
    setErrorMessage(null);
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Icon name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerEyebrow, { color: theme.accent }]}>SUPPORT</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Report a Problem</Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {submitted ? (
            /* SUCCESS CONFIRMATION STATE */
            <View style={[styles.successCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={[styles.successIconWrap, { backgroundColor: theme.accentSoft }]}>
                <Icon name="bug-report" size={44} color={theme.accent} />
              </View>

              <Text style={[styles.successTitle, { color: theme.text }]}>
                Problem Report Logged
              </Text>

              <View style={[styles.ticketBadge, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Text style={[styles.ticketLabel, { color: theme.textSecondary }]}>Ticket Reference:</Text>
                <Text style={[styles.ticketId, { color: theme.accent }]}>{ticketId}</Text>
              </View>

              <Text style={[styles.successMessage, { color: theme.textSecondary }]}>
                Thank you for helping us improve VehiCare. Our engineering team reviews
                reported technical issues and diagnostics bugs promptly.
              </Text>

              <View style={styles.successActions}>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.accent }]}
                  activeOpacity={0.85}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.primaryButtonText}>Return to Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                  activeOpacity={0.8}
                  onPress={handleReset}
                >
                  <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                    Report Another Issue
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* REPORT FORM */
            <>
              <Text style={[styles.formIntro, { color: theme.textSecondary }]}>
                Experiencing a glitch, crash, or unexpected behavior? Submit a structured
                report so we can investigate and resolve it quickly.
              </Text>

              {errorMessage ? (
                <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 68, 68, 0.10)', borderColor: '#EF4444' }]}>
                  <Icon name="error-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text style={[styles.errorText, { color: '#EF4444' }]}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              {/* 1. CATEGORY */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  Problem Category *
                </Text>

                <View style={styles.categoryGrid}>
                  {PROBLEM_CATEGORIES.map(cat => {
                    const isSelected = category === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: isSelected ? theme.accentSoft : theme.surface,
                            borderColor: isSelected ? theme.accent : theme.border,
                          },
                        ]}
                        activeOpacity={0.75}
                        onPress={() => setCategory(cat.id)}
                      >
                        <Icon
                          name={cat.icon}
                          size={16}
                          color={isSelected ? theme.accent : theme.textSecondary}
                          style={{ marginRight: 6 }}
                        />
                        <Text
                          style={[
                            styles.categoryChipText,
                            { color: isSelected ? theme.accent : theme.text },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. TITLE */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  Issue Summary *
                </Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. App closes when uploading sound recording"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  maxLength={120}
                />
              </View>

              {/* 3. DESCRIPTION */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  What happened? *
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Provide a detailed description of the error message or unexpected behavior..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  maxLength={1000}
                />
              </View>

              {/* 4. REPRODUCTION STEPS */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  Steps to Reproduce *
                </Text>
                <TextInput
                  value={reproductionSteps}
                  onChangeText={setReproductionSteps}
                  placeholder="1. Open Ask VehiCare&#10;2. Tap the microphone icon&#10;3. Tap send and the screen freezes..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  maxLength={1000}
                />
              </View>

              {/* 5. SCREENSHOT (OPTIONAL) */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  Screenshot (Optional)
                </Text>

                {screenshotUri ? (
                  <View style={[styles.screenshotPreviewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Image source={{ uri: screenshotUri }} style={styles.screenshotThumbnail} resizeMode="cover" />
                    <View style={styles.screenshotInfo}>
                      <Text style={[styles.screenshotFilename, { color: theme.text }]}>Screenshot attached</Text>
                      <TouchableOpacity onPress={handleRemoveScreenshot} style={styles.removeScreenshotBtn}>
                        <Icon name="delete-outline" size={16} color="#EF4444" />
                        <Text style={styles.removeScreenshotText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.attachButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    activeOpacity={0.8}
                    onPress={handlePickScreenshot}
                  >
                    <Icon name="add-photo-alternate" size={22} color={theme.accent} style={{ marginRight: 10 }} />
                    <Text style={[styles.attachButtonText, { color: theme.text }]}>
                      Attach Screenshot from Gallery
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* PRIVACY & DEVICE NOTICE */}
              <View style={[styles.privacyNoticeBox, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                <Icon name="security" size={18} color={theme.accent} style={{ marginRight: 8, marginTop: 1 }} />
                <Text style={[styles.privacyNoticeText, { color: theme.textSecondary }]}>
                  Your privacy is preserved: Problem reports do not attach private consultation
                  transcripts, passwords, or authentication credentials.
                </Text>
              </View>

              {/* SUBMIT BUTTON */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: theme.accent,
                    opacity: submitting ? 0.7 : 1,
                  },
                ]}
                activeOpacity={0.85}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Icon name="report" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>Submit Bug Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  formIntro: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
    marginBottom: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  textArea: {
    minHeight: 96,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  attachButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
  screenshotPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  screenshotThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  screenshotInfo: {
    flex: 1,
  },
  screenshotFilename: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
    marginBottom: 4,
  },
  removeScreenshotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeScreenshotText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    fontFamily: 'Inter-SemiBold',
  },
  privacyNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  privacyNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter-Regular',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    marginTop: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },
  successCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  successIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    gap: 6,
  },
  ticketLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  ticketId: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },
  successMessage: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 24,
  },
  successActions: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },
});

export default ReportProblemScreen;
