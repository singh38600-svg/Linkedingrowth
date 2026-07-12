import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Import config directly using Vite's json import support
import config from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
  measurementId: config.measurementId
};

let app;
let auth: any;
let db: any;
const googleProvider = new GoogleAuthProvider();

// Standard scopes for Google Sign-In
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

try {
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase Configuration missing API key');
  }
  
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  auth = getAuth(app);
  
  // Set persistence to LOCAL so the login persists across tab reloads
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error('Failed to set persistent auth:', err);
  });

  // If a custom Firestore database ID is specified in the config, use it
  const dbId = config.firestoreDatabaseId || '(default)';
  db = getFirestore(app, dbId);

} catch (error) {
  console.error('Firebase initialization failed:', error);
}

export { app, auth, db, googleProvider };

export interface AuthErrorDetails {
  code: string;
  message: string;
  friendlyMessage: string;
}

export function parseAuthError(error: any): AuthErrorDetails {
  const code = error?.code || 'unknown';
  const message = error?.message || String(error);
  
  let friendlyMessage = 'An unexpected authentication error occurred. Please try again.';
  
  if (code === 'auth/popup-blocked') {
    friendlyMessage = 'The Google Sign-In popup was blocked by your browser. Please enable popups for this site and try again.';
  } else if (code === 'auth/popup-closed-by-user') {
    friendlyMessage = 'The sign-in window was closed before completing. Please try again.';
  } else if (code === 'auth/network-request-failed') {
    friendlyMessage = 'A network error occurred. Please check your internet connection and try again.';
  } else if (code === 'auth/cancelled-popup-request') {
    friendlyMessage = 'Sign-in request was cancelled. Only one popup request can be active at a time.';
  } else if (code === 'auth/configuration-not-found' || code === 'auth/internal-error') {
    friendlyMessage = 'Authentication configuration is missing or invalid. Please contact the administrator.';
  } else if (code === 'auth/provider-disabled') {
    friendlyMessage = 'Google Sign-In is not enabled on this project. Please check your Firebase Authentication settings.';
  }
  
  return { code, message, friendlyMessage };
}

export async function signInWithGoogle() {
  if (!auth) {
    throw new Error('Firebase Authentication is not initialized or configured.');
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    const parsed = parseAuthError(error);
    throw new Error(parsed.friendlyMessage);
  }
}

export async function signOut() {
  if (!auth) return;
  try {
    await firebaseSignOut(auth);
  } catch (error: any) {
    console.error('Sign out error:', error);
    throw new Error('Failed to sign out securely. Please refresh and try again.');
  }
}
