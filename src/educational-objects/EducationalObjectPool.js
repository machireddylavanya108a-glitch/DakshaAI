import { createEducationalObjectPoolEntry } from './EducationalObjectPoolEntry.js';
import { normalizeEducationalObjectPoolPolicy, evaluateObjectPoolEligibility } from './EducationalObjectPoolPolicy.js';
import { resetEducationalObjectForReuse } from './EducationalObjectPoolReset.js';
import { createEducationalObjectPoolDiagnostics, refreshEducationalObjectPoolDiagnostics } from './EducationalObjectPoolDiagnostics.js';
import { applyUsageEvent } from './EducationalObjectUsageMetrics.js';

function nowMs() {
  return Date.now();
}

function nowIso() {
  return new Date().toISOString();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function makeAcquireToken() {
  return `acq-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

function isExpired(entry = {}, policy = {}) {
  if (!entry.releasedAt) return false;
  const releasedAt = Date.parse(entry.releasedAt);
  if (!Number.isFinite(releasedAt)) return false;
  const maxIdle = Number(policy.maximumIdleMs || 0);
  return maxIdle > 0 && (nowMs() - releasedAt) > maxIdle;
}

export function createEducationalObjectPool(options = {}) {
  const policy = normalizeEducationalObjectPoolPolicy(options.policy || {});
  const entries = new Map();
  const diagnostics = createEducationalObjectPoolDiagnostics(options.diagnostics);

  function recalcDiagnostics() {
    const snapshot = refreshEducationalObjectPoolDiagnostics([...entries.values()], diagnostics);
    Object.assign(diagnostics, snapshot);
  }

  function setStatus(entryId, status) {
    const current = entries.get(entryId);
    if (!current) return null;
    const next = {
      ...current,
      status,
      lastUsedAt: nowIso()
    };
    entries.set(entryId, next);
    return next;
  }

  function evictIfNeeded() {
    const all = [...entries.values()];
    if (all.length <= policy.maximumEntries) return 0;

    const available = all
      .filter((entry) => entry.status === 'available' || entry.status === 'expired')
      .sort((a, b) => Date.parse(a.lastUsedAt || a.releasedAt || 0) - Date.parse(b.lastUsedAt || b.releasedAt || 0));

    let evicted = 0;
    while ((entries.size > policy.maximumEntries || policy.lowMemoryMode === true) && available.length) {
      const candidate = available.shift();
      if (!candidate) break;
      if (entries.delete(candidate.poolEntryId)) {
        diagnostics.evictionCount += 1;
        evicted += 1;
      }
      if (!policy.lowMemoryMode && entries.size <= policy.maximumEntries) break;
    }

    recalcDiagnostics();
    return evicted;
  }

  function registerAvailableInstance(instance = {}, context = {}, registerOptions = {}) {
    const entry = createEducationalObjectPoolEntry(instance, context, {
      ...registerOptions,
      status: 'available',
      releasedAt: nowIso(),
      lastUsedAt: nowIso()
    });

    entries.set(entry.poolEntryId, entry);
    recalcDiagnostics();
    evictIfNeeded();

    return entry;
  }

  function findReusableEntry(request = {}) {
    const source = toObject(request);
    const objectId = String(source.objectId || '').trim();
    const objectVersion = String(source.objectVersion || source.version || 'v1').trim();
    const compatibilityFingerprint = String(source.compatibilityFingerprint || '').trim();

    const candidates = [...entries.values()]
      .filter((entry) => entry.status === 'available')
      .filter((entry) => !isExpired(entry, policy))
      .filter((entry) => !objectId || entry.objectId === objectId)
      .filter((entry) => !objectVersion || entry.objectVersion === objectVersion)
      .filter((entry) => !compatibilityFingerprint || entry.compatibilityFingerprint === compatibilityFingerprint)
      .sort((a, b) => Number(b.reuseCount || 0) - Number(a.reuseCount || 0));

    return candidates[0] || null;
  }

  function acquire(request = {}, context = {}, acquireOptions = {}) {
    const startedAt = nowMs();
    const source = toObject(request);

    if (source.signal?.aborted === true) {
      return {
        status: 'aborted',
        reason: 'acquire-aborted-before-start',
        entry: null,
        instance: null,
        token: null
      };
    }

    const reusable = findReusableEntry(source);
    if (!reusable && typeof source.createInstance !== 'function') {
      return {
        status: 'miss',
        reason: 'no-reusable-instance',
        entry: null,
        instance: null,
        token: null
      };
    }

    if (source.signal?.aborted === true) {
      return {
        status: 'aborted',
        reason: 'acquire-aborted-before-lock',
        entry: null,
        instance: null,
        token: null
      };
    }

    let entry = reusable;
    if (!entry) {
      const created = source.createInstance({ ...context, request: source });
      entry = registerAvailableInstance(created, context, acquireOptions);
      diagnostics.newInstanceCount += 1;
    } else {
      diagnostics.reuseCount += 1;
      entry = {
        ...entry,
        reuseCount: Number(entry.reuseCount || 0) + 1
      };
      entries.set(entry.poolEntryId, entry);
      diagnostics.averageReuseCount = Number((diagnostics.reuseCount / Math.max(1, diagnostics.acquireCount + 1)).toFixed(6));
    }

    const token = makeAcquireToken();
    const acquired = {
      ...entry,
      status: 'acquired',
      acquiredAt: nowIso(),
      releasedAt: null,
      lastUsedAt: nowIso(),
      acquireToken: token,
      usage: applyUsageEvent(entry.usage || {}, reusable ? 'reused' : 'instantiated')
    };

    entries.set(acquired.poolEntryId, acquired);
    diagnostics.acquireCount += 1;
    diagnostics.averageAcquireDuration = Number((((diagnostics.averageAcquireDuration * Math.max(0, diagnostics.acquireCount - 1)) + (nowMs() - startedAt)) / Math.max(1, diagnostics.acquireCount)).toFixed(6));

    recalcDiagnostics();

    return {
      status: reusable ? 'reused' : 'created',
      reason: reusable ? 'reuse-hit' : 'created-new-instance',
      entry: acquired,
      instance: acquired.instance,
      token
    };
  }

  function release(poolEntryId, releaseOptions = {}) {
    const entry = entries.get(String(poolEntryId || '').trim());
    if (!entry) {
      return {
        status: 'missing',
        reason: 'entry-not-found',
        entry: null
      };
    }

    if (entry.status !== 'acquired') {
      return {
        status: 'ignored',
        reason: 'entry-not-acquired',
        entry
      };
    }

    const token = releaseOptions.acquireToken ? String(releaseOptions.acquireToken) : null;
    if (token && token !== String(entry.acquireToken || '')) {
      return {
        status: 'denied',
        reason: 'ownership-token-mismatch',
        entry
      };
    }

    const gate = evaluateObjectPoolEligibility(entry.instance, releaseOptions.context || {}, {
      policy,
      trust: releaseOptions.trust || entry.instance?.trust || {},
      poolThreshold: releaseOptions.poolThreshold
    });

    if (!gate.eligible) {
      diagnostics.resetFailureCount += 1;
      if (policy.destroyOnQualityFailure === true) {
        entries.delete(entry.poolEntryId);
        diagnostics.destroyCount += 1;
        recalcDiagnostics();
        return {
          status: 'destroyed',
          reason: 'failed-quality-gate',
          entry: null,
          diagnostics: gate
        };
      }

      const quarantined = {
        ...entry,
        status: 'quarantined',
        releasedAt: nowIso(),
        lastUsedAt: nowIso(),
        diagnostics: {
          ...(entry.diagnostics || {}),
          quarantineReason: gate.hardFailures.join(',') || 'quality-gate-failed',
          gate
        }
      };
      entries.set(entry.poolEntryId, quarantined);
      diagnostics.quarantinedCount += 1;
      recalcDiagnostics();

      return {
        status: 'quarantined',
        reason: 'failed-quality-gate',
        entry: quarantined,
        diagnostics: gate
      };
    }

    const resetStartedAt = nowMs();
    const resetResult = resetEducationalObjectForReuse(entry.instance, releaseOptions.context || {}, {
      policy,
      resetRequirements: gate.resetRequirements
    });

    if (!resetResult.success) {
      diagnostics.resetFailureCount += 1;
      if (policy.quarantineOnResetFailure !== false) {
        const quarantined = setStatus(entry.poolEntryId, 'quarantined');
        if (quarantined) {
          entries.set(quarantined.poolEntryId, {
            ...quarantined,
            diagnostics: {
              ...(quarantined.diagnostics || {}),
              resetErrors: resetResult.errors,
              resetWarnings: resetResult.warnings
            }
          });
          diagnostics.quarantinedCount += 1;
          recalcDiagnostics();
          return {
            status: 'quarantined',
            reason: 'reset-failed',
            entry: entries.get(quarantined.poolEntryId),
            diagnostics: resetResult
          };
        }
      }

      entries.delete(entry.poolEntryId);
      diagnostics.destroyCount += 1;
      recalcDiagnostics();
      return {
        status: 'destroyed',
        reason: 'reset-failed',
        entry: null,
        diagnostics: resetResult
      };
    }

    const released = {
      ...entry,
      instance: resetResult.instance,
      status: 'available',
      acquireToken: null,
      releasedAt: nowIso(),
      lastUsedAt: nowIso(),
      resetCount: Number(entry.resetCount || 0) + 1,
      diagnostics: {
        ...(entry.diagnostics || {}),
        lastReset: resetResult.diagnostics
      },
      usage: applyUsageEvent(entry.usage || {}, 'released')
    };

    if (released.reuseCount >= policy.maximumReuseCount) {
      released.status = 'expired';
    }

    entries.set(released.poolEntryId, released);
    diagnostics.releaseCount += 1;
    diagnostics.resetCount += 1;
    diagnostics.averageResetDuration = Number((((diagnostics.averageResetDuration * Math.max(0, diagnostics.resetCount - 1)) + (nowMs() - resetStartedAt)) / Math.max(1, diagnostics.resetCount)).toFixed(6));

    recalcDiagnostics();
    evictExpired();

    return {
      status: released.status === 'expired' ? 'expired' : 'released',
      reason: released.status === 'expired' ? 'reuse-limit-reached' : 'released-to-pool',
      entry: released,
      diagnostics: resetResult
    };
  }

  function evictExpired() {
    let removed = 0;
    for (const [entryId, entry] of entries.entries()) {
      const shouldEvict = entry.status === 'expired' || isExpired(entry, policy);
      if (!shouldEvict) continue;
      entries.delete(entryId);
      removed += 1;
      diagnostics.evictionCount += 1;
    }
    recalcDiagnostics();
    return removed;
  }

  function quarantine(poolEntryId, reason = 'manual-quarantine', metadata = {}) {
    const current = entries.get(String(poolEntryId || '').trim());
    if (!current) return null;
    const next = {
      ...current,
      status: 'quarantined',
      diagnostics: {
        ...(current.diagnostics || {}),
        quarantineReason: String(reason),
        quarantineMetadata: toObject(metadata)
      }
    };
    entries.set(next.poolEntryId, next);
    diagnostics.quarantinedCount += 1;
    recalcDiagnostics();
    return next;
  }

  function destroy(poolEntryId, reason = 'manual-destroy') {
    const id = String(poolEntryId || '').trim();
    const current = entries.get(id);
    if (!current) return false;
    entries.delete(id);
    diagnostics.destroyCount += 1;
    diagnostics.warnings.push({ at: nowIso(), code: 'POOL_DESTROY', reason: String(reason), poolEntryId: id });
    diagnostics.warnings = diagnostics.warnings.slice(-200);
    recalcDiagnostics();
    return true;
  }

  function list(filter = {}) {
    const source = toObject(filter);
    return [...entries.values()].filter((entry) => {
      if (source.status && String(entry.status) !== String(source.status)) return false;
      if (source.objectId && String(entry.objectId) !== String(source.objectId)) return false;
      if (source.objectVersion && String(entry.objectVersion) !== String(source.objectVersion)) return false;
      if (source.compatibilityFingerprint && String(entry.compatibilityFingerprint) !== String(source.compatibilityFingerprint)) return false;
      return true;
    });
  }

  function prewarm(items = [], context = {}, prewarmOptions = {}) {
    const source = toArray(items).slice(0, Number(policy.prewarmLimit || 0));
    const created = [];
    source.forEach((item) => {
      const request = toObject(item);
      if (typeof request.createInstance !== 'function') return;
      const instance = request.createInstance({ ...context, request });
      const entry = registerAvailableInstance(instance, context, prewarmOptions);
      created.push(entry);
    });
    recalcDiagnostics();
    return created;
  }

  function clear() {
    const count = entries.size;
    entries.clear();
    recalcDiagnostics();
    return count;
  }

  return {
    acquire,
    release,
    quarantine,
    destroy,
    list,
    prewarm,
    evictExpired,
    clear,
    getPolicy: () => ({ ...policy }),
    getDiagnostics: () => ({ ...diagnostics }),
    importEntries: (poolEntries = []) => {
      toArray(poolEntries).forEach((entry) => {
        if (!entry?.poolEntryId) return;
        entries.set(String(entry.poolEntryId), entry);
      });
      recalcDiagnostics();
      return entries.size;
    },
    exportEntries: () => list()
  };
}

export const defaultEducationalObjectPool = createEducationalObjectPool();
