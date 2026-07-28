import { processVisualizationTemplate } from './VisualizationTemplateVersionManager.js';
import { normalizeVisualizationTemplateConfig } from './VisualizationTemplateConfig.js';
import { toVisualizationTemplateError } from './VisualizationTemplateError.js';
import { matchesTemplateQuery, normalizeTemplateQuery } from './VisualizationTemplateQuery.js';

function now() {
  return Date.now();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

function createKey(templateId, version) {
  return `${String(templateId || '').trim()}::${String(version || '').trim()}`;
}

function parseVersionWeight(version = '') {
  const normalized = String(version || '').replace(/^v/i, '').trim();
  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) return numeric;
  return 0;
}

function coerceFinite(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function sanitizeCompatibility(template = {}) {
  return {
    semanticPurpose: String(template.semanticPurpose || ''),
    minimumProfile: String(template.performance?.minimumProfile || 'low'),
    maximumProfile: String(template.performance?.maximumProfile || 'high'),
    capabilityIds: [
      ...(Array.isArray(template.requiredCapabilities) ? template.requiredCapabilities : []).map((item) => String(item?.capabilityId || '').trim()),
      ...(Array.isArray(template.optionalCapabilities) ? template.optionalCapabilities : []).map((item) => String(item?.capabilityId || '').trim())
    ].filter(Boolean)
  };
}

function sanitizeUsage(existing = {}) {
  return {
    selectedCount: coerceFinite(existing.selectedCount, 0),
    fallbackCount: coerceFinite(existing.fallbackCount, 0),
    lastSelectedAt: existing.lastSelectedAt || null
  };
}

export class VisualizationTemplateRegistry {
  constructor(options = {}) {
    this.config = normalizeVisualizationTemplateConfig(options);
    this.entries = new Map();
    this.listeners = new Map();
    this.listenerCounter = 0;
    this.versionCounter = 0;
  }

  registerTemplate(template, options = {}) {
    const startedAt = now();
    try {
      const processed = processVisualizationTemplate(template, {
        allowFallback: options.allowFallback !== false
      });

      if (!processed.valid && options.allowInvalid !== true) {
        throw toVisualizationTemplateError(new Error('Template validation failed.'), {
          code: 'TEMPLATE_REGISTRATION_FAILED',
          stage: 'registry-register',
          recoverable: false,
          safeMessage: 'Template registration was rejected for safety.',
          details: {
            status: processed.status,
            errors: processed.errors,
            warnings: processed.warnings
          }
        });
      }

      const normalizedTemplate = clone(processed.template);
      const templateId = String(normalizedTemplate.templateId || '').trim();
      const version = String(normalizedTemplate.version || '').trim();
      const key = createKey(templateId, version);
      const current = this.entries.get(key);
      const timestamp = now();
      const metadata = options.metadata && typeof options.metadata === 'object' ? options.metadata : {};

      const entry = {
        key,
        templateId,
        version,
        template: normalizedTemplate,
        enabled: options.enabled !== false,
        deprecated: options.deprecated === true,
        source: String(options.source || normalizedTemplate.source || 'runtime'),
        priority: coerceFinite(options.priority, 0),
        trustLevel: Math.max(0, Math.min(1, coerceFinite(options.trustLevel, 0.5))),
        registeredAt: current?.registeredAt || timestamp,
        updatedAt: timestamp,
        compatibility: sanitizeCompatibility(normalizedTemplate),
        usage: sanitizeUsage(current?.usage),
        diagnostics: {
          registrationDuration: Math.max(0, now() - startedAt),
          status: processed.status,
          warnings: processed.warnings || [],
          errors: processed.errors || []
        },
        metadata: {
          ...metadata,
          runtimeOnly: options.runtimeOnly === true
        }
      };

      this.entries.set(key, entry);
      this.versionCounter += 1;
      this.emit('register', { key, templateId, version, duplicate: Boolean(current) });

      return {
        entry: clone(entry),
        duplicate: Boolean(current),
        processed
      };
    } catch (error) {
      throw toVisualizationTemplateError(error, {
        code: 'TEMPLATE_REGISTRATION_FAILED',
        stage: 'registry-register',
        recoverable: true,
        safeMessage: 'Template registration failed and was safely rejected.'
      });
    }
  }

  registerTemplates(templates = [], options = {}) {
    const output = [];
    const errors = [];

    (Array.isArray(templates) ? templates : []).forEach((template, index) => {
      try {
        output.push(this.registerTemplate(template, options));
      } catch (error) {
        errors.push({ index, error: toVisualizationTemplateError(error) });
      }
    });

    return {
      registered: output,
      errors
    };
  }

  unregisterTemplate(templateId, version) {
    if (!templateId) return false;

    if (version) {
      const key = createKey(templateId, version);
      const removed = this.entries.delete(key);
      if (removed) {
        this.versionCounter += 1;
        this.emit('unregister', { key, templateId, version });
      }
      return removed;
    }

    const keys = [...this.entries.keys()].filter((key) => key.startsWith(`${String(templateId).trim()}::`));
    keys.forEach((key) => this.entries.delete(key));
    if (keys.length) {
      this.versionCounter += 1;
      this.emit('unregister', { templateId, versionsRemoved: keys.length });
    }
    return Boolean(keys.length);
  }

  getTemplate(templateId, version = null, options = {}) {
    if (!templateId) return null;
    const candidates = this.listTemplates({ includeDisabled: true, includeDeprecated: true })
      .filter((entry) => entry.templateId === String(templateId).trim());

    if (!candidates.length) return null;

    if (version) {
      const exact = candidates.find((entry) => entry.version === String(version).trim());
      return exact ? clone(exact.template) : null;
    }

    const allowDeprecated = options.allowDeprecated === true;
    const filtered = candidates.filter((entry) => entry.enabled && (allowDeprecated || !entry.deprecated));
    const pool = filtered.length ? filtered : candidates;

    const selected = [...pool].sort((a, b) => {
      const byVersion = parseVersionWeight(b.version) - parseVersionWeight(a.version);
      if (byVersion !== 0) return byVersion;
      return b.updatedAt - a.updatedAt;
    })[0];

    return selected ? clone(selected.template) : null;
  }

  hasTemplate(templateId, version = null) {
    if (!templateId) return false;
    if (version) return this.entries.has(createKey(templateId, version));
    return [...this.entries.values()].some((entry) => entry.templateId === String(templateId).trim());
  }

  findTemplates(query = {}, options = {}) {
    try {
      const normalizedQuery = normalizeTemplateQuery(query);
      return this.listTemplates({
        includeDisabled: options.includeDisabled === true,
        includeDeprecated: options.includeDeprecated === true
      }).filter((entry) => matchesTemplateQuery(entry, normalizedQuery));
    } catch (error) {
      throw toVisualizationTemplateError(error, {
        code: 'TEMPLATE_QUERY_FAILED',
        stage: 'registry-query',
        recoverable: true,
        safeMessage: 'Template query failed and returned no entries.'
      });
    }
  }

  listTemplates(options = {}) {
    const includeDisabled = options.includeDisabled === true;
    const includeDeprecated = options.includeDeprecated === true;

    return [...this.entries.values()]
      .filter((entry) => includeDisabled || entry.enabled)
      .filter((entry) => includeDeprecated || !entry.deprecated)
      .map((entry) => clone(entry));
  }

  updateTemplate(templateId, updates = {}, options = {}) {
    const target = this.getTemplate(templateId, options.version, { allowDeprecated: true });
    if (!target) return null;
    const merged = {
      ...target,
      ...(updates && typeof updates === 'object' ? updates : {})
    };

    return this.registerTemplate(merged, {
      source: options.source,
      priority: options.priority,
      trustLevel: options.trustLevel,
      metadata: options.metadata,
      enabled: options.enabled,
      deprecated: options.deprecated,
      runtimeOnly: options.runtimeOnly
    });
  }

  enableTemplate(templateId, version = null) {
    return this.setTemplateEnabled(templateId, version, true);
  }

  disableTemplate(templateId, version = null) {
    return this.setTemplateEnabled(templateId, version, false);
  }

  setTemplateEnabled(templateId, version, enabled) {
    const targets = this.getMutableEntries(templateId, version);
    if (!targets.length) return false;
    targets.forEach((entry) => {
      entry.enabled = Boolean(enabled);
      entry.updatedAt = now();
    });
    this.versionCounter += 1;
    this.emit(enabled ? 'enable' : 'disable', { templateId, version });
    return true;
  }

  deprecateTemplate(templateId, metadata = {}, version = null) {
    const targets = this.getMutableEntries(templateId, version);
    if (!targets.length) return false;

    targets.forEach((entry) => {
      entry.deprecated = true;
      entry.metadata = {
        ...(entry.metadata || {}),
        deprecation: {
          ...(isFinite(metadata?.timestamp) ? { timestamp: metadata.timestamp } : { timestamp: now() }),
          reason: String(metadata?.reason || 'deprecated'),
          replacementTemplateId: metadata?.replacementTemplateId || null
        }
      };
      entry.updatedAt = now();
    });

    this.versionCounter += 1;
    this.emit('deprecate', { templateId, version });
    return true;
  }

  clearRuntimeTemplates() {
    const keys = [];
    for (const entry of this.entries.values()) {
      const source = normalizeToken(entry.source);
      if (entry.metadata?.runtimeOnly || source === 'runtime' || source === 'ai-generated') {
        keys.push(entry.key);
      }
    }

    keys.forEach((key) => this.entries.delete(key));
    if (keys.length) {
      this.versionCounter += 1;
      this.emit('clear-runtime', { removed: keys.length });
    }
    return keys.length;
  }

  subscribe(listener) {
    if (typeof listener !== 'function') return null;
    const id = `template-registry-subscription-${++this.listenerCounter}`;
    this.listeners.set(id, listener);
    return id;
  }

  unsubscribe(subscriptionId) {
    return this.listeners.delete(String(subscriptionId || '').trim());
  }

  emit(event, payload = {}) {
    for (const listener of this.listeners.values()) {
      try {
        listener({ event, payload });
      } catch {
        // Keep registry stable even if listeners fail.
      }
    }
  }

  serializeRegistry() {
    return {
      schema: 'visualization-template-registry-v1',
      versionCounter: this.versionCounter,
      entries: this.listTemplates({ includeDisabled: true, includeDeprecated: true }).map((entry) => {
        const { template, ...rest } = entry;
        return {
          ...rest,
          template: clone(template)
        };
      })
    };
  }

  restoreRegistry(serialized = {}) {
    const payload = serialized && typeof serialized === 'object' ? serialized : {};
    const entries = Array.isArray(payload.entries) ? payload.entries : [];

    this.entries.clear();
    const restoreErrors = [];

    entries.forEach((entry, index) => {
      try {
        const registered = this.registerTemplate(entry.template, {
          source: entry.source,
          priority: entry.priority,
          trustLevel: entry.trustLevel,
          enabled: entry.enabled,
          deprecated: entry.deprecated,
          metadata: entry.metadata,
          runtimeOnly: Boolean(entry?.metadata?.runtimeOnly)
        });

        const targetKey = createKey(entry.templateId || entry.template?.templateId, entry.version || entry.template?.version);
        const mutable = this.entries.get(targetKey);
        if (mutable && entry.usage && typeof entry.usage === 'object') {
          mutable.usage = sanitizeUsage(entry.usage);
        }

        if (!registered.entry) {
          throw new Error('template restore produced empty registry entry');
        }
      } catch (error) {
        restoreErrors.push({ index, error: toVisualizationTemplateError(error) });
      }
    });

    this.versionCounter = Math.max(this.versionCounter, coerceFinite(payload.versionCounter, this.versionCounter));
    this.emit('restore', { restoredCount: this.entries.size, restoreErrors: restoreErrors.length });

    return {
      restoredCount: this.entries.size,
      restoreErrors
    };
  }

  getMutableEntries(templateId, version = null) {
    const normalizedId = String(templateId || '').trim();
    if (!normalizedId) return [];

    return [...this.entries.values()].filter((entry) => {
      if (entry.templateId !== normalizedId) return false;
      if (version && entry.version !== String(version).trim()) return false;
      return true;
    });
  }

  getRegistryVersion() {
    return this.versionCounter;
  }

  get size() {
    return this.entries.size;
  }
}

export function createVisualizationTemplateRegistry(options = {}) {
  return new VisualizationTemplateRegistry(options);
}

export const defaultVisualizationTemplateRegistry = createVisualizationTemplateRegistry();
