import {
  UNIVERSAL_AI_CONTENT_CREATION_SCHEMA_VERSION,
  SUPPORTED_BASE_CONTENT_TYPES,
  DEFAULT_UNIVERSAL_AI_CONTENT_CREATION_CONFIG,
  isObject,
  asArray,
  safeString,
  toFiniteNumber,
  clamp,
  normalizeContentType
} from './UniversalAIContentCreationEngineConfig.js';

const STORE_KEY = '__daksha_universal_ai_content_creation_store__';

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

function uniqueStrings(values = [], max = 240) {
  const output = [];
  const seen = new Set();

  asArray(values).forEach((value) => {
    const text = safeString(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(text);
  });

  return output.slice(0, max);
}

function inferGraphCounts(runtimeGraph = {}) {
  if (isObject(runtimeGraph) && isObject(runtimeGraph.graph)) {
    return {
      nodeCount: Math.max(0, toFiniteNumber(runtimeGraph.graph?.getNodeCount?.(), 0)),
      relationshipCount: Math.max(0, toFiniteNumber(runtimeGraph.graph?.getRelationshipCount?.(), 0))
    };
  }

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

function pickPrimary(items = [], fallback = 'Open Topic') {
  const first = asArray(items).find((item) => safeString(item));
  return safeString(first || fallback) || fallback;
}

function buildChapters(lessonGraph = {}, options = {}) {
  const max = Math.max(1, toFiniteNumber(options.maxChapters, DEFAULT_UNIVERSAL_AI_CONTENT_CREATION_CONFIG.maxChapters));
  const chapters = asArray(lessonGraph.chapters)
    .map((chapter, index) => {
      if (isObject(chapter)) {
        const title = safeString(chapter.title || chapter.name || `Chapter ${index + 1}`) || `Chapter ${index + 1}`;
        return {
          id: safeString(chapter.id || `chapter-${index + 1}`) || `chapter-${index + 1}`,
          title,
          order: Math.max(1, toFiniteNumber(chapter.order, index + 1)),
          summary: safeString(chapter.summary || `Core ideas from ${title}.`) || `Core ideas from ${title}.`
        };
      }

      const title = safeString(chapter || `Chapter ${index + 1}`) || `Chapter ${index + 1}`;
      return {
        id: `chapter-${index + 1}`,
        title,
        order: index + 1,
        summary: `Core ideas from ${title}.`
      };
    })
    .slice(0, max);

  if (chapters.length > 0) return chapters;

  const topic = pickPrimary(lessonGraph.topics, safeString(lessonGraph.title || 'Open Topic') || 'Open Topic');
  return [{
    id: 'chapter-1',
    title: `${topic} Overview`,
    order: 1,
    summary: `Foundational understanding of ${topic}.`
  }];
}

function buildTopics(lessonGraph = {}, chapters = [], options = {}) {
  const max = Math.max(1, toFiniteNumber(options.maxTopics, DEFAULT_UNIVERSAL_AI_CONTENT_CREATION_CONFIG.maxTopics));
  const sourceTopics = uniqueStrings([
    ...asArray(lessonGraph.topics),
    ...asArray(lessonGraph.keyConcepts),
    safeString(lessonGraph.title)
  ], max * 2);

  const topicIds = new Set();
  const built = [];

  sourceTopics.slice(0, max).forEach((topic, index) => {
    const id = `topic-${index + 1}`;
    const chapter = chapters[index % chapters.length] || chapters[0];
    if (topicIds.has(topic.toLowerCase())) return;
    topicIds.add(topic.toLowerCase());
    built.push({
      id,
      chapterId: chapter?.id || 'chapter-1',
      title: topic,
      order: index + 1,
      learningFocus: `Understand and apply ${topic}.`
    });
  });

  if (built.length > 0) return built;

  const fallback = safeString(lessonGraph.title || 'Open Topic') || 'Open Topic';
  return [{
    id: 'topic-1',
    chapterId: chapters[0]?.id || 'chapter-1',
    title: fallback,
    order: 1,
    learningFocus: `Understand and apply ${fallback}.`
  }];
}

function buildObjectives(lessonGraph = {}, topics = [], options = {}) {
  const max = Math.max(1, toFiniteNumber(options.maxObjectives, DEFAULT_UNIVERSAL_AI_CONTENT_CREATION_CONFIG.maxObjectives));
  const base = uniqueStrings([
    ...asArray(lessonGraph.learningObjectives),
    ...topics.map((item) => `Master ${item.title}`)
  ], max * 2);

  return base.slice(0, max).map((objective, index) => ({
    id: `objective-${index + 1}`,
    topicId: topics[index % topics.length]?.id || 'topic-1',
    objective,
    cognitiveLevel: index % 4 === 0 ? 'understand' : index % 4 === 1 ? 'apply' : index % 4 === 2 ? 'analyze' : 'evaluate'
  }));
}

function buildExamples(topics = [], max = 120) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `example-${index + 1}`,
    topicId: topic.id,
    text: `Example: use ${topic.title} in a realistic scenario with clear assumptions and outcomes.`
  }));
}

function buildAnalogies(topics = [], max = 120) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `analogy-${index + 1}`,
    topicId: topic.id,
    text: `${topic.title} is like a system where each part collaborates to produce a reliable result.`
  }));
}

function buildRealWorldApplications(topics = [], max = 120) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `application-${index + 1}`,
    topicId: topic.id,
    text: `Apply ${topic.title} to solve domain-specific decisions, diagnostics, optimization, and communication tasks.`
  }));
}

function buildPracticalExercises(topics = [], max = 120) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `exercise-${index + 1}`,
    topicId: topic.id,
    title: `Hands-on: ${topic.title}`,
    instructions: `Complete a practical task implementing ${topic.title} end-to-end and document reasoning.`,
    outcome: `Operational understanding of ${topic.title}`
  }));
}

function buildProjects(topics = [], variant = 'mini', max = 24) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `${variant}-project-${index + 1}`,
    topicId: topic.id,
    title: `${variant === 'capstone' ? 'Capstone' : 'Mini'} Project: ${topic.title}`,
    brief: `Design and build a ${variant} project around ${topic.title} with measurable deliverables.`,
    deliverables: [
      `Design note for ${topic.title}`,
      'Implementation artifact',
      'Evaluation and reflection report'
    ]
  }));
}

function buildAssignments(topics = [], max = 80) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `assignment-${index + 1}`,
    topicId: topic.id,
    prompt: `Assignment: explain, apply, and critique ${topic.title} in one consolidated response.`,
    rubric: ['clarity', 'accuracy', 'application-depth']
  }));
}

function buildCheatSheets(topics = [], max = 120) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `cheat-sheet-${index + 1}`,
    topicId: topic.id,
    keyPoints: [
      `${topic.title}: core definition`,
      `${topic.title}: key process`,
      `${topic.title}: common pitfalls`
    ]
  }));
}

function buildRevisionNotes(topics = [], max = 120) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `revision-note-${index + 1}`,
    topicId: topic.id,
    note: `Revision note: summarize ${topic.title}, list one misconception, and provide correction.`
  }));
}

function buildMindMaps(chapters = [], topics = [], max = 40) {
  return chapters.slice(0, Math.max(1, max)).map((chapter, index) => ({
    id: `mind-map-${index + 1}`,
    chapterId: chapter.id,
    root: chapter.title,
    branches: topics.filter((item) => item.chapterId === chapter.id).slice(0, 12).map((item) => item.title)
  }));
}

function buildKnowledgeGraph(lessonGraph = {}, runtimeGraphSummary = {}, topics = []) {
  const graphNodes = asArray(lessonGraph?.lessonGraph?.nodes);
  const graphEdges = asArray(lessonGraph?.lessonGraph?.edges);

  const nodeSet = graphNodes.length > 0
    ? graphNodes.map((node, index) => ({
      id: safeString(node?.id || `kg-node-${index + 1}`) || `kg-node-${index + 1}`,
      label: safeString(node?.label || node?.name || node?.id || `Concept ${index + 1}`) || `Concept ${index + 1}`
    }))
    : topics.slice(0, 200).map((topic, index) => ({
      id: topic.id || `kg-node-${index + 1}`,
      label: topic.title
    }));

  const edgeSet = graphEdges.length > 0
    ? graphEdges.map((edge, index) => ({
      id: safeString(edge?.id || `kg-edge-${index + 1}`) || `kg-edge-${index + 1}`,
      from: safeString(edge?.from || edge?.source || nodeSet[0]?.id || ''),
      to: safeString(edge?.to || edge?.target || nodeSet[Math.min(1, nodeSet.length - 1)]?.id || ''),
      relation: safeString(edge?.type || edge?.relation || 'relates-to') || 'relates-to'
    })).filter((edge) => edge.from && edge.to)
    : topics.slice(1, 200).map((topic, index) => ({
      id: `kg-edge-${index + 1}`,
      from: topics[index]?.id || 'topic-1',
      to: topic.id,
      relation: 'prerequisite-for'
    }));

  return {
    nodeCount: Math.max(nodeSet.length, runtimeGraphSummary.nodeCount),
    relationshipCount: Math.max(edgeSet.length, runtimeGraphSummary.relationshipCount),
    nodes: nodeSet,
    edges: edgeSet
  };
}

function buildFlashcards(topics = [], max = DEFAULT_UNIVERSAL_AI_CONTENT_CREATION_CONFIG.maxFlashcards) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `flashcard-${index + 1}`,
    front: topic.title,
    back: `Key understanding, practical use, and one quick recall cue for ${topic.title}.`,
    topicId: topic.id
  }));
}

function buildQuizBlueprint(topics = [], objectives = [], max = DEFAULT_UNIVERSAL_AI_CONTENT_CREATION_CONFIG.maxQuizItems) {
  const output = [];
  topics.slice(0, max).forEach((topic, index) => {
    const objective = objectives[index % objectives.length] || objectives[0];
    output.push({
      id: `quiz-item-${index + 1}`,
      topicId: topic.id,
      objectiveId: objective?.id || 'objective-1',
      questionType: index % 3 === 0 ? 'mcq' : index % 3 === 1 ? 'short-answer' : 'application',
      prompt: `Assess ${topic.title} with an objective-focused question.`,
      difficulty: index % 4 === 0 ? 'beginner' : index % 4 === 1 ? 'intermediate' : index % 4 === 2 ? 'advanced' : 'expert'
    });
  });

  return output;
}

function buildInterviewQuestions(topics = [], mode = 'interview', max = 120) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `${mode}-question-${index + 1}`,
    topicId: topic.id,
    question: `${mode === 'viva' ? 'Viva' : 'Interview'}: explain ${topic.title}, justify decisions, and compare alternatives.`
  }));
}

function buildCodingChallenges(topics = [], max = 80) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `coding-challenge-${index + 1}`,
    topicId: topic.id,
    title: `Coding Challenge: ${topic.title}`,
    task: `Implement a solution demonstrating ${topic.title} with tests and complexity analysis.`,
    evaluation: ['correctness', 'scalability', 'readability']
  }));
}

function buildLabActivities(topics = [], max = 80) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `lab-activity-${index + 1}`,
    topicId: topic.id,
    activity: `Lab: investigate ${topic.title} through controlled experimentation and reporting.`
  }));
}

function buildWorksheets(topics = [], max = 80) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `worksheet-${index + 1}`,
    topicId: topic.id,
    prompts: [
      `Define ${topic.title} in your own words.`,
      `Apply ${topic.title} to a new scenario.`,
      `Evaluate one trade-off in ${topic.title}.`
    ]
  }));
}

function buildCaseStudies(topics = [], max = 60) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `case-study-${index + 1}`,
    topicId: topic.id,
    title: `Case Study: ${topic.title}`,
    scenario: `Analyze a realistic case where ${topic.title} changes outcomes under constraints.`
  }));
}

function buildFormulaSheets(topics = [], max = 60) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `formula-sheet-${index + 1}`,
    topicId: topic.id,
    formulas: [
      `${topic.title}: canonical relationship`,
      `${topic.title}: conversion/derivation shortcut`
    ]
  }));
}

function buildGlossary(topics = [], max = 200) {
  return topics.slice(0, max).map((topic, index) => ({
    id: `glossary-term-${index + 1}`,
    term: topic.title,
    definition: `Concise definition and usage note for ${topic.title}.`
  }));
}

function buildSummary(courseTitle = 'Universal Course', objectives = [], topics = []) {
  const focus = objectives.slice(0, 3).map((item) => item.objective).join(' | ');
  return {
    title: `Summary of ${courseTitle}`,
    brief: focus || `Understand the core themes and applications of ${courseTitle}.`,
    keyTakeaways: topics.slice(0, 8).map((topic) => topic.title)
  };
}

function buildCareerApplications(topics = [], domains = []) {
  const domain = pickPrimary(domains, 'cross-domain careers');
  return topics.slice(0, 24).map((topic, index) => ({
    id: `career-application-${index + 1}`,
    topicId: topic.id,
    path: `Use ${topic.title} in ${domain} roles to solve practical and strategic problems.`
  }));
}

function buildSkillOutcomes(topics = [], objectives = []) {
  return uniqueStrings([
    ...topics.slice(0, 80).map((topic) => `Can explain and apply ${topic.title}`),
    ...objectives.slice(0, 40).map((objective) => `Can achieve objective: ${objective.objective}`)
  ], 160).map((item, index) => ({
    id: `skill-outcome-${index + 1}`,
    outcome: item
  }));
}

function buildLearningRoadmap(chapters = [], topics = []) {
  const chapterMilestones = chapters.map((chapter, index) => ({
    id: `roadmap-milestone-${index + 1}`,
    stage: chapter.title,
    goals: topics.filter((topic) => topic.chapterId === chapter.id).slice(0, 6).map((topic) => `Master ${topic.title}`)
  }));

  return {
    stages: chapterMilestones,
    sequence: chapterMilestones.map((milestone) => milestone.stage)
  };
}

function buildFutureContentModules(requestedTypes = [], topics = [], options = {}) {
  const maxContentItems = Math.max(1, toFiniteNumber(options.maxContentItems, DEFAULT_UNIVERSAL_AI_CONTENT_CREATION_CONFIG.maxContentItems));
  const normalized = requestedTypes
    .map((type) => normalizeContentType(type))
    .filter((entry) => !entry.known);

  const unique = [];
  const seen = new Set();
  normalized.forEach((entry) => {
    if (seen.has(entry.type)) return;
    seen.add(entry.type);
    unique.push(entry.type);
  });

  return unique.slice(0, maxContentItems).map((type, index) => ({
    contentType: type,
    items: topics.slice(0, 8).map((topic, topicIndex) => ({
      id: `${type}-${index + 1}-${topicIndex + 1}`,
      topicId: topic.id,
      payload: {
        title: `${type} for ${topic.title}`,
        guidance: `Auto-generated ${type} module for ${topic.title}.`
      },
      metadata: {
        generatedDynamically: true,
        schemaVersion: UNIVERSAL_AI_CONTENT_CREATION_SCHEMA_VERSION
      }
    }))
  }));
}

function buildContentModules(content = {}) {
  const moduleEntries = [
    ['complete-course', content.completeCourse],
    ['chapters', content.chapters],
    ['topics', content.topics],
    ['learning-objectives', content.learningObjectives],
    ['explanations', content.explanations],
    ['examples', content.examples],
    ['analogies', content.analogies],
    ['real-world-applications', content.realWorldApplications],
    ['practical-exercises', content.practicalExercises],
    ['mini-projects', content.miniProjects],
    ['capstone-projects', content.capstoneProjects],
    ['assignments', content.assignments],
    ['cheat-sheets', content.cheatSheets],
    ['revision-notes', content.revisionNotes],
    ['mind-maps', content.mindMaps],
    ['knowledge-graph', content.knowledgeGraph],
    ['flashcards', content.flashcards],
    ['quiz-blueprint', content.quizBlueprint],
    ['interview-questions', content.interviewQuestions],
    ['viva-questions', content.vivaQuestions],
    ['coding-challenges', content.codingChallenges],
    ['lab-activities', content.labActivities],
    ['worksheets', content.worksheets],
    ['case-studies', content.caseStudies],
    ['formula-sheets', content.formulaSheets],
    ['glossary', content.glossary],
    ['summary', content.summary],
    ['career-applications', content.careerApplications],
    ['skill-outcomes', content.skillOutcomes],
    ['learning-roadmap', content.learningRoadmap]
  ];

  return moduleEntries.map(([moduleType, payload], index) => ({
    moduleId: `content-module-${index + 1}`,
    moduleType,
    schemaVersion: UNIVERSAL_AI_CONTENT_CREATION_SCHEMA_VERSION,
    reusable: true,
    payload
  }));
}

function createDefaultState() {
  return {
    schemaVersion: UNIVERSAL_AI_CONTENT_CREATION_SCHEMA_VERSION,
    status: 'Ready',
    output: null,
    diagnostics: {
      runs: 0,
      recoveries: 0,
      persistedSessions: 0,
      warnings: [],
      latestDurationMs: 0,
      interrupted: false,
      resumeCount: 0
    },
    history: {
      recentEvents: []
    },
    recovery: {
      interrupted: false,
      checkpointId: null,
      resumeTimeMs: 0,
      resumeCount: 0
    }
  };
}

function pushHistory(state = {}, entry = {}, maxHistory = 500) {
  const events = asArray(state?.history?.recentEvents);
  events.push(entry);
  while (events.length > maxHistory) {
    events.shift();
  }
  state.history.recentEvents = events;
}

function resolveIntegrationMetadata(runtime = {}, input = {}) {
  return {
    pipeline: isObject(input.pipeline) ? input.pipeline : runtime?.metadata?.pipeline || runtime?.metadata?.sourceMeta || {},
    lessonGenerator: isObject(input.lessonGeneratorMetadata) ? input.lessonGeneratorMetadata : runtime?.metadata?.lessonGraph || {},
    aiTeacher: isObject(input.aiTeacherMetadata) ? input.aiTeacherMetadata : runtime?.metadata?.aiTeacherAdapter || {},
    assessment: isObject(input.assessmentMetadata) ? input.assessmentMetadata : runtime?.metadata?.assessmentAdapter || {},
    analytics: isObject(input.analyticsMetadata) ? input.analyticsMetadata : runtime?.metadata?.learningAnalyticsAdapter || {}
  };
}

function resolveDomains(input = {}, lessonGraph = {}) {
  return uniqueStrings([
    safeString(input?.learningIntent?.knowledgeDomain),
    safeString(input?.visualizationStrategy?.knowledgeDomain),
    safeString(input?.learningIntent?.audience),
    safeString(lessonGraph?.sceneRequirements?.domain),
    safeString(lessonGraph?.sourceType),
    safeString(input?.userLearningProfile?.track)
  ], 40);
}

function resolveFutureContentRequests(input = {}, integration = {}) {
  return uniqueStrings([
    ...asArray(input.contentTypes),
    ...asArray(input.requestedContentTypes),
    ...asArray(input?.learningIntent?.requestedContentTypes),
    ...asArray(input?.learningIntent?.futureContentTypes),
    ...asArray(input?.lessonGraph?.futureContentTypes),
    ...asArray(input?.lessonGraph?.contracts?.contentTypes),
    ...asArray(integration?.pipeline?.futureContentTypes)
  ], 120);
}

function buildContentPayload(input = {}, options = {}) {
  const lessonGraph = isObject(input.lessonGraph) ? input.lessonGraph : {};
  const runtimeGraph = isObject(input.runtimeGraph) ? input.runtimeGraph : {};
  const learningIntent = isObject(input.learningIntent) ? input.learningIntent : {};
  const visualizationStrategy = isObject(input.visualizationStrategy) ? input.visualizationStrategy : {};
  const userLearningProfile = isObject(input.userLearningProfile) ? input.userLearningProfile : {};
  const aiTeacherMetadata = isObject(input.aiTeacherMetadata) ? input.aiTeacherMetadata : {};

  const runtimeGraphSummary = inferGraphCounts(runtimeGraph);
  const chapters = buildChapters(lessonGraph, options);
  const topics = buildTopics(lessonGraph, chapters, options);
  const objectives = buildObjectives(lessonGraph, topics, options);
  const domains = resolveDomains({ learningIntent, visualizationStrategy, userLearningProfile }, lessonGraph);

  const courseTitle = safeString(lessonGraph.title || learningIntent.learningObjective || 'Universal AI Course') || 'Universal AI Course';
  const language = safeString(learningIntent.language || lessonGraph.language || userLearningProfile.language || options.defaultLanguage || 'English') || 'English';

  const completeCourse = {
    courseId: safeString(lessonGraph.lessonId || `course-${Date.now()}`) || `course-${Date.now()}`,
    title: courseTitle,
    language,
    domainTags: domains,
    audienceProfile: {
      learningLevel: safeString(userLearningProfile.learningLevel || 'intermediate') || 'intermediate',
      learnerModes: uniqueStrings(asArray(userLearningProfile.learnerModes), 40)
    },
    intent: {
      objective: safeString(learningIntent.learningObjective || 'Build durable understanding and application skills.'),
      confidenceScore: clamp(learningIntent.confidenceScore ?? 0.6, 0, 1)
    },
    visualization: {
      strategy: safeString(visualizationStrategy?.primaryStrategy?.visualizationStyle || 'adaptive visualization') || 'adaptive visualization',
      interaction: safeString(visualizationStrategy?.primaryStrategy?.interactionLevel || 'guided') || 'guided'
    }
  };

  const explanations = topics.map((topic, index) => ({
    id: `explanation-${index + 1}`,
    topicId: topic.id,
    text: `Explain ${topic.title} from first principles, then connect to advanced context and operational usage.`
  }));

  const examples = buildExamples(topics, options.maxContentItems);
  const analogies = buildAnalogies(topics, options.maxContentItems);
  const realWorldApplications = buildRealWorldApplications(topics, options.maxContentItems);
  const practicalExercises = buildPracticalExercises(topics, options.maxContentItems);
  const miniProjects = buildProjects(topics, 'mini', 32);
  const capstoneProjects = buildProjects(topics, 'capstone', 12);
  const assignments = buildAssignments(topics, 120);
  const cheatSheets = buildCheatSheets(topics, 120);
  const revisionNotes = buildRevisionNotes(topics, 120);
  const mindMaps = buildMindMaps(chapters, topics, 64);
  const knowledgeGraph = buildKnowledgeGraph(lessonGraph, runtimeGraphSummary, topics);
  const flashcards = buildFlashcards(topics, options.maxFlashcards);
  const quizBlueprint = buildQuizBlueprint(topics, objectives, options.maxQuizItems);
  const interviewQuestions = buildInterviewQuestions(topics, 'interview', 120);
  const vivaQuestions = buildInterviewQuestions(topics, 'viva', 120);
  const codingChallenges = buildCodingChallenges(topics, 80);
  const labActivities = buildLabActivities(topics, 80);
  const worksheets = buildWorksheets(topics, 80);
  const caseStudies = buildCaseStudies(topics, 60);
  const formulaSheets = buildFormulaSheets(topics, 60);
  const glossary = buildGlossary(topics, 240);
  const summary = buildSummary(courseTitle, objectives, topics);
  const careerApplications = buildCareerApplications(topics, domains);
  const skillOutcomes = buildSkillOutcomes(topics, objectives);
  const learningRoadmap = buildLearningRoadmap(chapters, topics);

  const requestedFutureContentTypes = resolveFutureContentRequests(input, resolveIntegrationMetadata({}, input));
  const futureContentModules = buildFutureContentModules(requestedFutureContentTypes, topics, options);

  return {
    schemaVersion: UNIVERSAL_AI_CONTENT_CREATION_SCHEMA_VERSION,
    contentId: safeString(lessonGraph.lessonId || `content-${Date.now()}`) || `content-${Date.now()}`,
    lessonId: safeString(lessonGraph.lessonId || completeCourse.courseId) || completeCourse.courseId,
    title: courseTitle,
    language,
    completeCourse,
    chapters,
    topics,
    learningObjectives: objectives,
    explanations,
    examples,
    analogies,
    realWorldApplications,
    practicalExercises,
    miniProjects,
    capstoneProjects,
    assignments,
    cheatSheets,
    revisionNotes,
    mindMaps,
    knowledgeGraph,
    flashcards,
    quizBlueprint,
    interviewQuestions,
    vivaQuestions,
    codingChallenges,
    labActivities,
    worksheets,
    caseStudies,
    formulaSheets,
    glossary,
    summary,
    careerApplications,
    skillOutcomes,
    learningRoadmap,
    futureContentModules,
    aiTeacherMetadata,
    diagnostics: {
      runtimeGraphNodeCount: runtimeGraphSummary.nodeCount,
      runtimeGraphRelationshipCount: runtimeGraphSummary.relationshipCount,
      unknownFutureContentTypes: futureContentModules.map((item) => item.contentType),
      generatedAt: Date.now()
    }
  };
}

function buildSynchronization(output = {}, integration = {}, runtimeGraph = {}) {
  const runtimeGraphSummary = inferGraphCounts(runtimeGraph);
  return {
    integration: {
      universalLearningPipeline: {
        status: 'integrated',
        metadataPresent: isObject(integration.pipeline)
      },
      lessonGenerator: {
        status: 'integrated',
        lessonId: safeString(integration?.lessonGenerator?.lessonId || output.lessonId || '') || output.lessonId
      },
      aiTeacher: {
        status: 'integrated',
        hasTeachingPlan: Boolean(integration?.aiTeacher?.teachingPlan || integration?.aiTeacher?.runtimeState?.plan)
      },
      assessmentEngine: {
        status: 'integrated',
        hasQuestionBank: Boolean(asArray(integration?.assessment?.output?.questionBank).length)
      },
      analyticsEngine: {
        status: 'integrated',
        hasAnalyticsOutput: Boolean(integration?.analytics?.output)
      },
      runtimeGraph: {
        status: 'integrated',
        nodeCount: runtimeGraphSummary.nodeCount,
        relationshipCount: runtimeGraphSummary.relationshipCount
      }
    },
    versionCompatibility: {
      schemaVersion: UNIVERSAL_AI_CONTENT_CREATION_SCHEMA_VERSION,
      backwardCompatible: true,
      forwardCompatible: true
    }
  };
}

export function validateUniversalAIContentOutput(output = {}) {
  const source = isObject(output) ? output : {};
  const errors = [];
  const warnings = [];

  if (!safeString(source.contentId)) errors.push('Missing contentId.');
  if (!safeString(source.lessonId)) errors.push('Missing lessonId.');
  if (!safeString(source.title)) errors.push('Missing title.');

  const requiredArrays = [
    'chapters',
    'topics',
    'learningObjectives',
    'explanations',
    'examples',
    'analogies',
    'realWorldApplications',
    'practicalExercises',
    'miniProjects',
    'capstoneProjects',
    'assignments',
    'cheatSheets',
    'revisionNotes',
    'mindMaps',
    'flashcards',
    'quizBlueprint',
    'interviewQuestions',
    'vivaQuestions',
    'codingChallenges',
    'labActivities',
    'worksheets',
    'caseStudies',
    'formulaSheets',
    'glossary',
    'careerApplications',
    'skillOutcomes',
    'futureContentModules'
  ];

  requiredArrays.forEach((field) => {
    if (!Array.isArray(source[field])) {
      errors.push(`${field} must be an array.`);
    }
  });

  if (!isObject(source.completeCourse)) errors.push('completeCourse must be an object.');
  if (!isObject(source.summary)) errors.push('summary must be an object.');
  if (!isObject(source.knowledgeGraph)) errors.push('knowledgeGraph must be an object.');
  if (!isObject(source.learningRoadmap)) errors.push('learningRoadmap must be an object.');

  const serialized = JSON.stringify(source);
  if (/renderer|webgl|shader|fragment|vertex|three\.|babylon|unity|canvas|scene-mesh/i.test(serialized)) {
    errors.push('Renderer payload detected in content output.');
  }

  asArray(source.futureContentModules).forEach((module) => {
    const type = normalizeContentType(module?.contentType || module?.type || '').type;
    if (SUPPORTED_BASE_CONTENT_TYPES.includes(type)) {
      warnings.push(`futureContentModules contains known base content type: ${type}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    status: errors.length === 0 ? (warnings.length ? 'warning' : 'valid') : 'invalid'
  };
}

export function serializeUniversalAIContentOutput(output = {}) {
  return JSON.stringify({
    schemaVersion: UNIVERSAL_AI_CONTENT_CREATION_SCHEMA_VERSION,
    serializedAt: Date.now(),
    output
  });
}

export function migrateUniversalAIContentOutput(input = {}) {
  const source = isObject(input) ? input : {};

  if (safeString(source.schemaVersion) === UNIVERSAL_AI_CONTENT_CREATION_SCHEMA_VERSION && isObject(source.completeCourse)) {
    return source;
  }

  const title = safeString(source.title || source.courseTitle || source.lessonTitle || 'Recovered Universal Content') || 'Recovered Universal Content';
  const lessonId = safeString(source.lessonId || source.id || 'legacy-lesson') || 'legacy-lesson';
  const language = safeString(source.language || 'English') || 'English';
  const topics = uniqueStrings([
    ...asArray(source.topics),
    ...asArray(source.keyConcepts),
    title
  ], 40).map((topic, index) => ({
    id: `topic-${index + 1}`,
    chapterId: 'chapter-1',
    title: safeString(topic) || `Topic ${index + 1}`,
    order: index + 1,
    learningFocus: `Understand ${safeString(topic) || `Topic ${index + 1}`}.`
  }));

  const chapters = [{
    id: 'chapter-1',
    title: safeString(source.chapterTitle || `${title} Overview`) || `${title} Overview`,
    order: 1,
    summary: `Recovered chapter for ${title}.`
  }];

  const objectives = uniqueStrings(asArray(source.learningObjectives), 24).map((objective, index) => ({
    id: `objective-${index + 1}`,
    topicId: topics[index % Math.max(1, topics.length)]?.id || 'topic-1',
    objective,
    cognitiveLevel: 'understand'
  }));

  return {
    schemaVersion: UNIVERSAL_AI_CONTENT_CREATION_SCHEMA_VERSION,
    contentId: safeString(source.contentId || lessonId) || lessonId,
    lessonId,
    title,
    language,
    completeCourse: {
      courseId: lessonId,
      title,
      language,
      domainTags: uniqueStrings(asArray(source.domainTags), 20),
      audienceProfile: {
        learningLevel: safeString(source.learningLevel || 'intermediate') || 'intermediate',
        learnerModes: uniqueStrings(asArray(source.learnerModes), 20)
      },
      intent: {
        objective: safeString(source.learningObjective || `Understand ${title}`) || `Understand ${title}`,
        confidenceScore: clamp(source.confidenceScore ?? 0.5, 0, 1)
      },
      visualization: {
        strategy: safeString(source.visualizationStyle || 'adaptive visualization') || 'adaptive visualization',
        interaction: safeString(source.interactionLevel || 'guided') || 'guided'
      }
    },
    chapters,
    topics,
    learningObjectives: objectives,
    explanations: topics.map((topic, index) => ({ id: `explanation-${index + 1}`, topicId: topic.id, text: `Explain ${topic.title}.` })),
    examples: topics.map((topic, index) => ({ id: `example-${index + 1}`, topicId: topic.id, text: `Example for ${topic.title}.` })),
    analogies: topics.map((topic, index) => ({ id: `analogy-${index + 1}`, topicId: topic.id, text: `Analogy for ${topic.title}.` })),
    realWorldApplications: topics.map((topic, index) => ({ id: `application-${index + 1}`, topicId: topic.id, text: `Application of ${topic.title}.` })),
    practicalExercises: topics.map((topic, index) => ({ id: `exercise-${index + 1}`, topicId: topic.id, title: `Exercise ${index + 1}`, instructions: `Practice ${topic.title}.`, outcome: `Apply ${topic.title}` })),
    miniProjects: [],
    capstoneProjects: [],
    assignments: [],
    cheatSheets: [],
    revisionNotes: [],
    mindMaps: [],
    knowledgeGraph: {
      nodeCount: topics.length,
      relationshipCount: Math.max(0, topics.length - 1),
      nodes: topics.map((topic) => ({ id: topic.id, label: topic.title })),
      edges: topics.slice(1).map((topic, index) => ({ id: `kg-edge-${index + 1}`, from: topics[index].id, to: topic.id, relation: 'relates-to' }))
    },
    flashcards: topics.map((topic, index) => ({ id: `flashcard-${index + 1}`, front: topic.title, back: `Recall ${topic.title}.`, topicId: topic.id })),
    quizBlueprint: topics.map((topic, index) => ({ id: `quiz-item-${index + 1}`, topicId: topic.id, objectiveId: objectives[index % Math.max(1, objectives.length)]?.id || 'objective-1', questionType: 'mcq', prompt: `Assess ${topic.title}.`, difficulty: 'intermediate' })),
    interviewQuestions: topics.map((topic, index) => ({ id: `interview-question-${index + 1}`, topicId: topic.id, question: `Explain ${topic.title} in depth.` })),
    vivaQuestions: topics.map((topic, index) => ({ id: `viva-question-${index + 1}`, topicId: topic.id, question: `Viva: justify ${topic.title}.` })),
    codingChallenges: [],
    labActivities: [],
    worksheets: [],
    caseStudies: [],
    formulaSheets: [],
    glossary: topics.map((topic, index) => ({ id: `glossary-term-${index + 1}`, term: topic.title, definition: `Definition of ${topic.title}.` })),
    summary: {
      title: `Summary of ${title}`,
      brief: `Recovered summary for ${title}`,
      keyTakeaways: topics.slice(0, 8).map((topic) => topic.title)
    },
    careerApplications: [],
    skillOutcomes: [],
    learningRoadmap: {
      stages: chapters.map((chapter, index) => ({ id: `roadmap-milestone-${index + 1}`, stage: chapter.title, goals: topics.map((topic) => `Master ${topic.title}`) })),
      sequence: chapters.map((chapter) => chapter.title)
    },
    futureContentModules: asArray(source.futureContentModules),
    aiTeacherMetadata: isObject(source.aiTeacherMetadata) ? source.aiTeacherMetadata : {},
    diagnostics: {
      runtimeGraphNodeCount: Math.max(0, toFiniteNumber(source.runtimeGraphNodeCount, 0)),
      runtimeGraphRelationshipCount: Math.max(0, toFiniteNumber(source.runtimeGraphRelationshipCount, 0)),
      unknownFutureContentTypes: [],
      generatedAt: Date.now()
    },
    synchronization: {
      integration: {
        universalLearningPipeline: { status: 'legacy' },
        lessonGenerator: { status: 'legacy', lessonId },
        aiTeacher: { status: 'legacy', hasTeachingPlan: false },
        assessmentEngine: { status: 'legacy', hasQuestionBank: false },
        analyticsEngine: { status: 'legacy', hasAnalyticsOutput: false },
        runtimeGraph: { status: 'legacy', nodeCount: 0, relationshipCount: 0 }
      },
      versionCompatibility: {
        schemaVersion: UNIVERSAL_AI_CONTENT_CREATION_SCHEMA_VERSION,
        backwardCompatible: true,
        forwardCompatible: true
      }
    },
    contentModules: []
  };
}

export function deserializeUniversalAIContentOutput(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    const fallback = migrateUniversalAIContentOutput({
      lessonId: 'recovered-content',
      title: 'Recovered Universal Content'
    });

    return {
      output: fallback,
      validation: {
        valid: false,
        status: 'fallback',
        errors: ['Failed to parse content payload.'],
        warnings: []
      }
    };
  }

  const output = migrateUniversalAIContentOutput(parsed.output || parsed);
  return {
    output,
    validation: validateUniversalAIContentOutput(output)
  };
}

export class UniversalAIContentCreationEngine {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_UNIVERSAL_AI_CONTENT_CREATION_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey || DEFAULT_UNIVERSAL_AI_CONTENT_CREATION_CONFIG.persistenceKey)
      || DEFAULT_UNIVERSAL_AI_CONTENT_CREATION_CONFIG.persistenceKey;

    this.state = createDefaultState();
    this.recoverSession();
  }

  generate(input = {}) {
    const startedAt = Date.now();

    const integration = resolveIntegrationMetadata(this.runtime, input);
    const contentInput = {
      lessonGraph: isObject(input.lessonGraph) ? input.lessonGraph : this.runtime?.metadata?.lessonGraph || {},
      runtimeGraph: isObject(input.runtimeGraph) ? input.runtimeGraph : this.runtime?.graph || this.runtime?.metadata?.runtimeGraph || {},
      learningIntent: isObject(input.learningIntent) ? input.learningIntent : this.runtime?.metadata?.intentProfile || this.runtime?.metadata?.learningIntent || {},
      visualizationStrategy: isObject(input.visualizationStrategy) ? input.visualizationStrategy : this.runtime?.metadata?.visualizationStrategy || {},
      userLearningProfile: isObject(input.userLearningProfile) ? input.userLearningProfile : this.runtime?.metadata?.userLearningProfile || this.runtime?.metadata?.learningProfile || {},
      aiTeacherMetadata: isObject(input.aiTeacherMetadata) ? input.aiTeacherMetadata : integration.aiTeacher,
      pipeline: integration.pipeline,
      lessonGeneratorMetadata: integration.lessonGenerator,
      assessmentMetadata: integration.assessment,
      analyticsMetadata: integration.analytics,
      contentTypes: input.contentTypes,
      requestedContentTypes: input.requestedContentTypes
    };

    const output = buildContentPayload(contentInput, this.options);
    output.synchronization = buildSynchronization(output, integration, contentInput.runtimeGraph);
    output.contentModules = buildContentModules(output);

    const validation = validateUniversalAIContentOutput(output);

    this.state.output = output;
    this.state.status = validation.valid ? 'Ready' : 'Warning';
    this.state.diagnostics.runs += 1;
    this.state.diagnostics.latestDurationMs = Math.max(0, Date.now() - startedAt);
    this.state.diagnostics.warnings = [...this.state.diagnostics.warnings, ...validation.warnings].slice(-this.options.maxHistory);

    pushHistory(this.state, {
      type: 'content-generation-run',
      contentId: output.contentId,
      lessonId: output.lessonId,
      language: output.language,
      generatedAt: Date.now(),
      valid: validation.valid
    }, this.options.maxHistory);

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      contentCreationAdapter: {
        output,
        validation,
        runtimeState: this.snapshot(),
        synchronization: output.synchronization
      }
    };

    this.persistSession();

    return {
      output,
      validation,
      diagnostics: {
        durationMs: this.state.diagnostics.latestDurationMs,
        unknownFutureContentTypes: asArray(output?.diagnostics?.unknownFutureContentTypes),
        generatedAt: Date.now()
      }
    };
  }

  synchronize(reason = 'manual', input = {}) {
    const result = this.generate(input);
    pushHistory(this.state, {
      type: 'content-synchronization',
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
      ...inputFromRuntime(this.runtime),
      progressState: {
        interrupted: this.state.recovery.interrupted,
        resumeTimeMs: this.state.recovery.resumeTimeMs,
        checkpointId: this.state.recovery.checkpointId
      }
    });
  }

  markInterrupted(reason = 'interrupted') {
    this.state.recovery.interrupted = true;
    this.state.status = 'Paused';
    this.state.recovery.resumeTimeMs = Math.max(0, toFiniteNumber(this.runtime?.timelineScheduler?.snapshot?.()?.clock?.timeMs, this.state.recovery.resumeTimeMs));

    pushHistory(this.state, {
      type: 'interrupted',
      reason: safeString(reason) || 'interrupted',
      at: Date.now()
    }, this.options.maxHistory);

    this.persistSession();
    return true;
  }

  resumeFromCheckpoint(checkpointId = null) {
    const resolvedCheckpointId = safeString(checkpointId || this.state.recovery.checkpointId || '') || null;
    this.state.recovery.checkpointId = resolvedCheckpointId;
    this.state.recovery.interrupted = false;
    this.state.recovery.resumeCount += 1;
    this.state.status = 'Ready';

    pushHistory(this.state, {
      type: 'resumed',
      checkpointId: resolvedCheckpointId,
      resumeCount: this.state.recovery.resumeCount,
      at: Date.now()
    }, this.options.maxHistory);

    return this.synchronize('resume-from-checkpoint', {
      ...inputFromRuntime(this.runtime),
      progressState: {
        interrupted: false,
        checkpointId: resolvedCheckpointId,
        resumeTimeMs: this.state.recovery.resumeTimeMs
      }
    });
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify({
      schemaVersion: UNIVERSAL_AI_CONTENT_CREATION_SCHEMA_VERSION,
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
      history: {
        recentEvents: asArray(source?.history?.recentEvents).slice(-this.options.maxHistory)
      },
      recovery: {
        ...createDefaultState().recovery,
        ...(isObject(source.recovery) ? source.recovery : {})
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
      'content-created',
      'content-synchronized',
      'content-persisted',
      'content-recovered',
      'content-destroyed'
    ];
  }
}

function inputFromRuntime(runtime = {}) {
  return {
    lessonGraph: runtime?.metadata?.lessonGraph || {},
    runtimeGraph: runtime?.graph || {},
    learningIntent: runtime?.metadata?.intentProfile || runtime?.metadata?.learningIntent || {},
    visualizationStrategy: runtime?.metadata?.visualizationStrategy || {},
    userLearningProfile: runtime?.metadata?.userLearningProfile || runtime?.metadata?.learningProfile || {},
    aiTeacherMetadata: runtime?.metadata?.aiTeacherAdapter || {},
    assessmentMetadata: runtime?.metadata?.assessmentAdapter || {},
    analyticsMetadata: runtime?.metadata?.learningAnalyticsAdapter || {},
    pipeline: runtime?.metadata?.pipeline || runtime?.metadata?.sourceMeta || {}
  };
}

export function createUniversalAIContentCreationEngine(runtime = {}, options = {}) {
  return new UniversalAIContentCreationEngine(runtime, options);
}

export function runUniversalAIContentCreationEngine(input = {}, options = {}) {
  const runtime = isObject(options.runtime) ? options.runtime : {};
  const normalizedOptions = {
    ...options
  };
  delete normalizedOptions.runtime;

  const engine = createUniversalAIContentCreationEngine(runtime, normalizedOptions);
  return engine.generate(input);
}
