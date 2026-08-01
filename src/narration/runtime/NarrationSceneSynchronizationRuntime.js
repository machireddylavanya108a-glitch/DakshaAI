import { asArray, isObject, toFiniteNumber } from '../NarrationConfig.js';

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
      // Synchronization listeners are isolated from runtime execution.
    }
  });
}

function normalizeCueTime(cue = {}, fallback = 0) {
  return Math.max(0, toFiniteNumber(cue.timestampMs ?? cue.timeMs ?? cue.time, fallback));
}

function cueTypeToSynchronizationType(cueType = '') {
  const normalized = String(cueType || '').trim().toLowerCase();

  if (!normalized) return 'custom-cue';
  if (normalized === 'narration-start') return 'narration-start';
  if (normalized === 'narration-end') return 'narration-end';
  if (normalized.includes('highlight') || normalized.includes('emphasis')) return 'object-highlight';
  if (normalized.includes('camera')) return 'camera-focus';
  if (normalized.includes('focus') || normalized.includes('interaction-point')) return 'object-focus';
  if (normalized.includes('reveal') || normalized.includes('hide')) return 'reveal-hide';
  if (normalized.includes('label')) return 'label-display';
  if (normalized.includes('animation')) return 'animation-cue';
  if (normalized.includes('pause')) return 'interaction-pause';
  if (normalized.includes('quiz')) return 'quiz-checkpoint';
  if (normalized.includes('recap')) return 'recap-checkpoint';
  if (normalized.includes('transition')) return 'transition-cue';

  return 'custom-cue';
}

function synchronizationTypeToEventType(type = 'custom-cue') {
  const safeType = String(type || 'custom-cue').trim() || 'custom-cue';
  return `narration.${safeType}`;
}

function getRuntimeTimeMs(scheduler) {
  const snapshot = scheduler?.snapshot?.() || {};
  return Math.max(0, toFiniteNumber(snapshot?.clock?.timeMs, 0));
}

function getRuntimeSpeed(scheduler) {
  const snapshot = scheduler?.snapshot?.() || {};
  return Math.max(0, toFiniteNumber(snapshot?.speed, 1));
}

function buildSegmentMap(segments = []) {
  const byId = new Map();
  asArray(segments).forEach((segment) => {
    const id = String(segment?.id || '').trim();
    if (id) byId.set(id, segment);
  });
  return byId;
}

function buildSyntheticBoundaryCues(segments = []) {
  return asArray(segments).flatMap((segment, index) => {
    const segmentId = String(segment?.id || `segment-${index + 1}`);
    const startMs = normalizeCueTime(segment, index * 1000);
    const durationMs = Math.max(0, toFiniteNumber(segment?.durationMs, 0));

    return [
      {
        id: `${segmentId}-narration-start`,
        type: 'narration-start',
        segmentId,
        timestampMs: startMs,
        durationMs: 0,
        payload: {
          segmentIndex: toFiniteNumber(segment?.index, index),
          objective: String(segment?.learningObjective || '').trim(),
          difficulty: String(segment?.difficulty || '').trim()
        },
        metadata: {
          synthetic: true
        }
      },
      {
        id: `${segmentId}-narration-end`,
        type: 'narration-end',
        segmentId,
        timestampMs: startMs + durationMs,
        durationMs: 0,
        payload: {
          segmentIndex: toFiniteNumber(segment?.index, index),
          objective: String(segment?.learningObjective || '').trim(),
          difficulty: String(segment?.difficulty || '').trim()
        },
        metadata: {
          synthetic: true
        }
      }
    ];
  });
}

function collectNarrationCues(narration = {}) {
  const domainCues = narration?.cues?.all;
  const genericCues = narration?.cues;

  if (Array.isArray(domainCues)) return [...domainCues];
  if (Array.isArray(genericCues)) return [...genericCues];
  return [];
}

function resolveSceneGraphTargets(cue = {}, segment = {}) {
  const cueTargets = asArray(cue?.targetObjectIds ?? cue?.payload?.targetObjectIds ?? cue?.payload?.targetIds);
  const segmentTargets = asArray(segment?.relatedSceneObjectIds);
  const targets = [...cueTargets, ...segmentTargets]
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  return [...new Set(targets)];
}

function resolveTimelineReferences(cue = {}, segment = {}) {
  const segmentTimeline = isObject(segment?.relatedTimeline) ? segment.relatedTimeline : {};
  return {
    clipId: cue?.clipId || segmentTimeline.clipId || null,
    markerId: cue?.markerId || segmentTimeline.markerId || null,
    eventIds: asArray(cue?.eventIds ?? segmentTimeline.eventIds).map((id) => String(id || '').trim()).filter(Boolean)
  };
}

function buildCheckpointReference(synchronizationType, cue = {}) {
  if (synchronizationType === 'quiz-checkpoint') {
    return {
      type: 'assessment',
      checkpointId: `${String(cue?.id || 'cue')}-quiz-checkpoint`
    };
  }

  if (synchronizationType === 'recap-checkpoint') {
    return {
      type: 'lesson',
      checkpointId: `${String(cue?.id || 'cue')}-recap-checkpoint`
    };
  }

  return null;
}

function buildCuePlan(segments = [], cues = []) {
  const segmentMap = buildSegmentMap(segments);
  const synthetic = buildSyntheticBoundaryCues(segments);
  const allCues = [...collectNarrationCues({ cues }), ...synthetic]
    .filter((cue) => cue && typeof cue === 'object')
    .map((cue, index) => {
      const cueId = String(cue?.id || `narration-cue-${index + 1}`).trim() || `narration-cue-${index + 1}`;
      const segmentId = String(cue?.segmentId || '').trim() || null;
      const segment = segmentId ? segmentMap.get(segmentId) || null : null;
      const synchronizationType = cueTypeToSynchronizationType(cue?.type);
      const timeline = resolveTimelineReferences(cue, segment);
      const sceneTargets = resolveSceneGraphTargets(cue, segment);
      const checkpoint = buildCheckpointReference(synchronizationType, cue);
      const objective = String(segment?.learningObjective || cue?.payload?.objective || '').trim();

      return {
        id: cueId,
        type: String(cue?.type || 'unknown').trim() || 'unknown',
        synchronizationType,
        timestampMs: normalizeCueTime(cue, normalizeCueTime(segment, 0)),
        segmentId,
        cue,
        segment,
        runtimeReferences: {
          timeline,
          sceneGraph: {
            targetObjectIds: sceneTargets
          },
          camera: {
            focusObjectId: sceneTargets[0] || null,
            mode: 'narration-cue-focus'
          },
          labels: {
            text: objective || String(cue?.payload?.label || '').trim() || null,
            visible: synchronizationType === 'label-display' || synchronizationType === 'narration-start'
          },
          highlight: {
            targetObjectIds: sceneTargets,
            intensity: synchronizationType === 'object-highlight' ? 1 : 0.5
          },
          transition: {
            transitionType: synchronizationType === 'transition-cue' ? 'cue-driven' : null,
            cueId
          },
          interaction: {
            pauseSuggested: synchronizationType === 'interaction-pause',
            cueId
          },
          checkpoint
        }
      };
    })
    .sort((left, right) => left.timestampMs - right.timestampMs);

  return allCues;
}

function resolveGraphNodePresence(runtime = {}, objectIds = []) {
  const existingIds = [];
  const missingIds = [];

  const graph = runtime?.graph;
  const registry = runtime?.registry;

  asArray(objectIds).forEach((objectId) => {
    const id = String(objectId || '').trim();
    if (!id) return;

    const inGraph = typeof graph?.getNode === 'function' ? graph.getNode(id) : null;
    const inRegistry = typeof registry?.find === 'function' ? registry.find(id) : null;
    if (inGraph || inRegistry) {
      existingIds.push(id);
    } else {
      missingIds.push(id);
    }
  });

  return {
    existingIds,
    missingIds
  };
}

export class NarrationSceneSynchronizationRuntime {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = isObject(options) ? options : {};
    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.sceneEventRuntime = runtime?.sceneEventRuntime || runtime?.sceneEventSystem || null;
    this.narration = runtime?.metadata?.narration || {
      segments: [],
      cues: {
        all: []
      },
      summary: {
        segmentCount: 0,
        cueCount: 0,
        totalDurationMs: 0
      }
    };

    this.cuePlans = buildCuePlan(this.narration.segments, this.narration.cues);
    this.pendingIndex = 0;
    this.dispatchedCueIds = new Set();
    this.skippedCueIds = new Set();
    this.resyncCount = 0;
    this.lastDriftMs = 0;
    this.lastTimelineTimeMs = getRuntimeTimeMs(this.scheduler);
    this.narrationClockTimeMs = this.lastTimelineTimeMs;
    this.lastSpeed = getRuntimeSpeed(this.scheduler);
    this.paused = false;

    this.diagnostics = {
      dispatchedCount: 0,
      delayedEventCount: 0,
      skippedCueCount: 0,
      unknownCueTypeCount: 0,
      driftDetectionCount: 0,
      missingObjectReferenceCount: 0
    };

    this.listeners = createChannelSet();
    this.unsubscribers = [];

    this.attachScheduler(this.scheduler);
    this.synchronize('attach');
  }

  on(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    if (typeof listener !== 'function') {
      throw new Error('NarrationSceneSynchronizationRuntime listener must be a function.');
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
    const safeChannel = String(channel || '').trim() || 'narration-sync';
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
      this.handleSchedulerEvent(event);
    });

    this.unsubscribers.push(unsubscribe);
  }

  handleSchedulerEvent(event = {}) {
    const eventName = String(event?.name || 'UnknownRuntimeEvent');
    const payload = isObject(event?.payload) ? event.payload : {};

    if (eventName === 'TimelinePaused') {
      this.paused = true;
      this.resynchronize('playback-paused', { runtimeEvent: eventName, payload });
      return;
    }

    if (eventName === 'TimelineResumed') {
      this.paused = false;
      this.resynchronize('playback-resumed', { runtimeEvent: eventName, payload });
      return;
    }

    if (eventName === 'CheckpointReached') {
      this.resynchronize('checkpoint-reached', { runtimeEvent: eventName, payload });
      return;
    }

    this.synchronize('timeline-event', {
      runtimeEvent: eventName,
      payload
    });
  }

  updateNarrationClock(timelineTimeMs, force = false) {
    const currentTimeline = Math.max(0, toFiniteNumber(timelineTimeMs, 0));

    if (force) {
      this.narrationClockTimeMs = currentTimeline;
      this.lastTimelineTimeMs = currentTimeline;
      return this.narrationClockTimeMs;
    }

    const delta = Math.max(0, currentTimeline - this.lastTimelineTimeMs);
    if (!this.paused) {
      this.narrationClockTimeMs = Math.max(0, this.narrationClockTimeMs + delta);
    }

    this.lastTimelineTimeMs = currentTimeline;
    return this.narrationClockTimeMs;
  }

  detectDrift(timelineTimeMs, reason = 'manual') {
    const toleranceMs = Math.max(1, toFiniteNumber(this.options.driftToleranceMs, 80));
    const driftMs = Math.round(Math.abs(timelineTimeMs - this.narrationClockTimeMs));
    this.lastDriftMs = driftMs;

    if (driftMs > toleranceMs) {
      this.diagnostics.driftDetectionCount += 1;
      this.emit('narration-drift-detected', {
        reason,
        driftMs,
        toleranceMs,
        timelineTimeMs,
        narrationTimeMs: this.narrationClockTimeMs
      });
      return true;
    }

    return false;
  }

  syncCheckpointForCue(cuePlan, timelineTimeMs) {
    const checkpointRef = cuePlan?.runtimeReferences?.checkpoint;
    if (!checkpointRef || !this.scheduler?.createCheckpoint) return null;

    return this.scheduler.createCheckpoint(checkpointRef.type, {
      timeMs: Math.max(0, toFiniteNumber(timelineTimeMs, cuePlan.timestampMs)),
      metadata: {
        source: 'narration-cue',
        cueId: cuePlan.id,
        synchronizationType: cuePlan.synchronizationType
      }
    });
  }

  buildStructuredSynchronizationEvent(cuePlan, timelineTimeMs, delayMs = 0, context = {}) {
    const refPresence = resolveGraphNodePresence(this.runtime, cuePlan.runtimeReferences.sceneGraph.targetObjectIds);
    if (refPresence.missingIds.length > 0) {
      this.diagnostics.missingObjectReferenceCount += refPresence.missingIds.length;
    }

    const eventType = synchronizationTypeToEventType(cuePlan.synchronizationType);

    return {
      id: `narration-sync-${cuePlan.id}`,
      type: eventType,
      timeMs: cuePlan.timestampMs,
      priority: toFiniteNumber(cuePlan?.cue?.priority, 2),
      source: 'narration-cue',
      sourceRefId: cuePlan.id,
      targets: cuePlan.runtimeReferences.sceneGraph.targetObjectIds,
      payload: {
        synchronizationType: cuePlan.synchronizationType,
        cueId: cuePlan.id,
        cueType: cuePlan.type,
        segmentId: cuePlan.segmentId,
        timing: {
          cueTimeMs: cuePlan.timestampMs,
          timelineTimeMs,
          delayMs,
          driftMs: this.lastDriftMs,
          speed: this.lastSpeed
        },
        runtimeReferences: {
          ...cuePlan.runtimeReferences,
          sceneGraph: {
            ...cuePlan.runtimeReferences.sceneGraph,
            existingObjectIds: refPresence.existingIds,
            missingObjectIds: refPresence.missingIds
          }
        },
        context: isObject(context) ? context : {}
      },
      metadata: {
        cueType: cuePlan.type,
        synchronizationType: cuePlan.synchronizationType,
        unknownCueType: cuePlan.synchronizationType === 'custom-cue',
        delayed: delayMs > 0,
        missingObjectIds: refPresence.missingIds
      },
      extensions: isObject(cuePlan?.cue?.extensions) ? cuePlan.cue.extensions : {}
    };
  }

  dispatchCue(cuePlan, timelineTimeMs, delayMs = 0, context = {}) {
    const event = this.buildStructuredSynchronizationEvent(cuePlan, timelineTimeMs, delayMs, context);

    if (cuePlan.synchronizationType === 'custom-cue') {
      this.diagnostics.unknownCueTypeCount += 1;
    }

    const checkpoint = this.syncCheckpointForCue(cuePlan, timelineTimeMs);

    let dispatchResult = null;
    if (this.sceneEventRuntime && typeof this.sceneEventRuntime.dispatchEvent === 'function') {
      dispatchResult = this.sceneEventRuntime.dispatchEvent(event, {
        trigger: 'narration-cue-sync',
        timelineTimeMs,
        cueId: cuePlan.id
      });
    }

    this.dispatchedCueIds.add(cuePlan.id);
    this.diagnostics.dispatchedCount += 1;

    this.emit('narration-sync-event', {
      event,
      dispatchResult,
      checkpoint,
      context
    });

    return dispatchResult;
  }

  markCueSkipped(cuePlan, timelineTimeMs, reason = 'skip-window') {
    this.skippedCueIds.add(cuePlan.id);
    this.diagnostics.skippedCueCount += 1;

    this.emit('narration-cue-skipped', {
      cueId: cuePlan.id,
      cueType: cuePlan.type,
      synchronizationType: cuePlan.synchronizationType,
      cueTimeMs: cuePlan.timestampMs,
      timelineTimeMs,
      reason
    });
  }

  dispatchDueCues(timelineTimeMs, context = {}) {
    const delayToleranceMs = Math.max(0, toFiniteNumber(this.options.delayToleranceMs, 220));
    const skipToleranceMs = Math.max(delayToleranceMs + 1, toFiniteNumber(this.options.skipToleranceMs, 1800));

    while (this.pendingIndex < this.cuePlans.length) {
      const cuePlan = this.cuePlans[this.pendingIndex];
      if (cuePlan.timestampMs > timelineTimeMs) break;

      this.pendingIndex += 1;

      const delayMs = Math.max(0, timelineTimeMs - cuePlan.timestampMs);
      if (delayMs > skipToleranceMs) {
        this.markCueSkipped(cuePlan, timelineTimeMs, 'cue-window-missed');
        this.resynchronize('cue-skipped', {
          cueId: cuePlan.id,
          timelineTimeMs
        });
        continue;
      }

      if (delayMs > delayToleranceMs) {
        this.diagnostics.delayedEventCount += 1;
        this.emit('narration-event-delayed', {
          cueId: cuePlan.id,
          cueTimeMs: cuePlan.timestampMs,
          timelineTimeMs,
          delayMs
        });
      }

      this.dispatchCue(cuePlan, timelineTimeMs, delayMs, context);
    }
  }

  synchronize(reason = 'manual', context = {}) {
    const timelineTimeMs = getRuntimeTimeMs(this.scheduler);
    this.lastSpeed = getRuntimeSpeed(this.scheduler);

    this.updateNarrationClock(timelineTimeMs);
    const driftDetected = this.detectDrift(timelineTimeMs, reason);

    if (!this.paused) {
      this.dispatchDueCues(timelineTimeMs, {
        reason,
        ...context
      });
    }

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      narrationSynchronization: this.snapshot()
    };

    if (driftDetected) {
      this.resynchronize('drift-correction', {
        sourceReason: reason
      });
    }

    return this.snapshot();
  }

  resynchronize(reason = 'manual', context = {}) {
    const timelineTimeMs = getRuntimeTimeMs(this.scheduler);
    this.updateNarrationClock(timelineTimeMs, true);
    this.resyncCount += 1;

    this.emit('narration-resynchronized', {
      reason,
      timelineTimeMs,
      context
    });

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      narrationSynchronization: this.snapshot()
    };

    return this.snapshot();
  }

  handleExternalTimelineMutation(mutationType = 'manual', context = {}) {
    const safeType = String(mutationType || 'manual').trim() || 'manual';
    this.resynchronize(`external-${safeType}`, context);
    return this.synchronize(`mutation-${safeType}`, context);
  }

  reset() {
    this.pendingIndex = 0;
    this.dispatchedCueIds.clear();
    this.skippedCueIds.clear();
    this.paused = false;
    this.resyncCount = 0;
    this.lastTimelineTimeMs = getRuntimeTimeMs(this.scheduler);
    this.narrationClockTimeMs = this.lastTimelineTimeMs;
    this.lastDriftMs = 0;
    this.diagnostics = {
      dispatchedCount: 0,
      delayedEventCount: 0,
      skippedCueCount: 0,
      unknownCueTypeCount: 0,
      driftDetectionCount: 0,
      missingObjectReferenceCount: 0
    };

    return this.synchronize('reset');
  }

  pause(reason = 'manual') {
    this.paused = true;
    return this.resynchronize('pause', { reason });
  }

  resume(reason = 'manual') {
    this.paused = false;
    return this.resynchronize('resume', { reason });
  }

  snapshot() {
    return {
      schemaVersion: 'v1',
      updatedAt: Date.now(),
      pendingCueCount: Math.max(0, this.cuePlans.length - this.pendingIndex),
      dispatchedCueCount: this.dispatchedCueIds.size,
      skippedCueCount: this.skippedCueIds.size,
      cuePlanCount: this.cuePlans.length,
      driftMs: this.lastDriftMs,
      narrationClockTimeMs: this.narrationClockTimeMs,
      timelineClockTimeMs: this.lastTimelineTimeMs,
      speed: this.lastSpeed,
      resyncCount: this.resyncCount,
      diagnostics: {
        ...this.diagnostics
      }
    };
  }

  destroy() {
    this.unsubscribers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });

    this.unsubscribers = [];
    this.emit('narration-sync-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });
  }

  static supportedChannels() {
    return [
      'narration-sync-event',
      'narration-drift-detected',
      'narration-resynchronized',
      'narration-cue-skipped',
      'narration-event-delayed',
      'narration-sync-destroyed'
    ];
  }
}

export function createNarrationSceneSynchronizationRuntime(runtime = {}, options = {}) {
  return new NarrationSceneSynchronizationRuntime(runtime, options);
}
