const ORDERED_STATES = ['Created', 'Initialized', 'Ready', 'Active', 'Paused', 'Completed', 'Destroyed'];

function canTransition(fromState, toState) {
  if (fromState === toState) return true;
  if (toState === 'Destroyed') return true;
  if (fromState === 'Destroyed') return false;
  if (fromState === 'Active' && toState === 'Paused') return true;
  if (fromState === 'Paused' && toState === 'Active') return true;

  const fromIndex = ORDERED_STATES.indexOf(fromState);
  const toIndex = ORDERED_STATES.indexOf(toState);
  if (fromIndex < 0 || toIndex < 0) return true;
  return toIndex >= fromIndex;
}

export class SceneStateManager {
  constructor(registry) {
    this.registry = registry;
  }

  transition(nodeId, nextState) {
    const node = this.registry.find(nodeId);
    if (!node) {
      return { status: 'warning', message: `Node not found: ${nodeId}` };
    }

    if (!canTransition(node.state, nextState)) {
      return { status: 'warning', message: `Invalid transition ${node.state} -> ${nextState}` };
    }

    node.state = nextState;
    this.registry.update(nodeId, node);
    return { status: 'ok', message: `Transitioned ${nodeId} to ${nextState}` };
  }

  initializeAll() {
    this.registry.nodes.forEach((node, nodeId) => {
      this.transition(nodeId, 'Initialized');
      this.transition(nodeId, 'Ready');
    });
  }

  setActiveAll() {
    this.registry.nodes.forEach((node, nodeId) => this.transition(nodeId, 'Active'));
  }

  pauseAll() {
    this.registry.nodes.forEach((node, nodeId) => this.transition(nodeId, 'Paused'));
  }

  resumeAll() {
    this.registry.nodes.forEach((node, nodeId) => this.transition(nodeId, 'Active'));
  }

  resetAll() {
    this.registry.nodes.forEach((node, nodeId) => {
      node.state = 'Created';
      this.registry.update(nodeId, node);
    });
  }

  destroyAll() {
    this.registry.nodes.forEach((node, nodeId) => this.transition(nodeId, 'Destroyed'));
  }
}
