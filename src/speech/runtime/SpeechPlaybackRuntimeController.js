import {
  DEFAULT_SPEECH_PLAYBACK_CONFIG,
  SPEECH_PLAYBACK_STATES,
  asArray,
  clamp,
  isObject,
  toFiniteNumber
} from './SpeechPlaybackRuntimeConfig.js';

const STORE_KEY = '__daksha_speech_runtime_persistence_store__';

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
      // Listener failures are isolated from speech runtime control flow.
    }
  });
}

function getRuntimeTimeMs(scheduler) {
  const snapshot = scheduler?.snapshot?.() || {};
  return Math.max(0, toFiniteNumber(snapshot?.clock?.timeMs, 0));
}

function getRuntimeSpeed(scheduler, fallback = 1) {
  const snapshot = scheduler?.snapshot?.() || {};
  return Math.max(0.1, toFiniteNumber(snapshot?.speed, fallback));
}

function normalizeSegments(narration = {}) {
  return asArray(narration?.segments)
    .map((segment, index) => {
      const startMs = Math.max(0, toFiniteNumber(segment?.timestampMs, index * 1000));
      const durationMs = Math.max(1, toFiniteNumber(segment?.durationMs, 1000));
      const endMs = startMs + durationMs;
      const id = String(segment?.id || `narration-segment-${index + 1}`);

      return {
        id,
        index,
        text: String(segment?.text || ''),
        startMs,
        endMs,
        durationMs,
        learningObjective: String(segment?.learningObjective || ''),
        difficulty: String(segment?.difficulty || ''),
        relatedSceneObjectIds: asArray(segment?.relatedSceneObjectIds),
        relatedTimeline: isObject(segment?.relatedTimeline) ? segment.relatedTimeline : {}
      };
    })
    .sort((left, right) => left.startMs - right.startMs);
}

function findSegmentByTime(segments = [], timeMs = 0) {
  const safeTime = Math.max(0, toFiniteNumber(timeMs, 0));

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;
    const inRange = isLast
      ? safeTime >= segment.startMs && safeTime <= segment.endMs
      : safeTime >= segment.startMs && safeTime < segment.endMs;

    if (inRange) {
      return segment;
    }
  }

  return segments.length ? segments[segments.length - 1] : null;
}

function findSegmentById(segments = [], segmentId = null) {
  const key = String(segmentId || '').trim();
  if (!key) return null;
  return segments.find((segment) => String(segment?.id || '') === key) || null;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class SpeechPlaybackRuntimeController {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_SPEECH_PLAYBACK_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.narration = runtime?.metadata?.narration || { segments: [] };
    this.segments = normalizeSegments(this.narration);

    this.persistenceAdapter = this.options.persistenceAdapter || this.scheduler?.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = String(this.options.persistenceKey || this.scheduler?.persistenceKey || this.options.persistenceKey || DEFAULT_SPEECH_PLAYBACK_CONFIG.persistenceKey);

    this.listeners = createChannelSet();
    this.unsubscribers = [];
    this.completedSegmentIds = new Set();
    this.lastTimelineTimeMs = getRuntimeTimeMs(this.scheduler);

    this.state = {
      playbackState: 'Loading',
      knownPlaybackState: true,
      timelineTimeMs: this.lastTimelineTimeMs,
      narrationTimeMs: this.lastTimelineTimeMs,
      speed: getRuntimeSpeed(this.scheduler, this.options.defaultSpeed),
      muted: Boolean(this.options.defaultMuted),
      volume: clamp(toFiniteNumber(this.options.defaultVolume, 1), 0, 1),
      currentSegmentId: this.segments[0]?.id || null,
      previousSegmentId: null,
      loading: true,
      buffering: false,
      interrupted: false,
      error: null,
      reason: 'boot',
      segmentTimings: {},
      checkpoints: {
        lastCheckpointId: null,
        resumedFromCheckpointId: null
      },
      diagnostics: {
        recoveries: 0,
        interruptions: 0,
        resyncs: 0,
        errors: 0
      }
    };

    this.attachScheduler(this.scheduler);
    this.recalculateSegmentTimings(this.state.timelineTimeMs);
    this.setPlaybackState('Ready', { reason: 'boot-ready', loading: false, buffering: false });
  }

  on(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    if (typeof listener !== 'function') {
      throw new Error('SpeechPlaybackRuntimeController listener must be a function.');
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
    const safeChannel = String(channel || '').trim() || 'speech-playback-event';
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
    const timelineTimeMs = getRuntimeTimeMs(this.scheduler);

    this.state.timelineTimeMs = timelineTimeMs;
    this.state.narrationTimeMs = timelineTimeMs;

    if (eventName === 'TimelineStarted' || eventName === 'TimelineResumed') {
      this.setPlaybackState('Playing', { reason: eventName, loading: false, buffering: false });
    } else if (eventName === 'TimelinePaused') {
      this.setPlaybackState('Paused', { reason: eventName });
    } else if (eventName === 'TimelineStopped') {
      this.setPlaybackState('Cancelled', { reason: eventName });
    } else if (eventName === 'TimelineCompleted') {
      this.setPlaybackState('Completed', { reason: eventName });
    } else if (eventName === 'TimelineError') {
      this.state.diagnostics.errors += 1;
      this.setPlaybackState('Error', { reason: eventName, error: payload });
    }

    this.synchronize('timeline-event', {
      eventName,
      payload
    });
  }

  setPlaybackState(nextState = 'Idle', patch = {}) {
    const safeState = String(nextState || 'Idle').trim() || 'Idle';
    const knownPlaybackState = SPEECH_PLAYBACK_STATES.includes(safeState);

    this.state = {
      ...this.state,
      ...patch,
      playbackState: safeState,
      knownPlaybackState
    };

    this.emit('speech-playback-state-changed', {
      playbackState: safeState,
      knownPlaybackState,
      reason: patch.reason || 'manual'
    });

    return this.snapshot();
  }

  recalculateSegmentTimings(timelineTimeMs = this.state.timelineTimeMs) {
    const safeTime = Math.max(0, toFiniteNumber(timelineTimeMs, 0));
    const nextTimings = {};

    this.segments.forEach((segment) => {
      const playedDurationMs = clamp(safeTime - segment.startMs, 0, segment.durationMs);
      const status = safeTime < segment.startMs
        ? 'pending'
        : safeTime > segment.endMs
          ? 'completed'
          : 'active';

      nextTimings[segment.id] = {
        segmentId: segment.id,
        index: segment.index,
        startMs: segment.startMs,
        endMs: segment.endMs,
        durationMs: segment.durationMs,
        playedDurationMs,
        remainingDurationMs: Math.max(0, segment.durationMs - playedDurationMs),
        status,
        progress: segment.durationMs > 0 ? playedDurationMs / segment.durationMs : 0,
        speed: this.state.speed,
        muted: this.state.muted,
        volume: this.state.volume
      };

      if (status === 'completed' && !this.completedSegmentIds.has(segment.id)) {
        this.completedSegmentIds.add(segment.id);
        const checkpoint = this.scheduler?.createCheckpoint?.('resume', {
          timeMs: segment.endMs,
          metadata: {
            source: 'speech-playback-runtime',
            segmentId: segment.id
          }
        });

        if (checkpoint?.id) {
          this.state.checkpoints.lastCheckpointId = checkpoint.id;
        }
      }
    });

    this.state.segmentTimings = nextTimings;
    const active = findSegmentByTime(this.segments, safeTime);
    this.state.previousSegmentId = this.state.currentSegmentId;
    this.state.currentSegmentId = active?.id || this.state.currentSegmentId;
  }

  synchronize(reason = 'manual', payload = {}) {
    this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);
    this.state.narrationTimeMs = this.state.timelineTimeMs;
    this.state.speed = getRuntimeSpeed(this.scheduler, this.state.speed || 1);

    this.recalculateSegmentTimings(this.state.timelineTimeMs);

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      speechPlayback: this.snapshot(),
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        speechState: this.snapshot()
      }
    };

    this.emit('speech-playback-event', {
      reason,
      ...payload
    });

    return this.snapshot();
  }

  play() {
    this.scheduler?.play?.();
    this.setPlaybackState('Playing', { reason: 'play', loading: false, buffering: false });
    const state = this.synchronize('play');
    this.persistSession();
    return state;
  }

  pause(reason = 'manual') {
    this.scheduler?.pause?.(reason);
    this.setPlaybackState('Paused', { reason: `pause:${reason}` });
    const state = this.synchronize('pause', { reason });
    this.persistSession();
    return state;
  }

  resume(reason = 'manual') {
    this.scheduler?.resume?.(reason);
    this.setPlaybackState('Playing', { reason: `resume:${reason}`, buffering: false });
    const state = this.synchronize('resume', { reason });
    this.persistSession();
    return state;
  }

  stop(reason = 'manual') {
    this.scheduler?.stop?.(reason);
    this.setPlaybackState('Cancelled', { reason: `stop:${reason}` });
    const state = this.synchronize('stop', { reason });
    this.persistSession();
    return state;
  }

  replay(segmentId = null) {
    const segment = segmentId
      ? this.segments.find((item) => String(item.id) === String(segmentId)) || null
      : this.segments[0] || null;

    const targetTimeMs = segment?.startMs || 0;
    this.scheduler?.replay?.(targetTimeMs);
    this.setPlaybackState('Playing', { reason: 'replay', buffering: false });
    const state = this.synchronize('replay', {
      segmentId: segment?.id || null,
      timeMs: targetTimeMs
    });
    this.persistSession();
    return state;
  }

  seek(timeMs = 0) {
    const safeTime = Math.max(0, toFiniteNumber(timeMs, 0));
    this.scheduler?.seekByTime?.(safeTime);
    this.state.diagnostics.resyncs += 1;
    this.setPlaybackState('Paused', { reason: 'seek' });
    const state = this.synchronize('seek', { timeMs: safeTime });
    this.persistSession();
    return state;
  }

  next() {
    const current = findSegmentById(this.segments, this.state.currentSegmentId) || findSegmentByTime(this.segments, this.state.timelineTimeMs) || this.segments[0] || null;
    const nextIndex = current ? Math.min(this.segments.length - 1, current.index + 1) : 0;
    const segment = this.segments[nextIndex] || null;
    if (!segment) return this.snapshot();
    const state = this.seek(segment.startMs);
    this.state.currentSegmentId = segment.id;
    this.state.previousSegmentId = current?.id || null;
    return this.synchronize('next', { segmentId: segment.id });
  }

  previous() {
    const current = findSegmentById(this.segments, this.state.currentSegmentId) || findSegmentByTime(this.segments, this.state.timelineTimeMs) || this.segments[0] || null;
    const previousIndex = current ? Math.max(0, current.index - 1) : 0;
    const segment = this.segments[previousIndex] || null;
    if (!segment) return this.snapshot();
    const state = this.seek(segment.startMs);
    this.state.currentSegmentId = segment.id;
    this.state.previousSegmentId = current?.id || null;
    return this.synchronize('previous', { segmentId: segment.id });
  }

  skip() {
    return this.next();
  }

  setSpeed(speed = 1) {
    const safeSpeed = Math.max(0.1, toFiniteNumber(speed, 1));
    this.scheduler?.setSpeed?.(safeSpeed);
    this.state.speed = safeSpeed;
    this.state.diagnostics.resyncs += 1;
    const state = this.synchronize('speed-change', { speed: safeSpeed });
    this.persistSession();
    return state;
  }

  mute() {
    this.state.muted = true;
    const state = this.synchronize('mute', { muted: true });
    this.persistSession();
    return state;
  }

  unmute() {
    this.state.muted = false;
    const state = this.synchronize('unmute', { muted: false });
    this.persistSession();
    return state;
  }

  setMute(muted = false) {
    return muted ? this.mute() : this.unmute();
  }

  setVolume(volume = 1) {
    const safeVolume = clamp(toFiniteNumber(volume, 1), 0, 1);
    this.state.volume = safeVolume;
    const state = this.synchronize('volume-change', { volume: safeVolume });
    this.persistSession();
    return state;
  }

  setBuffering(reason = 'manual') {
    this.setPlaybackState('Buffering', {
      reason: `buffering:${reason}`,
      buffering: true
    });
    return this.synchronize('buffering', { reason });
  }

  setReady(reason = 'manual') {
    this.setPlaybackState('Ready', {
      reason: `ready:${reason}`,
      loading: false,
      buffering: false
    });
    return this.synchronize('ready', { reason });
  }

  handleExternalTimelineMutation(mutationType = 'manual', context = {}) {
    const safeType = String(mutationType || 'manual').trim() || 'manual';

    if (safeType === 'pause') {
      this.setPlaybackState('Paused', { reason: 'external-pause' });
    } else if (safeType === 'resume') {
      this.setPlaybackState('Playing', { reason: 'external-resume' });
    } else if (safeType.includes('seek')) {
      this.state.diagnostics.resyncs += 1;
      this.setPlaybackState('Paused', { reason: `external-${safeType}` });
    } else if (safeType === 'speed-change') {
      this.state.speed = Math.max(0.1, toFiniteNumber(context?.speed, this.state.speed));
    } else if (safeType === 'resume-checkpoint') {
      const checkpointId = context?.checkpointId || null;
      const checkpoint = this.scheduler?.checkpoints?.getById?.(checkpointId) || this.scheduler?.checkpoints?.latest?.('resume');
      if (checkpoint && Number.isFinite(Number(checkpoint.timeMs))) {
        this.scheduler?.seekByTime?.(checkpoint.timeMs);
        this.state.checkpoints.resumedFromCheckpointId = checkpoint.id;
        this.state.timelineTimeMs = Math.max(0, toFiniteNumber(checkpoint.timeMs, this.state.timelineTimeMs));
        this.state.narrationTimeMs = this.state.timelineTimeMs;
      }
    }

    return this.synchronize(`mutation-${safeType}`, context);
  }

  createPersistencePayload() {
    return {
      schemaVersion: 'v1',
      persistedAt: Date.now(),
      state: {
        playbackState: this.state.playbackState,
        knownPlaybackState: this.state.knownPlaybackState,
        timelineTimeMs: this.state.timelineTimeMs,
        narrationTimeMs: this.state.narrationTimeMs,
        speed: this.state.speed,
        muted: this.state.muted,
        volume: this.state.volume,
        currentSegmentId: this.state.currentSegmentId,
        previousSegmentId: this.state.previousSegmentId,
        loading: this.state.loading,
        buffering: this.state.buffering,
        interrupted: this.state.interrupted,
        error: this.state.error,
        reason: this.state.reason,
        segmentTimings: this.state.segmentTimings,
        checkpoints: this.state.checkpoints,
        diagnostics: this.state.diagnostics
      }
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

    this.emit('speech-playback-persisted', {
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

    const restored = parsed.state;

    this.state = {
      ...this.state,
      playbackState: String(restored.playbackState || this.state.playbackState),
      knownPlaybackState: Boolean(restored.knownPlaybackState),
      timelineTimeMs: Math.max(0, toFiniteNumber(restored.timelineTimeMs, this.state.timelineTimeMs)),
      narrationTimeMs: Math.max(0, toFiniteNumber(restored.narrationTimeMs, this.state.narrationTimeMs)),
      speed: Math.max(0.1, toFiniteNumber(restored.speed, this.state.speed)),
      muted: Boolean(restored.muted),
      volume: clamp(toFiniteNumber(restored.volume, this.state.volume), 0, 1),
      currentSegmentId: restored.currentSegmentId || this.state.currentSegmentId,
      previousSegmentId: restored.previousSegmentId || this.state.previousSegmentId,
      loading: Boolean(restored.loading),
      buffering: Boolean(restored.buffering),
      interrupted: true,
      error: restored.error || null,
      reason: 'recovered',
      segmentTimings: isObject(restored.segmentTimings) ? restored.segmentTimings : this.state.segmentTimings,
      checkpoints: isObject(restored.checkpoints) ? restored.checkpoints : this.state.checkpoints,
      diagnostics: {
        ...(isObject(restored.diagnostics) ? restored.diagnostics : this.state.diagnostics),
        recoveries: toFiniteNumber(restored?.diagnostics?.recoveries, this.state.diagnostics.recoveries) + 1,
        interruptions: toFiniteNumber(restored?.diagnostics?.interruptions, this.state.diagnostics.interruptions) + 1
      }
    };

    this.state.diagnostics.recoveries += 1;
    this.state.diagnostics.interruptions += 1;

    this.scheduler?.seekByTime?.(this.state.timelineTimeMs);
    this.recalculateSegmentTimings(this.state.timelineTimeMs);

    this.emit('speech-playback-recovered', {
      persistenceKey: this.persistenceKey,
      interrupted: true
    });

    this.synchronize('recover-session', {
      interrupted: true
    });

    return true;
  }

  snapshot() {
    return deepClone({
      schemaVersion: 'v1',
      playbackState: this.state.playbackState,
      knownPlaybackState: this.state.knownPlaybackState,
      timelineTimeMs: this.state.timelineTimeMs,
      narrationTimeMs: this.state.narrationTimeMs,
      speed: this.state.speed,
      muted: this.state.muted,
      volume: this.state.volume,
      currentSegmentId: this.state.currentSegmentId,
      previousSegmentId: this.state.previousSegmentId,
      loading: this.state.loading,
      buffering: this.state.buffering,
      interrupted: this.state.interrupted,
      error: this.state.error,
      reason: this.state.reason,
      segmentTimings: this.state.segmentTimings,
      checkpoints: this.state.checkpoints,
      diagnostics: this.state.diagnostics,
      totalSegments: this.segments.length,
      completedSegments: this.completedSegmentIds.size,
      availablePlaybackStates: [...SPEECH_PLAYBACK_STATES]
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

    this.emit('speech-playback-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });
  }

  static supportedChannels() {
    return [
      'speech-playback-state-changed',
      'speech-playback-event',
      'speech-playback-persisted',
      'speech-playback-recovered',
      'speech-playback-destroyed'
    ];
  }
}

export function createSpeechPlaybackRuntimeController(runtime = {}, options = {}) {
  return new SpeechPlaybackRuntimeController(runtime, options);
}
