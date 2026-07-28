function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sortSlots(slots = []) {
  return [...slots].sort((left, right) => Number(left?.priority || 9999) - Number(right?.priority || 9999) || String(left?.id || '').localeCompare(String(right?.id || '')));
}

export function simplifyVisualizationTemplate(template = {}, constraints = {}, options = {}) {
  const maxSlots = Math.max(1, Number(constraints.maximumSlots || options.maximumSlots || 40));
  const maxRegions = Math.max(1, Number(constraints.maximumRegions || options.maximumRegions || 20));
  const maxRelationships = Math.max(0, Number(constraints.maximumRelationships || options.maximumRelationships || 120));

  const output = clone(template);
  const notes = [];

  const originalSlots = sortSlots(toArray(output.slots));
  const requiredSlots = originalSlots.filter((slot) => slot?.metadata?.required === true || slot?.multiplicity === 'one' || Number(slot?.priority || 0) <= 1);
  const optionalSlots = originalSlots.filter((slot) => !requiredSlots.includes(slot));
  const mergedSlots = [...requiredSlots, ...optionalSlots].slice(0, maxSlots);

  if (mergedSlots.length < originalSlots.length) {
    notes.push(`slot-count-reduced:${originalSlots.length}->${mergedSlots.length}`);
  }
  output.slots = mergedSlots;

  const slotIds = new Set(output.slots.map((slot) => slot.id));

  const originalRegions = toArray(output.regions);
  output.regions = originalRegions
    .filter((region, index) => index < maxRegions)
    .map((region, index) => ({
      ...region,
      accessibilityOrder: index + 1,
      priority: Math.min(Number(region?.priority || index + 1), index + 1)
    }));

  if (output.regions.length < originalRegions.length) {
    notes.push(`region-count-reduced:${originalRegions.length}->${output.regions.length}`);
  }

  const regionIds = new Set(output.regions.map((region) => region.id));
  output.slots = output.slots.map((slot) => {
    if (slot.regionId && regionIds.has(slot.regionId)) return slot;
    notes.push(`slot-region-relinked:${slot.id}`);
    return { ...slot, regionId: output.regions[0]?.id || 'region-primary' };
  });

  const originalRelationships = toArray(output.relationships);
  const requiredRelationships = originalRelationships.filter((relationship) => relationship?.required === true);
  const optionalRelationships = originalRelationships.filter((relationship) => relationship?.required !== true);
  output.relationships = [...requiredRelationships, ...optionalRelationships]
    .filter((relationship) => relationship && (slotIds.has(relationship.sourceId) || regionIds.has(relationship.sourceId)))
    .filter((relationship) => relationship && (slotIds.has(relationship.targetId) || regionIds.has(relationship.targetId)))
    .slice(0, maxRelationships);

  if (output.relationships.length < originalRelationships.length) {
    notes.push(`relationship-count-reduced:${originalRelationships.length}->${output.relationships.length}`);
  }

  output.animationHints = {
    ...(output.animationHints || {}),
    intensity: constraints.reduceMotion ? 'minimal' : (output.animationHints?.intensity || 'low'),
    transitionIntent: constraints.reduceMotion ? 'none' : (output.animationHints?.transitionIntent || 'soft')
  };

  return {
    template: output,
    notes,
    simplified: notes.length > 0
  };
}
