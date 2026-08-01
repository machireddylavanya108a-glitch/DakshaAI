import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { buildRuntimeSceneGraph } from './SceneBuilder.js';
import { TimelineScheduler } from '../timeline/runtime/index.js';

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
  activeRuntime = attachTimelineScheduler(buildRuntimeSceneGraph(validatedSceneJson || {}));
  return activeRuntime;
}

export function loadScene(sceneJson = {}) {
  const validatedScene = processSceneJsonPipeline(sceneJson || {}, { sourceType: 'runtime' });
  activeRuntime = attachTimelineScheduler(buildRuntimeSceneGraph(validatedScene));
  activeRuntime.stateManager.setActiveAll();
  return activeRuntime;
}

export function destroyScene() {
  const runtime = ensureRuntime();
  runLifecycleCleanupForRuntime(runtime);
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
  runtime.stateManager.resetAll();
  runtime.stateManager.initializeAll();
  return runtime;
}

export function pauseScene() {
  const runtime = ensureRuntime();
  runtime.timelineScheduler?.pause('scene-runtime');
  runtime.stateManager.pauseAll();
  return runtime;
}

export function resumeScene() {
  const runtime = ensureRuntime();
  runtime.timelineScheduler?.resume('scene-runtime');
  runtime.stateManager.resumeAll();
  return runtime;
}

export function getActiveTimelineScheduler() {
  return ensureRuntime()?.timelineScheduler || null;
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
