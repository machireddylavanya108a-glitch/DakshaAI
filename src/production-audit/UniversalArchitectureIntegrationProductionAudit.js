import path from 'node:path';
import { promises as fs } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { runUniversalLearningPipeline } from '../services/universalLearningPipeline.js';
import { analyzeUniversalLearningIntent } from '../intent-analysis/index.js';
import { analyzeVisualizationStrategy } from '../visualization-strategy/index.js';
import {
  analyzeCapabilityTemplateRecommendation,
  migrateCapabilityTemplateRecommendation
} from '../recommendation/index.js';
import {
  analyzeUniversalConfidenceConflictFallback,
  migrateConfidenceConflictFallbackProfile
} from '../confidence-fallback/index.js';
import { generateUniversalScene, normalizeSceneGenerationConfig } from '../scene-generator/index.js';
import { validateScene } from '../scene-generator/SceneValidator.js';
import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { buildRuntimeSceneGraph } from '../scene-builder/SceneBuilder.js';
import {
  loadScene,
  destroyScene,
  getActiveRuntimeScene,
  getActiveTimelineSynchronizationRuntime,
  getActiveRendererCore,
  getActiveAnimationTimelineIntegrationRuntime,
  getActiveAdaptiveRenderingPerformanceRuntime
} from '../scene-builder/SceneRuntime.js';
import { buildTimeline, validateTimeline, migrateTimelineVersion } from '../timeline/index.js';
import { buildTeacherSynchronizationPlan } from '../utils/teacherSynchronizationEngine.js';
import { createUniversalInteractionContractRuntime } from '../interactions/index.js';
import {
  createUniversalRendererCore,
  createUniversalAdaptiveRenderingPerformanceRuntime,
  migrateRenderStateProfile
} from '../renderer-core/index.js';

const STORE_KEY = '__daksha_universal_integration_audit_store__';
const FRAMEWORK_SCHEMA_VERSION = 'v1';
const DEFAULT_PERSISTENCE_KEY = 'daksha.universal.integration.production.audit.v1';

const STAGE_ORDER = [
  'Universal Learning Pipeline',
  'Learning Intent Engine',
  'Visualization Strategy Engine',
  'Capability & Template Recommendation',
  'Confidence & Adaptive Fallback',
  'Scene Generator',
  'Scene Validation',
  'Scene Builder',
  'Runtime Graph',
  'Timeline Engine',
  'AI Teacher Synchronization',
  'Interaction Engine',
  'Asset Manager',
  'Renderer Core',
  'Adaptive Rendering',
  'Learning Session'
];

const ARCHITECTURE_ROOTS = [
  'services',
  'intent-analysis',
  'visualization-strategy',
  'recommendation',
  'confidence-fallback',
  'scene-generator',
  'scene-builder',
  'timeline',
  'interactions',
  'utils',
  'renderer-core'
];

const EXCLUDED_SEGMENTS = new Set(['tests', 'components', 'pages', 'layouts', 'styles', 'assets']);
const MODULE_NAME_PATTERN = /(Engine|Runtime|Pipeline|Builder|Validator|Schema|Serializer|Deserializer|Migration|Normalizer|Repair|Integrity|VersionManager|Adapter|Manager|Registry|Contract|Synchronization|Graph)\.js$/i;

const ARCHITECTURE_DISCOVERY_CACHE = new Map();
const DEPENDENCY_VERIFICATION_CACHE = new Map();
const IMPORT_RESOLUTION_CACHE = new Map();

const DISCOVERY_EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.git',
  '.next',
  '.cache',
  'out',
  'build',
  'tmp',
  'temp'
]);

const MAX_DISCOVERY_DEPTH = 16;
const MAX_DISCOVERY_FILES = 6000;
const MAX_DEPENDENCY_GRAPH_DEPTH = 32;
const MAX_DEPENDENCY_GRAPH_NODES = 6000;

const REQUIRED_MODULE_PATH_HINTS = [
  'services/universalLearningPipeline.js',
  'intent-analysis/',
  'visualization-strategy/',
  'recommendation/',
  'confidence-fallback/',
  'scene-generator/',
  'scene-builder/',
  'timeline/',
  'interactions/',
  'utils/assetManager.js',
  'renderer-core/'
];

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

function toPosix(value = '') {
  return String(value || '').replace(/\\/g, '/');
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

function normalizeSourceType(sourceType = '') {
  const normalized = safeString(sourceType).toLowerCase().replace(/[_\s]+/g, '-');
  if (!normalized) return 'text';

  const aliases = {
    pdf: 'pdf',
    book: 'book',
    books: 'book',
    image: 'image',
    handwritten: 'handwritten-notes',
    'handwritten-notes': 'handwritten-notes',
    ppt: 'ppt',
    pptx: 'ppt',
    doc: 'docx',
    docx: 'docx',
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

function normalizeInput(input = {}) {
  const source = isObject(input) ? input : {};
  const sourceType = normalizeSourceType(source.sourceType || source.type || 'text');
  const topic = safeString(source.topic || source.subject || source.title || 'Open Topic') || 'Open Topic';
  const text = safeString(source.text || source.content || source.lesson || source.extractedText || '');
  const sourceName = safeString(source.sourceName || source.filename || source.url || topic || 'universal-source') || 'universal-source';

  return {
    sourceType,
    sourceHint: sourceType,
    sourceName,
    topic,
    title: safeString(source.title || topic || 'Universal Lesson') || 'Universal Lesson',
    text,
    content: text,
    language: safeString(source.language || 'English') || 'English',
    learnerContext: isObject(source.learnerContext) ? source.learnerContext : {}
  };
}

function normalizeAuditState(input = {}) {
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
      lastRunAt: source?.summary?.lastRunAt || null,
      unknownFutureTypeRuns: Math.max(0, toFiniteNumber(source?.summary?.unknownFutureTypeRuns, 0)),
      lastProductionReadinessScore: clamp(source?.summary?.lastProductionReadinessScore, 0, 1)
    },
    reports: {
      latest: isObject(source?.reports?.latest) ? source.reports.latest : null,
      previous: isObject(source?.reports?.previous) ? source.reports.previous : null
    }
  };
}

function createFastLearningPipelineResult(normalizedInput = {}) {
  const extractedText = safeString(normalizedInput.text || `${normalizedInput.topic} learning content`) || `${normalizedInput.topic} learning content`;

  return {
    sourceModel: {
      extractedText
    },
    sourceMeta: {
      contentObject: {
        visualDescription: ''
      }
    },
    learningSession: {
      title: normalizedInput.title,
      summary: extractedText,
      keyConcepts: [normalizedInput.topic],
      learningRoadmap: ['Understand fundamentals', 'Practice application', 'Review and assess'],
      examples: [`Example for ${normalizedInput.topic}`]
    }
  };
}

export function migrateIntegrationAuditState(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === FRAMEWORK_SCHEMA_VERSION) {
    return normalizeAuditState(source);
  }

  return normalizeAuditState({
    schemaVersion: FRAMEWORK_SCHEMA_VERSION,
    diagnostics: {
      runs: source.runs,
      recoveries: source.recoveries,
      warnings: asArray(source.warnings)
    },
    summary: {
      runCount: source.runCount,
      lastRunAt: source.lastRunAt,
      unknownFutureTypeRuns: source.unknownFutureTypeRuns,
      lastProductionReadinessScore: source.productionReadinessScore
    },
    reports: {
      latest: source.latestReport,
      previous: source.previousReport
    }
  });
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function createDiscoveryState(options = {}) {
  return {
    fileCount: 0,
    maxFiles: Math.max(100, toFiniteNumber(options.maxFiles, MAX_DISCOVERY_FILES)),
    maxDepth: Math.max(2, toFiniteNumber(options.maxDepth, MAX_DISCOVERY_DEPTH)),
    truncatedByFileLimit: false,
    truncatedByDepthLimit: false,
    cycleDetected: false,
    cycleDirectories: [],
    visitedDirectories: new Set()
  };
}

async function walkDirectory(directoryPath, files = [], state = createDiscoveryState(), depth = 0) {
  if (depth > state.maxDepth) {
    state.truncatedByDepthLimit = true;
    return files;
  }

  let canonicalPath = directoryPath;
  try {
    canonicalPath = await fs.realpath(directoryPath);
  } catch {
    canonicalPath = directoryPath;
  }

  if (state.visitedDirectories.has(canonicalPath)) {
    state.cycleDetected = true;
    state.cycleDirectories.push(toPosix(canonicalPath));
    return files;
  }
  state.visitedDirectories.add(canonicalPath);

  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    if (state.fileCount >= state.maxFiles) {
      state.truncatedByFileLimit = true;
      break;
    }

    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      const lowerName = String(entry.name || '').toLowerCase();
      if (DISCOVERY_EXCLUDED_DIRS.has(lowerName)) continue;
      await walkDirectory(fullPath, files, state, depth + 1);
    } else if (entry.isFile()) {
      files.push(fullPath);
      state.fileCount += 1;
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

function estimateExportCount(source = '') {
  const exportMatches = source.match(/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|\{)/g);
  return Array.isArray(exportMatches) ? exportMatches.length : 0;
}

async function resolveRelativeImportPath(fromFilePath, importSpecifier) {
  const cacheKey = `${fromFilePath}::${importSpecifier}`;
  if (IMPORT_RESOLUTION_CACHE.has(cacheKey)) {
    return IMPORT_RESOLUTION_CACHE.get(cacheKey);
  }

  const base = path.resolve(path.dirname(fromFilePath), importSpecifier);
  const candidates = [base, `${base}.js`, path.join(base, 'index.js')];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      IMPORT_RESOLUTION_CACHE.set(cacheKey, candidate);
      return candidate;
    }
  }

  IMPORT_RESOLUTION_CACHE.set(cacheKey, null);
  return null;
}

async function discoverArchitectureModules(srcRoot, options = {}) {
  const cacheKey = `${srcRoot}::${toFiniteNumber(options.maxDepth, MAX_DISCOVERY_DEPTH)}::${toFiniteNumber(options.maxFiles, MAX_DISCOVERY_FILES)}`;
  if (ARCHITECTURE_DISCOVERY_CACHE.has(cacheKey)) {
    return ARCHITECTURE_DISCOVERY_CACHE.get(cacheKey);
  }

  const discovered = [];
  const discoveryState = createDiscoveryState(options);

  for (const relativeRoot of ARCHITECTURE_ROOTS) {
    const absoluteRoot = path.join(srcRoot, relativeRoot);
    if (!(await pathExists(absoluteRoot))) continue;

    const files = await walkDirectory(absoluteRoot, [], discoveryState);
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
  discovered.forEach((entry) => uniqueByPath.set(entry.relativePath, entry));
  const sortedModules = [...uniqueByPath.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  const result = {
    modules: sortedModules,
    discoveryDiagnostics: {
      scannedFileCount: discoveryState.fileCount,
      includedModuleCount: sortedModules.length,
      maxDepth: discoveryState.maxDepth,
      maxFiles: discoveryState.maxFiles,
      truncatedByFileLimit: discoveryState.truncatedByFileLimit,
      truncatedByDepthLimit: discoveryState.truncatedByDepthLimit,
      cycleDetected: discoveryState.cycleDetected,
      cycleDirectories: [...new Set(discoveryState.cycleDirectories)].slice(0, 10)
    }
  };

  ARCHITECTURE_DISCOVERY_CACHE.set(cacheKey, result);
  return result;
}

function analyzeDependencyGraph(entries = [], limits = {}) {
  const adjacency = new Map();
  entries.forEach((entry) => {
    adjacency.set(entry.module, new Set(asArray(entry.resolvedInternalImports)));
  });

  const maxDepth = Math.max(2, toFiniteNumber(limits.maxDepth, MAX_DEPENDENCY_GRAPH_DEPTH));
  const maxNodes = Math.max(10, toFiniteNumber(limits.maxNodes, MAX_DEPENDENCY_GRAPH_NODES));
  const globalVisited = new Set();
  const cycles = [];
  let depthLimitHit = false;
  let nodeLimitHit = false;

  function visit(node, stack = [], active = new Set(), depth = 0) {
    if (depth > maxDepth) {
      depthLimitHit = true;
      return;
    }
    if (globalVisited.size > maxNodes) {
      nodeLimitHit = true;
      return;
    }

    if (active.has(node)) {
      const cycleStart = stack.indexOf(node);
      const cyclePath = cycleStart >= 0 ? stack.slice(cycleStart).concat(node) : [node, node];
      cycles.push(cyclePath);
      return;
    }

    if (globalVisited.has(node)) return;

    globalVisited.add(node);
    active.add(node);
    const nextStack = stack.concat(node);

    const neighbors = adjacency.get(node) || new Set();
    neighbors.forEach((neighbor) => {
      if (!adjacency.has(neighbor)) return;
      visit(neighbor, nextStack, active, depth + 1);
    });

    active.delete(node);
  }

  adjacency.forEach((_, node) => {
    if (!globalVisited.has(node)) {
      visit(node, [], new Set(), 0);
    }
  });

  return {
    visitedNodeCount: globalVisited.size,
    cycleCount: cycles.length,
    cycles: cycles.slice(0, 20),
    depthLimitHit,
    nodeLimitHit,
    maxDepth,
    maxNodes
  };
}

function auditLegacyHardcodedPatterns(modules = []) {
  const patterns = [
    {
      id: 'hardcoded-subject-branch',
      regex: /\bif\s*\(\s*subject\s*===|\bswitch\s*\(\s*subject\s*\)/i,
      severity: 'high'
    },
    {
      id: 'fixed-visualization-map',
      regex: /\bvisualizationMap\b|\bsubjectMap\b|\btemplateMap\b/i,
      severity: 'medium'
    },
    {
      id: 'hardcoded-renderer-binding',
      regex: /new\s+WebGLRenderer\s*\(|\brenderer\s*:\s*['"](?:three|babylon|unity)['"]/i,
      severity: 'high'
    },
    {
      id: 'legacy-bypass-import',
      regex: /learning3dUtils|auto3dSceneGenerator|legacyScene/i,
      severity: 'medium'
    }
  ];

  const violations = [];
  modules.forEach((moduleEntry) => {
    patterns.forEach((pattern) => {
      if (pattern.regex.test(moduleEntry.source)) {
        violations.push({
          module: moduleEntry.relativePath,
          ruleId: pattern.id,
          severity: pattern.severity
        });
      }
    });
  });

  return {
    violations,
    highSeverityCount: violations.filter((entry) => entry.severity === 'high').length,
    mediumSeverityCount: violations.filter((entry) => entry.severity === 'medium').length,
    status: violations.length === 0 ? 'pass' : 'warn'
  };
}

async function verifyDependencies(modules = [], options = {}) {
  const cacheKey = modules.map((entry) => `${entry.relativePath}:${entry.fileSizeBytes}`).join('|');
  if (DEPENDENCY_VERIFICATION_CACHE.has(cacheKey)) {
    return DEPENDENCY_VERIFICATION_CACHE.get(cacheKey);
  }

  const entries = [];
  const modulePathSet = new Set(modules.map((entry) => entry.absolutePath));
  const srcRoot = path.resolve(options.srcRoot || path.join(process.cwd(), 'src'));

  for (const moduleEntry of modules) {
    const unresolvedImports = [];
    const resolvedInternalImports = [];
    const loadStart = performance.now();
    const exportCount = estimateExportCount(moduleEntry.source);

    for (const specifier of moduleEntry.importSpecifiers) {
      if (!specifier.startsWith('.')) continue;
      const resolved = await resolveRelativeImportPath(moduleEntry.absolutePath, specifier);
      if (!resolved) {
        unresolvedImports.push(`Unresolved import: ${specifier}`);
      } else if (modulePathSet.has(resolved)) {
        resolvedInternalImports.push(toPosix(path.relative(srcRoot, resolved)));
      }
    }

    entries.push({
      module: moduleEntry.relativePath,
      exportCount,
      importDurationMs: performance.now() - loadStart,
      resolvedInternalImports,
      unresolvedImports,
      valid: unresolvedImports.length === 0
    });
  }

  const graphTraversal = analyzeDependencyGraph(entries, {
    maxDepth: options.maxGraphDepth,
    maxNodes: options.maxGraphNodes
  });

  const requiredCoverage = REQUIRED_MODULE_PATH_HINTS.map((hint) => ({
    hint,
    covered: modules.some((moduleEntry) => moduleEntry.relativePath.includes(hint))
  }));

  const verification = {
    entries,
    graphTraversal,
    requiredCoverage,
    valid: entries.every((entry) => entry.valid)
      && requiredCoverage.every((entry) => entry.covered)
      && graphTraversal.nodeLimitHit === false
  };

  DEPENDENCY_VERIFICATION_CACHE.set(cacheKey, verification);
  return verification;
}

function buildRuntimeFixture(runtimeGraphBundle, timeline, scene) {
  return {
    sceneId: scene.sceneId,
    metadata: {
      timeline,
      timelineData: timeline,
      rendererAdapter: {}
    },
    graph: {
      toJSON: () => runtimeGraphBundle.graph.toJSON(),
      getNodeCount: () => runtimeGraphBundle.graph.getNodeCount(),
      getRelationshipCount: () => runtimeGraphBundle.graph.getRelationshipCount()
    }
  };
}

function buildConfigurationVerification() {
  const sceneConfig = normalizeSceneGenerationConfig({ performanceProfile: 'balanced' });

  return {
    sceneGenerationConfig: {
      valid: isObject(sceneConfig) && safeString(sceneConfig.schemaVersion).length > 0,
      schemaVersion: sceneConfig?.schemaVersion || null,
      performanceProfile: sceneConfig?.performanceProfile || null
    },
    status: isObject(sceneConfig) && safeString(sceneConfig.schemaVersion).length > 0 ? 'pass' : 'fail'
  };
}

function summarizeDiagnostics(runtime) {
  return {
    rendererCore: runtime?.rendererCore?.snapshot?.()?.diagnostics || null,
    animationTimelineIntegration: runtime?.animationTimelineIntegrationRuntime?.snapshot?.()?.diagnostics || null,
    adaptiveRenderingPerformance: runtime?.adaptiveRenderingPerformanceRuntime?.snapshot?.()?.diagnostics || null,
    interactionContract: runtime?.interactionContractRuntime?.snapshot?.()?.diagnostics || null,
    timelineSynchronization: runtime?.timelineSynchronizationRuntime?.snapshot?.()?.session || null
  };
}

function buildRuntimeCapabilityReport(context = {}) {
  const runtime = context.runtime || {};
  const timeline = context.timeline || {};
  const sharedState = context.sharedState || {};

  return {
    rendererChannels: asArray(runtime?.rendererCore?.constructor?.supportedChannels?.()),
    adaptiveChannels: asArray(runtime?.adaptiveRenderingPerformanceRuntime?.constructor?.supportedChannels?.()),
    interactionChannels: asArray(runtime?.interactionContractRuntime?.constructor?.supportedChannels?.()),
    timelineTrackCount: asArray(timeline.tracks).length,
    timelineEventCount: asArray(timeline.events).length,
    runtimeGraphNodeCount: toFiniteNumber(sharedState?.runtimeGraph?.nodeCount, 0),
    runtimeGraphRelationshipCount: toFiniteNumber(sharedState?.runtimeGraph?.relationshipCount, 0),
    aiTeacherSyncAvailable: Boolean(sharedState?.adapters?.aiTeacher),
    rendererSyncAvailable: Boolean(sharedState?.adapters?.rendererAdapter),
    interactionSyncAvailable: Boolean(sharedState?.adapters?.interactionEngine)
  };
}

function buildContractVerification(context = {}) {
  const runtime = context.runtime || {};
  const sharedState = context.sharedState || {};
  const sceneMetadata = context.sceneMetadata || {};

  const requiredSceneMetadata = [
    'visualizationStrategy',
    'capabilityTemplateRecommendation',
    'confidenceConflictFallback',
    'assetRegistry',
    'assetDiscovery',
    'assetLoading'
  ];

  const missingSceneMetadata = requiredSceneMetadata.filter((key) => !isObject(sceneMetadata[key]));

  const adapters = sharedState?.adapters || {};
  const adapterChecks = {
    aiTeacher: isObject(adapters.aiTeacher),
    rendererAdapter: isObject(adapters.rendererAdapter),
    interactionEngine: isObject(adapters.interactionEngine)
  };

  const runtimeChecks = {
    rendererCore: Boolean(runtime?.rendererCore),
    animationTimelineIntegrationRuntime: Boolean(runtime?.animationTimelineIntegrationRuntime),
    adaptiveRenderingPerformanceRuntime: Boolean(runtime?.adaptiveRenderingPerformanceRuntime),
    interactionContractRuntime: Boolean(runtime?.interactionContractRuntime),
    timelineSynchronizationRuntime: Boolean(runtime?.timelineSynchronizationRuntime)
  };

  const status = missingSceneMetadata.length === 0
    && Object.values(adapterChecks).every(Boolean)
    && Object.values(runtimeChecks).every(Boolean)
    ? 'pass'
    : 'fail';

  return {
    status,
    missingSceneMetadata,
    adapterChecks,
    runtimeChecks
  };
}

function buildVersionCompatibilityVerification() {
  const migrationChecks = [];

  const timelineMigrated = migrateTimelineVersion({ version: 'v1', timeline: [] }, 'v2');
  migrationChecks.push({
    name: 'timeline',
    valid: safeString(timelineMigrated.version) === 'v2'
  });

  const recommendationMigrated = migrateCapabilityTemplateRecommendation({
    schemaVersion: 'v1',
    templates: [],
    capabilities: []
  });
  migrationChecks.push({
    name: 'template-recommendation',
    valid: safeString(recommendationMigrated.schemaVersion) === 'v2'
  });

  const confidenceMigrated = migrateConfidenceConflictFallbackProfile({
    schemaVersion: 'v1',
    conflicts: []
  });
  migrationChecks.push({
    name: 'confidence-fallback',
    valid: safeString(confidenceMigrated.schemaVersion) === 'v2'
  });

  const rendererMigrated = migrateRenderStateProfile({
    state: { frame: 2 },
    renderQueue: { pending: [] }
  });
  migrationChecks.push({
    name: 'renderer-core',
    valid: safeString(rendererMigrated.schemaVersion) === 'v1'
  });

  return {
    checks: migrationChecks,
    status: migrationChecks.every((entry) => entry.valid) ? 'pass' : 'fail'
  };
}

function buildRuntimeInitializationVerification(runtime) {
  const checks = {
    runtimeAvailable: Boolean(runtime),
    rendererCore: Boolean(runtime?.rendererCore),
    animationTimelineIntegration: Boolean(runtime?.animationTimelineIntegrationRuntime),
    adaptiveRenderingPerformance: Boolean(runtime?.adaptiveRenderingPerformanceRuntime),
    interactionContract: Boolean(runtime?.interactionContractRuntime),
    timelineSynchronization: Boolean(runtime?.timelineSynchronizationRuntime),
    assetLoading: Boolean(runtime?.assetLoadingRuntime)
  };

  return {
    checks,
    status: Object.values(checks).every(Boolean) ? 'pass' : 'fail'
  };
}

function buildRuntimeShutdownVerification(beforeDestroyRuntime, destroyedRuntime) {
  const checks = {
    destroyReturnedRuntime: Boolean(destroyedRuntime),
    rendererDestroyed: safeString(beforeDestroyRuntime?.rendererCore?.snapshot?.()?.lifecycle?.status) === 'destroyed'
      || safeString(destroyedRuntime?.rendererCore?.snapshot?.()?.lifecycle?.status) === 'destroyed',
    graphCleared: toFiniteNumber(destroyedRuntime?.graph?.nodes?.size, 0) === 0,
    stateManagerDestroyed: typeof destroyedRuntime?.stateManager?.destroyAll === 'function'
  };

  return {
    checks,
    status: checks.destroyReturnedRuntime && checks.graphCleared ? 'pass' : 'fail'
  };
}

function buildRecoveryVerification(runtime) {
  const checks = {
    rendererCoreRecovery: runtime?.rendererCore?.recoverSession?.() !== false,
    animationRecovery: runtime?.animationTimelineIntegrationRuntime?.recoverSession?.() !== false,
    adaptiveRecovery: runtime?.adaptiveRenderingPerformanceRuntime?.recoverSession?.() !== false,
    timelineSyncRecovery: runtime?.timelineSynchronizationRuntime?.recoverSession?.() !== false,
    interactionRecovery: runtime?.interactionContractRuntime?.recoverSession?.() !== false,
    assetRecovery: runtime?.assetLoadingRuntime?.recoverSession?.() !== false
  };

  return {
    checks,
    status: Object.values(checks).every(Boolean) ? 'pass' : 'warn'
  };
}

function buildLifecycleVerification(startup, shutdown, recovery) {
  return {
    startup,
    shutdown,
    recovery,
    status: startup.status === 'pass' && shutdown.status === 'pass' && (recovery.status === 'pass' || recovery.status === 'warn')
      ? 'pass'
      : 'fail'
  };
}

function buildProductionHealthReport(context = {}) {
  const dependencyVerification = context.dependencyVerification || {};
  const lifecycleVerification = context.lifecycleVerification || {};
  const configurationVerification = context.configurationVerification || {};
  const contractVerification = context.contractVerification || {};
  const versionCompatibilityVerification = context.versionCompatibilityVerification || {};
  const pipelineStages = context.pipelineStages || [];

  const stageScore = clamp(average(pipelineStages.map((stage) => stage.status === 'pass' ? 1 : 0)), 0, 1);
  const score = clamp(average([
    dependencyVerification.valid ? 1 : 0,
    lifecycleVerification.status === 'pass' ? 1 : 0,
    configurationVerification.status === 'pass' ? 1 : 0,
    contractVerification.status === 'pass' ? 1 : 0,
    versionCompatibilityVerification.status === 'pass' ? 1 : 0,
    stageScore
  ]));

  return {
    productionReadinessScore: score,
    status: score >= 0.85 ? 'ready' : score >= 0.65 ? 'review' : 'blocked',
    pipelineStagePassRate: stageScore,
    recommendations: score >= 0.85
      ? ['Production readiness checks are healthy. Continue regression monitoring.']
      : [
        'Review failing or warning integration stages before production rollout.',
        'Validate contract metadata propagation through timeline synchronization adapters.',
        'Re-run full integration audit after resolving dependency/configuration issues.'
      ]
  };
}

function buildFinalArchitectureAuditReport(context = {}) {
  const dependencyVerification = context.dependencyVerification || {};
  const contractVerification = context.contractVerification || {};
  const legacyAudit = context.legacyAudit || {};
  const lifecycleVerification = context.lifecycleVerification || {};
  const productionHealthReport = context.productionHealthReport || {};

  return {
    status: dependencyVerification.valid
      && contractVerification.status === 'pass'
      && legacyAudit.highSeverityCount === 0
      && lifecycleVerification.status === 'pass'
      && productionHealthReport.status !== 'blocked'
      ? 'pass'
      : 'warn',
    dependencyVerification,
    contractVerification,
    legacyAudit,
    lifecycleVerification,
    productionHealthReport
  };
}

function buildRegressionReport(currentReport, previousReport) {
  const currentScore = toFiniteNumber(currentReport?.productionHealthReport?.productionReadinessScore, 0);
  const previousScore = toFiniteNumber(previousReport?.productionHealthReport?.productionReadinessScore, 0);
  return {
    currentScore,
    previousScore,
    delta: currentScore - previousScore,
    trend: currentScore > previousScore ? 'improved' : currentScore < previousScore ? 'regressed' : 'stable'
  };
}

export function validateIntegrationAuditReport(report = {}) {
  const source = isObject(report) ? report : {};
  const errors = [];

  if (!safeString(source.framework)) errors.push('Missing framework name.');
  if (!Array.isArray(source.pipelineStages)) errors.push('Missing pipeline stage report.');
  if (!isObject(source.dependencyVerification)) errors.push('Missing dependency verification report.');
  if (!isObject(source.lifecycleVerification)) errors.push('Missing lifecycle verification report.');
  if (!isObject(source.productionHealthReport)) errors.push('Missing production health report.');
  if (!isObject(source.runtimeCapabilityReport)) errors.push('Missing runtime capability report.');
  if (!isObject(source.finalArchitectureAuditReport)) errors.push('Missing final architecture audit report.');

  return {
    valid: errors.length === 0,
    errors,
    status: errors.length === 0 ? 'valid' : 'invalid'
  };
}

export function migrateIntegrationAuditReport(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === FRAMEWORK_SCHEMA_VERSION) {
    return {
      ...source,
      schemaVersion: FRAMEWORK_SCHEMA_VERSION
    };
  }

  return {
    schemaVersion: FRAMEWORK_SCHEMA_VERSION,
    framework: safeString(source.framework || 'UniversalArchitectureIntegrationProductionAudit') || 'UniversalArchitectureIntegrationProductionAudit',
    generatedAt: source.generatedAt || new Date().toISOString(),
    sourceType: normalizeSourceType(source.sourceType || source?.input?.sourceType || 'text'),
    pipelineStages: asArray(source.pipelineStages || source.stages),
    dependencyVerification: isObject(source.dependencyVerification) ? source.dependencyVerification : {},
    lifecycleVerification: isObject(source.lifecycleVerification) ? source.lifecycleVerification : {},
    configurationVerification: isObject(source.configurationVerification) ? source.configurationVerification : {},
    contractVerification: isObject(source.contractVerification) ? source.contractVerification : {},
    versionCompatibilityVerification: isObject(source.versionCompatibilityVerification) ? source.versionCompatibilityVerification : {},
    diagnosticsAggregation: isObject(source.diagnosticsAggregation) ? source.diagnosticsAggregation : {},
    productionHealthReport: isObject(source.productionHealthReport) ? source.productionHealthReport : {
      productionReadinessScore: clamp(source.productionReadinessScore, 0, 1),
      status: 'review',
      pipelineStagePassRate: 0,
      recommendations: []
    },
    runtimeCapabilityReport: isObject(source.runtimeCapabilityReport) ? source.runtimeCapabilityReport : {},
    finalArchitectureAuditReport: isObject(source.finalArchitectureAuditReport) ? source.finalArchitectureAuditReport : {},
    regressionReport: isObject(source.regressionReport) ? source.regressionReport : {
      currentScore: 0,
      previousScore: 0,
      delta: 0,
      trend: 'stable'
    }
  };
}

export function serializeIntegrationAuditReport(report = {}) {
  return JSON.stringify({
    schemaVersion: FRAMEWORK_SCHEMA_VERSION,
    report,
    serializedAt: Date.now()
  });
}

export function deserializeIntegrationAuditReport(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    return {
      report: null,
      validation: {
        status: 'fallback',
        valid: false,
        errors: ['Failed to parse integration audit payload.']
      }
    };
  }

  const report = migrateIntegrationAuditReport(isObject(parsed.report) ? parsed.report : parsed);
  const validation = validateIntegrationAuditReport(report);
  return {
    report,
    validation
  };
}

export class UniversalArchitectureIntegrationProductionAudit {
  constructor(options = {}) {
    this.options = isObject(options) ? options : {};
    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey) || DEFAULT_PERSISTENCE_KEY;
    this.state = normalizeAuditState({
      diagnostics: {
        runs: 0,
        recoveries: 0,
        warnings: []
      },
      summary: {
        runCount: 0,
        lastRunAt: null,
        unknownFutureTypeRuns: 0,
        lastProductionReadinessScore: 0
      },
      reports: {
        latest: null,
        previous: null
      }
    });

    this.recoverSession();
  }

  warn(message = 'Unknown integration audit warning') {
    this.state.diagnostics.warnings.push(safeString(message));
    if (this.state.diagnostics.warnings.length > 300) {
      this.state.diagnostics.warnings.shift();
    }
  }

  createProgressLogger(options = {}) {
    const logger = typeof options.progressLogger === 'function' ? options.progressLogger : null;
    const verbose = options.debugProgress === true;

    return (step, phase, label, details = {}) => {
      const payload = {
        step,
        phase,
        label,
        details,
        timestamp: Date.now(),
        message: `STEP ${step} ${phase.toUpperCase()} ${label}`
      };

      if (logger) {
        logger(payload);
        return;
      }

      if (verbose) {
        console.log(`[UniversalArchitectureIntegrationProductionAudit] ${payload.message}`, details);
      }
    };
  }

  async run(input = {}, options = {}) {
    const normalizedInput = normalizeInput(input);
    const start = performance.now();
    const progress = this.createProgressLogger(options);
    const fastMode = options.fastMode === true;

    const srcRoot = path.resolve(options.srcRoot || path.join(process.cwd(), 'src'));
    progress(1, 'before', 'module discovery', {
      srcRoot,
      restrictedToSrc: true,
      exclusions: [...DISCOVERY_EXCLUDED_DIRS]
    });
    const discovery = await discoverArchitectureModules(srcRoot, {
      maxDepth: options.maxDiscoveryDepth,
      maxFiles: options.maxDiscoveryFiles
    });
    const modules = discovery.modules;
    progress(1, 'after', 'module discovery', discovery.discoveryDiagnostics);

    progress(2, 'before', 'export analysis', {
      moduleCount: modules.length
    });
    const exportAnalysis = {
      moduleCount: modules.length,
      totalExportCount: modules.reduce((sum, moduleEntry) => sum + estimateExportCount(moduleEntry.source), 0)
    };
    progress(2, 'after', 'export analysis', exportAnalysis);

    progress(4, 'before', 'dependency validation', {
      moduleCount: modules.length
    });
    const dependencyVerification = await verifyDependencies(modules, {
      srcRoot,
      maxGraphDepth: options.maxGraphDepth,
      maxGraphNodes: options.maxGraphNodes
    });
    progress(4, 'after', 'dependency validation', {
      entryCount: dependencyVerification.entries.length,
      unresolvedModuleCount: dependencyVerification.entries.filter((entry) => entry.valid === false).length,
      cycleCount: dependencyVerification.graphTraversal?.cycleCount || 0,
      nodeLimitHit: dependencyVerification.graphTraversal?.nodeLimitHit || false,
      depthLimitHit: dependencyVerification.graphTraversal?.depthLimitHit || false
    });

    const legacyAudit = auditLegacyHardcodedPatterns(modules);

    const pipelineStages = [];
    const pushStage = (name, status, details = {}) => {
      pipelineStages.push({ stage: name, status, details });
    };

    const learningPipelineResult = fastMode
      ? createFastLearningPipelineResult(normalizedInput)
      : await runUniversalLearningPipeline({
        text: normalizedInput.text,
        sourceHint: normalizedInput.sourceHint,
        sourceName: normalizedInput.sourceName
      });
    pushStage('Universal Learning Pipeline', learningPipelineResult ? 'pass' : 'fail', {
      sourceType: normalizedInput.sourceType
    });

    const intentProfile = analyzeUniversalLearningIntent({
      sourceType: normalizedInput.sourceType,
      sourceName: normalizedInput.sourceName,
      content: learningPipelineResult?.sourceModel?.extractedText || normalizedInput.text,
      visualDescription: learningPipelineResult?.sourceMeta?.contentObject?.visualDescription || ''
    });
    pushStage('Learning Intent Engine', intentProfile ? 'pass' : 'fail', {
      confidence: toFiniteNumber(intentProfile?.confidenceScore, 0)
    });

    const visualizationStrategy = analyzeVisualizationStrategy({
      sourceType: normalizedInput.sourceType,
      sourceName: normalizedInput.sourceName,
      content: learningPipelineResult?.sourceModel?.extractedText || normalizedInput.text,
      intent: intentProfile
    });
    pushStage('Visualization Strategy Engine', visualizationStrategy ? 'pass' : 'fail', {
      confidence: toFiniteNumber(visualizationStrategy?.confidenceScore, 0)
    });

    const capabilityTemplateRecommendation = analyzeCapabilityTemplateRecommendation({
      learningIntent: intentProfile,
      visualizationStrategy,
      sceneGraph: { nodeCount: 0, relationshipCount: 0 },
      runtimeGraph: { nodeCount: 0, relationshipCount: 0 },
      timeline: { events: [] },
      lessonMetadata: {
        lessonId: normalizedInput.sourceName,
        title: normalizedInput.title,
        topic: normalizedInput.topic,
        sourceType: normalizedInput.sourceType,
        learnerContext: normalizedInput.learnerContext
      },
      concepts: asArray(learningPipelineResult?.learningSession?.keyConcepts),
      relationships: [],
      steps: [],
      goals: asArray(learningPipelineResult?.learningSession?.learningRoadmap),
      examples: asArray(learningPipelineResult?.learningSession?.examples),
      interactions: []
    });
    pushStage('Capability & Template Recommendation', capabilityTemplateRecommendation ? 'pass' : 'fail', {
      confidence: toFiniteNumber(capabilityTemplateRecommendation?.confidenceScore, 0)
    });

    const confidenceProfile = analyzeUniversalConfidenceConflictFallback({
      learningIntent: intentProfile,
      visualizationStrategy,
      templateRecommendation: capabilityTemplateRecommendation,
      sceneGraph: { nodeCount: 0, relationshipCount: 0 },
      timeline: [],
      runtimeGraph: { nodeCount: 0, relationshipCount: 0 },
      aiConfidenceMetadata: {
        confidence: toFiniteNumber(intentProfile?.confidenceScore, 0.5),
        overallConfidence: toFiniteNumber(intentProfile?.confidenceScore, 0.5)
      },
      scene: {
        title: normalizedInput.title,
        subject: normalizedInput.topic,
        objects: [],
        timeline: []
      }
    });
    pushStage('Confidence & Adaptive Fallback', confidenceProfile ? 'pass' : 'fail', {
      overallConfidence: toFiniteNumber(confidenceProfile?.overallConfidence, 0)
    });

    const sceneGeneration = fastMode
      ? {
        status: 'fast-mode',
        scene: processSceneJsonPipeline({
          title: normalizedInput.title,
          subject: normalizedInput.topic,
          objects: [
            {
              id: `node-${normalizedInput.sourceName}`,
              type: 'concept-node',
              label: normalizedInput.topic,
              position: { x: 0, y: 0, z: 0 },
              metadata: {}
            }
          ]
        })
      }
      : await generateUniversalScene({
        id: normalizedInput.sourceName,
        title: normalizedInput.title,
        topic: normalizedInput.topic,
        content: [learningPipelineResult?.sourceModel?.extractedText || normalizedInput.text],
        goals: asArray(learningPipelineResult?.learningSession?.learningRoadmap),
        examples: asArray(learningPipelineResult?.learningSession?.examples),
        classification: {
          intentProfile,
          visualizationStrategy,
          confidenceConflictFallback: confidenceProfile
        },
        visualizationStrategy,
        sourceMetadata: {
          source: normalizedInput.sourceType,
          sourceName: normalizedInput.sourceName
        },
        learnerContext: normalizedInput.learnerContext
      }, {
        useAI: false,
        performanceProfile: 'balanced'
      });
    const generatedScene = sceneGeneration?.scene || processSceneJsonPipeline({
      title: normalizedInput.title,
      subject: normalizedInput.topic,
      objects: []
    });
    pushStage('Scene Generator', generatedScene ? 'pass' : 'fail', {
      status: safeString(sceneGeneration?.status || 'unknown')
    });

    const sceneValidation = validateScene(generatedScene);
    pushStage('Scene Validation', sceneValidation.status === 'valid' ? 'pass' : 'warn', {
      status: sceneValidation.status,
      errorCount: asArray(sceneValidation.errors).length
    });

    const runtimeGraphBundle = buildRuntimeSceneGraph(generatedScene);
    pushStage('Scene Builder', runtimeGraphBundle?.graph ? 'pass' : 'fail', {
      sceneId: generatedScene.sceneId
    });

    pushStage('Runtime Graph', runtimeGraphBundle?.graph?.getNodeCount?.() >= 1 ? 'pass' : 'warn', {
      nodeCount: runtimeGraphBundle?.graph?.getNodeCount?.() || 0,
      relationshipCount: runtimeGraphBundle?.graph?.getRelationshipCount?.() || 0
    });

    const timeline = buildTimeline(generatedScene);
    const timelineValidation = validateTimeline(timeline);
    pushStage('Timeline Engine', timelineValidation.valid === true ? 'pass' : 'warn', {
      trackCount: asArray(timeline.tracks).length,
      eventCount: asArray(timeline.events).length
    });

    const teacherSync = buildTeacherSynchronizationPlan({
      explanation: learningPipelineResult?.learningSession?.summary || normalizedInput.text,
      topic: normalizedInput.topic,
      scene: generatedScene
    });
    pushStage('AI Teacher Synchronization', asArray(teacherSync.steps).length >= 3 ? 'pass' : 'warn', {
      stepCount: asArray(teacherSync.steps).length
    });

    const runtimeFixture = buildRuntimeFixture(runtimeGraphBundle, timeline, generatedScene);
    const interactionRuntime = createUniversalInteractionContractRuntime(runtimeFixture, {
      persistenceKey: `${this.persistenceKey}.interaction`
    });
    interactionRuntime.emitInteractionEvent({
      type: 'inspect',
      targetObjectIds: [generatedScene?.objects?.[0]?.id || generatedScene.sceneId],
      payload: { source: 'integration-audit' }
    });
    pushStage('Interaction Engine', interactionRuntime ? 'pass' : 'fail', {
      contractCount: toFiniteNumber(interactionRuntime?.snapshot?.()?.metrics?.contractCount, 0)
    });

    const assetDiscovery = fastMode
      ? {
        selectedAssets: [],
        rankedCandidates: []
      }
      : createAssetManager().discoverAssets({
        query: normalizedInput.text || normalizedInput.topic,
        category: intentProfile?.knowledgeDomain || normalizedInput.topic,
        learningIntent: intentProfile,
        visualizationStrategy,
        capabilityRecommendation: capabilityTemplateRecommendation,
        sceneMetadata: {
          sceneId: generatedScene.sceneId,
          sourceType: normalizedInput.sourceType
        },
        runtimeGraph: {
          nodeCount: runtimeGraphBundle.graph.getNodeCount(),
          relationshipCount: runtimeGraphBundle.graph.getRelationshipCount()
        }
      });
    pushStage('Asset Manager', assetDiscovery ? 'pass' : 'fail', {
      selectedAssets: asArray(assetDiscovery.selectedAssets).length,
      rankedCandidates: asArray(assetDiscovery.rankedCandidates).length
    });

    const rendererCore = createUniversalRendererCore(runtimeFixture, {
      persistenceKey: `${this.persistenceKey}.renderer`,
      adapterProfile: {
        strictInputValidation: false,
        includeGenericUnknownNodes: true
      }
    });
    rendererCore.initialize({ sceneId: generatedScene.sceneId });
    rendererCore.build({ runtimeGraph: runtimeGraphBundle.graph.toJSON() });
    rendererCore.synchronize('integration-audit');
    pushStage('Renderer Core', rendererCore?.snapshot?.()?.lifecycle?.built ? 'pass' : 'warn', {
      mode: rendererCore?.snapshot?.()?.renderState?.mode || 'unknown'
    });

    const adaptiveRenderer = createUniversalAdaptiveRenderingPerformanceRuntime(runtimeFixture, {
      persistenceKey: `${this.persistenceKey}.adaptive`
    });
    adaptiveRenderer.build({
      deviceCapabilities: runtimeFixture?.metadata?.deviceCapabilities || {},
      userPreferences: runtimeFixture?.metadata?.userPreferences || {}
    });
    adaptiveRenderer.synchronize('integration-audit');
    pushStage('Adaptive Rendering', adaptiveRenderer ? 'pass' : 'fail', {
      mode: adaptiveRenderer?.snapshot?.()?.adaptiveRenderer?.activeMode || 'unknown'
    });

    pushStage('Learning Session', learningPipelineResult?.learningSession ? 'pass' : 'fail', {
      title: safeString(learningPipelineResult?.learningSession?.title || '')
    });

    progress(5, 'before', 'runtime initialization', {
      sceneId: generatedScene.sceneId
    });

    let startupVerification = null;
    let shutdownVerification = null;
    let recoveryVerification = null;
    let lifecycleVerification = null;
    let runtimeBeforeDestroy = null;
    let sharedState = {};
    let contractVerification = null;

    try {
      const loadedRuntime = loadScene(generatedScene);
      startupVerification = buildRuntimeInitializationVerification({
        ...loadedRuntime,
        rendererCore: getActiveRendererCore(),
        animationTimelineIntegrationRuntime: getActiveAnimationTimelineIntegrationRuntime(),
        adaptiveRenderingPerformanceRuntime: getActiveAdaptiveRenderingPerformanceRuntime(),
        timelineSynchronizationRuntime: getActiveTimelineSynchronizationRuntime()
      });
      progress(5, 'after', 'runtime initialization', {
        status: startupVerification.status
      });

      runtimeBeforeDestroy = getActiveRuntimeScene();
      progress(5, 'before', 'runtime recovery verification', {});
      recoveryVerification = buildRecoveryVerification(runtimeBeforeDestroy);
      progress(5, 'after', 'runtime recovery verification', {
        status: recoveryVerification.status
      });
      sharedState = runtimeBeforeDestroy?.timelineSynchronizationRuntime?.getSharedState?.() || {};

      progress(3, 'before', 'contract validation', {
        sceneId: generatedScene.sceneId
      });
      contractVerification = buildContractVerification({
        runtime: runtimeBeforeDestroy,
        sharedState,
        sceneMetadata: runtimeGraphBundle?.metadata || {}
      });
      progress(3, 'after', 'contract validation', {
        status: contractVerification.status,
        missingSceneMetadata: contractVerification.missingSceneMetadata
      });
    } finally {
      progress(6, 'before', 'scene/runtime cleanup', {
        hasActiveRuntime: Boolean(getActiveRuntimeScene())
      });

      const activeRuntime = getActiveRuntimeScene();
      if (activeRuntime?.timelineScheduler?.stop) {
        activeRuntime.timelineScheduler.stop('integration-audit-cleanup');
      }
      if (activeRuntime?.timelineScheduler?.listeners instanceof Map) {
        activeRuntime.timelineScheduler.listeners.clear();
      }

      const destroyedRuntime = destroyScene();
      shutdownVerification = buildRuntimeShutdownVerification(runtimeBeforeDestroy || activeRuntime, destroyedRuntime);
      lifecycleVerification = buildLifecycleVerification(startupVerification || { status: 'fail', checks: {} }, shutdownVerification, recoveryVerification || {
        status: 'warn',
        checks: {}
      });

      progress(6, 'after', 'scene/runtime cleanup', {
        shutdownStatus: shutdownVerification.status,
        lifecycleStatus: lifecycleVerification.status
      });
    }

    if (!contractVerification) {
      contractVerification = buildContractVerification({
        runtime: runtimeBeforeDestroy,
        sharedState,
        sceneMetadata: runtimeGraphBundle?.metadata || {}
      });
    }

    progress(7, 'before', 'diagnostics generation', {
      hasRuntime: Boolean(runtimeBeforeDestroy)
    });
    const configurationVerification = buildConfigurationVerification();
    const versionCompatibilityVerification = buildVersionCompatibilityVerification();
    const diagnosticsAggregation = summarizeDiagnostics(runtimeBeforeDestroy);
    const runtimeCapabilityReport = buildRuntimeCapabilityReport({
      runtime: runtimeBeforeDestroy,
      timeline,
      sharedState
    });

    const productionHealthReport = buildProductionHealthReport({
      dependencyVerification,
      lifecycleVerification,
      configurationVerification,
      contractVerification,
      versionCompatibilityVerification,
      pipelineStages
    });
    progress(7, 'after', 'diagnostics generation', {
      productionReadinessPreview: toFiniteNumber(productionHealthReport?.productionReadinessScore, 0),
      capabilityTimelineTracks: runtimeCapabilityReport.timelineTrackCount
    });

    const finalArchitectureAuditReport = buildFinalArchitectureAuditReport({
      dependencyVerification,
      contractVerification,
      legacyAudit,
      lifecycleVerification,
      productionHealthReport
    });

    const regressionReport = buildRegressionReport({
      productionHealthReport
    }, this.state.reports.latest);

    const report = migrateIntegrationAuditReport({
      schemaVersion: FRAMEWORK_SCHEMA_VERSION,
      framework: 'UniversalArchitectureIntegrationProductionAudit',
      generatedAt: new Date().toISOString(),
      sourceType: normalizedInput.sourceType,
      durationMs: performance.now() - start,
      discoveryDiagnostics: discovery.discoveryDiagnostics,
      exportAnalysis,
      pipelineStages,
      dependencyVerification,
      lifecycleVerification,
      runtimeInitializationVerification: startupVerification,
      runtimeShutdownVerification: shutdownVerification,
      recoveryVerification,
      versionCompatibilityVerification,
      configurationVerification,
      contractVerification,
      diagnosticsAggregation,
      productionHealthReport,
      runtimeCapabilityReport,
      finalArchitectureAuditReport,
      regressionReport
    });

    const validation = validateIntegrationAuditReport(report);
    progress(8, 'before', 'final assertion', {
      reportStatus: report?.finalArchitectureAuditReport?.status || 'unknown'
    });
    if (!validation.valid) {
      this.warn(validation.errors.join(' | '));
    }
    progress(8, 'after', 'final assertion', {
      valid: validation.valid,
      errorCount: validation.errors.length
    });

    this.state.reports.previous = this.state.reports.latest;
    this.state.reports.latest = report;
    this.state.diagnostics.runs += 1;
    this.state.summary.runCount += 1;
    this.state.summary.lastRunAt = report.generatedAt;
    this.state.summary.lastProductionReadinessScore = toFiniteNumber(report?.productionHealthReport?.productionReadinessScore, 0);

    const knownTypes = new Set([
      'pdf', 'book', 'image', 'handwritten-notes', 'ppt', 'docx', 'audio', 'video',
      'website', 'youtube', 'source-code', 'research-paper', 'camera-scan', 'text'
    ]);
    if (!knownTypes.has(normalizedInput.sourceType)) {
      this.state.summary.unknownFutureTypeRuns += 1;
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
      this.warn('Failed to recover integration audit session.');
      return false;
    }

    this.state = migrateIntegrationAuditState(parsed.state);
    this.state.diagnostics.recoveries += 1;
    return true;
  }

  snapshot() {
    return normalizeAuditState(this.state);
  }
}

export function createUniversalArchitectureIntegrationProductionAudit(options = {}) {
  return new UniversalArchitectureIntegrationProductionAudit(options);
}

export async function runUniversalArchitectureIntegrationProductionAudit(input = {}, options = {}) {
  const runtime = createUniversalArchitectureIntegrationProductionAudit(options);
  return runtime.run(input, options);
}
