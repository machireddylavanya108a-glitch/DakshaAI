const STORE_KEY = '__daksha_adaptive_rendering_performance_store__';
const SCHEMA_VERSION = 'v1';
const DEFAULT_PERSISTENCE_KEY = 'daksha.adaptive.rendering.performance.v1';

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
      // Listener failures must not break runtime orchestration.
    }
  });
}

function deriveRuntimeGraphSummary(runtime = {}) {
  const graph = runtime?.graph;
  if (!graph) {
    return {
      nodeCount: 0,
      relationshipCount: 0
    };
  }

  const nodeCount = typeof graph.getNodeCount === 'function'
    ? Number(graph.getNodeCount())
    : graph?.nodes?.size || 0;
  const relationshipCount = typeof graph.getRelationshipCount === 'function'
    ? Number(graph.getRelationshipCount())
    : asArray(graph?.edges).length;

  return {
    nodeCount,
    relationshipCount
  };
}

function normalizeDeviceCapabilityState(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    gpuTier: clamp(toFiniteNumber(source.gpuTier, 2), 0, 6),
    cpuTier: clamp(toFiniteNumber(source.cpuTier, 2), 0, 6),
    memoryGb: clamp(toFiniteNumber(source.memoryGb, 8), 1, 512),
    batteryLevel: clamp(toFiniteNumber(source.batteryLevel, 1), 0, 1),
    thermalState: safeString(source.thermalState || 'nominal') || 'nominal',
    networkQuality: safeString(source.networkQuality || 'stable') || 'stable',
    webglContextStable: source.webglContextStable !== false,
    rendererTypes: asArray(source.rendererTypes),
    unknownCapabilities: asArray(source.unknownCapabilities)
  };
}

function normalizeAssetAvailabilityState(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    availableCount: Math.max(0, toFiniteNumber(source.availableCount, 0)),
    requestedCount: Math.max(0, toFiniteNumber(source.requestedCount, 0)),
    failedCount: Math.max(0, toFiniteNumber(source.failedCount, 0)),
    qualityCoverage: clamp(toFiniteNumber(source.qualityCoverage, 1), 0, 1),
    supportsProceduralFallback: source.supportsProceduralFallback !== false,
    unresolvedAssets: asArray(source.unresolvedAssets)
  };
}

function normalizeUserPreferenceState(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    preferredMode: safeString(source.preferredMode || 'adaptive') || 'adaptive',
    prefersBatterySaving: source.prefersBatterySaving === true,
    prefersMotionReduction: source.prefersMotionReduction === true,
    prefersHighContrast: source.prefersHighContrast === true,
    prefersTextAssistance: source.prefersTextAssistance === true,
    preferredFontScale: clamp(toFiniteNumber(source.preferredFontScale, 1), 0.75, 2.5),
    preferredInteractionTimingMs: Math.max(100, toFiniteNumber(source.preferredInteractionTimingMs, 350))
  };
}

function normalizePerformanceState(input = {}) {
  const source = isObject(input) ? input : {};

  return {
    schemaVersion: SCHEMA_VERSION,
    fps: {
      current: Math.max(0, toFiniteNumber(source?.fps?.current, 60)),
      average: Math.max(0, toFiniteNumber(source?.fps?.average, 60)),
      minimum: Math.max(0, toFiniteNumber(source?.fps?.minimum, 60)),
      samples: asArray(source?.fps?.samples).slice(-300)
    },
    frameBudgetMs: Math.max(1, toFiniteNumber(source.frameBudgetMs, 16.67)),
    frameTimeMs: Math.max(0, toFiniteNumber(source.frameTimeMs, 16.67)),
    adaptiveQualityScale: clamp(toFiniteNumber(source.adaptiveQualityScale, 1), 0.2, 1.5),
    dynamicLodBias: clamp(toFiniteNumber(source.dynamicLodBias, 1), 0.5, 4),
    memoryMb: {
      used: Math.max(0, toFiniteNumber(source?.memoryMb?.used, 0)),
      budget: Math.max(1, toFiniteNumber(source?.memoryMb?.budget, 1024)),
      pressure: clamp(toFiniteNumber(source?.memoryMb?.pressure, 0), 0, 1)
    },
    gpuLoad: clamp(toFiniteNumber(source.gpuLoad, 0.4), 0, 1),
    cpuLoad: clamp(toFiniteNumber(source.cpuLoad, 0.35), 0, 1),
    batteryAwareness: {
      enabled: source?.batteryAwareness?.enabled !== false,
      level: clamp(toFiniteNumber(source?.batteryAwareness?.level, 1), 0, 1),
      charging: source?.batteryAwareness?.charging === true
    },
    thermalAwareness: {
      state: safeString(source?.thermalAwareness?.state || 'nominal') || 'nominal',
      penalty: clamp(toFiniteNumber(source?.thermalAwareness?.penalty, 0), 0, 1)
    },
    networkAwareness: {
      quality: safeString(source?.networkAwareness?.quality || 'stable') || 'stable',
      latencyMs: Math.max(0, toFiniteNumber(source?.networkAwareness?.latencyMs, 30)),
      throughputMbps: Math.max(0, toFiniteNumber(source?.networkAwareness?.throughputMbps, 20))
    },
    unknownMetrics: asArray(source.unknownMetrics)
  };
}

function normalizeAccessibilityState(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    reducedMotion: source.reducedMotion === true,
    highContrast: source.highContrast === true,
    screenReaderMetadata: source.screenReaderMetadata !== false,
    scalableUi: source.scalableUi !== false,
    keyboardNavigation: source.keyboardNavigation !== false,
    captionsMetadata: source.captionsMetadata !== false,
    narrationMetadata: source.narrationMetadata !== false,
    interactionTimingMs: Math.max(100, toFiniteNumber(source.interactionTimingMs, 350)),
    fontScaling: clamp(toFiniteNumber(source.fontScaling, 1), 0.75, 2.5),
    unknownSettings: asArray(source.unknownSettings)
  };
}

function normalizeAdaptiveRendererState(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    currentMode: safeString(source.currentMode || 'Full Interactive 3D') || 'Full Interactive 3D',
    previousMode: safeString(source.previousMode || '') || null,
    candidateModes: asArray(source.candidateModes),
    modeScores: isObject(source.modeScores) ? source.modeScores : {},
    selectedReason: safeString(source.selectedReason || 'initialized') || 'initialized',
    supportsUnknownRendererTypes: source.supportsUnknownRendererTypes !== false,
    unknownRendererTypes: asArray(source.unknownRendererTypes)
  };
}

function normalizeRecoveryState(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    rendererRecoveries: Math.max(0, toFiniteNumber(source.rendererRecoveries, 0)),
    webglRecoveries: Math.max(0, toFiniteNumber(source.webglRecoveries, 0)),
    assetRecoveries: Math.max(0, toFiniteNumber(source.assetRecoveries, 0)),
    runtimeRecoveries: Math.max(0, toFiniteNumber(source.runtimeRecoveries, 0)),
    checkpointRecoveries: Math.max(0, toFiniteNumber(source.checkpointRecoveries, 0)),
    qualityDowngrades: Math.max(0, toFiniteNumber(source.qualityDowngrades, 0)),
    sessionContinuations: Math.max(0, toFiniteNumber(source.sessionContinuations, 0)),
    recoveryEvents: asArray(source.recoveryEvents).slice(-300)
  };
}

function normalizeDiagnostics(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    builds: Math.max(0, toFiniteNumber(source.builds, 0)),
    updates: Math.max(0, toFiniteNumber(source.updates, 0)),
    adaptiveSwitches: Math.max(0, toFiniteNumber(source.adaptiveSwitches, 0)),
    warnings: asArray(source.warnings).slice(-500),
    recoveries: Math.max(0, toFiniteNumber(source.recoveries, 0))
  };
}

function normalizeSessionState(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    persistenceKey: safeString(source.persistenceKey || DEFAULT_PERSISTENCE_KEY) || DEFAULT_PERSISTENCE_KEY,
    recovered: source.recovered === true,
    interrupted: source.interrupted === true,
    interruptionReason: safeString(source.interruptionReason || '') || null,
    interruptionAt: Math.max(0, toFiniteNumber(source.interruptionAt, 0)) || null,
    persistedAt: Math.max(0, toFiniteNumber(source.persistedAt, 0)) || null,
    lastCheckpointId: safeString(source.lastCheckpointId || '') || null
  };
}

function normalizeAdaptiveRuntimeState(input = {}) {
  const source = isObject(input) ? input : {};
  const derivedRuntimeGraph = deriveRuntimeGraphSummary(source.runtime || source);
  const providedRuntimeGraph = isObject(source.runtimeGraph) ? source.runtimeGraph : {};

  return {
    schemaVersion: SCHEMA_VERSION,
    runtimeGraph: {
      nodeCount: Math.max(0, toFiniteNumber(providedRuntimeGraph.nodeCount, derivedRuntimeGraph.nodeCount)),
      relationshipCount: Math.max(0, toFiniteNumber(providedRuntimeGraph.relationshipCount, derivedRuntimeGraph.relationshipCount))
    },
    deviceCapabilities: normalizeDeviceCapabilityState(source.deviceCapabilities || {}),
    assetAvailability: normalizeAssetAvailabilityState(source.assetAvailability || {}),
    userPreferences: normalizeUserPreferenceState(source.userPreferences || {}),
    performance: normalizePerformanceState(source.performance || {}),
    accessibility: normalizeAccessibilityState(source.accessibility || {}),
    adaptiveRenderer: normalizeAdaptiveRendererState(source.adaptiveRenderer || {}),
    recovery: normalizeRecoveryState(source.recovery || {}),
    diagnostics: normalizeDiagnostics(source.diagnostics || {}),
    session: normalizeSessionState(source.session || {})
  };
}

function migrateAdaptiveRuntimeState(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === SCHEMA_VERSION) {
    return normalizeAdaptiveRuntimeState(source);
  }

  return normalizeAdaptiveRuntimeState({
    schemaVersion: SCHEMA_VERSION,
    runtime: source.runtime || {},
    deviceCapabilities: source.deviceCapabilities,
    assetAvailability: source.assetAvailability,
    userPreferences: source.userPreferences,
    performance: source.performance || source.performanceManager,
    accessibility: source.accessibility || source.accessibilityManager,
    adaptiveRenderer: source.adaptiveRenderer,
    recovery: source.recovery || source.recoveryManager,
    diagnostics: {
      ...(isObject(source.diagnostics) ? source.diagnostics : {}),
      warnings: [
        ...asArray(source?.diagnostics?.warnings),
        'Adaptive rendering performance state migrated from legacy format.'
      ]
    },
    session: source.session
  });
}

function computeAssetAvailability(runtime = {}) {
  const loading = runtime?.assetLoadingRuntime?.snapshot?.() || runtime?.metadata?.assetLoading || {};
  const metrics = isObject(loading.metrics) ? loading.metrics : {};
  const availableCount = Math.max(0, toFiniteNumber(metrics.loadedCount, loading.loadedAssetCount || 0));
  const requestedCount = Math.max(availableCount, toFiniteNumber(metrics.requestedCount, loading.requestedAssetCount || availableCount));
  const failedCount = Math.max(0, toFiniteNumber(metrics.failedCount, loading.failedAssetCount || 0));
  const qualityCoverage = requestedCount > 0 ? clamp(availableCount / requestedCount, 0, 1) : 1;

  return normalizeAssetAvailabilityState({
    availableCount,
    requestedCount,
    failedCount,
    qualityCoverage,
    supportsProceduralFallback: loading.supportsProceduralFallback !== false,
    unresolvedAssets: asArray(loading.unresolvedAssets)
  });
}

function computePerformanceScore(state = {}) {
  const performance = normalizePerformanceState(state.performance || {});
  const capabilities = normalizeDeviceCapabilityState(state.deviceCapabilities || {});

  const fpsScore = clamp(performance.fps.average / 60, 0, 1);
  const frameBudgetScore = clamp(performance.frameBudgetMs / Math.max(1, performance.frameTimeMs), 0, 1);
  const memoryScore = clamp(1 - performance.memoryMb.pressure, 0, 1);
  const gpuScore = clamp(1 - performance.gpuLoad, 0, 1);
  const cpuScore = clamp(1 - performance.cpuLoad, 0, 1);
  const batteryScore = performance.batteryAwareness.charging
    ? 1
    : clamp(performance.batteryAwareness.level, 0, 1);

  const thermalPenalty = performance.thermalAwareness.state === 'critical'
    ? 0.5
    : performance.thermalAwareness.state === 'hot'
      ? 0.28
      : performance.thermalAwareness.penalty;

  const networkPenalty = performance.networkAwareness.quality === 'offline'
    ? 0.25
    : performance.networkAwareness.quality === 'poor'
      ? 0.14
      : 0;

  const capabilityScore = clamp((capabilities.gpuTier + capabilities.cpuTier) / 12, 0, 1);

  const raw = (
    fpsScore * 0.22
    + frameBudgetScore * 0.16
    + memoryScore * 0.16
    + gpuScore * 0.1
    + cpuScore * 0.1
    + batteryScore * 0.1
    + capabilityScore * 0.16
    - thermalPenalty
    - networkPenalty
  );

  return clamp(raw, 0, 1);
}

function deriveAdaptiveQualityScale(score = 0.5, accessibility = {}) {
  const accessible = normalizeAccessibilityState(accessibility || {});
  const reducedMotionPenalty = accessible.reducedMotion ? 0.08 : 0;
  const highContrastPenalty = accessible.highContrast ? 0.04 : 0;
  const base = clamp(score - reducedMotionPenalty - highContrastPenalty, 0.15, 1.2);

  return clamp(base + 0.2, 0.2, 1.4);
}

function deriveDynamicLodBias(score = 0.5, runtimeGraph = {}) {
  const graph = isObject(runtimeGraph) ? runtimeGraph : {};
  const complexityPenalty = clamp(toFiniteNumber(graph.nodeCount, 0) / 600, 0, 0.8);
  return clamp(1 + (1 - score) * 2 + complexityPenalty, 0.6, 4);
}

function buildCandidateModes(runtime = {}, state = {}) {
  const baselineModes = [
    'Full Interactive 3D',
    'Lightweight 3D',
    'Hybrid 3D + 2D',
    'Interactive 2D',
    'Static Visualization',
    'Diagram Mode',
    'Timeline Mode',
    'Concept Graph Mode',
    'Text-assisted Learning'
  ];

  const metadataModes = asArray(runtime?.metadata?.rendererCapabilities?.modes);
  const capabilityModes = asArray(state?.deviceCapabilities?.rendererTypes);
  const unknownRendererTypes = asArray(state?.adaptiveRenderer?.unknownRendererTypes);

  const seen = new Set();
  const result = [];
  [...baselineModes, ...metadataModes, ...capabilityModes, ...unknownRendererTypes].forEach((entry) => {
    const mode = safeString(entry);
    if (!mode) return;
    if (seen.has(mode)) return;
    seen.add(mode);
    result.push(mode);
  });

  return result;
}

function scoreMode(mode = '', context = {}) {
  const performanceScore = clamp(toFiniteNumber(context.performanceScore, 0.5), 0, 1);
  const asset = normalizeAssetAvailabilityState(context.assetAvailability || {});
  const accessibility = normalizeAccessibilityState(context.accessibility || {});
  const preferences = normalizeUserPreferenceState(context.userPreferences || {});

  const interactiveWeight = mode.includes('Interactive') || mode.includes('3D') ? 1 : 0.6;
  const lightweightWeight = mode.includes('Lightweight') || mode.includes('Static') || mode.includes('Text-assisted') ? 1 : 0.5;
  const timelineWeight = mode.includes('Timeline') ? 1 : 0.6;
  const diagramWeight = mode.includes('Diagram') || mode.includes('Concept Graph') ? 1 : 0.65;
  const textAssistWeight = mode.includes('Text-assisted') ? 1 : 0.55;

  const assetScore = clamp(asset.qualityCoverage - (asset.failedCount > 0 ? 0.1 : 0), 0, 1);

  const accessibilityDemand = (
    (accessibility.reducedMotion ? 0.18 : 0)
    + (accessibility.highContrast ? 0.1 : 0)
    + (accessibility.fontScaling > 1.3 ? 0.08 : 0)
  );

  const preferenceBoost = preferences.preferredMode === mode ? 0.24 : 0;
  const batteryPenalty = preferences.prefersBatterySaving && mode.includes('Full Interactive 3D') ? 0.2 : 0;
  const motionPenalty = preferences.prefersMotionReduction && mode.includes('Full Interactive 3D') ? 0.15 : 0;
  const textAssistBoost = preferences.prefersTextAssistance && mode.includes('Text-assisted') ? 0.18 : 0;

  const modeComplexityPenalty = mode.includes('Full Interactive 3D')
    ? (1 - performanceScore) * 0.45
    : mode.includes('Lightweight 3D')
      ? (1 - performanceScore) * 0.18
      : mode.includes('Hybrid 3D + 2D')
        ? (1 - performanceScore) * 0.22
        : mode.includes('Interactive 2D')
          ? (1 - performanceScore) * 0.12
          : 0.08;

  const raw = (
    performanceScore * interactiveWeight * 0.32
    + assetScore * 0.24
    + timelineWeight * 0.08
    + diagramWeight * 0.08
    + textAssistWeight * 0.08
    + lightweightWeight * 0.08
    + preferenceBoost
    + textAssistBoost
    - accessibilityDemand
    - batteryPenalty
    - motionPenalty
    - modeComplexityPenalty
  );

  return clamp(raw, 0, 1);
}

function selectAdaptiveMode(runtime = {}, state = {}) {
  const candidateModes = buildCandidateModes(runtime, state);
  const performanceScore = computePerformanceScore(state);

  const modeScores = {};
  let bestMode = candidateModes[0] || 'Text-assisted Learning';
  let bestScore = -1;

  candidateModes.forEach((mode) => {
    const score = scoreMode(mode, {
      performanceScore,
      assetAvailability: state.assetAvailability,
      accessibility: state.accessibility,
      userPreferences: state.userPreferences
    });
    modeScores[mode] = score;
    if (score > bestScore) {
      bestScore = score;
      bestMode = mode;
    }
  });

  const selectedReason = `performanceScore:${performanceScore.toFixed(3)} assetCoverage:${state.assetAvailability.qualityCoverage.toFixed(3)} accessibilityReducedMotion:${String(state.accessibility.reducedMotion)}`;

  return {
    mode: bestMode,
    candidateModes,
    modeScores,
    selectedReason,
    performanceScore
  };
}

export class UniversalAdaptiveRenderingPerformanceRuntime {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = isObject(options) ? options : {};
    this.rendererCore = runtime?.rendererCore || null;
    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.interactionContractRuntime = runtime?.interactionContractRuntime || null;

    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey || DEFAULT_PERSISTENCE_KEY) || DEFAULT_PERSISTENCE_KEY;

    this.listeners = createChannelSet();
    this.unsubscribers = [];
    this.state = migrateAdaptiveRuntimeState(this.options.state || {});
    this.state.session.persistenceKey = this.persistenceKey;
  }

  on(channel, listener) {
    const safeChannel = safeString(channel) || '*';
    if (typeof listener !== 'function') {
      throw new Error('UniversalAdaptiveRenderingPerformanceRuntime listener must be a function.');
    }

    if (!this.listeners.has(safeChannel)) {
      this.listeners.set(safeChannel, new Set());
    }

    this.listeners.get(safeChannel).add(listener);
    return () => this.off(safeChannel, listener);
  }

  off(channel, listener) {
    const safeChannel = safeString(channel) || '*';
    const listeners = this.listeners.get(safeChannel);
    if (!listeners) return false;
    return listeners.delete(listener);
  }

  emit(channel, payload = {}) {
    const safeChannel = safeString(channel) || 'adaptive-rendering-runtime-event';
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

  warn(message = 'Unknown adaptive rendering warning') {
    this.state.diagnostics.warnings.push(safeString(message));
    if (this.state.diagnostics.warnings.length > 500) {
      this.state.diagnostics.warnings.shift();
    }
  }

  validateRuntime() {
    const errors = [];
    const warnings = [];

    if (!this.rendererCore || typeof this.rendererCore.update !== 'function') {
      errors.push('Renderer core is required for adaptive rendering runtime.');
    }

    if (!this.runtime || typeof this.runtime !== 'object') {
      errors.push('Runtime scene object is required for adaptive rendering runtime.');
    }

    if (!this.scheduler || typeof this.scheduler.on !== 'function') {
      warnings.push('Timeline scheduler missing; FPS telemetry will rely on runtime samples only.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  attachTelemetryStreams() {
    if (this.scheduler && typeof this.scheduler.on === 'function') {
      const unsubscribeScheduler = this.scheduler.on('*', (event) => {
        this.updateFromTimelineEvent(event);
      });
      this.unsubscribers.push(unsubscribeScheduler);
    }

    if (this.rendererCore && typeof this.rendererCore.on === 'function') {
      const unsubscribeRenderer = this.rendererCore.on('renderer-updated', ({ state }) => {
        const frameTimeMs = toFiniteNumber(state?.renderState?.frameTimeMs, this.state.performance.frameTimeMs);
        this.recordFrameSample({ frameTimeMs });
      });
      this.unsubscribers.push(unsubscribeRenderer);
    }

    if (this.interactionContractRuntime && typeof this.interactionContractRuntime.on === 'function') {
      const unsubscribeInteraction = this.interactionContractRuntime.on('*', ({ channel, payload }) => {
        const eventType = safeString(channel || payload?.eventType || 'interaction-runtime-event') || 'interaction-runtime-event';
        if (eventType.includes('timeout') || eventType.includes('delay')) {
          this.state.accessibility.interactionTimingMs = Math.max(
            this.state.accessibility.interactionTimingMs,
            Math.max(100, toFiniteNumber(payload?.interactionTimingMs, 350))
          );
        }
      });
      this.unsubscribers.push(unsubscribeInteraction);
    }
  }

  build(input = {}) {
    const validation = this.validateRuntime();
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

    this.attachTelemetryStreams();
    this.applyInputState(input);
    this.state.runtimeGraph = deriveRuntimeGraphSummary(this.runtime);
    this.state.assetAvailability = computeAssetAvailability(this.runtime);

    this.recomputeAdaptiveState('build');
    this.state.diagnostics.builds += 1;
    this.synchronize('build', {
      source: 'runtime-build'
    });

    return {
      status: 'built',
      errors: [],
      warnings: validation.warnings,
      state: this.snapshot()
    };
  }

  applyInputState(input = {}) {
    const source = isObject(input) ? input : {};

    if (isObject(source.deviceCapabilities)) {
      this.state.deviceCapabilities = normalizeDeviceCapabilityState(source.deviceCapabilities);
    }

    if (isObject(source.assetAvailability)) {
      this.state.assetAvailability = normalizeAssetAvailabilityState(source.assetAvailability);
    }

    if (isObject(source.userPreferences)) {
      this.state.userPreferences = normalizeUserPreferenceState({
        ...this.state.userPreferences,
        ...source.userPreferences
      });
    }

    if (isObject(source.accessibility)) {
      this.state.accessibility = normalizeAccessibilityState({
        ...this.state.accessibility,
        ...source.accessibility
      });
    }

    if (isObject(source.performance)) {
      this.state.performance = normalizePerformanceState({
        ...this.state.performance,
        ...source.performance
      });
    }
  }

  update(input = {}) {
    this.applyInputState(input);

    if (Array.isArray(input.frameSamples)) {
      input.frameSamples.forEach((sample) => this.recordFrameSample(sample, false));
    }

    if (Array.isArray(input.unknownMetrics)) {
      this.state.performance.unknownMetrics = [
        ...this.state.performance.unknownMetrics,
        ...input.unknownMetrics
      ].slice(-200);
    }

    if (Array.isArray(input.unknownAccessibilitySettings)) {
      this.state.accessibility.unknownSettings = [
        ...this.state.accessibility.unknownSettings,
        ...input.unknownAccessibilitySettings
      ].slice(-200);
    }

    this.state.assetAvailability = isObject(input.assetAvailability)
      ? normalizeAssetAvailabilityState(input.assetAvailability)
      : computeAssetAvailability(this.runtime);

    this.state.runtimeGraph = deriveRuntimeGraphSummary(this.runtime);

    this.recomputeAdaptiveState('update');
    this.state.diagnostics.updates += 1;
    this.synchronize('update', {
      source: 'runtime-update'
    });

    return {
      status: 'updated',
      state: this.snapshot()
    };
  }

  updateFromTimelineEvent(event = {}) {
    const safeEvent = isObject(event) ? event : {};
    const eventName = safeString(safeEvent.name || '') || 'UnknownRuntimeEvent';
    const eventState = isObject(safeEvent.state) ? safeEvent.state : {};

    const timeMs = Math.max(0, toFiniteNumber(eventState?.clock?.timeMs, this.state.performance.frameTimeMs));
    const fpsFromState = toFiniteNumber(eventState?.diagnostics?.fps || eventState?.fps || 0, 0);

    if (fpsFromState > 0) {
      this.recordFrameSample({ fps: fpsFromState }, false);
    } else if (timeMs > 0) {
      this.recordFrameSample({ frameTimeMs: this.state.performance.frameTimeMs }, false);
    }

    if (eventName === 'TimelinePaused') {
      this.state.performance.frameBudgetMs = Math.max(this.state.performance.frameBudgetMs, 25);
    }

    if (eventName === 'TimelineError') {
      this.warn('Timeline runtime error observed. Adaptive renderer is preparing fallback-safe strategy.');
      this.performRuntimeRecovery('timeline-error', {
        automaticQualityDowngrade: true,
        continueSession: true
      });
    }
  }

  recordFrameSample(sample = {}, recompute = true) {
    const fps = toFiniteNumber(sample.fps, 0);
    const frameTimeMs = Math.max(1, toFiniteNumber(sample.frameTimeMs, fps > 0 ? 1000 / fps : this.state.performance.frameTimeMs));
    const derivedFps = fps > 0 ? fps : clamp(1000 / frameTimeMs, 1, 240);

    const samples = [...this.state.performance.fps.samples, derivedFps].slice(-300);
    const average = samples.reduce((sum, item) => sum + toFiniteNumber(item, 0), 0) / Math.max(1, samples.length);
    const minimum = samples.reduce((min, item) => Math.min(min, toFiniteNumber(item, 1000)), 1000);

    this.state.performance.fps = {
      current: derivedFps,
      average,
      minimum,
      samples
    };

    this.state.performance.frameTimeMs = frameTimeMs;
    this.state.performance.frameBudgetMs = clamp(
      toFiniteNumber(sample.frameBudgetMs, this.state.performance.frameBudgetMs),
      5,
      50
    );

    if (recompute) {
      this.recomputeAdaptiveState('frame-sample');
      this.synchronize('frame-sample', {
        fps: derivedFps
      });
    }

    return this.snapshot();
  }

  setAccessibilityMode(settings = {}) {
    this.state.accessibility = normalizeAccessibilityState({
      ...this.state.accessibility,
      ...settings
    });

    this.recomputeAdaptiveState('accessibility-update');
    this.synchronize('accessibility-update', {
      settings: this.state.accessibility
    });

    return this.snapshot();
  }

  setUserPreferences(preferences = {}) {
    this.state.userPreferences = normalizeUserPreferenceState({
      ...this.state.userPreferences,
      ...preferences
    });

    this.recomputeAdaptiveState('user-preferences-update');
    this.synchronize('user-preferences-update', {
      preferences: this.state.userPreferences
    });

    return this.snapshot();
  }

  recomputeAdaptiveState(reason = 'manual') {
    const selection = selectAdaptiveMode(this.runtime, this.state);

    const previousMode = this.state.adaptiveRenderer.currentMode;
    const nextMode = selection.mode;

    this.state.performance.adaptiveQualityScale = deriveAdaptiveQualityScale(selection.performanceScore, this.state.accessibility);
    this.state.performance.dynamicLodBias = deriveDynamicLodBias(selection.performanceScore, this.state.runtimeGraph);

    this.state.adaptiveRenderer = normalizeAdaptiveRendererState({
      ...this.state.adaptiveRenderer,
      previousMode: previousMode,
      currentMode: nextMode,
      candidateModes: selection.candidateModes,
      modeScores: selection.modeScores,
      selectedReason: `${reason}:${selection.selectedReason}`,
      supportsUnknownRendererTypes: true,
      unknownRendererTypes: [
        ...new Set([
          ...asArray(this.state.adaptiveRenderer.unknownRendererTypes),
          ...asArray(this.state.deviceCapabilities.unknownCapabilities)
        ])
      ]
    });

    if (previousMode !== nextMode) {
      this.state.diagnostics.adaptiveSwitches += 1;
      this.rendererCore?.update?.({
        commands: [
          {
            action: 'adaptive-render-mode-switch',
            nodeId: 'runtime-root',
            payload: {
              mode: nextMode,
              previousMode,
              adaptiveQualityScale: this.state.performance.adaptiveQualityScale,
              dynamicLodBias: this.state.performance.dynamicLodBias,
              reason: this.state.adaptiveRenderer.selectedReason,
              source: 'adaptive-runtime'
            }
          }
        ]
      });
    }

    if (selection.performanceScore < 0.26) {
      this.performRuntimeRecovery('performance-critical', {
        automaticQualityDowngrade: true,
        continueSession: true
      }, false);
    }

    return this.snapshot();
  }

  performRuntimeRecovery(recoveryType = 'runtime-recovery', options = {}, synchronizeAfter = true) {
    const safeType = safeString(recoveryType) || 'runtime-recovery';
    const config = isObject(options) ? options : {};

    if (safeType.includes('renderer')) {
      this.state.recovery.rendererRecoveries += 1;
    }
    if (safeType.includes('webgl') || safeType.includes('context')) {
      this.state.recovery.webglRecoveries += 1;
      this.state.deviceCapabilities.webglContextStable = true;
    }
    if (safeType.includes('asset')) {
      this.state.recovery.assetRecoveries += 1;
    }
    if (safeType.includes('checkpoint')) {
      this.state.recovery.checkpointRecoveries += 1;
      this.state.session.lastCheckpointId = safeString(config.checkpointId || this.state.session.lastCheckpointId || 'checkpoint') || 'checkpoint';
    }

    this.state.recovery.runtimeRecoveries += 1;
    this.state.diagnostics.recoveries += 1;

    if (config.automaticQualityDowngrade === true) {
      this.state.recovery.qualityDowngrades += 1;
      this.state.performance.adaptiveQualityScale = clamp(this.state.performance.adaptiveQualityScale * 0.85, 0.2, 1.3);
      this.state.performance.dynamicLodBias = clamp(this.state.performance.dynamicLodBias + 0.45, 0.6, 4);
    }

    if (config.continueSession === true) {
      this.state.recovery.sessionContinuations += 1;
      this.state.session.interrupted = false;
      this.state.session.interruptionReason = null;
      this.state.session.interruptionAt = null;
    }

    this.state.recovery.recoveryEvents.push({
      type: safeType,
      automaticQualityDowngrade: config.automaticQualityDowngrade === true,
      continueSession: config.continueSession === true,
      checkpointId: safeString(config.checkpointId || '') || null,
      timestamp: Date.now()
    });
    if (this.state.recovery.recoveryEvents.length > 300) {
      this.state.recovery.recoveryEvents.shift();
    }

    if (synchronizeAfter) {
      this.recomputeAdaptiveState('recovery');
      this.synchronize('recovery', {
        recoveryType: safeType
      });
    }

    this.emit('adaptive-rendering-recovery', {
      recoveryType: safeType
    });

    return this.snapshot();
  }

  handleWebGLContextLoss(reason = 'webgl-context-lost') {
    this.state.deviceCapabilities.webglContextStable = false;
    this.warn(`WebGL context instability detected: ${safeString(reason) || 'webgl-context-lost'}`);
    return this.performRuntimeRecovery('webgl-context-recovery', {
      automaticQualityDowngrade: true,
      continueSession: true
    });
  }

  handleAssetFailure(assetId = '', reason = 'asset-failure') {
    const safeAssetId = safeString(assetId) || 'unknown-asset';
    this.state.assetAvailability.failedCount += 1;
    this.state.assetAvailability.unresolvedAssets = [
      ...this.state.assetAvailability.unresolvedAssets,
      {
        assetId: safeAssetId,
        reason: safeString(reason) || 'asset-failure',
        timestamp: Date.now()
      }
    ].slice(-200);

    this.warn(`Asset failure detected for ${safeAssetId}. Recovery flow activated.`);
    return this.performRuntimeRecovery('asset-failure-recovery', {
      automaticQualityDowngrade: true,
      continueSession: true
    });
  }

  markInterrupted(reason = 'runtime-interruption') {
    this.state.session.interrupted = true;
    this.state.session.interruptionReason = safeString(reason) || 'runtime-interruption';
    this.state.session.interruptionAt = Date.now();

    this.performRuntimeRecovery('runtime-interruption', {
      automaticQualityDowngrade: true,
      continueSession: false
    }, false);

    this.synchronize('interrupted', {
      reason: this.state.session.interruptionReason
    });

    return this.snapshot();
  }

  continueSession(checkpointId = null) {
    const safeCheckpointId = safeString(checkpointId || this.state.session.lastCheckpointId || '') || null;
    return this.performRuntimeRecovery('session-continuation', {
      continueSession: true,
      checkpointId: safeCheckpointId,
      automaticQualityDowngrade: false
    });
  }

  synchronize(reason = 'manual', payload = {}) {
    const snapshot = this.snapshot();

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      adaptiveRenderingPerformance: snapshot,
      rendererAdapter: {
        ...(this.runtime.metadata?.rendererAdapter || {}),
        adaptiveRenderingPerformanceState: snapshot
      },
      interactionEngine: {
        ...(this.runtime.metadata?.interactionEngine || {}),
        adaptiveRenderingPerformanceState: snapshot
      },
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        adaptiveRenderingPerformanceState: snapshot
      }
    };

    this.emit('adaptive-rendering-synchronized', {
      reason,
      ...payload
    });

    return snapshot;
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = {
      schemaVersion: SCHEMA_VERSION,
      state: this.state,
      persistedAt: Date.now()
    };

    const serialized = JSON.stringify(payload);
    if (typeof adapter.setItem === 'function') {
      adapter.setItem(this.persistenceKey, serialized);
    } else if (typeof adapter.save === 'function') {
      adapter.save(this.persistenceKey, serialized);
    } else {
      return false;
    }

    this.state.session.persistedAt = payload.persistedAt;
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
    if (!parsed) {
      this.warn('Failed to recover adaptive rendering performance session.');
      return false;
    }

    this.state = migrateAdaptiveRuntimeState(parsed.state || {});
    this.state.session.recovered = true;
    this.state.session.persistedAt = Math.max(0, toFiniteNumber(parsed?.persistedAt, this.state.session.persistedAt || 0)) || null;
    this.state.diagnostics.recoveries += 1;

    this.recomputeAdaptiveState('recover-session');
    this.synchronize('recover-session', {
      recovered: true
    });

    return true;
  }

  reset() {
    this.state = normalizeAdaptiveRuntimeState({
      runtime: this.runtime,
      deviceCapabilities: this.state.deviceCapabilities,
      assetAvailability: this.state.assetAvailability,
      userPreferences: this.state.userPreferences,
      accessibility: this.state.accessibility,
      diagnostics: this.state.diagnostics,
      session: {
        persistenceKey: this.persistenceKey,
        recovered: this.state.session.recovered,
        interrupted: false,
        interruptionReason: null,
        interruptionAt: null,
        persistedAt: this.state.session.persistedAt,
        lastCheckpointId: this.state.session.lastCheckpointId
      }
    });

    this.recomputeAdaptiveState('reset');
    this.synchronize('reset', {
      source: 'runtime-reset'
    });

    return this.snapshot();
  }

  destroy() {
    this.persistSession();

    this.unsubscribers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.unsubscribers = [];

    this.emit('adaptive-rendering-runtime-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });

    this.listeners.clear();
    return this.snapshot();
  }

  snapshot() {
    return normalizeAdaptiveRuntimeState(this.state);
  }

  static supportedChannels() {
    return [
      'adaptive-rendering-synchronized',
      'adaptive-rendering-recovery',
      'adaptive-rendering-runtime-destroyed'
    ];
  }
}

export function createUniversalAdaptiveRenderingPerformanceRuntime(runtime = {}, options = {}) {
  return new UniversalAdaptiveRenderingPerformanceRuntime(runtime, options);
}

export {
  normalizeAdaptiveRuntimeState,
  migrateAdaptiveRuntimeState,
  normalizePerformanceState,
  normalizeAccessibilityState,
  normalizeAdaptiveRendererState,
  normalizeRecoveryState,
  normalizeDeviceCapabilityState,
  normalizeAssetAvailabilityState,
  normalizeUserPreferenceState
};
