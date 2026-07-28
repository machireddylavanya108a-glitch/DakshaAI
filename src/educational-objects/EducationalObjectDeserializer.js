import { createAdaptiveFallbackEducationalObject } from './EducationalObjectSchema.js';
import { processEducationalObject } from './EducationalObjectVersionManager.js';

function parseJson(text) {
  try {
    return JSON.parse(String(text || '{}'));
  } catch {
    return null;
  }
}

export function deserializeEducationalObject(payload) {
  const raw = typeof payload === 'string' ? parseJson(payload) : payload;

  if (!raw || typeof raw !== 'object') {
    return {
      status: 'fallback',
      valid: true,
      object: createAdaptiveFallbackEducationalObject(),
      warnings: ['Unable to deserialize educational object payload. Adaptive fallback object returned.'],
      errors: []
    };
  }

  const processed = processEducationalObject(raw, { allowFallback: true });
  return {
    status: processed.status,
    valid: processed.valid,
    object: processed.object,
    warnings: processed.warnings,
    errors: processed.errors,
    diagnostics: processed.diagnostics
  };
}

export function importEducationalObject(payload) {
  return deserializeEducationalObject(payload);
}

export function deserializeEducationalObjectInstance(payload) {
  const raw = typeof payload === 'string' ? parseJson(payload) : payload;
  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      instance: null,
      errors: ['Invalid educational object instance payload.']
    };
  }

  return {
    valid: true,
    instance: raw,
    errors: []
  };
}
