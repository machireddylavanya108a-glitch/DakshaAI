import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { buildRuntimeSceneGraph } from './SceneBuilder.js';
import { TimelineScheduler, createTimelineSynchronizationRuntime } from '../timeline/runtime/index.js';
import { createSceneEventRuntime } from '../scene-events/index.js';
import { createNarrationSceneSynchronizationRuntime } from '../narration/index.js';
import { createSpeechPlaybackRuntimeController } from '../speech/index.js';
import { createAdaptiveTeachingRecoveryEngine } from '../adaptive-learning/index.js';
import { createUniversalInteractionContractRuntime } from '../interactions/index.js';
import { createUniversalInputCameraControlRuntime } from '../input-camera/index.js';
import { createUniversalEducationalInspectionRuntime } from '../inspection/index.js';
import { createUniversalAccessibilityStateRecoveryRuntime } from '../accessibility/index.js';
import { createUniversalAssetLoadingRuntime } from '../asset-runtime/index.js';

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

function attachInteractionContractRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const interactionContractRuntime = createUniversalInteractionContractRuntime(runtime);
  runtime.interactionContractRuntime = interactionContractRuntime;

  const recovered = interactionContractRuntime.recoverSession();
  const snapshot = interactionContractRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    interactionContract: {
      ...snapshot,
      recovered,
      channels: interactionContractRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachInputCameraControlRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const inputCameraControlRuntime = createUniversalInputCameraControlRuntime(runtime);
  runtime.inputCameraControlRuntime = inputCameraControlRuntime;

  const recovered = inputCameraControlRuntime.recoverSession();
  const snapshot = inputCameraControlRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    inputCameraControl: {
      ...snapshot,
      recovered,
      channels: inputCameraControlRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachEducationalInspectionRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const educationalInspectionRuntime = createUniversalEducationalInspectionRuntime(runtime);
  runtime.educationalInspectionRuntime = educationalInspectionRuntime;

  const recovered = educationalInspectionRuntime.recoverSession();
  const snapshot = educationalInspectionRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    educationalInspection: {
      ...snapshot,
      recovered,
      channels: educationalInspectionRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachAccessibilityStateRecoveryRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const accessibilityStateRecoveryRuntime = createUniversalAccessibilityStateRecoveryRuntime(runtime);
  runtime.accessibilityStateRecoveryRuntime = accessibilityStateRecoveryRuntime;

  const recovered = accessibilityStateRecoveryRuntime.recoverSession();
  const snapshot = accessibilityStateRecoveryRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    accessibilityRecovery: {
      ...snapshot,
      recovered,
      channels: accessibilityStateRecoveryRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachAssetLoadingRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const assetLoadingRuntime = createUniversalAssetLoadingRuntime(runtime);
  runtime.assetLoadingRuntime = assetLoadingRuntime;

  const recovered = assetLoadingRuntime.recoverSession();
  const snapshot = assetLoadingRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    assetLoading: {
      ...snapshot,
      recovered,
      channels: assetLoadingRuntime.constructor.supportedChannels()
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
    attachAssetLoadingRuntime(
    attachAccessibilityStateRecoveryRuntime(
      attachEducationalInspectionRuntime(
        attachInputCameraControlRuntime(
          attachInteractionContractRuntime(
            attachAdaptiveTeachingRuntime(
              attachSpeechPlaybackRuntime(
                attachNarrationSynchronizationRuntime(
                  attachSceneEventRuntime(
                    attachTimelineScheduler(buildRuntimeSceneGraph(validatedSceneJson || {}))
                  )
                )
              )
            )
          )
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
    attachAssetLoadingRuntime(
    attachAccessibilityStateRecoveryRuntime(
      attachEducationalInspectionRuntime(
        attachInputCameraControlRuntime(
          attachInteractionContractRuntime(
            attachAdaptiveTeachingRuntime(
              attachSpeechPlaybackRuntime(
                attachNarrationSynchronizationRuntime(
                  attachSceneEventRuntime(
                    attachTimelineScheduler(buildRuntimeSceneGraph(validatedScene))
                  )
                )
              )
            )
          )
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
  runtime.interactionContractRuntime?.persistSession?.();
  runtime.inputCameraControlRuntime?.persistSession?.();
  runtime.educationalInspectionRuntime?.persistSession?.();
  runtime.accessibilityStateRecoveryRuntime?.persistSession?.();
  runtime.assetLoadingRuntime?.persistSession?.();
  runtime.timelineSynchronizationRuntime?.destroy?.();
  runtime.speechPlaybackRuntime?.destroy?.();
  runtime.adaptiveTeachingRuntime?.destroy?.();
  runtime.interactionContractRuntime?.destroy?.();
  runtime.inputCameraControlRuntime?.destroy?.();
  runtime.educationalInspectionRuntime?.destroy?.();
  runtime.accessibilityStateRecoveryRuntime?.destroy?.();
  runtime.assetLoadingRuntime?.destroy?.();
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
  runtime.interactionContractRuntime?.synchronize?.('reset');
  runtime.inputCameraControlRuntime?.synchronize?.('reset');
  runtime.educationalInspectionRuntime?.synchronize?.('reset');
  runtime.accessibilityStateRecoveryRuntime?.synchronize?.('reset');
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
  runtime.interactionContractRuntime?.handleExternalTimelineMutation?.('pause', { source: 'scene-runtime' });
  runtime.inputCameraControlRuntime?.handleExternalTimelineMutation?.('pause', { source: 'scene-runtime' });
  runtime.educationalInspectionRuntime?.handleExternalTimelineMutation?.('pause', { source: 'scene-runtime' });
  runtime.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('pause', { source: 'scene-runtime' });
  runtime.assetLoadingRuntime?.handleExternalTimelineMutation?.('pause', { source: 'scene-runtime' });
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
  runtime.interactionContractRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.inputCameraControlRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.educationalInspectionRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.assetLoadingRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
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
