import { EDUCATIONAL_OBJECT_DEFAULTS, EDUCATIONAL_OBJECT_LATEST_VERSION } from './EducationalObjectConfig.js';

function stableHash(input = '') {
  const text = String(input || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

export function createDefaultObjectRepresentation() {
  return {
    mode: 'abstract',
    dimensionality: 'adaptive',
    abstractionLevel: 'balanced',
    proceduralSuitability: true,
    assetSuitability: true,
    fallbackMode: 'text-assisted',
    preferredFidelity: 'balanced',
    visualDensity: 'balanced',
    labelStrategy: 'contextual',
    metadata: {}
  };
}

export function createDefaultObjectAccessibility() {
  return {
    textDescription: 'Adaptive educational object.',
    screenReaderLabel: 'Educational object',
    screenReaderDescription: 'Generic educational object for adaptive learning.',
    keyboardAccessible: true,
    focusable: true,
    focusOrder: 1,
    readingOrder: 1,
    reducedMotionCompatible: true,
    highContrastCompatible: true,
    nonVisualAlternative: 'text-summary',
    interactionInstructions: true,
    audioDescription: true,
    captionSupport: true,
    metadata: {}
  };
}

export function createDefaultObjectPerformance() {
  return {
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
  };
}

export function createAdaptiveFallbackEducationalObject(overrides = {}) {
  const seed = JSON.stringify({
    name: overrides?.name || 'fallback',
    kind: overrides?.kind || EDUCATIONAL_OBJECT_DEFAULTS.kind,
    semanticRole: overrides?.semanticRole || EDUCATIONAL_OBJECT_DEFAULTS.semanticRole
  });
  const objectId = overrides.objectId || `educational-object-${stableHash(seed)}`;

  return {
    objectId,
    id: objectId,
    version: EDUCATIONAL_OBJECT_LATEST_VERSION,
    name: 'Adaptive Educational Object',
    description: 'Universal fallback educational object descriptor.',
    kind: EDUCATIONAL_OBJECT_DEFAULTS.kind,
    semanticRole: EDUCATIONAL_OBJECT_DEFAULTS.semanticRole,
    learningPurpose: EDUCATIONAL_OBJECT_DEFAULTS.learningPurpose,
    source: 'adaptive-fallback',
    status: EDUCATIONAL_OBJECT_DEFAULTS.status,
    conceptReferences: [],
    relationshipReferences: [],
    capabilityReferences: [],
    templateBindings: [],
    representation: createDefaultObjectRepresentation(),
    geometryHints: {
      shapeIntent: 'generic',
      proportions: 'balanced',
      relativeScale: 1,
      orientation: 'contextual',
      surfaceIntent: 'neutral',
      volumeIntent: 'compact',
      internalVisibility: true,
      crossSectionSuitability: false,
      explodedViewSuitability: false,
      instancingSuitability: true,
      proceduralParameters: {},
      constraints: []
    },
    visualProperties: {
      emphasis: 'medium',
      visibility: true,
      opacityHint: 1,
      contrastIntent: 'high-legibility',
      highlightPriority: 1,
      labelVisibility: true,
      outlineIntent: 'soft',
      depthCueIntent: 'balanced',
      groupingIntent: 'contextual',
      selectionIntent: 'inspect',
      stateAppearance: {},
      metadata: {}
    },
    spatialProperties: {
      parentObjectId: null,
      childObjectIds: [],
      anchor: 'center',
      relativePosition: [0, 0, 0],
      relativeRotation: [0, 0, 0],
      relativeScale: [1, 1, 1],
      containment: 'none',
      adjacency: [],
      distanceImportance: 'medium',
      orientationImportance: 'medium',
      collisionIntent: 'avoid',
      layoutConstraints: [],
      regionBinding: null,
      slotBinding: null,
      metadata: {}
    },
    temporalProperties: {
      activeFrom: null,
      activeUntil: null,
      durationHint: 0,
      sequenceIndex: 0,
      timelineStepIds: [],
      repeatable: true,
      reversible: true,
      seekable: true,
      eventDriven: false,
      stateTransitionVisibility: true,
      metadata: {}
    },
    animationHints: {
      required: false,
      purpose: 'guidance',
      motionIntent: 'low',
      transitionIntent: 'soft',
      highlightIntent: 'focus',
      loopPreference: 'optional',
      speedHint: 'normal',
      continuity: 'discrete',
      reducedMotionAlternative: 'state-highlight',
      performanceCostHint: 'low',
      metadata: {}
    },
    interactionHints: {
      selectable: true,
      inspectable: true,
      draggable: false,
      rotatable: false,
      scalable: false,
      connectable: false,
      reorderable: false,
      measurable: false,
      triggerable: true,
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
      disabled: false,
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
      parameters: {},
      metadata: {}
    },
    labels: [{
      id: `${objectId}-label`,
      text: 'Educational Object',
      shortText: 'Object',
      description: 'Adaptive educational object label.',
      targetObjectId: objectId,
      priority: 1,
      visibility: true,
      readingOrder: 1,
      language: 'en',
      metadata: {}
    }],
    narration: {
      text: 'Adaptive educational object overview.',
      shortText: 'Object overview.',
      cueIds: [],
      timelineStepIds: [],
      objectReferences: [objectId],
      language: 'en',
      accessibilityPurpose: 'summary',
      metadata: {}
    },
    accessibility: createDefaultObjectAccessibility(),
    performance: createDefaultObjectPerformance(),
    assetHints: {
      assetRequired: false,
      preferredAssetType: 'generic',
      assetId: null,
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
      ownerId: null,
      shared: false,
      metadata: {}
    },
    metadata: {
      fallback: true,
      createdAt: new Date().toISOString(),
      source: 'adaptive-fallback'
    },
    extensions: {},
    validation: {
      status: 'valid',
      errors: [],
      warnings: [],
      repairable: true
    },
    diagnostics: {
      notes: ['Adaptive fallback educational object generated.']
    },
    ...overrides
  };
}
