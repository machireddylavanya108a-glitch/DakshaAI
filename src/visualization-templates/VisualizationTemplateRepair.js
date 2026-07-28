import { createAdaptiveFallbackTemplate, createDefaultTemplateAccessibility, createDefaultTemplateLayout, createDefaultTemplatePerformance } from './VisualizationTemplateSchema.js';
import { normalizeVisualizationTemplateConfig, VISUALIZATION_TEMPLATE_LATEST_VERSION } from './VisualizationTemplateConfig.js';
import { runVisualizationTemplateIntegrityChecks } from './VisualizationTemplateIntegrity.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function createStableFallbackId(prefix = 'template') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function renameDuplicates(list = [], key = 'id', prefix = 'item') {
  const seen = new Map();
  const remap = new Map();
  const repaired = list.map((item, index) => {
    const next = ensureObject(item);
    const original = String(next[key] || `${prefix}-${index + 1}`);
    const count = seen.get(original) || 0;
    seen.set(original, count + 1);
    if (count === 0) {
      return { ...next, [key]: original };
    }
    const renamed = `${original}--${count + 1}`;
    remap.set(original, remap.get(original) || []);
    remap.get(original).push({ from: original, to: renamed });
    return { ...next, [key]: renamed };
  });
  return { repaired, remap };
}

function applyReferenceRemap(template, remapEntries) {
  if (!remapEntries || !remapEntries.length) return template;
  const next = clone(template);

  const lookup = new Map();
  for (const entry of remapEntries) {
    lookup.set(`${entry.type}:${entry.from}`, entry.to);
  }

  next.slots = ensureArray(next.slots).map((slot) => ({
    ...slot,
    parentSlotId: lookup.get(`slot:${slot.parentSlotId}`) || slot.parentSlotId
  }));

  next.relationships = ensureArray(next.relationships).map((relationship) => ({
    ...relationship,
    sourceId: lookup.get(`slot:${relationship.sourceId}`) || lookup.get(`region:${relationship.sourceId}`) || relationship.sourceId,
    targetId: lookup.get(`slot:${relationship.targetId}`) || lookup.get(`region:${relationship.targetId}`) || relationship.targetId
  }));

  return next;
}

export function repairVisualizationTemplate(templateInput = {}, validation = null, options = {}) {
  const config = normalizeVisualizationTemplateConfig(options);
  const fallback = createAdaptiveFallbackTemplate();
  const source = ensureObject(templateInput);
  const repairMessages = [];

  const repaired = {
    ...fallback,
    ...source,
    templateId: source.templateId || createStableFallbackId('template'),
    version: source.version || VISUALIZATION_TEMPLATE_LATEST_VERSION,
    name: source.name || 'Adaptive Template',
    semanticPurpose: source.semanticPurpose || fallback.semanticPurpose,
    slots: ensureArray(source.slots),
    regions: ensureArray(source.regions),
    relationships: ensureArray(source.relationships),
    variables: ensureArray(source.variables),
    conditions: ensureArray(source.conditions),
    layout: ensureObject(source.layout),
    accessibility: ensureObject(source.accessibility),
    performance: ensureObject(source.performance),
    metadata: ensureObject(source.metadata),
    extensions: ensureObject(source.extensions)
  };

  if (!source.templateId) repairMessages.push('Generated missing templateId.');
  if (!source.version) repairMessages.push('Inserted latest template version.');
  if (!source.name) repairMessages.push('Inserted adaptive template name.');
  if (!source.semanticPurpose) repairMessages.push('Inserted adaptive semantic purpose.');

  if (!repaired.slots.length) {
    repaired.slots = clone(fallback.slots);
    repairMessages.push('Inserted fallback slots.');
  }

  if (!repaired.regions.length) {
    repaired.regions = clone(fallback.regions);
    repairMessages.push('Inserted fallback regions.');
  }

  if (!Object.keys(repaired.layout).length) {
    repaired.layout = createDefaultTemplateLayout();
    repairMessages.push('Inserted default layout metadata.');
  }

  if (!Object.keys(repaired.accessibility).length) {
    repaired.accessibility = createDefaultTemplateAccessibility();
    repairMessages.push('Inserted default accessibility metadata.');
  }

  if (!Object.keys(repaired.performance).length) {
    repaired.performance = createDefaultTemplatePerformance();
    repairMessages.push('Inserted default performance metadata.');
  }

  repaired.performance.objectBudget = Math.max(1, Math.min(5000, Number(repaired.performance.objectBudget || 64)));
  repaired.performance.animationBudget = Math.max(0, Math.min(5000, Number(repaired.performance.animationBudget || 24)));
  repaired.performance.interactionBudget = Math.max(0, Math.min(5000, Number(repaired.performance.interactionBudget || 24)));
  repaired.performance.assetBudget = Math.max(0, Math.min(5000, Number(repaired.performance.assetBudget || 24)));

  const slotDupes = renameDuplicates(repaired.slots, 'id', 'slot');
  const regionDupes = renameDuplicates(repaired.regions, 'id', 'region');
  const relDupes = renameDuplicates(repaired.relationships, 'id', 'relationship');
  const varDupes = renameDuplicates(repaired.variables, 'id', 'variable');

  repaired.slots = slotDupes.repaired.slice(0, config.limits.maxSlots);
  repaired.regions = regionDupes.repaired.slice(0, config.limits.maxRegions);
  repaired.relationships = relDupes.repaired.slice(0, config.limits.maxRelationships);
  repaired.variables = varDupes.repaired.slice(0, config.limits.maxVariables);
  repaired.conditions = repaired.conditions.slice(0, config.limits.maxConditions);

  const remapEntries = [];
  for (const entries of slotDupes.remap.values()) entries.forEach((entry) => remapEntries.push({ ...entry, type: 'slot' }));
  for (const entries of regionDupes.remap.values()) entries.forEach((entry) => remapEntries.push({ ...entry, type: 'region' }));
  let remapped = applyReferenceRemap(repaired, remapEntries);

  if (remapEntries.length) {
    repairMessages.push('Renamed duplicate ids and remapped references.');
  }

  const regionIds = new Set(remapped.regions.map((item) => item.id));
  remapped.slots = remapped.slots.map((slot) => {
    if (slot.regionId && !regionIds.has(slot.regionId)) {
      repairMessages.push(`Slot ${slot.id} was re-linked to primary region.`);
      return { ...slot, regionId: remapped.regions[0]?.id || '' };
    }
    return slot;
  });

  const nodeIds = new Set([
    ...remapped.slots.map((item) => item.id),
    ...remapped.regions.map((item) => item.id)
  ]);

  remapped.relationships = remapped.relationships.filter((relationship) => {
    const sourceKnown = nodeIds.has(relationship.sourceId);
    const targetKnown = nodeIds.has(relationship.targetId);
    if (sourceKnown && targetKnown) return true;
    if (relationship.required) {
      repairMessages.push(`Required relationship ${relationship.id} unresolved and converted to placeholder warning.`);
      return false;
    }
    repairMessages.push(`Optional relationship ${relationship.id} removed due to broken references.`);
    return false;
  });

  const integrity = runVisualizationTemplateIntegrityChecks(remapped);
  repairMessages.push(...integrity.warnings);

  remapped.validation = {
    status: validation?.valid === false || integrity.status !== 'valid' ? 'repaired' : 'valid',
    errors: [...(validation?.errors || []), ...integrity.errors],
    warnings: [...(validation?.warnings || []), ...repairMessages],
    repairable: true
  };

  remapped.diagnostics = {
    ...(ensureObject(remapped.diagnostics)),
    repairCount: repairMessages.length,
    integrity
  };

  return remapped;
}
