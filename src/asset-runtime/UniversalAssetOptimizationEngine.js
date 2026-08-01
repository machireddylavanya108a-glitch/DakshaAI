const SCHEMA_VERSION = 'v1';

function safeString(value) {
  return String(value || '').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(Math.max(toFiniteNumber(value, minimum), minimum), maximum);
}

function normalizeDeviceProfile(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    memoryGB: Math.max(0.25, toFiniteNumber(source.memoryGB, 4)),
    gpuTier: safeString(source.gpuTier || 'balanced') || 'balanced',
    network: safeString(source.network || 'standard') || 'standard',
    cpuScore: Math.max(0.1, toFiniteNumber(source.cpuScore, 1)),
    prefersBatterySavings: source.prefersBatterySavings === true
  };
}

function normalizeOptimizationProfile(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    qualityProfile: safeString(source.qualityProfile || 'balanced') || 'balanced',
    adaptiveLoading: source.adaptiveLoading !== false,
    progressive: source.progressive !== false,
    compressionLevel: safeString(source.compressionLevel || 'balanced') || 'balanced',
    device: normalizeDeviceProfile(source.device || {}),
    diagnostics: {
      optimized: Math.max(0, toFiniteNumber(source?.diagnostics?.optimized, 0)),
      recoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveries, 0)),
      warnings: asArray(source?.diagnostics?.warnings)
    }
  };
}

function migrateOptimizationProfile(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === SCHEMA_VERSION) {
    return normalizeOptimizationProfile(source);
  }

  return normalizeOptimizationProfile({
    schemaVersion: SCHEMA_VERSION,
    qualityProfile: source.qualityProfile || source.profile,
    adaptiveLoading: source.adaptiveLoading,
    progressive: source.progressive,
    compressionLevel: source.compressionLevel || source.compression,
    device: source.device || source.deviceProfile,
    diagnostics: {
      ...(isObject(source.diagnostics) ? source.diagnostics : {}),
      warnings: [
        ...asArray(source?.diagnostics?.warnings),
        'Optimization profile migrated from legacy format.'
      ]
    }
  });
}

function normalizeCandidate(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    assetId: safeString(source.assetId || source.id || ''),
    type: safeString(source.type || 'unknown-asset-type') || 'unknown-asset-type',
    category: safeString(source.category || 'General') || 'General',
    rankScore: clamp(source.rankScore, 0, 1),
    qualityLevel: safeString(source.qualityLevel || 'medium') || 'medium',
    lodLevel: safeString(source.lodLevel || 'medium') || 'medium',
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function pickQualityLevel(profile = {}, context = {}) {
  const qualityHint = safeString(profile.qualityProfile || 'balanced').toLowerCase();
  const device = normalizeDeviceProfile(profile.device || {});
  const graphDensity = Math.max(0, toFiniteNumber(context?.graphDensity, 0));

  if (qualityHint === 'performance' || device.prefersBatterySavings || device.memoryGB < 2) {
    return 'low';
  }

  if (qualityHint === 'high-fidelity' && device.memoryGB >= 8 && device.cpuScore >= 1.2) {
    return 'high';
  }

  if (graphDensity > 120 || device.network === 'slow') {
    return 'medium';
  }

  return qualityHint === 'high' ? 'high' : 'medium';
}

function pickLodLevel(qualityLevel = 'medium', context = {}) {
  const graphDensity = Math.max(0, toFiniteNumber(context?.graphDensity, 0));

  if (qualityLevel === 'low') return 'low';
  if (qualityLevel === 'high' && graphDensity < 80) return 'high';
  if (graphDensity > 120) return 'low';
  return 'medium';
}

export class UniversalAssetOptimizationEngine {
  constructor(options = {}) {
    this.options = isObject(options) ? options : {};
    this.profile = migrateOptimizationProfile(this.options.profile || {});
    this.history = [];
  }

  optimize(candidate = {}, context = {}) {
    const normalized = normalizeCandidate(candidate);
    const sourceContext = isObject(context) ? context : {};
    const graphDensity = Math.max(
      0,
      toFiniteNumber(sourceContext?.sceneGraph?.nodeCount, 0)
      + toFiniteNumber(sourceContext?.runtimeGraph?.nodeCount, 0)
      + toFiniteNumber(sourceContext?.sceneGraph?.relationshipCount, 0)
      + toFiniteNumber(sourceContext?.runtimeGraph?.relationshipCount, 0)
    );

    const qualityLevel = pickQualityLevel(this.profile, {
      graphDensity
    });
    const lodLevel = pickLodLevel(qualityLevel, {
      graphDensity
    });

    const compressionMetadata = {
      enabled: true,
      level: qualityLevel === 'high' ? 'lossless-preferred' : qualityLevel === 'low' ? 'aggressive' : this.profile.compressionLevel,
      target: normalized.type
    };

    const optimized = {
      ...normalized,
      qualityLevel,
      lodLevel,
      optimization: {
        mesh: {
          enabled: true,
          decimationRatio: qualityLevel === 'low' ? 0.45 : qualityLevel === 'high' ? 0.9 : 0.7,
          topologySafe: true
        },
        textures: {
          enabled: true,
          maxResolution: qualityLevel === 'high' ? 4096 : qualityLevel === 'low' ? 1024 : 2048,
          compressionPreference: compressionMetadata.level
        },
        animation: {
          enabled: true,
          keyframeReductionRatio: qualityLevel === 'low' ? 0.55 : qualityLevel === 'high' ? 0.92 : 0.75,
          preserveCriticalFrames: true
        },
        adaptiveLoading: {
          enabled: this.profile.adaptiveLoading,
          progressive: this.profile.progressive,
          deviceAware: true
        },
        compressionMetadata,
        report: {
          qualityProfile: this.profile.qualityProfile,
          device: this.profile.device,
          graphDensity,
          optimizationScore: clamp((normalized.rankScore * 0.45) + (qualityLevel === 'high' ? 0.4 : qualityLevel === 'medium' ? 0.3 : 0.2), 0, 1)
        }
      }
    };

    this.profile.diagnostics.optimized += 1;
    this.history.push({
      assetId: optimized.assetId,
      qualityLevel,
      lodLevel,
      at: Date.now(),
      graphDensity
    });

    if (this.history.length > 400) {
      this.history.shift();
    }

    return {
      optimized,
      report: optimized.optimization.report
    };
  }

  serialize() {
    return JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      profile: this.profile,
      history: this.history,
      persistedAt: Date.now()
    });
  }

  deserialize(serialized = '') {
    if (!serialized) return this.snapshot();

    let parsed = null;
    if (typeof serialized === 'string') {
      try {
        parsed = JSON.parse(serialized);
      } catch {
        parsed = null;
      }
    } else if (isObject(serialized)) {
      parsed = serialized;
    }

    if (!parsed) {
      this.profile.diagnostics.warnings.push('Failed to deserialize optimization engine state.');
      return this.snapshot();
    }

    this.profile = migrateOptimizationProfile(parsed.profile || {});
    this.profile.diagnostics.recoveries += 1;
    this.history = asArray(parsed.history);
    return this.snapshot();
  }

  snapshot() {
    return {
      schemaVersion: SCHEMA_VERSION,
      profile: this.profile,
      historySize: this.history.length,
      lastReport: this.history[this.history.length - 1] || null
    };
  }
}

export {
  normalizeOptimizationProfile,
  migrateOptimizationProfile,
  normalizeDeviceProfile,
  normalizeCandidate as normalizeOptimizationCandidate
};
