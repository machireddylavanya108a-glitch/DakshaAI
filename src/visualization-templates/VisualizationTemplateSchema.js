import { VISUALIZATION_TEMPLATE_DEFAULTS, VISUALIZATION_TEMPLATE_LATEST_VERSION } from './VisualizationTemplateConfig.js';

function makeId(prefix = 'template') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function createDefaultTemplateAccessibility() {
  return {
    textDescription: 'Adaptive educational visualization template.',
    readingOrder: ['primary-region', 'secondary-region'],
    focusOrder: ['primary-slot'],
    keyboardNavigation: true,
    screenReaderRegions: true,
    narrationCompatibility: true,
    reducedMotionCompatibility: true,
    highContrastCompatibility: true,
    nonVisualAlternative: 'text-structured-summary',
    interactionInstructions: true,
    captionRequirements: true,
    audioDescriptionRequirements: false
  };
}

export function createDefaultTemplatePerformance() {
  return {
    minimumProfile: 'low',
    maximumProfile: 'high',
    objectBudget: 64,
    animationBudget: 24,
    interactionBudget: 24,
    assetBudget: 24,
    memoryHint: 'balanced',
    mobileSuitability: true,
    lowPowerAlternative: true,
    simplificationRules: []
  };
}

export function createDefaultTemplateLayout() {
  return {
    strategy: 'adaptive',
    dimensionality: 'adaptive',
    direction: 'contextual',
    alignment: 'balanced',
    distribution: 'balanced',
    spacing: { x: 1, y: 1, z: 1 },
    grouping: [],
    nesting: true,
    ordering: 'priority',
    collisionPolicy: 'avoid-overlap',
    overflowPolicy: 'defer-supporting',
    responsiveRules: [],
    constraints: [],
    metadata: {}
  };
}

export function createAdaptiveFallbackTemplate(overrides = {}) {
  const templateId = overrides.templateId || makeId('adaptive-universal-template');
  const primaryRegionId = 'primary-region';
  const primarySlotId = 'primary-slot';
  const supportSlotId = 'support-slot';

  return {
    templateId,
    version: VISUALIZATION_TEMPLATE_LATEST_VERSION,
    name: 'adaptive-universal-template',
    description: 'Universal adaptive fallback visualization template.',
    source: 'adaptive-fallback',
    status: VISUALIZATION_TEMPLATE_DEFAULTS.status,
    semanticPurpose: VISUALIZATION_TEMPLATE_DEFAULTS.semanticPurpose,
    requiredCapabilities: [],
    optionalCapabilities: [],
    composition: {
      mode: 'single',
      primaryCapability: null,
      supportingCapabilities: [],
      ordering: 'priority',
      mergeRules: [],
      conflictRules: [],
      dependencyRules: [],
      slotAssignmentRules: [],
      regionAssignmentRules: [],
      complexityBudget: { maxSlots: 8, maxRegions: 4 },
      metadata: {}
    },
    slots: [
      {
        id: primarySlotId,
        name: 'Primary Content Slot',
        purpose: 'primary-content',
        accepts: ['content-node'],
        requires: [],
        multiplicity: 'one',
        capacity: 1,
        priority: 1,
        regionId: primaryRegionId,
        parentSlotId: null,
        placementHints: {},
        behaviorHints: {},
        accessibilityHints: {},
        constraints: [],
        fallback: 'adaptive-content-placeholder',
        metadata: {},
        extensions: {}
      },
      {
        id: supportSlotId,
        name: 'Support Content Slot',
        purpose: 'supporting-content',
        accepts: ['content-node'],
        requires: [],
        multiplicity: 'many',
        capacity: 8,
        priority: 2,
        regionId: primaryRegionId,
        parentSlotId: primarySlotId,
        placementHints: {},
        behaviorHints: {},
        accessibilityHints: {},
        constraints: [],
        fallback: 'defer',
        metadata: {},
        extensions: {}
      }
    ],
    regions: [
      {
        id: primaryRegionId,
        name: 'Primary Region',
        purpose: 'main-structure',
        bounds: { x: 0, y: 0, width: 1, height: 1, depth: 1 },
        coordinateSpace: 'normalized',
        anchor: 'center',
        alignment: 'balanced',
        flow: 'adaptive',
        capacity: 16,
        priority: 1,
        responsiveRules: [],
        accessibilityOrder: 1,
        metadata: {},
        extensions: {}
      }
    ],
    relationships: [],
    layout: createDefaultTemplateLayout(),
    cameraHints: {
      focusPriority: 'primary',
      overviewRequired: true,
      detailViews: true,
      preferredDistance: 'balanced',
      preferredAngle: 'contextual',
      movementIntensity: 'low',
      transitionPreference: 'soft',
      navigationRequirement: 'optional',
      reducedMotionAlternative: true,
      constraints: []
    },
    environmentHints: {
      spatialContext: 'adaptive',
      boundaryStyle: 'implicit',
      backgroundIntent: 'neutral',
      lightingIntent: 'clear-contrast',
      depthRequirement: 'balanced',
      scaleReference: 'contextual',
      orientationReference: 'dynamic',
      navigationSpace: 'contained',
      accessibilityContext: 'high-legibility',
      performanceHints: []
    },
    timelineHints: {
      required: false,
      ordered: true,
      stepCountHint: 1,
      durationHint: 'adaptive',
      seekable: true,
      repeatable: true,
      reversible: true,
      narrationDependency: 'optional',
      interactionDependency: 'optional',
      checkpointPlacement: 'contextual',
      transitionIntent: 'smooth'
    },
    animationHints: {
      required: false,
      purpose: 'guidance',
      intensity: 'low',
      continuity: 'discrete',
      transitionIntent: 'soft',
      highlightIntent: 'focus',
      stateChangeVisibility: true,
      loopPreference: 'optional',
      reducedMotionAlternative: 'step-highlights',
      performanceCostHint: 'low'
    },
    interactionHints: {
      required: true,
      interactionDepth: 'light',
      inspectability: true,
      manipulation: false,
      selection: true,
      navigation: true,
      measurement: false,
      ordering: false,
      connection: false,
      reset: true,
      keyboardAccess: true,
      touchAccess: true,
      screenReaderInstructions: true,
      fallbackInteraction: 'inspect'
    },
    assetHints: {
      required: false,
      preferredRepresentation: 'adaptive',
      proceduralSuitability: true,
      externalAssetAllowed: false,
      assetComplexity: 'low',
      qualityHint: 'balanced',
      fallbackRepresentation: 'generic-node',
      licensingMetadataRequired: false,
      securityConstraints: ['no-remote-execution']
    },
    accessibility: createDefaultTemplateAccessibility(),
    performance: createDefaultTemplatePerformance(),
    constraints: [],
    variables: [],
    defaults: {},
    conditions: [],
    extensionPoints: [],
    metadata: {
      fallback: true,
      generatedAt: new Date().toISOString()
    },
    extensions: {},
    validation: {
      status: 'valid',
      errors: [],
      warnings: [],
      repairable: true
    },
    diagnostics: {
      notes: ['Adaptive fallback template generated.']
    },
    ...overrides
  };
}
