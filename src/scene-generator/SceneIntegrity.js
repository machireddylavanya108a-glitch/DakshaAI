function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function createResult(errors = [], warnings = []) {
  return {
    status: errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid',
    errors,
    warnings,
    repairable: true
  };
}

function detectTimelineLoops(timeline = []) {
  const warnings = [];
  const seenOrders = new Set();

  for (const step of timeline) {
    const order = Number(step?.order);
    if (!Number.isFinite(order)) continue;

    if (seenOrders.has(order)) {
      warnings.push(`Duplicate timeline order detected: ${order}.`);
    }
    seenOrders.add(order);
  }

  return warnings;
}

export function runSceneIntegrityChecks(scene) {
  const errors = [];
  const warnings = [];
  const working = isObject(scene) ? scene : {};

  const objects = Array.isArray(working.objects) ? working.objects : [];
  const labels = Array.isArray(working.labels) ? working.labels : [];
  const animations = Array.isArray(working.animations) ? working.animations : [];
  const timeline = Array.isArray(working.timeline) ? working.timeline : [];
  const checkpoints = Array.isArray(working.checkpoints) ? working.checkpoints : [];
  const interactions = Array.isArray(working.interactions) ? working.interactions : [];

  const objectIds = new Set();
  const labelIds = new Set();
  const animationIds = new Set();
  const timelineIds = new Set();
  const interactionIds = new Set();

  objects.forEach((item, index) => {
    const id = item?.id;
    if (!isNonEmptyString(id)) {
      errors.push(`Object at index ${index} is missing id.`);
      return;
    }
    if (objectIds.has(id)) errors.push(`Duplicate object id detected: ${id}.`);
    objectIds.add(id);
  });

  labels.forEach((item, index) => {
    const id = item?.id;
    if (!isNonEmptyString(id)) return;
    if (labelIds.has(id)) errors.push(`Duplicate label id detected: ${id}.`);
    labelIds.add(id);

    if (item?.targetObjectId && !objectIds.has(item.targetObjectId)) {
      warnings.push(`Orphan label ${id}; target object ${item.targetObjectId} is missing.`);
    }

    if (!item?.targetObjectId) {
      warnings.push(`Label at index ${index} has no targetObjectId.`);
    }
  });

  animations.forEach((item, index) => {
    const id = item?.id;
    if (!isNonEmptyString(id)) return;
    if (animationIds.has(id)) errors.push(`Duplicate animation id detected: ${id}.`);
    animationIds.add(id);

    if (item?.targetObjectId && !objectIds.has(item.targetObjectId)) {
      errors.push(`Animation ${id} targets missing object ${item.targetObjectId}.`);
    }

    if (item?.objectId && !objectIds.has(item.objectId)) {
      errors.push(`Animation ${id} references invalid objectId ${item.objectId}.`);
    }

    if (!item?.targetObjectId && !item?.objectId) {
      warnings.push(`Animation at index ${index} has no target object reference.`);
    }
  });

  timeline.forEach((step, index) => {
    const id = step?.id;
    if (!isNonEmptyString(id)) {
      errors.push(`Timeline step at index ${index} is missing id.`);
    } else {
      if (timelineIds.has(id)) errors.push(`Duplicate timeline step id detected: ${id}.`);
      timelineIds.add(id);
    }

    const stepObjects = Array.isArray(step?.objects) ? step.objects : [];
    stepObjects.forEach((objectRef) => {
      const objectId = isObject(objectRef) ? objectRef.id : objectRef;
      if (isNonEmptyString(objectId) && !objectIds.has(objectId)) {
        errors.push(`Timeline step ${id || index} references missing object ${objectId}.`);
      }
    });

    const stepAnimations = Array.isArray(step?.animations) ? step.animations : [];
    stepAnimations.forEach((animationRef) => {
      const animationId = isObject(animationRef) ? animationRef.id : animationRef;
      if (isNonEmptyString(animationId) && !animationIds.has(animationId)) {
        errors.push(`Timeline step ${id || index} references missing animation ${animationId}.`);
      }
    });
  });

  interactions.forEach((item) => {
    const id = item?.id;
    if (!isNonEmptyString(id)) return;
    if (interactionIds.has(id)) errors.push(`Duplicate interaction id detected: ${id}.`);
    interactionIds.add(id);
  });

  checkpoints.forEach((checkpoint, index) => {
    const stepId = checkpoint?.stepId;
    if (!isNonEmptyString(stepId)) {
      warnings.push(`Checkpoint at index ${index} is missing stepId.`);
      return;
    }
    if (!timelineIds.has(stepId)) {
      errors.push(`Checkpoint at index ${index} references invalid stepId ${stepId}.`);
    }
  });

  const narrationLinks = Array.isArray(working?.narration?.links) ? working.narration.links : [];
  narrationLinks.forEach((link, index) => {
    const targetType = link?.targetType;
    const targetId = link?.targetId;
    if (!isNonEmptyString(targetType) || !isNonEmptyString(targetId)) {
      warnings.push(`Narration link at index ${index} is incomplete.`);
      return;
    }

    if (targetType === 'object' && !objectIds.has(targetId)) {
      errors.push(`Narration link ${index} references missing object ${targetId}.`);
    }

    if (targetType === 'timeline' && !timelineIds.has(targetId)) {
      errors.push(`Narration link ${index} references missing timeline step ${targetId}.`);
    }
  });

  warnings.push(...detectTimelineLoops(timeline));

  return createResult(errors, warnings);
}
