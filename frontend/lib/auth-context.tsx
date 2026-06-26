'use client';

/**
 * Authentication Context and Provider
 *
 * Manages authentication state across the application using Firebase Auth.
 * Provides user state, loading indicators, and authentication functions.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  getIdToken,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import { useAuthStore } from './store';
import api from './api';

// Types
interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_id?: string;
  firebase_uid?: string;
}

interface AuthContextType {
  // State
  user: User | null;
  firebaseUser: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  clearError: () => void;

  // Development helpers
  devSignIn: (uid: string) => Promise<void>;
  isFirebaseEnabled: boolean;
}

// Create context with undefined default
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider Component
 *
 * Wraps the application and provides authentication state and functions.
 * Handles Firebase auth state changes and syncs with the backend.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Local state
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Zustand store for persistent auth state
  const { user, setUser, setToken, logout: clearStore, _hasHydrated } = useAuthStore();

  // Check if Firebase is properly configured
  const isFirebaseEnabled = isFirebaseConfigured();

  // Wait for store to hydrate before determining auth state
  useEffect(() => {
    if (_hasHydrated && !isFirebaseEnabled) {
      // Store has hydrated and Firebase is not configured
      // If we have a user from localStorage, we're authenticated
      setIsLoading(false);
    }
  }, [_hasHydrated, isFirebaseEnabled]);

  /**
   * Sync user data with backend after Firebase auth
   */
  const syncUserWithBackend = useCallback(
    async (firebaseUser: FirebaseUser) => {
      try {
        // Get Firebase ID token
        const idToken = await getIdToken(firebaseUser);

        // Call backend to verify token and get user profile
        const response = await api.login(idToken);

        if (response) {
          setUser(response as User);
          setToken(idToken);
          api.setToken(idToken);
        }
      } catch (err) {
        console.error('Failed to sync user with backend:', err);
        setError(err instanceof Error ? err.message : 'Failed to authenticate with server');
      }
    },
    [setUser, setToken]
  );

  /**
   * Set up API client callbacks for token refresh
   */
  useEffect(() => {
    // Set up the token refresh callback
    api.setTokenRefreshCallback(async () => {
      if (firebaseUser) {
        try {
          const newToken = await getIdToken(firebaseUser, true);
          setToken(newToken);
          api.setToken(newToken);
          return newToken;
        } catch (err) {
          console.error('[Auth] Token refresh callback failed:', err);
          return null;
        }
      }
      return null;
    });

    // Set up the logout callback for when token refresh fails
    api.setLogoutCallback(() => {
      console.log('[Auth] API triggered logout due to auth failure');
      setFirebaseUser(null);
      clearStore();
      api.setToken(null);
      setError('Your session has expired. Please sign in again.');
    });
  }, [firebaseUser, setToken, clearStore]);

  /**
   * Listen for Firebase auth state changes
   */
  useEffect(() => {
    // Skip Firebase listener if not configured (dev mode)
    // The hydration effect will handle setting isLoading to false
    if (!isFirebaseEnabled || !auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        await syncUserWithBackend(firebaseUser);
      } else {
        // User signed out
        setUser(null);
        setToken(null);
        api.setToken(null);
      }

      setIsLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [isFirebaseEnabled, syncUserWithBackend, setUser, setToken]);

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        if (!isFirebaseEnabled || !auth) {
          throw new Error('Firebase is not configured. Use dev login instead.');
        }

        const result = await signInWithEmailAndPassword(auth, email, password);
        // Auth state change listener will handle the rest
        setFirebaseUser(result.user);
      } catch (err) {
        const errorMessage = getFirebaseErrorMessage((err as { code?: string } | null)?.code ?? '');
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [isFirebaseEnabled]
  );

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isFirebaseEnabled && auth) {
        await firebaseSignOut(auth);
      }

      // Clear all auth state
      setFirebaseUser(null);
      clearStore();
      api.setToken(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign out');
    } finally {
      setIsLoading(false);
    }
  }, [isFirebaseEnabled, clearStore]);

  /**
   * Refresh the Firebase ID token
   */
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (!firebaseUser) {
      return null;
    }

    try {
      const newToken = await getIdToken(firebaseUser, true);
      setToken(newToken);
      api.setToken(newToken);
      return newToken;
    } catch (err) {
      console.error('Failed to refresh token:', err);
      setError('Session expired. Please sign in again.');
      return null;
    }
  }, [firebaseUser, setToken]);

  /**
   * Development sign-in (bypasses Firebase)
   *
   * Supports two modes:
   * 1. With backend: Calls API to verify/seed user
   * 2. Offline mode: Creates mock user locally for UI testing
   */
  const devSignIn = useCallback(
    async (uid: string) => {
      setIsLoading(true);
      setError(null);

      // Guard: demo/dev sign-in must never run in production, nor when real Firebase
      // auth is configured — it mints demo users (including elevated roles like Admin/
      // Dean) without real authentication.
      if (process.env.NODE_ENV === 'production' || isFirebaseEnabled) {
        setError('Development sign-in is disabled in this environment.');
        setIsLoading(false);
        throw new Error('Development sign-in is disabled.');
      }

      // Demo account definitions
      const demoAccounts: Record<string, { email: string; role: string; full_name: string; department_id: string }> = {
        'demo-faculty-001': { email: 'faculty@ccc.edu', role: 'Faculty', full_name: 'Demo Faculty', department_id: 'dept-math-001' },
        'demo-chair-001': { email: 'chair@ccc.edu', role: 'Chair', full_name: 'Demo Chair', department_id: 'dept-math-001' },
        'demo-dean-001': { email: 'dean@ccc.edu', role: 'Dean', full_name: 'Demo Dean', department_id: 'div-stem-001' },
        'demo-admin-001': { email: 'admin@ccc.edu', role: 'Admin', full_name: 'Demo Admin', department_id: 'college-001' },
      };

      try {
        // Try to get user from backend
        const response = await api.login(uid);

        if (response) {
          setUser(response as User);
          setToken(uid);
          api.setToken(uid);
        }
      } catch (err) {
        // Backend not available - use offline mode with mock user
        const account = demoAccounts[uid];
        if (account) {
          console.log('[Auth] Backend unavailable, using offline dev mode');

          // Create mock user locally for UI testing
          const mockUser: User = {
            id: uid,
            email: account.email,
            full_name: account.full_name,
            role: account.role,
            department_id: account.department_id,
            firebase_uid: uid,
          };

          setUser(mockUser);
          setToken(`dev-token-${uid}`);
          api.setToken(`dev-token-${uid}`);

          // Successfully logged in via offline mode
          setIsLoading(false);
          return;
        } else {
          setError(err instanceof Error ? err.message : 'Authentication failed');
          throw err;
        }
      } finally {
        setIsLoading(false);
      }
    },
    [setUser, setToken, isFirebaseEnabled]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Context value
  const value: AuthContextType = {
    user,
    firebaseUser,
    isLoading,
    isAuthenticated: !!user,
    error,
    signIn,
    signOut,
    refreshToken,
    clearError,
    devSignIn,
    isFirebaseEnabled,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth Hook
 *
 * Custom hook to access authentication context.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * Convert Firebase error codes to user-friendly messages
 */
function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    default:
      return 'Authentication failed. Please try again.';
  }
}

export default AuthContext;
