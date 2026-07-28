import {
  EDUCATIONAL_OBJECT_GENERATOR_VERSION,
  resolveEducationalObjectGenerationConfig,
  stableHash,
  stableSortByKey
} from './EducationalObjectGenerationConfig.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeConcept(concept = {}, index = 0) {
  const source = toObject(concept);
  return {
    conceptId: String(source.id || source.conceptId || `concept-${index + 1}`),
    label: String(source.label || source.name || source.title || `Concept ${index + 1}`),
    importance: Math.max(0, Math.min(1, toNumber(source.importance, source.weight ?? 0.5))),
    role: String(source.role || source.semanticRole || (index === 0 ? 'primary-concept' : 'supporting-concept')),
    metadata: toObject(source.metadata)
  };
}

function normalizeRelationship(relationship = {}, index = 0) {
  const source = toObject(relationship);
  return {
    relationId: String(source.id || source.relationId || `relationship-${index + 1}`),
    sourceConceptId: String(source.sourceConceptId || source.sourceId || source.from || ''),
    targetConceptId: String(source.targetConceptId || source.targetId || source.to || ''),
    relation: String(source.relation || source.type || 'related-to'),
    required: source.required === true,
    weight: Math.max(0, toNumber(source.weight, 1)),
    metadata: toObject(source.metadata)
  };
}

function conceptFingerprint(concepts = []) {
  return stableHash(JSON.stringify(concepts.map((item) => [item.conceptId, item.importance, item.role])));
}

export function createEducationalObjectBlueprint(context = {}, options = {}) {
  const config = resolveEducationalObjectGenerationConfig(context, options);
  const concepts = stableSortByKey(toArray(context.concepts).map(normalizeConcept), 'conceptId');
  const relationships = stableSortByKey(toArray(context.relationships).map(normalizeRelationship), 'relationId');
  const selectedCapabilities = stableSortByKey(
    toArray(context.selectedCapabilities).map((item, index) => ({
      id: String(item?.id || item?.capabilityId || `capability-${index + 1}`),
      role: String(item?.role || (index === 0 ? 'primary' : 'supporting')),
      required: item?.required !== false
    })),
    'id'
  );

  const slotBindings = stableSortByKey(toArray(context.slotBindings).map((binding, index) => ({
    slotId: String(binding?.slotId || binding?.id || `slot-${index + 1}`),
    regionId: String(binding?.regionId || ''),
    required: binding?.required !== false,
    priority: Number(binding?.priority || index + 1)
  })), 'slotId');

  const regionBindings = stableSortByKey(toArray(context.regionBindings).map((binding, index) => ({
    regionId: String(binding?.regionId || binding?.id || `region-${index + 1}`),
    capacity: Math.max(1, Number(binding?.capacity || 1)),
    priority: Number(binding?.priority || index + 1)
  })), 'regionId');

  const conceptCount = Math.max(1, concepts.length || 1);
  const relationshipDensity = conceptCount > 1
    ? Math.min(1, relationships.length / (conceptCount * (conceptCount - 1)))
    : 0;

  const capabilityPlan = {
    selectedCapabilities,
    composition: toObject(context.capabilityComposition),
    coverageTarget: selectedCapabilities.length ? 1 : 0.7
  };

  const objectBudget = Math.max(
    1,
    Math.min(
      config.maximumObjects,
      Math.max(
        conceptCount,
        Math.ceil(conceptCount + relationships.length * 0.4 + Math.max(0, (toArray(context.orderedSteps).length - conceptCount) * 0.25))
      )
    )
  );

  const fingerprint = stableHash(JSON.stringify({
    concepts: concepts.map((item) => [item.conceptId, item.importance, item.role]),
    relationships: relationships.map((item) => [item.sourceConceptId, item.targetConceptId, item.relation, item.required]),
    slotBindings,
    regionBindings,
    selectedCapabilities,
    performanceProfile: config.profile,
    accessibilityNeeds: toObject(context.accessibilityNeeds),
    runtimeCapabilities: config.runtimeCapabilities,
    sceneConstraints: toObject(context.sceneConstraints),
    deterministicSeed: options.deterministicSeed || ''
  }));

  const confidence = Math.max(0.2, Math.min(1,
    0.4
    + (conceptCount > 0 ? 0.2 : 0)
    + (relationships.length > 0 ? 0.1 : 0)
    + (selectedCapabilities.length > 0 ? 0.1 : 0)
    + (slotBindings.length > 0 || regionBindings.length > 0 ? 0.1 : 0)
    + (context.classification ? 0.1 : 0)
  ));

  return {
    blueprintId: `educational-object-blueprint-${fingerprint}`,
    conceptPlan: {
      concepts,
      conceptCount,
      primaryConceptIds: concepts.filter((item) => item.role.includes('primary') || item.importance >= 0.7).map((item) => item.conceptId),
      fingerprint: conceptFingerprint(concepts)
    },
    relationshipPlan: {
      relationships,
      relationshipCount: relationships.length,
      density: relationshipDensity,
      requiredRelationshipIds: relationships.filter((item) => item.required).map((item) => item.relationId)
    },
    capabilityPlan,
    slotPlan: {
      bindings: slotBindings,
      requiredSlotCount: slotBindings.filter((item) => item.required).length
    },
    regionPlan: {
      bindings: regionBindings,
      totalCapacity: regionBindings.reduce((sum, item) => sum + Math.max(1, Number(item.capacity || 1)), 0)
    },
    representationPlan: {
      preferredDimensionality: String(context.visualizationRequirements?.dimensionality || 'adaptive'),
      preferredAbstraction: String(context.visualizationRequirements?.abstractionLevel || 'balanced'),
      fidelityTarget: config.profile === 'low' ? 'low' : config.profile === 'high' ? 'high' : 'balanced'
    },
    spatialPlan: {
      interactionDepth: String(context.interactionRequirements?.depth || context.interactionRequirements?.interactionDepth || 'light'),
      arrangement: relationships.length > conceptCount ? 'connected' : 'clustered'
    },
    temporalPlan: {
      orderedStepCount: toArray(context.orderedSteps).length,
      timelineRequirementCount: toArray(context.timelineRequirements).length
    },
    interactionPlan: {
      interactionRequirementCount: toArray(context.interactionRequirements).length,
      requiresKeyboardFlow: context.accessibilityNeeds?.keyboardCompatible !== false
    },
    accessibilityPlan: {
      needs: toObject(context.accessibilityNeeds),
      reducedMotionCompatible: context.accessibilityNeeds?.reducedMotionCompatible !== false,
      highContrastCompatible: context.accessibilityNeeds?.highContrastCompatible !== false,
      textAlternativeRequired: context.accessibilityNeeds?.textAlternativeRequired !== false
    },
    performancePlan: {
      profile: config.profile,
      maximumObjects: config.maximumObjects,
      runtimeCapabilities: config.runtimeCapabilities
    },
    objectBudget,
    confidence: Number(confidence.toFixed(6)),
    metadata: {
      generatorVersion: EDUCATIONAL_OBJECT_GENERATOR_VERSION,
      generationFingerprint: fingerprint,
      classificationFingerprint: stableHash(JSON.stringify(toObject(context.classification))),
      capabilityFingerprint: stableHash(JSON.stringify(selectedCapabilities)),
      requirementFingerprint: stableHash(JSON.stringify(toObject(context.visualizationRequirements))),
      source: 'procedural-blueprint'
    }
  };
}
