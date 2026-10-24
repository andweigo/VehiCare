import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';

/**
 * Renders a structured legal document from src/data/legalDocuments.js.
 * Used by both TermsScreen and PrivacyScreen so registration, Settings and the
 * sidebar always show the same centrally-versioned text.
 */
const Block = ({ block, theme }) => {
  switch (block.type) {
    case 'p':
      return (
        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
          {block.text}
        </Text>
      );

    case 'ul':
      return (
        <View style={styles.list}>
          {block.items.map(item => (
            <View key={item} style={styles.bulletRow}>
              <View style={[styles.bullet, { backgroundColor: theme.accent }]} />
              <Text style={[styles.bulletText, { color: theme.textSecondary }]}>{item}</Text>
            </View>
          ))}
        </View>
      );

    case 'note':
      return (
        <View
          style={[
            styles.note,
            { backgroundColor: theme.surfaceAlt || theme.surface, borderColor: theme.accent },
          ]}>
          <Icon name="info-outline" size={18} color={theme.accent} style={styles.noteIcon} />
          <Text style={[styles.noteText, { color: theme.text }]}>{block.text}</Text>
        </View>
      );

    case 'kv':
      return (
        <View style={[styles.kvCard, { borderColor: theme.border }]}>
          {block.items.map(([label, getValue]) => (
            <View key={label} style={styles.kvRow}>
              <Text style={[styles.kvLabel, { color: theme.textSecondary }]}>{label}</Text>
              <Text style={[styles.kvValue, { color: theme.text }]}>
                {typeof getValue === 'function' ? getValue() : getValue}
              </Text>
            </View>
          ))}
        </View>
      );

    case 'table':
      return (
        <View style={[styles.table, { borderColor: theme.border }]}>
          <View style={[styles.tableRow, { backgroundColor: theme.surfaceAlt || theme.surface }]}>
            {block.head.map(cell => (
              <Text key={cell} style={[styles.tableHead, { color: theme.text }]}>
                {cell}
              </Text>
            ))}
          </View>
          {block.rows.map(row => (
            <View key={row[0]} style={[styles.tableRow, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
              {row.map((cell, index) => (
                <Text
                  key={`${row[0]}-${index}`}
                  style={[styles.tableCell, { color: index === 0 ? theme.text : theme.textSecondary }]}>
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );

    default:
      return null;
  }
};

const LegalDocumentView = ({ document, navigation, onOpenOther = null, otherLabel = null }) => {
  const { theme } = useTheme();

  const goBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={goBack}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <Icon name="arrow-back" size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerEyebrow, { color: theme.accent }]}>LEGAL</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]} accessibilityRole="header">
            {document.title}
          </Text>
        </View>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.metaRow}>
            <View style={[styles.metaPill, { borderColor: theme.accent }]}>
              <Text style={[styles.metaText, { color: theme.accent }]}>Version {document.version}</Text>
            </View>
            <Text style={[styles.metaDate, { color: theme.textSecondary }]}>
              Effective {document.effectiveDate}
            </Text>
          </View>

          <Text style={[styles.intro, { color: theme.textSecondary }]}>{document.intro}</Text>

          {document.sections.map(section => (
            <View key={section.id} style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: section.emphasis ? theme.accent : theme.text }]}
                accessibilityRole="header">
                {section.title}
              </Text>
              {section.blocks.map((block, index) => (
                <Block key={`${section.id}-${index}`} block={block} theme={theme} />
              ))}

              {section.linkToPrivacy && onOpenOther ? (
                <TouchableOpacity
                  onPress={onOpenOther}
                  style={styles.linkButton}
                  accessibilityRole="link"
                  accessibilityLabel={otherLabel}>
                  <Text style={[styles.linkButtonText, { color: theme.accent }]}>{otherLabel}</Text>
                  <Icon name="chevron-right" size={18} color={theme.accent} />
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
            This document describes the app as implemented on the effective date and is not legal advice. The
            operator should have it reviewed by qualified Philippine privacy counsel before production release.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerEyebrow: { fontFamily: 'Inter-Bold', fontSize: 10, letterSpacing: 1.4 },
  headerTitle: { fontFamily: 'Outfit-Bold', fontSize: 18 },
  headerPlaceholder: { width: 42 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 18, borderWidth: 1, padding: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  metaPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginRight: 10 },
  metaText: { fontFamily: 'Inter-SemiBold', fontSize: 12 },
  metaDate: { fontFamily: 'Inter-Regular', fontSize: 12 },
  intro: { fontFamily: 'Inter-Regular', fontSize: 15, lineHeight: 23, marginBottom: 6 },
  section: { marginTop: 20 },
  sectionTitle: { fontFamily: 'Outfit-Bold', fontSize: 17, marginBottom: 8 },
  paragraph: { fontFamily: 'Inter-Regular', fontSize: 15, lineHeight: 23, marginBottom: 8 },
  list: { marginBottom: 8 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 9, marginRight: 10 },
  bulletText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 15, lineHeight: 23 },
  note: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  noteIcon: { marginRight: 8, marginTop: 2 },
  noteText: { flex: 1, fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 21 },
  kvCard: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  kvRow: { marginBottom: 8 },
  kvLabel: { fontFamily: 'Inter-SemiBold', fontSize: 12 },
  kvValue: { fontFamily: 'Inter-Regular', fontSize: 14, lineHeight: 20 },
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 10 },
  tableRow: { flexDirection: 'row' },
  tableHead: { flex: 1, padding: 10, fontFamily: 'Inter-Bold', fontSize: 12 },
  tableCell: { flex: 1, padding: 10, fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 19 },
  linkButton: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginTop: 4 },
  linkButtonText: { fontFamily: 'Inter-SemiBold', fontSize: 15 },
  disclaimer: { fontFamily: 'Inter-Regular', fontSize: 12, lineHeight: 18, marginTop: 24 },
});

export default LegalDocumentView;
