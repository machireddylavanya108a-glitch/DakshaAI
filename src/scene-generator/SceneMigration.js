import { SCENE_SCHEMA_LATEST_VERSION } from './SceneSchema.js';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeVersion(version) {
  if (typeof version === 'number') return `v${version}`;
  const normalized = String(version || '').trim().toLowerCase();
  if (!normalized) return 'v1';
  if (normalized.startsWith('v')) return normalized;
  if (/^\d+$/.test(normalized)) return `v${normalized}`;
  return 'v1';
}

export function migrateSceneV1ToV2(scene) {
  const source = isObject(scene) ? scene : {};
  const classification = source.classification;

  let normalizedClassification;
  if (typeof classification === 'string') {
    normalizedClassification = {
      domain: classification,
      subDomain: classification,
      visualization: 'Adaptive',
      sceneComplexity: 'medium',
      objectCategory: classification,
      animationCategory: 'Guided Motion',
      interactionCategory: 'Generic Exploration'
    };
  } else if (isObject(classification)) {
    normalizedClassification = {
      domain: classification.domain || 'Custom',
      subDomain: classification.subDomain || classification.domain || 'Open Topic',
      visualization: classification.visualization || 'Adaptive',
      sceneComplexity: classification.sceneComplexity || 'medium',
      objectCategory: classification.objectCategory || classification.domain || 'Dynamic',
      animationCategory: classification.animationCategory || 'Guided Motion',
      interactionCategory: classification.interactionCategory || 'Generic Exploration'
    };
  } else {
    normalizedClassification = {
      domain: 'Custom',
      subDomain: 'Open Topic',
      visualization: 'Adaptive',
      sceneComplexity: 'medium',
      objectCategory: 'Dynamic',
      animationCategory: 'Guided Motion',
      interactionCategory: 'Generic Exploration'
    };
  }

  return {
    ...source,
    version: 'v2',
    classification: normalizedClassification
  };
}

export function migrateSceneVersion(scene, targetVersion = SCENE_SCHEMA_LATEST_VERSION) {
  const source = isObject(scene) ? scene : {};
  const normalizedCurrent = normalizeVersion(source.version || 'v1');
  const normalizedTarget = normalizeVersion(targetVersion);

  if (normalizedCurrent === normalizedTarget) {
    return {
      ...source,
      version: normalizedTarget
    };
  }

  if (normalizedCurrent === 'v1' && normalizedTarget === 'v2') {
    return migrateSceneV1ToV2(source);
  }

  // Forward compatibility: keep structure while marking target version.
  return {
    ...source,
    version: normalizedTarget
  };
}
