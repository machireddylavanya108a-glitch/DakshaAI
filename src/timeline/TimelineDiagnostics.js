import { TIMELINE_SCHEMA_LATEST_VERSION } from './TimelineConfig.js';

function durationFrom(startTime) {
  const start = Number(startTime || 0);
  if (!Number.isFinite(start) || start <= 0) return 0;
  return Math.max(0, Date.now() - start);
}

export function createTimelineDiagnostics(overrides = {}) {
  return {
    schemaVersion: TIMELINE_SCHEMA_LATEST_VERSION,
    normalizationDurationMs: 0,
    repairDurationMs: 0,
    validationDurationMs: 0,
    generationDurationMs: 0,
    repairCount: 0,
    warnings: 0,
    errors: 0,
    notes: [],
    ...overrides
  };
}

export function createTimelineDiagnosticsSnapshot({
  schemaVersion = TIMELINE_SCHEMA_LATEST_VERSION,
  validation = null,
  integrity = null,
  repairCount = 0,
  timers = {}
} = {}) {
  return createTimelineDiagnostics({
    schemaVersion,
    normalizationDurationMs: durationFrom(timers.normalizationStart),
    repairDurationMs: durationFrom(timers.repairStart),
    validationDurationMs: durationFrom(timers.validationStart),
    generationDurationMs: durationFrom(timers.generationStart),
    repairCount,
    warnings: (validation?.warnings || []).length + (integrity?.warnings || []).length,
    errors: (validation?.errors || []).length + (integrity?.errors || []).length,
    notes: []
  });
}
