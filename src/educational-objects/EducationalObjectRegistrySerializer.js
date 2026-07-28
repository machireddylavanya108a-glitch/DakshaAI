import { createEducationalObjectRegistry } from './EducationalObjectRegistry.js';
import { createEducationalObjectPool } from './EducationalObjectPool.js';

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function sanitize(value, depth = 0) {
  if (depth > 10) return '[max-depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1)).filter((item) => item !== undefined);

  const output = Object.create(null);
  Object.entries(value).forEach(([key, nested]) => {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') return;
    if (/password|secret|token|credential|apiKey|authorization/i.test(key)) return;
    const next = sanitize(nested, depth + 1);
    if (next !== undefined) output[key] = next;
  });
  return output;
}

export function serializeEducationalObjectRegistryState(registryOrState = {}, options = {}) {
  const source = toObject(registryOrState);
  const snapshot = typeof source.exportSnapshot === 'function'
    ? source.exportSnapshot()
    : source;

  const payload = {
    version: Number(snapshot.version || 1),
    createdAt: snapshot.createdAt || new Date().toISOString(),
    config: sanitize(snapshot.config || {}),
    entries: sanitize(snapshot.entries || []),
    diagnostics: sanitize(snapshot.diagnostics || {}),
    metadata: sanitize(options.metadata || {})
  };

  return JSON.stringify(payload);
}

export function deserializeEducationalObjectRegistryState(serialized = '', options = {}) {
  const fallback = {
    version: 1,
    createdAt: new Date().toISOString(),
    config: {},
    entries: [],
    diagnostics: {},
    metadata: {}
  };

  try {
    const parsed = JSON.parse(String(serialized || '{}'));
    const source = toObject(parsed);
    return {
      version: Number(source.version || 1),
      createdAt: source.createdAt || fallback.createdAt,
      config: sanitize(source.config || {}),
      entries: Array.isArray(source.entries) ? sanitize(source.entries) : [],
      diagnostics: sanitize(source.diagnostics || {}),
      metadata: sanitize(source.metadata || {})
    };
  } catch {
    return fallback;
  }
}

export function restoreEducationalObjectRegistryFromSerialized(serialized = '', options = {}) {
  const state = deserializeEducationalObjectRegistryState(serialized, options);
  const registry = options.registry || createEducationalObjectRegistry(state.config || {});
  registry.importSnapshot(state);
  return {
    registry,
    state
  };
}

export function serializeEducationalObjectPoolState(pool = {}, options = {}) {
  const source = toObject(pool);
  const payload = {
    version: 1,
    createdAt: new Date().toISOString(),
    policy: sanitize(typeof source.getPolicy === 'function' ? source.getPolicy() : source.policy || {}),
    entries: sanitize(typeof source.exportEntries === 'function' ? source.exportEntries() : source.entries || []),
    diagnostics: sanitize(typeof source.getDiagnostics === 'function' ? source.getDiagnostics() : source.diagnostics || {}),
    metadata: sanitize(options.metadata || {})
  };
  return JSON.stringify(payload);
}

export function restoreEducationalObjectPoolFromSerialized(serialized = '', options = {}) {
  let parsed;
  try {
    parsed = JSON.parse(String(serialized || '{}'));
  } catch {
    parsed = {};
  }

  const source = toObject(parsed);
  const pool = options.pool || createEducationalObjectPool({
    policy: source.policy || {}
  });
  pool.importEntries(Array.isArray(source.entries) ? source.entries : []);

  return {
    pool,
    state: {
      version: Number(source.version || 1),
      createdAt: source.createdAt || new Date().toISOString(),
      policy: sanitize(source.policy || {}),
      entries: sanitize(source.entries || []),
      diagnostics: sanitize(source.diagnostics || {}),
      metadata: sanitize(source.metadata || {})
    }
  };
}
