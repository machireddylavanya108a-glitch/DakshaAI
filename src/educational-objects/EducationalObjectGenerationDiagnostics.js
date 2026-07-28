function now() {
  return Date.now();
}

function toFinite(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function uniqueStrings(items = []) {
  return [...new Set((Array.isArray(items) ? items : []).map((item) => String(item)))];
}

export function createEducationalObjectGenerationDiagnostics(seed = {}) {
  const startedAt = now();
  return {
    requestId: String(seed.requestId || `object-generation-${startedAt}`),
    source: 'procedural',
    generationFingerprint: '',
    profile: 'balanced',
    cacheHit: false,
    deduplicated: false,
    fallbackLevel: 0,
    fallbackReason: '',
    objectCount: 0,
    instanceCount: 0,
    blueprintDuration: 0,
    generationDuration: 0,
    refinementDuration: 0,
    simplificationDuration: 0,
    salvageDuration: 0,
    qualityDuration: 0,
    validationDuration: 0,
    instantiationDuration: 0,
    totalDuration: 0,
    qualityScore: 0,
    qualityThreshold: 0,
    warnings: [],
    errors: [],
    startedAt,
    ...seed
  };
}

export function beginEducationalObjectGenerationStage() {
  return now();
}

export function endEducationalObjectGenerationStage(startedAt) {
  return Math.max(0, now() - toFinite(startedAt));
}

export function finalizeEducationalObjectGenerationDiagnostics(diagnostics = {}, patch = {}) {
  const target = diagnostics || createEducationalObjectGenerationDiagnostics();
  Object.assign(target, patch || {});
  target.totalDuration = Math.max(0, now() - toFinite(target.startedAt || now()));
  target.warnings = uniqueStrings(target.warnings);
  target.errors = uniqueStrings(target.errors);
  return target;
}
