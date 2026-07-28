import { normalizeVisualizationTemplateConfig, VISUALIZATION_TEMPLATE_LATEST_VERSION } from './VisualizationTemplateConfig.js';
import {
  createAdaptiveFallbackTemplate,
  createDefaultTemplateAccessibility,
  createDefaultTemplateLayout,
  createDefaultTemplatePerformance
} from './VisualizationTemplateSchema.js';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeString(value, maxLength) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/import\s*\(/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeIdentifier(value, config, fallback = '') {
  const cleaned = sanitizeString(value, config.limits.maxIdentifierLength).replace(/[^a-zA-Z0-9_\-:.]/g, '-');
  return cleaned || fallback;
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function dedupeById(list = [], idField = 'id') {
  const seen = new Set();
  const output = [];
  for (const item of list) {
    const id = item && typeof item === 'object' ? String(item[idField] || '') : '';
    const key = id || JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      output.push(item);
    }
  }
  return output;
}

function sanitizeUrlLike(value = '', config) {
  const text = sanitizeString(value, config.limits.maxStringLength);
  const lowered = text.toLowerCase();
  if (lowered.startsWith('javascript:') || lowered.startsWith('data:text/html')) return '';
  if (lowered.includes('..\\') || lowered.includes('../')) return '';
  return text;
}

function cleanValue(value, config, depth = 0, seen = new WeakSet()) {
  if (depth > config.limits.maxNestingDepth) return '[depth-limit]';
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'function') return undefined;
  if (typeof value === 'symbol') return undefined;
  if (typeof value === 'bigint') return Number(value);

  if (typeof value === 'string') {
    return sanitizeUrlLike(value, config);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'object') return value;

  if (seen.has(value)) return '[circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .slice(0, config.limits.maxArrayLength)
      .map((item) => cleanValue(item, config, depth + 1, seen))
      .filter((item) => item !== undefined);
  }

  const output = Object.create(null);
  for (const [key, nested] of Object.entries(value)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue;
    const cleaned = cleanValue(nested, config, depth + 1, seen);
    if (cleaned !== undefined) output[key] = cleaned;
  }
  return output;
}

function normalizeCapabilityRef(raw = {}, index = 0, config) {
  const source = isObject(raw) ? raw : {};
  const capabilityId = sanitizeIdentifier(source.capabilityId || source.id || '', config, `capability-${index + 1}`);
  return {
    referenceId: sanitizeIdentifier(source.referenceId || `capability-ref-${index + 1}`, config),
    capabilityId,
    role: sanitizeString(source.role || 'supporting', 120),
    required: source.required !== false,
    priority: clampNumber(source.priority, 0, 1000, index + 1),
    constraints: Array.isArray(source.constraints) ? source.constraints : [],
    overrides: isObject(source.overrides) ? source.overrides : {},
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function normalizeSlot(raw = {}, index = 0, config) {
  const source = isObject(raw) ? raw : {};
  return {
    id: sanitizeIdentifier(source.id || `slot-${index + 1}`, config),
    name: sanitizeString(source.name || `Slot ${index + 1}`, 200),
    purpose: sanitizeString(source.purpose || 'generic-slot', 200),
    accepts: Array.isArray(source.accepts) ? source.accepts.map((item) => sanitizeString(item, 120)).filter(Boolean) : [],
    requires: Array.isArray(source.requires) ? source.requires.map((item) => sanitizeString(item, 120)).filter(Boolean) : [],
    multiplicity: sanitizeString(source.multiplicity || 'many', 40),
    capacity: clampNumber(source.capacity, 0, 10000, 1),
    priority: clampNumber(source.priority, 0, 10000, index + 1),
    regionId: sanitizeIdentifier(source.regionId || '', config),
    parentSlotId: sanitizeIdentifier(source.parentSlotId || '', config),
    placementHints: isObject(source.placementHints) ? source.placementHints : {},
    behaviorHints: isObject(source.behaviorHints) ? source.behaviorHints : {},
    accessibilityHints: isObject(source.accessibilityHints) ? source.accessibilityHints : {},
    constraints: Array.isArray(source.constraints) ? source.constraints : [],
    fallback: sanitizeString(source.fallback || '', 200),
    metadata: isObject(source.metadata) ? source.metadata : {},
    extensions: isObject(source.extensions) ? source.extensions : {}
  };
}

function normalizeRegion(raw = {}, index = 0, config) {
  const source = isObject(raw) ? raw : {};
  return {
    id: sanitizeIdentifier(source.id || `region-${index + 1}`, config),
    name: sanitizeString(source.name || `Region ${index + 1}`, 200),
    purpose: sanitizeString(source.purpose || 'generic-region', 200),
    bounds: isObject(source.bounds) ? source.bounds : { x: 0, y: 0, width: 1, height: 1, depth: 1 },
    coordinateSpace: sanitizeString(source.coordinateSpace || 'normalized', 80),
    anchor: sanitizeString(source.anchor || 'center', 80),
    alignment: sanitizeString(source.alignment || 'balanced', 80),
    flow: sanitizeString(source.flow || 'adaptive', 80),
    capacity: clampNumber(source.capacity, 0, 10000, 16),
    priority: clampNumber(source.priority, 0, 10000, index + 1),
    responsiveRules: Array.isArray(source.responsiveRules) ? source.responsiveRules : [],
    accessibilityOrder: clampNumber(source.accessibilityOrder, 0, 10000, index + 1),
    metadata: isObject(source.metadata) ? source.metadata : {},
    extensions: isObject(source.extensions) ? source.extensions : {}
  };
}

function normalizeRelationship(raw = {}, index = 0, config) {
  const source = isObject(raw) ? raw : {};
  return {
    id: sanitizeIdentifier(source.id || `relationship-${index + 1}`, config),
    sourceId: sanitizeIdentifier(source.sourceId || source.from || '', config),
    targetId: sanitizeIdentifier(source.targetId || source.to || '', config),
    relation: sanitizeString(source.relation || 'references', 120),
    direction: sanitizeString(source.direction || 'directed', 40),
    weight: clampNumber(source.weight, 0, 1000, 1),
    required: source.required === true,
    conditions: Array.isArray(source.conditions) ? source.conditions : [],
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function normalizeVariable(raw = {}, index = 0, config) {
  const source = isObject(raw) ? raw : {};
  return {
    id: sanitizeIdentifier(source.id || `variable-${index + 1}`, config),
    name: sanitizeString(source.name || `Variable ${index + 1}`, 200),
    valueType: sanitizeString(source.valueType || 'string', 80),
    defaultValue: cleanValue(source.defaultValue, config),
    required: source.required === true,
    constraints: Array.isArray(source.constraints) ? source.constraints : [],
    source: sanitizeString(source.source || 'template', 120),
    description: sanitizeString(source.description || '', 400),
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function normalizeCondition(raw = {}, index = 0, config) {
  const source = isObject(raw) ? raw : {};
  return {
    id: sanitizeIdentifier(source.id || `condition-${index + 1}`, config),
    field: sanitizeString(source.field || '', 200),
    operator: sanitizeString(source.operator || 'exists', 80),
    expectedValue: cleanValue(source.expectedValue, config),
    effect: sanitizeString(source.effect || 'none', 200),
    priority: clampNumber(source.priority, 0, 1000, index + 1),
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function normalizeExtensionPoint(raw = {}, index = 0, config) {
  const source = isObject(raw) ? raw : {};
  return {
    id: sanitizeIdentifier(source.id || `extension-point-${index + 1}`, config),
    purpose: sanitizeString(source.purpose || 'generic-extension', 200),
    accepts: Array.isArray(source.accepts) ? source.accepts.map((item) => sanitizeString(item, 120)).filter(Boolean) : [],
    constraints: Array.isArray(source.constraints) ? source.constraints : [],
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function pick(source, keys, fallback = undefined) {
  for (const key of keys) {
    if (source && Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      return source[key];
    }
  }
  return fallback;
}

export function normalizeVisualizationTemplate(input = {}, options = {}) {
  const config = normalizeVisualizationTemplateConfig(options);
  const sanitized = cleanValue(input, config) || {};
  const source = isObject(sanitized) ? sanitized : {};
  const fallback = createAdaptiveFallbackTemplate();

  const aliasTemplate = pick(source, ['visualizationTemplate', 'sceneTemplate', 'template', 'layoutTemplate', 'templateConfig', 'sceneLayout'], {});
  const merged = {
    ...(isObject(aliasTemplate) ? aliasTemplate : {}),
    ...source
  };

  const knownKeys = new Set([
    'templateId', 'template_id', 'version', 'template_version', 'name', 'description', 'source', 'status', 'semanticPurpose', 'semantic_purpose',
    'requiredCapabilities', 'required_capabilities', 'optionalCapabilities', 'optional_capabilities', 'composition', 'slots', 'templateSlots',
    'regions', 'layoutRegions', 'relationships', 'layout', 'cameraHints', 'camera', 'environmentHints', 'environment', 'timelineHints', 'timeline',
    'animationHints', 'animation', 'interactionHints', 'interaction', 'assetHints', 'assets', 'accessibility', 'a11y', 'performance',
    'performanceHints', 'constraints', 'variables', 'defaults', 'conditions', 'extensionPoints', 'metadata', 'extensions', 'validation', 'diagnostics'
  ]);

  const unknownProperties = Object.create(null);
  for (const [key, value] of Object.entries(merged)) {
    if (!knownKeys.has(key)) unknownProperties[key] = value;
  }

  const requiredCapabilities = (Array.isArray(pick(merged, ['requiredCapabilities', 'required_capabilities'], []))
    ? pick(merged, ['requiredCapabilities', 'required_capabilities'], [])
    : [])
    .slice(0, config.limits.maxArrayLength)
    .map((item, index) => normalizeCapabilityRef(item, index, config));

  const optionalCapabilities = (Array.isArray(pick(merged, ['optionalCapabilities', 'optional_capabilities'], []))
    ? pick(merged, ['optionalCapabilities', 'optional_capabilities'], [])
    : [])
    .slice(0, config.limits.maxArrayLength)
    .map((item, index) => normalizeCapabilityRef(item, index, config));

  const normalized = {
    templateId: sanitizeIdentifier(pick(merged, ['templateId', 'template_id'], ''), config),
    version: sanitizeString(pick(merged, ['version', 'template_version'], VISUALIZATION_TEMPLATE_LATEST_VERSION), 40),
    name: sanitizeString(pick(merged, ['name'], fallback.name), 240),
    description: sanitizeString(pick(merged, ['description'], fallback.description), config.limits.maxStringLength),
    source: sanitizeString(pick(merged, ['source'], fallback.source), 120),
    status: sanitizeString(pick(merged, ['status'], fallback.status), 60),
    semanticPurpose: sanitizeString(pick(merged, ['semanticPurpose', 'semantic_purpose'], fallback.semanticPurpose), 240),
    requiredCapabilities: dedupeById(requiredCapabilities, 'referenceId'),
    optionalCapabilities: dedupeById(optionalCapabilities, 'referenceId'),
    composition: isObject(merged.composition) ? merged.composition : fallback.composition,
    slots: dedupeById((Array.isArray(pick(merged, ['slots', 'templateSlots'], [])) ? pick(merged, ['slots', 'templateSlots'], []) : [])
      .slice(0, config.limits.maxSlots)
      .map((item, index) => normalizeSlot(item, index, config))),
    regions: dedupeById((Array.isArray(pick(merged, ['regions', 'layoutRegions'], [])) ? pick(merged, ['regions', 'layoutRegions'], []) : [])
      .slice(0, config.limits.maxRegions)
      .map((item, index) => normalizeRegion(item, index, config))),
    relationships: dedupeById((Array.isArray(merged.relationships) ? merged.relationships : [])
      .slice(0, config.limits.maxRelationships)
      .map((item, index) => normalizeRelationship(item, index, config))),
    layout: isObject(merged.layout) ? merged.layout : createDefaultTemplateLayout(),
    cameraHints: isObject(pick(merged, ['cameraHints', 'camera'], {})) ? pick(merged, ['cameraHints', 'camera'], {}) : fallback.cameraHints,
    environmentHints: isObject(pick(merged, ['environmentHints', 'environment'], {})) ? pick(merged, ['environmentHints', 'environment'], {}) : fallback.environmentHints,
    timelineHints: isObject(pick(merged, ['timelineHints', 'timeline'], {})) ? pick(merged, ['timelineHints', 'timeline'], {}) : fallback.timelineHints,
    animationHints: isObject(pick(merged, ['animationHints', 'animation'], {})) ? pick(merged, ['animationHints', 'animation'], {}) : fallback.animationHints,
    interactionHints: isObject(pick(merged, ['interactionHints', 'interaction'], {})) ? pick(merged, ['interactionHints', 'interaction'], {}) : fallback.interactionHints,
    assetHints: isObject(pick(merged, ['assetHints', 'assets'], {})) ? pick(merged, ['assetHints', 'assets'], {}) : fallback.assetHints,
    accessibility: isObject(pick(merged, ['accessibility', 'a11y'], {})) ? pick(merged, ['accessibility', 'a11y'], {}) : createDefaultTemplateAccessibility(),
    performance: isObject(pick(merged, ['performance', 'performanceHints'], {})) ? pick(merged, ['performance', 'performanceHints'], {}) : createDefaultTemplatePerformance(),
    constraints: Array.isArray(merged.constraints) ? merged.constraints : [],
    variables: dedupeById((Array.isArray(merged.variables) ? merged.variables : [])
      .slice(0, config.limits.maxVariables)
      .map((item, index) => normalizeVariable(item, index, config))),
    defaults: isObject(merged.defaults) ? merged.defaults : {},
    conditions: dedupeById((Array.isArray(merged.conditions) ? merged.conditions : [])
      .slice(0, config.limits.maxConditions)
      .map((item, index) => normalizeCondition(item, index, config))),
    extensionPoints: dedupeById((Array.isArray(merged.extensionPoints) ? merged.extensionPoints : [])
      .slice(0, config.limits.maxArrayLength)
      .map((item, index) => normalizeExtensionPoint(item, index, config))),
    metadata: isObject(merged.metadata) ? merged.metadata : {},
    extensions: {
      ...(isObject(merged.extensions) ? merged.extensions : {}),
      unknownProperties
    },
    validation: isObject(merged.validation) ? merged.validation : { status: 'unknown', errors: [], warnings: [], repairable: true },
    diagnostics: isObject(merged.diagnostics) ? merged.diagnostics : {}
  };

  return normalized;
}
