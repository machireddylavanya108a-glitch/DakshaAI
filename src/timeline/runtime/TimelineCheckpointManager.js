import { asArray, isObject, normalizeTimeMs } from './TimelineRuntimeConfig.js';

export class TimelineCheckpointManager {
  constructor(options = {}) {
    this.autoIntervalMs = Number(options.autoIntervalMs || 10000);
    this.checkpoints = [];
    this.lastAutoCheckpointAt = 0;
  }

  createCheckpoint(data = {}) {
    const source = isObject(data) ? data : {};
    const checkpoint = {
      id: String(source.id || `checkpoint-${this.checkpoints.length + 1}`),
      type: String(source.type || 'manual'),
      timeMs: normalizeTimeMs(source.timeMs, 0),
      state: isObject(source.state) ? source.state : {},
      metadata: isObject(source.metadata) ? source.metadata : {},
      createdAt: Number(source.createdAt || Date.now())
    };

    this.checkpoints.push(checkpoint);
    this.checkpoints.sort((a, b) => a.timeMs - b.timeMs);
    return checkpoint;
  }

  createAutomaticCheckpoint(timeMs, state = {}) {
    const safeTime = normalizeTimeMs(timeMs, 0);
    if (safeTime - this.lastAutoCheckpointAt < this.autoIntervalMs) {
      return null;
    }

    const checkpoint = this.createCheckpoint({
      id: `auto-${safeTime}`,
      type: 'automatic',
      timeMs: safeTime,
      state
    });

    this.lastAutoCheckpointAt = safeTime;
    return checkpoint;
  }

  latest(type = null) {
    if (!this.checkpoints.length) return null;
    if (!type) return this.checkpoints[this.checkpoints.length - 1];

    const safeType = String(type);
    for (let index = this.checkpoints.length - 1; index >= 0; index -= 1) {
      if (this.checkpoints[index].type === safeType) {
        return this.checkpoints[index];
      }
    }

    return null;
  }

  getById(id) {
    const safeId = String(id || '');
    return this.checkpoints.find((checkpoint) => checkpoint.id === safeId) || null;
  }

  restore(payload = []) {
    this.checkpoints = asArray(payload)
      .filter((item) => isObject(item))
      .map((item) => ({
        id: String(item.id || `checkpoint-${Math.random().toString(16).slice(2)}`),
        type: String(item.type || 'manual'),
        timeMs: normalizeTimeMs(item.timeMs, 0),
        state: isObject(item.state) ? item.state : {},
        metadata: isObject(item.metadata) ? item.metadata : {},
        createdAt: Number(item.createdAt || Date.now())
      }))
      .sort((a, b) => a.timeMs - b.timeMs);
  }

  toJSON() {
    return this.checkpoints.map((checkpoint) => ({ ...checkpoint }));
  }
}
