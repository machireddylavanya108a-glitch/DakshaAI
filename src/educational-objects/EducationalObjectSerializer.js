import { processEducationalObject } from './EducationalObjectVersionManager.js';

export function deepCloneEducationalObject(object = {}) {
  try {
    return JSON.parse(JSON.stringify(object || {}));
  } catch {
    return processEducationalObject({}).object;
  }
}

export function serializeEducationalObject(object, pretty = false) {
  const processed = processEducationalObject(object, { allowFallback: true });
  return JSON.stringify(processed.object, null, pretty ? 2 : 0);
}

export function serializeEducationalObjectInstance(instance, pretty = false) {
  const safe = deepCloneEducationalObject(instance || {});
  return JSON.stringify(safe, null, pretty ? 2 : 0);
}

export function exportEducationalObject(object, pretty = true) {
  return {
    content: serializeEducationalObject(object, pretty),
    mimeType: 'application/json',
    extension: '.educational-object.json'
  };
}
