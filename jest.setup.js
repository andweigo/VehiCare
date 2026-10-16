/* eslint-env jest */
require('react-native-gesture-handler/jestSetup');

const mockAsyncStorageStore = new Map();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(key => Promise.resolve(mockAsyncStorageStore.has(key) ? mockAsyncStorageStore.get(key) : null)),
  setItem: jest.fn((key, value) => {
    mockAsyncStorageStore.set(key, String(value));
    return Promise.resolve(null);
  }),
  removeItem: jest.fn(key => {
    mockAsyncStorageStore.delete(key);
    return Promise.resolve(null);
  }),
  clear: jest.fn(() => {
    mockAsyncStorageStore.clear();
    return Promise.resolve(null);
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Array.from(mockAsyncStorageStore.keys()))),
  multiGet: jest.fn(keys => Promise.resolve(keys.map(k => [k, mockAsyncStorageStore.get(k) || null]))),
  multiSet: jest.fn(pairs => {
    pairs.forEach(([k, v]) => mockAsyncStorageStore.set(k, String(v)));
    return Promise.resolve(null);
  }),
  multiRemove: jest.fn(keys => {
    keys.forEach(k => mockAsyncStorageStore.delete(k));
    return Promise.resolve(null);
  }),
}));

jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-vector-icons/FontAwesome', () => 'Icon');
jest.mock('react-native-vector-icons/Feather', () => 'Icon');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: null,
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(() => () => {}),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

jest.mock('react-native-nitro-sound', () => ({
  startRecording: jest.fn(),
  stopRecording: jest.fn(),
  play: jest.fn(),
  stop: jest.fn(),
}));

jest.mock('lottie-react-native', () => 'LottieView');

jest.mock('react-native-permissions', () =>
  require('react-native-permissions/mock')
);

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn().mockResolvedValue({ data: { idToken: 'mock-token' } }),
    signOut: jest.fn(),
  },
}));
