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

  it('normalizes a backend-only profile when Firebase is not available', () => {
    const { buildAuthUser } = require('../src/context/AuthContext');

    const result = buildAuthUser(null, {
      id: 8,
      email: 'saved@example.com',
      name: 'Saved Account',
      avatar: 'https://cdn.example.com/saved.png',
    });

    expect(result.uid).toBe(8);
    expect(result.displayName).toBe('Saved Account');
    expect(result.name).toBe('Saved Account');
    expect(result.photoURL).toBe('https://cdn.example.com/saved.png');
  });

  it('unwraps nested user payloads returned from Laravel /user/me', () => {
    const { extractBackendUser, buildAuthUser } = require('../src/context/AuthContext');

    const laravelResponse = {
      user: {
        id: 12,
        name: 'Laravel Authenticated User',
        email: 'user@vehicare.local',
        avatar: 'https://cdn.example.com/avatar12.png',
        subscription_plan: 'premium',
      },
    };

    const unwrapped = extractBackendUser(laravelResponse);
    expect(unwrapped.name).toBe('Laravel Authenticated User');
    expect(unwrapped.id).toBe(12);

    const built = buildAuthUser(null, unwrapped);
    expect(built.displayName).toBe('Laravel Authenticated User');
    expect(built.name).toBe('Laravel Authenticated User');
    expect(built.email).toBe('user@vehicare.local');
    expect(built.photoURL).toBe('https://cdn.example.com/avatar12.png');
    expect(built.subscription_plan).toBe('premium');
  });

  it('preserves backend name and photo when Firebase has null profile fields', () => {
    const { buildAuthUser } = require('../src/context/AuthContext');

    const firebaseUser = {
      uid: 'firebase-999',
      email: 'user@example.com',
      displayName: null,
      photoURL: null,
    };

    const backendUser = {
      id: 999,
      email: 'user@example.com',
      name: 'Real Backend Name',
      avatar: 'https://cdn.example.com/real.png',
      phone_number: '+639171234567',
    };

    const result = buildAuthUser(firebaseUser, backendUser);
    expect(result.displayName).toBe('Real Backend Name');
    expect(result.name).toBe('Real Backend Name');
    expect(result.photoURL).toBe('https://cdn.example.com/real.png');
    expect(result.phoneNumber).toBe('+639171234567');
  });

  it('ignores dead device-local photo URIs in favor of persistable remote photos', () => {
    const { buildAuthUser } = require('../src/context/AuthContext');

    const result = buildAuthUser(null, {
      id: 5,
      name: 'Local Photo User',
      photoURL: 'file:///data/user/0/com.vehicare/cache/dead_photo.jpg',
      avatar: 'https://cdn.example.com/cloud_backup.png',
    });

    expect(result.photoURL).toBe('https://cdn.example.com/cloud_backup.png');
  });

  it('supports inline data image URIs for offline/base64 avatar storage', () => {
    const { buildAuthUser } = require('../src/context/AuthContext');

    const base64Uri = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...';
    const result = buildAuthUser(null, {
      id: 6,
      name: 'Base64 Avatar User',
      avatar: base64Uri,
    });

    expect(result.photoURL).toBe(base64Uri);
  });
});
