import test from 'node:test';
import assert from 'node:assert/strict';
import { createSafeScene } from './SceneSchema.js';
import { normalizeScene } from './SceneNormalizer.js';
import { validateScene } from './SceneValidator.js';
import { repairScene } from './SceneRepair.js';
import { migrateSceneVersion } from './SceneMigration.js';
import { runSceneIntegrityChecks } from './SceneIntegrity.js';
import { processSceneJsonPipeline } from './SceneVersionManager.js';
import { serializeScene, deepCloneScene } from './SceneSerializer.js';
import { deserializeScene, importScene } from './SceneDeserializer.js';

test('valid scene passes validation', () => {
  const scene = createSafeScene();
  const validation = validateScene(scene);
  assert.equal(validation.status, 'valid');
  assert.equal(validation.errors.length, 0);
});

test('missing camera is repaired automatically', () => {
  const raw = { title: 'Camera Missing', objects: [] };
  const normalized = normalizeScene(raw);
  normalized.camera = null;
  const repaired = repairScene(normalized, validateScene(normalized));
  assert.ok(repaired.camera);
  assert.ok(Array.isArray(repaired.camera.position));
});

test('missing objects are repaired to safe fallback object', () => {
  const repaired = processSceneJsonPipeline({ title: 'No Objects', objects: null });
  assert.ok(Array.isArray(repaired.objects));
  assert.ok(repaired.objects.length >= 1);
});

test('broken timeline is repaired and remains structured', () => {
  const repaired = processSceneJsonPipeline({
    title: 'Broken Timeline',
    timeline: [{ order: 'not-a-number', objects: 'bad-ref', animations: null }]
  });

  assert.ok(Array.isArray(repaired.timeline));
  assert.ok(repaired.timeline.length >= 1);
  assert.ok(Number.isFinite(Number(repaired.timeline[0].order)));
  assert.ok(Array.isArray(repaired.timeline[0].objects));
});

test('duplicate IDs are detected by integrity engine', () => {
  const integrity = runSceneIntegrityChecks({
    objects: [{ id: 'dup' }, { id: 'dup' }],
    labels: [],
    animations: [],
    timeline: [],
    checkpoints: [],
    interactions: []
  });

  assert.equal(integrity.status, 'invalid');
  assert.ok(integrity.errors.some((error) => error.includes('Duplicate object id')));
});

test('invalid references are detected by integrity engine', () => {
  const scene = {
    objects: [{ id: 'obj-1' }],
    labels: [{ id: 'lbl-1', targetObjectId: 'obj-9' }],
    animations: [{ id: 'anim-1', targetObjectId: 'obj-9' }],
    timeline: [{ id: 'step-1', order: 0, objects: ['obj-9'], animations: ['anim-9'] }],
    checkpoints: [{ stepId: 'step-9' }],
    interactions: []
  };

  const integrity = runSceneIntegrityChecks(scene);
  assert.ok(integrity.errors.length >= 3);
});

test('normalization maps inconsistent keys into canonical schema', () => {
  const normalized = normalizeScene({
    scene_name: 'Normalized Scene',
    scene_type: 'Science',
    cameraPosition: [1, 2, 3],
    cameraRotation: [0, 0.5, 0],
    sceneCamera: { target: [0, 1, 0] },
    models: [{ label: 'Node A', category: 'Concept' }]
  });

  assert.equal(normalized.title, 'Normalized Scene');
  assert.equal(normalized.classification.domain, 'Science');
  assert.deepEqual(normalized.camera.position, [1, 2, 3]);
  assert.ok(Array.isArray(normalized.objects));
  assert.equal(normalized.objects.length, 1);
});

test('migration upgrades v1 scene to v2 schema', () => {
  const migrated = migrateSceneVersion({
    version: 'v1',
    title: 'Legacy Scene',
    classification: 'Legacy Domain'
  }, 'v2');

  assert.equal(migrated.version, 'v2');
  assert.equal(migrated.classification.domain, 'Legacy Domain');
  assert.equal(migrated.classification.subDomain, 'Legacy Domain');
});

test('serialization and deserialization preserve structure', () => {
  const scene = processSceneJsonPipeline({
    title: 'Serialize Scene',
    subject: 'Physics',
    objects: [{ name: 'Mass' }]
  });

  const serialized = serializeScene(scene);
  const parsed = deserializeScene(serialized);

  assert.equal(typeof serialized, 'string');
  assert.equal(parsed.title, 'Serialize Scene');
  assert.ok(Array.isArray(parsed.objects));
});

test('importScene handles invalid JSON with safe fallback scene', () => {
  const imported = importScene('{invalid-json');
  assert.ok(imported.sceneId);
  assert.equal(imported.validation.status, 'fallback');
});

test('deep clone returns a detached copy', () => {
  const scene = processSceneJsonPipeline({ title: 'Clone Scene', objects: [{ name: 'A' }] });
  const clone = deepCloneScene(scene);
  clone.title = 'Updated';
  assert.notEqual(scene.title, clone.title);
});

test('pipeline always returns non-null safe scene on fatal input', () => {
  const scene = processSceneJsonPipeline(null);
  assert.ok(scene);
  assert.ok(scene.sceneId);
  assert.ok(scene.camera);
  assert.ok(scene.environment);
});
