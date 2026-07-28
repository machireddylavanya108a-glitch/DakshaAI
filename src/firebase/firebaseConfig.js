import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const runtimeEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

export function validateRuntimeConfig() {
  const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_OPENROUTER_API_KEY',
    'VITE_OPENROUTER_TEXT_MODEL',
    'VITE_OPENROUTER_VISION_MODEL'
  ];

  const missing = requiredKeys.filter((key) => !runtimeEnv[key]);
  if (missing.length > 0) {
    console.warn(`[Firebase] Missing runtime config values: ${missing.join(', ')}`);
  }

  return { valid: missing.length === 0, missing };
}

const configCheck = validateRuntimeConfig();
const firebaseConfig = {
  apiKey: runtimeEnv.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: runtimeEnv.VITE_FIREBASE_AUTH_DOMAIN || 'daksha-ai-dd17d.firebaseapp.com',
  databaseURL: runtimeEnv.VITE_FIREBASE_DATABASE_URL || '',
  projectId: runtimeEnv.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: runtimeEnv.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.firebasestorage.app',
  messagingSenderId: runtimeEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: runtimeEnv.VITE_FIREBASE_APP_ID || '1:000000000000:web:demo'
};

if (!configCheck.valid) {
  console.error('[Firebase] Authentication may fail until the required configuration values are provided.');
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
