function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createEducationalObjectRelationshipGraph(options = {}) {
  const maxDepth = Math.max(1, Number(options.maximumRelationshipDepth || 20));
  const objects = new Map();
  const relationships = new Map();
  const outgoing = new Map();
  const incoming = new Map();

  function ensureAdjacency(map, key) {
    if (!map.has(key)) map.set(key, new Set());
    return map.get(key);
  }

  function addObject(objectInstance = {}) {
    const objectId = String(objectInstance?.objectId || objectInstance?.id || '').trim();
    if (!objectId) return null;
    objects.set(objectId, { ...objectInstance, objectId });
    ensureAdjacency(outgoing, objectId);
    ensureAdjacency(incoming, objectId);
    return objects.get(objectId);
  }

  function removeObject(objectId) {
    const id = String(objectId || '').trim();
    if (!id) return false;
    if (!objects.delete(id)) return false;

    for (const [relationshipId, relationship] of relationships.entries()) {
      if (relationship.sourceObjectId === id || relationship.targetObjectId === id) {
        removeRelationship(relationshipId);
      }
    }

    outgoing.delete(id);
    incoming.delete(id);
    return true;
  }

  function addRelationship(input = {}) {
    const relationshipId = String(input.relationshipId || input.relationId || input.id || '').trim();
    const sourceObjectId = String(input.sourceObjectId || '').trim();
    const targetObjectId = String(input.targetObjectId || '').trim();

    if (!relationshipId || !sourceObjectId || !targetObjectId) return null;

    const relationship = {
      relationshipId,
      sourceObjectId,
      targetObjectId,
      relation: String(input.relation || input.type || 'references'),
      direction: String(input.direction || 'directed'),
      weight: Number.isFinite(Number(input.weight)) ? Number(input.weight) : 0.5,
      required: input.required === true,
      active: input.active !== false,
      stateDependencies: toArray(input.stateDependencies),
      behaviorDependencies: toArray(input.behaviorDependencies),
      timelineDependencies: toArray(input.timelineDependencies),
      interactionDependencies: toArray(input.interactionDependencies),
      metadata: input.metadata && typeof input.metadata === 'object' ? clone(input.metadata) : {}
    };

    relationships.set(relationshipId, relationship);
    ensureAdjacency(outgoing, sourceObjectId).add(relationshipId);
    ensureAdjacency(incoming, targetObjectId).add(relationshipId);
    return relationship;
  }

  function removeRelationship(relationshipId) {
    const id = String(relationshipId || '').trim();
    if (!id) return false;
    const relationship = relationships.get(id);
    if (!relationship) return false;
    relationships.delete(id);
    outgoing.get(relationship.sourceObjectId)?.delete(id);
    incoming.get(relationship.targetObjectId)?.delete(id);
    return true;
  }

  function getObject(objectId) {
    return objects.get(String(objectId || '').trim()) || null;
  }

  function getRelationship(relationshipId) {
    return relationships.get(String(relationshipId || '').trim()) || null;
  }

  function getOutgoing(objectId) {
    const ids = outgoing.get(String(objectId || '').trim()) || new Set();
    return [...ids].map((id) => relationships.get(id)).filter(Boolean);
  }

  function getIncoming(objectId) {
    const ids = incoming.get(String(objectId || '').trim()) || new Set();
    return [...ids].map((id) => relationships.get(id)).filter(Boolean);
  }

  function findPath(fromObjectId, toObjectId) {
    const from = String(fromObjectId || '').trim();
    const to = String(toObjectId || '').trim();
    if (!from || !to) return [];
    if (from === to) return [from];

    const queue = [{ node: from, path: [from], depth: 0 }];
    const visited = new Set();

    while (queue.length) {
      const current = queue.shift();
      if (visited.has(current.node)) continue;
      visited.add(current.node);
      if (current.depth >= maxDepth) continue;

      const edges = getOutgoing(current.node).filter((edge) => edge.active !== false);
      for (const edge of edges) {
        const next = edge.targetObjectId;
        const nextPath = [...current.path, next];
        if (next === to) return nextPath;
        queue.push({ node: next, path: nextPath, depth: current.depth + 1 });
      }
    }

    return [];
  }

  function findDependencies(objectId, depthLimit = maxDepth) {
    const start = String(objectId || '').trim();
    if (!start) return [];

    const limit = Math.max(1, Number(depthLimit || maxDepth));
    const dependencies = new Set();
    const stack = [{ node: start, depth: 0 }];

    while (stack.length) {
      const current = stack.pop();
      if (current.depth >= limit) continue;
      getOutgoing(current.node).forEach((edge) => {
        if (dependencies.has(edge.targetObjectId)) return;
        dependencies.add(edge.targetObjectId);
        stack.push({ node: edge.targetObjectId, depth: current.depth + 1 });
      });
    }

    return [...dependencies];
  }

  function findDependents(objectId, depthLimit = maxDepth) {
    const start = String(objectId || '').trim();
    if (!start) return [];

    const limit = Math.max(1, Number(depthLimit || maxDepth));
    const dependents = new Set();
    const stack = [{ node: start, depth: 0 }];

    while (stack.length) {
      const current = stack.pop();
      if (current.depth >= limit) continue;
      getIncoming(current.node).forEach((edge) => {
        if (dependents.has(edge.sourceObjectId)) return;
        dependents.add(edge.sourceObjectId);
        stack.push({ node: edge.sourceObjectId, depth: current.depth + 1 });
      });
    }

    return [...dependents];
  }

  function detectCycles() {
    const cycles = [];
    const visited = new Set();
    const stack = new Set();

    function walk(node, path = []) {
      if (stack.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart).concat(node));
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      stack.add(node);
      const edges = getOutgoing(node);
      edges.forEach((edge) => walk(edge.targetObjectId, [...path, node]));
      stack.delete(node);
    }

    for (const objectId of objects.keys()) walk(objectId, []);
    return cycles;
  }

  function validateGraph() {
    const errors = [];
    const warnings = [];

    for (const relationship of relationships.values()) {
      if (!objects.has(relationship.sourceObjectId)) {
        const message = `Missing source object for relationship ${relationship.relationshipId}: ${relationship.sourceObjectId}`;
        relationship.required ? errors.push(message) : warnings.push(message);
      }
      if (!objects.has(relationship.targetObjectId)) {
        const message = `Missing target object for relationship ${relationship.relationshipId}: ${relationship.targetObjectId}`;
        relationship.required ? errors.push(message) : warnings.push(message);
      }
    }

    const cycles = detectCycles();
    if (cycles.length) warnings.push(`Detected ${cycles.length} relationship cycle(s).`);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      cycles
    };
  }

  function serializeGraph() {
    return {
      nodes: [...objects.values()].map((value) => clone(value)),
      edges: [...relationships.values()].map((value) => clone(value))
    };
  }

  return {
    addObject,
    removeObject,
    addRelationship,
    removeRelationship,
    getObject,
    getRelationship,
    getOutgoing,
    getIncoming,
    findPath,
    findDependencies,
    findDependents,
    detectCycles,
    validateGraph,
    serializeGraph
  };
}
