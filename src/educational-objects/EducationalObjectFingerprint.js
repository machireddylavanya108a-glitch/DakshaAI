import { stableHash } from './EducationalObjectGenerationConfig.js';

const DEFAULT_IGNORED_KEYS = new Set([
  'registeredAt', 'updatedAt', 'createdAt', 'acquiredAt', 'releasedAt', 'lastUsedAt', 'lastVerifiedAt',
  'listeners', 'listener', 'runtimeListeners', 'diagnosticsStack', 'stack',
  'requestDiagnostics', 'requestId', 'signal', 'abortController',
  'activeInstanceCount', 'availablePoolCount', 'averageReuseCount'
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isExecutableLikeString(value) {
  const text = String(value || '').toLowerCase();
  return text.includes('javascript:')
    || text.includes('data:text/html')
    || text.includes('<script')
    || text.includes('onerror=')
    || text.includes('onclick=')
    || text.includes('eval(')
    || text.includes('new function')
    || text.includes('function(')
    || text.includes('import(')
    || text.includes('shader');
}

function sanitizePrimitive(value, maxStringLength = 400) {
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') {
    const stripped = value
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '')
      .replace(/on[a-z]+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '')
      .trim();
    if (isExecutableLikeString(stripped)) return '[unsafe-string]';
    return stripped.slice(0, maxStringLength);
  }
  return value;
}

function normalizeForFingerprint(value, options = {}, depth = 0, seen = new WeakMap()) {
  const maxDepth = Math.max(2, Number(options.maxDepth || 8));
  const maxArray = Math.max(10, Number(options.maxArrayLength || 120));
  const ignoredKeys = options.ignoredKeys instanceof Set ? options.ignoredKeys : DEFAULT_IGNORED_KEYS;

  if (depth > maxDepth) return '[max-depth]';
  if (value === null || value === undefined) return value;

  if (typeof value !== 'object') return sanitizePrimitive(value, options.maxStringLength || 400);
  if (typeof value === 'function') return undefined;
  if (typeof value === 'symbol') return undefined;
  if (seen.has(value)) return '[circular]';

  if (Array.isArray(value)) {
    const output = [];
    seen.set(value, output);
    value.slice(0, maxArray).forEach((item) => {
      const next = normalizeForFingerprint(item, options, depth + 1, seen);
      if (next !== undefined) output.push(next);
    });
    return output;
  }

  const output = Object.create(null);
  seen.set(value, output);

  const keys = Object.keys(value)
    .filter((key) => !ignoredKeys.has(key))
    .filter((key) => key !== '__proto__' && key !== 'prototype' && key !== 'constructor')
    .filter((key) => !/^\$\$typeof$|^_owner$|^_store$/.test(key))
    .sort();

  keys.slice(0, maxArray).forEach((key) => {
    if (/lessonText|rawPrompt|promptText|fullText|rawNarration/i.test(key)) return;
    const next = normalizeForFingerprint(value[key], options, depth + 1, seen);
    if (next === undefined) return;
    if (typeof next === 'string' && !next.trim()) return;
    output[key] = next;
  });

  return output;
}

export function createEducationalObjectFingerprint(value = {}, options = {}) {
  const normalized = normalizeForFingerprint(value, options);
  const serialized = JSON.stringify(normalized);
  const hash = stableHash(serialized || '');
  return `eofp-${hash}`.slice(0, 96);
}

export function createEducationalObjectCompatibilityFingerprint(input = {}, options = {}) {
  const source = isObject(input) ? input : {};
  const payload = {
    objectId: source.objectId || source.id || null,
    version: source.version || source.objectVersion || null,
    kind: source.kind || source.runtimeMetadata?.kind || null,
    semanticRole: source.semanticRole || source.runtimeMetadata?.semanticRole || null,
    representation: source.representation || source.resolvedRepresentation || source.runtimeMetadata?.representation || {},
    templateBindings: source.templateBindings || source.runtimeMetadata?.templateBindings || [],
    behavior: {
      stateRequirements: source.stateRequirements || source.runtimeMetadata?.stateRequirements || {},
      stateTransitions: source.stateTransitions || source.runtimeMetadata?.stateTransitions || []
    },
    accessibility: source.accessibility || source.resolvedAccessibility || source.runtimeMetadata?.accessibility || {},
    performance: source.performance || source.resolvedPerformance || source.runtimeMetadata?.performance || {}
  };

  return createEducationalObjectFingerprint(payload, options);
}
