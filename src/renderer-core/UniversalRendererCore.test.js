import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UniversalRendererCore,
  migrateRenderStateProfile
} from './UniversalRendererCore.js';

function createRuntimeFixture() {
  return {
    sceneId: 'scene-renderer-core-test',
    metadata: {
      rendererAdapter: {}
    },
    graph: {
      toJSON() {
        return {
          nodes: [
            { id: 'n-1', kind: 'CameraNode', metadata: { sourceKey: 'cameras' }, properties: { fov: 45 }, runtimeData: {} },
            { id: 'n-2', kind: 'ObjectNode', metadata: { sourceKey: 'educationalObjects' }, properties: { id: 'obj-1' }, runtimeData: {} },
            { id: 'n-3', kind: 'FutureNode', metadata: { sourceKey: 'future-new-family' }, properties: {}, runtimeData: {} }
          ],
          edges: [{ from: 'n-1', to: 'n-2', relation: 'focuses' }]
        };
      }
    },
    timelineScheduler: { id: 'scheduler' },
    assetLoadingRuntime: { id: 'asset-runtime' },
    adaptiveTeachingRuntime: { id: 'ai-teacher' },
    interactionContractRuntime: { id: 'interaction-runtime' }
  };
}

test('renderer core lifecycle APIs initialize, build, update, pause, resume, reset, reload, destroy', () => {
  const runtime = createRuntimeFixture();
  const rendererCore = new UniversalRendererCore(runtime);

  const initialized = rendererCore.initialize();
  assert.equal(initialized.status, 'initialized');

  const built = rendererCore.build({ runtimeGraph: runtime.graph.toJSON() });
  assert.equal(built.status, 'built');
  assert.equal(built.state.renderState.activeObjectCount >= 3, true);

  const updated = rendererCore.update({
    commands: [
      { action: 'mutate', nodeId: 'n-2', payload: { visible: false } },
      { action: 'mutate', nodeId: 'n-3', payload: { alpha: 0.5 } }
    ]
  });
  assert.equal(updated.status, 'updated');
  assert.equal(updated.processed >= 2, true);

  const paused = rendererCore.pause('test');
  assert.equal(paused.status, 'paused');
  assert.equal(paused.state.lifecycle.paused, true);

  const resumed = rendererCore.resume('test');
  assert.equal(resumed.status, 'resumed');
  assert.equal(resumed.state.lifecycle.paused, false);

  const reset = rendererCore.reset();
  assert.equal(reset.status, 'reset');
  assert.equal(reset.state.lifecycle.built, false);

  const reloaded = rendererCore.reload({ runtimeGraph: runtime.graph.toJSON() });
  assert.equal(reloaded.status, 'built');
  assert.equal(reloaded.state.lifecycle.reloadCount >= 1, true);

  const destroyed = rendererCore.destroy();
  assert.equal(destroyed.status, 'destroyed');
  assert.equal(destroyed.state.lifecycle.destroyed, true);
});

test('renderer core diagnostics, persistence recovery, and synchronization update runtime metadata', () => {
  const runtime = createRuntimeFixture();
  const rendererCore = new UniversalRendererCore(runtime);

  rendererCore.initialize();
  rendererCore.build({ runtimeGraph: runtime.graph.toJSON() });
  rendererCore.update({ commands: [{ action: 'tick', nodeId: 'n-1' }] });
  rendererCore.synchronize('test-sync', { reason: 'test' });

  assert.equal(typeof runtime.metadata.rendererCore, 'object');
  assert.equal(typeof runtime.metadata.rendererAdapter.rendererCoreState, 'object');
  assert.equal(typeof runtime.metadata.aiTeacherAdapter.rendererCoreState, 'object');
  assert.equal(typeof runtime.metadata.interactionEngine.rendererCoreState, 'object');

  const persisted = rendererCore.persistSession();
  assert.equal(persisted, true);

  const recoveredCore = new UniversalRendererCore(createRuntimeFixture());
  const recovered = recoveredCore.recoverSession();
  assert.equal(recovered, true);
  assert.equal(recoveredCore.snapshot().diagnostics.recoveries >= 1, true);
});

test('renderer core migration keeps backward compatibility for legacy state shape', () => {
  const migrated = migrateRenderStateProfile({
    state: {
      frame: 4
    },
    diagnostics: {
      warnings: ['legacy-state-warning']
    },
    renderQueue: {
      pending: [{ action: 'mount' }]
    }
  });

  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.renderState.frame, 4);
  assert.equal(migrated.diagnostics.warnings.includes('legacy-state-warning'), true);
  assert.equal(Array.isArray(migrated.queue.pending), true);
});
