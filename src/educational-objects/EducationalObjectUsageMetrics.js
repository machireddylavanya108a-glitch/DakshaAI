function nowIso() {
  return new Date().toISOString();
}

export function createEducationalObjectUsageMetrics(seed = {}) {
  return {
    registrationCount: Number(seed.registrationCount || 0),
    instantiationCount: Number(seed.instantiationCount || 0),
    acquireCount: Number(seed.acquireCount || 0),
    releaseCount: Number(seed.releaseCount || 0),
    reuseCount: Number(seed.reuseCount || 0),
    resetCount: Number(seed.resetCount || 0),
    resetFailureCount: Number(seed.resetFailureCount || 0),
    qualityFailureCount: Number(seed.qualityFailureCount || 0),
    quarantineCount: Number(seed.quarantineCount || 0),
    destroyCount: Number(seed.destroyCount || 0),
    activeInstanceCount: Number(seed.activeInstanceCount || 0),
    availablePoolCount: Number(seed.availablePoolCount || 0),
    averageReuseCount: Number(seed.averageReuseCount || 0),
    lastUsedAt: seed.lastUsedAt || null,
    lastFailureAt: seed.lastFailureAt || null,
    lastFailureReason: seed.lastFailureReason || null
  };
}

export function applyUsageEvent(metrics = {}, event = '', payload = {}) {
  const next = createEducationalObjectUsageMetrics(metrics);
  const key = String(event || '').trim();

  switch (key) {
    case 'registered': next.registrationCount += 1; break;
    case 'instantiated': next.instantiationCount += 1; break;
    case 'acquired':
      next.acquireCount += 1;
      next.activeInstanceCount = Math.max(0, next.activeInstanceCount + 1);
      next.lastUsedAt = nowIso();
      break;
    case 'released':
      next.releaseCount += 1;
      next.activeInstanceCount = Math.max(0, next.activeInstanceCount - 1);
      next.lastUsedAt = nowIso();
      break;
    case 'reused': next.reuseCount += 1; break;
    case 'reset': next.resetCount += 1; break;
    case 'reset-failed':
      next.resetFailureCount += 1;
      next.lastFailureAt = nowIso();
      next.lastFailureReason = payload.reason || 'reset-failure';
      break;
    case 'quality-failed':
      next.qualityFailureCount += 1;
      next.lastFailureAt = nowIso();
      next.lastFailureReason = payload.reason || 'quality-failure';
      break;
    case 'quarantined':
      next.quarantineCount += 1;
      next.lastFailureAt = nowIso();
      next.lastFailureReason = payload.reason || 'quarantined';
      break;
    case 'destroyed': next.destroyCount += 1; break;
    default:
      break;
  }

  const denominator = Math.max(1, next.acquireCount);
  next.averageReuseCount = Number((next.reuseCount / denominator).toFixed(6));
  return next;
}
