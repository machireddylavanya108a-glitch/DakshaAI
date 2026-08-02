import {
  UNIVERSAL_AI_KNOWLEDGE_MEMORY_SCHEMA_VERSION,
  DEFAULT_UNIVERSAL_AI_KNOWLEDGE_MEMORY_CONFIG,
  isObject,
  asArray,
  safeString,
  toFiniteNumber,
  clamp,
  uniqueStrings
} from './UniversalAIKnowledgeGraphMemoryIntelligenceEngineConfig.js';

const STORE_KEY = '__daksha_universal_ai_knowledge_memory_store__';

function createInMemoryStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }

  const store = globalThis[STORE_KEY];
  return {
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    getItem(key) {
      return store.get(String(key)) || null;
    },
    removeItem(key) {
      store.delete(String(key));
    }
  };
}

function createDefaultPersistenceAdapter() {
  const local = globalThis?.localStorage;
  if (local && typeof local.getItem === 'function' && typeof local.setItem === 'function') {
    return local;
  }
  return createInMemoryStore();
}

function parsePayload(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return isObject(value) ? value : null;
}

function inferRuntimeGraphSummary(runtimeGraph = {}) {
  if (typeof runtimeGraph?.getNodeCount === 'function' || typeof runtimeGraph?.getRelationshipCount === 'function') {
    return {
      nodeCount: Math.max(0, toFiniteNumber(runtimeGraph?.getNodeCount?.(), 0)),
      relationshipCount: Math.max(0, toFiniteNumber(runtimeGraph?.getRelationshipCount?.(), 0))
    };
  }

  const nodes = asArray(runtimeGraph?.nodes || runtimeGraph?.lessonGraph?.nodes);
  const edges = asArray(runtimeGraph?.edges || runtimeGraph?.lessonGraph?.edges);

  return {
    nodeCount: nodes.length,
    relationshipCount: edges.length
  };
}

function createDefaultState() {
  return {
    schemaVersion: UNIVERSAL_AI_KNOWLEDGE_MEMORY_SCHEMA_VERSION,
    status: 'Ready',
    output: null,
    diagnostics: {
      runs: 0,
      recoveries: 0,
      persistedSessions: 0,
      warnings: [],
      latestDurationMs: 0
    },
    recovery: {
      interrupted: false,
      checkpointId: null,
      resumeTimeMs: 0,
      resumeCount: 0
    },
    memory: {
      longTerm: [],
      session: [],
      shortTerm: []
    },
    history: {
      recentEvents: []
    }
  };
}

function pushHistory(state = {}, entry = {}, maxHistory = 1000) {
  const events = asArray(state?.history?.recentEvents);
  events.push(entry);
  while (events.length > maxHistory) {
    events.shift();
  }
  state.history.recentEvents = events;
}

function resolveRuntimeInput(runtime = {}, input = {}) {
  return {
    lessonGraph: isObject(input.lessonGraph) ? input.lessonGraph : runtime?.metadata?.lessonGraph || {},
    curriculumGraph: isObject(input.curriculumGraph) ? input.curriculumGraph : runtime?.metadata?.curriculumAuthoringAdapter?.output || {},
    runtimeGraph: isObject(input.runtimeGraph) ? input.runtimeGraph : runtime?.graph || {},
    learningAnalytics: isObject(input.learningAnalytics) ? input.learningAnalytics : runtime?.metadata?.learningAnalyticsAdapter || {},
    aiTeacherEvents: asArray(input.aiTeacherEvents).length ? asArray(input.aiTeacherEvents) : asArray(runtime?.metadata?.aiTeacherAdapter?.runtimeState?.history?.recentEvents),
    assessmentResults: isObject(input.assessmentResults) ? input.assessmentResults : runtime?.metadata?.assessmentAdapter || {},
    userLearningProfile: isObject(input.userLearningProfile) ? input.userLearningProfile : runtime?.metadata?.userLearningProfile || runtime?.metadata?.learningProfile || {},
    sessionHistory: asArray(input.sessionHistory).length ? asArray(input.sessionHistory) : asArray(runtime?.metadata?.sessionHistory),
    interactionEvents: asArray(input.interactionEvents).length ? asArray(input.interactionEvents) : asArray(runtime?.sceneEventRuntime?.events),
    personalization: isObject(input.personalization) ? input.personalization : runtime?.metadata?.personalizationAdaptiveAdapter || {},
    timelineEvents: asArray(input.timelineEvents).length ? asArray(input.timelineEvents) : asArray(runtime?.sceneEventRuntime?.events),
    learningIntent: isObject(input.learningIntent) ? input.learningIntent : runtime?.metadata?.intentProfile || runtime?.metadata?.learningIntent || {},
    pipeline: isObject(input.pipeline) ? input.pipeline : runtime?.metadata?.pipeline || runtime?.metadata?.sourceMeta || {},
    graphTypes: asArray(input.graphTypes),
    memoryModels: asArray(input.memoryModels)
  };
}

function buildTopicUniverse(source = {}) {
  const topics = uniqueStrings([
    ...asArray(source.lessonGraph.topics),
    ...asArray(source.lessonGraph.keyConcepts),
    ...asArray(source.curriculumGraph.topics).map((topic) => topic?.title || topic),
    ...asArray(source.curriculumGraph.skillMap).map((skill) => skill?.skill || skill),
    safeString(source.lessonGraph.title)
  ], 600);

  return topics.map((topic, index) => ({
    id: `concept-${index + 1}`,
    title: topic
  }));
}

function buildEdge(from, to, relation, index) {
  return {
    id: `${relation}-${index + 1}`,
    from,
    to,
    relation
  };
}

function buildConceptGraph(concepts = []) {
  const nodes = concepts.map((concept) => ({
    id: concept.id,
    label: concept.title,
    kind: 'concept'
  }));

  const edges = concepts.slice(1).map((concept, index) => buildEdge(concepts[index].id, concept.id, 'related-to', index));
  return { nodes, edges };
}

function buildDependencyGraph(concepts = []) {
  const edges = concepts.slice(1).map((concept, index) => buildEdge(concepts[index].id, concept.id, 'depends-on', index));
  return {
    nodes: concepts.map((concept) => ({ id: concept.id, label: concept.title })),
    edges
  };
}

function buildSkillGraph(curriculumGraph = {}, concepts = []) {
  const skills = asArray(curriculumGraph.skillMap).length > 0
    ? asArray(curriculumGraph.skillMap).map((item, index) => ({
      id: safeString(item?.id || `skill-${index + 1}`) || `skill-${index + 1}`,
      label: safeString(item?.skill || `Skill ${index + 1}`) || `Skill ${index + 1}`
    }))
    : concepts.slice(0, 200).map((concept, index) => ({
      id: `skill-${index + 1}`,
      label: concept.title
    }));

  const edges = skills.map((skill, index) => buildEdge(concepts[index % Math.max(1, concepts.length)]?.id || 'concept-1', skill.id, 'maps-to-skill', index));
  return { nodes: skills, edges };
}

function buildLearningGraph(concepts = [], objectives = []) {
  const objectiveNodes = objectives.map((objective, index) => ({
    id: `objective-node-${index + 1}`,
    label: safeString(objective?.objective || objective),
    kind: 'objective'
  }));

  const conceptNodes = concepts.map((concept) => ({
    id: concept.id,
    label: concept.title,
    kind: 'concept'
  }));

  const edges = objectiveNodes.map((objectiveNode, index) => buildEdge(objectiveNode.id, conceptNodes[index % Math.max(1, conceptNodes.length)]?.id || 'concept-1', 'teaches', index));

  return {
    nodes: [...conceptNodes, ...objectiveNodes],
    edges
  };
}

function buildRelationshipGraph(concepts = []) {
  const edges = [];
  concepts.forEach((concept, index) => {
    const next = concepts[(index + 1) % Math.max(1, concepts.length)];
    if (!next || next.id === concept.id) return;

    edges.push(buildEdge(concept.id, next.id, 'comparison', edges.length));
    if (index % 2 === 0) {
      edges.push(buildEdge(concept.id, next.id, 'similarity', edges.length));
    } else {
      edges.push(buildEdge(concept.id, next.id, 'difference', edges.length));
    }

    if (index % 3 === 0) {
      edges.push(buildEdge(concept.id, next.id, 'cause-effect', edges.length));
    }

    if (index % 4 === 0) {
      edges.push(buildEdge(concept.id, next.id, 'cross-topic-link', edges.length));
    }

    if (index % 5 === 0) {
      edges.push(buildEdge(concept.id, next.id, 'interdisciplinary-link', edges.length));
    }
  });

  return {
    nodes: concepts.map((concept) => ({ id: concept.id, label: concept.title })),
    edges
  };
}

function buildRevisionGraph(concepts = [], analytics = {}) {
  const revisions = Math.max(0, toFiniteNumber(analytics?.output?.learningProgress?.revisionHistory?.totalRevisions ?? analytics?.revisionCount ?? 0, 0));
  return {
    nodes: concepts.map((concept) => ({
      id: `revision-${concept.id}`,
      conceptId: concept.id,
      intervalDays: revisions > 10 ? 1 : revisions > 4 ? 3 : 7
    })),
    edges: concepts.slice(1).map((concept, index) => buildEdge(`revision-${concepts[index].id}`, `revision-${concept.id}`, 'revision-next', index))
  };
}

function buildMasteryGraph(concepts = [], analytics = {}, assessment = {}) {
  const mastery = clamp(assessment?.output?.masteryScore ?? analytics?.output?.masteryScore ?? 0.5, 0, 1);
  const nodes = concepts.map((concept, index) => ({
    id: `mastery-${concept.id}`,
    conceptId: concept.id,
    mastery: clamp(mastery - ((index % 8) * 0.04), 0, 1)
  }));

  const edges = nodes.slice(1).map((node, index) => buildEdge(nodes[index].id, node.id, 'mastery-progression', index));
  return { nodes, edges };
}

function buildLearningHistoryGraph(sessionHistory = [], interactionEvents = []) {
  const sessionNodes = asArray(sessionHistory).map((session, index) => ({
    id: safeString(session?.sessionId || `session-${index + 1}`) || `session-${index + 1}`,
    timestamp: Number(session?.date || session?.timestamp || Date.now()),
    durationMinutes: Math.max(1, toFiniteNumber(session?.durationMinutes, 20))
  }));

  const interactionNodes = asArray(interactionEvents).slice(0, 600).map((event, index) => ({
    id: safeString(event?.id || `interaction-${index + 1}`) || `interaction-${index + 1}`,
    type: safeString(event?.type || 'interaction-event') || 'interaction-event'
  }));

  const edges = interactionNodes.map((eventNode, index) => buildEdge(sessionNodes[index % Math.max(1, sessionNodes.length)]?.id || 'session-1', eventNode.id, 'contains-interaction', index));

  return {
    nodes: [...sessionNodes, ...interactionNodes],
    edges
  };
}

function buildCareerGraph(curriculumGraph = {}, concepts = []) {
  const careerNodes = asArray(curriculumGraph?.careerPath?.roles).length > 0
    ? asArray(curriculumGraph.careerPath.roles).map((role, index) => ({
      id: safeString(role?.id || `career-${index + 1}`) || `career-${index + 1}`,
      label: safeString(role?.role || `Career Role ${index + 1}`) || `Career Role ${index + 1}`
    }))
    : concepts.slice(0, 40).map((concept, index) => ({
      id: `career-${index + 1}`,
      label: `Role applying ${concept.title}`
    }));

  const edges = careerNodes.map((careerNode, index) => buildEdge(concepts[index % Math.max(1, concepts.length)]?.id || 'concept-1', careerNode.id, 'career-mapping', index));
  return { nodes: careerNodes, edges };
}

function buildConceptClusters(concepts = []) {
  const clusters = [];
  const chunk = Math.max(1, Math.ceil(concepts.length / 8));
  for (let index = 0; index < concepts.length; index += chunk) {
    const clusterIndex = clusters.length + 1;
    const members = concepts.slice(index, index + chunk);
    clusters.push({
      id: `cluster-${clusterIndex}`,
      label: members[0]?.title || `Cluster ${clusterIndex}`,
      conceptIds: members.map((member) => member.id)
    });
  }
  return clusters;
}

function buildSemanticLinks(concepts = []) {
  return concepts.slice(1).map((concept, index) => ({
    id: `semantic-link-${index + 1}`,
    from: concepts[index].id,
    to: concept.id,
    type: index % 2 === 0 ? 'semantic-similarity' : 'semantic-contrast',
    confidence: clamp(0.55 + ((index % 6) * 0.06), 0, 1)
  }));
}

function buildMemoryIntelligence(concepts = [], source = {}, graphs = {}, analytics = {}, assessment = {}) {
  const masteryScore = clamp(assessment?.output?.masteryScore ?? analytics?.output?.masteryScore ?? 0.5, 0, 1);
  const weakConcepts = concepts.slice(0, Math.max(1, Math.round(concepts.length * (1 - masteryScore) * 0.35)));
  const strongConcepts = concepts.slice(0, Math.max(1, Math.round(concepts.length * masteryScore * 0.25)));

  const longTermMemory = concepts.slice(0, 220).map((concept, index) => ({
    id: `ltm-${index + 1}`,
    conceptId: concept.id,
    memoryStrength: clamp(masteryScore + ((index % 5) * 0.03), 0, 1),
    nextReviewDays: index < 5 ? 1 : index < 20 ? 3 : 7
  }));

  const sessionMemory = asArray(source.sessionHistory).slice(-120).map((item, index) => ({
    id: `session-memory-${index + 1}`,
    sessionId: safeString(item?.sessionId || `session-${index + 1}`) || `session-${index + 1}`,
    context: safeString(item?.topic || item?.title || 'learning-session') || 'learning-session'
  }));

  const shortTermContext = asArray(source.interactionEvents).slice(-120).map((event, index) => ({
    id: `short-term-${index + 1}`,
    eventId: safeString(event?.id || `event-${index + 1}`) || `event-${index + 1}`,
    eventType: safeString(event?.type || 'interaction-event') || 'interaction-event'
  }));

  const conceptMemory = concepts.slice(0, 240).map((concept, index) => ({
    id: `concept-memory-${index + 1}`,
    conceptId: concept.id,
    recallScore: clamp(masteryScore - ((index % 7) * 0.05), 0, 1)
  }));

  const weakConceptMemory = weakConcepts.map((concept, index) => ({
    id: `weak-memory-${index + 1}`,
    conceptId: concept.id,
    recoveryPriority: index < 8 ? 'high' : 'normal'
  }));

  const strongConceptMemory = strongConcepts.map((concept, index) => ({
    id: `strong-memory-${index + 1}`,
    conceptId: concept.id,
    reinforcementPriority: index < 8 ? 'extend' : 'maintain'
  }));

  const revisionMemory = asArray(graphs.revisionGraph?.nodes).map((node, index) => ({
    id: `revision-memory-${index + 1}`,
    conceptId: node.conceptId || node.id,
    intervalDays: Math.max(1, toFiniteNumber(node.intervalDays, 3))
  }));

  const interactionMemory = asArray(source.interactionEvents).slice(-200).map((event, index) => ({
    id: `interaction-memory-${index + 1}`,
    eventId: safeString(event?.id || `event-${index + 1}`) || `event-${index + 1}`,
    summary: safeString(event?.type || 'interaction-event') || 'interaction-event'
  }));

  const aiTeacherMemory = asArray(source.aiTeacherEvents).slice(-120).map((event, index) => ({
    id: `teacher-memory-${index + 1}`,
    eventId: safeString(event?.id || `teacher-event-${index + 1}`) || `teacher-event-${index + 1}`,
    strategy: safeString(event?.eventName || event?.type || 'guided-teaching') || 'guided-teaching'
  }));

  const adaptiveMemory = conceptMemory.slice(0, 200).map((item, index) => ({
    id: `adaptive-memory-${index + 1}`,
    conceptId: item.conceptId,
    adaptation: item.recallScore < 0.45 ? 'reinforce' : item.recallScore > 0.8 ? 'advance' : 'maintain'
  }));

  return {
    longTermMemory,
    sessionMemory,
    shortTermContext,
    conceptMemory,
    weakConceptMemory,
    strongConceptMemory,
    revisionMemory,
    interactionMemory,
    aiTeacherMemory,
    adaptiveMemory,
    conceptRecall: {
      averageRecall: clamp(conceptMemory.reduce((sum, item) => sum + item.recallScore, 0) / Math.max(1, conceptMemory.length), 0, 1)
    },
    spacedRepetitionMetadata: {
      entries: revisionMemory.length,
      averageIntervalDays: clamp(revisionMemory.reduce((sum, item) => sum + item.intervalDays, 0) / Math.max(1, revisionMemory.length), 1, 14)
    },
    forgettingPrediction: {
      probability: clamp((1 - masteryScore) * 0.75, 0, 1)
    },
    reinforcementPlanning: {
      highPriorityCount: weakConceptMemory.filter((item) => item.recoveryPriority === 'high').length,
      strategy: weakConceptMemory.length > strongConceptMemory.length ? 'targeted-recovery' : 'balanced-reinforcement'
    },
    masteryForecast: {
      projectedMastery: clamp(masteryScore + 0.1, 0, 1)
    },
    semanticRetrieval: {
      availableLinks: asArray(graphs.semanticLinks).length,
      retrievalDepth: 2
    },
    contextualRetrieval: {
      sessionContextEntries: sessionMemory.length,
      interactionContextEntries: interactionMemory.length
    },
    personalizedMemoryAdaptation: {
      mode: weakConceptMemory.length > strongConceptMemory.length ? 'recovery-biased' : 'growth-biased',
      adaptivityScore: clamp((masteryScore * 0.5) + ((1 - clamp((weakConceptMemory.length / Math.max(1, conceptMemory.length)), 0, 1)) * 0.5), 0, 1)
    }
  };
}

function buildFutureGraphModules(source = {}, concepts = []) {
  const requested = uniqueStrings([
    ...asArray(source.graphTypes),
    ...asArray(source.memoryModels),
    ...asArray(source.learningIntent?.futureGraphTypes),
    ...asArray(source.curriculumGraph?.futureGraphTypes),
    ...asArray(source.lessonGraph?.futureGraphTypes)
  ], 240);

  const known = new Set([
    'knowledge-graph',
    'concept-graph',
    'dependency-graph',
    'skill-graph',
    'learning-graph',
    'memory-graph',
    'relationship-graph',
    'revision-graph',
    'mastery-graph',
    'learning-history-graph',
    'career-graph'
  ]);

  const unknown = requested
    .map((item) => safeString(item).toLowerCase().replace(/[\s_]+/g, '-'))
    .filter((item) => item && !known.has(item));

  const uniqueUnknown = [];
  const seen = new Set();
  unknown.forEach((item) => {
    if (seen.has(item)) return;
    seen.add(item);
    uniqueUnknown.push(item);
  });

  return uniqueUnknown.map((type, index) => ({
    graphType: type,
    nodes: concepts.slice(0, 10).map((concept, conceptIndex) => ({
      id: `${type}-node-${index + 1}-${conceptIndex + 1}`,
      refConceptId: concept.id,
      label: `${type} :: ${concept.title}`
    })),
    edges: concepts.slice(1, 10).map((concept, conceptIndex) => ({
      id: `${type}-edge-${index + 1}-${conceptIndex + 1}`,
      from: `${type}-node-${index + 1}-${conceptIndex + 1}`,
      to: `${type}-node-${index + 1}-${conceptIndex + 2}`,
      relation: 'future-expandable-link'
    }))
  }));
}

export function verifyUniversalGraphIntegrity(graph = {}) {
  const nodes = asArray(graph.nodes);
  const edges = asArray(graph.edges);
  const nodeIds = new Set(nodes.map((node) => safeString(node?.id)).filter(Boolean));

  const missingNodeRefs = [];
  edges.forEach((edge) => {
    const from = safeString(edge?.from || edge?.source || '');
    const to = safeString(edge?.to || edge?.target || '');
    if (from && !nodeIds.has(from)) missingNodeRefs.push(from);
    if (to && !nodeIds.has(to)) missingNodeRefs.push(to);
  });

  const duplicateNodeIds = [];
  const seen = new Set();
  nodes.forEach((node) => {
    const id = safeString(node?.id);
    if (!id) return;
    if (seen.has(id)) duplicateNodeIds.push(id);
    seen.add(id);
  });

  const acyclicHint = edges.length <= Math.max(0, nodeIds.size * 2);

  return {
    valid: missingNodeRefs.length === 0 && duplicateNodeIds.length === 0,
    missingNodeRefs: uniqueStrings(missingNodeRefs, 200),
    duplicateNodeIds: uniqueStrings(duplicateNodeIds, 200),
    nodeCount: nodes.length,
    edgeCount: edges.length,
    acyclicHint
  };
}

function buildKnowledgeMemoryOutput(runtime = {}, input = {}, options = {}) {
  const source = resolveRuntimeInput(runtime, input);
  const concepts = buildTopicUniverse(source).slice(0, options.maxGraphNodes);
  const runtimeGraphSummary = inferRuntimeGraphSummary(source.runtimeGraph);

  const conceptGraph = buildConceptGraph(concepts);
  const dependencyGraph = buildDependencyGraph(concepts);
  const skillGraph = buildSkillGraph(source.curriculumGraph, concepts);
  const learningGraph = buildLearningGraph(concepts, asArray(source.lessonGraph.learningObjectives));
  const relationshipGraph = buildRelationshipGraph(concepts);
  const revisionGraph = buildRevisionGraph(concepts, source.learningAnalytics);
  const masteryGraph = buildMasteryGraph(concepts, source.learningAnalytics, source.assessmentResults);
  const learningHistoryGraph = buildLearningHistoryGraph(source.sessionHistory, source.interactionEvents);
  const careerGraph = buildCareerGraph(source.curriculumGraph, concepts);

  const knowledgeNodes = uniqueNodeList([
    ...conceptGraph.nodes,
    ...skillGraph.nodes,
    ...careerGraph.nodes,
    ...learningHistoryGraph.nodes
  ]).slice(0, options.maxGraphNodes);

  const knowledgeNodeIds = new Set(knowledgeNodes.map((node) => safeString(node?.id)).filter(Boolean));
  const knowledgeEdges = [
    ...conceptGraph.edges,
    ...dependencyGraph.edges,
    ...skillGraph.edges,
    ...relationshipGraph.edges,
    ...learningGraph.edges,
    ...revisionGraph.edges,
    ...masteryGraph.edges,
    ...learningHistoryGraph.edges,
    ...careerGraph.edges
  ]
    .filter((edge) => {
      const from = safeString(edge?.from || edge?.source || '');
      const to = safeString(edge?.to || edge?.target || '');
      return from && to && knowledgeNodeIds.has(from) && knowledgeNodeIds.has(to);
    })
    .slice(0, options.maxGraphEdges);

  const knowledgeGraph = {
    nodes: knowledgeNodes,
    edges: knowledgeEdges
  };

  const conceptClusters = buildConceptClusters(concepts).slice(0, options.maxClusters);
  const semanticLinks = buildSemanticLinks(concepts).slice(0, options.maxGraphEdges);

  const graphs = {
    knowledgeGraph,
    conceptGraph,
    dependencyGraph,
    skillGraph,
    learningGraph,
    memoryGraph: {
      nodes: [],
      edges: []
    },
    relationshipGraph,
    revisionGraph,
    masteryGraph,
    learningHistoryGraph,
    careerGraph,
    conceptClusters,
    semanticLinks
  };

  const memoryIntelligence = buildMemoryIntelligence(
    concepts,
    source,
    graphs,
    source.learningAnalytics,
    source.assessmentResults
  );

  graphs.memoryGraph = {
    nodes: [
      ...asArray(memoryIntelligence.longTermMemory).map((item) => ({ id: item.id, label: item.conceptId, kind: 'long-term' })),
      ...asArray(memoryIntelligence.shortTermContext).map((item) => ({ id: item.id, label: item.eventType, kind: 'short-term' }))
    ].slice(0, options.maxGraphNodes),
    edges: asArray(memoryIntelligence.adaptiveMemory).map((item, index) => ({
      id: `memory-edge-${index + 1}`,
      from: asArray(memoryIntelligence.longTermMemory)[index % Math.max(1, asArray(memoryIntelligence.longTermMemory).length)]?.id || 'ltm-1',
      to: item.id,
      relation: 'memory-adapts'
    })).slice(0, options.maxGraphEdges)
  };

  const integrity = verifyUniversalGraphIntegrity(knowledgeGraph);
  const futureGraphModules = buildFutureGraphModules(source, concepts);

  const knowledgeConfidence = clamp(
    (clamp(source.assessmentResults?.output?.masteryScore ?? source.learningAnalytics?.output?.masteryScore ?? 0.5, 0, 1) * 0.5)
    + (clamp(memoryIntelligence.conceptRecall.averageRecall, 0, 1) * 0.5),
    0,
    1
  );

  return {
    schemaVersion: UNIVERSAL_AI_KNOWLEDGE_MEMORY_SCHEMA_VERSION,
    graphId: safeString(source.lessonGraph.lessonId || source.curriculumGraph.curriculumId || `knowledge-${Date.now()}`) || `knowledge-${Date.now()}`,
    lessonId: safeString(source.lessonGraph.lessonId || 'runtime-lesson') || 'runtime-lesson',
    curriculumId: safeString(source.curriculumGraph.curriculumId || source.curriculumGraph.course?.courseId || 'runtime-curriculum') || 'runtime-curriculum',
    language: safeString(source.userLearningProfile.language || source.lessonGraph.language || source.learningIntent.language || options.defaultLanguage) || options.defaultLanguage,
    knowledgeGraph,
    conceptGraph,
    dependencyGraph,
    skillGraph,
    learningGraph,
    memoryGraph: graphs.memoryGraph,
    relationshipGraph,
    revisionGraph,
    masteryGraph,
    learningHistoryGraph,
    careerGraph,
    conceptClusters,
    semanticLinks,
    knowledgeConfidence,
    memoryIntelligence,
    futureGraphModules,
    graphMetadata: {
      schemaVersion: UNIVERSAL_AI_KNOWLEDGE_MEMORY_SCHEMA_VERSION,
      generatedAt: Date.now(),
      runtimeGraphNodeCount: runtimeGraphSummary.nodeCount,
      runtimeGraphRelationshipCount: runtimeGraphSummary.relationshipCount,
      conceptCount: concepts.length,
      clusterCount: conceptClusters.length
    },
    diagnostics: {
      integrity,
      unknownFutureGraphTypes: futureGraphModules.map((item) => item.graphType),
      aiTeacherEventCount: asArray(source.aiTeacherEvents).length,
      sessionHistoryCount: asArray(source.sessionHistory).length,
      interactionEventCount: asArray(source.interactionEvents).length
    },
    synchronization: {
      integration: {
        universalLearningPipeline: {
          status: 'integrated',
          hasMetadata: isObject(source.pipeline)
        },
        lessonGenerator: {
          status: 'integrated',
          lessonId: safeString(source.lessonGraph.lessonId || '') || null
        },
        curriculumEngine: {
          status: 'integrated',
          curriculumId: safeString(source.curriculumGraph.curriculumId || source.curriculumGraph.course?.courseId || '') || null
        },
        aiTeacher: {
          status: 'integrated',
          eventCount: asArray(source.aiTeacherEvents).length
        },
        assessmentEngine: {
          status: 'integrated',
          hasAssessment: Boolean(source.assessmentResults?.output || source.assessmentResults?.questionBank)
        },
        learningAnalytics: {
          status: 'integrated',
          hasAnalytics: Boolean(source.learningAnalytics?.output || source.learningAnalytics?.masteryScore)
        },
        personalizationEngine: {
          status: 'integrated',
          hasPersonalization: Boolean(source.personalization?.output || source.personalization?.runtimeState)
        },
        runtimeGraph: {
          status: 'integrated',
          nodeCount: runtimeGraphSummary.nodeCount,
          relationshipCount: runtimeGraphSummary.relationshipCount
        },
        timelineEngine: {
          status: 'integrated',
          eventCount: asArray(source.timelineEvents).length
        }
      },
      versionCompatibility: {
        schemaVersion: UNIVERSAL_AI_KNOWLEDGE_MEMORY_SCHEMA_VERSION,
        backwardCompatible: true,
        forwardCompatible: true
      }
    }
  };
}

function uniqueNodeList(nodes = []) {
  const out = [];
  const seen = new Set();
  asArray(nodes).forEach((node) => {
    if (!isObject(node)) return;
    const id = safeString(node.id);
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(node);
  });
  return out;
}

export function validateUniversalAIKnowledgeMemoryOutput(output = {}) {
  const source = isObject(output) ? output : {};
  const errors = [];
  const warnings = [];

  if (!safeString(source.graphId)) errors.push('Missing graphId.');
  if (!safeString(source.lessonId)) errors.push('Missing lessonId.');
  if (!safeString(source.curriculumId)) errors.push('Missing curriculumId.');

  [
    'knowledgeGraph',
    'conceptGraph',
    'dependencyGraph',
    'skillGraph',
    'learningGraph',
    'memoryGraph',
    'relationshipGraph',
    'revisionGraph',
    'masteryGraph',
    'learningHistoryGraph',
    'careerGraph'
  ].forEach((field) => {
    if (!isObject(source[field])) {
      errors.push(`${field} must be an object.`);
      return;
    }
    if (!Array.isArray(source[field].nodes)) errors.push(`${field}.nodes must be an array.`);
    if (!Array.isArray(source[field].edges)) errors.push(`${field}.edges must be an array.`);
  });

  if (!Array.isArray(source.conceptClusters)) errors.push('conceptClusters must be an array.');
  if (!Array.isArray(source.semanticLinks)) errors.push('semanticLinks must be an array.');
  if (!isObject(source.memoryIntelligence)) errors.push('memoryIntelligence must be an object.');
  if (!isObject(source.graphMetadata)) errors.push('graphMetadata must be an object.');
  if (!isObject(source.diagnostics)) errors.push('diagnostics must be an object.');
  if (!isObject(source.synchronization)) errors.push('synchronization must be an object.');

  const serialized = JSON.stringify(source);
  if (/renderer|three\.|webgl|speechsynthesis|texttospeech|tts|shader|fragment|vertex|canvas|sql|mongodb|postgres/i.test(serialized)) {
    errors.push('Forbidden renderer/speech/database-specific payload detected.');
  }

  const integrity = verifyUniversalGraphIntegrity(source.knowledgeGraph || {});
  if (!integrity.valid) {
    warnings.push('Knowledge graph integrity has warnings.');
  }

  if (toFiniteNumber(source.knowledgeConfidence, -1) < 0 || toFiniteNumber(source.knowledgeConfidence, 2) > 1) {
    errors.push('knowledgeConfidence must be in [0,1].');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    status: errors.length === 0 ? (warnings.length ? 'warning' : 'valid') : 'invalid'
  };
}

export function serializeUniversalAIKnowledgeMemoryOutput(output = {}) {
  return JSON.stringify({
    schemaVersion: UNIVERSAL_AI_KNOWLEDGE_MEMORY_SCHEMA_VERSION,
    serializedAt: Date.now(),
    output
  });
}

export function migrateUniversalAIKnowledgeMemoryOutput(input = {}) {
  const source = isObject(input) ? input : {};

  if (safeString(source.schemaVersion) === UNIVERSAL_AI_KNOWLEDGE_MEMORY_SCHEMA_VERSION && isObject(source.knowledgeGraph)) {
    return source;
  }

  const lessonId = safeString(source.lessonId || source.id || 'legacy-lesson') || 'legacy-lesson';
  const curriculumId = safeString(source.curriculumId || 'legacy-curriculum') || 'legacy-curriculum';

  const fallback = buildKnowledgeMemoryOutput({}, {
    lessonGraph: {
      lessonId,
      title: safeString(source.title || 'Recovered Knowledge Model') || 'Recovered Knowledge Model',
      topics: asArray(source.topics)
    },
    curriculumGraph: {
      curriculumId,
      topics: asArray(source.topics).map((topic, index) => ({ id: `topic-${index + 1}`, title: safeString(topic) || `Topic ${index + 1}` }))
    }
  }, DEFAULT_UNIVERSAL_AI_KNOWLEDGE_MEMORY_CONFIG);

  return {
    ...fallback,
    graphMetadata: {
      ...fallback.graphMetadata,
      sourceSchemaVersion: safeString(source.schemaVersion || 'legacy') || 'legacy'
    }
  };
}

export function deserializeUniversalAIKnowledgeMemoryOutput(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    const fallback = migrateUniversalAIKnowledgeMemoryOutput({
      lessonId: 'recovered-lesson',
      curriculumId: 'recovered-curriculum',
      title: 'Recovered Knowledge Graph'
    });

    return {
      output: fallback,
      validation: {
        valid: false,
        status: 'fallback',
        errors: ['Failed to parse knowledge memory payload.'],
        warnings: []
      }
    };
  }

  const output = migrateUniversalAIKnowledgeMemoryOutput(parsed.output || parsed);
  return {
    output,
    validation: validateUniversalAIKnowledgeMemoryOutput(output)
  };
}

export class UniversalAIKnowledgeGraphMemoryIntelligenceEngine {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_UNIVERSAL_AI_KNOWLEDGE_MEMORY_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey || DEFAULT_UNIVERSAL_AI_KNOWLEDGE_MEMORY_CONFIG.persistenceKey)
      || DEFAULT_UNIVERSAL_AI_KNOWLEDGE_MEMORY_CONFIG.persistenceKey;

    this.state = createDefaultState();
    this.recoverSession();
  }

  generate(input = {}) {
    const startedAt = Date.now();
    const output = buildKnowledgeMemoryOutput(this.runtime, input, this.options);
    const validation = validateUniversalAIKnowledgeMemoryOutput(output);

    this.state.output = output;
    this.state.status = validation.valid ? 'Ready' : 'Warning';
    this.state.diagnostics.runs += 1;
    this.state.diagnostics.latestDurationMs = Math.max(0, Date.now() - startedAt);
    this.state.diagnostics.warnings = [...this.state.diagnostics.warnings, ...validation.warnings].slice(-this.options.maxHistory);
    this.state.memory.longTerm = asArray(output?.memoryIntelligence?.longTermMemory).slice(0, this.options.maxMemories);
    this.state.memory.session = asArray(output?.memoryIntelligence?.sessionMemory).slice(0, this.options.maxMemories);
    this.state.memory.shortTerm = asArray(output?.memoryIntelligence?.shortTermContext).slice(0, this.options.maxMemories);

    pushHistory(this.state, {
      type: 'knowledge-memory-generated',
      graphId: output.graphId,
      lessonId: output.lessonId,
      at: Date.now(),
      valid: validation.valid
    }, this.options.maxHistory);

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      knowledgeMemoryAdapter: {
        output,
        validation,
        runtimeState: this.snapshot()
      }
    };

    this.persistSession();

    return {
      output,
      validation,
      diagnostics: {
        durationMs: this.state.diagnostics.latestDurationMs,
        generatedAt: Date.now(),
        integrity: output?.diagnostics?.integrity || null
      }
    };
  }

  synchronize(reason = 'manual', input = {}) {
    const result = this.generate(input);
    pushHistory(this.state, {
      type: 'knowledge-memory-synchronized',
      reason: safeString(reason) || 'manual',
      at: Date.now()
    }, this.options.maxHistory);

    return {
      ...this.snapshot(),
      lastSynchronizationReason: safeString(reason) || 'manual',
      result
    };
  }

  handleExternalTimelineMutation(mutationType = 'manual', context = {}) {
    const safeType = safeString(mutationType || 'manual') || 'manual';

    if (safeType.includes('pause')) {
      this.state.recovery.interrupted = true;
      this.state.status = 'Paused';
    }

    if (safeType.includes('resume') || safeType.includes('recover')) {
      this.state.recovery.interrupted = false;
      this.state.recovery.resumeCount += 1;
      this.state.status = 'Ready';
    }

    this.state.recovery.resumeTimeMs = Math.max(0, toFiniteNumber(this.runtime?.timelineScheduler?.snapshot?.()?.clock?.timeMs, this.state.recovery.resumeTimeMs));

    pushHistory(this.state, {
      type: 'timeline-mutation',
      mutationType: safeType,
      context,
      at: Date.now()
    }, this.options.maxHistory);

    return this.synchronize(`mutation:${safeType}`, {
      timelineEvents: asArray(this.runtime?.sceneEventRuntime?.events)
    });
  }

  markInterrupted(reason = 'interrupted') {
    this.state.recovery.interrupted = true;
    this.state.status = 'Paused';

    pushHistory(this.state, {
      type: 'interrupted',
      reason: safeString(reason) || 'interrupted',
      at: Date.now()
    }, this.options.maxHistory);

    this.persistSession();
    return true;
  }

  resumeFromCheckpoint(checkpointId = null) {
    const resolved = safeString(checkpointId || this.state.recovery.checkpointId || '') || null;
    this.state.recovery.checkpointId = resolved;
    this.state.recovery.interrupted = false;
    this.state.recovery.resumeCount += 1;
    this.state.status = 'Ready';

    return this.synchronize('resume-from-checkpoint', {
      timelineEvents: asArray(this.runtime?.sceneEventRuntime?.events)
    });
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify({
      schemaVersion: UNIVERSAL_AI_KNOWLEDGE_MEMORY_SCHEMA_VERSION,
      persistedAt: Date.now(),
      state: this.state
    });

    if (typeof adapter.setItem === 'function') {
      adapter.setItem(this.persistenceKey, payload);
    } else if (typeof adapter.save === 'function') {
      adapter.save(this.persistenceKey, payload);
    } else {
      return false;
    }

    this.state.diagnostics.persistedSessions += 1;
    return true;
  }

  recoverSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    let raw = null;
    if (typeof adapter.getItem === 'function') {
      raw = adapter.getItem(this.persistenceKey);
    } else if (typeof adapter.load === 'function') {
      raw = adapter.load(this.persistenceKey);
    }

    if (!raw) return false;

    const parsed = parsePayload(raw);
    if (!parsed || !isObject(parsed.state)) return false;

    const source = parsed.state;
    this.state = {
      ...createDefaultState(),
      ...source,
      diagnostics: {
        ...createDefaultState().diagnostics,
        ...(isObject(source.diagnostics) ? source.diagnostics : {}),
        recoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveries, 0)) + 1
      },
      recovery: {
        ...createDefaultState().recovery,
        ...(isObject(source.recovery) ? source.recovery : {})
      },
      memory: {
        ...createDefaultState().memory,
        ...(isObject(source.memory) ? source.memory : {})
      },
      history: {
        recentEvents: asArray(source?.history?.recentEvents).slice(-this.options.maxHistory)
      }
    };

    return true;
  }

  snapshot() {
    return parsePayload(JSON.stringify(this.state)) || createDefaultState();
  }

  destroy() {
    this.persistSession();
    return this.snapshot();
  }

  static supportedChannels() {
    return [
      'knowledge-memory-generated',
      'knowledge-memory-synchronized',
      'knowledge-memory-persisted',
      'knowledge-memory-recovered',
      'knowledge-memory-destroyed'
    ];
  }
}

export function createUniversalAIKnowledgeGraphMemoryIntelligenceEngine(runtime = {}, options = {}) {
  return new UniversalAIKnowledgeGraphMemoryIntelligenceEngine(runtime, options);
}

export function runUniversalAIKnowledgeGraphMemoryIntelligenceEngine(input = {}, options = {}) {
  const runtime = isObject(options.runtime) ? options.runtime : {};
  const normalizedOptions = {
    ...options
  };
  delete normalizedOptions.runtime;

  const engine = createUniversalAIKnowledgeGraphMemoryIntelligenceEngine(runtime, normalizedOptions);
  return engine.generate(input);
}
