function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function resolveEducationalObjectTransitions(stateRequirements = {}, transitions = [], options = {}) {
  const availableStates = new Set(toArray(stateRequirements.availableStates).map((state) => String(state?.name || '').trim()).filter(Boolean));
  const maxTransitions = Math.max(1, Number(options.maxTransitions || 500));
  const errors = [];
  const warnings = [];

  const resolved = toArray(transitions)
    .slice(0, maxTransitions)
    .filter((transition) => transition && typeof transition === 'object')
    .map((transition) => ({ ...transition }));

  const seen = new Set();
  const outgoing = new Map();

  resolved.forEach((transition) => {
    const id = String(transition.transitionId || '').trim();
    const from = String(transition.from || '').trim();
    const to = String(transition.to || '').trim();
    const pair = `${from}::${to}`;

    if (!id) errors.push('Transition without transitionId detected.');
    if (!from || !to) errors.push(`Transition ${id || '[unknown]'} requires from/to states.`);
    if (id && seen.has(id)) errors.push(`Duplicate transitionId detected: ${id}`);
    if (id) seen.add(id);

    if (availableStates.size) {
      if (from && !availableStates.has(from)) errors.push(`Transition ${id || '[unknown]'} from state is unavailable: ${from}`);
      if (to && !availableStates.has(to)) errors.push(`Transition ${id || '[unknown]'} to state is unavailable: ${to}`);
    }

    if (!outgoing.has(from)) outgoing.set(from, []);
    outgoing.get(from).push({ to, transitionId: id, allowed: transition.allowed !== false, metadata: transition.metadata || {}, reversible: transition.reversible === true });

    if (seen.has(`pair::${pair}`)) warnings.push(`Duplicate transition pair detected: ${pair}`);
    seen.add(`pair::${pair}`);
  });

  const terminalStates = new Set(toArray(stateRequirements.availableStates).filter((state) => state?.terminal === true).map((state) => String(state?.name || '')));
  resolved.forEach((transition) => {
    if (terminalStates.has(String(transition.from || '')) && String(transition.from || '') !== String(transition.to || '')) {
      errors.push(`Transition ${transition.transitionId || '[unknown]'} exits terminal state ${transition.from}.`);
    }
  });

  const initialState = String(stateRequirements.initialState || 'ready');
  const reachable = new Set();
  const queue = [initialState];
  while (queue.length) {
    const state = queue.shift();
    if (reachable.has(state)) continue;
    reachable.add(state);
    (outgoing.get(state) || []).forEach((edge) => {
      if (!reachable.has(edge.to)) queue.push(edge.to);
    });
  }

  toArray(stateRequirements.availableStates).forEach((state) => {
    const name = String(state?.name || '');
    if (name && !reachable.has(name)) {
      warnings.push(`Unreachable state detected: ${name}`);
    }
  });

  const stack = new Set();
  const visited = new Set();
  let cycleDetected = false;
  function walk(node, depth = 0) {
    const maxDepth = Math.max(1, Number(options.maximumAutomaticBehaviorChain || 25));
    if (depth > maxDepth) {
      warnings.push(`Transition traversal exceeded depth ${maxDepth} at state ${node}.`);
      return;
    }
    if (stack.has(node)) {
      cycleDetected = true;
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    (outgoing.get(node) || []).forEach((edge) => walk(edge.to, depth + 1));
    stack.delete(node);
  }

  for (const state of outgoing.keys()) walk(state, 0);

  if (cycleDetected) {
    warnings.push('Transition cycle detected; runtime chain limit must guard against unbounded loops.');
  }

  return {
    transitions: resolved,
    adjacency: outgoing,
    reachableStates: [...reachable],
    cycleDetected,
    errors,
    warnings
  };
}
