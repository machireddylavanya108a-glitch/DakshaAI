import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVisualizationTemplateBlueprint,
  generateTemplateLayout,
  generateTemplateRelationships,
  generateTemplateRegions,
  generateTemplateSlots
} from './index.js';

function context(overrides = {}) {
  return {
    sceneId: 'scene-layout',
    lessonId: 'lesson-layout',
    visualizationRequirements: {
      preferredCapabilities: ['adaptive-purpose'],
      layoutIntent: 'adaptive',
      accessibilityNeeds: { keyboardCompatible: true, reducedMotionCompatible: true }
    },
    selectedCapabilities: [{ id: 'cap-layout', role: 'primary', required: true }],
    concepts: Array.from({ length: 8 }, (_, index) => ({ id: `concept-${index + 1}`, type: 'concept-node', importance: 1 - index * 0.05 })),
    relationships: Array.from({ length: 10 }, (_, index) => ({ id: `rel-${index + 1}`, sourceId: `concept-${(index % 7) + 1}`, targetId: `concept-${(index % 7) + 2}`, relation: 'relates-to', required: index % 3 === 0 })),
    orderedSteps: Array.from({ length: 6 }, (_, index) => ({ id: `step-${index + 1}` })),
    interactionRequirements: { depth: 'deep' },
    accessibilityNeeds: { keyboardCompatible: true, reducedMotionCompatible: true, highContrastCompatible: true },
    performanceProfile: 'low',
    runtimeCapabilities: { supportsWebGL: true, deviceMemoryGb: 2, logicalCores: 4 },
    sceneConstraints: { complexityBudget: { maxTemplateComplexity: 32 } },
    ...overrides
  };
}

test('blueprint and layout generation produce safe declarative metadata', () => {
  const c = context();
  const blueprint = createVisualizationTemplateBlueprint(c, { deterministicSeed: 'layout-seed' });
  const layout = generateTemplateLayout(blueprint, c, { performanceProfile: 'low' });

  assert.ok(blueprint.blueprintId);
  assert.equal(typeof layout.strategy, 'string');
  assert.equal(Number.isFinite(layout.spacing.x), true);
  assert.equal(layout.spacing.x > 0, true);
  assert.equal(layout.constraints.length >= 2, true);
});

test('slot, region, relationship generation enforce budgets and stable structure', () => {
  const c = context();
  const blueprint = createVisualizationTemplateBlueprint(c, { deterministicSeed: 'structure-seed' });
  const slots = generateTemplateSlots(blueprint, c, { performanceProfile: 'low', maximumSlots: 10 });
  const regions = generateTemplateRegions(blueprint, slots, c, { performanceProfile: 'low', maximumRegions: 5 });
  const relationships = generateTemplateRelationships(blueprint, slots, regions, c, { performanceProfile: 'low', maximumRelationships: 20 });

  assert.equal(slots.length <= 10, true);
  assert.equal(regions.length <= 5, true);
  assert.equal(relationships.length <= 20, true);
  assert.equal(slots.every((slot) => slot.regionId && typeof slot.regionId === 'string'), true);
  assert.equal(regions.every((region) => Number(region.capacity) >= 1), true);
  assert.equal(relationships.every((relationship) => relationship.sourceId !== relationship.targetId), true);
});

test('profile differences affect generated structure scale', () => {
  const blueprint = createVisualizationTemplateBlueprint(context(), { deterministicSeed: 'profile-seed' });
  const lowSlots = generateTemplateSlots(blueprint, context({ performanceProfile: 'low' }), { performanceProfile: 'low' });
  const highSlots = generateTemplateSlots(blueprint, context({ performanceProfile: 'high', runtimeCapabilities: { logicalCores: 16, deviceMemoryGb: 32 } }), { performanceProfile: 'high' });

  assert.equal(highSlots.length >= lowSlots.length, true);
});
