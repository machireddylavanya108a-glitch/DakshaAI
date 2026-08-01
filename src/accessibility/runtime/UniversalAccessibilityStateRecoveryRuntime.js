import {
  SUPPORTED_ACCESSIBILITY_FEATURES,
  DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG,
  asArray,
  clamp,
  isObject,
  normalizeAccessibilityFeature,
  sanitizeMetadata,
  sanitizeString,
  toFiniteNumber
} from './UniversalAccessibilityStateRecoveryConfig.js';

const STORE_KEY = '__daksha_accessibility_recovery_runtime_store__';

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
      // Listener failures are isolated from accessibility runtime.
    }
  });
}

function getRuntimeTimeMs(scheduler) {
  const snapshot = scheduler?.snapshot?.() || {};
  return Math.max(0, toFiniteNumber(snapshot?.clock?.timeMs, 0));
}

function summarizeSceneGraph(runtime = {}) {
  const graph = runtime?.graph;
  if (!graph) {
    return {
      nodeCount: 0,
      relationshipCount: 0
    };
  }

  return {
    nodeCount: typeof graph.getNodeCount === 'function'
      ? Number(graph.getNodeCount())
      : (graph?.nodes?.size || 0),
    relationshipCount: typeof graph.getRelationshipCount === 'function'
      ? Number(graph.getRelationshipCount())
      : (Array.isArray(graph?.edges) ? graph.edges.length : (graph?.edges?.size || 0))
  };
}

function collectFocusableNodes(runtime = {}) {
  const nodes = runtime?.graph?.toJSON?.()?.nodes;
  return asArray(nodes)
    .filter((node) => {
      const props = node?.properties || {};
      const sourceKey = String(node?.metadata?.sourceKey || '').toLowerCase();
      return Boolean(
        props?.interactive
        || props?.clickable
        || props?.focusable
        || sourceKey === 'objects'
        || sourceKey === 'educationalobjects'
        || sourceKey === 'educationalobjectinstances'
      );
    })
    .map((node) => String(node?.id || '').trim())
    .filter(Boolean);
}

function buildScreenReaderMetadata(runtime = {}) {
  const nodes = runtime?.graph?.toJSON?.()?.nodes;
  const metadataByObjectId = {};

  asArray(nodes).forEach((node) => {
    const id = String(node?.id || '').trim();
    if (!id) return;

    const props = isObject(node?.properties) ? node.properties : {};
    const meta = isObject(node?.metadata) ? node.metadata : {};

    metadataByObjectId[id] = {
      label: sanitizeString(props?.name || props?.label || meta?.name || id, 300),
      description: sanitizeString(props?.description || props?.ariaDescription || '', 1200),
      role: sanitizeString(props?.role || props?.ariaRole || meta?.sourceKey || 'generic', 120),
      hints: sanitizeMetadata(props?.accessibilityHints || props?.a11y || {})
    };
  });

  return metadataByObjectId;
}

function buildCaptionMetadata(runtime = {}) {
  const narration = runtime?.metadata?.narration || {};
  const cues = asArray(narration?.cues?.all || narration?.cues);
  const segments = asArray(narration?.segments);

  return {
    tracks: [
      {
        id: 'default-caption-track',
        language: 'en',
        cueCount: cues.length,
        segmentCount: segments.length
      }
    ],
    activeTrackId: 'default-caption-track',
    cues: cues.map((cue, index) => ({
      id: String(cue?.id || `cue-${index + 1}`),
      segmentId: String(cue?.segmentId || ''),
      text: sanitizeString(cue?.text || cue?.label || '', 1200),
      timeMs: Math.max(0, toFiniteNumber(cue?.timeMs ?? cue?.timestampMs, 0))
    }))
  };
}

function buildNarrationMetadata(runtime = {}) {
  const narration = runtime?.metadata?.narration || {};
  const segments = asArray(narration?.segments);

  return {
    segmentCount: segments.length,
    segments: segments.map((segment, index) => ({
      id: String(segment?.id || `segment-${index + 1}`),
      text: sanitizeString(segment?.text || '', 2000),
      timestampMs: Math.max(0, toFiniteNumber(segment?.timestampMs, 0)),
      durationMs: Math.max(0, toFiniteNumber(segment?.durationMs, 0)),
      metadata: sanitizeMetadata(segment?.metadata || {})
    })),
    summary: sanitizeMetadata(narration?.summary || {})
  };
}

function collectKnownAndUnknownFeatures(input = []) {
  const knownFeatures = new Set(SUPPORTED_ACCESSIBILITY_FEATURES);
  const unknownFeatures = new Set();

  asArray(input).forEach((entry) => {
    const normalized = normalizeAccessibilityFeature(entry);
    if (normalized.known) {
      knownFeatures.add(normalized.feature);
    } else {
      unknownFeatures.add(normalized.feature);
    }
  });

  return {
    knownFeatures: [...knownFeatures],
    unknownFeatures: [...unknownFeatures]
  };
}

function normalizeScale(value, fallback = 1) {
  return clamp(toFiniteNumber(value, fallback), 0.5, 3);
}

function normalizeTiming(value, fallback = 0) {
  return Math.max(0, Math.round(toFiniteNumber(value, fallback)));
}

function sanitizeCheckpointList(checkpoints = []) {
  return asArray(checkpoints)
    .map((checkpoint, index) => {
      if (!isObject(checkpoint)) return null;
      return {
        id: String(checkpoint?.id || checkpoint?.checkpointId || `checkpoint-${index + 1}`),
        type: sanitizeString(checkpoint?.type || checkpoint?.checkpointType || 'unknown', 120),
        timeMs: Math.max(0, toFiniteNumber(checkpoint?.timeMs ?? checkpoint?.timestampMs, 0)),
        metadata: sanitizeMetadata(checkpoint?.metadata || {})
      };
    })
    .filter(Boolean);
}

function buildDefaultState(runtime = {}, options = {}) {
  const scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
  const focusOrder = collectFocusableNodes(runtime);
  const featureSource = [
    ...(asArray(runtime?.metadata?.accessibilityRecovery?.knownFeatures)),
    ...(asArray(runtime?.metadata?.accessibility?.knownFeatures)),
    ...SUPPORTED_ACCESSIBILITY_FEATURES
  ];
  const featureSummary = collectKnownAndUnknownFeatures(featureSource);

  const graphSummary = summarizeSceneGraph(runtime);
  const sceneId = runtime?.sceneId || null;
  const timelineTimeMs = getRuntimeTimeMs(scheduler);
  const schedulerSnapshot = scheduler?.snapshot?.() || {};

  return {
    schemaVersion: DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG.schemaVersion,
    sceneId,
    timelineTimeMs,
    knownFeatures: featureSummary.knownFeatures,
    unknownFeatures: featureSummary.unknownFeatures,
    accessibility: {
      keyboardNavigation: {
        enabled: true,
        focusOrder,
        focusIndex: focusOrder.length ? 0 : -1,
        activeFocusId: focusOrder[0] || null,
        lastAction: 'boot'
      },
      screenReader: {
        enabled: true,
        metadataByObjectId: buildScreenReaderMetadata(runtime),
        liveRegionQueue: []
      },
      focusManagement: {
        enabled: true,
        trapFocus: false,
        restoreFocusOnResume: true,
        lastFocusedId: focusOrder[0] || null,
        focusHistory: focusOrder[0] ? [focusOrder[0]] : []
      },
      visual: {
        highContrastMode: Boolean(options?.defaultHighContrastMode ?? DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG.defaultHighContrastMode),
        reducedMotion: Boolean(options?.defaultReducedMotion ?? DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG.defaultReducedMotion),
        uiScale: normalizeScale(options?.defaultUiScale ?? DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG.defaultUiScale, 1),
        fontScale: normalizeScale(options?.defaultFontScale ?? DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG.defaultFontScale, 1)
      },
      timing: {
        interactionTimingMs: normalizeTiming(options?.defaultInteractionTimingMs ?? DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG.defaultInteractionTimingMs, 0),
        keyboardRepeatDelayMs: 250,
        captionDelayMs: 0,
        narrationDelayMs: 0,
        custom: {}
      },
      captions: {
        enabled: true,
        ...buildCaptionMetadata(runtime),
        metadata: {}
      },
      narration: {
        enabled: true,
        ...buildNarrationMetadata(runtime),
        metadata: {}
      },
      preferences: {},
      unknownSettings: {}
    },
    session: {
      currentLesson: runtime?.metadata?.title || runtime?.sceneJson?.title || null,
      runtimeScene: {
        sceneId,
        nodeCount: graphSummary.nodeCount,
        relationshipCount: graphSummary.relationshipCount
      },
      timelinePosition: timelineTimeMs,
      playbackState: String(schedulerSnapshot?.playbackState || 'Ready'),
      cameraMetadata: sanitizeMetadata(runtime?.inputCameraControlRuntime?.snapshot?.()?.camera || runtime?.metadata?.inputCameraControl?.camera || {}),
      interactionState: sanitizeMetadata(runtime?.interactionContractRuntime?.snapshot?.() || runtime?.metadata?.interactionContract || {}),
      selectedObjects: asArray(runtime?.educationalInspectionRuntime?.snapshot?.()?.objects?.selectedIds || runtime?.metadata?.educationalInspection?.objects?.selectedIds),
      checkpoints: sanitizeCheckpointList(scheduler?.checkpoints?.toJSON?.() || []),
      quizProgress: sanitizeMetadata(runtime?.metadata?.quizProgress || runtime?.metadata?.quiz || {}),
      learningProgress: sanitizeMetadata(runtime?.adaptiveTeachingRuntime?.snapshot?.()?.progress || runtime?.progressTracker?.getSnapshot?.() || {}),
      aiTeacherState: sanitizeMetadata(runtime?.metadata?.aiTeacherAdapter || {}),
      userPreferences: sanitizeMetadata(runtime?.metadata?.userPreferences || {}),
      unknownState: {}
    },
    recovery: {
      interrupted: false,
      resumeReason: null,
      checkpointId: null,
      resumedAt: null,
      migrationApplied: false,
      corruptionRecovered: false,
      versionBeforeMigration: null
    },
    diagnostics: {
      synchronizations: 0,
      persistedSessions: 0,
      recoveredSessions: 0,
      migrations: 0,
      corruptionRecoveries: 0,
      warnings: [],
      recoverableErrors: []
    },
    metrics: {
      focusMoves: 0,
      keyboardActions: 0,
      restores: 0,
      checkpointRestores: 0,
      unknownFeatureCount: featureSummary.unknownFeatures.length
    },
    runtimeEvents: {
      recent: []
    }
  };
}

function normalizeRestoredState(restored = {}, fallback = {}) {
  const source = isObject(restored) ? restored : {};
  const fallbackState = isObject(fallback) ? fallback : {};

  const knownFeatures = collectKnownAndUnknownFeatures(source.knownFeatures || fallbackState.knownFeatures || []);
  const unknownFeatures = collectKnownAndUnknownFeatures(source.unknownFeatures || fallbackState.unknownFeatures || []).unknownFeatures;

  const focusOrder = asArray(
    source?.accessibility?.keyboardNavigation?.focusOrder
    || fallbackState?.accessibility?.keyboardNavigation?.focusOrder
  )
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);

  const activeFocusId = String(
    source?.accessibility?.keyboardNavigation?.activeFocusId
    || fallbackState?.accessibility?.keyboardNavigation?.activeFocusId
    || focusOrder[0]
    || ''
  ).trim() || null;

  const focusIndex = focusOrder.length
    ? Math.max(0, Math.min(focusOrder.length - 1, toFiniteNumber(source?.accessibility?.keyboardNavigation?.focusIndex, 0)))
    : -1;

  return {
    ...fallbackState,
    ...source,
    schemaVersion: String(source.schemaVersion || fallbackState.schemaVersion || DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG.schemaVersion),
    sceneId: source.sceneId || fallbackState.sceneId || null,
    timelineTimeMs: Math.max(0, toFiniteNumber(source.timelineTimeMs, fallbackState.timelineTimeMs || 0)),
    knownFeatures: knownFeatures.knownFeatures,
    unknownFeatures: [...new Set([...(fallbackState.unknownFeatures || []), ...unknownFeatures])],
    accessibility: {
      ...(fallbackState.accessibility || {}),
      ...(source.accessibility || {}),
      keyboardNavigation: {
        ...((fallbackState.accessibility || {}).keyboardNavigation || {}),
        ...((source.accessibility || {}).keyboardNavigation || {}),
        focusOrder,
        activeFocusId,
        focusIndex,
        enabled: (source?.accessibility?.keyboardNavigation?.enabled ?? fallbackState?.accessibility?.keyboardNavigation?.enabled) !== false,
        lastAction: sanitizeString(source?.accessibility?.keyboardNavigation?.lastAction || fallbackState?.accessibility?.keyboardNavigation?.lastAction || 'restored', 160)
      },
      focusManagement: {
        ...((fallbackState.accessibility || {}).focusManagement || {}),
        ...((source.accessibility || {}).focusManagement || {}),
        focusHistory: asArray(source?.accessibility?.focusManagement?.focusHistory || fallbackState?.accessibility?.focusManagement?.focusHistory)
          .map((entry) => String(entry || '').trim())
          .filter(Boolean)
          .slice(-Math.max(10, toFiniteNumber(DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG.maxFocusHistory, 250))),
        lastFocusedId: String(source?.accessibility?.focusManagement?.lastFocusedId || fallbackState?.accessibility?.focusManagement?.lastFocusedId || activeFocusId || '').trim() || null,
        trapFocus: (source?.accessibility?.focusManagement?.trapFocus ?? fallbackState?.accessibility?.focusManagement?.trapFocus) === true,
        restoreFocusOnResume: (source?.accessibility?.focusManagement?.restoreFocusOnResume ?? fallbackState?.accessibility?.focusManagement?.restoreFocusOnResume) !== false
      },
      visual: {
        ...((fallbackState.accessibility || {}).visual || {}),
        ...((source.accessibility || {}).visual || {}),
        highContrastMode: (source?.accessibility?.visual?.highContrastMode ?? fallbackState?.accessibility?.visual?.highContrastMode) === true,
        reducedMotion: (source?.accessibility?.visual?.reducedMotion ?? fallbackState?.accessibility?.visual?.reducedMotion) === true,
        uiScale: normalizeScale(source?.accessibility?.visual?.uiScale ?? fallbackState?.accessibility?.visual?.uiScale ?? 1, 1),
        fontScale: normalizeScale(source?.accessibility?.visual?.fontScale ?? fallbackState?.accessibility?.visual?.fontScale ?? 1, 1)
      },
      timing: {
        ...((fallbackState.accessibility || {}).timing || {}),
        ...((source.accessibility || {}).timing || {}),
        interactionTimingMs: normalizeTiming(source?.accessibility?.timing?.interactionTimingMs ?? fallbackState?.accessibility?.timing?.interactionTimingMs ?? 0, 0),
        keyboardRepeatDelayMs: normalizeTiming(source?.accessibility?.timing?.keyboardRepeatDelayMs ?? fallbackState?.accessibility?.timing?.keyboardRepeatDelayMs ?? 250, 250),
        captionDelayMs: normalizeTiming(source?.accessibility?.timing?.captionDelayMs ?? fallbackState?.accessibility?.timing?.captionDelayMs ?? 0, 0),
        narrationDelayMs: normalizeTiming(source?.accessibility?.timing?.narrationDelayMs ?? fallbackState?.accessibility?.timing?.narrationDelayMs ?? 0, 0),
        custom: sanitizeMetadata(source?.accessibility?.timing?.custom || fallbackState?.accessibility?.timing?.custom || {})
      },
      screenReader: {
        ...((fallbackState.accessibility || {}).screenReader || {}),
        ...((source.accessibility || {}).screenReader || {}),
        enabled: (source?.accessibility?.screenReader?.enabled ?? fallbackState?.accessibility?.screenReader?.enabled) !== false,
        metadataByObjectId: sanitizeMetadata(source?.accessibility?.screenReader?.metadataByObjectId || fallbackState?.accessibility?.screenReader?.metadataByObjectId || {}),
        liveRegionQueue: asArray(source?.accessibility?.screenReader?.liveRegionQueue || fallbackState?.accessibility?.screenReader?.liveRegionQueue)
          .map((item) => ({
            message: sanitizeString(item?.message || item?.text || '', 1200),
            createdAt: Math.max(0, toFiniteNumber(item?.createdAt, Date.now()))
          }))
          .filter((item) => item.message)
          .slice(-120)
      },
      captions: {
        ...((fallbackState.accessibility || {}).captions || {}),
        ...((source.accessibility || {}).captions || {}),
        enabled: (source?.accessibility?.captions?.enabled ?? fallbackState?.accessibility?.captions?.enabled) !== false,
        tracks: sanitizeMetadata(source?.accessibility?.captions?.tracks || fallbackState?.accessibility?.captions?.tracks || []),
        activeTrackId: String(source?.accessibility?.captions?.activeTrackId || fallbackState?.accessibility?.captions?.activeTrackId || '').trim() || null,
        cues: sanitizeMetadata(source?.accessibility?.captions?.cues || fallbackState?.accessibility?.captions?.cues || []),
        metadata: sanitizeMetadata(source?.accessibility?.captions?.metadata || fallbackState?.accessibility?.captions?.metadata || {})
      },
      narration: {
        ...((fallbackState.accessibility || {}).narration || {}),
        ...((source.accessibility || {}).narration || {}),
        enabled: (source?.accessibility?.narration?.enabled ?? fallbackState?.accessibility?.narration?.enabled) !== false,
        segmentCount: Math.max(0, toFiniteNumber(source?.accessibility?.narration?.segmentCount, fallbackState?.accessibility?.narration?.segmentCount || 0)),
        segments: sanitizeMetadata(source?.accessibility?.narration?.segments || fallbackState?.accessibility?.narration?.segments || []),
        summary: sanitizeMetadata(source?.accessibility?.narration?.summary || fallbackState?.accessibility?.narration?.summary || {}),
        metadata: sanitizeMetadata(source?.accessibility?.narration?.metadata || fallbackState?.accessibility?.narration?.metadata || {})
      },
      preferences: sanitizeMetadata(source?.accessibility?.preferences || fallbackState?.accessibility?.preferences || {}),
      unknownSettings: sanitizeMetadata(source?.accessibility?.unknownSettings || fallbackState?.accessibility?.unknownSettings || {})
    },
    session: {
      ...((fallbackState.session || {})),
      ...((source.session || {})),
      timelinePosition: Math.max(0, toFiniteNumber(source?.session?.timelinePosition, fallbackState?.session?.timelinePosition || 0)),
      selectedObjects: asArray(source?.session?.selectedObjects || fallbackState?.session?.selectedObjects)
        .map((entry) => String(entry || '').trim())
        .filter(Boolean),
      checkpoints: sanitizeCheckpointList(source?.session?.checkpoints || fallbackState?.session?.checkpoints || []),
      userPreferences: sanitizeMetadata(source?.session?.userPreferences || fallbackState?.session?.userPreferences || {}),
      unknownState: sanitizeMetadata(source?.session?.unknownState || fallbackState?.session?.unknownState || {})
    },
    recovery: {
      ...((fallbackState.recovery || {})),
      ...((source.recovery || {})),
      interrupted: (source?.recovery?.interrupted ?? fallbackState?.recovery?.interrupted) === true,
      resumeReason: sanitizeString(source?.recovery?.resumeReason || fallbackState?.recovery?.resumeReason || '', 240) || null,
      checkpointId: sanitizeString(source?.recovery?.checkpointId || fallbackState?.recovery?.checkpointId || '', 240) || null,
      resumedAt: Math.max(0, toFiniteNumber(source?.recovery?.resumedAt, fallbackState?.recovery?.resumedAt || 0)) || null,
      migrationApplied: (source?.recovery?.migrationApplied ?? fallbackState?.recovery?.migrationApplied) === true,
      corruptionRecovered: (source?.recovery?.corruptionRecovered ?? fallbackState?.recovery?.corruptionRecovered) === true,
      versionBeforeMigration: sanitizeString(source?.recovery?.versionBeforeMigration || fallbackState?.recovery?.versionBeforeMigration || '', 120) || null
    },
    diagnostics: {
      ...((fallbackState.diagnostics || {})),
      ...((source.diagnostics || {})),
      synchronizations: Math.max(0, toFiniteNumber(source?.diagnostics?.synchronizations, fallbackState?.diagnostics?.synchronizations || 0)),
      persistedSessions: Math.max(0, toFiniteNumber(source?.diagnostics?.persistedSessions, fallbackState?.diagnostics?.persistedSessions || 0)),
      recoveredSessions: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveredSessions, fallbackState?.diagnostics?.recoveredSessions || 0)),
      migrations: Math.max(0, toFiniteNumber(source?.diagnostics?.migrations, fallbackState?.diagnostics?.migrations || 0)),
      corruptionRecoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.corruptionRecoveries, fallbackState?.diagnostics?.corruptionRecoveries || 0)),
      warnings: asArray(source?.diagnostics?.warnings || fallbackState?.diagnostics?.warnings).map((entry) => sanitizeString(entry, 500)).filter(Boolean).slice(-200),
      recoverableErrors: asArray(source?.diagnostics?.recoverableErrors || fallbackState?.diagnostics?.recoverableErrors).map((entry) => sanitizeString(entry, 500)).filter(Boolean).slice(-100)
    },
    metrics: {
      ...((fallbackState.metrics || {})),
      ...((source.metrics || {})),
      focusMoves: Math.max(0, toFiniteNumber(source?.metrics?.focusMoves, fallbackState?.metrics?.focusMoves || 0)),
      keyboardActions: Math.max(0, toFiniteNumber(source?.metrics?.keyboardActions, fallbackState?.metrics?.keyboardActions || 0)),
      restores: Math.max(0, toFiniteNumber(source?.metrics?.restores, fallbackState?.metrics?.restores || 0)),
      checkpointRestores: Math.max(0, toFiniteNumber(source?.metrics?.checkpointRestores, fallbackState?.metrics?.checkpointRestores || 0)),
      unknownFeatureCount: Math.max(0, toFiniteNumber(source?.metrics?.unknownFeatureCount, fallbackState?.metrics?.unknownFeatureCount || 0))
    },
    runtimeEvents: {
      recent: sanitizeMetadata(source?.runtimeEvents?.recent || fallbackState?.runtimeEvents?.recent || [])
    }
  };
}

function migrateLegacyPayload(payload = {}, fallbackState = {}) {
  const source = isObject(payload) ? payload : {};
  const sourceState = isObject(source?.state) ? source.state : source;
  const version = String(sourceState?.schemaVersion || source?.schemaVersion || 'v1');

  let migrated = sourceState;
  let migrationApplied = false;

  if (version !== DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG.schemaVersion) {
    migrationApplied = true;
    migrated = {
      ...sourceState,
      schemaVersion: DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG.schemaVersion,
      accessibility: {
        ...(isObject(sourceState.accessibility) ? sourceState.accessibility : {}),
        visual: {
          ...(isObject(sourceState?.accessibility?.visual) ? sourceState.accessibility.visual : {}),
          uiScale: sourceState?.accessibility?.visual?.uiScale ?? sourceState?.uiScale ?? 1,
          fontScale: sourceState?.accessibility?.visual?.fontScale ?? sourceState?.fontScale ?? 1,
          highContrastMode: sourceState?.accessibility?.visual?.highContrastMode ?? sourceState?.highContrastMode ?? false,
          reducedMotion: sourceState?.accessibility?.visual?.reducedMotion ?? sourceState?.reducedMotion ?? false
        },
        timing: {
          ...(isObject(sourceState?.accessibility?.timing) ? sourceState.accessibility.timing : {}),
          interactionTimingMs: sourceState?.accessibility?.timing?.interactionTimingMs ?? sourceState?.interactionTimingMs ?? 0
        },
        keyboardNavigation: {
          ...(isObject(sourceState?.accessibility?.keyboardNavigation) ? sourceState.accessibility.keyboardNavigation : {}),
          activeFocusId: sourceState?.accessibility?.keyboardNavigation?.activeFocusId ?? sourceState?.activeFocusId ?? null
        },
        unknownSettings: {
          ...(isObject(sourceState?.accessibility?.unknownSettings) ? sourceState.accessibility.unknownSettings : {}),
          legacy: sanitizeMetadata(sourceState?.legacy || {})
        }
      },
      session: {
        ...(isObject(sourceState.session) ? sourceState.session : {}),
        currentLesson: sourceState?.session?.currentLesson ?? sourceState?.currentLesson ?? fallbackState?.session?.currentLesson ?? null,
        timelinePosition: sourceState?.session?.timelinePosition ?? sourceState?.timelineTimeMs ?? 0,
        unknownState: {
          ...(isObject(sourceState?.session?.unknownState) ? sourceState.session.unknownState : {}),
          legacyState: sanitizeMetadata(sourceState)
        }
      },
      recovery: {
        ...(isObject(sourceState.recovery) ? sourceState.recovery : {}),
        migrationApplied: true,
        versionBeforeMigration: version
      }
    };
  }

  return {
    migrated,
    migrationApplied,
    versionBeforeMigration: migrationApplied ? version : null
  };
}

export class UniversalAccessibilityStateRecoveryRuntime {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.persistenceAdapter = this.options.persistenceAdapter || this.scheduler?.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = String(this.options.persistenceKey || DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG.persistenceKey);

    this.listeners = createChannelSet();
    this.unsubscribers = [];

    this.state = buildDefaultState(runtime, this.options);

    this.attachScheduler(this.scheduler);
    this.synchronize('boot', {}, { autoPersist: false });
  }

  on(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    if (typeof listener !== 'function') {
      throw new Error('UniversalAccessibilityStateRecoveryRuntime listener must be a function.');
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
    const safeChannel = String(channel || '').trim() || 'accessibility-recovery-event';
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

  pushWarning(message = 'unknown warning') {
    this.state.diagnostics.warnings.push(sanitizeString(message, 500));
    if (this.state.diagnostics.warnings.length > Math.max(10, toFiniteNumber(this.options.maxWarnings, 200))) {
      this.state.diagnostics.warnings.shift();
    }
  }

  pushRecoverableError(message = 'recoverable error') {
    this.state.diagnostics.recoverableErrors.push(sanitizeString(message, 500));
    if (this.state.diagnostics.recoverableErrors.length > Math.max(10, toFiniteNumber(this.options.maxRecoverableErrors, 100))) {
      this.state.diagnostics.recoverableErrors.shift();
    }
  }

  pushRuntimeEvent(event = {}) {
    const normalized = sanitizeMetadata({
      id: String(event?.id || `accessibility-event-${Date.now()}`),
      type: String(event?.type || 'accessibility-event'),
      action: String(event?.action || 'unknown'),
      timelineTimeMs: Math.max(0, toFiniteNumber(event?.timelineTimeMs, this.state.timelineTimeMs)),
      payload: sanitizeMetadata(event?.payload || {}),
      createdAt: Date.now()
    });

    this.state.runtimeEvents.recent.push(normalized);
    if (this.state.runtimeEvents.recent.length > Math.max(10, toFiniteNumber(this.options.maxEvents, 600))) {
      this.state.runtimeEvents.recent.shift();
    }

    return normalized;
  }

  updateFeatures(features = []) {
    const result = collectKnownAndUnknownFeatures(features);
    this.state.knownFeatures = result.knownFeatures;
    this.state.unknownFeatures = result.unknownFeatures;
    this.state.metrics.unknownFeatureCount = result.unknownFeatures.length;
  }

  updateAccessibilitySettings(patch = {}) {
    const source = isObject(patch) ? patch : {};
    const knownPatch = {
      keyboardNavigation: isObject(source.keyboardNavigation) ? source.keyboardNavigation : {},
      screenReader: isObject(source.screenReader) ? source.screenReader : {},
      focusManagement: isObject(source.focusManagement) ? source.focusManagement : {},
      visual: isObject(source.visual) ? source.visual : {},
      timing: isObject(source.timing) ? source.timing : {},
      captions: isObject(source.captions) ? source.captions : {},
      narration: isObject(source.narration) ? source.narration : {},
      preferences: isObject(source.preferences) ? source.preferences : {}
    };

    const unknownSettings = { ...source };
    Object.keys(knownPatch).forEach((key) => {
      delete unknownSettings[key];
    });

    const focusOrder = asArray(knownPatch.keyboardNavigation.focusOrder).length
      ? asArray(knownPatch.keyboardNavigation.focusOrder).map((entry) => String(entry || '').trim()).filter(Boolean)
      : this.state.accessibility.keyboardNavigation.focusOrder;

    this.state.accessibility = {
      ...this.state.accessibility,
      keyboardNavigation: {
        ...this.state.accessibility.keyboardNavigation,
        ...knownPatch.keyboardNavigation,
        focusOrder,
        focusIndex: focusOrder.length
          ? Math.max(0, Math.min(focusOrder.length - 1, toFiniteNumber(knownPatch.keyboardNavigation.focusIndex, this.state.accessibility.keyboardNavigation.focusIndex)))
          : -1,
        activeFocusId: String(knownPatch.keyboardNavigation.activeFocusId || this.state.accessibility.keyboardNavigation.activeFocusId || '').trim() || null
      },
      screenReader: {
        ...this.state.accessibility.screenReader,
        ...knownPatch.screenReader,
        metadataByObjectId: sanitizeMetadata(knownPatch.screenReader.metadataByObjectId || this.state.accessibility.screenReader.metadataByObjectId),
        liveRegionQueue: asArray(knownPatch.screenReader.liveRegionQueue || this.state.accessibility.screenReader.liveRegionQueue)
          .map((item) => ({
            message: sanitizeString(item?.message || item?.text || '', 1200),
            createdAt: Math.max(0, toFiniteNumber(item?.createdAt, Date.now()))
          }))
          .filter((item) => item.message)
      },
      focusManagement: {
        ...this.state.accessibility.focusManagement,
        ...knownPatch.focusManagement,
        lastFocusedId: String(knownPatch.focusManagement.lastFocusedId || this.state.accessibility.focusManagement.lastFocusedId || '').trim() || null,
        focusHistory: asArray(knownPatch.focusManagement.focusHistory || this.state.accessibility.focusManagement.focusHistory)
          .map((entry) => String(entry || '').trim())
          .filter(Boolean)
          .slice(-Math.max(10, toFiniteNumber(this.options.maxFocusHistory, 250)))
      },
      visual: {
        ...this.state.accessibility.visual,
        ...knownPatch.visual,
        highContrastMode: (knownPatch.visual.highContrastMode ?? this.state.accessibility.visual.highContrastMode) === true,
        reducedMotion: (knownPatch.visual.reducedMotion ?? this.state.accessibility.visual.reducedMotion) === true,
        uiScale: normalizeScale(knownPatch.visual.uiScale ?? this.state.accessibility.visual.uiScale, 1),
        fontScale: normalizeScale(knownPatch.visual.fontScale ?? this.state.accessibility.visual.fontScale, 1)
      },
      timing: {
        ...this.state.accessibility.timing,
        ...knownPatch.timing,
        interactionTimingMs: normalizeTiming(knownPatch.timing.interactionTimingMs ?? this.state.accessibility.timing.interactionTimingMs, 0),
        keyboardRepeatDelayMs: normalizeTiming(knownPatch.timing.keyboardRepeatDelayMs ?? this.state.accessibility.timing.keyboardRepeatDelayMs, 250),
        captionDelayMs: normalizeTiming(knownPatch.timing.captionDelayMs ?? this.state.accessibility.timing.captionDelayMs, 0),
        narrationDelayMs: normalizeTiming(knownPatch.timing.narrationDelayMs ?? this.state.accessibility.timing.narrationDelayMs, 0),
        custom: sanitizeMetadata(knownPatch.timing.custom || this.state.accessibility.timing.custom)
      },
      captions: {
        ...this.state.accessibility.captions,
        ...knownPatch.captions,
        tracks: sanitizeMetadata(knownPatch.captions.tracks || this.state.accessibility.captions.tracks || []),
        cues: sanitizeMetadata(knownPatch.captions.cues || this.state.accessibility.captions.cues || []),
        metadata: sanitizeMetadata(knownPatch.captions.metadata || this.state.accessibility.captions.metadata || {})
      },
      narration: {
        ...this.state.accessibility.narration,
        ...knownPatch.narration,
        segments: sanitizeMetadata(knownPatch.narration.segments || this.state.accessibility.narration.segments || []),
        summary: sanitizeMetadata(knownPatch.narration.summary || this.state.accessibility.narration.summary || {}),
        metadata: sanitizeMetadata(knownPatch.narration.metadata || this.state.accessibility.narration.metadata || {})
      },
      preferences: sanitizeMetadata({
        ...(this.state.accessibility.preferences || {}),
        ...(knownPatch.preferences || {})
      }),
      unknownSettings: sanitizeMetadata({
        ...(this.state.accessibility.unknownSettings || {}),
        ...(unknownSettings || {})
      })
    };

    this.updateFeatures([
      ...this.state.knownFeatures,
      ...Object.keys(unknownSettings)
    ]);

    const event = this.pushRuntimeEvent({
      type: 'accessibility-settings',
      action: 'update-accessibility-settings',
      payload: {
        knownKeys: Object.keys(knownPatch).filter((key) => Object.keys(knownPatch[key] || {}).length > 0),
        unknownKeys: Object.keys(unknownSettings)
      }
    });

    this.emit('accessibility-settings-updated', {
      event
    });

    this.synchronize('update-accessibility-settings');
    return this.snapshot();
  }

  setHighContrastMode(enabled = false) {
    return this.updateAccessibilitySettings({
      visual: {
        highContrastMode: enabled === true
      }
    });
  }

  setReducedMotion(enabled = false) {
    return this.updateAccessibilitySettings({
      visual: {
        reducedMotion: enabled === true
      }
    });
  }

  setFontScale(scale = 1) {
    return this.updateAccessibilitySettings({
      visual: {
        fontScale: normalizeScale(scale, 1)
      }
    });
  }

  setUiScale(scale = 1) {
    return this.updateAccessibilitySettings({
      visual: {
        uiScale: normalizeScale(scale, 1)
      }
    });
  }

  setInteractionTiming(timingMs = 0) {
    return this.updateAccessibilitySettings({
      timing: {
        interactionTimingMs: normalizeTiming(timingMs, 0)
      }
    });
  }

  navigateFocus(direction = 'next') {
    const focusOrder = asArray(this.state.accessibility.keyboardNavigation.focusOrder);
    if (!focusOrder.length) {
      this.pushWarning('Focus navigation attempted without focusable nodes.');
      return this.snapshot();
    }

    const currentIndex = Math.max(0, toFiniteNumber(this.state.accessibility.keyboardNavigation.focusIndex, 0));
    let nextIndex = currentIndex;

    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % focusOrder.length;
    } else if (direction === 'previous') {
      nextIndex = (currentIndex - 1 + focusOrder.length) % focusOrder.length;
    } else if (direction === 'first') {
      nextIndex = 0;
    } else if (direction === 'last') {
      nextIndex = focusOrder.length - 1;
    }

    const activeFocusId = focusOrder[nextIndex] || null;

    this.state.accessibility.keyboardNavigation.focusIndex = nextIndex;
    this.state.accessibility.keyboardNavigation.activeFocusId = activeFocusId;
    this.state.accessibility.keyboardNavigation.lastAction = `navigate-${direction}`;
    this.state.accessibility.focusManagement.lastFocusedId = activeFocusId;
    this.state.accessibility.focusManagement.focusHistory.push(activeFocusId);
    this.state.accessibility.focusManagement.focusHistory = this.state.accessibility.focusManagement.focusHistory
      .slice(-Math.max(10, toFiniteNumber(this.options.maxFocusHistory, 250)));

    this.state.metrics.focusMoves += 1;
    this.state.metrics.keyboardActions += 1;

    const event = this.pushRuntimeEvent({
      type: 'keyboard-navigation',
      action: `focus-${direction}`,
      payload: {
        activeFocusId,
        focusIndex: nextIndex
      }
    });

    this.emit('accessibility-focus-changed', {
      event
    });

    this.synchronize('navigate-focus');
    return this.snapshot();
  }

  setFocusById(objectId = null) {
    const key = String(objectId || '').trim();
    if (!key) return this.snapshot();

    const focusOrder = asArray(this.state.accessibility.keyboardNavigation.focusOrder);
    if (!focusOrder.includes(key)) {
      focusOrder.push(key);
    }

    const focusIndex = focusOrder.indexOf(key);

    this.state.accessibility.keyboardNavigation.focusOrder = focusOrder;
    this.state.accessibility.keyboardNavigation.focusIndex = focusIndex;
    this.state.accessibility.keyboardNavigation.activeFocusId = key;
    this.state.accessibility.focusManagement.lastFocusedId = key;
    this.state.accessibility.focusManagement.focusHistory.push(key);
    this.state.accessibility.focusManagement.focusHistory = this.state.accessibility.focusManagement.focusHistory
      .slice(-Math.max(10, toFiniteNumber(this.options.maxFocusHistory, 250)));

    this.state.metrics.focusMoves += 1;

    const event = this.pushRuntimeEvent({
      type: 'focus-management',
      action: 'focus-by-id',
      payload: {
        objectId: key,
        focusIndex
      }
    });

    this.emit('accessibility-focus-changed', {
      event
    });

    this.synchronize('set-focus-by-id');
    return this.snapshot();
  }

  synchronizeSessionState(reason = 'manual') {
    const schedulerSnapshot = this.scheduler?.snapshot?.() || {};
    const adaptive = this.runtime?.adaptiveTeachingRuntime?.snapshot?.() || {};
    const inputCamera = this.runtime?.inputCameraControlRuntime?.snapshot?.() || {};
    const interaction = this.runtime?.interactionContractRuntime?.snapshot?.() || {};
    const inspection = this.runtime?.educationalInspectionRuntime?.snapshot?.() || {};

    this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);

    this.state.session = {
      ...this.state.session,
      currentLesson: this.runtime?.metadata?.title || this.runtime?.sceneJson?.title || this.state.session.currentLesson,
      runtimeScene: {
        sceneId: this.runtime?.sceneId || this.state.sceneId,
        ...summarizeSceneGraph(this.runtime)
      },
      timelinePosition: this.state.timelineTimeMs,
      playbackState: String(schedulerSnapshot?.playbackState || this.state.session.playbackState || 'Ready'),
      cameraMetadata: sanitizeMetadata(inputCamera?.camera || this.runtime?.metadata?.inputCameraControl?.camera || this.state.session.cameraMetadata),
      interactionState: sanitizeMetadata(interaction || this.runtime?.metadata?.interactionContract || this.state.session.interactionState),
      selectedObjects: asArray(inspection?.objects?.selectedIds || this.runtime?.metadata?.educationalInspection?.objects?.selectedIds || this.state.session.selectedObjects),
      checkpoints: sanitizeCheckpointList(this.scheduler?.checkpoints?.toJSON?.() || this.state.session.checkpoints || []),
      quizProgress: sanitizeMetadata(this.runtime?.metadata?.quizProgress || this.runtime?.metadata?.quiz || this.state.session.quizProgress),
      learningProgress: sanitizeMetadata(adaptive?.progress || this.runtime?.progressTracker?.getSnapshot?.() || this.state.session.learningProgress),
      aiTeacherState: sanitizeMetadata(this.runtime?.metadata?.aiTeacherAdapter || this.state.session.aiTeacherState),
      userPreferences: sanitizeMetadata({
        ...(this.state.session.userPreferences || {}),
        ...(this.runtime?.metadata?.userPreferences || {}),
        ...(this.state.accessibility.preferences || {})
      }),
      unknownState: sanitizeMetadata(this.state.session.unknownState || {})
    };

    const event = this.pushRuntimeEvent({
      type: 'session-sync',
      action: reason,
      payload: {
        timelineTimeMs: this.state.timelineTimeMs,
        playbackState: this.state.session.playbackState,
        selectedObjectCount: this.state.session.selectedObjects.length,
        checkpointCount: this.state.session.checkpoints.length
      }
    });

    this.emit('accessibility-session-synchronized', {
      event
    });

    return this.snapshot();
  }

  createPersistencePayload() {
    return {
      schemaVersion: DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG.schemaVersion,
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

    this.emit('accessibility-session-persisted', {
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
    if (!parsed) {
      this.state.recovery.corruptionRecovered = true;
      this.state.diagnostics.corruptionRecoveries += 1;
      this.pushRecoverableError('Session payload was corrupted and could not be parsed.');
      this.synchronize('recover-corrupted', {}, { autoPersist: true });
      return false;
    }

    const migration = migrateLegacyPayload(parsed, this.state);
    const normalized = normalizeRestoredState(migration.migrated, this.state);

    this.state = normalized;
    this.state.recovery.interrupted = true;
    this.state.recovery.resumeReason = 'session-recovered';
    this.state.recovery.resumedAt = Date.now();

    if (migration.migrationApplied) {
      this.state.recovery.migrationApplied = true;
      this.state.recovery.versionBeforeMigration = migration.versionBeforeMigration;
      this.state.diagnostics.migrations += 1;
    }

    this.state.diagnostics.recoveredSessions += 1;
    this.state.metrics.restores += 1;

    const timelinePosition = Math.max(0, toFiniteNumber(this.state?.session?.timelinePosition, this.state.timelineTimeMs));
    this.state.timelineTimeMs = timelinePosition;
    this.scheduler?.seekByTime?.(timelinePosition);

    this.synchronize('recover-session', {
      recovered: true
    }, {
      autoPersist: false
    });

    this.emit('accessibility-session-recovered', {
      persistenceKey: this.persistenceKey,
      timelinePosition
    });

    return true;
  }

  recoverFromCorruptedState(reason = 'manual-corruption-recovery') {
    this.state = buildDefaultState(this.runtime, this.options);
    this.state.recovery.corruptionRecovered = true;
    this.state.recovery.resumeReason = sanitizeString(reason, 240);
    this.state.diagnostics.corruptionRecoveries += 1;
    this.pushRecoverableError('Corrupted session was reset to safe defaults.');
    this.synchronize('recover-corrupted-state');
    return this.snapshot();
  }

  restoreFromCheckpoint(checkpointId = null) {
    const key = String(checkpointId || '').trim();
    if (!key) {
      this.pushWarning('restoreFromCheckpoint called without checkpoint id.');
      return this.snapshot();
    }

    this.scheduler?.seekByCheckpoint?.(key);
    this.state.recovery.checkpointId = key;
    this.state.recovery.resumeReason = 'checkpoint-restore';
    this.state.recovery.resumedAt = Date.now();
    this.state.metrics.checkpointRestores += 1;

    const event = this.pushRuntimeEvent({
      type: 'checkpoint',
      action: 'restore-checkpoint',
      payload: {
        checkpointId: key
      }
    });

    this.emit('accessibility-checkpoint-restored', {
      event
    });

    this.synchronize('restore-checkpoint');
    return this.snapshot();
  }

  attachScheduler(scheduler) {
    if (!scheduler || typeof scheduler.on !== 'function') return;

    const unsubscribe = scheduler.on('*', (event) => {
      const eventName = String(event?.name || '').trim();
      if (!eventName) return;

      this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);

      if (eventName === 'TimelinePaused') {
        this.state.recovery.interrupted = true;
        this.state.recovery.resumeReason = 'timeline-paused';
      }

      if (eventName === 'TimelineResumed') {
        this.state.recovery.interrupted = false;
        this.state.recovery.resumeReason = 'timeline-resumed';
      }

      if (eventName === 'CheckpointReached') {
        const checkpointId = String(event?.payload?.checkpointId || '').trim();
        if (checkpointId) {
          this.state.recovery.checkpointId = checkpointId;
        }
      }

      this.synchronize(`timeline:${eventName}`);
    });

    this.unsubscribers.push(unsubscribe);
  }

  handleExternalTimelineMutation(type = 'manual', payload = {}) {
    const mutation = sanitizeString(type || 'manual', 200).toLowerCase();

    if (mutation.includes('pause')) {
      this.state.recovery.interrupted = true;
      this.state.recovery.resumeReason = mutation;
    }

    if (mutation.includes('resume') || mutation.includes('recover') || mutation.includes('reconnect')) {
      this.state.recovery.interrupted = false;
      this.state.recovery.resumeReason = mutation;
      this.state.recovery.resumedAt = Date.now();
    }

    if (mutation.includes('crash') || mutation.includes('network')) {
      this.state.recovery.interrupted = true;
      this.state.recovery.resumeReason = mutation;
      this.pushRecoverableError(`Recovered from external mutation: ${mutation}`);
    }

    const event = this.pushRuntimeEvent({
      type: 'timeline-mutation',
      action: mutation,
      payload: sanitizeMetadata(payload)
    });

    this.emit('accessibility-timeline-mutation', {
      event
    });

    this.synchronize(`external-mutation:${mutation}`);
    return this.snapshot();
  }

  synchronize(reason = 'manual', context = {}, options = {}) {
    this.state.diagnostics.synchronizations += 1;
    this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);

    this.synchronizeSessionState(reason);

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      accessibilityRecovery: this.snapshot(),
      rendererAdapter: {
        ...(this.runtime.metadata?.rendererAdapter || {}),
        accessibilityRecoveryState: this.snapshot()
      },
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        accessibilityRecoveryState: this.snapshot()
      },
      interactionEngine: {
        ...(this.runtime.metadata?.interactionEngine || {}),
        accessibilityRecoveryState: this.snapshot()
      }
    };

    this.emit('accessibility-synchronized', {
      reason,
      context: sanitizeMetadata(context || {})
    });

    if (options?.autoPersist !== false) {
      this.persistSession();
    }

    return this.snapshot();
  }

  snapshot() {
    return deepClone(this.state);
  }

  destroy() {
    this.persistSession();

    this.unsubscribers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });

    this.unsubscribers = [];

    this.emit('accessibility-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });
  }

  static supportedChannels() {
    return [
      'accessibility-settings-updated',
      'accessibility-focus-changed',
      'accessibility-session-synchronized',
      'accessibility-session-persisted',
      'accessibility-session-recovered',
      'accessibility-checkpoint-restored',
      'accessibility-timeline-mutation',
      'accessibility-synchronized',
      'accessibility-destroyed'
    ];
  }
}

export function createUniversalAccessibilityStateRecoveryRuntime(runtime = {}, options = {}) {
  return new UniversalAccessibilityStateRecoveryRuntime(runtime, options);
}
