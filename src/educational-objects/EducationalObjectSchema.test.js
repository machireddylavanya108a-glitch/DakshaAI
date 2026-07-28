import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdaptiveFallbackEducationalObject,
  createDefaultObjectAccessibility,
  createDefaultObjectPerformance,
  createDefaultObjectRepresentation
} from './index.js';

test('fallback educational object includes canonical contract defaults', () => {
  const fallback = createAdaptiveFallbackEducationalObject();

  assert.ok(fallback.objectId);
  assert.equal(fallback.id, fallback.objectId);
  assert.equal(fallback.version, 'v1');
  assert.equal(Array.isArray(fallback.conceptReferences), true);
  assert.equal(Array.isArray(fallback.relationshipReferences), true);
  assert.equal(Array.isArray(fallback.capabilityReferences), true);
  assert.equal(Array.isArray(fallback.templateBindings), true);
  assert.equal(Array.isArray(fallback.labels), true);
  assert.equal(typeof fallback.accessibility, 'object');
  assert.equal(typeof fallback.performance, 'object');
  assert.equal(typeof fallback.representation, 'object');
});

test('default representation accessibility and performance are stable objects', () => {
  const representation = createDefaultObjectRepresentation();
  const accessibility = createDefaultObjectAccessibility();
  const performance = createDefaultObjectPerformance();

  assert.equal(representation.mode, 'abstract');
  assert.equal(accessibility.keyboardAccessible, true);
  assert.equal(performance.minimumProfile, 'low');
});
