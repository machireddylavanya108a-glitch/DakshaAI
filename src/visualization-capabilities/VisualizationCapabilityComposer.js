import { normalizeVisualizationCapabilityConfig } from './VisualizationCapabilityConfig.js';

function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

function gatherRelations(capability) {
  return Array.isArray(capability?.compositionRules) ? capability.compositionRules : [];
}

function relationTarget(rule) {
  return String(rule?.targetCapability || '').trim();
}

function relationSource(rule) {
  return String(rule?.sourceCapability || '').trim();
}

export function composeVisualizationCapabilities(matches = [], requirements = {}, options = {}) {
  const config = normalizeVisualizationCapabilityConfig(options);
  const sorted = Array.isArray(matches) ? [...matches] : [];

  const warnings = [];
  const conflicts = [];
  const dependencies = [];
  const selected = [];
  const seenSemanticPurpose = new Set();

  const primary = sorted[0] || null;
  if (!primary) {
    return {
      primaryCapability: null,
      supportingCapabilities: [],
      optionalCapabilities: [],
      conflicts,
      dependencies,
      compositionOrder: [],
      sharedDataRequirements: [],
      combinedConstraints: requirements?.constraints || [],
      selectedCapabilities: [],
      warnings: ['No capability matches available for composition.']
    };
  }

  selected.push(primary.capability);
  seenSemanticPurpose.add(normalizeToken(primary.capability.semanticPurpose));

  for (const candidate of sorted.slice(1)) {
    if (selected.length >= config.maxSupportingCapabilities + 1) break;

    const semantic = normalizeToken(candidate?.capability?.semanticPurpose);
    if (seenSemanticPurpose.has(semantic)) continue;

    const rules = gatherRelations(candidate.capability);
    const hasConflict = rules.some((rule) => normalizeToken(rule.relation) === 'conflicts'
      && selected.some((capability) => capability.id === relationTarget(rule)));

    if (hasConflict) {
      conflicts.push({ source: candidate.capability.id, relation: 'conflicts' });
      continue;
    }

    const requiredDeps = rules.filter((rule) => normalizeToken(rule.relation) === 'requires');
    const unmetDeps = requiredDeps.filter((rule) => !selected.some((capability) => capability.id === relationTarget(rule)));
    if (unmetDeps.length) {
      unmetDeps.forEach((rule) => dependencies.push({ source: relationSource(rule) || candidate.capability.id, target: relationTarget(rule), relation: 'requires' }));
      continue;
    }

    selected.push(candidate.capability);
    seenSemanticPurpose.add(semantic);
  }

  const compositionOrder = selected.map((capability, index) => ({
    id: capability.id,
    order: index,
    role: index === 0 ? 'primary' : 'supporting'
  }));

  const supportingCapabilities = selected.slice(1);
  const optionalCapabilities = sorted
    .map((item) => item.capability)
    .filter((capability) => !selected.some((selectedItem) => selectedItem.id === capability.id))
    .slice(0, 3);

  const sharedDataRequirements = selected
    .flatMap((capability) => Array.isArray(capability.inputRequirements) ? capability.inputRequirements : [])
    .map((rule) => `${rule.field}:${rule.operator}`)
    .filter(Boolean);

  if (conflicts.length) warnings.push('Some candidate capabilities were excluded due to conflicts.');
  if (dependencies.length) warnings.push('Some candidate capabilities were excluded due to unmet dependencies.');

  return {
    primaryCapability: primary.capability,
    supportingCapabilities,
    optionalCapabilities,
    conflicts,
    dependencies,
    compositionOrder,
    sharedDataRequirements: [...new Set(sharedDataRequirements)],
    combinedConstraints: requirements?.constraints || [],
    selectedCapabilities: selected,
    warnings
  };
}
