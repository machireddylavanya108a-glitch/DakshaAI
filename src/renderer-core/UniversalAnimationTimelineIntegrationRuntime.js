const STORE_KEY = '__daksha_animation_timeline_integration_store__';
const SCHEMA_VERSION = 'v1';
const DEFAULT_PERSISTENCE_KEY = 'daksha.animation.timeline.integration.v1';

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
      // Listener failures are isolated from integration runtime.
    }
  });
}

function deriveRuntimeGraphSummary(runtime = {}) {
  const graph = runtime?.graph;
  if (!graph) {
    return {
      nodeCount: 0,
      relationshipCount: 0
    };
  }

  const nodeCount = typeof graph.getNodeCount === 'function'
    ? Number(graph.getNodeCount())
    : graph?.nodes?.size || 0;
  const relationshipCount = typeof graph.getRelationshipCount === 'function'
    ? Number(graph.getRelationshipCount())
    : asArray(graph?.edges).length;

  return {
    nodeCount,
    relationshipCount
  };
}

function normalizeControlProfile(input = {}) {
  const source = isObject(input) ? input : {};

  return {
    schemaVersion: SCHEMA_VERSION,
    speed: Math.max(0.05, toFiniteNumber(source.speed, 1)),
    direction: safeString(source.direction || 'forward') || 'forward',
    loopMode: safeString(source.loopMode || 'none') || 'none',
    blending: {
      mode: safeString(source?.blending?.mode || 'adaptive-blend') || 'adaptive-blend',
      durationMs: Math.max(0, toFiniteNumber(source?.blending?.durationMs, 180)),
      weight: Math.max(0, Math.min(1, toFiniteNumber(source?.blending?.weight, 1)))
    },
    layers: {
      enabled: source?.layers?.enabled !== false,
      strategy: safeString(source?.layers?.strategy || 'timeline-priority') || 'timeline-priority',
      activeLayerIds: asArray(source?.layers?.activeLayerIds)
    },
    adaptivePlayback: {
      enabled: source?.adaptivePlayback?.enabled !== false,
      mode: safeString(source?.adaptivePlayback?.mode || 'runtime-adaptive') || 'runtime-adaptive'
    }
  };
}

function normalizeTimelineRuntimeState(input = {}) {
  const source = isObject(input) ? input : {};

  return {
    schemaVersion: SCHEMA_VERSION,
    playbackState: safeString(source.playbackState || 'Idle') || 'Idle',
    timeMs: Math.max(0, toFiniteNumber(source.timeMs, 0)),
    progress: Math.max(0, Math.min(1, toFiniteNumber(source.progress, 0))),
    speed: Math.max(0.05, toFiniteNumber(source.speed, 1)),
    loop: isObject(source.loop) ? source.loop : {},
    branch: isObject(source.branch) ? source.branch : {},
    currentClipId: safeString(source.currentClipId || '') || null,
    currentEventId: safeString(source.currentEventId || '') || null,
    currentMarkerId: safeString(source.currentMarkerId || '') || null,
    checkpointId: safeString(source.checkpointId || '') || null,
    queueDepth: Math.max(0, toFiniteNumber(source.queueDepth, 0))
  };
}

function normalizeAnimationState(input = {}) {
  const source = isObject(input) ? input : {};

  return {
    schemaVersion: SCHEMA_VERSION,
    active: source.active === true,
    paused: source.paused === true,
    stopped: source.stopped !== false,
    reversed: source.reversed === true,
    source: safeString(source.source || 'timeline-events-only') || 'timeline-events-only',
    activeAnimationIds: asArray(source.activeAnimationIds),
    pendingTriggers: asArray(source.pendingTriggers),
    processedTriggers: asArray(source.processedTriggers).slice(-500),
    layerState: isObject(source.layerState) ? source.layerState : {
      activeLayerIds: [],
      strategy: 'timeline-priority'
    }
  };
}

function normalizeInteractionState(input = {}) {
  const source = isObject(input) ? input : {};
  const lastEvent = isObject(source.lastEvent) ? source.lastEvent : null;

  return {
    schemaVersion: SCHEMA_VERSION,
    selection: asArray(source.selection),
    hover: asArray(source.hover),
    focus: asArray(source.focus),
    highlights: asArray(source.highlights),
    inspections: asArray(source.inspections),
    manipulations: asArray(source.manipulations),
    checkpoints: asArray(source.checkpoints),
    runtimeFeedback: asArray(source.runtimeFeedback).slice(-300),
    lastEvent
  };
}

function normalizeSynchronizationState(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    rendererSynchronizedAt: Math.max(0, toFiniteNumber(source.rendererSynchronizedAt, 0)),
    timelineSynchronizedAt: Math.max(0, toFiniteNumber(source.timelineSynchronizedAt, 0)),
    interactionSynchronizedAt: Math.max(0, toFiniteNumber(source.interactionSynchronizedAt, 0)),
    aiTeacherMetadataSynchronizedAt: Math.max(0, toFiniteNumber(source.aiTeacherMetadataSynchronizedAt, 0)),
    checkpointsSynchronizedAt: Math.max(0, toFiniteNumber(source.checkpointsSynchronizedAt, 0))
  };
}

function normalizeDiagnostics(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    builds: Math.max(0, toFiniteNumber(source.builds, 0)),
    updates: Math.max(0, toFiniteNumber(source.updates, 0)),
    timelineEventsProcessed: Math.max(0, toFiniteNumber(source.timelineEventsProcessed, 0)),
    interactionEventsProcessed: Math.max(0, toFiniteNumber(source.interactionEventsProcessed, 0)),
    interruptions: Math.max(0, toFiniteNumber(source.interruptions, 0)),
    recoveries: Math.max(0, toFiniteNumber(source.recoveries, 0)),
    warnings: asArray(source.warnings).slice(-400)
  };
}

function normalizeSessionState(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    persistenceKey: safeString(source.persistenceKey || DEFAULT_PERSISTENCE_KEY) || DEFAULT_PERSISTENCE_KEY,
    recovered: source.recovered === true,
    interrupted: source.interrupted === true,
    interruptionReason: safeString(source.interruptionReason || '') || null,
    interruptionAt: Math.max(0, toFiniteNumber(source.interruptionAt, 0)),
    persistedAt: Math.max(0, toFiniteNumber(source.persistedAt, 0)) || null,
    lastCheckpointId: safeString(source.lastCheckpointId || '') || null
  };
}

function normalizeIntegrationState(input = {}) {
  const source = isObject(input) ? input : {};
  const derivedRuntimeGraph = deriveRuntimeGraphSummary(source.runtime || source);
  const providedRuntimeGraph = isObject(source.runtimeGraph) ? source.runtimeGraph : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    runtimeGraph: {
      nodeCount: Math.max(0, toFiniteNumber(providedRuntimeGraph.nodeCount, derivedRuntimeGraph.nodeCount)),
      relationshipCount: Math.max(0, toFiniteNumber(providedRuntimeGraph.relationshipCount, derivedRuntimeGraph.relationshipCount))
    },
    controls: normalizeControlProfile(source.controls || {}),
    timeline: normalizeTimelineRuntimeState(source.timeline || {}),
    animations: normalizeAnimationState(source.animations || {}),
    interactions: normalizeInteractionState(source.interactions || {}),
    synchronization: normalizeSynchronizationState(source.synchronization || {}),
    diagnostics: normalizeDiagnostics(source.diagnostics || {}),
    session: normalizeSessionState(source.session || {})
  };
}

function migrateIntegrationState(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === SCHEMA_VERSION) {
    return normalizeIntegrationState(source);
  }

  return normalizeIntegrationState({
    schemaVersion: SCHEMA_VERSION,
    runtime: source.runtime || {},
    controls: source.controls || source.playbackControls,
    timeline: source.timeline,
    animations: source.animations || source.animationRuntime,
    interactions: source.interactions || source.interactionRuntime,
    synchronization: source.synchronization,
    diagnostics: {
      ...(isObject(source.diagnostics) ? source.diagnostics : {}),
      warnings: [
        ...asArray(source?.diagnostics?.warnings),
        'Animation timeline integration state migrated from legacy format.'
      ]
    },
    session: source.session
  });
}

function toEventName(event = {}) {
  return safeString(event?.name || event?.eventName || 'UnknownRuntimeEvent') || 'UnknownRuntimeEvent';
}

function toEventPayload(event = {}) {
  return isObject(event?.payload) ? event.payload : {};
}

function normalizeTimelineEvent(event = {}) {
  const name = toEventName(event);
  const payload = toEventPayload(event);
  const timestamp = Math.max(0, toFiniteNumber(event?.timestamp, Date.now()));

  return {
    name,
    payload,
    timestamp,
    state: isObject(event?.state) ? event.state : {}
  };
}

function inferPriority(normalizedEvent = {}) {
  const payload = normalizedEvent.payload;
  return Math.max(0, toFiniteNumber(
    payload.priority
      || payload.eventPriority
      || payload?.timeline?.priority
      || normalizedEvent.state?.cursor?.currentEvent?.priority
      || 1,
    1
  ));
}

function inferAnimationType(normalizedEvent = {}) {
  const payload = normalizedEvent.payload;
  const candidates = [
    payload.animationType,
    payload.type,
    payload.eventType,
    payload?.timeline?.animationType,
    payload?.timeline?.eventType,
    normalizedEvent.state?.cursor?.currentEvent?.type,
    normalizedEvent.name
  ];

  for (const candidate of candidates) {
    const safe = safeString(candidate);
    if (safe) return safe;
  }

  return 'unknown-animation-type';
}

function inferTargetNodeId(normalizedEvent = {}) {
  const payload = normalizedEvent.payload;
  const candidates = [
    payload.nodeId,
    payload.targetNodeId,
    payload.targetObjectId,
    payload.objectId,
    payload?.timeline?.nodeId,
    payload?.timeline?.targetNodeId,
    payload?.timeline?.targetObjectId
  ];

  for (const candidate of candidates) {
    const safe = safeString(candidate);
    if (safe) return safe;
  }

  return 'runtime-graph-node';
}

function inferTriggerFamily(normalizedEvent = {}) {
  const name = normalizeTimelineEvent(normalizedEvent).name.toLowerCase();
  const payload = toEventPayload(normalizedEvent);
  const eventType = safeString(payload.eventType || payload.type || '').toLowerCase();

  if (name.includes('clip')) return 'animation-triggers';
  if (name.includes('eventready') || eventType.includes('animation')) return 'animation-triggers';
  if (name.includes('actionready') && (eventType.includes('camera') || eventType.includes('focus'))) return 'camera-triggers';
  if (name.includes('actionready') && (eventType.includes('interaction') || eventType.includes('select'))) return 'interaction-events';
  if (eventType.includes('environment') || name.includes('environment')) return 'environment-events';
  if (eventType.includes('label') || name.includes('label')) return 'label-events';
  if (eventType.includes('checkpoint') || name.includes('checkpoint')) return 'checkpoint-events';
  if (name.includes('timeline')) return 'synchronization-events';
  if (eventType.includes('object') || eventType.includes('transform')) return 'object-events';

  return 'unknown-timeline-events';
}

function derivePlaybackStateFromEvent(normalizedEvent = {}, fallback = 'Idle') {
  const name = normalizeTimelineEvent(normalizedEvent).name;
  if (name === 'TimelineStarted' || name === 'TimelineResumed') return 'Playing';
  if (name === 'TimelinePaused') return 'Paused';
  if (name === 'TimelineStopped') return 'Cancelled';
  if (name === 'TimelineCompleted') return 'Completed';
  if (name === 'TimelineError') return 'Error';
  return fallback;
}

function buildTimelineAnimationCommand(normalizedEvent = {}, controls = {}) {
  const animationType = inferAnimationType(normalizedEvent);
  const targetNodeId = inferTargetNodeId(normalizedEvent);
  const priority = inferPriority(normalizedEvent);
  const triggerFamily = inferTriggerFamily(normalizedEvent);

  return {
    commandId: `timeline-animation-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    action: 'timeline-animation-trigger',
    nodeId: targetNodeId,
    payload: {
      source: 'timeline-event',
      eventName: normalizedEvent.name,
      eventTimestamp: normalizedEvent.timestamp,
      animationType,
      triggerFamily,
      priority,
      speed: controls.speed,
      direction: controls.direction,
      loopMode: controls.loopMode,
      blending: controls.blending,
      layers: controls.layers,
      adaptivePlayback: controls.adaptivePlayback,
      rawPayload: normalizedEvent.payload
    }
  };
}

export class UniversalAnimationTimelineIntegrationRuntime {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = isObject(options) ? options : {};
    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.rendererCore = runtime?.rendererCore || null;
    this.interactionContractRuntime = runtime?.interactionContractRuntime || null;
    this.assetLoadingRuntime = runtime?.assetLoadingRuntime || null;

    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey || DEFAULT_PERSISTENCE_KEY) || DEFAULT_PERSISTENCE_KEY;

    this.listeners = createChannelSet();
    this.unsubscribers = [];
    this.state = migrateIntegrationState(this.options.state || {});
    this.state.session.persistenceKey = this.persistenceKey;
  }

  on(channel, listener) {
    const safeChannel = safeString(channel) || '*';
    if (typeof listener !== 'function') {
      throw new Error('UniversalAnimationTimelineIntegrationRuntime listener must be a function.');
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
    const safeChannel = safeString(channel) || 'animation-timeline-runtime-event';
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

  warn(message = 'Unknown animation timeline integration warning') {
    this.state.diagnostics.warnings.push(safeString(message));
    if (this.state.diagnostics.warnings.length > 400) {
      this.state.diagnostics.warnings.shift();
    }
  }

  validateRuntime() {
    const errors = [];
    const warnings = [];

    if (!this.scheduler || typeof this.scheduler.on !== 'function') {
      errors.push('Timeline scheduler is required for animation timeline integration runtime.');
    }

    if (!this.rendererCore || typeof this.rendererCore.update !== 'function') {
      errors.push('Renderer core is required for timeline-driven animation commands.');
    }

    if (!this.runtime?.graph) {
      warnings.push('Runtime graph is missing; synchronization summaries will use conservative defaults.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  build() {
    const validation = this.validateRuntime();
    validation.warnings.forEach((entry) => this.warn(entry));

    if (!validation.valid) {
      validation.errors.forEach((entry) => this.warn(entry));
      return {
        status: 'failed',
        errors: validation.errors,
        warnings: validation.warnings,
        state: this.snapshot()
      };
    }

    this.attachScheduler(this.scheduler);
    this.attachInteractionRuntime(this.interactionContractRuntime);

    this.state.runtimeGraph = deriveRuntimeGraphSummary(this.runtime);
    this.state.diagnostics.builds += 1;
    this.synchronize('build', {
      source: 'runtime-build'
    });

    return {
      status: 'built',
      errors: [],
      warnings: validation.warnings,
      state: this.snapshot()
    };
  }

  attachScheduler(scheduler) {
    if (!scheduler || typeof scheduler.on !== 'function') return;

    const unsubscribe = scheduler.on('*', (event) => {
      this.handleTimelineEvent(event, {
        source: 'timeline-scheduler'
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachInteractionRuntime(interactionRuntime) {
    if (!interactionRuntime || typeof interactionRuntime.on !== 'function') return;

    const unsubscribe = interactionRuntime.on('*', ({ channel, payload }) => {
      this.handleInteractionEvent(channel || 'interaction-runtime-event', payload || {}, {
        source: 'interaction-runtime'
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  play() {
    this.scheduler?.play?.();
    this.state.animations.active = true;
    this.state.animations.paused = false;
    this.state.animations.stopped = false;
    this.synchronize('play', { source: 'manual-play' });
    return this.snapshot();
  }

  pause(reason = 'manual') {
    this.scheduler?.pause?.(reason);
    this.state.animations.paused = true;
    this.state.animations.active = false;
    this.synchronize('pause', { reason });
    return this.snapshot();
  }

  stop(reason = 'manual') {
    this.scheduler?.stop?.(reason);
    this.state.animations.paused = false;
    this.state.animations.active = false;
    this.state.animations.stopped = true;
    this.synchronize('stop', { reason });
    return this.snapshot();
  }

  restart() {
    this.scheduler?.restart?.();
    this.state.animations.active = true;
    this.state.animations.paused = false;
    this.state.animations.stopped = false;
    this.state.animations.reversed = false;
    this.synchronize('restart', { source: 'manual-restart' });
    return this.snapshot();
  }

  replay(fromTimeMs = 0) {
    this.scheduler?.replay?.(fromTimeMs);
    this.state.animations.active = true;
    this.state.animations.paused = false;
    this.state.animations.stopped = false;
    this.synchronize('replay', {
      fromTimeMs: Math.max(0, toFiniteNumber(fromTimeMs, 0))
    });
    return this.snapshot();
  }

  reverse(enabled = true) {
    this.state.controls.direction = enabled ? 'reverse' : 'forward';
    this.state.animations.reversed = enabled === true;
    this.synchronize('reverse', {
      direction: this.state.controls.direction
    });
    return this.snapshot();
  }

  seek(timeMs = 0) {
    this.scheduler?.seekByTime?.(timeMs);
    this.synchronize('seek', {
      timeMs: Math.max(0, toFiniteNumber(timeMs, 0))
    });
    return this.snapshot();
  }

  loop(mode = 'none') {
    this.state.controls.loopMode = safeString(mode) || 'none';
    this.scheduler?.loopController?.setMode?.(this.state.controls.loopMode);
    this.synchronize('loop', {
      loopMode: this.state.controls.loopMode
    });
    return this.snapshot();
  }

  setSpeed(speed = 1) {
    const safeSpeed = Math.max(0.05, toFiniteNumber(speed, 1));
    this.state.controls.speed = safeSpeed;
    this.scheduler?.setSpeed?.(safeSpeed);
    this.synchronize('speed-control', {
      speed: safeSpeed
    });
    return this.snapshot();
  }

  setBlending(config = {}) {
    this.state.controls.blending = {
      ...this.state.controls.blending,
      mode: safeString(config.mode || this.state.controls.blending.mode) || this.state.controls.blending.mode,
      durationMs: Math.max(0, toFiniteNumber(config.durationMs, this.state.controls.blending.durationMs)),
      weight: Math.max(0, Math.min(1, toFiniteNumber(config.weight, this.state.controls.blending.weight)))
    };

    this.synchronize('blending-update', {
      blending: this.state.controls.blending
    });
    return this.snapshot();
  }

  setLayers(config = {}) {
    const source = isObject(config) ? config : {};
    this.state.controls.layers = {
      enabled: source.enabled !== false,
      strategy: safeString(source.strategy || this.state.controls.layers.strategy) || this.state.controls.layers.strategy,
      activeLayerIds: asArray(source.activeLayerIds || this.state.controls.layers.activeLayerIds)
    };

    this.state.animations.layerState = {
      ...this.state.animations.layerState,
      activeLayerIds: this.state.controls.layers.activeLayerIds,
      strategy: this.state.controls.layers.strategy
    };

    this.synchronize('layered-animations-update', {
      layers: this.state.controls.layers
    });
    return this.snapshot();
  }

  markInterrupted(reason = 'runtime-interruption') {
    this.state.session.interrupted = true;
    this.state.session.interruptionReason = safeString(reason) || 'runtime-interruption';
    this.state.session.interruptionAt = Date.now();
    this.state.diagnostics.interruptions += 1;
    this.pause('interruption');
    this.persistSession();
    this.emit('animation-interrupted', {
      reason: this.state.session.interruptionReason
    });
    return this.snapshot();
  }

  recoverFromInterruption() {
    if (!this.state.session.interrupted) {
      return {
        status: 'noop',
        state: this.snapshot()
      };
    }

    const checkpointId = this.state.session.lastCheckpointId;
    if (checkpointId) {
      this.scheduler?.resumeFromCheckpoint?.(checkpointId);
    } else {
      this.scheduler?.resume?.('interruption-recovery');
    }

    this.state.session.interrupted = false;
    this.state.session.interruptionReason = null;
    this.state.session.interruptionAt = 0;
    this.state.diagnostics.recoveries += 1;

    this.synchronize('interruption-recovered', {
      checkpointId: checkpointId || null
    });
    this.emit('animation-interruption-recovered', {
      checkpointId: checkpointId || null
    });

    return {
      status: 'recovered',
      state: this.snapshot()
    };
  }

  handleTimelineEvent(event = {}, context = {}) {
    const normalized = normalizeTimelineEvent(event);
    const triggerFamily = inferTriggerFamily(normalized);
    const animationCommand = buildTimelineAnimationCommand(normalized, this.state.controls);

    this.state.timeline = normalizeTimelineRuntimeState({
      ...this.state.timeline,
      playbackState: derivePlaybackStateFromEvent(normalized, this.state.timeline.playbackState),
      timeMs: toFiniteNumber(normalized.state?.clock?.timeMs, this.state.timeline.timeMs),
      progress: toFiniteNumber(normalized.state?.cursor?.progress, this.state.timeline.progress),
      speed: toFiniteNumber(normalized.state?.speed, this.state.controls.speed),
      loop: normalized.state?.loop || this.state.timeline.loop,
      branch: normalized.state?.branch || this.state.timeline.branch,
      currentClipId: normalized.state?.cursor?.currentClip?.id || this.state.timeline.currentClipId,
      currentEventId: normalized.state?.cursor?.currentEvent?.id || this.state.timeline.currentEventId,
      currentMarkerId: normalized.state?.cursor?.currentMarker?.id || this.state.timeline.currentMarkerId,
      checkpointId: normalized.payload?.checkpointId || this.state.timeline.checkpointId,
      queueDepth: toFiniteNumber(normalized.state?.queueDepth, this.state.timeline.queueDepth)
    });

    if (normalized.name === 'CheckpointReached') {
      const checkpointId = safeString(normalized.payload?.checkpointId || normalized.payload?.id || 'checkpoint');
      this.state.interactions.checkpoints.push({
        checkpointId,
        timeMs: this.state.timeline.timeMs,
        timestamp: normalized.timestamp
      });
      this.state.session.lastCheckpointId = checkpointId;
      this.state.synchronization.checkpointsSynchronizedAt = Date.now();
    }

    if (normalized.name === 'TimelinePaused') {
      this.state.animations.active = false;
      this.state.animations.paused = true;
    }

    if (normalized.name === 'TimelineStarted' || normalized.name === 'TimelineResumed' || normalized.name === 'TimelineCompleted') {
      this.state.animations.active = normalized.name !== 'TimelineCompleted';
      this.state.animations.paused = false;
      this.state.animations.stopped = normalized.name === 'TimelineCompleted';
    }

    this.state.animations.pendingTriggers.push(animationCommand);
    this.processPendingAnimationTriggers(context);

    this.state.animations.processedTriggers.push({
      eventName: normalized.name,
      triggerFamily,
      priority: inferPriority(normalized),
      animationType: animationCommand.payload.animationType,
      targetNodeId: animationCommand.nodeId,
      timestamp: normalized.timestamp,
      source: 'timeline-event'
    });
    if (this.state.animations.processedTriggers.length > 500) {
      this.state.animations.processedTriggers.shift();
    }

    this.state.diagnostics.timelineEventsProcessed += 1;
    this.state.diagnostics.updates += 1;

    this.synchronize('timeline-event', {
      eventName: normalized.name,
      triggerFamily,
      source: safeString(context.source || 'timeline-scheduler') || 'timeline-scheduler'
    });

    this.emit('timeline-event-processed', {
      eventName: normalized.name,
      triggerFamily,
      animationType: animationCommand.payload.animationType
    });

    return this.snapshot();
  }

  processPendingAnimationTriggers(context = {}) {
    const pending = asArray(this.state.animations.pendingTriggers);
    if (!pending.length) return;

    const sorted = [...pending].sort((left, right) => {
      const leftPriority = toFiniteNumber(left?.payload?.priority, 0);
      const rightPriority = toFiniteNumber(right?.payload?.priority, 0);
      return rightPriority - leftPriority;
    });

    this.state.animations.pendingTriggers = [];
    this.rendererCore?.update?.({
      commands: sorted,
      deviceCapabilities: context?.deviceCapabilities || this.runtime?.metadata?.deviceCapabilities || {}
    });

    this.state.synchronization.rendererSynchronizedAt = Date.now();
  }

  handleInteractionEvent(eventType = 'interaction-event', payload = {}, context = {}) {
    const type = safeString(eventType || payload?.type || 'interaction-event') || 'interaction-event';
    const source = safeString(context.source || payload?.source || 'interaction-runtime') || 'interaction-runtime';
    const targetId = safeString(payload?.targetObjectId || payload?.nodeId || payload?.targetNodeId || payload?.selectionId || 'runtime-graph-node') || 'runtime-graph-node';

    if (type.includes('select')) {
      if (!this.state.interactions.selection.includes(targetId)) {
        this.state.interactions.selection.push(targetId);
      }
    } else if (type.includes('hover')) {
      if (!this.state.interactions.hover.includes(targetId)) {
        this.state.interactions.hover.push(targetId);
      }
    } else if (type.includes('focus')) {
      if (!this.state.interactions.focus.includes(targetId)) {
        this.state.interactions.focus.push(targetId);
      }
    } else if (type.includes('highlight')) {
      if (!this.state.interactions.highlights.includes(targetId)) {
        this.state.interactions.highlights.push(targetId);
      }
    } else if (type.includes('inspect')) {
      if (!this.state.interactions.inspections.includes(targetId)) {
        this.state.interactions.inspections.push(targetId);
      }
    } else if (type.includes('manip')) {
      this.state.interactions.manipulations.push({
        targetId,
        payload: isObject(payload) ? payload : {},
        timestamp: Date.now()
      });
    } else {
      this.state.interactions.runtimeFeedback.push({
        type,
        source,
        targetId,
        payload: isObject(payload) ? payload : {},
        unknownType: true,
        timestamp: Date.now()
      });
    }

    this.state.interactions.lastEvent = {
      type,
      source,
      targetId,
      timestamp: Date.now()
    };

    this.state.interactions.runtimeFeedback.push({
      type,
      source,
      targetId,
      payload: isObject(payload) ? payload : {},
      unknownType: false,
      timestamp: Date.now()
    });

    this.state.diagnostics.interactionEventsProcessed += 1;
    this.state.synchronization.interactionSynchronizedAt = Date.now();

    this.synchronize('interaction-event', {
      eventType: type,
      source
    });

    this.emit('interaction-event-processed', {
      eventType: type,
      source,
      targetId
    });

    return this.snapshot();
  }

  synchronize(reason = 'manual', payload = {}) {
    this.state.runtimeGraph = deriveRuntimeGraphSummary(this.runtime);

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      animationTimelineIntegration: this.snapshot(),
      rendererAdapter: {
        ...(this.runtime.metadata?.rendererAdapter || {}),
        animationTimelineIntegrationState: this.snapshot()
      },
      interactionEngine: {
        ...(this.runtime.metadata?.interactionEngine || {}),
        animationTimelineIntegrationState: this.snapshot()
      },
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        animationTimelineIntegrationState: this.snapshot()
      }
    };

    this.state.synchronization.timelineSynchronizedAt = Date.now();
    this.state.synchronization.aiTeacherMetadataSynchronizedAt = Date.now();

    this.emit('animation-timeline-synchronized', {
      reason,
      ...payload
    });

    return this.snapshot();
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = {
      schemaVersion: SCHEMA_VERSION,
      state: this.state,
      persistedAt: Date.now()
    };

    const serialized = JSON.stringify(payload);
    if (typeof adapter.setItem === 'function') {
      adapter.setItem(this.persistenceKey, serialized);
    } else if (typeof adapter.save === 'function') {
      adapter.save(this.persistenceKey, serialized);
    } else {
      return false;
    }

    this.state.session.persistedAt = payload.persistedAt;
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
    if (!parsed) {
      this.warn('Failed to recover animation timeline integration session.');
      return false;
    }

    this.state = migrateIntegrationState(parsed.state || {});
    this.state.session.recovered = true;
    this.state.session.persistedAt = Math.max(0, toFiniteNumber(parsed?.persistedAt, this.state.session.persistedAt || 0)) || null;
    this.state.diagnostics.recoveries += 1;

    this.synchronize('recover', {
      recovered: true
    });

    return true;
  }

  reset() {
    this.state = normalizeIntegrationState({
      runtime: this.runtime,
      controls: this.state.controls,
      diagnostics: this.state.diagnostics,
      session: {
        persistenceKey: this.persistenceKey,
        recovered: this.state.session.recovered,
        interrupted: false,
        interruptionReason: null,
        interruptionAt: 0,
        persistedAt: this.state.session.persistedAt,
        lastCheckpointId: this.state.session.lastCheckpointId
      }
    });

    this.synchronize('reset', {
      source: 'runtime-reset'
    });

    return this.snapshot();
  }

  destroy() {
    this.persistSession();
    this.unsubscribers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.unsubscribers = [];

    this.emit('animation-timeline-runtime-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });

    this.listeners.clear();
    return this.snapshot();
  }

  snapshot() {
    return normalizeIntegrationState(this.state);
  }

  static supportedChannels() {
    return [
      'timeline-event-processed',
      'interaction-event-processed',
      'animation-timeline-synchronized',
      'animation-interrupted',
      'animation-interruption-recovered',
      'animation-timeline-runtime-destroyed'
    ];
  }
}

export function createUniversalAnimationTimelineIntegrationRuntime(runtime = {}, options = {}) {
  return new UniversalAnimationTimelineIntegrationRuntime(runtime, options);
}

export {
  normalizeIntegrationState,
  migrateIntegrationState,
  normalizeControlProfile,
  normalizeTimelineRuntimeState,
  normalizeAnimationState,
  normalizeInteractionState,
  normalizeSynchronizationState
};
