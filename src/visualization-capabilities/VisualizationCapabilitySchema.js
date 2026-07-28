export const VISUALIZATION_CAPABILITY_SCHEMA_VERSION = 'v1';

export const VISUALIZATION_CAPABILITY_KEYS = [
  'id',
  'version',
  'name',
  'description',
  'semanticPurpose',
  'supportedLearningActions',
  'inputRequirements',
  'outputHints',
  'spatialProperties',
  'temporalProperties',
  'interactionProperties',
  'animationProperties',
  'cameraProperties',
  'accessibilityProperties',
  'performanceProperties',
  'compositionRules',
  'constraints',
  'confidence',
  'source',
  'metadata',
  'extensions'
];

export function createDefaultAccessibilityProperties() {
  return {
    textAlternativeRequired: true,
    narrationCompatible: true,
    keyboardCompatible: true,
    screenReaderDescription: '',
    reducedMotionCompatible: true,
    highContrastCompatible: true,
    nonVisualAlternative: 'text-summary',
    interactionInstructionsRequired: true
  };
}

export function createDefaultPerformanceProperties() {
  return {
    minimumProfile: 'low',
    maximumObjectSuggestion: 24,
    maximumAnimationSuggestion: 12,
    assetComplexity: 'balanced',
    proceduralPreference: true,
    lowPowerAlternative: true,
    mobileSuitability: true
  };
}

export function createDefaultCapabilityDescriptor() {
  return {
    id: '',
    version: VISUALIZATION_CAPABILITY_SCHEMA_VERSION,
    name: 'Adaptive Visualization Capability',
    description: 'Generic educational visualization capability descriptor.',
    semanticPurpose: 'exploration',
    supportedLearningActions: [],
    inputRequirements: [],
    outputHints: {
      preferredDimensionality: 'adaptive',
      objectDensity: 'balanced',
      layoutIntent: 'structured',
      cameraBehavior: 'guided',
      motionIntensity: 'moderate',
      labelDensity: 'balanced',
      interactionDepth: 'medium',
      narrationDependency: 'optional',
      timelineDependency: 'optional',
      assetDependency: 'optional',
      proceduralGenerationSuitability: true
    },
    spatialProperties: {
      dimensionality: 'adaptive',
      relativePositioning: true,
      containment: true,
      adjacency: true,
      distanceImportance: 'medium',
      orientationImportance: 'medium',
      scaleImportance: 'medium',
      internalVisibility: true,
      explodedViewSuitability: false,
      crossSectionSuitability: false,
      navigationRequirement: 'optional'
    },
    temporalProperties: {
      ordered: false,
      durationSensitive: false,
      continuous: false,
      discrete: true,
      repeatable: true,
      reversible: true,
      speedAdjustable: true,
      seekable: true,
      stepBased: true,
      eventDriven: true
    },
    interactionProperties: {
      inspectable: true,
      selectable: true,
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
      touchAccessible: true
    },
    animationProperties: {
      requiresAnimation: false,
      motionPurpose: 'guidance',
      continuity: 'discrete',
      loopPreference: 'optional',
      transitionPreference: 'soft',
      highlightPreference: 'contextual',
      stateChangeVisibility: true,
      reducedMotionAlternative: 'step-highlights'
    },
    cameraProperties: {
      movementIntent: 'guided-inspection',
      focusStrategy: 'contextual',
      framingPreference: 'balanced',
      userControl: 'assisted'
    },
    accessibilityProperties: createDefaultAccessibilityProperties(),
    performanceProperties: createDefaultPerformanceProperties(),
    compositionRules: [],
    constraints: [],
    confidence: 0.5,
    source: 'runtime',
    metadata: {},
    extensions: {}
  };
}
