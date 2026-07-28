import { createEducationalObjectInstance } from './EducationalObjectInstance.js';
import { processEducationalObject } from './EducationalObjectVersionManager.js';
import { createDefaultObjectAccessibility, createDefaultObjectPerformance } from './EducationalObjectSchema.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableHash(input = '') {
  const text = String(input || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function resolveVariables(object = {}, context = {}) {
  const metadata = context.metadata && typeof context.metadata === 'object' ? context.metadata : {};
  const resolved = {};
  const variables = Array.isArray(object.variables) ? object.variables : [];

  variables.forEach((variable) => {
    const key = variable?.name || variable?.id;
    if (!key) return;
    const contextValue = context?.[key] ?? metadata[key];
    resolved[variable.id || key] = contextValue !== undefined ? contextValue : variable?.defaultValue;
  });

  ['__proto__', 'prototype', 'constructor'].forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(resolved, key)) delete resolved[key];
  });

  return resolved;
}

function resolveConceptBindings(object = {}, context = {}) {
  const concepts = Array.isArray(context.concepts) ? context.concepts : [];
  const conceptIds = new Set(concepts.map((item) => String(item?.id || '')));
  const references = Array.isArray(object.conceptReferences) ? object.conceptReferences : [];

  return references.map((reference) => ({
    referenceId: reference.referenceId,
    conceptId: reference.conceptId,
    role: reference.role,
    importance: reference.importance,
    confidence: reference.confidence,
    resolved: conceptIds.has(String(reference.conceptId || '')),
    metadata: reference.metadata || {}
  }));
}

function resolveRelationshipBindings(object = {}, context = {}) {
  const relationships = Array.isArray(context.relationships) ? context.relationships : [];
  const relationshipIds = new Set(relationships.map((item) => String(item?.id || item?.relationId || '')));
  const references = Array.isArray(object.relationshipReferences) ? object.relationshipReferences : [];

  return references.map((reference) => ({
    relationId: reference.relationId,
    sourceObjectId: reference.sourceObjectId,
    targetObjectId: reference.targetObjectId,
    relation: reference.relation,
    required: reference.required === true,
    resolved: relationshipIds.has(String(reference.relationId || '')),
    metadata: reference.metadata || {}
  }));
}

function enforcePerformance(performance = {}, profile = 'balanced') {
  const output = clone(performance || {});
  const scale = profile === 'low' ? 0.7 : profile === 'high' ? 1.2 : 1;

  ['geometryBudget', 'materialBudget', 'textureBudget', 'animationBudget', 'interactionBudget'].forEach((key) => {
    const value = Number(output?.[key] || 0);
    output[key] = Math.max(0, Math.min(5000, Math.round(value * scale)));
  });

  return output;
}

export function instantiateEducationalObject(object, context = {}, options = {}) {
  const started = Date.now();
  const processed = processEducationalObject(object, {
    allowFallback: options.forceFallbackOnInvalid !== false,
    knownObjectIds: options.knownObjectIds || []
  });

  let sourceObject = clone(processed.object);
  if (processed.status === 'fallback' && options.forceFallbackOnInvalid === false) {
    const inputObject = object && typeof object === 'object' ? clone(object) : {};
    sourceObject = {
      ...sourceObject,
      ...inputObject,
      objectId: String(inputObject.objectId || inputObject.id || sourceObject.objectId || 'educational-object-instance-source'),
      id: String(inputObject.objectId || inputObject.id || sourceObject.objectId || sourceObject.id || 'educational-object-instance-source'),
      version: String(inputObject.version || sourceObject.version || 'v1')
    };
  }
  const sceneId = String(context.sceneId || 'scene');
  const instanceId = `educational-object-instance-${sourceObject.objectId}-${stableHash(JSON.stringify({
    sceneId,
    templateInstanceId: context.templateInstance?.instanceId || null,
    profile: context.performanceProfile || 'balanced'
  }))}`;

  const resolvedVariables = resolveVariables(sourceObject, context);
  const conceptBindings = resolveConceptBindings(sourceObject, context);
  const relationshipBindings = resolveRelationshipBindings(sourceObject, context);
  const accessibility = {
    ...createDefaultObjectAccessibility(),
    ...(sourceObject.accessibility || {})
  };
  const performance = enforcePerformance({
    ...createDefaultObjectPerformance(),
    ...(sourceObject.performance || {})
  }, context.performanceProfile || 'balanced');

  const state = {
    ...(sourceObject.state || {}),
    current: sourceObject.state?.current || sourceObject.state?.initial || 'ready'
  };

  const slotBinding = context.slotBinding || sourceObject.templateBindings?.[0]?.slotId || sourceObject.spatialProperties?.slotBinding || null;
  const regionBinding = context.regionBinding || sourceObject.templateBindings?.[0]?.regionId || sourceObject.spatialProperties?.regionBinding || null;

  const instance = createEducationalObjectInstance({
    instanceId,
    objectId: sourceObject.objectId,
    objectVersion: sourceObject.version,
    sceneId,
    templateInstanceId: context.templateInstance?.instanceId || sourceObject.templateBindings?.[0]?.templateInstanceId || null,
    slotBinding,
    regionBinding,
    resolvedVariables,
    resolvedState: state,
    resolvedData: clone(sourceObject.data || {}),
    resolvedRepresentation: clone(sourceObject.representation || {}),
    resolvedAccessibility: accessibility,
    resolvedPerformance: performance,
    runtimeMetadata: {
      kind: sourceObject.kind,
      semanticRole: sourceObject.semanticRole,
      learningPurpose: sourceObject.learningPurpose,
      ownership: sourceObject.ownership || {},
      conceptBindings,
      relationshipBindings,
      conceptReferences: clone(sourceObject.conceptReferences || []),
      relationshipReferences: clone(sourceObject.relationshipReferences || []),
      templateBindings: clone(sourceObject.templateBindings || []),
      representation: clone(sourceObject.representation || {}),
      geometryHints: clone(sourceObject.geometryHints || {}),
      visualProperties: clone(sourceObject.visualProperties || {}),
      accessibility: clone(accessibility),
      performance: clone(performance),
      qualitySummary: clone(context.qualitySummary || null),
      fallbackLevel: Number(context.fallbackLevel || 0),
      diagnosticsSummary: {
        status: processed.status,
        warningCount: Array.isArray(processed.warnings) ? processed.warnings.length : 0,
        errorCount: Array.isArray(processed.errors) ? processed.errors.length : 0
      }
    },
    diagnostics: {
      processingStatus: processed.status,
      warnings: processed.warnings,
      errors: processed.errors,
      instantiationDuration: Date.now() - started
    }
  });

  return {
    status: processed.status,
    sourceObject,
    instance,
    diagnostics: instance.diagnostics
  };
}
