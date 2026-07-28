import { processVisualizationTemplate } from './VisualizationTemplateVersionManager.js';
import { createVisualizationTemplateInstance } from './VisualizationTemplateInstance.js';

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableInstanceId(templateId = 'template', sceneId = 'scene') {
  return `template-instance-${templateId}-${sceneId}-${Math.random().toString(16).slice(2, 8)}`;
}

function resolveVariables(template, context) {
  const output = {};
  const variables = Array.isArray(template.variables) ? template.variables : [];
  variables.forEach((variable) => {
    const contextValue = context?.metadata?.[variable.name] ?? context?.[variable.name];
    output[variable.id] = contextValue !== undefined ? contextValue : variable.defaultValue;
  });
  return output;
}

function bindCapabilities(template, context) {
  const required = Array.isArray(template.requiredCapabilities) ? template.requiredCapabilities : [];
  const optional = Array.isArray(template.optionalCapabilities) ? template.optionalCapabilities : [];
  const selected = Array.isArray(context.selectedCapabilities) ? context.selectedCapabilities : [];
  const selectedIds = new Set(selected.map((item) => item.id));

  return [...required, ...optional].map((reference) => ({
    referenceId: reference.referenceId,
    capabilityId: reference.capabilityId,
    required: reference.required === true,
    resolved: selectedIds.has(reference.capabilityId),
    role: reference.role,
    metadata: reference.metadata || {}
  }));
}

function enforcePerformance(instance, profile = 'balanced') {
  const output = deepClone(instance);
  const budgetScale = profile === 'low' ? 0.6 : profile === 'high' ? 1.2 : 1;

  const maxSlots = Math.max(1, Math.floor(Number(output.performance?.objectBudget || output.resolvedSlots.length) * budgetScale));
  if (output.resolvedSlots.length > maxSlots) {
    output.resolvedSlots = output.resolvedSlots.slice(0, maxSlots);
    output.diagnostics.performanceTrimmed = true;
  }

  return output;
}

export function instantiateVisualizationTemplate(template, context = {}, options = {}) {
  const started = Date.now();
  const processed = processVisualizationTemplate(template, {
    allowFallback: options.forceFallbackOnInvalid !== false
  });

  const sourceTemplate = deepClone(processed.template);
  const sceneId = context.sceneId || 'scene';
  const instanceId = stableInstanceId(sourceTemplate.templateId, sceneId);
  const resolvedVariables = resolveVariables(sourceTemplate, context);
  const capabilityBindings = bindCapabilities(sourceTemplate, context);

  const instance = createVisualizationTemplateInstance({
    instanceId,
    templateId: sourceTemplate.templateId,
    templateVersion: sourceTemplate.version,
    sourceTemplate,
    resolvedVariables,
    resolvedSlots: deepClone(sourceTemplate.slots || []),
    resolvedRegions: deepClone(sourceTemplate.regions || []),
    resolvedRelationships: deepClone(sourceTemplate.relationships || []),
    capabilityBindings,
    sceneBindings: {
      sceneId,
      lessonId: context.lessonId || null,
      classification: context.classification || {},
      layoutIntent: sourceTemplate.layout?.strategy || 'adaptive',
      regionBindings: (sourceTemplate.regions || []).map((region) => ({ regionId: region.id, purpose: region.purpose })),
      slotBindings: (sourceTemplate.slots || []).map((slot) => ({ slotId: slot.id, purpose: slot.purpose, regionId: slot.regionId }))
    },
    constraints: deepClone(sourceTemplate.constraints || []),
    accessibility: deepClone(sourceTemplate.accessibility || {}),
    performance: deepClone(sourceTemplate.performance || {}),
    metadata: {
      source: sourceTemplate.source,
      status: sourceTemplate.status,
      semanticPurpose: sourceTemplate.semanticPurpose,
      fallbackUsed: processed.status === 'fallback'
    },
    diagnostics: {
      processingStatus: processed.status,
      warnings: processed.warnings,
      errors: processed.errors,
      processDiagnostics: processed.diagnostics,
      instantiationDuration: Date.now() - started
    }
  });

  const constrained = enforcePerformance(instance, context.performanceProfile || sourceTemplate.performance?.minimumProfile || 'balanced');

  return {
    status: processed.status,
    sourceTemplate,
    instance: constrained,
    diagnostics: constrained.diagnostics
  };
}
