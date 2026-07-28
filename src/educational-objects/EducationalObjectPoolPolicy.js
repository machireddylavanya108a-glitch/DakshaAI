import { evaluateEducationalObjectQualityGate } from './EducationalObjectQualityGate.js';
import { createEducationalObjectCompatibilityFingerprint } from './EducationalObjectFingerprint.js';

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function clamp(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

export const DEFAULT_EDUCATIONAL_OBJECT_POOL_POLICY = {
  enabled: true,
  maximumEntries: 250,
  maximumEntriesPerFingerprint: 10,
  maximumIdleMs: 10 * 60 * 1000,
  maximumReuseCount: 100,
  prewarmLimit: 25,
  quarantineOnResetFailure: true,
  destroyOnQualityFailure: false,
  allowSharedOwnership: false,
  allowPersistentState: false,
  lowMemoryMode: false,
  metadata: {}
};

export function normalizeEducationalObjectPoolPolicy(policy = {}) {
  const source = toObject(policy);
  return {
    enabled: source.enabled !== false,
    maximumEntries: clamp(source.maximumEntries, 1, 2000, DEFAULT_EDUCATIONAL_OBJECT_POOL_POLICY.maximumEntries),
    maximumEntriesPerFingerprint: clamp(source.maximumEntriesPerFingerprint, 1, 100, DEFAULT_EDUCATIONAL_OBJECT_POOL_POLICY.maximumEntriesPerFingerprint),
    maximumIdleMs: clamp(source.maximumIdleMs, 1000, 24 * 60 * 60 * 1000, DEFAULT_EDUCATIONAL_OBJECT_POOL_POLICY.maximumIdleMs),
    maximumReuseCount: clamp(source.maximumReuseCount, 1, 10000, DEFAULT_EDUCATIONAL_OBJECT_POOL_POLICY.maximumReuseCount),
    prewarmLimit: clamp(source.prewarmLimit, 0, 500, DEFAULT_EDUCATIONAL_OBJECT_POOL_POLICY.prewarmLimit),
    quarantineOnResetFailure: source.quarantineOnResetFailure !== false,
    destroyOnQualityFailure: source.destroyOnQualityFailure === true,
    allowSharedOwnership: source.allowSharedOwnership === true,
    allowPersistentState: source.allowPersistentState === true,
    lowMemoryMode: source.lowMemoryMode === true,
    metadata: toObject(source.metadata)
  };
}

export function evaluateObjectPoolEligibility(objectOrInstance = {}, context = {}, options = {}) {
  const source = toObject(objectOrInstance);
  const policy = normalizeEducationalObjectPoolPolicy(options.policy || {});
  const hardFailures = [];
  const warnings = [];
  const resetRequirements = [];

  if (policy.enabled !== true) hardFailures.push('pool-disabled');

  const status = String(source?.diagnostics?.processingStatus || source?.runtimeMetadata?.diagnosticsSummary?.status || source?.status || 'valid');
  if (status === 'invalid' || status === 'fallback') hardFailures.push('processing-status-not-poolable');

  const ownershipMode = String(source?.ownership?.mode || source?.runtimeMetadata?.ownership?.mode || '').trim();
  if (ownershipMode === 'external-reference') hardFailures.push('external-reference-ownership');
  if (ownershipMode === 'shared' && policy.allowSharedOwnership !== true) warnings.push('shared-ownership-not-enabled-by-policy');

  const destroyed = source?.runtimeMetadata?.lifecycleState?.destroyed === true || source?.lifecycle?.destroyed === true;
  if (destroyed) hardFailures.push('destroyed-lifecycle-state');

  const hasPrivateContent = /lesson|prompt|narrationText|rawText/i.test(JSON.stringify(source?.resolvedData || {}));
  if (hasPrivateContent) warnings.push('possible-private-content-in-resolved-data');

  if (source?.resolvedState?.history?.length && policy.allowPersistentState !== true) {
    resetRequirements.push('clear-state-history');
  }
  if (source?.runtimeMetadata?.behaviorRuntimeState?.undoHistoryCount > 0) {
    resetRequirements.push('clear-undo-redo-history');
  }

  const gate = evaluateEducationalObjectQualityGate(source, context, {
    mode: 'pool',
    poolThreshold: options.poolThreshold,
    trust: options.trust || source.trust || {},
    source: options.source || source.source || 'runtime'
  });

  if (!gate.passed) {
    warnings.push(...gate.warnings);
    if (gate.hardFailures.length) hardFailures.push(...gate.hardFailures);
  }

  const compatibilityFingerprint = createEducationalObjectCompatibilityFingerprint(source, options);

  return {
    eligible: hardFailures.length === 0 && gate.passed,
    hardFailures,
    warnings,
    resetRequirements,
    compatibilityFingerprint,
    diagnostics: {
      gate,
      ownershipMode,
      policy
    }
  };
}
