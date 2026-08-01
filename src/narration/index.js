export {
  NARRATION_CUE_TYPES,
  NARRATION_DIFFICULTIES,
  DEFAULT_NARRATION_CONFIG,
  isObject,
  asArray,
  clamp,
  toFiniteNumber
} from './NarrationConfig.js';

export {
  buildUniversalNarrationPackage,
  buildNarrationSegments
} from './NarrationSegmentation.js';

export {
  NarrationSceneSynchronizationRuntime,
  createNarrationSceneSynchronizationRuntime
} from './runtime/index.js';
