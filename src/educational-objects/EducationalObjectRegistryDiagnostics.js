import { summarizeTrustDistribution } from './EducationalObjectTrust.js';

export function createEducationalObjectRegistryDiagnostics(seed = {}) {
  return {
    registrySize: Number(seed.registrySize || 0),
    activeObjectCount: Number(seed.activeObjectCount || 0),
    disabledObjectCount: Number(seed.disabledObjectCount || 0),
    deprecatedObjectCount: Number(seed.deprecatedObjectCount || 0),
    versionCount: Number(seed.versionCount || 0),
    duplicateCount: Number(seed.duplicateCount || 0),
    registrationFailureCount: Number(seed.registrationFailureCount || 0),
    qualityFailureCount: Number(seed.qualityFailureCount || 0),
    trustDistribution: seed.trustDistribution || {},
    sourceDistribution: seed.sourceDistribution || {},
    serializationCount: Number(seed.serializationCount || 0),
    restoreCount: Number(seed.restoreCount || 0),
    warnings: Array.isArray(seed.warnings) ? seed.warnings.slice(0, 200) : [],
    errors: Array.isArray(seed.errors) ? seed.errors.slice(0, 200) : []
  };
}

export function refreshEducationalObjectRegistryDiagnostics(entries = [], current = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const sourceDistribution = Object.create(null);
  list.forEach((entry) => {
    const source = String(entry?.source || 'unknown');
    sourceDistribution[source] = Number(sourceDistribution[source] || 0) + 1;
  });

  return {
    ...createEducationalObjectRegistryDiagnostics(current),
    registrySize: list.length,
    activeObjectCount: list.filter((entry) => entry?.enabled !== false).length,
    disabledObjectCount: list.filter((entry) => entry?.enabled === false).length,
    deprecatedObjectCount: list.filter((entry) => entry?.deprecated === true).length,
    versionCount: new Set(list.map((entry) => `${entry?.objectId || ''}::${entry?.version || ''}`)).size,
    trustDistribution: summarizeTrustDistribution(list),
    sourceDistribution
  };
}
