jest.mock('@react-native-firebase/auth', () => ({}));
jest.mock('@react-native-google-signin/google-signin', () => ({}));

jest.mock('../src/services/firebaseAuthService', () => ({
  getUserProfile: firebaseUser => ({
    uid: firebaseUser?.uid,
    email: firebaseUser?.email,
    displayName: firebaseUser?.displayName,
    photoURL: firebaseUser?.photoURL,
  }),
  loginWithEmail: jest.fn(),
  loginWithGoogle: jest.fn(),
  logoutFirebase: jest.fn(),
  onAuthStateChanged: jest.fn(),
  registerWithEmail: jest.fn(),
  getIdToken: jest.fn(),
}));

jest.mock('../src/services/storageService', () => ({
  clearAuthData: jest.fn(),
  getToken: jest.fn(),
  saveAuthData: jest.fn(),
}));

jest.mock('../src/api/authApi', () => ({
  googleLogin: jest.fn(),
  login: jest.fn(),
  register: jest.fn(),
}));

jest.mock('../src/config/googleSignIn', () => ({
  configureGoogleSignIn: jest.fn(),
}));

describe('buildAuthUser', () => {
  it('prefers the live Firebase profile over a stale backend profile', () => {
    const { buildAuthUser } = require('../src/context/AuthContext');

    const firebaseUser = {
      uid: 'firebase-123',
      email: 'new-google-account@gmail.com',
      displayName: 'New Google User',
      photoURL: 'https://cdn.example.com/new.png',
    };

    const backendUser = {
      id: 7,
      email: 'old-db-account@example.com',
      name: 'Old Database User',
      photoURL: 'https://cdn.example.com/old.png',
    };

    const result = buildAuthUser(firebaseUser, backendUser);

    expect(result.email).toBe('new-google-account@gmail.com');
    expect(result.displayName).toBe('New Google User');
    expect(result.photoURL).toBe('https://cdn.example.com/new.png');
    expect(result.name).toBe('New Google User');
  });
});
