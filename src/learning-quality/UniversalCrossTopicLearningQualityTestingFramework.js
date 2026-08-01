import { analyzeUniversalLearningIntent } from '../intent-analysis/index.js';
import { analyzeVisualizationStrategy } from '../visualization-strategy/index.js';
import { analyzeCapabilityTemplateRecommendation } from '../recommendation/index.js';
import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { validateScene } from '../scene-generator/SceneValidator.js';
import { buildRuntimeSceneGraph } from '../scene-builder/SceneBuilder.js';
import { buildTimeline, validateTimeline } from '../timeline/index.js';
import { buildTeacherSynchronizationPlan } from '../utils/teacherSynchronizationEngine.js';
import { createAssetManager } from '../utils/assetManager.js';
import { createUniversalRendererCore } from '../renderer-core/index.js';
import { buildUniversalLearningArtifacts } from '../services/universalLearningPipeline.js';

const STORE_KEY = '__daksha_learning_quality_framework_store__';
const FRAMEWORK_SCHEMA_VERSION = 'v1';
const DEFAULT_PERSISTENCE_KEY = 'daksha.universal.learning.quality.framework.v1';

function safeString(value) {
  return String(value || '').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(Math.max(toFiniteNumber(value, minimum), minimum), maximum);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function tokenizeText(value = '') {
  return safeString(value)
    .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function uniqueList(values = []) {
  const seen = new Set();
  const output = [];

  values.forEach((value) => {
    const text = safeString(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(text);
  });

  return output;
}

function average(values = []) {
  const safeValues = values.filter((value) => Number.isFinite(Number(value))).map((value) => Number(value));
  if (!safeValues.length) return 0;
  return safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
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

function normalizeSourceType(input = '') {
  const normalized = safeString(input).toLowerCase().replace(/[_\s]+/g, '-');
  if (!normalized) return 'text';

  const aliasMap = {
    pdf: 'pdf',
    book: 'book',
    books: 'book',
    image: 'image',
    images: 'image',
    handwritten: 'handwritten-notes',
    'handwritten-notes': 'handwritten-notes',
    ppt: 'ppt',
    pptx: 'ppt',
    doc: 'docx',
    docx: 'docx',
    audio: 'audio',
    video: 'video',
    website: 'website',
    web: 'website',
    youtube: 'youtube',
    'source-code': 'source-code',
    code: 'source-code',
    'research-paper': 'research-paper',
    research: 'research-paper',
    camera: 'camera-scan',
    scan: 'camera-scan',
    'camera-scan': 'camera-scan'
  };

  return aliasMap[normalized] || normalized;
}

export function normalizeQualityFrameworkState(input = {}) {
  const source = isObject(input) ? input : {};
  const summary = isObject(source.summary) ? source.summary : {};

  return {
    schemaVersion: FRAMEWORK_SCHEMA_VERSION,
    diagnostics: {
      runs: Math.max(0, toFiniteNumber(source?.diagnostics?.runs, 0)),
      recoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveries, 0)),
      warnings: asArray(source?.diagnostics?.warnings)
    },
    summary: {
      lastRunAt: summary.lastRunAt || null,
      runCount: Math.max(0, toFiniteNumber(summary.runCount, 0)),
      lastImprovementScore: clamp(summary.lastImprovementScore, 0, 1),
      unknownTypeRuns: Math.max(0, toFiniteNumber(summary.unknownTypeRuns, 0))
    },
    reports: {
      latest: isObject(source?.reports?.latest) ? source.reports.latest : null,
      previous: isObject(source?.reports?.previous) ? source.reports.previous : null
    }
  };
}

export function migrateLearningQualityFrameworkState(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === FRAMEWORK_SCHEMA_VERSION) {
    return normalizeQualityFrameworkState(source);
  }

  return normalizeQualityFrameworkState({
    schemaVersion: FRAMEWORK_SCHEMA_VERSION,
    diagnostics: {
      runs: source.runs,
      recoveries: source.recoveries,
      warnings: asArray(source.warnings)
    },
    summary: {
      lastRunAt: source.lastRunAt || null,
      runCount: source.runCount,
      lastImprovementScore: source.improvementScore,
      unknownTypeRuns: source.unknownTypeRuns
    },
    reports: {
      latest: source.latestReport || null,
      previous: source.previousReport || null
    }
  });
}

function createDefaultInput() {
  return {
    sourceType: 'text',
    sourceName: 'universal-source',
    text: '',
    content: '',
    title: 'Universal Lesson',
    topic: 'Open Topic',
    language: 'English',
    concepts: [],
    goals: [],
    steps: [],
    checkpoints: [],
    interactions: [],
    objects: []
  };
}

function normalizeLessonInput(input = {}) {
  const source = isObject(input) ? input : {};
  const sourceType = normalizeSourceType(source.sourceType || source.type || 'text');
  const text = safeString(source.text || source.content || source.lesson || source.extractedText || source.transcript || '');
  const visualDescription = safeString(source.visualDescription || source.imageDescription || '');
  const topic = safeString(source.topic || source.subject || source.title || 'Open Topic');
  const sourceName = safeString(source.sourceName || source.filename || source.url || topic || 'universal-source');
  const conceptsFromTokens = tokenizeText(text).slice(0, 32);
  const conceptCandidates = uniqueList([
    ...asArray(source.concepts),
    ...conceptsFromTokens
  ]).slice(0, 24);

  const goals = uniqueList(asArray(source.goals).concat([
    `Understand ${topic}`,
    `Apply ${topic} in practice`
  ])).slice(0, 10);

  const providedSteps = asArray(source.steps)
    .filter((entry) => isObject(entry))
    .map((entry, index) => ({
      id: safeString(entry.id || `step-${index + 1}`) || `step-${index + 1}`,
      title: safeString(entry.title || `Step ${index + 1}`) || `Step ${index + 1}`,
      order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : index,
      duration: Math.max(1, toFiniteNumber(entry.duration, 3)),
      objects: asArray(entry.objects).filter(Boolean),
      animations: asArray(entry.animations).filter(Boolean)
    }));

  const steps = providedSteps.length
    ? providedSteps
    : [
      { id: 'step-1', title: 'Concept overview', order: 0, duration: 3, objects: ['obj-1'], animations: [] },
      { id: 'step-2', title: 'Guided exploration', order: 1, duration: 4, objects: ['obj-1'], animations: [] },
      { id: 'step-3', title: 'Checkpoint review', order: 2, duration: 3, objects: ['obj-1'], animations: [] }
    ];

  const providedObjects = asArray(source.objects)
    .filter((entry) => isObject(entry))
    .map((entry, index) => ({
      id: safeString(entry.id || `obj-${index + 1}`) || `obj-${index + 1}`,
      name: safeString(entry.name || entry.label || entry.id || `Object ${index + 1}`) || `Object ${index + 1}`,
      category: safeString(entry.category || 'concept') || 'concept',
      position: Array.isArray(entry.position) ? entry.position : [index, 0, 0]
    }));

  const objects = providedObjects.length
    ? providedObjects
    : conceptCandidates.slice(0, 6).map((concept, index) => ({
      id: `obj-${index + 1}`,
      name: concept,
      category: 'concept',
      position: [index, 0, 0]
    }));

  const providedInteractions = asArray(source.interactions)
    .filter((entry) => isObject(entry))
    .map((entry, index) => ({
      id: safeString(entry.id || `int-${index + 1}`) || `int-${index + 1}`,
      label: safeString(entry.label || entry.name || `Interaction ${index + 1}`) || `Interaction ${index + 1}`,
      interactionType: safeString(entry.interactionType || entry.type || entry.action || 'custom') || 'custom',
      targetObjectId: safeString(entry.targetObjectId || objects[0]?.id || 'obj-1') || 'obj-1',
      timeMs: Math.max(0, toFiniteNumber(entry.timeMs ?? entry.time, index * 1000))
    }));

  const interactions = providedInteractions.length
    ? providedInteractions
    : objects.slice(0, 5).map((object, index) => ({
      id: `int-${index + 1}`,
      label: `Inspect ${object.name || object.id}`,
      interactionType: index % 2 === 0 ? 'inspect' : 'highlight',
      targetObjectId: object.id,
      timeMs: index * 1000
    }));

  const providedCheckpoints = asArray(source.checkpoints)
    .filter((entry) => isObject(entry))
    .map((entry, index) => ({
      id: safeString(entry.id || `checkpoint-${index + 1}`) || `checkpoint-${index + 1}`,
      stepId: safeString(entry.stepId || steps[0]?.id || 'step-1') || 'step-1',
      type: safeString(entry.type || 'checkpoint') || 'checkpoint'
    }));

  const checkpoints = providedCheckpoints.length
    ? providedCheckpoints
    : steps.slice(0, 3).map((step, index) => ({
      id: `checkpoint-${index + 1}`,
      stepId: step.id,
      type: index === 0 ? 'intro' : index === 1 ? 'practice' : 'assessment'
    }));

  return {
    ...createDefaultInput(),
    ...source,
    sourceType,
    sourceName,
    topic,
    title: safeString(source.title || topic || 'Universal Lesson') || 'Universal Lesson',
    text,
    content: text,
    visualDescription,
    concepts: conceptCandidates,
    goals,
    steps,
    checkpoints,
    interactions,
    objects,
    language: safeString(source.language || 'English') || 'English'
  };
}

function buildSceneCandidate(normalizedInput, intentProfile, strategyProfile, recommendation) {
  const timeline = asArray(normalizedInput.steps).map((step, index) => ({
    id: safeString(step.id || `step-${index + 1}`),
    order: Number(step.order ?? index),
    duration: Math.max(1, toFiniteNumber(step.duration, 3)),
    title: safeString(step.title || `Step ${index + 1}`),
    objects: asArray(step.objects).length ? asArray(step.objects) : normalizedInput.objects.slice(0, 2).map((item) => item.id),
    animations: asArray(step.animations)
  }));

  return {
    sceneId: `quality-scene-${Date.now()}`,
    title: normalizedInput.title,
    subject: intentProfile.knowledgeDomain || normalizedInput.topic,
    summary: normalizedInput.text.slice(0, 1800),
    objects: normalizedInput.objects,
    labels: normalizedInput.objects.slice(0, 8).map((entry, index) => ({
      id: `label-${index + 1}`,
      text: safeString(entry.name || entry.id || `Concept ${index + 1}`),
      targetObjectId: entry.id
    })),
    interactions: normalizedInput.interactions,
    timeline,
    checkpoints: normalizedInput.checkpoints,
    camera: {
      position: [0, 2, 7],
      target: [0, 0, 0],
      movement: {
        mode: strategyProfile?.primaryStrategy?.cameraStrategy || 'orbit'
      }
    },
    environment: {
      lighting: 'adaptive',
      quality: 'balanced'
    },
    classification: {
      visualizationStrategy: strategyProfile,
      capabilityTemplateRecommendation: recommendation
    },
    metadata: {
      sourceType: normalizedInput.sourceType,
      sourceName: normalizedInput.sourceName,
      learningIntent: intentProfile,
      visualizationStrategy: strategyProfile,
      capabilityTemplateRecommendation: recommendation,
      supportsUnknownFutureTypes: true
    }
  };
}

function buildLearningArtifacts(normalizedInput, intentProfile, strategyProfile, recommendation) {
  const learningSession = {
    title: normalizedInput.title,
    summary: normalizedInput.text.slice(0, 2000) || `Adaptive lesson for ${normalizedInput.topic}`,
    beginnerLesson: `Begin with key concepts in ${normalizedInput.topic}.`,
    intermediateLesson: `Connect concepts in ${normalizedInput.topic} to workflows and scenarios.`,
    advancedLesson: `Evaluate trade-offs and advanced applications for ${normalizedInput.topic}.`,
    keyConcepts: normalizedInput.concepts,
    importantDefinitions: normalizedInput.concepts.slice(0, 6),
    examples: normalizedInput.concepts.slice(0, 4),
    realWorldApplications: normalizedInput.goals.slice(0, 4),
    revisionNotes: normalizedInput.concepts.slice(0, 6),
    cheatSheet: normalizedInput.concepts.slice(0, 6),
    flashcards: normalizedInput.concepts.slice(0, 8).map((concept) => ({ front: concept, back: `Explain ${concept}` })),
    quiz: normalizedInput.concepts.slice(0, 8).map((concept, index) => ({ question: `What is ${concept}?`, answer: `Explanation ${index + 1}` })),
    mindMap: `${normalizedInput.topic} -> ${normalizedInput.concepts.slice(0, 5).join(' -> ')}`,
    learningRoadmap: normalizedInput.steps.map((step) => safeString(step.title || step.id)),
    practice: {
      questions: normalizedInput.goals.slice(0, 6),
      adaptiveDifficulty: 'Medium'
    },
    notes: {
      concise: normalizedInput.concepts.slice(0, 6),
      full: normalizedInput.concepts.slice(0, 10)
    },
    aiTeacher: {
      language: normalizedInput.language,
      style: 'adaptive',
      narrationStrategy: strategyProfile?.primaryStrategy?.narrationStrategy || 'concept-first narration'
    }
  };

  const sourceModel = {
    title: normalizedInput.title,
    overview: normalizedInput.text.slice(0, 2000),
    extractedText: normalizedInput.text,
    sections: normalizedInput.steps.map((step) => safeString(step.title || step.id)),
    definitions: normalizedInput.concepts.slice(0, 8),
    diagrams: [],
    images: [],
    tables: []
  };

  return buildUniversalLearningArtifacts({
    sourceMeta: {
      sourceType: normalizedInput.sourceType,
      sourceName: normalizedInput.sourceName,
      language: normalizedInput.language,
      subject: intentProfile.knowledgeDomain || normalizedInput.topic,
      visualizationStrategy: strategyProfile,
      capabilityTemplateRecommendation: recommendation
    },
    sourceModel,
    learningSession,
    detections: {
      practicalSkills: normalizedInput.goals.slice(0, 4)
    }
  });
}

function evaluateMetricSet(input = {}) {
  const source = isObject(input) ? input : {};
  const lessonSuite = source.lessonSuite || {};
  const sceneValidation = source.sceneValidation || {};
  const timelineValidation = source.timelineValidation || {};
  const runtimeGraph = source.runtimeGraph || {};
  const recommendation = source.recommendation || {};
  const strategy = source.strategy || {};
  const intent = source.intent || {};
  const teacherPlan = source.teacherPlan || {};
  const assetDiscovery = source.assetDiscovery || {};
  const rendererSnapshot = source.rendererSnapshot || {};
  const checkpointCount = asArray(source.normalizedInput?.checkpoints).length;

  const lessonCompleteness = clamp(
    average([
      asArray(lessonSuite?.learningSession?.keyConcepts).length >= 3 ? 1 : 0.4,
      asArray(lessonSuite?.learningSession?.quiz).length >= 2 ? 1 : 0.5,
      asArray(lessonSuite?.learningSession?.flashcards).length >= 2 ? 1 : 0.5,
      safeString(lessonSuite?.learningSession?.summary).length > 20 ? 1 : 0.4
    ])
  );

  const educationalAccuracyMetadata = clamp(
    average([
      clamp(intent.confidenceScore, 0, 1),
      clamp(strategy.confidenceScore, 0, 1),
      clamp(recommendation.confidenceScore, 0, 1),
      sceneValidation.status === 'valid' ? 1 : 0.5
    ])
  );

  const visualizationSuitability = clamp(
    average([
      strategy?.primaryStrategy?.visualizationStyle ? 1 : 0.4,
      strategy?.primaryStrategy?.interactionLevel ? 1 : 0.5,
      asArray(recommendation.recommendedTemplates).length > 0 ? 1 : 0.55,
      recommendation?.fallbackStrategy?.supportsUnknownFutureTypes !== false ? 1 : 0.5
    ])
  );

  const interactionCoverage = clamp(
    average([
      asArray(source.normalizedInput?.interactions).length >= 1 ? 1 : 0.4,
      asArray(teacherPlan.steps).length >= 3 ? 1 : 0.5,
      asArray(source.scene?.interactions).length >= 1 ? 1 : 0.45
    ])
  );

  const objectCoverage = clamp(
    average([
      asArray(source.scene?.objects).length >= 1 ? 1 : 0.3,
      toFiniteNumber(runtimeGraph.nodeCount, 0) >= asArray(source.scene?.objects).length ? 1 : 0.55,
      recommendation?.requiredEducationalObjects?.objectCountHint >= 1 ? 1 : 0.5
    ])
  );

  const timelineCoverage = clamp(
    average([
      timelineValidation.valid === true ? 1 : 0.45,
      asArray(source.timeline?.tracks).length >= 1 ? 1 : 0.5,
      asArray(source.timeline?.events).length >= 1 ? 1 : 0.5
    ])
  );

  const learningProgression = clamp(
    average([
      asArray(source.normalizedInput?.steps).length >= 3 ? 1 : 0.5,
      asArray(lessonSuite?.learningSession?.learningRoadmap).length >= 2 ? 1 : 0.5,
      asArray(source.normalizedInput?.goals).length >= 2 ? 1 : 0.5
    ])
  );

  const checkpointCoverage = clamp(
    average([
      checkpointCount >= 1 ? 1 : 0.35,
      asArray(source.scene?.checkpoints).length >= 1 ? 1 : 0.35,
      asArray(source.timeline?.markers).length >= 1 ? 1 : 0.5
    ])
  );

  const fallbackQuality = clamp(
    average([
      recommendation?.fallbackStrategy?.supportsUnknownFutureTypes !== false ? 1 : 0.4,
      recommendation?.fallbackStrategy?.mode ? 1 : 0.5,
      assetDiscovery?.proceduralFallback ? 1 : 0.55
    ])
  );

  const confidenceScores = clamp(
    average([
      clamp(intent.confidenceScore, 0, 1),
      clamp(strategy.confidenceScore, 0, 1),
      clamp(recommendation.confidenceScore, 0, 1)
    ])
  );

  const measurement = {
    lessonCompleteness,
    educationalAccuracyMetadata,
    visualizationSuitability,
    interactionCoverage,
    objectCoverage,
    timelineCoverage,
    learningProgression,
    checkpointCoverage,
    fallbackQuality,
    confidenceScores
  };

  measurement.overallQualityScore = clamp(average(Object.values(measurement)));
  return measurement;
}

function buildRegressionReport(currentMetrics = {}, previousMetrics = {}) {
  const keys = Object.keys(currentMetrics).filter((key) => key !== 'overallQualityScore');
  const deltas = keys.map((key) => ({
    metric: key,
    current: clamp(currentMetrics[key], 0, 1),
    previous: clamp(previousMetrics[key], 0, 1),
    delta: clamp(currentMetrics[key], 0, 1) - clamp(previousMetrics[key], 0, 1)
  }));

  const regressions = deltas.filter((entry) => entry.delta < 0);
  const improvements = deltas.filter((entry) => entry.delta > 0);
  const improvementScore = clamp(average(improvements.map((entry) => Math.max(entry.delta, 0))));

  return {
    improvementScore,
    unchangedCount: deltas.filter((entry) => entry.delta === 0).length,
    regressions,
    improvements,
    deltas
  };
}

function buildQualityValidations(context = {}) {
  const metric = context.metric || {};
  const runtimeGraph = context.runtimeGraph || {};
  const timelineValidation = context.timelineValidation || {};
  const sceneValidation = context.sceneValidation || {};
  const recommendation = context.recommendation || {};
  const rendererSnapshot = context.rendererSnapshot || {};
  const teacherPlan = context.teacherPlan || {};
  const sourceType = safeString(context.normalizedInput?.sourceType || 'text');

  return {
    learningIntentQuality: {
      status: metric.confidenceScores >= 0.3 ? 'pass' : 'warn',
      score: metric.confidenceScores,
      details: `Intent confidence ${metric.confidenceScores.toFixed(2)} for source type ${sourceType}.`
    },
    visualizationStrategyQuality: {
      status: metric.visualizationSuitability >= 0.4 ? 'pass' : 'warn',
      score: metric.visualizationSuitability,
      details: `Visualization strategy score ${metric.visualizationSuitability.toFixed(2)}.`
    },
    templateRecommendationQuality: {
      status: asArray(recommendation.recommendedTemplates).length > 0 || recommendation?.fallbackStrategy ? 'pass' : 'warn',
      score: clamp(metric.visualizationSuitability),
      details: `Template recommendations ${asArray(recommendation.recommendedTemplates).length}.`
    },
    sceneGenerationQuality: {
      status: sceneValidation.status === 'valid' ? 'pass' : 'warn',
      score: sceneValidation.status === 'valid' ? 1 : 0.5,
      details: `Scene validation status ${sceneValidation.status || 'unknown'}.`
    },
    runtimeGraphConsistency: {
      status: toFiniteNumber(runtimeGraph.nodeCount, 0) >= 1 ? 'pass' : 'warn',
      score: clamp(toFiniteNumber(runtimeGraph.nodeCount, 0) > 0 ? 1 : 0.4),
      details: `Runtime graph nodes ${toFiniteNumber(runtimeGraph.nodeCount, 0)}, relationships ${toFiniteNumber(runtimeGraph.relationshipCount, 0)}.`
    },
    timelineQuality: {
      status: timelineValidation.valid === true ? 'pass' : 'warn',
      score: timelineValidation.valid === true ? 1 : 0.5,
      details: `Timeline validation valid=${timelineValidation.valid === true}.`
    },
    aiTeacherSynchronization: {
      status: asArray(teacherPlan.steps).length >= 3 ? 'pass' : 'warn',
      score: clamp(asArray(teacherPlan.steps).length / 5, 0, 1),
      details: `Teacher synchronization steps ${asArray(teacherPlan.steps).length}.`
    },
    interactionQuality: {
      status: metric.interactionCoverage >= 0.4 ? 'pass' : 'warn',
      score: metric.interactionCoverage,
      details: `Interaction coverage ${metric.interactionCoverage.toFixed(2)}.`
    },
    assetSelectionQuality: {
      status: metric.fallbackQuality >= 0.35 ? 'pass' : 'warn',
      score: metric.fallbackQuality,
      details: `Asset/fallback quality ${metric.fallbackQuality.toFixed(2)}.`
    },
    rendererMetadataQuality: {
      status: isObject(rendererSnapshot?.metadata?.integration) ? 'pass' : 'warn',
      score: isObject(rendererSnapshot?.metadata?.integration) ? 1 : 0.4,
      details: `Renderer metadata integration keys ${Object.keys(rendererSnapshot?.metadata?.integration || {}).length}.`
    },
    recoveryQuality: {
      status: metric.overallQualityScore >= 0.35 ? 'pass' : 'warn',
      score: metric.overallQualityScore,
      details: `Overall recoverable quality score ${metric.overallQualityScore.toFixed(2)}.`
    }
  };
}

function buildRecommendations(metric = {}, validations = {}) {
  const recommendations = [];

  if (metric.lessonCompleteness < 0.65) {
    recommendations.push('Increase lesson coverage by adding more key concepts, quiz items, and roadmap steps.');
  }

  if (metric.timelineCoverage < 0.65) {
    recommendations.push('Add timeline markers/events and checkpoint alignment to strengthen progression continuity.');
  }

  if (metric.interactionCoverage < 0.65) {
    recommendations.push('Expand interaction contracts to cover additional educational objects and checkpoints.');
  }

  if (metric.fallbackQuality < 0.65) {
    recommendations.push('Strengthen adaptive fallback metadata for unknown or low-confidence lesson inputs.');
  }

  if (validations.runtimeGraphConsistency?.status !== 'pass') {
    recommendations.push('Ensure runtime graph always contains scene root and object nodes for downstream render adapters.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Maintain current quality baseline and monitor regression deltas across future lesson types.');
  }

  return recommendations;
}

function buildQualityDiagnostics(context = {}) {
  const normalizedInput = context.normalizedInput || {};
  const metric = context.metric || {};

  const warnings = [];
  if (!safeString(normalizedInput.text)) {
    warnings.push('Input text content is empty; fallback content heuristics were used.');
  }
  if (asArray(normalizedInput.objects).length === 0) {
    warnings.push('No input objects were provided; synthetic object coverage was applied.');
  }
  if (metric.checkpointCoverage < 0.55) {
    warnings.push('Checkpoint coverage is below recommended threshold.');
  }

  const sourceType = safeString(normalizedInput.sourceType);
  const knownTypes = new Set([
    'pdf',
    'book',
    'image',
    'handwritten-notes',
    'ppt',
    'docx',
    'audio',
    'video',
    'website',
    'youtube',
    'source-code',
    'research-paper',
    'camera-scan',
    'text'
  ]);

  return {
    warningCount: warnings.length,
    warnings,
    sourceType,
    unknownFutureTypeParticipation: !knownTypes.has(sourceType),
    multimodalSignals: {
      hasText: safeString(normalizedInput.text).length > 0,
      hasVisualDescription: safeString(normalizedInput.visualDescription).length > 0,
      hasAudioTranscript: safeString(normalizedInput.transcript).length > 0
    }
  };
}

function toSnapshot(report) {
  return {
    schemaVersion: FRAMEWORK_SCHEMA_VERSION,
    report,
    savedAt: Date.now()
  };
}

export function validateLearningQualityReport(report = {}) {
  const source = isObject(report) ? report : {};
  const errors = [];

  if (!safeString(source.framework)) {
    errors.push('Missing framework name.');
  }

  if (!isObject(source.metrics)) {
    errors.push('Missing metrics object.');
  }

  if (!isObject(source.validations)) {
    errors.push('Missing validations object.');
  }

  if (!Array.isArray(source.recommendations)) {
    errors.push('Missing recommendations array.');
  }

  return {
    valid: errors.length === 0,
    errors,
    status: errors.length === 0 ? 'valid' : 'invalid'
  };
}

export function serializeLearningQualityReport(report = {}) {
  return JSON.stringify({
    schemaVersion: FRAMEWORK_SCHEMA_VERSION,
    report,
    serializedAt: Date.now()
  });
}

export function deserializeLearningQualityReport(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    return {
      report: null,
      validation: {
        status: 'fallback',
        valid: false,
        errors: ['Failed to parse learning quality report payload.']
      }
    };
  }

  const report = isObject(parsed.report) ? parsed.report : parsed;
  const migrated = migrateLearningQualityReport(report);
  const validation = validateLearningQualityReport(migrated);
  return {
    report: migrated,
    validation
  };
}

export function migrateLearningQualityReport(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === FRAMEWORK_SCHEMA_VERSION) {
    return {
      ...source,
      schemaVersion: FRAMEWORK_SCHEMA_VERSION
    };
  }

  return {
    schemaVersion: FRAMEWORK_SCHEMA_VERSION,
    framework: safeString(source.framework || 'UniversalCrossTopicLearningQualityTestingFramework') || 'UniversalCrossTopicLearningQualityTestingFramework',
    generatedAt: source.generatedAt || new Date().toISOString(),
    sourceType: normalizeSourceType(source.sourceType || source?.input?.sourceType || 'text'),
    inputSummary: isObject(source.inputSummary) ? source.inputSummary : (isObject(source.input) ? source.input : {}),
    metrics: isObject(source.metrics) ? source.metrics : (isObject(source.measurement) ? source.measurement : {}),
    validations: isObject(source.validations) ? source.validations : {},
    diagnostics: isObject(source.diagnostics) ? source.diagnostics : {},
    recommendations: asArray(source.recommendations),
    improvementScore: clamp(source.improvementScore, 0, 1),
    regressionReport: isObject(source.regressionReport) ? source.regressionReport : {
      improvementScore: clamp(source.improvementScore, 0, 1),
      unchangedCount: 0,
      regressions: [],
      improvements: [],
      deltas: []
    }
  };
}

export class UniversalCrossTopicLearningQualityTestingFramework {
  constructor(options = {}) {
    this.options = isObject(options) ? options : {};
    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey) || DEFAULT_PERSISTENCE_KEY;
    this.state = normalizeQualityFrameworkState({
      diagnostics: {
        runs: 0,
        recoveries: 0,
        warnings: []
      },
      summary: {
        lastRunAt: null,
        runCount: 0,
        lastImprovementScore: 0,
        unknownTypeRuns: 0
      },
      reports: {
        latest: null,
        previous: null
      }
    });

    this.recoverSession();
  }

  warn(message = 'Unknown warning') {
    this.state.diagnostics.warnings.push(safeString(message));
    if (this.state.diagnostics.warnings.length > 300) {
      this.state.diagnostics.warnings.shift();
    }
  }

  run(input = {}, options = {}) {
    const normalizedInput = normalizeLessonInput(input);
    const textForAnalysis = safeString(normalizedInput.content || normalizedInput.text || normalizedInput.topic);

    const intent = analyzeUniversalLearningIntent({
      sourceType: normalizedInput.sourceType,
      sourceName: normalizedInput.sourceName,
      content: textForAnalysis,
      visualDescription: normalizedInput.visualDescription
    });

    const strategy = analyzeVisualizationStrategy({
      sourceType: normalizedInput.sourceType,
      sourceName: normalizedInput.sourceName,
      content: textForAnalysis,
      visualDescription: normalizedInput.visualDescription,
      intent
    });

    const recommendation = analyzeCapabilityTemplateRecommendation({
      learningIntent: intent,
      visualizationStrategy: strategy,
      sceneGraph: {
        nodeCount: 0,
        relationshipCount: 0
      },
      runtimeGraph: {
        nodeCount: 0,
        relationshipCount: 0
      },
      timeline: {
        events: asArray(normalizedInput.steps)
      },
      lessonMetadata: {
        lessonId: normalizedInput.sourceName,
        title: normalizedInput.title,
        topic: normalizedInput.topic,
        sourceType: normalizedInput.sourceType,
        learnerContext: isObject(normalizedInput.learnerContext) ? normalizedInput.learnerContext : {}
      },
      concepts: normalizedInput.concepts,
      relationships: [],
      steps: normalizedInput.steps,
      goals: normalizedInput.goals,
      examples: normalizedInput.concepts.slice(0, 5),
      interactions: normalizedInput.interactions
    });

    const sceneCandidate = buildSceneCandidate(normalizedInput, intent, strategy, recommendation);
    const scene = processSceneJsonPipeline(sceneCandidate);
    const sceneValidation = validateScene(scene);
    const runtimeGraphResult = buildRuntimeSceneGraph(scene);
    const runtimeGraph = runtimeGraphResult?.graph;

    const timeline = buildTimeline(scene);
    const timelineValidation = validateTimeline(timeline);

    const teacherPlan = buildTeacherSynchronizationPlan({
      explanation: safeString(scene.summary || normalizedInput.text).slice(0, 1000),
      topic: normalizedInput.topic,
      scene
    });

    const assetManager = createAssetManager();
    const assetDiscovery = assetManager.discoverAssets({
      query: textForAnalysis,
      category: intent.knowledgeDomain,
      learningIntent: intent,
      visualizationStrategy: strategy,
      sceneMetadata: {
        sceneId: scene.sceneId,
        sourceType: normalizedInput.sourceType
      },
      runtimeGraph: {
        nodeCount: typeof runtimeGraph?.getNodeCount === 'function' ? runtimeGraph.getNodeCount() : 0,
        relationshipCount: typeof runtimeGraph?.getRelationshipCount === 'function' ? runtimeGraph.getRelationshipCount() : 0
      }
    });

    const runtimeFixture = {
      sceneId: scene.sceneId,
      metadata: {
        timeline,
        timelineData: timeline,
        rendererAdapter: {},
        sceneQuality: {
          sourceType: normalizedInput.sourceType
        }
      },
      graph: {
        toJSON: () => runtimeGraph.toJSON()
      }
    };

    const rendererCore = createUniversalRendererCore(runtimeFixture, {
      adapterProfile: {
        strictInputValidation: false,
        includeGenericUnknownNodes: true
      }
    });

    rendererCore.initialize();
    rendererCore.build({ runtimeGraph: runtimeGraph.toJSON() });
    rendererCore.synchronize('quality-test');
    const rendererSnapshot = rendererCore.snapshot();

    const lessonSuite = buildLearningArtifacts(normalizedInput, intent, strategy, recommendation);
    const metric = evaluateMetricSet({
      normalizedInput,
      lessonSuite,
      scene,
      sceneValidation,
      runtimeGraph: {
        nodeCount: typeof runtimeGraph?.getNodeCount === 'function' ? runtimeGraph.getNodeCount() : 0,
        relationshipCount: typeof runtimeGraph?.getRelationshipCount === 'function' ? runtimeGraph.getRelationshipCount() : 0
      },
      timeline,
      timelineValidation,
      teacherPlan,
      assetDiscovery,
      recommendation,
      strategy,
      intent,
      rendererSnapshot
    });

    const validations = buildQualityValidations({
      normalizedInput,
      metric,
      runtimeGraph: {
        nodeCount: typeof runtimeGraph?.getNodeCount === 'function' ? runtimeGraph.getNodeCount() : 0,
        relationshipCount: typeof runtimeGraph?.getRelationshipCount === 'function' ? runtimeGraph.getRelationshipCount() : 0
      },
      timelineValidation,
      sceneValidation,
      recommendation,
      rendererSnapshot,
      teacherPlan
    });

    const diagnostics = buildQualityDiagnostics({
      normalizedInput,
      metric
    });

    const previousReport = options.previousReport || this.state.reports.latest || null;
    const previousMetrics = isObject(previousReport?.metrics) ? previousReport.metrics : {};
    const regressionReport = buildRegressionReport(metric, previousMetrics);
    const recommendations = buildRecommendations(metric, validations);

    const report = migrateLearningQualityReport({
      schemaVersion: FRAMEWORK_SCHEMA_VERSION,
      framework: 'UniversalCrossTopicLearningQualityTestingFramework',
      generatedAt: new Date().toISOString(),
      sourceType: normalizedInput.sourceType,
      inputSummary: {
        sourceName: normalizedInput.sourceName,
        sourceType: normalizedInput.sourceType,
        topic: normalizedInput.topic,
        conceptCount: normalizedInput.concepts.length,
        goalCount: normalizedInput.goals.length,
        stepCount: normalizedInput.steps.length,
        interactionCount: normalizedInput.interactions.length,
        objectCount: normalizedInput.objects.length,
        checkpointCount: normalizedInput.checkpoints.length
      },
      metrics: metric,
      validations,
      diagnostics,
      recommendations,
      improvementScore: regressionReport.improvementScore,
      regressionReport,
      integration: {
        universalLearningPipeline: {
          learningSessionTitle: safeString(lessonSuite?.learningSession?.title || ''),
          roadmapCount: asArray(lessonSuite?.learningSession?.learningRoadmap).length
        },
        learningIntentEngine: {
          confidence: clamp(intent.confidenceScore, 0, 1),
          strategy: safeString(intent.educationalStrategy)
        },
        visualizationStrategyEngine: {
          confidence: clamp(strategy.confidenceScore, 0, 1),
          style: safeString(strategy?.primaryStrategy?.visualizationStyle)
        },
        sceneBuilder: {
          sceneId: scene.sceneId,
          validationStatus: sceneValidation.status
        },
        runtimeGraph: {
          nodeCount: typeof runtimeGraph?.getNodeCount === 'function' ? runtimeGraph.getNodeCount() : 0,
          relationshipCount: typeof runtimeGraph?.getRelationshipCount === 'function' ? runtimeGraph.getRelationshipCount() : 0
        },
        timelineEngine: {
          valid: timelineValidation.valid === true,
          trackCount: asArray(timeline.tracks).length,
          eventCount: asArray(timeline.events).length
        },
        aiTeacher: {
          stepCount: asArray(teacherPlan.steps).length,
          target: teacherPlan.target || null
        },
        assetManager: {
          selectedAssetCount: asArray(assetDiscovery.selectedAssets).length,
          fallbackEnabled: assetDiscovery?.proceduralFallback?.enabled === true
        },
        rendererCore: {
          status: rendererSnapshot?.lifecycle?.status || 'unknown',
          activeObjectCount: toFiniteNumber(rendererSnapshot?.renderState?.activeObjectCount, 0)
        }
      }
    });

    const reportValidation = validateLearningQualityReport(report);
    if (!reportValidation.valid) {
      this.warn(reportValidation.errors.join(' | '));
    }

    this.state.reports.previous = this.state.reports.latest;
    this.state.reports.latest = report;
    this.state.diagnostics.runs += 1;
    this.state.summary.lastRunAt = report.generatedAt;
    this.state.summary.runCount += 1;
    this.state.summary.lastImprovementScore = report.improvementScore;
    if (diagnostics.unknownFutureTypeParticipation) {
      this.state.summary.unknownTypeRuns += 1;
    }

    this.persistSession();

    return {
      report,
      validation: reportValidation,
      snapshot: this.snapshot()
    };
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify({
      schemaVersion: FRAMEWORK_SCHEMA_VERSION,
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
      this.warn('Failed to recover quality framework session payload.');
      return false;
    }

    this.state = migrateLearningQualityFrameworkState(parsed.state);
    this.state.diagnostics.recoveries += 1;
    return true;
  }

  snapshot() {
    return normalizeQualityFrameworkState(this.state);
  }
}

export function createUniversalCrossTopicLearningQualityTestingFramework(options = {}) {
  return new UniversalCrossTopicLearningQualityTestingFramework(options);
}

export function runUniversalCrossTopicLearningQualityTestingFramework(input = {}, options = {}) {
  const framework = createUniversalCrossTopicLearningQualityTestingFramework(options);
  return framework.run(input, options);
}
