import { EDUCATIONAL_OBJECT_LATEST_VERSION, normalizeEducationalObjectConfig } from './EducationalObjectConfig.js';
import {
  createAdaptiveFallbackEducationalObject,
  createDefaultObjectAccessibility,
  createDefaultObjectPerformance,
  createDefaultObjectRepresentation
} from './EducationalObjectSchema.js';

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

function cleanValue(value, config, depth = 0, seen = new WeakSet()) {
  if (depth > config.limits.maxNestingDepth) return '[depth-limit]';
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (typeof value === 'bigint') return Number(value);

  if (typeof value === 'string') {
    const text = sanitizeString(value, config.limits.maxStringLength);
    if (text.toLowerCase().startsWith('javascript:')) return '';
    if (text.toLowerCase().startsWith('data:text/html')) return '';
    return text;
  }

  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
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

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function dedupeByKey(list = [], key = 'id') {
  const seen = new Set();
  const output = [];
  for (const item of list) {
    const token = String(item?.[key] || JSON.stringify(item));
    if (seen.has(token)) continue;
    seen.add(token);
    output.push(item);
  }
  return output;
}

function pick(source, keys, fallback = undefined) {
  for (const key of keys) {
    if (source && Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      return source[key];
    }
  }
  return fallback;
}

function normalizeReference(raw = {}, config, index = 0, type = 'reference') {
  const source = isObject(raw) ? raw : {};
  const idKey = type === 'concept'
    ? 'conceptId'
    : type === 'relationship'
      ? 'relationId'
      : type === 'capability'
        ? 'capabilityId'
        : 'id';

  const id = sanitizeIdentifier(source[idKey] || source.id || `${type}-${index + 1}`, config);

  if (type === 'concept') {
    return {
      referenceId: sanitizeIdentifier(source.referenceId || `concept-ref-${index + 1}`, config),
      conceptId: id,
      role: sanitizeString(source.role || 'supporting', 120),
      importance: clampNumber(source.importance, 0, 1, 0.5),
      confidence: clampNumber(source.confidence, 0, 1, 0.6),
      metadata: isObject(source.metadata) ? source.metadata : {}
    };
  }

  if (type === 'relationship') {
    return {
      relationId: sanitizeIdentifier(source.relationId || source.id || `relation-${index + 1}`, config),
      sourceObjectId: sanitizeIdentifier(source.sourceObjectId || source.sourceId || source.from || '', config),
      targetObjectId: sanitizeIdentifier(source.targetObjectId || source.targetId || source.to || '', config),
      relation: sanitizeString(source.relation || source.type || 'related-to', 120),
      direction: sanitizeString(source.direction || 'directed', 40),
      weight: clampNumber(source.weight, 0, 1000, 1),
      required: source.required === true,
      timelineDependency: source.timelineDependency || null,
      interactionDependency: source.interactionDependency || null,
      metadata: isObject(source.metadata) ? source.metadata : {}
    };
  }

  if (type === 'capability') {
    return {
      capabilityId: id,
      role: sanitizeString(source.role || 'supporting', 120),
      required: source.required === true,
      priority: clampNumber(source.priority, 0, 1000, index + 1),
      overrides: isObject(source.overrides) ? source.overrides : {},
      metadata: isObject(source.metadata) ? source.metadata : {}
    };
  }

  if (type === 'binding') {
    return {
      templateId: sanitizeIdentifier(source.templateId || '', config),
      templateInstanceId: sanitizeIdentifier(source.templateInstanceId || '', config),
      slotId: sanitizeIdentifier(source.slotId || '', config),
      regionId: sanitizeIdentifier(source.regionId || '', config),
      role: sanitizeString(source.role || source.layoutRole || source.capabilityRole || 'binding', 120),
      priority: clampNumber(source.priority, 0, 1000, index + 1),
      constraints: toArray(source.constraints),
      metadata: isObject(source.metadata) ? source.metadata : {}
    };
  }

  return {
    id,
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

export function normalizeEducationalObject(input = {}, options = {}) {
  const config = normalizeEducationalObjectConfig(options);
  const cleaned = cleanValue(input, config) || {};
  const source = isObject(cleaned) ? cleaned : {};
  const fallback = createAdaptiveFallbackEducationalObject();

  const aliasObject = pick(source, ['sceneObject', 'educationalObject', 'object', 'model', 'mesh'], {});
  const merged = {
    ...(isObject(aliasObject) ? aliasObject : {}),
    ...source
  };

  const knownKeys = new Set([
    'objectId', 'object_id', 'id', 'version', 'name', 'description', 'kind', 'objectType', 'object_type', 'type', 'category', 'semanticRole',
    'semantic_role', 'learningPurpose', 'learning_purpose', 'source', 'status', 'conceptReferences', 'concept_refs', 'relationshipReferences',
    'relationship_refs', 'capabilityReferences', 'capability_refs', 'templateBindings', 'template_binding', 'representation', 'geometryHints',
    'geometry', 'visualProperties', 'visual', 'spatialProperties', 'spatial', 'temporalProperties', 'temporal', 'animationHints', 'animation',
    'interactionHints', 'interaction', 'behaviorHints', 'behavior', 'state', 'data', 'labels', 'label', 'narration', 'accessibility', 'a11y',
    'performance', 'perf', 'assetHints', 'assets', 'constraints', 'variables', 'conditions', 'lifecycle', 'ownership', 'metadata', 'extensions',
    'validation', 'diagnostics'
  ]);

  const unknownProperties = Object.create(null);
  for (const [key, value] of Object.entries(merged)) {
    if (!knownKeys.has(key)) unknownProperties[key] = value;
  }

  const objectId = sanitizeIdentifier(pick(merged, ['objectId', 'object_id', 'id'], ''), config);
  const version = sanitizeString(pick(merged, ['version'], EDUCATIONAL_OBJECT_LATEST_VERSION), 40);

  const normalized = {
    objectId,
    id: objectId,
    version,
    name: sanitizeString(pick(merged, ['name', 'label', 'title'], fallback.name), 240),
    description: sanitizeString(pick(merged, ['description'], fallback.description), config.limits.maxStringLength),
    kind: sanitizeString(pick(merged, ['kind', 'objectType', 'object_type', 'type', 'category'], fallback.kind), 160),
    semanticRole: sanitizeString(pick(merged, ['semanticRole', 'semantic_role'], fallback.semanticRole), 160),
    learningPurpose: sanitizeString(pick(merged, ['learningPurpose', 'learning_purpose'], fallback.learningPurpose), 160),
    source: sanitizeString(pick(merged, ['source'], fallback.source), 120),
    status: sanitizeString(pick(merged, ['status'], fallback.status), 80),
    conceptReferences: dedupeByKey(toArray(pick(merged, ['conceptReferences', 'concept_refs'], [])).slice(0, config.limits.maxConceptReferences)
      .map((item, index) => normalizeReference(item, config, index, 'concept')), 'referenceId'),
    relationshipReferences: dedupeByKey(toArray(pick(merged, ['relationshipReferences', 'relationship_refs'], [])).slice(0, config.limits.maxRelationshipReferences)
      .map((item, index) => normalizeReference(item, config, index, 'relationship')), 'relationId'),
    capabilityReferences: dedupeByKey(toArray(pick(merged, ['capabilityReferences', 'capability_refs'], [])).slice(0, config.limits.maxCapabilityReferences)
      .map((item, index) => normalizeReference(item, config, index, 'capability')), 'capabilityId'),
    templateBindings: dedupeByKey(toArray(pick(merged, ['templateBindings', 'template_binding'], [])).slice(0, config.limits.maxTemplateBindings)
      .map((item, index) => normalizeReference(item, config, index, 'binding')), 'slotId'),
    representation: isObject(merged.representation) ? merged.representation : createDefaultObjectRepresentation(),
    geometryHints: isObject(pick(merged, ['geometryHints', 'geometry'], {})) ? pick(merged, ['geometryHints', 'geometry'], {}) : {},
    visualProperties: isObject(pick(merged, ['visualProperties', 'visual'], {})) ? pick(merged, ['visualProperties', 'visual'], {}) : {},
    spatialProperties: isObject(pick(merged, ['spatialProperties', 'spatial'], {})) ? pick(merged, ['spatialProperties', 'spatial'], {}) : {},
    temporalProperties: isObject(pick(merged, ['temporalProperties', 'temporal'], {})) ? pick(merged, ['temporalProperties', 'temporal'], {}) : {},
    animationHints: isObject(pick(merged, ['animationHints', 'animation'], {})) ? pick(merged, ['animationHints', 'animation'], {}) : {},
    interactionHints: isObject(pick(merged, ['interactionHints', 'interaction'], {})) ? pick(merged, ['interactionHints', 'interaction'], {}) : {},
    behaviorHints: toArray(pick(merged, ['behaviorHints', 'behavior'], [])),
    state: isObject(merged.state) ? merged.state : {},
    data: isObject(merged.data) ? merged.data : {},
    labels: dedupeByKey(toArray(merged.labels || (merged.label ? [merged.label] : [])).slice(0, config.limits.maxLabels)
      .map((item, index) => {
        const sourceLabel = isObject(item) ? item : { text: String(item || '') };
        return {
          id: sanitizeIdentifier(sourceLabel.id || `label-${index + 1}`, config),
          text: sanitizeString(sourceLabel.text || sourceLabel.label || `Label ${index + 1}`, 240),
          shortText: sanitizeString(sourceLabel.shortText || sourceLabel.text || '', 120),
          description: sanitizeString(sourceLabel.description || '', 500),
          targetObjectId: sanitizeIdentifier(sourceLabel.targetObjectId || objectId || '', config),
          priority: clampNumber(sourceLabel.priority, 0, 1000, index + 1),
          visibility: sourceLabel.visibility !== false,
          readingOrder: clampNumber(sourceLabel.readingOrder, 0, 1000, index + 1),
          language: sanitizeString(sourceLabel.language || 'en', 20),
          metadata: isObject(sourceLabel.metadata) ? sourceLabel.metadata : {}
        };
      }), 'id'),
    narration: isObject(merged.narration) ? merged.narration : {},
    accessibility: isObject(pick(merged, ['accessibility', 'a11y'], {})) ? pick(merged, ['accessibility', 'a11y'], {}) : createDefaultObjectAccessibility(),
    performance: isObject(pick(merged, ['performance', 'perf'], {})) ? pick(merged, ['performance', 'perf'], {}) : createDefaultObjectPerformance(),
    assetHints: isObject(pick(merged, ['assetHints', 'assets'], {})) ? pick(merged, ['assetHints', 'assets'], {}) : {},
    constraints: toArray(merged.constraints),
    variables: dedupeByKey(toArray(merged.variables).slice(0, config.limits.maxVariables), 'id'),
    conditions: dedupeByKey(toArray(merged.conditions).slice(0, config.limits.maxConditions), 'id'),
    lifecycle: isObject(merged.lifecycle) ? merged.lifecycle : {},
    ownership: isObject(merged.ownership) ? merged.ownership : {},
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
