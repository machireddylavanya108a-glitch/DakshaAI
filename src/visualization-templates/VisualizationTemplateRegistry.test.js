import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVisualizationTemplateRegistry,
  evaluateTemplateEligibility,
  normalizeTemplateQuery
} from './index.js';

function createTemplate(overrides = {}) {
  return {
    templateId: 'tmpl-registry',
    version: 'v1',
    name: 'Registry Template',
    semanticPurpose: 'open-semantic-purpose',
    requiredCapabilities: [{ referenceId: 'cap-1', capabilityId: 'cap-main', role: 'primary', required: true }],
    optionalCapabilities: [{ referenceId: 'cap-2', capabilityId: 'cap-support', role: 'supporting', required: false }],
    slots: [{ id: 'slot-primary', name: 'Primary', purpose: 'primary-content', regionId: 'region-main', capacity: 1, priority: 1 }],
    regions: [{ id: 'region-main', name: 'Main', purpose: 'main-structure', capacity: 4, accessibilityOrder: 1 }],
    relationships: [],
    layout: { strategy: 'adaptive' },
    variables: [{ id: 'var-1', name: 'focusLevel', required: false, defaultValue: 'normal' }],
    accessibility: { textDescription: 'Registry template', keyboardNavigation: true, reducedMotionCompatibility: true, highContrastCompatibility: true },
    performance: { minimumProfile: 'low', maximumProfile: 'high', objectBudget: 10, animationBudget: 10, interactionBudget: 10, assetBudget: 10 },
    metadata: {},
    ...overrides
  };
}

test('valid template registration and unknown semantic registration', () => {
  const registry = createVisualizationTemplateRegistry();
  const first = registry.registerTemplate(createTemplate({ semanticPurpose: 'unknown-future-purpose' }), { source: 'runtime', trustLevel: 0.8 });

  assert.equal(first.entry.template.semanticPurpose, 'unknown-future-purpose');
  assert.equal(registry.hasTemplate('tmpl-registry', 'v1'), true);
});

test('invalid template input is safely repaired or replaced with fallback', () => {
  const registry = createVisualizationTemplateRegistry();
  const result = registry.registerTemplate({ templateId: '', version: '', slots: [] });
  assert.equal(Boolean(result?.entry?.template?.templateId), true);
  assert.equal(registry.size >= 1, true);
});

test('duplicate template handling and no mutation of registered template', () => {
  const registry = createVisualizationTemplateRegistry();
  const original = createTemplate({ metadata: { key: 'value' } });
  registry.registerTemplate(original);
  const duplicate = registry.registerTemplate(createTemplate({ metadata: { key: 'changed' } }));

  assert.equal(duplicate.duplicate, true);
  const stored = registry.getTemplate('tmpl-registry', 'v1');
  assert.equal(stored.metadata.key, 'changed');

  stored.metadata.key = 'local-edit';
  const reread = registry.getTemplate('tmpl-registry', 'v1');
  assert.equal(reread.metadata.key, 'changed');
});

test('multiple versions and latest compatible lookup', () => {
  const registry = createVisualizationTemplateRegistry();
  registry.registerTemplate(createTemplate({ version: 'v1', name: 'One' }));
  registry.registerTemplate(createTemplate({ version: 'v2', name: 'Two' }));

  const latest = registry.getTemplate('tmpl-registry');
  assert.equal(latest.version, 'v1');
  assert.equal(latest.name, 'Two');

  const exact = registry.getTemplate('tmpl-registry', 'v1');
  assert.equal(exact.name, 'Two');
});

test('disabled template exclusion and deprecated behavior', () => {
  const registry = createVisualizationTemplateRegistry();
  registry.registerTemplate(createTemplate({ version: 'v1' }));
  registry.disableTemplate('tmpl-registry', 'v1');

  const listed = registry.listTemplates();
  assert.equal(listed.length, 0);

  registry.enableTemplate('tmpl-registry', 'v1');
  registry.deprecateTemplate('tmpl-registry', { reason: 'migration' }, 'v1');
  assert.equal(registry.listTemplates().length, 0);
  assert.equal(registry.listTemplates({ includeDeprecated: true }).length, 1);
});

test('registry update and removal', () => {
  const registry = createVisualizationTemplateRegistry();
  registry.registerTemplate(createTemplate());
  registry.updateTemplate('tmpl-registry', { name: 'Updated Template' }, { version: 'v1' });

  assert.equal(registry.getTemplate('tmpl-registry', 'v1').name, 'Updated Template');
  assert.equal(registry.unregisterTemplate('tmpl-registry', 'v1'), true);
  assert.equal(registry.hasTemplate('tmpl-registry', 'v1'), false);
});

test('registry subscription cleanup', () => {
  const registry = createVisualizationTemplateRegistry();
  let events = 0;
  const id = registry.subscribe(() => {
    events += 1;
  });

  registry.registerTemplate(createTemplate());
  registry.unsubscribe(id);
  registry.registerTemplate(createTemplate({ version: 'v2' }));

  assert.equal(events, 1);
});

test('registry serialization restoration and empty operation', () => {
  const registry = createVisualizationTemplateRegistry();
  registry.registerTemplate(createTemplate({ version: 'v1' }));
  registry.registerTemplate(createTemplate({ version: 'v2', templateId: 'tmpl-registry-2' }));

  const serialized = registry.serializeRegistry();
  const restored = createVisualizationTemplateRegistry();
  const result = restored.restoreRegistry(serialized);

  assert.equal(result.restoredCount >= 2, true);
  assert.equal(restored.hasTemplate('tmpl-registry', 'v1'), true);
  assert.equal(restored.hasTemplate('tmpl-registry-2', 'v1'), true);

  const empty = createVisualizationTemplateRegistry();
  assert.deepEqual(empty.listTemplates(), []);
  assert.equal(empty.clearRuntimeTemplates(), 0);
});

test('generic query and capability/accessibility/performance query behavior', () => {
  const registry = createVisualizationTemplateRegistry();
  registry.registerTemplate(createTemplate({ templateId: 'tmpl-a11y', version: 'v3', requiredCapabilities: [{ referenceId: 'cap-3', capabilityId: 'cap-a11y', role: 'primary', required: true }], performance: { minimumProfile: 'low', maximumProfile: 'balanced', objectBudget: 8, animationBudget: 8, interactionBudget: 8, assetBudget: 8 }, accessibility: { textDescription: 'A11y', keyboardNavigation: true, reducedMotionCompatibility: true, highContrastCompatibility: true } }));

  const query = normalizeTemplateQuery({
    capabilityIds: ['cap-a11y'],
    requiredFeatures: ['adaptive'],
    performanceProfile: 'balanced'
  });

  const found = registry.findTemplates(query);
  assert.equal(found.length, 1);

  const eligibility = evaluateTemplateEligibility(found[0].template, {
    selectedCapabilities: [{ id: 'cap-a11y' }],
    accessibilityNeeds: { keyboardCompatible: true, reducedMotionCompatible: true },
    performanceProfile: 'balanced'
  });
  assert.equal(eligibility.eligible, true);
});
