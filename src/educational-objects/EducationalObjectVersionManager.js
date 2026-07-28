import { EDUCATIONAL_OBJECT_LATEST_VERSION } from './EducationalObjectConfig.js';
import { createAdaptiveFallbackEducationalObject } from './EducationalObjectSchema.js';
import { normalizeEducationalObject } from './EducationalObjectNormalizer.js';
import { validateEducationalObject } from './EducationalObjectValidator.js';
import { repairEducationalObject } from './EducationalObjectRepair.js';
import { migrateEducationalObject } from './EducationalObjectMigration.js';
import { runEducationalObjectIntegrityChecks } from './EducationalObjectIntegrity.js';
import {
  createEducationalObjectDiagnostics,
  finalizeEducationalObjectDiagnostics
} from './EducationalObjectDiagnostics.js';

function now() {
  return Date.now();
}

export function processEducationalObject(input = {}, options = {}) {
  const started = now();
  const diagnostics = createEducationalObjectDiagnostics();

  try {
    const normalizationStart = now();
    const normalized = normalizeEducationalObject(input, options);
    diagnostics.normalizationDuration = now() - normalizationStart;
    diagnostics.objectId = normalized.objectId;
    diagnostics.objectVersion = normalized.version;

    const validationStart = now();
    const validation = validateEducationalObject(normalized, options);
    diagnostics.validationDuration = now() - validationStart;
    diagnostics.warnings.push(...validation.warnings);
    diagnostics.errors.push(...validation.errors);

    let working = validation.normalizedValue;
    let repaired = false;
    let migrated = false;

    if (!validation.valid || validation.errors.length) {
      const repairStart = now();
      working = repairEducationalObject(working, validation, options);
      diagnostics.repairDuration = now() - repairStart;
      repaired = true;
      diagnostics.repairCount += Number(working?.diagnostics?.repairCount || 0);
    }

    const migrationStart = now();
    const migration = migrateEducationalObject(working, options.version || EDUCATIONAL_OBJECT_LATEST_VERSION);
    diagnostics.migrationDuration = now() - migrationStart;
    working = migration.object;
    migrated = migration.migrated;
    diagnostics.migrationCount = migration.migrationCount;
    diagnostics.warnings.push(...migration.migrationNotes);

    const integrityStart = now();
    const integrity = runEducationalObjectIntegrityChecks(working, {
      knownObjectIds: options.knownObjectIds || []
    });
    diagnostics.integrityDuration = now() - integrityStart;
    diagnostics.brokenReferenceCount = integrity.brokenReferenceCount;
    diagnostics.errors.push(...integrity.errors);
    diagnostics.warnings.push(...integrity.warnings);

    if (integrity.status === 'invalid' && options.allowFallback !== false) {
      const fallback = createAdaptiveFallbackEducationalObject({
        metadata: {
          ...(working.metadata || {}),
          fallbackReason: 'integrity-invalid'
        }
      });

      return {
        status: 'fallback',
        object: fallback,
        valid: true,
        repaired: true,
        migrated,
        warnings: diagnostics.warnings,
        errors: diagnostics.errors,
        diagnostics: finalizeEducationalObjectDiagnostics(diagnostics, {
          fallbackUsed: true,
          objectId: fallback.objectId,
          objectVersion: fallback.version
        })
      };
    }

    const status = migrated ? 'migrated' : repaired ? 'repaired' : validation.valid ? 'valid' : 'invalid';

    return {
      status,
      object: working,
      valid: status !== 'invalid',
      repaired,
      migrated,
      warnings: diagnostics.warnings,
      errors: diagnostics.errors,
      diagnostics: finalizeEducationalObjectDiagnostics(diagnostics, {
        conceptReferenceCount: working.conceptReferences?.length || 0,
        relationshipReferenceCount: working.relationshipReferences?.length || 0,
        capabilityReferenceCount: working.capabilityReferences?.length || 0,
        labelCount: working.labels?.length || 0,
        variableCount: working.variables?.length || 0,
        conditionCount: working.conditions?.length || 0,
        stateCount: Array.isArray(working.state?.availableStates) ? working.state.availableStates.length : 0,
        extensionCount: Object.keys(working.extensions || {}).length,
        objectId: working.objectId,
        objectVersion: working.version
      })
    };
  } catch {
    const fallback = createAdaptiveFallbackEducationalObject();
    return {
      status: 'fallback',
      object: fallback,
      valid: true,
      repaired: true,
      migrated: false,
      warnings: diagnostics.warnings,
      errors: [...diagnostics.errors, 'Educational object processing failed and fallback was used.'],
      diagnostics: finalizeEducationalObjectDiagnostics(diagnostics, {
        fallbackUsed: true,
        objectId: fallback.objectId,
        objectVersion: fallback.version
      })
    };
  } finally {
    diagnostics.totalDuration = Math.max(0, now() - started);
  }
}
