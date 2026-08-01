import { SUPPORTED_SPEEDS, toFiniteNumber } from './TimelineRuntimeConfig.js';

export class TimelineSpeedController {
  constructor(initialSpeed = 1) {
    this.supportedSpeeds = [...SUPPORTED_SPEEDS];
    this.speed = this.normalizeSpeed(initialSpeed);
  }

  normalizeSpeed(speed) {
    const value = toFiniteNumber(speed, 1);
    if (value <= 0) return 1;
    return value;
  }

  setSpeed(speed) {
    this.speed = this.normalizeSpeed(speed);
    return this.speed;
  }

  getSpeed() {
    return this.speed;
  }

  isPreset(speed = this.speed) {
    const value = this.normalizeSpeed(speed);
    return this.supportedSpeeds.includes(value);
  }
}
