function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractRefs(value, refs = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => extractRefs(item, refs));
    return refs;
  }

  if (!isObject(value)) {
    if (typeof value === 'string' && value.trim()) refs.push(value.trim());
    return refs;
  }

  Object.entries(value).forEach(([key, nested]) => {
    if (/id$|ids$|target|ref|reference/i.test(key)) {
      if (Array.isArray(nested)) {
        nested.forEach((item) => {
          if (typeof item === 'string' && item.trim()) refs.push(item.trim());
          if (isObject(item) && typeof item.id === 'string') refs.push(item.id.trim());
        });
      } else if (typeof nested === 'string' && nested.trim()) {
        refs.push(nested.trim());
      } else if (isObject(nested) && typeof nested.id === 'string') {
        refs.push(nested.id.trim());
      }
    }
    extractRefs(nested, refs);
  });

  return refs;
}

export function buildRelationships({ graph, nodes = [], sceneJson = {} }) {
  const sceneRoot = String(sceneJson.sceneId || 'scene-root');
  const edges = [];

  nodes.forEach((node) => {
    if (node.id !== sceneRoot) {
      edges.push({ from: sceneRoot, to: node.id, relation: 'Contains' });
    }

    if (node.parent) {
      edges.push({ from: node.parent, to: node.id, relation: 'Contains' });
    }

    const refs = extractRefs({
      metadata: node.metadata,
      properties: node.properties,
      runtimeData: node.runtimeData
    });

    refs.forEach((refId) => {
      if (refId !== node.id) {
        edges.push({ from: node.id, to: refId, relation: 'References' });
      }
    });
  });

  const rawRelationships = Array.isArray(sceneJson?.relationships) ? sceneJson.relationships : [];
  rawRelationships.forEach((relationship, index) => {
    const from = String(relationship?.from || '').trim();
    const to = String(relationship?.to || '').trim();
    if (!from || !to) return;
    edges.push({
      from,
      to,
      relation: String(relationship?.relation || relationship?.type || `Related-${index + 1}`),
      metadata: relationship?.metadata || {}
    });
  });

  edges.forEach((edge) => graph.addEdge(edge));
  return edges;
}
