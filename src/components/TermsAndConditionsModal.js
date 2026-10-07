
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

const TermsAndConditionsModal = ({
  visible,
  onClose,
  onAgree,
  showAgreeButton = true,
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}
          edges={['top', 'bottom']}
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <View style={[styles.header, { borderBottomColor: theme.border }]}> 
            <View style={styles.headerLeft}>
              <View style={[styles.iconWrapper, { backgroundColor: theme.accentSoft }]}> 
                <Icon
                  name="description"
                  size={22}
                  color={theme.accent}
                />
              </View>

              <View>
                <Text style={[styles.headerTitle, { color: theme.text }]}> 
                  Terms & Conditions
                </Text>

                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}> 
                  VehiCare
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.closeButton]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Icon
                name="close"
                size={24}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.lastUpdated, { color: theme.textSecondary }]}> 
              Last Updated: August 2026
            </Text>

            <Text style={[styles.intro, { color: theme.textSecondary }]}> 
              Welcome to VehiCare. By creating an account or using the
              VehiCare application, you agree to these Terms and Conditions.
              Please read them carefully before using our services.
            </Text>

            {/* 1. Acceptance */}
            <Section title="1. Acceptance of Terms">
              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                By accessing or using VehiCare, you acknowledge that you have
                read, understood, and agree to be bound by these Terms and
                Conditions.
              </Text>

              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                If you do not agree with these terms, please do not create an
                account or use features that require acceptance of these terms.
              </Text>
            </Section>

            {/* 2. About VehiCare */}
            <Section title="2. About VehiCare">
              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                VehiCare is an intelligent multi-vehicle diagnostics and repair
                assistance application designed to help vehicle owners
                understand possible vehicle problems and maintenance needs.
              </Text>

              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                VehiCare may provide:
              </Text>

              <Bullet text="Vehicle profile management" />
              <Bullet text="Vehicle maintenance reminders" />
              <Bullet text="AI-assisted vehicle diagnosis" />
              <Bullet text="Troubleshooting suggestions" />
              <Bullet text="Possible causes of reported vehicle problems" />
              <Bullet text="General repair and maintenance information" />
              <Bullet text="Estimated repair cost information" />
              <Bullet text="Recommendations for professional assistance when appropriate" />

              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                VehiCare is intended as an assistance and information tool and
                is not a replacement for a qualified mechanic, automotive
                technician, electrician, or other professional.
              </Text>
            </Section>

            {/* 3. User Account */}
            <Section title="3. User Account">
              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                Some VehiCare features require you to create an account.
              </Text>

              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                When creating an account, you agree to:
              </Text>

              <Bullet text="Provide accurate information." />
              <Bullet text="Use your own account credentials." />
              <Bullet text="Keep your account information secure." />
              <Bullet text="Not impersonate another person." />
              <Bullet text="Not attempt to access another user's account." />
              <Bullet text="Notify the appropriate VehiCare support channel if you believe your account has been compromised." />

              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                Each email address may only be associated with one VehiCare
                account.
              </Text>
            </Section>

            {/* 4. Guest Access */}
            <Section title="4. Guest Access">
              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                VehiCare may allow users to access certain features without
                creating an account.
              </Text>

              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                Guest users may have limited access to certain features,
                including AI diagnosis or chat functionality.
              </Text>

              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                Guest usage may be subject to limitations such as:
              </Text>

              <Bullet text="A limited number of diagnosis requests or conversations." />
              <Bullet text="Limited vehicle profile storage." />
              <Bullet text="Limited access to certain features." />

              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                If a guest user creates an account, their locally stored
                vehicle information may be transferred to their newly
                authenticated account when applicable.
              </Text>
            </Section>

            {/* 5. Vehicle Information */}
            <Section title="5. Vehicle Information">
              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                Users may create and manage vehicle profiles within VehiCare.
              </Text>

              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                Vehicle information may include:
              </Text>

              <Bullet text="Vehicle type" />
              <Bullet text="Brand" />
              <Bullet text="Model" />
              <Bullet text="Year" />
              <Bullet text="Model number" />
              <Bullet text="Custom vehicle information" />
              <Bullet text="Vehicle nickname" />

              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                You are responsible for ensuring that the information you
                provide is reasonably accurate.
              </Text>
            </Section>

            {/* 6. AI Diagnosis */}
            <Section title="6. AI Diagnosis and Recommendations">
              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                VehiCare may use artificial intelligence to analyze information
                provided by users and generate possible explanations,
                troubleshooting suggestions, maintenance recommendations, or
                other assistance.
              </Text>

              <Text style={styles.warningText}>
                AI-generated information may be incomplete, inaccurate, or
                unsuitable for a particular vehicle or situation.
              </Text>

              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                VehiCare does not guarantee that an AI-generated diagnosis will
                correctly identify a vehicle problem.
              </Text>

              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                Users should not rely solely on VehiCare when dealing with:
              </Text>

              <Bullet text="Brake failures" />
              <Bullet text="Steering problems" />
              <Bullet text="Electrical hazards" />
              <Bullet text="Fuel system problems" />
              <Bullet text="Serious mechanical damage" />
              <Bullet text="Any situation that may cause injury or property damage" />

              <Text style={[styles.paragraph, { color: theme.textSecondary }]}> 
                When a problem appears serious or beyond the scope of general
                troubleshooting, users should seek assistance from a qualified
                professional.
              </Text>
            </Section>

            {/* Agreement Notice */}
            <View style={styles.bottomNotice}>
              <Icon
                name="verified-user"
                size={22}
                color="#F63B05"
              />

              <Text style={[styles.bottomNoticeText, { color: theme.textSecondary }]}> 
                By selecting "I Agree" and creating an account, you confirm
                that you accept these Terms and Conditions.
              </Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}> 
            {showAgreeButton && (
              <TouchableOpacity
                style={[styles.agreeButton, { backgroundColor: theme.accent }]}
                onPress={onAgree}
                activeOpacity={0.8}
              >
                <Text style={styles.agreeText}>
                  I Agree
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.closeFooterButton,
                !showAgreeButton && styles.closeFooterButtonFull,
                { borderColor: theme.border, backgroundColor: theme.surface },
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.closeText, { color: theme.text }]}> 
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

/* -------------------------------------------------
   Reusable Section Component
-------------------------------------------------- */

const Section = ({ title, children }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        {title}
      </Text>

      {children}
    </View>
  );
};

/* -------------------------------------------------
   Reusable Bullet Component
-------------------------------------------------- */

const Bullet = ({ text }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bullet, { backgroundColor: theme.accent }]} />

      <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
        {text}
      </Text>
    </View>
  );
};

/* -------------------------------------------------
   Styles
-------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },

  /* ---------------- Header ---------------- */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },

  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },

  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ---------------- Scroll Content ---------------- */

  scrollView: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 30,
  },

  lastUpdated: {
    fontSize: 12,
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },

  intro: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
    fontFamily: 'Inter-Regular',
  },

  /* ---------------- Sections ---------------- */

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    fontFamily: 'Outfit-Bold',
  },

  paragraph: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 10,
    fontFamily: 'Inter-Regular',
  },

  warningText: {
    color: '#F63B05',
    fontSize: 14,
    lineHeight: 21,
    backgroundColor: 'rgba(246, 59, 5, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    fontFamily: 'Inter-Regular',
  },

  /* ---------------- Bullets ---------------- */

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 4,
  },

  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F63B05',
    marginTop: 8,
    marginRight: 10,
  },

  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Inter-Regular',
  },

  /* ---------------- Bottom Notice ---------------- */

  bottomNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(246, 59, 5, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(246, 59, 5, 0.2)',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },

  bottomNoticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    marginLeft: 10,
    fontFamily: 'Inter-Regular',
  },

  /* ---------------- Footer ---------------- */

  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    gap: 10,
  },

  agreeButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  agreeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Outfit-Bold',
  },

  closeFooterButton: {
    width: 100,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeFooterButtonFull: {
    flex: 1,
    width: undefined,
  },

  closeText: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Outfit-SemiBold',
  },

  /* ---------------- Modal ---------------- */

  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  modalContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '85%',
    overflow: 'hidden',
    borderTopWidth: 1,
  },

  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
});

export default TermsAndConditionsModal;
