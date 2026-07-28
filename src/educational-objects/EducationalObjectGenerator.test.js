import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateEducationalObjects,
  createEducationalObjectBlueprint,
  selectEducationalObjectRepresentation,
  generateEducationalObjectGeometry,
  generateEducationalObjectVisualProperties,
  generateEducationalObjectSpatialProperties,
  generateEducationalObjectLabels,
  generateEducationalObjectNarration,
  simplifyEducationalObjects,
  salvageEducationalObjects,
  clearEducationalObjectGenerationCache
} from './index.js';
import { readFileSync } from 'node:fs';

function context(overrides = {}) {
  return {
    sceneId: 'scene-generator-1',
    lessonId: 'lesson-generator-1',
    lesson: {
      id: 'lesson-generator-1',
      title: 'Adaptive Lesson',
      topic: 'Unknown Multimodal Topic',
      content: ['Analyze relationships in an unknown system.']
    },
    classification: {
      domain: 'Custom',
      subDomain: 'Open Topic',
      visualization: 'Adaptive'
    },
    visualizationRequirements: {
      accessibilityNeeds: {
        keyboardCompatible: true,
        reducedMotionCompatible: true,
        highContrastCompatible: true,
        textAlternativeRequired: true
      }
    },
    selectedCapabilities: [{ id: 'cap-1', role: 'primary', required: true }],
    capabilityComposition: { selectedCapabilities: ['cap-1'] },
    template: { templateId: 'tmpl-1' },
    templateInstance: { instanceId: 'tmpl-inst-1' },
    slotBindings: [
      { slotId: 'slot-1', regionId: 'region-1', required: true, priority: 1 },
      { slotId: 'slot-2', regionId: 'region-1', required: false, priority: 2 }
    ],
    regionBindings: [{ regionId: 'region-1', capacity: 2, priority: 1 }],
    concepts: [
      { id: 'c1', label: 'Core Concept', importance: 0.9, role: 'primary-concept' },
      { id: 'c2', label: 'Support Concept', importance: 0.5, role: 'supporting-concept' },
      { id: 'c3', label: 'Context Concept', importance: 0.4, role: 'supporting-concept' }
    ],
    relationships: [
      { id: 'r1', sourceConceptId: 'c1', targetConceptId: 'c2', relation: 'supports', required: true },
      { id: 'r2', sourceConceptId: 'c2', targetConceptId: 'c3', relation: 'depends-on', required: false }
    ],
    orderedSteps: [{ id: 's1' }, { id: 's2' }],
    interactionRequirements: [{ id: 'i1', depth: 'light' }],
    accessibilityNeeds: {
      keyboardCompatible: true,
      reducedMotionCompatible: true,
      highContrastCompatible: true,
      textAlternativeRequired: true
    },
    performanceProfile: 'balanced',
    runtimeCapabilities: { supportsWebGL: true, logicalCores: 8, deviceMemoryGb: 12 },
    sceneConstraints: { complexityBudget: { maxObjects: 20, maxTemplateComplexity: 60 } },
    metadata: { locale: 'en' },
    ...overrides
  };
}

test('blueprint and structural generators produce declarative deterministic output', () => {
  const first = createEducationalObjectBlueprint(context(), { deterministicSeed: 'seed-1' });
  const second = createEducationalObjectBlueprint(context(), { deterministicSeed: 'seed-1' });

  assert.equal(first.blueprintId, second.blueprintId);
  assert.equal(first.objectBudget, second.objectBudget);
  assert.equal(Array.isArray(first.conceptPlan.concepts), true);
  assert.equal(Array.isArray(first.relationshipPlan.relationships), true);
});

test('representation geometry visual spatial label narration generation works generically', () => {
  const ctx = context();
  const concept = ctx.concepts[0];
  const representation = selectEducationalObjectRepresentation(concept, ctx.relationships, ctx.selectedCapabilities, ctx, { performanceProfile: 'balanced' });
  const geometry = generateEducationalObjectGeometry(representation, concept, ctx, { performanceProfile: 'balanced' });
  const visual = generateEducationalObjectVisualProperties(representation, concept, ctx, { performanceProfile: 'balanced' });
  const spatial = generateEducationalObjectSpatialProperties({ objectId: 'obj-1' }, { slotId: 'slot-1', regionId: 'region-1' }, [], ctx, { objectIndex: 0, performanceProfile: 'balanced' });
  const labels = generateEducationalObjectLabels({ objectId: 'obj-1', name: 'Core Concept' }, concept, ctx, { objectIndex: 0 });
  const narration = generateEducationalObjectNarration({ objectId: 'obj-1', learningPurpose: 'inspect' }, concept, ctx, { objectIndex: 0 });

  assert.equal(typeof representation.mode, 'string');
  assert.equal(Array.isArray(geometry.relativeScale), true);
  assert.equal(typeof visual.contrastIntent, 'string');
  assert.equal(typeof spatial.slotBinding, 'string');
  assert.equal(labels.length >= 1, true);
  assert.equal(typeof narration.shortText, 'string');
});

test('generator supports unknown topic and unknown object kinds without code changes', async () => {
  const generated = await generateEducationalObjects(context({
    lesson: {
      id: 'lesson-unknown',
      title: 'Unknown Topic',
      topic: 'Quantum-historic civic bioinformatics',
      content: ['Unknown structures with emergent interactions.']
    },
    concepts: [{ id: 'u1', label: 'Unknown Node', importance: 0.6, kind: 'non-standard-kind' }],
    relationships: []
  }), {
    useCache: false,
    deterministicSeed: 'seed-unknown'
  });

  assert.equal(['generated', 'refined', 'salvaged', 'fallback'].includes(generated.status), true);
  assert.equal(generated.objects.length >= 1, true);
  assert.equal(typeof generated.objects[0].kind, 'string');
});

test('generation is deterministic with stable object ids order labels and relationships', async () => {
  clearEducationalObjectGenerationCache();
  const ctx = context();
  const opts = { useCache: false, deterministicSeed: 'seed-deterministic', performanceProfile: 'balanced' };

  const first = await generateEducationalObjects(ctx, opts);
  const second = await generateEducationalObjects(ctx, opts);

  assert.deepEqual(first.objects.map((item) => item.objectId), second.objects.map((item) => item.objectId));
  assert.deepEqual(first.objects.map((item) => item.labels?.[0]?.id || ''), second.objects.map((item) => item.labels?.[0]?.id || ''));
  assert.deepEqual(first.objects.map((item) => (item.relationshipReferences || []).map((relation) => relation.relationId)), second.objects.map((item) => (item.relationshipReferences || []).map((relation) => relation.relationId)));
  assert.equal(first.quality.score, second.quality.score);
});

test('performance profiles and object count clamp are enforced', async () => {
  const concepts = Array.from({ length: 70 }, (_, index) => ({
    id: `c${index + 1}`,
    label: `Concept ${index + 1}`,
    importance: index === 0 ? 0.95 : 0.4
  }));

  const low = await generateEducationalObjects(context({ concepts }), {
    useCache: false,
    deterministicSeed: 'seed-low',
    performanceProfile: 'low'
  });
  const high = await generateEducationalObjects(context({ concepts }), {
    useCache: false,
    deterministicSeed: 'seed-high',
    performanceProfile: 'high'
  });
  const auto = await generateEducationalObjects(context({ concepts, runtimeCapabilities: { logicalCores: 2, deviceMemoryGb: 3 } }), {
    useCache: false,
    deterministicSeed: 'seed-auto',
    performanceProfile: 'auto'
  });

  assert.equal(low.objects.length <= 20, true);
  assert.equal(high.objects.length <= 100, true);
  assert.equal(auto.objects.length <= 20, true);
  assert.equal(low.objects.some((item) => item.semanticRole.includes('primary')), true);
});

test('simplification and salvage utilities preserve safe objects and remove duplicates', () => {
  const duplicate = [
    { objectId: 'obj-a', kind: 'generic', name: 'A', semanticRole: 'supporting-concept', labels: [], relationshipReferences: [] },
    { objectId: 'obj-b', kind: 'generic', name: 'A', semanticRole: 'supporting-concept', labels: [], relationshipReferences: [] },
    { objectId: 'obj-c', kind: 'generic', name: 'C', semanticRole: 'primary-concept', labels: [], relationshipReferences: [] }
  ];

  const simplified = simplifyEducationalObjects(duplicate, { maximumObjects: 2 }, { reduceLabelDensity: true, reduceOptionalRelationships: true });
  assert.equal(simplified.objects.length <= 2, true);

  const salvaged = salvageEducationalObjects([{ objectId: 'obj-x', metadata: { __proto__: { polluted: true } } }], context(), { fallbackEnabled: true });
  assert.equal(Array.isArray(salvaged.objects), true);
  assert.equal(({}).polluted, undefined);
});

test('quality threshold fallback cache hit and deduplication are handled', async () => {
  clearEducationalObjectGenerationCache();
  const ctx = context();

  const first = await generateEducationalObjects(ctx, {
    useCache: true,
    deterministicSeed: 'seed-cache',
    qualityThreshold: 98,
    fallbackEnabled: true
  });
  const second = await generateEducationalObjects(ctx, {
    useCache: true,
    deterministicSeed: 'seed-cache',
    qualityThreshold: 98,
    fallbackEnabled: true
  });

  assert.equal(second.cacheHit, true);
  assert.equal(first.objects.length >= 1, true);

  const [one, two] = await Promise.all([
    generateEducationalObjects(ctx, { useCache: false, deterministicSeed: 'seed-dedup', fallbackEnabled: true }),
    generateEducationalObjects(ctx, { useCache: false, deterministicSeed: 'seed-dedup', fallbackEnabled: true })
  ]);

  assert.equal(one.status !== 'failed', true);
  assert.equal(two.status !== 'failed', true);
  assert.equal(one.deduplicated === true || two.deduplicated === true, true);
});

test('abort signal cancellation and cleanup works without forced fallback', async () => {
  const controller = new AbortController();
  controller.abort();

  const cancelled = await generateEducationalObjects(context(), {
    signal: controller.signal,
    fallbackEnabled: false,
    deterministicSeed: 'seed-cancel'
  });

  assert.equal(cancelled.status, 'cancelled');

  const resumed = await generateEducationalObjects(context(), {
    useCache: false,
    deterministicSeed: 'seed-cancel'
  });

  assert.equal(resumed.status !== 'failed', true);
});

test('no subject-mapping patterns exist in generator stack', () => {
  const files = [
    'EducationalObjectGenerator.js',
    'EducationalObjectFactory.js',
    'EducationalObjectBlueprint.js',
    'EducationalObjectRepresentationSelector.js',
    'EducationalObjectGeometryGenerator.js'
  ];

  const forbidden = /(generateBiology|generatePhysics|generateTrading|generateProgramming|subjectMap|domainMap|topicMap|if\s*\(\s*subject\s*===|switch\s*\(\s*subject)/i;
  files.forEach((name) => {
    const source = readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
    assert.equal(forbidden.test(source), false);
  });
});
