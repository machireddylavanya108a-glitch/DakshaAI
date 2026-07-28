import { createEducationalObjectInstance } from './EducationalObjectInstance.js';
import { createEducationalObjectFingerprint } from './EducationalObjectFingerprint.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function matchesQuery(instance = {}, query = {}) {
  const source = toObject(query);
  if (source.instanceIds && toArray(source.instanceIds).length && !toArray(source.instanceIds).includes(instance.instanceId)) return false;
  if (source.objectIds && toArray(source.objectIds).length && !toArray(source.objectIds).includes(instance.objectId)) return false;
  if (source.sceneIds && toArray(source.sceneIds).length && !toArray(source.sceneIds).includes(instance.sceneId)) return false;
  if (source.templateInstanceIds && toArray(source.templateInstanceIds).length && !toArray(source.templateInstanceIds).includes(instance.templateInstanceId)) return false;
  if (source.slotIds && toArray(source.slotIds).length && !toArray(source.slotIds).includes(instance.slotBinding)) return false;
  if (source.regionIds && toArray(source.regionIds).length && !toArray(source.regionIds).includes(instance.regionBinding)) return false;
  return true;
}

export function createEducationalObjectInstanceRegistry(seed = {}) {
  const store = new Map();
  const listeners = new Set();

  function emit(event, payload = {}) {
    listeners.forEach((listener) => {
      try {
        listener({ event, payload });
      } catch {
        // Listener errors are isolated.
      }
    });
  }

  function registerInstance(instance = {}, options = {}) {
    const normalized = createEducationalObjectInstance(instance);
    const instanceId = String(normalized.instanceId || '').trim();
    if (!instanceId) {
      return {
        instance: null,
        duplicate: false,
        error: 'instanceId is required.'
      };
    }

    if (!normalized.objectId) {
      return {
        instance: null,
        duplicate: false,
        error: 'objectId is required.'
      };
    }

    const duplicate = store.has(instanceId);
    const next = {
      ...normalized,
      ownership: toObject(options.ownership || normalized.ownership || {}),
      metadata: toObject(options.metadata || normalized.metadata || {}),
      fingerprint: createEducationalObjectFingerprint(normalized)
    };

    store.set(instanceId, next);
    emit(duplicate ? 'updated' : 'registered', { instanceId, objectId: normalized.objectId, duplicate });

    return {
      instance: next,
      duplicate,
      error: null
    };
  }

  function unregisterInstance(instanceId) {
    const id = String(instanceId || '').trim();
    if (!id) return false;
    const removed = store.delete(id);
    if (removed) emit('unregistered', { instanceId: id });
    return removed;
  }

  function getInstance(instanceId) {
    return store.get(String(instanceId || '').trim()) || null;
  }

  function findInstances(query = {}) {
    return [...store.values()].filter((instance) => matchesQuery(instance, query));
  }

  function listInstances(options = {}) {
    const includeScene = options.sceneId ? String(options.sceneId) : null;
    const includeObjectId = options.objectId ? String(options.objectId) : null;
    return [...store.values()].filter((instance) => {
      if (includeScene && String(instance.sceneId) !== includeScene) return false;
      if (includeObjectId && String(instance.objectId) !== includeObjectId) return false;
      return true;
    });
  }

  function updateInstance(instanceId, updates = {}) {
    const current = getInstance(instanceId);
    if (!current) return null;
    const next = {
      ...current,
      ...toObject(updates),
      instanceId: current.instanceId,
      objectId: String(toObject(updates).objectId || current.objectId)
    };
    store.set(current.instanceId, next);
    emit('updated', { instanceId: current.instanceId, objectId: next.objectId });
    return next;
  }

  function getByObjectId(objectId) {
    const id = String(objectId || '').trim();
    if (!id) return [];
    return [...store.values()].filter((instance) => String(instance.objectId) === id);
  }

  function getBySceneId(sceneId) {
    const id = String(sceneId || '').trim();
    if (!id) return [];
    return [...store.values()].filter((instance) => String(instance.sceneId) === id);
  }

  function getByTemplateInstanceId(templateInstanceId) {
    const id = String(templateInstanceId || '').trim();
    if (!id) return [];
    return [...store.values()].filter((instance) => String(instance.templateInstanceId || '') === id);
  }

  function getBySlotId(slotId) {
    const id = String(slotId || '').trim();
    if (!id) return [];
    return [...store.values()].filter((instance) => String(instance.slotBinding || '') === id);
  }

  function getByRegionId(regionId) {
    const id = String(regionId || '').trim();
    if (!id) return [];
    return [...store.values()].filter((instance) => String(instance.regionBinding || '') === id);
  }

  function clearScene(sceneId) {
    const id = String(sceneId || '').trim();
    if (!id) return 0;

    const ownedModes = new Set(['scene-owned', 'template-owned', 'pool-owned', 'registry-owned', 'cached']);
    let removed = 0;
    for (const [instanceId, instance] of store.entries()) {
      if (String(instance.sceneId || '') !== id) continue;
      const mode = String(instance?.ownership?.mode || '').trim();
      if (mode && !ownedModes.has(mode)) continue;
      store.delete(instanceId);
      removed += 1;
    }
    if (removed > 0) emit('scene-cleared', { sceneId: id, removed });
    return removed;
  }

  function clearAll() {
    const count = store.size;
    store.clear();
    if (count) emit('cleared', { count });
    return count;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') return false;
    listeners.add(listener);
    return true;
  }

  function unsubscribe(listener) {
    return listeners.delete(listener);
  }

  if (Array.isArray(seed.instances)) {
    seed.instances.forEach((instance) => registerInstance(instance, {
      metadata: instance?.metadata || {},
      ownership: instance?.ownership || {}
    }));
  }

  return {
    registerInstance,
    unregisterInstance,
    getInstance,
    findInstances,
    listInstances,
    updateInstance,
    getByObjectId,
    getBySceneId,
    getByTemplateInstanceId,
    getBySlotId,
    getByRegionId,
    clearScene,
    clearAll,
    subscribe,
    unsubscribe
  };
}

export const defaultEducationalObjectInstanceRegistry = createEducationalObjectInstanceRegistry();
