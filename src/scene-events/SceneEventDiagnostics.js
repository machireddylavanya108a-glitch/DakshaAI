export class SceneEventDiagnostics {
  constructor() {
    this.scheduledCount = 0;
    this.dispatchedCount = 0;
    this.completedCount = 0;
    this.failedCount = 0;
    this.skippedCount = 0;
    this.unknownTypeCount = 0;
    this.warnings = [];
    this.errors = [];
    this.samples = [];
  }

  addWarning(message) {
    if (!message) return;
    this.warnings.push(String(message));
    if (this.warnings.length > 2000) this.warnings.shift();
  }

  addError(message) {
    if (!message) return;
    this.errors.push(String(message));
    if (this.errors.length > 2000) this.errors.shift();
  }

  markScheduled(count = 1) {
    this.scheduledCount += Math.max(0, Number(count || 0));
  }

  markDispatched(event) {
    this.dispatchedCount += 1;
    if (String(event?.type || 'unknown').trim().toLowerCase() === 'unknown') {
      this.unknownTypeCount += 1;
    }
  }

  markCompleted() {
    this.completedCount += 1;
  }

  markFailed(error) {
    this.failedCount += 1;
    if (error) this.addError(error?.message || String(error));
  }

  markSkipped(message) {
    this.skippedCount += 1;
    if (message) this.addWarning(message);
  }

  sample(snapshot = {}) {
    this.samples.push({
      timestamp: Date.now(),
      ...snapshot
    });
    if (this.samples.length > 2000) this.samples.shift();
  }

  toJSON() {
    return {
      scheduledCount: this.scheduledCount,
      dispatchedCount: this.dispatchedCount,
      completedCount: this.completedCount,
      failedCount: this.failedCount,
      skippedCount: this.skippedCount,
      unknownTypeCount: this.unknownTypeCount,
      warnings: [...this.warnings],
      errors: [...this.errors],
      samples: [...this.samples]
    };
  }
}
