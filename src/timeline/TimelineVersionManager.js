import { TIMELINE_SCHEMA_LATEST_VERSION } from './TimelineConfig.js';
import { createSafeTimeline } from './TimelineSchema.js';
import { normalizeTimeline } from './TimelineNormalizer.js';
import { validateTimeline } from './TimelineValidator.js';
import { repairTimeline } from './TimelineRepair.js';
import { migrateTimelineVersion } from './TimelineMigration.js';
import { runTimelineIntegrityChecks } from './TimelineIntegrity.js';
import { createTimelineDiagnosticsSnapshot } from './TimelineDiagnostics.js';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function convertToLatestTimelineVersion(timeline) {
  return migrateTimelineVersion(timeline, TIMELINE_SCHEMA_LATEST_VERSION);
}

export function processTimelineDataPipeline(rawTimeline, options = {}) {
  const generationStart = Date.now();

  try {
    const normalizationStart = Date.now();
    const normalized = normalizeTimeline(rawTimeline, {
      sourceType: options.sourceType || 'ai'
    });

    const validationStart = Date.now();
    const initialValidation = validateTimeline(normalized);

    const repairStart = Date.now();
    const repaired = repairTimeline(normalized, initialValidation);

    const migrated = convertToLatestTimelineVersion(repaired);
    const postValidation = validateTimeline(migrated);
    const integrity = runTimelineIntegrityChecks(migrated);

    const finalTimeline = {
      ...createSafeTimeline(migrated),
      version: TIMELINE_SCHEMA_LATEST_VERSION,
      validation: {
        valid: postValidation.valid && integrity.status !== 'invalid',
        status: postValidation.status,
        repairable: postValidation.repairable !== false,
        errors: [...safeArray(postValidation.errors), ...safeArray(integrity.errors)],
        warnings: [...safeArray(postValidation.warnings), ...safeArray(integrity.warnings)],
        diagnostics: {
          ...(postValidation.diagnostics || {}),
          integrityStatus: integrity.status
        }
      }
    };

    finalTimeline.diagnostics = {
      ...finalTimeline.diagnostics,
      ...createTimelineDiagnosticsSnapshot({
        schemaVersion: TIMELINE_SCHEMA_LATEST_VERSION,
        validation: finalTimeline.validation,
        integrity,
        repairCount: finalTimeline?.diagnostics?.repairCount || 0,
        timers: {
          generationStart,
          normalizationStart,
          validationStart,
          repairStart
        }
      })
    };

    return finalTimeline;
  } catch (error) {
    const fallback = createSafeTimeline();
    fallback.validation = {
      valid: false,
      status: 'fallback',
      repairable: true,
      errors: [`Timeline pipeline failed: ${error?.message || 'unknown error'}`],
      warnings: [],
      diagnostics: {}
    };
    return fallback;
  }
}
