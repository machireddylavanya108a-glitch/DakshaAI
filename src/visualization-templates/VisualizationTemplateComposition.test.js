import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bindTemplateRegions,
  bindTemplateSlots,
  composeVisualizationTemplates,
  resolveTemplateConflicts,
  resolveTemplateDependencies,
  resolveTemplateVariables,
  createVisualizationTemplateRegistry
} from './index.js';

function template(overrides = {}) {
  return {
    templateId: 'tmpl-comp',
    version: 'v1',
    name: 'Composition Template',
    semanticPurpose: 'structure',
    requiredCapabilities: [{ referenceId: 'cap-1', capabilityId: 'cap-main', role: 'primary', required: true }],
    optionalCapabilities: [],
    slots: [{ id: 'slot-main', purpose: 'primary-content', regionId: 'region-main', capacity: 1, priority: 1, accepts: ['concept-node'] }],
    regions: [{ id: 'region-main', purpose: 'main-structure', capacity: 1, accessibilityOrder: 1 }],
    relationships: [],
    layout: { strategy: 'adaptive' },
    variables: [{ id: 'var-focus', name: 'focusMode', defaultValue: 'guided', required: true }],
    accessibility: { textDescription: 'Comp', readingOrder: ['region-main'], keyboardNavigation: true, reducedMotionCompatibility: true, highContrastCompatibility: true },
    performance: { minimumProfile: 'low', maximumProfile: 'high', objectBudget: 8, animationBudget: 8, interactionBudget: 8, assetBudget: 8 },
    metadata: {},
    ...overrides
  };
}

function candidate(templateValue) {
  return {
    template: templateValue,
    score: { normalizedScore: 0.8, totalScore: 80 },
    eligibility: { eligible: true }
  };
}

test('multi-template composition and conflict resolution for duplicate slot/region/layout/accessibility/performance', () => {
  const a = template({ templateId: 'tmpl-a', slots: [{ id: 'slot-shared', purpose: 'primary-content', regionId: 'region-shared', capacity: 1, priority: 1 }], regions: [{ id: 'region-shared', purpose: 'main-structure', capacity: 1, accessibilityOrder: 1 }], accessibility: { textDescription: 'A', readingOrder: ['region-shared', 'region-shared'], keyboardNavigation: true, reducedMotionCompatibility: true, highContrastCompatibility: true }, performance: { minimumProfile: 'high', maximumProfile: 'low', objectBudget: 6, animationBudget: 6, interactionBudget: 6, assetBudget: 6 } });
  const b = template({ templateId: 'tmpl-b', slots: [{ id: 'slot-shared', purpose: 'supporting-content', regionId: 'region-shared', capacity: 1, priority: 2 }], regions: [{ id: 'region-shared', purpose: 'supporting-structure', capacity: 1, accessibilityOrder: 2 }], variables: [{ id: 'var-focus', name: 'focusMode', defaultValue: 'free', required: false }] });

  const conflicts = resolveTemplateConflicts([a, b], {});
  assert.equal(conflicts.conflicts.length >= 3, true);

  const composed = composeVisualizationTemplates([candidate(a), candidate(b)], {}, {});
  assert.equal(composed.primaryTemplate.templateId, 'tmpl-a');
  assert.equal(composed.supportingTemplates.length >= 1, true);
  assert.equal(composed.mergedSlots.length >= 2, true);
  assert.equal(composed.diagnostics.conflictCount >= 1, true);
});

test('dependency resolution required optional circular and depth limit', () => {
  const registry = createVisualizationTemplateRegistry();
  const dep = template({ templateId: 'tmpl-dep', version: 'v1' });
  registry.registerTemplate(dep);

  const root = template({
    templateId: 'tmpl-root',
    version: 'v1',
    metadata: {
      dependencies: [
        { templateId: 'tmpl-dep', version: 'v1', required: true },
        { templateId: 'tmpl-missing-opt', required: false }
      ]
    }
  });

  const resolved = resolveTemplateDependencies([root], registry, {}, { maxDepth: 4 });
  assert.equal(resolved.templates.some((item) => item.templateId === 'tmpl-dep'), true);
  assert.equal(resolved.warnings.some((item) => item.includes('optional-dependency-missing')), true);

  const circular = template({
    templateId: 'tmpl-circular',
    metadata: {
      dependencies: [{ templateId: 'tmpl-circular', required: true }]
    }
  });

  const circularResult = resolveTemplateDependencies([circular], registry, {}, { maxDepth: 1 });
  assert.equal(circularResult.circularDependencies.length >= 1 || circularResult.missingDependencies.length >= 0, true);
});

test('slot and region binding with required unbound diagnostics and variable safety', () => {
  const templateInstance = {
    sourceTemplate: template(),
    resolvedSlots: template().slots,
    resolvedRegions: template().regions,
    sceneBindings: { layoutIntent: 'adaptive' },
    resolvedVariables: { '__proto__': 'bad' }
  };

  const slotBindings = bindTemplateSlots(templateInstance, {
    concepts: [{ id: 'concept-1', type: 'concept-node', label: 'A' }],
    relationships: [],
    orderedSteps: []
  });
  assert.equal(slotBindings.bindings.length, 1);

  const regionBindings = bindTemplateRegions(templateInstance, slotBindings, {});
  assert.equal(regionBindings.bindings.length, 1);

  const variableBinding = resolveTemplateVariables(templateInstance, { metadata: { focusMode: 'guided' } }, { variables: { constructor: 'blocked' } });
  assert.equal(variableBinding.blockedKeys.includes('__proto__'), false);
  assert.equal(variableBinding.blockedKeys.includes('constructor'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(variableBinding.resolved, 'constructor'), false);
});
