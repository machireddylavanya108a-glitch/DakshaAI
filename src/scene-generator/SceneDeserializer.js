import { createSafeScene } from './SceneSchema.js';
import { processSceneJsonPipeline } from './SceneVersionManager.js';

function parseJson(text) {
  try {
    return JSON.parse(String(text || '{}'));
  } catch {
    return null;
  }
}

export function deserializeScene(payload) {
  const raw = typeof payload === 'string' ? parseJson(payload) : payload;

  if (!raw || typeof raw !== 'object') {
    const safe = createSafeScene();
    safe.validation = {
      status: 'fallback',
      errors: ['Unable to deserialize scene payload. Returning safe scene.'],
      warnings: [],
      repairable: true
    };
    return safe;
  }

  return processSceneJsonPipeline(raw, { sourceType: 'import' });
}

export function importScene(payload) {
  return deserializeScene(payload);
}
