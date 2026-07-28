import { processVisualizationTemplate } from './VisualizationTemplateVersionManager.js';
import { createAdaptiveFallbackTemplate } from './VisualizationTemplateSchema.js';

function parseJson(payload) {
  try {
    return JSON.parse(String(payload || '{}'));
  } catch {
    return null;
  }
}

export function deserializeVisualizationTemplate(payload, options = {}) {
  const raw = typeof payload === 'string' ? parseJson(payload) : payload;
  if (!raw || typeof raw !== 'object') {
    const fallback = createAdaptiveFallbackTemplate();
    fallback.validation = {
      status: 'fallback',
      errors: ['Invalid template payload; fallback template returned.'],
      warnings: [],
      repairable: true
    };
    return {
      status: 'fallback',
      template: fallback,
      warnings: [],
      errors: ['Invalid template payload.'],
      diagnostics: { fallbackUsed: true }
    };
  }

  return processVisualizationTemplate(raw, {
    allowFallback: options.allowFallback !== false
  });
}

export function importVisualizationTemplate(payload, options = {}) {
  return deserializeVisualizationTemplate(payload, options);
}

export function deserializeTemplateInstance(payload) {
  const raw = typeof payload === 'string' ? parseJson(payload) : payload;
  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      errors: ['Invalid template instance payload.'],
      instance: null
    };
  }

  return {
    valid: true,
    errors: [],
    instance: raw
  };
}
