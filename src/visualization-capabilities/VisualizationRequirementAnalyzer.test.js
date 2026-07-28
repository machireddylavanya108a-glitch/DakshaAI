import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeVisualizationRequirements } from './VisualizationRequirementAnalyzer.js';

test('semantic requirement analysis returns structured output', () => {
  const result = analyzeVisualizationRequirements({
    concepts: [{ id: 'a' }, { id: 'b' }],
    steps: [{ id: 's1' }, { id: 's2' }],
    relationships: [{ from: 'a', to: 'b' }]
  });

  assert.ok(Array.isArray(result.requirements));
  assert.ok(Array.isArray(result.preferredCapabilities));
  assert.ok(result.diagnostics.analysisDuration >= 0);
});

test('sequence pattern analysis', () => {
  const result = analyzeVisualizationRequirements({
    steps: [{ id: 1 }, { id: 2 }, { id: 3 }]
  });
  assert.equal(result.detectedPatterns.includes('ordered-structure'), true);
});

test('relationship pattern analysis', () => {
  const result = analyzeVisualizationRequirements({
    relationships: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }]
  });
  assert.equal(result.detectedPatterns.includes('directional-relationships'), true);
});

test('hierarchy pattern analysis', () => {
  const result = analyzeVisualizationRequirements({
    concepts: [{ id: 'root', children: [{ id: 'leaf' }] }]
  });
  assert.equal(result.detectedPatterns.includes('nested-components'), true);
});

test('comparison pattern analysis', () => {
  const result = analyzeVisualizationRequirements({
    concepts: [
      { id: 'x', speed: 2, mass: 1 },
      { id: 'y', speed: 5, mass: 1 }
    ],
    relationships: [{ from: 'x', to: 'y' }, { from: 'y', to: 'x' }]
  });
  assert.equal(result.detectedPatterns.includes('contrastable-attributes'), true);
});

test('empty lesson requirements use conservative fallback strategy', () => {
  const result = analyzeVisualizationRequirements({});
  assert.equal(result.requirements.length >= 1, true);
  assert.equal(result.preferredCapabilities.length >= 1, true);
});

test('unknown topic requirements do not require code changes', () => {
  const result = analyzeVisualizationRequirements({
    topic: 'Post-quantum civic synthesis lattice',
    concepts: ['node-a']
  });
  assert.equal(result.requirements.length >= 1, true);
});

test('analyzer has no subject keyword mapping branch', () => {
  const source = analyzeVisualizationRequirements.toString();
  assert.equal(source.includes('topicKeywords'), false);
  assert.equal(source.includes('subjectKeywords'), false);
});
