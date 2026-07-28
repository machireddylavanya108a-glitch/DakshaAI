function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isProtectedKey(key = '') {
  const token = String(key || '').trim();
  return token === '__proto__' || token === 'prototype' || token === 'constructor';
}

function buildContentPool(context = {}) {
  const concepts = toArray(context.concepts).map((item, index) => ({
    id: String(item?.id || `concept-${index + 1}`),
    type: normalizeToken(item?.type || item?.category || 'concept-node'),
    label: String(item?.name || item?.label || `Concept ${index + 1}`),
    priority: Number(item?.priority || index + 1),
    source: 'concept'
  }));

  const relationships = toArray(context.relationships).map((item, index) => ({
    id: String(item?.id || `relationship-${index + 1}`),
    type: normalizeToken(item?.relation || item?.type || 'relationship'),
    label: String(item?.label || item?.relation || `Relationship ${index + 1}`),
    priority: Number(item?.priority || index + 1),
    source: 'relationship'
  }));

  const orderedSteps = toArray(context.orderedSteps || context.timelineRequirements).map((item, index) => ({
    id: String(item?.id || `step-${index + 1}`),
    type: normalizeToken(item?.type || 'timeline-step'),
    label: String(item?.title || item?.label || `Step ${index + 1}`),
    priority: Number(item?.order || index + 1),
    source: 'timeline'
  }));

  return [...concepts, ...relationships, ...orderedSteps].sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
}

function acceptsContent(slot = {}, content = {}) {
  const accepts = toArray(slot.accepts).map(normalizeToken);
  if (!accepts.length) return true;
  const contentType = normalizeToken(content.type || content.source || 'content-node');
  return accepts.includes(contentType) || accepts.includes('content-node') || accepts.includes('generic');
}

function resolveTemplateVariables(templateInstance = {}, context = {}, options = {}) {
  const defaults = templateInstance.resolvedVariables && typeof templateInstance.resolvedVariables === 'object'
    ? clone(templateInstance.resolvedVariables)
    : {};

  const metadata = context.metadata && typeof context.metadata === 'object' ? context.metadata : {};
  const capabilityComposition = context.capabilityComposition && typeof context.capabilityComposition === 'object' ? context.capabilityComposition : {};
  const requirements = context.visualizationRequirements && typeof context.visualizationRequirements === 'object' ? context.visualizationRequirements : {};
  const safeOptions = options.variables && typeof options.variables === 'object' ? options.variables : {};

  const resolved = {
    ...defaults,
    performanceProfile: context.performanceProfile || metadata.performanceProfile || defaults.performanceProfile || 'balanced',
    accessibilityNeeds: context.accessibilityNeeds || requirements.accessibilityNeeds || defaults.accessibilityNeeds || {},
    capabilityComposition,
    ...safeOptions
  };

  const blockedKeys = Object.keys(resolved).filter((key) => isProtectedKey(key));
  blockedKeys.forEach((key) => delete resolved[key]);

  const unresolvedRequiredVariables = [];
  toArray(templateInstance.sourceTemplate?.variables).forEach((variable) => {
    if (variable?.required && (resolved[variable.id] === undefined || resolved[variable.id] === null || resolved[variable.id] === '')) {
      unresolvedRequiredVariables.push(variable.id);
    }
  });

  return {
    resolved,
    blockedKeys,
    unresolvedRequiredVariables
  };
}

export function bindTemplateSlots(templateInstance, context = {}, options = {}) {
  const instance = templateInstance && typeof templateInstance === 'object' ? templateInstance : {};
  const slots = toArray(instance.resolvedSlots || instance.sourceTemplate?.slots).map((slot) => ({ ...slot }));
  const contentPool = buildContentPool(context);
  const usedContentIds = new Set();
  const bindings = [];
  const unboundRequiredSlots = [];
  const unboundOptionalSlots = [];
  const warnings = [];

  const slotOrder = [...slots].sort((left, right) => Number(left?.priority || 0) - Number(right?.priority || 0) || String(left?.id || '').localeCompare(String(right?.id || '')));

  slotOrder.forEach((slot) => {
    const capacity = Math.max(1, Number(slot.capacity || 1));
    const candidates = contentPool.filter((content) => !usedContentIds.has(content.id) && acceptsContent(slot, content));
    const assigned = candidates.slice(0, capacity);

    assigned.forEach((content) => usedContentIds.add(content.id));

    const binding = {
      slotId: slot.id,
      regionId: slot.regionId || null,
      purpose: slot.purpose || '',
      contentIds: assigned.map((item) => item.id),
      content: assigned
    };

    bindings.push(binding);

    const isRequired = normalizeToken(slot.multiplicity || 'many') === 'one' || Number(slot.priority || 0) <= 1;
    if (!assigned.length) {
      if (isRequired) {
        unboundRequiredSlots.push(slot.id);
      } else {
        unboundOptionalSlots.push(slot.id);
      }
    }
  });

  const unusedContent = contentPool.filter((content) => !usedContentIds.has(content.id));
  if (unusedContent.length) {
    warnings.push('unused-content-items-present');
  }

  return {
    bindings,
    unboundRequiredSlots,
    unboundOptionalSlots,
    unusedContent,
    warnings,
    diagnostics: {
      bindingCount: bindings.length,
      unboundRequiredSlotCount: unboundRequiredSlots.length,
      unboundOptionalSlotCount: unboundOptionalSlots.length,
      contentPoolCount: contentPool.length,
      unusedContentCount: unusedContent.length
    }
  };
}

export function bindTemplateRegions(templateInstance, slotBindings = {}, context = {}, options = {}) {
  const instance = templateInstance && typeof templateInstance === 'object' ? templateInstance : {};
  const regions = toArray(instance.resolvedRegions || instance.sourceTemplate?.regions).map((region) => ({ ...region }));
  const bindings = toArray(slotBindings.bindings);

  const regionBindings = [];
  const warnings = [];
  const capacityViolations = [];

  regions
    .sort((left, right) => Number(left?.accessibilityOrder || 0) - Number(right?.accessibilityOrder || 0))
    .forEach((region) => {
      const assignedSlots = bindings.filter((binding) => String(binding.regionId || '') === String(region.id || ''));
      const capacity = Math.max(1, Number(region.capacity || 1));

      if (assignedSlots.length > capacity) {
        capacityViolations.push(region.id);
      }

      regionBindings.push({
        regionId: region.id,
        purpose: region.purpose || '',
        slotIds: assignedSlots.slice(0, capacity).map((binding) => binding.slotId),
        overflowSlotIds: assignedSlots.slice(capacity).map((binding) => binding.slotId),
        accessibilityOrder: Number(region.accessibilityOrder || 0),
        layoutIntent: instance.sceneBindings?.layoutIntent || instance.sourceTemplate?.layout?.strategy || 'adaptive'
      });
    });

  if (capacityViolations.length) {
    warnings.push('region-capacity-violations');
  }

  const variableBinding = resolveTemplateVariables(instance, context, options);

  return {
    bindings: regionBindings,
    warnings,
    diagnostics: {
      bindingCount: regionBindings.length,
      capacityViolationCount: capacityViolations.length,
      capacityViolations,
      variableBinding
    }
  };
}

export { resolveTemplateVariables };
