import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';

const rawApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
const isConfigured = Boolean(
  rawApiKey &&
  rawApiKey.trim().length > 5 &&
  rawApiKey !== 'your_firebase_api_key_here'
);

const firebaseConfig = {
  apiKey: rawApiKey || 'AIzaSyPlaceholderKeyForBuildValidation000',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'app.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'app',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'app.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:1234567890:web:mock',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-MOCK',
};

// Safe App getter
function getFirebaseApp(): FirebaseApp | null {
  try {
    if (getApps().length > 0) {
      return getApp();
    }
    return initializeApp(firebaseConfig);
  } catch {
    return null;
  }
}

// Safe Auth getter
export function getFirebaseAuth(): Auth | null {
  try {
    const fbApp = getFirebaseApp();
    if (!fbApp) return null;
    return getAuth(fbApp);
  } catch {
    return null;
  }
}

// Default export auth instance with safe fallback
export const auth: Auth | null = getFirebaseAuth();

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign in with Google Popup
 */
export async function signInWithGooglePopup(): Promise<FirebaseUser> {
  const currentAuth = getFirebaseAuth();
  if (!currentAuth) {
    throw new Error('Firebase Authentication is not available or configured with valid credentials.');
  }
  const result = await signInWithPopup(currentAuth, googleProvider);
  return result.user;
}

/**
 * Sign in with Email and Password using Firebase Auth
 */
export async function signInWithFirebaseEmail(email: string, password: string): Promise<FirebaseUser> {
  const currentAuth = getFirebaseAuth();
  if (!currentAuth) {
    throw new Error('Firebase Authentication is not available or configured with valid credentials.');
  }
  const result = await signInWithEmailAndPassword(currentAuth, email, password);
  return result.user;
}

/**
 * Sign up with Email and Password using Firebase Auth
 */
export async function signUpWithFirebaseEmail(email: string, password: string): Promise<FirebaseUser> {
  const currentAuth = getFirebaseAuth();
  if (!currentAuth) {
    throw new Error('Firebase Authentication is not available or configured with valid credentials.');
  }
  const result = await createUserWithEmailAndPassword(currentAuth, email, password);
  return result.user;
}

/**
 * Sign out from Firebase
 */
export async function signOutFirebase(): Promise<void> {
  const currentAuth = getFirebaseAuth();
  if (currentAuth) {
    await firebaseSignOut(currentAuth);
  }
}

export default getFirebaseApp();

