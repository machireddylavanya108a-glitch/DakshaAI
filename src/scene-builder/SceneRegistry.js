export class SceneRegistry {
  constructor() {
    this.nodes = new Map();
  }

  register(node) {
    if (!node?.id) return null;
    this.nodes.set(node.id, node);
    return node;
  }

  unregister(nodeId) {
    this.nodes.delete(nodeId);
  }

  find(nodeId) {
    return this.nodes.get(nodeId) || null;
  }

  findByType(kind) {
    const safeKind = String(kind || '');
    return [...this.nodes.values()].filter((node) => node.kind === safeKind);
  }

  findByMetadata(query = {}) {
    const entries = Object.entries(query || {});
    if (!entries.length) return [...this.nodes.values()];
    return [...this.nodes.values()].filter((node) => entries.every(([key, value]) => node?.metadata?.[key] === value));
  }

  update(nodeId, patch = {}) {
    const current = this.find(nodeId);
    if (!current) return null;
    const updated = { ...current, ...patch };
    this.nodes.set(nodeId, updated);
    return updated;
  }

  destroy() {
    this.nodes.clear();
  }
}
