import { processEducationalObject } from './EducationalObjectVersionManager.js';
import { runEducationalObjectIntegrityChecks } from './EducationalObjectIntegrity.js';
import { evaluateEducationalObjectQuality } from './EducationalObjectQuality.js';
import { evaluateEducationalObjectQualityGate } from './EducationalObjectQualityGate.js';
import { createEducationalObjectTrust } from './EducationalObjectTrust.js';
import { createEducationalObjectRegistryEntry } from './EducationalObjectRegistryEntry.js';
import { createEducationalObjectRegistryDiagnostics, refreshEducationalObjectRegistryDiagnostics } from './EducationalObjectRegistryDiagnostics.js';
import { detectEducationalObjectDuplicates } from './EducationalObjectDuplicateResolver.js';
import { queryEducationalObjectEntries } from './EducationalObjectQuery.js';
import { applyUsageEvent } from './EducationalObjectUsageMetrics.js';
import { EducationalObjectRegistryError } from './EducationalObjectRegistryError.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function nowIso() {
  return new Date().toISOString();
}

function makeKey(objectId, version) {
  return `${String(objectId || '').trim()}::${String(version || 'v1').trim()}`;
}

function trustRank(level) {
  const map = { untrusted: 1, low: 2, standard: 3, trusted: 4, system: 5 };
  return map[String(level || 'untrusted').toLowerCase()] || 1;
}

function chooseEntry(existing, incoming, strategy = 'keep-existing') {
  if (!existing) return incoming;
  if (!incoming) return existing;
  if (strategy === 'replace') return incoming;
  if (strategy === 'prefer-higher-quality') {
    return Number(incoming?.quality?.score || 0) > Number(existing?.quality?.score || 0) ? incoming : existing;
  }
  if (strategy === 'prefer-trusted') {
    return trustRank(incoming?.trustLevel) > trustRank(existing?.trustLevel) ? incoming : existing;
  }
  return existing;
}

export function createEducationalObjectRegistry(options = {}) {
  const config = {
    allowFallback: options.allowFallback === true,
    conflictStrategy: String(options.conflictStrategy || 'keep-existing'),
    qualityThreshold: Number.isFinite(Number(options.qualityThreshold)) ? Number(options.qualityThreshold) : 65,
    knownObjectIds: toArray(options.knownObjectIds),
    metadata: toObject(options.metadata)
  };

  const byKey = new Map();
  const diagnostics = createEducationalObjectRegistryDiagnostics(options.diagnostics);

  function recalcDiagnostics() {
    const next = refreshEducationalObjectRegistryDiagnostics([...byKey.values()], diagnostics);
    Object.assign(diagnostics, next);
  }

  function addError(message, code = 'OBJECT_REGISTRATION_FAILED', details = {}) {
    diagnostics.registrationFailureCount += 1;
    diagnostics.errors.push({ at: nowIso(), code, message, details });
    diagnostics.errors = diagnostics.errors.slice(-200);
    return new EducationalObjectRegistryError(message, { code, details });
  }

  function registerEducationalObject(object = {}, context = {}, registrationOptions = {}) {
    const source = toObject(object);
    const allowFallback = registrationOptions.allowFallback === true || config.allowFallback;

    const processed = processEducationalObject(source, {
      allowFallback,
      knownObjectIds: config.knownObjectIds,
      preserveUnknownMetadata: true
    });

    if (!processed.object || !processed.object.objectId) {
      return {
        entry: null,
        inserted: false,
        replaced: false,
        duplicate: false,
        error: addError('Unable to process educational object.', 'OBJECT_PROCESSING_FAILED')
      };
    }

    const integrity = runEducationalObjectIntegrityChecks(processed.object, {
      knownObjectIds: config.knownObjectIds
    });

    if (integrity.status === 'invalid') {
      return {
        entry: null,
        inserted: false,
        replaced: false,
        duplicate: false,
        error: addError('Educational object integrity check failed.', 'OBJECT_INTEGRITY_INVALID', {
          warnings: integrity.warnings,
          errors: integrity.errors
        })
      };
    }

    const qualityEvaluation = evaluateEducationalObjectQuality([processed.object], {
      concepts: toArray(context.concepts),
      relationships: toArray(context.relationships),
      slotBindings: toArray(context.slotBindings),
      regionBindings: toArray(context.regionBindings),
      orderedSteps: toArray(context.orderedSteps),
      interactionRequirements: toArray(context.interactionRequirements)
    }, {
      qualityThreshold: config.qualityThreshold
    });

    const trust = createEducationalObjectTrust(registrationOptions.trust || source.trust || {}, {
      source: registrationOptions.source || context.source || source.source || 'registry'
    });

    const gate = evaluateEducationalObjectQualityGate(processed.object, context, {
      mode: 'registration',
      registrationThreshold: registrationOptions.qualityThreshold || config.qualityThreshold,
      trust,
      source: registrationOptions.source || context.source || source.source || 'registry'
    });

    if (!gate.passed) {
      diagnostics.qualityFailureCount += 1;
      if (registrationOptions.allowLowQuality !== true) {
        return {
          entry: null,
          inserted: false,
          replaced: false,
          duplicate: false,
          error: addError('Educational object did not pass quality gate.', 'OBJECT_QUALITY_GATE_FAILED', {
            hardFailures: gate.hardFailures,
            warnings: gate.warnings,
            score: gate.score,
            threshold: gate.threshold
          })
        };
      }
    }

    const key = makeKey(processed.object.objectId, processed.object.version);
    const incoming = createEducationalObjectRegistryEntry(processed.object, {
      quality: qualityEvaluation,
      compatibility: gate.diagnostics,
      trust,
      trustLevel: trust.level,
      source: registrationOptions.source || context.source || source.source || 'registry',
      ownership: registrationOptions.ownership || source.ownership || {},
      diagnostics: {
        processingStatus: processed.status,
        processingWarnings: processed.warnings,
        integrityStatus: integrity.status,
        integrityWarnings: integrity.warnings,
        qualityGate: gate
      },
      priority: registrationOptions.priority
    });

    const existing = byKey.get(key);
    const duplicate = Boolean(existing);
    const selected = chooseEntry(existing, incoming, registrationOptions.conflictStrategy || config.conflictStrategy);

    byKey.set(key, {
      ...selected,
      usage: applyUsageEvent(selected.usage, existing ? 'registered' : 'registered')
    });

    if (duplicate) diagnostics.duplicateCount += 1;
    recalcDiagnostics();

    return {
      entry: byKey.get(key),
      inserted: !existing,
      replaced: existing ? selected === incoming : false,
      duplicate,
      error: null
    };
  }

  function registerMany(objects = [], context = {}, registerOptions = {}) {
    const list = toArray(objects);
    const results = [];

    const duplicateScan = detectEducationalObjectDuplicates(list, {
      strategy: registerOptions.duplicateStrategy || 'merge-safe'
    });

    duplicateScan.canonicalObjects.forEach((object) => {
      results.push(registerEducationalObject(object, context, registerOptions));
    });

    diagnostics.duplicateCount += Number(duplicateScan.duplicates.length || 0);
    if (duplicateScan.conflicts.length) {
      diagnostics.warnings.push({
        at: nowIso(),
        code: 'OBJECT_DUPLICATE_CONFLICTS',
        details: duplicateScan.conflicts
      });
      diagnostics.warnings = diagnostics.warnings.slice(-200);
    }

    recalcDiagnostics();
    return {
      results,
      diagnostics: {
        duplicateCount: duplicateScan.duplicates.length,
        conflictCount: duplicateScan.conflicts.length
      }
    };
  }

  function unregister(objectId, version = 'v1') {
    const key = makeKey(objectId, version);
    const removed = byKey.delete(key);
    recalcDiagnostics();
    return removed;
  }

  function has(objectId, version = 'v1') {
    return byKey.has(makeKey(objectId, version));
  }

  function get(objectId, version = 'v1') {
    return byKey.get(makeKey(objectId, version)) || null;
  }

  function getLatest(objectId) {
    const id = String(objectId || '').trim();
    if (!id) return null;

    const entries = [...byKey.values()].filter((entry) => String(entry.objectId) === id);
    if (!entries.length) return null;

    entries.sort((a, b) => String(b.version).localeCompare(String(a.version)));
    return entries[0];
  }

  function query(queryInput = {}) {
    return queryEducationalObjectEntries([...byKey.values()], queryInput);
  }

  function list() {
    return [...byKey.values()];
  }

  function size() {
    return byKey.size;
  }

  function clear() {
    const count = byKey.size;
    byKey.clear();
    recalcDiagnostics();
    return count;
  }

  function markDeprecated(objectId, version = 'v1', deprecated = true) {
    const key = makeKey(objectId, version);
    const current = byKey.get(key);
    if (!current) return null;
    const next = {
      ...current,
      deprecated: deprecated === true,
      updatedAt: nowIso()
    };
    byKey.set(key, next);
    recalcDiagnostics();
    return next;
  }

  function setEnabled(objectId, version = 'v1', enabled = true) {
    const key = makeKey(objectId, version);
    const current = byKey.get(key);
    if (!current) return null;
    const next = {
      ...current,
      enabled: enabled !== false,
      updatedAt: nowIso()
    };
    byKey.set(key, next);
    recalcDiagnostics();
    return next;
  }

  function exportSnapshot() {
    diagnostics.serializationCount += 1;
    return {
      version: 1,
      createdAt: nowIso(),
      config,
      entries: list(),
      diagnostics: { ...diagnostics }
    };
  }

  function importSnapshot(snapshot = {}) {
    const source = toObject(snapshot);
    const entries = toArray(source.entries);

    clear();
    entries.forEach((entry) => {
      if (!entry?.objectId || !entry?.version || !entry?.object) return;
      const normalized = {
        ...entry,
        usage: entry.usage || {},
        diagnostics: entry.diagnostics || {},
        metadata: entry.metadata || {}
      };
      byKey.set(makeKey(entry.objectId, entry.version), normalized);
    });

    diagnostics.restoreCount += 1;
    recalcDiagnostics();
    return {
      restored: byKey.size,
      version: Number(source.version || 1)
    };
  }

  return {
    registerEducationalObject,
    registerMany,
    unregister,
    has,
    get,
    getLatest,
    query,
    list,
    size,
    clear,
    markDeprecated,
    setEnabled,
    exportSnapshot,
    importSnapshot,
    getDiagnostics: () => ({ ...diagnostics })
  };
}

export const defaultEducationalObjectRegistry = createEducationalObjectRegistry();
