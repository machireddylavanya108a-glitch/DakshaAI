import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UniversalRuntimeGraphAdapter,
  migrateAdapterProfile,
  resolveAdapterType
} from './UniversalRuntimeGraphAdapter.js';

function createRuntimeGraphFixture() {
  return {
    runtimeGraph: {
      nodes: [
        { id: 'camera-1', kind: 'CameraNode', metadata: { sourceKey: 'cameras' }, properties: { fov: 60 }, runtimeData: {} },
        { id: 'environment-1', kind: 'EnvironmentNode', metadata: { sourceKey: 'environments' }, properties: { sky: 'clear' }, runtimeData: {} },
        { id: 'light-1', kind: 'LightNode', metadata: { sourceKey: 'lights' }, properties: { intensity: 0.8 }, runtimeData: {} },
        { id: 'obj-1', kind: 'ObjectNode', metadata: { sourceKey: 'educationalObjects' }, properties: { subject: 'physics' }, runtimeData: {} },
        { id: 'label-1', kind: 'LabelNode', metadata: { sourceKey: 'labels' }, properties: { text: 'label' }, runtimeData: {} },
        { id: 'hotspot-1', kind: 'HotspotNode', metadata: { sourceKey: 'hotspots' }, properties: { active: true }, runtimeData: {} },
        { id: 'anim-1', kind: 'AnimationNode', metadata: { sourceKey: 'animations' }, properties: { loop: true }, runtimeData: {} },
        { id: 'interaction-1', kind: 'InteractionNode', metadata: { sourceKey: 'interactions' }, properties: { trigger: 'click' }, runtimeData: {} },
        { id: 'timeline-1', kind: 'TimelineNode', metadata: { sourceKey: 'timelines' }, properties: { durationMs: 1000 }, runtimeData: {} },
        { id: 'overlay-1', kind: 'OverlayNode', metadata: { sourceKey: 'overlays' }, properties: { z: 2 }, runtimeData: {} },
        { id: 'anchor-1', kind: 'AnchorNode', metadata: { sourceKey: 'uiAnchors' }, properties: { position: 'top-left' }, runtimeData: {} },
        { id: 'checkpoint-1', kind: 'CheckpointNode', metadata: { sourceKey: 'checkpoints' }, properties: { checkpointId: 'intro' }, runtimeData: {} },
        { id: 'future-1', kind: 'QuantumPedagogyNode', metadata: { sourceKey: 'futureNodeFamily' }, properties: {}, runtimeData: {} }
      ],
      edges: [{ from: 'camera-1', to: 'obj-1', relation: 'focuses' }]
    }
  };
}

test('adapter classifies required node families and generic unknown nodes', () => {
  const adapter = new UniversalRuntimeGraphAdapter();
  const result = adapter.adapt(createRuntimeGraphFixture());

  assert.equal(result.valid, true);
  assert.equal(result.status, 'adapted');
  assert.equal(result.renderBundle.runtimeGraphSummary.nodeCount, 13);

  const byType = result.renderBundle.byType;
  assert.equal(Array.isArray(byType.camera), true);
  assert.equal(Array.isArray(byType.environment), true);
  assert.equal(Array.isArray(byType.light), true);
  assert.equal(Array.isArray(byType['educational-object']), true);
  assert.equal(Array.isArray(byType.label), true);
  assert.equal(Array.isArray(byType.hotspot), true);
  assert.equal(Array.isArray(byType.animation), true);
  assert.equal(Array.isArray(byType.interaction), true);
  assert.equal(Array.isArray(byType.timeline), true);
  assert.equal(Array.isArray(byType.overlay), true);
  assert.equal(Array.isArray(byType['ui-anchor']), true);
  assert.equal(Array.isArray(byType.checkpoint), true);
  assert.equal(Array.isArray(byType['generic-node']), true);
  assert.equal(result.renderBundle.metadata.supportsUnknownFutureNodeTypes, true);
  assert.equal(result.renderBundle.metadata.genericNodeCount >= 1, true);
});

test('adapter ignores forbidden direct renderer fields by default', () => {
  const adapter = new UniversalRuntimeGraphAdapter();
  const result = adapter.adapt({
    ...createRuntimeGraphFixture(),
    lessonText: 'forbidden',
    aiResponse: 'forbidden',
    sceneJson: { title: 'forbidden' },
    templateJson: { id: 'forbidden' }
  });

  assert.equal(result.valid, true);
  assert.equal(result.status, 'adapted');
  assert.equal(result.warnings.length > 0, true);
  assert.equal(result.renderBundle.metadata.forbiddenInputFieldsIgnored.length, 4);
});

test('adapter strict mode rejects forbidden direct renderer fields', () => {
  const adapter = new UniversalRuntimeGraphAdapter({
    profile: {
      strictInputValidation: true
    }
  });

  const result = adapter.adapt({
    ...createRuntimeGraphFixture(),
    lessonText: 'forbidden'
  });

  assert.equal(result.valid, false);
  assert.equal(result.status, 'rejected');
  assert.equal(result.errors.some((entry) => entry.includes('Strict input validation')), true);
});

test('adapter serialization, deserialization, and migration are backward compatible', () => {
  const adapter = new UniversalRuntimeGraphAdapter();
  adapter.adapt(createRuntimeGraphFixture());

  const serialized = adapter.serialize();
  const restored = new UniversalRuntimeGraphAdapter();
  const snapshot = restored.deserialize(serialized);

  assert.equal(snapshot.historySize >= 1, true);

  const migrated = migrateAdapterProfile({
    diagnostics: {
      warnings: ['legacy-warning']
    }
  });
  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.diagnostics.warnings.includes('legacy-warning'), true);
});

test('adapter type resolver supports unknown future kinds via generic-node', () => {
  assert.equal(resolveAdapterType({ sourceKey: 'cameras' }), 'camera');
  assert.equal(resolveAdapterType({ sourceKey: 'checkpoints' }), 'checkpoint');
  assert.equal(resolveAdapterType({ sourceKey: 'futureUnseenType' }), 'generic-node');
});
