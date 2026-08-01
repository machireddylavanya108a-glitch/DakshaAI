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

function toKebab(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
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
        }
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
        }
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
        }
      }
    }
  };
}
