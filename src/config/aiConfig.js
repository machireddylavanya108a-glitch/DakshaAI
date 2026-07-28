const runtimeEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
const emittedWarnings = new Set();

function normalize(value) {
  return String(value || '').trim();
}

function warnOnce(key, message, logger = console) {
  if (emittedWarnings.has(key)) return;
  emittedWarnings.add(key);
  logger.warn(message);
}

export const AI_CONFIG = {
  provider: 'openrouter',
  textModel: normalize(runtimeEnv.VITE_OPENROUTER_TEXT_MODEL) || 'openai/gpt-4.1-mini',
  visionModel: normalize(runtimeEnv.VITE_OPENROUTER_VISION_MODEL) || 'openai/gpt-4.1-mini',
  apiKey: normalize(runtimeEnv.VITE_OPENROUTER_API_KEY),
  baseUrl: 'https://openrouter.ai/api/v1'
};

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
