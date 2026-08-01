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
import { buildTimeline } from '../timeline/index.js';

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

function normalizeEducationalObjectDescriptor(raw, index = 0) {
  const source = isObject(raw) ? raw : {};
  const objectId = pick(source, ['objectId', 'object_id', 'id'], `educational-object-${index + 1}`);
  return {
    ...source,
    objectId,
    id: objectId,
    kind: pick(source, ['kind', 'objectType', 'object_type', 'type', 'category'], source.kind || 'generic-educational-object'),
    semanticRole: pick(source, ['semanticRole', 'semantic_role'], source.semanticRole || 'adaptive-role'),
    learningPurpose: pick(source, ['learningPurpose', 'learning_purpose'], source.learningPurpose || 'inspect')
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

function resolveTimelineStepSource(source = {}) {
  if (Array.isArray(source.timeline)) return source.timeline;
  if (isObject(source.timeline) && Array.isArray(source.timeline.steps)) return source.timeline.steps;
  if (Array.isArray(source.steps)) return source.steps;
  return [];
}

export function normalizeScene(rawScene, options = {}) {
  const source = isObject(rawScene) ? { ...rawScene } : {};
  const templateAlias = pick(source, ['visualizationTemplate', 'sceneTemplate', 'template', 'layoutTemplate', 'templateConfig', 'sceneLayout'], null);
  const templateInstanceAlias = pick(source, ['visualizationTemplateInstance', 'templateInstance', 'selectedTemplateInstance'], null);
  const selectedTemplateAlias = pick(source, ['selectedTemplate'], null);
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
  const educationalObjectsAlias = pick(source, ['educationalObjects', 'educational_objects', 'sceneObjects', 'objectDescriptors'], []);
  const educationalObjectInstancesAlias = pick(source, ['educationalObjectInstances', 'educational_object_instances', 'objectInstances'], []);
  const objectBehaviorsAlias = pick(source, ['objectBehaviors', 'object_behaviors', 'behaviors', 'actions', 'events'], []);
  const objectStateDefinitionsAlias = pick(source, ['objectStateDefinitions', 'object_state_definitions', 'states', 'transitions'], []);
  const objectRelationshipsAlias = pick(source, ['objectRelationships', 'object_relationships', 'relationships', 'links', 'dependencies'], []);
  const behaviorDiagnosticsAlias = pick(source, ['behaviorDiagnostics', 'behavior_diagnostics'], null);
  const objectDiagnosticsAlias = pick(source, ['objectDiagnostics', 'educationalObjectDiagnostics'], null);
  const timelineStepSource = resolveTimelineStepSource(source);

  const timelineData = buildTimeline({
    ...source,
    timeline: source.timeline,
    timelineTracks: pick(source, ['timelineTracks'], []),
    timelineEvents: pick(source, ['timelineEvents'], []),
    timelineMarkers: pick(source, ['timelineMarkers'], [])
  });

  const normalized = {
    ...source,
    sceneId: pick(source, ['sceneId', 'id', 'scene_id'], source.sceneId),
    version: pick(source, ['version', 'schemaVersion'], SCENE_SCHEMA_LATEST_VERSION),
    title: pick(source, ['title', 'scene_name', 'sceneName', 'name'], 'Untitled Scene'),
    subject: typeof subjectValue === 'string' ? subjectValue : 'General Learning',
    classification: normalizeClassification(classificationValue),
    environment: normalizeEnvironment(pick(source, ['environment', 'sceneEnvironment'], {})),
    camera: normalizeCamera(mergedCamera),
    timeline: timelineStepSource.map((step, index) => normalizeTimelineStep(step, index)),
    timelineTracks: Array.isArray(timelineData?.tracks) ? timelineData.tracks : [],
    timelineEvents: Array.isArray(timelineData?.events) ? timelineData.events : [],
    timelineMarkers: Array.isArray(timelineData?.markers) ? timelineData.markers : [],
    timelineData,
    objects: toArray(pick(source, ['objects', 'models', 'entities'], []), []).map((objectValue, index) => normalizeObject(objectValue, index)),
    educationalObjects: toArray(educationalObjectsAlias, []).map((item, index) => normalizeEducationalObjectDescriptor(item, index)),
    educationalObjectInstances: toArray(educationalObjectInstancesAlias, []),
    objectBehaviors: toArray(objectBehaviorsAlias, []),
    objectStateDefinitions: toArray(objectStateDefinitionsAlias, []),
    objectRelationships: toArray(objectRelationshipsAlias, []),
    behaviorDiagnostics: isObject(behaviorDiagnosticsAlias)
      ? behaviorDiagnosticsAlias
      : {
          warningCount: 0,
          errorCount: 0,
          repairedCount: 0,
          items: []
        },
    objectDiagnostics: isObject(objectDiagnosticsAlias) ? objectDiagnosticsAlias : { summary: {}, items: [] },
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
      ...(isObject(selectedTemplateAlias) ? { selectedTemplate: selectedTemplateAlias } : {}),
      ...(isObject(templateInstanceAlias) ? { visualizationTemplateInstance: templateInstanceAlias, selectedTemplateInstance: templateInstanceAlias } : {}),
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
