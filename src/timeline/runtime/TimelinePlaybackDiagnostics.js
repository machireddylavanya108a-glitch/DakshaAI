import { DEFAULT_RUNTIME_CONFIG } from './TimelineRuntimeConfig.js';

export class TimelinePlaybackDiagnostics {
  constructor(options = {}) {
    this.fpsTarget = Number(options.fpsTarget || DEFAULT_RUNTIME_CONFIG.fpsTarget);
    this.schedulerLatencyMs = 0;
    this.queueDepth = 0;
    this.playbackState = 'Idle';
    this.timelineDriftMs = 0;
    this.repairCount = 0;
    this.warnings = [];
    this.errors = [];
    this.samples = [];
  }

  sample(snapshot = {}) {
    this.schedulerLatencyMs = Number(snapshot.schedulerLatencyMs || this.schedulerLatencyMs || 0);
    this.queueDepth = Number(snapshot.queueDepth || this.queueDepth || 0);
    this.playbackState = String(snapshot.playbackState || this.playbackState || 'Idle');
    this.timelineDriftMs = Number(snapshot.timelineDriftMs || this.timelineDriftMs || 0);
    this.repairCount = Number(snapshot.repairCount || this.repairCount || 0);

    const sample = {
      at: Date.now(),
      schedulerLatencyMs: this.schedulerLatencyMs,
      queueDepth: this.queueDepth,
      playbackState: this.playbackState,
      timelineDriftMs: this.timelineDriftMs,
      repairCount: this.repairCount
    };

    this.samples.push(sample);
    if (this.samples.length > 500) {
      this.samples.shift();
    }

    return sample;
  }

  addWarning(message) {
    this.warnings.push(String(message || 'warning'));
  }

  addError(message) {
    this.errors.push(String(message || 'error'));
  }

  toJSON() {
    return {
      schedulerLatencyMs: this.schedulerLatencyMs,
      queueDepth: this.queueDepth,
      fpsTarget: this.fpsTarget,
      playbackState: this.playbackState,
      timelineDriftMs: this.timelineDriftMs,
      repairCount: this.repairCount,
      warnings: [...this.warnings],
      errors: [...this.errors],
      samples: [...this.samples]
    };
  }
}
