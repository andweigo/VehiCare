import LegalDocumentView from '../components/LegalDocumentView';
import { PRIVACY_DOCUMENT } from '../data/legalDocuments';

const PrivacyScreen = ({ navigation }) => (
  <LegalDocumentView
    document={PRIVACY_DOCUMENT}
    navigation={navigation}
    onOpenOther={() => navigation.navigate('Terms')}
    otherLabel="Read the Terms and Conditions"
  />
);

export default PrivacyScreen;
