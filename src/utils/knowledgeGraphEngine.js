function normalize(value, fallback = '') {
  const output = String(value || '').trim();
  return output || fallback;
}

function unique(items = []) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

function tokenizeConcepts(text = '') {
  return unique(String(text || '').split(/[^a-zA-Z0-9]+/).filter(Boolean).slice(0, 12));
}

function buildConcepts(topic = '', prereqs = [], related = [], text = '') {
  const derived = tokenizeConcepts(text);
  const base = [topic, ...prereqs, ...related, ...derived].filter(Boolean);
  return unique(base).slice(0, 12);
}

function buildSkillGraph(topic = '', prereqs = [], related = [], advanced = []) {
  return unique([topic, ...prereqs, ...related, ...advanced]).slice(0, 8);
}

function buildDependencyGraph(topic = '', prereqs = [], advanced = []) {
  const deps = [];
  prereqs.forEach((prereq) => deps.push({ from: prereq, to: topic, relation: 'prerequisite' }));
  advanced.forEach((item) => deps.push({ from: topic, to: item, relation: 'advances' }));
  return deps.slice(0, 8);
}

function buildLearningTree(topic = '', prereqs = [], related = [], advanced = []) {
  const ordered = unique([...(prereqs || []), topic, ...(related || []), ...(advanced || [])]);
  return ordered.slice(0, 8);
}

function buildRevisionGraph(revisions = [], topic = '') {
  return unique([topic, ...revisions]).slice(0, 8);
}

function buildFutureTopics(advanced = [], similar = [], related = []) {
  return unique([...(advanced || []), ...(similar || []), ...(related || [])]).slice(0, 8);
}

export function buildKnowledgeGraph({
  topic = '',
  prereqs = [],
  relatedTopics = [],
  advancedTopics = [],
  similarTopics = [],
  revisions = [],
  sourceText = '',
  visualizationStrategy = null
} = {}) {
  const safeTopic = normalize(topic, 'Learning topic');
  const conceptList = buildConcepts(safeTopic, prereqs, [...relatedTopics, ...advancedTopics, ...similarTopics, ...revisions], sourceText);
  const nodes = conceptList.length
    ? conceptList.map((concept, index) => ({ id: `node-${index + 1}`, label: concept }))
    : [{ id: 'node-1', label: 'Core concept' }, { id: 'node-2', label: 'Practice loop' }];
  const edges = [];

  if (nodes.length === 1) {
    nodes.push({ id: 'node-2', label: 'Practice loop' });
  }

  if (nodes.length > 1) edges.push({ from: nodes[0].id, to: nodes[1].id, relation: 'focuses-on' });
  prereqs.forEach((prereq) => {
    const targetIndex = nodes.findIndex((node) => node.label === prereq) + 1;
    if (targetIndex > 1) edges.push({ from: `node-${targetIndex}`, to: 'node-1', relation: 'prerequisite' });
  });
  relatedTopics.forEach((topicName) => {
    const sourceIndex = nodes.findIndex((node) => node.label === topicName) + 1;
    if (sourceIndex > 0) edges.push({ from: 'node-1', to: `node-${sourceIndex}`, relation: 'related-to' });
  });
  advancedTopics.forEach((topicName) => {
    const sourceIndex = nodes.findIndex((node) => node.label === topicName) + 1;
    if (sourceIndex > 0) edges.push({ from: `node-${sourceIndex}`, to: 'node-1', relation: 'advances' });
  });
  similarTopics.forEach((topicName) => {
    const sourceIndex = nodes.findIndex((node) => node.label === topicName) + 1;
    if (sourceIndex > 0) edges.push({ from: 'node-1', to: `node-${sourceIndex}`, relation: 'similar-to' });
  });
  revisions.forEach((topicName) => {
    const sourceIndex = nodes.findIndex((node) => node.label === topicName) + 1;
    if (sourceIndex > 0) edges.push({ from: `node-${sourceIndex}`, to: 'node-1', relation: 'revision' });
  });

  const dependencyGraph = buildDependencyGraph(topic, prereqs, advancedTopics);
  const skillGraph = buildSkillGraph(topic, prereqs, relatedTopics, advancedTopics);
  const learningTree = buildLearningTree(topic, prereqs, relatedTopics, advancedTopics);
  const revisionGraph = buildRevisionGraph(revisions, topic);
  const futureTopics = buildFutureTopics(advancedTopics, similarTopics, relatedTopics);

  return {
    topic: safeTopic,
    nodes,
    edges,
    conceptGraph: nodes.map((node) => node.label),
    skillGraph,
    relationshipGraph: edges,
    prerequisites: unique(prereqs),
    nextConcepts: unique(relatedTopics),
    similarTopics: unique(similarTopics),
    advancedTopics: unique(advancedTopics),
    revisionGraph,
    learningTree,
    dependencyGraph,
    futureTopics,
    sourceText: normalize(sourceText, ''),
    visualizationStrategy: visualizationStrategy && typeof visualizationStrategy === 'object' ? visualizationStrategy : null,
    generatedAt: new Date().toISOString()
  };
}
