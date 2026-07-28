import { validateEducationalObjectStateConfiguration } from './EducationalObjectStateValidator.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

export function createEducationalObjectStateMachine(objectInstance = {}, options = {}) {
  const objectId = String(objectInstance?.objectId || objectInstance?.id || 'object');
  const stateRequirements = objectInstance?.runtimeMetadata?.stateRequirements || objectInstance?.resolvedState?.stateRequirements || objectInstance?.resolvedState || {
    initialState: 'ready',
    currentState: 'ready',
    availableStates: [{ stateId: 'state-1', name: 'ready', terminal: false, metadata: {} }],
    history: [],
    transitions: [],
    resetState: 'ready',
    completed: false,
    disabled: false,
    metadata: {}
  };

  const transitions = toArray(objectInstance?.runtimeMetadata?.stateTransitions || stateRequirements.transitions || []);
  const validation = validateEducationalObjectStateConfiguration(stateRequirements, transitions, options);

  const availableStates = toArray(stateRequirements.availableStates).map((state) => ({ ...state }));
  const stateNames = new Set(availableStates.map((state) => String(state?.name || '').trim()).filter(Boolean));
  const maxHistory = Math.max(1, Number(options.maximumStateHistory || objectInstance?.runtimeMetadata?.behaviorPerformance?.maximumStateHistory || 50));

  const listeners = new Set();
  let destroyed = false;
  let paused = false;
  let completed = stateRequirements.completed === true;
  let disabled = stateRequirements.disabled === true;

  let currentState = String(stateRequirements.currentState || stateRequirements.initialState || 'ready').trim() || 'ready';
  if (!stateNames.has(currentState) && stateNames.size) {
    currentState = availableStates[0].name;
  }

  let history = toArray(stateRequirements.history).slice(-maxHistory).map((entry) => ({ ...entry }));
  const transitionIndex = new Map();
  toArray(transitions).forEach((transition) => {
    const from = String(transition?.from || '').trim();
    const to = String(transition?.to || '').trim();
    if (!from || !to) return;
    const key = `${from}::${to}`;
    if (!transitionIndex.has(key)) transitionIndex.set(key, []);
    transitionIndex.get(key).push(transition);
  });

  function notify(event, payload = {}) {
    const packet = {
      objectId,
      event,
      timestamp: nowIso(),
      payload
    };
    listeners.forEach((listener) => {
      try {
        listener(packet);
      } catch {
        // Listener isolation for runtime safety.
      }
    });
  }

  function pushHistory(entry) {
    history.push({ ...entry, timestamp: nowIso() });
    if (history.length > maxHistory) {
      history = history.slice(history.length - maxHistory);
    }
  }

  function isTerminal(stateName) {
    const state = availableStates.find((item) => item.name === stateName);
    return state?.terminal === true;
  }

  function canTransition(targetState, context = {}) {
    if (destroyed || disabled || paused) return false;
    if (!String(targetState || '').trim()) return false;
    if (!stateNames.has(String(targetState).trim())) return false;
    if (isTerminal(currentState) && String(targetState).trim() !== currentState) return false;

    const key = `${currentState}::${String(targetState).trim()}`;
    const candidates = transitionIndex.get(key) || [];
    if (!candidates.length) return currentState === String(targetState).trim();

    const allowed = candidates.some((transition) => transition.allowed !== false);
    if (!allowed) return false;

    if (context?.forceTransition === true) return true;
    return true;
  }

  function transition(targetState, context = {}) {
    const nextState = String(targetState || '').trim();
    if (!canTransition(nextState, context)) {
      const result = {
        ok: false,
        reason: 'invalid-transition',
        from: currentState,
        to: nextState
      };
      notify('transition-denied', result);
      return result;
    }

    const previousState = currentState;
    currentState = nextState;

    pushHistory({
      from: previousState,
      to: nextState,
      transitionType: 'state-transition',
      metadata: context?.metadata || {}
    });

    const result = {
      ok: true,
      from: previousState,
      to: nextState,
      reversible: Boolean((transitionIndex.get(`${previousState}::${nextState}`) || []).some((item) => item.reversible === true))
    };

    notify('transition', result);
    return result;
  }

  function initialize() {
    if (destroyed) return { ok: false, reason: 'destroyed' };
    notify('initialized', { state: currentState, validation });
    return {
      ok: validation.valid,
      state: currentState,
      validation
    };
  }

  function getState() {
    return currentState;
  }

  function getStateHistory() {
    return clone(history);
  }

  function reset() {
    if (destroyed) return { ok: false, reason: 'destroyed' };
    const resetState = String(stateRequirements.resetState || stateRequirements.initialState || 'ready');
    const previous = currentState;
    currentState = stateNames.has(resetState) ? resetState : currentState;
    completed = false;
    disabled = false;
    paused = false;
    pushHistory({ from: previous, to: currentState, transitionType: 'reset' });
    notify('reset', { from: previous, to: currentState });
    return { ok: true, from: previous, to: currentState };
  }

  function pause() {
    if (destroyed) return { ok: false, reason: 'destroyed' };
    paused = true;
    notify('paused', { state: currentState });
    return { ok: true };
  }

  function resume() {
    if (destroyed) return { ok: false, reason: 'destroyed' };
    paused = false;
    notify('resumed', { state: currentState });
    return { ok: true };
  }

  function complete() {
    if (destroyed) return { ok: false, reason: 'destroyed' };
    completed = true;
    notify('completed', { state: currentState });
    return { ok: true };
  }

  function disable() {
    if (destroyed) return { ok: false, reason: 'destroyed' };
    disabled = true;
    notify('disabled', { state: currentState });
    return { ok: true };
  }

  function enable() {
    if (destroyed) return { ok: false, reason: 'destroyed' };
    disabled = false;
    notify('enabled', { state: currentState });
    return { ok: true };
  }

  function destroy() {
    destroyed = true;
    listeners.clear();
    notify('destroyed', { state: currentState });
    return { ok: true };
  }

  function subscribe(listener) {
    if (destroyed || typeof listener !== 'function') return false;
    listeners.add(listener);
    return true;
  }

  function unsubscribe(listener) {
    return listeners.delete(listener);
  }

  return {
    initialize,
    getState,
    getStateHistory,
    canTransition,
    transition,
    reset,
    pause,
    resume,
    complete,
    disable,
    enable,
    destroy,
    subscribe,
    unsubscribe,
    getMetadata() {
      return {
        objectId,
        state: currentState,
        completed,
        disabled,
        paused,
        availableStates: availableStates.map((item) => item.name),
        validation: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings
        }
      };
    }
  };
}
