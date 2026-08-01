import { DEFAULT_RUNTIME_CONFIG, TIMELINE_PLAYBACK_STATES } from './TimelineRuntimeConfig.js';
import { TimelineStateError } from './TimelineRuntimeErrors.js';

export class TimelinePlaybackState {
  constructor(initialState = DEFAULT_RUNTIME_CONFIG.startState) {
    this.knownStates = new Set(TIMELINE_PLAYBACK_STATES);
    this.current = this.normalizeState(initialState);
    this.previous = null;
    this.history = [this.current];
  }

  normalizeState(state) {
    const normalized = String(state || '').trim();
    return normalized || 'Unknown';
  }

  isKnown(state = this.current) {
    return this.knownStates.has(this.normalizeState(state));
  }

  getState() {
    return this.current;
  }

  transition(nextState, metadata = {}) {
    const normalized = this.normalizeState(nextState);
    if (!normalized) {
      throw new TimelineStateError('Invalid playback state transition target.');
    }

    this.previous = this.current;
    this.current = normalized;
    this.history.push(normalized);

    return {
      previous: this.previous,
      current: this.current,
      known: this.isKnown(this.current),
      metadata
    };
  }

  toJSON() {
    return {
      current: this.current,
      previous: this.previous,
      history: [...this.history]
    };
  }

  static fromJSON(payload = {}) {
    const state = new TimelinePlaybackState(payload.current || 'Idle');
    state.previous = payload.previous || null;
    state.history = Array.isArray(payload.history) && payload.history.length
      ? payload.history.map((item) => String(item || 'Unknown'))
      : [state.current];
    return state;
  }
}
