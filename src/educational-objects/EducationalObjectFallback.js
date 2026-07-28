import { createAdaptiveFallbackEducationalObject } from './EducationalObjectSchema.js';
import { processEducationalObject } from './EducationalObjectVersionManager.js';
import { instantiateEducationalObject } from './EducationalObjectInstantiation.js';
import { stableSortByKey } from './EducationalObjectGenerationConfig.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function buildMinimalSafeObject(context = {}, index = 0) {
  const templateBindings = toArray(context.slotBindings).length
    ? [{
        slotId: String(context.slotBindings[index % context.slotBindings.length]?.slotId || ''),
        regionId: String(context.slotBindings[index % context.slotBindings.length]?.regionId || ''),
        role: 'fallback-binding',
        priority: index + 1,
        constraints: [],
        metadata: {}
      }]
    : [];

  return createAdaptiveFallbackEducationalObject({
    objectId: `educational-object-fallback-${index + 1}`,
    name: index === 0 ? 'Primary Learning Object' : `Support Learning Object ${index + 1}`,
    templateBindings,
    metadata: {
      ...toObject(context.metadata),
      fallbackGenerated: true,
      fallbackLevel: 5
    }
  });
}

function instantiateObjects(objects = [], context = {}, options = {}) {
  return stableSortByKey(objects, 'objectId').map((objectValue, index) => instantiateEducationalObject(objectValue, {
    sceneId: context.sceneId || 'scene',
    templateInstance: context.templateInstance || null,
    slotBinding: objectValue.templateBindings?.[0]?.slotId || null,
    regionBinding: objectValue.templateBindings?.[0]?.regionId || null,
    classification: context.classification || {},
    visualizationRequirements: context.visualizationRequirements || {},
    capabilityComposition: context.capabilityComposition || {},
    concepts: context.concepts || [],
    relationships: context.relationships || [],
    timelineRequirements: context.timelineRequirements || context.orderedSteps || [],
    interactionRequirements: context.interactionRequirements || [],
    accessibilityNeeds: context.accessibilityNeeds || {},
    performanceProfile: options.performanceProfile || context.performanceProfile || 'balanced',
    runtimeCapabilities: context.runtimeCapabilities || {},
    metadata: context.metadata || {},
    qualitySummary: options.qualitySummary || null,
    fallbackLevel: options.fallbackLevel || 0,
    objectIndex: index
  }, {
    forceFallbackOnInvalid: true
  }).instance);
}

export function applyEducationalObjectGenerationFallback(level = 4, state = {}, context = {}, options = {}) {
  const fallbackLevel = Math.max(1, Math.min(5, Number(level || 4)));
  const sourceObjects = toArray(state.objects);

  if (fallbackLevel === 1) {
    const repairedRaw = sourceObjects.map((item) => processEducationalObject(item, { allowFallback: true }).object);
    const repaired = repairedRaw.length ? repairedRaw : [buildMinimalSafeObject(context, 0)];
    return {
      status: 'fallback',
      source: 'fallback-level-1',
      fallbackLevel,
      fallbackUsed: true,
      objects: repaired,
      objectInstances: instantiateObjects(repaired, context, { ...options, fallbackLevel }),
      warnings: ['fallback-level-1-repair'],
      errors: []
    };
  }

  if (fallbackLevel === 2) {
    const salvaged = sourceObjects
      .filter((item) => item && (item.objectId || item.id))
      .map((item) => processEducationalObject(item, { allowFallback: true }).object);
    const ensured = salvaged.length ? salvaged : [buildMinimalSafeObject(context, 0)];
    return {
      status: 'fallback',
      source: 'fallback-level-2',
      fallbackLevel,
      fallbackUsed: true,
      objects: ensured,
      objectInstances: instantiateObjects(ensured, context, { ...options, fallbackLevel }),
      warnings: ['fallback-level-2-salvage'],
      errors: []
    };
  }

  if (fallbackLevel === 3) {
    const conceptObjects = toArray(context.concepts).slice(0, Math.max(1, Math.min(4, Number(options.maximumObjects || 4)))).map((concept, index) => {
      const objectId = `educational-object-adaptive-${index + 1}`;
      return createAdaptiveFallbackEducationalObject({
        objectId,
        name: String(concept?.label || concept?.name || `Adaptive Concept ${index + 1}`),
        semanticRole: index === 0 ? 'primary-concept' : 'supporting-concept',
        metadata: {
          ...toObject(context.metadata),
          conceptId: String(concept?.id || concept?.conceptId || ''),
          fallbackLevel: 3
        }
      });
    });

    const ensured = conceptObjects.length ? conceptObjects : [buildMinimalSafeObject(context, 0)];
    return {
      status: 'fallback',
      source: 'fallback-level-3',
      fallbackLevel,
      fallbackUsed: true,
      objects: ensured,
      objectInstances: instantiateObjects(ensured, context, { ...options, fallbackLevel }),
      warnings: ['fallback-level-3-adaptive-generation'],
      errors: []
    };
  }

  if (fallbackLevel === 4) {
    const object = buildMinimalSafeObject(context, 0);
    return {
      status: 'fallback',
      source: 'fallback-level-4',
      fallbackLevel,
      fallbackUsed: true,
      objects: [object],
      objectInstances: instantiateObjects([object], context, { ...options, fallbackLevel }),
      warnings: ['fallback-level-4-generic-object'],
      errors: []
    };
  }

  const minimalSet = [buildMinimalSafeObject(context, 0)];
  return {
    status: 'fallback',
    source: 'fallback-level-5',
    fallbackLevel: 5,
    fallbackUsed: true,
    objects: minimalSet,
    objectInstances: instantiateObjects(minimalSet, context, { ...options, fallbackLevel: 5 }),
    warnings: ['fallback-level-5-minimal-safe-set'],
    errors: []
  };
}
