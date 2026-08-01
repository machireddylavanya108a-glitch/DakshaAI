import { normalizeIntentOutput } from '../intent-analysis/index.js';
import { normalizeVisualizationStrategyProfile } from '../visualization-strategy/index.js';
import { normalizeCapabilityTemplateRecommendation } from '../recommendation/index.js';
import { getAssetRecommendation } from '../utils/assetManager.js';

const STORE_KEY = '__daksha_confidence_conflict_fallback_store__';
const ENGINE_SCHEMA_VERSION = 'v2';
const DEFAULT_PERSISTENCE_KEY = 'daksha.universal.confidence.conflict.fallback.v2';

const KNOWN_CONFLICT_TYPES = new Set([
  'multiple-visualization-strategies',
  'conflicting-templates',
  'missing-scene-data',
  'missing-educational-objects',
  'inconsistent-timeline',
  'invalid-graph-references',
  'low-confidence-ai-output'
]);

const KNOWN_CONFIDENCE_KEYS = new Set([
  'overallConfidence',
  'reasoningConfidence',
  'visualizationConfidence',
  'templateConfidence',
  'interactionConfidence',
  'narrationConfidence',
  'recoveryConfidence'
]);

function safeString(value) {
  return String(value || '').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clamp(value, min = 0, max = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(Math.max(numeric, min), max);
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

  const map = globalThis[STORE_KEY];
  return {
    setItem(key, value) {
      map.set(String(key), String(value));
    },
    getItem(key) {
      return map.get(String(key)) || null;
    },
    removeItem(key) {
      map.delete(String(key));
    }
  };
}

function createDefaultPersistenceAdapter() {
  const storage = globalThis?.localStorage;
  if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
    return storage;
  }
  return createInMemoryStore();
}

function stableHash(value = '') {
  const text = String(value || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function confidenceFromTemplateRecommendation(recommendation = {}) {
  const templates = asArray(recommendation.recommendedTemplates);
  if (!templates.length) return clamp(recommendation.confidenceScore || 0.35, 0, 1);

  const top = templates[0] || {};
  const second = templates[1] || null;
  const spread = second ? Math.max(0, Number(top.score || 0) - Number(second.score || 0)) : Number(top.score || 0);
  const scoreConfidence = clamp((Number(top.score || 0) * 0.7) + (spread * 0.3), 0, 1);
  return clamp((scoreConfidence * 0.5) + (clamp(top.confidence, 0, 1) * 0.5), 0, 1);
}

function confidenceFromVisualizationStrategy(strategy = {}) {
  const strategies = asArray(strategy.strategies);
  const primary = strategy.primaryStrategy || {};
  const style = safeString(primary.visualizationStyle).toLowerCase();
  const complexity = safeString(primary.sceneComplexity).toLowerCase();
  const strategyPenalty = strategies.length > 3 ? 0.12 : 0;
  const complexityPenalty = complexity === 'high' ? 0.08 : 0;
  const styleBonus = /interactive|simulation|diagram|animation|adaptive/.test(style) ? 0.06 : 0;
  const base = clamp(strategy.confidenceScore || 0.5, 0, 1);
  return clamp(base + styleBonus - strategyPenalty - complexityPenalty, 0, 1);
}

function confidenceFromReasoning(intent = {}) {
  const base = clamp(intent.confidenceScore || 0.5, 0, 1);
  const pathway = asArray(intent.learningPathway);
  const strategy = safeString(intent.educationalStrategy).toLowerCase();
  const pathwayBonus = pathway.length >= 2 ? 0.08 : 0;
  const strategyBonus = strategy ? 0.05 : 0;
  return clamp(base + pathwayBonus + strategyBonus, 0, 1);
}

function collectUnknownConfidenceMetrics(aiMetadata = {}) {
  const metrics = isObject(aiMetadata.metrics) ? aiMetadata.metrics : {};
  const entries = Object.entries(metrics)
    .filter(([key, value]) => !KNOWN_CONFIDENCE_KEYS.has(String(key)) && Number.isFinite(Number(value)))
    .map(([key, value]) => ({
      key: safeString(key),
      value: clamp(value, 0, 1)
    }));

  const aggregate = entries.length
    ? entries.reduce((sum, entry) => sum + entry.value, 0) / entries.length
    : null;

  return {
    entries,
    aggregate: aggregate === null ? null : clamp(aggregate, 0, 1)
  };
}

function analyzeTimelineHealth(timeline = []) {
  const steps = asArray(timeline);
  if (!steps.length) {
    return {
      confidence: 0.3,
      inconsistent: true,
      duplicateIdCount: 0,
      missingNarrationCount: 0,
      missingDurationCount: 0
    };
  }

  const seen = new Set();
  let duplicateIdCount = 0;
  let missingNarrationCount = 0;
  let missingDurationCount = 0;

  steps.forEach((step, index) => {
    const id = safeString(step?.id || `step-${index + 1}`);
    if (seen.has(id)) duplicateIdCount += 1;
    seen.add(id);

    if (!safeString(step?.narration?.text || step?.description || step?.title)) {
      missingNarrationCount += 1;
    }

    const duration = Number(step?.duration || step?.durationMs || 0);
    if (!Number.isFinite(duration) || duration <= 0) {
      missingDurationCount += 1;
    }
  });

  const penalty = (duplicateIdCount * 0.14)
    + ((missingNarrationCount / steps.length) * 0.25)
    + ((missingDurationCount / steps.length) * 0.2);

  return {
    confidence: clamp(1 - penalty, 0, 1),
    inconsistent: duplicateIdCount > 0 || missingDurationCount > 0,
    duplicateIdCount,
    missingNarrationCount,
    missingDurationCount
  };
}

function analyzeGraphHealth(sceneGraph = {}, runtimeGraph = {}, scene = {}) {
  const sceneNodeCount = Number(sceneGraph.nodeCount || asArray(scene.objects).length || 0);
  const sceneRelationshipCount = Number(sceneGraph.relationshipCount || asArray(scene.relationships).length || 0);
  const runtimeNodeCount = Number(runtimeGraph.nodeCount || 0);
  const runtimeRelationshipCount = Number(runtimeGraph.relationshipCount || 0);

  const graphRefs = asArray(scene?.timeline)
    .flatMap((step) => asArray(step?.objects))
    .map((entry) => (isObject(entry) ? safeString(entry.id) : safeString(entry)))
    .filter(Boolean);

  const objectIds = new Set(asArray(scene?.objects).map((obj) => safeString(obj?.id)).filter(Boolean));
  const invalidRefs = graphRefs.filter((ref) => !objectIds.has(ref));

  const missingSceneData = sceneNodeCount <= 0;
  const confidencePenalty = missingSceneData ? 0.5 : 0;
  const runtimePenalty = runtimeNodeCount <= 0 ? 0.22 : 0;
  const invalidRefPenalty = Math.min(0.4, invalidRefs.length * 0.08);

  return {
    confidence: clamp(1 - confidencePenalty - runtimePenalty - invalidRefPenalty, 0, 1),
    missingSceneData,
    invalidGraphReferences: invalidRefs,
    sceneNodeCount,
    sceneRelationshipCount,
    runtimeNodeCount,
    runtimeRelationshipCount
  };
}

function buildConflict(type, severity = 'medium', details = {}, metadata = {}) {
  const safeType = safeString(type) || 'unknown-conflict';
  const normalizedType = KNOWN_CONFLICT_TYPES.has(safeType) ? safeType : `unknown:${safeType}`;
  return {
    type: normalizedType,
    severity: safeString(severity) || 'medium',
    details: isObject(details) ? details : {},
    metadata: isObject(metadata) ? metadata : {},
    knownConflict: KNOWN_CONFLICT_TYPES.has(safeType)
  };
}

function detectConflicts(context = {}) {
  const conflicts = [];

  const strategyList = asArray(context.visualizationStrategy?.strategies);
  if (strategyList.length > 1) {
    const uniqueStyles = new Set(strategyList.map((entry) => safeString(entry?.visualizationStyle).toLowerCase()).filter(Boolean));
    if (uniqueStyles.size > 1) {
      conflicts.push(buildConflict('multiple-visualization-strategies', 'medium', {
        strategyCount: strategyList.length,
        styleCount: uniqueStyles.size
      }));
    }
  }

  const templates = asArray(context.templateRecommendation?.recommendedTemplates);
  if (templates.length > 1) {
    const top = templates[0];
    const second = templates[1];
    if (safeString(top?.semanticPurpose).toLowerCase() === safeString(second?.semanticPurpose).toLowerCase()) {
      conflicts.push(buildConflict('conflicting-templates', 'medium', {
        templateIds: templates.slice(0, 3).map((template) => template.templateId),
        semanticPurpose: safeString(top?.semanticPurpose || 'adaptive-purpose')
      }));
    }
  }

  if (context.graphHealth?.missingSceneData) {
    conflicts.push(buildConflict('missing-scene-data', 'high', {
      sceneNodeCount: context.graphHealth.sceneNodeCount
    }));
  }

  const objectCount = Number(context.educationalObjectCount || 0);
  const objectHint = Number(context.templateRecommendation?.requiredEducationalObjects?.objectCountHint || 0);
  if (objectHint > 0 && objectCount <= 0) {
    conflicts.push(buildConflict('missing-educational-objects', 'high', {
      requiredObjectCount: objectHint,
      actualObjectCount: objectCount
    }));
  }

  if (context.timelineHealth?.inconsistent) {
    conflicts.push(buildConflict('inconsistent-timeline', 'high', {
      duplicateIdCount: context.timelineHealth.duplicateIdCount,
      missingDurationCount: context.timelineHealth.missingDurationCount
    }));
  }

  if (asArray(context.graphHealth?.invalidGraphReferences).length > 0) {
    conflicts.push(buildConflict('invalid-graph-references', 'high', {
      invalidReferences: context.graphHealth.invalidGraphReferences.slice(0, 20)
    }));
  }

  const aiConfidence = clamp(context.aiConfidenceMetadata?.overallConfidence ?? context.aiConfidenceMetadata?.confidence, 0, 1);
  if (aiConfidence > 0 && aiConfidence < Number(context.minimumConfidenceThreshold || 0.45)) {
    conflicts.push(buildConflict('low-confidence-ai-output', 'high', {
      aiConfidence,
      minimumThreshold: Number(context.minimumConfidenceThreshold || 0.45)
    }));
  }

  asArray(context.aiConfidenceMetadata?.conflicts).forEach((entry) => {
    if (!entry) return;
    if (typeof entry === 'string') {
      conflicts.push(buildConflict(entry, 'medium', { source: 'ai-confidence-metadata' }));
      return;
    }

    conflicts.push(buildConflict(entry.type || 'unknown', entry.severity || 'medium', {
      ...(isObject(entry.details) ? entry.details : {}),
      source: 'ai-confidence-metadata'
    }, isObject(entry.metadata) ? entry.metadata : {}));
  });

  return conflicts;
}

function resolveConflicts(conflicts = [], context = {}) {
  const resolutions = [];
  const unresolved = [];

  conflicts.forEach((conflict) => {
    const type = safeString(conflict.type).replace(/^unknown:/, '');
    if (type === 'multiple-visualization-strategies') {
      const strategies = asArray(context.visualizationStrategy?.strategies);
      const sorted = [...strategies].sort((a, b) => Number(b?.confidenceScore || 0) - Number(a?.confidenceScore || 0));
      resolutions.push({
        conflictType: conflict.type,
        resolved: true,
        strategy: 'prioritize-highest-confidence-strategy',
        output: {
          preferredStrategyId: safeString(sorted[0]?.strategyId || context.visualizationStrategy?.primaryStrategy?.strategyId || ''),
          reducedStrategyCount: Math.min(1, sorted.length)
        }
      });
      return;
    }

    if (type === 'conflicting-templates') {
      const templates = asArray(context.templateRecommendation?.recommendedTemplates);
      const sorted = [...templates].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
      resolutions.push({
        conflictType: conflict.type,
        resolved: true,
        strategy: 'select-highest-ranked-template',
        output: {
          selectedTemplateId: safeString(sorted[0]?.templateId || ''),
          alternateTemplateId: safeString(sorted[1]?.templateId || '')
        }
      });
      return;
    }

    if (type === 'missing-scene-data') {
      resolutions.push({
        conflictType: conflict.type,
        resolved: true,
        strategy: 'switch-procedural-generation',
        output: {
          reason: 'scene-data-unavailable'
        }
      });
      return;
    }

    if (type === 'missing-educational-objects') {
      resolutions.push({
        conflictType: conflict.type,
        resolved: true,
        strategy: 'fallback-educational-object-generation',
        output: {
          objectCountHint: Number(context.templateRecommendation?.requiredEducationalObjects?.objectCountHint || 1)
        }
      });
      return;
    }

    if (type === 'inconsistent-timeline') {
      resolutions.push({
        conflictType: conflict.type,
        resolved: true,
        strategy: 'normalize-timeline-order-and-duration',
        output: {
          defaultDurationMs: 1200
        }
      });
      return;
    }

    if (type === 'invalid-graph-references') {
      resolutions.push({
        conflictType: conflict.type,
        resolved: true,
        strategy: 'prune-invalid-graph-references',
        output: {
          prunedReferenceCount: asArray(conflict.details?.invalidReferences).length
        }
      });
      return;
    }

    if (type === 'low-confidence-ai-output') {
      resolutions.push({
        conflictType: conflict.type,
        resolved: true,
        strategy: 'escalate-adaptive-fallback',
        output: {
          minimumThreshold: Number(context.minimumConfidenceThreshold || 0.45)
        }
      });
      return;
    }

    unresolved.push({
      conflictType: conflict.type,
      reason: 'unknown-conflict-type',
      metadata: conflict.metadata || {}
    });
  });

  return {
    resolutions,
    unresolved,
    allResolved: unresolved.length === 0
  };
}

function buildFallbackPlan(context = {}) {
  const threshold = Number(context.minimumConfidenceThreshold || 0.45);
  const overall = clamp(context.overallConfidence, 0, 1);
  const aiConfidence = clamp(context.aiConfidence, 0, 1);
  const actions = [];

  const conflictTypes = new Set(asArray(context.conflicts).map((conflict) => safeString(conflict.type)));

  if (overall < threshold || conflictTypes.has('low-confidence-ai-output')) {
    actions.push('retry-pipeline');
  }

  if (conflictTypes.has('conflicting-templates') || overall < threshold) {
    actions.push('select-alternate-template');
  }

  if (context.visualizationConfidence < threshold || conflictTypes.has('multiple-visualization-strategies')) {
    actions.push('downgrade-visualization-complexity');
  }

  if (context.templateConfidence < threshold || conflictTypes.has('missing-scene-data')) {
    actions.push('switch-procedural-generation');
  }

  if (
    context.interactionConfidence < threshold
    || context.narrationConfidence < threshold
    || overall < (threshold * 0.9)
    || aiConfidence < threshold
  ) {
    actions.push('switch-adaptive-2d-visualization');
  }

  const uniqueActions = [...new Set(actions)];

  return {
    recommended: uniqueActions.length > 0,
    reason: uniqueActions.length > 0 ? 'confidence-threshold-or-conflict' : 'confidence-acceptable',
    actions: uniqueActions,
    preserveLearningQuality: true,
    supportsUnknownFutureFallbackModes: true
  };
}

function normalizeConflictEntry(entry = {}) {
  const source = isObject(entry) ? entry : {};
  return {
    type: safeString(source.type || 'unknown-conflict'),
    severity: safeString(source.severity || 'medium'),
    details: isObject(source.details) ? source.details : {},
    metadata: isObject(source.metadata) ? source.metadata : {},
    knownConflict: source.knownConflict !== false
  };
}

function normalizeResolutionEntry(entry = {}) {
  const source = isObject(entry) ? entry : {};
  return {
    conflictType: safeString(source.conflictType || 'unknown-conflict'),
    resolved: source.resolved !== false,
    strategy: safeString(source.strategy || 'adaptive-resolution'),
    output: isObject(source.output) ? source.output : {}
  };
}

export function normalizeConfidenceConflictFallbackProfile(input = {}) {
  const source = isObject(input) ? input : {};

  const additionalMetrics = asArray(source.additionalConfidenceMetrics)
    .map((entry) => ({
      key: safeString(entry?.key || ''),
      value: clamp(entry?.value, 0, 1)
    }))
    .filter((entry) => entry.key);

  const profile = {
    schemaVersion: ENGINE_SCHEMA_VERSION,
    overallConfidence: clamp(source.overallConfidence, 0, 1),
    reasoningConfidence: clamp(source.reasoningConfidence, 0, 1),
    visualizationConfidence: clamp(source.visualizationConfidence, 0, 1),
    templateConfidence: clamp(source.templateConfidence, 0, 1),
    interactionConfidence: clamp(source.interactionConfidence, 0, 1),
    narrationConfidence: clamp(source.narrationConfidence, 0, 1),
    recoveryConfidence: clamp(source.recoveryConfidence, 0, 1),
    additionalConfidenceMetrics: additionalMetrics,
    conflicts: asArray(source.conflicts).map((entry) => normalizeConflictEntry(entry)),
    conflictResolution: {
      resolutions: asArray(source.conflictResolution?.resolutions).map((entry) => normalizeResolutionEntry(entry)),
      unresolved: asArray(source.conflictResolution?.unresolved),
      allResolved: source.conflictResolution?.allResolved !== false
    },
    fallbackPlan: {
      recommended: source.fallbackPlan?.recommended === true,
      reason: safeString(source.fallbackPlan?.reason || 'confidence-acceptable'),
      actions: asArray(source.fallbackPlan?.actions).map((entry) => safeString(entry)).filter(Boolean),
      preserveLearningQuality: source.fallbackPlan?.preserveLearningQuality !== false,
      supportsUnknownFutureFallbackModes: source.fallbackPlan?.supportsUnknownFutureFallbackModes !== false
    },
    diagnostics: isObject(source.diagnostics) ? source.diagnostics : {},
    metadata: isObject(source.metadata) ? source.metadata : {}
  };

  return profile;
}

export function migrateConfidenceConflictFallbackProfile(input = {}) {
  const source = isObject(input) ? input : {};
  if (source.schemaVersion === ENGINE_SCHEMA_VERSION) {
    return normalizeConfidenceConflictFallbackProfile(source);
  }

  const legacyConflicts = asArray(source.conflicts || source.detectedConflicts || []).map((entry) => {
    if (typeof entry === 'string') {
      return {
        type: entry,
        severity: 'medium',
        details: {},
        metadata: {}
      };
    }

    return {
      type: entry?.type || 'unknown-conflict',
      severity: entry?.severity || 'medium',
      details: isObject(entry?.details) ? entry.details : {},
      metadata: isObject(entry?.metadata) ? entry.metadata : {}
    };
  });

  const migrated = normalizeConfidenceConflictFallbackProfile({
    schemaVersion: ENGINE_SCHEMA_VERSION,
    overallConfidence: Number(source.overallConfidence ?? source.confidence ?? 0.45),
    reasoningConfidence: Number(source.reasoningConfidence ?? source.intentConfidence ?? 0.45),
    visualizationConfidence: Number(source.visualizationConfidence ?? source.strategyConfidence ?? 0.45),
    templateConfidence: Number(source.templateConfidence ?? source.recommendationConfidence ?? 0.45),
    interactionConfidence: Number(source.interactionConfidence ?? 0.45),
    narrationConfidence: Number(source.narrationConfidence ?? 0.45),
    recoveryConfidence: Number(source.recoveryConfidence ?? 0.5),
    additionalConfidenceMetrics: asArray(source.additionalConfidenceMetrics || []),
    conflicts: legacyConflicts,
    conflictResolution: {
      resolutions: asArray(source.resolutions || []),
      unresolved: asArray(source.unresolved || []),
      allResolved: asArray(source.unresolved || []).length === 0
    },
    fallbackPlan: {
      recommended: source?.fallbackPlan?.recommended === true || Number(source.overallConfidence ?? source.confidence ?? 0.45) < 0.45,
      reason: source?.fallbackPlan?.reason || 'legacy-migrated-fallback',
      actions: asArray(source?.fallbackPlan?.actions || source?.fallbackActions || []),
      preserveLearningQuality: source?.fallbackPlan?.preserveLearningQuality !== false,
      supportsUnknownFutureFallbackModes: true
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

  return migrated;
}

function deriveCacheKey(input = {}) {
  const intent = normalizeIntentOutput(input.learningIntent || input.intent || {});
  const strategy = normalizeVisualizationStrategyProfile(input.visualizationStrategy || {});
  const recommendation = normalizeCapabilityTemplateRecommendation(input.templateRecommendation || {});
  const payload = JSON.stringify({
    intent: {
      learningIntent: intent.learningIntent,
      reasoningStyle: intent.reasoningStyle,
      confidenceScore: Number(intent.confidenceScore || 0)
    },
    strategy: {
      style: strategy.primaryStrategy?.visualizationStyle,
      sceneComplexity: strategy.primaryStrategy?.sceneComplexity,
      confidenceScore: Number(strategy.confidenceScore || 0)
    },
    recommendation: {
      confidenceScore: Number(recommendation.confidenceScore || 0),
      templates: asArray(recommendation.recommendedTemplates).map((entry) => [entry.templateId, entry.version, entry.score]),
      capabilities: asArray(recommendation.recommendedCapabilities).map((entry) => [entry.id, entry.score])
    },
    scene: {
      nodeCount: Number(input.sceneGraph?.nodeCount || 0),
      relationshipCount: Number(input.sceneGraph?.relationshipCount || 0)
    },
    runtime: {
      nodeCount: Number(input.runtimeGraph?.nodeCount || 0),
      relationshipCount: Number(input.runtimeGraph?.relationshipCount || 0)
    },
    timelineCount: asArray(input.timeline).length,
    aiConfidence: Number(input.aiConfidenceMetadata?.overallConfidence ?? input.aiConfidenceMetadata?.confidence ?? 0)
  });

  return `confidence-fallback-${stableHash(payload)}`;
}

function confidenceFromAssetMetadata(scene = {}, learningIntent = {}) {
  const assetPlan = asArray(scene.assetPlan || scene.metadata?.assetPlan || []);
  const reusableAssets = asArray(scene.reusableAssets || scene.metadata?.reusableAssets || []);
  const query = safeString(learningIntent.subDomain || learningIntent.knowledgeDomain || scene.subject || scene.title || 'lesson');
  const recommendation = getAssetRecommendation(query, safeString(learningIntent.knowledgeDomain || scene.subject || 'general'));

  const rankedCount = asArray(recommendation.ranked).length;
  const base = rankedCount > 0 ? 0.55 : 0.35;
  const planBonus = assetPlan.length > 0 ? 0.16 : 0;
  const reusableBonus = reusableAssets.length > 0 ? 0.09 : 0;
  const compositionPenalty = recommendation.requiresComposition ? 0.08 : 0;

  return clamp(base + planBonus + reusableBonus - compositionPenalty, 0, 1);
}

export class UniversalConfidenceConflictAdaptiveFallbackEngine {
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

    const minimumConfidenceThreshold = Number.isFinite(Number(options.minimumConfidenceThreshold))
      ? Number(options.minimumConfidenceThreshold)
      : Number.isFinite(Number(this.options.minimumConfidenceThreshold))
        ? Number(this.options.minimumConfidenceThreshold)
        : 0.45;

    const learningIntent = normalizeIntentOutput(input.learningIntent || input.intent || {});
    const visualizationStrategy = normalizeVisualizationStrategyProfile(input.visualizationStrategy || {});
    const templateRecommendation = normalizeCapabilityTemplateRecommendation(input.templateRecommendation || {});
    const timeline = asArray(input.timeline || input.scene?.timeline || []);
    const scene = isObject(input.scene) ? input.scene : {};
    const aiConfidenceMetadata = isObject(input.aiConfidenceMetadata) ? input.aiConfidenceMetadata : {};

    const cacheKey = deriveCacheKey({
      learningIntent,
      visualizationStrategy,
      templateRecommendation,
      sceneGraph: input.sceneGraph,
      runtimeGraph: input.runtimeGraph,
      timeline,
      aiConfidenceMetadata
    });

    if (this.cache.has(cacheKey)) {
      this.diagnostics.cacheHits += 1;
      return deepClone(this.cache.get(cacheKey));
    }

    this.diagnostics.cacheMisses += 1;

    const reasoningConfidence = confidenceFromReasoning(learningIntent);
    const visualizationConfidence = confidenceFromVisualizationStrategy(visualizationStrategy);
    const templateConfidence = confidenceFromTemplateRecommendation(templateRecommendation);
    const timelineHealth = analyzeTimelineHealth(timeline);
    const graphHealth = analyzeGraphHealth(input.sceneGraph || {}, input.runtimeGraph || {}, scene);

    const interactionSignals = [
      timelineHealth.confidence,
      graphHealth.confidence,
      clamp(asArray(scene.interactions).length > 0 ? 0.75 : 0.45, 0, 1)
    ];
    const interactionConfidence = clamp(interactionSignals.reduce((sum, value) => sum + value, 0) / interactionSignals.length, 0, 1);

    const narrationSignal = timeline.length
      ? clamp(1 - (timelineHealth.missingNarrationCount / Math.max(1, timeline.length)), 0, 1)
      : 0.45;
    const narrationConfidence = clamp((narrationSignal * 0.7) + (visualizationConfidence * 0.3), 0, 1);

    const aiConfidence = clamp(aiConfidenceMetadata.overallConfidence ?? aiConfidenceMetadata.confidence ?? 0.5, 0, 1);
    const assetConfidence = confidenceFromAssetMetadata(scene, learningIntent);

    const recoverySignals = [
      clamp(templateRecommendation?.fallbackStrategy?.supportsUnknownFutureTypes ? 0.78 : 0.55, 0, 1),
      clamp(templateRecommendation?.fallbackStrategy?.recommendProceduralGeneration ? 0.72 : 0.65, 0, 1),
      assetConfidence
    ];
    const recoveryConfidence = clamp(recoverySignals.reduce((sum, value) => sum + value, 0) / recoverySignals.length, 0, 1);

    const unknownMetrics = collectUnknownConfidenceMetrics(aiConfidenceMetadata);

    const weightedBase = (
      reasoningConfidence * 0.18
      + visualizationConfidence * 0.16
      + templateConfidence * 0.16
      + interactionConfidence * 0.14
      + narrationConfidence * 0.12
      + recoveryConfidence * 0.12
      + aiConfidence * 0.08
      + assetConfidence * 0.04
    );
    const overallConfidence = clamp(
      unknownMetrics.aggregate === null
        ? weightedBase
        : ((weightedBase * 0.85) + (unknownMetrics.aggregate * 0.15)),
      0,
      1
    );

    const conflicts = detectConflicts({
      visualizationStrategy,
      templateRecommendation,
      graphHealth,
      timelineHealth,
      educationalObjectCount: asArray(scene.educationalObjects).length,
      aiConfidenceMetadata,
      minimumConfidenceThreshold
    });

    const conflictResolution = resolveConflicts(conflicts, {
      visualizationStrategy,
      templateRecommendation,
      minimumConfidenceThreshold
    });

    const fallbackPlan = buildFallbackPlan({
      overallConfidence,
      reasoningConfidence,
      visualizationConfidence,
      templateConfidence,
      interactionConfidence,
      narrationConfidence,
      aiConfidence,
      conflicts,
      minimumConfidenceThreshold
    });

    const profile = normalizeConfidenceConflictFallbackProfile({
      schemaVersion: ENGINE_SCHEMA_VERSION,
      overallConfidence,
      reasoningConfidence,
      visualizationConfidence,
      templateConfidence,
      interactionConfidence,
      narrationConfidence,
      recoveryConfidence,
      additionalConfidenceMetrics: unknownMetrics.entries,
      conflicts,
      conflictResolution,
      fallbackPlan,
      diagnostics: {
        cacheKey,
        minimumConfidenceThreshold,
        assetConfidence,
        aiConfidence,
        timelineHealth,
        graphHealth,
        unknownMetricCount: unknownMetrics.entries.length,
        conflictCount: conflicts.length,
        unresolvedConflictCount: asArray(conflictResolution.unresolved).length
      },
      metadata: {
        learningIntent: {
          learningIntent: learningIntent.learningIntent,
          knowledgeDomain: learningIntent.knowledgeDomain,
          reasoningStyle: learningIntent.reasoningStyle
        },
        visualizationStrategy,
        templateRecommendation,
        sceneGraph: isObject(input.sceneGraph) ? input.sceneGraph : {},
        runtimeGraph: isObject(input.runtimeGraph) ? input.runtimeGraph : {},
        timelineSummary: {
          stepCount: timeline.length,
          missingNarrationCount: timelineHealth.missingNarrationCount,
          duplicateIdCount: timelineHealth.duplicateIdCount
        },
        aiConfidenceMetadata,
        supportsUnknownFutureMetrics: true,
        supportsUnknownFutureConflicts: true,
        analyzedAt: Date.now()
      }
    });

    this.cache.set(cacheKey, profile);
    this.persistCache();
    return deepClone(profile);
  }

  serialize(profile = {}) {
    return JSON.stringify(normalizeConfidenceConflictFallbackProfile(profile));
  }

  deserialize(serialized = '') {
    const parsed = parsePayload(serialized);
    if (!parsed) {
      this.warn('Failed to deserialize confidence profile payload.');
      return normalizeConfidenceConflictFallbackProfile({});
    }
    return migrateConfidenceConflictFallbackProfile(parsed);
  }

  persistCache() {
    if (!this.persistenceAdapter) return false;
    const payload = {
      schemaVersion: ENGINE_SCHEMA_VERSION,
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
      this.warn('Corrupted confidence cache detected. Reinitializing cache.');
      this.cache = new Map();
      this.diagnostics.recoveries += 1;
      return false;
    }

    this.cache = new Map(
      parsed.entries
        .filter((entry) => Array.isArray(entry) && entry.length === 2)
        .map(([key, value]) => [String(key), migrateConfidenceConflictFallbackProfile(value)])
    );

    this.diagnostics.recoveries += 1;
    return true;
  }

  snapshot() {
    return {
      schemaVersion: ENGINE_SCHEMA_VERSION,
      cacheSize: this.cache.size,
      persistenceKey: this.persistenceKey,
      diagnostics: deepClone(this.diagnostics)
    };
  }
}

export function createUniversalConfidenceConflictAdaptiveFallbackEngine(options = {}) {
  return new UniversalConfidenceConflictAdaptiveFallbackEngine(options);
}

const defaultEngine = createUniversalConfidenceConflictAdaptiveFallbackEngine();

export function analyzeUniversalConfidenceConflictFallback(input = {}, options = {}) {
  if (options?.engine && typeof options.engine.analyze === 'function') {
    return options.engine.analyze(input, options);
  }
  return defaultEngine.analyze(input, options);
}
