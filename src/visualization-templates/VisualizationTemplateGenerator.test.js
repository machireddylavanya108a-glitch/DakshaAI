import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearGeneratedTemplateCache,
  createVisualizationTemplateRegistry,
  generateVisualizationTemplate,
  invalidateGeneratedTemplateCache
} from './index.js';

function createContext(overrides = {}) {
  return {
    sceneId: 'scene-phase-2d',
    lessonId: 'lesson-phase-2d',
    lesson: { topic: 'Unknown Future Topic', content: 'A learner compares systems and sequences with dependencies.' },
    classification: { domain: 'Custom', subDomain: 'Open Topic', visualization: 'Adaptive' },
    visualizationRequirements: {
      preferredCapabilities: ['adaptive-purpose'],
      accessibilityNeeds: { keyboardCompatible: true, reducedMotionCompatible: true, highContrastCompatible: true },
      layoutIntent: 'adaptive'
    },
    selectedCapabilities: [{ id: 'cap-adaptive', role: 'primary', required: true }],
    capabilityComposition: { selectedCapabilities: ['cap-adaptive'] },
    concepts: [
      { id: 'c1', type: 'concept-node', importance: 1 },
      { id: 'c2', type: 'concept-node', importance: 0.7 },
      { id: 'c3', type: 'concept-node', importance: 0.6 }
    ],
    relationships: [
      { id: 'r1', sourceId: 'c1', targetId: 'c2', relation: 'supports', required: true },
      { id: 'r2', sourceId: 'c2', targetId: 'c3', relation: 'depends-on', required: false }
    ],
    orderedSteps: [{ id: 's1' }, { id: 's2' }, { id: 's3' }],
    interactionRequirements: { depth: 'light' },
    accessibilityNeeds: { keyboardCompatible: true, reducedMotionCompatible: true, highContrastCompatible: true, textAlternativeRequired: true },
    performanceProfile: 'balanced',
    runtimeCapabilities: { supportsWebGL: true, logicalCores: 8, deviceMemoryGb: 16 },
    sceneConstraints: { complexityBudget: { maxTemplateComplexity: 80 } },
    metadata: { confidence: 0.8 },
    ...overrides
  };
}

test('template generation from structured requirements and unknown topic compatibility', async () => {
  const result = await generateVisualizationTemplate(createContext(), {
    deterministicSeed: 'seed-phase-2d-1',
    useCache: false,
    registerGeneratedTemplate: false
  });

  assert.equal(['generated', 'refined', 'salvaged', 'fallback'].includes(result.status), true);
  assert.ok(result.template);
  assert.ok(result.templateInstance);
  assert.ok(result.bindings?.slots);
  assert.equal(result.template.source, 'procedural');
  assert.equal(typeof result.template.layout?.strategy, 'string');
  assert.equal(result.template.metadata?.generationFingerprint?.length > 0, true);
});

test('deterministic template structure and stable generated ordering', async () => {
  const context = createContext();
  const options = {
    deterministicSeed: 'seed-phase-2d-deterministic',
    useCache: false,
    registerGeneratedTemplate: false
  };

  const first = await generateVisualizationTemplate(context, options);
  const second = await generateVisualizationTemplate(context, options);

  assert.equal(first.template.templateId, second.template.templateId);
  assert.deepEqual(first.template.slots.map((item) => item.id), second.template.slots.map((item) => item.id));
  assert.deepEqual(first.template.regions.map((item) => item.id), second.template.regions.map((item) => item.id));
  assert.deepEqual(first.template.relationships.map((item) => item.id), second.template.relationships.map((item) => item.id));
  assert.equal(first.templateInstance.instanceId, second.templateInstance.instanceId);
  assert.equal(first.quality.score, second.quality.score);
});

test('generation cache hit and cache invalidation behavior', async () => {
  clearGeneratedTemplateCache();
  const context = createContext();

  const first = await generateVisualizationTemplate(context, {
    deterministicSeed: 'seed-phase-2d-cache',
    useCache: true,
    registerGeneratedTemplate: false
  });

  const second = await generateVisualizationTemplate(context, {
    deterministicSeed: 'seed-phase-2d-cache',
    useCache: true,
    registerGeneratedTemplate: false
  });

  assert.equal(first.cacheHit, false);
  assert.equal(second.cacheHit, true);

  const cacheKey = second.diagnostics?.generationFingerprint ? `template-generation:${second.diagnostics.generationFingerprint}` : '';
  invalidateGeneratedTemplateCache(cacheKey);

  const third = await generateVisualizationTemplate(context, {
    deterministicSeed: 'seed-phase-2d-cache',
    useCache: true,
    registerGeneratedTemplate: false,
    performanceProfile: 'high'
  });
  assert.equal(third.cacheHit, false);
});

test('concurrent request deduplication and cancellation cleanup', async () => {
  const context = createContext();

  const [first, second] = await Promise.all([
    generateVisualizationTemplate(context, {
      deterministicSeed: 'seed-phase-2d-concurrent',
      useCache: false,
      registerGeneratedTemplate: false
    }),
    generateVisualizationTemplate(context, {
      deterministicSeed: 'seed-phase-2d-concurrent',
      useCache: false,
      registerGeneratedTemplate: false
    })
  ]);

  assert.equal(first.template.templateId, second.template.templateId);
  assert.equal(second.diagnostics?.deduplicated === true || first.diagnostics?.deduplicated === true, true);

  const controller = new AbortController();
  controller.abort();
  const cancelled = await generateVisualizationTemplate(context, {
    deterministicSeed: 'seed-phase-2d-abort',
    signal: controller.signal,
    fallbackEnabled: false
  });
  assert.equal(cancelled.status, 'cancelled');

  const resumed = await generateVisualizationTemplate(context, {
    deterministicSeed: 'seed-phase-2d-abort',
    useCache: false,
    registerGeneratedTemplate: false
  });
  assert.equal(resumed.status !== 'failed', true);
});

test('quality threshold enforcement and registration policy', async () => {
  const registry = createVisualizationTemplateRegistry();
  const context = createContext();

  const lowQuality = await generateVisualizationTemplate(context, {
    deterministicSeed: 'seed-phase-2d-low-quality',
    qualityThreshold: 99,
    registerGeneratedTemplate: true,
    registry,
    useCache: false
  });

  assert.equal(lowQuality.quality.passed, false);
  assert.equal(lowQuality.registered, false);

  const highQuality = await generateVisualizationTemplate(context, {
    deterministicSeed: 'seed-phase-2d-high-quality',
    qualityThreshold: 40,
    registerGeneratedTemplate: true,
    registry,
    useCache: false
  });

  assert.equal(highQuality.quality.score >= 40, true);
  assert.equal(highQuality.registered, highQuality.status !== 'fallback' || highQuality.fallbackLevel < 4);
});
