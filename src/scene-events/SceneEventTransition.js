import { SCENE_EVENT_STATES } from './SceneEventConfig.js';

export class SceneEventTransitionManager {
  constructor() {
    this.stateByEventId = new Map();
    this.history = [];
  }

  setState(eventId, state, metadata = {}) {
    const id = String(eventId || '').trim();
    if (!id) return null;

    const nextState = String(state || 'queued').trim() || 'queued';
    const previous = this.stateByEventId.get(id) || null;

    this.stateByEventId.set(id, nextState);
    const transition = {
      eventId: id,
      previous,
      next: nextState,
      timestamp: Date.now(),
      knownState: SCENE_EVENT_STATES.includes(nextState),
      metadata
    };

    this.history.push(transition);
    if (this.history.length > 5000) {
      this.history.shift();
    }

    return transition;
  }

  getState(eventId) {
    const id = String(eventId || '').trim();
    return this.stateByEventId.get(id) || 'queued';
  }

  reset() {
    this.stateByEventId.clear();
    this.history = [];
  }

  toJSON() {
    return {
      states: Object.fromEntries(this.stateByEventId.entries()),
      history: [...this.history]
    };
  }
}
