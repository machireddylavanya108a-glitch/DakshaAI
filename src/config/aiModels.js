import { AI_CONFIG, getTextModelCandidates, getVisionModelCandidates } from './aiConfig.js';

export const AI_MODEL_CONFIG = {
  TEXT_PRIMARY_MODEL: AI_CONFIG.textModel,
  TEXT_FALLBACK_MODELS: getTextModelCandidates().slice(1),
  VISION_PRIMARY_MODEL: AI_CONFIG.visionModel,
  VISION_FALLBACK_MODELS: getVisionModelCandidates().slice(1)
};

export function getConfiguredTextModels() {
  return [AI_MODEL_CONFIG.TEXT_PRIMARY_MODEL, ...AI_MODEL_CONFIG.TEXT_FALLBACK_MODELS].filter(Boolean);
}

export function getConfiguredVisionModels() {
  return [AI_MODEL_CONFIG.VISION_PRIMARY_MODEL, ...AI_MODEL_CONFIG.VISION_FALLBACK_MODELS].filter(Boolean);
}
