import { createEducationalObjectCompatibilityFingerprint, createEducationalObjectFingerprint } from './EducationalObjectFingerprint.js';
import { createEducationalObjectUsageMetrics } from './EducationalObjectUsageMetrics.js';

function nowIso() {
  return new Date().toISOString();
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function createEducationalObjectRegistryEntry(object = {}, options = {}) {
  const source = toObject(object);
  const objectId = String(source.objectId || source.id || '').trim();
  const version = String(source.version || 'v1').trim();
  const key = `${objectId}::${version}`;

  const quality = toObject(options.quality);
  const compatibility = toObject(options.compatibility);
  const trust = toObject(options.trust);

  return {
    key,
    objectId,
    version,
    object: source,
    enabled: options.enabled !== false,
    deprecated: options.deprecated === true,
    source: String(options.source || source.source || 'registry'),
    trustLevel: String(trust.level || options.trustLevel || 'untrusted'),
    priority: Number.isFinite(Number(options.priority)) ? Number(options.priority) : 0,
    quality,
    compatibility,
    fingerprint: createEducationalObjectFingerprint(source, options),
    compatibilityFingerprint: createEducationalObjectCompatibilityFingerprint(source, options),
    usage: createEducationalObjectUsageMetrics(options.usage),
    ownership: toObject(options.ownership || source.ownership),
    registeredAt: options.registeredAt || nowIso(),
    updatedAt: options.updatedAt || nowIso(),
    diagnostics: toObject(options.diagnostics),
    metadata: toObject(options.metadata)
  };
}
