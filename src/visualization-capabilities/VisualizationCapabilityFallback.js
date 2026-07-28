import { normalizeVisualizationCapability } from './VisualizationCapabilityNormalizer.js';

export function generateAdaptiveVisualizationCapability(requirements = {}, options = {}) {
  const confidence = Math.max(0.2, Math.min(0.6, Number(requirements?.confidence || 0.4)));
  const profile = String(requirements?.performanceNeeds?.profile || options.performanceProfile || 'balanced').toLowerCase();

  const descriptor = {
    id: `adaptive-fallback-${Math.random().toString(16).slice(2, 8)}`,
    version: 'v1',
    name: 'Adaptive Educational Capability',
    description: 'Generated fallback capability from structural educational requirements.',
    semanticPurpose: requirements?.preferredCapabilities?.[0] || 'exploration',
    supportedLearningActions: ['observe', 'inspect', 'navigate', 'explain'],
    inputRequirements: requirements?.requirements || [],
    outputHints: {
      preferredDimensionality: 'adaptive',
      objectDensity: 'low',
      layoutIntent: 'structured',
      cameraBehavior: 'guided',
      motionIntensity: 'low',
      labelDensity: 'balanced',
      interactionDepth: 'light',
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
      ordered: requirements?.detectedPatterns?.includes('ordered-structure') || false,
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
      rotatable: true,
      scalable: true,
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
    accessibilityProperties: {
      textAlternativeRequired: true,
      narrationCompatible: true,
      keyboardCompatible: true,
      screenReaderDescription: 'Fallback educational visualization capability.',
      reducedMotionCompatible: true,
      highContrastCompatible: true,
      nonVisualAlternative: 'text-summary',
      interactionInstructionsRequired: true
    },
    performanceProperties: {
      minimumProfile: 'low',
      maximumObjectSuggestion: profile === 'low' ? 16 : 30,
      maximumAnimationSuggestion: profile === 'low' ? 4 : 10,
      assetComplexity: profile === 'high' ? 'balanced' : 'low',
      proceduralPreference: true,
      lowPowerAlternative: true,
      mobileSuitability: true
    },
    compositionRules: [],
    constraints: requirements?.constraints || [],
    confidence,
    source: 'adaptive-fallback',
    metadata: {
      generatedFromRequirements: true,
      detectedPatterns: requirements?.detectedPatterns || []
    }
  };

  return normalizeVisualizationCapability(descriptor, options);
}
