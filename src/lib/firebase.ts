import { initializeApp, getApps, getApp, FirebaseOptions } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// A function to check if all necessary keys are provided
const checkFirebaseConfig = (config: FirebaseOptions): boolean => {
    return !!config.apiKey && 
           !config.apiKey.includes('HERE') &&
           !!config.projectId &&
           !!config.authDomain;
}

export const isFirebaseConfigured = checkFirebaseConfig(firebaseConfig);

// Initialize Firebase only if the configuration is valid
const app = isFirebaseConfigured && !getApps().length ? initializeApp(firebaseConfig) : (getApps().length ? getApp() : null);
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

// Throw an error in a non-browser environment if Firebase is not configured,
// which can help during the build process to identify issues.
if (typeof window === 'undefined' && !isFirebaseConfigured) {
    console.warn("FIREBASE WARNING: Firebase configuration is missing or incomplete. The application will be in a degraded state. Please check your .env file.");
}


export { app, auth, db };
