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
  return {
    timelineData,
    metadata: {
      timelineId: timelineData.timelineId,
      version: timelineData.version,
      trackIds: (timelineData.tracks || []).map((track) => track.id),
      clipIds: (timelineData.clips || []).map((clip) => clip.id),
      markerIds: (timelineData.markers || []).map((marker) => marker.id),
      eventIds: (timelineData.events || []).map((event) => event.id),
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
      rendererAdapter: {
        timeline: {
          timelineId: timelineMetadata.timelineId,
          version: timelineMetadata.version,
          trackIds: timelineMetadata.trackIds,
          clipIds: timelineMetadata.clipIds,
          markerIds: timelineMetadata.markerIds,
          eventIds: timelineMetadata.eventIds
        }
      }
    }
  };
}
