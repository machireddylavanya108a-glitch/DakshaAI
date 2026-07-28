import { SCENE_SCHEMA_LATEST_VERSION } from './SceneSchema.js';

function now() {
  return Date.now();
}

function truncate(value, max = 240) {
  const text = String(value || '');
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export function createSceneGenerationDiagnostics(seed = {}) {
  return {
    requestId: seed.requestId || `scene-gen-${Math.random().toString(16).slice(2, 10)}`,
    generationKey: seed.generationKey || '',
    provider: seed.provider || 'unknown',
    model: seed.model || null,
    attemptCount: 0,
    retryCount: 0,
    cacheHit: false,
    cacheKey: '',
    inputLength: 0,
    compactedInputLength: 0,
    promptLength: 0,
    outputLength: 0,
    candidateCount: 0,
    selectedCandidateScore: 0,
    normalizationDuration: 0,
    validationDuration: 0,
    repairDuration: 0,
    migrationDuration: 0,
    integrityDuration: 0,
    sceneBuildDuration: 0,
    totalDuration: 0,
    fallbackLevel: 0,
    fallbackReason: '',
    warnings: [],
    errors: [],
    schemaVersion: SCENE_SCHEMA_LATEST_VERSION,
    classificationConfidence: 0,
    sceneConfidence: 0,
    cancelled: false,
    timedOut: false,
    events: [],
    development: {
      rawProviderResponse: null
    }
  };
}

export function addSceneGenerationEvent(diagnostics, event, payload = {}) {
  if (!diagnostics) return;
  diagnostics.events.push({
    event,
    timestamp: new Date().toISOString(),
    payload
  });
}

export function markSceneGenerationTiming(diagnostics, key, value) {
  if (!diagnostics) return;
  diagnostics[key] = Math.max(0, Number(value || 0));
}

export function addSceneGenerationWarning(diagnostics, warning) {
  if (!diagnostics || !warning) return;
  diagnostics.warnings.push(truncate(warning, 500));
}

export function addSceneGenerationError(diagnostics, error) {
  if (!diagnostics || !error) return;
  diagnostics.errors.push(truncate(error, 500));
}

export function beginTimedStage() {
  return now();
}

export function endTimedStage(startTime) {
  return Math.max(0, now() - Number(startTime || now()));
}

export function finalizeSceneGenerationDiagnostics(diagnostics, startTime) {
  if (!diagnostics) return;
  diagnostics.totalDuration = endTimedStage(startTime);
}

export function sanitizeDiagnosticsForOutput(diagnostics, { includeDev = false } = {}) {
  const safe = {
    ...diagnostics,
    development: undefined
  };
  if (includeDev) {
    safe.development = {
      rawProviderResponse: diagnostics?.development?.rawProviderResponse || null
    };
  }
  return safe;
}
