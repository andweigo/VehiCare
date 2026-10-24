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
  bumpSessionEpoch,
  clearUnauthorizedHandler,
  isSessionChangedError,
  setAuthToken,
  setUnauthorizedHandler,
} from '../api/apiClient';

import {
  getMe as getMeApi,
  googleLogin,
  googleRegister,
  login as loginWithBackend,
  logout as logoutWithBackend,
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
  clearGuestMode,
  clearGuestVehicle,
  clearSessionData,
  getGuestMode,
  getGuestVehicle,
  getPendingVehicleSetup,
  getToken,
  getUser,
  saveAuthData,
  saveGuestMode,
  saveOnboardingCompleted,
  savePendingVehicleSetup,
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

  if (!firebaseProfile && !backendUser) {
    return null;
  }

  return {
    ...(backendUser || {}),

    ...firebaseProfile,

    uid:
      firebaseProfile?.uid ||
      backendUser?.uid ||
      backendUser?.id ||
      null,

    email:
      firebaseProfile?.email ||
      backendUser?.email ||
      null,

    displayName:
      firebaseProfile?.displayName ||
      backendUser?.name ||
      backendUser?.displayName ||
      null,

    name:
      firebaseProfile?.displayName ||
      backendUser?.name ||
      backendUser?.displayName ||
      null,

    photoURL:
      firebaseProfile?.photoURL ||
      backendUser?.photoURL ||
      backendUser?.photo_url ||
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
      if (isSessionChangedError(error)) {
        return [];
      }

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

  const [isNewRegistration, setIsNewRegistrationState] =
    useState(false);

  const refreshUserRef = useRef(null);

  /*
   * Onboarding stage setter. Besides updating state it persists the
   * "vehicle setup still pending" hint for the account so an app restart
   * resumes at vehicle setup. The hint is reconciled against the real
   * vehicle list by the navigator, never trusted on its own.
   */
  const setIsNewRegistration = useCallback((value, accountId = null) => {
    const pending = Boolean(value);
    setIsNewRegistrationState(pending);

    const resolvedId =
      accountId ?? userRef.current?.id ?? userRef.current?.uid ?? null;

    if (resolvedId) {
      savePendingVehicleSetup(resolvedId, pending).catch(() => {});
    }
  }, []);

  const [logoutSignal, setLogoutSignal] =
    useState(0);

  const continueAsGuest = () => {
    setIsGuest(true);
    if (typeof saveGuestMode === 'function') {
      saveGuestMode(true).catch?.(() => {});
    }
    if (typeof saveOnboardingCompleted === 'function') {
      saveOnboardingCompleted(true).catch?.(() => {});
    }
  };

  const exitGuestMode = () => {
    setIsGuest(false);
    if (typeof clearGuestMode === 'function') {
      clearGuestMode().catch?.(() => {});
    }
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

      // Switching from one authenticated session to another: drop responses
      // that are still in flight for the previous account.
      if (tokenRef.current && tokenRef.current !== resolvedToken) {
        bumpSessionEpoch();
      }

      if (typeof clearGuestMode === 'function') {
        await clearGuestMode();
      }
      if (typeof saveOnboardingCompleted === 'function') {
        await saveOnboardingCompleted(true);
      }

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
  | LOCAL SESSION RESET
  |--------------------------------------------------------------------------
  | Single code path used by explicit logout and by server-side rejection
  | (401). It invalidates in-flight requests, removes every account-scoped
  | AsyncStorage entry via the centralized list, and resets React state.
  */

  const resetLocalSession = async () => {
    // 1. Anything still in flight belongs to the old session: invalidate it.
    bumpSessionEpoch();
    setAuthToken(null);

    // 2. Third-party session + persisted account data.
    try {
      await logoutFirebase();
    } catch (error) {
      console.warn(
        'Firebase sign-out during session reset failed:',
        error?.message || error,
      );
    }

    try {
      await clearSessionData();
    } catch (error) {
      // Fall back to the minimum: never leave credentials behind.
      try {
        await clearAuthData();
      } catch (innerError) {
        console.error(
          'Auth storage cleanup failed:',
          innerError?.message || innerError,
        );
      }
    }

    // 3. React state; contexts keyed on logoutSignal reset themselves.
    setToken(null);
    setUser(null);
    setIsGuest(false);
    setIsNewRegistrationState(false);
    setLogoutSignal(current => current + 1);
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
      console.warn('[AuthContext] Session expired or revoked by server (401). Clearing local session.');
      await resetLocalSession();
    });

    // Immediate synchronous storage bootstrap to prevent login flash on app restart
    const bootstrapFromStorage = async () => {
      try {
        const storedToken = await getToken();
        const persistedToken =
          storedToken && String(storedToken).trim()
            ? storedToken
            : null;
        const persistedUser = await getUser();

        if (persistedToken && persistedUser && isMounted) {
          // Resume the onboarding stage (vehicle setup still pending?) before
          // any authenticated screen renders. The navigator reconciles this
          // hint against the real vehicle list.
          const pendingSetup = await getPendingVehicleSetup(
            persistedUser?.id ?? persistedUser?.uid ?? null,
          );
          if (!isMounted) {
            return;
          }

          setAuthToken(persistedToken);
          setToken(persistedToken);
          setUser(persistedUser);
          setIsNewRegistrationState(pendingSetup);
          setIsGuest(false);

          // Validate existing session in background
          getMeApi()
            .then(backendUserData => {
              if (isMounted && backendUserData) {
                const updated = buildAuthUser(null, {
                  ...persistedUser,
                  ...backendUserData,
                });
                updateUser(updated).catch(() => {});
              }
            })
            .catch(err => {
              console.warn('[AuthContext] Startup session check note:', err?.message || err);
            });
        } else if (isMounted) {
          const storedGuestMode =
            typeof getGuestMode === 'function' ? await getGuestMode() : false;
          const storedGuestVehicle =
            typeof getGuestVehicle === 'function' ? await getGuestVehicle() : null;
          if ((storedGuestMode || storedGuestVehicle) && isMounted) {
            setIsGuest(true);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Storage bootstrap error:', err?.message || err);
      } finally {
        if (isMounted) {
          const storedToken = await getToken().catch(() => null);
          if (!storedToken && isMounted) {
            setLoading(false);
          }
        }
      }
    };

    bootstrapFromStorage();

    // Fallback timer to ensure loading splash dismisses even if auth listeners hang or offline
    const splashFallbackTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2000);

    const unsubscribe =
      onAuthStateChanged(
        async firebaseUser => {
          try {
            if (!isMounted) {
              return;
            }

            const existingToken = await getToken();
            const persistedToken =
              existingToken &&
              String(existingToken).trim()
                ? existingToken
                : null;
            const persistedUser = await getUser();
            const currentUser = persistedUser || userRef.current;

            if (firebaseUser) {
              const authUser =
                buildAuthUser(
                  firebaseUser,
                  currentUser,
                );

              if (persistedToken && authUser) {
                await persistAuthState(
                  persistedToken,
                  authUser,
                );
                // Background subscription sync on session restore
                getSubscriptionStatus()
                  .then(statusData => {
                    if (statusData?.user && isMounted) {
                      const updated = buildAuthUser(firebaseUser, {
                        ...authUser,
                        ...statusData.user,
                      });
                      updateUser(updated).catch(() => {});
                    }
                  })
                  .catch(() => {});
              } else if (!persistedToken) {
                setAuthToken(null);
                setToken(null);
                setUser(null);
              }
            } else {
              // Firebase is not signed in or not yet resolved
              if (persistedToken && currentUser) {
                // Restore stored backend session without wiping
                await persistAuthState(persistedToken, currentUser);

                // Verify session in background
                getMeApi()
                  .then(backendUserData => {
                    if (isMounted && backendUserData) {
                      const updated = buildAuthUser(null, {
                        ...currentUser,
                        ...backendUserData,
                      });
                      updateUser(updated).catch(() => {});
                    }
                  })
                  .catch(err => {
                    console.warn('[AuthContext] Background session check note:', err?.message || err);
                  });
              } else if (!persistedToken) {
                setAuthToken(null);
                setToken(null);
                setUser(null);
              }
            }
          } catch (error) {
            console.warn(
              'Auth session restore note:',
              error?.message || error,
            );
          } finally {
            if (isMounted) {
              clearTimeout(splashFallbackTimer);
              setLoading(false);
            }
          }
        },
      );

    return () => {
      isMounted = false;
      clearTimeout(splashFallbackTimer);
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
        refreshUserRef.current?.().catch(() => {});
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
    legalMeta = null,
  ) => {
    let firebaseUser = null;
    let isExistingFirebaseUser = false;
    try {
      try {
        const userCredential =
          await registerWithEmail(
            email,
            password,
          );

        firebaseUser =
          userCredential?.user;
      } catch (fbErr) {
        const fbCode = String(fbErr?.code || '').toLowerCase();
        if (fbCode.includes('email-already-in-use')) {
          // Attempt sign-in with provided credentials to heal desynced Firebase account
          try {
            const loginCred = await loginWithEmail(email, password);
            firebaseUser = loginCred?.user;
            isExistingFirebaseUser = true;
          } catch (signInErr) {
            throw fbErr;
          }
        } else {
          throw fbErr;
        }
      }

      if (!firebaseUser) {
        throw new Error(
          'Firebase registration failed.',
        );
      }

      if (name?.trim()) {
        try {
          await firebaseUser.updateProfile({
            displayName:
              name.trim(),
          });
        } catch (profileErr) {
          // non-fatal
        }
      }

      const backendAuth =
        await registerWithBackend(
          name,
          email,
          password,
          firebaseUser?.uid || null,
          legalMeta,
        );

      // Temporarily sign out of Firebase on this device so onAuthStateChanged doesn't restore session before OTP is entered!
      await logoutFirebase();

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
      if (firebaseUser && !isExistingFirebaseUser) {
        try {
          await firebaseUser.delete();
        } catch (delErr) {
          try {
            await logoutFirebase();
          } catch (e) {}
        }
      }

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

    let authUser = buildAuthUser(
      null,
      verifiedUser,
    );

    // IMPORTANT: Persist token to storage FIRST so vehicleApi.saveVehicle()
    // can read the token via getToken() when migrating the guest vehicle.
    await saveAuthData(verifiedToken, authUser);
    setAuthToken(verifiedToken);

    let claimedVehicle = null;
    const resolvedGuestVehicle =
      guestVehicleToClaim ||
      (typeof getGuestVehicle === 'function' ? await getGuestVehicle() : null);

    if (resolvedGuestVehicle) {
      try {
        claimedVehicle = await transferGuestVehicleToAccount(
          resolvedGuestVehicle,
        );
        if (claimedVehicle?.id) {
          authUser = {
            ...authUser,
            active_vehicle_id: claimedVehicle.id,
          };
        }
      } catch (error) {
        console.warn(
          'Failed to claim guest vehicle during OTP completion:',
          error?.message || error,
        );
      }
    }

    const {
      accountVehicles,
      hasAccountVehicles,
    } = await loadAccountVehicles();

    const finalHasVehicles = Boolean(claimedVehicle || hasAccountVehicles);
    setIsNewRegistration(!finalHasVehicles, authUser?.id ?? authUser?.uid ?? null);

    await persistAuthState(
      verifiedToken,
      authUser,
    );

    return {
      user: authUser,
      token: verifiedToken,
      claimedVehicle,
      accountVehicles:
        claimedVehicle && (!Array.isArray(accountVehicles) || accountVehicles.length === 0)
          ? [claimedVehicle]
          : accountVehicles,
      hasAccountVehicles: finalHasVehicles,
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
    let firebaseUser = null;
    let firebaseError = null;

    try {
      const userCredential =
        await loginWithEmail(
          email,
          password,
        );

      firebaseUser =
        userCredential?.user || null;
    } catch (fbErr) {
      firebaseError = fbErr;
    }

    let backendAuth = null;
    try {
      backendAuth =
        await loginWithBackend(
          email,
          password,
        );
    } catch (backendErr) {
      // The server (authoritative for email verification) refused to issue a
      // token because this account never completed OTP verification.
      const backendBody = backendErr?.response?.data;
      if (
        backendErr?.response?.status === 403 &&
        backendBody?.code === 'email_not_verified'
      ) {
        try {
          await logoutFirebase();
        } catch (e) {
          // non-fatal
        }

        return {
          requiresOtp: true,
          email: backendBody?.data?.email || String(email).trim(),
          cooldownSeconds: backendBody?.data?.cooldown_seconds || 60,
          expiresInSeconds: backendBody?.data?.expires_in_seconds || 600,
        };
      }

      if (firebaseError) {
        throw firebaseError;
      }
      throw backendErr;
    }

    const authToken =
      backendAuth?.token ||
      null;

    if (!authToken && !firebaseUser) {
      throw firebaseError || new Error('Firebase login failed.');
    }

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
      legalMeta = null,
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
            legalMeta,
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
        const resolvedGuestVehicle =
          guestVehicle ||
          (typeof getGuestVehicle === 'function' ? await getGuestVehicle() : null);

        if (resolvedGuestVehicle) {
          try {
            claimedVehicle =
              await transferGuestVehicleToAccount(
                resolvedGuestVehicle,
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
      const currentToken =
        (tokenRef.current && String(tokenRef.current).trim()) ||
        (await getToken());

      const resolvedToken =
        currentToken &&
        String(currentToken).trim()
          ? currentToken
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

      // Backend sessions can be restored without a Firebase session (for
      // example, saved accounts or users signed in through Laravel). The
      // backend profile update above is authoritative for those sessions, so
      // do not fail the save just because Firebase has no current user.
      try {
        await updateFirebaseUserProfile({
          displayName:
            updatedProfile.displayName,

          photoURL:
            updatedProfile.photoURL,
        });
      } catch (firebaseError) {
        const firebaseMessage = String(firebaseError?.message || firebaseError || '');
        if (!/no authenticated firebase user/i.test(firebaseMessage)) {
          console.warn('[AuthContext] Firebase profile sync skipped:', firebaseMessage);
        }
      }

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

  refreshUserRef.current = refreshUser;

  /*
  |--------------------------------------------------------------------------
  | LOGOUT
  |--------------------------------------------------------------------------
  */

  const logout =
    async () => {
      const tokenSnapshot =
        (tokenRef.current && String(tokenRef.current).trim()) ||
        (await getToken().catch(() => null));

      /*
       * Attempt to revoke the Sanctum token on the server BEFORE wiping it.
       * The result is reported honestly: `remoteRevoked` is true only when
       * the server confirmed the revocation.
       */
      let remoteRevoked = false;
      let remoteError = null;

      if (tokenSnapshot) {
        try {
          await Promise.race([
            logoutWithBackend(),
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error('Logout request timed out.')),
                8000,
              ),
            ),
          ]);
          remoteRevoked = true;
        } catch (error) {
          if (error?.response?.status === 401) {
            // Token was already invalid/revoked server-side: nothing to revoke.
            remoteRevoked = true;
          } else {
            remoteError = error;
            console.warn(
              'Server-side logout could not be confirmed:',
              error?.message || error,
            );
          }
        }
      }

      // Local cleanup always runs, even when the network is unavailable.
      await resetLocalSession();

      return {
        remoteRevoked,
        // true when the user had a token but the server did not confirm.
        revocationUnconfirmed: Boolean(tokenSnapshot) && !remoteRevoked,
        error: remoteError,
      };
    };

  /*
   * Refreshes the account from Laravel. Email verification state is owned by
   * the server (`email_verified_at`, set by the OTP service); this never
   * stamps a verification locally.
   */
  const verifyUserEmail = async () => {
    const serverUser = await getMeApi();
    if (!serverUser) {
      throw new Error('Unable to confirm email verification with the server.');
    }

    const updatedUser = buildAuthUser(null, {
      ...(userRef.current || {}),
      ...serverUser,
    });
    await updateUser(updatedUser);
    return updatedUser;
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
