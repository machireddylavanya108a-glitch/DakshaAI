import { SCENE_SCHEMA_LATEST_VERSION, createSafeScene } from './SceneSchema.js';
import { normalizeScene } from './SceneNormalizer.js';
import { validateScene } from './SceneValidator.js';
import { repairScene } from './SceneRepair.js';
import { migrateSceneVersion } from './SceneMigration.js';
import { runSceneIntegrityChecks } from './SceneIntegrity.js';
import { createSceneDiagnosticsSnapshot } from './SceneDiagnostics.js';
import { ensureSceneVisualizationCapabilityMetadata } from '../visualization-capabilities/VisualizationCapability.js';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function markValidation(scene, validation, integrity) {
  return {
    ...scene,
    validation: {
      status: validation.status,
      errors: [...safeArray(validation.errors), ...safeArray(integrity.errors)],
      warnings: [...safeArray(validation.warnings), ...safeArray(integrity.warnings)],
      repairable: validation.repairable !== false
    }
  };
}

export function convertToLatestSceneVersion(scene) {
  return migrateSceneVersion(scene, SCENE_SCHEMA_LATEST_VERSION);
}

export function processSceneJsonPipeline(rawScene, options = {}) {
  const generationStart = Date.now();
  const fallbackBase = createSafeScene({
    title: options.fallbackTitle || 'Safe Scene',
    subject: options.fallbackSubject || 'General Learning'
  });

  try {
    const normalizationStart = Date.now();
    const normalized = normalizeScene(rawScene, {
      sourceType: options.sourceType || 'ai'
    });

    const initialValidation = validateScene(normalized);

    const repairStart = Date.now();
    const repaired = repairScene(normalized, initialValidation);
    const migrated = convertToLatestSceneVersion(repaired);

    const postValidation = validateScene(migrated);
    const integrity = runSceneIntegrityChecks(migrated);

    let finalScene = markValidation(migrated, postValidation, integrity);

    if (postValidation.status === 'invalid' && postValidation.repairable === false) {
      finalScene = createSafeScene({
        title: normalized.title || fallbackBase.title,
        subject: normalized.subject || fallbackBase.subject
      });
      finalScene.validation = {
        status: 'fallback',
        errors: ['Scene failed validation and was replaced with a safe scene.'],
        warnings: [],
        repairable: true
      };
    }

    finalScene.version = SCENE_SCHEMA_LATEST_VERSION;
    finalScene = ensureSceneVisualizationCapabilityMetadata(finalScene, {
      performanceProfile: finalScene?.settings?.quality || 'balanced'
    });

    finalScene.diagnostics = {
      ...finalScene.diagnostics,
      ...createSceneDiagnosticsSnapshot({
        schemaVersion: SCENE_SCHEMA_LATEST_VERSION,
        repairCount: finalScene?.diagnostics?.repairCount || 0,
        validation: finalScene.validation,
        integrity,
        timers: {
          generationStart,
          normalizationStart,
          repairStart
        }
      })
    };

    return finalScene;
  } catch (error) {
    const safeScene = createSafeScene({
      title: fallbackBase.title,
      subject: fallbackBase.subject
    });

    safeScene.validation = {
      status: 'fallback',
      errors: [`Scene pipeline failed: ${error?.message || 'unknown error'}`],
      warnings: [],
      repairable: true
    };

    safeScene.diagnostics = {
      ...safeScene.diagnostics,
      generationDurationMs: Date.now() - generationStart,
      notes: [...safeArray(safeScene.diagnostics.notes), 'Pipeline exception recovered with safe scene.']
    };

    return safeScene;
  }
}
