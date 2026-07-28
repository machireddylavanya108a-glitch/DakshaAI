export {
  EDUCATIONAL_OBJECT_LATEST_VERSION,
  EDUCATIONAL_OBJECT_DEFAULT_LIMITS,
  EDUCATIONAL_OBJECT_DEFAULTS,
  normalizeEducationalObjectConfig
} from './EducationalObjectConfig.js';
export { EducationalObjectError, toEducationalObjectError } from './EducationalObjectError.js';
export {
  createEducationalObjectDiagnostics,
  finalizeEducationalObjectDiagnostics
} from './EducationalObjectDiagnostics.js';
export {
  createAdaptiveFallbackEducationalObject,
  createDefaultObjectRepresentation,
  createDefaultObjectAccessibility,
  createDefaultObjectPerformance
} from './EducationalObjectSchema.js';
export { normalizeEducationalObject } from './EducationalObjectNormalizer.js';
export {
  validateEducationalObject,
  validateObjectIdentity,
  validateObjectConceptReferences,
  validateObjectRelationships,
  validateObjectTemplateBindings,
  validateObjectRepresentation,
  validateObjectSpatialProperties,
  validateObjectTemporalProperties,
  validateObjectState,
  validateObjectAccessibility,
  validateObjectPerformance,
  validateObjectConstraints,
  validateObjectVariables,
  validateObjectConditions
} from './EducationalObjectValidator.js';
export { repairEducationalObject } from './EducationalObjectRepair.js';
export {
  migrateEducationalObject,
  getLatestEducationalObjectVersion,
  isEducationalObjectMigrationRequired,
  registerEducationalObjectMigration,
  listEducationalObjectMigrations
} from './EducationalObjectMigration.js';
export { runEducationalObjectIntegrityChecks } from './EducationalObjectIntegrity.js';
export { processEducationalObject } from './EducationalObjectVersionManager.js';
export { createEducationalObjectInstance } from './EducationalObjectInstance.js';
export { instantiateEducationalObject } from './EducationalObjectInstantiation.js';
export {
  deepCloneEducationalObject,
  serializeEducationalObject,
  serializeEducationalObjectInstance,
  exportEducationalObject
} from './EducationalObjectSerializer.js';
export {
  deserializeEducationalObject,
  importEducationalObject,
  deserializeEducationalObjectInstance
} from './EducationalObjectDeserializer.js';
export {
  EDUCATIONAL_OBJECT_GENERATOR_VERSION,
  EDUCATIONAL_OBJECT_GENERATION_DEFAULTS,
  EDUCATIONAL_OBJECT_PROFILE_LIMITS,
  resolveEducationalObjectGenerationConfig,
  normalizePerformanceProfile,
  stableHash,
  stableSortByKey
} from './EducationalObjectGenerationConfig.js';
export {
  createEducationalObjectGenerationDiagnostics,
  beginEducationalObjectGenerationStage,
  endEducationalObjectGenerationStage,
  finalizeEducationalObjectGenerationDiagnostics
} from './EducationalObjectGenerationDiagnostics.js';
export {
  createEducationalObjectGenerationCacheKey,
  getCachedEducationalObjectGeneration,
  setCachedEducationalObjectGeneration,
  invalidateEducationalObjectGenerationCache,
  clearEducationalObjectGenerationCache
} from './EducationalObjectGenerationCache.js';
export {
  createEducationalObjectGenerationGuardKey,
  hasPendingEducationalObjectGeneration,
  clearPendingEducationalObjectGeneration,
  runGuardedEducationalObjectGeneration
} from './EducationalObjectGenerationGuard.js';
export { createEducationalObjectBlueprint } from './EducationalObjectBlueprint.js';
export { selectEducationalObjectRepresentation } from './EducationalObjectRepresentationSelector.js';
export { generateEducationalObjectGeometry } from './EducationalObjectGeometryGenerator.js';
export { generateEducationalObjectVisualProperties } from './EducationalObjectVisualGenerator.js';
export { generateEducationalObjectSpatialProperties } from './EducationalObjectSpatialGenerator.js';
export { generateEducationalObjectLabels } from './EducationalObjectLabelGenerator.js';
export { generateEducationalObjectNarration } from './EducationalObjectNarrationGenerator.js';
export { simplifyEducationalObjects } from './EducationalObjectSimplifier.js';
export { refineEducationalObjects } from './EducationalObjectRefiner.js';
export { salvageEducationalObjects } from './EducationalObjectSalvager.js';
export { applyEducationalObjectGenerationFallback } from './EducationalObjectFallback.js';
export { evaluateEducationalObjectQuality } from './EducationalObjectQuality.js';
export { createEducationalObject as createEducationalObjectFromDescriptor } from './EducationalObjectFactory.js';
export { generateEducationalObjects } from './EducationalObjectGenerator.js';
export { EducationalObjectBehaviorError, toEducationalObjectBehaviorError } from './EducationalObjectBehaviorError.js';
export {
  EDUCATIONAL_OBJECT_BEHAVIOR_LATEST_VERSION,
  createDefaultBehaviorTrigger,
  createDefaultBehaviorCondition,
  createDefaultBehaviorEffect,
  createDefaultBehaviorState,
  createDefaultBehaviorTransition,
  createDefaultBehaviorAccessibility,
  createDefaultBehaviorPerformance,
  createDefaultBehaviorLimits,
  createDefaultBehaviorScheduling,
  createDefaultObjectStateConfiguration,
  createAdaptiveFallbackBehavior
} from './EducationalObjectBehaviorSchema.js';
export { normalizeEducationalObjectBehavior } from './EducationalObjectBehaviorNormalizer.js';
export {
  validateEducationalObjectBehavior,
  validateBehaviorTriggers,
  validateBehaviorConditions,
  validateBehaviorEffects,
  validateBehaviorStates,
  validateBehaviorTransitions,
  validateBehaviorRelationships,
  validateBehaviorAccessibility,
  validateBehaviorPerformance
} from './EducationalObjectBehaviorValidator.js';
export {
  createEducationalObjectBehaviorDiagnostics,
  finalizeEducationalObjectBehaviorDiagnostics
} from './EducationalObjectBehaviorDiagnostics.js';
export { repairEducationalObjectBehavior } from './EducationalObjectBehaviorRepair.js';
export {
  createEducationalObjectBehavior,
  ensureSceneEducationalObjectBehaviorMetadata
} from './EducationalObjectBehavior.js';
export {
  createEducationalObjectBehaviorRegistry,
  defaultEducationalObjectBehaviorRegistry
} from './EducationalObjectBehaviorRegistry.js';
export { resolveEducationalObjectTransitions } from './EducationalObjectTransitionResolver.js';
export { validateEducationalObjectStateConfiguration } from './EducationalObjectStateValidator.js';
export { createEducationalObjectStateMachine } from './EducationalObjectStateMachine.js';
export { resolveEducationalObjectTriggers } from './EducationalObjectTriggerResolver.js';
export { resolveEducationalObjectEffects } from './EducationalObjectEffectResolver.js';
export { createEducationalObjectRelationshipGraph } from './EducationalObjectRelationshipGraph.js';
export { resolveEducationalObjectRelationships } from './EducationalObjectRelationshipResolver.js';
export { resolveEducationalObjectDependencies } from './EducationalObjectDependencyResolver.js';
export { resolveEducationalObjectBehaviorConflicts } from './EducationalObjectConflictResolver.js';
export { createEducationalObjectBehaviorRuntime } from './EducationalObjectBehaviorRuntime.js';
export {
  createEducationalObject as createEducationalObjectRecord,
  ensureSceneEducationalObjectMetadata
} from './EducationalObject.js';
