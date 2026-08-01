import { asArray, isObject, normalizeTimeMs, toFiniteNumber } from './TimelineRuntimeConfig.js';

function safePriority(value) {
  return toFiniteNumber(value, 0);
}

function compareItems(a, b) {
  if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
  if (a.priority !== b.priority) return b.priority - a.priority;
  return a.sequence - b.sequence;
}

export class TimelineQueue {
  constructor(options = {}) {
    this.items = [];
    this.maxDepth = Number(options.maxDepth || 50000);
    this.sequence = 0;
  }

  enqueue(item = {}) {
    const source = isObject(item) ? item : {};
    const entry = {
      id: String(source.id || `queue-item-${this.sequence + 1}`),
      kind: String(source.kind || 'unknown'),
      refId: String(source.refId || source.id || ''),
      timeMs: normalizeTimeMs(source.timeMs, 0),
      priority: safePriority(source.priority),
      payload: isObject(source.payload) ? source.payload : {},
      blocked: source.blocked === true,
      dependencyMetadata: isObject(source.dependencyMetadata) ? source.dependencyMetadata : {},
      sequence: this.sequence + 1
    };

    this.sequence += 1;
    this.items.push(entry);
    this.items.sort(compareItems);

    if (this.items.length > this.maxDepth) {
      this.items.length = this.maxDepth;
    }

    return entry;
  }

  dequeue() {
    return this.items.shift() || null;
  }

  peek() {
    return this.items[0] || null;
  }

  depth() {
    return this.items.length;
  }

  clear() {
    this.items = [];
  }

  removeWhere(predicate) {
    if (typeof predicate !== 'function') return 0;
    const before = this.items.length;
    this.items = this.items.filter((item) => !predicate(item));
    return before - this.items.length;
  }

  drainUntil(timeMs) {
    const safeTime = normalizeTimeMs(timeMs, 0);
    const ready = [];

    while (this.items.length && this.items[0].timeMs <= safeTime) {
      ready.push(this.items.shift());
    }

    return ready;
  }

  toJSON() {
    return {
      items: this.items.map((item) => ({ ...item })),
      maxDepth: this.maxDepth,
      sequence: this.sequence
    };
  }

  static fromTimeline(timeline = {}, options = {}) {
    const queue = new TimelineQueue(options);

    asArray(timeline.clips).forEach((clip) => {
      queue.enqueue({
        id: `clip:${clip.id}`,
        kind: 'clip',
        refId: clip.id,
        timeMs: clip.start,
        priority: clip.priority || 0,
        payload: clip,
        dependencyMetadata: {}
      });
    });

    asArray(timeline.events).forEach((event) => {
      queue.enqueue({
        id: `event:${event.id}`,
        kind: 'event',
        refId: event.id,
        timeMs: event.time,
        priority: event.priority || 0,
        payload: event,
        dependencyMetadata: {}
      });
    });

    asArray(timeline.markers).forEach((marker) => {
      queue.enqueue({
        id: `marker:${marker.id}`,
        kind: 'marker',
        refId: marker.id,
        timeMs: marker.time,
        priority: marker.priority || 0,
        payload: marker,
        dependencyMetadata: {}
      });
    });

    asArray(timeline.actions).forEach((action, index) => {
      queue.enqueue({
        id: `action:${action.id || index + 1}`,
        kind: 'action',
        refId: action.id || `action-${index + 1}`,
        timeMs: normalizeTimeMs(action.timeMs ?? action.time ?? 0, 0),
        priority: action.priority || 0,
        payload: action,
        dependencyMetadata: {}
      });
    });

    return queue;
  }
}
