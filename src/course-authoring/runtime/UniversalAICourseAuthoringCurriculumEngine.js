import {
  UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION,
  SUPPORTED_BASE_CURRICULUM_TYPES,
  DEFAULT_UNIVERSAL_AI_CURRICULUM_CONFIG,
  isObject,
  asArray,
  safeString,
  toFiniteNumber,
  clamp,
  uniqueStrings,
  normalizeCurriculumLevel,
  normalizeCurriculumType
} from './UniversalAICourseAuthoringCurriculumEngineConfig.js';

const STORE_KEY = '__daksha_universal_ai_curriculum_engine_store__';

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
    schemaVersion: UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION,
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
    history: {
      recentEvents: []
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

function buildTopics(lessonGraph = {}, options = {}) {
  const maxTopics = Math.max(1, toFiniteNumber(options.maxTopics, DEFAULT_UNIVERSAL_AI_CURRICULUM_CONFIG.maxTopics));
  const topicNames = uniqueStrings([
    ...asArray(lessonGraph.topics),
    ...asArray(lessonGraph.keyConcepts),
    safeString(lessonGraph.title)
  ], maxTopics * 2);

  const topics = topicNames.slice(0, maxTopics).map((topic, index) => ({
    id: `topic-${index + 1}`,
    title: topic,
    order: index + 1,
    subtopicHints: uniqueStrings([
      `${topic} foundations`,
      `${topic} applications`,
      ...asArray(lessonGraph.subtopics)
    ], 8)
  }));

  if (topics.length > 0) return topics;

  const fallback = safeString(lessonGraph.title || 'Open Topic') || 'Open Topic';
  return [{
    id: 'topic-1',
    title: fallback,
    order: 1,
    subtopicHints: [`${fallback} foundations`, `${fallback} applications`]
  }];
}

function buildSubtopics(topics = []) {
  const output = [];
  topics.forEach((topic) => {
    asArray(topic.subtopicHints).forEach((subtopic) => {
      output.push({
        id: `subtopic-${output.length + 1}`,
        topicId: topic.id,
        title: safeString(subtopic) || `${topic.title} detail`
      });
    });
  });
  return output;
}

function buildModules(topics = [], level = 'intermediate', options = {}) {
  const maxModules = Math.max(1, toFiniteNumber(options.maxModules, DEFAULT_UNIVERSAL_AI_CURRICULUM_CONFIG.maxModules));
  const chunkSize = Math.max(1, Math.ceil(topics.length / maxModules));
  const modules = [];

  for (let index = 0; index < topics.length; index += chunkSize) {
    const chunk = topics.slice(index, index + chunkSize);
    if (!chunk.length) continue;
    const order = modules.length + 1;
    modules.push({
      id: `module-${order}`,
      title: `Module ${order}: ${chunk[0].title}`,
      order,
      level,
      topicIds: chunk.map((topic) => topic.id),
      estimatedHours: Math.max(2, Math.round(chunk.length * 1.5))
    });
  }

  if (modules.length > 0) return modules;

  return [{
    id: 'module-1',
    title: 'Module 1: Foundations',
    order: 1,
    level,
    topicIds: ['topic-1'],
    estimatedHours: 2
  }];
}

function buildChapters(modules = [], options = {}) {
  const maxChapters = Math.max(1, toFiniteNumber(options.maxChapters, DEFAULT_UNIVERSAL_AI_CURRICULUM_CONFIG.maxChapters));
  const chapters = [];

  modules.forEach((module) => {
    const chunk = Math.max(1, Math.ceil(module.topicIds.length / 2));
    for (let index = 0; index < module.topicIds.length; index += chunk) {
      chapters.push({
        id: `chapter-${chapters.length + 1}`,
        moduleId: module.id,
        title: `Chapter ${chapters.length + 1}`,
        order: chapters.length + 1,
        difficulty: module.level,
        estimatedHours: Math.max(1, Math.round(module.estimatedHours / Math.ceil(module.topicIds.length / chunk))),
        topicIds: module.topicIds.slice(index, index + chunk)
      });
      if (chapters.length >= maxChapters) break;
    }
  });

  return chapters.slice(0, maxChapters);
}

function buildUnits(chapters = [], options = {}) {
  const maxUnits = Math.max(1, toFiniteNumber(options.maxUnits, DEFAULT_UNIVERSAL_AI_CURRICULUM_CONFIG.maxUnits));
  const units = [];

  chapters.forEach((chapter) => {
    const unitCount = Math.max(1, chapter.topicIds.length);
    for (let index = 0; index < unitCount; index += 1) {
      units.push({
        id: `unit-${units.length + 1}`,
        chapterId: chapter.id,
        title: `Unit ${units.length + 1}`,
        order: units.length + 1,
        topicIds: [chapter.topicIds[index % chapter.topicIds.length]],
        estimatedMinutes: Math.max(30, Math.round((chapter.estimatedHours * 60) / unitCount))
      });
      if (units.length >= maxUnits) break;
    }
  });

  return units.slice(0, maxUnits);
}

function buildLearningObjectives(lessonGraph = {}, topics = []) {
  const objectives = uniqueStrings([
    ...asArray(lessonGraph.learningObjectives),
    ...topics.map((topic) => `Master ${topic.title}`)
  ], 240);

  return objectives.map((objective, index) => ({
    id: `objective-${index + 1}`,
    topicId: topics[index % topics.length]?.id || 'topic-1',
    objective,
    level: index % 4 === 0 ? 'beginner' : index % 4 === 1 ? 'intermediate' : index % 4 === 2 ? 'advanced' : 'expert'
  }));
}

function buildPrerequisites(topics = []) {
  return topics.slice(1).map((topic, index) => ({
    id: `prerequisite-${index + 1}`,
    topicId: topic.id,
    requiresTopicId: topics[index].id,
    rationale: `${topic.title} requires ${topics[index].title}.`
  }));
}

function buildLearningOutcomes(objectives = [], level = 'intermediate') {
  return objectives.slice(0, 160).map((objective, index) => ({
    id: `outcome-${index + 1}`,
    objectiveId: objective.id,
    outcome: `Demonstrate ${objective.objective.toLowerCase()} at ${level} proficiency.`
  }));
}

function buildDifficultyProgression(level = 'intermediate') {
  const sequence = ['beginner', 'intermediate', 'advanced', 'expert'];
  const levelIndex = sequence.indexOf(level);
  return sequence.slice(levelIndex >= 0 ? levelIndex : 0).map((entry, index) => ({
    id: `difficulty-stage-${index + 1}`,
    level: entry,
    guidance: `Progress with adaptive assessment and project evidence at ${entry} level.`
  }));
}

function buildPracticeSchedule(units = []) {
  return units.map((unit, index) => ({
    id: `practice-${index + 1}`,
    unitId: unit.id,
    week: Math.max(1, Math.ceil((index + 1) / 3)),
    minutes: Math.max(30, unit.estimatedMinutes),
    focus: `Practice tasks for ${unit.title}`
  }));
}

function buildRevisionSchedule(topics = []) {
  return topics.map((topic, index) => ({
    id: `revision-${index + 1}`,
    topicId: topic.id,
    intervalDays: index < 3 ? 1 : index < 8 ? 3 : 7,
    strategy: `Reinforce and apply ${topic.title}`
  }));
}

function buildAssessments(objectives = [], assessmentResults = {}) {
  const bank = asArray(assessmentResults?.questionBank || assessmentResults?.output?.questionBank);
  return objectives.slice(0, 120).map((objective, index) => ({
    id: `assessment-${index + 1}`,
    objectiveId: objective.id,
    type: index % 3 === 0 ? 'formative' : index % 3 === 1 ? 'summative' : 'adaptive',
    prompt: `Assess objective: ${objective.objective}`,
    linkedQuestionId: bank[index]?.id || null
  }));
}

function buildProjects(topics = []) {
  return topics.slice(0, 24).map((topic, index) => ({
    id: `project-${index + 1}`,
    topicId: topic.id,
    title: `Project: ${topic.title}`,
    deliverable: `Build and evaluate a practical implementation of ${topic.title}.`
  }));
}

function buildCapstone(topics = []) {
  return {
    id: 'capstone-1',
    title: 'Integrated Capstone',
    scope: topics.slice(0, 8).map((topic) => topic.title),
    deliverables: ['solution artifact', 'evaluation report', 'presentation']
  };
}

function buildSkillMap(topics = [], level = 'intermediate') {
  return topics.slice(0, 160).map((topic, index) => ({
    id: `skill-${index + 1}`,
    skill: topic.title,
    level,
    evidenceType: index % 2 === 0 ? 'assessment' : 'project'
  }));
}

function buildCertificationPath(outcomes = [], level = 'intermediate') {
  return {
    track: `Certification Path (${level})`,
    milestones: outcomes.slice(0, 10).map((outcome, index) => ({
      id: `cert-milestone-${index + 1}`,
      outcomeId: outcome.id,
      requirement: outcome.outcome
    }))
  };
}

function buildCareerPath(skillMap = []) {
  return {
    roles: skillMap.slice(0, 12).map((skill, index) => ({
      id: `career-role-${index + 1}`,
      role: `Role applying ${skill.skill}`,
      competencyLevel: skill.level
    }))
  };
}

function buildKnowledgeGraph(topics = [], prerequisites = [], runtimeGraphSummary = {}) {
  const nodes = topics.map((topic) => ({
    id: topic.id,
    label: topic.title,
    kind: 'topic'
  }));

  const edges = prerequisites.map((prerequisite, index) => ({
    id: `kg-edge-${index + 1}`,
    from: prerequisite.requiresTopicId,
    to: prerequisite.topicId,
    relation: 'prerequisite-for'
  }));

  return {
    nodeCount: Math.max(nodes.length, runtimeGraphSummary.nodeCount),
    relationshipCount: Math.max(edges.length, runtimeGraphSummary.relationshipCount),
    nodes,
    edges
  };
}

function buildCompetencyMatrix(skillMap = [], outcomes = []) {
  return skillMap.slice(0, 160).map((skill, index) => ({
    id: `competency-${index + 1}`,
    skillId: skill.id,
    outcomeId: outcomes[index % outcomes.length]?.id || null,
    targetLevel: skill.level,
    verification: skill.evidenceType
  }));
}

function buildDependencyGraph(modules = [], units = [], objectives = []) {
  const nodes = [
    ...modules.map((module) => ({ id: module.id, kind: 'module' })),
    ...units.map((unit) => ({ id: unit.id, kind: 'unit' })),
    ...objectives.map((objective) => ({ id: objective.id, kind: 'objective' }))
  ];

  const edges = [];
  units.forEach((unit, index) => {
    const module = modules[index % modules.length];
    if (!module) return;
    edges.push({
      id: `dependency-edge-${edges.length + 1}`,
      from: module.id,
      to: unit.id,
      relation: 'contains'
    });
  });

  objectives.forEach((objective, index) => {
    const unit = units[index % units.length];
    if (!unit) return;
    edges.push({
      id: `dependency-edge-${edges.length + 1}`,
      from: unit.id,
      to: objective.id,
      relation: 'enables'
    });
  });

  return {
    nodes,
    edges
  };
}

function buildPrerequisiteGraph(prerequisites = []) {
  return {
    nodes: uniqueStrings(prerequisites.flatMap((item) => [item.requiresTopicId, item.topicId]), 500).map((id) => ({ id })),
    edges: prerequisites.map((item, index) => ({
      id: `prerequisite-edge-${index + 1}`,
      from: item.requiresTopicId,
      to: item.topicId,
      relation: 'required-before'
    }))
  };
}

function buildMasteryGraph(analytics = {}, objectives = []) {
  const masteryScore = clamp(analytics?.masteryScore ?? analytics?.output?.masteryScore ?? 0.5, 0, 1);
  const nodes = objectives.slice(0, 160).map((objective, index) => ({
    id: `mastery-node-${index + 1}`,
    objectiveId: objective.id,
    mastery: clamp(masteryScore - ((index % 6) * 0.05), 0, 1)
  }));

  const edges = nodes.slice(1).map((node, index) => ({
    id: `mastery-edge-${index + 1}`,
    from: nodes[index].id,
    to: node.id,
    relation: 'progression'
  }));

  return {
    nodes,
    edges
  };
}

function buildRevisionGraph(revisionSchedule = []) {
  return {
    nodes: revisionSchedule.map((entry) => ({ id: entry.id, topicId: entry.topicId })),
    edges: revisionSchedule.slice(1).map((entry, index) => ({
      id: `revision-edge-${index + 1}`,
      from: revisionSchedule[index].id,
      to: entry.id,
      relation: 'next-revision'
    }))
  };
}

function buildProjectRoadmap(projects = [], capstone = {}) {
  const milestones = projects.map((project, index) => ({
    id: `project-roadmap-${index + 1}`,
    projectId: project.id,
    order: index + 1,
    title: project.title
  }));

  milestones.push({
    id: 'project-roadmap-capstone',
    projectId: capstone.id || 'capstone-1',
    order: milestones.length + 1,
    title: capstone.title || 'Integrated Capstone'
  });

  return {
    milestones,
    sequence: milestones.map((item) => item.id)
  };
}

function resolveUnknownCurriculumTypes(input = {}) {
  const requestedTypes = uniqueStrings([
    ...asArray(input.curriculumTypes),
    ...asArray(input.requestedCurriculumTypes),
    ...asArray(input?.learningIntent?.requestedCurriculumTypes),
    ...asArray(input?.learningIntent?.futureCurriculumTypes),
    ...asArray(input?.lessonGraph?.futureCurriculumTypes)
  ], 120);

  const unknown = [];
  requestedTypes.forEach((type) => {
    const normalized = normalizeCurriculumType(type);
    if (!normalized.known && !unknown.includes(normalized.type)) {
      unknown.push(normalized.type);
    }
  });

  return unknown;
}

function buildFutureCurriculumModules(unknownTypes = [], topics = []) {
  return unknownTypes.map((type, index) => ({
    curriculumType: type,
    items: topics.slice(0, 8).map((topic, topicIndex) => ({
      id: `${type}-${index + 1}-${topicIndex + 1}`,
      topicId: topic.id,
      metadata: {
        title: `${type} for ${topic.title}`,
        generatedDynamically: true,
        schemaVersion: UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION
      }
    }))
  }));
}

function resolveRuntimeInput(runtime = {}, input = {}) {
  return {
    lessonGraph: isObject(input.lessonGraph) ? input.lessonGraph : runtime?.metadata?.lessonGraph || {},
    runtimeGraph: isObject(input.runtimeGraph) ? input.runtimeGraph : runtime?.graph || {},
    learningIntent: isObject(input.learningIntent) ? input.learningIntent : runtime?.metadata?.intentProfile || runtime?.metadata?.learningIntent || {},
    learningAnalytics: isObject(input.learningAnalytics) ? input.learningAnalytics : runtime?.metadata?.learningAnalyticsAdapter || {},
    assessmentResults: isObject(input.assessmentResults) ? input.assessmentResults : runtime?.metadata?.assessmentAdapter || {},
    aiTeacherMetadata: isObject(input.aiTeacherMetadata) ? input.aiTeacherMetadata : runtime?.metadata?.aiTeacherAdapter || {},
    userLearningProfile: isObject(input.userLearningProfile) ? input.userLearningProfile : runtime?.metadata?.userLearningProfile || runtime?.metadata?.learningProfile || {},
    pipeline: isObject(input.pipeline) ? input.pipeline : runtime?.metadata?.pipeline || runtime?.metadata?.sourceMeta || {},
    curriculumTypes: asArray(input.curriculumTypes),
    requestedCurriculumTypes: asArray(input.requestedCurriculumTypes)
  };
}

function buildCurriculumOutput(runtime = {}, input = {}, options = {}) {
  const runtimeInput = resolveRuntimeInput(runtime, input);
  const lessonGraph = runtimeInput.lessonGraph;
  const learningIntent = runtimeInput.learningIntent;
  const learningAnalytics = runtimeInput.learningAnalytics;
  const assessmentResults = runtimeInput.assessmentResults;
  const userLearningProfile = runtimeInput.userLearningProfile;
  const aiTeacherMetadata = runtimeInput.aiTeacherMetadata;
  const runtimeGraphSummary = inferRuntimeGraphSummary(runtimeInput.runtimeGraph);

  const normalizedLevel = normalizeCurriculumLevel(userLearningProfile.learningLevel || userLearningProfile.level || options.defaultLevel);

  const topics = buildTopics(lessonGraph, options);
  const subtopics = buildSubtopics(topics);
  const modules = buildModules(topics, normalizedLevel.level, options);
  const chapters = buildChapters(modules, options);
  const units = buildUnits(chapters, options);
  const learningObjectives = buildLearningObjectives(lessonGraph, topics);
  const prerequisites = buildPrerequisites(topics);
  const learningOutcomes = buildLearningOutcomes(learningObjectives, normalizedLevel.level);
  const difficultyProgression = buildDifficultyProgression(normalizedLevel.level);
  const practiceSchedule = buildPracticeSchedule(units);
  const revisionSchedule = buildRevisionSchedule(topics);
  const assessments = buildAssessments(learningObjectives, assessmentResults);
  const projects = buildProjects(topics);
  const capstone = buildCapstone(topics);
  const skillMap = buildSkillMap(topics, normalizedLevel.level);
  const certificationPath = buildCertificationPath(learningOutcomes, normalizedLevel.level);
  const careerPath = buildCareerPath(skillMap);
  const knowledgeGraph = buildKnowledgeGraph(topics, prerequisites, runtimeGraphSummary);
  const competencyMatrix = buildCompetencyMatrix(skillMap, learningOutcomes);
  const dependencyGraph = buildDependencyGraph(modules, units, learningObjectives);
  const prerequisiteGraph = buildPrerequisiteGraph(prerequisites);
  const masteryGraph = buildMasteryGraph(learningAnalytics, learningObjectives);
  const revisionGraph = buildRevisionGraph(revisionSchedule);
  const projectRoadmap = buildProjectRoadmap(projects, capstone);
  const unknownCurriculumTypes = resolveUnknownCurriculumTypes(runtimeInput);
  const futureCurriculumModules = buildFutureCurriculumModules(unknownCurriculumTypes, topics);

  const estimatedDuration = {
    hours: Math.max(4, Math.round(units.reduce((sum, unit) => sum + (unit.estimatedMinutes / 60), 0))),
    weeks: Math.max(1, Math.ceil(units.length / 4))
  };

  const course = {
    courseId: safeString(lessonGraph.lessonId || `course-${Date.now()}`) || `course-${Date.now()}`,
    title: safeString(lessonGraph.title || learningIntent.learningObjective || 'Universal Curriculum') || 'Universal Curriculum',
    language: safeString(lessonGraph.language || learningIntent.language || userLearningProfile.language || options.defaultLanguage) || options.defaultLanguage,
    level: normalizedLevel.level,
    domainTags: uniqueStrings([
      safeString(learningIntent.knowledgeDomain),
      safeString(lessonGraph.sourceType),
      safeString(userLearningProfile.track)
    ], 30)
  };

  return {
    schemaVersion: UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION,
    curriculumId: course.courseId,
    lessonId: safeString(lessonGraph.lessonId || course.courseId) || course.courseId,
    course,
    modules,
    chapters,
    units,
    topics,
    subtopics,
    learningObjectives,
    prerequisites,
    learningOutcomes,
    estimatedDuration,
    difficultyProgression,
    practiceSchedule,
    revisionSchedule,
    assessments,
    projects,
    capstone,
    certificationPath,
    careerPath,
    skillMap,
    knowledgeGraph,
    competencyMatrix,
    dependencyGraph,
    prerequisiteGraph,
    masteryGraph,
    revisionGraph,
    projectRoadmap,
    futureCurriculumModules,
    courseVersionMetadata: {
      schemaVersion: UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION,
      generatedAt: Date.now(),
      sourceSchemaVersion: safeString(lessonGraph.schemaVersion || 'v1') || 'v1',
      engineVersion: 'course-authoring-runtime-v1'
    },
    diagnostics: {
      unknownCurriculumTypes,
      unknownLevel: normalizedLevel.known === false,
      runtimeGraphNodeCount: runtimeGraphSummary.nodeCount,
      runtimeGraphRelationshipCount: runtimeGraphSummary.relationshipCount,
      hasLearningAnalytics: Boolean(learningAnalytics?.output || learningAnalytics?.masteryScore),
      hasAssessmentResults: Boolean(assessmentResults?.output || assessmentResults?.questionBank),
      hasAITeacherMetadata: Boolean(aiTeacherMetadata?.teachingPlan || aiTeacherMetadata?.runtimeState)
    },
    synchronization: {
      integration: {
        universalLearningPipeline: {
          status: 'integrated',
          hasMetadata: isObject(runtimeInput.pipeline)
        },
        lessonGenerator: {
          status: 'integrated',
          lessonId: safeString(lessonGraph.lessonId || '') || null
        },
        aiTeacher: {
          status: 'integrated',
          hasTeachingPlan: Boolean(aiTeacherMetadata?.teachingPlan || aiTeacherMetadata?.runtimeState?.plan)
        },
        assessmentEngine: {
          status: 'integrated',
          hasQuestionBank: Boolean(asArray(assessmentResults?.output?.questionBank || assessmentResults?.questionBank).length)
        },
        learningAnalytics: {
          status: 'integrated',
          hasOutput: Boolean(learningAnalytics?.output || learningAnalytics?.masteryScore)
        },
        runtimeGraph: {
          status: 'integrated',
          nodeCount: runtimeGraphSummary.nodeCount,
          relationshipCount: runtimeGraphSummary.relationshipCount
        },
        knowledgeGraph: {
          status: 'integrated',
          nodeCount: knowledgeGraph.nodes.length,
          relationshipCount: knowledgeGraph.edges.length
        }
      },
      versionCompatibility: {
        schemaVersion: UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION,
        backwardCompatible: true,
        forwardCompatible: true
      }
    }
  };
}

export function validateUniversalAICurriculumOutput(output = {}) {
  const source = isObject(output) ? output : {};
  const errors = [];
  const warnings = [];

  if (!safeString(source.curriculumId)) errors.push('Missing curriculumId.');
  if (!safeString(source.lessonId)) errors.push('Missing lessonId.');
  if (!isObject(source.course)) errors.push('course must be an object.');

  [
    'modules',
    'chapters',
    'units',
    'topics',
    'subtopics',
    'learningObjectives',
    'prerequisites',
    'learningOutcomes',
    'difficultyProgression',
    'practiceSchedule',
    'revisionSchedule',
    'assessments',
    'projects',
    'skillMap',
    'competencyMatrix',
    'futureCurriculumModules'
  ].forEach((field) => {
    if (!Array.isArray(source[field])) {
      errors.push(`${field} must be an array.`);
    }
  });

  if (!isObject(source.capstone)) errors.push('capstone must be an object.');
  if (!isObject(source.certificationPath)) errors.push('certificationPath must be an object.');
  if (!isObject(source.careerPath)) errors.push('careerPath must be an object.');
  if (!isObject(source.knowledgeGraph)) errors.push('knowledgeGraph must be an object.');
  if (!isObject(source.dependencyGraph)) errors.push('dependencyGraph must be an object.');
  if (!isObject(source.prerequisiteGraph)) errors.push('prerequisiteGraph must be an object.');
  if (!isObject(source.masteryGraph)) errors.push('masteryGraph must be an object.');
  if (!isObject(source.revisionGraph)) errors.push('revisionGraph must be an object.');
  if (!isObject(source.projectRoadmap)) errors.push('projectRoadmap must be an object.');
  if (!isObject(source.courseVersionMetadata)) errors.push('courseVersionMetadata must be an object.');

  const serialized = JSON.stringify(source);
  if (/renderer|three\.|webgl|speechsynthesis|texttospeech|tts|shader|fragment|vertex|canvas/i.test(serialized)) {
    errors.push('Renderer or speech payload detected in curriculum output.');
  }

  asArray(source.futureCurriculumModules).forEach((entry) => {
    const normalized = normalizeCurriculumType(entry?.curriculumType || entry?.type || '');
    if (normalized.known) {
      warnings.push(`futureCurriculumModules contains known type: ${normalized.type}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    status: errors.length === 0 ? (warnings.length ? 'warning' : 'valid') : 'invalid'
  };
}

export function serializeUniversalAICurriculumOutput(output = {}) {
  return JSON.stringify({
    schemaVersion: UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION,
    serializedAt: Date.now(),
    output
  });
}

export function migrateUniversalAICurriculumOutput(input = {}) {
  const source = isObject(input) ? input : {};

  if (safeString(source.schemaVersion) === UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION && isObject(source.course)) {
    return source;
  }

  const title = safeString(source.title || source.courseTitle || source.lessonTitle || 'Recovered Curriculum') || 'Recovered Curriculum';
  const lessonId = safeString(source.lessonId || source.id || 'legacy-curriculum') || 'legacy-curriculum';
  const language = safeString(source.language || 'English') || 'English';
  const topics = uniqueStrings(asArray(source.topics), 40).map((topic, index) => ({
    id: `topic-${index + 1}`,
    title: safeString(topic) || `Topic ${index + 1}`,
    order: index + 1,
    subtopicHints: []
  }));

  return {
    schemaVersion: UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION,
    curriculumId: lessonId,
    lessonId,
    course: {
      courseId: lessonId,
      title,
      language,
      level: safeString(source.level || 'intermediate') || 'intermediate',
      domainTags: uniqueStrings(asArray(source.domainTags), 20)
    },
    modules: [{ id: 'module-1', title: 'Module 1', order: 1, level: 'intermediate', topicIds: topics.map((topic) => topic.id), estimatedHours: 2 }],
    chapters: [{ id: 'chapter-1', moduleId: 'module-1', title: 'Chapter 1', order: 1, difficulty: 'intermediate', estimatedHours: 2, topicIds: topics.map((topic) => topic.id) }],
    units: [{ id: 'unit-1', chapterId: 'chapter-1', title: 'Unit 1', order: 1, topicIds: topics.map((topic) => topic.id), estimatedMinutes: 60 }],
    topics,
    subtopics: [],
    learningObjectives: uniqueStrings(asArray(source.learningObjectives), 20).map((objective, index) => ({ id: `objective-${index + 1}`, topicId: topics[index % Math.max(1, topics.length)]?.id || 'topic-1', objective, level: 'intermediate' })),
    prerequisites: [],
    learningOutcomes: [],
    estimatedDuration: {
      hours: Math.max(2, toFiniteNumber(source.estimatedDurationHours, 4)),
      weeks: 1
    },
    difficultyProgression: [{ id: 'difficulty-stage-1', level: 'intermediate', guidance: 'Progress with mastery checks.' }],
    practiceSchedule: [],
    revisionSchedule: [],
    assessments: [],
    projects: [],
    capstone: { id: 'capstone-1', title: 'Capstone', scope: [], deliverables: [] },
    certificationPath: { track: 'Certification Path', milestones: [] },
    careerPath: { roles: [] },
    skillMap: [],
    knowledgeGraph: { nodeCount: topics.length, relationshipCount: 0, nodes: topics.map((topic) => ({ id: topic.id, label: topic.title, kind: 'topic' })), edges: [] },
    competencyMatrix: [],
    dependencyGraph: { nodes: [], edges: [] },
    prerequisiteGraph: { nodes: [], edges: [] },
    masteryGraph: { nodes: [], edges: [] },
    revisionGraph: { nodes: [], edges: [] },
    projectRoadmap: { milestones: [], sequence: [] },
    futureCurriculumModules: asArray(source.futureCurriculumModules),
    courseVersionMetadata: {
      schemaVersion: UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION,
      generatedAt: Date.now(),
      sourceSchemaVersion: safeString(source.schemaVersion || 'legacy') || 'legacy',
      engineVersion: 'course-authoring-runtime-v1'
    },
    diagnostics: {
      unknownCurriculumTypes: [],
      unknownLevel: false,
      runtimeGraphNodeCount: 0,
      runtimeGraphRelationshipCount: 0,
      hasLearningAnalytics: false,
      hasAssessmentResults: false,
      hasAITeacherMetadata: false
    },
    synchronization: {
      integration: {
        universalLearningPipeline: { status: 'legacy', hasMetadata: false },
        lessonGenerator: { status: 'legacy', lessonId },
        aiTeacher: { status: 'legacy', hasTeachingPlan: false },
        assessmentEngine: { status: 'legacy', hasQuestionBank: false },
        learningAnalytics: { status: 'legacy', hasOutput: false },
        runtimeGraph: { status: 'legacy', nodeCount: 0, relationshipCount: 0 },
        knowledgeGraph: { status: 'legacy', nodeCount: topics.length, relationshipCount: 0 }
      },
      versionCompatibility: {
        schemaVersion: UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION,
        backwardCompatible: true,
        forwardCompatible: true
      }
    }
  };
}

export function deserializeUniversalAICurriculumOutput(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    const fallback = migrateUniversalAICurriculumOutput({
      lessonId: 'recovered-curriculum',
      title: 'Recovered Curriculum'
    });

    return {
      output: fallback,
      validation: {
        valid: false,
        status: 'fallback',
        errors: ['Failed to parse curriculum payload.'],
        warnings: []
      }
    };
  }

  const output = migrateUniversalAICurriculumOutput(parsed.output || parsed);
  return {
    output,
    validation: validateUniversalAICurriculumOutput(output)
  };
}

export class UniversalAICourseAuthoringCurriculumEngine {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_UNIVERSAL_AI_CURRICULUM_CONFIG,
      ...(isObject(options) ? options : {})
    };
    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey || DEFAULT_UNIVERSAL_AI_CURRICULUM_CONFIG.persistenceKey)
      || DEFAULT_UNIVERSAL_AI_CURRICULUM_CONFIG.persistenceKey;

    this.state = createDefaultState();
    this.recoverSession();
  }

  generate(input = {}) {
    const startedAt = Date.now();
    const output = buildCurriculumOutput(this.runtime, input, this.options);
    const validation = validateUniversalAICurriculumOutput(output);

    this.state.output = output;
    this.state.status = validation.valid ? 'Ready' : 'Warning';
    this.state.diagnostics.runs += 1;
    this.state.diagnostics.latestDurationMs = Math.max(0, Date.now() - startedAt);
    this.state.diagnostics.warnings = [...this.state.diagnostics.warnings, ...validation.warnings].slice(-this.options.maxHistory);

    pushHistory(this.state, {
      type: 'curriculum-generated',
      curriculumId: output.curriculumId,
      lessonId: output.lessonId,
      at: Date.now(),
      valid: validation.valid
    }, this.options.maxHistory);

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      curriculumAuthoringAdapter: {
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
        unknownCurriculumTypes: asArray(output?.diagnostics?.unknownCurriculumTypes)
      }
    };
  }

  synchronize(reason = 'manual', input = {}) {
    const result = this.generate(input);
    pushHistory(this.state, {
      type: 'curriculum-synchronized',
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

    return this.synchronize(`mutation:${safeType}`, {});
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

    return this.synchronize('resume-from-checkpoint', {});
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify({
      schemaVersion: UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION,
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
      'curriculum-generated',
      'curriculum-synchronized',
      'curriculum-persisted',
      'curriculum-recovered',
      'curriculum-destroyed'
    ];
  }
}

export function createUniversalAICourseAuthoringCurriculumEngine(runtime = {}, options = {}) {
  return new UniversalAICourseAuthoringCurriculumEngine(runtime, options);
}

export function runUniversalAICourseAuthoringCurriculumEngine(input = {}, options = {}) {
  const runtime = isObject(options.runtime) ? options.runtime : {};
  const normalizedOptions = {
    ...options
  };
  delete normalizedOptions.runtime;

  const engine = createUniversalAICourseAuthoringCurriculumEngine(runtime, normalizedOptions);
  return engine.generate(input);
}
