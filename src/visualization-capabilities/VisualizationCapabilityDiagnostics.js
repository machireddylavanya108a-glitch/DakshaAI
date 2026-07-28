function clampCount(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : 0;
}

export function createVisualizationCapabilityDiagnostics(seed = {}) {
  return {
    analysisDuration: 0,
    registrySize: clampCount(seed.registrySize),
    candidateCount: 0,
    matchedCount: 0,
    compositionCount: 0,
    fallbackUsed: false,
    warnings: [],
    errors: [],
    confidence: 0,
    selectedCapabilityIds: [],
    unmetRequirementCount: 0,
    accessibilityCoverage: 0,
    performanceCompatibility: 0
  };
}

export function addCapabilityWarning(diagnostics, warning) {
  if (!diagnostics || !warning) return;
  diagnostics.warnings.push(String(warning).slice(0, 320));
}

export function addCapabilityError(diagnostics, error) {
  if (!diagnostics || !error) return;
  diagnostics.errors.push(String(error).slice(0, 320));
}

export function finalizeCapabilityDiagnostics(diagnostics, patch = {}) {
  if (!diagnostics) return null;
  Object.assign(diagnostics, patch || {});
  diagnostics.registrySize = clampCount(diagnostics.registrySize);
  diagnostics.candidateCount = clampCount(diagnostics.candidateCount);
  diagnostics.matchedCount = clampCount(diagnostics.matchedCount);
  diagnostics.compositionCount = clampCount(diagnostics.compositionCount);
  diagnostics.unmetRequirementCount = clampCount(diagnostics.unmetRequirementCount);
  return diagnostics;
}
