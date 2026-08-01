import { SceneGraph } from './SceneGraph.js';
import { SceneRegistry } from './SceneRegistry.js';
import { createSceneNode } from './SceneNodeFactory.js';
import { createNodeSpecsFromScene, deriveKnownKinds } from './SceneObjectFactory.js';
import { buildRelationships } from './SceneRelationshipBuilder.js';
import { buildSceneHierarchy } from './SceneHierarchy.js';
import { resolveSceneDependencies } from './SceneDependencyResolver.js';
import { SceneStateManager } from './SceneStateManager.js';
import { buildSceneBuilderDiagnostics } from './SceneBuilderDiagnostics.js';
import { buildTimeline } from '../timeline/index.js';
import { normalizeVisualizationStrategyProfile } from '../visualization-strategy/index.js';
import { normalizeCapabilityTemplateRecommendation } from '../recommendation/index.js';
import { normalizeConfidenceConflictFallbackProfile } from '../confidence-fallback/index.js';

const UNIVERSAL_INTERACTION_TYPES = new Set([
  'click',
  'double-click',
  'hover',
  'focus',
  'inspect',
  'select',
  'drag',
  'drop',
  'rotate',
  'zoom',
  'pan',
  'expand',
  'collapse',
  'highlight',
  'compare',
  'open-details',
  'custom'
]);

const UNIVERSAL_INPUT_DEVICE_TYPES = new Set([
  'mouse',
  'touch',
  'keyboard',
  'pen',
  'stylus',
  'trackpad',
  'gamepad'
]);

const UNIVERSAL_CAMERA_MODES = new Set([
  'orbit',
  'pan',
  'zoom',
  'rotate',
  'focus-object',
  'reset-camera',
  'fit-scene',
  'first-person',
  'free-camera',
  'presentation-mode'
]);

const UNIVERSAL_EDUCATIONAL_OBJECT_CAPABILITIES = new Set([
  'inspect',
  'explain',
  'highlight',
  'isolate',
  'hide',
  'show',
  'explode',
  'assemble',
  'cross-section',
  'x-ray',
  'compare',
  'annotate',
  'measure',
  'rotate',
  'zoom',
  'move',
  'duplicate',
  'reset'
]);

const UNIVERSAL_ACCESSIBILITY_FEATURES = new Set([
  'keyboard-navigation',
  'screen-reader-metadata',
  'focus-management',
  'high-contrast-mode',
  'scalable-ui',
  'captions-metadata',
  'narration-metadata',
  'reduced-motion',
  'font-scaling',
  'interaction-timing'
]);

function toKebab(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function resolveVisualizationStrategyMetadata(scene = {}) {
  const source = scene?.metadata?.visualizationStrategy
    || scene?.classification?.visualizationStrategy
    || scene?.visualizationStrategy
    || {};

  const profile = normalizeVisualizationStrategyProfile(source);
  const primary = profile.primaryStrategy || {};

  return {
    profile,
    primary,
    summary: {
      schemaVersion: profile.schemaVersion,
      strategyCount: Array.isArray(profile.strategies) ? profile.strategies.length : 0,
      confidenceScore: Number(profile.confidenceScore || 0),
      visualizationStyle: String(primary.visualizationStyle || 'adaptive visualization'),
      sceneComplexity: String(primary.sceneComplexity || 'medium'),
      interactionLevel: String(primary.interactionLevel || 'medium'),
      animationIntensity: String(primary.animationIntensity || 'medium')
    }
  };
}

function resolveCapabilityTemplateRecommendationMetadata(scene = {}) {
  const source = scene?.metadata?.capabilityTemplateRecommendation
    || scene?.classification?.capabilityTemplateRecommendation
    || scene?.capabilityTemplateRecommendation
    || {};

  const recommendation = normalizeCapabilityTemplateRecommendation(source);
  return {
    recommendation,
    summary: {
      schemaVersion: recommendation.schemaVersion,
      confidenceScore: Number(recommendation.confidenceScore || 0),
      recommendedCapabilityCount: Array.isArray(recommendation.recommendedCapabilities)
        ? recommendation.recommendedCapabilities.length
        : 0,
      recommendedTemplateCount: Array.isArray(recommendation.recommendedTemplates)
        ? recommendation.recommendedTemplates.length
        : 0,
      proceduralGenerationRecommended: recommendation?.fallbackStrategy?.recommendProceduralGeneration === true,
      fallbackMode: String(recommendation?.fallbackStrategy?.mode || 'template-recommendation')
    }
  };
}

function resolveConfidenceConflictFallbackMetadata(scene = {}) {
  const source = scene?.metadata?.confidenceConflictFallback
    || scene?.classification?.confidenceConflictFallback
    || scene?.confidenceConflictFallback
    || {};

  const profile = normalizeConfidenceConflictFallbackProfile(source);
  return {
    profile,
    summary: {
      schemaVersion: profile.schemaVersion,
      overallConfidence: Number(profile.overallConfidence || 0),
      conflictCount: Array.isArray(profile.conflicts) ? profile.conflicts.length : 0,
      fallbackActionCount: Array.isArray(profile?.fallbackPlan?.actions) ? profile.fallbackPlan.actions.length : 0,
      fallbackRecommended: profile?.fallbackPlan?.recommended === true
    }
  };
}

function normalizeInteractionType(input = 'custom') {
  const normalized = toKebab(input || 'custom');

  if (!normalized) {
    return {
      type: 'custom',
      knownType: true
    };
  }

  if (normalized === 'doubleclick') {
    return {
      type: 'double-click',
      knownType: true
    };
  }

  if (normalized === 'opendetails') {
    return {
      type: 'open-details',
      knownType: true
    };
  }

  return {
    type: normalized,
    knownType: UNIVERSAL_INTERACTION_TYPES.has(normalized)
  };
}

function normalizeCameraMode(input = 'orbit') {
  const normalized = toKebab(input || 'orbit');

  if (!normalized) {
    return {
      mode: 'orbit',
      knownMode: true
    };
  }

  if (normalized === 'firstperson') {
    return {
      mode: 'first-person',
      knownMode: true
    };
  }

  if (normalized === 'freecamera') {
    return {
      mode: 'free-camera',
      knownMode: true
    };
  }

  if (normalized === 'presentation') {
    return {
      mode: 'presentation-mode',
      knownMode: true
    };
  }

  if (normalized === 'focus') {
    return {
      mode: 'focus-object',
      knownMode: true
    };
  }

  if (normalized === 'reset') {
    return {
      mode: 'reset-camera',
      knownMode: true
    };
  }

  if (normalized === 'fit') {
    return {
      mode: 'fit-scene',
      knownMode: true
    };
  }

  return {
    mode: normalized,
    knownMode: UNIVERSAL_CAMERA_MODES.has(normalized)
  };
}

function normalizeEducationalCapability(input = 'inspect') {
  const normalized = toKebab(input || 'inspect');

  if (!normalized) {
    return {
      capability: 'inspect',
      knownCapability: true
    };
  }

  if (normalized === 'crosssection') {
    return {
      capability: 'cross-section',
      knownCapability: true
    };
  }

  if (normalized === 'xray') {
    return {
      capability: 'x-ray',
      knownCapability: true
    };
  }

  return {
    capability: normalized,
    knownCapability: UNIVERSAL_EDUCATIONAL_OBJECT_CAPABILITIES.has(normalized)
  };
}

function normalizeTargetObjectIds(interaction = {}, sceneId = null) {
  const ids = [];

  const collect = (value) => {
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    const id = String(value || '').trim();
    if (!id || ids.includes(id)) return;
    ids.push(id);
  };

  collect(interaction?.targetObjectId);
  collect(interaction?.targetObjectIds);
  collect(interaction?.targets);
  collect(interaction?.targetIds);
  collect(interaction?.objectId);

  if (!ids.length && sceneId) {
    ids.push(String(sceneId));
  }

  return ids;
}

function buildInteractionContracts(scene = {}) {
  const interactions = Array.isArray(scene?.interactions) ? scene.interactions : [];
  return interactions.map((interaction, index) => {
    const normalizedType = normalizeInteractionType(
      interaction?.interactionType || interaction?.eventType || interaction?.type || interaction?.action || 'custom'
    );

    return {
      id: String(interaction?.id || `interaction-contract-${index + 1}`),
      type: normalizedType.type,
      knownType: normalizedType.knownType,
      label: String(interaction?.label || interaction?.name || `Interaction ${index + 1}`),
      targetObjectIds: normalizeTargetObjectIds(interaction, scene?.sceneId || null),
      timelineBinding: {
        timeMs: Number(interaction?.timeMs ?? interaction?.time ?? 0),
        markerId: interaction?.markerId || null,
        eventId: interaction?.eventId || null,
        clipId: interaction?.clipId || null
      },
      metadata: interaction?.metadata && typeof interaction.metadata === 'object' ? interaction.metadata : {}
    };
  });
}

function applyInteractionContractRuntimeMetadata(graph, scene = {}) {
  const contracts = buildInteractionContracts(scene);
  const byObjectId = new Map();

  contracts.forEach((contract) => {
    contract.targetObjectIds.forEach((objectId) => {
      if (!byObjectId.has(objectId)) {
        byObjectId.set(objectId, []);
      }
      byObjectId.get(objectId).push(contract);
    });
  });

  graph.nodes.forEach((node) => {
    const assignedContracts = byObjectId.get(node.id) || [];
    const knownTypes = assignedContracts.filter((item) => item.knownType !== false).map((item) => item.type);
    const unknownTypes = assignedContracts.filter((item) => item.knownType === false).map((item) => item.type);

    node.runtimeData = {
      ...(node.runtimeData || {}),
      interactionContract: {
        schemaVersion: 'v1',
        objectId: node.id,
        contracts: assignedContracts,
        metrics: {
          contractCount: assignedContracts.length,
          knownTypeCount: knownTypes.length,
          unknownTypeCount: unknownTypes.length
        },
        knownTypes,
        unknownTypes
      }
    };

    node.properties = {
      ...(node.properties || {}),
      interactionContractMetadata: node.runtimeData.interactionContract
    };
  });

  return {
    contracts,
    objectCount: graph.nodes.size,
    knownTypeCount: contracts.filter((item) => item.knownType !== false).length,
    unknownTypeCount: contracts.filter((item) => item.knownType === false).length
  };
}

function toVector3(value, fallback = [0, 0, 0]) {
  const source = Array.isArray(value) ? value : fallback;
  if (!Array.isArray(source) || source.length < 3) {
    return [...fallback];
  }

  return [
    Number.isFinite(Number(source[0])) ? Number(source[0]) : fallback[0],
    Number.isFinite(Number(source[1])) ? Number(source[1]) : fallback[1],
    Number.isFinite(Number(source[2])) ? Number(source[2]) : fallback[2]
  ];
}

function applyInputCameraRuntimeMetadata(graph, scene = {}) {
  const sourceCamera = scene?.camera && typeof scene.camera === 'object' ? scene.camera : {};
  const sourceMovement = sourceCamera?.movement && typeof sourceCamera.movement === 'object' ? sourceCamera.movement : {};
  const mode = normalizeCameraMode(sourceMovement.mode || 'orbit');
  const cameraConstraints = sourceCamera?.constraints && typeof sourceCamera.constraints === 'object'
    ? sourceCamera.constraints
    : {
      minDistance: 1,
      maxDistance: 40,
      minPolarAngle: 0.1,
      maxPolarAngle: 3,
      minZoom: 0.3,
      maxZoom: 5
    };

  const availableModes = [
    mode.mode,
    ...(Array.isArray(sourceCamera?.supportedModes) ? sourceCamera.supportedModes : [])
  ]
    .map((entry) => normalizeCameraMode(entry))
    .map((entry) => entry.mode);

  const uniqueModes = [...new Set([...UNIVERSAL_CAMERA_MODES, ...availableModes])];
  const knownModes = uniqueModes.filter((entry) => normalizeCameraMode(entry).knownMode === true);
  const unknownModes = uniqueModes.filter((entry) => normalizeCameraMode(entry).knownMode === false);

  const objectFocusIds = [];

  graph.nodes.forEach((node) => {
    const sourceKey = String(node?.metadata?.sourceKey || '').toLowerCase();
    const focusPoint = toVector3(node?.properties?.position || node?.properties?.target || [0, 0, 0], [0, 0, 0]);

    node.runtimeData = {
      ...(node.runtimeData || {}),
      cameraControl: {
        schemaVersion: 'v1',
        objectId: node.id,
        focusPoint,
        cameraMode: mode.mode,
        knownMode: mode.knownMode,
        availableModes: uniqueModes,
        constraints: cameraConstraints,
        metadata: {
          sourceKey,
          interactive: Boolean(node?.properties?.interactive || node?.properties?.clickable)
        }
      }
    };

    node.properties = {
      ...(node.properties || {}),
      cameraControlMetadata: node.runtimeData.cameraControl
    };

    if (sourceKey === 'objects' || sourceKey === 'educationalobjects' || sourceKey === 'educationalobjectinstances') {
      objectFocusIds.push(node.id);
    }
  });

  return {
    currentMode: mode.mode,
    knownMode: mode.knownMode,
    knownModes,
    unknownModes,
    constraints: cameraConstraints,
    objectFocusIds,
    availableModes: uniqueModes,
    supportedInputDeviceTypes: [...UNIVERSAL_INPUT_DEVICE_TYPES],
    supportedCameraModes: [...UNIVERSAL_CAMERA_MODES]
  };
}

function normalizeEducationalInspectionCapabilities(node = {}) {
  const source = [
    ...(Array.isArray(node?.runtimeData?.educationalInspection?.capabilities) ? node.runtimeData.educationalInspection.capabilities : []),
    ...(Array.isArray(node?.runtimeData?.inspectionCapabilities) ? node.runtimeData.inspectionCapabilities : []),
    ...(Array.isArray(node?.properties?.inspectionCapabilities) ? node.properties.inspectionCapabilities : []),
    ...(Array.isArray(node?.properties?.manipulationCapabilities) ? node.properties.manipulationCapabilities : []),
    ...(Array.isArray(node?.properties?.capabilities) ? node.properties.capabilities : [])
  ];

  const normalized = source
    .map((entry) => normalizeEducationalCapability(entry))
    .filter((entry, index, all) => all.findIndex((item) => item.capability === entry.capability) === index);

  const known = normalized.filter((item) => item.knownCapability !== false).map((item) => item.capability);
  const unknown = normalized.filter((item) => item.knownCapability === false).map((item) => item.capability);

  return {
    knownCapabilities: [...new Set([...UNIVERSAL_EDUCATIONAL_OBJECT_CAPABILITIES, ...known])],
    unknownCapabilities: [...new Set(unknown)]
  };
}

function applyEducationalInspectionRuntimeMetadata(graph) {
  const objectIds = [];
  const unknownCapabilities = new Set();
  const knownCapabilities = new Set([...UNIVERSAL_EDUCATIONAL_OBJECT_CAPABILITIES]);

  graph.nodes.forEach((node) => {
    const sourceKey = String(node?.metadata?.sourceKey || '').toLowerCase();
    const isObjectNode = sourceKey === 'objects' || sourceKey === 'educationalobjects' || sourceKey === 'educationalobjectinstances';
    if (!isObjectNode) return;

    const capabilities = normalizeEducationalInspectionCapabilities(node);
    capabilities.knownCapabilities.forEach((entry) => knownCapabilities.add(entry));
    capabilities.unknownCapabilities.forEach((entry) => unknownCapabilities.add(entry));

    const position = toVector3(node?.properties?.position || [0, 0, 0], [0, 0, 0]);

    node.runtimeData = {
      ...(node.runtimeData || {}),
      educationalInspection: {
        schemaVersion: 'v1',
        objectId: node.id,
        capabilities: [...capabilities.knownCapabilities, ...capabilities.unknownCapabilities],
        knownCapabilities: capabilities.knownCapabilities,
        unknownCapabilities: capabilities.unknownCapabilities,
        transform: {
          rotation: [0, 0, 0],
          zoom: 1,
          position
        },
        visibility: {
          visible: true,
          isolated: false,
          highlighted: false
        },
        manipulation: {
          exploded: false,
          assembled: true,
          crossSection: false,
          xRay: false
        },
        annotations: [],
        measurements: [],
        temporaryDuplicates: []
      }
    };

    node.properties = {
      ...(node.properties || {}),
      educationalInspectionMetadata: node.runtimeData.educationalInspection
    };

    objectIds.push(node.id);
  });

  return {
    objectIds,
    knownCapabilities: [...knownCapabilities],
    unknownCapabilities: [...unknownCapabilities]
  };
}

function normalizeAccessibilityFeature(input = 'keyboard-navigation') {
  const normalized = toKebab(input || 'keyboard-navigation');

  if (!normalized) {
    return {
      feature: 'keyboard-navigation',
      knownFeature: true
    };
  }

  if (normalized === 'keyboardnavigation') {
    return {
      feature: 'keyboard-navigation',
      knownFeature: true
    };
  }

  if (normalized === 'screenreadermetadata') {
    return {
      feature: 'screen-reader-metadata',
      knownFeature: true
    };
  }

  if (normalized === 'focusmanagement') {
    return {
      feature: 'focus-management',
      knownFeature: true
    };
  }

  if (normalized === 'highcontrastmode') {
    return {
      feature: 'high-contrast-mode',
      knownFeature: true
    };
  }

  if (normalized === 'scalableui') {
    return {
      feature: 'scalable-ui',
      knownFeature: true
    };
  }

  if (normalized === 'captionsmetadata') {
    return {
      feature: 'captions-metadata',
      knownFeature: true
    };
  }

  if (normalized === 'narrationmetadata') {
    return {
      feature: 'narration-metadata',
      knownFeature: true
    };
  }

  if (normalized === 'reducedmotion') {
    return {
      feature: 'reduced-motion',
      knownFeature: true
    };
  }

  if (normalized === 'fontscaling') {
    return {
      feature: 'font-scaling',
      knownFeature: true
    };
  }

  if (normalized === 'interactiontiming') {
    return {
      feature: 'interaction-timing',
      knownFeature: true
    };
  }

  return {
    feature: normalized,
    knownFeature: UNIVERSAL_ACCESSIBILITY_FEATURES.has(normalized)
  };
}

function applyAccessibilityRecoveryRuntimeMetadata(graph, scene = {}) {
  const knownFeatures = new Set([...UNIVERSAL_ACCESSIBILITY_FEATURES]);
  const unknownFeatures = new Set();
  const focusableObjectIds = [];

  const sceneAccessibility = scene?.accessibility && typeof scene.accessibility === 'object' ? scene.accessibility : {};
  const featureInput = Array.isArray(sceneAccessibility.features) ? sceneAccessibility.features : [];

  featureInput
    .map((entry) => normalizeAccessibilityFeature(entry))
    .forEach((entry) => {
      if (entry.knownFeature) {
        knownFeatures.add(entry.feature);
      } else {
        unknownFeatures.add(entry.feature);
      }
    });

  graph.nodes.forEach((node) => {
    const sourceKey = String(node?.metadata?.sourceKey || '').toLowerCase();
    const isFocusable = Boolean(node?.properties?.interactive || node?.properties?.clickable || node?.properties?.focusable);
    const isObjectNode = sourceKey === 'objects' || sourceKey === 'educationalobjects' || sourceKey === 'educationalobjectinstances';

    if (isFocusable || isObjectNode) {
      focusableObjectIds.push(node.id);
    }

    node.runtimeData = {
      ...(node.runtimeData || {}),
      accessibilityRecovery: {
        schemaVersion: 'v2',
        objectId: node.id,
        keyboardNavigation: {
          focusable: isFocusable || isObjectNode,
          tabIndex: Number.isFinite(Number(node?.properties?.tabIndex)) ? Number(node.properties.tabIndex) : 0
        },
        screenReader: {
          label: String(node?.properties?.ariaLabel || node?.properties?.label || node?.properties?.name || node?.id || ''),
          description: String(node?.properties?.ariaDescription || node?.properties?.description || ''),
          role: String(node?.properties?.ariaRole || sourceKey || 'generic')
        },
        captionsMetadata: {
          enabled: true
        },
        narrationMetadata: {
          enabled: true
        },
        reducedMotionAlternative: node?.properties?.reducedMotionAlternative || null,
        highContrastHint: node?.properties?.highContrastHint || null,
        fontScaleHint: node?.properties?.fontScaleHint || null,
        interactionTimingHintMs: Number(node?.properties?.interactionTimingHintMs || 0)
      }
    };

    node.properties = {
      ...(node.properties || {}),
      accessibilityRecoveryMetadata: node.runtimeData.accessibilityRecovery
    };
  });

  return {
    knownFeatures: [...knownFeatures],
    unknownFeatures: [...unknownFeatures],
    focusableObjectIds: [...new Set(focusableObjectIds)]
  };
}

function buildRuntimeTimelineMetadata(scene = {}) {
  const timelineData = buildTimeline(scene);
  const narrationMetadata = timelineData?.metadata?.narration || {
    segments: [],
    cues: {
      timeline: [],
      sceneGraph: [],
      runtimeGraph: [],
      all: []
    },
    summary: {
      segmentCount: 0,
      cueCount: 0,
      totalDurationMs: 0,
      unknownStructureHandled: true
    }
  };
  const interactionIds = Array.isArray(scene?.interactions)
    ? scene.interactions
      .map((interaction, index) => String(interaction?.id || `interaction-${index + 1}`))
    : [];

  const sceneEventIds = [
    ...(timelineData.events || []).map((event) => event.id),
    ...(timelineData.markers || []).map((marker) => marker.id),
    ...interactionIds
  ];

  return {
    timelineData,
    narrationMetadata,
    metadata: {
      timelineId: timelineData.timelineId,
      version: timelineData.version,
      trackIds: (timelineData.tracks || []).map((track) => track.id),
      clipIds: (timelineData.clips || []).map((clip) => clip.id),
      markerIds: (timelineData.markers || []).map((marker) => marker.id),
      eventIds: (timelineData.events || []).map((event) => event.id),
      sceneEventIds,
      narrationSegmentIds: (narrationMetadata.segments || []).map((segment) => segment.id),
      narrationCueIds: (narrationMetadata.cues?.all || []).map((cue) => cue.id),
      dependencyMetadata: (timelineData.dependencies || []).map((dependency) => ({
        id: dependency.id,
        type: dependency.type,
        from: dependency.from,
        to: dependency.to,
        metadata: dependency.metadata || {}
      }))
    }
  };
}

export function buildRuntimeSceneGraph(validatedSceneJson = {}) {
  const buildStart = Date.now();
  const graph = new SceneGraph();
  const registry = new SceneRegistry();
  const knownKinds = deriveKnownKinds(validatedSceneJson);

  const nodeSpecs = createNodeSpecsFromScene(validatedSceneJson);
  const nodes = nodeSpecs.map((spec) => createSceneNode(spec, { knownKinds }));

  nodes.forEach((node) => {
    graph.addNode(node);
    registry.register(node);
  });

  const edges = buildRelationships({
    graph,
    nodes,
    sceneJson: validatedSceneJson
  });

  buildSceneHierarchy(graph);
  const dependencyDiagnostics = resolveSceneDependencies({ graph, registry, knownKinds });

  const stateManager = new SceneStateManager(registry);
  stateManager.initializeAll();

  const diagnostics = buildSceneBuilderDiagnostics({
    graph,
    sceneId: validatedSceneJson.sceneId,
    buildStart,
    relationshipCount: edges.length,
    dependencyDiagnostics
  });

  const runtimeTimeline = buildRuntimeTimelineMetadata(validatedSceneJson);
  const timelineMetadata = runtimeTimeline.metadata;
  const narrationMetadata = runtimeTimeline.narrationMetadata;
  const interactionContractMetadata = applyInteractionContractRuntimeMetadata(graph, validatedSceneJson);
  const inputCameraMetadata = applyInputCameraRuntimeMetadata(graph, validatedSceneJson);
  const educationalInspectionMetadata = applyEducationalInspectionRuntimeMetadata(graph);
  const accessibilityRecoveryMetadata = applyAccessibilityRecoveryRuntimeMetadata(graph, validatedSceneJson);
  const visualizationStrategyMetadata = resolveVisualizationStrategyMetadata(validatedSceneJson);
  const capabilityTemplateRecommendationMetadata = resolveCapabilityTemplateRecommendationMetadata(validatedSceneJson);
  const confidenceConflictFallbackMetadata = resolveConfidenceConflictFallbackMetadata(validatedSceneJson);
  const rootNode = graph.getNode(validatedSceneJson.sceneId);
  if (rootNode) {
    rootNode.runtimeData = {
      ...(rootNode.runtimeData || {}),
      timelineMetadata,
      interactionContract: {
        schemaVersion: 'v1',
        contractCount: interactionContractMetadata.contracts.length,
        objectCount: interactionContractMetadata.objectCount,
        knownTypeCount: interactionContractMetadata.knownTypeCount,
        unknownTypeCount: interactionContractMetadata.unknownTypeCount
      },
      inputCameraControl: {
        schemaVersion: 'v1',
        currentMode: inputCameraMetadata.currentMode,
        knownMode: inputCameraMetadata.knownMode,
        objectFocusCount: inputCameraMetadata.objectFocusIds.length,
        knownModeCount: inputCameraMetadata.knownModes.length,
        unknownModeCount: inputCameraMetadata.unknownModes.length
      },
      educationalInspection: {
        schemaVersion: 'v1',
        objectCount: educationalInspectionMetadata.objectIds.length,
        knownCapabilityCount: educationalInspectionMetadata.knownCapabilities.length,
        unknownCapabilityCount: educationalInspectionMetadata.unknownCapabilities.length
      },
      accessibilityRecovery: {
        schemaVersion: 'v2',
        focusableObjectCount: accessibilityRecoveryMetadata.focusableObjectIds.length,
        knownFeatureCount: accessibilityRecoveryMetadata.knownFeatures.length,
        unknownFeatureCount: accessibilityRecoveryMetadata.unknownFeatures.length
      },
      visualizationStrategy: {
        schemaVersion: visualizationStrategyMetadata.summary.schemaVersion,
        strategyCount: visualizationStrategyMetadata.summary.strategyCount,
        confidenceScore: visualizationStrategyMetadata.summary.confidenceScore,
        visualizationStyle: visualizationStrategyMetadata.summary.visualizationStyle,
        sceneComplexity: visualizationStrategyMetadata.summary.sceneComplexity,
        interactionLevel: visualizationStrategyMetadata.summary.interactionLevel,
        animationIntensity: visualizationStrategyMetadata.summary.animationIntensity
      },
      capabilityTemplateRecommendation: {
        schemaVersion: capabilityTemplateRecommendationMetadata.summary.schemaVersion,
        confidenceScore: capabilityTemplateRecommendationMetadata.summary.confidenceScore,
        recommendedCapabilityCount: capabilityTemplateRecommendationMetadata.summary.recommendedCapabilityCount,
        recommendedTemplateCount: capabilityTemplateRecommendationMetadata.summary.recommendedTemplateCount,
        proceduralGenerationRecommended: capabilityTemplateRecommendationMetadata.summary.proceduralGenerationRecommended,
        fallbackMode: capabilityTemplateRecommendationMetadata.summary.fallbackMode
      },
      confidenceConflictFallback: {
        schemaVersion: confidenceConflictFallbackMetadata.summary.schemaVersion,
        overallConfidence: confidenceConflictFallbackMetadata.summary.overallConfidence,
        conflictCount: confidenceConflictFallbackMetadata.summary.conflictCount,
        fallbackActionCount: confidenceConflictFallbackMetadata.summary.fallbackActionCount,
        fallbackRecommended: confidenceConflictFallbackMetadata.summary.fallbackRecommended
      }
    };
    registry.update(rootNode.id, rootNode);
  }

  return {
    sceneId: validatedSceneJson.sceneId,
    graph,
    registry,
    stateManager,
    diagnostics,
    metadata: {
      title: validatedSceneJson.title,
      subject: validatedSceneJson.subject,
      version: validatedSceneJson.version,
      visualizationStrategy: visualizationStrategyMetadata.profile,
      capabilityTemplateRecommendation: capabilityTemplateRecommendationMetadata.recommendation,
      confidenceConflictFallback: confidenceConflictFallbackMetadata.profile,
      timeline: timelineMetadata,
      timelineData: runtimeTimeline.timelineData,
      narration: narrationMetadata,
      rendererAdapter: {
        timeline: {
          timelineId: timelineMetadata.timelineId,
          version: timelineMetadata.version,
          trackIds: timelineMetadata.trackIds,
          clipIds: timelineMetadata.clipIds,
          markerIds: timelineMetadata.markerIds,
          eventIds: timelineMetadata.eventIds
        },
        sceneEvents: {
          eventIds: timelineMetadata.sceneEventIds
        },
        timelineState: {
          state: 'Ready',
          timeMs: 0,
          speed: 1,
          currentClipId: null,
          activeNarrationSegmentId: null,
          updatedAt: null
        },
        cameraControlState: {
          schemaVersion: 'v1',
          timelineTimeMs: 0,
          camera: {
            currentMode: inputCameraMetadata.currentMode,
            knownMode: inputCameraMetadata.knownMode,
            availableModes: inputCameraMetadata.availableModes,
            constraints: inputCameraMetadata.constraints,
            position: toVector3(validatedSceneJson?.camera?.position || [0, 1.8, 5], [0, 1.8, 5]),
            rotation: toVector3(validatedSceneJson?.camera?.rotation || [0, 0, 0], [0, 0, 0]),
            target: toVector3(validatedSceneJson?.camera?.target || [0, 1, 0], [0, 1, 0]),
            zoom: Number(validatedSceneJson?.camera?.zoom || 1)
          },
          inputLayer: {
            devices: {},
            registeredTypes: [],
            unknownDeviceTypes: []
          }
        },
        accessibilityRecoveryState: {
          schemaVersion: 'v2',
          timelineTimeMs: 0,
          knownFeatures: accessibilityRecoveryMetadata.knownFeatures,
          unknownFeatures: accessibilityRecoveryMetadata.unknownFeatures,
          focusableObjectIds: accessibilityRecoveryMetadata.focusableObjectIds,
          session: {
            timelinePosition: 0,
            playbackState: 'Ready',
            selectedObjects: [],
            checkpoints: []
          }
        },
        visualizationStrategyState: visualizationStrategyMetadata.profile,
        capabilityTemplateRecommendationState: capabilityTemplateRecommendationMetadata.recommendation,
        confidenceConflictFallbackState: confidenceConflictFallbackMetadata.profile
      },
      interactionEngine: {
        timelineState: {
          state: 'Ready',
          timeMs: 0,
          currentEventId: null,
          activeNarrationSegmentId: null,
          updatedAt: null
        },
        contractState: {
          schemaVersion: 'v1',
          timelineTimeMs: 0,
          metrics: {
            contractCount: interactionContractMetadata.contracts.length,
            objectCount: interactionContractMetadata.objectCount,
            eventCount: 0,
            unknownTypeCount: interactionContractMetadata.unknownTypeCount,
            validationErrors: 0
          }
        },
        inputCameraControlState: {
          schemaVersion: 'v1',
          timelineTimeMs: 0,
          cameraMode: inputCameraMetadata.currentMode,
          knownMode: inputCameraMetadata.knownMode,
          supportedInputDeviceTypes: inputCameraMetadata.supportedInputDeviceTypes,
          supportedCameraModes: inputCameraMetadata.supportedCameraModes
        },
        educationalInspectionState: {
          schemaVersion: 'v1',
          timelineTimeMs: 0,
          metrics: {
            objectCount: educationalInspectionMetadata.objectIds.length,
            selectedCount: 0,
            knownCapabilityCount: educationalInspectionMetadata.knownCapabilities.length,
            unknownCapabilityCount: educationalInspectionMetadata.unknownCapabilities.length,
            inspectionCount: 0,
            manipulationCount: 0,
            undoCount: 0,
            redoCount: 0,
            resetCount: 0,
            validationErrors: 0
          }
        },
        accessibilityRecoveryState: {
          schemaVersion: 'v2',
          timelineTimeMs: 0,
          knownFeatures: accessibilityRecoveryMetadata.knownFeatures,
          unknownFeatures: accessibilityRecoveryMetadata.unknownFeatures,
          focusableObjectIds: accessibilityRecoveryMetadata.focusableObjectIds,
          session: {
            timelinePosition: 0,
            playbackState: 'Ready',
            selectedObjects: [],
            checkpoints: []
          }
        },
        visualizationStrategyState: visualizationStrategyMetadata.profile,
        capabilityTemplateRecommendationState: capabilityTemplateRecommendationMetadata.recommendation,
        confidenceConflictFallbackState: confidenceConflictFallbackMetadata.profile
      },
      speechPlayback: {
        playbackState: 'Ready',
        knownPlaybackState: true,
        timelineTimeMs: 0,
        narrationTimeMs: 0,
        speed: 1,
        muted: false,
        volume: 1,
        currentSegmentId: null,
        totalSegments: (narrationMetadata.segments || []).length,
        completedSegments: 0
      },
      adaptiveLearning: {
        modeProfile: {
          mode: 'intermediate',
          knownMode: true
        },
        progress: {
          progressPercent: 0,
          completedUnits: 0,
          totalUnits: 1
        },
        metrics: {
          struggleScore: 0,
          confidenceScore: 1,
          averageResponseTimeMs: 0,
          mistakes: 0,
          skippedCount: 0,
          repeatedSectionCount: 0,
          repeatedMistakes: []
        },
        adaptation: {
          explanationDepth: 0.55,
          pacing: 1,
          examplesIntensity: 0.7,
          complexity: 0.55,
          recommendations: []
        }
      },
      interactionContract: {
        schemaVersion: 'v1',
        timelineTimeMs: 0,
        contracts: {
          byId: Object.fromEntries(interactionContractMetadata.contracts.map((contract) => [contract.id, contract])),
          byObjectId: graph.toJSON().nodes.reduce((acc, node) => {
            acc[node.id] = node?.runtimeData?.interactionContract?.contracts || [];
            return acc;
          }, {})
        },
        metrics: {
          contractCount: interactionContractMetadata.contracts.length,
          objectCount: interactionContractMetadata.objectCount,
          eventCount: 0,
          unknownTypeCount: interactionContractMetadata.unknownTypeCount,
          validationErrors: 0
        },
        diagnostics: {
          registrationCount: interactionContractMetadata.contracts.length,
          emittedEvents: 0,
          persistedSessions: 0,
          recoveredSessions: 0,
          warnings: []
        },
        events: {
          recent: []
        },
        recovery: {
          interrupted: false,
          lastCheckpointId: null,
          resumeTimeMs: 0
        },
        supportedInteractionTypes: [...UNIVERSAL_INTERACTION_TYPES],
        knownInteractionTypes: interactionContractMetadata.contracts
          .filter((contract) => contract.knownType !== false)
          .map((contract) => contract.type),
        unknownInteractionTypes: interactionContractMetadata.contracts
          .filter((contract) => contract.knownType === false)
          .map((contract) => contract.type),
        coverageScore: 1
      },
      inputCameraControl: {
        schemaVersion: 'v1',
        timelineTimeMs: 0,
        inputLayer: {
          devices: {},
          registeredTypes: [],
          unknownDeviceTypes: [],
          history: []
        },
        camera: {
          currentMode: inputCameraMetadata.currentMode,
          knownMode: inputCameraMetadata.knownMode,
          availableModes: inputCameraMetadata.availableModes,
          constraints: inputCameraMetadata.constraints,
          focusPointsByObjectId: inputCameraMetadata.objectFocusIds.reduce((acc, objectId) => {
            const node = graph.getNode(objectId);
            if (node?.runtimeData?.cameraControl?.focusPoint) {
              acc[objectId] = {
                objectId,
                position: node.runtimeData.cameraControl.focusPoint,
                boundsRadius: Number(node?.properties?.boundsRadius || 1)
              };
            }
            return acc;
          }, {}),
          position: toVector3(validatedSceneJson?.camera?.position || [0, 1.8, 5], [0, 1.8, 5]),
          rotation: toVector3(validatedSceneJson?.camera?.rotation || [0, 0, 0], [0, 0, 0]),
          target: toVector3(validatedSceneJson?.camera?.target || [0, 1, 0], [0, 1, 0]),
          zoom: Number(validatedSceneJson?.camera?.zoom || 1)
        },
        metrics: {
          registeredDeviceCount: 0,
          knownDeviceCount: 0,
          unknownDeviceCount: 0,
          inputEventCount: 0,
          cameraMutationCount: 0,
          unknownCameraModeCount: inputCameraMetadata.unknownModes.length,
          transitionCount: 0,
          validationErrors: 0
        },
        diagnostics: {
          synchronizations: 0,
          persistedSessions: 0,
          recoveredSessions: 0,
          warnings: []
        },
        runtimeEvents: {
          recent: []
        },
        recovery: {
          interrupted: false,
          lastCheckpointId: null,
          resumeTimeMs: 0
        },
        supportedInputDeviceTypes: inputCameraMetadata.supportedInputDeviceTypes,
        supportedCameraModes: inputCameraMetadata.supportedCameraModes,
        knownCameraModes: inputCameraMetadata.knownModes,
        unknownCameraModes: inputCameraMetadata.unknownModes
      },
      educationalInspection: {
        schemaVersion: 'v1',
        timelineTimeMs: 0,
        objects: {
          byId: educationalInspectionMetadata.objectIds.reduce((acc, objectId) => {
            const node = graph.getNode(objectId);
            acc[objectId] = {
              objectId,
              selected: false,
              visible: true,
              isolated: false,
              highlighted: false,
              exploded: false,
              assembled: true,
              crossSection: false,
              xRay: false,
              temporaryDuplicates: [],
              transform: {
                rotation: [0, 0, 0],
                zoom: 1,
                position: toVector3(node?.properties?.position || [0, 0, 0], [0, 0, 0])
              },
              annotations: [],
              measurements: [],
              compareWith: [],
              metadata: {
                sourceKey: node?.metadata?.sourceKey || null,
                kind: node?.kind || null
              },
              capabilities: [
                ...((node?.runtimeData?.educationalInspection?.knownCapabilities) || []),
                ...((node?.runtimeData?.educationalInspection?.unknownCapabilities) || [])
              ],
              knownCapabilities: node?.runtimeData?.educationalInspection?.knownCapabilities || [],
              unknownCapabilities: node?.runtimeData?.educationalInspection?.unknownCapabilities || []
            };
            return acc;
          }, {}),
          selectedIds: []
        },
        metrics: {
          objectCount: educationalInspectionMetadata.objectIds.length,
          selectedCount: 0,
          knownCapabilityCount: educationalInspectionMetadata.knownCapabilities.length,
          unknownCapabilityCount: educationalInspectionMetadata.unknownCapabilities.length,
          inspectionCount: 0,
          manipulationCount: 0,
          undoCount: 0,
          redoCount: 0,
          resetCount: 0,
          validationErrors: 0
        },
        diagnostics: {
          synchronizations: 0,
          persistedSessions: 0,
          recoveredSessions: 0,
          warnings: []
        },
        history: {
          undoStack: [],
          redoStack: []
        },
        runtimeEvents: {
          recent: []
        },
        recovery: {
          interrupted: false,
          lastCheckpointId: null,
          resumeTimeMs: 0
        },
        supportedCapabilities: [...UNIVERSAL_EDUCATIONAL_OBJECT_CAPABILITIES],
        knownCapabilities: educationalInspectionMetadata.knownCapabilities,
        unknownCapabilities: educationalInspectionMetadata.unknownCapabilities
      },
      accessibilityRecovery: {
        schemaVersion: 'v2',
        timelineTimeMs: 0,
        knownFeatures: accessibilityRecoveryMetadata.knownFeatures,
        unknownFeatures: accessibilityRecoveryMetadata.unknownFeatures,
        accessibility: {
          keyboardNavigation: {
            enabled: true,
            focusOrder: accessibilityRecoveryMetadata.focusableObjectIds,
            focusIndex: accessibilityRecoveryMetadata.focusableObjectIds.length ? 0 : -1,
            activeFocusId: accessibilityRecoveryMetadata.focusableObjectIds[0] || null,
            lastAction: 'boot'
          },
          screenReader: {
            enabled: true,
            metadataByObjectId: accessibilityRecoveryMetadata.focusableObjectIds.reduce((acc, objectId) => {
              const node = graph.getNode(objectId);
              acc[objectId] = {
                label: String(node?.properties?.name || node?.properties?.label || objectId),
                description: String(node?.properties?.description || ''),
                role: String(node?.metadata?.sourceKey || 'generic')
              };
              return acc;
            }, {}),
            liveRegionQueue: []
          },
          focusManagement: {
            enabled: true,
            trapFocus: false,
            restoreFocusOnResume: true,
            lastFocusedId: accessibilityRecoveryMetadata.focusableObjectIds[0] || null,
            focusHistory: accessibilityRecoveryMetadata.focusableObjectIds[0] ? [accessibilityRecoveryMetadata.focusableObjectIds[0]] : []
          },
          visual: {
            highContrastMode: false,
            reducedMotion: false,
            uiScale: 1,
            fontScale: 1
          },
          timing: {
            interactionTimingMs: 0,
            keyboardRepeatDelayMs: 250,
            captionDelayMs: 0,
            narrationDelayMs: 0,
            custom: {}
          },
          captions: {
            enabled: true,
            tracks: [
              {
                id: 'default-caption-track',
                language: 'en',
                cueCount: (narrationMetadata.cues?.all || []).length,
                segmentCount: (narrationMetadata.segments || []).length
              }
            ],
            activeTrackId: 'default-caption-track',
            cues: narrationMetadata.cues?.all || [],
            metadata: {}
          },
          narration: {
            enabled: true,
            segmentCount: (narrationMetadata.segments || []).length,
            segments: narrationMetadata.segments || [],
            summary: narrationMetadata.summary || {},
            metadata: {}
          },
          preferences: {},
          unknownSettings: {}
        },
        session: {
          currentLesson: validatedSceneJson.title,
          runtimeScene: {
            sceneId: validatedSceneJson.sceneId,
            nodeCount: graph.getNodeCount(),
            relationshipCount: graph.getRelationshipCount()
          },
          timelinePosition: 0,
          playbackState: 'Ready',
          cameraMetadata: {
            currentMode: inputCameraMetadata.currentMode,
            knownMode: inputCameraMetadata.knownMode,
            position: toVector3(validatedSceneJson?.camera?.position || [0, 1.8, 5], [0, 1.8, 5]),
            rotation: toVector3(validatedSceneJson?.camera?.rotation || [0, 0, 0], [0, 0, 0]),
            target: toVector3(validatedSceneJson?.camera?.target || [0, 1, 0], [0, 1, 0]),
            zoom: Number(validatedSceneJson?.camera?.zoom || 1)
          },
          interactionState: {
            contractCount: interactionContractMetadata.contracts.length,
            objectCount: interactionContractMetadata.objectCount
          },
          selectedObjects: [],
          checkpoints: [],
          quizProgress: {},
          learningProgress: {
            progressPercent: 0,
            completedUnits: 0,
            totalUnits: 1
          },
          aiTeacherState: {
            state: 'Ready',
            timeMs: 0,
            checkpointId: null,
            progress: 0
          },
          userPreferences: {},
          unknownState: {}
        },
        recovery: {
          interrupted: false,
          resumeReason: null,
          checkpointId: null,
          resumedAt: null,
          migrationApplied: false,
          corruptionRecovered: false,
          versionBeforeMigration: null
        },
        diagnostics: {
          synchronizations: 0,
          persistedSessions: 0,
          recoveredSessions: 0,
          migrations: 0,
          corruptionRecoveries: 0,
          warnings: [],
          recoverableErrors: []
        },
        metrics: {
          focusMoves: 0,
          keyboardActions: 0,
          restores: 0,
          checkpointRestores: 0,
          unknownFeatureCount: accessibilityRecoveryMetadata.unknownFeatures.length
        },
        runtimeEvents: {
          recent: []
        }
      },
      aiTeacherAdapter: {
        timelineState: {
          state: 'Ready',
          timeMs: 0,
          checkpointId: null,
          progress: 0,
          activeNarrationSegmentId: null,
          updatedAt: null
        },
        speechState: {
          playbackState: 'Ready',
          knownPlaybackState: true,
          timelineTimeMs: 0,
          narrationTimeMs: 0,
          speed: 1,
          muted: false,
          volume: 1,
          currentSegmentId: null,
          updatedAt: null
        },
        adaptiveLearningState: {
          modeProfile: {
            mode: 'intermediate',
            knownMode: true
          },
          progress: {
            progressPercent: 0,
            completedUnits: 0,
            totalUnits: 1
          },
          adaptation: {
            explanationDepth: 0.55,
            pacing: 1,
            examplesIntensity: 0.7,
            complexity: 0.55,
            recommendations: []
          }
        },
        interactionContractState: {
          schemaVersion: 'v1',
          timelineTimeMs: 0,
          metrics: {
            contractCount: interactionContractMetadata.contracts.length,
            objectCount: interactionContractMetadata.objectCount,
            eventCount: 0,
            unknownTypeCount: interactionContractMetadata.unknownTypeCount,
            validationErrors: 0
          }
        },
        inputCameraControlState: {
          schemaVersion: 'v1',
          timelineTimeMs: 0,
          cameraMode: inputCameraMetadata.currentMode,
          knownMode: inputCameraMetadata.knownMode,
          supportedInputDeviceTypes: inputCameraMetadata.supportedInputDeviceTypes,
          supportedCameraModes: inputCameraMetadata.supportedCameraModes
        },
        educationalInspectionState: {
          schemaVersion: 'v1',
          timelineTimeMs: 0,
          metrics: {
            objectCount: educationalInspectionMetadata.objectIds.length,
            selectedCount: 0,
            knownCapabilityCount: educationalInspectionMetadata.knownCapabilities.length,
            unknownCapabilityCount: educationalInspectionMetadata.unknownCapabilities.length,
            inspectionCount: 0,
            manipulationCount: 0,
            undoCount: 0,
            redoCount: 0,
            resetCount: 0,
            validationErrors: 0
          }
        },
        accessibilityRecoveryState: {
          schemaVersion: 'v2',
          timelineTimeMs: 0,
          knownFeatures: accessibilityRecoveryMetadata.knownFeatures,
          unknownFeatures: accessibilityRecoveryMetadata.unknownFeatures,
          focusableObjectIds: accessibilityRecoveryMetadata.focusableObjectIds,
          session: {
            timelinePosition: 0,
            playbackState: 'Ready',
            selectedObjects: [],
            checkpoints: []
          }
        },
        visualizationStrategyState: visualizationStrategyMetadata.profile,
        capabilityTemplateRecommendationState: capabilityTemplateRecommendationMetadata.recommendation,
        confidenceConflictFallbackState: confidenceConflictFallbackMetadata.profile
      }
    }
  };
}
