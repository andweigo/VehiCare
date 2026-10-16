import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import {
  clearUnauthorizedHandler,
  setAuthToken,
  setUnauthorizedHandler,
} from '../api/apiClient';

import {
  googleLogin,
  googleRegister,
  login as loginWithBackend,
  register as registerWithBackend,
  sendOtp as sendOtpApi,
  updateProfile as updateProfileApi,
} from '../api/authApi';

import vehicleApi from '../api/vehicleApi';
import { getSubscriptionStatus } from '../api/subscriptionApi';

import { configureGoogleSignIn } from '../config/googleSignIn';

import {
  getIdToken,
  getUserProfile,
  loginWithEmail,
  loginWithGoogle,
  logoutFirebase,
  onAuthStateChanged,
  registerWithEmail,
  updateUserProfile as updateFirebaseUserProfile,
} from '../services/firebaseAuthService';

import {
  clearAuthData,
  clearGuestDiagnosisCount,
  getToken,
  getUser,
  saveAuthData,
} from '../services/storageService';

import {
  transferGuestVehicleToAccount,
} from '../services/vehicleService';

const AuthContext =
  createContext(null);

/*
|--------------------------------------------------------------------------
| BUILD AUTH USER
|--------------------------------------------------------------------------
*/

export const buildAuthUser = (
  firebaseUser,
  backendUser,
) => {
  const firebaseProfile =
    getUserProfile(
      firebaseUser,
    );

  if (!firebaseProfile) {
    return backendUser || null;
  }

  return {
    ...(backendUser || {}),

    ...firebaseProfile,

    uid:
      firebaseProfile.uid ||
      backendUser?.uid ||
      backendUser?.id ||
      null,

    email:
      firebaseProfile.email ||
      backendUser?.email ||
      null,

    displayName:
      firebaseProfile.displayName ||
      backendUser?.name ||
      backendUser?.displayName ||
      null,

    name:
      firebaseProfile.displayName ||
      backendUser?.name ||
      backendUser?.displayName ||
      null,

    photoURL:
      firebaseProfile.photoURL ||
      backendUser?.photoURL ||
      backendUser?.avatar ||
      null,

    phoneNumber:
      backendUser?.phone_number ||
      backendUser?.phoneNumber ||
      null,
  };
};

/*
|--------------------------------------------------------------------------
| ACCOUNT VEHICLES
|--------------------------------------------------------------------------
*/

const fetchAccountVehicles =
  async () => {
    try {
      const vehicles =
        await vehicleApi.getMyVehicles();

      return Array.isArray(vehicles)
        ? vehicles
        : [];
    } catch (error) {
      console.warn(
        'Unable to load account vehicles:',
        error?.message || error,
      );

      return [];
    }
  };

const loadAccountVehicles =
  async () => {
    const accountVehicles =
      await fetchAccountVehicles();

    return {
      accountVehicles,

      hasAccountVehicles:
        accountVehicles.length > 0,
    };
  };

/*
|--------------------------------------------------------------------------
| PROVIDER
|--------------------------------------------------------------------------
*/

export const AuthProvider = ({
  children,
}) => {
  const [user, setUser] =
    useState(null);

  const [token, setToken] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [isGuest, setIsGuest] =
    useState(false);

  const [isNewRegistration, setIsNewRegistration] =
    useState(false);

  const [logoutSignal, setLogoutSignal] =
    useState(0);

  const continueAsGuest = () => {
    setIsGuest(true);
  };

  const exitGuestMode = () => {
    setIsGuest(false);
  };

  /*
  |--------------------------------------------------------------------------
  | PERSIST AUTH
  |--------------------------------------------------------------------------
  */

  const persistAuthState =
    async (
      nextToken,
      nextUser,
    ) => {
      const resolvedToken =
        nextToken &&
        String(nextToken).trim()
          ? nextToken
          : null;

      await saveAuthData(
        resolvedToken,
        nextUser,
      );

      setAuthToken(
        resolvedToken,
      );

      setToken(
        resolvedToken,
      );

      setUser(
        nextUser,
      );

      setIsGuest(false);
    };

  /*
  |--------------------------------------------------------------------------
  | TEMPORARY GOOGLE SESSION
  |--------------------------------------------------------------------------
  */

  const clearTemporaryGoogleSession =
    async () => {
      try {
        await logoutFirebase();
      } catch (error) {
        console.warn(
          'Failed to clear temporary Google session:',
          error?.message || error,
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | RESTORE AUTH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let isMounted = true;

    try {
      configureGoogleSignIn();
    } catch (error) {
      console.error(
        'Google Sign-In configuration error:',
        error?.message || error,
      );
    }

    setUnauthorizedHandler(async () => {
      console.warn('[AuthContext] Session expired or revoked by server (401). Performing clean logout...');
      try {
        await logoutFirebase();
      } catch (e) {
        // ignore
      }
      try {
        await clearAuthData();
      } catch (e) {
        // ignore
      }
      setAuthToken(null);
      setToken(null);
      setUser(null);
      setIsGuest(false);
      setLogoutSignal(c => c + 1);
    });

    const unsubscribe =
      onAuthStateChanged(
        async firebaseUser => {
          try {
            if (!isMounted) {
              return;
            }

            if (firebaseUser) {
              const existingToken =
                await getToken();

              const persistedToken =
                existingToken &&
                String(
                  existingToken,
                ).trim()
                  ? existingToken
                  : null;

              const persistedUser =
                await getUser();

              const authUser =
                buildAuthUser(
                  firebaseUser,
                  persistedUser,
                );

              if (!authUser) {
                throw new Error(
                  'Firebase user profile unavailable.',
                );
              }

              /*
               * If Firebase is authenticated and token exists,
               * restore the account state.
               */
              if (persistedToken) {
                await persistAuthState(
                  persistedToken,
                  authUser,
                );
                // Background subscription sync on session restore
                getSubscriptionStatus()
                  .then(statusData => {
                    if (statusData?.user) {
                      const updated = buildAuthUser(firebaseUser, {
                        ...authUser,
                        ...statusData.user,
                      });
                      updateUser(updated).catch(() => {});
                    }
                  })
                  .catch(() => {});
              } else {
                setAuthToken(null);
                setToken(null);
                setUser(null);
                await clearAuthData();
              }
            } else {
              /*
               * Firebase is logged out.
               *
               * Clear ONLY authentication state here.
               *
               * Do not touch the guest vehicle here.
               * Logout() handles the explicit session cleanup.
               */
              setAuthToken(null);
              setToken(null);
              setUser(null);

              await clearAuthData();
            }
          } catch (error) {
            console.warn(
              'Firebase auth restore failed:',
              error?.message || error,
            );

            if (isMounted) {
              setAuthToken(null);
              setToken(null);
              setUser(null);

              await clearAuthData();
            }
          } finally {
            if (isMounted) {
              setLoading(false);
            }
          }
        },
      );

    return () => {
      isMounted = false;
      clearUnauthorizedHandler();

      if (
        typeof unsubscribe ===
        'function'
      ) {
        unsubscribe();
      }
    };
  }, []);

  /*
   * Synchronize subscription state when app returns to foreground.
   */
  useEffect(() => {
    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active' && token) {
        refreshUser().catch(() => {});
      }
    });

    return () => {
      appStateSub?.remove?.();
    };
  }, [token]);

  /*
  |--------------------------------------------------------------------------
  | REGISTER
  |--------------------------------------------------------------------------
  */

  const register = async (
    name,
    email,
    password,
    guestVehicle = null,
  ) => {
    try {
      const userCredential =
        await registerWithEmail(
          email,
          password,
        );

      const firebaseUser =
        userCredential?.user;

      if (!firebaseUser) {
        throw new Error(
          'Firebase registration failed.',
        );
      }

      if (name?.trim()) {
        await firebaseUser.updateProfile({
          displayName:
            name.trim(),
        });
      }

      const backendAuth =
        await registerWithBackend(
          name,
          email,
          password,
        );

      // CRITICAL: Do NOT persist auth state here!
      // User must verify their OTP code first before entering the Dashboard or gaining session access.
      return {
        requiresOtp: true,
        email: email.trim(),
        guestVehicle,
        cooldownSeconds:
          backendAuth?.data?.cooldown_seconds ||
          backendAuth?.cooldown_seconds ||
          60,
      };
    } catch (error) {
      const code =
        error?.code || '';

      const message =
        String(
          error?.message || '',
        ).toLowerCase();

      if (
        String(code)
          .toLowerCase()
          .includes(
            'email-already-in-use',
          ) ||
        message.includes(
          'email-already-in-use',
        ) ||
        message.includes(
          'the email address is already in use',
        ) ||
        message.includes(
          'already in use',
        )
      ) {
        throw new Error(
          'Account already exists. Please sign in instead.',
        );
      }

      throw error;
    }
  };

  const completeRegistrationAuth = async (
    verifiedToken,
    verifiedUser,
    guestVehicleToClaim = null,
  ) => {
    if (!verifiedToken || !verifiedUser) {
      throw new Error('Invalid verification credentials.');
    }

    const authUser = buildAuthUser(
      null,
      verifiedUser,
    );

    let claimedVehicle = null;

    if (guestVehicleToClaim) {
      try {
        setAuthToken(verifiedToken);
        claimedVehicle = await transferGuestVehicleToAccount(
          guestVehicleToClaim,
        );
      } catch (error) {
        console.warn(
          'Failed to claim guest vehicle during OTP completion:',
          error?.message || error,
        );
      }
    }

    setIsNewRegistration(true);

    await persistAuthState(
      verifiedToken,
      authUser,
    );

    const {
      accountVehicles,
      hasAccountVehicles,
    } = await loadAccountVehicles();

    return {
      user: authUser,
      token: verifiedToken,
      claimedVehicle,
      accountVehicles,
      hasAccountVehicles: Boolean(claimedVehicle || hasAccountVehicles),
    };
  };

  /*
  |--------------------------------------------------------------------------
  | LOGIN
  |--------------------------------------------------------------------------
  */

  const login = async (
    email,
    password,
  ) => {
    const userCredential =
      await loginWithEmail(
        email,
        password,
      );

    const firebaseUser =
      userCredential?.user;

    if (!firebaseUser) {
      throw new Error(
        'Firebase login failed.',
      );
    }

    const backendAuth =
      await loginWithBackend(
        email,
        password,
      );

    const authToken =
      backendAuth?.token ||
      null;

    const authUser =
      buildAuthUser(
        firebaseUser,
        backendAuth?.user ||
          null,
      );

    await persistAuthState(
      authToken,
      authUser,
    );

    /*
     * IMPORTANT:
     *
     * Normal login DOES NOT claim
     * the guest vehicle.
     */
    const {
      accountVehicles,
      hasAccountVehicles,
    } =
      await loadAccountVehicles();

    return {
      user: authUser,
      token: authToken,

      accountVehicles,

      hasAccountVehicles,
    };
  };

  /*
  |--------------------------------------------------------------------------
  | GOOGLE LOGIN
  |--------------------------------------------------------------------------
  */

  const loginGoogle =
    async () => {
      try {
        configureGoogleSignIn();

        const userCredential =
          await loginWithGoogle();

        const firebaseUser =
          userCredential?.user ||
          null;

        if (!firebaseUser) {
          throw new Error(
            'Google Sign-In failed.',
          );
        }

        const idToken =
          await getIdToken(true);

        if (!idToken) {
          throw new Error(
            'No Firebase ID token available for Laravel auth.',
          );
        }

        const backendAuth =
          await googleLogin(
            idToken,
          );

        const authToken =
          backendAuth?.token ||
          null;

        const authUser =
          buildAuthUser(
            firebaseUser,
            backendAuth?.user ||
              null,
          );

        await persistAuthState(
          authToken,
          authUser,
        );

        const {
          accountVehicles,
          hasAccountVehicles,
        } =
          await loadAccountVehicles();

        const requiresOtp = !authUser?.email_verified_at;
        if (requiresOtp && authUser?.email) {
          try {
            await sendOtpApi(authUser.email, 'registration');
          } catch (otpErr) {
            console.warn('[AuthContext] Automatic OTP send warning during googleLogin:', otpErr?.message || otpErr);
          }
        }

        return {
          user: authUser,
          token: authToken,
          accountVehicles,
          hasAccountVehicles,
          requiresOtp,
          email: authUser?.email,
        };
      } catch (error) {
        const message =
          String(
            error?.message || '',
          ).toLowerCase();

        const isCancelled =
          message.includes(
            'cancel',
          ) ||
          message.includes(
            'cancelled',
          );

        if (!isCancelled) {
          await clearTemporaryGoogleSession();
        }

        throw error;
      }
    };

  /*
  |--------------------------------------------------------------------------
  | GOOGLE REGISTER
  |--------------------------------------------------------------------------
  */

  const registerGoogle =
    async (
      guestVehicle = null,
    ) => {
      try {
        configureGoogleSignIn();

        const userCredential =
          await loginWithGoogle();

        const firebaseUser =
          userCredential?.user ||
          null;

        if (!firebaseUser) {
          throw new Error(
            'Google Sign-In failed.',
          );
        }

        const idToken =
          await getIdToken(true);

        if (!idToken) {
          throw new Error(
            'No Firebase ID token available for Laravel auth.',
          );
        }

        const backendAuth =
          await googleRegister(
            idToken,
          );

        const authToken =
          backendAuth?.token ||
          null;

        const authUser =
          buildAuthUser(
            firebaseUser,
            backendAuth?.user ||
              null,
          );

        await persistAuthState(
          authToken,
          authUser,
        );

        let claimedVehicle =
          null;

        if (guestVehicle) {
          try {
            claimedVehicle =
              await transferGuestVehicleToAccount(
                guestVehicle,
              );
          } catch (error) {
            console.warn(
              'Failed to claim guest vehicle during Google registration:',
              error?.message || error,
            );
          }
        }

        const {
          accountVehicles,
          hasAccountVehicles,
        } =
          await loadAccountVehicles();

        const requiresOtp = !authUser?.email_verified_at;
        if (requiresOtp && authUser?.email) {
          try {
            await sendOtpApi(authUser.email, 'registration');
          } catch (otpErr) {
            console.warn('[AuthContext] Automatic OTP send warning during googleRegister:', otpErr?.message || otpErr);
          }
        }

        return {
          user: authUser,
          token: authToken,
          accountVehicles,
          hasAccountVehicles,
          claimedVehicle,
          requiresOtp,
          email: authUser?.email,
        };
      } catch (error) {
        const message =
          String(
            error?.message || '',
          ).toLowerCase();

        const isCancelled =
          message.includes(
            'cancel',
          ) ||
          message.includes(
            'cancelled',
          );

        if (!isCancelled) {
          await clearTemporaryGoogleSession();
        }

        throw error;
      }
    };

  /*
  |--------------------------------------------------------------------------
  | UPDATE USER
  |--------------------------------------------------------------------------
  */

  const updateUser =
    async nextUser => {
      const resolvedToken =
        token &&
        String(token).trim()
          ? token
          : null;

      await saveAuthData(
        resolvedToken,
        nextUser,
      );

      setUser(
        nextUser,
      );
    };

  /*
  |--------------------------------------------------------------------------
  | UPDATE PROFILE
  |--------------------------------------------------------------------------
  */

  const updateProfile =
    async changes => {
      if (!user) {
        throw new Error(
          'No authenticated user to update.',
        );
      }

      const trimmedName =
        changes.displayName
          ? String(
              changes.displayName,
            ).trim()
          : changes.name
            ? String(
                changes.name,
              ).trim()
            : null;

      const updatedProfile = {
        ...user,
        ...changes,

        displayName:
          trimmedName ||
          user.displayName,

        name:
          trimmedName ||
          user.name,

        photoURL:
          changes.photoURL ??
          changes.avatar ??
          user.photoURL ??
          null,

        phoneNumber:
          changes.phoneNumber ??
          user.phoneNumber ??
          user.phone_number ??
          null,
      };

      const backendUpdates =
        {};

      if (
        trimmedName !== null
      ) {
        backendUpdates.name =
          trimmedName;
      }

      if (
        'photoURL' in changes ||
        'avatar' in changes
      ) {
        backendUpdates.avatar =
          updatedProfile.photoURL ||
          null;
      }

      if (
        'phoneNumber' in changes ||
        'phone_number' in changes
      ) {
        backendUpdates.phone_number =
          updatedProfile.phoneNumber ||
          null;
      }

      if (
        Object.keys(
          backendUpdates,
        ).length > 0
      ) {
        await updateProfileApi(
          backendUpdates,
        );
      }

      await updateFirebaseUserProfile({
        displayName:
          updatedProfile.displayName,

        photoURL:
          updatedProfile.photoURL,
      });

      await updateUser(
        updatedProfile,
      );

      return updatedProfile;
    };

  const userRef = useRef(user);
  const tokenRef = useRef(token);

  useEffect(() => {
    userRef.current = user;
    tokenRef.current = token;
  });

  const refreshUser = useCallback(async () => {
    try {
      const data = await getSubscriptionStatus();
      if (data?.user) {
        const currentUser = userRef.current;
        if (
          currentUser &&
          currentUser.subscription_plan === data.user.subscription_plan &&
          currentUser.vehicle_limit === data.user.vehicle_limit &&
          currentUser.role === data.user.role
        ) {
          return currentUser;
        }

        const authUser = buildAuthUser(null, {
          ...(currentUser || {}),
          ...data.user,
        });

        const currentToken = tokenRef.current;
        await saveAuthData(currentToken, authUser);
        setUser(authUser);
        return authUser;
      }
    } catch (error) {
      console.warn('Failed to refresh user:', error?.message || error);
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const logout =
    async () => {
      try {
        await logoutFirebase();
      } catch (error) {
        console.error(
          'Firebase logout error:',
          error?.message || error,
        );
      } finally {
        /*
         * Clear authentication.
         */
        try {
          await clearAuthData();
        } catch (error) {
          console.error(
            'Auth storage cleanup failed:',
            error?.message || error,
          );
        }

        /*
         * Reset guest diagnosis counter.
         */
        await clearGuestDiagnosisCount();

        /*
         * Clear API token.
         */
        setAuthToken(null);

        /*
         * Clear React state.
         */
        setToken(null);
        setUser(null);
        setIsGuest(false);
        setLogoutSignal(
          current => current + 1,
        );
      }
    };

  const verifyUserEmail = async () => {
    if (user) {
      const updatedUser = {
        ...user,
        email_verified_at: new Date().toISOString(),
      };
      await updateUser(updatedUser);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | PROVIDER
  |--------------------------------------------------------------------------
  */

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        logoutSignal,

        loading,
        isGuest,
        continueAsGuest,
        exitGuestMode,

        register,
        registerGoogle,

        login,
        loginGoogle,

        logout,
        refreshUser,

        isNewRegistration,
        setIsNewRegistration,
        completeRegistrationAuth,

        verifyUserEmail,
        updateUser,
        updateProfile,

        isAuthenticated:
          Boolean(token && String(token).trim()),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/*
|--------------------------------------------------------------------------
| HOOK
|--------------------------------------------------------------------------
*/

export const useAuth =
  () => {
    const context =
      useContext(AuthContext);

    if (!context) {
      throw new Error(
        'useAuth must be used inside AuthProvider',
      );
    }

    return context;
  };

export default AuthProvider;