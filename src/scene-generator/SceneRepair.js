import {
  createSafeScene,
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
  createDefaultDiagnostics,
  createDefaultObject,
  createDefaultTimelineStep,
  generateSceneScopedId
} from './SceneSchema.js';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toVector(value, fallback) {
  if (Array.isArray(value) && value.length === fallback.length) {
    const casted = value.map((item) => Number(item));
    if (casted.every((item) => Number.isFinite(item))) return casted;
  }
  return fallback;
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function computeStatistics(scene) {
  const timeline = ensureArray(scene.timeline);
  const objects = ensureArray(scene.objects);
  const animations = ensureArray(scene.animations);
  const interactions = ensureArray(scene.interactions);
  const labels = ensureArray(scene.labels);

  const totalDuration = timeline.reduce((sum, step) => sum + Number(step?.duration || 0), 0);

  return {
    objectCount: objects.length,
    timelineSteps: timeline.length,
    animationCount: animations.length,
    interactionCount: interactions.length,
    labelCount: labels.length,
    totalDuration: Number.isFinite(totalDuration) ? totalDuration : 0
  };
}

export function repairScene(sceneInput, validationInput = null) {
  const repairMessages = [];
  const source = isObject(sceneInput) ? { ...sceneInput } : {};

  if (!isObject(sceneInput)) {
    const safe = createSafeScene();
    safe.validation = {
      ...safe.validation,
      status: 'repaired',
      warnings: ['Input scene was invalid and replaced with a safe scene.']
    };
    safe.diagnostics = {
      ...safe.diagnostics,
      repairCount: 1,
      notes: [...(safe.diagnostics.notes || []), 'Recovered from non-object scene input.']
    };
    return safe;
  }

  const repaired = {
    ...source,
    sceneId: source.sceneId || generateSceneScopedId('scene'),
    version: source.version || 'v2',
    title: source.title || 'Untitled Scene',
    subject: source.subject || 'General Learning',
    classification: {
      ...createDefaultClassification(),
      ...(isObject(source.classification) ? source.classification : {})
    },
    environment: {
      ...createDefaultEnvironment(),
      ...(isObject(source.environment) ? source.environment : {})
    },
    camera: {
      ...createDefaultCamera(),
      ...(isObject(source.camera) ? source.camera : {})
    },
    timeline: ensureArray(source.timeline),
    objects: ensureArray(source.objects),
    educationalObjects: ensureArray(source.educationalObjects),
    educationalObjectInstances: ensureArray(source.educationalObjectInstances),
    objectBehaviors: ensureArray(source.objectBehaviors || source.behaviors || source.actions || source.events),
    objectStateDefinitions: ensureArray(source.objectStateDefinitions || source.states || source.transitions),
    objectRelationships: ensureArray(source.objectRelationships || source.relationships || source.links || source.dependencies),
    behaviorDiagnostics: isObject(source.behaviorDiagnostics)
      ? source.behaviorDiagnostics
      : {
          warningCount: 0,
          errorCount: 0,
          repairedCount: 0,
          items: []
        },
    objectDiagnostics: isObject(source.objectDiagnostics)
      ? {
          summary: isObject(source.objectDiagnostics.summary) ? source.objectDiagnostics.summary : {},
          items: ensureArray(source.objectDiagnostics.items)
        }
      : { summary: {}, items: [] },
    animations: ensureArray(source.animations),
    labels: ensureArray(source.labels),
    interactions: ensureArray(source.interactions),
    narration: {
      ...createDefaultNarration(),
      ...(isObject(source.narration) ? source.narration : {})
    },
    audio: {
      ...createDefaultAudio(),
      ...(isObject(source.audio) ? source.audio : {})
    },
    lighting: {
      ...createDefaultLighting(),
      ...(isObject(source.lighting) ? source.lighting : {})
    },
    physics: {
      ...createDefaultPhysics(),
      ...(isObject(source.physics) ? source.physics : {})
    },
    metadata: {
      ...createDefaultMetadata(),
      ...(isObject(source.metadata) ? source.metadata : {})
    },
    statistics: {
      ...createDefaultStatistics(),
      ...(isObject(source.statistics) ? source.statistics : {})
    },
    settings: {
      ...createDefaultSettings(),
      ...(isObject(source.settings) ? source.settings : {})
    },
    checkpoints: ensureArray(source.checkpoints),
    validation: {
      ...createDefaultValidation(),
      ...(isObject(source.validation) ? source.validation : {})
    },
    diagnostics: {
      ...createDefaultDiagnostics(),
      ...(isObject(source.diagnostics) ? source.diagnostics : {})
    }
  };

  if (!source.camera) repairMessages.push('Inserted default camera.');
  if (!source.environment) repairMessages.push('Inserted default environment.');
  if (!source.timeline) repairMessages.push('Inserted empty timeline.');
  if (!source.objects) repairMessages.push('Inserted empty objects list.');
  if (!source.educationalObjects) repairMessages.push('Inserted empty educationalObjects list.');
  if (!source.educationalObjectInstances) repairMessages.push('Inserted empty educationalObjectInstances list.');
  if (!source.objectBehaviors && !source.behaviors && !source.actions && !source.events) repairMessages.push('Inserted empty objectBehaviors list.');
  if (!source.objectStateDefinitions && !source.states && !source.transitions) repairMessages.push('Inserted empty objectStateDefinitions list.');
  if (!source.objectRelationships && !source.relationships && !source.links && !source.dependencies) repairMessages.push('Inserted empty objectRelationships list.');
  if (!source.behaviorDiagnostics) repairMessages.push('Inserted default behaviorDiagnostics.');
  if (!source.labels) repairMessages.push('Inserted empty labels list.');
  if (!source.narration) repairMessages.push('Inserted empty narration.');

  repaired.camera.position = toVector(repaired.camera.position, [0, 1.8, 5]);
  repaired.camera.rotation = toVector(repaired.camera.rotation, [0, 0, 0]);
  repaired.camera.target = toVector(repaired.camera.target, [0, 1, 0]);

  repaired.objects = repaired.objects.map((objectValue, index) => {
    const fallback = createDefaultObject(index);
    const nextObject = isObject(objectValue) ? objectValue : {};

    if (!nextObject.id) repairMessages.push(`Generated missing object id at index ${index}.`);

    return {
      ...fallback,
      ...nextObject,
      id: nextObject.id || generateSceneScopedId('obj'),
      type: nextObject.type || fallback.type,
      name: nextObject.name || fallback.name,
      position: toVector(nextObject.position, fallback.position),
      rotation: toVector(nextObject.rotation, fallback.rotation),
      scale: toVector(nextObject.scale, fallback.scale),
      visible: typeof nextObject.visible === 'boolean' ? nextObject.visible : fallback.visible,
      enabled: typeof nextObject.enabled === 'boolean' ? nextObject.enabled : fallback.enabled,
      interactive: typeof nextObject.interactive === 'boolean' ? nextObject.interactive : fallback.interactive,
      highlightable: typeof nextObject.highlightable === 'boolean' ? nextObject.highlightable : fallback.highlightable,
      clickable: typeof nextObject.clickable === 'boolean' ? nextObject.clickable : fallback.clickable,
      animationIds: ensureArray(nextObject.animationIds),
      labelIds: ensureArray(nextObject.labelIds),
      metadata: isObject(nextObject.metadata) ? nextObject.metadata : {},
      state: isObject(nextObject.state) ? nextObject.state : {},
      properties: isObject(nextObject.properties) ? nextObject.properties : {},
      extensions: isObject(nextObject.extensions) ? nextObject.extensions : {}
    };
  });

  repaired.timeline = repaired.timeline.map((step, index) => {
    const fallback = createDefaultTimelineStep(index);
    const nextStep = isObject(step) ? step : {};

    if (!nextStep.id) repairMessages.push(`Generated missing timeline step id at index ${index}.`);

    return {
      ...fallback,
      ...nextStep,
      id: nextStep.id || generateSceneScopedId('step'),
      order: Number.isFinite(Number(nextStep.order)) ? Number(nextStep.order) : index,
      title: nextStep.title || fallback.title,
      description: typeof nextStep.description === 'string' ? nextStep.description : '',
      duration: Number.isFinite(Number(nextStep.duration)) ? Number(nextStep.duration) : 0,
      camera: isObject(nextStep.camera) ? nextStep.camera : null,
      objects: ensureArray(nextStep.objects),
      animations: ensureArray(nextStep.animations),
      narration: nextStep.narration ?? null,
      interaction: nextStep.interaction ?? null,
      completionRule: isObject(nextStep.completionRule)
        ? nextStep.completionRule
        : { type: 'manual', value: null }
    };
  });

  const computedStatistics = computeStatistics(repaired);
  repaired.statistics = {
    ...repaired.statistics,
    ...computedStatistics
  };

  repaired.validation = {
    ...repaired.validation,
    status: validationInput?.status || 'repaired',
    warnings: [
      ...(Array.isArray(validationInput?.warnings) ? validationInput.warnings : []),
      ...repairMessages
    ],
    errors: Array.isArray(validationInput?.errors) ? validationInput.errors : [],
    repairable: true
  };

  repaired.diagnostics = {
    ...repaired.diagnostics,
    repairCount: (repaired.diagnostics.repairCount || 0) + repairMessages.length,
    notes: [
      ...(Array.isArray(repaired.diagnostics.notes) ? repaired.diagnostics.notes : []),
      ...repairMessages
    ]
  };

  if (!repaired.objects.length) {
    repaired.objects = createSafeScene().objects;
    repaired.diagnostics.notes.push('Inserted safe fallback object when no objects were available.');
  }

  return repaired;
}
