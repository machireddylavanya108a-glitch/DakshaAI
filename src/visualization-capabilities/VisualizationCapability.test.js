import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createVisualizationCapability,
  createVisualizationCapabilityRegistry,
  validateVisualizationCapability,
  normalizeVisualizationCapability
} from './index.js';

function baseCapability(overrides = {}) {
  return {
    id: 'cap-base',
    name: 'Base Capability',
    description: 'Generic descriptor',
    semanticPurpose: 'exploration',
    supportedLearningActions: ['observe', 'inspect'],
    inputRequirements: [{ id: 'rule-1', field: 'conceptCount', operator: 'gte', expectedValue: 1, required: true, weight: 2 }],
    ...overrides
  };
}

test('valid capability registration', () => {
  const registry = createVisualizationCapabilityRegistry();
  const result = registry.registerCapability(baseCapability());
  assert.equal(result.validation.valid, true);
  assert.equal(registry.hasCapability('cap-base'), true);
});

test('unknown dynamic capability registration', () => {
  const registry = createVisualizationCapabilityRegistry();
  const dynamic = baseCapability({
    id: 'cap-unknown',
    semanticPurpose: 'nonlinear-fractal-interpretation',
    supportedLearningActions: ['trace', 'invent']
  });
  const result = registry.registerCapability(dynamic);
  assert.equal(result.capability.semanticPurpose, 'nonlinear-fractal-interpretation');
});

test('duplicate registration and version conflict diagnostics', () => {
  const registry = createVisualizationCapabilityRegistry();
  registry.registerCapability(baseCapability({ id: 'cap-dupe', version: 'v1' }));
  const updated = registry.registerCapability(baseCapability({ id: 'cap-dupe', version: 'v2' }));
  assert.equal(updated.diagnostics.duplicate, true);
  assert.equal(updated.diagnostics.versionConflict, true);
});

test('registry update and removal', () => {
  const registry = createVisualizationCapabilityRegistry();
  registry.registerCapability(baseCapability({ id: 'cap-edit', name: 'Old' }));
  const patched = registry.updateCapability('cap-edit', { name: 'New Name' });
  assert.equal(patched.capability.name, 'New Name');
  assert.equal(registry.unregisterCapability('cap-edit'), true);
  assert.equal(registry.hasCapability('cap-edit'), false);
});

test('registry subscription cleanup', () => {
  const registry = createVisualizationCapabilityRegistry();
  let events = 0;
  const subId = registry.subscribe(() => {
    events += 1;
  });

  registry.registerCapability(baseCapability({ id: 'cap-sub-1' }));
  assert.equal(events > 0, true);

  registry.unsubscribe(subId);
  events = 0;
  registry.registerCapability(baseCapability({ id: 'cap-sub-2' }));
  assert.equal(events, 0);
});

test('unknown semantic purpose validation remains accepted', () => {
  const result = validateVisualizationCapability(baseCapability({ semanticPurpose: 'future-purpose-x' }));
  assert.equal(result.valid, true);
});

test('unknown learning action preservation', () => {
  const normalized = normalizeVisualizationCapability(baseCapability({ supportedLearningActions: ['observe', 'quantize'] }));
  assert.equal(normalized.supportedLearningActions.includes('quantize'), true);
});

test('unsafe key removal and circular input handling', () => {
  const raw = baseCapability({ id: 'cap-sanitize' });
  raw.metadata = { __proto__: { polluted: true }, safe: true };
  raw.extensions = { constructor: { injected: true } };
  raw.self = raw;

  const normalized = normalizeVisualizationCapability(raw);
  assert.equal(({}).polluted, undefined);
  assert.equal(normalized.metadata.safe, true);
  assert.equal(normalized.extensions.unknownProperties.self, '[circular]');
});

test('invalid numeric values are normalized safely', () => {
  const normalized = normalizeVisualizationCapability(baseCapability({ confidence: Number.NaN }));
  assert.equal(Number.isFinite(normalized.confidence), true);
  assert.equal(normalized.confidence >= 0 && normalized.confidence <= 1, true);
});

test('no fixed subject mappings introduced in capability implementation files', () => {
  const filePath = path.resolve('src/visualization-capabilities/index.js');
  const source = fs.readFileSync(filePath, 'utf8');
  assert.equal(source.includes('subjectMap'), false);
  assert.equal(source.includes('domainMap'), false);
  assert.equal(source.includes('supportedSubjects'), false);
});

test('createVisualizationCapability returns normalized descriptor', () => {
  const result = createVisualizationCapability(baseCapability({ id: 'cap-create' }));
  assert.equal(result.validation.valid, true);
  assert.equal(result.capability.id, 'cap-create');
});
