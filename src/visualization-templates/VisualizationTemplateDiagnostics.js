import { VISUALIZATION_TEMPLATE_LATEST_VERSION } from './VisualizationTemplateConfig.js';

export function createVisualizationTemplateDiagnostics(seed = {}) {
  return {
    templateId: seed.templateId || null,
    templateVersion: seed.templateVersion || VISUALIZATION_TEMPLATE_LATEST_VERSION,
    normalizationDuration: 0,
    validationDuration: 0,
    repairDuration: 0,
    migrationDuration: 0,
    integrityDuration: 0,
    instantiationDuration: 0,
    slotCount: 0,
    regionCount: 0,
    relationshipCount: 0,
    variableCount: 0,
    conditionCount: 0,
    extensionCount: 0,
    duplicateIdCount: 0,
    brokenReferenceCount: 0,
    repairCount: 0,
    migrationCount: 0,
    accessibilityCoverage: 0,
    performanceCompatibility: 0,
    warnings: [],
    errors: [],
    fallbackUsed: false
  };
}

export function finalizeVisualizationTemplateDiagnostics(diagnostics, patch = {}) {
  if (!diagnostics) return null;
  Object.assign(diagnostics, patch || {});
  return diagnostics;
}
