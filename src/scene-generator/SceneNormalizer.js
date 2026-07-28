import {
  SCENE_SCHEMA_LATEST_VERSION,
  createDefaultClassification,
  createDefaultEnvironment,
  createDefaultCamera,
  createDefaultNarration,
  createDefaultAudio,
  createDefaultLighting,
  createDefaultPhysics,
  createDefaultMetadata,
  createDefaultStatistics,
  createDefaultSettings,
  createDefaultValidation,
  createDefaultDiagnostics
} from './SceneSchema.js';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toArray(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return fallback;
  return [value];
}

function pick(source, keys, fallback = undefined) {
  for (const key of keys) {
    if (source && Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      return source[key];
    }
  }
  return fallback;
}

function normalizeClassification(value) {
  const defaultValue = createDefaultClassification();
  if (!isObject(value)) {
    if (typeof value === 'string' && value.trim()) {
      return {
        ...defaultValue,
        domain: value.trim(),
        subDomain: value.trim(),
        objectCategory: value.trim()
      };
    }
    return defaultValue;
  }

  return {
    ...defaultValue,
    domain: pick(value, ['domain', 'subjectDomain', 'scene_type'], defaultValue.domain),
    subDomain: pick(value, ['subDomain', 'subcategory', 'topic', 'sub_topic'], defaultValue.subDomain),
    visualization: pick(value, ['visualization', 'visualizationStyle', 'visual_type'], defaultValue.visualization),
    sceneComplexity: pick(value, ['sceneComplexity', 'complexity'], defaultValue.sceneComplexity),
    objectCategory: pick(value, ['objectCategory', 'object_type'], defaultValue.objectCategory),
    animationCategory: pick(value, ['animationCategory', 'animation_type'], defaultValue.animationCategory),
    interactionCategory: pick(value, ['interactionCategory', 'interaction'], defaultValue.interactionCategory)
  };
}

function normalizeCamera(raw) {
  const defaultCamera = createDefaultCamera();
  const source = isObject(raw) ? raw : {};
  return {
    ...defaultCamera,
    ...source,
    position: pick(source, ['position', 'cameraPosition'], defaultCamera.position),
    rotation: pick(source, ['rotation', 'cameraRotation'], defaultCamera.rotation),
    target: pick(source, ['target', 'cameraTarget', 'lookAt'], defaultCamera.target),
    movement: {
      ...defaultCamera.movement,
      ...(isObject(source.movement) ? source.movement : {})
    },
    constraints: {
      ...defaultCamera.constraints,
      ...(isObject(source.constraints) ? source.constraints : {})
    }
  };
}

function normalizeEnvironment(raw) {
  const defaultEnvironment = createDefaultEnvironment();
  const source = isObject(raw) ? raw : {};
  return {
    ...defaultEnvironment,
    ...source,
    preset: pick(source, ['preset', 'environmentPreset', 'theme'], defaultEnvironment.preset),
    sky: {
      ...defaultEnvironment.sky,
      ...(isObject(source.sky) ? source.sky : {})
    },
    floor: {
      ...defaultEnvironment.floor,
      ...(isObject(source.floor) ? source.floor : {})
    },
    fog: {
      ...defaultEnvironment.fog,
      ...(isObject(source.fog) ? source.fog : {})
    },
    lighting: {
      ...defaultEnvironment.lighting,
      ...(isObject(source.lighting) ? source.lighting : {})
    },
    background: {
      ...defaultEnvironment.background,
      ...(isObject(source.background) ? source.background : {})
    },
    effects: toArray(source.effects, defaultEnvironment.effects)
  };
}

function normalizeObject(raw, index = 0) {
  const source = isObject(raw) ? raw : {};
  return {
    ...source,
    id: pick(source, ['id', 'objectId'], source.id),
    type: pick(source, ['type', 'objectType', 'category'], source.type),
    name: pick(source, ['name', 'label', 'title'], source.name),
    position: pick(source, ['position', 'pos'], source.position),
    rotation: pick(source, ['rotation', 'rot'], source.rotation),
    scale: pick(source, ['scale', 'size'], source.scale),
    visible: pick(source, ['visible'], source.visible),
    enabled: pick(source, ['enabled', 'active'], source.enabled),
    interactive: pick(source, ['interactive'], source.interactive),
    highlightable: pick(source, ['highlightable'], source.highlightable),
    clickable: pick(source, ['clickable'], source.clickable),
    animationIds: toArray(pick(source, ['animationIds', 'animations'], []), []),
    labelIds: toArray(pick(source, ['labelIds', 'labels'], []), []),
    metadata: isObject(source.metadata) ? source.metadata : {},
    state: isObject(source.state) ? source.state : {},
    properties: isObject(source.properties) ? source.properties : {},
    extensions: isObject(source.extensions) ? source.extensions : {},
    order: source.order ?? index
  };
}

function normalizeTimelineStep(raw, index = 0) {
  const source = isObject(raw) ? raw : {};
  return {
    ...source,
    id: pick(source, ['id', 'stepId'], source.id),
    order: pick(source, ['order', 'index'], index),
    title: pick(source, ['title', 'name'], source.title),
    description: pick(source, ['description', 'details'], source.description),
    duration: pick(source, ['duration', 'durationMs', 'time'], source.duration),
    camera: pick(source, ['camera', 'cameraState'], source.camera),
    objects: toArray(pick(source, ['objects', 'objectIds'], []), []),
    animations: toArray(pick(source, ['animations', 'animationIds'], []), []),
    narration: pick(source, ['narration', 'voiceover'], source.narration),
    interaction: pick(source, ['interaction', 'interactionId'], source.interaction),
    completionRule: isObject(source.completionRule) ? source.completionRule : { type: 'manual', value: null }
  };
}

export function normalizeScene(rawScene, options = {}) {
  const source = isObject(rawScene) ? { ...rawScene } : {};
  const templateAlias = pick(source, ['visualizationTemplate', 'sceneTemplate', 'template', 'layoutTemplate', 'templateConfig', 'sceneLayout'], null);
  const subjectValue = pick(source, ['subject', 'topic', 'lessonTopic'], 'General Learning');
  const classificationValue = pick(source, ['classification', 'scene_type', 'sceneType'], {});
  const aliasCamera = {
    position: source.cameraPosition,
    rotation: source.cameraRotation,
    target: source.cameraTarget
  };
  const mergedCamera = {
    ...aliasCamera,
    ...(isObject(source.sceneCamera) ? source.sceneCamera : {}),
    ...(isObject(source.camera) ? source.camera : {})
  };

  const normalized = {
    ...source,
    sceneId: pick(source, ['sceneId', 'id', 'scene_id'], source.sceneId),
    version: pick(source, ['version', 'schemaVersion'], SCENE_SCHEMA_LATEST_VERSION),
    title: pick(source, ['title', 'scene_name', 'sceneName', 'name'], 'Untitled Scene'),
    subject: typeof subjectValue === 'string' ? subjectValue : 'General Learning',
    classification: normalizeClassification(classificationValue),
    environment: normalizeEnvironment(pick(source, ['environment', 'sceneEnvironment'], {})),
    camera: normalizeCamera(mergedCamera),
    timeline: toArray(pick(source, ['timeline', 'steps'], []), []).map((step, index) => normalizeTimelineStep(step, index)),
    objects: toArray(pick(source, ['objects', 'models', 'entities'], []), []).map((objectValue, index) => normalizeObject(objectValue, index)),
    animations: toArray(pick(source, ['animations'], []), []),
    labels: toArray(pick(source, ['labels'], []), []),
    interactions: toArray(pick(source, ['interactions', 'hotspots'], []), []),
    narration: {
      ...createDefaultNarration(),
      ...(isObject(pick(source, ['narration'], null)) ? pick(source, ['narration'], {}) : {})
    },
    audio: {
      ...createDefaultAudio(),
      ...(isObject(pick(source, ['audio'], null)) ? pick(source, ['audio'], {}) : {})
    },
    lighting: {
      ...createDefaultLighting(),
      ...(isObject(pick(source, ['lighting'], null)) ? pick(source, ['lighting'], {}) : {})
    },
    physics: {
      ...createDefaultPhysics(),
      ...(isObject(pick(source, ['physics'], null)) ? pick(source, ['physics'], {}) : {})
    },
    metadata: {
      ...createDefaultMetadata(),
      ...(isObject(pick(source, ['metadata'], null)) ? pick(source, ['metadata'], {}) : {}),
      ...(isObject(templateAlias) ? { visualizationTemplate: templateAlias } : {}),
      sourceType: options.sourceType || pick(source, ['sourceType'], 'unknown')
    },
    statistics: {
      ...createDefaultStatistics(),
      ...(isObject(pick(source, ['statistics'], null)) ? pick(source, ['statistics'], {}) : {})
    },
    settings: {
      ...createDefaultSettings(),
      ...(isObject(pick(source, ['settings'], null)) ? pick(source, ['settings'], {}) : {})
    },
    checkpoints: toArray(pick(source, ['checkpoints'], []), []),
    validation: {
      ...createDefaultValidation(),
      ...(isObject(pick(source, ['validation'], null)) ? pick(source, ['validation'], {}) : {})
    },
    diagnostics: {
      ...createDefaultDiagnostics(),
      ...(isObject(pick(source, ['diagnostics'], null)) ? pick(source, ['diagnostics'], {}) : {})
    }
  };

  return normalized;
}
