import { createEducationalObjectCompatibilityFingerprint, createEducationalObjectFingerprint } from './EducationalObjectFingerprint.js';

function nowIso() {
  return new Date().toISOString();
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function createEducationalObjectPoolEntry(instance = {}, context = {}, options = {}) {
  const source = toObject(instance);
  const sceneContext = toObject(context);
  const objectId = String(source.objectId || '').trim();
  const objectVersion = String(source.objectVersion || source.version || 'v1').trim();
  const fingerprint = createEducationalObjectFingerprint(source, options);
  const compatibilityFingerprint = createEducationalObjectCompatibilityFingerprint({
    ...source,
    sceneId: sceneContext.sceneId,
    templateInstanceId: sceneContext.templateInstanceId,
    slotBinding: sceneContext.slotBinding,
    regionBinding: sceneContext.regionBinding,
    accessibilityNeeds: sceneContext.accessibilityNeeds,
    performanceProfile: sceneContext.performanceProfile
  }, options);

  return {
    poolEntryId: String(options.poolEntryId || `${objectId}:${objectVersion}:${fingerprint}`),
    objectId,
    objectVersion,
    instanceFingerprint: fingerprint,
    compatibilityFingerprint,
    instance: source,
    status: String(options.status || 'available'),
    ownership: toObject(options.ownership || source.ownership || {}),
    sceneId: String(sceneContext.sceneId || source.sceneId || ''),
    templateInstanceId: sceneContext.templateInstanceId || source.templateInstanceId || null,
    slotId: sceneContext.slotBinding || source.slotBinding || null,
    regionId: sceneContext.regionBinding || source.regionBinding || null,
    acquiredAt: options.acquiredAt || null,
    releasedAt: options.releasedAt || nowIso(),
    lastUsedAt: options.lastUsedAt || nowIso(),
    reuseCount: Number(options.reuseCount || 0),
    resetCount: Number(options.resetCount || 0),
    quality: toObject(options.quality),
    trustLevel: String(options.trustLevel || source?.runtimeMetadata?.trustLevel || 'untrusted'),
    expiresAt: options.expiresAt || null,
    metadata: toObject(options.metadata),
    diagnostics: toObject(options.diagnostics)
  };
}
