function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toSet(values = []) {
  return new Set(toArray(values).map((value) => String(value || '').trim()).filter(Boolean));
}

export function resolveEducationalObjectDependencies(runtimeState = {}, options = {}) {
  const maxDepth = Math.max(1, Number(options.maximumDependencyDepth || options.maximumRelationshipDepth || 20));
  const objectIds = toSet(runtimeState.objectIds || []);
  const availableStatesByObject = runtimeState.availableStatesByObject && typeof runtimeState.availableStatesByObject === 'object'
    ? runtimeState.availableStatesByObject
    : {};
  const availableBehaviorIds = toSet(runtimeState.behaviorIds || []);
  const availableTimelineStepIds = toSet(runtimeState.timelineStepIds || []);
  const availableInteractionIds = toSet(runtimeState.interactionIds || []);

  const unresolvedDependencies = [];
  const resolvedDependencies = [];
  const blockedBehaviors = [];
  const warnings = [];

  const behaviors = toArray(runtimeState.behaviors);
  behaviors.forEach((behavior) => {
    const behaviorId = String(behavior?.behaviorId || '').trim();
    const requiredRelations = toArray(behavior?.relationshipRequirements);
    const requiredTransitions = toArray(behavior?.stateTransitions);
    const timelineHints = behavior?.timelineHints && typeof behavior.timelineHints === 'object' ? behavior.timelineHints : {};

    let blocked = false;

    requiredRelations.forEach((relation) => {
      const sourceObjectId = String(relation?.sourceObjectId || '').trim();
      const targetObjectId = String(relation?.targetObjectId || '').trim();
      const required = relation?.required === true;

      if (sourceObjectId && !objectIds.has(sourceObjectId)) {
        const issue = { behaviorId, type: 'missing-object-dependency', reference: sourceObjectId, required };
        required ? unresolvedDependencies.push(issue) : warnings.push(`Behavior ${behaviorId} optional source dependency unresolved: ${sourceObjectId}`);
        if (required) blocked = true;
      } else if (sourceObjectId) {
        resolvedDependencies.push({ behaviorId, type: 'object', reference: sourceObjectId });
      }

      if (targetObjectId && !objectIds.has(targetObjectId)) {
        const issue = { behaviorId, type: 'missing-object-dependency', reference: targetObjectId, required };
        required ? unresolvedDependencies.push(issue) : warnings.push(`Behavior ${behaviorId} optional target dependency unresolved: ${targetObjectId}`);
        if (required) blocked = true;
      } else if (targetObjectId) {
        resolvedDependencies.push({ behaviorId, type: 'object', reference: targetObjectId });
      }

      toArray(relation.behaviorDependencies).forEach((dependencyBehaviorId) => {
        const id = String(dependencyBehaviorId || '').trim();
        if (!id) return;
        if (!availableBehaviorIds.has(id)) {
          unresolvedDependencies.push({ behaviorId, type: 'unavailable-behavior', reference: id, required: true });
          blocked = true;
          return;
        }
        resolvedDependencies.push({ behaviorId, type: 'behavior', reference: id });
      });

      toArray(relation.timelineDependencies).forEach((stepId) => {
        const id = String(stepId || '').trim();
        if (!id) return;
        if (!availableTimelineStepIds.has(id)) {
          warnings.push(`Behavior ${behaviorId} timeline dependency unresolved: ${id}`);
          return;
        }
        resolvedDependencies.push({ behaviorId, type: 'timeline', reference: id });
      });

      toArray(relation.interactionDependencies).forEach((interactionId) => {
        const id = String(interactionId || '').trim();
        if (!id) return;
        if (!availableInteractionIds.has(id)) {
          warnings.push(`Behavior ${behaviorId} interaction dependency unresolved: ${id}`);
          return;
        }
        resolvedDependencies.push({ behaviorId, type: 'interaction', reference: id });
      });
    });

    requiredTransitions.forEach((transition) => {
      const from = String(transition?.from || '').trim();
      const to = String(transition?.to || '').trim();
      if (!from || !to) return;

      const behaviorObjectIds = new Set();
      requiredRelations.forEach((relation) => {
        const stateDependencies = toArray(relation?.stateDependencies).map((item) => String(item || '').trim()).filter(Boolean);
        if (stateDependencies.length) {
          stateDependencies.forEach((objectId) => behaviorObjectIds.add(objectId));
          return;
        }
        if (relation?.sourceObjectId) behaviorObjectIds.add(String(relation.sourceObjectId));
      });

      if (!behaviorObjectIds.size && requiredRelations.length === 0) {
        objectIds.forEach((objectId) => behaviorObjectIds.add(objectId));
      }

      for (const objectId of behaviorObjectIds) {
        const availableStates = new Set(toArray(availableStatesByObject[objectId]).map((state) => String(state || '').trim()).filter(Boolean));
        if (availableStates.size && !availableStates.has(from)) {
          unresolvedDependencies.push({ behaviorId, type: 'unavailable-state', reference: `${objectId}:${from}`, required: true });
          blocked = true;
        }
        if (availableStates.size && !availableStates.has(to)) {
          unresolvedDependencies.push({ behaviorId, type: 'unavailable-state', reference: `${objectId}:${to}`, required: true });
          blocked = true;
        }
      }
    });

    toArray(timelineHints.dependsOnBehaviorIds).forEach((depBehaviorId) => {
      const id = String(depBehaviorId || '').trim();
      if (!id) return;
      if (!availableBehaviorIds.has(id)) {
        unresolvedDependencies.push({ behaviorId, type: 'missing-behavior-dependency', reference: id, required: true });
        blocked = true;
      }
    });

    if (blocked) {
      blockedBehaviors.push({ behaviorId, reason: 'required-dependencies-unresolved' });
    }
  });

  if (maxDepth <= 0) {
    warnings.push('Maximum dependency depth was invalid and has been clamped.');
  }

  return {
    resolvedDependencies,
    unresolvedDependencies,
    repairSuggestions: unresolvedDependencies.map((dependency) => ({
      behaviorId: dependency.behaviorId,
      reference: dependency.reference,
      suggestion: `Provide dependency for ${dependency.type}: ${dependency.reference}`
    })),
    blockedBehaviors,
    warnings,
    diagnostics: {
      maxDepth,
      resolvedCount: resolvedDependencies.length,
      unresolvedCount: unresolvedDependencies.length,
      blockedCount: blockedBehaviors.length
    }
  };
}
