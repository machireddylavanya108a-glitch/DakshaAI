import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { buildRuntimeSceneGraph } from './SceneBuilder.js';

let activeRuntime = null;

function ensureRuntime() {
  if (!activeRuntime) {
    activeRuntime = buildRuntimeSceneGraph(processSceneJsonPipeline({}));
  }
  return activeRuntime;
}

export function buildScene(validatedSceneJson = {}) {
  activeRuntime = buildRuntimeSceneGraph(validatedSceneJson || {});
  return activeRuntime;
}

export function loadScene(sceneJson = {}) {
  const validatedScene = processSceneJsonPipeline(sceneJson || {}, { sourceType: 'runtime' });
  activeRuntime = buildRuntimeSceneGraph(validatedScene);
  activeRuntime.stateManager.setActiveAll();
  return activeRuntime;
}

export function destroyScene() {
  const runtime = ensureRuntime();
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
  runtime.stateManager.pauseAll();
  return runtime;
}

export function resumeScene() {
  const runtime = ensureRuntime();
  runtime.stateManager.resumeAll();
  return runtime;
}

export function getActiveRuntimeScene() {
  return activeRuntime;
}
