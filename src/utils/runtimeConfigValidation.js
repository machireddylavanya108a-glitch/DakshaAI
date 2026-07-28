const emittedWarnings = new Set();

export const firebaseConfigKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID'
];

export const openRouterConfigKeys = [
  'VITE_OPENROUTER_API_KEY'
];

export const DEFAULT_OPENROUTER_TEXT_MODEL = 'openai/gpt-4.1-mini';
export const DEFAULT_OPENROUTER_VISION_MODEL = 'openai/gpt-4.1-mini';

export function resolveRuntimeEnv() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env;
  }
  return {};
}

function normalizeValue(value) {
  return String(value || '').trim();
}

function missingKeysFromGroup(groupKeys = [], env = {}) {
  return groupKeys.filter((key) => !normalizeValue(env[key]));
}

function warnOnce(logger, key, message) {
  if (emittedWarnings.has(key)) return;
  emittedWarnings.add(key);
  logger.warn(message);
}

function errorOnce(logger, key, message) {
  if (emittedWarnings.has(key)) return;
  emittedWarnings.add(key);
  logger.error(message);
}

export function resetRuntimeConfigWarningState() {
  emittedWarnings.clear();
}

export function validateRuntimeConfig(envInput = resolveRuntimeEnv(), logger = console) {
  const env = envInput || {};
  const firebaseMissing = missingKeysFromGroup(firebaseConfigKeys, env);
  const openRouterMissing = missingKeysFromGroup(openRouterConfigKeys, env);

  const textModel = normalizeValue(env.VITE_OPENROUTER_TEXT_MODEL) || DEFAULT_OPENROUTER_TEXT_MODEL;
  const visionModel = normalizeValue(env.VITE_OPENROUTER_VISION_MODEL) || DEFAULT_OPENROUTER_VISION_MODEL;
  const aiGenerationEnabled = Boolean(normalizeValue(env.VITE_OPENROUTER_API_KEY));

  if (firebaseMissing.length > 0) {
    warnOnce(logger, 'firebase-missing', `[Firebase] Missing runtime config values: ${firebaseMissing.join(', ')}`);
    errorOnce(logger, 'firebase-auth-warning', '[Firebase] Authentication may fail until required Firebase configuration values are provided.');
  }

  if (openRouterMissing.length > 0) {
    warnOnce(logger, 'openrouter-missing', `[AI] Missing OpenRouter runtime config values: ${openRouterMissing.join(', ')}`);
    warnOnce(logger, 'openrouter-availability', '[AI] AI generation is disabled until VITE_OPENROUTER_API_KEY is provided.');
  }

  return {
    firebase: {
      valid: firebaseMissing.length === 0,
      missing: firebaseMissing
    },
    openRouter: {
      complete: openRouterMissing.length === 0,
      missing: openRouterMissing,
      textModel,
      visionModel,
      aiGenerationEnabled
    },
    valid: firebaseMissing.length === 0
  };
}
