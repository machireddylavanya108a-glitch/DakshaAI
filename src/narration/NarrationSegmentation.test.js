import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalNarrationPackage, buildNarrationSegments } from './index.js';

test('buildUniversalNarrationPackage segments arbitrary lesson text with required metadata', () => {
  const narration = buildUniversalNarrationPackage({
    lesson: 'Start with inputs. Then transform the data. Why does validation matter? It protects runtime stability.',
    topic: 'Any domain',
    scene: {
      objects: [
        { id: 'obj-input', name: 'Input Node' },
        { id: 'obj-validator', name: 'Validator' }
      ]
    }
  });

  assert.equal(narration.segments.length >= 1, true);
  const first = narration.segments[0];
  assert.ok(first.id);
  assert.equal(typeof first.durationMs, 'number');
  assert.equal(typeof first.timestampMs, 'number');
  assert.equal(typeof first.learningObjective, 'string');
  assert.equal(typeof first.difficulty, 'string');
  assert.equal(Array.isArray(first.relatedSceneObjectIds), true);
});

test('narration cues include pause emphasis quiz recap and interaction points automatically', () => {
  const narration = buildUniversalNarrationPackage({
    lesson: 'Inspect Input Node carefully. Why is this important? Validate every step. Finally recap the process.',
    scene: {
      objects: [{ id: 'obj-input', name: 'Input Node' }]
    }
  });

  const cueTypes = new Set(narration.cues.all.map((cue) => cue.type));
  assert.equal(cueTypes.has('pause-point'), true);
  assert.equal(cueTypes.has('emphasis-point'), true);
  assert.equal(cueTypes.has('quiz-point'), true);
  assert.equal(cueTypes.has('recap-point'), true);
  assert.equal(cueTypes.has('interaction-point'), true);
});

test('unknown lesson structures still produce valid narration package', () => {
  const narration = buildUniversalNarrationPackage({
    scene: {
      timeline: [{ title: 'Unstructured Step', description: 'Something custom.' }],
      narration: {
        segments: [{ content: 'Custom payload format without fixed schema.' }]
      }
    }
  });

  assert.equal(narration.summary.unknownStructureHandled, true);
  assert.equal(narration.segments.length >= 1, true);
  assert.equal(narration.cues.all.length >= 1, true);
});

test('buildNarrationSegments remains backward compatible for UI consumers', () => {
  const segments = buildNarrationSegments({
    timeline: [{ id: 'step-1', target: 'concept', durationMs: 1200 }],
    objects: [{ id: 'obj-1', name: 'Concept' }]
  }, 'Explain Concept clearly.');

  assert.equal(segments.length >= 1, true);
  assert.ok(segments[0].id);
  assert.equal(typeof segments[0].line, 'string');
  assert.equal(typeof segments[0].durationMs, 'number');
  assert.equal(Array.isArray(segments[0].labels), true);
  assert.equal(typeof segments[0].metadata, 'object');
});
