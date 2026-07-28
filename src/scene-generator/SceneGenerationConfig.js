import { SCENE_SCHEMA_LATEST_VERSION } from './SceneSchema.js';

export const DEFAULT_SCENE_MAX_TOKENS = 2500;
export const MAX_SCENE_MAX_TOKENS = 4096;
export const DEFAULT_SCENE_TIMEOUT_MS = 30000;
export const DEFAULT_SCENE_RETRIES = 2;
export const MAX_SCENE_RETRIES = 3;

export const SCENE_GENERATION_DEFAULTS = {
  enabled: true,
  useAI: true,
  useCache: true,
  timeoutMs: DEFAULT_SCENE_TIMEOUT_MS,
  maxRetries: DEFAULT_SCENE_RETRIES,
  maxOutputTokens: DEFAULT_SCENE_MAX_TOKENS,
  hardMaxOutputTokens: MAX_SCENE_MAX_TOKENS,
  fallbackEnabled: true,
  schemaVersion: SCENE_SCHEMA_LATEST_VERSION,
  diagnosticsEnabled: true,
  provider: 'openrouter',
  model: null,
  locale: 'en',
  performanceProfile: 'balanced'
};

function toPositiveInt(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.round(numeric);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function normalizePerformanceProfile(profile = 'balanced') {
  const normalized = String(profile || 'balanced').toLowerCase().trim();
  if (['low', 'balanced', 'high', 'auto'].includes(normalized)) return normalized;
  return 'balanced';
}

export function getPerformanceLimits(profile = 'balanced') {
  const resolved = normalizePerformanceProfile(profile);
  if (resolved === 'low') {
    return { maxObjects: 20, maxTimelineSteps: 8, maxAnimations: 12, effectsLevel: 'minimal' };
  }
  if (resolved === 'high') {
    return { maxObjects: 100, maxTimelineSteps: 24, maxAnimations: 40, effectsLevel: 'rich' };
  }
  if (resolved === 'auto') {
    return { maxObjects: 50, maxTimelineSteps: 16, maxAnimations: 24, effectsLevel: 'balanced' };
  }
  return { maxObjects: 50, maxTimelineSteps: 16, maxAnimations: 24, effectsLevel: 'balanced' };
}

export function normalizeSceneGenerationConfig(options = {}) {
  const merged = {
    ...SCENE_GENERATION_DEFAULTS,
    ...(options || {})
  };

  const hardCap = clamp(
    toPositiveInt(merged.hardMaxOutputTokens, MAX_SCENE_MAX_TOKENS),
    1200,
    MAX_SCENE_MAX_TOKENS
  );

  const maxOutputTokens = clamp(
    toPositiveInt(merged.maxOutputTokens, DEFAULT_SCENE_MAX_TOKENS),
    600,
    hardCap
  );

  const timeoutMs = clamp(
    toPositiveInt(merged.timeoutMs, DEFAULT_SCENE_TIMEOUT_MS),
    100,
    120000
  );

  const maxRetries = clamp(
    toPositiveInt(merged.maxRetries, DEFAULT_SCENE_RETRIES),
    0,
    MAX_SCENE_RETRIES
  );

  return {
    ...merged,
    hardMaxOutputTokens: hardCap,
    maxOutputTokens,
    timeoutMs,
    maxRetries,
    performanceProfile: normalizePerformanceProfile(merged.performanceProfile)
  };
}
