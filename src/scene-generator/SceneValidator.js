import {
  createDefaultCamera,
  createDefaultEnvironment,
  createDefaultMetadata,
  createDefaultNarration,
  createDefaultAudio
} from './SceneSchema.js';
import { validateTimeline as validateTimelineData } from '../timeline/index.js';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isVector(value, length = 3) {
  return Array.isArray(value) && value.length === length && value.every((item) => Number.isFinite(Number(item)));
}

function makeResult(errors = [], warnings = [], repairable = true) {
  const status = errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid';
  return { status, errors, warnings, repairable };
}

function aggregate(results = []) {
  const errors = [];
  const warnings = [];
  let repairable = true;

  for (const result of results) {
    errors.push(...(result.errors || []));
    warnings.push(...(result.warnings || []));
    if (result.repairable === false) repairable = false;
  }

  return makeResult(errors, warnings, repairable);
}

export function validateCamera(camera) {
  const errors = [];
  const warnings = [];
  const fallback = createDefaultCamera();

  if (!isObject(camera)) {
    errors.push('Camera is missing or invalid.');
    return makeResult(errors, warnings, true);
  }

  if (!isVector(camera.position, 3)) errors.push('Camera position must be a 3-number vector.');
  if (!isVector(camera.rotation, 3)) errors.push('Camera rotation must be a 3-number vector.');
  if (!isVector(camera.target, 3)) errors.push('Camera target must be a 3-number vector.');

  if (!Number.isFinite(Number(camera.fov))) warnings.push(`Camera fov missing; default ${fallback.fov} is recommended.`);
  if (!Number.isFinite(Number(camera.near))) warnings.push(`Camera near missing; default ${fallback.near} is recommended.`);
  if (!Number.isFinite(Number(camera.far))) warnings.push(`Camera far missing; default ${fallback.far} is recommended.`);

  return makeResult(errors, warnings, true);
}

export function validateEnvironment(environment) {
  const errors = [];
  const warnings = [];
  const fallback = createDefaultEnvironment();

  if (!isObject(environment)) {
    errors.push('Environment is missing or invalid.');
    return makeResult(errors, warnings, true);
  }

  if (!environment.id) warnings.push('Environment id is missing.');
  if (!environment.preset) warnings.push(`Environment preset is missing; default ${fallback.preset} is recommended.`);
  if (!isObject(environment.sky)) warnings.push('Environment sky should be an object.');
  if (!isObject(environment.floor)) warnings.push('Environment floor should be an object.');

  return makeResult(errors, warnings, true);
}

export function validateObjects(objects) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(objects)) {
    errors.push('Objects must be an array.');
    return makeResult(errors, warnings, true);
  }

  objects.forEach((objectValue, index) => {
    if (!isObject(objectValue)) {
      errors.push(`Object at index ${index} is invalid.`);
      return;
    }

    const required = [
      'id', 'type', 'name', 'position', 'rotation', 'scale',
      'visible', 'enabled', 'interactive', 'highlightable', 'clickable',
      'animationIds', 'labelIds', 'metadata', 'state', 'properties', 'extensions'
    ];

    required.forEach((key) => {
      if (!(key in objectValue)) {
        errors.push(`Object ${index} is missing required field ${key}.`);
      }
    });

    if (!isVector(objectValue.position, 3)) errors.push(`Object ${index} position must be a 3-number vector.`);
    if (!isVector(objectValue.rotation, 3)) errors.push(`Object ${index} rotation must be a 3-number vector.`);
    if (!isVector(objectValue.scale, 3)) errors.push(`Object ${index} scale must be a 3-number vector.`);

    if (!Array.isArray(objectValue.animationIds)) warnings.push(`Object ${index} animationIds should be an array.`);
    if (!Array.isArray(objectValue.labelIds)) warnings.push(`Object ${index} labelIds should be an array.`);
  });

  return makeResult(errors, warnings, true);
}

export function validateEducationalObjects(educationalObjects) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(educationalObjects)) {
    errors.push('Educational objects must be an array.');
    return makeResult(errors, warnings, true);
  }

  const seenObjectIds = new Set();
  educationalObjects.forEach((objectValue, index) => {
    if (!isObject(objectValue)) {
      errors.push(`Educational object at index ${index} is invalid.`);
      return;
    }

    const objectId = String(objectValue.objectId || objectValue.id || '').trim();
    if (!objectId) {
      errors.push(`Educational object ${index} is missing required field objectId.`);
      return;
    }

    if (seenObjectIds.has(objectId)) {
      warnings.push(`Educational object duplicate id detected: ${objectId}`);
    }
    seenObjectIds.add(objectId);
  });

  return makeResult(errors, warnings, true);
}

export function validateEducationalObjectInstances(instances) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(instances)) {
    errors.push('Educational object instances must be an array.');
    return makeResult(errors, warnings, true);
  }

  instances.forEach((instance, index) => {
    if (!isObject(instance)) {
      errors.push(`Educational object instance at index ${index} is invalid.`);
      return;
    }

    if (!instance.instanceId) warnings.push(`Educational object instance ${index} is missing instanceId.`);
    if (!instance.objectId) warnings.push(`Educational object instance ${index} is missing objectId.`);
  });

  return makeResult(errors, warnings, true);
}

export function validateObjectBehaviors(objectBehaviors) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(objectBehaviors)) {
    errors.push('Object behaviors must be an array.');
    return makeResult(errors, warnings, true);
  }

  const seenIds = new Set();
  objectBehaviors.forEach((behavior, index) => {
    if (!isObject(behavior)) {
      errors.push(`Object behavior at index ${index} is invalid.`);
      return;
    }

    const behaviorId = String(behavior.behaviorId || behavior.id || '').trim();
    if (!behaviorId) {
      warnings.push(`Object behavior ${index} is missing behaviorId.`);
      return;
    }

    if (seenIds.has(behaviorId)) warnings.push(`Duplicate behavior id detected: ${behaviorId}`);
    seenIds.add(behaviorId);
  });

  return makeResult(errors, warnings, true);
}

export function validateObjectStateDefinitions(objectStateDefinitions) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(objectStateDefinitions)) {
    errors.push('Object state definitions must be an array.');
    return makeResult(errors, warnings, true);
  }

  objectStateDefinitions.forEach((definition, index) => {
    if (!isObject(definition)) {
      warnings.push(`Object state definition at index ${index} is invalid.`);
      return;
    }
    if (!definition.behaviorId) warnings.push(`Object state definition ${index} is missing behaviorId.`);
  });

  return makeResult(errors, warnings, true);
}

export function validateObjectRelationships(objectRelationships) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(objectRelationships)) {
    errors.push('Object relationships must be an array.');
    return makeResult(errors, warnings, true);
  }

  objectRelationships.forEach((relationship, index) => {
    if (!isObject(relationship)) {
      warnings.push(`Object relationship at index ${index} is invalid.`);
      return;
    }
    if (!relationship.relationshipId && !relationship.relationId && !relationship.id) {
      warnings.push(`Object relationship ${index} is missing relationship id.`);
    }
  });

  return makeResult(errors, warnings, true);
}

export function validateBehaviorDiagnostics(behaviorDiagnostics) {
  const errors = [];
  const warnings = [];

  if (!isObject(behaviorDiagnostics)) {
    errors.push('Behavior diagnostics must be an object.');
    return makeResult(errors, warnings, true);
  }

  if (!Array.isArray(behaviorDiagnostics.items)) warnings.push('Behavior diagnostics items should be an array.');

  return makeResult(errors, warnings, true);
}

export function validateObjectDiagnostics(objectDiagnostics) {
  const errors = [];
  const warnings = [];

  if (!isObject(objectDiagnostics)) {
    errors.push('Object diagnostics must be an object.');
    return makeResult(errors, warnings, true);
  }

  if (!isObject(objectDiagnostics.summary)) warnings.push('Object diagnostics summary should be an object.');
  if (!Array.isArray(objectDiagnostics.items)) warnings.push('Object diagnostics items should be an array.');

  return makeResult(errors, warnings, true);
}

export function validateTimeline(timeline) {
  const errors = [];
  const warnings = [];

  if (isObject(timeline)) {
    const validation = validateTimelineData(timeline);
    return makeResult(validation.errors || [], validation.warnings || [], validation.repairable !== false);
  }

  if (!Array.isArray(timeline)) {
    errors.push('Timeline must be an array.');
    return makeResult(errors, warnings, true);
  }

  timeline.forEach((step, index) => {
    if (!isObject(step)) {
      errors.push(`Timeline step at index ${index} is invalid.`);
      return;
    }

    const required = [
      'id', 'order', 'title', 'description', 'duration', 'camera',
      'objects', 'animations', 'narration', 'interaction', 'completionRule'
    ];

    required.forEach((key) => {
      if (!(key in step)) errors.push(`Timeline step ${index} is missing required field ${key}.`);
    });

    if (!Number.isFinite(Number(step.order))) errors.push(`Timeline step ${index} order must be numeric.`);
    if (!Array.isArray(step.objects)) errors.push(`Timeline step ${index} objects must be an array.`);
    if (!Array.isArray(step.animations)) errors.push(`Timeline step ${index} animations must be an array.`);
  });

  return makeResult(errors, warnings, true);
}

export function validateTimelineCollections(scene) {
  const errors = [];
  const warnings = [];

  if (scene.timelineTracks !== undefined && !Array.isArray(scene.timelineTracks)) {
    errors.push('timelineTracks must be an array when provided.');
  }

  if (scene.timelineEvents !== undefined && !Array.isArray(scene.timelineEvents)) {
    errors.push('timelineEvents must be an array when provided.');
  }

  if (scene.timelineMarkers !== undefined && !Array.isArray(scene.timelineMarkers)) {
    errors.push('timelineMarkers must be an array when provided.');
  }

  if (scene.timelineData !== undefined && scene.timelineData !== null && !isObject(scene.timelineData)) {
    errors.push('timelineData must be an object when provided.');
  }

  if (isObject(scene.timelineData)) {
    const validation = validateTimelineData(scene.timelineData);
    errors.push(...(validation.errors || []));
    warnings.push(...(validation.warnings || []));
  }

  return makeResult(errors, warnings, true);
}

export function validateAnimations(animations) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(animations)) {
    errors.push('Animations must be an array.');
    return makeResult(errors, warnings, true);
  }

  animations.forEach((animationValue, index) => {
    if (!isObject(animationValue)) {
      warnings.push(`Animation at index ${index} is not an object.`);
    }
  });

  return makeResult(errors, warnings, true);
}

export function validateInteractions(interactions) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(interactions)) {
    errors.push('Interactions must be an array.');
    return makeResult(errors, warnings, true);
  }

  interactions.forEach((interaction, index) => {
    if (!isObject(interaction)) {
      warnings.push(`Interaction at index ${index} is not an object.`);
    }
  });

  return makeResult(errors, warnings, true);
}

export function validateMetadata(metadata) {
  const errors = [];
  const warnings = [];
  const fallback = createDefaultMetadata();

  if (!isObject(metadata)) {
    errors.push('Metadata is missing or invalid.');
    return makeResult(errors, warnings, true);
  }

  if (!metadata.createdAt) warnings.push(`Metadata createdAt missing; default ${fallback.createdAt} should be used.`);
  if (!metadata.updatedAt) warnings.push(`Metadata updatedAt missing; default ${fallback.updatedAt} should be used.`);
  if (!Array.isArray(metadata.tags)) warnings.push('Metadata tags should be an array.');

  return makeResult(errors, warnings, true);
}

export function validateNarration(narration) {
  const errors = [];
  const warnings = [];
  const fallback = createDefaultNarration();

  if (!isObject(narration)) {
    errors.push('Narration is missing or invalid.');
    return makeResult(errors, warnings, true);
  }

  if (typeof narration.text !== 'string') warnings.push('Narration text should be a string.');
  if (!Array.isArray(narration.segments)) warnings.push('Narration segments should be an array.');
  if (!Array.isArray(narration.links)) warnings.push('Narration links should be an array.');
  if (!narration.language) warnings.push(`Narration language missing; default ${fallback.language} is recommended.`);

  return makeResult(errors, warnings, true);
}

export function validateAudio(audio) {
  const errors = [];
  const warnings = [];
  const fallback = createDefaultAudio();

  if (!isObject(audio)) {
    errors.push('Audio is missing or invalid.');
    return makeResult(errors, warnings, true);
  }

  if (!Array.isArray(audio.tracks)) warnings.push('Audio tracks should be an array.');
  if (!Array.isArray(audio.sfx)) warnings.push('Audio sfx should be an array.');
  if (typeof audio.enabled !== 'boolean') warnings.push(`Audio enabled should be boolean; default ${fallback.enabled} is recommended.`);

  return makeResult(errors, warnings, true);
}

export function validateScene(scene) {
  const errors = [];
  const warnings = [];

  if (!isObject(scene)) {
    return makeResult(['Scene must be an object.'], warnings, true);
  }

  const requiredTopLevel = [
    'sceneId', 'version', 'title', 'subject', 'classification', 'environment', 'camera', 'timeline',
    'objects', 'animations', 'educationalObjects', 'educationalObjectInstances', 'objectBehaviors', 'objectStateDefinitions', 'objectRelationships', 'behaviorDiagnostics', 'objectDiagnostics', 'labels', 'interactions', 'narration', 'audio', 'lighting', 'physics',
    'metadata', 'statistics', 'settings', 'checkpoints', 'validation', 'diagnostics'
  ];

  requiredTopLevel.forEach((key) => {
    if (!(key in scene)) {
      errors.push(`Scene is missing required field ${key}.`);
    }
  });

  const nested = aggregate([
    validateCamera(scene.camera),
    validateEnvironment(scene.environment),
    validateObjects(scene.objects),
    validateEducationalObjects(scene.educationalObjects),
    validateEducationalObjectInstances(scene.educationalObjectInstances),
    validateObjectBehaviors(scene.objectBehaviors),
    validateObjectStateDefinitions(scene.objectStateDefinitions),
    validateObjectRelationships(scene.objectRelationships),
    validateBehaviorDiagnostics(scene.behaviorDiagnostics),
    validateObjectDiagnostics(scene.objectDiagnostics),
    validateTimeline(scene.timeline),
    validateTimelineCollections(scene),
    validateAnimations(scene.animations),
    validateInteractions(scene.interactions),
    validateMetadata(scene.metadata),
    validateNarration(scene.narration),
    validateAudio(scene.audio)
  ]);

  errors.push(...nested.errors);
  warnings.push(...nested.warnings);

  return makeResult(errors, warnings, nested.repairable);
}
