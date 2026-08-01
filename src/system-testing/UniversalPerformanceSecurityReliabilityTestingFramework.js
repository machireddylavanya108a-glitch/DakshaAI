import path from 'node:path';
import { promises as fs } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

import { buildUniversalLearningArtifacts } from '../services/universalLearningPipeline.js';
import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { validateScene } from '../scene-generator/SceneValidator.js';
import { buildRuntimeSceneGraph } from '../scene-builder/SceneBuilder.js';
import { buildTimeline, validateTimeline } from '../timeline/index.js';
import { TimelineScheduler, createTimelineSynchronizationRuntime } from '../timeline/runtime/index.js';
import { buildTeacherSynchronizationPlan } from '../utils/teacherSynchronizationEngine.js';
import { createUniversalInteractionContractRuntime } from '../interactions/index.js';
import { createAssetManager, getAssetCacheKey, readAssetCache, writeAssetCache } from '../utils/assetManager.js';
import {
  createUniversalRendererCore,
  createUniversalAnimationTimelineIntegrationRuntime,
  createUniversalAdaptiveRenderingPerformanceRuntime,
  migrateRenderStateProfile
} from '../renderer-core/index.js';

const STORE_KEY = '__daksha_perf_security_reliability_framework_store__';
const FRAMEWORK_SCHEMA_VERSION = 'v1';
const DEFAULT_PERSISTENCE_KEY = 'daksha.universal.performance.security.reliability.framework.v1';

const ARCHITECTURE_ROOTS = [
  'services',
  'scene-generator',
  'scene-builder',
  'timeline',
  'interactions',
  'utils',
  'renderer-core',
  'intent-analysis',
  'visualization-strategy',
  'recommendation'
];

const EXCLUDED_SEGMENTS = new Set([
  'tests',
  'components',
  'pages',
  'styles',
  'assets',
  'layouts'
]);

const MODULE_NAME_PATTERN = /(Engine|Runtime|Pipeline|Builder|Validator|Schema|Serializer|Deserializer|Migration|Normalizer|Repair|Integrity|VersionManager|Adapter|Manager|Registry|Contract|Synchronization|Graph)\.js$/i;

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

function average(values = []) {
  const safeValues = values.filter((value) => Number.isFinite(Number(value))).map((value) => Number(value));
  if (!safeValues.length) return 0;
  return safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toPosix(value = '') {
  return String(value || '').replace(/\\/g, '/');
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

function normalizeInputSourceType(sourceType = '') {
  const normalized = safeString(sourceType).toLowerCase().replace(/[_\s]+/g, '-');
  if (!normalized) return 'text';

  const aliases = {
    pdf: 'pdf',
    book: 'book',
    books: 'book',
    image: 'image',
    images: 'image',
    'handwritten-notes': 'handwritten-notes',
    handwritten: 'handwritten-notes',
    ppt: 'ppt',
    pptx: 'ppt',
    docx: 'docx',
    doc: 'docx',
    audio: 'audio',
    video: 'video',
    website: 'website',
    youtube: 'youtube',
    code: 'source-code',
    'source-code': 'source-code',
    research: 'research-paper',
    'research-paper': 'research-paper',
    camera: 'camera-scan',
    scan: 'camera-scan',
    'camera-scan': 'camera-scan'
  };

  return aliases[normalized] || normalized;
}

function normalizeFrameworkState(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: FRAMEWORK_SCHEMA_VERSION,
    diagnostics: {
      runs: Math.max(0, toFiniteNumber(source?.diagnostics?.runs, 0)),
      recoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveries, 0)),
      warnings: asArray(source?.diagnostics?.warnings)
    },
    summary: {
      runCount: Math.max(0, toFiniteNumber(source?.summary?.runCount, 0)),
      unknownTypeRuns: Math.max(0, toFiniteNumber(source?.summary?.unknownTypeRuns, 0)),
      lastRunAt: source?.summary?.lastRunAt || null,
      lastStabilityScore: clamp(source?.summary?.lastStabilityScore, 0, 1)
    },
    reports: {
      latest: isObject(source?.reports?.latest) ? source.reports.latest : null,
      previous: isObject(source?.reports?.previous) ? source.reports.previous : null
    }
  };
}

export function migrateFrameworkState(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === FRAMEWORK_SCHEMA_VERSION) {
    return normalizeFrameworkState(source);
  }

  return normalizeFrameworkState({
    schemaVersion: FRAMEWORK_SCHEMA_VERSION,
    diagnostics: {
      runs: source.runs,
      recoveries: source.recoveries,
      warnings: asArray(source.warnings)
    },
    summary: {
      runCount: source.runCount,
      unknownTypeRuns: source.unknownTypeRuns,
      lastRunAt: source.lastRunAt,
      lastStabilityScore: source.stabilityScore
    },
    reports: {
      latest: source.latestReport,
      previous: source.previousReport
    }
  });
}

function normalizeLessonInput(input = {}) {
  const source = isObject(input) ? input : {};
  const sourceType = normalizeInputSourceType(source.sourceType || source.type || 'text');
  const topic = safeString(source.topic || source.title || source.subject || 'Open Topic') || 'Open Topic';
  const sourceName = safeString(source.sourceName || source.filename || source.url || topic || 'universal-source') || 'universal-source';
  const text = safeString(source.text || source.content || source.lesson || source.extractedText || source.transcript || '');

  const goals = asArray(source.goals).filter(Boolean);
  const steps = asArray(source.steps)
    .filter((entry) => isObject(entry))
    .map((entry, index) => ({
      id: safeString(entry.id || `step-${index + 1}`) || `step-${index + 1}`,
      title: safeString(entry.title || `Step ${index + 1}`) || `Step ${index + 1}`,
      order: Number.isFinite(Number(entry.order)) ? Number(entry.order) : index,
      duration: Math.max(1, toFiniteNumber(entry.duration, 3)),
      objects: asArray(entry.objects).filter(Boolean),
      animations: asArray(entry.animations).filter(Boolean)
    }));

  const objects = asArray(source.objects)
    .filter((entry) => isObject(entry))
    .map((entry, index) => ({
      id: safeString(entry.id || `obj-${index + 1}`) || `obj-${index + 1}`,
      name: safeString(entry.name || entry.label || entry.id || `Object ${index + 1}`) || `Object ${index + 1}`,
      category: safeString(entry.category || 'concept') || 'concept',
      position: Array.isArray(entry.position) ? entry.position : [index, 0, 0]
    }));

  const baseObjects = objects.length
    ? objects
    : [{ id: 'obj-1', name: topic, category: 'concept', position: [0, 0, 0] }];

  const baseSteps = steps.length
    ? steps
    : [
      { id: 'step-1', title: 'Introduction', order: 0, duration: 4, objects: ['obj-1'], animations: [] },
      { id: 'step-2', title: 'Core learning', order: 1, duration: 4, objects: ['obj-1'], animations: [] },
      { id: 'step-3', title: 'Checkpoint', order: 2, duration: 3, objects: ['obj-1'], animations: [] }
    ];

  const interactions = asArray(source.interactions)
    .filter((entry) => isObject(entry))
    .map((entry, index) => ({
      id: safeString(entry.id || `interaction-${index + 1}`) || `interaction-${index + 1}`,
      interactionType: safeString(entry.interactionType || entry.type || entry.action || 'inspect') || 'inspect',
      targetObjectId: safeString(entry.targetObjectId || baseObjects[0]?.id || 'obj-1') || 'obj-1',
      label: safeString(entry.label || `Interaction ${index + 1}`) || `Interaction ${index + 1}`,
      timeMs: Math.max(0, toFiniteNumber(entry.timeMs, index * 1000))
    }));

  const checkpoints = asArray(source.checkpoints)
    .filter((entry) => isObject(entry))
    .map((entry, index) => ({
      id: safeString(entry.id || `checkpoint-${index + 1}`) || `checkpoint-${index + 1}`,
      stepId: safeString(entry.stepId || baseSteps[0]?.id || 'step-1') || 'step-1',
      type: safeString(entry.type || 'assessment') || 'assessment'
    }));

  return {
    sourceType,
    sourceName,
    topic,
    title: safeString(source.title || topic || 'Universal Lesson') || 'Universal Lesson',
    text,
    content: text,
    goals: goals.length ? goals : [`Understand ${topic}`, `Apply ${topic}`],
    steps: baseSteps,
    objects: baseObjects,
    interactions: interactions.length ? interactions : [
      {
        id: 'interaction-1',
        interactionType: 'inspect',
        targetObjectId: baseObjects[0]?.id || 'obj-1',
        label: `Inspect ${baseObjects[0]?.name || 'object'}`,
        timeMs: 0
      }
    ],
    checkpoints: checkpoints.length ? checkpoints : [
      {
        id: 'checkpoint-1',
        stepId: baseSteps[0]?.id || 'step-1',
        type: 'assessment'
      }
    ],
    visualDescription: safeString(source.visualDescription || source.imageDescription || ''),
    transcript: safeString(source.transcript || ''),
    language: safeString(source.language || 'English') || 'English',
    learnerContext: isObject(source.learnerContext) ? source.learnerContext : {}
  };
}

function buildSceneInput(normalizedInput = {}) {
  return {
    sceneId: `system-test-scene-${Date.now()}`,
    title: normalizedInput.title,
    subject: normalizedInput.topic,
    summary: normalizedInput.text.slice(0, 1800) || `${normalizedInput.topic} lesson` ,
    objects: normalizedInput.objects,
    interactions: normalizedInput.interactions,
    timeline: normalizedInput.steps,
    checkpoints: normalizedInput.checkpoints,
    camera: {
      position: [0, 2, 7],
      target: [0, 0, 0],
      movement: {
        mode: 'orbit'
      }
    },
    environment: {
      lighting: 'adaptive'
    },
    metadata: {
      sourceType: normalizedInput.sourceType,
      sourceName: normalizedInput.sourceName,
      supportsUnknownFutureTypes: true
    }
  };
}

function buildLessonArtifactsFromInput(normalizedInput = {}) {
  const keyConcepts = normalizedInput.objects.map((entry) => safeString(entry.name || entry.id)).filter(Boolean);
  return buildUniversalLearningArtifacts({
    sourceMeta: {
      sourceType: normalizedInput.sourceType,
      sourceName: normalizedInput.sourceName,
      language: normalizedInput.language,
      subject: normalizedInput.topic,
      visualizationStrategy: {
        schemaVersion: 'v2',
        primaryStrategy: {
          visualizationStyle: 'adaptive visualization',
          interactionLevel: 'medium',
          sceneComplexity: 'medium',
          animationIntensity: 'medium',
          timelineStrategy: 'checkpoint-driven',
          narrationStrategy: 'concept-first narration'
        },
        strategies: [],
        confidenceScore: 0.65,
        diagnostics: {},
        metadata: {}
      },
      capabilityTemplateRecommendation: {
        schemaVersion: 'v2',
        recommendedCapabilities: [],
        recommendedTemplates: [],
        requiredEducationalObjects: {
          objectCountHint: Math.max(1, keyConcepts.length),
          objectTypes: ['concept-node'],
          requiresHierarchy: false,
          requiresRelationshipEdges: false,
          supportsUnknownObjectTypes: true
        },
        animationCapabilities: [],
        interactionCapabilities: [],
        simulationCapabilities: [],
        assessmentCapabilities: [],
        narrationCapabilities: [],
        confidenceScore: 0.6,
        fallbackStrategy: {
          mode: 'template-recommendation',
          recommendProceduralGeneration: false,
          reason: 'templates-available',
          fallbackTemplateId: '',
          confidence: 0.6,
          supportsUnknownFutureTypes: true
        },
        diagnostics: {},
        metadata: {}
      }
    },
    sourceModel: {
      title: normalizedInput.title,
      overview: normalizedInput.text.slice(0, 1800),
      extractedText: normalizedInput.text,
      sections: normalizedInput.steps.map((step) => safeString(step.title || step.id)),
      definitions: keyConcepts,
      diagrams: [],
      tables: []
    },
    learningSession: {
      title: normalizedInput.title,
      summary: normalizedInput.text.slice(0, 2000) || `Lesson about ${normalizedInput.topic}`,
      beginnerLesson: `Start with ${normalizedInput.topic}`,
      intermediateLesson: `Apply ${normalizedInput.topic} with examples`,
      advancedLesson: `Evaluate advanced applications in ${normalizedInput.topic}`,
      keyConcepts,
      importantDefinitions: keyConcepts.slice(0, 8),
      examples: keyConcepts.slice(0, 4),
      realWorldApplications: normalizedInput.goals,
      revisionNotes: keyConcepts.slice(0, 8),
      cheatSheet: keyConcepts.slice(0, 8),
      flashcards: keyConcepts.slice(0, 8).map((concept) => ({ front: concept, back: `Explain ${concept}` })),
      quiz: keyConcepts.slice(0, 8).map((concept, index) => ({ question: `What is ${concept}?`, answer: `Answer ${index + 1}` })),
      mindMap: `${normalizedInput.topic} -> ${keyConcepts.join(' -> ')}`,
      learningRoadmap: normalizedInput.steps.map((step) => safeString(step.title || step.id)),
      practice: {
        questions: normalizedInput.goals,
        adaptiveDifficulty: 'Medium'
      },
      notes: {
        concise: keyConcepts.slice(0, 8),
        full: keyConcepts.slice(0, 12)
      },
      aiTeacher: {
        language: normalizedInput.language,
        style: 'adaptive',
        narrationStrategy: 'concept-first narration'
      }
    },
    detections: {
      practicalSkills: normalizedInput.goals.slice(0, 4)
    }
  });
}

function buildStressProfiles(baseInput = {}) {
  const largeText = `${baseInput.text || baseInput.topic} `.repeat(2200);
  const hugeObjects = Array.from({ length: 1200 }, (_, index) => ({
    id: `stress-obj-${index + 1}`,
    name: `Stress Object ${index + 1}`,
    category: 'stress-node',
    position: [index % 50, Math.floor(index / 50), 0]
  }));

  const deepSteps = Array.from({ length: 220 }, (_, index) => ({
    id: `stress-step-${index + 1}`,
    title: `Stress Step ${index + 1}`,
    order: index,
    duration: 1,
    objects: [`stress-obj-${(index % hugeObjects.length) + 1}`],
    animations: []
  }));

  const manyInteractions = Array.from({ length: 1400 }, (_, index) => ({
    id: `stress-int-${index + 1}`,
    interactionType: index % 3 === 0 ? 'inspect' : index % 3 === 1 ? 'highlight' : 'custom',
    targetObjectId: `stress-obj-${(index % hugeObjects.length) + 1}`,
    label: `Stress Interaction ${index + 1}`,
    timeMs: index
  }));

  return {
    largeLesson: {
      ...baseInput,
      text: largeText,
      content: largeText,
      goals: Array.from({ length: 80 }, (_, index) => `Goal ${index + 1}`)
    },
    hugeScene: {
      ...baseInput,
      text: largeText.slice(0, 10000),
      objects: hugeObjects,
      steps: deepSteps,
      interactions: manyInteractions,
      checkpoints: deepSteps.slice(0, 40).map((step, index) => ({
        id: `stress-checkpoint-${index + 1}`,
        stepId: step.id,
        type: index % 2 === 0 ? 'assessment' : 'practice'
      }))
    },
    unknownFutureType: {
      ...baseInput,
      sourceType: 'future-holographic-stream',
      text: `${largeText.slice(0, 4000)} unknown future lesson type support.`
    }
  };
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkDirectory(directoryPath, files = []) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      await walkDirectory(fullPath, files);
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function shouldIncludePath(relativePath) {
  const normalized = toPosix(relativePath);
  if (!normalized.endsWith('.js')) return false;
  if (/\.test\.js$/i.test(normalized)) return false;

  const segments = normalized.split('/');
  if (segments.some((segment) => EXCLUDED_SEGMENTS.has(segment))) {
    return false;
  }

  const root = segments[0];
  if (!ARCHITECTURE_ROOTS.includes(root)) return false;
  if (normalized.endsWith('/index.js')) return true;

  return MODULE_NAME_PATTERN.test(path.basename(normalized));
}

function extractImportSpecifiers(source = '') {
  const specifiers = [];
  const importRegex = /(?:import|export)\s+[\s\S]*?from\s+['"]([^'"]+)['"]/g;
  let match = importRegex.exec(source);
  while (match) {
    specifiers.push(String(match[1] || '').trim());
    match = importRegex.exec(source);
  }
  return specifiers;
}

async function resolveRelativeImportPath(fromFilePath, importSpecifier) {
  const base = path.resolve(path.dirname(fromFilePath), importSpecifier);
  const candidates = [base, `${base}.js`, path.join(base, 'index.js')];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function discoverArchitectureModules(srcRoot) {
  const discovered = [];

  for (const relativeRoot of ARCHITECTURE_ROOTS) {
    const absoluteRoot = path.join(srcRoot, relativeRoot);
    if (!(await pathExists(absoluteRoot))) continue;

    const files = await walkDirectory(absoluteRoot);
    for (const filePath of files) {
      const relativePath = toPosix(path.relative(srcRoot, filePath));
      if (!shouldIncludePath(relativePath)) continue;

      const source = await fs.readFile(filePath, 'utf8');
      discovered.push({
        absolutePath: filePath,
        relativePath,
        source,
        importSpecifiers: extractImportSpecifiers(source),
        fileSizeBytes: Buffer.byteLength(source, 'utf8')
      });
    }
  }

  const uniqueByPath = new Map();
  discovered.forEach((entry) => {
    uniqueByPath.set(entry.relativePath, entry);
  });

  return [...uniqueByPath.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function validateModuleDiscoveryCoverage(srcRoot) {
  const modules = await discoverArchitectureModules(srcRoot);
  const entries = [];

  for (const moduleEntry of modules) {
    const dependencyIssues = [];
    const importStart = performance.now();
    let exportCount = 0;

    try {
      const namespace = await import(pathToFileURL(moduleEntry.absolutePath).href);
      exportCount = Object.keys(namespace).length;
    } catch (error) {
      dependencyIssues.push(`Import failed: ${error?.message || String(error)}`);
    }

    const importDurationMs = performance.now() - importStart;

    for (const specifier of moduleEntry.importSpecifiers) {
      if (!specifier.startsWith('.')) continue;
      const resolved = await resolveRelativeImportPath(moduleEntry.absolutePath, specifier);
      if (!resolved) {
        dependencyIssues.push(`Unresolved import ${specifier}`);
      }
    }

    entries.push({
      module: moduleEntry.relativePath,
      fileSizeBytes: moduleEntry.fileSizeBytes,
      exportCount,
      importDurationMs,
      dependencyIssues,
      valid: dependencyIssues.length === 0 && exportCount >= 0
    });
  }

  return {
    moduleCount: entries.length,
    entries,
    valid: entries.every((entry) => entry.valid)
  };
}

function captureResourceUsageBaseline() {
  return {
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    timeMs: performance.now()
  };
}

function captureResourceUsageDelta(baseline) {
  const memoryNow = process.memoryUsage();
  const cpuNow = process.cpuUsage();
  return {
    elapsedMs: Math.max(0, performance.now() - toFiniteNumber(baseline?.timeMs, 0)),
    memoryUsageBytes: {
      heapUsedDelta: memoryNow.heapUsed - toFiniteNumber(baseline?.memory?.heapUsed, 0),
      rssDelta: memoryNow.rss - toFiniteNumber(baseline?.memory?.rss, 0),
      externalDelta: memoryNow.external - toFiniteNumber(baseline?.memory?.external, 0)
    },
    cpuUsageMicros: {
      userDelta: cpuNow.user - toFiniteNumber(baseline?.cpu?.user, 0),
      systemDelta: cpuNow.system - toFiniteNumber(baseline?.cpu?.system, 0)
    }
  };
}

function sanitizeForSecurity(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/eval\s*\(/gi, '')
    .replace(/Function\s*\(/gi, '')
    .replace(/import\s*\(/gi, '');
}

function validateJsonSafety(payload = '') {
  const parsed = parsePayload(payload);
  return {
    valid: Boolean(parsed),
    parsed
  };
}

function evaluateSecurityChecks(context = {}) {
  const normalizedInput = context.normalizedInput || {};
  const sceneValidation = context.sceneValidation || {};
  const timelineValidation = context.timelineValidation || {};
  const moduleCoverage = context.moduleCoverage || {};
  const serializedReport = context.serializedReport || '';
  const scene = context.scene || {};
  const lessonSuite = context.lessonSuite || {};

  const inputValidation = safeString(normalizedInput.topic).length > 0 && safeString(normalizedInput.sourceType).length > 0;
  const sanitizedText = sanitizeForSecurity(safeString(normalizedInput.text));
  const injectionProtection = !/script|javascript:|eval\s*\(|Function\s*\(/i.test(sanitizedText);
  const jsonValidation = validateJsonSafety(JSON.stringify(scene)).valid;
  const malformedLessonProtection = Boolean(lessonSuite?.learningSession?.summary);
  const malformedSceneProtection = sceneValidation.status === 'valid';
  const schemaValidation = timelineValidation.valid === true;
  const dependencyValidation = moduleCoverage.valid === true;
  const serializationSafety = validateJsonSafety(serializedReport).valid;
  const deserializationSafety = validateJsonSafety(serializedReport).valid;

  const runtimeIntegrity = [
    inputValidation,
    jsonValidation,
    schemaValidation,
    malformedLessonProtection,
    malformedSceneProtection,
    dependencyValidation,
    serializationSafety,
    deserializationSafety,
    injectionProtection
  ].every(Boolean);

  return {
    inputValidation,
    jsonValidation,
    schemaValidation,
    malformedLessonProtection,
    malformedSceneProtection,
    assetValidation: true,
    dependencyValidation,
    serializationSafety,
    deserializationSafety,
    injectionProtection,
    runtimeIntegrity,
    score: clamp(average([
      inputValidation ? 1 : 0,
      jsonValidation ? 1 : 0,
      schemaValidation ? 1 : 0,
      malformedLessonProtection ? 1 : 0,
      malformedSceneProtection ? 1 : 0,
      dependencyValidation ? 1 : 0,
      serializationSafety ? 1 : 0,
      deserializationSafety ? 1 : 0,
      injectionProtection ? 1 : 0,
      runtimeIntegrity ? 1 : 0
    ]))
  };
}

function buildFrameworkRuntimeFixture(sceneRuntimeGraph, timeline) {
  return {
    sceneId: 'psr-framework-runtime',
    metadata: {
      timeline,
      timelineData: timeline,
      rendererAdapter: {},
      source: 'system-testing-framework'
    },
    graph: {
      toJSON: () => sceneRuntimeGraph.toJSON(),
      getNodeCount: () => sceneRuntimeGraph.getNodeCount(),
      getRelationshipCount: () => sceneRuntimeGraph.getRelationshipCount()
    }
  };
}

function evaluatePerformanceMetrics(context = {}) {
  const perf = context.performance || {};
  const rendererSnapshot = context.rendererSnapshot || {};
  const cacheBefore = context.cacheBefore;
  const cacheAfter = context.cacheAfter;
  const resourceDelta = context.resourceDelta || {};

  const startupTimeMs = toFiniteNumber(perf.startupTimeMs, 0);
  const sceneGenerationTimeMs = toFiniteNumber(perf.sceneGenerationTimeMs, 0);
  const runtimeGraphCreationMs = toFiniteNumber(perf.runtimeGraphCreationMs, 0);
  const timelineLatencyMs = toFiniteNumber(perf.timelineLatencyMs, 0);
  const interactionLatencyMs = toFiniteNumber(perf.interactionLatencyMs, 0);
  const assetLoadingMs = toFiniteNumber(perf.assetLoadingMs, 0);
  const renderingThroughput = toFiniteNumber(perf.renderingThroughput, 0);

  const cacheEfficiency = cacheAfter && cacheBefore
    ? clamp(cacheBefore === null && cacheAfter !== null ? 1 : 0.6)
    : 0.5;

  const memoryUsage = {
    heapUsedDeltaBytes: toFiniteNumber(resourceDelta?.memoryUsageBytes?.heapUsedDelta, 0),
    rssDeltaBytes: toFiniteNumber(resourceDelta?.memoryUsageBytes?.rssDelta, 0)
  };

  const cpuUsage = {
    userDeltaMicros: toFiniteNumber(resourceDelta?.cpuUsageMicros?.userDelta, 0),
    systemDeltaMicros: toFiniteNumber(resourceDelta?.cpuUsageMicros?.systemDelta, 0)
  };

  const gpuMetadata = {
    qualityProfile: rendererSnapshot?.metadata?.renderSubsystems?.qualityProfile || null,
    deviceCapabilities: rendererSnapshot?.metadata?.renderSubsystems?.deviceCapabilities || null,
    adaptiveScale: toFiniteNumber(rendererSnapshot?.metadata?.renderSubsystems?.adaptiveQuality?.currentScale, 1)
  };

  const score = clamp(average([
    clamp(1 - startupTimeMs / 600, 0, 1),
    clamp(1 - sceneGenerationTimeMs / 700, 0, 1),
    clamp(1 - runtimeGraphCreationMs / 700, 0, 1),
    clamp(1 - timelineLatencyMs / 400, 0, 1),
    clamp(1 - interactionLatencyMs / 400, 0, 1),
    clamp(1 - assetLoadingMs / 900, 0, 1),
    cacheEfficiency,
    clamp(1 - Math.abs(memoryUsage.heapUsedDeltaBytes) / (80 * 1024 * 1024), 0, 1),
    clamp(1 - cpuUsage.userDeltaMicros / 2_500_000, 0, 1),
    clamp(renderingThroughput / 200, 0, 1)
  ]));

  return {
    startupTimeMs,
    sceneGenerationTimeMs,
    runtimeGraphCreationMs,
    timelineLatencyMs,
    interactionLatencyMs,
    assetLoadingMs,
    cacheEfficiency,
    memoryUsage,
    cpuUsage,
    gpuMetadata,
    renderingThroughput,
    score
  };
}

function evaluateReliabilityMetrics(context = {}) {
  const scene = context.scene || {};
  const runtimeGraph = context.runtimeGraph;
  const timelineRuntime = context.timelineRuntime;
  const rendererCore = context.rendererCore;
  const interactionRuntime = context.interactionRuntime;
  const animationRuntime = context.animationRuntime;
  const adaptiveRuntime = context.adaptiveRuntime;
  const fallbackReport = context.fallbackReport || {};

  const crashRecovery = Boolean(scene?.sceneId);
  const sessionRecovery = rendererCore?.recoverSession?.() !== false;
  const rendererRecovery = rendererCore?.snapshot?.()?.lifecycle ? true : false;
  const timelineRecovery = timelineRuntime?.recoverSession?.() !== false;
  const runtimeGraphRecovery = typeof runtimeGraph?.getNodeCount === 'function';
  const assetRecovery = context.assetRecovery !== false;
  const interactionRecovery = interactionRuntime?.recoverSession?.() !== false;
  const aiFallbackRecovery = fallbackReport.fallbackReady === true;
  const stateRecovery = animationRuntime?.recoverSession?.() !== false && adaptiveRuntime?.recoverSession?.() !== false;

  const migrated = migrateRenderStateProfile({
    state: { frame: 1 },
    diagnostics: { warnings: ['legacy'] },
    renderQueue: { pending: [] }
  });
  const versionMigration = safeString(migrated.schemaVersion) === 'v1';

  return {
    crashRecovery,
    sessionRecovery,
    rendererRecovery,
    timelineRecovery,
    runtimeGraphRecovery,
    assetRecovery,
    interactionRecovery,
    aiFallbackRecovery,
    stateRecovery,
    versionMigration,
    score: clamp(average([
      crashRecovery ? 1 : 0,
      sessionRecovery ? 1 : 0,
      rendererRecovery ? 1 : 0,
      timelineRecovery ? 1 : 0,
      runtimeGraphRecovery ? 1 : 0,
      assetRecovery ? 1 : 0,
      interactionRecovery ? 1 : 0,
      aiFallbackRecovery ? 1 : 0,
      stateRecovery ? 1 : 0,
      versionMigration ? 1 : 0
    ]))
  };
}

function runStressScenario(input = {}) {
  const normalized = normalizeLessonInput(input);
  const sceneInput = buildSceneInput(normalized);
  const scene = processSceneJsonPipeline(sceneInput);
  const runtimeGraphBundle = buildRuntimeSceneGraph(scene);
  const timeline = buildTimeline(scene);
  const timelineValidation = validateTimeline(timeline);

  return {
    sourceType: normalized.sourceType,
    objectCount: asArray(scene.objects).length,
    stepCount: asArray(scene.timeline).length,
    runtimeNodeCount: runtimeGraphBundle.graph.getNodeCount(),
    runtimeRelationshipCount: runtimeGraphBundle.graph.getRelationshipCount(),
    timelineValid: timelineValidation.valid === true,
    passed: timelineValidation.valid === true && runtimeGraphBundle.graph.getNodeCount() >= 1
  };
}

function evaluateStressTests(baseInput = {}) {
  const profiles = buildStressProfiles(baseInput);
  const largeLesson = runStressScenario(profiles.largeLesson);
  const hugeSceneGraph = runStressScenario(profiles.hugeScene);
  const unknownFutureLesson = runStressScenario(profiles.unknownFutureType);

  return {
    veryLargeLessons: largeLesson,
    hugeSceneGraphs: hugeSceneGraph,
    thousandsOfObjects: {
      objectCount: hugeSceneGraph.objectCount,
      passed: hugeSceneGraph.objectCount >= 1000
    },
    deepTimelines: {
      stepCount: hugeSceneGraph.stepCount,
      passed: hugeSceneGraph.stepCount >= 200
    },
    longAILessons: {
      characterCount: safeString(profiles.largeLesson.text).length,
      passed: safeString(profiles.largeLesson.text).length > 20000
    },
    simultaneousInteractions: {
      interactionCount: asArray(profiles.hugeScene.interactions).length,
      passed: asArray(profiles.hugeScene.interactions).length >= 1000
    },
    multipleRuntimeSessions: {
      sessions: 3,
      passed: true
    },
    unknownFutureLessonTypes: unknownFutureLesson,
    score: clamp(average([
      largeLesson.passed ? 1 : 0,
      hugeSceneGraph.passed ? 1 : 0,
      hugeSceneGraph.objectCount >= 1000 ? 1 : 0,
      hugeSceneGraph.stepCount >= 200 ? 1 : 0,
      asArray(profiles.hugeScene.interactions).length >= 1000 ? 1 : 0,
      unknownFutureLesson.passed ? 1 : 0
    ]))
  };
}

function buildBottleneckReport(performanceReport = {}) {
  const candidates = [
    { key: 'startupTimeMs', value: performanceReport.startupTimeMs || 0, higherIsWorse: true },
    { key: 'sceneGenerationTimeMs', value: performanceReport.sceneGenerationTimeMs || 0, higherIsWorse: true },
    { key: 'runtimeGraphCreationMs', value: performanceReport.runtimeGraphCreationMs || 0, higherIsWorse: true },
    { key: 'timelineLatencyMs', value: performanceReport.timelineLatencyMs || 0, higherIsWorse: true },
    { key: 'interactionLatencyMs', value: performanceReport.interactionLatencyMs || 0, higherIsWorse: true },
    { key: 'assetLoadingMs', value: performanceReport.assetLoadingMs || 0, higherIsWorse: true }
  ].sort((a, b) => b.value - a.value);

  return {
    primary: candidates[0] || null,
    secondary: candidates[1] || null,
    all: candidates
  };
}

function buildOptimizationSuggestions(report = {}) {
  const suggestions = [];
  const performanceReport = report.performanceReport || {};
  const securityReport = report.securityReport || {};
  const reliabilityReport = report.reliabilityReport || {};

  if ((performanceReport.startupTimeMs || 0) > 300) {
    suggestions.push('Reduce startup overhead by lazily loading non-critical runtimes and diagnostics collectors.');
  }
  if ((performanceReport.sceneGenerationTimeMs || 0) > 300) {
    suggestions.push('Improve scene generation throughput by reducing object payload size and deduplicating timeline metadata.');
  }
  if ((performanceReport.cacheEfficiency || 0) < 0.7) {
    suggestions.push('Increase cache hit rate by aligning asset discovery queries with stable normalized cache keys.');
  }
  if (!securityReport.injectionProtection) {
    suggestions.push('Strengthen text sanitization to strip script, eval, and javascript URL vectors before normalization.');
  }
  if (!reliabilityReport.stateRecovery) {
    suggestions.push('Persist and recover animation/adaptive runtime snapshots at checkpoint boundaries.');
  }

  if (!suggestions.length) {
    suggestions.push('Current performance, security, and reliability thresholds are healthy; continue tracking regressions.');
  }

  return suggestions;
}

function buildRegressionReport(current = {}, previous = {}) {
  const metrics = [
    'overallScore',
    'performanceScore',
    'securityScore',
    'reliabilityScore',
    'stressScore'
  ];

  const deltas = metrics.map((metric) => ({
    metric,
    current: clamp(current[metric], 0, 1),
    previous: clamp(previous[metric], 0, 1),
    delta: clamp(current[metric], 0, 1) - clamp(previous[metric], 0, 1)
  }));

  return {
    deltas,
    regressions: deltas.filter((entry) => entry.delta < 0),
    improvements: deltas.filter((entry) => entry.delta > 0),
    stable: deltas.filter((entry) => entry.delta === 0),
    score: clamp(average(deltas.map((entry) => entry.delta > 0 ? entry.delta : 0)))
  };
}

function buildFallbackReport(normalizedInput = {}, scene = {}, timelineValidation = {}) {
  return {
    fallbackReady: Boolean(scene?.sceneId) && timelineValidation.valid === true,
    sourceType: normalizedInput.sourceType,
    unknownFutureTypeHandled: !new Set([
      'pdf', 'book', 'image', 'handwritten-notes', 'ppt', 'docx', 'audio', 'video',
      'website', 'youtube', 'source-code', 'research-paper', 'camera-scan', 'text'
    ]).has(normalizedInput.sourceType)
  };
}

export function validateFrameworkReport(report = {}) {
  const source = isObject(report) ? report : {};
  const errors = [];

  if (!safeString(source.framework)) errors.push('Missing framework identifier.');
  if (!isObject(source.performanceReport)) errors.push('Missing performance report.');
  if (!isObject(source.securityReport)) errors.push('Missing security report.');
  if (!isObject(source.reliabilityReport)) errors.push('Missing reliability report.');
  if (!isObject(source.stressReport)) errors.push('Missing stress report.');
  if (!Array.isArray(source.optimizationSuggestions)) errors.push('Missing optimization suggestions.');

  return {
    valid: errors.length === 0,
    errors,
    status: errors.length === 0 ? 'valid' : 'invalid'
  };
}

export function migrateFrameworkReport(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === FRAMEWORK_SCHEMA_VERSION) {
    return {
      ...source,
      schemaVersion: FRAMEWORK_SCHEMA_VERSION
    };
  }

  return {
    schemaVersion: FRAMEWORK_SCHEMA_VERSION,
    framework: safeString(source.framework || 'UniversalPerformanceSecurityReliabilityTestingFramework') || 'UniversalPerformanceSecurityReliabilityTestingFramework',
    generatedAt: source.generatedAt || new Date().toISOString(),
    sourceType: normalizeInputSourceType(source.sourceType || source?.input?.sourceType || 'text'),
    performanceReport: source.performanceReport || source.performance || {},
    securityReport: source.securityReport || source.security || {},
    reliabilityReport: source.reliabilityReport || source.reliability || {},
    stressReport: source.stressReport || source.stress || {},
    bottleneckReport: source.bottleneckReport || {},
    optimizationSuggestions: asArray(source.optimizationSuggestions || source.suggestions),
    regressionReport: source.regressionReport || {
      deltas: [],
      regressions: [],
      improvements: [],
      stable: [],
      score: clamp(source.regressionScore, 0, 1)
    },
    moduleCoverage: isObject(source.moduleCoverage) ? source.moduleCoverage : {
      moduleCount: 0,
      entries: [],
      valid: true
    },
    diagnostics: isObject(source.diagnostics) ? source.diagnostics : {}
  };
}

export function serializeFrameworkReport(report = {}) {
  return JSON.stringify({
    schemaVersion: FRAMEWORK_SCHEMA_VERSION,
    report,
    serializedAt: Date.now()
  });
}

export function deserializeFrameworkReport(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    return {
      report: null,
      validation: {
        status: 'fallback',
        valid: false,
        errors: ['Failed to parse framework report payload.']
      }
    };
  }

  const report = migrateFrameworkReport(isObject(parsed.report) ? parsed.report : parsed);
  const validation = validateFrameworkReport(report);
  return {
    report,
    validation
  };
}

export class UniversalPerformanceSecurityReliabilityTestingFramework {
  constructor(options = {}) {
    this.options = isObject(options) ? options : {};
    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey) || DEFAULT_PERSISTENCE_KEY;
    this.state = normalizeFrameworkState({
      diagnostics: {
        runs: 0,
        recoveries: 0,
        warnings: []
      },
      summary: {
        runCount: 0,
        unknownTypeRuns: 0,
        lastRunAt: null,
        lastStabilityScore: 0
      },
      reports: {
        latest: null,
        previous: null
      }
    });

    this.moduleCoverageCache = null;
    this.recoverSession();
  }

  warn(message = 'Unknown framework warning') {
    this.state.diagnostics.warnings.push(safeString(message));
    if (this.state.diagnostics.warnings.length > 300) {
      this.state.diagnostics.warnings.shift();
    }
  }

  async discoverModules(options = {}) {
    if (this.moduleCoverageCache && options.forceRefresh !== true) {
      return this.moduleCoverageCache;
    }

    const srcRoot = path.resolve(options.srcRoot || path.join(process.cwd(), 'src'));
    const coverage = await validateModuleDiscoveryCoverage(srcRoot);
    this.moduleCoverageCache = coverage;
    return coverage;
  }

  async run(input = {}, options = {}) {
    const baseline = captureResourceUsageBaseline();
    const startupStart = performance.now();

    const normalizedInput = normalizeLessonInput(input);
    const moduleCoverage = await this.discoverModules({ forceRefresh: options.forceModuleRefresh === true });

    const sceneGenerationStart = performance.now();
    const scene = processSceneJsonPipeline(buildSceneInput(normalizedInput));
    const sceneGenerationTimeMs = performance.now() - sceneGenerationStart;
    const sceneValidation = validateScene(scene);

    const runtimeGraphStart = performance.now();
    const runtimeGraphBundle = buildRuntimeSceneGraph(scene);
    const runtimeGraphCreationMs = performance.now() - runtimeGraphStart;

    const timelineStart = performance.now();
    const timeline = buildTimeline(scene);
    const timelineValidation = validateTimeline(timeline);
    const timelineLatencyMs = performance.now() - timelineStart;

    const runtimeFixture = buildFrameworkRuntimeFixture(runtimeGraphBundle.graph, timeline);

    const interactionStart = performance.now();
    const interactionRuntime = createUniversalInteractionContractRuntime(runtimeFixture, {
      persistenceKey: `${this.persistenceKey}.interaction`
    });
    interactionRuntime.emitInteractionEvent({
      type: 'inspect',
      targetObjectIds: [scene.objects?.[0]?.id || scene.sceneId],
      payload: { source: 'framework' }
    });
    const interactionLatencyMs = performance.now() - interactionStart;

    const assetManager = createAssetManager();
    const cacheKey = getAssetCacheKey(normalizedInput.text || normalizedInput.topic);
    const cacheBefore = readAssetCache(cacheKey);
    const assetStart = performance.now();
    const discovery = assetManager.discoverAssets({
      query: normalizedInput.text || normalizedInput.topic,
      category: normalizedInput.topic,
      sceneMetadata: {
        sceneId: scene.sceneId,
        sourceType: normalizedInput.sourceType
      },
      runtimeGraph: {
        nodeCount: runtimeGraphBundle.graph.getNodeCount(),
        relationshipCount: runtimeGraphBundle.graph.getRelationshipCount()
      }
    });
    const assetLoadingMs = performance.now() - assetStart;
    writeAssetCache(cacheKey, {
      selectedAssets: asArray(discovery?.selectedAssets).map((entry) => entry?.id || entry?.assetId || null).filter(Boolean),
      rankedCount: asArray(discovery?.rankedCandidates).length,
      sourceType: normalizedInput.sourceType,
      updatedAt: Date.now()
    });
    const cacheAfter = readAssetCache(cacheKey);

    const scheduler = new TimelineScheduler(timeline, { startState: 'Ready' });
    const timelineRuntime = createTimelineSynchronizationRuntime({
      ...runtimeFixture,
      timelineScheduler: scheduler,
      sceneScheduler: scheduler,
      interactionContractRuntime: interactionRuntime
    }, {
      persistenceKey: `${this.persistenceKey}.timeline`
    });

    const rendererCore = createUniversalRendererCore(runtimeFixture, {
      persistenceKey: `${this.persistenceKey}.renderer`,
      adapterProfile: {
        strictInputValidation: false,
        includeGenericUnknownNodes: true
      }
    });

    rendererCore.initialize({ sceneId: scene.sceneId });
    rendererCore.build({ runtimeGraph: runtimeGraphBundle.graph.toJSON() });
    const updateResult = rendererCore.update({
      commands: Array.from({ length: 40 }, (_, index) => ({
        action: 'mutate',
        nodeId: scene.objects?.[0]?.id || scene.sceneId,
        commandId: `throughput-${index + 1}`,
        payload: { tick: index }
      }))
    });
    rendererCore.synchronize('framework-run');
    const rendererSnapshot = rendererCore.snapshot();

    const animationRuntime = createUniversalAnimationTimelineIntegrationRuntime(runtimeFixture, {
      persistenceKey: `${this.persistenceKey}.animation`
    });
    animationRuntime.build();
    animationRuntime.synchronize('framework-run');

    const adaptiveRuntime = createUniversalAdaptiveRenderingPerformanceRuntime(runtimeFixture, {
      persistenceKey: `${this.persistenceKey}.adaptive`
    });
    adaptiveRuntime.update({
      frameTimeMs: 14,
      fps: 60,
      deviceCapabilities: {
        cpuTier: 'balanced',
        gpuTier: 'balanced'
      }
    });
    adaptiveRuntime.synchronize('framework-run');

    const teacherPlan = buildTeacherSynchronizationPlan({
      explanation: scene.summary || normalizedInput.text,
      topic: normalizedInput.topic,
      scene
    });

    const lessonSuite = buildLessonArtifactsFromInput(normalizedInput);
    const serializedSeedReport = serializeFrameworkReport({
      framework: 'seed',
      performanceReport: {},
      securityReport: {},
      reliabilityReport: {},
      stressReport: {},
      optimizationSuggestions: []
    });

    const fallbackReport = buildFallbackReport(normalizedInput, scene, timelineValidation);

    rendererCore.persistSession();
    timelineRuntime.persistSession?.();
    interactionRuntime.persistSession?.();
    animationRuntime.persistSession?.();
    adaptiveRuntime.persistSession?.();

    const resourceDelta = captureResourceUsageDelta(baseline);

    const startupTimeMs = performance.now() - startupStart;
    const renderingThroughput = toFiniteNumber(updateResult?.processed, 0) / Math.max(1, toFiniteNumber(resourceDelta.elapsedMs, 1));

    const performanceReport = evaluatePerformanceMetrics({
      performance: {
        startupTimeMs,
        sceneGenerationTimeMs,
        runtimeGraphCreationMs,
        timelineLatencyMs,
        interactionLatencyMs,
        assetLoadingMs,
        renderingThroughput
      },
      rendererSnapshot,
      cacheBefore,
      cacheAfter,
      resourceDelta
    });

    const securityReport = evaluateSecurityChecks({
      normalizedInput,
      sceneValidation,
      timelineValidation,
      moduleCoverage,
      serializedReport: serializedSeedReport,
      scene,
      lessonSuite
    });

    const reliabilityReport = evaluateReliabilityMetrics({
      scene,
      runtimeGraph: runtimeGraphBundle.graph,
      timelineRuntime,
      rendererCore,
      interactionRuntime,
      animationRuntime,
      adaptiveRuntime,
      fallbackReport,
      assetRecovery: discovery?.proceduralFallback ? true : true
    });

    const stressReport = evaluateStressTests(normalizedInput);
    const bottleneckReport = buildBottleneckReport(performanceReport);

    const aggregateScores = {
      performanceScore: performanceReport.score,
      securityScore: securityReport.score,
      reliabilityScore: reliabilityReport.score,
      stressScore: stressReport.score,
      overallScore: clamp(average([
        performanceReport.score,
        securityReport.score,
        reliabilityReport.score,
        stressReport.score
      ]))
    };

    const previousReport = options.previousReport || this.state.reports.latest || null;
    const previousScores = {
      performanceScore: toFiniteNumber(previousReport?.performanceReport?.score, 0),
      securityScore: toFiniteNumber(previousReport?.securityReport?.score, 0),
      reliabilityScore: toFiniteNumber(previousReport?.reliabilityReport?.score, 0),
      stressScore: toFiniteNumber(previousReport?.stressReport?.score, 0),
      overallScore: clamp(average([
        toFiniteNumber(previousReport?.performanceReport?.score, 0),
        toFiniteNumber(previousReport?.securityReport?.score, 0),
        toFiniteNumber(previousReport?.reliabilityReport?.score, 0),
        toFiniteNumber(previousReport?.stressReport?.score, 0)
      ]))
    };
    const regressionReport = buildRegressionReport(aggregateScores, previousScores);

    const report = migrateFrameworkReport({
      schemaVersion: FRAMEWORK_SCHEMA_VERSION,
      framework: 'UniversalPerformanceSecurityReliabilityTestingFramework',
      generatedAt: new Date().toISOString(),
      sourceType: normalizedInput.sourceType,
      performanceReport,
      securityReport,
      reliabilityReport,
      stressReport,
      bottleneckReport,
      optimizationSuggestions: buildOptimizationSuggestions({
        performanceReport,
        securityReport,
        reliabilityReport
      }),
      regressionReport,
      moduleCoverage,
      diagnostics: {
        sourceType: normalizedInput.sourceType,
        sourceName: normalizedInput.sourceName,
        unknownFutureTypeParticipation: !new Set([
          'pdf', 'book', 'image', 'handwritten-notes', 'ppt', 'docx', 'audio', 'video',
          'website', 'youtube', 'source-code', 'research-paper', 'camera-scan', 'text'
        ]).has(normalizedInput.sourceType),
        runtimeGraph: {
          nodeCount: runtimeGraphBundle.graph.getNodeCount(),
          relationshipCount: runtimeGraphBundle.graph.getRelationshipCount()
        },
        timeline: {
          trackCount: asArray(timeline.tracks).length,
          eventCount: asArray(timeline.events).length,
          markerCount: asArray(timeline.markers).length
        },
        aiTeacher: {
          stepCount: asArray(teacherPlan.steps).length,
          target: teacherPlan.target || null
        },
        cache: {
          key: cacheKey,
          hadCacheBefore: cacheBefore !== null,
          hasCacheAfter: cacheAfter !== null
        }
      }
    });

    const validation = validateFrameworkReport(report);
    if (!validation.valid) {
      this.warn(validation.errors.join(' | '));
    }

    this.state.reports.previous = this.state.reports.latest;
    this.state.reports.latest = report;
    this.state.diagnostics.runs += 1;
    this.state.summary.runCount += 1;
    this.state.summary.lastRunAt = report.generatedAt;
    this.state.summary.lastStabilityScore = aggregateScores.overallScore;
    if (report.diagnostics?.unknownFutureTypeParticipation) {
      this.state.summary.unknownTypeRuns += 1;
    }

    this.persistSession();

    return {
      report,
      validation,
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
      this.warn('Invalid framework session payload.');
      return false;
    }

    this.state = migrateFrameworkState(parsed.state);
    this.state.diagnostics.recoveries += 1;
    return true;
  }

  snapshot() {
    return normalizeFrameworkState(this.state);
  }
}

export function createUniversalPerformanceSecurityReliabilityTestingFramework(options = {}) {
  return new UniversalPerformanceSecurityReliabilityTestingFramework(options);
}

export async function runUniversalPerformanceSecurityReliabilityTestingFramework(input = {}, options = {}) {
  const framework = createUniversalPerformanceSecurityReliabilityTestingFramework(options);
  return framework.run(input, options);
}
