import { stableSortByKey } from './EducationalObjectGenerationConfig.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function isPrimary(object = {}) {
  const role = String(object.semanticRole || '').toLowerCase();
  return role.includes('primary') || Number(object.metadata?.importance || object.importance || 0) >= 0.7;
}

function dedupeSupportObjects(objects = []) {
  const seen = new Set();
  const output = [];

  stableSortByKey(objects, 'objectId').forEach((objectValue) => {
    const token = `${String(objectValue.kind || 'generic')}|${String(objectValue.name || '').toLowerCase()}|${String(objectValue.learningPurpose || '')}`;
    if (isPrimary(objectValue) || !seen.has(token)) {
      seen.add(token);
      output.push(objectValue);
    }
  });

  return output;
}

export function simplifyEducationalObjects(objects = [], constraints = {}, options = {}) {
  const maxObjects = Math.max(1, Number(constraints.maximumObjects || options.maximumObjects || 50));
  const reductionNotes = [];

  let working = toArray(objects).map((item) => ({ ...item }));
  const originalLength = working.length;

  working = dedupeSupportObjects(working);
  if (working.length < originalLength) {
    reductionNotes.push(`merged-duplicate-supporting-objects:${originalLength - working.length}`);
  }

  if (working.length > maxObjects) {
    const primaries = working.filter((item) => isPrimary(item));
    const nonPrimaries = working.filter((item) => !isPrimary(item));

    const preservedPrimaries = primaries.slice(0, maxObjects);
    const remaining = Math.max(0, maxObjects - preservedPrimaries.length);
    const clipped = nonPrimaries.slice(0, remaining);

    working = [...preservedPrimaries, ...clipped];
    reductionNotes.push(`clamped-object-count:${working.length}`);
  }

  working = stableSortByKey(working, 'objectId').map((item, index) => ({
    ...item,
    labels: toArray(item.labels).slice(0, options.reduceLabelDensity ? 1 : 2).map((label, labelIndex) => ({
      ...label,
      readingOrder: Math.max(1, Number(label.readingOrder || index + labelIndex + 1))
    })),
    relationshipReferences: toArray(item.relationshipReferences)
      .filter((relation) => relation.required === true || !options.reduceOptionalRelationships)
      .slice(0, options.reduceOptionalRelationships ? 8 : 16)
  }));

  return {
    simplified: reductionNotes.length > 0,
    objects: working,
    notes: reductionNotes
  };
}
