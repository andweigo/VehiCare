import LegalDocumentView from '../components/LegalDocumentView';
import { TERMS_DOCUMENT } from '../data/legalDocuments';

const TermsScreen = ({ navigation }) => (
  <LegalDocumentView
    document={TERMS_DOCUMENT}
    navigation={navigation}
    onOpenOther={() => navigation.navigate('Privacy')}
    otherLabel="Read the Privacy Policy"
  />
);

export default TermsScreen;
