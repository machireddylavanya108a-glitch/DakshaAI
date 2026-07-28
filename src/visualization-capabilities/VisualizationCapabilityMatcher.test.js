import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createVisualizationCapabilityRegistry,
  matchVisualizationCapabilities,
  composeVisualizationCapabilities,
  scoreVisualizationCapabilityMatch,
  analyzeVisualizationRequirements,
  resolveVisualizationCapabilities
} from './index.js';
import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { loadScene } from '../scene-builder/SceneRuntime.js';

function capability(overrides = {}) {
  return {
    id: `cap-${Math.random().toString(16).slice(2, 8)}`,
    name: 'Generic Capability',
    semanticPurpose: 'sequence',
    supportedLearningActions: ['observe', 'inspect', 'sequence'],
    inputRequirements: [
      { id: 'rule-steps', field: 'stepCount', operator: 'gte', expectedValue: 2, required: true, weight: 2 }
    ],
    accessibilityProperties: {
      textAlternativeRequired: true,
      keyboardCompatible: true,
      reducedMotionCompatible: true,
      highContrastCompatible: true
    },
    performanceProperties: {
      minimumProfile: 'low'
    },
    confidence: 0.7,
    ...overrides
  };
}

function requirements(overrides = {}) {
  return {
    preferredCapabilities: ['sequence'],
    requirements: [{ id: 'req-a', field: 'stepCount', operator: 'gte', expectedValue: 2, required: true, weight: 2 }],
    accessibilityNeeds: {
      textAlternativeRequired: true,
      keyboardCompatible: true,
      reducedMotionCompatible: true,
      highContrastCompatible: true
    },
    performanceNeeds: {
      profile: 'low'
    },
    contextSummary: {
      stepCount: 3,
      relationshipCount: 1,
      conceptCount: 4
    },
    confidence: 0.7,
    ...overrides
  };
}

test('deterministic capability scoring', () => {
  const cap = capability({ id: 'cap-det' });
  const req = requirements();
  const one = scoreVisualizationCapabilityMatch(cap, req);
  const two = scoreVisualizationCapabilityMatch(cap, req);
  assert.equal(one.score, two.score);
  assert.equal(one.explanation, two.explanation);
});

test('missing metadata scoring remains finite', () => {
  const scored = scoreVisualizationCapabilityMatch({ id: 'cap-min' }, requirements());
  assert.equal(Number.isFinite(scored.score), true);
  assert.equal(Number.isFinite(scored.confidence), true);
});

test('unmet required constraint penalty', () => {
  const cap = capability({ id: 'cap-penalty', inputRequirements: [{ id: 'x', field: 'stepCount', operator: 'gte', expectedValue: 8, required: true, weight: 2 }] });
  const scored = scoreVisualizationCapabilityMatch(cap, requirements());
  assert.equal(scored.score < 80, true);
  assert.equal(scored.unmetRequirements > 0, true);
});

test('accessibility scoring difference', () => {
  const good = scoreVisualizationCapabilityMatch(capability({ id: 'cap-good' }), requirements());
  const weak = scoreVisualizationCapabilityMatch(capability({
    id: 'cap-weak',
    accessibilityProperties: {
      textAlternativeRequired: false,
      keyboardCompatible: false,
      reducedMotionCompatible: false,
      highContrastCompatible: false
    }
  }), requirements());

  assert.equal(good.score > weak.score, true);
});

test('low-performance compatibility', () => {
  const lowReq = requirements({ performanceNeeds: { profile: 'low' } });
  const highOnly = capability({ id: 'cap-high-only', performanceProperties: { minimumProfile: 'high' } });
  const lowCap = capability({ id: 'cap-low-ok', performanceProperties: { minimumProfile: 'low' } });

  const highScore = scoreVisualizationCapabilityMatch(highOnly, lowReq);
  const lowScore = scoreVisualizationCapabilityMatch(lowCap, lowReq);
  assert.equal(lowScore.score > highScore.score, true);
});

test('multi-capability composition', () => {
  const matches = [
    { capability: capability({ id: 'cap-primary', semanticPurpose: 'sequence' }), score: 90, confidence: 0.8 },
    { capability: capability({ id: 'cap-support', semanticPurpose: 'relationship' }), score: 85, confidence: 0.7 }
  ];

  const composed = composeVisualizationCapabilities(matches, requirements());
  assert.equal(composed.primaryCapability.id, 'cap-primary');
  assert.equal(composed.supportingCapabilities.length >= 1, true);
});

test('capability conflict handling', () => {
  const matches = [
    { capability: capability({ id: 'cap-a', semanticPurpose: 'sequence' }), score: 90, confidence: 0.8 },
    {
      capability: capability({
        id: 'cap-b',
        semanticPurpose: 'flow',
        compositionRules: [{ id: 'rule-conflict', relation: 'conflicts', targetCapability: 'cap-a' }]
      }),
      score: 88,
      confidence: 0.8
    }
  ];

  const composed = composeVisualizationCapabilities(matches, requirements());
  assert.equal(composed.selectedCapabilities.some((item) => item.id === 'cap-b'), false);
  assert.equal(composed.conflicts.length >= 1, true);
});

test('capability dependency handling', () => {
  const matches = [
    { capability: capability({ id: 'cap-a', semanticPurpose: 'sequence' }), score: 95, confidence: 0.8 },
    {
      capability: capability({
        id: 'cap-c',
        semanticPurpose: 'simulation',
        compositionRules: [{ id: 'rule-req', relation: 'requires', targetCapability: 'cap-z' }]
      }),
      score: 90,
      confidence: 0.8
    }
  ];

  const composed = composeVisualizationCapabilities(matches, requirements());
  assert.equal(composed.selectedCapabilities.some((item) => item.id === 'cap-c'), false);
  assert.equal(composed.dependencies.length >= 1, true);
});

test('redundant capability removal by semantic purpose', () => {
  const matches = [
    { capability: capability({ id: 'cap-1', semanticPurpose: 'sequence' }), score: 90, confidence: 0.8 },
    { capability: capability({ id: 'cap-2', semanticPurpose: 'sequence' }), score: 89, confidence: 0.8 }
  ];

  const composed = composeVisualizationCapabilities(matches, requirements());
  const sequenceCount = composed.selectedCapabilities.filter((item) => item.semanticPurpose === 'sequence').length;
  assert.equal(sequenceCount, 1);
});

test('empty registry fallback', () => {
  const registry = createVisualizationCapabilityRegistry({ includeSeedCapabilities: false });
  const matches = matchVisualizationCapabilities(requirements(), registry);
  assert.equal(matches.length >= 1, true);
  assert.equal(matches[0].capability.source, 'adaptive-fallback');
});

test('adaptive capability fallback via resolver', () => {
  const registry = createVisualizationCapabilityRegistry();
  registry.clearRuntimeCapabilities();

  const resolved = resolveVisualizationCapabilities({ concepts: [{ id: 'a' }] }, { registry });
  assert.equal(resolved.selectedCapabilities.length >= 1, true);
  assert.equal(resolved.selectedCapabilities[0].source, 'adaptive-fallback');
});

test('old scene compatibility injects capability metadata', () => {
  const scene = processSceneJsonPipeline({
    version: 'v1',
    title: 'Legacy Scene',
    objects: [{ id: 'obj-1', name: 'A' }]
  });

  assert.ok(scene.metadata.visualizationCapabilities);
  assert.equal(scene.metadata.visualizationCapabilities.migrationWarning.length > 0, true);
});

test('scene schema integration retains capability metadata through runtime graph', () => {
  const scene = processSceneJsonPipeline({
    title: 'Capability Scene',
    objects: [{ id: 'obj-1', name: 'A' }],
    timeline: [{ id: 'step-1', order: 0, title: 'Step', description: '', duration: 1, camera: null, objects: ['obj-1'], animations: [], narration: null, interaction: null, completionRule: { type: 'manual', value: null } }]
  });

  const runtime = loadScene(scene);
  const metadataNode = runtime.graph.getNode('metadata');

  assert.ok(metadataNode);
  assert.ok(metadataNode.properties.visualizationCapabilities);
});

test('completely new arbitrary topic requires no code change', () => {
  const analyzed = analyzeVisualizationRequirements({
    topic: 'Bio-digital harmonic governance lattice',
    concepts: [{ id: 'x' }, { id: 'y' }],
    steps: [{ id: 's1' }, { id: 's2' }]
  });

  assert.equal(analyzed.requirements.length >= 1, true);
  assert.equal(analyzed.preferredCapabilities.length >= 1, true);
});
