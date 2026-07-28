import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEducationalObjectRelationshipGraph,
  resolveEducationalObjectRelationships,
  resolveEducationalObjectDependencies,
  resolveEducationalObjectBehaviorConflicts
} from './index.js';

function objectInstances() {
  return [
    { objectId: 'obj-1' },
    { objectId: 'obj-2' },
    { objectId: 'obj-3' }
  ];
}

test('relationship graph supports add/remove incoming outgoing and unknown relation preservation', () => {
  const graph = createEducationalObjectRelationshipGraph({ maximumRelationshipDepth: 10 });
  objectInstances().forEach((instance) => graph.addObject(instance));

  const edge = graph.addRelationship({
    relationshipId: 'rel-unknown-1',
    sourceObjectId: 'obj-1',
    targetObjectId: 'obj-2',
    relation: 'future-relation-x',
    required: true,
    metadata: { weightClass: 'dynamic' }
  });

  assert.equal(edge.relation, 'future-relation-x');
  assert.equal(graph.getOutgoing('obj-1').length, 1);
  assert.equal(graph.getIncoming('obj-2').length, 1);

  graph.removeRelationship('rel-unknown-1');
  assert.equal(graph.getOutgoing('obj-1').length, 0);
});

test('relationship graph path discovery cycle detection and depth-bound dependencies', () => {
  const graph = createEducationalObjectRelationshipGraph({ maximumRelationshipDepth: 2 });
  objectInstances().forEach((instance) => graph.addObject(instance));

  graph.addRelationship({ relationshipId: 'r1', sourceObjectId: 'obj-1', targetObjectId: 'obj-2', relation: 'depends-on' });
  graph.addRelationship({ relationshipId: 'r2', sourceObjectId: 'obj-2', targetObjectId: 'obj-3', relation: 'supports' });
  graph.addRelationship({ relationshipId: 'r3', sourceObjectId: 'obj-3', targetObjectId: 'obj-1', relation: 'feedback' });

  const path = graph.findPath('obj-1', 'obj-3');
  assert.deepEqual(path, ['obj-1', 'obj-2', 'obj-3']);

  const cycles = graph.detectCycles();
  assert.equal(cycles.length >= 1, true);

  const dependencies = graph.findDependencies('obj-1', 1);
  assert.deepEqual(dependencies, ['obj-2']);
});

test('relationship resolver and graph validation handle missing references', () => {
  const resolved = resolveEducationalObjectRelationships(objectInstances(), [
    { relationshipId: 'rel-1', sourceObjectId: 'obj-1', targetObjectId: 'missing', relation: 'depends-on', required: true },
    { relationshipId: 'rel-2', sourceObjectId: 'obj-2', targetObjectId: 'obj-3', relation: 'supports', required: false }
  ]);

  assert.equal(resolved.validation.valid, false);
  assert.equal(resolved.validation.errors.some((entry) => String(entry).includes('missing')), true);
});

test('dependency resolver detects missing unavailable and blocked dependencies with bounded depth', () => {
  const report = resolveEducationalObjectDependencies({
    objectIds: ['obj-1', 'obj-2'],
    availableStatesByObject: {
      'obj-1': ['ready', 'active'],
      'obj-2': ['ready']
    },
    behaviorIds: ['behavior-1'],
    timelineStepIds: ['step-1'],
    interactionIds: ['interaction-1'],
    behaviors: [
      {
        behaviorId: 'behavior-1',
        relationshipRequirements: [
          {
            relationshipId: 'rel-1',
            sourceObjectId: 'obj-1',
            targetObjectId: 'missing-obj',
            required: true,
            behaviorDependencies: ['behavior-missing'],
            timelineDependencies: ['step-unknown'],
            interactionDependencies: ['interaction-unknown']
          }
        ],
        stateTransitions: [{ transitionId: 't1', from: 'ready', to: 'missing-state' }],
        timelineHints: { dependsOnBehaviorIds: ['behavior-missing-2'] }
      }
    ]
  }, {
    maximumDependencyDepth: 5
  });

  assert.equal(report.unresolvedDependencies.length >= 2, true);
  assert.equal(report.blockedBehaviors.length >= 1, true);
  assert.equal(report.diagnostics.maxDepth, 5);
});

test('conflict resolver detects conflicts and resolves by priority while preserving required diagnostics', () => {
  const report = resolveEducationalObjectBehaviorConflicts([
    {
      behaviorId: 'behavior-a',
      priority: 10,
      required: true,
      effects: [{ effectId: 'e1', targetObjectIds: ['obj-1'], requestedState: 'active', property: 'color', value: 'green' }]
    },
    {
      behaviorId: 'behavior-b',
      priority: 5,
      required: true,
      effects: [{ effectId: 'e2', targetObjectIds: ['obj-1'], requestedState: 'paused', property: 'color', value: 'red' }]
    }
  ], { strategy: 'priority' });

  assert.equal(report.conflicts.length >= 1, true);
  assert.equal(report.requiredConflicts.length >= 1, true);
  assert.equal(report.resolved.some((item) => item.behaviorId === 'behavior-a'), true);
});
