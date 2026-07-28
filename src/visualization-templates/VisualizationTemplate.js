import { createAdaptiveFallbackTemplate } from './VisualizationTemplateSchema.js';
import { instantiateVisualizationTemplate } from './VisualizationTemplateInstantiation.js';

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
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
  const existingTemplate = metadata.visualizationTemplate;
  const existingInstance = metadata.visualizationTemplateInstance;

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

  const definition = existingTemplate || createTemplateFromCapabilityContext(visualizationContext);
  const instantiated = instantiateVisualizationTemplate(definition, visualizationContext, {
    forceFallbackOnInvalid: true
  });

  return {
    ...safeScene,
    metadata: {
      ...metadata,
      visualizationTemplate: instantiated.sourceTemplate,
      visualizationTemplateInstance: instantiated.instance,
      templateDiagnostics: instantiated.diagnostics,
      templateMigrationWarning: existingTemplate
        ? metadata.templateMigrationWarning
        : 'Template metadata was missing and an adaptive template instance was generated.'
    }
  };
}
