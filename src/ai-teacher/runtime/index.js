export {
  UNIVERSAL_AI_TEACHER_SCHEMA_VERSION,
  SUPPORTED_TEACHING_ACTIONS,
  SUPPORTED_LEARNING_LEVELS,
  SUPPORTED_LEARNER_MODES,
  DEFAULT_AI_TEACHER_ENGINE_CONFIG,
  isObject,
  asArray,
  safeString,
  toFiniteNumber,
  clamp,
  normalizeLearningLevel,
  normalizeLearnerMode,
  normalizeTeachingAction
} from './UniversalAITeacherEngineConfig.js';

export {
  UniversalAITeacherEngine,
  createUniversalAITeacherEngine,
  runUniversalAITeacherEngine,
  validateUniversalAITeacherPlan,
  serializeUniversalAITeacherPlan,
  deserializeUniversalAITeacherPlan,
  migrateUniversalAITeacherPlan
} from './UniversalAITeacherEngine.js';
