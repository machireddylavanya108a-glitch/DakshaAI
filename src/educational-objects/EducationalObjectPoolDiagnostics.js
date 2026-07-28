export function createEducationalObjectPoolDiagnostics(seed = {}) {
  return {
    poolSize: Number(seed.poolSize || 0),
    availableCount: Number(seed.availableCount || 0),
    acquiredCount: Number(seed.acquiredCount || 0),
    resettingCount: Number(seed.resettingCount || 0),
    quarantinedCount: Number(seed.quarantinedCount || 0),
    expiredCount: Number(seed.expiredCount || 0),
    acquireCount: Number(seed.acquireCount || 0),
    reuseCount: Number(seed.reuseCount || 0),
    newInstanceCount: Number(seed.newInstanceCount || 0),
    releaseCount: Number(seed.releaseCount || 0),
    resetCount: Number(seed.resetCount || 0),
    resetFailureCount: Number(seed.resetFailureCount || 0),
    evictionCount: Number(seed.evictionCount || 0),
    destroyCount: Number(seed.destroyCount || 0),
    averageAcquireDuration: Number(seed.averageAcquireDuration || 0),
    averageResetDuration: Number(seed.averageResetDuration || 0),
    averageReuseCount: Number(seed.averageReuseCount || 0),
    highWaterMark: Number(seed.highWaterMark || 0),
    warnings: Array.isArray(seed.warnings) ? seed.warnings.slice(0, 200) : [],
    errors: Array.isArray(seed.errors) ? seed.errors.slice(0, 200) : []
  };
}

export function refreshEducationalObjectPoolDiagnostics(entries = [], current = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const availableCount = list.filter((entry) => entry?.status === 'available').length;
  const acquiredCount = list.filter((entry) => entry?.status === 'acquired').length;
  const resettingCount = list.filter((entry) => entry?.status === 'resetting').length;
  const quarantinedCount = list.filter((entry) => entry?.status === 'quarantined').length;
  const expiredCount = list.filter((entry) => entry?.status === 'expired').length;
  const averageReuseCount = list.length
    ? list.reduce((sum, entry) => sum + Number(entry?.reuseCount || 0), 0) / list.length
    : 0;

  return {
    ...createEducationalObjectPoolDiagnostics(current),
    poolSize: list.length,
    availableCount,
    acquiredCount,
    resettingCount,
    quarantinedCount,
    expiredCount,
    averageReuseCount: Number(averageReuseCount.toFixed(6)),
    highWaterMark: Math.max(Number(current.highWaterMark || 0), list.length)
  };
}
