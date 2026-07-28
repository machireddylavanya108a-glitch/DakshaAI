import { validateVisualizationCapability } from './VisualizationCapabilityValidator.js';
import { toVisualizationCapabilityError } from './VisualizationCapabilityError.js';
import { normalizeVisualizationCapabilityConfig } from './VisualizationCapabilityConfig.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

export class VisualizationCapabilityRegistry {
  constructor(options = {}) {
    this.config = normalizeVisualizationCapabilityConfig(options);
    this.capabilities = new Map();
    this.subscriptions = new Map();
    this.subscriptionCounter = 0;
  }

  registerCapability(input, options = {}) {
    const validation = validateVisualizationCapability(input, this.config);
    const capability = validation.normalizedValue;

    if (!validation.valid && options.allowInvalid !== true) {
      throw toVisualizationCapabilityError(new Error('Capability validation failed.'), {
        code: 'CAPABILITY_VALIDATION_FAILED',
        stage: 'register',
        recoverable: false,
        safeMessage: 'Capability registration failed validation.',
        details: validation
      });
    }

    const existing = this.capabilities.get(capability.id);
    const diagnostics = {
      duplicate: Boolean(existing),
      versionConflict: false,
      warnings: [...validation.warnings]
    };

    if (existing && existing.version !== capability.version) {
      diagnostics.versionConflict = true;
      diagnostics.warnings.push(`Capability ${capability.id} version changed from ${existing.version} to ${capability.version}.`);
    }

    this.capabilities.set(capability.id, clone(capability));
    this.emit('register', { capability: clone(capability), diagnostics });
    return {
      capability: clone(capability),
      diagnostics,
      validation
    };
  }

  unregisterCapability(id) {
    const key = String(id || '').trim();
    if (!key) return false;
    const existing = this.capabilities.get(key);
    const removed = this.capabilities.delete(key);
    if (removed) this.emit('unregister', { capability: clone(existing) });
    return removed;
  }

  getCapability(id) {
    const item = this.capabilities.get(String(id || '').trim());
    return item ? clone(item) : null;
  }

  hasCapability(id) {
    return this.capabilities.has(String(id || '').trim());
  }

  findCapabilities(predicate) {
    if (typeof predicate !== 'function') return this.listCapabilities();
    return this.listCapabilities().filter((capability) => {
      try {
        return Boolean(predicate(capability));
      } catch {
        return false;
      }
    });
  }

  findBySemanticPurpose(semanticPurpose) {
    const token = normalizeToken(semanticPurpose);
    return this.findCapabilities((capability) => normalizeToken(capability.semanticPurpose) === token);
  }

  findByLearningAction(action) {
    const token = normalizeToken(action);
    return this.findCapabilities((capability) =>
      Array.isArray(capability.supportedLearningActions)
      && capability.supportedLearningActions.some((item) => normalizeToken(item) === token)
    );
  }

  updateCapability(id, patch = {}) {
    const current = this.capabilities.get(String(id || '').trim());
    if (!current) return null;
    const merged = { ...current, ...(patch && typeof patch === 'object' ? patch : {}) };
    return this.registerCapability(merged, { allowInvalid: false });
  }

  listCapabilities() {
    return [...this.capabilities.values()].map((entry) => clone(entry));
  }

  clearRuntimeCapabilities() {
    this.capabilities.clear();
    this.emit('clear', { size: 0 });
  }

  subscribe(callback) {
    if (typeof callback !== 'function') return null;
    const id = `subscription-${++this.subscriptionCounter}`;
    this.subscriptions.set(id, callback);
    return id;
  }

  unsubscribe(subscriptionId) {
    return this.subscriptions.delete(String(subscriptionId || '').trim());
  }

  emit(event, payload = {}) {
    for (const [id, callback] of this.subscriptions.entries()) {
      try {
        callback({ id, event, payload });
      } catch {
        // Swallow subscriber exceptions so capability operations remain stable.
      }
    }
  }

  serialize() {
    return {
      capabilities: this.listCapabilities(),
      size: this.capabilities.size
    };
  }
}

export function createVisualizationCapabilityRegistry(options = {}) {
  return new VisualizationCapabilityRegistry(options);
}
