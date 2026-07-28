import { createAdaptiveFallbackTemplate } from './VisualizationTemplateSchema.js';
import { instantiateVisualizationTemplate } from './VisualizationTemplateInstantiation.js';
import { selectVisualizationTemplate } from './VisualizationTemplateSelection.js';

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function summarizeSelection(selection = {}) {
  return {
    status: selection.status || 'failed',
    fallbackUsed: selection.fallbackUsed === true,
    selectedTemplateId: selection.selectedTemplate?.templateId || null,
    selectedTemplateVersion: selection.selectedTemplate?.version || null,
    selectedTemplateInstanceId: selection.selectedTemplateInstance?.instanceId || null,
    compositionId: selection.templateComposition?.compositionId || null,
    confidence: Number(selection.confidence || 0),
    diagnostics: {
      selectedScore: Number(selection.diagnostics?.selectedScore || 0),
      selectionConfidence: Number(selection.diagnostics?.selectionConfidence || 0),
      capabilityCoverage: Number(selection.diagnostics?.capabilityCoverage || 0),
      requirementCoverage: Number(selection.diagnostics?.requirementCoverage || 0),
      accessibilityCoverage: Number(selection.diagnostics?.accessibilityCoverage || 0),
      performanceCompatibility: Number(selection.diagnostics?.performanceCompatibility || 0),
      conflictCount: Number(selection.diagnostics?.conflictCount || 0),
      missingDependencyCount: Number(selection.diagnostics?.missingDependencyCount || 0),
      unboundRequiredSlotCount: Number(selection.diagnostics?.unboundRequiredSlotCount || 0),
      unboundOptionalSlotCount: Number(selection.diagnostics?.unboundOptionalSlotCount || 0)
    }
  };
}

export function createTemplateFromCapabilityContext(context = {}) {
  const capability = context?.selectedCapabilities?.[0] || null;
  const semanticPurpose = capability?.semanticPurpose || context?.visualizationRequirements?.preferredCapabilities?.[0] || 'adaptive-purpose';

  return createAdaptiveFallbackTemplate({
    name: `adaptive-template-${semanticPurpose}`,
    semanticPurpose,
    requiredCapabilities: Array.isArray(context?.selectedCapabilities)
      ? context.selectedCapabilities.map((item, index) => ({
          referenceId: `cap-ref-${index + 1}`,
          capabilityId: item.id,
          role: index === 0 ? 'primary' : 'supporting',
          required: index === 0,
          priority: index + 1,
          constraints: [],
          overrides: {},
          metadata: {}
        }))
      : [],
    metadata: {
      fallback: false,
      generatedFromCapabilities: true
    }
  });
}

export function ensureSceneVisualizationTemplateMetadata(scene = {}, options = {}) {
  const safeScene = safeObject(scene);
  const metadata = safeObject(safeScene.metadata);
  const existingTemplate = metadata.visualizationTemplate || metadata.sceneTemplate || metadata.layoutTemplate || metadata.template || metadata.selectedTemplate;
  const existingInstance = metadata.visualizationTemplateInstance || metadata.templateInstance || metadata.selectedTemplateInstance;

  if (existingTemplate && existingInstance) {
    return safeScene;
  }

  const visualizationContext = {
    sceneId: safeScene.sceneId,
    lessonId: metadata.lessonId || null,
    visualizationRequirements: metadata.visualizationCapabilities?.visualizationRequirements || {},
    selectedCapabilities: metadata.visualizationCapabilities?.selectedCapabilities || [],
    capabilityComposition: metadata.visualizationCapabilities?.capabilityComposition || {},
    concepts: safeScene.objects || [],
    relationships: safeScene.relationships || [],
    timelineRequirements: safeScene.timeline || [],
    accessibilityNeeds: metadata.visualizationCapabilities?.visualizationRequirements?.accessibilityNeeds || {},
    performanceProfile: options.performanceProfile || safeScene?.settings?.quality || 'balanced',
    metadata
  };

  const selection = selectVisualizationTemplate({
    ...visualizationContext,
    selectedTemplate: existingTemplate || null,
    selectedTemplateInstance: existingInstance || null
  }, {
    registry: options.visualizationTemplateRegistry,
    minimumScore: options.minimumTemplateScore ?? 0.2,
    maxResults: options.maxTemplateResults ?? 8
  });

  let instantiated = {
    sourceTemplate: selection.selectedTemplate,
    instance: selection.selectedTemplateInstance,
    diagnostics: selection.diagnostics
  };

  if (!instantiated.sourceTemplate || !instantiated.instance) {
    const definition = existingTemplate || createTemplateFromCapabilityContext(visualizationContext);
    const fallbackInstantiation = instantiateVisualizationTemplate(definition, visualizationContext, {
      forceFallbackOnInvalid: true
    });
    instantiated = fallbackInstantiation;
  }

  return {
    ...safeScene,
    metadata: {
      ...metadata,
      templateSelection: summarizeSelection(selection),
      selectedTemplate: instantiated.sourceTemplate,
      selectedTemplateInstance: instantiated.instance,
      templateComposition: selection.templateComposition || null,
      templateBindings: selection.bindings || null,
      visualizationTemplate: instantiated.sourceTemplate,
      visualizationTemplateInstance: instantiated.instance,
      templateDiagnostics: selection.diagnostics || instantiated.diagnostics,
      templateMigrationWarning: existingTemplate
        ? metadata.templateMigrationWarning
        : 'Template metadata was missing and an adaptive template instance was generated.'
    }
  };
}
