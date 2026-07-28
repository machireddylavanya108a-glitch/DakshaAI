import { stableHash } from './EducationalObjectGenerationConfig.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeVector3(value, fallback = [0, 0, 0]) {
  if (Array.isArray(value) && value.length === 3) {
    const casted = value.map((item) => Number(item));
    if (casted.every((item) => Number.isFinite(item))) return casted;
  }
  return fallback;
}

export function generateEducationalObjectSpatialProperties(object = {}, templateBindings = {}, relationships = [], context = {}, options = {}) {
  const objectId = String(object.objectId || object.id || '');
  const relationList = toArray(relationships);
  const binding = templateBindings || {};

  const parentCandidates = relationList
    .filter((item) => {
      const target = String(item?.targetObjectId || item?.targetId || item?.to || '');
      return target === objectId;
    })
    .map((item) => String(item?.sourceObjectId || item?.sourceId || item?.from || ''))
    .filter(Boolean);

  const childObjectIds = [...new Set(relationList
    .filter((item) => {
      const source = String(item?.sourceObjectId || item?.sourceId || item?.from || '');
      return source === objectId;
    })
    .map((item) => String(item?.targetObjectId || item?.targetId || item?.to || ''))
    .filter((value) => value && value !== objectId))].sort((a, b) => a.localeCompare(b));

  const parentObjectId = parentCandidates.find((candidate) => candidate !== objectId) || null;

  const objectIndex = Number(options.objectIndex || 0);
  const profile = String(options.performanceProfile || context.performanceProfile || 'balanced').toLowerCase();
  const spacing = profile === 'low' ? 0.9 : profile === 'high' ? 1.4 : 1.1;
  const spread = (Number(stableHash(objectId).slice(0, 4), 16) % 7) - 3;

  return {
    parentObjectId,
    childObjectIds,
    anchor: parentObjectId ? 'relative' : 'center',
    relativePosition: safeVector3(object.spatialProperties?.relativePosition, [Number((spread * 0.1).toFixed(4)), 0, Number((objectIndex * spacing).toFixed(4))]),
    relativeRotation: safeVector3(object.spatialProperties?.relativeRotation, [0, 0, 0]),
    relativeScale: safeVector3(object.spatialProperties?.relativeScale, [1, 1, 1]).map((value) => Math.max(0.05, value)),
    containment: parentObjectId ? 'nested' : 'none',
    adjacency: childObjectIds.slice(0, 8),
    distanceImportance: relationList.length > 4 ? 'high' : 'medium',
    orientationImportance: 'medium',
    collisionIntent: 'avoid',
    layoutConstraints: [
      `slot:${String(binding.slotId || 'unbound')}`,
      `region:${String(binding.regionId || 'unbound')}`
    ],
    slotBinding: binding.slotId || null,
    regionBinding: binding.regionId || null,
    metadata: {
      bindingSource: binding.templateInstanceId ? 'template-instance' : 'context',
      relationCount: relationList.length
    }
  };
}
