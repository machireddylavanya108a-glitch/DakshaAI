function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function detectCycle(nodes = [], idField, parentField) {
  const map = new Map();
  nodes.forEach((item) => map.set(item[idField], item));

  const visited = new Set();
  const visiting = new Set();
  const cycles = [];

  function walk(id) {
    if (!id || visited.has(id)) return;
    if (visiting.has(id)) {
      cycles.push(id);
      return;
    }
    visiting.add(id);
    const node = map.get(id);
    if (node) walk(node[parentField]);
    visiting.delete(id);
    visited.add(id);
  }

  for (const item of nodes) walk(item[idField]);
  return cycles;
}

function duplicateIds(list = [], key = 'id') {
  const seen = new Set();
  const duplicates = [];
  for (const item of list) {
    const id = String(item?.[key] || '');
    if (!id) continue;
    if (seen.has(id)) duplicates.push(id);
    seen.add(id);
  }
  return duplicates;
}

function unsafeKeyScan(value, depth = 0, maxDepth = 16) {
  if (depth > maxDepth) return ['depth-limit'];
  if (Array.isArray(value)) {
    return value.flatMap((item) => unsafeKeyScan(item, depth + 1, maxDepth));
  }
  if (!isObject(value)) return [];

  const issues = [];
  for (const [key, nested] of Object.entries(value)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      issues.push(key);
    }
    issues.push(...unsafeKeyScan(nested, depth + 1, maxDepth));
  }
  return issues;
}

export function runVisualizationTemplateIntegrityChecks(template = {}) {
  const slots = Array.isArray(template.slots) ? template.slots : [];
  const regions = Array.isArray(template.regions) ? template.regions : [];
  const relationships = Array.isArray(template.relationships) ? template.relationships : [];
  const variables = Array.isArray(template.variables) ? template.variables : [];

  const errors = [];
  const warnings = [];
  const suggestions = [];

  const duplicateSlotIds = duplicateIds(slots);
  const duplicateRegionIds = duplicateIds(regions);
  const duplicateRelationshipIds = duplicateIds(relationships);
  const duplicateVariableIds = duplicateIds(variables);

  if (duplicateSlotIds.length) errors.push(`Duplicate slot ids: ${duplicateSlotIds.join(', ')}`);
  if (duplicateRegionIds.length) errors.push(`Duplicate region ids: ${duplicateRegionIds.join(', ')}`);
  if (duplicateRelationshipIds.length) errors.push(`Duplicate relationship ids: ${duplicateRelationshipIds.join(', ')}`);
  if (duplicateVariableIds.length) errors.push(`Duplicate variable ids: ${duplicateVariableIds.join(', ')}`);

  const slotIds = new Set(slots.map((item) => item.id));
  const regionIds = new Set(regions.map((item) => item.id));

  slots.forEach((slot) => {
    if (slot.regionId && !regionIds.has(slot.regionId)) {
      errors.push(`Slot ${slot.id} references missing region ${slot.regionId}.`);
      suggestions.push({ type: 'add-region', slotId: slot.id, regionId: slot.regionId });
    }
    if (slot.parentSlotId && !slotIds.has(slot.parentSlotId)) {
      errors.push(`Slot ${slot.id} references missing parent slot ${slot.parentSlotId}.`);
      suggestions.push({ type: 'clear-parent-slot', slotId: slot.id });
    }
  });

  relationships.forEach((relationship) => {
    if (!relationship.sourceId || !relationship.targetId) {
      warnings.push(`Relationship ${relationship.id} is missing source or target.`);
      return;
    }

    if (relationship.sourceId === relationship.targetId) {
      errors.push(`Relationship ${relationship.id} self-references ${relationship.sourceId}.`);
      suggestions.push({ type: 'remove-relationship', relationshipId: relationship.id });
    }

    const sourceKnown = slotIds.has(relationship.sourceId) || regionIds.has(relationship.sourceId);
    const targetKnown = slotIds.has(relationship.targetId) || regionIds.has(relationship.targetId);
    if (!sourceKnown || !targetKnown) {
      warnings.push(`Relationship ${relationship.id} references unresolved nodes.`);
      suggestions.push({ type: 'mark-unresolved-relationship', relationshipId: relationship.id });
    }
  });

  const slotCycles = detectCycle(slots, 'id', 'parentSlotId');
  const regionCycles = detectCycle(regions, 'id', 'parentRegionId');

  if (slotCycles.length) {
    errors.push(`Circular slot hierarchy detected at: ${slotCycles.join(', ')}`);
    suggestions.push({ type: 'break-slot-cycle', nodes: slotCycles });
  }

  if (regionCycles.length) {
    errors.push(`Circular region hierarchy detected at: ${regionCycles.join(', ')}`);
    suggestions.push({ type: 'break-region-cycle', nodes: regionCycles });
  }

  const unsafeKeys = unsafeKeyScan(template.extensions || {});
  if (unsafeKeys.length) {
    errors.push('Unsafe extension keys detected.');
    suggestions.push({ type: 'remove-unsafe-keys' });
  }

  return {
    status: errors.length ? 'invalid' : warnings.length ? 'warning' : 'valid',
    errors,
    warnings,
    suggestions,
    duplicateIdCount: duplicateSlotIds.length + duplicateRegionIds.length + duplicateRelationshipIds.length + duplicateVariableIds.length,
    brokenReferenceCount: warnings.filter((item) => item.includes('references')).length + errors.filter((item) => item.includes('references')).length
  };
}
