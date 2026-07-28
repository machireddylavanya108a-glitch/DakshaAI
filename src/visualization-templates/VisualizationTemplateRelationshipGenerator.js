import { resolveGenerationConfig, stableHash, stableSortById } from './VisualizationTemplateGenerationConfig.js';

function makeRelationshipId(seed = '', sourceId = '', targetId = '', index = 0) {
  return `rel-${stableHash(`${seed}:${sourceId}:${targetId}:${index}`)}`;
}

function relationshipKey(sourceId = '', targetId = '', relation = '') {
  return `${sourceId}::${targetId}::${relation}`;
}

export function generateTemplateRelationships(blueprint = {}, slots = [], regions = [], context = {}, options = {}) {
  const config = resolveGenerationConfig(context, options);
  const maxRelationships = config.maximumRelationships;
  const seed = String(options.deterministicSeed || blueprint.metadata?.generationFingerprint || blueprint.blueprintId || 'seed');

  const output = [];
  const seen = new Set();

  const slotByPurpose = new Map();
  for (const slot of slots) {
    const purpose = String(slot?.purpose || 'supporting-content');
    if (!slotByPurpose.has(purpose)) slotByPurpose.set(purpose, []);
    slotByPurpose.get(purpose).push(slot);
  }

  const primarySlots = slotByPurpose.get('primary-content') || [];
  const supportSlots = slotByPurpose.get('supporting-content') || [];
  const timelineSlots = slotByPurpose.get('timeline-stage') || [];

  const addRelationship = (sourceId, targetId, relation, required = false) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    if (output.length >= maxRelationships) return;
    const key = relationshipKey(sourceId, targetId, relation);
    if (seen.has(key)) return;
    seen.add(key);
    output.push({
      id: makeRelationshipId(seed, sourceId, targetId, output.length),
      sourceId,
      targetId,
      relation,
      direction: 'directed',
      weight: required ? 2 : 1,
      required,
      conditions: [],
      metadata: { generated: true }
    });
  };

  for (const primary of primarySlots) {
    for (const support of supportSlots) {
      addRelationship(primary.id, support.id, 'supports', false);
    }
  }

  for (const stepSlot of timelineSlots) {
    for (const primary of primarySlots.slice(0, 2)) {
      addRelationship(stepSlot.id, primary.id, 'sequences', true);
    }
  }

  const regionMap = new Map((regions || []).map((region) => [region.id, region]));
  for (const slot of slots) {
    if (!regionMap.has(slot.regionId)) continue;
    addRelationship(slot.id, slot.regionId, 'placed-in', true);
  }

  const declared = Array.isArray(blueprint.relationshipPlan?.relationships) ? blueprint.relationshipPlan.relationships : [];
  for (const relationship of declared) {
    const sourceId = relationship?.sourceId || primarySlots[0]?.id || supportSlots[0]?.id;
    const targetId = relationship?.targetId || supportSlots[0]?.id || primarySlots[0]?.id;
    addRelationship(sourceId, targetId, relationship?.relation || 'related-to', relationship?.required === true);
  }

  return stableSortById(output.slice(0, maxRelationships), 'id');
}
