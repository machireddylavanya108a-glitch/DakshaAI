import { processEducationalObject } from './EducationalObjectVersionManager.js';
import { stableSortByKey } from './EducationalObjectGenerationConfig.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function stripUnsafeKeys(value, seen = new WeakSet(), depth = 0) {
  if (depth > 20) return '[depth-limit]';
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (typeof value === 'string') {
    return String(value)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '')
      .trim();
  }
  if (typeof value !== 'object') return value;
  if (seen.has(value)) return '[circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.slice(0, 1000).map((item) => stripUnsafeKeys(item, seen, depth + 1)).filter((item) => item !== undefined);
  }

  const output = Object.create(null);
  Object.entries(value).forEach(([key, nested]) => {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') return;
    const cleaned = stripUnsafeKeys(nested, seen, depth + 1);
    if (cleaned !== undefined) output[key] = cleaned;
  });
  return output;
}

export function salvageEducationalObjects(objects = [], context = {}, options = {}) {
  const warnings = [];
  const errors = [];

  const sanitized = stableSortByKey(toArray(objects).map((item) => stripUnsafeKeys(item)).filter(Boolean), 'objectId');
  const processed = sanitized.map((objectValue) => processEducationalObject(objectValue, {
    allowFallback: options.fallbackEnabled !== false,
    knownObjectIds: sanitized.map((item) => String(item?.objectId || item?.id || ''))
  }));

  const finalObjects = processed.map((item) => item.object);
  processed.forEach((item) => {
    warnings.push(...(item.warnings || []));
    errors.push(...(item.errors || []));
  });

  return {
    salvaged: true,
    objects: stableSortByKey(finalObjects, 'objectId'),
    warnings,
    errors
  };
}
