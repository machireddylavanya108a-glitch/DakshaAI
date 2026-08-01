import {
  DEFAULT_INTERACTION_CONTRACT_CONFIG,
  SUPPORTED_INTERACTION_TYPES,
  asArray,
  clamp,
  isObject,
  normalizeInteractionType,
  toFiniteNumber
} from './UniversalInteractionContractConfig.js';

const STORE_KEY = '__daksha_interaction_contract_runtime_store__';

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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
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
      // Listener failures are isolated from interaction contract runtime flow.
    }
  });
}

function getRuntimeTimeMs(scheduler) {
  const snapshot = scheduler?.snapshot?.() || {};
  return Math.max(0, toFiniteNumber(snapshot?.clock?.timeMs, 0));
}

function findInteractionNodes(runtime = {}) {
  const nodes = runtime?.graph?.toJSON?.()?.nodes;
  return asArray(nodes).filter((node) => String(node?.metadata?.sourceKey || '').toLowerCase() === 'interactions');
}

function normalizeTargetIds(input = {}) {
  const source = isObject(input) ? input : {};
  const targetIds = [];

  const collect = (value) => {
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    const id = String(value || '').trim();
    if (!id) return;
    if (!targetIds.includes(id)) {
      targetIds.push(id);
    }
  };

  collect(source.targetObjectId);
  collect(source.targetObjectIds);
  collect(source.targets);
  collect(source.targetIds);
  collect(source.objectId);

  return targetIds;
}

function normalizeContract(input = {}, index = 0, sceneId = null) {
  const source = isObject(input) ? input : {};
  const normalizedType = normalizeInteractionType(source?.interactionType || source?.eventType || source?.type || source?.action || 'custom');
  const targetObjectIds = normalizeTargetIds(source);

  if (!targetObjectIds.length && sceneId) {
    targetObjectIds.push(sceneId);
  }

  const contractId = String(source.id || source.contractId || `interaction-contract-${index + 1}`).trim() || `interaction-contract-${index + 1}`;
  const checkpointPolicy = isObject(source.checkpointPolicy)
    ? {
      onInteract: source.checkpointPolicy.onInteract === true,
      checkpointType: String(source.checkpointPolicy.checkpointType || 'interaction').trim() || 'interaction'
    }
    : {
      onInteract: source?.checkpointOnInteract === true,
      checkpointType: String(source?.checkpointType || 'interaction').trim() || 'interaction'
    };

  return {
    id: contractId,
    type: normalizedType.type,
    knownType: normalizedType.known,
    targetObjectIds,
    label: String(source.label || source.name || source.title || contractId).trim() || contractId,
    details: asArray(source.details),
    payloadSchema: isObject(source.payloadSchema) ? source.payloadSchema : {},
    constraints: isObject(source.constraints) ? source.constraints : {},
    metadata: isObject(source.metadata) ? source.metadata : {},
    timelineBinding: {
      timeMs: Math.max(0, toFiniteNumber(source.timeMs ?? source.time, 0)),
      markerId: String(source.markerId || '').trim() || null,
      eventId: String(source.eventId || '').trim() || null,
      clipId: String(source.clipId || '').trim() || null,
      checkpointPolicy
    }
  };
}

function isLikelyNormalizedContract(input = {}) {
  return Boolean(
    isObject(input)
    && Array.isArray(input.targetObjectIds)
    && isObject(input.timelineBinding)
    && typeof input.type === 'string'
  );
}

function prepareContractForRegistration(input = {}, index = 0, sceneId = null) {
  if (!isLikelyNormalizedContract(input)) {
    return normalizeContract(input, index, sceneId);
  }

  const normalizedType = normalizeInteractionType(input.type || 'custom');
  return {
    ...input,
    id: String(input.id || input.contractId || `interaction-contract-${index + 1}`).trim() || `interaction-contract-${index + 1}`,
    type: normalizedType.type,
    knownType: typeof input.knownType === 'boolean' ? input.knownType : normalizedType.known,
    targetObjectIds: input.targetObjectIds
      .map((value) => String(value || '').trim())
      .filter(Boolean),
    timelineBinding: {
      timeMs: Math.max(0, toFiniteNumber(input?.timelineBinding?.timeMs, 0)),
      markerId: String(input?.timelineBinding?.markerId || '').trim() || null,
      eventId: String(input?.timelineBinding?.eventId || '').trim() || null,
      clipId: String(input?.timelineBinding?.clipId || '').trim() || null,
      checkpointPolicy: {
        onInteract: input?.timelineBinding?.checkpointPolicy?.onInteract === true,
        checkpointType: String(input?.timelineBinding?.checkpointPolicy?.checkpointType || 'interaction').trim() || 'interaction'
      }
    },
    details: asArray(input.details),
    payloadSchema: isObject(input.payloadSchema) ? input.payloadSchema : {},
    constraints: isObject(input.constraints) ? input.constraints : {},
    metadata: isObject(input.metadata) ? input.metadata : {}
  };
}

function toStructuredRuntimeEvent(event = {}, state = {}) {
  return {
    eventId: String(event.eventId || `interaction-event-${Date.now()}`).trim(),
    contractId: String(event.contractId || '').trim() || null,
    type: String(event.type || 'custom').trim() || 'custom',
    knownType: event.knownType !== false,
    targetObjectIds: asArray(event.targetObjectIds),
    sourceObjectId: String(event.sourceObjectId || '').trim() || null,
    action: String(event.action || event.type || 'custom').trim() || 'custom',
    payload: isObject(event.payload) ? event.payload : {},
    timelineTimeMs: Math.max(0, toFiniteNumber(event.timelineTimeMs, state.timelineTimeMs || 0)),
    checkpointId: String(event.checkpointId || '').trim() || null,
    metadata: {
      ...(isObject(event.metadata) ? event.metadata : {}),
      runtime: 'universal-interaction-contract',
      schemaVersion: 'v1'
    },
    timestamp: Date.now()
  };
}

export class UniversalInteractionContractRuntime {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_INTERACTION_CONTRACT_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.sceneEventRuntime = runtime?.sceneEventRuntime || runtime?.sceneEventSystem || null;
    this.persistenceAdapter = this.options.persistenceAdapter || this.scheduler?.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = String(this.options.persistenceKey || DEFAULT_INTERACTION_CONTRACT_CONFIG.persistenceKey);

    this.listeners = createChannelSet();
    this.unsubscribers = [];

    this.state = {
      schemaVersion: 'v1',
      sceneId: runtime?.sceneId || null,
      timelineTimeMs: getRuntimeTimeMs(this.scheduler),
      contracts: {
        byId: {},
        byObjectId: {}
      },
      metrics: {
        contractCount: 0,
        objectCount: 0,
        eventCount: 0,
        unknownTypeCount: 0,
        validationErrors: 0
      },
      diagnostics: {
        registrationCount: 0,
        emittedEvents: 0,
        persistedSessions: 0,
        recoveredSessions: 0,
        warnings: []
      },
      events: {
        recent: []
      },
      recovery: {
        interrupted: false,
        lastCheckpointId: null,
        resumeTimeMs: 0
      }
    };

    this.attachScheduler(this.scheduler);
    this.attachSceneEventRuntime(this.sceneEventRuntime);

    const graphContracts = findInteractionNodes(this.runtime).map((node, index) => ({
      ...node?.properties,
      id: node?.id || node?.properties?.id || `interaction-contract-${index + 1}`
    }));

    this.registerContracts(graphContracts, {
      reason: 'runtime-graph-boot',
      emit: false
    });

    this.synchronize('boot');
  }

  on(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    if (typeof listener !== 'function') {
      throw new Error('UniversalInteractionContractRuntime listener must be a function.');
    }

    if (!this.listeners.has(safeChannel)) {
      this.listeners.set(safeChannel, new Set());
    }

    this.listeners.get(safeChannel).add(listener);
    return () => this.off(safeChannel, listener);
  }

  off(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    const listeners = this.listeners.get(safeChannel);
    if (!listeners) return false;
    return listeners.delete(listener);
  }

  emit(channel, payload = {}) {
    const safeChannel = String(channel || '').trim() || 'interaction-contract-event';
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

  attachScheduler(scheduler) {
    if (!scheduler || typeof scheduler.on !== 'function') return;

    const unsubscribe = scheduler.on('*', (event) => {
      const name = String(event?.name || '').trim();
      if (!name) return;

      if (name === 'TimelinePaused') {
        this.state.recovery.interrupted = true;
      }

      if (name === 'TimelineResumed') {
        this.state.recovery.interrupted = false;
      }

      this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachSceneEventRuntime(sceneEventRuntime) {
    if (!sceneEventRuntime || typeof sceneEventRuntime.on !== 'function') return;

    const unsubscribe = sceneEventRuntime.on('SceneEventDispatched', ({ event }) => {
      const payload = isObject(event?.payload) ? event.payload : {};
      const interaction = isObject(payload?.interaction) ? payload.interaction : null;
      const source = interaction || event;
      const normalizedType = normalizeInteractionType(source?.interactionType || source?.eventType || source?.type || source?.action || 'custom');
      const targetObjectIds = normalizeTargetIds(source);

      if (!targetObjectIds.length && !interaction && String(event?.source || '').toLowerCase() !== 'graph-interaction') {
        return;
      }

      const structuredEvent = this.emitInteractionEvent({
        contractId: source?.id || null,
        type: normalizedType.type,
        knownType: normalizedType.known,
        targetObjectIds,
        sourceObjectId: String(source?.sourceObjectId || '').trim() || null,
        payload,
        metadata: {
          source: String(event?.source || 'scene-event-runtime'),
          eventId: String(event?.id || '').trim() || null
        }
      }, {
        reason: 'scene-event-runtime',
        persist: false
      });

      if (structuredEvent && normalizedType.known === false) {
        this.state.diagnostics.warnings.push(`Unknown interaction type preserved: ${normalizedType.type}`);
        if (this.state.diagnostics.warnings.length > 200) {
          this.state.diagnostics.warnings.shift();
        }
      }
    });

    this.unsubscribers.push(unsubscribe);
  }

  validateContract(input = {}) {
    const normalized = prepareContractForRegistration(input, 0, this.runtime?.sceneId || null);
    const errors = [];

    const source = isObject(input) ? input : {};
    const hasExplicitTargetField = source.targetObjectId !== undefined
      || source.targetObjectIds !== undefined
      || source.targets !== undefined
      || source.targetIds !== undefined
      || source.objectId !== undefined;
    const explicitTargetIds = normalizeTargetIds(source);

    if (!normalized.id) {
      errors.push('Interaction contract id is required.');
    }

    if (hasExplicitTargetField && explicitTargetIds.length === 0) {
      errors.push('Interaction contract requires at least one valid target object id.');
    } else if (!hasExplicitTargetField && !normalized.targetObjectIds.length) {
      errors.push('Interaction contract requires at least one target object id.');
    }

    if (Object.keys(normalized.payloadSchema || {}).length > 300) {
      errors.push('Interaction contract payload schema is too large.');
    }

    return {
      valid: errors.length === 0,
      errors,
      normalized
    };
  }

  registerContracts(contracts = [], options = {}) {
    const sourceContracts = asArray(contracts).slice(0, this.options.maxObjectContracts);
    const byId = { ...this.state.contracts.byId };
    const byObjectId = { ...this.state.contracts.byObjectId };

    sourceContracts.forEach((contract, index) => {
      const candidate = prepareContractForRegistration({
        ...contract,
        id: contract?.id || `interaction-contract-${index + 1}`
      }, index, this.runtime?.sceneId || null);

      const validation = this.validateContract(candidate);

      if (!validation.valid) {
        this.state.metrics.validationErrors += validation.errors.length;
        this.state.diagnostics.warnings.push(...validation.errors.map((entry) => `Contract ${contract?.id || index}: ${entry}`));
        return;
      }

      const normalized = validation.normalized;
      byId[normalized.id] = normalized;

      normalized.targetObjectIds.forEach((objectId) => {
        if (!byObjectId[objectId]) {
          byObjectId[objectId] = [];
        }

        const existing = byObjectId[objectId].find((item) => item.id === normalized.id);
        if (existing) {
          Object.assign(existing, normalized);
        } else {
          byObjectId[objectId].push(normalized);
        }
      });

      if (!normalized.knownType) {
        this.state.metrics.unknownTypeCount += 1;
      }

      this.state.diagnostics.registrationCount += 1;
    });

    this.state.contracts.byId = byId;
    this.state.contracts.byObjectId = byObjectId;
    this.state.metrics.contractCount = Object.keys(byId).length;
    this.state.metrics.objectCount = Object.keys(byObjectId).length;

    if (options.emit !== false) {
      this.emit('interaction-contracts-registered', {
        reason: String(options.reason || 'manual').trim() || 'manual',
        registered: this.state.metrics.contractCount,
        objects: this.state.metrics.objectCount
      });
    }

    this.synchronize(String(options.reason || 'register-contracts'));
    return this.snapshot();
  }

  registerInteractionContract(contract = {}, options = {}) {
    return this.registerContracts([contract], options);
  }

  emitInteractionEvent(event = {}, options = {}) {
    this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);

    const structured = toStructuredRuntimeEvent({
      ...event,
      timelineTimeMs: this.state.timelineTimeMs
    }, this.state);

    this.state.events.recent.push(structured);
    if (this.state.events.recent.length > Math.max(10, toFiniteNumber(this.options.maxEventHistory, 500))) {
      this.state.events.recent.shift();
    }

    this.state.metrics.eventCount += 1;
    this.state.diagnostics.emittedEvents += 1;

    let checkpointId = null;
    const contract = structured.contractId ? this.state.contracts.byId[structured.contractId] : null;
    const checkpointPolicy = contract?.timelineBinding?.checkpointPolicy || this.options.defaultCheckpointPolicy;
    const shouldCheckpoint = checkpointPolicy?.onInteract === true && typeof this.scheduler?.createCheckpoint === 'function';

    if (shouldCheckpoint) {
      const checkpoint = this.scheduler.createCheckpoint(String(checkpointPolicy.checkpointType || 'interaction'), {
        source: 'interaction-contract-runtime',
        contractId: structured.contractId,
        type: structured.type,
        targetObjectIds: structured.targetObjectIds
      });
      checkpointId = checkpoint?.id || null;
      this.state.recovery.lastCheckpointId = checkpointId;
      this.state.recovery.resumeTimeMs = checkpoint?.timeMs ?? this.state.timelineTimeMs;
    }

    const runtimeEvent = {
      ...structured,
      checkpointId
    };

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      interactionContract: this.snapshot(),
      interactionHistory: [...this.state.events.recent],
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        interactionContractState: this.snapshot()
      },
      interactionEngine: {
        ...(this.runtime.metadata?.interactionEngine || {}),
        contractState: this.snapshot()
      }
    };

    this.emit('interaction-event-emitted', {
      reason: String(options.reason || 'manual').trim() || 'manual',
      event: runtimeEvent
    });

    if (options.persist !== false) {
      this.persistSession();
    }

    this.synchronize(String(options.reason || 'interaction-event'));
    return runtimeEvent;
  }

  handleExternalTimelineMutation(mutationType = 'manual', context = {}) {
    const safeType = String(mutationType || 'manual').trim() || 'manual';

    if (safeType.includes('resume') || safeType.includes('recover')) {
      this.state.recovery.interrupted = false;
    }

    if (safeType.includes('pause')) {
      this.state.recovery.interrupted = true;
    }

    if (safeType.includes('seek') || safeType.includes('replay') || safeType.includes('checkpoint')) {
      this.state.recovery.resumeTimeMs = getRuntimeTimeMs(this.scheduler);
    }

    this.synchronize(`mutation:${safeType}`);
    this.emit('interaction-runtime-synchronized', {
      reason: `mutation:${safeType}`,
      context: isObject(context) ? context : {}
    });

    return this.snapshot();
  }

  synchronize(reason = 'manual') {
    this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      interactionContract: this.snapshot(),
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        interactionContractState: this.snapshot()
      },
      interactionEngine: {
        ...(this.runtime.metadata?.interactionEngine || {}),
        contractState: this.snapshot()
      }
    };

    this.emit('interaction-runtime-synchronized', {
      reason
    });

    return this.snapshot();
  }

  createPersistencePayload() {
    return {
      schemaVersion: 'v1',
      persistedAt: Date.now(),
      state: this.state
    };
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const serialized = JSON.stringify(this.createPersistencePayload());
    if (typeof adapter.setItem === 'function') {
      adapter.setItem(this.persistenceKey, serialized);
    } else if (typeof adapter.save === 'function') {
      adapter.save(this.persistenceKey, serialized);
    } else {
      return false;
    }

    this.state.diagnostics.persistedSessions += 1;
    this.emit('interaction-runtime-persisted', {
      persistenceKey: this.persistenceKey
    });

    return true;
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
    if (!parsed || !isObject(parsed.state)) return false;

    this.state = {
      ...this.state,
      ...parsed.state,
      recovery: {
        ...(isObject(parsed?.state?.recovery) ? parsed.state.recovery : this.state.recovery),
        interrupted: true
      },
      diagnostics: {
        ...(isObject(parsed?.state?.diagnostics) ? parsed.state.diagnostics : this.state.diagnostics),
        recoveredSessions: toFiniteNumber(parsed?.state?.diagnostics?.recoveredSessions, this.state.diagnostics.recoveredSessions) + 1
      }
    };

    this.state.timelineTimeMs = Math.max(0, toFiniteNumber(this.state.timelineTimeMs, getRuntimeTimeMs(this.scheduler)));
    this.scheduler?.seekByTime?.(this.state.timelineTimeMs);

    this.synchronize('recover-session');

    this.emit('interaction-runtime-recovered', {
      persistenceKey: this.persistenceKey,
      timelineTimeMs: this.state.timelineTimeMs
    });

    return true;
  }

  snapshot() {
    const knownTypes = new Set();
    const unknownTypes = new Set();

    Object.values(this.state.contracts.byId || {}).forEach((contract) => {
      if (contract?.knownType === false) {
        unknownTypes.add(String(contract.type || 'custom'));
      } else {
        knownTypes.add(String(contract.type || 'custom'));
      }
    });

    return deepClone({
      schemaVersion: 'v1',
      sceneId: this.state.sceneId,
      timelineTimeMs: this.state.timelineTimeMs,
      contracts: this.state.contracts,
      metrics: this.state.metrics,
      diagnostics: this.state.diagnostics,
      events: this.state.events,
      recovery: this.state.recovery,
      supportedInteractionTypes: [...SUPPORTED_INTERACTION_TYPES],
      knownInteractionTypes: [...knownTypes],
      unknownInteractionTypes: [...unknownTypes],
      coverageScore: clamp(
        toFiniteNumber(this.state.metrics.contractCount, 0) === 0
          ? 1
          : toFiniteNumber(this.state.metrics.objectCount, 0) / Math.max(1, toFiniteNumber(this.state.metrics.contractCount, 0)),
        0,
        1
      )
    });
  }

  destroy() {
    this.persistSession();

    this.unsubscribers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.unsubscribers = [];

    this.emit('interaction-runtime-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });
  }

  static supportedChannels() {
    return [
      'interaction-contracts-registered',
      'interaction-event-emitted',
      'interaction-runtime-synchronized',
      'interaction-runtime-persisted',
      'interaction-runtime-recovered',
      'interaction-runtime-destroyed'
    ];
  }
}

export function createUniversalInteractionContractRuntime(runtime = {}, options = {}) {
  return new UniversalInteractionContractRuntime(runtime, options);
}
