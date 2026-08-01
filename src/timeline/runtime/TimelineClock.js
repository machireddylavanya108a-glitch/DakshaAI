import { normalizeTimeMs, toFiniteNumber } from './TimelineRuntimeConfig.js';

export class TimelineClock {
  constructor(options = {}) {
    this.timeMs = normalizeTimeMs(options.startTimeMs, 0);
    this.speed = Math.max(0.01, toFiniteNumber(options.speed, 1));
    this.running = false;
    this.tickCount = 0;
    this.lastDeltaMs = 0;
    this.lastTickAt = 0;
  }

  play(startTimeMs = this.timeMs) {
    this.timeMs = normalizeTimeMs(startTimeMs, this.timeMs);
    this.running = true;
    return this.snapshot();
  }

  pause() {
    this.running = false;
    return this.snapshot();
  }

  resume() {
    this.running = true;
    return this.snapshot();
  }

  seek(timeMs) {
    this.timeMs = normalizeTimeMs(timeMs, this.timeMs);
    return this.snapshot();
  }

  restart() {
    this.timeMs = 0;
    this.tickCount = 0;
    this.lastDeltaMs = 0;
    this.lastTickAt = 0;
    this.running = true;
    return this.snapshot();
  }

  stop() {
    this.running = false;
    return this.snapshot();
  }

  reset() {
    this.timeMs = 0;
    this.running = false;
    this.tickCount = 0;
    this.lastDeltaMs = 0;
    this.lastTickAt = 0;
    return this.snapshot();
  }

  jump(deltaMs = 0) {
    this.timeMs = normalizeTimeMs(this.timeMs + toFiniteNumber(deltaMs, 0), this.timeMs);
    return this.snapshot();
  }

  tick(deltaMs = 0, now = Date.now()) {
    const safeDelta = Math.max(0, toFiniteNumber(deltaMs, 0));
    this.lastDeltaMs = safeDelta;
    this.lastTickAt = toFiniteNumber(now, Date.now());

    if (!this.running) {
      return this.snapshot();
    }

    this.timeMs = normalizeTimeMs(this.timeMs + safeDelta * this.speed, this.timeMs);
    this.tickCount += 1;
    return this.snapshot();
  }

  setSpeed(speed) {
    this.speed = Math.max(0.01, toFiniteNumber(speed, 1));
    return this.snapshot();
  }

  snapshot() {
    return {
      timeMs: this.timeMs,
      speed: this.speed,
      running: this.running,
      tickCount: this.tickCount,
      lastDeltaMs: this.lastDeltaMs,
      lastTickAt: this.lastTickAt
    };
  }
}
