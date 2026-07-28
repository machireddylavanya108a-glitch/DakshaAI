function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createResult(errors = [], warnings = [], brokenReferenceCount = 0) {
  return {
    status: errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid',
    errors,
    warnings,
    repairable: true,
    brokenReferenceCount
  };
}

function detectCircularParentChain(rootId, parentLookup) {
  const seen = new Set();
  let current = rootId;
  while (current) {
    if (seen.has(current)) return true;
    seen.add(current);
    current = parentLookup.get(current) || null;
  }
  return false;
}

export function runEducationalObjectIntegrityChecks(object = {}, options = {}) {
  const errors = [];
  const warnings = [];
  let brokenReferenceCount = 0;

  const knownObjectIds = new Set((options.knownObjectIds || []).map((item) => String(item)));
  const objectId = String(object?.objectId || object?.id || '');
  if (objectId) knownObjectIds.add(objectId);

  const conceptReferences = toArray(object.conceptReferences);
  conceptReferences.forEach((reference, index) => {
    if (!isObject(reference)) {
      errors.push(`conceptReference ${index} must be an object.`);
      return;
    }
    if (!reference.referenceId) errors.push(`conceptReference ${index} missing referenceId.`);
    if (!reference.conceptId) {
      warnings.push(`conceptReference ${reference.referenceId || index} missing conceptId.`);
      brokenReferenceCount += 1;
    }
  });

  const relationshipReferences = toArray(object.relationshipReferences);
  relationshipReferences.forEach((relationship, index) => {
    if (!isObject(relationship)) {
      errors.push(`relationshipReference ${index} must be an object.`);
      return;
    }

    const sourceId = String(relationship.sourceObjectId || '');
    const targetId = String(relationship.targetObjectId || '');
    if (sourceId && targetId && sourceId === targetId) {
      errors.push(`relationshipReference ${relationship.relationId || index} cannot self-reference.`);
    }

    if (relationship.required === true) {
      if (sourceId && !knownObjectIds.has(sourceId)) {
        warnings.push(`required relationship source unresolved: ${sourceId}`);
        brokenReferenceCount += 1;
      }
      if (targetId && !knownObjectIds.has(targetId)) {
        warnings.push(`required relationship target unresolved: ${targetId}`);
        brokenReferenceCount += 1;
      }
    }
  });

  const templateBindings = toArray(object.templateBindings);
  templateBindings.forEach((binding, index) => {
    if (!isObject(binding)) {
      errors.push(`templateBinding ${index} must be an object.`);
      return;
    }
    if (!binding.slotId && !binding.regionId) {
      warnings.push(`templateBinding ${index} has no slotId or regionId.`);
      brokenReferenceCount += 1;
    }
  });

  const labels = toArray(object.labels);
  const labelIds = new Set();
  labels.forEach((label, index) => {
    const id = String(label?.id || '');
    if (!id) return;
    if (labelIds.has(id)) errors.push(`duplicate label id: ${id}`);
    labelIds.add(id);
    const targetObjectId = String(label?.targetObjectId || '');
    if (targetObjectId && targetObjectId !== objectId && !knownObjectIds.has(targetObjectId)) {
      warnings.push(`label ${id} targetObjectId unresolved: ${targetObjectId}`);
      brokenReferenceCount += 1;
    }
  });

  const variableIds = new Set();
  toArray(object.variables).forEach((variable) => {
    const id = String(variable?.id || '');
    if (!id) return;
    if (variableIds.has(id)) errors.push(`duplicate variable id: ${id}`);
    variableIds.add(id);
  });

  const conditionIds = new Set();
  toArray(object.conditions).forEach((condition) => {
    const id = String(condition?.id || '');
    if (!id) return;
    if (conditionIds.has(id)) errors.push(`duplicate condition id: ${id}`);
    conditionIds.add(id);
  });

  const childObjectIds = toArray(object.spatialProperties?.childObjectIds).map((item) => String(item));
  const parentObjectId = String(object.spatialProperties?.parentObjectId || '');
  if (objectId && childObjectIds.includes(objectId)) {
    errors.push('spatialProperties.childObjectIds cannot contain objectId itself.');
  }

  const parentLookup = new Map();
  if (objectId && parentObjectId) {
    parentLookup.set(objectId, parentObjectId);
  }

  if (objectId && detectCircularParentChain(objectId, parentLookup)) {
    errors.push('circular parent-child relationship detected.');
  }

  const ownershipMode = String(object.ownership?.mode || object.ownership || '');
  if (ownershipMode && object.lifecycle?.ownershipPolicy && String(object.lifecycle.ownershipPolicy) !== ownershipMode) {
    warnings.push('ownership mode differs from lifecycle.ownershipPolicy.');
  }

  return createResult(errors, warnings, brokenReferenceCount);
}
