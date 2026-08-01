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

function parseVersionWeight(version = 'v1') {
  const normalized = safeString(version).toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function hashPayload(value = {}) {
  const serialized = JSON.stringify(value);
  let hash = 0;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = ((hash << 5) - hash + serialized.charCodeAt(index)) | 0;
  }
  return `h${Math.abs(hash).toString(16)}`;
}

function normalizeSecurityProfile(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    allowedRuntimeVersion: safeString(source.allowedRuntimeVersion || 'v1') || 'v1',
    strictMode: source.strictMode === true,
    blockedFormats: asArray(source.blockedFormats).map((value) => safeString(value).toLowerCase()).filter(Boolean),
    metadataRequiredFields: asArray(source.metadataRequiredFields).map((value) => safeString(value)).filter(Boolean),
    diagnostics: {
      checks: Math.max(0, toFiniteNumber(source?.diagnostics?.checks, 0)),
      rejected: Math.max(0, toFiniteNumber(source?.diagnostics?.rejected, 0)),
      warnings: asArray(source?.diagnostics?.warnings),
      recoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveries, 0))
    }
  };
}

function migrateSecurityProfile(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === SCHEMA_VERSION) {
    return normalizeSecurityProfile(source);
  }

  return normalizeSecurityProfile({
    schemaVersion: SCHEMA_VERSION,
    allowedRuntimeVersion: source.allowedRuntimeVersion || source.runtimeVersion,
    strictMode: source.strictMode,
    blockedFormats: source.blockedFormats || source.disallowedFormats,
    metadataRequiredFields: source.metadataRequiredFields || source.requiredMetadata,
    diagnostics: {
      ...(isObject(source.diagnostics) ? source.diagnostics : {}),
      warnings: [
        ...asArray(source?.diagnostics?.warnings),
        'Security profile migrated from legacy format.'
      ]
    }
  });
}

function normalizeCandidate(candidate = {}, index = 0) {
  const source = isObject(candidate) ? candidate : {};
  return {
    assetId: safeString(source.assetId || source.id || `asset-${index + 1}`) || `asset-${index + 1}`,
    version: safeString(source.version || 'latest') || 'latest',
    type: safeString(source.type || 'unknown-asset-type') || 'unknown-asset-type',
    category: safeString(source.category || 'General') || 'General',
    source: safeString(source.source || 'registry') || 'registry',
    metadata: isObject(source.metadata) ? source.metadata : {},
    dependencies: asArray(source.dependencies),
    checksum: safeString(source.checksum || source.hash || ''),
    computedChecksum: safeString(source.computedChecksum || source.actualHash || ''),
    format: safeString(source.format || source?.metadata?.format || source?.metadata?.extension || '').toLowerCase(),
    corrupted: source.corrupted === true || source?.metadata?.corrupted === true
  };
}

export class UniversalAssetSecurityManager {
  constructor(options = {}) {
    this.options = isObject(options) ? options : {};
    this.profile = migrateSecurityProfile(this.options.profile || {});
    this.diagnostics = {
      checks: 0,
      rejected: 0,
      warnings: [],
      recoveries: 0
    };
    this.history = [];
  }

  warn(message = 'Unknown security warning') {
    this.diagnostics.warnings.push(safeString(message));
    if (this.diagnostics.warnings.length > 300) {
      this.diagnostics.warnings.shift();
    }
  }

  buildDuplicateKey(candidate = {}) {
    const normalized = normalizeCandidate(candidate);
    return `${normalized.assetId}::${normalized.version}`;
  }

  validate(candidate = {}, context = {}) {
    this.diagnostics.checks += 1;
    const normalized = normalizeCandidate(candidate);
    const safeContext = isObject(context) ? context : {};
    const warnings = [];
    const errors = [];

    if (!normalized.assetId) {
      errors.push('Asset id is required.');
    }

    if (!isObject(normalized.metadata)) {
      errors.push('Asset metadata must be an object.');
    }

    asArray(this.profile.metadataRequiredFields).forEach((field) => {
      if (safeString(field) && safeString(normalized?.metadata?.[field]) === '') {
        warnings.push(`Missing recommended metadata field: ${field}`);
      }
    });

    const runtimeVersion = safeString(safeContext.runtimeVersion || this.profile.allowedRuntimeVersion || 'v1') || 'v1';
    const candidateVersion = safeString(normalized.version || 'v1') || 'v1';
    if (candidateVersion !== 'latest' && parseVersionWeight(candidateVersion) > parseVersionWeight(runtimeVersion) + 1000) {
      errors.push('Asset version compatibility check failed.');
    }

    if (normalized.checksum && normalized.computedChecksum && normalized.checksum !== normalized.computedChecksum) {
      errors.push('Asset checksum mismatch detected.');
    }

    if (normalized.corrupted) {
      errors.push('Asset is marked corrupted.');
    }

    const blockedFormats = new Set([
      'exe',
      'dll',
      'bat',
      'cmd',
      'ps1',
      ...asArray(this.profile.blockedFormats)
    ].map((entry) => safeString(entry).toLowerCase()));

    if (normalized.format && blockedFormats.has(normalized.format)) {
      errors.push(`Asset format is blocked: ${normalized.format}`);
    }

    const duplicateKey = this.buildDuplicateKey(normalized);
    const existingEntries = safeContext.entries instanceof Map ? safeContext.entries : null;
    const inflightEntries = safeContext.inflight instanceof Map ? safeContext.inflight : null;

    if (existingEntries?.has?.(safeContext.cacheKey || duplicateKey) || inflightEntries?.has?.(safeContext.cacheKey || duplicateKey)) {
      warnings.push('Duplicate asset load detected.');
    }

    if (safeContext.registry && typeof safeContext.registry.lookup === 'function' && typeof safeContext.registry.resolveDependencies === 'function') {
      const contract = safeContext.registry.lookup(normalized.assetId, normalized.version || 'latest');
      if (contract) {
        const resolution = safeContext.registry.resolveDependencies(normalized.assetId, normalized.version || 'latest');
        const missingRequired = asArray(resolution?.missing).filter((entry) => entry?.required !== false);
        if (missingRequired.length) {
          errors.push('Required dependency safety validation failed.');
        }
      } else if (asArray(normalized.dependencies).some((entry) => entry?.required !== false)) {
        warnings.push('Asset dependency contract not found in registry; continuing with adaptive fallback safety.');
      }
    }

    const secure = errors.length === 0;
    if (!secure) {
      this.diagnostics.rejected += 1;
    }

    warnings.forEach((entry) => this.warn(entry));

    const report = {
      schemaVersion: SCHEMA_VERSION,
      assetId: normalized.assetId,
      version: normalized.version,
      secure,
      securityScore: clamp(1 - (errors.length * 0.35) - (warnings.length * 0.1), 0, 1),
      errors,
      warnings,
      duplicate: warnings.includes('Duplicate asset load detected.'),
      hash: normalized.checksum || normalized.computedChecksum || null,
      at: Date.now()
    };

    this.history.push(report);
    if (this.history.length > 400) {
      this.history.shift();
    }

    return {
      secure,
      candidate: normalized,
      report
    };
  }

  serialize() {
    return JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      profile: this.profile,
      diagnostics: this.diagnostics,
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
      this.warn('Failed to deserialize security manager state.');
      return this.snapshot();
    }

    this.profile = migrateSecurityProfile(parsed.profile || {});
    this.diagnostics = {
      checks: Math.max(0, toFiniteNumber(parsed?.diagnostics?.checks, this.diagnostics.checks)),
      rejected: Math.max(0, toFiniteNumber(parsed?.diagnostics?.rejected, this.diagnostics.rejected)),
      warnings: asArray(parsed?.diagnostics?.warnings),
      recoveries: Math.max(0, toFiniteNumber(parsed?.diagnostics?.recoveries, this.diagnostics.recoveries)) + 1
    };
    this.history = asArray(parsed.history);
    this.diagnostics.recoveries += 1;
    return this.snapshot();
  }

  snapshot() {
    return {
      schemaVersion: SCHEMA_VERSION,
      profile: this.profile,
      diagnostics: this.diagnostics,
      historySize: this.history.length,
      lastReport: this.history[this.history.length - 1] || null
    };
  }

  static hashCandidate(candidate = {}) {
    const normalized = normalizeCandidate(candidate);
    return hashPayload(normalized);
  }
}

export {
  normalizeSecurityProfile,
  migrateSecurityProfile,
  normalizeCandidate as normalizeSecurityCandidate
};
