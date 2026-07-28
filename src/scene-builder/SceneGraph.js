function edgeId(from, relation, to) {
  return `${from}::${relation}::${to}`;
}

export class SceneGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.edgeSet = new Set();
  }

  addNode(node) {
    if (!node?.id) return null;
    this.nodes.set(node.id, node);
    return node;
  }

  removeNode(nodeId) {
    if (!nodeId) return;
    this.nodes.delete(nodeId);
    this.edges = this.edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
    this.edgeSet = new Set(this.edges.map((edge) => edgeId(edge.from, edge.relation, edge.to)));
  }

  getNode(nodeId) {
    return this.nodes.get(nodeId) || null;
  }

  addEdge(edge) {
    const from = String(edge?.from || '').trim();
    const to = String(edge?.to || '').trim();
    const relation = String(edge?.relation || 'References').trim();
    if (!from || !to) return null;

    const key = edgeId(from, relation, to);
    if (this.edgeSet.has(key)) return null;

    const next = { from, to, relation, metadata: edge?.metadata || {} };
    this.edges.push(next);
    this.edgeSet.add(key);
    return next;
  }

  findEdgesByRelation(relation) {
    return this.edges.filter((edge) => edge.relation === relation);
  }

  getNodeCount() {
    return this.nodes.size;
  }

  getRelationshipCount() {
    return this.edges.length;
  }

  toJSON() {
    return {
      nodes: [...this.nodes.values()],
      edges: [...this.edges]
    };
  }
}
