export function buildSceneHierarchy(graph) {
  graph.nodes.forEach((node) => {
    node.children = [];
  });

  graph.findEdgesByRelation('Contains').forEach((edge) => {
    const parent = graph.getNode(edge.from);
    const child = graph.getNode(edge.to);
    if (!parent || !child) return;

    if (!parent.children.includes(child.id)) {
      parent.children.push(child.id);
    }
    child.parent = parent.id;
  });

  return graph;
}

export function getGraphDepth(graph, rootId) {
  const visited = new Set();
  function depth(nodeId) {
    if (!nodeId || visited.has(nodeId)) return 0;
    visited.add(nodeId);
    const node = graph.getNode(nodeId);
    if (!node || !Array.isArray(node.children) || !node.children.length) return 1;
    return 1 + Math.max(...node.children.map((childId) => depth(childId)));
  }

  return depth(rootId);
}
