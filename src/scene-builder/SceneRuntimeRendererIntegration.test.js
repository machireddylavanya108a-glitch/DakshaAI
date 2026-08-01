import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScene,
  loadScene,
  pauseScene,
  resumeScene,
  resetScene,
  destroyScene,
  getActiveRendererCore,
  getActiveAnimationTimelineIntegrationRuntime,
  getActiveAdaptiveRenderingPerformanceRuntime,
  getActiveSharedRuntimeState
} from './SceneRuntime.js';

function createSceneFixture() {
  return {
    title: 'Renderer Integration Scene',
    camera: {
      movement: { mode: 'orbit' }
    },
    objects: [
      { id: 'obj-1', name: 'Cell', type: '3d-model', position: [0, 0, 0] },
      { id: 'obj-2', name: 'Nucleus', type: '3d-model', position: [1, 0, 0] }
    ],
    labels: [{ id: 'label-1', targetObjectId: 'obj-1', text: 'Label A' }],
    hotspots: [{ id: 'hotspot-1', targetObjectId: 'obj-2', type: 'click' }],
    interactions: [{ id: 'interaction-1', targetObjectId: 'obj-1', type: 'click' }],
    timeline: [{
      id: 'step-1',
      order: 0,
      objects: ['obj-1', 'obj-2'],
      animations: [],
      duration: 1000,
      title: 'Intro',
      description: 'Start',
      camera: null,
      narration: null,
      interaction: null,
      completionRule: { type: 'manual', value: null }
    }],
    overlays: [{ id: 'overlay-1', type: 'panel' }],
    checkpoints: [{ id: 'checkpoint-1', title: 'checkpoint' }],
    uiAnchors: [{ id: 'anchor-1', targetObjectId: 'obj-1', anchor: 'top' }],
    unknownFutureNodes: [{ id: 'future-1', kind: 'BioFieldNode', data: { phase: 1 } }]
  };
}

test('scene runtime attaches universal renderer core and syncs renderer adapter metadata', () => {
  const runtime = buildScene(createSceneFixture());
  const rendererCore = getActiveRendererCore();
  const animationTimelineIntegrationRuntime = getActiveAnimationTimelineIntegrationRuntime();
  const adaptiveRenderingPerformanceRuntime = getActiveAdaptiveRenderingPerformanceRuntime();

  assert.ok(runtime);
  assert.ok(rendererCore);
  assert.ok(animationTimelineIntegrationRuntime);
  assert.ok(adaptiveRenderingPerformanceRuntime);
  assert.equal(typeof runtime.metadata.rendererCore, 'object');
  assert.equal(typeof runtime.metadata.rendererAdapter.rendererCoreState, 'object');
  assert.equal(typeof runtime.metadata.animationTimelineIntegration, 'object');
  assert.equal(typeof runtime.metadata.adaptiveRenderingPerformance, 'object');
  assert.equal(typeof runtime.metadata.rendererAdapter.animationTimelineIntegrationState, 'object');
  assert.equal(typeof runtime.metadata.rendererAdapter.adaptiveRenderingPerformanceState, 'object');
  assert.equal(typeof runtime.metadata.rendererCore.metadata.renderSubsystems, 'object');
  assert.equal(Array.isArray(runtime.metadata.rendererCore.metadata.renderSubsystems.camera.entities), true);
  assert.equal(Array.isArray(runtime.metadata.rendererCore.metadata.renderSubsystems.lighting.entities), true);
  assert.equal(Array.isArray(runtime.metadata.rendererCore.metadata.renderSubsystems.environment.entities), true);
  assert.equal(Array.isArray(runtime.metadata.rendererCore.metadata.renderSubsystems.objects.entities), true);

  const sharedState = getActiveSharedRuntimeState();
  assert.equal(typeof sharedState?.rendererCore, 'object');
  assert.equal(typeof sharedState?.animationTimelineIntegration, 'object');
  assert.equal(typeof sharedState?.adaptiveRenderingPerformance, 'object');
  assert.equal(typeof sharedState?.adapters?.rendererAdapter?.rendererCoreState, 'object');
  assert.equal(typeof sharedState?.adapters?.rendererAdapter?.animationTimelineIntegrationState, 'object');
  assert.equal(typeof sharedState?.adapters?.rendererAdapter?.adaptiveRenderingPerformanceState, 'object');
  assert.equal(typeof sharedState?.adapters?.rendererAdapter?.rendererCoreState?.metadata?.renderSubsystems, 'object');

  destroyScene();
});

test('scene runtime renderer core responds to pause, resume, reset, and load lifecycle', () => {
  loadScene(createSceneFixture());
  const rendererCore = getActiveRendererCore();
  const animationTimelineIntegrationRuntime = getActiveAnimationTimelineIntegrationRuntime();
  const adaptiveRenderingPerformanceRuntime = getActiveAdaptiveRenderingPerformanceRuntime();

  const pausedRuntime = pauseScene();
  assert.equal(pausedRuntime.rendererCore.snapshot().lifecycle.paused, true);
  assert.equal(pausedRuntime.animationTimelineIntegrationRuntime.snapshot().animations.paused, true);
  assert.equal(pausedRuntime.adaptiveRenderingPerformanceRuntime.snapshot().session.interrupted, true);

  const resumedRuntime = resumeScene();
  assert.equal(resumedRuntime.rendererCore.snapshot().lifecycle.paused, false);
  assert.equal(resumedRuntime.animationTimelineIntegrationRuntime.snapshot().animations.paused, false);
  assert.equal(resumedRuntime.adaptiveRenderingPerformanceRuntime.snapshot().session.interrupted, false);

  const resetRuntime = resetScene();
  assert.equal(resetRuntime.rendererCore.snapshot().lifecycle.built, true);

  const snapshot = rendererCore.snapshot();
  assert.equal(snapshot.lifecycle.initialized, true);
  assert.equal(animationTimelineIntegrationRuntime.snapshot().runtimeGraph.nodeCount >= 1, true);
  assert.equal(adaptiveRenderingPerformanceRuntime.snapshot().runtimeGraph.nodeCount >= 1, true);

  destroyScene();
});
