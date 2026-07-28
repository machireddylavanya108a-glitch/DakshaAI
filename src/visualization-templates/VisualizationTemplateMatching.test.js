import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVisualizationTemplateRegistry,
  evaluateTemplateEligibility,
  matchVisualizationTemplates,
  scoreVisualizationTemplateCandidate,
  rankVisualizationTemplates
} from './index.js';

function makeTemplate(overrides = {}) {
  return {
    templateId: 'tmpl-match',
    version: 'v1',
    name: 'Matching Template',
    semanticPurpose: 'sequence',
    requiredCapabilities: [{ referenceId: 'cap-1', capabilityId: 'cap-sequence', role: 'primary', required: true }],
    optionalCapabilities: [{ referenceId: 'cap-2', capabilityId: 'cap-support', role: 'supporting', required: false }],
    slots: [{ id: 'slot-1', purpose: 'primary-content', regionId: 'region-1', capacity: 1, priority: 1, accepts: ['concept-node'] }],
    regions: [{ id: 'region-1', purpose: 'main-structure', capacity: 2, accessibilityOrder: 1 }],
    relationships: [],
    layout: { strategy: 'adaptive' },
    accessibility: { textDescription: 'Matching template', keyboardNavigation: true, reducedMotionCompatibility: true, highContrastCompatibility: true },
    performance: { minimumProfile: 'low', maximumProfile: 'high', objectBudget: 12, animationBudget: 12, interactionBudget: 12, assetBudget: 12 },
    metadata: { confidence: 0.8 },
    ...overrides
  };
}

function context(overrides = {}) {
  return {
    selectedCapabilities: [{ id: 'cap-sequence' }, { id: 'cap-support' }],
    visualizationRequirements: {
      preferredCapabilities: ['cap-sequence'],
      accessibilityNeeds: { keyboardCompatible: true, reducedMotionCompatible: true }
    },
    concepts: [{ id: 'c1', type: 'concept-node', label: 'Concept A' }],
    relationships: [{ id: 'r1', relation: 'supports' }],
    orderedSteps: [{ id: 's1', title: 'Step 1' }, { id: 's2', title: 'Step 2' }],
    accessibilityNeeds: { keyboardCompatible: true, reducedMotionCompatible: true },
    performanceProfile: 'balanced',
    runtimeCapabilities: { supportsWebGL: true },
    sceneConstraints: { complexityBudget: { maxTemplateComplexity: 20 } },
    ...overrides
  };
}

test('eligibility hard failure and soft warning with unknown metadata support', () => {
  const template = makeTemplate({ accessibility: { textDescription: '', keyboardNavigation: false, reducedMotionCompatibility: false }, metadata: { unknownFutureField: { ok: true } } });
  const hard = evaluateTemplateEligibility(template, context({ selectedCapabilities: [] }));
  assert.equal(hard.eligible, false);
  assert.equal(hard.hardFailures.length >= 1, true);

  const soft = evaluateTemplateEligibility(makeTemplate({ accessibility: { textDescription: '', keyboardNavigation: true, reducedMotionCompatibility: true } }), context());
  assert.equal(soft.softWarnings.length >= 1, true);
});

test('deterministic matching and arbitrary unknown topic compatibility', () => {
  const registry = createVisualizationTemplateRegistry();
  registry.registerTemplate(makeTemplate({ templateId: 'tmpl-seq', version: 'v1' }));
  registry.registerTemplate(makeTemplate({ templateId: 'tmpl-seq', version: 'v2', metadata: { confidence: 0.82 } }));
  registry.registerTemplate(makeTemplate({ templateId: 'tmpl-unknown', semanticPurpose: 'unknown-semantic-purpose-x', requiredCapabilities: [] }));

  const first = matchVisualizationTemplates(context({ lesson: { topic: 'New Unknown Future Topic' } }), registry);
  const second = matchVisualizationTemplates(context({ lesson: { topic: 'New Unknown Future Topic' } }), registry);

  assert.deepEqual(first.candidates.map((item) => item.registryEntry.key), second.candidates.map((item) => item.registryEntry.key));
});

test('deterministic scoring, finite range and explainable components', () => {
  const candidate = {
    template: makeTemplate(),
    eligibility: { hardFailures: [] },
    requirementMatches: { coverage: 0.7 },
    accessibilityMatches: { coverage: 0.8 },
    performanceMatches: { coverage: 0.9 },
    unresolvedRequirements: [],
    confidence: 0.8
  };

  const a = scoreVisualizationTemplateCandidate(candidate, context());
  const b = scoreVisualizationTemplateCandidate(candidate, context());

  assert.deepEqual(a, b);
  assert.equal(Number.isFinite(a.totalScore), true);
  assert.equal(Number.isFinite(a.normalizedScore), true);
  assert.equal(a.totalScore >= 0 && a.totalScore <= 100, true);
  assert.equal(a.explanation.includes('score='), true);
});

test('required capability penalty, accessibility contribution, runtime/performance influence', () => {
  const okCandidate = {
    template: makeTemplate(),
    eligibility: { hardFailures: [] },
    requirementMatches: { coverage: 0.8 },
    accessibilityMatches: { coverage: 1 },
    performanceMatches: { coverage: 1 },
    unresolvedRequirements: [],
    confidence: 0.8
  };

  const weakCandidate = {
    ...okCandidate,
    template: makeTemplate({ requiredCapabilities: [{ referenceId: 'cap-x', capabilityId: 'cap-missing', role: 'primary', required: true }] }),
    accessibilityMatches: { coverage: 0.2 },
    performanceMatches: { coverage: 0.3 },
    unresolvedRequirements: ['missing-required-capability']
  };

  const strong = scoreVisualizationTemplateCandidate(okCandidate, context());
  const weak = scoreVisualizationTemplateCandidate(weakCandidate, context({ selectedCapabilities: [] }));

  assert.equal(strong.totalScore > weak.totalScore, true);
});

test('deterministic ranking and stable tie-breaking', () => {
  const ranked = rankVisualizationTemplates([
    { template: makeTemplate({ templateId: 'tmpl-b', version: 'v1' }), eligibility: { eligible: true }, score: { normalizedScore: 0.8 }, unresolvedRequirements: [], accessibilityMatches: { coverage: 0.8 }, performanceMatches: { coverage: 0.8 }, registryEntry: { trustLevel: 0.7, key: 'tmpl-b::v1' } },
    { template: makeTemplate({ templateId: 'tmpl-a', version: 'v1' }), eligibility: { eligible: true }, score: { normalizedScore: 0.8 }, unresolvedRequirements: [], accessibilityMatches: { coverage: 0.8 }, performanceMatches: { coverage: 0.8 }, registryEntry: { trustLevel: 0.7, key: 'tmpl-a::v1' } }
  ]);

  assert.deepEqual(ranked.ranked.map((item) => item.template.templateId), ['tmpl-a', 'tmpl-b']);
});
