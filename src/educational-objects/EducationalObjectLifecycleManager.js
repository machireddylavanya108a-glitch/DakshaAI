import { createEducationalObjectRegistry } from './EducationalObjectRegistry.js';
import { createEducationalObjectPool } from './EducationalObjectPool.js';
import { createEducationalObjectInstanceRegistry } from './EducationalObjectInstanceRegistry.js';
import { evaluateEducationalObjectQualityGate } from './EducationalObjectQualityGate.js';

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function nowIso() {
  return new Date().toISOString();
}

export function createEducationalObjectLifecycleManager(options = {}) {
  const registry = options.registry || createEducationalObjectRegistry(options.registryOptions || {});
  const pool = options.pool || createEducationalObjectPool(options.poolOptions || {});
  const instanceRegistry = options.instanceRegistry || createEducationalObjectInstanceRegistry(options.instanceRegistryOptions || {});

  function registerObject(object = {}, context = {}, registrationOptions = {}) {
    return registry.registerEducationalObject(object, context, registrationOptions);
  }

  function activateInstance(request = {}, context = {}, activationOptions = {}) {
    const source = toObject(request);
    const objectId = String(source.objectId || '').trim();
    const objectVersion = String(source.objectVersion || source.version || 'v1').trim();

    const entry = registry.get(objectId, objectVersion) || registry.getLatest(objectId);
    if (!entry) {
      return {
        status: 'missing',
        reason: 'registry-entry-not-found',
        instance: null,
        poolEntry: null,
        registryEntry: null
      };
    }

    const acquireResult = pool.acquire({
      objectId: entry.objectId,
      objectVersion: entry.version,
      compatibilityFingerprint: source.compatibilityFingerprint,
      signal: source.signal,
      createInstance: (factoryContext) => {
        const base = typeof activationOptions.instantiate === 'function'
          ? activationOptions.instantiate(entry.object, { ...context, ...factoryContext })
          : { ...entry.object };
        return {
          ...base,
          objectId: entry.objectId,
          objectVersion: entry.version,
          sceneId: context.sceneId || source.sceneId || '',
          templateInstanceId: context.templateInstanceId || source.templateInstanceId || null,
          slotBinding: context.slotBinding || source.slotBinding || null,
          regionBinding: context.regionBinding || source.regionBinding || null,
          ownership: {
            ...(entry.ownership || {}),
            mode: source.ownershipMode || entry?.ownership?.mode || 'scene-owned'
          },
          runtimeMetadata: {
            ...(entry.object.runtimeMetadata || {}),
            trustLevel: entry.trustLevel,
            lifecycleState: {
              initialized: true,
              active: true,
              paused: false,
              completed: false,
              destroyed: false,
              quarantined: false
            }
          },
          diagnostics: {
            ...(entry.object.diagnostics || {}),
            activatedAt: nowIso()
          }
        };
      }
    }, context, {
      trust: { level: entry.trustLevel },
      source: entry.source,
      context
    });

    if (!['reused', 'created'].includes(acquireResult.status)) {
      return {
        status: acquireResult.status,
        reason: acquireResult.reason,
        instance: null,
        poolEntry: acquireResult.entry || null,
        registryEntry: entry
      };
    }

    const instance = {
      ...(acquireResult.instance || {}),
      sceneId: context.sceneId || source.sceneId || '',
      templateInstanceId: context.templateInstanceId || source.templateInstanceId || null,
      slotBinding: context.slotBinding || source.slotBinding || null,
      regionBinding: context.regionBinding || source.regionBinding || null
    };

    const registered = instanceRegistry.registerInstance(instance, {
      ownership: instance.ownership,
      metadata: {
        poolEntryId: acquireResult.entry?.poolEntryId || null,
        acquireToken: acquireResult.token,
        source: entry.source
      }
    });

    if (registered.error) {
      pool.release(acquireResult.entry?.poolEntryId, {
        acquireToken: acquireResult.token,
        context,
        reason: 'instance-registry-registration-failed'
      });

      return {
        status: 'error',
        reason: registered.error,
        instance: null,
        poolEntry: acquireResult.entry || null,
        registryEntry: entry
      };
    }

    return {
      status: acquireResult.status,
      reason: acquireResult.reason,
      instance: registered.instance,
      poolEntry: acquireResult.entry,
      registryEntry: entry,
      token: acquireResult.token
    };
  }

  function releaseInstance(instanceId, context = {}, releaseOptions = {}) {
    const current = instanceRegistry.getInstance(instanceId);
    if (!current) {
      return {
        status: 'missing',
        reason: 'instance-not-found',
        poolResult: null
      };
    }

    const gate = evaluateEducationalObjectQualityGate(current, context, {
      mode: 'pool',
      poolThreshold: releaseOptions.poolThreshold,
      source: releaseOptions.source || 'lifecycle-release',
      trust: releaseOptions.trust || current?.trust || {}
    });

    const poolEntryId = current?.metadata?.poolEntryId || releaseOptions.poolEntryId;
    const acquireToken = releaseOptions.acquireToken || current?.metadata?.acquireToken || null;

    const poolResult = pool.release(poolEntryId, {
      acquireToken,
      context,
      trust: releaseOptions.trust,
      source: releaseOptions.source,
      poolThreshold: releaseOptions.poolThreshold,
      forceQuarantine: gate.quarantineRecommended === true
    });

    const released = instanceRegistry.unregisterInstance(current.instanceId);

    return {
      status: poolResult.status,
      reason: poolResult.reason,
      released,
      gate,
      poolResult
    };
  }

  function cleanupScene(sceneId, context = {}) {
    const instances = instanceRegistry.getBySceneId(sceneId);
    const releaseResults = [];

    instances.forEach((instance) => {
      releaseResults.push(releaseInstance(instance.instanceId, {
        ...context,
        sceneId
      }, {
        source: 'scene-cleanup'
      }));
    });

    const removed = instanceRegistry.clearScene(sceneId);

    return {
      sceneId,
      releasedCount: releaseResults.filter((result) => ['released', 'expired', 'quarantined', 'destroyed'].includes(result.status)).length,
      removedCount: removed,
      releaseResults
    };
  }

  function destroyAll() {
    const instances = instanceRegistry.listInstances();
    const destroyed = [];
    instances.forEach((instance) => {
      const poolEntryId = instance?.metadata?.poolEntryId;
      if (poolEntryId) {
        pool.destroy(poolEntryId, 'destroy-all');
      }
      instanceRegistry.unregisterInstance(instance.instanceId);
      destroyed.push(instance.instanceId);
    });

    registry.clear();
    pool.clear();

    return {
      destroyedCount: destroyed.length,
      destroyed
    };
  }

  function exportSnapshot() {
    return {
      version: 1,
      createdAt: nowIso(),
      registry: registry.exportSnapshot(),
      pool: {
        policy: pool.getPolicy(),
        entries: pool.exportEntries(),
        diagnostics: pool.getDiagnostics()
      },
      instances: instanceRegistry.listInstances()
    };
  }

  function importSnapshot(snapshot = {}) {
    const source = toObject(snapshot);
    const registryResult = registry.importSnapshot(source.registry || {});
    const importedPoolCount = pool.importEntries(source?.pool?.entries || []);

    instanceRegistry.clearAll();
    const instances = Array.isArray(source.instances) ? source.instances : [];
    instances.forEach((instance) => {
      instanceRegistry.registerInstance(instance, {
        ownership: instance?.ownership || {},
        metadata: instance?.metadata || {}
      });
    });

    return {
      registryResult,
      importedPoolCount,
      importedInstanceCount: instances.length
    };
  }

  return {
    registry,
    pool,
    instanceRegistry,
    registerObject,
    activateInstance,
    releaseInstance,
    cleanupScene,
    destroyAll,
    exportSnapshot,
    importSnapshot
  };
}

export const defaultEducationalObjectLifecycleManager = createEducationalObjectLifecycleManager();
