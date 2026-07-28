export function createEducationalObjectInstance(input = {}) {
  return {
    instanceId: String(input.instanceId || ''),
    objectId: String(input.objectId || ''),
    objectVersion: String(input.objectVersion || ''),
    sceneId: String(input.sceneId || ''),
    templateInstanceId: input.templateInstanceId || null,
    slotBinding: input.slotBinding || null,
    regionBinding: input.regionBinding || null,
    resolvedVariables: input.resolvedVariables || {},
    resolvedState: input.resolvedState || {},
    resolvedData: input.resolvedData || {},
    resolvedRepresentation: input.resolvedRepresentation || {},
    resolvedAccessibility: input.resolvedAccessibility || {},
    resolvedPerformance: input.resolvedPerformance || {},
    runtimeMetadata: input.runtimeMetadata || {},
    diagnostics: input.diagnostics || {}
  };
}
