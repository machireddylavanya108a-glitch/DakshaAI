import { validateEducationalObjectBehavior } from './EducationalObjectBehaviorValidator.js';
import { repairEducationalObjectBehavior } from './EducationalObjectBehaviorRepair.js';

function keyOf(behaviorId, version) {
  return `${String(behaviorId || '').trim()}::${String(version || 'v1').trim()}`;
}

function createSnapshot(entry) {
  return {
    behaviorId: entry.behaviorId,
    version: entry.version,
    enabled: entry.enabled,
    source: entry.source,
    runtimeOnly: entry.runtimeOnly,
    metadata: entry.metadata,
    updatedAt: entry.updatedAt
  };
}

export function createEducationalObjectBehaviorRegistry(seed = {}) {
  const store = new Map();
  const listeners = new Set();

  function emit(event, payload = {}) {
    listeners.forEach((listener) => {
      try {
        listener({ event, payload });
      } catch {
        // Ignore listener errors for registry safety.
      }
    });
  }

  function registerBehavior(input = {}, options = {}) {
    const repaired = repairEducationalObjectBehavior(input, options);
    const validation = validateEducationalObjectBehavior(repaired.behavior, options);

    if (!validation.valid && options.allowInvalid !== true) {
      return {
        entry: null,
        duplicate: false,
        validation,
        repaired
      };
    }

    const behavior = validation.normalizedValue;
    const entryKey = keyOf(behavior.behaviorId, behavior.version);
    const duplicate = store.has(entryKey);

    const entry = {
      key: entryKey,
      behaviorId: behavior.behaviorId,
      version: behavior.version,
      purpose: behavior.purpose,
      enabled: behavior.enabled !== false,
      runtimeOnly: options.runtimeOnly === true,
      metadata: options.metadata && typeof options.metadata === 'object' ? options.metadata : {},
      source: options.source || behavior.source || 'registry',
      behavior,
      createdAt: duplicate ? store.get(entryKey).createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.set(entryKey, entry);
    emit(duplicate ? 'updated' : 'registered', { entry: createSnapshot(entry), duplicate });

    return {
      entry,
      duplicate,
      validation,
      repaired
    };
  }

  function unregisterBehavior(behaviorId, version = null) {
    const id = String(behaviorId || '').trim();
    if (!id) return 0;

    let removed = 0;
    if (version) {
      const key = keyOf(id, version);
      removed = store.delete(key) ? 1 : 0;
    } else {
      for (const key of [...store.keys()]) {
        if (key.startsWith(`${id}::`)) {
          store.delete(key);
          removed += 1;
        }
      }
    }

    if (removed) emit('unregistered', { behaviorId: id, version, removed });
    return removed;
  }

  function getBehavior(behaviorId, version = null) {
    const id = String(behaviorId || '').trim();
    if (!id) return null;

    if (version) {
      return store.get(keyOf(id, version))?.behavior || null;
    }

    const candidates = [...store.values()].filter((entry) => entry.behaviorId === id);
    if (!candidates.length) return null;
    candidates.sort((a, b) => String(b.version).localeCompare(String(a.version)) || String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return candidates[0].behavior;
  }

  function hasBehavior(behaviorId, version = null) {
    return Boolean(getBehavior(behaviorId, version));
  }

  function listBehaviors() {
    return [...store.values()].map((entry) => entry.behavior);
  }

  function findBehaviors(predicate = null) {
    const all = listBehaviors();
    if (typeof predicate !== 'function') return all;
    return all.filter((behavior) => {
      try {
        return predicate(behavior);
      } catch {
        return false;
      }
    });
  }

  function findByPurpose(purpose) {
    const target = String(purpose || '').trim().toLowerCase();
    if (!target) return [];
    return findBehaviors((behavior) => String(behavior.purpose || '').toLowerCase() === target);
  }

  function findByTrigger(triggerType) {
    const target = String(triggerType || '').trim().toLowerCase();
    if (!target) return [];
    return findBehaviors((behavior) => Array.isArray(behavior.triggers) && behavior.triggers.some((trigger) => String(trigger.type || '').toLowerCase() === target));
  }

  function findByEffect(effectType) {
    const target = String(effectType || '').trim().toLowerCase();
    if (!target) return [];
    return findBehaviors((behavior) => Array.isArray(behavior.effects) && behavior.effects.some((effect) => String(effect.type || '').toLowerCase() === target));
  }

  function enableBehavior(behaviorId, version = null) {
    const behavior = getBehavior(behaviorId, version);
    if (!behavior) return false;
    return updateBehavior(behavior.behaviorId, behavior.version, { enabled: true }).updated === true;
  }

  function disableBehavior(behaviorId, version = null) {
    const behavior = getBehavior(behaviorId, version);
    if (!behavior) return false;
    return updateBehavior(behavior.behaviorId, behavior.version, { enabled: false }).updated === true;
  }

  function updateBehavior(behaviorId, version, patch = {}, options = {}) {
    const key = keyOf(behaviorId, version);
    const existing = store.get(key);
    if (!existing) {
      return {
        updated: false,
        entry: null
      };
    }

    const registration = registerBehavior({
      ...existing.behavior,
      ...(patch && typeof patch === 'object' ? patch : {})
    }, {
      ...options,
      source: options.source || existing.source,
      runtimeOnly: existing.runtimeOnly
    });

    return {
      updated: Boolean(registration.entry),
      entry: registration.entry,
      validation: registration.validation,
      repaired: registration.repaired
    };
  }

  function clearRuntimeBehaviors() {
    let removed = 0;
    for (const [key, entry] of store.entries()) {
      if (entry.runtimeOnly) {
        store.delete(key);
        removed += 1;
      }
    }
    if (removed) emit('cleared-runtime', { removed });
    return removed;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return false;
    listeners.add(listener);
    return true;
  }

  function unsubscribe(listener) {
    return listeners.delete(listener);
  }

  function serialize() {
    return {
      entries: [...store.values()].map((entry) => ({
        key: entry.key,
        behaviorId: entry.behaviorId,
        version: entry.version,
        purpose: entry.purpose,
        enabled: entry.enabled,
        runtimeOnly: entry.runtimeOnly,
        source: entry.source,
        metadata: entry.metadata,
        behavior: entry.behavior,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      }))
    };
  }

  if (Array.isArray(seed.entries)) {
    seed.entries.forEach((entry) => {
      if (!entry?.behavior) return;
      registerBehavior(entry.behavior, {
        runtimeOnly: entry.runtimeOnly === true,
        source: entry.source || 'seed',
        metadata: entry.metadata || {}
      });
    });
  }

  return {
    registerBehavior,
    unregisterBehavior,
    getBehavior,
    hasBehavior,
    findBehaviors,
    findByPurpose,
    findByTrigger,
    findByEffect,
    enableBehavior,
    disableBehavior,
    updateBehavior,
    listBehaviors,
    clearRuntimeBehaviors,
    subscribe,
    unsubscribe,
    serialize
  };
}

export const defaultEducationalObjectBehaviorRegistry = createEducationalObjectBehaviorRegistry();
