import { runUniversalLearningPipeline } from '../services/universalLearningPipeline.js';
import { analyzeUniversalLearningIntent } from '../intent-analysis/index.js';
import { analyzeVisualizationStrategy } from '../visualization-strategy/index.js';
import { generateUniversalScene } from '../scene-generator/index.js';
import { buildTimeline, validateTimeline } from '../timeline/index.js';
import { buildTeacherSynchronizationPlan } from '../utils/teacherSynchronizationEngine.js';
import { buildRuntimeSceneGraph } from '../scene-builder/SceneBuilder.js';
import { runUniversalAIContentCreationEngine } from '../content-creation/index.js';
import { runUniversalAICourseAuthoringCurriculumEngine } from '../course-authoring/index.js';

const STORE_KEY = '__daksha_universal_ai_lesson_generator_store__';
const LESSON_GRAPH_SCHEMA_VERSION = 'v1';
const DEFAULT_PERSISTENCE_KEY = 'daksha.universal.ai.lesson.generator.v1';

const SOURCE_TYPE_ALIASES = {
  pdf: 'pdf',
  doc: 'docx',
  docx: 'docx',
  ppt: 'ppt',
  pptx: 'ppt',
  image: 'image',
  camera: 'camera-scan',
  scan: 'camera-scan',
  'camera-scan': 'camera-scan',
  handwritten: 'handwritten-notes',
  notes: 'handwritten-notes',
  'handwritten-notes': 'handwritten-notes',
  website: 'website',
  youtube: 'youtube',
  audio: 'audio',
  video: 'video',
  github: 'github',
  code: 'github',
  research: 'research-paper',
  'research-paper': 'research-paper',
  text: 'text',
  'user-text': 'text',
  book: 'book'
};

function safeString(value) {
  return String(value || '').trim();
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, minimum = 0, maximum = 1) {
  const numberValue = toFiniteNumber(value, minimum);
  return Math.min(Math.max(numberValue, minimum), maximum);
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

function dedupeStrings(values = [], max = 50) {
  const output = [];
  const seen = new Set();

  values.forEach((value) => {
    const normalized = safeString(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(normalized);
  });

  return output.slice(0, max);
}

function normalizeSourceType(sourceType = '') {
  const normalized = safeString(sourceType).toLowerCase().replace(/[_\s]+/g, '-');
  if (!normalized) return 'text';
  return SOURCE_TYPE_ALIASES[normalized] || normalized;
}

function normalizeLessonInput(input = {}) {
  const source = isObject(input) ? input : {};
  const sourceType = normalizeSourceType(source.sourceType || source.type || source.format || 'text');
  const sourceName = safeString(source.sourceName || source.filename || source.url || source.title || 'universal-lesson-source') || 'universal-lesson-source';
  const text = safeString(source.text || source.content || source.lesson || source.extractedText || source.prompt || '');
  const topic = safeString(source.topic || source.subject || source.title || sourceName || 'Open Topic') || 'Open Topic';

  return {
    sourceType,
    sourceHint: sourceType,
    sourceName,
    topic,
    title: safeString(source.title || topic) || topic,
    text,
    url: safeString(source.url || ''),
    ocrText: safeString(source.ocrText || ''),
    language: safeString(source.language || 'English') || 'English',
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function createFastPipelineResult(normalizedInput = {}) {
  const fallbackText = safeString(normalizedInput.text || `${normalizedInput.topic} lesson summary`) || `${normalizedInput.topic} lesson summary`;
  return {
    sourceMeta: {
      sourceType: normalizedInput.sourceType,
      sourceName: normalizedInput.sourceName,
      language: normalizedInput.language,
      title: normalizedInput.title,
      subject: normalizedInput.topic,
      topics: [normalizedInput.topic],
      subtopics: [normalizedInput.topic],
      chapters: ['Overview'],
      keyConcepts: [normalizedInput.topic],
      learningObjectives: [`Understand ${normalizedInput.topic}`],
      contentObject: {
        visualDescription: ''
      }
    },
    sourceModel: {
      title: normalizedInput.title,
      extractedText: fallbackText,
      definitions: [fallbackText],
      diagrams: [],
      tables: []
    },
    learningSession: {
      title: normalizedInput.title,
      summary: fallbackText,
      keyConcepts: [normalizedInput.topic],
      examples: [`Example: ${normalizedInput.topic}`],
      realWorldApplications: [`Application: ${normalizedInput.topic}`],
      revisionNotes: [`Review ${normalizedInput.topic}`],
      cheatSheet: [`Cheat sheet: ${normalizedInput.topic}`],
      interviewQuestions: [`How would you explain ${normalizedInput.topic}?`],
      quiz: [{ question: `What is ${normalizedInput.topic}?`, answer: `${normalizedInput.topic} concept.` }],
      flashcards: [{ front: normalizedInput.topic, back: `${normalizedInput.topic} overview` }],
      practice: {
        questions: [`Practice: apply ${normalizedInput.topic}`],
        adaptiveDifficulty: 'Medium'
      },
      learningRoadmap: ['Learn fundamentals', 'Practice application', 'Assess understanding']
    },
    detections: {
      practicalSkills: []
    }
  };
}

function deriveChapterNodes(chapters = [], fallbackTopic = 'Open Topic') {
  const normalized = dedupeStrings(chapters, 24);
  if (!normalized.length) {
    return [{ id: 'chapter-1', title: `${fallbackTopic} Overview`, order: 1 }];
  }

  return normalized.map((title, index) => ({
    id: `chapter-${index + 1}`,
    title,
    order: index + 1
  }));
}

function buildTopicHierarchy(sourceMeta = {}, learningSession = {}, fallbackTopic = 'Open Topic') {
  const chapters = deriveChapterNodes(sourceMeta.chapters, fallbackTopic);
  const topics = dedupeStrings([
    ...asArray(sourceMeta.topics),
    ...asArray(learningSession.keyConcepts),
    fallbackTopic
  ], 40);
  const subtopics = dedupeStrings([
    ...asArray(sourceMeta.subtopics),
    ...asArray(learningSession.realWorldApplications),
    ...asArray(learningSession.examples)
  ], 60);

  return {
    chapters,
    topics,
    subtopics
  };
}

function buildVisualOpportunities(sourceModel = {}, sourceMeta = {}) {
  const opportunities = [];

  asArray(sourceModel.diagrams).forEach((item, index) => {
    opportunities.push({ id: `visual-diagram-${index + 1}`, type: 'diagram', description: safeString(item) });
  });

  asArray(sourceModel.tables).forEach((item, index) => {
    opportunities.push({ id: `visual-table-${index + 1}`, type: 'table', description: safeString(item) });
  });

  asArray(sourceModel.images).forEach((item, index) => {
    opportunities.push({ id: `visual-image-${index + 1}`, type: 'image', description: safeString(item) });
  });

  if (!opportunities.length) {
    opportunities.push({
      id: 'visual-default-1',
      type: 'concept-visualization',
      description: safeString(sourceMeta.learningObjective || 'Use concept-first visual explanation') || 'Use concept-first visual explanation'
    });
  }

  return opportunities.slice(0, 24);
}

function buildSceneRequirements(scene = {}, strategy = {}, recommendation = {}) {
  const classification = isObject(scene.classification) ? scene.classification : {};

  return {
    sceneId: safeString(scene.sceneId || ''),
    domain: safeString(classification.domain || strategy?.knowledgeDomain || 'Open Domain') || 'Open Domain',
    complexity: safeString(classification.sceneComplexity || strategy?.primaryStrategy?.sceneComplexity || 'medium') || 'medium',
    interactionCategory: safeString(classification.interactionCategory || strategy?.primaryStrategy?.interactionLevel || 'guided') || 'guided',
    recommendedCapabilities: asArray(recommendation.recommendedCapabilities).slice(0, 20),
    recommendedTemplates: asArray(recommendation.recommendedTemplates).slice(0, 20),
    objectCount: asArray(scene.objects).length,
    timelineStepCount: asArray(scene.timeline).length
  };
}

function buildEducationalObjects(scene = {}) {
  return asArray(scene.objects).map((item, index) => ({
    id: safeString(item?.id || `educational-object-${index + 1}`) || `educational-object-${index + 1}`,
    type: safeString(item?.type || 'concept-node') || 'concept-node',
    name: safeString(item?.name || item?.label || `Concept ${index + 1}`) || `Concept ${index + 1}`,
    metadata: isObject(item?.metadata) ? item.metadata : {}
  })).slice(0, 200);
}

function buildTimelineSteps(timeline = {}, teacherPlan = {}) {
  const timelineSteps = asArray(timeline.clips).map((clip, index) => ({
    id: safeString(clip?.id || `timeline-step-${index + 1}`) || `timeline-step-${index + 1}`,
    title: safeString(clip?.metadata?.title || clip?.id || `Step ${index + 1}`) || `Step ${index + 1}`,
    order: index + 1,
    startMs: toFiniteNumber(clip?.start, index * 1000),
    endMs: toFiniteNumber(clip?.end, (index + 1) * 1000),
    durationMs: Math.max(0, toFiniteNumber(clip?.duration, toFiniteNumber(clip?.end, 0) - toFiniteNumber(clip?.start, 0)))
  }));

  const teacherSteps = asArray(teacherPlan.steps).map((step, index) => ({
    id: safeString(step?.id || `teacher-step-${index + 1}`) || `teacher-step-${index + 1}`,
    type: safeString(step?.type || 'explain') || 'explain',
    action: safeString(step?.action || ''),
    durationMs: Math.max(0, toFiniteNumber(step?.durationMs, 0)),
    target: safeString(step?.target || '')
  }));

  return {
    timelineSteps: timelineSteps.slice(0, 200),
    teacherSteps: teacherSteps.slice(0, 200)
  };
}

function buildTeacherScript(teacherPlan = {}, learningSession = {}) {
  const lines = [];

  asArray(teacherPlan.steps).forEach((step) => {
    const action = safeString(step?.action);
    if (action) lines.push(action);
    const explanation = safeString(step?.explanation);
    if (explanation) lines.push(explanation);
  });

  if (!lines.length) {
    lines.push(safeString(learningSession.summary || 'Explain lesson concepts and guide learner interactions.') || 'Explain lesson concepts and guide learner interactions.');
  }

  return dedupeStrings(lines, 120);
}

function buildLessonGraphNodes(data = {}) {
  const nodes = [];

  nodes.push({
    id: data.lessonId,
    type: 'lesson',
    label: data.title,
    metadata: {
      sourceType: data.sourceType,
      language: data.language,
      confidenceScore: data.confidenceScore
    }
  });

  asArray(data.learningObjectives).forEach((objective, index) => {
    nodes.push({
      id: `objective-${index + 1}`,
      type: 'learning-objective',
      label: objective,
      metadata: {}
    });
  });

  asArray(data.keyConcepts).forEach((concept, index) => {
    nodes.push({
      id: `concept-${index + 1}`,
      type: 'concept',
      label: concept,
      metadata: {}
    });
  });

  asArray(data.educationalObjects).forEach((objectNode) => {
    nodes.push({
      id: `edu-object:${objectNode.id}`,
      type: 'educational-object',
      label: objectNode.name,
      metadata: {
        objectType: objectNode.type
      }
    });
  });

  asArray(data.timelineSteps).forEach((step) => {
    nodes.push({
      id: `timeline:${step.id}`,
      type: 'timeline-step',
      label: step.title,
      metadata: {
        order: step.order,
        durationMs: step.durationMs
      }
    });
  });

  return nodes;
}

function buildLessonGraphEdges(data = {}) {
  const edges = [];

  asArray(data.learningObjectives).forEach((_, index) => {
    edges.push({
      id: `edge-lesson-objective-${index + 1}`,
      from: data.lessonId,
      to: `objective-${index + 1}`,
      type: 'contains-objective'
    });
  });

  asArray(data.keyConcepts).forEach((_, index) => {
    edges.push({
      id: `edge-lesson-concept-${index + 1}`,
      from: data.lessonId,
      to: `concept-${index + 1}`,
      type: 'contains-concept'
    });
  });

  asArray(data.educationalObjects).forEach((objectNode) => {
    edges.push({
      id: `edge-lesson-object-${objectNode.id}`,
      from: data.lessonId,
      to: `edu-object:${objectNode.id}`,
      type: 'requires-object'
    });
  });

  asArray(data.timelineSteps).forEach((step, index) => {
    edges.push({
      id: `edge-lesson-timeline-${index + 1}`,
      from: data.lessonId,
      to: `timeline:${step.id}`,
      type: 'has-timeline-step'
    });

    if (index > 0) {
      edges.push({
        id: `edge-timeline-seq-${index}`,
        from: `timeline:${data.timelineSteps[index - 1].id}`,
        to: `timeline:${step.id}`,
        type: 'next-step'
      });
    }
  });

  return edges;
}

function createLessonGraphOutput(payload = {}) {
  const lessonId = safeString(payload.lessonId || `lesson-${Date.now()}`) || `lesson-${Date.now()}`;
  const title = safeString(payload.title || 'Universal Lesson') || 'Universal Lesson';

  const chapters = deriveChapterNodes(payload.chapters, payload.topic);
  const topics = dedupeStrings(payload.topics, 60);
  const subtopics = dedupeStrings(payload.subtopics, 80);
  const learningObjectives = dedupeStrings(payload.learningObjectives, 30);
  const prerequisites = dedupeStrings(payload.prerequisites, 20);
  const keyConcepts = dedupeStrings(payload.keyConcepts, 60);
  const examples = dedupeStrings(payload.examples, 60);
  const analogies = dedupeStrings(payload.analogies, 40);
  const visualOpportunities = asArray(payload.visualOpportunities);
  const aiTeacherScript = dedupeStrings(payload.aiTeacherScript, 240);
  const timelineSteps = asArray(payload.timelineSteps);
  const teacherTimelineSteps = asArray(payload.teacherTimelineSteps);
  const sceneRequirements = isObject(payload.sceneRequirements) ? payload.sceneRequirements : {};
  const educationalObjects = asArray(payload.educationalObjects);
  const quizBlueprint = asArray(payload.quizBlueprint);
  const flashcardBlueprint = asArray(payload.flashcardBlueprint);
  const practicalExercises = dedupeStrings(payload.practicalExercises, 40);
  const revisionNotes = dedupeStrings(payload.revisionNotes, 80);
  const cheatSheet = dedupeStrings(payload.cheatSheet, 80);
  const interviewQuestions = dedupeStrings(payload.interviewQuestions, 40);
  const assignments = dedupeStrings(payload.assignments, 30);
  const projects = dedupeStrings(payload.projects, 30);
  const skillOutcomes = dedupeStrings(payload.skillOutcomes, 40);

  const graphData = {
    lessonId,
    title,
    sourceType: payload.sourceType,
    language: payload.language,
    confidenceScore: payload.confidenceScore,
    learningObjectives,
    keyConcepts,
    educationalObjects,
    timelineSteps
  };

  return {
    schemaVersion: LESSON_GRAPH_SCHEMA_VERSION,
    lessonId,
    sourceType: safeString(payload.sourceType || 'text') || 'text',
    title,
    language: safeString(payload.language || 'English') || 'English',
    confidenceScore: clamp(payload.confidenceScore, 0, 1),
    learningObjectives,
    prerequisites,
    chapters,
    topics,
    subtopics,
    keyConcepts,
    examples,
    analogies,
    visualOpportunities,
    aiTeacherScript,
    timelineSteps,
    teacherTimelineSteps,
    sceneRequirements,
    educationalObjects,
    quizBlueprint,
    flashcardBlueprint,
    practicalExercises,
    revisionNotes,
    cheatSheet,
    interviewQuestions,
    assignments,
    projects,
    skillOutcomes,
    lessonGraph: {
      nodes: buildLessonGraphNodes(graphData),
      edges: buildLessonGraphEdges(graphData),
      metadata: {
        schemaVersion: LESSON_GRAPH_SCHEMA_VERSION,
        runtimeGraphNodeCount: Math.max(0, toFiniteNumber(payload.runtimeGraphNodeCount, 0)),
        runtimeGraphRelationshipCount: Math.max(0, toFiniteNumber(payload.runtimeGraphRelationshipCount, 0)),
        sceneId: safeString(payload.sceneId || ''),
        timelineId: safeString(payload.timelineId || '')
      }
    },
    contracts: {
      learningIntent: isObject(payload.learningIntent) ? payload.learningIntent : {},
      visualizationStrategy: isObject(payload.visualizationStrategy) ? payload.visualizationStrategy : {},
      timelineValidation: isObject(payload.timelineValidation) ? payload.timelineValidation : {},
      sceneDiagnostics: isObject(payload.sceneDiagnostics) ? payload.sceneDiagnostics : {},
      teacherSynchronization: isObject(payload.teacherSynchronization) ? payload.teacherSynchronization : {},
      runtimeGraph: {
        nodeCount: Math.max(0, toFiniteNumber(payload.runtimeGraphNodeCount, 0)),
        relationshipCount: Math.max(0, toFiniteNumber(payload.runtimeGraphRelationshipCount, 0))
      }
    }
  };
}

export function validateLessonGraph(lessonGraph = {}) {
  const source = isObject(lessonGraph) ? lessonGraph : {};
  const errors = [];
  const warnings = [];

  if (!safeString(source.lessonId)) errors.push('Missing lessonId.');
  if (!safeString(source.title)) errors.push('Missing lesson title.');
  if (!Array.isArray(source.learningObjectives)) errors.push('Learning objectives must be an array.');
  if (!Array.isArray(source.chapters)) errors.push('Chapters must be an array.');
  if (!Array.isArray(source.keyConcepts)) errors.push('Key concepts must be an array.');
  if (!Array.isArray(source.timelineSteps)) errors.push('Timeline steps must be an array.');
  if (!Array.isArray(source.educationalObjects)) errors.push('Educational objects must be an array.');
  if (!isObject(source.lessonGraph)) errors.push('Missing lessonGraph container.');
  if (!Array.isArray(source?.lessonGraph?.nodes)) errors.push('Lesson graph nodes must be an array.');
  if (!Array.isArray(source?.lessonGraph?.edges)) errors.push('Lesson graph edges must be an array.');

  const serialized = JSON.stringify(source);
  if (/webgl|shader|fragment|vertex|three\.|babylon|unity|rendererPayload/i.test(serialized)) {
    errors.push('Renderer-specific payload detected in lesson graph output.');
  }

  if (asArray(source.learningObjectives).length === 0) {
    warnings.push('No explicit learning objectives found.');
  }

  if (asArray(source.timelineSteps).length === 0) {
    warnings.push('Timeline steps are empty.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    status: errors.length === 0 ? (warnings.length ? 'warning' : 'valid') : 'invalid'
  };
}

function normalizeLessonGraph(input = {}) {
  const source = isObject(input) ? input : {};
  return createLessonGraphOutput({
    lessonId: source.lessonId,
    sourceType: source.sourceType,
    title: source.title,
    language: source.language,
    confidenceScore: source.confidenceScore,
    learningObjectives: source.learningObjectives,
    prerequisites: source.prerequisites,
    chapters: asArray(source.chapters).map((item) => isObject(item) ? item.title || item.name : item),
    topics: source.topics,
    subtopics: source.subtopics,
    keyConcepts: source.keyConcepts,
    examples: source.examples,
    analogies: source.analogies,
    visualOpportunities: source.visualOpportunities,
    aiTeacherScript: source.aiTeacherScript,
    timelineSteps: source.timelineSteps,
    teacherTimelineSteps: source.teacherTimelineSteps,
    sceneRequirements: source.sceneRequirements,
    educationalObjects: source.educationalObjects,
    quizBlueprint: source.quizBlueprint,
    flashcardBlueprint: source.flashcardBlueprint,
    practicalExercises: source.practicalExercises,
    revisionNotes: source.revisionNotes,
    cheatSheet: source.cheatSheet,
    interviewQuestions: source.interviewQuestions,
    assignments: source.assignments,
    projects: source.projects,
    skillOutcomes: source.skillOutcomes,
    learningIntent: source?.contracts?.learningIntent,
    visualizationStrategy: source?.contracts?.visualizationStrategy,
    timelineValidation: source?.contracts?.timelineValidation,
    sceneDiagnostics: source?.contracts?.sceneDiagnostics,
    teacherSynchronization: source?.contracts?.teacherSynchronization,
    runtimeGraphNodeCount: source?.contracts?.runtimeGraph?.nodeCount,
    runtimeGraphRelationshipCount: source?.contracts?.runtimeGraph?.relationshipCount,
    sceneId: source?.sceneRequirements?.sceneId,
    timelineId: source?.contracts?.timelineValidation?.timelineId
  });
}

export function migrateUniversalLessonGraph(input = {}) {
  const source = isObject(input) ? input : {};

  if (safeString(source.schemaVersion) === LESSON_GRAPH_SCHEMA_VERSION) {
    return normalizeLessonGraph(source);
  }

  return normalizeLessonGraph({
    schemaVersion: LESSON_GRAPH_SCHEMA_VERSION,
    lessonId: source.id || source.lessonId,
    sourceType: source.sourceType || source.type,
    title: source.lessonTitle || source.title,
    language: source.language,
    confidenceScore: source.confidence || source.confidenceScore,
    learningObjectives: source.learningObjectives || source.objectives,
    prerequisites: source.prerequisites,
    chapters: source.chapters,
    topics: source.topics,
    subtopics: source.subtopics,
    keyConcepts: source.keyConcepts || source.concepts,
    examples: source.examples,
    analogies: source.analogies,
    visualOpportunities: source.visualOpportunities,
    aiTeacherScript: source.aiTeacherScript || source.teacherScript,
    timelineSteps: source.timelineSteps,
    sceneRequirements: source.sceneRequirements,
    educationalObjects: source.educationalObjects,
    quizBlueprint: source.quizBlueprint || source.quiz,
    flashcardBlueprint: source.flashcardBlueprint || source.flashcards,
    practicalExercises: source.practicalExercises || source.exercises,
    revisionNotes: source.revisionNotes,
    cheatSheet: source.cheatSheet,
    interviewQuestions: source.interviewQuestions,
    assignments: source.assignments,
    projects: source.projects,
    skillOutcomes: source.skillOutcomes,
    contracts: source.contracts
  });
}

export function serializeUniversalLessonGraph(lessonGraph = {}) {
  return JSON.stringify({
    schemaVersion: LESSON_GRAPH_SCHEMA_VERSION,
    lessonGraph,
    serializedAt: Date.now()
  });
}

export function deserializeUniversalLessonGraph(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    const fallback = migrateUniversalLessonGraph({
      title: 'Recovered Lesson',
      sourceType: 'text',
      learningObjectives: ['Recover lesson graph payload'],
      keyConcepts: ['Recovered concept']
    });

    return {
      lessonGraph: fallback,
      validation: {
        valid: false,
        status: 'fallback',
        errors: ['Failed to parse lesson graph payload.'],
        warnings: []
      }
    };
  }

  const restored = migrateUniversalLessonGraph(parsed.lessonGraph || parsed);
  return {
    lessonGraph: restored,
    validation: validateLessonGraph(restored)
  };
}

function createDiagnosticsState() {
  return {
    runCount: 0,
    recoveries: 0,
    cacheHits: 0,
    warnings: [],
    latestDurationMs: 0,
    lastRunAt: null
  };
}

function normalizeRuntimeState(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: LESSON_GRAPH_SCHEMA_VERSION,
    diagnostics: {
      runCount: Math.max(0, toFiniteNumber(source?.diagnostics?.runCount, 0)),
      recoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveries, 0)),
      cacheHits: Math.max(0, toFiniteNumber(source?.diagnostics?.cacheHits, 0)),
      warnings: asArray(source?.diagnostics?.warnings),
      latestDurationMs: Math.max(0, toFiniteNumber(source?.diagnostics?.latestDurationMs, 0)),
      lastRunAt: source?.diagnostics?.lastRunAt || null
    },
    reports: {
      latest: isObject(source?.reports?.latest) ? source.reports.latest : null,
      previous: isObject(source?.reports?.previous) ? source.reports.previous : null
    }
  };
}

function hashInput(input = {}) {
  const text = JSON.stringify(input);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return `lesson-graph-${Math.abs(hash)}`;
}

export class UniversalAILessonGenerator {
  constructor(options = {}) {
    this.options = isObject(options) ? options : {};
    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey) || DEFAULT_PERSISTENCE_KEY;
    this.cache = new Map();
    this.state = normalizeRuntimeState({ diagnostics: createDiagnosticsState(), reports: { latest: null, previous: null } });
    this.recoverSession();
  }

  warn(message = 'Universal lesson generator warning') {
    this.state.diagnostics.warnings.push(safeString(message));
    if (this.state.diagnostics.warnings.length > 300) {
      this.state.diagnostics.warnings.shift();
    }
  }

  createProgressLogger(options = {}) {
    const logger = typeof options.progressLogger === 'function' ? options.progressLogger : null;
    return (step, phase, details = {}) => {
      if (!logger) return;
      logger({
        step,
        phase,
        details,
        timestamp: Date.now()
      });
    };
  }

  async generate(input = {}, options = {}) {
    const startedAt = Date.now();
    const progress = this.createProgressLogger(options);
    const normalizedInput = normalizeLessonInput(input);
    const cacheKey = hashInput({ normalizedInput, fastMode: options.fastMode === true });

    if (this.cache.has(cacheKey)) {
      this.state.diagnostics.cacheHits += 1;
      return this.cache.get(cacheKey);
    }

    progress('pipeline', 'before', { sourceType: normalizedInput.sourceType });
    const learningPipelineResult = options.fastMode === true
      ? createFastPipelineResult(normalizedInput)
      : await runUniversalLearningPipeline({
        file: input.file || null,
        url: normalizedInput.url,
        text: normalizedInput.text,
        sourceHint: normalizedInput.sourceHint,
        ocrText: normalizedInput.ocrText,
        sourceName: normalizedInput.sourceName
      });
    progress('pipeline', 'after', { sourceType: normalizedInput.sourceType });

    const sourceMeta = learningPipelineResult?.sourceMeta || {};
    const sourceModel = learningPipelineResult?.sourceModel || {};
    const learningSession = learningPipelineResult?.learningSession || {};
    const detections = learningPipelineResult?.detections || {};

    progress('intent', 'before', {});
    const intentProfile = analyzeUniversalLearningIntent({
      sourceType: normalizedInput.sourceType,
      sourceName: normalizedInput.sourceName,
      content: safeString(sourceModel.extractedText || normalizedInput.text),
      visualDescription: safeString(sourceMeta?.contentObject?.visualDescription || '')
    });
    progress('intent', 'after', { confidenceScore: intentProfile?.confidenceScore });

    progress('visualization-strategy', 'before', {});
    const visualizationStrategy = analyzeVisualizationStrategy({
      sourceType: normalizedInput.sourceType,
      sourceName: normalizedInput.sourceName,
      content: safeString(sourceModel.extractedText || normalizedInput.text),
      visualDescription: safeString(sourceMeta?.contentObject?.visualDescription || ''),
      intent: intentProfile
    });
    progress('visualization-strategy', 'after', { confidenceScore: visualizationStrategy?.confidenceScore });

    let sceneResult;
    let scene;
    let timeline;
    let timelineValidation;
    let runtimeGraphNodeCount = 0;
    let runtimeGraphRelationshipCount = 0;

    if (options.fastMode === true) {
      progress('scene-generator', 'before', { mode: 'fast' });
      scene = {
        sceneId: `scene-${safeString(normalizedInput.sourceName || normalizedInput.title) || 'lesson'}`,
        title: sourceMeta.title || normalizedInput.title,
        topic: sourceMeta.subject || normalizedInput.topic,
        classification: {
          domain: safeString(intentProfile.knowledgeDomain || normalizedInput.topic) || normalizedInput.topic,
          sceneComplexity: safeString(visualizationStrategy?.primaryStrategy?.sceneComplexity || 'medium') || 'medium',
          interactionCategory: safeString(visualizationStrategy?.primaryStrategy?.interactionLevel || 'guided') || 'guided'
        },
        objects: dedupeStrings([
          ...asArray(learningSession.keyConcepts),
          ...asArray(sourceMeta.keyConcepts)
        ], 8).map((name, index) => ({
          id: `fast-object-${index + 1}`,
          type: 'concept-node',
          name,
          metadata: {}
        })),
        timeline: [
          {
            id: 'fast-step-1',
            start: 0,
            end: 1000,
            duration: 1000,
            metadata: {
              title: 'Introduction'
            }
          },
          {
            id: 'fast-step-2',
            start: 1000,
            end: 2000,
            duration: 1000,
            metadata: {
              title: 'Guided Practice'
            }
          }
        ]
      };
      sceneResult = {
        status: 'fast-mode',
        scene,
        diagnostics: {
          mode: 'fast',
          sourceType: normalizedInput.sourceType
        }
      };
      progress('scene-generator', 'after', { status: sceneResult.status });

      progress('timeline-engine', 'before', { mode: 'fast' });
      timeline = buildTimeline(scene);
      timelineValidation = validateTimeline(timeline);
      progress('timeline-engine', 'after', { status: timelineValidation.status || 'unknown' });

      progress('runtime-graph', 'before', { mode: 'fast' });
      runtimeGraphNodeCount = Math.max(1, asArray(scene.objects).length + asArray(scene.timeline).length + 1);
      runtimeGraphRelationshipCount = Math.max(1, runtimeGraphNodeCount - 1);
      progress('runtime-graph', 'after', {
        runtimeGraphNodeCount,
        runtimeGraphRelationshipCount
      });
    } else {
      progress('scene-generator', 'before', {});
      sceneResult = await generateUniversalScene({
        id: normalizedInput.sourceName,
        title: sourceMeta.title || normalizedInput.title,
        topic: sourceMeta.subject || normalizedInput.topic,
        content: [safeString(sourceModel.extractedText || normalizedInput.text)],
        goals: asArray(learningSession.learningRoadmap),
        examples: asArray(learningSession.examples),
        keyConcepts: asArray(learningSession.keyConcepts),
        classification: {
          intentProfile,
          visualizationStrategy,
          capabilityTemplateRecommendation: sourceMeta.capabilityTemplateRecommendation || null,
          confidenceConflictFallback: sourceMeta.confidenceConflictFallback || null
        },
        visualizationStrategy,
        sourceMetadata: {
          source: normalizedInput.sourceType,
          sourceName: normalizedInput.sourceName,
          metadata: normalizedInput.metadata
        }
      }, {
        useAI: false,
        performanceProfile: 'balanced'
      });
      progress('scene-generator', 'after', { status: sceneResult?.status || 'unknown' });

      scene = sceneResult?.scene || {};

      progress('timeline-engine', 'before', {});
      timeline = buildTimeline(scene);
      timelineValidation = validateTimeline(timeline);
      progress('timeline-engine', 'after', { status: timelineValidation.status || 'unknown' });

      progress('runtime-graph', 'before', {});
      const runtimeGraphBundle = buildRuntimeSceneGraph(scene);
      runtimeGraphNodeCount = toFiniteNumber(runtimeGraphBundle?.graph?.getNodeCount?.(), 0);
      runtimeGraphRelationshipCount = toFiniteNumber(runtimeGraphBundle?.graph?.getRelationshipCount?.(), 0);
      progress('runtime-graph', 'after', {
        runtimeGraphNodeCount,
        runtimeGraphRelationshipCount
      });
    }

    progress('ai-teacher', 'before', {});
    const teacherPlan = buildTeacherSynchronizationPlan({
      explanation: safeString(learningSession.summary || sourceModel.extractedText || normalizedInput.text),
      topic: sourceMeta.subject || normalizedInput.topic,
      scene
    });
    progress('ai-teacher', 'after', { stepCount: asArray(teacherPlan.steps).length });

    const hierarchy = buildTopicHierarchy(sourceMeta, learningSession, normalizedInput.topic);
    const lessonObjectives = dedupeStrings([
      ...asArray(sourceMeta.learningObjectives),
      safeString(intentProfile.learningObjective || '')
    ], 30);
    const keyConcepts = dedupeStrings([
      ...asArray(learningSession.keyConcepts),
      ...asArray(sourceMeta.keyConcepts),
      ...asArray(sourceModel.concepts)
    ], 60);
    const examples = dedupeStrings([
      ...asArray(learningSession.examples),
      ...asArray(learningSession.realWorldApplications)
    ], 60);

    const analogies = dedupeStrings(
      examples.map((example) => `Analogy: ${example}`),
      40
    );

    const practicalExercises = dedupeStrings([
      ...asArray(learningSession?.practice?.questions),
      ...asArray(detections?.practicalSkills)
    ], 40);

    const interviewQuestions = dedupeStrings([
      ...asArray(learningSession.interviewQuestions)
    ], 40);

    const assignments = dedupeStrings(
      practicalExercises.map((item) => `Assignment: ${item}`),
      30
    );

    const projects = dedupeStrings(
      keyConcepts.slice(0, 8).map((concept) => `Project: Build and explain ${concept}`),
      30
    );

    const skillOutcomes = dedupeStrings([
      ...keyConcepts.slice(0, 10).map((concept) => `Can explain ${concept}`),
      `Can apply ${safeString(sourceMeta.subject || normalizedInput.topic) || 'core concepts'}`
    ], 40);

    const timelineData = buildTimelineSteps(timeline, teacherPlan);
    const educationalObjects = buildEducationalObjects(scene);
    const visualOpportunities = buildVisualOpportunities(sourceModel, sourceMeta);
    const teacherScript = buildTeacherScript(teacherPlan, learningSession);
    const sceneRequirements = buildSceneRequirements(
      scene,
      visualizationStrategy,
      sourceMeta.capabilityTemplateRecommendation || {}
    );

    const lessonGraph = createLessonGraphOutput({
      lessonId: safeString(sourceMeta.sourceName || normalizedInput.sourceName || normalizedInput.title),
      sourceType: normalizedInput.sourceType,
      title: safeString(sourceMeta.title || learningSession.title || normalizedInput.title) || normalizedInput.title,
      language: safeString(sourceMeta.language || normalizedInput.language) || 'English',
      confidenceScore: toFiniteNumber(sourceMeta?.confidenceConflictFallback?.overallConfidence, toFiniteNumber(intentProfile?.confidenceScore, 0.5)),
      learningObjectives: lessonObjectives,
      prerequisites: asArray(sourceMeta.topics).slice(0, 8),
      chapters: hierarchy.chapters.map((item) => item.title),
      topics: hierarchy.topics,
      subtopics: hierarchy.subtopics,
      keyConcepts,
      examples,
      analogies,
      visualOpportunities,
      aiTeacherScript: teacherScript,
      timelineSteps: timelineData.timelineSteps,
      teacherTimelineSteps: timelineData.teacherSteps,
      sceneRequirements,
      educationalObjects,
      quizBlueprint: asArray(learningSession.quiz),
      flashcardBlueprint: asArray(learningSession.flashcards),
      practicalExercises,
      revisionNotes: asArray(learningSession.revisionNotes),
      cheatSheet: asArray(learningSession.cheatSheet),
      interviewQuestions,
      assignments,
      projects,
      skillOutcomes,
      learningIntent: intentProfile,
      visualizationStrategy,
      timelineValidation: {
        timelineId: safeString(timeline.timelineId || ''),
        ...timelineValidation
      },
      sceneDiagnostics: isObject(sceneResult?.diagnostics) ? sceneResult.diagnostics : {},
      teacherSynchronization: teacherPlan,
      runtimeGraphNodeCount,
      runtimeGraphRelationshipCount,
      sceneId: scene.sceneId,
      timelineId: timeline.timelineId
    });

    const validation = validateLessonGraph(lessonGraph);
    if (!validation.valid) {
      this.warn(validation.errors.join(' | '));
    }

    const contentCreationResult = runUniversalAIContentCreationEngine({
      lessonGraph,
      runtimeGraph: {
        nodeCount: runtimeGraphNodeCount,
        relationshipCount: runtimeGraphRelationshipCount,
        nodes: asArray(lessonGraph?.lessonGraph?.nodes),
        edges: asArray(lessonGraph?.lessonGraph?.edges)
      },
      learningIntent: intentProfile,
      visualizationStrategy,
      userLearningProfile: {
        learningLevel: safeString(sourceMeta.difficulty || 'intermediate') || 'intermediate',
        learnerModes: ['revision-mode'],
        language: safeString(sourceMeta.language || normalizedInput.language || 'English') || 'English'
      },
      aiTeacherMetadata: {
        teachingPlan: teacherPlan,
        diagnostics: isObject(sceneResult?.diagnostics) ? sceneResult.diagnostics : {}
      },
      pipeline: {
        sourceMeta,
        sourceModel,
        learningSession,
        detections
      }
    });

    const curriculumAuthoringResult = runUniversalAICourseAuthoringCurriculumEngine({
      lessonGraph,
      runtimeGraph: {
        nodeCount: runtimeGraphNodeCount,
        relationshipCount: runtimeGraphRelationshipCount,
        nodes: asArray(lessonGraph?.lessonGraph?.nodes),
        edges: asArray(lessonGraph?.lessonGraph?.edges)
      },
      learningIntent: intentProfile,
      learningAnalytics: {
        output: {
          masteryScore: clamp(toFiniteNumber(intentProfile.confidenceScore, 0.6), 0, 1)
        }
      },
      assessmentResults: {
        output: {
          questionBank: asArray(learningSession.quiz)
        }
      },
      aiTeacherMetadata: {
        teachingPlan: teacherPlan,
        diagnostics: isObject(sceneResult?.diagnostics) ? sceneResult.diagnostics : {}
      },
      userLearningProfile: {
        learningLevel: safeString(sourceMeta.difficulty || 'intermediate') || 'intermediate',
        learnerModes: ['revision-mode'],
        language: safeString(sourceMeta.language || normalizedInput.language || 'English') || 'English'
      },
      pipeline: {
        sourceMeta,
        sourceModel,
        learningSession,
        detections
      }
    });

    const report = {
      schemaVersion: LESSON_GRAPH_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      sourceType: normalizedInput.sourceType,
      lessonGraph,
      contentCreation: contentCreationResult?.output || null,
      curriculumAuthoring: curriculumAuthoringResult?.output || null,
      validation,
      diagnostics: {
        durationMs: Math.max(0, Date.now() - startedAt),
        runtimeGraphNodeCount,
        runtimeGraphRelationshipCount,
        timelineStatus: timelineValidation.status || 'unknown',
        sceneStatus: sceneResult?.status || 'unknown',
        warnings: [...asArray(validation.warnings)]
      }
    };

    this.state.reports.previous = this.state.reports.latest;
    this.state.reports.latest = report;
    this.state.diagnostics.runCount += 1;
    this.state.diagnostics.latestDurationMs = report.diagnostics.durationMs;
    this.state.diagnostics.lastRunAt = report.generatedAt;

    const result = {
      report,
      lessonGraph,
      contentCreation: contentCreationResult?.output || null,
      contentCreationValidation: contentCreationResult?.validation || null,
      curriculumAuthoring: curriculumAuthoringResult?.output || null,
      curriculumAuthoringValidation: curriculumAuthoringResult?.validation || null,
      validation,
      snapshot: this.snapshot()
    };

    this.cache.set(cacheKey, result);
    this.persistSession();

    return result;
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify({
      schemaVersion: LESSON_GRAPH_SCHEMA_VERSION,
      state: this.state,
      persistedAt: Date.now()
    });

    if (typeof adapter.setItem === 'function') {
      adapter.setItem(this.persistenceKey, payload);
      return true;
    }

    if (typeof adapter.save === 'function') {
      adapter.save(this.persistenceKey, payload);
      return true;
    }

    return false;
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
    if (!parsed || !isObject(parsed.state)) {
      this.warn('Failed to recover universal lesson generator state.');
      return false;
    }

    this.state = normalizeRuntimeState(parsed.state);
    this.state.diagnostics.recoveries += 1;
    return true;
  }

  snapshot() {
    return normalizeRuntimeState(this.state);
  }
}

export function createUniversalAILessonGenerator(options = {}) {
  return new UniversalAILessonGenerator(options);
}

export async function runUniversalAILessonGenerator(input = {}, options = {}) {
  const runtime = createUniversalAILessonGenerator(options);
  return runtime.generate(input, options);
}
