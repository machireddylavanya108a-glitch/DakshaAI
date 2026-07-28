import { processEducationalObject } from './EducationalObjectVersionManager.js';
import { instantiateEducationalObject } from './EducationalObjectInstantiation.js';
import { createAdaptiveFallbackEducationalObject, createDefaultObjectAccessibility, createDefaultObjectPerformance } from './EducationalObjectSchema.js';
import { normalizeEducationalObject } from './EducationalObjectNormalizer.js';

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function createEducationalObject(descriptor = {}, context = {}, options = {}) {
  const seed = toObject(descriptor);
  const generic = createAdaptiveFallbackEducationalObject({
    objectId: String(seed.objectId || seed.id || ''),
    name: String(seed.name || seed.label || 'Educational Object'),
    kind: String(seed.kind || seed.type || 'generic-educational-object'),
    semanticRole: String(seed.semanticRole || seed.role || 'supporting-concept'),
    learningPurpose: String(seed.learningPurpose || seed.purpose || 'inspect'),
    metadata: {
      ...toObject(seed.metadata),
      conceptId: String(seed.conceptId || ''),
      importance: Number(seed.importance || seed.weight || 0.5)
    }
  });

  const canonical = normalizeEducationalObject({
    ...generic,
    ...seed,
    accessibility: {
      ...createDefaultObjectAccessibility(),
      ...toObject(generic.accessibility),
      ...toObject(seed.accessibility)
    },
    performance: {
      ...createDefaultObjectPerformance(),
      ...toObject(generic.performance),
      ...toObject(seed.performance)
    },
    conceptReferences: toArray(seed.conceptReferences).length
      ? seed.conceptReferences
      : generic.conceptReferences,
    relationshipReferences: toArray(seed.relationshipReferences).length
      ? seed.relationshipReferences
      : generic.relationshipReferences,
    templateBindings: toArray(seed.templateBindings).length
      ? seed.templateBindings
      : generic.templateBindings
  }, options);

  const processed = processEducationalObject(canonical, {
    allowFallback: options.fallbackEnabled !== false,
    knownObjectIds: options.knownObjectIds || []
  });

  const sourceObject = processed.object || createAdaptiveFallbackEducationalObject();
  const instanceResult = instantiateEducationalObject(sourceObject, {
    ...context,
    qualitySummary: options.qualitySummary || null,
    fallbackLevel: options.fallbackLevel || 0
  }, {
    forceFallbackOnInvalid: options.fallbackEnabled !== false,
    knownObjectIds: options.knownObjectIds || []
  });

  return {
    status: processed.status,
    object: sourceObject,
    objectInstance: instanceResult.instance,
    warnings: [...(processed.warnings || []), ...(instanceResult.diagnostics?.warnings || [])],
    errors: [...(processed.errors || []), ...(instanceResult.diagnostics?.errors || [])],
    diagnostics: {
      processing: processed.diagnostics || {},
      instantiation: instanceResult.diagnostics || {}
    }
  };
}
