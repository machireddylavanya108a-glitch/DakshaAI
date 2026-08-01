import {
  analyzeVisualizationRequirements,
  matchVisualizationCapabilities,
  composeVisualizationCapabilities,
  defaultVisualizationCapabilityRegistry
} from '../visualization-capabilities/index.js';
import {
  selectVisualizationTemplate,
  defaultVisualizationTemplateRegistry
} from '../visualization-templates/index.js';
import { normalizeVisualizationStrategyProfile } from '../visualization-strategy/index.js';
import { normalizeIntentOutput } from '../intent-analysis/index.js';

const STORE_KEY = '__daksha_capability_template_recommendation_store__';
const RECOMMENDATION_SCHEMA_VERSION = 'v2';
const DEFAULT_PERSISTENCE_KEY = 'daksha.universal.capability.template.recommendation.v2';

function safeString(value) {
  return String(value || '').trim();
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clamp(value, minimum = 0, maximum = 1) {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : minimum;
  return Math.min(Math.max(safe, minimum), maximum);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parsePayload(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return isObject(value) ? value : null;
}

function createInMemoryStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }

  const store = globalThis[STORE_KEY];
  return {
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    getItem(key) {
      return store.get(String(key)) || null;
    },
    removeItem(key) {
      store.delete(String(key));
    }
  };
}

function createDefaultPersistenceAdapter() {
  const local = globalThis?.localStorage;
  if (local && typeof local.getItem === 'function' && typeof local.setItem === 'function') {
    return local;
  }

  return createInMemoryStore();
}

function hashKey(input = '') {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function normalizeCapabilityEntry(entry = {}) {
  const source = isObject(entry) ? entry : {};
  return {
    id: safeString(source.id || source.capabilityId || 'capability-unknown'),
    name: safeString(source.name || source.id || source.capabilityId || 'Unknown Capability'),
    semanticPurpose: safeString(source.semanticPurpose || 'adaptive-purpose'),
    confidence: clamp(source.confidence, 0, 1),
    score: Number.isFinite(Number(source.score)) ? Number(source.score) : 0,
    source: safeString(source.source || 'runtime') || 'runtime',
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function normalizeTemplateEntry(entry = {}) {
  const source = isObject(entry) ? entry : {};
  return {
    templateId: safeString(source.templateId || source.id || 'template-unknown'),
    version: safeString(source.version || 'v1'),
    semanticPurpose: safeString(source.semanticPurpose || 'adaptive-purpose'),
    confidence: clamp(source.confidence, 0, 1),
    score: Number.isFinite(Number(source.score)) ? Number(source.score) : 0,
    source: safeString(source.source || 'runtime') || 'runtime',
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function normalizeCapabilities(list = []) {
  return asArray(list)
    .map((entry) => normalizeCapabilityEntry(entry))
    .filter((entry, index, all) => all.findIndex((item) => item.id === entry.id) === index)
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.id.localeCompare(b.id));
}

function normalizeTemplates(list = []) {
  return asArray(list)
    .map((entry) => normalizeTemplateEntry(entry))
    .filter((entry, index, all) => all.findIndex((item) => `${item.templateId}:${item.version}` === `${entry.templateId}:${entry.version}`) === index)
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.templateId.localeCompare(b.templateId));
}

function normalizeEducationalObjectRequirements(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    objectCountHint: Math.max(1, Number(source.objectCountHint || 1)),
    objectTypes: asArray(source.objectTypes).map((item) => safeString(item)).filter(Boolean),
    requiresHierarchy: source.requiresHierarchy === true,
    requiresRelationshipEdges: source.requiresRelationshipEdges === true,
    supportsUnknownObjectTypes: source.supportsUnknownObjectTypes !== false
  };
}

function normalizeCapabilityChannels(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    animationCapabilities: asArray(source.animationCapabilities).map((item) => safeString(item)).filter(Boolean),
    interactionCapabilities: asArray(source.interactionCapabilities).map((item) => safeString(item)).filter(Boolean),
    simulationCapabilities: asArray(source.simulationCapabilities).map((item) => safeString(item)).filter(Boolean),
    assessmentCapabilities: asArray(source.assessmentCapabilities).map((item) => safeString(item)).filter(Boolean),
    narrationCapabilities: asArray(source.narrationCapabilities).map((item) => safeString(item)).filter(Boolean)
  };
}

function normalizeFallbackStrategy(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    mode: safeString(source.mode || 'template-recommendation'),
    recommendProceduralGeneration: source.recommendProceduralGeneration === true,
    reason: safeString(source.reason || ''),
    fallbackTemplateId: safeString(source.fallbackTemplateId || ''),
    confidence: clamp(source.confidence, 0, 1),
    supportsUnknownFutureTypes: source.supportsUnknownFutureTypes !== false
  };
}

export function normalizeCapabilityTemplateRecommendation(input = {}) {
  const source = isObject(input) ? input : {};

  const recommendedCapabilities = normalizeCapabilities(source.recommendedCapabilities || source.selectedCapabilities || []);
  const recommendedTemplates = normalizeTemplates(source.recommendedTemplates || source.templates || []);
  const channels = normalizeCapabilityChannels(source);

  return {
    schemaVersion: RECOMMENDATION_SCHEMA_VERSION,
    recommendedCapabilities,
    recommendedTemplates,
    requiredEducationalObjects: normalizeEducationalObjectRequirements(source.requiredEducationalObjects || {}),
    animationCapabilities: channels.animationCapabilities,
    interactionCapabilities: channels.interactionCapabilities,
    simulationCapabilities: channels.simulationCapabilities,
    assessmentCapabilities: channels.assessmentCapabilities,
    narrationCapabilities: channels.narrationCapabilities,
    confidenceScore: clamp(source.confidenceScore, 0, 1),
    fallbackStrategy: normalizeFallbackStrategy(source.fallbackStrategy || {}),
    diagnostics: isObject(source.diagnostics) ? source.diagnostics : {},
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

export function migrateCapabilityTemplateRecommendation(input = {}) {
  const source = isObject(input) ? input : {};

  if (source.schemaVersion === RECOMMENDATION_SCHEMA_VERSION) {
    return normalizeCapabilityTemplateRecommendation(source);
  }

  const legacyCapabilities = asArray(source.capabilities || source.selectedCapabilities).map((entry) => ({
    ...entry,
    score: Number(entry?.score || 0),
    confidence: Number(entry?.confidence || 0.5)
  }));

  const legacyTemplates = asArray(source.templates || source.recommendedTemplates).map((entry) => ({
    ...entry,
    score: Number(entry?.score || 0),
    confidence: Number(entry?.confidence || 0.5)
  }));

  return normalizeCapabilityTemplateRecommendation({
    schemaVersion: RECOMMENDATION_SCHEMA_VERSION,
    recommendedCapabilities: legacyCapabilities,
    recommendedTemplates: legacyTemplates,
    requiredEducationalObjects: source.requiredEducationalObjects || {
      objectCountHint: Number(source.objectCountHint || 1),
      objectTypes: asArray(source.objectTypes || []),
      supportsUnknownObjectTypes: true
    },
    animationCapabilities: source.animationCapabilities || [],
    interactionCapabilities: source.interactionCapabilities || [],
    simulationCapabilities: source.simulationCapabilities || [],
    assessmentCapabilities: source.assessmentCapabilities || [],
    narrationCapabilities: source.narrationCapabilities || [],
    confidenceScore: Number(source.confidenceScore || source.confidence || 0.45),
    fallbackStrategy: {
      mode: source?.fallbackStrategy?.mode || 'procedural-generation',
      recommendProceduralGeneration: source?.fallbackStrategy?.recommendProceduralGeneration === true || asArray(legacyTemplates).length === 0,
      reason: source?.fallbackStrategy?.reason || 'legacy-migrated-fallback',
      confidence: Number(source?.fallbackStrategy?.confidence || 0.45),
      supportsUnknownFutureTypes: true
    },
    diagnostics: {
      migrated: true,
      sourceSchemaVersion: safeString(source.schemaVersion || 'legacy') || 'legacy'
    },
    metadata: {
      migrationApplied: true,
      migratedAt: Date.now()
    }
  });
}

function deriveCacheKey(input = {}) {
  const intent = normalizeIntentOutput(input.learningIntent || input.intent || {});
  const strategy = normalizeVisualizationStrategyProfile(input.visualizationStrategy || {});
  const payload = JSON.stringify({
    lesson: input.lessonMetadata || {},
    intent: {
      learningIntent: intent.learningIntent,
      knowledgeDomain: intent.knowledgeDomain,
      reasoningStyle: intent.reasoningStyle
    },
    strategy: {
      style: strategy.primaryStrategy?.visualizationStyle,
      complexity: strategy.primaryStrategy?.sceneComplexity,
      interaction: strategy.primaryStrategy?.interactionLevel
    },
    counts: {
      concepts: asArray(input.concepts).length,
      relationships: asArray(input.relationships).length,
      steps: asArray(input.steps).length,
      timelineEvents: asArray(input.timeline?.events).length,
      sceneNodes: Number(input.sceneGraph?.nodeCount || input.runtimeGraph?.nodeCount || 0)
    }
  });

  return `cap-template-rec-${hashKey(payload)}`;
}

function deriveEducationalObjects(requirements = {}, recommendationInput = {}) {
  const summary = requirements?.contextSummary || {};
  const conceptCount = Math.max(1, Number(summary.conceptCount || asArray(recommendationInput.concepts).length || 1));
  const relationshipCount = Number(summary.relationshipCount || asArray(recommendationInput.relationships).length || 0);

  const typeHints = [];
  if (relationshipCount > 0) typeHints.push('relationship-node');
  if (Number(summary.stepCount || asArray(recommendationInput.steps).length || 0) > 1) typeHints.push('sequence-node');
  if (!typeHints.length) typeHints.push('concept-node');

  return {
    objectCountHint: conceptCount,
    objectTypes: typeHints,
    requiresHierarchy: relationshipCount > 2,
    requiresRelationshipEdges: relationshipCount > 0,
    supportsUnknownObjectTypes: true
  };
}

function extractCapabilityChannels(capabilities = [], strategyProfile = {}) {
  const safeCapabilities = normalizeCapabilities(capabilities);
  const primary = strategyProfile?.primaryStrategy || {};
  const style = safeString(primary.visualizationStyle).toLowerCase();

  const channelFromSemantic = (needle) => safeCapabilities
    .filter((capability) => safeString(capability.semanticPurpose).toLowerCase().includes(needle))
    .map((capability) => capability.id);

  const animationCapabilities = [...new Set([
    ...channelFromSemantic('sequence'),
    ...channelFromSemantic('flow'),
    /animation|timeline|workflow|procedural/.test(style) ? 'adaptive-motion-control' : ''
  ].filter(Boolean))];

  const interactionCapabilities = [...new Set([
    ...channelFromSemantic('interaction'),
    ...channelFromSemantic('relationship'),
    ...channelFromSemantic('comparison'),
    'adaptive-interaction-control'
  ].filter(Boolean))];

  const simulationCapabilities = [...new Set([
    ...channelFromSemantic('simulation'),
    /simulation|virtual laboratory/.test(style) ? 'state-transition-simulation' : ''
  ].filter(Boolean))];

  const assessmentCapabilities = [...new Set([
    ...channelFromSemantic('assessment'),
    'adaptive-checkpoint-assessment'
  ].filter(Boolean))];

  const narrationCapabilities = [...new Set([
    ...channelFromSemantic('narration'),
    ...channelFromSemantic('explain'),
    'adaptive-narration-sync'
  ].filter(Boolean))];

  return {
    animationCapabilities,
    interactionCapabilities,
    simulationCapabilities,
    assessmentCapabilities,
    narrationCapabilities
  };
}

function buildTemplateContext(input = {}, capabilityResolution = {}) {
  const visualizationRequirements = capabilityResolution.visualizationRequirements || {};
  const selectedCapabilities = capabilityResolution.selectedCapabilities || [];
  const capabilityComposition = capabilityResolution.capabilityComposition || {};

  return {
    sceneId: safeString(input.sceneId || input.lessonMetadata?.sceneId || 'scene-recommendation'),
    lessonId: safeString(input.lessonMetadata?.lessonId || input.lessonMetadata?.id || 'lesson-recommendation'),
    classification: {
      visualizationStrategy: normalizeVisualizationStrategyProfile(input.visualizationStrategy || {})
    },
    visualizationRequirements,
    selectedCapabilities,
    capabilityComposition,
    concepts: asArray(input.concepts),
    relationships: asArray(input.relationships),
    timelineRequirements: asArray(input.steps),
    interactionRequirements: asArray(input.interactions),
    accessibilityNeeds: visualizationRequirements.accessibilityNeeds || {},
    performanceProfile: safeString(input.lessonMetadata?.performanceProfile || 'balanced') || 'balanced',
    runtimeCapabilities: isObject(input.runtimeGraph) ? input.runtimeGraph : {},
    sceneConstraints: isObject(input.sceneGraph) ? input.sceneGraph : {},
    metadata: isObject(input.lessonMetadata) ? input.lessonMetadata : {}
  };
}

function deriveRecommendationConfidence(capabilityResolution = {}, templateSelection = {}, strategyProfile = {}) {
  const capabilityConfidence = clamp(capabilityResolution?.diagnostics?.confidence, 0, 1);
  const templateConfidence = clamp(templateSelection?.confidence, 0, 1);
  const strategyConfidence = clamp(strategyProfile?.confidenceScore, 0, 1);

  return clamp((capabilityConfidence * 0.34) + (templateConfidence * 0.36) + (strategyConfidence * 0.3), 0, 1);
}

function buildTemplateRecommendations(templateSelection = {}, limit = 4) {
  const ranked = asArray(templateSelection?.rankedCandidates)
    .map((candidate) => ({
      templateId: safeString(candidate?.template?.templateId || candidate?.registryEntry?.templateId || ''),
      version: safeString(candidate?.template?.version || candidate?.registryEntry?.version || 'v1') || 'v1',
      semanticPurpose: safeString(candidate?.template?.semanticPurpose || 'adaptive-purpose') || 'adaptive-purpose',
      confidence: clamp(candidate?.score?.confidence ?? candidate?.confidence, 0, 1),
      score: Number(candidate?.score?.totalScore || candidate?.score?.normalizedScore || 0),
      source: 'registry-ranking',
      metadata: {
        selected: candidate?.template?.templateId === templateSelection?.selectedTemplate?.templateId,
        unresolvedRequirementCount: asArray(candidate?.unresolvedRequirements).length
      }
    }))
    .filter((entry) => entry.templateId)
    .slice(0, Math.max(1, Number(limit || 4)));

  const selectedTemplate = templateSelection?.selectedTemplate;
  if (selectedTemplate && !ranked.some((entry) => entry.templateId === selectedTemplate.templateId)) {
    ranked.unshift({
      templateId: safeString(selectedTemplate.templateId),
      version: safeString(selectedTemplate.version || 'v1') || 'v1',
      semanticPurpose: safeString(selectedTemplate.semanticPurpose || 'adaptive-purpose'),
      confidence: clamp(templateSelection?.confidence, 0, 1),
      score: Number(templateSelection?.diagnostics?.selectedScore || 0),
      source: templateSelection?.fallbackUsed ? 'fallback-selection' : 'selected-template',
      metadata: {
        selected: true,
        fallbackUsed: templateSelection?.fallbackUsed === true
      }
    });
  }

  return normalizeTemplates(ranked);
}

function buildFallbackStrategy(templateSelection = {}, confidenceScore = 0.5) {
  const fallbackUsed = templateSelection?.fallbackUsed === true;
  const selectedTemplateId = safeString(templateSelection?.selectedTemplate?.templateId);
  const proceduralRecommended = fallbackUsed || !selectedTemplateId || confidenceScore < 0.45;

  return {
    mode: proceduralRecommended ? 'procedural-generation' : 'template-recommendation',
    recommendProceduralGeneration: proceduralRecommended,
    reason: fallbackUsed
      ? safeString(templateSelection?.diagnostics?.fallbackReason || 'template-selection-fallback') || 'template-selection-fallback'
      : (confidenceScore < 0.45 ? 'low-recommendation-confidence' : 'templates-available'),
    fallbackTemplateId: selectedTemplateId,
    confidence: confidenceScore,
    supportsUnknownFutureTypes: true
  };
}

export class UniversalCapabilityTemplateRecommendationEngine {
  constructor(options = {}) {
    this.options = isObject(options) ? options : {};
    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey) || DEFAULT_PERSISTENCE_KEY;
    this.cache = new Map();
    this.diagnostics = {
      analyses: 0,
      cacheHits: 0,
      cacheMisses: 0,
      recoveries: 0,
      warnings: []
    };

    this.recoverCache();
  }

  warn(message = 'Unknown warning') {
    this.diagnostics.warnings.push(safeString(message));
    if (this.diagnostics.warnings.length > 200) {
      this.diagnostics.warnings.shift();
    }
  }

  analyze(input = {}, options = {}) {
    this.diagnostics.analyses += 1;

    const learningIntent = normalizeIntentOutput(input.learningIntent || input.intent || {});
    const visualizationStrategy = normalizeVisualizationStrategyProfile(input.visualizationStrategy || {});
    const cacheKey = deriveCacheKey({
      ...input,
      learningIntent,
      visualizationStrategy
    });

    if (this.cache.has(cacheKey)) {
      this.diagnostics.cacheHits += 1;
      return deepClone(this.cache.get(cacheKey));
    }

    this.diagnostics.cacheMisses += 1;

    const capabilityRegistry = options.capabilityRegistry
      || this.options.capabilityRegistry
      || defaultVisualizationCapabilityRegistry;

    const templateRegistry = options.templateRegistry
      || this.options.templateRegistry
      || defaultVisualizationTemplateRegistry;

    const requirementsInput = {
      concepts: asArray(input.concepts),
      relationships: asArray(input.relationships),
      steps: asArray(input.steps),
      goals: asArray(input.goals || input.lessonMetadata?.goals || []),
      examples: asArray(input.examples),
      performanceProfile: safeString(input.lessonMetadata?.performanceProfile || 'balanced') || 'balanced',
      accessibilityPreferences: {
        textAlternativeRequired: true,
        keyboardCompatible: true,
        reducedMotionCompatible: true,
        highContrastCompatible: true
      },
      learnerContext: isObject(input.lessonMetadata?.learnerContext) ? input.lessonMetadata.learnerContext : {}
    };

    const visualizationRequirements = analyzeVisualizationRequirements(requirementsInput);
    const capabilityMatches = matchVisualizationCapabilities(visualizationRequirements, capabilityRegistry, {
      includeLowScore: true
    });

    const capabilityComposition = composeVisualizationCapabilities(capabilityMatches, visualizationRequirements, {
      maxSupportingCapabilities: options.maxSupportingCapabilities || 3
    });

    const selectedCapabilities = asArray(capabilityComposition.selectedCapabilities);
    const capabilityEntries = normalizeCapabilities(
      selectedCapabilities.map((capability) => {
        const match = capabilityMatches.find((item) => item?.capability?.id === capability.id);
        return {
          ...capability,
          score: Number(match?.score || 0),
          confidence: Number(match?.confidence ?? capability.confidence ?? 0.5)
        };
      })
    );

    const templateContext = buildTemplateContext({
      ...input,
      sceneId: input.sceneGraph?.sceneId || input.lessonMetadata?.sceneId || null,
      concepts: requirementsInput.concepts,
      relationships: requirementsInput.relationships,
      steps: requirementsInput.steps
    }, {
      visualizationRequirements,
      selectedCapabilities,
      capabilityComposition
    });

    const templateSelection = selectVisualizationTemplate(templateContext, {
      registry: templateRegistry,
      cache: options.cache !== false,
      minimumScore: Number.isFinite(Number(options.minimumTemplateScore)) ? Number(options.minimumTemplateScore) : 0,
      maxResults: Math.max(2, Number(options.maxTemplateResults || 6))
    });

    const templateRecommendations = buildTemplateRecommendations(templateSelection, options.maxTemplateRecommendations || 4);
    const confidenceScore = deriveRecommendationConfidence({
      diagnostics: {
        confidence: capabilityEntries.length
          ? capabilityEntries.reduce((sum, item) => sum + item.confidence, 0) / capabilityEntries.length
          : visualizationRequirements.confidence
      }
    }, templateSelection, visualizationStrategy);

    const fallbackStrategy = buildFallbackStrategy(templateSelection, confidenceScore);
    const channels = extractCapabilityChannels(capabilityEntries, visualizationStrategy);

    const recommendation = normalizeCapabilityTemplateRecommendation({
      schemaVersion: RECOMMENDATION_SCHEMA_VERSION,
      recommendedCapabilities: capabilityEntries,
      recommendedTemplates: templateRecommendations,
      requiredEducationalObjects: deriveEducationalObjects(visualizationRequirements, {
        concepts: requirementsInput.concepts,
        relationships: requirementsInput.relationships,
        steps: requirementsInput.steps
      }),
      animationCapabilities: channels.animationCapabilities,
      interactionCapabilities: channels.interactionCapabilities,
      simulationCapabilities: channels.simulationCapabilities,
      assessmentCapabilities: channels.assessmentCapabilities,
      narrationCapabilities: channels.narrationCapabilities,
      confidenceScore,
      fallbackStrategy,
      diagnostics: {
        cacheKey,
        capabilityMatchCount: capabilityMatches.length,
        selectedCapabilityCount: capabilityEntries.length,
        templateCandidateCount: asArray(templateSelection?.rankedCandidates).length,
        templateFallbackUsed: templateSelection?.fallbackUsed === true,
        warnings: [
          ...asArray(visualizationRequirements.warnings),
          ...asArray(capabilityComposition.warnings),
          ...asArray(templateSelection?.warnings)
        ].filter(Boolean)
      },
      metadata: {
        learningIntent: {
          learningIntent: learningIntent.learningIntent,
          knowledgeDomain: learningIntent.knowledgeDomain,
          reasoningStyle: learningIntent.reasoningStyle
        },
        visualizationStrategy,
        sceneGraph: isObject(input.sceneGraph) ? input.sceneGraph : {},
        runtimeGraph: isObject(input.runtimeGraph) ? input.runtimeGraph : {},
        timeline: isObject(input.timeline) ? input.timeline : {},
        lessonMetadata: isObject(input.lessonMetadata) ? input.lessonMetadata : {},
        capabilityComposition,
        templateSelection: {
          status: templateSelection?.status || 'unknown',
          confidence: Number(templateSelection?.confidence || 0),
          selectedTemplateId: safeString(templateSelection?.selectedTemplate?.templateId || ''),
          selectedTemplateVersion: safeString(templateSelection?.selectedTemplate?.version || '')
        },
        supportsUnknownFutureTypes: true,
        recommendedAt: Date.now()
      }
    });

    this.cache.set(cacheKey, recommendation);
    this.persistCache();
    return deepClone(recommendation);
  }

  serialize(recommendation = {}) {
    return JSON.stringify(normalizeCapabilityTemplateRecommendation(recommendation));
  }

  deserialize(serialized = '') {
    const parsed = parsePayload(serialized);
    if (!parsed) {
      this.warn('Failed to deserialize recommendation payload.');
      return normalizeCapabilityTemplateRecommendation({});
    }

    return migrateCapabilityTemplateRecommendation(parsed);
  }

  persistCache() {
    if (!this.persistenceAdapter) return false;

    const payload = {
      schemaVersion: RECOMMENDATION_SCHEMA_VERSION,
      entries: [...this.cache.entries()],
      diagnostics: this.diagnostics,
      persistedAt: Date.now()
    };

    const serialized = JSON.stringify(payload);

    if (typeof this.persistenceAdapter.setItem === 'function') {
      this.persistenceAdapter.setItem(this.persistenceKey, serialized);
      return true;
    }

    if (typeof this.persistenceAdapter.save === 'function') {
      this.persistenceAdapter.save(this.persistenceKey, serialized);
      return true;
    }

    return false;
  }

  recoverCache() {
    if (!this.persistenceAdapter) return false;

    let raw = null;
    if (typeof this.persistenceAdapter.getItem === 'function') {
      raw = this.persistenceAdapter.getItem(this.persistenceKey);
    } else if (typeof this.persistenceAdapter.load === 'function') {
      raw = this.persistenceAdapter.load(this.persistenceKey);
    }

    if (!raw) return false;

    const parsed = parsePayload(raw);
    if (!parsed || !Array.isArray(parsed.entries)) {
      this.warn('Corrupted recommendation cache detected. Reinitializing cache.');
      this.cache = new Map();
      this.diagnostics.recoveries += 1;
      return false;
    }

    this.cache = new Map(
      parsed.entries
        .filter((entry) => Array.isArray(entry) && entry.length === 2)
        .map(([key, value]) => [String(key), migrateCapabilityTemplateRecommendation(value)])
    );

    this.diagnostics.recoveries += 1;
    return true;
  }

  snapshot() {
    return {
      schemaVersion: RECOMMENDATION_SCHEMA_VERSION,
      cacheSize: this.cache.size,
      persistenceKey: this.persistenceKey,
      diagnostics: deepClone(this.diagnostics)
    };
  }
}

export function createUniversalCapabilityTemplateRecommendationEngine(options = {}) {
  return new UniversalCapabilityTemplateRecommendationEngine(options);
}

const defaultEngine = createUniversalCapabilityTemplateRecommendationEngine();

export function analyzeCapabilityTemplateRecommendation(input = {}, options = {}) {
  if (options?.engine && typeof options.engine.analyze === 'function') {
    return options.engine.analyze(input, options);
  }
  return defaultEngine.analyze(input, options);
}
