import { createAdaptiveFallbackTemplate } from './VisualizationTemplateSchema.js';
import { processVisualizationTemplate } from './VisualizationTemplateVersionManager.js';
import { evaluateVisualizationTemplateQuality } from './VisualizationTemplateQuality.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function salvageVisualizationTemplate(template = {}, context = {}, options = {}) {
  const fallback = createAdaptiveFallbackTemplate();
  const source = asObject(template);

  const preserved = {
    ...fallback,
    ...source,
    templateId: source.templateId || fallback.templateId,
    version: source.version || fallback.version,
    metadata: {
      ...(fallback.metadata || {}),
      ...(asObject(source.metadata)),
      salvaged: true
    }
  };

  preserved.requiredCapabilities = asArray(source.requiredCapabilities).length
    ? asArray(source.requiredCapabilities)
    : asArray(fallback.requiredCapabilities);

  preserved.slots = asArray(source.slots).filter((slot) => slot && typeof slot === 'object' && slot.id);
  if (!preserved.slots.length) preserved.slots = clone(fallback.slots);

  preserved.regions = asArray(source.regions).filter((region) => region && typeof region === 'object' && region.id);
  if (!preserved.regions.length) preserved.regions = clone(fallback.regions);

  const regionIds = new Set(preserved.regions.map((region) => region.id));
  preserved.slots = preserved.slots.map((slot, index) => ({
    ...slot,
    regionId: regionIds.has(slot.regionId) ? slot.regionId : preserved.regions[0]?.id,
    priority: Number(slot.priority || index + 1)
  }));

  const nodeIds = new Set([...preserved.slots.map((slot) => slot.id), ...preserved.regions.map((region) => region.id)]);
  preserved.relationships = asArray(source.relationships)
    .filter((relationship) => relationship && typeof relationship === 'object')
    .filter((relationship) => relationship.sourceId !== relationship.targetId)
    .filter((relationship) => nodeIds.has(relationship.sourceId) && nodeIds.has(relationship.targetId));

  preserved.accessibility = {
    ...(fallback.accessibility || {}),
    ...(asObject(source.accessibility))
  };

  preserved.performance = {
    ...(fallback.performance || {}),
    ...(asObject(source.performance))
  };

  const processed = processVisualizationTemplate(preserved, { allowFallback: true });
  const quality = evaluateVisualizationTemplateQuality(processed.template, context, options);

  return {
    status: quality.passed ? 'salvaged' : 'fallback',
    template: processed.template,
    processedTemplate: processed,
    quality,
    salvageApplied: true,
    warnings: [...(processed.warnings || []), ...(quality.warnings || [])],
    errors: processed.errors || []
  };
}
