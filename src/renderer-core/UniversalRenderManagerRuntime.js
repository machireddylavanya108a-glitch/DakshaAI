const SCHEMA_VERSION = 'v1';

function safeString(value) {
  return String(value || '').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toKebab(value = '') {
  return safeString(value)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function createDiagnostics() {
  return {
    builds: 0,
    updates: 0,
    warnings: [],
    recoveries: 0
  };
}

function pushWarning(diagnostics, warning) {
  const message = safeString(warning);
  if (!message) return;
  diagnostics.warnings.push(message);
  if (diagnostics.warnings.length > 400) {
    diagnostics.warnings.shift();
  }
}

function toRendererObjects(renderBundle = null) {
  if (!isObject(renderBundle)) return [];
  return asArray(renderBundle.rendererObjects);
}

function selectNodePayload(entry = {}) {
  const payload = isObject(entry.payload) ? entry.payload : {};
  return {
    metadata: isObject(payload.metadata) ? payload.metadata : {},
    properties: isObject(payload.properties) ? payload.properties : {},
    runtimeData: isObject(payload.runtimeData) ? payload.runtimeData : {}
  };
}

function normalizeQualityProfile(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    qualityScore: clamp(toFiniteNumber(source.qualityScore, 0.6), 0, 1),
    profile: safeString(source.profile || 'balanced') || 'balanced',
    lodBias: Math.max(0, toFiniteNumber(source.lodBias, 1)),
    resolutionScale: clamp(toFiniteNumber(source.resolutionScale, 1), 0.5, 2),
    adaptiveRenderingEnabled: source.adaptiveRenderingEnabled !== false,
    deviceTier: safeString(source.deviceTier || 'adaptive') || 'adaptive',
    reasons: asArray(source.reasons)
  };
}

function normalizeDeviceCapabilities(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    gpuTier: clamp(toFiniteNumber(source.gpuTier, 2), 0, 5),
    cpuTier: clamp(toFiniteNumber(source.cpuTier, 2), 0, 5),
    memoryGb: clamp(toFiniteNumber(source.memoryGb, 8), 1, 256),
    pixelRatio: clamp(toFiniteNumber(source.pixelRatio, 1), 0.75, 4),
    targetFps: clamp(toFiniteNumber(source.targetFps, 60), 24, 240),
    thermalState: safeString(source.thermalState || 'nominal') || 'nominal'
  };
}

function deriveAdaptiveQualityProfile(context = {}) {
  const renderBundle = isObject(context.renderBundle) ? context.renderBundle : {};
  const metadata = isObject(context.runtimeMetadata) ? context.runtimeMetadata : {};
  const capabilities = normalizeDeviceCapabilities(context.deviceCapabilities || metadata.deviceCapabilities || {});

  const qualityHint = toFiniteNumber(
    metadata?.rendererCore?.qualityScore
      ?? metadata?.visualizationStrategy?.summary?.confidenceScore
      ?? metadata?.rendererAdapter?.qualityScore,
    0.65
  );
  const complexityHint = clamp(toFiniteNumber(renderBundle?.runtimeGraphSummary?.nodeCount, 0) / 500, 0, 1);
  const deviceScore = clamp((capabilities.gpuTier + capabilities.cpuTier) / 10, 0, 1);
  const memoryScore = clamp(capabilities.memoryGb / 24, 0, 1);
  const fpsScore = clamp(capabilities.targetFps / 120, 0, 1);
  const thermalPenalty = capabilities.thermalState === 'critical' ? 0.35 : capabilities.thermalState === 'hot' ? 0.2 : 0;

  const rawScore = (
    qualityHint * 0.38
    + deviceScore * 0.24
    + memoryScore * 0.2
    + fpsScore * 0.18
    - complexityHint * 0.15
    - thermalPenalty
  );

  const qualityScore = clamp(rawScore, 0, 1);
  const lodBias = clamp(1 + ((1 - qualityScore) * 2), 1, 3);
  const resolutionScale = clamp(0.75 + (qualityScore * 0.75), 0.5, 1.5);

  let profile = 'balanced';
  if (qualityScore >= 0.85) profile = 'ultra';
  else if (qualityScore >= 0.67) profile = 'high';
  else if (qualityScore < 0.4) profile = 'low';

  const reasons = [
    `nodeCount:${toFiniteNumber(renderBundle?.runtimeGraphSummary?.nodeCount, 0)}`,
    `gpuTier:${capabilities.gpuTier}`,
    `cpuTier:${capabilities.cpuTier}`,
    `memoryGb:${capabilities.memoryGb}`,
    `targetFps:${capabilities.targetFps}`,
    `thermalState:${capabilities.thermalState}`
  ];

  const deviceTier = qualityScore >= 0.75 ? 'high-capability' : qualityScore >= 0.45 ? 'mid-capability' : 'constrained-capability';

  return normalizeQualityProfile({
    qualityScore,
    profile,
    lodBias,
    resolutionScale,
    adaptiveRenderingEnabled: true,
    deviceTier,
    reasons
  });
}

function extractCameraMode(entry = {}) {
  const payload = selectNodePayload(entry);
  const cameraControl = isObject(payload.runtimeData.cameraControl) ? payload.runtimeData.cameraControl : {};
  const mode = safeString(
    cameraControl.mode
      || payload.properties.mode
      || payload.properties.cameraMode
      || payload.metadata.cameraMode
      || payload.metadata.mode
      || entry.kind
      || 'adaptive-camera'
  );

  return mode || 'adaptive-camera';
}

function extractLightingType(entry = {}) {
  const payload = selectNodePayload(entry);
  const runtimeLighting = isObject(payload.runtimeData.lighting) ? payload.runtimeData.lighting : {};
  const type = safeString(
    runtimeLighting.type
      || payload.properties.type
      || payload.properties.lightType
      || payload.metadata.lightType
      || entry.kind
      || 'adaptive-light'
  );

  return type || 'adaptive-light';
}

function extractEnvironmentType(entry = {}) {
  const payload = selectNodePayload(entry);
  const runtimeEnvironment = isObject(payload.runtimeData.environment) ? payload.runtimeData.environment : {};
  const type = safeString(
    runtimeEnvironment.type
      || payload.properties.type
      || payload.properties.environmentType
      || payload.metadata.environmentType
      || payload.metadata.preset
      || entry.kind
      || 'adaptive-environment'
  );

  return type || 'adaptive-environment';
}

function extractObjectFamily(entry = {}) {
  const sourceKey = toKebab(entry.sourceKey || entry.adapterType || entry.kind);
  if (sourceKey.includes('educational')) return 'educational-objects';
  if (sourceKey.includes('procedural')) return 'procedural-objects';
  if (sourceKey.includes('label')) return 'labels';
  if (sourceKey.includes('overlay')) return 'overlays';
  if (sourceKey.includes('hotspot')) return 'hotspots';
  if (sourceKey.includes('helper')) return 'helper-objects';
  if (sourceKey.includes('gizmo')) return 'gizmos';
  return 'future-object-types';
}

function resolveSelectionFromCommands(commands = [], fallback = null, keys = []) {
  for (let index = commands.length - 1; index >= 0; index -= 1) {
    const command = commands[index];
    const payload = isObject(command?.payload) ? command.payload : {};
    for (const key of keys) {
      const selected = safeString(payload[key]);
      if (selected) return selected;
    }
  }
  return fallback;
}

function normalizeManagerStatePatch(input = {}, fallback = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    activeId: safeString(source.activeId || fallback.activeId || '') || null,
    activeType: safeString(source.activeType || fallback.activeType || '') || null,
    entities: asArray(source.entities || fallback.entities || []),
    supportsUnknownFutureTypes: source.supportsUnknownFutureTypes !== false,
    commands: asArray(source.commands || fallback.commands || []),
    diagnostics: {
      builds: Math.max(0, toFiniteNumber(source?.diagnostics?.builds, fallback?.diagnostics?.builds || 0)),
      updates: Math.max(0, toFiniteNumber(source?.diagnostics?.updates, fallback?.diagnostics?.updates || 0)),
      warnings: asArray(source?.diagnostics?.warnings || fallback?.diagnostics?.warnings || []),
      recoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveries, fallback?.diagnostics?.recoveries || 0))
    }
  };
}

export class UniversalCameraManager {
  constructor(state = {}) {
    this.state = normalizeManagerStatePatch(state, {
      diagnostics: createDiagnostics(),
      commands: [
        'orbit',
        'free-camera',
        'cinematic-camera',
        'first-person',
        'follow-object',
        'focus-object',
        'reset',
        'fit-scene',
        'transition',
        'animation'
      ]
    });
  }

  build(context = {}) {
    const renderBundle = isObject(context.renderBundle) ? context.renderBundle : {};
    const cameras = toRendererObjects(renderBundle)
      .filter((entry) => entry.adapterType === 'camera' || toKebab(entry.sourceKey).includes('camera'))
      .map((entry) => {
        const payload = selectNodePayload(entry);
        return {
          cameraId: entry.renderId,
          nodeId: entry.nodeId,
          mode: extractCameraMode(entry),
          transform: {
            position: asArray(payload.properties.position || payload.runtimeData.position || []),
            rotation: asArray(payload.properties.rotation || payload.runtimeData.rotation || []),
            target: asArray(payload.properties.target || payload.runtimeData.target || [])
          },
          fov: toFiniteNumber(payload.properties.fov, toFiniteNumber(payload.runtimeData.fov, 55)),
          constraints: isObject(payload.properties.constraints) ? payload.properties.constraints : {},
          payload
        };
      });

    const activeId = cameras[0]?.cameraId || null;
    const activeType = cameras[0]?.mode || null;

    this.state = normalizeManagerStatePatch({
      ...this.state,
      activeId,
      activeType,
      entities: cameras,
      diagnostics: {
        ...this.state.diagnostics,
        builds: this.state.diagnostics.builds + 1
      }
    }, this.state);

    return this.snapshot();
  }

  update(context = {}) {
    const commands = asArray(context.commands);
    const requestedCameraId = resolveSelectionFromCommands(commands, this.state.activeId, ['cameraId', 'activeCameraId']);
    const requestedMode = resolveSelectionFromCommands(commands, this.state.activeType, ['cameraMode', 'mode']);

    const hasCamera = this.state.entities.some((entry) => entry.cameraId === requestedCameraId);
    const activeId = hasCamera ? requestedCameraId : this.state.entities[0]?.cameraId || null;

    this.state = normalizeManagerStatePatch({
      ...this.state,
      activeId,
      activeType: requestedMode || this.state.activeType,
      diagnostics: {
        ...this.state.diagnostics,
        updates: this.state.diagnostics.updates + 1
      }
    }, this.state);

    if (requestedCameraId && !hasCamera) {
      pushWarning(this.state.diagnostics, `Requested camera not found: ${requestedCameraId}. Fallback camera applied.`);
    }

    return this.snapshot();
  }

  snapshot() {
    return deepClone(this.state);
  }
}

export class UniversalLightingManager {
  constructor(state = {}) {
    this.state = normalizeManagerStatePatch(state, {
      diagnostics: createDiagnostics(),
      commands: [
        'directional',
        'ambient',
        'point',
        'spot',
        'area',
        'image-based-lighting',
        'procedural-lighting',
        'adaptive-lighting'
      ]
    });
  }

  build(context = {}) {
    const renderBundle = isObject(context.renderBundle) ? context.renderBundle : {};
    const quality = normalizeQualityProfile(context.qualityProfile || {});

    const lights = toRendererObjects(renderBundle)
      .filter((entry) => entry.adapterType === 'light' || toKebab(entry.sourceKey).includes('light'))
      .map((entry) => {
        const payload = selectNodePayload(entry);
        return {
          lightId: entry.renderId,
          nodeId: entry.nodeId,
          type: extractLightingType(entry),
          intensity: clamp(toFiniteNumber(payload.properties.intensity, 1) * quality.qualityScore, 0, 5),
          color: safeString(payload.properties.color || '#ffffff') || '#ffffff',
          shadowQuality: quality.profile,
          payload
        };
      });

    const activeId = lights[0]?.lightId || null;
    const activeType = lights[0]?.type || null;

    this.state = normalizeManagerStatePatch({
      ...this.state,
      activeId,
      activeType,
      entities: lights,
      diagnostics: {
        ...this.state.diagnostics,
        builds: this.state.diagnostics.builds + 1
      }
    }, this.state);

    return this.snapshot();
  }

  update(context = {}) {
    const quality = normalizeQualityProfile(context.qualityProfile || {});

    this.state.entities = this.state.entities.map((entry) => ({
      ...entry,
      intensity: clamp(toFiniteNumber(entry.intensity, 1) * (0.6 + quality.qualityScore * 0.6), 0, 5),
      shadowQuality: quality.profile
    }));

    this.state.diagnostics.updates += 1;
    return this.snapshot();
  }

  snapshot() {
    return deepClone(this.state);
  }
}

export class UniversalEnvironmentManager {
  constructor(state = {}) {
    this.state = normalizeManagerStatePatch(state, {
      diagnostics: createDiagnostics(),
      commands: [
        'hdr',
        'sky',
        'procedural-background',
        'classroom',
        'laboratory',
        'outdoor',
        'space',
        'medical',
        'engineering',
        'adaptive-environment'
      ]
    });
  }

  build(context = {}) {
    const renderBundle = isObject(context.renderBundle) ? context.renderBundle : {};
    const quality = normalizeQualityProfile(context.qualityProfile || {});

    const explicitEnvironments = toRendererObjects(renderBundle)
      .filter((entry) => entry.adapterType === 'environment' || toKebab(entry.sourceKey).includes('environment'))
      .map((entry) => {
        const payload = selectNodePayload(entry);
        return {
          environmentId: entry.renderId,
          nodeId: entry.nodeId,
          type: extractEnvironmentType(entry),
          backgroundType: safeString(payload.properties?.background?.type || payload.properties.backgroundType || payload.runtimeData.backgroundType || 'adaptive'),
          exposure: clamp(toFiniteNumber(payload.properties.exposure, 1) * (0.8 + quality.qualityScore * 0.4), 0.2, 2),
          sky: isObject(payload.properties.sky) ? payload.properties.sky : {},
          hdr: isObject(payload.properties.hdr) ? payload.properties.hdr : {},
          payload
        };
      });

    const sceneLevelFallback = toRendererObjects(renderBundle)
      .filter((entry) => entry.nodeId === 'scene-root' || toKebab(entry.sourceKey).includes('scene'))
      .map((entry) => {
        const payload = selectNodePayload(entry);
        const environment = isObject(payload.properties.environment) ? payload.properties.environment : {};
        return {
          environmentId: `${entry.renderId}-scene-environment`,
          nodeId: entry.nodeId,
          type: safeString(environment.type || environment.preset || 'adaptive-environment') || 'adaptive-environment',
          backgroundType: safeString(environment?.background?.type || 'adaptive') || 'adaptive',
          exposure: clamp(toFiniteNumber(environment.exposure, 1), 0.2, 2),
          sky: isObject(environment.sky) ? environment.sky : {},
          hdr: isObject(environment.hdr) ? environment.hdr : {},
          payload
        };
      });

    const environments = explicitEnvironments.length ? explicitEnvironments : sceneLevelFallback;
    const activeId = environments[0]?.environmentId || null;
    const activeType = environments[0]?.type || null;

    this.state = normalizeManagerStatePatch({
      ...this.state,
      activeId,
      activeType,
      entities: environments,
      diagnostics: {
        ...this.state.diagnostics,
        builds: this.state.diagnostics.builds + 1
      }
    }, this.state);

    return this.snapshot();
  }

  update(context = {}) {
    const commands = asArray(context.commands);
    const requestedType = resolveSelectionFromCommands(commands, this.state.activeType, ['environmentType', 'type']);

    if (requestedType) {
      const selected = this.state.entities.find((entry) => safeString(entry.type) === requestedType);
      if (selected) {
        this.state.activeId = selected.environmentId;
        this.state.activeType = selected.type;
      } else {
        pushWarning(this.state.diagnostics, `Requested environment type not found: ${requestedType}. Active environment unchanged.`);
      }
    }

    this.state.diagnostics.updates += 1;
    return this.snapshot();
  }

  snapshot() {
    return deepClone(this.state);
  }
}

export class UniversalObjectRenderManager {
  constructor(state = {}) {
    this.state = normalizeManagerStatePatch(state, {
      diagnostics: createDiagnostics(),
      commands: [
        'educational-objects',
        'procedural-objects',
        'labels',
        'overlays',
        'hotspots',
        'helper-objects',
        'gizmos',
        'future-object-types'
      ]
    });
  }

  build(context = {}) {
    const renderBundle = isObject(context.renderBundle) ? context.renderBundle : {};
    const quality = normalizeQualityProfile(context.qualityProfile || {});

    const objects = toRendererObjects(renderBundle)
      .filter((entry) => entry.adapterType !== 'camera' && entry.adapterType !== 'light' && entry.adapterType !== 'environment')
      .map((entry) => {
        const payload = selectNodePayload(entry);
        const family = extractObjectFamily(entry);
        const lodHint = toFiniteNumber(payload.runtimeData?.lod?.level ?? payload.properties?.lod?.level ?? payload.properties.lodLevel, quality.lodBias);

        return {
          renderId: entry.renderId,
          nodeId: entry.nodeId,
          family,
          adapterType: entry.adapterType,
          visible: payload.properties.visible !== false,
          lodLevel: Math.max(0, Math.round(lodHint)),
          qualityProfile: quality.profile,
          resolutionScale: quality.resolutionScale,
          payload
        };
      });

    this.state = normalizeManagerStatePatch({
      ...this.state,
      activeId: objects[0]?.renderId || null,
      activeType: objects[0]?.family || null,
      entities: objects,
      diagnostics: {
        ...this.state.diagnostics,
        builds: this.state.diagnostics.builds + 1
      }
    }, this.state);

    return this.snapshot();
  }

  update(context = {}) {
    const quality = normalizeQualityProfile(context.qualityProfile || {});
    const commands = asArray(context.commands);

    const visibilityByNodeId = new Map();
    commands.forEach((command) => {
      const payload = isObject(command?.payload) ? command.payload : {};
      const nodeId = safeString(command?.nodeId || payload.nodeId);
      if (!nodeId) return;
      if (payload.visible === undefined) return;
      visibilityByNodeId.set(nodeId, payload.visible !== false);
    });

    this.state.entities = this.state.entities.map((entry) => ({
      ...entry,
      visible: visibilityByNodeId.has(entry.nodeId) ? visibilityByNodeId.get(entry.nodeId) : entry.visible,
      qualityProfile: quality.profile,
      resolutionScale: quality.resolutionScale,
      lodLevel: Math.max(0, Math.round(entry.lodLevel * (0.6 + (1 - quality.qualityScore) * 0.7)))
    }));

    this.state.diagnostics.updates += 1;
    return this.snapshot();
  }

  snapshot() {
    return deepClone(this.state);
  }
}

function normalizeRuntimeState(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    diagnostics: {
      builds: Math.max(0, toFiniteNumber(source?.diagnostics?.builds, 0)),
      updates: Math.max(0, toFiniteNumber(source?.diagnostics?.updates, 0)),
      warnings: asArray(source?.diagnostics?.warnings),
      recoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveries, 0))
    },
    qualityProfile: normalizeQualityProfile(source.qualityProfile || {}),
    deviceCapabilities: normalizeDeviceCapabilities(source.deviceCapabilities || {}),
    camera: normalizeManagerStatePatch(source.camera || {}, {
      diagnostics: createDiagnostics(),
      commands: []
    }),
    lighting: normalizeManagerStatePatch(source.lighting || {}, {
      diagnostics: createDiagnostics(),
      commands: []
    }),
    environment: normalizeManagerStatePatch(source.environment || {}, {
      diagnostics: createDiagnostics(),
      commands: []
    }),
    objects: normalizeManagerStatePatch(source.objects || {}, {
      diagnostics: createDiagnostics(),
      commands: []
    })
  };
}

function migrateRuntimeState(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === SCHEMA_VERSION) {
    return normalizeRuntimeState(source);
  }

  return normalizeRuntimeState({
    schemaVersion: SCHEMA_VERSION,
    diagnostics: {
      ...(isObject(source.diagnostics) ? source.diagnostics : {}),
      warnings: [
        ...asArray(source?.diagnostics?.warnings),
        'Universal render manager runtime migrated from legacy format.'
      ]
    },
    qualityProfile: source.qualityProfile || source.adaptiveQuality,
    deviceCapabilities: source.deviceCapabilities,
    camera: source.camera,
    lighting: source.lighting,
    environment: source.environment,
    objects: source.objects || source.objectRender
  });
}

export class UniversalRenderManagerRuntime {
  constructor(state = {}) {
    this.state = migrateRuntimeState(state);
    this.cameraManager = new UniversalCameraManager(this.state.camera);
    this.lightingManager = new UniversalLightingManager(this.state.lighting);
    this.environmentManager = new UniversalEnvironmentManager(this.state.environment);
    this.objectRenderManager = new UniversalObjectRenderManager(this.state.objects);
  }

  warn(message = 'Unknown render manager warning') {
    pushWarning(this.state.diagnostics, message);
  }

  validateContext(context = {}) {
    const errors = [];
    const warnings = [];

    if (!isObject(context.renderBundle)) {
      errors.push('Render manager runtime requires a render bundle.');
    }

    if (!Array.isArray(context?.renderBundle?.rendererObjects)) {
      errors.push('Render manager runtime expects renderBundle.rendererObjects array.');
    }

    if (!isObject(context.runtimeMetadata)) {
      warnings.push('Runtime metadata missing; managers will use conservative defaults.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  build(context = {}) {
    const validation = this.validateContext(context);
    validation.warnings.forEach((warning) => this.warn(warning));
    if (!validation.valid) {
      validation.errors.forEach((error) => this.warn(error));
      return {
        status: 'failed',
        errors: validation.errors,
        warnings: validation.warnings,
        state: this.snapshot()
      };
    }

    const qualityProfile = deriveAdaptiveQualityProfile(context);
    const deviceCapabilities = normalizeDeviceCapabilities(context.deviceCapabilities || {});

    const camera = this.cameraManager.build({ ...context, qualityProfile });
    const lighting = this.lightingManager.build({ ...context, qualityProfile });
    const environment = this.environmentManager.build({ ...context, qualityProfile });
    const objects = this.objectRenderManager.build({ ...context, qualityProfile });

    this.state = normalizeRuntimeState({
      ...this.state,
      qualityProfile,
      deviceCapabilities,
      camera,
      lighting,
      environment,
      objects,
      diagnostics: {
        ...this.state.diagnostics,
        builds: this.state.diagnostics.builds + 1
      }
    });

    return {
      status: 'built',
      errors: [],
      warnings: validation.warnings,
      state: this.snapshot()
    };
  }

  update(context = {}) {
    const qualityProfile = deriveAdaptiveQualityProfile({
      ...context,
      deviceCapabilities: context.deviceCapabilities || this.state.deviceCapabilities
    });

    const camera = this.cameraManager.update({ ...context, qualityProfile });
    const lighting = this.lightingManager.update({ ...context, qualityProfile });
    const environment = this.environmentManager.update({ ...context, qualityProfile });
    const objects = this.objectRenderManager.update({ ...context, qualityProfile });

    this.state = normalizeRuntimeState({
      ...this.state,
      qualityProfile,
      deviceCapabilities: normalizeDeviceCapabilities(context.deviceCapabilities || this.state.deviceCapabilities),
      camera,
      lighting,
      environment,
      objects,
      diagnostics: {
        ...this.state.diagnostics,
        updates: this.state.diagnostics.updates + 1
      }
    });

    return {
      status: 'updated',
      state: this.snapshot()
    };
  }

  serialize() {
    return JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      state: this.state,
      persistedAt: Date.now()
    });
  }

  deserialize(serialized = '') {
    if (!serialized) return this.snapshot();

    let parsed = null;
    if (typeof serialized === 'string') {
      try {
        parsed = JSON.parse(serialized);
      } catch {
        parsed = null;
      }
    } else if (isObject(serialized)) {
      parsed = serialized;
    }

    if (!parsed) {
      this.warn('Failed to deserialize universal render manager runtime state.');
      return this.snapshot();
    }

    this.state = migrateRuntimeState(parsed.state || parsed);
    this.state.diagnostics.recoveries += 1;
    this.cameraManager = new UniversalCameraManager(this.state.camera);
    this.lightingManager = new UniversalLightingManager(this.state.lighting);
    this.environmentManager = new UniversalEnvironmentManager(this.state.environment);
    this.objectRenderManager = new UniversalObjectRenderManager(this.state.objects);

    return this.snapshot();
  }

  snapshot() {
    return normalizeRuntimeState({
      ...this.state,
      camera: this.cameraManager.snapshot(),
      lighting: this.lightingManager.snapshot(),
      environment: this.environmentManager.snapshot(),
      objects: this.objectRenderManager.snapshot()
    });
  }
}

export {
  normalizeQualityProfile,
  normalizeDeviceCapabilities,
  deriveAdaptiveQualityProfile,
  normalizeRuntimeState,
  migrateRuntimeState
};
