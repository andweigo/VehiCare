import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export const loginWithEmail = (email, password) => {
  return auth().signInWithEmailAndPassword(email, password);
};

export const registerWithEmail = (email, password) => {
  return auth().createUserWithEmailAndPassword(email, password);
};

export const loginWithGoogle = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    if (typeof GoogleSignin.signOut === 'function') {
      try {
        await GoogleSignin.signOut();
      } catch (signOutError) {
        console.warn('Google sign-out before picker failed:', signOutError?.message || signOutError);
      }
    }

    const signInResponse = await GoogleSignin.signIn({ prompt: 'select_account' });
    const signInData = signInResponse?.data ?? signInResponse;
    let idToken = signInData?.idToken ?? signInData?.user?.idToken ?? signInResponse?.idToken ?? null;
    let accessToken = signInData?.accessToken ?? signInData?.user?.accessToken ?? null;

    if (!signInResponse) {
      throw new Error('Google Sign-In was cancelled');
    }

    if (!idToken || !accessToken) {
      if (typeof GoogleSignin.getTokens === 'function') {
        try {
          const tokens = await GoogleSignin.getTokens();
          if (!idToken && tokens?.idToken) {
            idToken = tokens.idToken;
          }
          if (!accessToken && tokens?.accessToken) {
            accessToken = tokens.accessToken;
          }
        } catch (tokenError) {
          if (tokenError?.message?.includes('requires a user to be signed in')) {
            throw new Error('Google Sign-In was cancelled');
          }
          throw tokenError;
        }
      }
    }

    if (!idToken) {
      throw new Error('No ID token received from Google Sign-In');
    }

    if (!accessToken) {
      throw new Error(
        'No access token received from Google Sign-In. Ensure Google Sign-In is configured correctly with webClientId and offlineAccess.',
      );
    }

    const googleCredential = auth.GoogleAuthProvider.credential(idToken, accessToken);

    return auth().signInWithCredential(googleCredential);
  } catch (error) {
    const code = error?.code ?? error?.message;
    const message = String(error?.message || error);

    if (code === 'SIGN_IN_CANCELLED' || code === 'User cancelled') {
      throw new Error('Google Sign-In was cancelled');
    } else if (code === 'IN_PROGRESS') {
      throw new Error('Google Sign-In is already in progress');
    } else if (code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      throw new Error('Google Play Services is not available');
    } else if (code === 'auth/unknown' && /connection reset/i.test(message)) {
      throw new Error('Firebase Google auth failed: connection reset. Check network and Google Play Services.');
    } else if (code === 'NETWORK_ERROR' || /network/i.test(String(code))) {
      throw new Error('Network error. Please check your connection.');
    }

    throw error;
  }
};

export const logoutFirebase = async () => {
  try {
    if (typeof GoogleSignin.signOut === 'function') {
      await GoogleSignin.signOut();
    }
  } catch (error) {
    console.error('Google sign out error:', error);
  }

  const currentUser = auth().currentUser;
  if (!currentUser) {
    return Promise.resolve();
  }

  return auth().signOut();
};

export const getIdToken = async forceRefresh => {
  const currentUser = auth().currentUser;
  if (!currentUser) {
    return null;
  }

  return currentUser.getIdToken(forceRefresh);
};

export const onAuthStateChanged = callback => {
  return auth().onAuthStateChanged(callback);
};

export const getUserProfile = firebaseUser => {
  if (!firebaseUser) {
    return null;
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    phoneNumber: firebaseUser.phoneNumber,
    photoURL: firebaseUser.photoURL,
  };
};

export const reauthenticateWithEmail = async currentPassword => {
  const currentUser = auth().currentUser;

  if (!currentUser) {
    throw new Error('No authenticated Firebase user.');
  }

  const email = currentUser.email;
  if (!email) {
    throw new Error('No email address available for the current user.');
  }

  const credential = auth.EmailAuthProvider.credential(email, currentPassword);
  return currentUser.reauthenticateWithCredential(credential);
};

export const updatePassword = async newPassword => {
  const currentUser = auth().currentUser;

  if (!currentUser) {
    throw new Error('No authenticated Firebase user.');
  }

  return currentUser.updatePassword(newPassword);
};

export const updateUserProfile = async profile => {
  const currentUser = auth().currentUser;

  if (!currentUser) {
    throw new Error('No authenticated Firebase user.');
  }

  return currentUser.updateProfile(profile);
};

