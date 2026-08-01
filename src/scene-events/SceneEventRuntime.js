import { buildSceneEventSchedule } from './SceneEventScheduler.js';
import { SceneEventDispatcher } from './SceneEventDispatcher.js';
import { SceneEventTransitionManager } from './SceneEventTransition.js';
import { SceneEventDiagnostics } from './SceneEventDiagnostics.js';
import { normalizeSceneEvent } from './SceneEventValidator.js';
import { rankSceneEvents } from './SceneEventPriority.js';
import { normalizeEventTimeMs } from './SceneEventConfig.js';

function buildEventLookup(events = []) {
  const map = new Map();
  events.forEach((event) => {
    map.set(event.id, event);
  });
  return map;
}

export class SceneEventRuntime {
  constructor(runtimeScene = {}, options = {}) {
    this.runtimeScene = runtimeScene;
    this.options = options;
    this.dispatcher = new SceneEventDispatcher();
    this.transitions = new SceneEventTransitionManager();
    this.diagnostics = new SceneEventDiagnostics();
    this.paused = false;

    this.schedule = buildSceneEventSchedule(runtimeScene);
    this.events = [...(this.schedule.events || [])];
    this.eventsById = buildEventLookup(this.events);
    this.cursorIndex = 0;

    this.events.forEach((event) => {
      this.transitions.setState(event.id, 'scheduled', { source: event.source });
    });

    this.diagnostics.markScheduled(this.events.length);
    this.schedule.validation.warnings.forEach((warning) => this.diagnostics.addWarning(warning));
    this.schedule.validation.errors.forEach((error) => this.diagnostics.addError(error));

    this.unsubscribeTimelineListeners = [];
    this.attachTimelineScheduler(runtimeScene?.timelineScheduler || runtimeScene?.sceneScheduler || null);
  }

  attachTimelineScheduler(timelineScheduler) {
    if (!timelineScheduler || typeof timelineScheduler.on !== 'function') return;

    this.unsubscribeTimelineListeners.push(
      timelineScheduler.on('EventReady', ({ payload }) => {
        if (!payload?.eventId) return;
        this.dispatchById(payload.eventId, {
          trigger: 'timeline-event-ready',
          timeline: payload
        });
      })
    );

    this.unsubscribeTimelineListeners.push(
      timelineScheduler.on('MarkerReached', ({ payload }) => {
        if (!payload?.markerId) return;
        this.dispatchById(payload.markerId, {
          trigger: 'timeline-marker-reached',
          timeline: payload
        });
      })
    );

    this.unsubscribeTimelineListeners.push(
      timelineScheduler.on('ActionReady', ({ payload }) => {
        const actionId = String(payload?.actionId || '').trim();
        if (!actionId) return;

        const synthetic = normalizeSceneEvent({
          id: actionId,
          type: 'action',
          timeMs: normalizeEventTimeMs(payload?.timeMs, 0),
          payload: {
            timeline: payload
          },
          sourceRefId: actionId,
          source: 'timeline-action'
        }, this.events.length, 'timeline-action');

        this.dispatchEvent(synthetic, {
          trigger: 'timeline-action-ready',
          timeline: payload,
          synthetic: true
        });
      })
    );
  }

  destroy() {
    this.unsubscribeTimelineListeners.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.unsubscribeTimelineListeners = [];
  }

  on(channel, listener) {
    return this.dispatcher.on(channel, listener);
  }

  off(channel, listener) {
    return this.dispatcher.off(channel, listener);
  }

  pause(reason = 'manual') {
    this.paused = true;
    this.diagnostics.sample({ state: 'paused', reason });
    return this.snapshot();
  }

  resume(reason = 'manual') {
    this.paused = false;
    this.diagnostics.sample({ state: 'running', reason });
    return this.snapshot();
  }

  reset() {
    this.cursorIndex = 0;
    this.paused = false;
    this.transitions.reset();
    this.events.forEach((event) => this.transitions.setState(event.id, 'scheduled', { source: event.source }));
    return this.snapshot();
  }

  dispatchById(eventId, context = {}) {
    const key = String(eventId || '').trim();
    if (!key) return null;

    const event = this.eventsById.get(key);
    if (!event) {
      this.diagnostics.markSkipped(`No scheduled scene event found for id ${key}.`);
      return null;
    }

    return this.dispatchEvent(event, context);
  }

  dispatchEvent(eventInput, context = {}) {
    if (this.paused) {
      this.diagnostics.markSkipped('Scene event dispatch skipped because runtime is paused.');
      return null;
    }

    const event = normalizeSceneEvent(eventInput, 0, eventInput?.source || 'timeline-event');

    this.transitions.setState(event.id, 'dispatched', {
      trigger: context?.trigger || 'manual'
    });

    try {
      const dispatched = this.dispatcher.dispatch(event, {
        ...context,
        runtimeSceneId: this.runtimeScene?.sceneId || null
      });
      this.diagnostics.markDispatched(event);

      this.transitions.setState(event.id, 'completed', {
        trigger: context?.trigger || 'manual'
      });
      this.diagnostics.markCompleted();
      return dispatched;
    } catch (error) {
      this.transitions.setState(event.id, 'failed', {
        trigger: context?.trigger || 'manual',
        message: error?.message || 'unknown dispatch error'
      });
      this.diagnostics.markFailed(error);
      return null;
    }
  }

  tick(timeMs = 0) {
    if (this.paused) return this.snapshot();

    const currentTimeMs = normalizeEventTimeMs(timeMs, 0);
    const due = [];

    while (this.cursorIndex < this.events.length) {
      const current = this.events[this.cursorIndex];
      if (normalizeEventTimeMs(current?.timeMs, 0) > currentTimeMs) {
        break;
      }
      due.push(current);
      this.cursorIndex += 1;
    }

    rankSceneEvents(due).forEach((event) => {
      this.dispatchEvent(event, {
        trigger: 'scheduler-tick',
        timeMs: currentTimeMs
      });
    });

    this.diagnostics.sample({
      timeMs: currentTimeMs,
      pendingCount: Math.max(0, this.events.length - this.cursorIndex),
      dispatchedCount: this.diagnostics.dispatchedCount
    });

    return this.snapshot();
  }

  snapshot() {
    return {
      paused: this.paused,
      eventCount: this.events.length,
      pendingCount: Math.max(0, this.events.length - this.cursorIndex),
      scheduleSummary: this.schedule.summary,
      diagnostics: this.diagnostics.toJSON(),
      transitions: this.transitions.toJSON(),
      dispatch: this.dispatcher.snapshot()
    };
  }
}

export function createSceneEventRuntime(runtimeScene = {}, options = {}) {
  return new SceneEventRuntime(runtimeScene, options);
}
