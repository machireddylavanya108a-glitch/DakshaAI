import { getDefaultUniversalAssetRegistry } from '../asset-registry/index.js';
import { normalizeVisualizationStrategyProfile } from '../visualization-strategy/index.js';
import { normalizeCapabilityTemplateRecommendation } from '../recommendation/index.js';

const STORE_KEY = '__daksha_universal_asset_discovery_store__';
const SCHEMA_VERSION = 'v1';
const ENGINE_PERSISTENCE_KEY = 'daksha.universal.asset.discovery.matching.v1';

function safeString(value) {
  return String(value || '').trim();
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(Math.max(toFiniteNumber(value, minimum), minimum), maximum);
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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
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

function sanitizeText(value = '') {
  return safeString(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value = '') {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const output = [];
  asArray(values).forEach((entry) => {
    const text = safeString(entry);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(text);
  });
  return output;
}

function hashKey(input = '') {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function makeCacheKey(input = {}) {
  const payload = JSON.stringify({
    learningIntent: input.learningIntent || {},
    visualizationStrategy: input.visualizationStrategy || {},
    capabilityRecommendation: input.capabilityRecommendation || {},
    sceneMetadata: input.sceneMetadata || {},
    objectMetadata: input.objectMetadata || [],
    sceneGraph: input.sceneGraph || {},
    runtimeGraph: input.runtimeGraph || {}
  });
  return `asset-discovery-${hashKey(payload)}`;
}

function normalizeGraphSummary(source = {}) {
  const graph = isObject(source) ? source : {};
  return {
    nodeCount: Number(graph.nodeCount || graph.nodes?.length || 0),
    relationshipCount: Number(graph.relationshipCount || graph.edges?.length || 0),
    metadata: isObject(graph.metadata) ? graph.metadata : {}
  };
}

function normalizeIntent(source = {}) {
  const input = isObject(source) ? source : {};
  return {
    learningIntent: safeString(input.learningIntent || input.intent || input.goal || ''),
    educationalStrategy: safeString(input.educationalStrategy || ''),
    reasoningStyle: safeString(input.reasoningStyle || ''),
    confidenceScore: clamp(input.confidenceScore, 0, 1)
  };
}

function normalizeObjectMetadata(list = []) {
  return asArray(list)
    .map((entry) => {
      const source = isObject(entry) ? entry : {};
      return {
        id: safeString(source.id || source.objectId || ''),
        name: safeString(source.name || source.label || ''),
        category: safeString(source.category || source.type || ''),
        tags: uniqueStrings(source.tags || []),
        metadata: isObject(source.metadata) ? source.metadata : {}
      };
    })
    .filter((entry) => entry.id || entry.name || entry.category || entry.tags.length > 0);
}

function normalizeCandidate(candidate = {}) {
  const source = isObject(candidate) ? candidate : {};
  return {
    assetId: safeString(source.assetId || source.id || ''),
    version: safeString(source.version || 'latest') || 'latest',
    type: safeString(source.type || 'unknown-asset-type') || 'unknown-asset-type',
    category: safeString(source.category || 'General') || 'General',
    source: safeString(source.source || 'registry') || 'registry',
    rankScore: clamp(source.rankScore, 0, 1),
    qualityLevel: safeString(source.qualityLevel || 'medium') || 'medium',
    lodLevel: safeString(source.lodLevel || 'medium') || 'medium',
    dependencies: asArray(source.dependencies),
    metadata: isObject(source.metadata) ? source.metadata : {},
    reason: safeString(source.reason || 'ranked') || 'ranked'
  };
}

export function normalizeAssetDiscoveryMatchingResolutionProfile(profile = {}) {
  const source = isObject(profile) ? profile : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    status: safeString(source.status || 'resolved') || 'resolved',
    mode: safeString(source.mode || 'registry') || 'registry',
    cacheKey: safeString(source.cacheKey || ''),
    confidenceScore: clamp(source.confidenceScore, 0, 1),
    decision: {
      primaryAsset: source?.decision?.primaryAsset ? normalizeCandidate(source.decision.primaryAsset) : null,
      selectedAssets: asArray(source?.decision?.selectedAssets).map((entry) => normalizeCandidate(entry)),
      rankedCandidates: asArray(source?.decision?.rankedCandidates).map((entry) => normalizeCandidate(entry)),
      proceduralFallback: isObject(source?.decision?.proceduralFallback)
        ? source.decision.proceduralFallback
        : {
          enabled: false,
          placeholderAsset: null
        }
    },
    diagnostics: isObject(source.diagnostics) ? source.diagnostics : {},
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

export function migrateAssetDiscoveryMatchingResolutionProfile(profile = {}) {
  const source = isObject(profile) ? profile : {};
  if (safeString(source.schemaVersion) === SCHEMA_VERSION) {
    return normalizeAssetDiscoveryMatchingResolutionProfile(source);
  }

  return normalizeAssetDiscoveryMatchingResolutionProfile({
    schemaVersion: SCHEMA_VERSION,
    status: source.status || 'resolved',
    mode: source.mode || (source?.decision?.proceduralFallback?.enabled ? 'procedural' : 'registry'),
    cacheKey: source.cacheKey || '',
    confidenceScore: source.confidenceScore,
    decision: {
      primaryAsset: source?.decision?.primaryAsset || source.primaryAsset || null,
      selectedAssets: source?.decision?.selectedAssets || source.selectedAssets || [],
      rankedCandidates: source?.decision?.rankedCandidates || source.ranked || [],
      proceduralFallback: source?.decision?.proceduralFallback || source.proceduralFallback || {
        enabled: false,
        placeholderAsset: null
      }
    },
    diagnostics: {
      ...(isObject(source.diagnostics) ? source.diagnostics : {}),
      migrated: true,
      sourceVersion: safeString(source.schemaVersion || 'legacy') || 'legacy'
    },
    metadata: isObject(source.metadata) ? source.metadata : {}
  });
}

function flattenContextText(input = {}) {
  const intent = normalizeIntent(input.learningIntent || {});
  const strategy = normalizeVisualizationStrategyProfile(input.visualizationStrategy || {});
  const recommendation = normalizeCapabilityTemplateRecommendation(input.capabilityRecommendation || {});
  const sceneMetadata = isObject(input.sceneMetadata) ? input.sceneMetadata : {};
  const objectMetadata = normalizeObjectMetadata(input.objectMetadata || []);

  const blocks = [
    intent.learningIntent,
    intent.educationalStrategy,
    intent.reasoningStyle,
    strategy?.primaryStrategy?.visualizationStyle || '',
    strategy?.primaryStrategy?.reasoningStrategy || '',
    strategy?.primaryStrategy?.learningMode || '',
    ...asArray(recommendation.recommendedCapabilities),
    ...asArray(recommendation.recommendedTemplates).map((entry) => {
      const template = isObject(entry) ? entry : {};
      return `${template.templateId || ''} ${template.semanticPurpose || ''}`;
    }),
    ...Object.values(sceneMetadata).filter((value) => typeof value === 'string'),
    ...objectMetadata.flatMap((entry) => [entry.name, entry.category, ...entry.tags])
  ];

  return sanitizeText(blocks.filter(Boolean).join(' '));
}

function scoreTokenOverlap(assetTokens = [], contextTokenSet = new Set()) {
  if (!assetTokens.length || contextTokenSet.size === 0) return 0;
  const overlap = assetTokens.reduce((count, token) => count + (contextTokenSet.has(token) ? 1 : 0), 0);
  return overlap / Math.max(assetTokens.length, 1);
}

function scoreAssetCandidate(contract = {}, context = {}) {
  const metadata = isObject(contract.metadata) ? contract.metadata : {};
  const text = [
    contract.id,
    contract.type,
    contract.category,
    contract.source,
    metadata.name,
    metadata.description,
    ...asArray(contract.tags),
    ...asArray(contract.capabilities)
  ].join(' ');

  const assetTokens = tokenize(text);
  const contextTokens = tokenize(context.text);
  const contextTokenSet = new Set(contextTokens);

  const overlapScore = scoreTokenOverlap(assetTokens, contextTokenSet);
  const capabilitiesScore = scoreTokenOverlap(
    asArray(contract.capabilities).map((value) => safeString(value).toLowerCase()),
    contextTokenSet
  );
  const objectCategorySignal = context.objectCategories.length
    ? scoreTokenOverlap(
      context.objectCategories.map((value) => safeString(value).toLowerCase()),
      new Set(assetTokens)
    )
    : 0;
  const recSignal = context.recommendedCapabilityTokens.size
    ? scoreTokenOverlap(assetTokens, context.recommendedCapabilityTokens)
    : 0;

  const score = clamp(
    (overlapScore * 0.46)
    + (capabilitiesScore * 0.2)
    + (objectCategorySignal * 0.17)
    + (recSignal * 0.12)
    + (clamp(context.intentConfidence, 0, 1) * 0.05),
    0,
    1
  );

  return score;
}

function resolveQualityLevel(contract = {}, performanceProfile = 'balanced') {
  const quality = isObject(contract.qualityLevels) ? contract.qualityLevels : {};
  const levels = {
    low: clamp(quality.low, 0, 1),
    medium: clamp(quality.medium, 0, 1),
    high: clamp(quality.high, 0, 1)
  };

  const sorted = Object.entries(levels).sort((a, b) => b[1] - a[1]);
  if (performanceProfile === 'low-power') {
    return sorted.reverse()[0]?.[0] || 'low';
  }

  if (performanceProfile === 'high-fidelity') {
    return sorted[0]?.[0] || 'high';
  }

  return safeString(quality.default || sorted[1]?.[0] || sorted[0]?.[0] || 'medium') || 'medium';
}

function resolveLodLevel(contract = {}, qualityLevel = 'medium', graphSummary = {}) {
  const lod = isObject(contract.lodSupport) ? contract.lodSupport : {};
  const levels = uniqueStrings(lod.levels || ['high', 'medium', 'low']).map((entry) => safeString(entry).toLowerCase());
  if (!levels.length) return 'medium';

  const density = toFiniteNumber(graphSummary.nodeCount, 0) + toFiniteNumber(graphSummary.relationshipCount, 0);
  if (density >= 80 && levels.includes('low')) return 'low';
  if (density >= 40 && levels.includes('medium')) return 'medium';
  if (levels.includes(qualityLevel.toLowerCase())) return qualityLevel.toLowerCase();
  if (levels.includes(safeString(lod.defaultLevel).toLowerCase())) return safeString(lod.defaultLevel).toLowerCase();
  return levels[0] || 'medium';
}

function buildProceduralFallback(input = {}, context = {}) {
  const strategy = normalizeVisualizationStrategyProfile(input.visualizationStrategy || {});
  const primary = strategy.primaryStrategy || {};

  return {
    enabled: true,
    placeholderAsset: {
      assetId: `procedural-${Date.now()}`,
      version: 'generated-v1',
      type: 'procedural-generated-asset',
      category: safeString(primary.visualizationStyle || 'Adaptive Visualization') || 'Adaptive Visualization',
      source: 'procedural-generator',
      rankScore: clamp(context.intentConfidence * 0.5 + 0.5, 0, 1),
      qualityLevel: context.performanceProfile === 'low-power' ? 'low' : 'medium',
      lodLevel: context.performanceProfile === 'high-fidelity' ? 'high' : 'medium',
      dependencies: [],
      metadata: {
        generated: true,
        supportsUnknownFutureTypes: true,
        fallbackReason: 'no-registry-match'
      },
      reason: 'procedural-fallback'
    }
  };
}

function buildContext(input = {}, options = {}) {
  const intent = normalizeIntent(input.learningIntent || {});
  const recommendation = normalizeCapabilityTemplateRecommendation(input.capabilityRecommendation || {});
  const sceneGraph = normalizeGraphSummary(input.sceneGraph || {});
  const runtimeGraph = normalizeGraphSummary(input.runtimeGraph || {});
  const objectMetadata = normalizeObjectMetadata(input.objectMetadata || []);

  const text = flattenContextText(input);
  const objectCategories = uniqueStrings(objectMetadata.map((entry) => entry.category));
  const recommendedCapabilityTokens = new Set(
    tokenize(asArray(recommendation.recommendedCapabilities).join(' '))
  );

  return {
    intentConfidence: intent.confidenceScore,
    text,
    objectCategories,
    recommendedCapabilityTokens,
    sceneGraph,
    runtimeGraph,
    objectMetadata,
    performanceProfile: safeString(options.performanceProfile || input.performanceProfile || 'balanced') || 'balanced'
  };
}

export class UniversalAssetDiscoveryMatchingResolutionEngine {
  constructor(options = {}) {
    this.options = isObject(options) ? options : {};
    this.registry = this.options.registry || getDefaultUniversalAssetRegistry();
    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey) || ENGINE_PERSISTENCE_KEY;
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
    const cacheKey = makeCacheKey(input);
    if (this.cache.has(cacheKey)) {
      this.diagnostics.cacheHits += 1;
      return deepClone(this.cache.get(cacheKey));
    }

    this.diagnostics.cacheMisses += 1;

    const context = buildContext(input, options);
    const contracts = this.registry.listContracts({ includeDeprecated: false });

    const ranked = contracts
      .map((contract) => ({
        contract,
        score: scoreAssetCandidate(contract, context)
      }))
      .sort((a, b) => b.score - a.score || safeString(a.contract.id).localeCompare(safeString(b.contract.id)));

    const selectedEntries = ranked.filter((entry) => entry.score > 0).slice(0, 5);
    const rankedCandidates = selectedEntries.map((entry) => {
      const qualityLevel = resolveQualityLevel(entry.contract, context.performanceProfile);
      const lodLevel = resolveLodLevel(
        entry.contract,
        qualityLevel,
        {
          nodeCount: context.sceneGraph.nodeCount + context.runtimeGraph.nodeCount,
          relationshipCount: context.sceneGraph.relationshipCount + context.runtimeGraph.relationshipCount
        }
      );
      return normalizeCandidate({
        assetId: entry.contract.id,
        version: entry.contract.version || 'latest',
        type: entry.contract.type,
        category: entry.contract.category,
        source: entry.contract.source,
        rankScore: entry.score,
        qualityLevel,
        lodLevel,
        dependencies: asArray(entry.contract.dependencies),
        metadata: isObject(entry.contract.metadata) ? entry.contract.metadata : {},
        reason: 'registry-rank'
      });
    });

    const dependencyResolution = rankedCandidates.length
      ? this.registry.resolveDependencies(rankedCandidates[0].assetId, rankedCandidates[0].version || 'latest')
      : {
        status: 'missing',
        root: null,
        resolved: [],
        missing: [],
        cycles: []
      };

    const confidenceScore = rankedCandidates.length
      ? clamp((rankedCandidates[0].rankScore * 0.75) + (context.intentConfidence * 0.25), 0, 1)
      : clamp(context.intentConfidence * 0.4, 0, 1);

    const proceduralFallback = rankedCandidates.length
      ? { enabled: false, placeholderAsset: null }
      : buildProceduralFallback(input, context);

    const selectedAssets = rankedCandidates.length
      ? rankedCandidates
      : [normalizeCandidate(proceduralFallback.placeholderAsset || {})];

    const profile = normalizeAssetDiscoveryMatchingResolutionProfile({
      schemaVersion: SCHEMA_VERSION,
      status: 'resolved',
      mode: rankedCandidates.length ? 'registry' : 'procedural',
      cacheKey,
      confidenceScore,
      decision: {
        primaryAsset: selectedAssets[0] || null,
        selectedAssets,
        rankedCandidates,
        proceduralFallback
      },
      diagnostics: {
        registryCandidateCount: contracts.length,
        rankedCandidateCount: rankedCandidates.length,
        dependencyResolution,
        sceneGraph: context.sceneGraph,
        runtimeGraph: context.runtimeGraph,
        performanceProfile: context.performanceProfile
      },
      metadata: {
        supportsProceduralAssets: true,
        supportsGeneratedAssets: true,
        supportsFutureAssetTypes: true,
        unresolvedRequiredDependencies: asArray(dependencyResolution?.missing)
          .filter((entry) => entry?.required !== false)
          .map((entry) => ({
            assetId: safeString(entry.assetId),
            version: safeString(entry.version || 'latest') || 'latest'
          }))
      }
    });

    this.cache.set(cacheKey, profile);
    this.persistCache();
    return deepClone(profile);
  }

  serialize(profile = {}) {
    return JSON.stringify(normalizeAssetDiscoveryMatchingResolutionProfile(profile));
  }

  deserialize(serialized = '') {
    const parsed = parsePayload(serialized);
    if (!parsed) {
      this.warn('Failed to deserialize asset discovery profile.');
      return normalizeAssetDiscoveryMatchingResolutionProfile({});
    }

    return migrateAssetDiscoveryMatchingResolutionProfile(parsed);
  }

  persistCache() {
    if (!this.persistenceAdapter) return false;

    const payload = {
      schemaVersion: SCHEMA_VERSION,
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
      this.warn('Corrupted asset discovery cache detected.');
      this.cache = new Map();
      this.diagnostics.recoveries += 1;
      return false;
    }

    this.cache = new Map(
      parsed.entries
        .filter((entry) => Array.isArray(entry) && entry.length === 2)
        .map(([key, value]) => [String(key), migrateAssetDiscoveryMatchingResolutionProfile(value)])
    );

    this.diagnostics.recoveries += 1;
    return true;
  }

  snapshot() {
    return {
      schemaVersion: SCHEMA_VERSION,
      cacheSize: this.cache.size,
      persistenceKey: this.persistenceKey,
      diagnostics: deepClone(this.diagnostics)
    };
  }
}

export function createUniversalAssetDiscoveryMatchingResolutionEngine(options = {}) {
  return new UniversalAssetDiscoveryMatchingResolutionEngine(options);
}

const defaultEngine = createUniversalAssetDiscoveryMatchingResolutionEngine();

export function analyzeUniversalAssetDiscoveryMatchingResolution(input = {}, options = {}) {
  if (options?.engine && typeof options.engine.analyze === 'function') {
    return options.engine.analyze(input, options);
  }

  return defaultEngine.analyze(input, options);
}
