function trimList(values = [], max = 100) {
  if (!Array.isArray(values)) return [];
  return values.slice(0, max).map((value) => String(value || '').slice(0, 500)).filter(Boolean);
}

export function createEducationalObjectBehaviorDiagnostics(seed = {}) {
  return {
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: String(seed.status || 'initialized'),
    warnings: trimList(seed.warnings || []),
    errors: trimList(seed.errors || []),
    notes: trimList(seed.notes || []),
    counters: {
      behaviorsLoaded: Number(seed.counters?.behaviorsLoaded || 0),
      stateMachines: Number(seed.counters?.stateMachines || 0),
      relationships: Number(seed.counters?.relationships || 0),
      unresolvedDependencies: Number(seed.counters?.unresolvedDependencies || 0),
      conflicts: Number(seed.counters?.conflicts || 0),
      eventsEmitted: Number(seed.counters?.eventsEmitted || 0),
      blockedBehaviors: Number(seed.counters?.blockedBehaviors || 0)
    },
    timings: {
      loadMs: Number(seed.timings?.loadMs || 0),
      dispatchMs: Number(seed.timings?.dispatchMs || 0)
    },
    metadata: seed.metadata && typeof seed.metadata === 'object' ? seed.metadata : {}
  };
}

export function finalizeEducationalObjectBehaviorDiagnostics(diagnostics = {}, updates = {}) {
  const next = {
    ...createEducationalObjectBehaviorDiagnostics(diagnostics),
    ...updates
  };
  next.updatedAt = new Date().toISOString();
  next.warnings = trimList([...(diagnostics.warnings || []), ...(updates.warnings || [])]);
  next.errors = trimList([...(diagnostics.errors || []), ...(updates.errors || [])]);
  next.notes = trimList([...(diagnostics.notes || []), ...(updates.notes || [])]);
  next.counters = {
    ...createEducationalObjectBehaviorDiagnostics(diagnostics).counters,
    ...(diagnostics.counters || {}),
    ...(updates.counters || {})
  };
  next.timings = {
    ...createEducationalObjectBehaviorDiagnostics(diagnostics).timings,
    ...(diagnostics.timings || {}),
    ...(updates.timings || {})
  };
  return next;
}
