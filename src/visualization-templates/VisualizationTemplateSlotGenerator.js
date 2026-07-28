import { resolveGenerationConfig, stableHash, stableSortById } from './VisualizationTemplateGenerationConfig.js';

function clamp(min, value, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

function unique(items = []) {
  return [...new Set((Array.isArray(items) ? items : []).map((item) => String(item)))];
}

function buildPurposeSet(blueprint = {}, context = {}) {
  const purposes = ['primary-content', 'supporting-content'];
  if ((blueprint.relationshipPlan?.relationshipCount || 0) > 0) purposes.push('relationship-content');
  if ((blueprint.timelinePlan?.stepCount || 0) > 0) purposes.push('timeline-stage');
  if (context.interactionRequirements) purposes.push('interaction-controls');
  if (context.accessibilityNeeds?.textAlternativeRequired) purposes.push('caption-support');
  return unique(purposes);
}

function buildSlotId(seed = '', purpose = '', index = 0) {
  return `slot-${purpose}-${index + 1}-${stableHash(`${seed}:${purpose}:${index}`)}`;
}

export function generateTemplateSlots(blueprint = {}, context = {}, options = {}) {
  const config = resolveGenerationConfig(context, options);
  const seed = String(options.deterministicSeed || blueprint.metadata?.generationFingerprint || blueprint.blueprintId || 'seed');

  const concepts = Array.isArray(blueprint.conceptPlan?.concepts) ? blueprint.conceptPlan.concepts : [];
  const relationships = Array.isArray(blueprint.relationshipPlan?.relationships) ? blueprint.relationshipPlan.relationships : [];
  const steps = Number(blueprint.timelinePlan?.stepCount || 0);
  const purposes = buildPurposeSet(blueprint, context);

  const slots = [];
  const maxSlots = config.maximumSlots;

  const primaryCount = Math.max(1, Math.min(4, concepts.length || 1));
  for (let index = 0; index < primaryCount && slots.length < maxSlots; index += 1) {
    const concept = concepts[index] || {};
    slots.push({
      id: buildSlotId(seed, 'primary', index),
      name: `Primary Slot ${index + 1}`,
      purpose: 'primary-content',
      accepts: ['concept-node', 'content-node'],
      requires: [],
      multiplicity: 'one',
      capacity: 1,
      priority: index + 1,
      regionId: 'region-primary',
      parentSlotId: null,
      placementHints: { emphasis: 'high', role: concept.type || 'concept-node' },
      behaviorHints: { focusable: true },
      accessibilityHints: { narrationPriority: 'high' },
      constraints: [],
      fallback: 'adaptive-content-placeholder',
      metadata: { conceptId: concept.id || null, required: true },
      extensions: {}
    });
  }

  const supportingBudget = clamp(0, concepts.length + Math.ceil(relationships.length / 2) + Math.ceil(steps / 2), maxSlots - slots.length);
  for (let index = 0; index < supportingBudget && slots.length < maxSlots; index += 1) {
    const concept = concepts[primaryCount + index] || concepts[index] || {};
    slots.push({
      id: buildSlotId(seed, 'support', index),
      name: `Support Slot ${index + 1}`,
      purpose: 'supporting-content',
      accepts: ['concept-node', 'relationship', 'content-node'],
      requires: [],
      multiplicity: 'many',
      capacity: clamp(1, 1 + Math.floor(relationships.length / 6), 6),
      priority: primaryCount + index + 1,
      regionId: 'region-supporting',
      parentSlotId: null,
      placementHints: { emphasis: 'medium' },
      behaviorHints: { focusable: true },
      accessibilityHints: { narrationPriority: 'medium' },
      constraints: [],
      fallback: 'defer',
      metadata: { conceptId: concept.id || null, required: false },
      extensions: {}
    });
  }

  if (purposes.includes('timeline-stage') && slots.length < maxSlots) {
    slots.push({
      id: buildSlotId(seed, 'timeline', 0),
      name: 'Timeline Slot',
      purpose: 'timeline-stage',
      accepts: ['timeline-step', 'content-node'],
      requires: [],
      multiplicity: 'many',
      capacity: clamp(1, steps, 12),
      priority: slots.length + 1,
      regionId: 'region-timeline',
      parentSlotId: null,
      placementHints: { ordered: true },
      behaviorHints: { seekable: true },
      accessibilityHints: { narrationPriority: 'medium' },
      constraints: [],
      fallback: 'defer',
      metadata: { required: steps > 0 },
      extensions: {}
    });
  }

  if (purposes.includes('interaction-controls') && slots.length < maxSlots) {
    slots.push({
      id: buildSlotId(seed, 'interaction', 0),
      name: 'Interaction Slot',
      purpose: 'interaction-controls',
      accepts: ['interaction-node', 'content-node'],
      requires: [],
      multiplicity: 'many',
      capacity: 4,
      priority: slots.length + 1,
      regionId: 'region-controls',
      parentSlotId: null,
      placementHints: { controls: true },
      behaviorHints: { interactive: true },
      accessibilityHints: { keyboardRequired: true },
      constraints: [],
      fallback: 'defer',
      metadata: { required: false },
      extensions: {}
    });
  }

  return stableSortById(slots, 'id');
}
