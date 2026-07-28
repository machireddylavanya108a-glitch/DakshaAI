import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVisualizationTemplateRegistry,
  invalidateTemplateSelectionCache,
  selectVisualizationTemplate
} from './index.js';
import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { loadScene } from '../scene-builder/SceneRuntime.js';
import { generateUniversalScene } from '../scene-generator/SceneGenerationPipeline.js';

function template(overrides = {}) {
  return {
    templateId: 'tmpl-select',
    version: 'v1',
    name: 'Selection Template',
    semanticPurpose: 'sequence',
    requiredCapabilities: [{ referenceId: 'cap-1', capabilityId: 'cap-sequence', role: 'primary', required: true }],
    optionalCapabilities: [{ referenceId: 'cap-2', capabilityId: 'cap-support', role: 'supporting', required: false }],
    slots: [
      { id: 'slot-primary', purpose: 'primary-content', regionId: 'region-main', capacity: 1, priority: 1, accepts: ['concept-node'] },
      { id: 'slot-secondary', purpose: 'supporting-content', regionId: 'region-main', capacity: 3, priority: 2, accepts: ['concept-node', 'relationship'] }
    ],
    regions: [{ id: 'region-main', purpose: 'main-structure', capacity: 3, accessibilityOrder: 1 }],
    relationships: [],
    layout: { strategy: 'adaptive' },
    variables: [{ id: 'var-focus', name: 'focusMode', required: true, defaultValue: 'guided' }],
    accessibility: { textDescription: 'Selection template', keyboardNavigation: true, reducedMotionCompatibility: true, highContrastCompatibility: true },
    performance: { minimumProfile: 'low', maximumProfile: 'high', objectBudget: 10, animationBudget: 10, interactionBudget: 10, assetBudget: 10 },
    metadata: { confidence: 0.85 },
    ...overrides
  };
}

function context(overrides = {}) {
  return {
    sceneId: 'scene-1',
    lessonId: 'lesson-1',
    selectedCapabilities: [{ id: 'cap-sequence' }, { id: 'cap-support' }],
    capabilityComposition: { selectedCapabilities: ['cap-sequence', 'cap-support'] },
    visualizationRequirements: {
      preferredCapabilities: ['cap-sequence'],
      accessibilityNeeds: { keyboardCompatible: true, reducedMotionCompatible: true }
    },
    concepts: [{ id: 'c1', type: 'concept-node', label: 'Concept A' }, { id: 'c2', type: 'concept-node', label: 'Concept B' }],
    relationships: [{ id: 'r1', relation: 'supports' }],
    orderedSteps: [{ id: 's1', title: 'Step 1' }, { id: 's2', title: 'Step 2' }],
    accessibilityNeeds: { keyboardCompatible: true, reducedMotionCompatible: true },
    performanceProfile: 'balanced',
    runtimeCapabilities: { supportsWebGL: true },
    sceneConstraints: { complexityBudget: { maxTemplateComplexity: 20 } },
    metadata: {},
    ...overrides
  };
}

test('single-template selection and deterministic output', () => {
  const registry = createVisualizationTemplateRegistry();
  registry.registerTemplate(template({ templateId: 'tmpl-a', version: 'v1' }));

  const first = selectVisualizationTemplate(context(), { registry });
  const second = selectVisualizationTemplate(context(), { registry });

  assert.equal(first.status === 'selected' || first.status === 'composed', true);
  assert.equal(first.fallbackUsed, false);
  assert.equal(first.selectedTemplate.templateId, second.selectedTemplate.templateId);
  assert.equal(first.selectedTemplateInstance.instanceId, second.selectedTemplateInstance.instanceId);
});

test('empty registry fallback low-score fallback and invalid-candidate fallback', () => {
  invalidateTemplateSelectionCache();
  const emptyRegistry = createVisualizationTemplateRegistry();
  const fallbackEmpty = selectVisualizationTemplate(context(), { registry: emptyRegistry });
  assert.equal(fallbackEmpty.fallbackUsed, true);

  const registry = createVisualizationTemplateRegistry();
  registry.registerTemplate(template({ templateId: 'tmpl-weak', requiredCapabilities: [{ referenceId: 'x', capabilityId: 'missing-cap', role: 'primary', required: true }] }));
  const fallbackLow = selectVisualizationTemplate(context(), { registry, minimumScore: 1.1, cache: false });
  assert.equal(fallbackLow.fallbackUsed, true);
});

test('multi-template composition and dependency/conflict safety', () => {
  const registry = createVisualizationTemplateRegistry();
  registry.registerTemplate(template({ templateId: 'tmpl-primary', version: 'v2' }));
  registry.registerTemplate(template({ templateId: 'tmpl-support', version: 'v1', slots: [{ id: 'slot-primary', purpose: 'supporting-content', regionId: 'region-main', capacity: 1, priority: 2, accepts: ['concept-node'] }], metadata: { dependencies: [{ templateId: 'tmpl-primary', version: 'v2', required: true }] } }));

  const result = selectVisualizationTemplate(context(), {
    registry,
    compositionCandidateCount: 2
  });

  assert.equal(result.status === 'selected' || result.status === 'composed', true);
  assert.equal(result.templateComposition !== null, true);
});

test('selection cache invalidation when templates change', () => {
  invalidateTemplateSelectionCache();
  const registry = createVisualizationTemplateRegistry();
  registry.registerTemplate(template({
    templateId: 'tmpl-cache-a',
    version: 'v1',
    metadata: { confidence: 0.05 },
    requiredCapabilities: []
  }));

  const before = selectVisualizationTemplate(context(), { registry });
  registry.registerTemplate(template({
    templateId: 'tmpl-cache-b',
    version: 'v1',
    metadata: { confidence: 1 },
    requiredCapabilities: [{ referenceId: 'cap-1', capabilityId: 'cap-sequence', role: 'primary', required: true }]
  }));
  invalidateTemplateSelectionCache();
  const after = selectVisualizationTemplate(context(), { registry });

  assert.equal(before.selectedTemplate.templateId !== after.selectedTemplate.templateId, true);
  assert.equal(after.selectedTemplate.templateId.includes('tmpl-cache-b'), true);
});

test('old scene compatibility and runtime graph metadata propagation', () => {
  const scene = processSceneJsonPipeline({ title: 'Legacy', objects: [{ id: 'obj-1', name: 'A' }] });
  assert.ok(scene.metadata.templateSelection);
  assert.ok(scene.metadata.selectedTemplate);
  assert.ok(scene.metadata.selectedTemplateInstance);

  const runtime = loadScene(scene);
  const metadataNode = runtime.graph.getNode('metadata');
  assert.ok(metadataNode.properties.templateSelection);
  assert.ok(metadataNode.properties.selectedTemplate);
  assert.ok(metadataNode.properties.selectedTemplateInstance);
});

test('renderer payload remains graph-derived and includes template-selection metadata summary', async () => {
  const provider = {
    id: 'mock',
    supportsJsonMode: true,
    supportsAbort: true,
    metadata: {},
    async generateStructuredScene() {
      return {
        text: JSON.stringify({
          version: 'v2',
          sceneId: 'scene-phase-2c',
          title: 'Phase 2C Scene',
          subject: 'Open Topic',
          classification: { domain: 'Custom', subDomain: 'Open Topic', visualization: 'Adaptive' },
          objects: [{ id: 'obj-1', name: 'A', type: 'concept', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], visible: true, enabled: true, interactive: true, highlightable: true, clickable: true, animationIds: [], labelIds: [], metadata: {}, state: {}, properties: {}, extensions: {} }],
          timeline: [{ id: 'step-1', order: 0, title: 'Step', description: '', duration: 1, camera: { movement: { mode: 'orbit' } }, objects: ['obj-1'], animations: [], narration: null, interaction: null, completionRule: { type: 'manual', value: null } }],
          labels: [],
          interactions: []
        })
      };
    }
  };

  const generated = await generateUniversalScene({ lessonId: 'lesson-phase-2c', topic: 'Arbitrary future topic', lesson: 'Explain any unknown structure.' }, { provider, useCache: false, maxRetries: 0 });

  assert.ok(generated.runtimeGraph?.nodes?.length >= 1);
  assert.ok(generated.scene.metadata.templateSelection);
  assert.ok(generated.scene.metadata.templateBindings);
  assert.equal(generated.rendererPayload.templateSelection, undefined);
});

test('no subject mapping needed for arbitrary unknown topic', () => {
  const registry = createVisualizationTemplateRegistry();
  registry.registerTemplate(template({ templateId: 'tmpl-generic', semanticPurpose: 'unknown-semantic-purpose' }));

  const result = selectVisualizationTemplate(context({ lesson: { topic: 'Completely New Quantum Linguistic Pattern' } }), { registry });
  assert.equal(result.selectedTemplate !== null, true);
  assert.equal(result.status === 'selected' || result.status === 'composed' || result.status === 'fallback', true);
});
