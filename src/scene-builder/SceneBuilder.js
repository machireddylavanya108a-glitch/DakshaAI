import { SceneGraph } from './SceneGraph.js';
import { SceneRegistry } from './SceneRegistry.js';
import { createSceneNode } from './SceneNodeFactory.js';
import { createNodeSpecsFromScene, deriveKnownKinds } from './SceneObjectFactory.js';
import { buildRelationships } from './SceneRelationshipBuilder.js';
import { buildSceneHierarchy } from './SceneHierarchy.js';
import { resolveSceneDependencies } from './SceneDependencyResolver.js';
import { SceneStateManager } from './SceneStateManager.js';
import { buildSceneBuilderDiagnostics } from './SceneBuilderDiagnostics.js';

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

  return {
    sceneId: validatedSceneJson.sceneId,
    graph,
    registry,
    stateManager,
    diagnostics,
    metadata: {
      title: validatedSceneJson.title,
      subject: validatedSceneJson.subject,
      version: validatedSceneJson.version
    }
  };
}
