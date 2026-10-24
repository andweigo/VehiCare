import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { acceptCurrentLegalVersions } from '../api/legalApi';
import { LEGAL_VERSIONS } from '../data/legalDocuments';
import { useTheme } from '../theme/ThemeContext';

const LegalConsentUpdateScreen = ({ navigation, onAccepted, currentVersions, versionMismatch = false, onRetry, onLogout, statusError = false }) => {
  const { theme } = useTheme();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!checked || saving || versionMismatch || statusError) return;
    setSaving(true);
    try {
      await acceptCurrentLegalVersions({
        termsVersion: LEGAL_VERSIONS.terms,
        privacyVersion: LEGAL_VERSIONS.privacy,
      });
      onAccepted?.();
    } catch (error) {
      const message = error?.response?.data?.message || 'We could not save your acceptance. Please check your connection and try again.';
      Alert.alert('Could not save acceptance', message);
    } finally {
      setSaving(false);
    }
  };

  const displayedTermsVersion = statusError
    ? 'Unavailable'
    : currentVersions?.terms_version || LEGAL_VERSIONS.terms;
  const displayedPrivacyVersion = statusError
    ? 'Unavailable'
    : currentVersions?.privacy_version || LEGAL_VERSIONS.privacy;

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: theme.accentSoft }]}>
          <Icon name="policy" size={28} color={theme.accent} />
        </View>
        <Text style={[styles.eyebrow, { color: theme.accent }]}>VEHICARE POLICIES</Text>
        <Text style={[styles.title, { color: theme.text }]}>Review the current documents</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          To continue using your account, review the Terms and Conditions and Privacy Policy. VehiCare records each document version and the time you accept it.
        </Text>

        <View style={[styles.versionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: theme.textSecondary }]}>Terms and Conditions</Text>
            <Text style={[styles.versionValue, { color: theme.text }]}>Version {displayedTermsVersion}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.versionRow}>
            <Text style={[styles.versionLabel, { color: theme.textSecondary }]}>Privacy Policy</Text>
            <Text style={[styles.versionValue, { color: theme.text }]}>Version {displayedPrivacyVersion}</Text>
          </View>
        </View>

        {statusError ? (
          <View style={styles.notice}>
            <Text style={[styles.noticeText, { color: theme.textSecondary }]}>We could not check your current acceptance. Reconnect and try again to continue.</Text>
            <TouchableOpacity onPress={onRetry} style={[styles.noticeButton, { borderColor: theme.accent }]}>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : versionMismatch ? (
          <View style={styles.notice}>
            <Text style={[styles.noticeText, { color: theme.textSecondary }]}>The server has newer policy versions than this app can display. Update VehiCare before accepting so you can review the exact documents.</Text>
          </View>
        ) : (
          <>
            <View style={styles.linksRow}>
              <TouchableOpacity style={[styles.linkButton, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => navigation.navigate('Terms')} accessibilityRole="link">
                <Text style={[styles.linkText, { color: theme.accent }]}>Read Terms and Conditions</Text>
                <Icon name="open-in-new" size={16} color={theme.accent} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.linkButton, { borderColor: theme.border, backgroundColor: theme.surface }]} onPress={() => navigation.navigate('Privacy')} accessibilityRole="link">
                <Text style={[styles.linkText, { color: theme.accent }]}>Read Privacy Policy</Text>
                <Icon name="open-in-new" size={16} color={theme.accent} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setChecked(value => !value)}
              activeOpacity={0.8}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel="I have read and agree to the Terms and Conditions and acknowledge the Privacy Policy"
            >
              <View style={[styles.checkbox, { borderColor: checked ? theme.accent : theme.border, backgroundColor: checked ? theme.accent : 'transparent' }]}>
                {checked ? <Icon name="check" size={16} color="#FFFFFF" /> : null}
              </View>
              <Text style={[styles.checkText, { color: theme.textSecondary }]}>I have read and agree to the Terms and Conditions and acknowledge the Privacy Policy.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: checked ? theme.accent : theme.border }]}
              onPress={submit}
              disabled={!checked || saving}
              accessibilityRole="button"
            >
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.continueText}>Accept and continue</Text>}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={[styles.logoutText, { color: theme.textSecondary }]}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 42, flexGrow: 1, justifyContent: 'center' },
  iconBox: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  title: { fontSize: 25, lineHeight: 31, fontWeight: '800', marginTop: 7 },
  body: { fontSize: 14, lineHeight: 21, marginTop: 9 },
  versionCard: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, marginTop: 22 },
  versionRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  versionLabel: { fontSize: 13 },
  versionValue: { fontSize: 13, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth },
  linksRow: { gap: 9, marginTop: 18 },
  linkButton: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { fontSize: 13, fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20, paddingVertical: 4 },
  checkbox: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  checkText: { flex: 1, fontSize: 13, lineHeight: 19 },
  continueButton: { minHeight: 49, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  continueText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  notice: { marginTop: 22, borderRadius: 13, backgroundColor: 'rgba(246,59,5,0.08)', padding: 14 },
  noticeText: { fontSize: 13, lineHeight: 19 },
  noticeButton: { alignSelf: 'flex-start', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, marginTop: 12 },
  logoutButton: { alignSelf: 'center', padding: 14, marginTop: 10 },
  logoutText: { fontSize: 13, fontWeight: '600' },
});

export default LegalConsentUpdateScreen;
