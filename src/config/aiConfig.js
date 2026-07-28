const runtimeEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
const emittedWarnings = new Set();

export const DEFAULT_OPENROUTER_TEXT_MODEL = 'openai/gpt-4.1-mini';
export const DEFAULT_OPENROUTER_VISION_MODEL = 'openai/gpt-4.1-mini';
export const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

function normalize(value) {
  return String(value || '').trim();
}

function warnOnce(key, message, logger = console) {
  if (emittedWarnings.has(key)) return;
  emittedWarnings.add(key);
  logger.warn(message);
}

export function createAiConfig(envInput = runtimeEnv) {
  const env = envInput || {};
  return {
    provider: 'openrouter',
    textModel: normalize(env.VITE_OPENROUTER_TEXT_MODEL) || DEFAULT_OPENROUTER_TEXT_MODEL,
    visionModel: normalize(env.VITE_OPENROUTER_VISION_MODEL) || DEFAULT_OPENROUTER_VISION_MODEL,
    apiKey: normalize(env.VITE_OPENROUTER_API_KEY),
    baseUrl: normalize(env.VITE_OPENROUTER_BASE_URL) || DEFAULT_OPENROUTER_BASE_URL
  };
}

export const AI_CONFIG = createAiConfig(runtimeEnv);

export function getTextModelCandidates() {
  return [
    AI_CONFIG.textModel,
    normalize(runtimeEnv.VITE_OPENROUTER_TEXT_FALLBACK_MODEL),
    normalize(runtimeEnv.VITE_OPENROUTER_TEXT_FALLBACK_MODEL_2)
  ].filter(Boolean);
}

export function getVisionModelCandidates() {
  return [
    AI_CONFIG.visionModel,
    normalize(runtimeEnv.VITE_OPENROUTER_VISION_FALLBACK_MODEL),
    normalize(runtimeEnv.VITE_OPENROUTER_VISION_FALLBACK_MODEL_2)
  ].filter(Boolean);
}

export function isOpenRouterEnabled() {
  return Boolean(AI_CONFIG.apiKey);
}

export function reportAiConfigWarnings(logger = console) {
  if (!AI_CONFIG.apiKey) {
    warnOnce('openrouter-api-key-missing', '[AI] Missing OpenRouter API key. AI generation is disabled until VITE_OPENROUTER_API_KEY is set.', logger);
  }

  if (!normalize(runtimeEnv.VITE_OPENROUTER_TEXT_MODEL)) {
    warnOnce('openrouter-text-model-default', `[AI] VITE_OPENROUTER_TEXT_MODEL is not set. Using default model: ${AI_CONFIG.textModel}.`, logger);
  }

  if (!normalize(runtimeEnv.VITE_OPENROUTER_VISION_MODEL)) {
    warnOnce('openrouter-vision-model-default', `[AI] VITE_OPENROUTER_VISION_MODEL is not set. Using default model: ${AI_CONFIG.visionModel}.`, logger);
  }
}

export function resetAiConfigWarningState() {
  emittedWarnings.clear();
}
