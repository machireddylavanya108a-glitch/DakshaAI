function now() {
  return Date.now();
}

function toNumber(value = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toUniqueStrings(value = []) {
  return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item)))];
}

export function createTemplateGenerationDiagnostics(seed = {}) {
  const startedAt = now();
  return {
    requestId: String(seed.requestId || `template-generation-${startedAt}`),
    generationFingerprint: '',
    source: 'procedural',
    cacheHit: false,
    deduplicated: false,
    fallbackLevel: 0,
    fallbackReason: '',
    qualityScore: 0,
    qualityThreshold: 0,
    refinementPasses: 0,
    salvageApplied: false,
    simplificationApplied: false,
    generatedSlotCount: 0,
    generatedRegionCount: 0,
    generatedRelationshipCount: 0,
    capabilityCoverage: 0,
    requirementCoverage: 0,
    accessibilityCoverage: 0,
    performanceCompatibility: 0,
    bindingCoverage: 0,
    unresolvedRequiredCount: 0,
    generationDuration: 0,
    layoutDuration: 0,
    slotDuration: 0,
    regionDuration: 0,
    relationshipDuration: 0,
    validationDuration: 0,
    repairDuration: 0,
    migrationDuration: 0,
    integrityDuration: 0,
    refinementDuration: 0,
    qualityDuration: 0,
    instantiationDuration: 0,
    bindingDuration: 0,
    totalDuration: 0,
    warnings: [],
    errors: [],
    startedAt,
    ...seed
  };
}

export function beginGenerationStage() {
  return now();
}

export function endGenerationStage(startedAt) {
  return Math.max(0, now() - toNumber(startedAt));
}

export function finalizeTemplateGenerationDiagnostics(diagnostics, patch = {}) {
  const target = diagnostics || createTemplateGenerationDiagnostics();
  Object.assign(target, patch || {});
  target.totalDuration = Math.max(0, now() - toNumber(target.startedAt || now()));
  target.warnings = toUniqueStrings(target.warnings);
  target.errors = toUniqueStrings(target.errors);
  return target;
}
