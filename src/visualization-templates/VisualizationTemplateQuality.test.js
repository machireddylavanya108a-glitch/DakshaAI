import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdaptiveFallbackTemplate,
  evaluateVisualizationTemplateQuality,
  refineVisualizationTemplate,
  simplifyVisualizationTemplate
} from './index.js';

function context(overrides = {}) {
  return {
    selectedCapabilities: [{ id: 'cap-main' }],
    concepts: [{ id: 'c1' }, { id: 'c2' }],
    relationships: [{ id: 'r1' }],
    orderedSteps: [{ id: 's1' }, { id: 's2' }],
    accessibilityNeeds: { keyboardCompatible: true, reducedMotionCompatible: true, highContrastCompatible: true, textAlternativeRequired: true },
    performanceProfile: 'balanced',
    sceneConstraints: { complexityBudget: { maxTemplateComplexity: 40 } },
    ...overrides
  };
}

test('quality scoring returns deterministic score and components', () => {
  const template = createAdaptiveFallbackTemplate({
    templateId: 'quality-template',
    requiredCapabilities: [{ referenceId: 'cap-1', capabilityId: 'cap-main', role: 'primary', required: true }]
  });

  const first = evaluateVisualizationTemplateQuality(template, context(), { qualityThreshold: 65 });
  const second = evaluateVisualizationTemplateQuality(template, context(), { qualityThreshold: 65 });

  assert.equal(first.score, second.score);
  assert.equal(first.confidence, second.confidence);
  assert.equal(typeof first.components.accessibilityCoverage, 'number');
});

test('quality threshold enforcement and refinement pass limit', () => {
  const template = createAdaptiveFallbackTemplate({
    templateId: 'quality-threshold',
    slots: [],
    regions: []
  });

  const before = evaluateVisualizationTemplateQuality(template, context(), { qualityThreshold: 90 });
  const refined = refineVisualizationTemplate(template, context(), {
    qualityThreshold: 90,
    refinementPasses: 5,
    maximumSlots: 12,
    maximumRegions: 6,
    maximumRelationships: 24
  });

  assert.equal(refined.passes <= 3, true);
  assert.equal(before.passed, false);
});

test('simplification reduces excessive complexity while preserving required structure', () => {
  const template = createAdaptiveFallbackTemplate({
    templateId: 'quality-simplify',
    slots: Array.from({ length: 60 }, (_, index) => ({
      id: `slot-${index + 1}`,
      purpose: index === 0 ? 'primary-content' : 'supporting-content',
      capacity: 1,
      priority: index + 1,
      regionId: index % 2 === 0 ? 'region-primary' : 'region-secondary',
      multiplicity: index === 0 ? 'one' : 'many',
      metadata: { required: index === 0 }
    })),
    regions: [
      { id: 'region-primary', purpose: 'main-structure', capacity: 40, accessibilityOrder: 1 },
      { id: 'region-secondary', purpose: 'supporting-structure', capacity: 40, accessibilityOrder: 2 }
    ],
    relationships: Array.from({ length: 80 }, (_, index) => ({
      id: `rel-${index + 1}`,
      sourceId: index % 2 === 0 ? 'slot-1' : 'slot-2',
      targetId: index % 2 === 0 ? 'region-primary' : 'region-secondary',
      relation: 'references',
      required: index < 2
    }))
  });

  const simplified = simplifyVisualizationTemplate(template, {
    maximumSlots: 12,
    maximumRegions: 4,
    maximumRelationships: 20,
    reduceMotion: true
  }, {});

  assert.equal(simplified.template.slots.length <= 12, true);
  assert.equal(simplified.template.regions.length <= 4, true);
  assert.equal(simplified.template.relationships.length <= 20, true);
  assert.equal(simplified.template.slots.some((slot) => slot.metadata?.required === true), true);
});
