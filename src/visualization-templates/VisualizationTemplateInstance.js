export function createVisualizationTemplateInstance({
  instanceId,
  templateId,
  templateVersion,
  sourceTemplate,
  resolvedVariables = {},
  resolvedSlots = [],
  resolvedRegions = [],
  resolvedRelationships = [],
  capabilityBindings = [],
  sceneBindings = {},
  constraints = [],
  accessibility = {},
  performance = {},
  metadata = {},
  diagnostics = {}
} = {}) {
  return {
    instanceId,
    templateId,
    templateVersion,
    sourceTemplate,
    resolvedVariables,
    resolvedSlots,
    resolvedRegions,
    resolvedRelationships,
    capabilityBindings,
    sceneBindings,
    constraints,
    accessibility,
    performance,
    metadata,
    diagnostics
  };
}
