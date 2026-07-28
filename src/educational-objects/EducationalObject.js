import { normalizeEducationalObject } from './EducationalObjectNormalizer.js';
import { processEducationalObject } from './EducationalObjectVersionManager.js';
import { instantiateEducationalObject } from './EducationalObjectInstantiation.js';
import { createAdaptiveFallbackEducationalObject } from './EducationalObjectSchema.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function fromLegacySceneObject(objectValue = {}, index = 0, scene = {}) {
  const source = toObject(objectValue);
  const baseLegacyId = String(source.id || `legacy-object-${index + 1}`);
  const objectId = String(source.objectId || `edu-${baseLegacyId}`);
  const templateMetadata = toObject(scene.metadata);

  return {
    objectId,
    id: objectId,
    version: 'v1',
    name: String(source.name || source.label || `Object ${index + 1}`),
    description: String(source.description || ''),
    kind: String(source.type || source.objectType || source.category || 'generic-educational-object'),
    semanticRole: String(source.semanticRole || 'primary-concept'),
    learningPurpose: String(source.learningPurpose || 'inspect'),
    source: 'legacy-scene-object',
    status: 'active',
    conceptReferences: [],
    relationshipReferences: [],
    capabilityReferences: [],
    templateBindings: [{
      templateId: templateMetadata.selectedTemplate?.templateId || templateMetadata.visualizationTemplate?.templateId || '',
      templateInstanceId: templateMetadata.selectedTemplateInstance?.instanceId || templateMetadata.visualizationTemplateInstance?.instanceId || '',
      slotId: source?.metadata?.slotId || '',
      regionId: source?.metadata?.regionId || '',
      role: 'legacy-binding',
      priority: index + 1,
      constraints: [],
      metadata: {}
    }],
    representation: {
      mode: 'model-based',
      dimensionality: 'adaptive',
      abstractionLevel: 'balanced',
      proceduralSuitability: true,
      assetSuitability: true,
      fallbackMode: 'symbolic',
      preferredFidelity: 'balanced',
      visualDensity: 'balanced',
      labelStrategy: 'contextual',
      metadata: {}
    },
    geometryHints: {
      shapeIntent: String(source.type || 'generic'),
      relativeScale: source.scale || [1, 1, 1],
      orientation: 'contextual',
      constraints: []
    },
    visualProperties: {
      emphasis: 'medium',
      visibility: source.visible !== false,
      opacityHint: 1,
      contrastIntent: 'balanced',
      highlightPriority: source.highlightable ? 2 : 1,
      labelVisibility: true,
      outlineIntent: 'soft',
      depthCueIntent: 'balanced',
      groupingIntent: 'contextual',
      selectionIntent: source.clickable ? 'inspect' : 'none',
      stateAppearance: {},
      metadata: {}
    },
    spatialProperties: {
      parentObjectId: null,
      childObjectIds: [],
      anchor: 'center',
      relativePosition: source.position || [0, 0, 0],
      relativeRotation: source.rotation || [0, 0, 0],
      relativeScale: source.scale || [1, 1, 1],
      containment: 'none',
      adjacency: [],
      distanceImportance: 'medium',
      orientationImportance: 'medium',
      collisionIntent: 'avoid',
      layoutConstraints: [],
      regionBinding: source?.metadata?.regionId || null,
      slotBinding: source?.metadata?.slotId || null,
      metadata: {}
    },
    temporalProperties: {
      activeFrom: null,
      activeUntil: null,
      durationHint: 0,
      sequenceIndex: Number(source.order || index),
      timelineStepIds: [],
      repeatable: true,
      reversible: true,
      seekable: true,
      eventDriven: false,
      stateTransitionVisibility: true,
      metadata: {}
    },
    animationHints: {
      required: Array.isArray(source.animationIds) ? source.animationIds.length > 0 : false,
      purpose: 'guidance',
      motionIntent: 'low',
      transitionIntent: 'soft',
      highlightIntent: source.highlightable ? 'focus' : 'none',
      loopPreference: 'optional',
      speedHint: 'normal',
      continuity: 'discrete',
      reducedMotionAlternative: 'state-highlight',
      performanceCostHint: 'low',
      metadata: {}
    },
    interactionHints: {
      selectable: source.clickable === true,
      inspectable: source.interactive !== false,
      draggable: false,
      rotatable: false,
      scalable: false,
      connectable: false,
      reorderable: false,
      measurable: false,
      triggerable: source.clickable === true,
      editable: false,
      resettable: true,
      keyboardAccessible: true,
      touchAccessible: true,
      interactionDepth: 'light',
      instructions: ['Inspect object details'],
      fallbackInteraction: 'inspect',
      metadata: {}
    },
    behaviorHints: [],
    state: {
      initial: 'ready',
      current: 'ready',
      availableStates: ['ready', 'active', 'completed'],
      transitions: [],
      persistent: true,
      resettable: true,
      completed: false,
      disabled: source.enabled === false,
      metadata: {}
    },
    data: {
      values: [],
      measurements: [],
      categories: [],
      series: [],
      relationships: [],
      annotations: [],
      examples: [],
      evidence: [],
      parameters: toObject(source.properties),
      metadata: toObject(source.metadata)
    },
    labels: [{
      id: `${objectId}-label`,
      text: String(source.name || source.label || `Object ${index + 1}`),
      shortText: String(source.name || source.label || `Obj ${index + 1}`).slice(0, 120),
      description: '',
      targetObjectId: objectId,
      priority: 1,
      visibility: true,
      readingOrder: index + 1,
      language: 'en',
      metadata: {}
    }],
    narration: {
      text: '',
      shortText: '',
      cueIds: [],
      timelineStepIds: [],
      objectReferences: [objectId],
      language: 'en',
      accessibilityPurpose: 'summary',
      metadata: {}
    },
    accessibility: {
      textDescription: String(source.name || source.label || 'Educational object'),
      screenReaderLabel: String(source.name || source.label || 'Educational object'),
      screenReaderDescription: String(source.name || source.label || 'Educational object descriptor'),
      keyboardAccessible: true,
      focusable: true,
      focusOrder: index + 1,
      readingOrder: index + 1,
      reducedMotionCompatible: true,
      highContrastCompatible: true,
      nonVisualAlternative: 'text-summary',
      interactionInstructions: true,
      audioDescription: true,
      captionSupport: true,
      metadata: {}
    },
    performance: {
      minimumProfile: 'low',
      maximumProfile: 'high',
      complexityScore: 0.4,
      geometryBudget: 8,
      materialBudget: 6,
      textureBudget: 6,
      animationBudget: 4,
      interactionBudget: 4,
      memoryHint: 'balanced',
      instancingRecommended: true,
      lodRecommended: true,
      mobileSuitability: true,
      lowPowerAlternative: true,
      simplificationPriority: 2,
      metadata: {}
    },
    assetHints: {
      assetRequired: false,
      preferredAssetType: 'generic',
      assetId: source?.metadata?.asset || null,
      proceduralFallback: true,
      externalAssetAllowed: false,
      qualityHint: 'balanced',
      licenseRequired: false,
      securityConstraints: ['no-remote-execution'],
      fallbackRepresentation: 'symbolic-node',
      metadata: {}
    },
    constraints: [],
    variables: [],
    conditions: [],
    lifecycle: {
      created: true,
      initialized: true,
      ready: true,
      active: false,
      paused: false,
      completed: false,
      destroyed: false,
      loadPriority: 1,
      disposePolicy: 'scene-owned',
      cachePolicy: 'runtime',
      ownershipPolicy: 'scene-owned',
      metadata: {}
    },
    ownership: {
      mode: 'scene-owned',
      ownerId: scene.sceneId || null,
      shared: false,
      metadata: {}
    },
    metadata: {
      migratedFromLegacy: true,
      originalType: source.type || null
    },
    extensions: {}
  };
}

function summarizeObjectDiagnostics(processedObjects = [], processedInstances = []) {
  const warningCount = processedObjects.reduce((sum, item) => sum + (item.warnings?.length || 0), 0);
  const errorCount = processedObjects.reduce((sum, item) => sum + (item.errors?.length || 0), 0);

  return {
    objectCount: processedObjects.length,
    instanceCount: processedInstances.length,
    warningCount,
    errorCount,
    fallbackCount: processedObjects.filter((item) => item.status === 'fallback').length
  };
}

export function createEducationalObject(input = {}, options = {}) {
  const normalized = normalizeEducationalObject(input, options);
  const processed = processEducationalObject(normalized, options);
  return {
    object: processed.object,
    processing: processed
  };
}

export function ensureSceneEducationalObjectMetadata(scene = {}, options = {}) {
  const safeScene = toObject(scene);
  const metadata = toObject(safeScene.metadata);

  const declaredObjects = toArray(safeScene.educationalObjects);
  const legacyObjects = toArray(safeScene.objects);

  const templateBindingsMetadata = toObject(metadata.templateBindings);
  const slotBindings = toArray(templateBindingsMetadata.slots?.bindings || templateBindingsMetadata.slots || [])
    .map((item) => ({
      slotId: item?.slotId || item?.id || '',
      regionId: item?.regionId || null,
      required: !(toArray(templateBindingsMetadata.slots?.unboundOptionalSlots || []).includes(item?.slotId || item?.id || '')),
      priority: Number(item?.priority || 1)
    }));
  const regionBindings = toArray(templateBindingsMetadata.regions?.bindings || templateBindingsMetadata.regions || [])
    .map((item) => ({
      regionId: item?.regionId || item?.id || '',
      capacity: Number(item?.capacity || item?.slotIds?.length || 1),
      priority: Number(item?.accessibilityOrder || item?.priority || 1)
    }));

  let sourceObjects = declaredObjects;
  const generatedSummary = toObject(metadata.educationalObjectGeneration);

  if (!sourceObjects.length && Array.isArray(metadata.generatedEducationalObjects)) {
    sourceObjects = metadata.generatedEducationalObjects;
  }

  if (!sourceObjects.length) {
    sourceObjects = legacyObjects.map((item, index) => fromLegacySceneObject(item, index, safeScene));
  }

  const processedObjects = sourceObjects.map((item) => processEducationalObject(item, {
    allowFallback: true,
    knownObjectIds: sourceObjects.map((entry) => String(entry?.objectId || entry?.id || ''))
  }));

  const finalObjects = processedObjects.map((item) => ({
    ...item.object,
    id: item.object.objectId
  }));

  const templateInstance = metadata.selectedTemplateInstance || metadata.visualizationTemplateInstance || null;
  const processedInstances = finalObjects.map((item, index) => instantiateEducationalObject(item, {
    sceneId: safeScene.sceneId,
    templateInstance,
    slotBinding: item.templateBindings?.[0]?.slotId || null,
    regionBinding: item.templateBindings?.[0]?.regionId || null,
    classification: safeScene.classification,
    visualizationRequirements: metadata.visualizationRequirements || {},
    capabilityComposition: metadata.capabilityComposition || {},
    concepts: safeScene.objects || [],
    relationships: safeScene.relationships || [],
    timelineRequirements: safeScene.timeline || [],
    interactionRequirements: safeScene.interactions || [],
    accessibilityNeeds: metadata.visualizationRequirements?.accessibilityNeeds || {},
    performanceProfile: safeScene.settings?.quality || 'balanced',
    runtimeCapabilities: metadata.runtimeCapabilities || {},
    metadata: metadata,
    qualitySummary: generatedSummary?.quality || null,
    fallbackLevel: generatedSummary?.fallbackLevel || 0,
    objectIndex: index
  }, options));

  const finalInstances = processedInstances.map((item) => item.instance);
  const summary = summarizeObjectDiagnostics(processedObjects, processedInstances);

  return {
    ...safeScene,
    educationalObjects: finalObjects.length ? finalObjects : [createAdaptiveFallbackEducationalObject()],
    educationalObjectInstances: finalInstances,
    objectDiagnostics: {
      summary,
      items: processedObjects.map((item) => ({
        objectId: item.object?.objectId || null,
        status: item.status,
        warnings: item.warnings || [],
        errors: item.errors || [],
        diagnostics: item.diagnostics || {}
      }))
    },
    metadata: {
      ...metadata,
      objectDiagnostics: summary,
      educationalObjectGeneration: generatedSummary
    }
  };
}
