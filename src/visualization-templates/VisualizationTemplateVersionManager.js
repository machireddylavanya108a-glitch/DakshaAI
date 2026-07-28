import { normalizeVisualizationTemplate } from './VisualizationTemplateNormalizer.js';
import { validateVisualizationTemplate } from './VisualizationTemplateValidator.js';
import { repairVisualizationTemplate } from './VisualizationTemplateRepair.js';
import { migrateVisualizationTemplate } from './VisualizationTemplateMigration.js';
import { runVisualizationTemplateIntegrityChecks } from './VisualizationTemplateIntegrity.js';
import { createAdaptiveFallbackTemplate } from './VisualizationTemplateSchema.js';
import { createVisualizationTemplateDiagnostics, finalizeVisualizationTemplateDiagnostics } from './VisualizationTemplateDiagnostics.js';
import { normalizeVisualizationTemplateConfig } from './VisualizationTemplateConfig.js';

function now() {
  return Date.now();
}

export function processVisualizationTemplate(template, options = {}) {
  const config = normalizeVisualizationTemplateConfig(options);
  const started = now();
  const diagnostics = createVisualizationTemplateDiagnostics();
  const warnings = [];
  const errors = [];

  try {
    const normalizationStart = now();
    const normalized = normalizeVisualizationTemplate(template, config);
    diagnostics.normalizationDuration = now() - normalizationStart;
    diagnostics.templateId = normalized.templateId;
    diagnostics.templateVersion = normalized.version;

    const validationStart = now();
    const validation = validateVisualizationTemplate(normalized, config);
    diagnostics.validationDuration = now() - validationStart;
    warnings.push(...validation.warnings);
    errors.push(...validation.errors);

    let working = validation.normalizedValue;
    let repaired = false;
    let migrated = false;

    if (!validation.valid || validation.errors.length) {
      const repairStart = now();
      working = repairVisualizationTemplate(working, validation, config);
      diagnostics.repairDuration = now() - repairStart;
      repaired = true;
      warnings.push(...(working.validation?.warnings || []));
    }

    const migrationStart = now();
    const migration = migrateVisualizationTemplate(working, config.version || undefined);
    diagnostics.migrationDuration = now() - migrationStart;
    migrated = migration.migrated;
    diagnostics.migrationCount = migration.migrationCount;
    warnings.push(...migration.migrationNotes);
    working = migration.template;

    const integrityStart = now();
    const integrity = runVisualizationTemplateIntegrityChecks(working);
    diagnostics.integrityDuration = now() - integrityStart;
    warnings.push(...integrity.warnings);
    errors.push(...integrity.errors);
    diagnostics.duplicateIdCount = integrity.duplicateIdCount;
    diagnostics.brokenReferenceCount = integrity.brokenReferenceCount;

    if (integrity.status === 'invalid' && options.allowFallback !== false) {
      const fallback = createAdaptiveFallbackTemplate({
        metadata: {
          ...working.metadata,
          fallbackReason: 'integrity-invalid'
        }
      });
      diagnostics.fallbackUsed = true;
      diagnostics.warnings.push('Template integrity invalid; adaptive fallback template was used.');
      diagnostics.warnings.push(...warnings);
      diagnostics.errors.push(...errors);
      finalizeVisualizationTemplateDiagnostics(diagnostics, {
        slotCount: fallback.slots.length,
        regionCount: fallback.regions.length,
        relationshipCount: fallback.relationships.length,
        variableCount: fallback.variables.length,
        conditionCount: fallback.conditions.length
      });
      return {
        status: 'fallback',
        template: fallback,
        valid: true,
        repaired: true,
        migrated,
        warnings,
        errors,
        diagnostics
      };
    }

    const status = migrated ? 'migrated' : repaired ? 'repaired' : validation.valid ? 'valid' : 'invalid';

    finalizeVisualizationTemplateDiagnostics(diagnostics, {
      slotCount: Array.isArray(working.slots) ? working.slots.length : 0,
      regionCount: Array.isArray(working.regions) ? working.regions.length : 0,
      relationshipCount: Array.isArray(working.relationships) ? working.relationships.length : 0,
      variableCount: Array.isArray(working.variables) ? working.variables.length : 0,
      conditionCount: Array.isArray(working.conditions) ? working.conditions.length : 0,
      extensionCount: Object.keys(working.extensions || {}).length,
      warnings,
      errors
    });

    return {
      status,
      template: working,
      valid: status !== 'invalid',
      repaired,
      migrated,
      warnings,
      errors,
      diagnostics
    };
  } catch (error) {
    const fallback = createAdaptiveFallbackTemplate();
    diagnostics.errors.push(String(error?.message || 'template processing failed'));
    diagnostics.fallbackUsed = true;
    diagnostics.integrityDuration = Math.max(0, now() - started);

    return {
      status: 'fallback',
      template: fallback,
      valid: true,
      repaired: true,
      migrated: false,
      warnings,
      errors: [...errors, 'Template processing failed and fallback was used.'],
      diagnostics
    };
  }
}
