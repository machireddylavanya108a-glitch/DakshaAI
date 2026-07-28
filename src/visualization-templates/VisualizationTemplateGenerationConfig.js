export const VISUALIZATION_TEMPLATE_GENERATOR_VERSION = 'phase-2d-v1';

export const VISUALIZATION_TEMPLATE_GENERATION_DEFAULTS = {
  qualityThreshold: 65,
  refinementPasses: 2,
  maxRefinementPasses: 3,
  fallbackEnabled: true,
  useCache: true,
  registerGeneratedTemplate: true,
  forceGenerate: false,
  maximumSlots: 40,
  maximumRegions: 20,
  maximumRelationships: 120,
  allowFallbackRegistration: false
};

export const VISUALIZATION_TEMPLATE_PROFILE_LIMITS = {
  low: { maximumSlots: 16, maximumRegions: 8, maximumRelationships: 40 },
  balanced: { maximumSlots: 40, maximumRegions: 20, maximumRelationships: 120 },
  high: { maximumSlots: 80, maximumRegions: 40, maximumRelationships: 300 },
  auto: { maximumSlots: 40, maximumRegions: 20, maximumRelationships: 120 }
};

function toFinite(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(min, value, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

export function normalizeProfile(profile = 'balanced', runtimeCapabilities = {}, deviceCapabilities = {}) {
  const token = String(profile || 'balanced').toLowerCase().trim();
  if (token !== 'auto') {
    return VISUALIZATION_TEMPLATE_PROFILE_LIMITS[token] ? token : 'balanced';
  }

  const perfHint = String(runtimeCapabilities?.performanceTier || runtimeCapabilities?.gpuTier || deviceCapabilities?.performanceTier || '').toLowerCase();
  if (perfHint === 'low') return 'low';
  if (perfHint === 'high') return 'high';

  const memoryGb = toFinite(runtimeCapabilities?.deviceMemoryGb ?? deviceCapabilities?.memoryGb, 0);
  const cpuCores = toFinite(runtimeCapabilities?.logicalCores ?? deviceCapabilities?.logicalCores, 0);

  if (memoryGb >= 12 && cpuCores >= 8) return 'high';
  if (memoryGb > 0 && memoryGb <= 4) return 'low';
  if (cpuCores > 0 && cpuCores <= 4) return 'low';
  return 'balanced';
}

export function resolveGenerationConfig(context = {}, options = {}) {
  const runtimeCapabilities = context.runtimeCapabilities || {};
  const deviceCapabilities = context.deviceCapabilities || {};

  const selectedProfile = normalizeProfile(
    options.performanceProfile || context.performanceProfile || 'balanced',
    runtimeCapabilities,
    deviceCapabilities
  );

  const profileLimits = VISUALIZATION_TEMPLATE_PROFILE_LIMITS[selectedProfile] || VISUALIZATION_TEMPLATE_PROFILE_LIMITS.balanced;

  const maximumSlots = clamp(1, toFinite(options.maximumSlots, profileLimits.maximumSlots), 250);
  const maximumRegions = clamp(1, toFinite(options.maximumRegions, profileLimits.maximumRegions), 100);
  const maximumRelationships = clamp(0, toFinite(options.maximumRelationships, profileLimits.maximumRelationships), 1000);

  return {
    ...VISUALIZATION_TEMPLATE_GENERATION_DEFAULTS,
    ...options,
    profile: selectedProfile,
    qualityThreshold: clamp(0, toFinite(options.qualityThreshold, VISUALIZATION_TEMPLATE_GENERATION_DEFAULTS.qualityThreshold), 100),
    refinementPasses: clamp(0, toFinite(options.refinementPasses, VISUALIZATION_TEMPLATE_GENERATION_DEFAULTS.refinementPasses), VISUALIZATION_TEMPLATE_GENERATION_DEFAULTS.maxRefinementPasses),
    maximumSlots,
    maximumRegions,
    maximumRelationships,
    runtimeCapabilities,
    deviceCapabilities
  };
}

export function stableHash(input = '') {
  const text = String(input || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

export function stableSortById(list = [], key = 'id') {
  return [...(Array.isArray(list) ? list : [])].sort((left, right) => {
    const leftId = String(left?.[key] || '');
    const rightId = String(right?.[key] || '');
    return leftId.localeCompare(rightId);
  });
}
