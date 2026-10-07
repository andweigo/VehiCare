describe('configureGoogleSignIn', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('does not throw when GoogleSignin.configure is unavailable', () => {
    jest.doMock('@react-native-google-signin/google-signin', () => ({
      GoogleSignin: {},
    }));

    jest.isolateModules(() => {
      const { configureGoogleSignIn } = require('../src/config/googleSignIn');
      expect(() => configureGoogleSignIn()).not.toThrow();
    });
  });
});
