import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnowledgeGraph } from '../utils/knowledgeGraphEngine.js';

test('buildKnowledgeGraph creates a connected concept graph', () => {
  const graph = buildKnowledgeGraph({
    topic: 'React',
    prereqs: ['JavaScript', 'HTML'],
    relatedTopics: ['Hooks', 'State'],
    advancedTopics: ['Performance', 'SSR'],
    similarTopics: ['Vue'],
    revisions: ['Props']
  });

  assert.equal(graph.topic, 'React');
  assert.ok(Array.isArray(graph.nodes));
  assert.ok(Array.isArray(graph.edges));
  assert.ok(graph.prerequisites.includes('JavaScript'));
  assert.ok(graph.nextConcepts.includes('Hooks'));
  assert.ok(graph.advancedTopics.includes('Performance'));
  assert.ok(graph.revisionGraph.includes('Props'));
  assert.ok(graph.dependencyGraph.length >= 1);
});
