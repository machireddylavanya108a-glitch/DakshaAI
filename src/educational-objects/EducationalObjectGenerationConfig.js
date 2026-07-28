export const EDUCATIONAL_OBJECT_GENERATOR_VERSION = 'phase-3b-v1';

export const EDUCATIONAL_OBJECT_GENERATION_DEFAULTS = {
  qualityThreshold: 65,
  refinementPasses: 2,
  maxRefinementPasses: 3,
  fallbackEnabled: true,
  useCache: true,
  forceGenerate: false,
  maximumObjects: 50,
  performanceProfile: 'balanced'
};

export const EDUCATIONAL_OBJECT_PROFILE_LIMITS = {
  low: { maximumObjects: 20 },
  balanced: { maximumObjects: 50 },
  high: { maximumObjects: 100 },
  auto: { maximumObjects: 50 }
};

function toFinite(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(min, value, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

export function stableHash(input = '') {
  const text = String(input || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

export function stableSortByKey(list = [], key = 'id') {
  return [...(Array.isArray(list) ? list : [])].sort((left, right) => {
    const leftValue = String(left?.[key] || '');
    const rightValue = String(right?.[key] || '');
    return leftValue.localeCompare(rightValue);
  });
}

export function normalizePerformanceProfile(profile = 'balanced', runtimeCapabilities = {}) {
  const token = String(profile || 'balanced').toLowerCase().trim();
  if (token !== 'auto') {
    return EDUCATIONAL_OBJECT_PROFILE_LIMITS[token] ? token : 'balanced';
  }

  const perfHint = String(runtimeCapabilities?.performanceTier || runtimeCapabilities?.gpuTier || '').toLowerCase().trim();
  if (perfHint === 'low') return 'low';
  if (perfHint === 'high') return 'high';

  const memoryGb = toFinite(runtimeCapabilities?.deviceMemoryGb, 0);
  const logicalCores = toFinite(runtimeCapabilities?.logicalCores, 0);

  if (memoryGb >= 12 && logicalCores >= 8) return 'high';
  if ((memoryGb > 0 && memoryGb <= 4) || (logicalCores > 0 && logicalCores <= 4)) return 'low';
  return 'balanced';
}

export function resolveEducationalObjectGenerationConfig(context = {}, options = {}) {
  const runtimeCapabilities = context.runtimeCapabilities || {};
  const selectedProfile = normalizePerformanceProfile(
    options.performanceProfile || context.performanceProfile || EDUCATIONAL_OBJECT_GENERATION_DEFAULTS.performanceProfile,
    runtimeCapabilities
  );

  const profileLimits = EDUCATIONAL_OBJECT_PROFILE_LIMITS[selectedProfile] || EDUCATIONAL_OBJECT_PROFILE_LIMITS.balanced;
  const maximumObjects = clamp(1, toFinite(options.maximumObjects, profileLimits.maximumObjects), 200);

  return {
    ...EDUCATIONAL_OBJECT_GENERATION_DEFAULTS,
    ...options,
    profile: selectedProfile,
    maximumObjects,
    qualityThreshold: clamp(0, toFinite(options.qualityThreshold, EDUCATIONAL_OBJECT_GENERATION_DEFAULTS.qualityThreshold), 100),
    refinementPasses: clamp(0, toFinite(options.refinementPasses, EDUCATIONAL_OBJECT_GENERATION_DEFAULTS.refinementPasses), EDUCATIONAL_OBJECT_GENERATION_DEFAULTS.maxRefinementPasses),
    runtimeCapabilities
  };
}
