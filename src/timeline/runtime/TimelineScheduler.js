import { buildTimelineExecutionPlan } from './TimelineExecutionPlan.js';
import { TimelinePlaybackState } from './TimelinePlaybackState.js';
import { TimelineClock } from './TimelineClock.js';
import { TimelineQueue } from './TimelineQueue.js';
import { TimelineCursor } from './TimelineCursor.js';
import { TimelineCheckpointManager } from './TimelineCheckpointManager.js';
import { TimelinePauseManager } from './TimelinePauseManager.js';
import { TimelineResumeManager } from './TimelineResumeManager.js';
import { TimelineSeekManager } from './TimelineSeekManager.js';
import { TimelineSpeedController } from './TimelineSpeedController.js';
import { TimelineLoopController } from './TimelineLoopController.js';
import { TimelineBranchController } from './TimelineBranchController.js';
import { TimelinePlaybackDiagnostics } from './TimelinePlaybackDiagnostics.js';
import {
  DEFAULT_RUNTIME_CONFIG,
  TIMELINE_RUNTIME_EVENTS,
  asArray,
  isObject,
  normalizeTimeMs
} from './TimelineRuntimeConfig.js';
import {
  TimelineRuntimeError,
  TimelineSecurityError,
  toTimelineRuntimeError
} from './TimelineRuntimeErrors.js';

const POLLUTION_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const UNSAFE_SCRIPT_PATTERN = /<\s*script|\beval\s*\(|\bFunction\s*\(|\bimport\s*\(/i;
const UNSAFE_URL_PATTERN = /^(javascript:|vbscript:|data:text\/html)/i;

function parseStatePayload(payload) {
  if (!payload) return null;
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  return isObject(payload) ? payload : null;
}

function sanitizeRuntimePayload(value, path = 'root', seen = new WeakSet()) {
  if (value === null || value === undefined) return value;

  if (typeof value === 'function') {
    throw new TimelineSecurityError(`Function values are not allowed in runtime payload at ${path}.`);
  }

  if (typeof value === 'string') {
    const text = String(value || '').trim();
    if (UNSAFE_URL_PATTERN.test(text)) {
      throw new TimelineSecurityError(`Unsafe URL value detected at ${path}.`);
    }
    if (UNSAFE_SCRIPT_PATTERN.test(text)) {
      throw new TimelineSecurityError(`Unsafe script-like string detected at ${path}.`);
    }
    return text;
  }

  if (typeof value !== 'object') return value;
  if (seen.has(value)) return '[circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeRuntimePayload(item, `${path}[${index}]`, seen));
  }

  const output = {};
  Object.entries(value).forEach(([key, nested]) => {
    if (POLLUTION_KEYS.has(key)) {
      throw new TimelineSecurityError(`Prototype pollution key detected at ${path}.${key}.`);
    }
    output[key] = sanitizeRuntimePayload(nested, `${path}.${key}`, seen);
  });

  return output;
}

function createMapSet() {
  return new Map();
}

function safeEmit(listenersMap, eventName, payload) {
  const listeners = listenersMap.get(eventName);
  if (!listeners || listeners.size === 0) return;

  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // Listener errors are isolated from scheduler execution.
    }
  });
}

function buildRuntimeEventPayload(name, payload = {}, state = {}) {
  return {
    name,
    timestamp: Date.now(),
    payload,
    state
  };
}

export class TimelineScheduler {
  constructor(timeline = {}, options = {}) {
    this.config = {
      ...DEFAULT_RUNTIME_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.timeline = sanitizeRuntimePayload(timeline);
    this.executionPlan = buildTimelineExecutionPlan(this.timeline);
    this.playbackState = new TimelinePlaybackState(this.config.startState);
    this.clock = new TimelineClock({
      startTimeMs: 0,
      speed: this.config.initialSpeed
    });
    this.queue = TimelineQueue.fromTimeline(this.timeline, {
      maxDepth: this.config.maxQueueDepth
    });
    this.cursor = new TimelineCursor(this.timeline);
    this.checkpoints = new TimelineCheckpointManager({
      autoIntervalMs: this.config.autoCheckpointIntervalMs
    });
    this.pauseManager = new TimelinePauseManager();
    this.resumeManager = new TimelineResumeManager();
    this.seekManager = new TimelineSeekManager();
    this.speedController = new TimelineSpeedController(this.config.initialSpeed);
    this.loopController = new TimelineLoopController();
    this.branchController = new TimelineBranchController();
    this.diagnostics = new TimelinePlaybackDiagnostics({
      fpsTarget: this.config.fpsTarget
    });

    this.listeners = createMapSet();
    this.runtimeEvents = [];
    this.completedRefs = new Set();
    this.blockedRefs = new Set();
    this.activeClipId = null;
    this.persistenceAdapter = options.persistenceAdapter || null;
    this.persistenceKey = String(this.config.persistenceKey || DEFAULT_RUNTIME_CONFIG.persistenceKey);

    this.playbackState.transition('Loading');
    this.prepare();
  }

  prepare() {
    this.playbackState.transition('Preparing');
    this.cursor.update(this.clock.timeMs);
    this.playbackState.transition('Ready');
    return this.snapshot();
  }

  on(eventName, listener) {
    const safeName = String(eventName || '').trim() || 'UnknownRuntimeEvent';
    if (typeof listener !== 'function') {
      throw new TimelineRuntimeError('TimelineScheduler listener must be a function.', {
        code: 'TIMELINE_INVALID_LISTENER'
      });
    }

    if (!this.listeners.has(safeName)) {
      this.listeners.set(safeName, new Set());
    }

    this.listeners.get(safeName).add(listener);
    return () => this.off(safeName, listener);
  }

  off(eventName, listener) {
    const safeName = String(eventName || '').trim() || 'UnknownRuntimeEvent';
    const listeners = this.listeners.get(safeName);
    if (!listeners) return false;
    return listeners.delete(listener);
  }

  emitRuntimeEvent(name, payload = {}) {
    const safeName = String(name || '').trim() || 'UnknownRuntimeEvent';
    const eventPayload = buildRuntimeEventPayload(safeName, payload, this.snapshot());
    this.runtimeEvents.push(eventPayload);
    if (this.runtimeEvents.length > 5000) {
      this.runtimeEvents.shift();
    }

    safeEmit(this.listeners, safeName, eventPayload);
    safeEmit(this.listeners, '*', eventPayload);
    return eventPayload;
  }

  setSpeed(speed) {
    const nextSpeed = this.speedController.setSpeed(speed);
    this.clock.setSpeed(nextSpeed);
    return nextSpeed;
  }

  play() {
    this.playbackState.transition('Playing');
    this.clock.play(this.clock.timeMs);
    this.emitRuntimeEvent('TimelineStarted', {
      timeMs: this.clock.timeMs,
      speed: this.speedController.getSpeed()
    });
    return this.snapshot();
  }

  pause(reason = 'manual') {
    this.pauseManager.pause({ scheduler: this, reason });
    return this.snapshot();
  }

  resume(reason = 'manual') {
    this.resumeManager.resume({ scheduler: this, reason });
    return this.snapshot();
  }

  stop(reason = 'manual') {
    this.clock.stop();
    this.playbackState.transition('Cancelled', { reason });
    this.emitRuntimeEvent('TimelineStopped', {
      reason,
      timeMs: this.clock.timeMs
    });
    return this.snapshot();
  }

  restart() {
    this.completedRefs.clear();
    this.blockedRefs.clear();
    this.activeClipId = null;
    this.clock.restart();
    this.playbackState.transition('Playing');
    this.emitRuntimeEvent('TimelineStarted', {
      timeMs: this.clock.timeMs,
      restarted: true
    });
    return this.snapshot();
  }

  reset() {
    this.clock.reset();
    this.playbackState.transition('Idle');
    this.cursor.update(0);
    this.completedRefs.clear();
    this.blockedRefs.clear();
    this.activeClipId = null;
    return this.snapshot();
  }

  cancel(reason = 'cancelled') {
    this.clock.stop();
    this.playbackState.transition('Cancelled', { reason });
    return this.snapshot();
  }

  seekByTime(timeMs) {
    return this.seekManager.seekByTime({ scheduler: this }, timeMs);
  }

  seekByMarker(markerId) {
    return this.seekManager.seekByMarker({ scheduler: this }, markerId);
  }

  seekByClip(clipId) {
    return this.seekManager.seekByClip({ scheduler: this }, clipId);
  }

  seekByEvent(eventId) {
    return this.seekManager.seekByEvent({ scheduler: this }, eventId);
  }

  seekByChapter(chapterId) {
    return this.seekManager.seekByChapter({ scheduler: this }, chapterId);
  }

  seekByPercentage(percentage) {
    return this.seekManager.seekByPercentage({ scheduler: this }, percentage);
  }

  setLoop(mode, options = {}) {
    return this.loopController.setMode(mode, options);
  }

  setBranch(branchId, reason = 'manual') {
    return this.branchController.setBranch(branchId, reason);
  }

  resolveItemDependencies(item) {
    const targetId = String(item.refId || '').trim();
    if (!targetId) return { blocked: false, optional: false, reason: null };

    const dependencies = this.executionPlan.dependencyMap.get(targetId) || [];
    let blocked = false;
    let optional = false;
    let reason = null;

    dependencies.forEach((dependency) => {
      const type = String(dependency?.type || '').toLowerCase();
      const from = String(dependency?.from || '').trim();

      if (type === 'optional') {
        optional = true;
        return;
      }

      if (type === 'parallel') {
        return;
      }

      if ((type === 'before' || type === 'after' || type === 'requires') && from && !this.completedRefs.has(from)) {
        blocked = true;
        reason = `${type}:${from}`;
      }

      if (type === 'blocks' && from && this.completedRefs.has(from)) {
        blocked = true;
        reason = `${type}:${from}`;
      }
    });

    return { blocked, optional, reason };
  }

  handleClipTransitions(previousCursor, nextCursor) {
    const prevClipId = previousCursor?.currentClip?.id || null;
    const nextClipId = nextCursor?.currentClip?.id || null;

    if (prevClipId && prevClipId !== nextClipId) {
      this.emitRuntimeEvent('ClipCompleted', {
        clipId: prevClipId,
        timeMs: nextCursor.timeMs
      });
      this.completedRefs.add(prevClipId);
    }

    if (nextClipId && prevClipId !== nextClipId) {
      this.emitRuntimeEvent('ClipStarted', {
        clipId: nextClipId,
        timeMs: nextCursor.timeMs
      });
      this.activeClipId = nextClipId;
    }
  }

  processReadyItems(readyItems = []) {
    const branchItems = this.branchController.filterItemsByBranch(readyItems);

    branchItems.forEach((item) => {
      const dependency = this.resolveItemDependencies(item);
      if (dependency.blocked && !dependency.optional) {
        this.blockedRefs.add(item.refId);
        this.diagnostics.addWarning(`Blocked ${item.kind}:${item.refId} (${dependency.reason || 'dependency'}).`);
        return;
      }

      if (item.kind === 'marker') {
        this.emitRuntimeEvent('MarkerReached', {
          markerId: item.refId,
          timeMs: item.timeMs
        });
      } else if (item.kind === 'event') {
        this.emitRuntimeEvent('EventReady', {
          eventId: item.refId,
          timeMs: item.timeMs
        });
      } else if (item.kind === 'action') {
        this.emitRuntimeEvent('ActionReady', {
          actionId: item.refId,
          timeMs: item.timeMs
        });
      }

      this.completedRefs.add(item.refId);
    });
  }

  tick(deltaMs = 0) {
    try {
      const tickStart = Date.now();
      const previousCursor = this.cursor.snapshot();
      this.clock.tick(deltaMs, tickStart);
      const nextCursor = this.cursor.update(this.clock.timeMs);
      this.handleClipTransitions(previousCursor, nextCursor);

      const readyItems = this.queue.drainUntil(this.clock.timeMs);
      this.processReadyItems(readyItems);

      const checkpoint = this.checkpoints.createAutomaticCheckpoint(this.clock.timeMs, this.createPersistenceSnapshot());
      if (checkpoint) {
        this.emitRuntimeEvent('CheckpointReached', {
          checkpointId: checkpoint.id,
          type: checkpoint.type,
          timeMs: checkpoint.timeMs
        });
      }

      if (this.loopController.shouldLoop(nextCursor)) {
        const loopTime = this.loopController.resolveLoopTime(nextCursor);
        if (loopTime !== null) {
          this.seekByTime(loopTime);
        }
      }

      if (nextCursor.remainingTimeMs <= 0 && this.queue.depth() === 0 && this.playbackState.getState() === 'Playing') {
        this.clock.stop();
        this.playbackState.transition('Completed');
        this.emitRuntimeEvent('TimelineCompleted', {
          timeMs: this.clock.timeMs
        });
      }

      this.diagnostics.sample({
        schedulerLatencyMs: Date.now() - tickStart,
        queueDepth: this.queue.depth(),
        playbackState: this.playbackState.getState(),
        timelineDriftMs: Math.abs((Number(deltaMs) || 0) - (this.clock.lastDeltaMs || 0)),
        repairCount: this.timeline?.diagnostics?.repairCount || 0
      });

      return this.snapshot();
    } catch (error) {
      const runtimeError = toTimelineRuntimeError(error);
      this.playbackState.transition('Error');
      this.diagnostics.addError(runtimeError.message);
      this.emitRuntimeEvent('TimelineError', {
        code: runtimeError.code,
        message: runtimeError.message
      });
      throw runtimeError;
    }
  }

  createCheckpoint(type = 'manual', metadata = {}) {
    const checkpoint = this.checkpoints.createCheckpoint({
      id: `${type}-${this.clock.timeMs}`,
      type,
      timeMs: this.clock.timeMs,
      state: this.createPersistenceSnapshot(),
      metadata
    });

    this.emitRuntimeEvent('CheckpointReached', {
      checkpointId: checkpoint.id,
      type: checkpoint.type,
      timeMs: checkpoint.timeMs
    });

    return checkpoint;
  }

  resumeFromCheckpoint(checkpointId) {
    const checkpoint = this.checkpoints.getById(checkpointId) || this.checkpoints.latest('resume') || this.checkpoints.latest();
    if (!checkpoint) {
      this.diagnostics.addWarning('Invalid checkpoint for resume.');
      return null;
    }

    this.applyPersistenceSnapshot(checkpoint.state);
    this.playbackState.transition('Paused');
    return checkpoint;
  }

  createPersistenceSnapshot() {
    const cursor = this.cursor.snapshot();
    return {
      currentTimeMs: this.clock.timeMs,
      currentClipId: cursor.currentClip?.id || null,
      progress: cursor.progress,
      speed: this.speedController.getSpeed(),
      activeMarkerId: cursor.currentMarker?.id || null,
      checkpointId: this.checkpoints.latest()?.id || null,
      resumePositionMs: this.clock.timeMs,
      playbackState: this.playbackState.getState(),
      loop: this.loopController.snapshot(),
      branch: this.branchController.snapshot()
    };
  }

  applyPersistenceSnapshot(snapshot) {
    const safeSnapshot = parseStatePayload(snapshot);
    if (!safeSnapshot) return false;

    const safeTime = normalizeTimeMs(safeSnapshot.currentTimeMs, 0);
    this.clock.seek(safeTime);

    if (safeSnapshot.speed !== undefined) {
      this.setSpeed(safeSnapshot.speed);
    }

    if (isObject(safeSnapshot.loop)) {
      this.loopController.setMode(safeSnapshot.loop.mode, {
        startMs: safeSnapshot.loop?.range?.startMs,
        endMs: safeSnapshot.loop?.range?.endMs,
        clipId: safeSnapshot.loop?.targetClipId
      });
    }

    if (isObject(safeSnapshot.branch)) {
      this.branchController.activeBranchId = safeSnapshot.branch.activeBranchId || null;
      this.branchController.branchHistory = asArray(safeSnapshot.branch.branchHistory);
    }

    this.cursor.update(this.clock.timeMs);

    const state = String(safeSnapshot.playbackState || 'Paused');
    this.playbackState.transition(state);
    return true;
  }

  persist(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify(this.createPersistenceSnapshot());

    if (typeof adapter.setItem === 'function') {
      adapter.setItem(this.persistenceKey, payload);
      return true;
    }

    if (typeof adapter.save === 'function') {
      adapter.save(this.persistenceKey, payload);
      return true;
    }

    return false;
  }

  recover(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    let payload = null;

    if (typeof adapter.getItem === 'function') {
      payload = adapter.getItem(this.persistenceKey);
    } else if (typeof adapter.load === 'function') {
      payload = adapter.load(this.persistenceKey);
    }

    if (!payload) return false;

    const parsed = parseStatePayload(payload);
    if (!parsed) {
      this.diagnostics.addWarning('Failed to parse persisted timeline state.');
      return false;
    }

    const checkpointId = parsed.checkpointId;
    if (checkpointId && !this.checkpoints.getById(checkpointId)) {
      this.diagnostics.addWarning('Persisted checkpoint was not found. Recovery continued without checkpoint binding.');
    }

    return this.applyPersistenceSnapshot(parsed);
  }

  snapshot() {
    return {
      playbackState: this.playbackState.getState(),
      clock: this.clock.snapshot(),
      cursor: this.cursor.snapshot(),
      queueDepth: this.queue.depth(),
      speed: this.speedController.getSpeed(),
      loop: this.loopController.snapshot(),
      branch: this.branchController.snapshot(),
      diagnostics: this.diagnostics.toJSON(),
      blockedRefs: [...this.blockedRefs],
      completedRefs: [...this.completedRefs]
    };
  }

  static supportedRuntimeEvents() {
    return [...TIMELINE_RUNTIME_EVENTS];
  }
}
