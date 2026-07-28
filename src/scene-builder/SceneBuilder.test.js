import test from 'node:test';
import assert from 'node:assert/strict';
import { createSafeScene } from '../scene-generator/SceneSchema.js';
import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { createSceneNode } from './SceneNodeFactory.js';
import { buildRuntimeSceneGraph } from './SceneBuilder.js';
import {
  buildScene,
  loadScene,
  destroyScene,
  reloadScene,
  resetScene,
  pauseScene,
  resumeScene
} from './SceneRuntime.js';

test('large scene builds runtime graph with relationships', () => {
  const base = createSafeScene({
    title: 'Large Scene',
    objects: Array.from({ length: 120 }, (_, index) => ({
      id: `obj-${index + 1}`,
      name: `Object ${index + 1}`,
      type: 'dynamic',
      position: [index % 10, 0, Math.floor(index / 10)],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      visible: true,
      enabled: true,
      interactive: true,
      highlightable: true,
      clickable: true,
      animationIds: [`anim-${index + 1}`],
      labelIds: [`label-${index + 1}`],
      metadata: {},
      state: {},
      properties: {},
      extensions: {}
    })),
    animations: Array.from({ length: 120 }, (_, index) => ({
      id: `anim-${index + 1}`,
      targetObjectId: `obj-${index + 1}`
    })),
    labels: Array.from({ length: 120 }, (_, index) => ({
      id: `label-${index + 1}`,
      targetObjectId: `obj-${index + 1}`
    }))
  });

  const runtime = buildRuntimeSceneGraph(processSceneJsonPipeline(base));
  assert.ok(runtime.graph.getNodeCount() >= 300);
  assert.ok(runtime.graph.getRelationshipCount() > 0);
  assert.ok(runtime.diagnostics.nodeCount >= 300);
});

test('unknown node kind becomes GenericSceneNode', () => {
  const unknown = createSceneNode({ id: 'x-1', kind: 'HyperMetaNode' }, { knownKinds: ['scene', 'object'] });
  assert.equal(unknown.runtimeData.generic, true);
});

test('unknown relationship type is preserved in graph metadata', () => {
  const scene = processSceneJsonPipeline({
    title: 'Unknown Relationship Scene',
    objects: [{ id: 'obj-1', name: 'A' }, { id: 'obj-2', name: 'B' }],
    relationships: [{ from: 'obj-1', to: 'obj-2', relation: 'ResonatesWith', metadata: { strength: 0.9 } }]
  });

  const runtime = buildRuntimeSceneGraph(scene);
  const edge = runtime.graph.edges.find((item) => item.relation === 'ResonatesWith');
  assert.ok(edge);
  assert.equal(edge.metadata.strength, 0.9);
});

test('circular references are detected in diagnostics', () => {
  const scene = processSceneJsonPipeline({
    title: 'Cycle Scene',
    objects: [
      { id: 'obj-a', name: 'A', properties: { dependsOnId: 'obj-b' } },
      { id: 'obj-b', name: 'B', properties: { dependsOnId: 'obj-a' } }
    ]
  });

  const runtime = buildRuntimeSceneGraph(scene);
  assert.ok(runtime.diagnostics.warnings.some((entry) => entry.includes('Circular reference')));
});

test('broken references are repaired with placeholder nodes', () => {
  const scene = processSceneJsonPipeline({
    title: 'Broken Ref Scene',
    timeline: [{ id: 'step-1', order: 0, objects: ['missing-obj'], animations: [], duration: 0, title: 'Step', description: '', camera: null, narration: null, interaction: null, completionRule: { type: 'manual', value: null } }],
    objects: [{ id: 'obj-1', name: 'Primary' }]
  });

  const runtime = buildRuntimeSceneGraph(scene);
  const placeholder = runtime.registry.find('missing-obj');
  assert.ok(placeholder);
  assert.ok(runtime.diagnostics.repairCount >= 1);
});

test('registry lookups and node removal work', () => {
  const scene = processSceneJsonPipeline({ title: 'Registry Scene', objects: [{ id: 'obj-1', name: 'A' }] });
  const runtime = buildRuntimeSceneGraph(scene);

  assert.ok(runtime.registry.find('obj-1'));
  assert.ok(runtime.registry.findByType('object').length >= 1);

  runtime.graph.removeNode('obj-1');
  runtime.registry.unregister('obj-1');

  assert.equal(runtime.registry.find('obj-1'), null);
});

test('state transitions support pause/resume/reset/destroy runtime API', () => {
  const scene = processSceneJsonPipeline({ title: 'State Scene', objects: [{ id: 'obj-1', name: 'A' }] });

  const runtime = buildScene(scene);
  assert.ok(runtime);

  const paused = pauseScene();
  assert.ok([...paused.registry.nodes.values()].some((node) => node.state === 'Paused'));

  const resumed = resumeScene();
  assert.ok([...resumed.registry.nodes.values()].some((node) => node.state === 'Active'));

  const reset = resetScene();
  assert.ok([...reset.registry.nodes.values()].every((node) => node.state === 'Ready' || node.state === 'Created'));

  const destroyed = destroyScene();
  assert.equal(destroyed.registry.nodes.size, 0);
});

test('load/reload scene APIs build valid runtime scene', () => {
  const one = loadScene({ title: 'Load Scene', objects: [{ id: 'obj-1', name: 'One' }] });
  assert.ok(one.graph.getNodeCount() >= 1);

  const two = reloadScene({ title: 'Reload Scene', objects: [{ id: 'obj-2', name: 'Two' }] });
  assert.ok(two.graph.getNode('obj-2'));
});

test('diagnostics include build metrics', () => {
  const scene = processSceneJsonPipeline({ title: 'Diagnostics Scene', objects: [{ id: 'obj-1', name: 'A' }] });
  const runtime = buildRuntimeSceneGraph(scene);

  assert.ok(runtime.diagnostics.buildTimeMs >= 0);
  assert.ok(runtime.diagnostics.nodeCount >= 1);
  assert.ok(runtime.diagnostics.relationshipCount >= 0);
  assert.ok(runtime.diagnostics.graphDepth >= 1);
  assert.ok(runtime.diagnostics.memoryEstimateBytes > 0);
});
