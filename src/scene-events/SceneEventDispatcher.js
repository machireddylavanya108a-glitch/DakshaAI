import { isObject } from './SceneEventConfig.js';

function createListenersMap() {
  return new Map();
}

function safeEmit(listenersMap, channel, payload) {
  const listeners = listenersMap.get(channel);
  if (!listeners || listeners.size === 0) return;

  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // Listener failures are isolated from runtime dispatch.
    }
  });
}

export class SceneEventDispatcher {
  constructor() {
    this.listeners = createListenersMap();
    this.history = [];
  }

  on(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    if (typeof listener !== 'function') {
      throw new Error('Scene event listener must be a function.');
    }

    if (!this.listeners.has(safeChannel)) {
      this.listeners.set(safeChannel, new Set());
    }

    this.listeners.get(safeChannel).add(listener);
    return () => this.off(safeChannel, listener);
  }

  off(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    const listeners = this.listeners.get(safeChannel);
    if (!listeners) return false;
    return listeners.delete(listener);
  }

  dispatch(event, context = {}) {
    const input = isObject(event) ? event : {};
    const payload = {
      event: input,
      context: isObject(context) ? context : {},
      timestamp: Date.now()
    };

    this.history.push(payload);
    if (this.history.length > 5000) {
      this.history.shift();
    }

    safeEmit(this.listeners, '*', payload);
    safeEmit(this.listeners, 'SceneEventDispatched', payload);
    safeEmit(this.listeners, `type:${String(input.type || 'unknown')}`, payload);

    return payload;
  }

  snapshot() {
    return {
      emittedCount: this.history.length,
      recent: this.history.slice(-100)
    };
  }
}
