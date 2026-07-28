import {
  VISUALIZATION_TEMPLATE_GENERATOR_VERSION,
  resolveGenerationConfig,
  stableHash
} from './VisualizationTemplateGenerationConfig.js';

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

function relationshipDensity(concepts = [], relationships = []) {
  const c = Math.max(1, count(concepts));
  const r = count(relationships);
  return Number((r / c).toFixed(6));
}

function deriveSemanticPurpose(context = {}) {
  const preferred = Array.isArray(context.visualizationRequirements?.preferredCapabilities)
    ? context.visualizationRequirements.preferredCapabilities
    : [];
  if (preferred.length) return String(preferred[0] || 'adaptive-purpose');
  const capability = (context.selectedCapabilities || [])[0];
  return String(capability?.semanticPurpose || capability?.id || 'adaptive-purpose');
}

function deriveStructureFlags(context = {}) {
  const conceptCount = count(context.concepts);
  const relationshipCount = count(context.relationships);
  const orderedStepsCount = count(context.orderedSteps || context.timelineRequirements);
  const depthHint = Number(context.sceneConstraints?.containmentDepth || context.sceneConstraints?.nestingDepth || 0);

  return {
    conceptCount,
    relationshipCount,
    orderedStepsCount,
    relationshipDensity: relationshipDensity(context.concepts, context.relationships),
    containmentDepth: Number.isFinite(depthHint) ? depthHint : 0,
    interactionDepth: normalizeToken(context.interactionRequirements?.depth || 'light')
  };
}

export function createVisualizationTemplateBlueprint(context = {}, options = {}) {
  const config = resolveGenerationConfig(context, options);
  const structure = deriveStructureFlags(context);
  const semanticPurpose = deriveSemanticPurpose(context);
  const selectedCapabilities = Array.isArray(context.selectedCapabilities) ? context.selectedCapabilities : [];

  const fingerprintPayload = {
    semanticPurpose,
    selectedCapabilityIds: selectedCapabilities.map((item) => item?.id || item?.capabilityId || ''),
    classification: context.classification || {},
    requirements: context.visualizationRequirements || {},
    accessibilityNeeds: context.accessibilityNeeds || {},
    performanceProfile: config.profile,
    runtimeCapabilities: config.runtimeCapabilities,
    structure
  };

  const blueprintId = `template-blueprint-${stableHash(JSON.stringify(fingerprintPayload))}`;

  return {
    blueprintId,
    semanticPurpose,
    capabilityPlan: {
      selectedCapabilities: selectedCapabilities.map((item) => ({
        id: item?.id || item?.capabilityId || 'unknown-capability',
        role: item?.role || 'supporting',
        required: item?.required === true
      })),
      composition: context.capabilityComposition || {}
    },
    conceptPlan: {
      concepts: (context.concepts || []).map((item, index) => ({
        id: item?.id || `concept-${index + 1}`,
        type: item?.type || 'concept-node',
        importance: Number(item?.importance || (index === 0 ? 1 : 0.6))
      })),
      conceptCount: structure.conceptCount
    },
    relationshipPlan: {
      relationships: (context.relationships || []).map((item, index) => ({
        id: item?.id || `relationship-${index + 1}`,
        sourceId: item?.sourceId || item?.from || null,
        targetId: item?.targetId || item?.to || null,
        relation: item?.relation || item?.type || 'related-to',
        required: item?.required === true
      })),
      relationshipCount: structure.relationshipCount,
      density: structure.relationshipDensity
    },
    layoutPlan: {
      intentHint: context.visualizationRequirements?.layoutIntent || 'adaptive',
      orderingRequired: structure.orderedStepsCount > 0,
      containmentDepth: structure.containmentDepth,
      interactionDepth: structure.interactionDepth
    },
    slotPlan: {
      maximumSlots: config.maximumSlots,
      orderedStepsCount: structure.orderedStepsCount
    },
    regionPlan: {
      maximumRegions: config.maximumRegions,
      readingOrderRequired: true
    },
    timelinePlan: {
      stepCount: structure.orderedStepsCount,
      timelineRequired: structure.orderedStepsCount > 0
    },
    interactionPlan: {
      depth: structure.interactionDepth,
      requirements: context.interactionRequirements || {}
    },
    accessibilityPlan: {
      needs: context.accessibilityNeeds || {},
      keyboardNavigation: context.accessibilityNeeds?.keyboardCompatible !== false,
      reducedMotion: context.accessibilityNeeds?.reducedMotionCompatible !== false,
      highContrast: context.accessibilityNeeds?.highContrastCompatible !== false
    },
    performancePlan: {
      profile: config.profile,
      limits: {
        maximumSlots: config.maximumSlots,
        maximumRegions: config.maximumRegions,
        maximumRelationships: config.maximumRelationships
      }
    },
    constraints: context.sceneConstraints || {},
    complexityBudget: {
      maxTemplateComplexity: Number(context.sceneConstraints?.complexityBudget?.maxTemplateComplexity || (config.maximumSlots + config.maximumRegions)),
      maxSlots: config.maximumSlots,
      maxRegions: config.maximumRegions,
      maxRelationships: config.maximumRelationships
    },
    confidence: Number(context.metadata?.confidence || 0.6),
    metadata: {
      source: 'procedural-blueprint',
      generatorVersion: VISUALIZATION_TEMPLATE_GENERATOR_VERSION,
      performanceProfile: config.profile,
      generationFingerprint: stableHash(JSON.stringify(fingerprintPayload))
    }
  };
}
