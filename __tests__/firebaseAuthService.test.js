describe('loginWithGoogle', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('forces the Google account picker before signing in', async () => {
    const signInWithCredential = jest.fn(() => Promise.resolve({ user: { uid: '123' } }));
    const credential = jest.fn(() => ({ provider: 'google' }));
    const signIn = jest.fn(() => Promise.resolve({
      type: 'success',
      data: {
        idToken: 'google-id-token',
        accessToken: 'google-access-token',
      },
    }));
    const signOut = jest.fn(() => Promise.resolve());

    jest.doMock('@react-native-firebase/auth', () => {
      const auth = jest.fn(() => ({ signInWithCredential }));
      auth.GoogleAuthProvider = { credential };
      return auth;
    });

    jest.doMock('@react-native-google-signin/google-signin', () => ({
      GoogleSignin: {
        hasPlayServices: jest.fn(() => Promise.resolve(true)),
        signOut,
        signIn,
        getTokens: jest.fn(() => Promise.resolve({
          idToken: 'google-id-token',
          accessToken: 'google-access-token',
        })),
      },
    }));

    const { loginWithGoogle } = require('../src/services/firebaseAuthService');

    await loginWithGoogle();

    expect(signOut).toHaveBeenCalled();
    expect(signIn).toHaveBeenCalledWith({ prompt: 'select_account' });
  });

  it('passes both id and access tokens to Firebase when Google returns them', async () => {
    const signInWithCredential = jest.fn(() => Promise.resolve({ user: { uid: '123' } }));
    const credential = jest.fn(() => ({ provider: 'google' }));

    jest.doMock('@react-native-firebase/auth', () => {
      const auth = jest.fn(() => ({ signInWithCredential }));
      auth.GoogleAuthProvider = { credential };
      return auth;
    });

    jest.doMock('@react-native-google-signin/google-signin', () => ({
      GoogleSignin: {
        hasPlayServices: jest.fn(() => Promise.resolve(true)),
        signIn: jest.fn(() => Promise.resolve({
          type: 'success',
          data: {
            idToken: 'google-id-token',
            accessToken: 'google-access-token',
          },
        })),
        getTokens: jest.fn(() => Promise.resolve({
          idToken: 'google-id-token',
          accessToken: 'google-access-token',
        })),
      },
    }));

    const { loginWithGoogle } = require('../src/services/firebaseAuthService');

    await loginWithGoogle();

    expect(credential).toHaveBeenCalledWith('google-id-token', 'google-access-token');
    expect(signInWithCredential).toHaveBeenCalled();
  });
});
