import { isObject } from './TimelineRuntimeConfig.js';

const STORE_KEY = '__daksha_timeline_persistence_store__';

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

function mapSize(value) {
  if (!value) return 0;
  if (typeof value.size === 'number') return value.size;
  if (Array.isArray(value)) return value.length;
  return 0;
}

function safeEmit(listenersMap, channel, payload) {
  const listeners = listenersMap.get(channel);
  if (!listeners || listeners.size === 0) return;

  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // Listener failures are isolated from synchronization runtime.
    }
  });
}

function getRuntimeGraphSummary(runtime = {}) {
  const graph = runtime?.graph;
  if (!graph) {
    return {
      nodeCount: 0,
      relationshipCount: 0
    };
  }

  return {
    nodeCount: typeof graph.getNodeCount === 'function' ? Number(graph.getNodeCount()) : mapSize(graph.nodes),
    relationshipCount: typeof graph.getRelationshipCount === 'function' ? Number(graph.getRelationshipCount()) : mapSize(graph.edges)
  };
}

function getTimelineSummary(runtime = {}) {
  const metadata = runtime?.metadata?.timeline || {};
  return {
    timelineId: metadata.timelineId || null,
    version: metadata.version || null,
    trackIds: Array.isArray(metadata.trackIds) ? [...metadata.trackIds] : [],
    clipIds: Array.isArray(metadata.clipIds) ? [...metadata.clipIds] : [],
    markerIds: Array.isArray(metadata.markerIds) ? [...metadata.markerIds] : [],
    eventIds: Array.isArray(metadata.eventIds) ? [...metadata.eventIds] : []
  };
}

function getPlaybackSummary(scheduler) {
  const snapshot = scheduler?.snapshot?.() || {};
  const cursor = snapshot.cursor || {};
  return {
    state: snapshot.playbackState || 'Idle',
    timeMs: Number(snapshot?.clock?.timeMs || 0),
    speed: Number(snapshot?.speed || 1),
    progress: Number(cursor.progress || 0),
    currentClipId: cursor?.currentClip?.id || null,
    currentMarkerId: cursor?.currentMarker?.id || null,
    currentEventId: cursor?.currentEvent?.id || null,
    currentChapterId: cursor?.currentChapter?.id || null,
    queueDepth: Number(snapshot.queueDepth || 0),
    loop: snapshot.loop || {},
    branch: snapshot.branch || {},
    checkpointId: scheduler?.checkpoints?.latest?.()?.id || null
  };
}

function resolveActiveNarrationSegment(narration = {}, timeMs = 0) {
  const segments = Array.isArray(narration?.segments) ? narration.segments : [];
  const safeTime = Number(timeMs || 0);

  for (const segment of segments) {
    const start = Number(segment?.timestampMs || 0);
    const duration = Number(segment?.durationMs || 0);
    const end = start + Math.max(0, duration);
    if (safeTime >= start && safeTime <= end) {
      return segment;
    }
  }

  return segments[0] || null;
}

function resolveActiveNarrationCues(narration = {}, segmentId = null) {
  const cues = Array.isArray(narration?.cues?.all) ? narration.cues.all : [];
  if (!segmentId) return [];
  return cues.filter((cue) => String(cue?.segmentId || '') === String(segmentId));
}

function createChannelSet() {
  return new Map();
}

export class TimelineSynchronizationRuntime {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = isObject(options) ? options : {};
    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.sceneEventRuntime = runtime?.sceneEventRuntime || runtime?.sceneEventSystem || null;
    this.narrationSynchronizationRuntime = runtime?.narrationSynchronizationRuntime || null;
    this.speechPlaybackRuntime = runtime?.speechPlaybackRuntime || null;
    this.interactionEngine = runtime?.behaviorRuntime || null;
    this.persistenceAdapter = this.options.persistenceAdapter || this.scheduler?.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = String(this.options.persistenceKey || this.scheduler?.persistenceKey || 'daksha.timeline.runtime.v1');

    this.listeners = createChannelSet();
    this.unsubscribers = [];
    this.sharedState = this.createSharedState('boot');

    this.attachScheduler(this.scheduler);
    this.attachSceneEventRuntime(this.sceneEventRuntime);
    this.attachNarrationSynchronizationRuntime(this.narrationSynchronizationRuntime);
    this.attachSpeechPlaybackRuntime(this.speechPlaybackRuntime);
    this.attachInteractionEngine(this.interactionEngine);
  }

  createSharedState(reason = 'manual', sessionPatch = {}) {
    const graphSummary = getRuntimeGraphSummary(this.runtime);
    const timelineSummary = getTimelineSummary(this.runtime);
    const playback = getPlaybackSummary(this.scheduler);
    const narration = this.runtime?.metadata?.narration || {
      segments: [],
      cues: { all: [] },
      summary: { segmentCount: 0, cueCount: 0, totalDurationMs: 0 }
    };
    const activeNarrationSegment = resolveActiveNarrationSegment(narration, playback.timeMs);
    const activeNarrationCues = resolveActiveNarrationCues(narration, activeNarrationSegment?.id || null);
    const narrationSynchronizationState = this.narrationSynchronizationRuntime?.snapshot?.() || null;
    const speechPlaybackState = this.speechPlaybackRuntime?.snapshot?.() || this.runtime?.metadata?.speechPlayback || null;
    const previousSession = this.sharedState?.session || {
      persistenceKey: this.persistenceKey,
      recovered: false,
      persistedAt: null
    };

    return {
      schemaVersion: 'v1',
      reason,
      updatedAt: Date.now(),
      sceneId: this.runtime?.sceneId || null,
      timeline: timelineSummary,
      narration: {
        summary: narration.summary || {},
        activeSegmentId: activeNarrationSegment?.id || null,
        activeCueIds: activeNarrationCues.map((cue) => cue.id),
        segmentCount: Number(narration?.summary?.segmentCount || narration?.segments?.length || 0),
        cueCount: Number(narration?.summary?.cueCount || narration?.cues?.all?.length || 0),
        synchronization: narrationSynchronizationState
      },
      speechPlayback: speechPlaybackState,
      playback,
      sceneGraph: {
        nodeCount: graphSummary.nodeCount,
        relationshipCount: graphSummary.relationshipCount,
        diagnostics: this.runtime?.diagnostics || {}
      },
      runtimeGraph: {
        nodeCount: graphSummary.nodeCount,
        relationshipCount: graphSummary.relationshipCount
      },
      adapters: {
        aiTeacher: {
          state: playback.state,
          timeMs: playback.timeMs,
          checkpointId: playback.checkpointId,
          progress: playback.progress,
          activeNarrationSegmentId: activeNarrationSegment?.id || null,
          activeNarrationCueIds: activeNarrationCues.map((cue) => cue.id),
          narrationSynchronizationState,
          speechPlaybackState,
          updatedAt: Date.now()
        },
        rendererAdapter: {
          state: playback.state,
          timeMs: playback.timeMs,
          speed: playback.speed,
          currentClipId: playback.currentClipId,
          activeNarrationSegmentId: activeNarrationSegment?.id || null,
          activeNarrationCueIds: activeNarrationCues.map((cue) => cue.id),
          narrationSynchronizationState,
          speechPlaybackState,
          updatedAt: Date.now()
        },
        interactionEngine: {
          state: playback.state,
          timeMs: playback.timeMs,
          currentEventId: playback.currentEventId,
          activeNarrationSegmentId: activeNarrationSegment?.id || null,
          activeNarrationCueIds: activeNarrationCues.map((cue) => cue.id),
          narrationSynchronizationState,
          speechPlaybackState,
          updatedAt: Date.now()
        }
      },
      session: {
        ...previousSession,
        persistenceKey: this.persistenceKey,
        ...sessionPatch
      }
    };
  }

  on(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    if (typeof listener !== 'function') {
      throw new Error('TimelineSynchronizationRuntime listener must be a function.');
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
    const safeChannel = String(channel || '').trim() || 'timeline-sync';
    const message = {
      channel: safeChannel,
      payload,
      state: this.getSharedState(),
      timestamp: Date.now()
    };

    safeEmit(this.listeners, safeChannel, message);
    safeEmit(this.listeners, '*', message);
    return message;
  }

  attachScheduler(scheduler) {
    if (!scheduler || typeof scheduler.on !== 'function') return;

    const unsubscribe = scheduler.on('*', (event) => {
      this.synchronize('timeline-event', {
        eventName: event?.name || 'UnknownRuntimeEvent',
        payload: event?.payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachSceneEventRuntime(sceneEventRuntime) {
    if (!sceneEventRuntime || typeof sceneEventRuntime.on !== 'function') return;

    const unsubscribe = sceneEventRuntime.on('SceneEventDispatched', ({ event }) => {
      this.synchronize('scene-event-dispatched', {
        eventId: event?.id || null,
        eventType: event?.type || 'unknown'
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachNarrationSynchronizationRuntime(narrationSynchronizationRuntime) {
    if (!narrationSynchronizationRuntime || typeof narrationSynchronizationRuntime.on !== 'function') return;

    const unsubscribe = narrationSynchronizationRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('narration-sync-event', {
        channel: channel || 'narration-sync',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachSpeechPlaybackRuntime(speechPlaybackRuntime) {
    if (!speechPlaybackRuntime || typeof speechPlaybackRuntime.on !== 'function') return;

    const unsubscribe = speechPlaybackRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('speech-playback-event', {
        channel: channel || 'speech-playback-event',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachInteractionEngine(interactionEngine) {
    if (!interactionEngine || typeof interactionEngine.getDiagnostics !== 'function') return;
    this.synchronize('interaction-engine-attached', {
      diagnostics: interactionEngine.getDiagnostics()
    });
  }

  synchronize(reason = 'manual', payload = {}, sessionPatch = {}) {
    this.sharedState = this.createSharedState(reason, sessionPatch);

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      timelineSynchronization: {
        schemaVersion: this.sharedState.schemaVersion,
        updatedAt: this.sharedState.updatedAt,
        channels: TimelineSynchronizationRuntime.supportedChannels()
      },
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        timelineState: this.sharedState.adapters.aiTeacher
      },
      rendererAdapter: {
        ...(this.runtime.metadata?.rendererAdapter || {}),
        timelineState: this.sharedState.adapters.rendererAdapter
      },
      interactionEngine: {
        ...(this.runtime.metadata?.interactionEngine || {}),
        timelineState: this.sharedState.adapters.interactionEngine
      }
    };

    this.emit('timeline-sync', {
      reason,
      ...payload
    });

    return this.getSharedState();
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const schedulerSnapshot = this.scheduler?.createPersistenceSnapshot?.() || {};
    const payload = {
      scheduler: {
        snapshot: schedulerSnapshot,
        checkpoints: this.scheduler?.checkpoints?.toJSON?.() || []
      },
      sharedState: this.getSharedState(),
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

    if (this.sharedState?.session) {
      this.sharedState.session.persistedAt = payload.persistedAt;
    }

    this.emit('timeline-persisted', {
      persistenceKey: this.persistenceKey,
      persistedAt: payload.persistedAt
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
    if (!parsed) return false;

    const schedulerSnapshot = parsePayload(parsed?.scheduler?.snapshot) || parsed?.scheduler?.snapshot || parsed;
    const checkpoints = Array.isArray(parsed?.scheduler?.checkpoints)
      ? parsed.scheduler.checkpoints
      : Array.isArray(parsed?.checkpoints)
        ? parsed.checkpoints
        : [];

    if (this.scheduler) {
      if (checkpoints.length && this.scheduler.checkpoints?.restore) {
        this.scheduler.checkpoints.restore(checkpoints);
      }

      if (schedulerSnapshot && this.scheduler.applyPersistenceSnapshot) {
        this.scheduler.applyPersistenceSnapshot(schedulerSnapshot);
      }
    }

    this.synchronize('recover', {
      recovered: true
    }, {
      recovered: true,
      persistedAt: Number(parsed?.persistedAt || Date.now())
    });

    this.emit('timeline-recovered', {
      recovered: true,
      persistenceKey: this.persistenceKey
    });

    return true;
  }

  pause(reason = 'manual') {
    this.scheduler?.pause?.(reason);
    this.sceneEventRuntime?.pause?.(reason);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('pause', { reason });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('pause', { reason });
    const state = this.synchronize('pause', { reason });
    this.persistSession();
    return state;
  }

  resume(reason = 'manual') {
    this.scheduler?.resume?.(reason);
    this.sceneEventRuntime?.resume?.(reason);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('resume', { reason });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('resume', { reason });
    const state = this.synchronize('resume', { reason });
    this.persistSession();
    return state;
  }

  replay(fromTimeMs = 0) {
    this.scheduler?.replay?.(fromTimeMs);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('replay', { fromTimeMs: Number(fromTimeMs || 0) });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('replay', { fromTimeMs: Number(fromTimeMs || 0) });
    const state = this.synchronize('replay', { fromTimeMs });
    this.persistSession();
    return state;
  }

  restart() {
    this.scheduler?.restart?.();
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('restart', {});
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('restart', {});
    const state = this.synchronize('restart', {});
    this.persistSession();
    return state;
  }

  setSpeed(speed) {
    this.scheduler?.setSpeed?.(speed);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('speed-change', { speed: Number(speed || 1) });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('speed-change', { speed: Number(speed || 1) });
    const state = this.synchronize('speed-change', { speed });
    this.persistSession();
    return state;
  }

  seekByTime(timeMs) {
    this.scheduler?.seekByTime?.(timeMs);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-time', { timeMs: Number(timeMs || 0) });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-time', { timeMs: Number(timeMs || 0) });
    const state = this.synchronize('seek-time', { timeMs: Number(timeMs || 0) });
    this.persistSession();
    return state;
  }

  seekByChapter(chapterId) {
    this.scheduler?.seekByChapter?.(chapterId);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-chapter', { chapterId: chapterId || null });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-chapter', { chapterId: chapterId || null });
    const state = this.synchronize('seek-chapter', { chapterId: chapterId || null });
    this.persistSession();
    return state;
  }

  seekByClip(clipId) {
    this.scheduler?.seekByClip?.(clipId);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-clip', { clipId: clipId || null });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-clip', { clipId: clipId || null });
    const state = this.synchronize('seek-clip', { clipId: clipId || null });
    this.persistSession();
    return state;
  }

  seekByEvent(eventId) {
    this.scheduler?.seekByEvent?.(eventId);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-event', { eventId: eventId || null });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-event', { eventId: eventId || null });
    const state = this.synchronize('seek-event', { eventId: eventId || null });
    this.persistSession();
    return state;
  }

  seekByMarker(markerId) {
    this.scheduler?.seekByMarker?.(markerId);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-marker', { markerId: markerId || null });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-marker', { markerId: markerId || null });
    const state = this.synchronize('seek-marker', { markerId: markerId || null });
    this.persistSession();
    return state;
  }

  seekByCheckpoint(checkpointId) {
    this.scheduler?.seekByCheckpoint?.(checkpointId);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-checkpoint', { checkpointId: checkpointId || null });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-checkpoint', { checkpointId: checkpointId || null });
    const state = this.synchronize('seek-checkpoint', { checkpointId: checkpointId || null });
    this.persistSession();
    return state;
  }

  seekByPercentage(percentage) {
    this.scheduler?.seekByPercentage?.(percentage);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-percentage', { percentage: Number(percentage || 0) });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-percentage', { percentage: Number(percentage || 0) });
    const state = this.synchronize('seek-percentage', { percentage: Number(percentage || 0) });
    this.persistSession();
    return state;
  }

  resumeFromCheckpoint(checkpointId) {
    this.scheduler?.resumeFromCheckpoint?.(checkpointId);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('resume-checkpoint', { checkpointId: checkpointId || null });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('resume-checkpoint', { checkpointId: checkpointId || null });
    const state = this.synchronize('resume-checkpoint', { checkpointId: checkpointId || null });
    this.persistSession();
    return state;
  }

  getSharedState() {
    return JSON.parse(JSON.stringify(this.sharedState || this.createSharedState('snapshot')));
  }

  destroy() {
    this.unsubscribers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });

    this.unsubscribers = [];
    this.emit('timeline-sync-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });
  }

  static supportedChannels() {
    return [
      'timeline-sync',
      'timeline-recovered',
      'timeline-persisted',
      'timeline-sync-destroyed'
    ];
  }
}

export function createTimelineSynchronizationRuntime(runtime = {}, options = {}) {
  return new TimelineSynchronizationRuntime(runtime, options);
}
