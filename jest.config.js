module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/backend/',
    '<rootDir>/vehicare-ai-service/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-navigation|react-native-vector-icons|react-native-gesture-handler|react-native-safe-area-context|react-native-screens)/)',
  ],
};
