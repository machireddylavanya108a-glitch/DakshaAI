import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVisualizationTemplate,
  createAdaptiveFallbackTemplate,
  processVisualizationTemplate
} from './index.js';

test('valid dynamic template with unknown semantic purpose is accepted', () => {
  const template = normalizeVisualizationTemplate({
    templateId: 'tmpl-dynamic',
    version: 'v1',
    name: 'Future Dynamic Template',
    semanticPurpose: 'hyper-dimensional-evidence-weaving',
    slots: [{ id: 'slot-a', purpose: 'unknown-slot-purpose', regionId: 'region-a' }],
    regions: [{ id: 'region-a', purpose: 'unknown-region-strategy' }],
    relationships: [{ id: 'rel-a', sourceId: 'slot-a', targetId: 'region-a', relation: 'unknown-link-type' }],
    layout: { strategy: 'unknown-layout-strategy' }
  });

  assert.equal(template.semanticPurpose, 'hyper-dimensional-evidence-weaving');
  assert.equal(template.slots[0].purpose, 'unknown-slot-purpose');
  assert.equal(template.layout.strategy, 'unknown-layout-strategy');
  assert.equal(template.relationships[0].relation, 'unknown-link-type');
});

test('unknown capability reference format remains normalized and preserved', () => {
  const template = normalizeVisualizationTemplate({
    templateId: 'tmpl-cap',
    requiredCapabilities: [
      'cap-string-format',
      { capabilityId: 'cap-object-format', role: 'primary' }
    ]
  });

  assert.equal(template.requiredCapabilities.length, 2);
  assert.ok(template.requiredCapabilities[0].capabilityId);
  assert.equal(template.requiredCapabilities[1].role, 'primary');
});

test('old alias normalization works', () => {
  const template = normalizeVisualizationTemplate({
    template_id: 'tmpl-alias',
    template_version: 'v1',
    semantic_purpose: 'exploration',
    required_capabilities: [{ capabilityId: 'cap-a' }],
    templateSlots: [{ id: 'slot-1', regionId: 'region-1' }],
    layoutRegions: [{ id: 'region-1' }],
    camera: { focusPriority: 'high' },
    a11y: { textDescription: 'Alias accessibility' },
    performanceHints: { minimumProfile: 'low' }
  });

  assert.equal(template.templateId, 'tmpl-alias');
  assert.equal(template.semanticPurpose, 'exploration');
  assert.equal(template.slots.length, 1);
  assert.equal(template.regions.length, 1);
  assert.equal(template.cameraHints.focusPriority, 'high');
  assert.equal(template.accessibility.textDescription, 'Alias accessibility');
  assert.equal(template.performance.minimumProfile, 'low');
});

test('unknown extension values are preserved under extensions', () => {
  const template = normalizeVisualizationTemplate({
    templateId: 'tmpl-ext',
    futureFieldA: { value: 1 },
    futureFieldB: 'x'
  });

  assert.equal(template.extensions.unknownProperties.futureFieldB, 'x');
  assert.equal(template.extensions.unknownProperties.futureFieldA.value, 1);
});

test('adaptive fallback template is generic and non-subject-specific', () => {
  const fallback = createAdaptiveFallbackTemplate();
  assert.equal(fallback.name, 'adaptive-universal-template');
  assert.ok(fallback.slots.length >= 1);
  assert.ok(fallback.regions.length >= 1);
  assert.equal(String(fallback.name).toLowerCase().includes('biology'), false);
});

test('input source is not mutated and normalization is deterministic', () => {
  const input = {
    templateId: 'tmpl-deterministic',
    slots: [{ id: 'slot-1', regionId: 'region-1' }],
    regions: [{ id: 'region-1' }],
    layout: { strategy: 'adaptive' }
  };
  const before = JSON.stringify(input);
  const one = normalizeVisualizationTemplate(input);
  const two = normalizeVisualizationTemplate(input);

  assert.equal(JSON.stringify(input), before);
  assert.equal(JSON.stringify(one), JSON.stringify(two));
});

test('completely arbitrary topic compatibility requires no schema changes', () => {
  const processed = processVisualizationTemplate({
    templateId: 'tmpl-arbitrary-topic',
    semanticPurpose: 'topic-bio-digital-harmonic-governance-lattice',
    metadata: { topic: 'Bio-digital harmonic governance lattice' }
  });

  assert.equal(processed.valid, true);
  assert.equal(processed.template.semanticPurpose, 'topic-bio-digital-harmonic-governance-lattice');
});
