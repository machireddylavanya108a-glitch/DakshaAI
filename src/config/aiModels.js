import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  DEFAULT_OPENROUTER_VISION_MODEL,
  resolveRuntimeEnv
} from '../utils/runtimeConfigValidation.js';

const runtimeEnv = resolveRuntimeEnv();

function normalizeModelId(value) {
  return String(value || '').trim();
}

function resolveConfiguredModel(primaryValue, fallbackValues = []) {
  const values = [normalizeModelId(primaryValue), ...fallbackValues.map(normalizeModelId)].filter(Boolean);
  return values[0] || '';
}

export const AI_MODEL_CONFIG = {
  TEXT_PRIMARY_MODEL: resolveConfiguredModel(runtimeEnv.VITE_OPENROUTER_TEXT_MODEL, [DEFAULT_OPENROUTER_TEXT_MODEL]),
  TEXT_FALLBACK_MODELS: [
    normalizeModelId(runtimeEnv.VITE_OPENROUTER_TEXT_FALLBACK_MODEL),
    normalizeModelId(runtimeEnv.VITE_OPENROUTER_TEXT_FALLBACK_MODEL_2)
  ].filter(Boolean),
  VISION_PRIMARY_MODEL: resolveConfiguredModel(runtimeEnv.VITE_OPENROUTER_VISION_MODEL, [DEFAULT_OPENROUTER_VISION_MODEL]),
  VISION_FALLBACK_MODELS: [
    normalizeModelId(runtimeEnv.VITE_OPENROUTER_VISION_FALLBACK_MODEL),
    normalizeModelId(runtimeEnv.VITE_OPENROUTER_VISION_FALLBACK_MODEL_2)
  ].filter(Boolean)
};

export function getConfiguredTextModels() {
  return [AI_MODEL_CONFIG.TEXT_PRIMARY_MODEL, ...AI_MODEL_CONFIG.TEXT_FALLBACK_MODELS].filter(Boolean);
}

export function getConfiguredVisionModels() {
  return [AI_MODEL_CONFIG.VISION_PRIMARY_MODEL, ...AI_MODEL_CONFIG.VISION_FALLBACK_MODELS].filter(Boolean);
}
