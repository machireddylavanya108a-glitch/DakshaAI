import {
  DEFAULT_EDUCATIONAL_INSPECTION_CONFIG,
  SUPPORTED_EDUCATIONAL_OBJECT_CAPABILITIES,
  asArray,
  clamp,
  isObject,
  normalizeCapability,
  toFiniteNumber
} from './UniversalEducationalInspectionConfig.js';

const STORE_KEY = '__daksha_educational_inspection_runtime_store__';

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
      // Listener failures are isolated from educational inspection runtime.
    }
  });
}

function getRuntimeTimeMs(scheduler) {
  const snapshot = scheduler?.snapshot?.() || {};
  return Math.max(0, toFiniteNumber(snapshot?.clock?.timeMs, 0));
}

function collectObjectNodes(runtime = {}) {
  const nodes = runtime?.graph?.toJSON?.()?.nodes;
  return asArray(nodes).filter((node) => {
    const sourceKey = String(node?.metadata?.sourceKey || '').toLowerCase();
    return sourceKey === 'objects' || sourceKey === 'educationalobjects' || sourceKey === 'educationalobjectinstances';
  });
}

function sanitizeMetadata(input = {}, depth = 0) {
  if (depth > 7) return '[truncated-depth]';

  if (input === null || input === undefined) return input;

  if (typeof input === 'function' || typeof input === 'symbol') return undefined;

  if (typeof input === 'string') {
    return String(input)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim()
      .slice(0, 2000);
  }

  if (typeof input !== 'object') return input;

  if (Array.isArray(input)) {
    return input
      .slice(0, 400)
      .map((entry) => sanitizeMetadata(entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }

  const output = Object.create(null);
  Object.entries(input).forEach(([key, value]) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
    const cleaned = sanitizeMetadata(value, depth + 1);
    if (cleaned !== undefined) output[key] = cleaned;
  });

  return output;
}

function normalizeCapabilityList(input = []) {
  const normalized = [];
  asArray(input).forEach((entry) => {
    const capability = normalizeCapability(entry);
    if (!normalized.some((item) => item.capability === capability.capability)) {
      normalized.push(capability);
    }
  });
  return normalized;
}

function findCapabilitySource(node = {}) {
  return asArray(
    node?.runtimeData?.educationalInspection?.capabilities
    || node?.runtimeData?.inspectionCapabilities
    || node?.properties?.inspectionCapabilities
    || node?.properties?.capabilities
    || node?.properties?.manipulationCapabilities
    || node?.properties?.interactionCapabilities
  );
}

function buildObjectStateFromNode(node = {}) {
  const nodeId = String(node?.id || '').trim();
  const capabilities = normalizeCapabilityList(findCapabilitySource(node));
  const knownCapabilities = capabilities.filter((item) => item.known !== false).map((item) => item.capability);
  const unknownCapabilities = capabilities.filter((item) => item.known === false).map((item) => item.capability);

  const baseCapabilities = [...new Set([
    ...SUPPORTED_EDUCATIONAL_OBJECT_CAPABILITIES,
    ...capabilities.map((item) => item.capability)
  ])];

  return {
    objectId: nodeId,
    selected: false,
    visible: true,
    isolated: false,
    highlighted: false,
    exploded: false,
    assembled: true,
    crossSection: false,
    xRay: false,
    temporaryDuplicates: [],
    transform: {
      rotation: [0, 0, 0],
      zoom: 1,
      position: asArray(node?.properties?.position).length >= 3
        ? [
          toFiniteNumber(node.properties.position[0], 0),
          toFiniteNumber(node.properties.position[1], 0),
          toFiniteNumber(node.properties.position[2], 0)
        ]
        : [0, 0, 0]
    },
    annotations: [],
    measurements: [],
    compareWith: [],
    metadata: sanitizeMetadata({
      node,
      runtimeData: node?.runtimeData || {},
      properties: node?.properties || {},
      sourceMetadata: node?.metadata || {}
    }),
    capabilities: baseCapabilities,
    knownCapabilities,
    unknownCapabilities
  };
}

function sanitizeRuntimeEvent(event = {}, fallbackTimeMs = 0) {
  const source = isObject(event) ? event : {};
  return {
    eventId: String(source.eventId || `educational-inspection-event-${Date.now()}`),
    type: String(source.type || 'educational-inspection-event').trim() || 'educational-inspection-event',
    action: String(source.action || source.capability || 'unknown').trim() || 'unknown',
    objectId: String(source.objectId || '').trim() || null,
    objectIds: asArray(source.objectIds).map((entry) => String(entry || '').trim()).filter(Boolean),
    capability: String(source.capability || '').trim() || null,
    knownCapability: source.knownCapability !== false,
    payload: sanitizeMetadata(source.payload || {}),
    timelineTimeMs: Math.max(0, toFiniteNumber(source.timelineTimeMs, fallbackTimeMs)),
    metadata: sanitizeMetadata(source.metadata || {}),
    checkpointId: String(source.checkpointId || '').trim() || null,
    timestamp: Date.now()
  };
}

function createHistoryEntry(action = 'unknown', payload = {}) {
  return {
    id: `history-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    action: String(action || 'unknown'),
    payload: sanitizeMetadata(payload),
    timestamp: Date.now()
  };
}

export class UniversalEducationalInspectionRuntime {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_EDUCATIONAL_INSPECTION_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.interactionContractRuntime = runtime?.interactionContractRuntime || null;
    this.persistenceAdapter = this.options.persistenceAdapter || this.scheduler?.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = String(this.options.persistenceKey || DEFAULT_EDUCATIONAL_INSPECTION_CONFIG.persistenceKey);

    this.listeners = createChannelSet();
    this.unsubscribers = [];

    const objectStates = this.buildObjectStateMap();

    this.state = {
      schemaVersion: 'v1',
      sceneId: runtime?.sceneId || null,
      timelineTimeMs: getRuntimeTimeMs(this.scheduler),
      objects: {
        byId: objectStates,
        selectedIds: []
      },
      metrics: {
        objectCount: Object.keys(objectStates).length,
        selectedCount: 0,
        knownCapabilityCount: Object.values(objectStates).reduce((sum, entry) => sum + asArray(entry.knownCapabilities).length, 0),
        unknownCapabilityCount: Object.values(objectStates).reduce((sum, entry) => sum + asArray(entry.unknownCapabilities).length, 0),
        inspectionCount: 0,
        manipulationCount: 0,
        undoCount: 0,
        redoCount: 0,
        resetCount: 0,
        validationErrors: 0
      },
      diagnostics: {
        synchronizations: 0,
        persistedSessions: 0,
        recoveredSessions: 0,
        warnings: []
      },
      history: {
        undoStack: [],
        redoStack: []
      },
      runtimeEvents: {
        recent: []
      },
      recovery: {
        interrupted: false,
        lastCheckpointId: null,
        resumeTimeMs: 0
      }
    };

    this.attachScheduler(this.scheduler);
    this.attachInteractionContractRuntime(this.interactionContractRuntime);

    this.synchronize('boot');
  }

  buildObjectStateMap() {
    const nodes = collectObjectNodes(this.runtime);
    const map = {};

    nodes.forEach((node) => {
      const next = buildObjectStateFromNode(node);
      if (next.objectId) {
        map[next.objectId] = next;
      }
    });

    return map;
  }

  on(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    if (typeof listener !== 'function') {
      throw new Error('UniversalEducationalInspectionRuntime listener must be a function.');
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
    const safeChannel = String(channel || '').trim() || 'educational-inspection-event';
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

  pushWarning(message = 'unknown warning') {
    this.state.diagnostics.warnings.push(String(message));
    if (this.state.diagnostics.warnings.length > Math.max(10, toFiniteNumber(this.options.maxWarnings, 200))) {
      this.state.diagnostics.warnings.shift();
    }
  }

  pushRuntimeEvent(event = {}) {
    const next = sanitizeRuntimeEvent(event, this.state.timelineTimeMs);
    this.state.runtimeEvents.recent.push(next);
    if (this.state.runtimeEvents.recent.length > Math.max(10, toFiniteNumber(this.options.maxEventHistory, 500))) {
      this.state.runtimeEvents.recent.shift();
    }
    return next;
  }

  validateObjectId(objectId = null) {
    const key = String(objectId || '').trim();
    if (!key) return { valid: false, error: 'Object id is required.' };
    if (!this.state.objects.byId[key]) return { valid: false, error: `Unknown object id: ${key}` };
    return { valid: true, key };
  }

  validateCapability(capability = 'inspect') {
    const normalized = normalizeCapability(capability || 'inspect');
    return {
      capability: normalized.capability,
      known: normalized.known
    };
  }

  pushHistory(action = 'unknown', payload = {}) {
    const snapshot = this.snapshot();
    snapshot.history = {
      undoStack: [],
      redoStack: []
    };

    this.state.history.undoStack.push(createHistoryEntry(action, {
      state: snapshot,
      ...payload
    }));

    if (this.state.history.undoStack.length > Math.max(1, toFiniteNumber(this.options.maxHistoryEntries, 200))) {
      this.state.history.undoStack.shift();
    }

    this.state.history.redoStack = [];
  }

  restoreFromSnapshot(snapshot = {}) {
    if (!isObject(snapshot)) return false;

    const preservedHistory = {
      undoStack: this.state.history.undoStack,
      redoStack: this.state.history.redoStack
    };

    this.state = {
      ...this.state,
      ...snapshot,
      history: preservedHistory,
      diagnostics: {
        ...(isObject(this.state.diagnostics) ? this.state.diagnostics : {}),
        ...(isObject(snapshot.diagnostics) ? snapshot.diagnostics : {})
      }
    };

    return true;
  }

  selectObjects(objectIds = [], options = {}) {
    const ids = asArray(objectIds)
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
      .filter((entry, index, all) => all.indexOf(entry) === index)
      .filter((entry) => this.state.objects.byId[entry]);

    if (!ids.length && options.allowEmpty !== true) {
      this.state.metrics.validationErrors += 1;
      this.pushWarning('No valid object ids provided for selection.');
      return this.snapshot();
    }

    this.pushHistory('select-objects', {
      selectedIds: this.state.objects.selectedIds
    });

    const additive = options.additive === true;
    const nextSelection = additive
      ? [...new Set([...this.state.objects.selectedIds, ...ids])]
      : ids;

    Object.values(this.state.objects.byId).forEach((entry) => {
      entry.selected = nextSelection.includes(entry.objectId);
    });

    this.state.objects.selectedIds = nextSelection;
    this.state.metrics.selectedCount = nextSelection.length;

    const event = this.pushRuntimeEvent({
      type: 'selection',
      action: 'select',
      objectIds: nextSelection,
      payload: {
        additive
      }
    });

    this.emit('educational-inspection-selection-changed', {
      event
    });

    this.synchronize('select-objects');
    return this.snapshot();
  }

  inspectObject(objectId = null) {
    const validation = this.validateObjectId(objectId);
    if (!validation.valid) {
      this.state.metrics.validationErrors += 1;
      this.pushWarning(validation.error);
      return null;
    }

    const entry = this.state.objects.byId[validation.key];
    this.state.metrics.inspectionCount += 1;

    const event = this.pushRuntimeEvent({
      type: 'inspection',
      action: 'inspect',
      objectId: validation.key,
      payload: {
        metadata: entry.metadata
      }
    });

    this.emit('educational-inspection-object-inspected', {
      event,
      object: deepClone(entry)
    });

    this.synchronize('inspect-object');
    return deepClone(entry);
  }

  inspectObjectMetadata(objectId = null) {
    const inspected = this.inspectObject(objectId);
    return inspected ? inspected.metadata : null;
  }

  compareObjects(objectIds = []) {
    const ids = asArray(objectIds)
      .map((entry) => String(entry || '').trim())
      .filter(Boolean)
      .filter((entry, index, all) => all.indexOf(entry) === index)
      .filter((entry) => this.state.objects.byId[entry]);

    if (ids.length < 2) {
      this.state.metrics.validationErrors += 1;
      this.pushWarning('Compare requires at least two valid object ids.');
      return this.snapshot();
    }

    this.pushHistory('compare-objects', {
      objectIds: ids
    });

    ids.forEach((objectId) => {
      this.state.objects.byId[objectId].compareWith = ids.filter((entry) => entry !== objectId);
    });

    this.state.metrics.manipulationCount += 1;

    const event = this.pushRuntimeEvent({
      type: 'manipulation',
      action: 'compare',
      objectIds: ids,
      capability: 'compare',
      knownCapability: true,
      payload: {}
    });

    this.emit('educational-inspection-manipulated', {
      event
    });

    this.synchronize('compare-objects');
    return this.snapshot();
  }

  applyManipulation(objectEntry = {}, capability = 'inspect', payload = {}) {
    const data = isObject(payload) ? payload : {};

    if (capability === 'inspect' || capability === 'explain') {
      objectEntry.lastExplainRequest = Date.now();
      return;
    }

    if (capability === 'highlight') {
      objectEntry.highlighted = data.enabled !== false;
      return;
    }

    if (capability === 'isolate') {
      objectEntry.isolated = data.enabled !== false;
      return;
    }

    if (capability === 'hide') {
      objectEntry.visible = false;
      return;
    }

    if (capability === 'show') {
      objectEntry.visible = true;
      return;
    }

    if (capability === 'explode') {
      objectEntry.exploded = true;
      objectEntry.assembled = false;
      return;
    }

    if (capability === 'assemble') {
      objectEntry.exploded = false;
      objectEntry.assembled = true;
      return;
    }

    if (capability === 'cross-section') {
      objectEntry.crossSection = data.enabled !== false;
      return;
    }

    if (capability === 'x-ray') {
      objectEntry.xRay = data.enabled !== false;
      return;
    }

    if (capability === 'annotate') {
      objectEntry.annotations.push({
        id: `annotation-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        text: String(data.text || data.note || '').slice(0, 2000),
        position: asArray(data.position).length >= 3 ? [
          toFiniteNumber(data.position[0], 0),
          toFiniteNumber(data.position[1], 0),
          toFiniteNumber(data.position[2], 0)
        ] : null,
        createdAt: Date.now(),
        metadata: sanitizeMetadata(data.metadata || {})
      });
      if (objectEntry.annotations.length > Math.max(1, toFiniteNumber(this.options.maxAnnotationsPerObject, 200))) {
        objectEntry.annotations.shift();
      }
      return;
    }

    if (capability === 'measure') {
      objectEntry.measurements.push({
        id: `measurement-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        value: toFiniteNumber(data.value ?? data.distance ?? 0, 0),
        unit: String(data.unit || 'unit'),
        from: asArray(data.from).length >= 3 ? [
          toFiniteNumber(data.from[0], 0),
          toFiniteNumber(data.from[1], 0),
          toFiniteNumber(data.from[2], 0)
        ] : null,
        to: asArray(data.to).length >= 3 ? [
          toFiniteNumber(data.to[0], 0),
          toFiniteNumber(data.to[1], 0),
          toFiniteNumber(data.to[2], 0)
        ] : null,
        createdAt: Date.now(),
        metadata: sanitizeMetadata(data.metadata || {})
      });
      if (objectEntry.measurements.length > Math.max(1, toFiniteNumber(this.options.maxMeasurementsPerObject, 200))) {
        objectEntry.measurements.shift();
      }
      return;
    }

    if (capability === 'rotate') {
      const delta = asArray(data.delta).length >= 3 ? data.delta : [0, 0, 0];
      objectEntry.transform.rotation = [
        objectEntry.transform.rotation[0] + toFiniteNumber(delta[0], 0),
        objectEntry.transform.rotation[1] + toFiniteNumber(delta[1], 0),
        objectEntry.transform.rotation[2] + toFiniteNumber(delta[2], 0)
      ];
      return;
    }

    if (capability === 'zoom') {
      objectEntry.transform.zoom = clamp(toFiniteNumber(objectEntry.transform.zoom, 1) + toFiniteNumber(data.delta, 0), 0.1, 10);
      return;
    }

    if (capability === 'move') {
      const delta = asArray(data.delta).length >= 3 ? data.delta : [0, 0, 0];
      objectEntry.transform.position = [
        objectEntry.transform.position[0] + toFiniteNumber(delta[0], 0),
        objectEntry.transform.position[1] + toFiniteNumber(delta[1], 0),
        objectEntry.transform.position[2] + toFiniteNumber(delta[2], 0)
      ];
      return;
    }

    if (capability === 'duplicate') {
      const duplicateId = `temp-duplicate-${objectEntry.objectId}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
      objectEntry.temporaryDuplicates.push({
        id: duplicateId,
        sourceObjectId: objectEntry.objectId,
        createdAt: Date.now(),
        metadata: sanitizeMetadata(data.metadata || {})
      });
      return;
    }

    if (capability === 'reset') {
      objectEntry.visible = true;
      objectEntry.isolated = false;
      objectEntry.highlighted = false;
      objectEntry.exploded = false;
      objectEntry.assembled = true;
      objectEntry.crossSection = false;
      objectEntry.xRay = false;
      objectEntry.transform = {
        rotation: [0, 0, 0],
        zoom: 1,
        position: [0, 0, 0]
      };
      objectEntry.compareWith = [];
      objectEntry.temporaryDuplicates = [];
      return;
    }

    // Unknown capabilities are preserved in generic capability log without breaking runtime behavior.
    if (!Array.isArray(objectEntry.capabilityLog)) {
      objectEntry.capabilityLog = [];
    }
    objectEntry.capabilityLog.push({
      capability,
      payload: sanitizeMetadata(data),
      createdAt: Date.now()
    });
  }

  manipulateObject(objectId = null, capability = 'inspect', payload = {}) {
    const validation = this.validateObjectId(objectId);
    if (!validation.valid) {
      this.state.metrics.validationErrors += 1;
      this.pushWarning(validation.error);
      return this.snapshot();
    }

    const cap = this.validateCapability(capability);
    const entry = this.state.objects.byId[validation.key];

    this.pushHistory('manipulate-object', {
      objectId: validation.key,
      capability: cap.capability,
      payload
    });

    this.applyManipulation(entry, cap.capability, payload);

    if (!entry.capabilities.includes(cap.capability)) {
      entry.capabilities.push(cap.capability);
      if (cap.known) {
        entry.knownCapabilities.push(cap.capability);
      } else {
        entry.unknownCapabilities.push(cap.capability);
        this.state.metrics.unknownCapabilityCount += 1;
      }
    }

    this.state.metrics.manipulationCount += 1;
    if (cap.capability === 'reset') {
      this.state.metrics.resetCount += 1;
    }

    const event = this.pushRuntimeEvent({
      type: 'manipulation',
      action: cap.capability,
      objectId: validation.key,
      objectIds: [validation.key],
      capability: cap.capability,
      knownCapability: cap.known,
      payload
    });

    this.emit('educational-inspection-manipulated', {
      event
    });

    this.synchronize('manipulate-object');
    return this.snapshot();
  }

  undo() {
    if (!this.state.history.undoStack.length) {
      return this.snapshot();
    }

    const current = this.snapshot();
    current.history = {
      undoStack: [],
      redoStack: []
    };
    const previous = this.state.history.undoStack.pop();
    this.state.history.redoStack.push(createHistoryEntry('redo-snapshot', {
      state: current
    }));

    const previousState = previous?.payload?.state;
    if (isObject(previousState)) {
      this.restoreFromSnapshot(previousState);
      this.state.metrics.undoCount += 1;
      const event = this.pushRuntimeEvent({
        type: 'history',
        action: 'undo',
        payload: {}
      });
      this.emit('educational-inspection-undo', {
        event
      });
    }

    this.synchronize('undo');
    return this.snapshot();
  }

  redo() {
    if (!this.state.history.redoStack.length) {
      return this.snapshot();
    }

    const current = this.snapshot();
    current.history = {
      undoStack: [],
      redoStack: []
    };
    const next = this.state.history.redoStack.pop();
    this.state.history.undoStack.push(createHistoryEntry('undo-snapshot', {
      state: current
    }));

    const nextState = next?.payload?.state;
    if (isObject(nextState)) {
      this.restoreFromSnapshot(nextState);
      this.state.metrics.redoCount += 1;
      const event = this.pushRuntimeEvent({
        type: 'history',
        action: 'redo',
        payload: {}
      });
      this.emit('educational-inspection-redo', {
        event
      });
    }

    this.synchronize('redo');
    return this.snapshot();
  }

  resetObject(objectId = null) {
    return this.manipulateObject(objectId, 'reset', {});
  }

  resetAllObjects() {
    this.pushHistory('reset-all', {});

    Object.keys(this.state.objects.byId).forEach((objectId) => {
      this.applyManipulation(this.state.objects.byId[objectId], 'reset', {});
    });

    this.state.metrics.resetCount += 1;

    const event = this.pushRuntimeEvent({
      type: 'reset',
      action: 'reset-all',
      objectIds: Object.keys(this.state.objects.byId),
      payload: {}
    });

    this.emit('educational-inspection-reset-all', {
      event
    });

    this.synchronize('reset-all-objects');
    return this.snapshot();
  }

  attachScheduler(scheduler) {
    if (!scheduler || typeof scheduler.on !== 'function') return;

    const unsubscribe = scheduler.on('*', (event) => {
      const name = String(event?.name || '').trim();
      if (!name) return;

      this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);

      if (name === 'TimelinePaused') {
        this.state.recovery.interrupted = true;
        this.state.recovery.resumeTimeMs = this.state.timelineTimeMs;
      }

      if (name === 'TimelineResumed') {
        this.state.recovery.interrupted = false;
      }

      if (name === 'CheckpointReached') {
        this.state.recovery.lastCheckpointId = String(event?.payload?.checkpointId || '').trim() || this.state.recovery.lastCheckpointId;
      }

      this.synchronize(`timeline:${name}`);
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachInteractionContractRuntime(interactionContractRuntime) {
    if (!interactionContractRuntime || typeof interactionContractRuntime.on !== 'function') return;

    const unsubscribe = interactionContractRuntime.on('interaction-event-emitted', ({ payload }) => {
      const event = payload?.event;
      const objectId = event?.targetObjectIds?.[0] || event?.objectId || null;
      const capability = event?.payload?.capability || event?.action || event?.type || 'inspect';

      if (!objectId) return;

      this.manipulateObject(objectId, capability, event?.payload || {});
    });

    this.unsubscribers.push(unsubscribe);
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

    this.emit('educational-inspection-synchronized', {
      reason: `mutation:${safeType}`,
      context: sanitizeMetadata(context)
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

    this.emit('educational-inspection-persisted', {
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

    this.emit('educational-inspection-recovered', {
      persistenceKey: this.persistenceKey,
      timelineTimeMs: this.state.timelineTimeMs
    });

    return true;
  }

  synchronize(reason = 'manual') {
    this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);
    this.state.diagnostics.synchronizations += 1;

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      educationalInspection: this.snapshot(),
      rendererAdapter: {
        ...(this.runtime.metadata?.rendererAdapter || {}),
        educationalInspectionState: this.snapshot()
      },
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        educationalInspectionState: this.snapshot()
      },
      interactionEngine: {
        ...(this.runtime.metadata?.interactionEngine || {}),
        educationalInspectionState: this.snapshot()
      }
    };

    this.emit('educational-inspection-synchronized', {
      reason
    });

    return this.snapshot();
  }

  snapshot() {
    const knownCapabilities = new Set();
    const unknownCapabilities = new Set();

    Object.values(this.state.objects.byId || {}).forEach((entry) => {
      asArray(entry.knownCapabilities).forEach((cap) => knownCapabilities.add(cap));
      asArray(entry.unknownCapabilities).forEach((cap) => unknownCapabilities.add(cap));
    });

    return deepClone({
      schemaVersion: 'v1',
      sceneId: this.state.sceneId,
      timelineTimeMs: this.state.timelineTimeMs,
      objects: this.state.objects,
      metrics: this.state.metrics,
      diagnostics: this.state.diagnostics,
      history: this.state.history,
      runtimeEvents: this.state.runtimeEvents,
      recovery: this.state.recovery,
      supportedCapabilities: [...SUPPORTED_EDUCATIONAL_OBJECT_CAPABILITIES],
      knownCapabilities: [...knownCapabilities],
      unknownCapabilities: [...unknownCapabilities]
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

    this.emit('educational-inspection-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });
  }

  static supportedChannels() {
    return [
      'educational-inspection-selection-changed',
      'educational-inspection-object-inspected',
      'educational-inspection-manipulated',
      'educational-inspection-undo',
      'educational-inspection-redo',
      'educational-inspection-reset-all',
      'educational-inspection-synchronized',
      'educational-inspection-persisted',
      'educational-inspection-recovered',
      'educational-inspection-destroyed'
    ];
  }
}

export function createUniversalEducationalInspectionRuntime(runtime = {}, options = {}) {
  return new UniversalEducationalInspectionRuntime(runtime, options);
}
