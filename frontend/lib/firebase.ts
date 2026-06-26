/**
 * Firebase Configuration and Initialization
 *
 * This module initializes Firebase for the CALIPAR frontend application.
 * It exports the Firebase app instance and authentication service.
 *
 * Environment variables required:
 * - NEXT_PUBLIC_FIREBASE_API_KEY
 * - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
 * - NEXT_PUBLIC_FIREBASE_PROJECT_ID
 * - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 * - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
 * - NEXT_PUBLIC_FIREBASE_APP_ID
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase is properly configured before initializing
const hasRequiredConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

// Initialize Firebase - prevent duplicate initialization
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (hasRequiredConfig) {
  if (getApps().length === 0) {
    // No apps initialized yet, create new app
    app = initializeApp(firebaseConfig);
  } else {
    // App already exists, use existing instance
    app = getApp();
  }

  // Initialize Authentication
  auth = getAuth(app);

  // Connect to Auth Emulator in development (if configured)
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL
  ) {
    connectAuthEmulator(auth, process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL, {
      disableWarnings: true,
    });
  }
} else {
  console.warn('[Firebase] Not initialized - missing required configuration. Running in dev mode without Firebase.');
}

/**
 * Check if Firebase is properly configured
 * @returns boolean indicating if all required config values are present
 */
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
};

/**
 * Get Firebase configuration status for debugging
 * @returns object with configuration status (does not expose actual values)
 */
export const getFirebaseConfigStatus = () => ({
  hasApiKey: Boolean(firebaseConfig.apiKey),
  hasAuthDomain: Boolean(firebaseConfig.authDomain),
  hasProjectId: Boolean(firebaseConfig.projectId),
  hasStorageBucket: Boolean(firebaseConfig.storageBucket),
  hasMessagingSenderId: Boolean(firebaseConfig.messagingSenderId),
  hasAppId: Boolean(firebaseConfig.appId),
  isFullyConfigured: isFirebaseConfigured(),
});

export { app, auth };
export default app;
