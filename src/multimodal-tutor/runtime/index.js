export {
  UNIVERSAL_MULTIMODAL_AI_TUTOR_SCHEMA_VERSION,
  SUPPORTED_BASE_TEACHING_MODALITIES,
  SUPPORTED_BASE_TUTOR_CAPABILITIES,
  DEFAULT_UNIVERSAL_MULTIMODAL_AI_TUTOR_CONFIG,
  isObject,
  asArray,
  safeString,
  toFiniteNumber,
  clamp,
  uniqueStrings,
  normalizeTeachingModality,
  normalizeTutorCapability
} from './UniversalMultimodalAITutorLiveTeachingEngineConfig.js';

export {
  UniversalMultimodalAITutorLiveTeachingEngine,
  createUniversalMultimodalAITutorLiveTeachingEngine,
  runUniversalMultimodalAITutorLiveTeachingEngine,
  validateUniversalMultimodalAITutorOutput,
  serializeUniversalMultimodalAITutorOutput,
  deserializeUniversalMultimodalAITutorOutput,
  migrateUniversalMultimodalAITutorOutput
} from './UniversalMultimodalAITutorLiveTeachingEngine.js';
