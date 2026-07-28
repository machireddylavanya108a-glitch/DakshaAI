import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVisualizationTemplate,
  validateVisualizationTemplate,
  processVisualizationTemplate,
  runVisualizationTemplateIntegrityChecks
} from './index.js';

function minimalTemplate(overrides = {}) {
  return {
    templateId: 'tmpl-validation',
    version: 'v1',
    name: 'Validation Template',
    semanticPurpose: 'exploration',
    slots: [{ id: 'slot-1', regionId: 'region-1', parentSlotId: '' }],
    regions: [{ id: 'region-1' }],
    relationships: [],
    layout: { strategy: 'adaptive' },
    accessibility: { textDescription: 'Accessible template' },
    performance: { minimumProfile: 'low', maximumProfile: 'high', objectBudget: 32, animationBudget: 10, interactionBudget: 10, assetBudget: 10 },
    ...overrides
  };
}

test('validation allows unknown semantic purpose and safe unknown relationship type', () => {
  const result = validateVisualizationTemplate(minimalTemplate({
    semanticPurpose: 'unknown-semantic-purpose-x',
    relationships: [{ id: 'rel-1', sourceId: 'slot-1', targetId: 'region-1', relation: 'quantum-augments' }]
  }));

  assert.equal(result.valid, true);
});

test('missing template id, version, slots, regions, layout, accessibility, performance are repaired', () => {
  const result = processVisualizationTemplate({ name: 'Incomplete' });
  assert.equal(result.valid, true);
  assert.ok(result.template.templateId);
  assert.ok(result.template.version);
  assert.ok(result.template.slots.length >= 1);
  assert.ok(result.template.regions.length >= 1);
  assert.ok(result.template.layout.strategy);
  assert.ok(result.template.accessibility.textDescription);
  assert.ok(result.template.performance.minimumProfile);
});

test('duplicate ids and broken references are detected by integrity checks', () => {
  const integrity = runVisualizationTemplateIntegrityChecks(minimalTemplate({
    slots: [{ id: 'slot-1', regionId: 'missing-region' }, { id: 'slot-1', regionId: 'missing-region' }],
    regions: [{ id: 'region-1' }, { id: 'region-1' }],
    relationships: [{ id: 'rel-1', sourceId: 'slot-1', targetId: 'slot-1', relation: 'contains', required: true }]
  }));

  assert.equal(integrity.status, 'invalid');
  assert.ok(integrity.errors.length >= 2);
});

test('circular slot hierarchy and circular region hierarchy are detected', () => {
  const integrity = runVisualizationTemplateIntegrityChecks(minimalTemplate({
    slots: [
      { id: 'slot-a', regionId: 'region-1', parentSlotId: 'slot-b' },
      { id: 'slot-b', regionId: 'region-1', parentSlotId: 'slot-a' }
    ],
    regions: [
      { id: 'region-1', parentRegionId: 'region-2' },
      { id: 'region-2', parentRegionId: 'region-1' }
    ]
  }));

  assert.equal(integrity.errors.some((entry) => entry.includes('Circular slot hierarchy')), true);
  assert.equal(integrity.errors.some((entry) => entry.includes('Circular region hierarchy')), true);
});

test('protected field override prevention and unknown properties preservation', () => {
  const normalized = normalizeVisualizationTemplate({
    templateId: 'tmpl-protected',
    __proto__: { polluted: 'yes' },
    constructor: { injected: true },
    unknownFutureField: { safe: true }
  });

  assert.equal(({}).polluted, undefined);
  assert.equal(normalized.extensions.unknownProperties.unknownFutureField.safe, true);
});
