import {
  UniversalRuntimeGraphAdapter,
  migrateAdapterProfile
} from './UniversalRuntimeGraphAdapter.js';

const STORE_KEY = '__daksha_universal_renderer_core_store__';
const SCHEMA_VERSION = 'v1';
const DEFAULT_PERSISTENCE_KEY = 'daksha.universal.renderer.core.v1';

function safeString(value) {
  return String(value || '').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parsePayload(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return isObject(value) ? value : null;
}

function createInMemoryStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }

  const store = globalThis[STORE_KEY];
  return {
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    getItem(key) {
      return store.get(String(key)) || null;
    },
    removeItem(key) {
      store.delete(String(key));
    }
  };
}

function createDefaultPersistenceAdapter() {
  const local = globalThis?.localStorage;
  if (local && typeof local.getItem === 'function' && typeof local.setItem === 'function') {
    return local;
  }
  return createInMemoryStore();
}

function createChannelSet() {
  return new Map();
}

function safeEmit(listenersMap, channel, payload) {
  const listeners = listenersMap.get(channel);
  if (!listeners || listeners.size === 0) return;

  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // Listener failures are isolated from renderer core.
    }
  });
}

function normalizeRenderStateProfile(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    lifecycle: {
      status: safeString(source?.lifecycle?.status || 'created') || 'created',
      initialized: source?.lifecycle?.initialized === true,
      built: source?.lifecycle?.built === true,
      paused: source?.lifecycle?.paused === true,
      destroyed: source?.lifecycle?.destroyed === true,
      reloadCount: Math.max(0, toFiniteNumber(source?.lifecycle?.reloadCount, 0)),
      resetCount: Math.max(0, toFiniteNumber(source?.lifecycle?.resetCount, 0))
    },
    renderState: {
      frame: Math.max(0, toFiniteNumber(source?.renderState?.frame, 0)),
      activeObjectCount: Math.max(0, toFiniteNumber(source?.renderState?.activeObjectCount, 0)),
      queueDepth: Math.max(0, toFiniteNumber(source?.renderState?.queueDepth, 0)),
      mode: safeString(source?.renderState?.mode || 'idle') || 'idle'
    },
    diagnostics: {
      builds: Math.max(0, toFiniteNumber(source?.diagnostics?.builds, 0)),
      updates: Math.max(0, toFiniteNumber(source?.diagnostics?.updates, 0)),
      pauses: Math.max(0, toFiniteNumber(source?.diagnostics?.pauses, 0)),
      resumes: Math.max(0, toFiniteNumber(source?.diagnostics?.resumes, 0)),
      destroys: Math.max(0, toFiniteNumber(source?.diagnostics?.destroys, 0)),
      warnings: asArray(source?.diagnostics?.warnings),
      recoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveries, 0))
    },
    metadata: {
      rendererAdapterVersion: safeString(source?.metadata?.rendererAdapterVersion || SCHEMA_VERSION) || SCHEMA_VERSION,
      runtimeGraphVersion: safeString(source?.metadata?.runtimeGraphVersion || 'v1') || 'v1',
      integration: isObject(source?.metadata?.integration) ? source.metadata.integration : {}
    },
    queue: {
      pending: asArray(source?.queue?.pending),
      active: asArray(source?.queue?.active),
      completed: asArray(source?.queue?.completed)
    }
  };
}

function migrateRenderStateProfile(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === SCHEMA_VERSION) {
    return normalizeRenderStateProfile(source);
  }

  return normalizeRenderStateProfile({
    schemaVersion: SCHEMA_VERSION,
    lifecycle: source.lifecycle,
    renderState: source.renderState || source.state,
    diagnostics: {
      ...(isObject(source.diagnostics) ? source.diagnostics : {}),
      warnings: [
        ...asArray(source?.diagnostics?.warnings),
        'Renderer core state migrated from legacy format.'
      ]
    },
    metadata: source.metadata,
    queue: source.queue || source.renderQueue
  });
}

export class UniversalRendererCore {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = isObject(options) ? options : {};
    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey) || DEFAULT_PERSISTENCE_KEY;
    this.adapter = this.options.adapter || new UniversalRuntimeGraphAdapter({
      profile: migrateAdapterProfile(this.options.adapterProfile || {})
    });

    this.listeners = createChannelSet();
    this.state = normalizeRenderStateProfile({
      lifecycle: {
        status: 'created',
        initialized: false,
        built: false,
        paused: false,
        destroyed: false,
        reloadCount: 0,
        resetCount: 0
      },
      renderState: {
        frame: 0,
        activeObjectCount: 0,
        queueDepth: 0,
        mode: 'idle'
      },
      diagnostics: {
        builds: 0,
        updates: 0,
        pauses: 0,
        resumes: 0,
        destroys: 0,
        warnings: [],
        recoveries: 0
      },
      metadata: {
        rendererAdapterVersion: SCHEMA_VERSION,
        runtimeGraphVersion: 'v1',
        integration: {}
      },
      queue: {
        pending: [],
        active: [],
        completed: []
      }
    });

    this.renderBundle = null;
    this.recoverSession();
  }

  on(channel, listener) {
    const safeChannel = safeString(channel) || '*';
    if (typeof listener !== 'function') {
      throw new Error('UniversalRendererCore listener must be a function.');
    }

    if (!this.listeners.has(safeChannel)) {
      this.listeners.set(safeChannel, new Set());
    }

    this.listeners.get(safeChannel).add(listener);
    return () => this.off(safeChannel, listener);
  }

  off(channel, listener) {
    const safeChannel = safeString(channel) || '*';
    const listeners = this.listeners.get(safeChannel);
    if (!listeners) return false;
    return listeners.delete(listener);
  }

  emit(channel, payload = {}) {
    const safeChannel = safeString(channel) || 'renderer-core-event';
    const message = {
      channel: safeChannel,
      payload,
      state: this.snapshot(),
      timestamp: Date.now()
    };

    safeEmit(this.listeners, safeChannel, message);
    safeEmit(this.listeners, '*', message);
    return message;
  }

  warn(message = 'Unknown renderer warning') {
    this.state.diagnostics.warnings.push(safeString(message));
    if (this.state.diagnostics.warnings.length > 400) {
      this.state.diagnostics.warnings.shift();
    }
  }

  buildQueueFromBundle(renderBundle = null) {
    if (!renderBundle) return { pending: [], active: [], completed: [] };
    const commands = asArray(renderBundle.rendererObjects).map((entry) => ({
      commandId: `cmd-${entry.renderId}`,
      action: 'mount',
      renderId: entry.renderId,
      nodeId: entry.nodeId,
      adapterType: entry.adapterType,
      payload: entry.payload
    }));

    return {
      pending: commands,
      active: [],
      completed: []
    };
  }

  initialize(input = {}) {
    if (this.state.lifecycle.destroyed) {
      return { status: 'rejected', reason: 'destroyed', state: this.snapshot() };
    }

    this.state.lifecycle.initialized = true;
    this.state.lifecycle.status = 'initialized';
    this.state.renderState.mode = 'initialized';
    this.state.metadata.integration = {
      sceneId: safeString(this.runtime?.sceneId || input?.sceneId || ''),
      timelineAttached: Boolean(this.runtime?.timelineScheduler),
      assetManagerAttached: Boolean(this.runtime?.assetLoadingRuntime),
      aiTeacherAttached: Boolean(this.runtime?.adaptiveTeachingRuntime),
      interactionEngineAttached: Boolean(this.runtime?.interactionContractRuntime)
    };

    this.emit('renderer-initialized', {
      sceneId: this.state.metadata.integration.sceneId || null
    });

    return {
      status: 'initialized',
      state: this.snapshot()
    };
  }

  build(input = {}) {
    if (!this.state.lifecycle.initialized) {
      this.initialize(input);
    }

    const adapted = this.adapter.adapt(input?.runtimeGraph ? input : { ...this.runtime, runtimeGraph: input?.runtimeGraph || this.runtime?.graph?.toJSON?.() || null }, {
      includeGenericUnknownNodes: true
    });

    if (!adapted.valid || !adapted.renderBundle) {
      adapted.errors.forEach((entry) => this.warn(entry));
      return {
        status: 'failed',
        errors: adapted.errors,
        warnings: adapted.warnings,
        state: this.snapshot()
      };
    }

    this.renderBundle = adapted.renderBundle;
    this.state.queue = this.buildQueueFromBundle(this.renderBundle);
    this.state.lifecycle.built = true;
    this.state.lifecycle.status = 'built';
    this.state.renderState.mode = 'ready';
    this.state.renderState.activeObjectCount = asArray(this.renderBundle.rendererObjects).length;
    this.state.renderState.queueDepth = this.state.queue.pending.length;
    this.state.diagnostics.builds += 1;

    this.emit('renderer-built', {
      objectCount: this.state.renderState.activeObjectCount,
      queueDepth: this.state.renderState.queueDepth
    });

    return {
      status: 'built',
      renderBundle: this.renderBundle,
      state: this.snapshot()
    };
  }

  update(input = {}) {
    if (!this.state.lifecycle.built) {
      return this.build(input);
    }

    const commands = asArray(input.commands);
    commands.forEach((entry, index) => {
      const command = isObject(entry) ? entry : { action: 'update', payload: entry };
      this.state.queue.pending.push({
        commandId: safeString(command.commandId || `external-cmd-${Date.now()}-${index + 1}`),
        action: safeString(command.action || 'update') || 'update',
        renderId: safeString(command.renderId || ''),
        nodeId: safeString(command.nodeId || ''),
        payload: isObject(command.payload) ? command.payload : {}
      });
    });

    const drained = [];
    while (this.state.queue.pending.length) {
      const command = this.state.queue.pending.shift();
      this.state.queue.active.push(command);
      drained.push(command);
      this.state.queue.completed.push({
        ...command,
        completedAt: Date.now()
      });
      this.state.queue.active.pop();
    }

    this.state.renderState.frame += 1;
    this.state.renderState.queueDepth = this.state.queue.pending.length;
    this.state.renderState.mode = this.state.lifecycle.paused ? 'paused' : 'rendering';
    this.state.diagnostics.updates += 1;

    this.emit('renderer-updated', {
      frame: this.state.renderState.frame,
      commandCount: drained.length
    });

    return {
      status: 'updated',
      processed: drained.length,
      state: this.snapshot()
    };
  }

  pause(reason = 'manual') {
    if (this.state.lifecycle.destroyed) return { status: 'rejected', reason: 'destroyed', state: this.snapshot() };

    this.state.lifecycle.paused = true;
    this.state.lifecycle.status = 'paused';
    this.state.renderState.mode = 'paused';
    this.state.diagnostics.pauses += 1;

    this.emit('renderer-paused', { reason });
    return { status: 'paused', state: this.snapshot() };
  }

  resume(reason = 'manual') {
    if (this.state.lifecycle.destroyed) return { status: 'rejected', reason: 'destroyed', state: this.snapshot() };

    this.state.lifecycle.paused = false;
    this.state.lifecycle.status = this.state.lifecycle.built ? 'built' : 'initialized';
    this.state.renderState.mode = this.state.lifecycle.built ? 'ready' : 'initialized';
    this.state.diagnostics.resumes += 1;

    this.emit('renderer-resumed', { reason });
    return { status: 'resumed', state: this.snapshot() };
  }

  reset() {
    if (this.state.lifecycle.destroyed) return { status: 'rejected', reason: 'destroyed', state: this.snapshot() };

    this.state.queue = {
      pending: [],
      active: [],
      completed: []
    };
    this.state.renderState.frame = 0;
    this.state.renderState.queueDepth = 0;
    this.state.renderState.mode = this.state.lifecycle.initialized ? 'initialized' : 'idle';
    this.state.lifecycle.built = false;
    this.state.lifecycle.resetCount += 1;

    this.emit('renderer-reset', {
      resetCount: this.state.lifecycle.resetCount
    });

    return {
      status: 'reset',
      state: this.snapshot()
    };
  }

  reload(input = {}) {
    if (this.state.lifecycle.destroyed) return { status: 'rejected', reason: 'destroyed', state: this.snapshot() };

    this.state.lifecycle.reloadCount += 1;
    this.reset();
    const result = this.build(input);

    this.emit('renderer-reloaded', {
      reloadCount: this.state.lifecycle.reloadCount
    });

    return {
      status: result.status,
      state: this.snapshot(),
      renderBundle: result.renderBundle || null
    };
  }

  destroy() {
    this.persistSession();

    this.state.lifecycle.destroyed = true;
    this.state.lifecycle.paused = false;
    this.state.lifecycle.status = 'destroyed';
    this.state.renderState.mode = 'destroyed';
    this.state.queue = {
      pending: [],
      active: [],
      completed: []
    };
    this.state.diagnostics.destroys += 1;

    this.emit('renderer-destroyed', {
      sceneId: this.state.metadata.integration.sceneId || null
    });

    this.listeners.clear();
    this.renderBundle = null;

    return {
      status: 'destroyed',
      state: this.snapshot()
    };
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = {
      schemaVersion: SCHEMA_VERSION,
      state: this.state,
      adapter: this.adapter.snapshot(),
      renderBundle: this.renderBundle,
      persistedAt: Date.now()
    };

    const serialized = JSON.stringify(payload);
    if (typeof adapter.setItem === 'function') {
      adapter.setItem(this.persistenceKey, serialized);
      return true;
    }
    if (typeof adapter.save === 'function') {
      adapter.save(this.persistenceKey, serialized);
      return true;
    }
    return false;
  }

  recoverSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    let raw = null;
    if (typeof adapter.getItem === 'function') {
      raw = adapter.getItem(this.persistenceKey);
    } else if (typeof adapter.load === 'function') {
      raw = adapter.load(this.persistenceKey);
    }

    if (!raw) return false;

    const parsed = parsePayload(raw);
    if (!parsed) {
      this.warn('Failed to recover renderer core session.');
      return false;
    }

    this.state = migrateRenderStateProfile(parsed.state || {});
    this.state.diagnostics.recoveries += 1;
    this.renderBundle = isObject(parsed.renderBundle) ? parsed.renderBundle : null;
    this.adapter.deserialize(parsed.adapter || {});

    return true;
  }

  synchronize(reason = 'manual', payload = {}) {
    const snapshot = this.snapshot();
    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      rendererCore: snapshot,
      rendererAdapter: {
        ...(this.runtime.metadata?.rendererAdapter || {}),
        rendererCoreState: snapshot
      },
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        rendererCoreState: snapshot
      },
      interactionEngine: {
        ...(this.runtime.metadata?.interactionEngine || {}),
        rendererCoreState: snapshot
      }
    };

    this.emit('renderer-sync', {
      reason,
      ...payload
    });

    return snapshot;
  }

  snapshot() {
    return normalizeRenderStateProfile({
      ...this.state,
      metadata: {
        ...this.state.metadata,
        integration: {
          ...(this.state.metadata.integration || {}),
          rendererObjects: Math.max(0, toFiniteNumber(this.renderBundle?.rendererObjects?.length, 0)),
          genericNodeCount: Math.max(0, toFiniteNumber(this.renderBundle?.metadata?.genericNodeCount, 0))
        }
      },
      queue: {
        pending: asArray(this.state.queue.pending),
        active: asArray(this.state.queue.active),
        completed: asArray(this.state.queue.completed).slice(-200)
      }
    });
  }

  static supportedChannels() {
    return [
      'renderer-sync',
      'renderer-initialized',
      'renderer-built',
      'renderer-updated',
      'renderer-paused',
      'renderer-resumed',
      'renderer-reset',
      'renderer-reloaded',
      'renderer-destroyed'
    ];
  }
}

export function createUniversalRendererCore(runtime = {}, options = {}) {
  return new UniversalRendererCore(runtime, options);
}

export {
  normalizeRenderStateProfile,
  migrateRenderStateProfile
};
