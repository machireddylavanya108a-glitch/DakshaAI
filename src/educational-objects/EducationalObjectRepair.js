import { EDUCATIONAL_OBJECT_LATEST_VERSION, normalizeEducationalObjectConfig } from './EducationalObjectConfig.js';
import {
  createAdaptiveFallbackEducationalObject,
  createDefaultObjectAccessibility,
  createDefaultObjectPerformance,
  createDefaultObjectRepresentation
} from './EducationalObjectSchema.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stableHash(input = '') {
  const text = String(input || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function deterministicObjectId(source = {}) {
  const seed = JSON.stringify({
    name: source.name || '',
    kind: source.kind || 'generic-educational-object',
    semanticRole: source.semanticRole || 'adaptive-role',
    learningPurpose: source.learningPurpose || 'inspect'
  });
  return `educational-object-${stableHash(seed)}`;
}

export function repairEducationalObject(input = {}, validation = null, options = {}) {
  const config = normalizeEducationalObjectConfig(options);
  const fallback = createAdaptiveFallbackEducationalObject();
  const source = toObject(input);
  const notes = [];

  const repaired = {
    ...fallback,
    ...source,
    objectId: source.objectId || deterministicObjectId(source),
    id: source.id || source.objectId || deterministicObjectId(source),
    version: source.version || EDUCATIONAL_OBJECT_LATEST_VERSION,
    name: source.name || 'Adaptive Educational Object',
    kind: source.kind || source.type || 'generic-educational-object',
    semanticRole: source.semanticRole || 'adaptive-role',
    learningPurpose: source.learningPurpose || 'inspect',
    representation: toObject(source.representation),
    accessibility: toObject(source.accessibility),
    performance: toObject(source.performance),
    conceptReferences: toArray(source.conceptReferences),
    relationshipReferences: toArray(source.relationshipReferences),
    capabilityReferences: toArray(source.capabilityReferences),
    templateBindings: toArray(source.templateBindings),
    labels: toArray(source.labels),
    constraints: toArray(source.constraints),
    variables: toArray(source.variables),
    conditions: toArray(source.conditions),
    behaviorHints: toArray(source.behaviorHints),
    state: toObject(source.state),
    data: toObject(source.data),
    extensions: toObject(source.extensions)
  };

  repaired.id = repaired.objectId;

  if (!source.objectId && !source.id) notes.push('Generated missing objectId.');
  if (!source.version) notes.push('Inserted latest object version.');
  if (!source.name) notes.push('Inserted adaptive object name.');
  if (!source.kind && !source.type) notes.push('Inserted generic object kind.');
  if (!source.semanticRole) notes.push('Inserted adaptive semantic role.');
  if (!source.learningPurpose) notes.push('Inserted adaptive learning purpose.');

  if (!Object.keys(repaired.representation).length) {
    repaired.representation = createDefaultObjectRepresentation();
    notes.push('Inserted default representation.');
  }

  if (!Object.keys(repaired.accessibility).length) {
    repaired.accessibility = createDefaultObjectAccessibility();
    notes.push('Inserted default accessibility.');
  }

  if (!Object.keys(repaired.performance).length) {
    repaired.performance = createDefaultObjectPerformance();
    notes.push('Inserted default performance.');
  }

  repaired.performance.geometryBudget = Math.max(0, Math.min(5000, Number(repaired.performance.geometryBudget || 8)));
  repaired.performance.materialBudget = Math.max(0, Math.min(5000, Number(repaired.performance.materialBudget || 6)));
  repaired.performance.textureBudget = Math.max(0, Math.min(5000, Number(repaired.performance.textureBudget || 6)));
  repaired.performance.animationBudget = Math.max(0, Math.min(5000, Number(repaired.performance.animationBudget || 4)));
  repaired.performance.interactionBudget = Math.max(0, Math.min(5000, Number(repaired.performance.interactionBudget || 4)));

  repaired.labels = repaired.labels.slice(0, config.limits.maxLabels).map((label, index) => ({
    id: String(label?.id || `label-${index + 1}`),
    text: String(label?.text || label?.shortText || `Label ${index + 1}`).slice(0, 240),
    shortText: String(label?.shortText || '').slice(0, 120),
    description: String(label?.description || '').slice(0, 500),
    targetObjectId: String(label?.targetObjectId || repaired.objectId),
    priority: Number.isFinite(Number(label?.priority)) ? Number(label.priority) : index + 1,
    visibility: label?.visibility !== false,
    readingOrder: Number.isFinite(Number(label?.readingOrder)) ? Number(label.readingOrder) : index + 1,
    language: String(label?.language || 'en').slice(0, 20),
    metadata: toObject(label?.metadata)
  }));

  const dedupe = (list, key) => {
    const seen = new Set();
    return list.filter((item) => {
      const id = String(item?.[key] || '');
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  repaired.variables = dedupe(repaired.variables.slice(0, config.limits.maxVariables), 'id');
  repaired.conditions = dedupe(repaired.conditions.slice(0, config.limits.maxConditions), 'id');

  const objectIdSet = new Set([repaired.objectId]);
  repaired.relationshipReferences = repaired.relationshipReferences.slice(0, config.limits.maxRelationshipReferences)
    .filter((item) => {
      const sourceId = String(item?.sourceObjectId || '');
      const targetId = String(item?.targetObjectId || '');
      if (sourceId && targetId && sourceId === targetId) {
        notes.push(`Removed self relationship ${item?.relationId || 'unknown'}.`);
        return false;
      }
      if (item?.required && ((sourceId && !objectIdSet.has(sourceId)) || (targetId && !objectIdSet.has(targetId)))) {
        notes.push(`Required relationship ${item?.relationId || 'unknown'} unresolved.`);
      }
      return true;
    });

  repaired.validation = {
    status: validation?.valid === false ? 'repaired' : 'valid',
    errors: [...(validation?.errors || [])],
    warnings: [...(validation?.warnings || []), ...notes],
    repairable: true
  };

  repaired.diagnostics = {
    ...toObject(repaired.diagnostics),
    repairCount: notes.length,
    notes: [...toArray(repaired.diagnostics?.notes), ...notes]
  };

  return clone(repaired);
}
