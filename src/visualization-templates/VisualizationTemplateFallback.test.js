import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTemplateGenerationFallback, createAdaptiveFallbackTemplate } from './index.js';

function context() {
  return {
    sceneId: 'scene-fallback',
    lessonId: 'lesson-fallback',
    visualizationRequirements: { preferredCapabilities: ['adaptive-purpose'] },
    selectedCapabilities: [{ id: 'cap-fallback' }],
    concepts: [{ id: 'c1', type: 'concept-node' }],
    relationships: [],
    orderedSteps: [{ id: 's1' }],
    accessibilityNeeds: { keyboardCompatible: true, reducedMotionCompatible: true, highContrastCompatible: true },
    performanceProfile: 'balanced',
    runtimeCapabilities: { supportsWebGL: true }
  };
}

test('fallback levels 1-5 return safe non-null templates', () => {
  const base = createAdaptiveFallbackTemplate();

  for (const level of [1, 2, 3, 4, 5]) {
    const result = applyTemplateGenerationFallback(level, base, context(), {});
    assert.equal(result.fallbackUsed, true);
    assert.equal(result.fallbackLevel, level);
    assert.ok(result.template);
    assert.ok(result.processedTemplate);
  }
});

test('minimal safe level 5 includes template instance and bindings', () => {
  const result = applyTemplateGenerationFallback(5, null, context(), {});
  assert.ok(result.template);
  assert.ok(result.templateInstance);
  assert.ok(result.bindings?.slots);
  assert.ok(result.bindings?.regions);
  assert.equal(result.template.regions.length >= 1, true);
  assert.equal(result.template.slots.length >= 1, true);
});

test('level 2 salvage preserves safe structure from partially broken input', () => {
  const broken = {
    templateId: 'broken-template',
    version: 'v1',
    slots: [{ id: 'slot-1', regionId: 'missing-region', purpose: 'primary-content' }],
    regions: [],
    relationships: [{ id: 'rel-1', sourceId: 'slot-1', targetId: 'slot-1', relation: 'invalid', required: true }]
  };

  const result = applyTemplateGenerationFallback(2, broken, context(), {});
  assert.ok(result.template);
  assert.equal(result.template.regions.length >= 1, true);
  assert.equal(result.template.slots.length >= 1, true);
});
