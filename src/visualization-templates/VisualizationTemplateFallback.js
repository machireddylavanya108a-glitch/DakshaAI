import { createAdaptiveFallbackTemplate } from './VisualizationTemplateSchema.js';
import { processVisualizationTemplate } from './VisualizationTemplateVersionManager.js';
import { instantiateVisualizationTemplate } from './VisualizationTemplateInstantiation.js';
import { bindTemplateSlots, bindTemplateRegions, resolveTemplateVariables } from './VisualizationTemplateBinding.js';
import { salvageVisualizationTemplate } from './VisualizationTemplateSalvager.js';

function stableHash(input = '') {
  const text = String(input || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function buildMinimalSafeTemplate(context = {}, reason = 'minimal-safe-fallback') {
  const fallback = createAdaptiveFallbackTemplate({
    templateId: `adaptive-minimal-${stableHash(JSON.stringify({ reason, sceneId: context.sceneId || 'scene' }))}`,
    metadata: {
      fallback: true,
      fallbackReason: reason,
      minimalSafe: true
    },
    regions: [{
      id: 'region-primary',
      name: 'Primary Region',
      purpose: 'main-structure',
      bounds: { x: 0, y: 0, width: 1, height: 1, depth: 1 },
      coordinateSpace: 'normalized',
      anchor: 'center',
      alignment: 'balanced',
      flow: 'adaptive',
      capacity: 4,
      priority: 1,
      responsiveRules: [],
      accessibilityOrder: 1,
      metadata: {},
      extensions: {}
    }],
    slots: [{
      id: 'slot-primary',
      name: 'Primary Slot',
      purpose: 'primary-content',
      accepts: ['content-node'],
      requires: [],
      multiplicity: 'one',
      capacity: 1,
      priority: 1,
      regionId: 'region-primary',
      parentSlotId: null,
      placementHints: {},
      behaviorHints: {},
      accessibilityHints: {},
      constraints: [],
      fallback: 'adaptive-content-placeholder',
      metadata: { required: true },
      extensions: {}
    }],
    relationships: []
  });
  return processVisualizationTemplate(fallback, { allowFallback: true }).template;
}

export function applyTemplateGenerationFallback(level = 4, template = null, context = {}, options = {}) {
  const fallbackLevel = Math.max(1, Math.min(5, Number(level || 4)));

  if (fallbackLevel === 1 && template) {
    const processed = processVisualizationTemplate(template, { allowFallback: true });
    return {
      status: 'fallback',
      fallbackLevel,
      fallbackUsed: true,
      template: processed.template,
      processedTemplate: processed,
      warnings: processed.warnings || [],
      errors: processed.errors || []
    };
  }

  if (fallbackLevel === 2 && template) {
    const salvaged = salvageVisualizationTemplate(template, context, options);
    return {
      status: 'fallback',
      fallbackLevel,
      fallbackUsed: true,
      template: salvaged.template,
      processedTemplate: salvaged.processedTemplate,
      quality: salvaged.quality,
      warnings: salvaged.warnings || [],
      errors: salvaged.errors || []
    };
  }

  if (fallbackLevel === 3) {
    const reconstructed = createAdaptiveFallbackTemplate({
      templateId: `adaptive-generated-${stableHash(JSON.stringify({ scene: context.sceneId || 'scene', lesson: context.lessonId || 'lesson' }))}`,
      semanticPurpose: context.visualizationRequirements?.preferredCapabilities?.[0] || 'adaptive-purpose',
      metadata: {
        fallback: true,
        fallbackReason: 'reconstructed-from-structure'
      }
    });

    const processed = processVisualizationTemplate(reconstructed, { allowFallback: true });
    return {
      status: 'fallback',
      fallbackLevel,
      fallbackUsed: true,
      template: processed.template,
      processedTemplate: processed,
      warnings: processed.warnings || [],
      errors: processed.errors || []
    };
  }

  if (fallbackLevel === 4) {
    const fallbackTemplate = createAdaptiveFallbackTemplate({
      metadata: {
        fallback: true,
        fallbackReason: 'adaptive-universal-template'
      }
    });
    const processed = processVisualizationTemplate(fallbackTemplate, { allowFallback: true });
    return {
      status: 'fallback',
      fallbackLevel,
      fallbackUsed: true,
      template: processed.template,
      processedTemplate: processed,
      warnings: processed.warnings || [],
      errors: processed.errors || []
    };
  }

  const minimal = buildMinimalSafeTemplate(context, 'minimal-safe-template-instance');
  const instantiation = instantiateVisualizationTemplate(minimal, context, { forceFallbackOnInvalid: true });
  const slotBindings = bindTemplateSlots(instantiation.instance, context, options);
  const regionBindings = bindTemplateRegions(instantiation.instance, slotBindings, context, options);
  const variableBinding = resolveTemplateVariables(instantiation.instance, context, options);

  return {
    status: 'fallback',
    fallbackLevel: 5,
    fallbackUsed: true,
    template: minimal,
    processedTemplate: processVisualizationTemplate(minimal, { allowFallback: true }),
    templateInstance: {
      ...instantiation.instance,
      resolvedVariables: variableBinding.resolved
    },
    bindings: {
      slots: slotBindings,
      regions: regionBindings,
      variables: variableBinding
    },
    warnings: ['minimal-safe-template-instance-generated'],
    errors: []
  };
}
