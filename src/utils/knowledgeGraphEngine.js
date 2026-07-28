function normalize(value, fallback = '') {
  const output = String(value || '').trim();
  return output || fallback;
}

function unique(items = []) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

function buildConcepts(topic = '', prereqs = [], related = []) {
  const base = [topic, ...prereqs, ...related].filter(Boolean);
  return unique(base).slice(0, 12);
}

export function buildKnowledgeGraph({ topic = '', prereqs = [], relatedTopics = [], advancedTopics = [], similarTopics = [], revisions = [] } = {}) {
  const conceptList = buildConcepts(topic, prereqs, [...relatedTopics, ...advancedTopics, ...similarTopics, ...revisions]);
  const nodes = conceptList.map((concept, index) => ({ id: `node-${index + 1}`, label: concept }));
  const edges = [];

  if (topic) edges.push({ from: 'node-1', to: 'node-2', relation: 'focuses-on' });
  prereqs.forEach((prereq, index) => {
    const targetIndex = nodes.findIndex((node) => node.label === prereq) + 1;
    if (targetIndex > 1) edges.push({ from: `node-${targetIndex}`, to: 'node-1', relation: 'prerequisite' });
  });

  relatedTopics.forEach((topicName, index) => {
    const sourceIndex = nodes.findIndex((node) => node.label === topicName) + 1;
    if (sourceIndex > 0) edges.push({ from: 'node-1', to: `node-${sourceIndex}`, relation: 'related-to' });
  });

  advancedTopics.forEach((topicName, index) => {
    const sourceIndex = nodes.findIndex((node) => node.label === topicName) + 1;
    if (sourceIndex > 0) edges.push({ from: `node-${sourceIndex}`, to: 'node-1', relation: 'advances' });
  });

  similarTopics.forEach((topicName, index) => {
    const sourceIndex = nodes.findIndex((node) => node.label === topicName) + 1;
    if (sourceIndex > 0) edges.push({ from: 'node-1', to: `node-${sourceIndex}`, relation: 'similar-to' });
  });

  revisions.forEach((topicName, index) => {
    const sourceIndex = nodes.findIndex((node) => node.label === topicName) + 1;
    if (sourceIndex > 0) edges.push({ from: `node-${sourceIndex}`, to: 'node-1', relation: 'revision' });
  });

  return {
    topic: normalize(topic, 'Learning Topic'),
    nodes,
    edges,
    conceptGraph: nodes.map((node) => node.label),
    skillGraph: unique([topic, ...prereqs, ...relatedTopics, ...advancedTopics]),
    relationshipGraph: edges,
    prerequisites: prereqs,
    nextConcepts: relatedTopics,
    similarTopics,
    advancedTopics,
    revisionGraph: revisions,
    learningTree: nodes.map((node) => node.label),
    dependencyGraph: edges.filter((edge) => edge.relation === 'prerequisite' || edge.relation === 'advances')
  };
}
