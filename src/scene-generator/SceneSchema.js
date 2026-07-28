export const SCENE_SCHEMA_LATEST_VERSION = 'v2';
export const SCENE_SCHEMA_SUPPORTED_VERSIONS = ['v1', 'v2'];

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix = 'scene') {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // Ignore runtime crypto access errors.
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function createDefaultClassification() {
  return {
    domain: 'Custom',
    subDomain: 'Open Topic',
    visualization: 'Adaptive',
    sceneComplexity: 'medium',
    objectCategory: 'Dynamic',
    animationCategory: 'Guided Motion',
    interactionCategory: 'Generic Exploration'
  };
}

export function createDefaultEnvironment() {
  return {
    id: createId('env'),
    preset: 'classroom',
    sky: {
      type: 'solid',
      color: '#f4f7fb'
    },
    floor: {
      type: 'plane',
      color: '#fdfdfd',
      grid: false
    },
    fog: {
      enabled: false,
      color: '#ffffff',
      near: 10,
      far: 60
    },
    lighting: {
      profile: 'white',
      ambient: 0.7,
      directional: 0.9,
      color: '#ffffff'
    },
    background: {
      type: 'solid',
      value: '#f4f7fb'
    },
    effects: []
  };
}

export function createDefaultCamera() {
  return {
    position: [0, 1.8, 5],
    rotation: [0, 0, 0],
    target: [0, 1, 0],
    fov: 55,
    zoom: 1,
    near: 0.1,
    far: 1000,
    movement: {
      mode: 'orbit',
      speed: 1,
      damping: 0.1
    },
    constraints: {
      minDistance: 1,
      maxDistance: 30,
      minPolarAngle: 0.1,
      maxPolarAngle: 3.0
    }
  };
}

export function createDefaultNarration() {
  return {
    enabled: false,
    language: 'en',
    text: '',
    segments: [],
    links: []
  };
}

export function createDefaultAudio() {
  return {
    enabled: false,
    tracks: [],
    voice: null,
    bgm: null,
    sfx: []
  };
}

export function createDefaultLighting() {
  return {
    mode: 'white',
    intensity: 1,
    ambient: 0.7,
    directional: 0.9,
    color: '#ffffff'
  };
}

export function createDefaultPhysics() {
  return {
    enabled: false,
    gravity: [0, -9.81, 0],
    collisions: false,
    timeStep: 0.016
  };
}

export function createDefaultMetadata() {
  return {
    source: 'unknown',
    sourceType: 'unknown',
    createdAt: nowIso(),
    updatedAt: nowIso(),
    tags: [],
    author: 'Daksha AI'
  };
}

export function createDefaultStatistics() {
  return {
    objectCount: 0,
    timelineSteps: 0,
    animationCount: 0,
    interactionCount: 0,
    labelCount: 0,
    totalDuration: 0
  };
}

export function createDefaultSettings() {
  return {
    autoPlay: false,
    loop: false,
    showLabels: true,
    quality: 'balanced'
  };
}

export function createDefaultValidation() {
  return {
    status: 'unknown',
    errors: [],
    warnings: [],
    repairable: true
  };
}

export function createDefaultDiagnostics() {
  return {
    schemaVersion: SCENE_SCHEMA_LATEST_VERSION,
    repairCount: 0,
    validationWarnings: 0,
    validationErrors: 0,
    normalizationDurationMs: 0,
    repairDurationMs: 0,
    generationDurationMs: 0,
    integrityWarnings: 0,
    integrityErrors: 0,
    notes: []
  };
}

export function createDefaultObject(index = 0) {
  return {
    id: createId('obj'),
    type: 'generic',
    name: `Object ${index + 1}`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    enabled: true,
    interactive: false,
    highlightable: false,
    clickable: false,
    animationIds: [],
    labelIds: [],
    metadata: {},
    state: {},
    properties: {},
    extensions: {}
  };
}

export function createDefaultTimelineStep(index = 0) {
  return {
    id: createId('step'),
    order: index,
    title: `Step ${index + 1}`,
    description: '',
    duration: 0,
    camera: null,
    objects: [],
    animations: [],
    narration: null,
    interaction: null,
    completionRule: {
      type: 'manual',
      value: null
    }
  };
}

export function createSafeScene(overrides = {}) {
  const base = {
    sceneId: createId('scene'),
    version: SCENE_SCHEMA_LATEST_VERSION,
    title: 'Safe Scene',
    subject: 'General Learning',
    classification: createDefaultClassification(),
    environment: createDefaultEnvironment(),
    camera: createDefaultCamera(),
    timeline: [],
    objects: [
      {
        ...createDefaultObject(0),
        name: 'Lesson Board',
        type: 'board',
        interactive: false,
        clickable: false,
        highlightable: false
      }
    ],
    animations: [],
    educationalObjects: [],
    educationalObjectInstances: [],
    objectDiagnostics: {
      summary: {
        objectCount: 0,
        instanceCount: 0,
        warningCount: 0,
        errorCount: 0,
        fallbackCount: 0
      },
      items: []
    },
    labels: [],
    interactions: [],
    narration: createDefaultNarration(),
    audio: createDefaultAudio(),
    lighting: createDefaultLighting(),
    physics: createDefaultPhysics(),
    metadata: createDefaultMetadata(),
    statistics: createDefaultStatistics(),
    settings: createDefaultSettings(),
    checkpoints: [],
    validation: createDefaultValidation(),
    diagnostics: createDefaultDiagnostics()
  };

  return {
    ...base,
    ...overrides,
    classification: {
      ...base.classification,
      ...(overrides.classification || {})
    },
    environment: {
      ...base.environment,
      ...(overrides.environment || {})
    },
    camera: {
      ...base.camera,
      ...(overrides.camera || {})
    },
    narration: {
      ...base.narration,
      ...(overrides.narration || {})
    },
    educationalObjects: Array.isArray(overrides.educationalObjects) ? overrides.educationalObjects : base.educationalObjects,
    educationalObjectInstances: Array.isArray(overrides.educationalObjectInstances)
      ? overrides.educationalObjectInstances
      : base.educationalObjectInstances,
    objectDiagnostics: {
      ...base.objectDiagnostics,
      ...(overrides.objectDiagnostics || {})
    },
    audio: {
      ...base.audio,
      ...(overrides.audio || {})
    },
    lighting: {
      ...base.lighting,
      ...(overrides.lighting || {})
    },
    physics: {
      ...base.physics,
      ...(overrides.physics || {})
    },
    metadata: {
      ...base.metadata,
      ...(overrides.metadata || {})
    },
    statistics: {
      ...base.statistics,
      ...(overrides.statistics || {})
    },
    settings: {
      ...base.settings,
      ...(overrides.settings || {})
    },
    validation: {
      ...base.validation,
      ...(overrides.validation || {})
    },
    diagnostics: {
      ...base.diagnostics,
      ...(overrides.diagnostics || {})
    }
  };
}

export function generateSceneScopedId(prefix) {
  return createId(prefix);
}
