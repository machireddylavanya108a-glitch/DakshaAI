function now() {
  return Date.now();
}

function uniqueStrings(value = []) {
  return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item)))];
}

export function createEducationalObjectDiagnostics(seed = {}) {
  return {
    objectId: seed.objectId || null,
    objectVersion: seed.objectVersion || null,
    normalizationDuration: 0,
    validationDuration: 0,
    repairDuration: 0,
    migrationDuration: 0,
    integrityDuration: 0,
    instantiationDuration: 0,
    conceptReferenceCount: 0,
    relationshipReferenceCount: 0,
    capabilityReferenceCount: 0,
    labelCount: 0,
    variableCount: 0,
    conditionCount: 0,
    stateCount: 0,
    extensionCount: 0,
    repairCount: 0,
    migrationCount: 0,
    brokenReferenceCount: 0,
    accessibilityCoverage: 0,
    performanceCompatibility: 0,
    warnings: [],
    errors: [],
    fallbackUsed: false,
    startedAt: now(),
    ...seed
  };
}

export function finalizeEducationalObjectDiagnostics(diagnostics = {}, patch = {}) {
  const target = diagnostics || createEducationalObjectDiagnostics();
  Object.assign(target, patch || {});
  target.warnings = uniqueStrings(target.warnings);
  target.errors = uniqueStrings(target.errors);
  target.totalDuration = Math.max(0, now() - Number(target.startedAt || now()));
  return target;
}
