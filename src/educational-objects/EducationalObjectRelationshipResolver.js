import { createEducationalObjectRelationshipGraph } from './EducationalObjectRelationshipGraph.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function resolveEducationalObjectRelationships(objectInstances = [], relationshipRequirements = [], options = {}) {
  const graph = createEducationalObjectRelationshipGraph(options);

  toArray(objectInstances).forEach((instance) => graph.addObject(instance));

  const normalizedRelationships = [];
  toArray(relationshipRequirements).forEach((relationship, index) => {
    if (!relationship || typeof relationship !== 'object') return;
    const normalized = {
      relationshipId: relationship.relationshipId || relationship.relationId || relationship.id || `relationship-${index + 1}`,
      sourceObjectId: relationship.sourceObjectId,
      targetObjectId: relationship.targetObjectId,
      relation: relationship.relation || relationship.type || 'references',
      direction: relationship.direction || 'directed',
      weight: relationship.weight,
      required: relationship.required === true,
      active: relationship.active !== false,
      stateDependencies: relationship.stateDependencies || [],
      behaviorDependencies: relationship.behaviorDependencies || [],
      timelineDependencies: relationship.timelineDependencies || [],
      interactionDependencies: relationship.interactionDependencies || [],
      metadata: relationship.metadata || {}
    };
    normalizedRelationships.push(normalized);
    graph.addRelationship(normalized);
  });

  const validation = graph.validateGraph();

  return {
    graph,
    relationships: normalizedRelationships,
    validation,
    cycles: validation.cycles || []
  };
}
