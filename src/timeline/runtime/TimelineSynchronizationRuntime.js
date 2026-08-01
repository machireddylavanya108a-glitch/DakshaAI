import { isObject } from './TimelineRuntimeConfig.js';

const STORE_KEY = '__daksha_timeline_persistence_store__';

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

function mapSize(value) {
  if (!value) return 0;
  if (typeof value.size === 'number') return value.size;
  if (Array.isArray(value)) return value.length;
  return 0;
}

function safeEmit(listenersMap, channel, payload) {
  const listeners = listenersMap.get(channel);
  if (!listeners || listeners.size === 0) return;

  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // Listener failures are isolated from synchronization runtime.
    }
  });
}

function getRuntimeGraphSummary(runtime = {}) {
  const graph = runtime?.graph;
  if (!graph) {
    return {
      nodeCount: 0,
      relationshipCount: 0
    };
  }

  return {
    nodeCount: typeof graph.getNodeCount === 'function' ? Number(graph.getNodeCount()) : mapSize(graph.nodes),
    relationshipCount: typeof graph.getRelationshipCount === 'function' ? Number(graph.getRelationshipCount()) : mapSize(graph.edges)
  };
}

function getTimelineSummary(runtime = {}) {
  const metadata = runtime?.metadata?.timeline || {};
  return {
    timelineId: metadata.timelineId || null,
    version: metadata.version || null,
    trackIds: Array.isArray(metadata.trackIds) ? [...metadata.trackIds] : [],
    clipIds: Array.isArray(metadata.clipIds) ? [...metadata.clipIds] : [],
    markerIds: Array.isArray(metadata.markerIds) ? [...metadata.markerIds] : [],
    eventIds: Array.isArray(metadata.eventIds) ? [...metadata.eventIds] : []
  };
}

function getPlaybackSummary(scheduler) {
  const snapshot = scheduler?.snapshot?.() || {};
  const cursor = snapshot.cursor || {};
  return {
    state: snapshot.playbackState || 'Idle',
    timeMs: Number(snapshot?.clock?.timeMs || 0),
    speed: Number(snapshot?.speed || 1),
    progress: Number(cursor.progress || 0),
    currentClipId: cursor?.currentClip?.id || null,
    currentMarkerId: cursor?.currentMarker?.id || null,
    currentEventId: cursor?.currentEvent?.id || null,
    currentChapterId: cursor?.currentChapter?.id || null,
    queueDepth: Number(snapshot.queueDepth || 0),
    loop: snapshot.loop || {},
    branch: snapshot.branch || {},
    checkpointId: scheduler?.checkpoints?.latest?.()?.id || null
  };
}

function resolveActiveNarrationSegment(narration = {}, timeMs = 0) {
  const segments = Array.isArray(narration?.segments) ? narration.segments : [];
  const safeTime = Number(timeMs || 0);

  for (const segment of segments) {
    const start = Number(segment?.timestampMs || 0);
    const duration = Number(segment?.durationMs || 0);
    const end = start + Math.max(0, duration);
    if (safeTime >= start && safeTime <= end) {
      return segment;
    }
  }

  return segments[0] || null;
}

function resolveActiveNarrationCues(narration = {}, segmentId = null) {
  const cues = Array.isArray(narration?.cues?.all) ? narration.cues.all : [];
  if (!segmentId) return [];
  return cues.filter((cue) => String(cue?.segmentId || '') === String(segmentId));
}

function createChannelSet() {
  return new Map();
}

export class TimelineSynchronizationRuntime {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = isObject(options) ? options : {};
    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.sceneEventRuntime = runtime?.sceneEventRuntime || runtime?.sceneEventSystem || null;
    this.narrationSynchronizationRuntime = runtime?.narrationSynchronizationRuntime || null;
    this.speechPlaybackRuntime = runtime?.speechPlaybackRuntime || null;
    this.adaptiveTeachingRuntime = runtime?.adaptiveTeachingRuntime || null;
    this.aiTeacherRuntime = runtime?.aiTeacherRuntime || null;
    this.assessmentRuntime = runtime?.assessmentRuntime || null;
    this.interactionContractRuntime = runtime?.interactionContractRuntime || null;
    this.inputCameraControlRuntime = runtime?.inputCameraControlRuntime || null;
    this.educationalInspectionRuntime = runtime?.educationalInspectionRuntime || null;
    this.accessibilityStateRecoveryRuntime = runtime?.accessibilityStateRecoveryRuntime || null;
    this.assetLoadingRuntime = runtime?.assetLoadingRuntime || null;
    this.rendererCore = runtime?.rendererCore || null;
    this.animationTimelineIntegrationRuntime = runtime?.animationTimelineIntegrationRuntime || null;
    this.adaptiveRenderingPerformanceRuntime = runtime?.adaptiveRenderingPerformanceRuntime || null;
    this.interactionEngine = runtime?.behaviorRuntime || null;
    this.persistenceAdapter = this.options.persistenceAdapter || this.scheduler?.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = String(this.options.persistenceKey || this.scheduler?.persistenceKey || 'daksha.timeline.runtime.v1');

    this.listeners = createChannelSet();
    this.unsubscribers = [];
    this.sharedState = this.createSharedState('boot');

    this.attachScheduler(this.scheduler);
    this.attachSceneEventRuntime(this.sceneEventRuntime);
    this.attachNarrationSynchronizationRuntime(this.narrationSynchronizationRuntime);
    this.attachSpeechPlaybackRuntime(this.speechPlaybackRuntime);
    this.attachAdaptiveTeachingRuntime(this.adaptiveTeachingRuntime);
    this.attachAITeacherRuntime(this.aiTeacherRuntime);
    this.attachAssessmentRuntime(this.assessmentRuntime);
    this.attachInteractionContractRuntime(this.interactionContractRuntime);
    this.attachInputCameraControlRuntime(this.inputCameraControlRuntime);
    this.attachEducationalInspectionRuntime(this.educationalInspectionRuntime);
    this.attachAccessibilityStateRecoveryRuntime(this.accessibilityStateRecoveryRuntime);
    this.attachAssetLoadingRuntime(this.assetLoadingRuntime);
    this.attachRendererCore(this.rendererCore);
    this.attachAnimationTimelineIntegrationRuntime(this.animationTimelineIntegrationRuntime);
    this.attachAdaptiveRenderingPerformanceRuntime(this.adaptiveRenderingPerformanceRuntime);
    this.attachInteractionEngine(this.interactionEngine);
  }

  createSharedState(reason = 'manual', sessionPatch = {}) {
    const graphSummary = getRuntimeGraphSummary(this.runtime);
    const timelineSummary = getTimelineSummary(this.runtime);
    const playback = getPlaybackSummary(this.scheduler);
    const narration = this.runtime?.metadata?.narration || {
      segments: [],
      cues: { all: [] },
      summary: { segmentCount: 0, cueCount: 0, totalDurationMs: 0 }
    };
    const activeNarrationSegment = resolveActiveNarrationSegment(narration, playback.timeMs);
    const activeNarrationCues = resolveActiveNarrationCues(narration, activeNarrationSegment?.id || null);
    const narrationSynchronizationState = this.narrationSynchronizationRuntime?.snapshot?.() || null;
    const speechPlaybackState = this.speechPlaybackRuntime?.snapshot?.() || this.runtime?.metadata?.speechPlayback || null;
    const adaptiveLearningState = this.adaptiveTeachingRuntime?.snapshot?.() || this.runtime?.metadata?.adaptiveLearning || null;
    const aiTeacherRuntimeState = this.aiTeacherRuntime?.snapshot?.() || this.runtime?.metadata?.aiTeacherRuntime || null;
    const assessmentRuntimeState = this.assessmentRuntime?.snapshot?.() || this.runtime?.metadata?.assessmentRuntime || null;
    const interactionContractState = this.interactionContractRuntime?.snapshot?.() || this.runtime?.metadata?.interactionContract || null;
    const inputCameraControlState = this.inputCameraControlRuntime?.snapshot?.() || this.runtime?.metadata?.inputCameraControl || null;
    const educationalInspectionState = this.educationalInspectionRuntime?.snapshot?.() || this.runtime?.metadata?.educationalInspection || null;
    const accessibilityRecoveryState = this.accessibilityStateRecoveryRuntime?.snapshot?.() || this.runtime?.metadata?.accessibilityRecovery || null;
    const visualizationStrategyState = this.runtime?.metadata?.visualizationStrategy || null;
    const capabilityTemplateRecommendationState = this.runtime?.metadata?.capabilityTemplateRecommendation || null;
    const confidenceConflictFallbackState = this.runtime?.metadata?.confidenceConflictFallback || null;
    const assetRegistryState = this.runtime?.metadata?.assetRegistry || null;
    const assetDiscoveryState = this.runtime?.metadata?.assetDiscovery || null;
    const assetLoadingState = this.assetLoadingRuntime?.snapshot?.() || this.runtime?.metadata?.assetLoading || null;
    const rendererCoreState = this.rendererCore?.snapshot?.() || this.runtime?.metadata?.rendererCore || null;
    const animationTimelineIntegrationState = this.animationTimelineIntegrationRuntime?.snapshot?.()
      || this.runtime?.metadata?.animationTimelineIntegration
      || null;
    const adaptiveRenderingPerformanceState = this.adaptiveRenderingPerformanceRuntime?.snapshot?.()
      || this.runtime?.metadata?.adaptiveRenderingPerformance
      || null;
    const previousSession = this.sharedState?.session || {
      persistenceKey: this.persistenceKey,
      recovered: false,
      persistedAt: null
    };

    return {
      schemaVersion: 'v1',
      reason,
      updatedAt: Date.now(),
      sceneId: this.runtime?.sceneId || null,
      timeline: timelineSummary,
      narration: {
        summary: narration.summary || {},
        activeSegmentId: activeNarrationSegment?.id || null,
        activeCueIds: activeNarrationCues.map((cue) => cue.id),
        segmentCount: Number(narration?.summary?.segmentCount || narration?.segments?.length || 0),
        cueCount: Number(narration?.summary?.cueCount || narration?.cues?.all?.length || 0),
        synchronization: narrationSynchronizationState
      },
      speechPlayback: speechPlaybackState,
      adaptiveLearning: adaptiveLearningState,
      aiTeacherRuntime: aiTeacherRuntimeState,
      assessmentRuntime: assessmentRuntimeState,
      interactionContract: interactionContractState,
      inputCameraControl: inputCameraControlState,
      educationalInspection: educationalInspectionState,
      accessibilityRecovery: accessibilityRecoveryState,
      visualizationStrategy: visualizationStrategyState,
      capabilityTemplateRecommendation: capabilityTemplateRecommendationState,
      confidenceConflictFallback: confidenceConflictFallbackState,
      assetRegistry: assetRegistryState,
      assetDiscovery: assetDiscoveryState,
      assetLoading: assetLoadingState,
      rendererCore: rendererCoreState,
      animationTimelineIntegration: animationTimelineIntegrationState,
      adaptiveRenderingPerformance: adaptiveRenderingPerformanceState,
      playback,
      sceneGraph: {
        nodeCount: graphSummary.nodeCount,
        relationshipCount: graphSummary.relationshipCount,
        diagnostics: this.runtime?.diagnostics || {}
      },
      runtimeGraph: {
        nodeCount: graphSummary.nodeCount,
        relationshipCount: graphSummary.relationshipCount
      },
      adapters: {
        aiTeacher: {
          state: playback.state,
          timeMs: playback.timeMs,
          checkpointId: playback.checkpointId,
          progress: playback.progress,
          activeNarrationSegmentId: activeNarrationSegment?.id || null,
          activeNarrationCueIds: activeNarrationCues.map((cue) => cue.id),
          narrationSynchronizationState,
          speechPlaybackState,
          adaptiveLearningState,
          aiTeacherRuntimeState,
          assessmentRuntimeState,
          interactionContractState,
          inputCameraControlState,
          educationalInspectionState,
          accessibilityRecoveryState,
          visualizationStrategyState,
          capabilityTemplateRecommendationState,
          confidenceConflictFallbackState,
          assetRegistryState,
          assetDiscoveryState,
          assetLoadingState,
          rendererCoreState,
          animationTimelineIntegrationState,
          adaptiveRenderingPerformanceState,
          updatedAt: Date.now()
        },
        assessment: {
          state: playback.state,
          timeMs: playback.timeMs,
          checkpointId: playback.checkpointId,
          progress: playback.progress,
          activeNarrationSegmentId: activeNarrationSegment?.id || null,
          activeNarrationCueIds: activeNarrationCues.map((cue) => cue.id),
          narrationSynchronizationState,
          speechPlaybackState,
          adaptiveLearningState,
          aiTeacherRuntimeState,
          assessmentRuntimeState,
          interactionContractState,
          inputCameraControlState,
          educationalInspectionState,
          accessibilityRecoveryState,
          visualizationStrategyState,
          capabilityTemplateRecommendationState,
          confidenceConflictFallbackState,
          assetRegistryState,
          assetDiscoveryState,
          assetLoadingState,
          rendererCoreState,
          animationTimelineIntegrationState,
          adaptiveRenderingPerformanceState,
          updatedAt: Date.now()
        },
        rendererAdapter: {
          state: playback.state,
          timeMs: playback.timeMs,
          speed: playback.speed,
          currentClipId: playback.currentClipId,
          activeNarrationSegmentId: activeNarrationSegment?.id || null,
          activeNarrationCueIds: activeNarrationCues.map((cue) => cue.id),
          narrationSynchronizationState,
          speechPlaybackState,
          adaptiveLearningState,
          aiTeacherRuntimeState,
          assessmentRuntimeState,
          interactionContractState,
          inputCameraControlState,
          educationalInspectionState,
          accessibilityRecoveryState,
          visualizationStrategyState,
          capabilityTemplateRecommendationState,
          confidenceConflictFallbackState,
          assetRegistryState,
          assetDiscoveryState,
          assetLoadingState,
          rendererCoreState,
          animationTimelineIntegrationState,
          adaptiveRenderingPerformanceState,
          updatedAt: Date.now()
        },
        interactionEngine: {
          state: playback.state,
          timeMs: playback.timeMs,
          currentEventId: playback.currentEventId,
          activeNarrationSegmentId: activeNarrationSegment?.id || null,
          activeNarrationCueIds: activeNarrationCues.map((cue) => cue.id),
          narrationSynchronizationState,
          speechPlaybackState,
          adaptiveLearningState,
          aiTeacherRuntimeState,
          assessmentRuntimeState,
          interactionContractState,
          inputCameraControlState,
          educationalInspectionState,
          accessibilityRecoveryState,
          visualizationStrategyState,
          capabilityTemplateRecommendationState,
          confidenceConflictFallbackState,
          assetRegistryState,
          assetDiscoveryState,
          assetLoadingState,
          rendererCoreState,
          animationTimelineIntegrationState,
          adaptiveRenderingPerformanceState,
          updatedAt: Date.now()
        }
      },
      session: {
        ...previousSession,
        persistenceKey: this.persistenceKey,
        ...sessionPatch
      }
    };
  }

  on(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    if (typeof listener !== 'function') {
      throw new Error('TimelineSynchronizationRuntime listener must be a function.');
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
    const safeChannel = String(channel || '').trim() || 'timeline-sync';
    const message = {
      channel: safeChannel,
      payload,
      state: this.getSharedState(),
      timestamp: Date.now()
    };

    safeEmit(this.listeners, safeChannel, message);
    safeEmit(this.listeners, '*', message);
    return message;
  }

  attachScheduler(scheduler) {
    if (!scheduler || typeof scheduler.on !== 'function') return;

    const unsubscribe = scheduler.on('*', (event) => {
      this.synchronize('timeline-event', {
        eventName: event?.name || 'UnknownRuntimeEvent',
        payload: event?.payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachSceneEventRuntime(sceneEventRuntime) {
    if (!sceneEventRuntime || typeof sceneEventRuntime.on !== 'function') return;

    const unsubscribe = sceneEventRuntime.on('SceneEventDispatched', ({ event }) => {
      this.synchronize('scene-event-dispatched', {
        eventId: event?.id || null,
        eventType: event?.type || 'unknown'
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachNarrationSynchronizationRuntime(narrationSynchronizationRuntime) {
    if (!narrationSynchronizationRuntime || typeof narrationSynchronizationRuntime.on !== 'function') return;

    const unsubscribe = narrationSynchronizationRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('narration-sync-event', {
        channel: channel || 'narration-sync',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachSpeechPlaybackRuntime(speechPlaybackRuntime) {
    if (!speechPlaybackRuntime || typeof speechPlaybackRuntime.on !== 'function') return;

    const unsubscribe = speechPlaybackRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('speech-playback-event', {
        channel: channel || 'speech-playback-event',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachAdaptiveTeachingRuntime(adaptiveTeachingRuntime) {
    if (!adaptiveTeachingRuntime || typeof adaptiveTeachingRuntime.on !== 'function') return;

    const unsubscribe = adaptiveTeachingRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('adaptive-learning-event', {
        channel: channel || 'adaptive-learning-event',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachAITeacherRuntime(aiTeacherRuntime) {
    if (!aiTeacherRuntime || typeof aiTeacherRuntime.on !== 'function') return;

    const unsubscribe = aiTeacherRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('ai-teacher-runtime-event', {
        channel: channel || 'ai-teacher-runtime-event',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachAssessmentRuntime(assessmentRuntime) {
    if (!assessmentRuntime || typeof assessmentRuntime.on !== 'function') return;

    const unsubscribe = assessmentRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('assessment-runtime-event', {
        channel: channel || 'assessment-runtime-event',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachInteractionContractRuntime(interactionContractRuntime) {
    if (!interactionContractRuntime || typeof interactionContractRuntime.on !== 'function') return;

    const unsubscribe = interactionContractRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('interaction-contract-event', {
        channel: channel || 'interaction-contract-event',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachInputCameraControlRuntime(inputCameraControlRuntime) {
    if (!inputCameraControlRuntime || typeof inputCameraControlRuntime.on !== 'function') return;

    const unsubscribe = inputCameraControlRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('input-camera-event', {
        channel: channel || 'input-camera-event',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachEducationalInspectionRuntime(educationalInspectionRuntime) {
    if (!educationalInspectionRuntime || typeof educationalInspectionRuntime.on !== 'function') return;

    const unsubscribe = educationalInspectionRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('educational-inspection-event', {
        channel: channel || 'educational-inspection-event',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachAccessibilityStateRecoveryRuntime(accessibilityStateRecoveryRuntime) {
    if (!accessibilityStateRecoveryRuntime || typeof accessibilityStateRecoveryRuntime.on !== 'function') return;

    const unsubscribe = accessibilityStateRecoveryRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('accessibility-recovery-event', {
        channel: channel || 'accessibility-recovery-event',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachAssetLoadingRuntime(assetLoadingRuntime) {
    if (!assetLoadingRuntime || typeof assetLoadingRuntime.on !== 'function') return;

    const unsubscribe = assetLoadingRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('asset-loading-event', {
        channel: channel || 'asset-loading-event',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachRendererCore(rendererCore) {
    if (!rendererCore || typeof rendererCore.on !== 'function') return;

    const unsubscribe = rendererCore.on('*', ({ channel, payload }) => {
      this.synchronize('renderer-core-event', {
        channel: channel || 'renderer-core-event',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachAnimationTimelineIntegrationRuntime(animationTimelineIntegrationRuntime) {
    if (!animationTimelineIntegrationRuntime || typeof animationTimelineIntegrationRuntime.on !== 'function') return;

    const unsubscribe = animationTimelineIntegrationRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('animation-timeline-integration-event', {
        channel: channel || 'animation-timeline-integration-event',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachAdaptiveRenderingPerformanceRuntime(adaptiveRenderingPerformanceRuntime) {
    if (!adaptiveRenderingPerformanceRuntime || typeof adaptiveRenderingPerformanceRuntime.on !== 'function') return;

    const unsubscribe = adaptiveRenderingPerformanceRuntime.on('*', ({ channel, payload }) => {
      this.synchronize('adaptive-rendering-performance-event', {
        channel: channel || 'adaptive-rendering-performance-event',
        payload: payload || {}
      });
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachInteractionEngine(interactionEngine) {
    if (!interactionEngine || typeof interactionEngine.getDiagnostics !== 'function') return;
    this.synchronize('interaction-engine-attached', {
      diagnostics: interactionEngine.getDiagnostics()
    });
  }

  synchronize(reason = 'manual', payload = {}, sessionPatch = {}) {
    this.sharedState = this.createSharedState(reason, sessionPatch);

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      timelineSynchronization: {
        schemaVersion: this.sharedState.schemaVersion,
        updatedAt: this.sharedState.updatedAt,
        channels: TimelineSynchronizationRuntime.supportedChannels()
      },
      interactionEngine: {
        ...(this.runtime.metadata?.interactionEngine || {}),
        timelineState: this.sharedState.adapters.interactionEngine,
        aiTeacherRuntimeState: this.sharedState.aiTeacherRuntime,
        assessmentRuntimeState: this.sharedState.assessmentRuntime,
        contractState: this.sharedState.interactionContract,
        inputCameraControlState: this.sharedState.inputCameraControl,
        educationalInspectionState: this.sharedState.educationalInspection,
        accessibilityRecoveryState: this.sharedState.accessibilityRecovery,
        visualizationStrategyState: this.sharedState.visualizationStrategy,
        capabilityTemplateRecommendationState: this.sharedState.capabilityTemplateRecommendation,
        confidenceConflictFallbackState: this.sharedState.confidenceConflictFallback,
        assetRegistryState: this.sharedState.assetRegistry,
        assetDiscoveryState: this.sharedState.assetDiscovery,
        assetLoadingState: this.sharedState.assetLoading
      },
      interactionContract: {
        ...(this.runtime.metadata?.interactionContract || {}),
        ...this.sharedState.interactionContract
      },
      inputCameraControl: {
        ...(this.runtime.metadata?.inputCameraControl || {}),
        ...this.sharedState.inputCameraControl
      },
      educationalInspection: {
        ...(this.runtime.metadata?.educationalInspection || {}),
        ...this.sharedState.educationalInspection
      },
      accessibilityRecovery: {
        ...(this.runtime.metadata?.accessibilityRecovery || {}),
        ...this.sharedState.accessibilityRecovery
      },
      visualizationStrategy: this.sharedState.visualizationStrategy || this.runtime.metadata?.visualizationStrategy || null,
      capabilityTemplateRecommendation:
        this.sharedState.capabilityTemplateRecommendation || this.runtime.metadata?.capabilityTemplateRecommendation || null,
      confidenceConflictFallback:
        this.sharedState.confidenceConflictFallback || this.runtime.metadata?.confidenceConflictFallback || null,
      assetRegistry:
        this.sharedState.assetRegistry || this.runtime.metadata?.assetRegistry || null,
      assetDiscovery:
        this.sharedState.assetDiscovery || this.runtime.metadata?.assetDiscovery || null,
      assetLoading:
        this.sharedState.assetLoading || this.runtime.metadata?.assetLoading || null,
      rendererCore:
        this.sharedState.rendererCore || this.runtime.metadata?.rendererCore || null,
      animationTimelineIntegration:
        this.sharedState.animationTimelineIntegration || this.runtime.metadata?.animationTimelineIntegration || null,
      adaptiveRenderingPerformance:
        this.sharedState.adaptiveRenderingPerformance || this.runtime.metadata?.adaptiveRenderingPerformance || null,
      rendererAdapter: {
        ...(this.runtime.metadata?.rendererAdapter || {}),
        timelineState: this.sharedState.adapters.rendererAdapter,
        cameraControlState: this.sharedState.inputCameraControl,
        educationalInspectionState: this.sharedState.educationalInspection,
        accessibilityRecoveryState: this.sharedState.accessibilityRecovery,
        visualizationStrategyState: this.sharedState.visualizationStrategy,
        capabilityTemplateRecommendationState: this.sharedState.capabilityTemplateRecommendation,
        confidenceConflictFallbackState: this.sharedState.confidenceConflictFallback,
        assetRegistryState: this.sharedState.assetRegistry,
        assetDiscoveryState: this.sharedState.assetDiscovery,
        assetLoadingState: this.sharedState.assetLoading,
        rendererCoreState: this.sharedState.rendererCore,
        animationTimelineIntegrationState: this.sharedState.animationTimelineIntegration,
        adaptiveRenderingPerformanceState: this.sharedState.adaptiveRenderingPerformance
      },
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        timelineState: this.sharedState.adapters.aiTeacher,
        runtimeState: this.sharedState.aiTeacherRuntime,
        inputCameraControlState: this.sharedState.inputCameraControl,
        educationalInspectionState: this.sharedState.educationalInspection,
        accessibilityRecoveryState: this.sharedState.accessibilityRecovery,
        visualizationStrategyState: this.sharedState.visualizationStrategy,
        capabilityTemplateRecommendationState: this.sharedState.capabilityTemplateRecommendation,
        confidenceConflictFallbackState: this.sharedState.confidenceConflictFallback,
        assetRegistryState: this.sharedState.assetRegistry,
        assetDiscoveryState: this.sharedState.assetDiscovery,
        assetLoadingState: this.sharedState.assetLoading,
        rendererCoreState: this.sharedState.rendererCore,
        animationTimelineIntegrationState: this.sharedState.animationTimelineIntegration,
        adaptiveRenderingPerformanceState: this.sharedState.adaptiveRenderingPerformance
      },
      assessmentAdapter: {
        ...(this.runtime.metadata?.assessmentAdapter || {}),
        timelineState: this.sharedState.adapters.assessment,
        runtimeState: this.sharedState.assessmentRuntime,
        adaptiveLearningState: this.sharedState.adaptiveLearning,
        aiTeacherRuntimeState: this.sharedState.aiTeacherRuntime,
        interactionContractState: this.sharedState.interactionContract,
        inputCameraControlState: this.sharedState.inputCameraControl,
        educationalInspectionState: this.sharedState.educationalInspection,
        accessibilityRecoveryState: this.sharedState.accessibilityRecovery
      }
    };

    this.emit('timeline-sync', {
      reason,
      ...payload
    });

    return this.getSharedState();
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const schedulerSnapshot = this.scheduler?.createPersistenceSnapshot?.() || {};
    const payload = {
      scheduler: {
        snapshot: schedulerSnapshot,
        checkpoints: this.scheduler?.checkpoints?.toJSON?.() || []
      },
      sharedState: this.getSharedState(),
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

    if (this.sharedState?.session) {
      this.sharedState.session.persistedAt = payload.persistedAt;
    }

    this.emit('timeline-persisted', {
      persistenceKey: this.persistenceKey,
      persistedAt: payload.persistedAt
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
    if (!parsed) return false;

    const schedulerSnapshot = parsePayload(parsed?.scheduler?.snapshot) || parsed?.scheduler?.snapshot || parsed;
    const checkpoints = Array.isArray(parsed?.scheduler?.checkpoints)
      ? parsed.scheduler.checkpoints
      : Array.isArray(parsed?.checkpoints)
        ? parsed.checkpoints
        : [];

    if (this.scheduler) {
      if (checkpoints.length && this.scheduler.checkpoints?.restore) {
        this.scheduler.checkpoints.restore(checkpoints);
      }

      if (schedulerSnapshot && this.scheduler.applyPersistenceSnapshot) {
        this.scheduler.applyPersistenceSnapshot(schedulerSnapshot);
      }
    }

    this.synchronize('recover', {
      recovered: true
    }, {
      recovered: true,
      persistedAt: Number(parsed?.persistedAt || Date.now())
    });

    this.emit('timeline-recovered', {
      recovered: true,
      persistenceKey: this.persistenceKey
    });

    return true;
  }

  pause(reason = 'manual') {
    this.scheduler?.pause?.(reason);
    this.sceneEventRuntime?.pause?.(reason);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('pause', { reason });
    this.adaptiveTeachingRuntime?.handleExternalTimelineMutation?.('pause', { reason });
    this.aiTeacherRuntime?.handleExternalTimelineMutation?.('pause', { reason });
    this.assessmentRuntime?.handleExternalTimelineMutation?.('pause', { reason });
    this.interactionContractRuntime?.handleExternalTimelineMutation?.('pause', { reason });
    this.inputCameraControlRuntime?.handleExternalTimelineMutation?.('pause', { reason });
    this.educationalInspectionRuntime?.handleExternalTimelineMutation?.('pause', { reason });
    this.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('pause', { reason });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('pause', { reason });
    const state = this.synchronize('pause', { reason });
    this.persistSession();
    return state;
  }

  resume(reason = 'manual') {
    this.scheduler?.resume?.(reason);
    this.sceneEventRuntime?.resume?.(reason);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('resume', { reason });
    this.adaptiveTeachingRuntime?.handleExternalTimelineMutation?.('resume', { reason });
    this.aiTeacherRuntime?.handleExternalTimelineMutation?.('resume', { reason });
    this.assessmentRuntime?.handleExternalTimelineMutation?.('resume', { reason });
    this.interactionContractRuntime?.handleExternalTimelineMutation?.('resume', { reason });
    this.inputCameraControlRuntime?.handleExternalTimelineMutation?.('resume', { reason });
    this.educationalInspectionRuntime?.handleExternalTimelineMutation?.('resume', { reason });
    this.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('resume', { reason });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('resume', { reason });
    const state = this.synchronize('resume', { reason });
    this.persistSession();
    return state;
  }

  replay(fromTimeMs = 0) {
    this.scheduler?.replay?.(fromTimeMs);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('replay', { fromTimeMs: Number(fromTimeMs || 0) });
    this.adaptiveTeachingRuntime?.handleExternalTimelineMutation?.('replay', { fromTimeMs: Number(fromTimeMs || 0) });
    this.aiTeacherRuntime?.handleExternalTimelineMutation?.('replay', { fromTimeMs: Number(fromTimeMs || 0) });
    this.assessmentRuntime?.handleExternalTimelineMutation?.('replay', { fromTimeMs: Number(fromTimeMs || 0) });
    this.interactionContractRuntime?.handleExternalTimelineMutation?.('replay', { fromTimeMs: Number(fromTimeMs || 0) });
    this.inputCameraControlRuntime?.handleExternalTimelineMutation?.('replay', { fromTimeMs: Number(fromTimeMs || 0) });
    this.educationalInspectionRuntime?.handleExternalTimelineMutation?.('replay', { fromTimeMs: Number(fromTimeMs || 0) });
    this.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('replay', { fromTimeMs: Number(fromTimeMs || 0) });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('replay', { fromTimeMs: Number(fromTimeMs || 0) });
    const state = this.synchronize('replay', { fromTimeMs });
    this.persistSession();
    return state;
  }

  restart() {
    this.scheduler?.restart?.();
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('restart', {});
    this.adaptiveTeachingRuntime?.handleExternalTimelineMutation?.('restart', {});
    this.aiTeacherRuntime?.handleExternalTimelineMutation?.('restart', {});
    this.assessmentRuntime?.handleExternalTimelineMutation?.('restart', {});
    this.interactionContractRuntime?.handleExternalTimelineMutation?.('restart', {});
    this.inputCameraControlRuntime?.handleExternalTimelineMutation?.('restart', {});
    this.educationalInspectionRuntime?.handleExternalTimelineMutation?.('restart', {});
    this.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('restart', {});
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('restart', {});
    const state = this.synchronize('restart', {});
    this.persistSession();
    return state;
  }

  setSpeed(speed) {
    this.scheduler?.setSpeed?.(speed);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('speed-change', { speed: Number(speed || 1) });
    this.adaptiveTeachingRuntime?.handleExternalTimelineMutation?.('speed-change', { speed: Number(speed || 1) });
    this.aiTeacherRuntime?.handleExternalTimelineMutation?.('speed-change', { speed: Number(speed || 1) });
    this.assessmentRuntime?.handleExternalTimelineMutation?.('speed-change', { speed: Number(speed || 1) });
    this.interactionContractRuntime?.handleExternalTimelineMutation?.('speed-change', { speed: Number(speed || 1) });
    this.inputCameraControlRuntime?.handleExternalTimelineMutation?.('speed-change', { speed: Number(speed || 1) });
    this.educationalInspectionRuntime?.handleExternalTimelineMutation?.('speed-change', { speed: Number(speed || 1) });
    this.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('speed-change', { speed: Number(speed || 1) });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('speed-change', { speed: Number(speed || 1) });
    const state = this.synchronize('speed-change', { speed });
    this.persistSession();
    return state;
  }

  seekByTime(timeMs) {
    this.scheduler?.seekByTime?.(timeMs);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-time', { timeMs: Number(timeMs || 0) });
    this.adaptiveTeachingRuntime?.handleExternalTimelineMutation?.('seek-time', { timeMs: Number(timeMs || 0) });
    this.aiTeacherRuntime?.handleExternalTimelineMutation?.('seek-time', { timeMs: Number(timeMs || 0) });
    this.assessmentRuntime?.handleExternalTimelineMutation?.('seek-time', { timeMs: Number(timeMs || 0) });
    this.interactionContractRuntime?.handleExternalTimelineMutation?.('seek-time', { timeMs: Number(timeMs || 0) });
    this.inputCameraControlRuntime?.handleExternalTimelineMutation?.('seek-time', { timeMs: Number(timeMs || 0) });
    this.educationalInspectionRuntime?.handleExternalTimelineMutation?.('seek-time', { timeMs: Number(timeMs || 0) });
    this.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('seek-time', { timeMs: Number(timeMs || 0) });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-time', { timeMs: Number(timeMs || 0) });
    const state = this.synchronize('seek-time', { timeMs: Number(timeMs || 0) });
    this.persistSession();
    return state;
  }

  seekByChapter(chapterId) {
    this.scheduler?.seekByChapter?.(chapterId);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-chapter', { chapterId: chapterId || null });
    this.adaptiveTeachingRuntime?.handleExternalTimelineMutation?.('seek-chapter', { chapterId: chapterId || null });
    this.aiTeacherRuntime?.handleExternalTimelineMutation?.('seek-chapter', { chapterId: chapterId || null });
    this.assessmentRuntime?.handleExternalTimelineMutation?.('seek-chapter', { chapterId: chapterId || null });
    this.interactionContractRuntime?.handleExternalTimelineMutation?.('seek-chapter', { chapterId: chapterId || null });
    this.inputCameraControlRuntime?.handleExternalTimelineMutation?.('seek-chapter', { chapterId: chapterId || null });
    this.educationalInspectionRuntime?.handleExternalTimelineMutation?.('seek-chapter', { chapterId: chapterId || null });
    this.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('seek-chapter', { chapterId: chapterId || null });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-chapter', { chapterId: chapterId || null });
    const state = this.synchronize('seek-chapter', { chapterId: chapterId || null });
    this.persistSession();
    return state;
  }

  seekByClip(clipId) {
    this.scheduler?.seekByClip?.(clipId);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-clip', { clipId: clipId || null });
    this.adaptiveTeachingRuntime?.handleExternalTimelineMutation?.('seek-clip', { clipId: clipId || null });
    this.aiTeacherRuntime?.handleExternalTimelineMutation?.('seek-clip', { clipId: clipId || null });
    this.assessmentRuntime?.handleExternalTimelineMutation?.('seek-clip', { clipId: clipId || null });
    this.interactionContractRuntime?.handleExternalTimelineMutation?.('seek-clip', { clipId: clipId || null });
    this.inputCameraControlRuntime?.handleExternalTimelineMutation?.('seek-clip', { clipId: clipId || null });
    this.educationalInspectionRuntime?.handleExternalTimelineMutation?.('seek-clip', { clipId: clipId || null });
    this.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('seek-clip', { clipId: clipId || null });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-clip', { clipId: clipId || null });
    const state = this.synchronize('seek-clip', { clipId: clipId || null });
    this.persistSession();
    return state;
  }

  seekByEvent(eventId) {
    this.scheduler?.seekByEvent?.(eventId);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-event', { eventId: eventId || null });
    this.adaptiveTeachingRuntime?.handleExternalTimelineMutation?.('seek-event', { eventId: eventId || null });
    this.aiTeacherRuntime?.handleExternalTimelineMutation?.('seek-event', { eventId: eventId || null });
    this.assessmentRuntime?.handleExternalTimelineMutation?.('seek-event', { eventId: eventId || null });
    this.interactionContractRuntime?.handleExternalTimelineMutation?.('seek-event', { eventId: eventId || null });
    this.inputCameraControlRuntime?.handleExternalTimelineMutation?.('seek-event', { eventId: eventId || null });
    this.educationalInspectionRuntime?.handleExternalTimelineMutation?.('seek-event', { eventId: eventId || null });
    this.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('seek-event', { eventId: eventId || null });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-event', { eventId: eventId || null });
    const state = this.synchronize('seek-event', { eventId: eventId || null });
    this.persistSession();
    return state;
  }

  seekByMarker(markerId) {
    this.scheduler?.seekByMarker?.(markerId);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-marker', { markerId: markerId || null });
    this.adaptiveTeachingRuntime?.handleExternalTimelineMutation?.('seek-marker', { markerId: markerId || null });
    this.aiTeacherRuntime?.handleExternalTimelineMutation?.('seek-marker', { markerId: markerId || null });
    this.assessmentRuntime?.handleExternalTimelineMutation?.('seek-marker', { markerId: markerId || null });
    this.interactionContractRuntime?.handleExternalTimelineMutation?.('seek-marker', { markerId: markerId || null });
    this.inputCameraControlRuntime?.handleExternalTimelineMutation?.('seek-marker', { markerId: markerId || null });
    this.educationalInspectionRuntime?.handleExternalTimelineMutation?.('seek-marker', { markerId: markerId || null });
    this.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('seek-marker', { markerId: markerId || null });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-marker', { markerId: markerId || null });
    const state = this.synchronize('seek-marker', { markerId: markerId || null });
    this.persistSession();
    return state;
  }

  seekByCheckpoint(checkpointId) {
    this.scheduler?.seekByCheckpoint?.(checkpointId);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-checkpoint', { checkpointId: checkpointId || null });
    this.adaptiveTeachingRuntime?.handleExternalTimelineMutation?.('seek-checkpoint', { checkpointId: checkpointId || null });
    this.aiTeacherRuntime?.handleExternalTimelineMutation?.('seek-checkpoint', { checkpointId: checkpointId || null });
    this.assessmentRuntime?.handleExternalTimelineMutation?.('seek-checkpoint', { checkpointId: checkpointId || null });
    this.interactionContractRuntime?.handleExternalTimelineMutation?.('seek-checkpoint', { checkpointId: checkpointId || null });
    this.inputCameraControlRuntime?.handleExternalTimelineMutation?.('seek-checkpoint', { checkpointId: checkpointId || null });
    this.educationalInspectionRuntime?.handleExternalTimelineMutation?.('seek-checkpoint', { checkpointId: checkpointId || null });
    this.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('seek-checkpoint', { checkpointId: checkpointId || null });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-checkpoint', { checkpointId: checkpointId || null });
    const state = this.synchronize('seek-checkpoint', { checkpointId: checkpointId || null });
    this.persistSession();
    return state;
  }

  seekByPercentage(percentage) {
    this.scheduler?.seekByPercentage?.(percentage);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('seek-percentage', { percentage: Number(percentage || 0) });
    this.adaptiveTeachingRuntime?.handleExternalTimelineMutation?.('seek-percentage', { percentage: Number(percentage || 0) });
    this.aiTeacherRuntime?.handleExternalTimelineMutation?.('seek-percentage', { percentage: Number(percentage || 0) });
    this.assessmentRuntime?.handleExternalTimelineMutation?.('seek-percentage', { percentage: Number(percentage || 0) });
    this.interactionContractRuntime?.handleExternalTimelineMutation?.('seek-percentage', { percentage: Number(percentage || 0) });
    this.inputCameraControlRuntime?.handleExternalTimelineMutation?.('seek-percentage', { percentage: Number(percentage || 0) });
    this.educationalInspectionRuntime?.handleExternalTimelineMutation?.('seek-percentage', { percentage: Number(percentage || 0) });
    this.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('seek-percentage', { percentage: Number(percentage || 0) });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('seek-percentage', { percentage: Number(percentage || 0) });
    const state = this.synchronize('seek-percentage', { percentage: Number(percentage || 0) });
    this.persistSession();
    return state;
  }

  resumeFromCheckpoint(checkpointId) {
    this.scheduler?.resumeFromCheckpoint?.(checkpointId);
    this.speechPlaybackRuntime?.handleExternalTimelineMutation?.('resume-checkpoint', { checkpointId: checkpointId || null });
    this.adaptiveTeachingRuntime?.handleExternalTimelineMutation?.('resume-checkpoint', { checkpointId: checkpointId || null });
    this.aiTeacherRuntime?.handleExternalTimelineMutation?.('resume-checkpoint', { checkpointId: checkpointId || null });
    this.assessmentRuntime?.handleExternalTimelineMutation?.('resume-checkpoint', { checkpointId: checkpointId || null });
    this.interactionContractRuntime?.handleExternalTimelineMutation?.('resume-checkpoint', { checkpointId: checkpointId || null });
    this.inputCameraControlRuntime?.handleExternalTimelineMutation?.('resume-checkpoint', { checkpointId: checkpointId || null });
    this.educationalInspectionRuntime?.handleExternalTimelineMutation?.('resume-checkpoint', { checkpointId: checkpointId || null });
    this.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('resume-checkpoint', { checkpointId: checkpointId || null });
    this.narrationSynchronizationRuntime?.handleExternalTimelineMutation?.('resume-checkpoint', { checkpointId: checkpointId || null });
    const state = this.synchronize('resume-checkpoint', { checkpointId: checkpointId || null });
    this.persistSession();
    return state;
  }

  getSharedState() {
    return JSON.parse(JSON.stringify(this.sharedState || this.createSharedState('snapshot')));
  }

  destroy() {
    this.unsubscribers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });

    this.unsubscribers = [];
    this.emit('timeline-sync-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });
  }

  static supportedChannels() {
    return [
      'timeline-sync',
      'timeline-recovered',
      'timeline-persisted',
      'timeline-sync-destroyed'
    ];
  }
}

export function createTimelineSynchronizationRuntime(runtime = {}, options = {}) {
  return new TimelineSynchronizationRuntime(runtime, options);
}
