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

function normalizeGeneratorProfile(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    strategy: safeString(source.strategy || 'adaptive-procedural') || 'adaptive-procedural',
    qualityProfile: safeString(source.qualityProfile || 'balanced') || 'balanced',
    diagnostics: {
      generated: Math.max(0, toFiniteNumber(source?.diagnostics?.generated, 0)),
      recoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveries, 0)),
      warnings: asArray(source?.diagnostics?.warnings)
    }
  };
}

function migrateGeneratorProfile(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === SCHEMA_VERSION) {
    return normalizeGeneratorProfile(source);
  }

  return normalizeGeneratorProfile({
    schemaVersion: SCHEMA_VERSION,
    strategy: source.strategy || source.mode,
    qualityProfile: source.qualityProfile || source.profile,
    diagnostics: {
      ...(isObject(source.diagnostics) ? source.diagnostics : {}),
      warnings: [
        ...asArray(source?.diagnostics?.warnings),
        'Procedural generator profile migrated from legacy format.'
      ]
    }
  });
}

function pickFallbackFamily(type = '') {
  const normalized = safeString(type).toLowerCase();
  if (normalized.includes('3d') || normalized.includes('mesh') || normalized.includes('model')) {
    return 'procedural-geometry';
  }
  if (normalized.includes('texture') || normalized.includes('image')) {
    return 'generated-diagram';
  }
  if (normalized.includes('audio') || normalized.includes('video') || normalized.includes('animation')) {
    return 'symbolic-educational-object';
  }
  return 'adaptive-placeholder';
}

function buildSeed(context = {}) {
  const source = isObject(context) ? context : {};
  const candidate = isObject(source.candidate) ? source.candidate : {};
  const request = isObject(source.request) ? source.request : {};
  const lesson = safeString(source?.learningIntent?.learningIntent || source?.learningIntent?.intent || source?.metadata?.query || 'adaptive lesson') || 'adaptive lesson';

  return {
    assetId: safeString(candidate.assetId || `${safeString(request.requestId || 'asset')}-procedural`) || `${safeString(request.requestId || 'asset')}-procedural`,
    type: safeString(candidate.type || 'unknown-asset-type') || 'unknown-asset-type',
    category: safeString(candidate.category || 'Adaptive Visualization') || 'Adaptive Visualization',
    reason: safeString(source.reason || 'asset-unavailable') || 'asset-unavailable',
    lesson
  };
}

export class UniversalProceduralAssetGenerator {
  constructor(options = {}) {
    this.options = isObject(options) ? options : {};
    this.profile = migrateGeneratorProfile(this.options.profile || {});
    this.history = [];
  }

  generate(context = {}) {
    const seed = buildSeed(context);
    const family = pickFallbackFamily(seed.type);

    const generated = {
      assetId: `${seed.assetId}-${Date.now()}`,
      version: 'generated-v1',
      type: `procedural-${family}`,
      category: seed.category,
      source: 'procedural-generator',
      rankScore: clamp((isObject(context?.candidate) ? Number(context.candidate.rankScore || 0.4) : 0.4), 0, 1),
      qualityLevel: this.profile.qualityProfile === 'high-fidelity' ? 'high' : this.profile.qualityProfile === 'performance' ? 'low' : 'medium',
      lodLevel: this.profile.qualityProfile === 'performance' ? 'low' : 'medium',
      dependencies: [],
      fallbackAssetIds: [],
      metadata: {
        generated: true,
        proceduralFamily: family,
        supportsUnknownFutureTypes: true,
        strategy: this.profile.strategy,
        seed: {
          reason: seed.reason,
          lesson: seed.lesson,
          baseType: seed.type
        },
        fallbackVariants: [
          'procedural-geometry',
          'primitive-objects',
          'generated-diagram',
          'symbolic-educational-object',
          'adaptive-placeholder',
          'future-procedural-asset-type'
        ]
      }
    };

    this.profile.diagnostics.generated += 1;
    this.history.push({
      assetId: generated.assetId,
      family,
      at: Date.now(),
      reason: seed.reason
    });
    if (this.history.length > 400) {
      this.history.shift();
    }

    return {
      generated,
      report: {
        schemaVersion: SCHEMA_VERSION,
        family,
        reason: seed.reason,
        qualityLevel: generated.qualityLevel,
        lodLevel: generated.lodLevel
      }
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
      this.profile.diagnostics.warnings.push('Failed to deserialize procedural generator state.');
      return this.snapshot();
    }

    this.profile = migrateGeneratorProfile(parsed.profile || {});
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
  normalizeGeneratorProfile,
  migrateGeneratorProfile
};
