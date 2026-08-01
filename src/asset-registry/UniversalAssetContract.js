const ASSET_CONTRACT_VERSION = 'v2';

function safeString(value) {
  return String(value || '').trim();
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const output = [];
  asArray(values).forEach((value) => {
    const text = safeString(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(text);
  });
  return output;
}

function clamp(value, minimum = 0, maximum = 1) {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : minimum;
  return Math.min(Math.max(safe, minimum), maximum);
}

function normalizeDependency(entry = {}) {
  if (typeof entry === 'string') {
    return {
      assetId: safeString(entry),
      version: 'latest',
      required: true,
      role: 'supporting'
    };
  }

  const source = isObject(entry) ? entry : {};
  return {
    assetId: safeString(source.assetId || source.id || ''),
    version: safeString(source.version || 'latest') || 'latest',
    required: source.required !== false,
    role: safeString(source.role || 'supporting') || 'supporting',
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function normalizeQualityLevels(value = {}) {
  const source = isObject(value) ? value : {};
  const normalized = {
    low: clamp(source.low ?? source.lq ?? 0.5, 0, 1),
    medium: clamp(source.medium ?? source.mq ?? source.default ?? 0.7, 0, 1),
    high: clamp(source.high ?? source.hq ?? 0.9, 0, 1)
  };
  normalized.default = safeString(source.default) || 'medium';
  if (!['low', 'medium', 'high'].includes(normalized.default)) {
    normalized.default = 'medium';
  }
  return normalized;
}

function normalizeLodSupport(value = {}) {
  const source = isObject(value) ? value : {};
  return {
    supported: source.supported !== false,
    levels: uniqueStrings(source.levels || ['high', 'medium', 'low']),
    autoSelect: source.autoSelect !== false,
    defaultLevel: safeString(source.defaultLevel || 'medium') || 'medium'
  };
}

function normalizeFallbackOptions(value = {}) {
  const source = isObject(value) ? value : {};
  return {
    mode: safeString(source.mode || 'adaptive-fallback') || 'adaptive-fallback',
    fallbackAssetIds: uniqueStrings(source.fallbackAssetIds || source.assets || []),
    supportsProceduralFallback: source.supportsProceduralFallback !== false,
    supportsUnknownFutureTypes: source.supportsUnknownFutureTypes !== false,
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

export function normalizeUniversalAssetContract(input = {}) {
  const source = isObject(input) ? input : {};

  const contract = {
    schemaVersion: ASSET_CONTRACT_VERSION,
    id: safeString(source.id || source.assetId || source.name || ''),
    type: safeString(source.type || source.assetType || 'unknown-asset-type') || 'unknown-asset-type',
    category: safeString(source.category || 'General') || 'General',
    tags: uniqueStrings(source.tags || []),
    metadata: isObject(source.metadata) ? source.metadata : {},
    dependencies: asArray(source.dependencies).map((entry) => normalizeDependency(entry)).filter((entry) => entry.assetId),
    qualityLevels: normalizeQualityLevels(source.qualityLevels || source.quality || {}),
    lodSupport: normalizeLodSupport(source.lodSupport || source.lod || {}),
    version: safeString(source.version || 'v1') || 'v1',
    capabilities: uniqueStrings(source.capabilities || []),
    source: safeString(source.source || source.provider || 'local-registry') || 'local-registry',
    fallbackOptions: normalizeFallbackOptions(source.fallbackOptions || source.fallback || {}),
    diagnostics: isObject(source.diagnostics) ? source.diagnostics : {}
  };

  if (!contract.id) {
    contract.id = `asset-${Date.now()}`;
  }

  return contract;
}

export function validateUniversalAssetContract(input = {}) {
  const contract = normalizeUniversalAssetContract(input);
  const errors = [];
  const warnings = [];

  if (!safeString(contract.id)) {
    errors.push('Asset contract id is required.');
  }

  if (!safeString(contract.type)) {
    errors.push('Asset contract type is required.');
  }

  if (!safeString(contract.category)) {
    warnings.push('Asset contract category is empty; default category applied.');
  }

  contract.dependencies.forEach((dependency, index) => {
    if (!safeString(dependency.assetId)) {
      errors.push(`Dependency at index ${index} is missing assetId.`);
    }
  });

  if (!contract.tags.length) {
    warnings.push('Asset contract has no tags.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    contract
  };
}

export function migrateUniversalAssetContract(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === ASSET_CONTRACT_VERSION) {
    return normalizeUniversalAssetContract(source);
  }

  return normalizeUniversalAssetContract({
    schemaVersion: ASSET_CONTRACT_VERSION,
    id: source.id || source.assetId || source.name,
    type: source.type || source.assetType || source.kind,
    category: source.category || source.group,
    tags: source.tags || source.labels,
    metadata: source.metadata || source.meta,
    dependencies: source.dependencies || source.dependencyRefs,
    qualityLevels: source.qualityLevels || source.quality,
    lodSupport: source.lodSupport || source.lod,
    version: source.version || source.assetVersion || 'v1',
    capabilities: source.capabilities || source.supportedFeatures,
    source: source.source || source.provider,
    fallbackOptions: source.fallbackOptions || source.fallback,
    diagnostics: {
      migrated: true,
      sourceSchemaVersion: safeString(source.schemaVersion || 'legacy') || 'legacy'
    }
  });
}
