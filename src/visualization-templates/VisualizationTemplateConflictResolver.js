function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

function createRenamedId(baseId = 'id', prefix = 'renamed', templateId = 'template', index = 0) {
  return `${prefix}-${templateId}-${baseId}-${index + 1}`;
}

function collectDuplicateIds(items = [], field = 'id') {
  const counts = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = String(item?.[field] || '').trim();
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}

function profileRank(profile = 'balanced') {
  const token = normalizeToken(profile);
  if (token === 'low') return 1;
  if (token === 'balanced' || token === 'auto') return 2;
  if (token === 'high') return 3;
  return 2;
}

export function resolveTemplateConflicts(templates = [], context = {}, options = {}) {
  const input = (Array.isArray(templates) ? templates : []).map((template) => clone(template));
  const conflicts = [];
  const resolutions = [];
  const unresolved = [];

  const usedSlotIds = new Set();
  const usedRegionIds = new Set();
  const usedVariableNames = new Set();

  input.forEach((template) => {
    const slotIdMap = new Map();
    (Array.isArray(template.slots) ? template.slots : []).forEach((slot) => {
      const slotId = String(slot?.id || '').trim();
      if (!slotId) return;

      if (usedSlotIds.has(slotId)) {
        const renamed = createRenamedId(slotId, 'slot', template.templateId, slotIdMap.size);
        conflicts.push({ type: 'duplicate-slot-id', templateId: template.templateId, slotId, strategy: 'rename' });
        resolutions.push({ type: 'rename-slot-id', templateId: template.templateId, from: slotId, to: renamed });
        slot.id = renamed;
        slotIdMap.set(slotId, renamed);
        usedSlotIds.add(renamed);
      } else {
        usedSlotIds.add(slotId);
      }
    });

    if (slotIdMap.size) {
      (Array.isArray(template.slots) ? template.slots : []).forEach((slot) => {
        const parentSlotId = String(slot?.parentSlotId || '').trim();
        if (slotIdMap.has(parentSlotId)) {
          slot.parentSlotId = slotIdMap.get(parentSlotId);
        }
      });
      (Array.isArray(template.relationships) ? template.relationships : []).forEach((relationship) => {
        if (slotIdMap.has(String(relationship?.sourceId || '').trim())) {
          relationship.sourceId = slotIdMap.get(String(relationship.sourceId).trim());
        }
        if (slotIdMap.has(String(relationship?.targetId || '').trim())) {
          relationship.targetId = slotIdMap.get(String(relationship.targetId).trim());
        }
      });
    }

    (Array.isArray(template.regions) ? template.regions : []).forEach((region) => {
      const regionId = String(region?.id || '').trim();
      if (!regionId) return;

      if (usedRegionIds.has(regionId)) {
        const renamed = createRenamedId(regionId, 'region', template.templateId, usedRegionIds.size);
        conflicts.push({ type: 'duplicate-region-id', templateId: template.templateId, regionId, strategy: 'rename' });
        resolutions.push({ type: 'rename-region-id', templateId: template.templateId, from: regionId, to: renamed });
        region.id = renamed;
        usedRegionIds.add(renamed);

        (Array.isArray(template.slots) ? template.slots : []).forEach((slot) => {
          if (String(slot?.regionId || '').trim() === regionId) {
            slot.regionId = renamed;
          }
        });
      } else {
        usedRegionIds.add(regionId);
      }
    });

    (Array.isArray(template.variables) ? template.variables : []).forEach((variable) => {
      const name = normalizeToken(variable?.name || variable?.id || '');
      if (!name) return;
      if (usedVariableNames.has(name)) {
        conflicts.push({ type: 'duplicate-variable-name', templateId: template.templateId, variableName: name, strategy: 'rename' });
        const renamed = createRenamedId(name, 'variable', template.templateId, usedVariableNames.size);
        variable.name = renamed;
        resolutions.push({ type: 'rename-variable-name', templateId: template.templateId, from: name, to: renamed });
        usedVariableNames.add(normalizeToken(renamed));
      } else {
        usedVariableNames.add(name);
      }
    });

    const perf = template.performance || {};
    const minRank = profileRank(perf.minimumProfile || 'low');
    const maxRank = profileRank(perf.maximumProfile || 'high');
    if (minRank > maxRank) {
      conflicts.push({ type: 'performance-profile-conflict', templateId: template.templateId, strategy: 'downgrade' });
      template.performance = {
        ...perf,
        minimumProfile: 'low',
        maximumProfile: 'high'
      };
      resolutions.push({ type: 'reset-performance-profile-range', templateId: template.templateId });
    }

    const readingOrder = Array.isArray(template.accessibility?.readingOrder) ? template.accessibility.readingOrder : [];
    const duplicateReading = collectDuplicateIds(readingOrder.map((id) => ({ id })), 'id');
    if (duplicateReading.length) {
      conflicts.push({ type: 'accessibility-order-conflict', templateId: template.templateId, strategy: 'prioritize' });
      template.accessibility = {
        ...(template.accessibility || {}),
        readingOrder: [...new Set(readingOrder)]
      };
      resolutions.push({ type: 'dedupe-reading-order', templateId: template.templateId });
    }
  });

  const timelineSequences = input.map((template) => ({
    templateId: template.templateId,
    order: Number(template.timelineHints?.stepCountHint || 0)
  }));
  const hasTimelineConflict = timelineSequences.filter((item) => item.order > 0).length > 1
    && new Set(timelineSequences.map((item) => item.order)).size !== timelineSequences.length;

  if (hasTimelineConflict) {
    conflicts.push({ type: 'timeline-order-conflict', strategy: 'sequence' });
    resolutions.push({ type: 'sequence-timeline-order', order: timelineSequences.sort((a, b) => a.order - b.order).map((item) => item.templateId) });
  }

  return {
    templates: input,
    conflicts,
    resolutions,
    unresolved,
    diagnostics: {
      conflictCount: conflicts.length,
      resolvedConflictCount: resolutions.length
    }
  };
}
