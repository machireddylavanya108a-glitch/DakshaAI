import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deserializeEducationalObject,
  normalizeEducationalObject,
  processEducationalObject
} from './index.js';

test('deserializeEducationalObject falls back on invalid JSON', () => {
  const result = deserializeEducationalObject('{bad-json');
  assert.equal(result.status, 'fallback');
  assert.equal(result.valid, true);
  assert.ok(result.object.objectId);
});

test('prototype pollution keys are stripped during normalization', () => {
  const normalized = normalizeEducationalObject({
    objectId: 'obj-sec-1',
    version: 'v1',
    name: 'Secure Object',
    metadata: {
      __proto__: { polluted: true },
      nested: {
        constructor: { hacked: true }
      }
    }
  });

  assert.equal(({}).polluted, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(normalized.metadata, '__proto__'), false);
});

test('script injections are sanitized in processing pipeline', () => {
  const processed = processEducationalObject({
    objectId: 'obj-sec-2',
    version: 'v1',
    name: '<script>alert(1)</script>Neuron',
    description: 'javascript:alert(2)',
    labels: [{ id: 'l1', text: 'Safe <script>bad()</script> label' }]
  });

  assert.equal(processed.object.name.includes('<script>'), false);
  assert.equal(processed.object.description.includes('javascript:'), false);
  assert.equal(processed.object.labels[0].text.includes('<script>'), false);
});
