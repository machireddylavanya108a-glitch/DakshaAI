import { processSceneJsonPipeline } from './SceneVersionManager.js';

export function deepCloneScene(scene) {
  try {
    return JSON.parse(JSON.stringify(scene || {}));
  } catch {
    return processSceneJsonPipeline({});
  }
}

export function serializeScene(scene, pretty = false) {
  const validatedScene = processSceneJsonPipeline(scene || {});
  return JSON.stringify(validatedScene, null, pretty ? 2 : 0);
}

export function exportScene(scene, pretty = true) {
  const serialized = serializeScene(scene, pretty);
  return {
    content: serialized,
    mimeType: 'application/json',
    extension: '.scene.json'
  };
}
