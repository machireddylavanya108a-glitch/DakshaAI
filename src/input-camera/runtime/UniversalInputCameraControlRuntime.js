import {
  DEFAULT_INPUT_CAMERA_RUNTIME_CONFIG,
  SUPPORTED_CAMERA_MODES,
  SUPPORTED_INPUT_DEVICE_TYPES,
  asArray,
  clamp,
  isObject,
  normalizeCameraMode,
  normalizeInputDeviceType,
  toFiniteNumber
} from './UniversalInputCameraControlConfig.js';

const STORE_KEY = '__daksha_input_camera_runtime_store__';

function createInMemoryStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }

  const store = globalThis[STORE_KEY];
  return {
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    getItem(key) {
      return store.get(String(key)) || null;
    },
    removeItem(key) {
      store.delete(String(key));
    }
  };
}

function createDefaultPersistenceAdapter() {
  const local = globalThis?.localStorage;
  if (local && typeof local.getItem === 'function' && typeof local.setItem === 'function') {
    return local;
  }

  return createInMemoryStore();
}

function parsePayload(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return isObject(value) ? value : null;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createChannelSet() {
  return new Map();
}

function safeEmit(listenersMap, channel, payload) {
  const listeners = listenersMap.get(channel);
  if (!listeners || listeners.size === 0) return;

  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // Listener failures are isolated from input camera runtime flow.
    }
  });
}

function toVector3(value, fallback = [0, 0, 0]) {
  const source = Array.isArray(value) ? value : fallback;
  if (!Array.isArray(source) || source.length < 3) {
    return [...fallback];
  }

  return [
    toFiniteNumber(source[0], fallback[0]),
    toFiniteNumber(source[1], fallback[1]),
    toFiniteNumber(source[2], fallback[2])
  ];
}

function vectorAdd(a = [0, 0, 0], b = [0, 0, 0]) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vectorSub(a = [0, 0, 0], b = [0, 0, 0]) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function vectorScale(a = [0, 0, 0], value = 1) {
  return [a[0] * value, a[1] * value, a[2] * value];
}

function vectorLength(a = [0, 0, 0]) {
  return Math.sqrt((a[0] ** 2) + (a[1] ** 2) + (a[2] ** 2));
}

function getRuntimeTimeMs(scheduler) {
  const snapshot = scheduler?.snapshot?.() || {};
  return Math.max(0, toFiniteNumber(snapshot?.clock?.timeMs, 0));
}

function getRuntimeGraphNodes(runtime = {}) {
  const nodes = runtime?.graph?.toJSON?.()?.nodes;
  return Array.isArray(nodes) ? nodes : [];
}

function collectObjectFocusPoints(runtime = {}) {
  const nodes = getRuntimeGraphNodes(runtime);
  const points = {};

  nodes.forEach((node) => {
    const sourceKey = String(node?.metadata?.sourceKey || '').toLowerCase();
    const isObjectNode = sourceKey === 'objects' || sourceKey === 'educationalobjects' || sourceKey === 'educationalobjectinstances';
    if (!isObjectNode) return;

    const position = toVector3(
      node?.runtimeData?.cameraControl?.focusPoint
      || node?.properties?.position
      || node?.properties?.cameraFocusPoint
      || node?.properties?.target,
      [0, 0, 0]
    );

    points[String(node.id || '')] = {
      objectId: String(node.id || ''),
      position,
      boundsRadius: Math.max(0.1, toFiniteNumber(node?.properties?.boundsRadius ?? node?.properties?.size ?? 1, 1))
    };
  });

  return points;
}

function createCameraDefaults(runtime = {}, options = {}) {
  const metadataCamera = isObject(runtime?.metadata?.camera) ? runtime.metadata.camera : {};
  const movement = isObject(metadataCamera.movement) ? metadataCamera.movement : {};
  const modeInfo = normalizeCameraMode(movement.mode || 'orbit');
  const constraints = {
    ...DEFAULT_INPUT_CAMERA_RUNTIME_CONFIG.constraints,
    ...(isObject(options?.constraints) ? options.constraints : {}),
    ...(isObject(metadataCamera?.constraints) ? metadataCamera.constraints : {})
  };

  const modeCandidates = [
    movement.mode,
    ...(Array.isArray(metadataCamera?.supportedModes) ? metadataCamera.supportedModes : []),
    ...(Array.isArray(options?.supportedCameraModes) ? options.supportedCameraModes : [])
  ]
    .map((item) => normalizeCameraMode(item))
    .filter((item) => item.mode);

  const availableModes = [...new Set([
    ...SUPPORTED_CAMERA_MODES,
    ...modeCandidates.map((item) => item.mode)
  ])];

  return {
    currentMode: modeInfo.mode,
    knownMode: modeInfo.known,
    availableModes,
    position: toVector3(metadataCamera.position, [0, 1.8, 5]),
    rotation: toVector3(metadataCamera.rotation, [0, 0, 0]),
    target: toVector3(metadataCamera.target, [0, 1, 0]),
    zoom: clamp(toFiniteNumber(metadataCamera.zoom, 1), constraints.minZoom, constraints.maxZoom),
    constraints,
    transition: {
      active: false,
      fromMode: modeInfo.mode,
      toMode: modeInfo.mode,
      startedAt: null,
      durationMs: Math.max(100, toFiniteNumber(options?.smoothTransitionDurationMs, DEFAULT_INPUT_CAMERA_RUNTIME_CONFIG.smoothTransitionDurationMs)),
      easing: 'ease-in-out'
    }
  };
}

function clampPosition(position = [0, 0, 0], constraints = {}) {
  return [
    clamp(position[0], toFiniteNumber(constraints.minX, -100), toFiniteNumber(constraints.maxX, 100)),
    clamp(position[1], toFiniteNumber(constraints.minY, -100), toFiniteNumber(constraints.maxY, 100)),
    clamp(position[2], toFiniteNumber(constraints.minZ, -100), toFiniteNumber(constraints.maxZ, 100))
  ];
}

function clampCameraDistance(position = [0, 0, 0], target = [0, 0, 0], constraints = {}) {
  const offset = vectorSub(position, target);
  const distance = vectorLength(offset);
  const minDistance = Math.max(0.01, toFiniteNumber(constraints.minDistance, 1));
  const maxDistance = Math.max(minDistance, toFiniteNumber(constraints.maxDistance, 40));

  if (distance <= maxDistance && distance >= minDistance) {
    return position;
  }

  const safeDistance = clamp(distance, minDistance, maxDistance);
  const unit = distance > 0 ? vectorScale(offset, 1 / distance) : [0, 0, 1];
  return vectorAdd(target, vectorScale(unit, safeDistance));
}

function sanitizeRuntimeEvent(event = {}, fallbackTimeMs = 0) {
  const source = isObject(event) ? event : {};
  return {
    eventId: String(source.eventId || `input-camera-event-${Date.now()}`),
    type: String(source.type || 'input-camera-event').trim() || 'input-camera-event',
    action: String(source.action || source.type || 'unknown').trim() || 'unknown',
    deviceType: String(source.deviceType || 'unknown-device').trim() || 'unknown-device',
    knownDeviceType: source.knownDeviceType !== false,
    cameraMode: String(source.cameraMode || '').trim() || null,
    knownCameraMode: source.knownCameraMode !== false,
    payload: isObject(source.payload) ? source.payload : {},
    targetObjectId: String(source.targetObjectId || '').trim() || null,
    timelineTimeMs: Math.max(0, toFiniteNumber(source.timelineTimeMs, fallbackTimeMs)),
    metadata: isObject(source.metadata) ? source.metadata : {},
    checkpointId: String(source.checkpointId || '').trim() || null,
    timestamp: Date.now()
  };
}

export class UniversalInputCameraControlRuntime {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_INPUT_CAMERA_RUNTIME_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.sceneEventRuntime = runtime?.sceneEventRuntime || runtime?.sceneEventSystem || null;
    this.interactionContractRuntime = runtime?.interactionContractRuntime || null;
    this.persistenceAdapter = this.options.persistenceAdapter || this.scheduler?.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = String(this.options.persistenceKey || DEFAULT_INPUT_CAMERA_RUNTIME_CONFIG.persistenceKey);

    this.listeners = createChannelSet();
    this.unsubscribers = [];

    const cameraDefaults = createCameraDefaults(runtime, this.options);

    this.state = {
      schemaVersion: 'v1',
      sceneId: runtime?.sceneId || null,
      timelineTimeMs: getRuntimeTimeMs(this.scheduler),
      inputLayer: {
        devices: {},
        registeredTypes: [],
        unknownDeviceTypes: [],
        history: []
      },
      camera: {
        ...cameraDefaults,
        modeProfile: this.resolveModeProfile(cameraDefaults.currentMode),
        focusPointsByObjectId: collectObjectFocusPoints(runtime)
      },
      metrics: {
        registeredDeviceCount: 0,
        knownDeviceCount: 0,
        unknownDeviceCount: 0,
        inputEventCount: 0,
        cameraMutationCount: 0,
        unknownCameraModeCount: cameraDefaults.knownMode ? 0 : 1,
        transitionCount: 0,
        validationErrors: 0
      },
      diagnostics: {
        synchronizations: 0,
        persistedSessions: 0,
        recoveredSessions: 0,
        warnings: []
      },
      runtimeEvents: {
        recent: []
      },
      recovery: {
        interrupted: false,
        lastCheckpointId: null,
        resumeTimeMs: 0
      }
    };

    this.attachScheduler(this.scheduler);
    this.attachSceneEventRuntime(this.sceneEventRuntime);
    this.attachInteractionContractRuntime(this.interactionContractRuntime);

    this.synchronize('boot');
  }

  on(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    if (typeof listener !== 'function') {
      throw new Error('UniversalInputCameraControlRuntime listener must be a function.');
    }

    if (!this.listeners.has(safeChannel)) {
      this.listeners.set(safeChannel, new Set());
    }

    this.listeners.get(safeChannel).add(listener);
    return () => this.off(safeChannel, listener);
  }

  off(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    const listeners = this.listeners.get(safeChannel);
    if (!listeners) return false;
    return listeners.delete(listener);
  }

  emit(channel, payload = {}) {
    const safeChannel = String(channel || '').trim() || 'input-camera-event';
    const message = {
      channel: safeChannel,
      payload,
      state: this.snapshot(),
      timestamp: Date.now()
    };

    safeEmit(this.listeners, safeChannel, message);
    safeEmit(this.listeners, '*', message);
    return message;
  }

  resolveModeProfile(mode = 'orbit') {
    const normalizedMode = normalizeCameraMode(mode);
    const profile = isObject(this.options?.modeProfiles?.[normalizedMode.mode])
      ? this.options.modeProfiles[normalizedMode.mode]
      : {
        movementSpeed: 1,
        rotationSpeed: 1,
        zoomSpeed: 1,
        panSpeed: 1,
        damping: 0.1
      };

    return {
      mode: normalizedMode.mode,
      knownMode: normalizedMode.known,
      movementSpeed: Math.max(0, toFiniteNumber(profile.movementSpeed, 1)),
      rotationSpeed: Math.max(0, toFiniteNumber(profile.rotationSpeed, 1)),
      zoomSpeed: Math.max(0, toFiniteNumber(profile.zoomSpeed, 1)),
      panSpeed: Math.max(0, toFiniteNumber(profile.panSpeed, 1)),
      damping: clamp(toFiniteNumber(profile.damping, 0.1), 0, 1)
    };
  }

  pushWarning(message = 'Unknown warning') {
    this.state.diagnostics.warnings.push(String(message));
    if (this.state.diagnostics.warnings.length > Math.max(10, toFiniteNumber(this.options.maxWarnings, 200))) {
      this.state.diagnostics.warnings.shift();
    }
  }

  validateInputEvent(event = {}) {
    const errors = [];
    const source = isObject(event) ? event : {};

    if (!source.action && !source.type) {
      errors.push('Input event requires action or type.');
    }

    if (source.delta && !isObject(source.delta)) {
      errors.push('Input event delta must be an object when provided.');
    }

    if (source.payload && !isObject(source.payload)) {
      errors.push('Input event payload must be an object when provided.');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  registerInputDevice(device = {}) {
    const source = isObject(device) ? device : {};
    const normalizedType = normalizeInputDeviceType(source.deviceType || source.type || 'unknown-device');

    const existing = this.state.inputLayer.devices[normalizedType.type] || {
      type: normalizedType.type,
      known: normalizedType.known,
      metadata: {},
      registeredAt: Date.now(),
      lastSeenAt: Date.now(),
      active: true
    };

    this.state.inputLayer.devices[normalizedType.type] = {
      ...existing,
      known: normalizedType.known,
      metadata: {
        ...(isObject(existing.metadata) ? existing.metadata : {}),
        ...(isObject(source.metadata) ? source.metadata : {})
      },
      lastSeenAt: Date.now(),
      active: source.active !== false
    };

    this.state.inputLayer.registeredTypes = Object.keys(this.state.inputLayer.devices);
    this.state.inputLayer.unknownDeviceTypes = this.state.inputLayer.registeredTypes.filter((type) => this.state.inputLayer.devices[type]?.known === false);

    this.state.metrics.registeredDeviceCount = this.state.inputLayer.registeredTypes.length;
    this.state.metrics.knownDeviceCount = this.state.inputLayer.registeredTypes.filter((type) => this.state.inputLayer.devices[type]?.known !== false).length;
    this.state.metrics.unknownDeviceCount = this.state.inputLayer.unknownDeviceTypes.length;

    this.emit('input-device-registered', {
      deviceType: normalizedType.type,
      known: normalizedType.known
    });

    this.synchronize('register-input-device');
    return this.snapshot();
  }

  startTransition(nextMode = 'orbit', options = {}) {
    this.state.camera.transition = {
      active: true,
      fromMode: this.state.camera.currentMode,
      toMode: nextMode,
      startedAt: Date.now(),
      durationMs: Math.max(100, toFiniteNumber(options.durationMs, this.options.smoothTransitionDurationMs)),
      easing: String(options.easing || 'ease-in-out')
    };

    this.state.metrics.transitionCount += 1;
  }

  completeTransition() {
    this.state.camera.transition = {
      ...this.state.camera.transition,
      active: false
    };
  }

  applyCameraConstraints() {
    this.state.camera.zoom = clamp(
      toFiniteNumber(this.state.camera.zoom, 1),
      toFiniteNumber(this.state.camera.constraints.minZoom, 0.3),
      toFiniteNumber(this.state.camera.constraints.maxZoom, 5)
    );

    this.state.camera.position = clampPosition(this.state.camera.position, this.state.camera.constraints);
    this.state.camera.target = clampPosition(this.state.camera.target, this.state.camera.constraints);
    this.state.camera.position = clampCameraDistance(this.state.camera.position, this.state.camera.target, this.state.camera.constraints);
  }

  setCameraMode(mode = 'orbit', options = {}) {
    const normalizedMode = normalizeCameraMode(mode || this.state.camera.currentMode);

    if (!this.state.camera.availableModes.includes(normalizedMode.mode)) {
      this.state.camera.availableModes.push(normalizedMode.mode);
    }

    if (normalizedMode.known === false) {
      this.state.metrics.unknownCameraModeCount += 1;
      this.pushWarning(`Unknown camera mode preserved: ${normalizedMode.mode}`);
    }

    this.startTransition(normalizedMode.mode, options);

    this.state.camera.currentMode = normalizedMode.mode;
    this.state.camera.knownMode = normalizedMode.known;
    this.state.camera.modeProfile = this.resolveModeProfile(normalizedMode.mode);

    this.completeTransition();

    this.state.metrics.cameraMutationCount += 1;
    this.emit('camera-mode-changed', {
      mode: normalizedMode.mode,
      knownMode: normalizedMode.known
    });

    this.synchronize('set-camera-mode');
    return this.snapshot();
  }

  orbit(delta = {}) {
    const dx = toFiniteNumber(delta.x, 0) * this.state.camera.modeProfile.rotationSpeed;
    const dy = toFiniteNumber(delta.y, 0) * this.state.camera.modeProfile.rotationSpeed;

    const offset = vectorSub(this.state.camera.position, this.state.camera.target);
    const radius = Math.max(0.01, vectorLength(offset));
    const angle = Math.atan2(offset[2], offset[0]) + (dx * 0.01);
    const pitch = clamp(Math.asin(clamp(offset[1] / radius, -1, 1)) + (dy * 0.01), this.state.camera.constraints.minPolarAngle, this.state.camera.constraints.maxPolarAngle);

    const nextOffset = [
      Math.cos(angle) * Math.cos(pitch) * radius,
      Math.sin(pitch) * radius,
      Math.sin(angle) * Math.cos(pitch) * radius
    ];

    this.state.camera.position = vectorAdd(this.state.camera.target, nextOffset);
    this.state.camera.rotation = [pitch, angle, 0];

    this.applyCameraConstraints();
    this.state.metrics.cameraMutationCount += 1;
    this.synchronize('camera-orbit');
    return this.snapshot();
  }

  pan(delta = {}) {
    const speed = this.state.camera.modeProfile.panSpeed;
    const shift = [
      toFiniteNumber(delta.x, 0) * 0.01 * speed,
      toFiniteNumber(delta.y, 0) * 0.01 * speed,
      toFiniteNumber(delta.z, 0) * 0.01 * speed
    ];

    this.state.camera.position = vectorAdd(this.state.camera.position, shift);
    this.state.camera.target = vectorAdd(this.state.camera.target, shift);

    this.applyCameraConstraints();
    this.state.metrics.cameraMutationCount += 1;
    this.synchronize('camera-pan');
    return this.snapshot();
  }

  zoom(amount = 0) {
    const speed = this.state.camera.modeProfile.zoomSpeed;
    const scaled = toFiniteNumber(amount, 0) * 0.01 * speed;
    const nextZoom = this.state.camera.zoom + scaled;

    this.state.camera.zoom = clamp(nextZoom, this.state.camera.constraints.minZoom, this.state.camera.constraints.maxZoom);

    const offset = vectorSub(this.state.camera.position, this.state.camera.target);
    const distance = vectorLength(offset);
    const step = clamp(1 - scaled, 0.85, 1.15);
    const nextDistance = clamp(distance * step, this.state.camera.constraints.minDistance, this.state.camera.constraints.maxDistance);
    const unit = distance > 0 ? vectorScale(offset, 1 / distance) : [0, 0, 1];
    this.state.camera.position = vectorAdd(this.state.camera.target, vectorScale(unit, nextDistance));

    this.applyCameraConstraints();
    this.state.metrics.cameraMutationCount += 1;
    this.synchronize('camera-zoom');
    return this.snapshot();
  }

  rotate(delta = {}) {
    const speed = this.state.camera.modeProfile.rotationSpeed;
    this.state.camera.rotation = [
      this.state.camera.rotation[0] + (toFiniteNumber(delta.pitch, 0) * 0.01 * speed),
      this.state.camera.rotation[1] + (toFiniteNumber(delta.yaw, 0) * 0.01 * speed),
      this.state.camera.rotation[2] + (toFiniteNumber(delta.roll, 0) * 0.01 * speed)
    ];

    this.state.metrics.cameraMutationCount += 1;
    this.synchronize('camera-rotate');
    return this.snapshot();
  }

  focusObject(objectId = null, options = {}) {
    const key = String(objectId || '').trim();
    const focusPoint = this.state.camera.focusPointsByObjectId[key];

    if (!focusPoint) {
      this.pushWarning(`Focus object not found in runtime graph: ${key || 'unknown'}`);
      return this.snapshot();
    }

    const offset = toVector3(options.offset || [0, 1.2, 3.2], [0, 1.2, 3.2]);
    this.state.camera.target = [...focusPoint.position];
    this.state.camera.position = vectorAdd(focusPoint.position, offset);

    this.applyCameraConstraints();
    this.state.metrics.cameraMutationCount += 1;
    this.emit('camera-focused-object', {
      objectId: key
    });
    this.synchronize('camera-focus-object');
    return this.snapshot();
  }

  resetCamera() {
    const defaults = createCameraDefaults(this.runtime, this.options);

    this.state.camera.position = defaults.position;
    this.state.camera.rotation = defaults.rotation;
    this.state.camera.target = defaults.target;
    this.state.camera.zoom = defaults.zoom;
    this.state.camera.constraints = defaults.constraints;

    this.applyCameraConstraints();
    this.state.metrics.cameraMutationCount += 1;
    this.emit('camera-reset', {});
    this.synchronize('camera-reset');
    return this.snapshot();
  }

  fitScene() {
    const points = Object.values(this.state.camera.focusPointsByObjectId || {});
    if (!points.length) {
      this.pushWarning('Fit scene fallback used because runtime graph has no focus points.');
      return this.snapshot();
    }

    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];

    points.forEach((point) => {
      const pos = toVector3(point.position, [0, 0, 0]);
      min = [Math.min(min[0], pos[0]), Math.min(min[1], pos[1]), Math.min(min[2], pos[2])];
      max = [Math.max(max[0], pos[0]), Math.max(max[1], pos[1]), Math.max(max[2], pos[2])];
    });

    const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
    const diagonal = vectorLength(vectorSub(max, min));
    const distance = clamp(diagonal * 0.8, this.state.camera.constraints.minDistance, this.state.camera.constraints.maxDistance);

    this.state.camera.target = center;
    this.state.camera.position = [center[0], center[1] + Math.max(1, distance * 0.3), center[2] + distance];

    this.applyCameraConstraints();
    this.state.metrics.cameraMutationCount += 1;
    this.emit('camera-fit-scene', {
      center,
      distance
    });
    this.synchronize('camera-fit-scene');
    return this.snapshot();
  }

  executeCameraCommand(command = {}) {
    const source = isObject(command) ? command : {};
    const action = String(source.action || source.type || source.mode || '').trim();

    if (!action) return this.snapshot();

    const lower = action.toLowerCase();

    if (lower.includes('orbit')) return this.orbit(source.delta || source.payload || {});
    if (lower.includes('pan')) return this.pan(source.delta || source.payload || {});
    if (lower.includes('zoom')) return this.zoom(source.amount ?? source.delta?.y ?? source.payload?.amount ?? 0);
    if (lower.includes('rotate')) return this.rotate(source.delta || source.payload || {});
    if (lower.includes('focus')) return this.focusObject(source.targetObjectId || source.objectId || source.payload?.targetObjectId || null, source);
    if (lower.includes('reset')) return this.resetCamera();
    if (lower.includes('fit')) return this.fitScene();
    if (lower.includes('mode') || lower.includes('camera')) return this.setCameraMode(source.mode || source.cameraMode || source.payload?.cameraMode || source.action, source);

    return this.setCameraMode(action, source);
  }

  processInputEvent(event = {}, options = {}) {
    const validation = this.validateInputEvent(event);
    if (!validation.valid) {
      this.state.metrics.validationErrors += validation.errors.length;
      validation.errors.forEach((entry) => this.pushWarning(entry));
      return this.snapshot();
    }

    const source = isObject(event) ? event : {};
    const normalizedDevice = normalizeInputDeviceType(source.deviceType || source.inputDevice || source.pointerType || source.type || 'unknown-device');

    this.registerInputDevice({
      deviceType: normalizedDevice.type,
      metadata: {
        source: source.source || 'runtime',
        capabilities: source.capabilities || {}
      },
      active: true
    });

    this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);

    const eventAction = String(source.action || source.type || '').toLowerCase();
    if (eventAction.includes('orbit')) {
      this.orbit(source.delta || source.payload || {});
    } else if (eventAction.includes('pan') || eventAction === 'arrow') {
      this.pan(source.delta || source.payload || {});
    } else if (eventAction.includes('zoom') || eventAction.includes('wheel') || eventAction.includes('pinch')) {
      this.zoom(source.amount ?? source.delta?.y ?? source.payload?.amount ?? 0);
    } else if (eventAction.includes('rotate')) {
      this.rotate(source.delta || source.payload || {});
    } else if (eventAction.includes('focus')) {
      this.focusObject(source.targetObjectId || source.payload?.targetObjectId || null, source);
    } else if (eventAction.includes('reset')) {
      this.resetCamera();
    } else if (eventAction.includes('fit')) {
      this.fitScene();
    } else if (eventAction.includes('mode') || source.cameraMode) {
      this.setCameraMode(source.cameraMode || source.payload?.cameraMode || source.action || this.state.camera.currentMode, source);
    }

    const runtimeEvent = sanitizeRuntimeEvent({
      type: 'input-event',
      action: source.action || source.type || 'unknown-input',
      deviceType: normalizedDevice.type,
      knownDeviceType: normalizedDevice.known,
      cameraMode: this.state.camera.currentMode,
      knownCameraMode: this.state.camera.knownMode,
      payload: isObject(source.payload) ? source.payload : {},
      targetObjectId: source.targetObjectId || source.payload?.targetObjectId || null,
      timelineTimeMs: this.state.timelineTimeMs,
      metadata: {
        source: source.source || 'input-layer',
        options: isObject(options) ? options : {}
      }
    }, this.state.timelineTimeMs);

    this.state.inputLayer.history.push(runtimeEvent);
    if (this.state.inputLayer.history.length > Math.max(10, toFiniteNumber(this.options.maxInputHistory, 500))) {
      this.state.inputLayer.history.shift();
    }

    this.state.runtimeEvents.recent.push(runtimeEvent);
    if (this.state.runtimeEvents.recent.length > Math.max(10, toFiniteNumber(this.options.maxRuntimeEvents, 500))) {
      this.state.runtimeEvents.recent.shift();
    }

    this.state.metrics.inputEventCount += 1;

    this.emit('input-event-processed', {
      event: runtimeEvent
    });

    this.persistSession();
    this.synchronize('process-input-event');

    return this.snapshot();
  }

  attachScheduler(scheduler) {
    if (!scheduler || typeof scheduler.on !== 'function') return;

    const unsubscribe = scheduler.on('*', (event) => {
      const name = String(event?.name || '').trim();
      if (!name) return;

      this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);

      if (name === 'TimelinePaused') {
        this.state.recovery.interrupted = true;
        this.state.recovery.resumeTimeMs = this.state.timelineTimeMs;
      }

      if (name === 'TimelineResumed') {
        this.state.recovery.interrupted = false;
      }

      if (name === 'CheckpointReached') {
        this.state.recovery.lastCheckpointId = String(event?.payload?.checkpointId || '').trim() || this.state.recovery.lastCheckpointId;
      }

      this.synchronize(`timeline:${name}`);
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachSceneEventRuntime(sceneEventRuntime) {
    if (!sceneEventRuntime || typeof sceneEventRuntime.on !== 'function') return;

    const unsubscribe = sceneEventRuntime.on('SceneEventDispatched', ({ event }) => {
      const payload = isObject(event?.payload) ? event.payload : {};
      const cameraCommand = payload?.cameraCommand || payload?.camera || null;
      if (!isObject(cameraCommand)) return;

      this.executeCameraCommand(cameraCommand);
      this.emit('camera-command-applied', {
        source: 'scene-event-runtime',
        command: cameraCommand
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachInteractionContractRuntime(interactionContractRuntime) {
    if (!interactionContractRuntime || typeof interactionContractRuntime.on !== 'function') return;

    const unsubscribe = interactionContractRuntime.on('interaction-event-emitted', ({ payload }) => {
      const interactionEvent = payload?.event;
      const cameraCommand = interactionEvent?.payload?.cameraCommand || interactionEvent?.payload?.camera || interactionEvent?.metadata?.camera || null;

      if (!isObject(cameraCommand)) return;

      this.executeCameraCommand(cameraCommand);
      this.emit('camera-command-applied', {
        source: 'interaction-contract-runtime',
        command: cameraCommand
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  handleExternalTimelineMutation(mutationType = 'manual', context = {}) {
    const safeType = String(mutationType || 'manual').trim() || 'manual';

    if (safeType.includes('resume') || safeType.includes('recover')) {
      this.state.recovery.interrupted = false;
    }

    if (safeType.includes('pause')) {
      this.state.recovery.interrupted = true;
    }

    if (safeType.includes('seek') || safeType.includes('replay') || safeType.includes('checkpoint')) {
      this.state.recovery.resumeTimeMs = getRuntimeTimeMs(this.scheduler);
    }

    this.synchronize(`mutation:${safeType}`);

    this.emit('input-camera-runtime-synchronized', {
      reason: `mutation:${safeType}`,
      context: isObject(context) ? context : {}
    });

    return this.snapshot();
  }

  createPersistencePayload() {
    return {
      schemaVersion: 'v1',
      persistedAt: Date.now(),
      state: this.state
    };
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const serialized = JSON.stringify(this.createPersistencePayload());
    if (typeof adapter.setItem === 'function') {
      adapter.setItem(this.persistenceKey, serialized);
    } else if (typeof adapter.save === 'function') {
      adapter.save(this.persistenceKey, serialized);
    } else {
      return false;
    }

    this.state.diagnostics.persistedSessions += 1;
    this.emit('input-camera-runtime-persisted', {
      persistenceKey: this.persistenceKey
    });

    return true;
  }

  recoverSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    let raw = null;
    if (typeof adapter.getItem === 'function') {
      raw = adapter.getItem(this.persistenceKey);
    } else if (typeof adapter.load === 'function') {
      raw = adapter.load(this.persistenceKey);
    }

    if (!raw) return false;

    const parsed = parsePayload(raw);
    if (!parsed || !isObject(parsed.state)) return false;

    this.state = {
      ...this.state,
      ...parsed.state,
      recovery: {
        ...(isObject(parsed?.state?.recovery) ? parsed.state.recovery : this.state.recovery),
        interrupted: true
      },
      diagnostics: {
        ...(isObject(parsed?.state?.diagnostics) ? parsed.state.diagnostics : this.state.diagnostics),
        recoveredSessions: toFiniteNumber(parsed?.state?.diagnostics?.recoveredSessions, this.state.diagnostics.recoveredSessions) + 1
      }
    };

    this.state.timelineTimeMs = Math.max(0, toFiniteNumber(this.state.timelineTimeMs, getRuntimeTimeMs(this.scheduler)));
    this.scheduler?.seekByTime?.(this.state.timelineTimeMs);

    this.synchronize('recover-session');

    this.emit('input-camera-runtime-recovered', {
      persistenceKey: this.persistenceKey,
      timelineTimeMs: this.state.timelineTimeMs
    });

    return true;
  }

  synchronize(reason = 'manual') {
    this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);
    this.state.camera.focusPointsByObjectId = collectObjectFocusPoints(this.runtime);
    this.state.diagnostics.synchronizations += 1;

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      inputCameraControl: this.snapshot(),
      rendererAdapter: {
        ...(this.runtime.metadata?.rendererAdapter || {}),
        cameraControlState: this.snapshot()
      },
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        inputCameraControlState: this.snapshot()
      },
      interactionEngine: {
        ...(this.runtime.metadata?.interactionEngine || {}),
        inputCameraControlState: this.snapshot()
      }
    };

    this.emit('input-camera-runtime-synchronized', {
      reason
    });

    return this.snapshot();
  }

  snapshot() {
    const knownModes = this.state.camera.availableModes.filter((mode) => normalizeCameraMode(mode).known === true);
    const unknownModes = this.state.camera.availableModes.filter((mode) => normalizeCameraMode(mode).known === false);

    return deepClone({
      schemaVersion: 'v1',
      sceneId: this.state.sceneId,
      timelineTimeMs: this.state.timelineTimeMs,
      inputLayer: this.state.inputLayer,
      camera: this.state.camera,
      metrics: this.state.metrics,
      diagnostics: this.state.diagnostics,
      runtimeEvents: this.state.runtimeEvents,
      recovery: this.state.recovery,
      supportedInputDeviceTypes: [...SUPPORTED_INPUT_DEVICE_TYPES],
      supportedCameraModes: [...SUPPORTED_CAMERA_MODES],
      knownCameraModes: [...new Set(knownModes)],
      unknownCameraModes: [...new Set(unknownModes)]
    });
  }

  destroy() {
    this.persistSession();

    this.unsubscribers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.unsubscribers = [];

    this.emit('input-camera-runtime-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });
  }

  static supportedChannels() {
    return [
      'input-device-registered',
      'input-event-processed',
      'camera-mode-changed',
      'camera-command-applied',
      'camera-focused-object',
      'camera-reset',
      'camera-fit-scene',
      'input-camera-runtime-synchronized',
      'input-camera-runtime-persisted',
      'input-camera-runtime-recovered',
      'input-camera-runtime-destroyed'
    ];
  }
}

export function createUniversalInputCameraControlRuntime(runtime = {}, options = {}) {
  return new UniversalInputCameraControlRuntime(runtime, options);
}
