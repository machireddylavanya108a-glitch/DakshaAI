import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { resolveRuntimeEnv, validateRuntimeConfig as validateGroupedRuntimeConfig } from '../utils/runtimeConfigValidation.js';

const runtimeEnv = resolveRuntimeEnv();

export function validateRuntimeConfig(env = runtimeEnv, logger = console) {
  return validateGroupedRuntimeConfig(env, logger);
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
