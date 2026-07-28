function now() {
  return Date.now();
}

export function createTemplateSelectionDiagnostics(seed = {}) {
  const startedAt = now();
  return {
    requestId: String(seed.requestId || `template-selection-${startedAt}`),
    registrySize: 0,
    eligibleCount: 0,
    rejectedCount: 0,
    candidateCount: 0,
    rankedCount: 0,
    selectedTemplateId: null,
    selectedTemplateVersion: null,
    selectedScore: 0,
    selectionConfidence: 0,
    capabilityCoverage: 0,
    requirementCoverage: 0,
    accessibilityCoverage: 0,
    performanceCompatibility: 0,
    conflictCount: 0,
    resolvedConflictCount: 0,
    dependencyCount: 0,
    missingDependencyCount: 0,
    bindingCount: 0,
    unboundRequiredSlotCount: 0,
    unboundOptionalSlotCount: 0,
    compositionCount: 0,
    fallbackUsed: false,
    fallbackReason: '',
    cacheHit: false,
    matchingDuration: 0,
    scoringDuration: 0,
    rankingDuration: 0,
    compositionDuration: 0,
    bindingDuration: 0,
    totalDuration: 0,
    warnings: [],
    errors: [],
    startedAt,
    ...seed
  };
}

export function finalizeTemplateSelectionDiagnostics(diagnostics, patch = {}) {
  const target = diagnostics || createTemplateSelectionDiagnostics();
  Object.assign(target, patch);
  target.totalDuration = Math.max(0, now() - Number(target.startedAt || now()));
  target.warnings = Array.isArray(target.warnings) ? [...new Set(target.warnings.map((item) => String(item)))] : [];
  target.errors = Array.isArray(target.errors) ? [...new Set(target.errors.map((item) => String(item)))] : [];
  return target;
}

export function beginSelectionStage() {
  return now();
}

export function endSelectionStage(startedAt) {
  return Math.max(0, now() - Number(startedAt || now()));
}
