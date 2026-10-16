import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';

const FEEDBACK_CATEGORIES = [
  { id: 'general', label: 'General Feedback', icon: 'chat' },
  { id: 'feature', label: 'Feature Request', icon: 'auto-awesome' },
  { id: 'accuracy', label: 'AI Accuracy', icon: 'psychology' },
  { id: 'usability', label: 'App Usability', icon: 'touch-app' },
  { id: 'performance', label: 'Performance', icon: 'speed' },
  { id: 'other', label: 'Other', icon: 'more-horiz' },
];

const STORAGE_KEY = '@vehicare_feedback_submissions';

const SendFeedbackScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [category, setCategory] = useState('general');
  const [rating, setRating] = useState(5);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async () => {
    setErrorMessage(null);

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject || trimmedSubject.length < 3) {
      setErrorMessage('Please enter a subject (at least 3 characters).');
      return;
    }

    if (!trimmedMessage || trimmedMessage.length < 10) {
      setErrorMessage('Please enter your feedback message (at least 10 characters).');
      return;
    }

    setSubmitting(true);

    const feedbackPayload = {
      id: `fb_${Date.now()}`,
      category,
      rating,
      subject: trimmedSubject,
      message: trimmedMessage,
      email: email.trim() || user?.email || 'anonymous',
      userId: user?.id || null,
      submittedAt: new Date().toISOString(),
    };

    try {
      // 1. Attempt to sync with backend endpoint
      try {
        await apiClient.post('/feedback', feedbackPayload);
      } catch {
        // Keep an offline copy when the backend cannot be reached.
      }

      // 2. Persist to local AsyncStorage for durability
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.unshift(feedbackPayload);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.slice(0, 50)));

      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setErrorMessage('Unable to submit feedback right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubject('');
    setMessage('');
    setCategory('general');
    setRating(5);
    setSubmitted(false);
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
          <Text style={[styles.headerTitle, { color: theme.text }]}>Send Feedback</Text>
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
              <View style={[styles.successIconWrap, { backgroundColor: 'rgba(50, 213, 131, 0.12)' }]}>
                <Icon name="check-circle" size={48} color="#32D583" />
              </View>

              <Text style={[styles.successTitle, { color: theme.text }]}>
                Thank You for Your Feedback!
              </Text>

              <Text style={[styles.successMessage, { color: theme.textSecondary }]}>
                Your insights help us continuously refine VehiCare's AI diagnostics,
                maintenance tracking, and user experience.
              </Text>

              <View style={styles.successActions}>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: theme.accent }]}
                  activeOpacity={0.85}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: theme.border, backgroundColor: theme.surfaceAlt }]}
                  activeOpacity={0.8}
                  onPress={handleReset}
                >
                  <Text style={[styles.secondaryButtonText, { color: theme.text }]}>
                    Send Another Response
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* FEEDBACK FORM */
            <>
              <Text style={[styles.formIntro, { color: theme.textSecondary }]}>
                Have a suggestion or thought on how we can improve VehiCare? We'd love to hear from you.
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
                  Feedback Category
                </Text>

                <View style={styles.categoryGrid}>
                  {FEEDBACK_CATEGORIES.map(cat => {
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

              {/* 2. RATING */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  How would you rate your experience?
                </Text>

                <View style={styles.ratingRow}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <TouchableOpacity
                      key={star}
                      activeOpacity={0.7}
                      onPress={() => setRating(star)}
                      style={styles.starTouch}
                    >
                      <Icon
                        name={star <= rating ? 'star' : 'star-border'}
                        size={32}
                        color={star <= rating ? '#F59E0B' : theme.textSecondary}
                      />
                    </TouchableOpacity>
                  ))}
                  <Text style={[styles.ratingLabel, { color: theme.textSecondary }]}>
                    {rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Needs Work' : 'Poor'}
                  </Text>
                </View>
              </View>

              {/* 3. SUBJECT */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  Subject *
                </Text>
                <TextInput
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="e.g. Diagnostic accuracy for motorcycles"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  maxLength={100}
                />
              </View>

              {/* 4. MESSAGE */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.fieldLabel, { color: theme.text }]}>
                    Your Message *
                  </Text>
                  <Text style={[styles.charCount, { color: theme.textSecondary }]}>
                    {message.length} / 1000
                  </Text>
                </View>
                <TextInput
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Tell us what you liked or how we can make VehiCare better for your vehicles..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={5}
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

              {/* 5. EMAIL (OPTIONAL / CONTACT) */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: theme.text }]}>
                  Contact Email (Optional)
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@example.com"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                />
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
                    <Icon name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>Submit Feedback</Text>
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
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
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  starTouch: {
    padding: 2,
  },
  ratingLabel: {
    marginLeft: 10,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
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
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    marginTop: 10,
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
    marginBottom: 8,
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

export default SendFeedbackScreen;
