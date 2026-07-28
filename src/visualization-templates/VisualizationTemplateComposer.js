import { resolveTemplateConflicts } from './VisualizationTemplateConflictResolver.js';
import { resolveTemplateDependencies } from './VisualizationTemplateDependencyResolver.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

function createCompositionId(primaryTemplateId = 'template') {
  return `template-composition-${primaryTemplateId}`;
}

function dedupeById(items = [], field = 'id') {
  const seen = new Set();
  const output = [];
  (Array.isArray(items) ? items : []).forEach((item) => {
    const key = String(item?.[field] || '').trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(item);
  });
  return output;
}

function mergeCapabilities(templates = []) {
  const shared = new Set();
  templates.forEach((template) => {
    toArray(template.requiredCapabilities).forEach((item) => {
      if (item?.capabilityId) shared.add(String(item.capabilityId));
    });
    toArray(template.optionalCapabilities).forEach((item) => {
      if (item?.capabilityId) shared.add(String(item.capabilityId));
    });
  });
  return [...shared];
}

function mergeVariables(templates = []) {
  const merged = [];
  templates.forEach((template) => {
    toArray(template.variables).forEach((variable) => {
      merged.push(clone(variable));
    });
  });
  return dedupeById(merged, 'id');
}

function mergeNumericMinimum(templates = [], key = 'objectBudget', fallback = 8) {
  const values = templates
    .map((template) => Number(template?.performance?.[key]))
    .filter((value) => Number.isFinite(value) && value >= 0);
  if (!values.length) return fallback;
  return Math.min(...values);
}

function mergeAccessibility(templates = []) {
  const list = templates.map((template) => template.accessibility || {});
  return {
    textDescription: list.map((item) => String(item.textDescription || '')).filter(Boolean).join(' | ').slice(0, 1000),
    readingOrder: [...new Set(list.flatMap((item) => Array.isArray(item.readingOrder) ? item.readingOrder : []))],
    focusOrder: [...new Set(list.flatMap((item) => Array.isArray(item.focusOrder) ? item.focusOrder : []))],
    keyboardNavigation: list.every((item) => item.keyboardNavigation !== false),
    reducedMotionCompatibility: list.every((item) => item.reducedMotionCompatibility !== false),
    highContrastCompatibility: list.every((item) => item.highContrastCompatibility !== false)
  };
}

function mergePerformance(templates = []) {
  const minimumProfile = templates
    .map((template) => normalizeToken(template?.performance?.minimumProfile || 'low'))
    .sort((left, right) => ({ low: 1, balanced: 2, auto: 2, high: 3 }[left] - ({ low: 1, balanced: 2, auto: 2, high: 3 }[right])))[0] || 'low';

  const maximumProfile = templates
    .map((template) => normalizeToken(template?.performance?.maximumProfile || 'high'))
    .sort((left, right) => ({ low: 1, balanced: 2, auto: 2, high: 3 }[right] - ({ low: 1, balanced: 2, auto: 2, high: 3 }[left])))[0] || 'high';

  return {
    minimumProfile,
    maximumProfile,
    objectBudget: mergeNumericMinimum(templates, 'objectBudget', 8),
    animationBudget: mergeNumericMinimum(templates, 'animationBudget', 8),
    interactionBudget: mergeNumericMinimum(templates, 'interactionBudget', 8),
    assetBudget: mergeNumericMinimum(templates, 'assetBudget', 8)
  };
}

export function composeVisualizationTemplates(selectedCandidates = [], context = {}, options = {}) {
  const candidates = toArray(selectedCandidates).filter((item) => item?.template);
  if (!candidates.length) {
    return {
      compositionId: createCompositionId('empty'),
      primaryTemplate: null,
      supportingTemplates: [],
      compositionOrder: [],
      sharedCapabilities: [],
      sharedVariables: [],
      mergedSlots: [],
      mergedRegions: [],
      mergedRelationships: [],
      conflicts: [],
      dependencies: [],
      unresolvedItems: ['no-candidates'],
      accessibility: {},
      performance: {},
      complexity: { score: 0 },
      metadata: {},
      diagnostics: {
        conflictCount: 0,
        resolvedConflictCount: 0,
        dependencyCount: 0,
        missingDependencyCount: 0
      }
    };
  }

  const templates = candidates.map((candidate) => clone(candidate.template));
  const conflictResolution = resolveTemplateConflicts(templates, context, options);
  const dependencyResolution = resolveTemplateDependencies(conflictResolution.templates, options.registry, context, options);

  const resolvedTemplates = dependencyResolution.templates;
  const primaryTemplate = resolvedTemplates[0] || null;
  const supportingTemplates = resolvedTemplates.slice(1);

  const mergedSlots = dedupeById(resolvedTemplates.flatMap((template) => toArray(template.slots).map((slot) => clone(slot))), 'id');
  const mergedRegions = dedupeById(resolvedTemplates.flatMap((template) => toArray(template.regions).map((region) => clone(region))), 'id');
  const mergedRelationships = dedupeById(resolvedTemplates.flatMap((template) => toArray(template.relationships).map((relationship) => clone(relationship))), 'id');

  return {
    compositionId: createCompositionId(primaryTemplate?.templateId || 'adaptive'),
    primaryTemplate,
    supportingTemplates,
    compositionOrder: resolvedTemplates.map((template, index) => ({
      templateId: template.templateId,
      version: template.version,
      order: index,
      role: index === 0 ? 'primary' : 'supporting'
    })),
    sharedCapabilities: mergeCapabilities(resolvedTemplates),
    sharedVariables: mergeVariables(resolvedTemplates),
    mergedSlots,
    mergedRegions,
    mergedRelationships,
    conflicts: conflictResolution.conflicts,
    dependencies: dependencyResolution.dependencies,
    unresolvedItems: [
      ...dependencyResolution.missingDependencies.map((item) => `missing-dependency:${item.dependency}`),
      ...dependencyResolution.circularDependencies.map((item) => `circular-dependency:${item.from}->${item.to}`)
    ],
    accessibility: mergeAccessibility(resolvedTemplates),
    performance: mergePerformance(resolvedTemplates),
    complexity: {
      score: mergedSlots.length + mergedRegions.length + mergedRelationships.length,
      slotCount: mergedSlots.length,
      regionCount: mergedRegions.length,
      relationshipCount: mergedRelationships.length
    },
    metadata: {
      composed: true,
      sourceCount: resolvedTemplates.length
    },
    diagnostics: {
      conflictCount: conflictResolution.conflicts.length,
      resolvedConflictCount: conflictResolution.resolutions.length,
      dependencyCount: dependencyResolution.diagnostics.dependencyCount,
      missingDependencyCount: dependencyResolution.missingDependencies.length,
      circularDependencyCount: dependencyResolution.circularDependencies.length,
      warnings: [...conflictResolution.unresolved, ...dependencyResolution.warnings]
    }
  };
}
