import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { buildRuntimeSceneGraph } from './SceneBuilder.js';
import { TimelineScheduler, createTimelineSynchronizationRuntime } from '../timeline/runtime/index.js';
import { createSceneEventRuntime } from '../scene-events/index.js';
import { createNarrationSceneSynchronizationRuntime } from '../narration/index.js';
import { createSpeechPlaybackRuntimeController } from '../speech/index.js';
import { createAdaptiveTeachingRecoveryEngine } from '../adaptive-learning/index.js';

let activeRuntime = null;
let educationalObjectLifecycleManager = null;

function attachTimelineScheduler(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const timelineData = runtime?.metadata?.timelineData || runtime?.metadata?.timeline || runtime?.sceneJson?.timelineData || {};
  const scheduler = new TimelineScheduler(timelineData, {
    startState: 'Ready'
  });

  runtime.timelineScheduler = scheduler;
  runtime.sceneScheduler = scheduler;
  runtime.metadata = {
    ...(runtime.metadata || {}),
    timelineScheduler: {
      playbackState: scheduler.playbackState.getState(),
      supportedEvents: TimelineScheduler.supportedRuntimeEvents()
    }
  };

  return runtime;
}

function attachSceneEventRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const sceneEventRuntime = createSceneEventRuntime(runtime);
  runtime.sceneEventRuntime = sceneEventRuntime;
  runtime.sceneEventSystem = sceneEventRuntime;
  runtime.metadata = {
    ...(runtime.metadata || {}),
    sceneEvents: {
      eventCount: sceneEventRuntime.events.length,
      schedule: sceneEventRuntime.schedule.summary,
      validation: {
        status: sceneEventRuntime.schedule.validation.status,
        errors: sceneEventRuntime.schedule.validation.errors,
        warnings: sceneEventRuntime.schedule.validation.warnings
      }
    }
  };

  return runtime;
}

function attachTimelineSynchronizationRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const synchronizationRuntime = createTimelineSynchronizationRuntime(runtime);
  runtime.timelineSynchronizationRuntime = synchronizationRuntime;
  runtime.timelineSynchronization = synchronizationRuntime;

  const recovered = synchronizationRuntime.recoverSession();
  const sharedState = synchronizationRuntime.synchronize('attach', {
    recovered
  }, {
    recovered
  });

  runtime.sharedRuntimeState = sharedState;
  runtime.metadata = {
    ...(runtime.metadata || {}),
    timelineSynchronization: {
      schemaVersion: sharedState.schemaVersion,
      recovered,
      channels: synchronizationRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachNarrationSynchronizationRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const narrationSynchronizationRuntime = createNarrationSceneSynchronizationRuntime(runtime);
  runtime.narrationSynchronizationRuntime = narrationSynchronizationRuntime;

  runtime.metadata = {
    ...(runtime.metadata || {}),
    narrationSynchronization: {
      ...(narrationSynchronizationRuntime.snapshot?.() || {}),
      channels: narrationSynchronizationRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachSpeechPlaybackRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const speechPlaybackRuntime = createSpeechPlaybackRuntimeController(runtime);
  runtime.speechPlaybackRuntime = speechPlaybackRuntime;

  const recovered = speechPlaybackRuntime.recoverSession();
  const snapshot = speechPlaybackRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    speechPlayback: {
      ...snapshot,
      recovered,
      channels: speechPlaybackRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachAdaptiveTeachingRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const adaptiveTeachingRuntime = createAdaptiveTeachingRecoveryEngine(runtime);
  runtime.adaptiveTeachingRuntime = adaptiveTeachingRuntime;

  const recovered = adaptiveTeachingRuntime.recoverSession();
  const snapshot = adaptiveTeachingRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    adaptiveLearning: {
      ...snapshot,
      recovered,
      channels: adaptiveTeachingRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function runLifecycleCleanupForRuntime(runtime) {
  if (!educationalObjectLifecycleManager || typeof educationalObjectLifecycleManager.cleanupScene !== 'function') {
    return;
  }

  const sceneId = String(runtime?.sceneId || '').trim();
  if (!sceneId) return;

  try {
    educationalObjectLifecycleManager.cleanupScene(sceneId, {
      source: 'scene-runtime-destroy'
    });
  } catch {
    // Lifecycle cleanup is best-effort and must not break scene teardown.
  }
}

function ensureRuntime() {
  if (!activeRuntime) {
    activeRuntime = buildRuntimeSceneGraph(processSceneJsonPipeline({}));
  }
  return activeRuntime;
}

export function buildScene(validatedSceneJson = {}) {
  activeRuntime = attachTimelineSynchronizationRuntime(
    attachAdaptiveTeachingRuntime(
      attachSpeechPlaybackRuntime(
        attachNarrationSynchronizationRuntime(
          attachSceneEventRuntime(
            attachTimelineScheduler(buildRuntimeSceneGraph(validatedSceneJson || {}))
          )
        )
      )
    )
  );
  return activeRuntime;
}

export function loadScene(sceneJson = {}) {
  const validatedScene = processSceneJsonPipeline(sceneJson || {}, { sourceType: 'runtime' });
  activeRuntime = attachTimelineSynchronizationRuntime(
    attachAdaptiveTeachingRuntime(
      attachSpeechPlaybackRuntime(
        attachNarrationSynchronizationRuntime(
          attachSceneEventRuntime(
            attachTimelineScheduler(buildRuntimeSceneGraph(validatedScene))
          )
        )
      )
    )
  );
  activeRuntime.stateManager.setActiveAll();
  return activeRuntime;
}

export function destroyScene() {
  const runtime = ensureRuntime();
  runLifecycleCleanupForRuntime(runtime);
  runtime.timelineSynchronizationRuntime?.persistSession?.();
  runtime.speechPlaybackRuntime?.persistSession?.();
  runtime.adaptiveTeachingRuntime?.persistSession?.();
  runtime.timelineSynchronizationRuntime?.destroy?.();
  runtime.speechPlaybackRuntime?.destroy?.();
  runtime.adaptiveTeachingRuntime?.destroy?.();
  runtime.narrationSynchronizationRuntime?.destroy?.();
  runtime.sceneEventRuntime?.destroy?.();
  runtime.stateManager.destroyAll();
  runtime.registry.destroy();
  runtime.graph.nodes.clear();
  runtime.graph.edges = [];
  return runtime;
}

export function reloadScene(sceneJson = {}) {
  destroyScene();
  return loadScene(sceneJson);
}

export function resetScene() {
  const runtime = ensureRuntime();
  runtime.timelineSynchronizationRuntime?.synchronize?.('reset-before-state-manager');
  runtime.speechPlaybackRuntime?.seek?.(0);
  runtime.adaptiveTeachingRuntime?.synchronize?.('reset');
  runtime.narrationSynchronizationRuntime?.reset?.();
  runtime.sceneEventRuntime?.reset?.();
  runtime.stateManager.resetAll();
  runtime.stateManager.initializeAll();
  runtime.timelineSynchronizationRuntime?.synchronize?.('reset-after-state-manager');
  return runtime;
}

export function pauseScene() {
  const runtime = ensureRuntime();
  runtime.timelineSynchronizationRuntime?.pause?.('scene-runtime');
  runtime.speechPlaybackRuntime?.pause?.('scene-runtime');
  runtime.adaptiveTeachingRuntime?.markInterrupted?.('scene-paused');
  runtime.narrationSynchronizationRuntime?.pause?.('scene-runtime');
  runtime.stateManager.pauseAll();
  runtime.timelineSynchronizationRuntime?.synchronize?.('pause-scene-state-manager');
  return runtime;
}

export function resumeScene() {
  const runtime = ensureRuntime();
  runtime.timelineSynchronizationRuntime?.resume?.('scene-runtime');
  runtime.speechPlaybackRuntime?.resume?.('scene-runtime');
  runtime.adaptiveTeachingRuntime?.synchronize?.('scene-resumed');
  runtime.narrationSynchronizationRuntime?.resume?.('scene-runtime');
  runtime.stateManager.resumeAll();
  runtime.timelineSynchronizationRuntime?.synchronize?.('resume-scene-state-manager');
  return runtime;
}

export function getActiveTimelineScheduler() {
  return ensureRuntime()?.timelineScheduler || null;
}

export function getActiveSceneEventRuntime() {
  return ensureRuntime()?.sceneEventRuntime || null;
}

export function getActiveTimelineSynchronizationRuntime() {
  return ensureRuntime()?.timelineSynchronizationRuntime || null;
}

export function getActiveSharedRuntimeState() {
  return ensureRuntime()?.timelineSynchronizationRuntime?.getSharedState?.() || null;
}

export function getActiveRuntimeScene() {
  return activeRuntime;
}

export function setEducationalObjectLifecycleManager(manager) {
  if (manager && typeof manager === 'object') {
    educationalObjectLifecycleManager = manager;
    return true;
  }
  educationalObjectLifecycleManager = null;
  return false;
}

export function getEducationalObjectLifecycleManager() {
  return educationalObjectLifecycleManager;
}
