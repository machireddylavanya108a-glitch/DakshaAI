import { createSceneNode } from './SceneNodeFactory.js';

function detectCircularReferences(graph) {
  const adjacency = new Map();
  graph.edges.forEach((edge) => {
    if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
    adjacency.get(edge.from).push(edge.to);
  });

  const visiting = new Set();
  const visited = new Set();
  const cycles = [];

  function dfs(nodeId, path = []) {
    if (visiting.has(nodeId)) {
      cycles.push([...path, nodeId]);
      return;
    }
    if (visited.has(nodeId)) return;

    visiting.add(nodeId);
    const next = adjacency.get(nodeId) || [];
    next.forEach((toId) => dfs(toId, [...path, nodeId]));
    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  graph.nodes.forEach((_node, nodeId) => dfs(nodeId));
  return cycles;
}

export function resolveSceneDependencies({ graph, registry, knownKinds = [] }) {
  const diagnostics = {
    warnings: [],
    errors: [],
    repairCount: 0
  };

  const edgeKeys = new Set();
  graph.edges = graph.edges.filter((edge) => {
    const key = `${edge.from}|${edge.relation}|${edge.to}`;
    if (edgeKeys.has(key)) {
      diagnostics.warnings.push(`Duplicate reference removed: ${key}`);
      diagnostics.repairCount += 1;
      return false;
    }
    edgeKeys.add(key);
    return true;
  });

  graph.edges.forEach((edge) => {
    if (!registry.find(edge.from)) {
      const fromNode = createSceneNode({
        id: edge.from,
        kind: 'unresolved-source',
        metadata: { unresolved: true },
        properties: {},
        runtimeData: { placeholder: true }
      }, { knownKinds });
      graph.addNode(fromNode);
      registry.register(fromNode);
      diagnostics.warnings.push(`Created placeholder source node for forward reference ${edge.from}.`);
      diagnostics.repairCount += 1;
    }

    if (!registry.find(edge.to)) {
      const toNode = createSceneNode({
        id: edge.to,
        kind: 'unresolved-target',
        metadata: { unresolved: true },
        properties: {},
        runtimeData: { placeholder: true }
      }, { knownKinds });
      graph.addNode(toNode);
      registry.register(toNode);
      diagnostics.warnings.push(`Created placeholder target node for broken reference ${edge.to}.`);
      diagnostics.repairCount += 1;
    }
  });

  const cycles = detectCircularReferences(graph);
  if (cycles.length) {
    cycles.forEach((cycle) => diagnostics.warnings.push(`Circular reference detected: ${cycle.join(' -> ')}`));
  }

  return diagnostics;
}
