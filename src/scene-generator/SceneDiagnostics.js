import { SCENE_SCHEMA_LATEST_VERSION } from './SceneSchema.js';

function toDuration(startTime) {
  const start = Number(startTime || 0);
  const now = Date.now();
  if (!Number.isFinite(start) || start <= 0) return 0;
  return Math.max(0, now - start);
}

export function createSceneDiagnosticsSnapshot({
  schemaVersion = SCENE_SCHEMA_LATEST_VERSION,
  repairCount = 0,
  validation = null,
  integrity = null,
  timers = {}
} = {}) {
  const warnings = (validation?.warnings || []).length;
  const errors = (validation?.errors || []).length;

  return {
    schemaVersion,
    repairCount,
    validationWarnings: warnings,
    validationErrors: errors,
    integrityWarnings: (integrity?.warnings || []).length,
    integrityErrors: (integrity?.errors || []).length,
    normalizationDurationMs: toDuration(timers.normalizationStart),
    repairDurationMs: toDuration(timers.repairStart),
    generationDurationMs: toDuration(timers.generationStart),
    notes: []
  };
}
