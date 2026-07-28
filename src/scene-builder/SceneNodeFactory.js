import { SceneNode, GenericSceneNode } from './SceneNode.js';

function createRuntimeId(prefix = 'node') {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // Ignore crypto access issues.
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function createSceneNode(payload = {}, context = {}) {
  const source = payload && typeof payload === 'object' ? payload : {};
  const knownKinds = new Set(Array.isArray(context.knownKinds) ? context.knownKinds : []);
  const kind = String(source.kind || 'Generic').trim() || 'Generic';
  const id = String(source.id || createRuntimeId('node')).trim();

  const base = {
    id,
    kind,
    metadata: source.metadata || {},
    parent: source.parent || null,
    children: Array.isArray(source.children) ? source.children : [],
    state: source.state || 'Created',
    properties: source.properties || {},
    runtimeData: source.runtimeData || {}
  };

  if (!knownKinds.size || knownKinds.has(kind)) {
    return new SceneNode(base);
  }
  return new GenericSceneNode(base);
}
