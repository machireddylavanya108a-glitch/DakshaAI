import { getGraphDepth } from './SceneHierarchy.js';

function estimateMemoryBytes(graph) {
  const nodeWeight = graph.getNodeCount() * 420;
  const edgeWeight = graph.getRelationshipCount() * 120;
  return nodeWeight + edgeWeight;
}

export function buildSceneBuilderDiagnostics({
  graph,
  sceneId,
  buildStart,
  relationshipCount = 0,
  dependencyDiagnostics = { warnings: [], errors: [], repairCount: 0 }
}) {
  const rootId = String(sceneId || 'scene-root');
  const graphDepth = getGraphDepth(graph, rootId);
  const buildTimeMs = Math.max(0, Date.now() - Number(buildStart || Date.now()));

  return {
    buildTimeMs,
    nodeCount: graph.getNodeCount(),
    relationshipCount: relationshipCount || graph.getRelationshipCount(),
    repairCount: dependencyDiagnostics.repairCount || 0,
    warnings: dependencyDiagnostics.warnings || [],
    errors: dependencyDiagnostics.errors || [],
    graphDepth,
    memoryEstimateBytes: estimateMemoryBytes(graph)
  };
}
