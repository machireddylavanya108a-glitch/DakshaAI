import { resolveEducationalObjectTransitions } from './EducationalObjectTransitionResolver.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function validateEducationalObjectStateConfiguration(stateRequirements = {}, transitions = [], options = {}) {
  const errors = [];
  const warnings = [];

  if (!stateRequirements || typeof stateRequirements !== 'object') {
    return {
      valid: false,
      errors: ['State requirements must be an object.'],
      warnings,
      transitionResolution: null
    };
  }

  const states = toArray(stateRequirements.availableStates);
  if (!states.length) errors.push('At least one available state is required.');

  const names = new Set();
  states.forEach((state, index) => {
    const name = String(state?.name || '').trim();
    if (!name) {
      errors.push(`State at index ${index} is missing name.`);
      return;
    }
    if (names.has(name)) errors.push(`Duplicate state name detected: ${name}`);
    names.add(name);
  });

  const initialState = String(stateRequirements.initialState || '').trim();
  if (!initialState) warnings.push('initialState is missing and runtime will default to ready.');
  if (initialState && !names.has(initialState)) errors.push(`initialState ${initialState} is unavailable.`);

  const currentState = String(stateRequirements.currentState || initialState || '').trim();
  if (currentState && !names.has(currentState)) warnings.push(`currentState ${currentState} is unavailable and may be repaired.`);

  const transitionResolution = resolveEducationalObjectTransitions(stateRequirements, transitions, options);
  errors.push(...transitionResolution.errors);
  warnings.push(...transitionResolution.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    transitionResolution
  };
}
