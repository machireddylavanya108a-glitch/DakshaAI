import { processVisualizationTemplate } from './VisualizationTemplateVersionManager.js';
import { instantiateVisualizationTemplate } from './VisualizationTemplateInstantiation.js';

export function deepCloneVisualizationTemplate(template = {}) {
  try {
    return JSON.parse(JSON.stringify(template));
  } catch {
    return processVisualizationTemplate({}).template;
  }
}

export function serializeVisualizationTemplate(template, pretty = false) {
  const processed = processVisualizationTemplate(template, { allowFallback: true });
  return JSON.stringify(processed.template, null, pretty ? 2 : 0);
}

export function serializeTemplateInstance(instance, pretty = false) {
  const safe = deepCloneVisualizationTemplate(instance || {});
  return JSON.stringify(safe, null, pretty ? 2 : 0);
}

export function exportVisualizationTemplate(template, pretty = true) {
  return {
    content: serializeVisualizationTemplate(template, pretty),
    mimeType: 'application/json',
    extension: '.visualization-template.json'
  };
}

export function createSerializedTemplateInstance(template, context = {}, pretty = true) {
  const instantiated = instantiateVisualizationTemplate(template, context, { forceFallbackOnInvalid: true });
  return serializeTemplateInstance(instantiated.instance, pretty);
}
