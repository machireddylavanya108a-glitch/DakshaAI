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
export { createEducationalObject, ensureSceneEducationalObjectMetadata } from './EducationalObject.js';
