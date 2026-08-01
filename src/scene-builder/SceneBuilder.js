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
  const rootNode = graph.getNode(validatedSceneJson.sceneId);
  if (rootNode) {
    rootNode.runtimeData = {
      ...(rootNode.runtimeData || {}),
      timelineMetadata
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
        }
      },
      interactionEngine: {
        timelineState: {
          state: 'Ready',
          timeMs: 0,
          currentEventId: null,
          activeNarrationSegmentId: null,
          updatedAt: null
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
      }
    }
  };
}
