import { generateUniversalScene } from './SceneGenerationPipeline.js';

export { generateUniversalScene };
export { sceneGenerationCache } from './SceneGenerationCache.js';
export { normalizeSceneGenerationConfig } from './SceneGenerationConfig.js';
export { SceneGenerationError } from './SceneGenerationError.js';

export function generateScene(input, options = {}) {
  return generateUniversalScene(input, options);
}
