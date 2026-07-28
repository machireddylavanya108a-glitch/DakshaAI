import test from 'node:test';
import assert from 'node:assert/strict';
import {
  instantiateVisualizationTemplate,
  createAdaptiveFallbackTemplate,
  processVisualizationTemplate
} from './index.js';
import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { loadScene } from '../scene-builder/SceneRuntime.js';
import { generateUniversalScene } from '../scene-generator/SceneGenerationPipeline.js';

function template(overrides = {}) {
  return {
    templateId: 'tmpl-instance',
    version: 'v1',
    name: 'Instance Template',
    semanticPurpose: 'exploration',
    requiredCapabilities: [{ referenceId: 'cap-ref-1', capabilityId: 'cap-main', role: 'primary', required: true }],
    optionalCapabilities: [{ referenceId: 'cap-ref-2', capabilityId: 'cap-optional', role: 'supporting', required: false }],
    slots: [
      { id: 'slot-1', name: 'Primary', purpose: 'primary-content', regionId: 'region-1', capacity: 1, priority: 1 },
      { id: 'slot-2', name: 'Secondary', purpose: 'supporting-content', regionId: 'region-1', capacity: 12, priority: 2 }
    ],
    regions: [{ id: 'region-1', name: 'Main Region', purpose: 'main-structure' }],
    relationships: [{ id: 'rel-1', sourceId: 'slot-1', targetId: 'slot-2', relation: 'supports' }],
    layout: { strategy: 'adaptive' },
    variables: [{ id: 'var-1', name: 'focusLevel', valueType: 'number', defaultValue: 2, required: false }],
    accessibility: { textDescription: 'Template accessibility baseline' },
    performance: { minimumProfile: 'low', maximumProfile: 'high', objectBudget: 1, animationBudget: 8, interactionBudget: 8, assetBudget: 8 },
    ...overrides
  };
}

test('template instantiation resolves variables, capability bindings, and scene bindings', () => {
  const input = template();
  const context = {
    sceneId: 'scene-1',
    lessonId: 'lesson-1',
    selectedCapabilities: [{ id: 'cap-main' }],
    focusLevel: 5,
    classification: { domain: 'Custom' },
    metadata: { extra: true }
  };

  const result = instantiateVisualizationTemplate(input, context);
  assert.equal(result.instance.resolvedVariables['var-1'], 5);
  assert.equal(result.instance.capabilityBindings[0].resolved, true);
  assert.equal(result.instance.sceneBindings.sceneId, 'scene-1');
});

test('template instance does not mutate original template definition', () => {
  const input = template();
  const before = JSON.stringify(input);
  instantiateVisualizationTemplate(input, { sceneId: 'scene-2' });
  assert.equal(JSON.stringify(input), before);
});

test('performance budget enforcement trims resolved slots', () => {
  const result = instantiateVisualizationTemplate(template(), { sceneId: 'scene-3', performanceProfile: 'low' });
  assert.equal(result.instance.resolvedSlots.length <= 1, true);
});

test('accessibility defaults are available through fallback template', () => {
  const fallback = createAdaptiveFallbackTemplate();
  assert.equal(fallback.accessibility.keyboardNavigation, true);
  assert.equal(fallback.accessibility.reducedMotionCompatibility, true);
});

test('old scene compatibility includes visualization template metadata and runtime graph handoff', () => {
  const scene = processSceneJsonPipeline({
    title: 'Legacy scene without template',
    objects: [{ id: 'obj-1', name: 'A' }]
  });

  assert.ok(scene.metadata.visualizationTemplate);
  assert.ok(scene.metadata.visualizationTemplateInstance);

  const runtime = loadScene(scene);
  const metadataNode = runtime.graph.getNode('metadata');
  assert.ok(metadataNode.properties.visualizationTemplate);
  assert.ok(metadataNode.properties.visualizationTemplateInstance);
});

test('renderer payload path remains graph-derived while template metadata stays declarative', async () => {
  const provider = {
    id: 'mock',
    supportsJsonMode: true,
    supportsAbort: true,
    metadata: {},
    async generateStructuredScene() {
      return {
        text: JSON.stringify({
          version: 'v2',
          sceneId: 'scene-template-renderer-test',
          title: 'Template Scene',
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

  const result = await generateUniversalScene({ lessonId: 'lesson-template-renderer', topic: 'Arbitrary Future Topic', lesson: 'Explain a new structure.' }, { provider, useCache: false, maxRetries: 0 });

  assert.ok(result.runtimeGraph?.nodes?.length >= 1);
  assert.ok(result.scene.metadata.visualizationTemplateInstance);
  assert.equal(result.rendererPayload.visualizationTemplateInstance, undefined);
});

test('adaptive fallback template works in processing pipeline', () => {
  const processed = processVisualizationTemplate(null);
  assert.equal(processed.valid, true);
  assert.ok(processed.template.templateId);
});
