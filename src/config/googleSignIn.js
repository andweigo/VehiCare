import { GoogleSignin } from '@react-native-google-signin/google-signin';

const webClientId = '716267634875-vnjjld87jn4r2l24lh61tea0o2hr29g2.apps.googleusercontent.com';
let isConfigured = false;

export const configureGoogleSignIn = () => {
  if (isConfigured) {
    return;
  }

  if (!GoogleSignin || typeof GoogleSignin.configure !== 'function') {
    return;
  }

  try {
    GoogleSignin.configure({
      webClientId,
      offlineAccess: true,
      scopes: ['profile', 'email'],
      forceCodeForRefreshToken: true,
    });
    isConfigured = true;
  } catch (error) {
    console.warn('Google Sign-In configuration skipped:', error?.message || error);
  }
};

configureGoogleSignIn();
