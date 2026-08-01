import { getDefaultUniversalAssetRegistry } from '../asset-registry/index.js';
import { analyzeUniversalAssetDiscoveryMatchingResolution } from '../asset-discovery/index.js';

const STORE_KEY = '__daksha_universal_asset_loading_runtime_store__';
const SCHEMA_VERSION = 'v1';
const DEFAULT_PERSISTENCE_KEY = 'daksha.universal.asset.loading.runtime.v1';
const DEFAULT_DISK_CACHE_KEY = 'daksha.universal.asset.loading.disk-cache.v1';

function safeString(value) {
  return String(value || '').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(Math.max(toFiniteNumber(value, minimum), minimum), maximum);
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

function normalizeId(value, fallbackPrefix = 'asset') {
  const text = safeString(value);
  if (text) return text;
  return `${fallbackPrefix}-${Date.now()}`;
}

function estimateBytes(payload) {
  try {
    return Math.max(64, JSON.stringify(payload).length * 2);
  } catch {
    return 64;
  }
}

function hashKey(input = '') {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
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
  const local = globalThis?.localStorage;
  if (local && typeof local.getItem === 'function' && typeof local.setItem === 'function') {
    return local;
  }

  return createInMemoryStore();
}

function createChannelSet() {
  return new Map();
}

function safeEmit(listenersMap, channel, payload) {
  const listeners = listenersMap.get(channel);
  if (!listeners || listeners.size === 0) return;

  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // Listener failure must never break asset loading pipeline.
    }
  });
}

function normalizeCachePolicy(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    memoryCache: source.memoryCache !== false,
    runtimeCache: source.runtimeCache !== false,
    persistentCache: source.persistentCache !== false,
    diskCache: source.diskCache === true,
    maxEntries: Math.max(1, toFiniteNumber(source.maxEntries, 240)),
    maxMemoryMB: Math.max(8, toFiniteNumber(source.maxMemoryMB, 256)),
    ttlMs: Math.max(60 * 1000, toFiniteNumber(source.ttlMs, 20 * 60 * 1000)),
    idleDisposeMs: Math.max(30 * 1000, toFiniteNumber(source.idleDisposeMs, 10 * 60 * 1000))
  };
}

function normalizeLoadRequestProfile(request = {}) {
  const source = isObject(request) ? request : {};
  const candidates = asArray(source.candidates)
    .map((entry, index) => {
      const value = isObject(entry) ? entry : {};
      return {
        assetId: normalizeId(value.assetId || value.id, `candidate-${index + 1}`),
        version: safeString(value.version || 'latest') || 'latest',
        type: safeString(value.type || 'unknown-asset-type') || 'unknown-asset-type',
        category: safeString(value.category || 'General') || 'General',
        source: safeString(value.source || 'registry') || 'registry',
        rankScore: clamp(value.rankScore, 0, 1),
        qualityLevel: safeString(value.qualityLevel || 'medium') || 'medium',
        lodLevel: safeString(value.lodLevel || 'medium') || 'medium',
        dependencies: asArray(value.dependencies),
        fallbackAssetIds: asArray(value.fallbackAssetIds),
        metadata: isObject(value.metadata) ? value.metadata : {}
      };
    });

  return {
    schemaVersion: SCHEMA_VERSION,
    requestId: normalizeId(source.requestId || source.id, 'asset-load-request'),
    mode: safeString(source.mode || 'lazy') || 'lazy',
    priority: safeString(source.priority || 'normal') || 'normal',
    progressive: source.progressive === true,
    streaming: source.streaming === true,
    preload: source.preload === true,
    background: source.background === true,
    loadDependencies: source.loadDependencies !== false,
    maxRetries: Math.max(0, Math.min(8, toFiniteNumber(source.maxRetries, 2))),
    timeoutMs: Math.max(100, toFiniteNumber(source.timeoutMs, 2500)),
    targetMemoryMB: Math.max(8, toFiniteNumber(source.targetMemoryMB, 256)),
    cachePolicy: normalizeCachePolicy(source.cachePolicy || {}),
    candidates,
    fallbackCandidates: asArray(source.fallbackCandidates),
    discoveryProfile: isObject(source.discoveryProfile) ? source.discoveryProfile : null,
    runtimeGraph: isObject(source.runtimeGraph) ? source.runtimeGraph : {},
    sceneGraph: isObject(source.sceneGraph) ? source.sceneGraph : {},
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function migrateLoadRequestProfile(profile = {}) {
  const source = isObject(profile) ? profile : {};
  if (safeString(source.schemaVersion) === SCHEMA_VERSION) {
    return normalizeLoadRequestProfile(source);
  }

  return normalizeLoadRequestProfile({
    schemaVersion: SCHEMA_VERSION,
    requestId: source.requestId || source.id,
    mode: source.mode,
    priority: source.priority,
    progressive: source.progressive,
    streaming: source.streaming,
    preload: source.preload,
    background: source.background,
    maxRetries: source.maxRetries,
    timeoutMs: source.timeoutMs,
    targetMemoryMB: source.targetMemoryMB,
    cachePolicy: source.cachePolicy || source.cache,
    candidates: source.candidates || source.selectedAssets || [],
    fallbackCandidates: source.fallbackCandidates || source.fallbackAssets || [],
    discoveryProfile: source.discoveryProfile || source.assetDiscovery,
    runtimeGraph: source.runtimeGraph,
    sceneGraph: source.sceneGraph,
    metadata: {
      ...(isObject(source.metadata) ? source.metadata : {}),
      migrated: true,
      sourceVersion: safeString(source.schemaVersion || 'legacy') || 'legacy'
    }
  });
}

function normalizeRuntimeStateProfile(state = {}) {
  const source = isObject(state) ? state : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    timelineTimeMs: Math.max(0, toFiniteNumber(source.timelineTimeMs, 0)),
    cachePolicy: normalizeCachePolicy(source.cachePolicy || {}),
    cacheStats: {
      memoryEntries: Math.max(0, toFiniteNumber(source?.cacheStats?.memoryEntries, 0)),
      runtimeEntries: Math.max(0, toFiniteNumber(source?.cacheStats?.runtimeEntries, 0)),
      persistentEntries: Math.max(0, toFiniteNumber(source?.cacheStats?.persistentEntries, 0)),
      diskEntries: Math.max(0, toFiniteNumber(source?.cacheStats?.diskEntries, 0)),
      cacheHits: Math.max(0, toFiniteNumber(source?.cacheStats?.cacheHits, 0)),
      cacheMisses: Math.max(0, toFiniteNumber(source?.cacheStats?.cacheMisses, 0)),
      duplicatePrevented: Math.max(0, toFiniteNumber(source?.cacheStats?.duplicatePrevented, 0))
    },
    memory: {
      totalBytes: Math.max(0, toFiniteNumber(source?.memory?.totalBytes, 0)),
      activeBytes: Math.max(0, toFiniteNumber(source?.memory?.activeBytes, 0)),
      totalEntries: Math.max(0, toFiniteNumber(source?.memory?.totalEntries, 0)),
      budgetBytes: Math.max(1, toFiniteNumber(source?.memory?.budgetBytes, 256 * 1024 * 1024)),
      pressure: clamp(source?.memory?.pressure, 0, 1)
    },
    metrics: {
      loadRequests: Math.max(0, toFiniteNumber(source?.metrics?.loadRequests, 0)),
      loadedAssets: Math.max(0, toFiniteNumber(source?.metrics?.loadedAssets, 0)),
      failedLoads: Math.max(0, toFiniteNumber(source?.metrics?.failedLoads, 0)),
      retries: Math.max(0, toFiniteNumber(source?.metrics?.retries, 0)),
      preloads: Math.max(0, toFiniteNumber(source?.metrics?.preloads, 0)),
      backgroundLoads: Math.max(0, toFiniteNumber(source?.metrics?.backgroundLoads, 0)),
      dependencyLoads: Math.max(0, toFiniteNumber(source?.metrics?.dependencyLoads, 0)),
      progressiveLoads: Math.max(0, toFiniteNumber(source?.metrics?.progressiveLoads, 0)),
      streamingLoads: Math.max(0, toFiniteNumber(source?.metrics?.streamingLoads, 0)),
      disposals: Math.max(0, toFiniteNumber(source?.metrics?.disposals, 0)),
      gcRuns: Math.max(0, toFiniteNumber(source?.metrics?.gcRuns, 0))
    },
    queues: {
      inflight: Math.max(0, toFiniteNumber(source?.queues?.inflight, 0)),
      background: Math.max(0, toFiniteNumber(source?.queues?.background, 0))
    },
    diagnostics: {
      warnings: asArray(source?.diagnostics?.warnings),
      errors: asArray(source?.diagnostics?.errors),
      recoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveries, 0))
    },
    lastOperation: isObject(source.lastOperation) ? source.lastOperation : null
  };
}

function migrateRuntimeStateProfile(state = {}) {
  const source = isObject(state) ? state : {};
  if (safeString(source.schemaVersion) === SCHEMA_VERSION) {
    return normalizeRuntimeStateProfile(source);
  }

  return normalizeRuntimeStateProfile({
    schemaVersion: SCHEMA_VERSION,
    timelineTimeMs: source.timelineTimeMs,
    cachePolicy: source.cachePolicy || source.cache,
    cacheStats: source.cacheStats,
    memory: source.memory,
    metrics: source.metrics,
    queues: source.queues,
    diagnostics: {
      ...(isObject(source.diagnostics) ? source.diagnostics : {}),
      warnings: [
        ...asArray(source?.diagnostics?.warnings),
        'Runtime state profile migrated from legacy format.'
      ]
    },
    lastOperation: source.lastOperation
  });
}

function toCacheKey(candidate = {}) {
  const payload = JSON.stringify({
    assetId: safeString(candidate.assetId || candidate.id),
    version: safeString(candidate.version || 'latest') || 'latest',
    type: safeString(candidate.type || 'unknown-asset-type') || 'unknown-asset-type',
    lodLevel: safeString(candidate.lodLevel || 'medium') || 'medium',
    qualityLevel: safeString(candidate.qualityLevel || 'medium') || 'medium'
  });

  return `asset-load-${hashKey(payload)}`;
}

function buildProceduralCandidate(seed = {}) {
  const source = isObject(seed) ? seed : {};
  return {
    assetId: normalizeId(source.assetId || source.id, 'procedural-runtime-asset'),
    version: safeString(source.version || 'generated-v1') || 'generated-v1',
    type: safeString(source.type || 'procedural-generated-asset') || 'procedural-generated-asset',
    category: safeString(source.category || 'Adaptive Visualization') || 'Adaptive Visualization',
    source: safeString(source.source || 'procedural-generator') || 'procedural-generator',
    rankScore: clamp(source.rankScore, 0, 1),
    qualityLevel: safeString(source.qualityLevel || 'medium') || 'medium',
    lodLevel: safeString(source.lodLevel || 'medium') || 'medium',
    dependencies: asArray(source.dependencies),
    fallbackAssetIds: asArray(source.fallbackAssetIds),
    metadata: {
      generated: true,
      supportsUnknownFutureTypes: true,
      ...(isObject(source.metadata) ? source.metadata : {})
    }
  };
}

function normalizeCandidate(entry = {}, index = 0) {
  const source = isObject(entry) ? entry : {};
  return {
    assetId: normalizeId(source.assetId || source.id, `candidate-${index + 1}`),
    version: safeString(source.version || 'latest') || 'latest',
    type: safeString(source.type || 'unknown-asset-type') || 'unknown-asset-type',
    category: safeString(source.category || 'General') || 'General',
    source: safeString(source.source || 'registry') || 'registry',
    rankScore: clamp(source.rankScore, 0, 1),
    qualityLevel: safeString(source.qualityLevel || 'medium') || 'medium',
    lodLevel: safeString(source.lodLevel || 'medium') || 'medium',
    dependencies: asArray(source.dependencies),
    fallbackAssetIds: asArray(source.fallbackAssetIds),
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function createDefaultAssetPayload(candidate = {}, context = {}) {
  const runtimeFeatures = {
    lazy: context.request.mode === 'lazy',
    preload: context.request.preload === true,
    background: context.request.background === true,
    progressive: context.request.progressive === true,
    streaming: context.request.streaming === true,
    lod: candidate.lodLevel,
    quality: candidate.qualityLevel
  };

  return {
    schemaVersion: 'v1',
    assetId: candidate.assetId,
    version: candidate.version,
    type: candidate.type,
    category: candidate.category,
    source: candidate.source,
    metadata: {
      ...(candidate.metadata || {}),
      runtimeFeatures,
      dependencies: asArray(candidate.dependencies)
    }
  };
}

export class UniversalAssetLoadingRuntime {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = isObject(options) ? options : {};
    this.registry = this.options.registry || getDefaultUniversalAssetRegistry();
    this.discoveryAnalyzer = this.options.discoveryAnalyzer || analyzeUniversalAssetDiscoveryMatchingResolution;
    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey) || DEFAULT_PERSISTENCE_KEY;
    this.diskCacheKey = safeString(this.options.diskCacheKey) || DEFAULT_DISK_CACHE_KEY;
    this.cachePolicy = normalizeCachePolicy(this.options.cachePolicy || runtime?.metadata?.assetLoading?.cachePolicy || {});

    this.listeners = createChannelSet();
    this.inflight = new Map();
    this.backgroundQueue = [];
    this.entries = new Map();
    this.diskEntries = new Map();

    this.visibleAssetIds = new Set();
    this.activeAssetIds = new Set();

    this.state = normalizeRuntimeStateProfile({
      cachePolicy: this.cachePolicy,
      memory: {
        budgetBytes: this.cachePolicy.maxMemoryMB * 1024 * 1024,
        totalBytes: 0,
        activeBytes: 0,
        totalEntries: 0,
        pressure: 0
      },
      cacheStats: {
        memoryEntries: 0,
        runtimeEntries: 0,
        persistentEntries: 0,
        diskEntries: 0,
        cacheHits: 0,
        cacheMisses: 0,
        duplicatePrevented: 0
      },
      metrics: {
        loadRequests: 0,
        loadedAssets: 0,
        failedLoads: 0,
        retries: 0,
        preloads: 0,
        backgroundLoads: 0,
        dependencyLoads: 0,
        progressiveLoads: 0,
        streamingLoads: 0,
        disposals: 0,
        gcRuns: 0
      },
      queues: {
        inflight: 0,
        background: 0
      },
      diagnostics: {
        warnings: [],
        errors: [],
        recoveries: 0
      },
      lastOperation: null
    });

    this.recoverSession();
    this.recoverDiskCache();
    this.synchronize('boot');
  }

  on(channel, listener) {
    const safeChannel = safeString(channel) || '*';
    if (typeof listener !== 'function') {
      throw new Error('UniversalAssetLoadingRuntime listener must be a function.');
    }

    if (!this.listeners.has(safeChannel)) {
      this.listeners.set(safeChannel, new Set());
    }

    this.listeners.get(safeChannel).add(listener);
    return () => this.off(safeChannel, listener);
  }

  off(channel, listener) {
    const safeChannel = safeString(channel) || '*';
    const listeners = this.listeners.get(safeChannel);
    if (!listeners) return false;
    return listeners.delete(listener);
  }

  emit(channel, payload = {}) {
    const safeChannel = safeString(channel) || 'asset-runtime-event';
    const message = {
      channel: safeChannel,
      payload,
      state: this.snapshot(),
      timestamp: Date.now()
    };

    safeEmit(this.listeners, safeChannel, message);
    safeEmit(this.listeners, '*', message);
    return message;
  }

  warn(message = 'Unknown warning') {
    this.state.diagnostics.warnings.push(safeString(message));
    if (this.state.diagnostics.warnings.length > 400) {
      this.state.diagnostics.warnings.shift();
    }
  }

  error(message = 'Unknown error') {
    this.state.diagnostics.errors.push(safeString(message));
    if (this.state.diagnostics.errors.length > 400) {
      this.state.diagnostics.errors.shift();
    }
  }

  validateLoadRequest(request = {}) {
    const profile = migrateLoadRequestProfile(request);
    const errors = [];

    if (!profile.candidates.length && !profile.discoveryProfile) {
      errors.push('Asset load request requires candidates or discoveryProfile.');
    }

    if (profile.targetMemoryMB < 8) {
      errors.push('Asset load request targetMemoryMB is too low.');
    }

    return {
      valid: errors.length === 0,
      errors,
      profile
    };
  }

  normalizeLoadCandidates(profile = {}) {
    const source = migrateLoadRequestProfile(profile);
    const directCandidates = source.candidates.map((entry, index) => normalizeCandidate(entry, index));
    if (directCandidates.length) return directCandidates;

    const discovery = isObject(source.discoveryProfile)
      ? source.discoveryProfile
      : isObject(this.runtime?.metadata?.assetDiscovery)
        ? this.runtime.metadata.assetDiscovery
        : null;

    const fromDiscovery = [];
    asArray(discovery?.decision?.selectedAssets).forEach((candidate, index) => {
      fromDiscovery.push(normalizeCandidate(candidate, index));
    });
    asArray(discovery?.decision?.rankedCandidates).forEach((candidate, index) => {
      fromDiscovery.push(normalizeCandidate(candidate, index + fromDiscovery.length));
    });

    if (fromDiscovery.length) {
      const seen = new Set();
      return fromDiscovery.filter((candidate) => {
        const key = `${candidate.assetId}::${candidate.version}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    if (discovery?.decision?.proceduralFallback?.enabled === true) {
      return [buildProceduralCandidate(discovery?.decision?.proceduralFallback?.placeholderAsset || {})];
    }

    return [];
  }

  resolveDependencies(candidate = {}, requestProfile = {}) {
    if (requestProfile.loadDependencies === false) return [];
    if (!candidate?.assetId) return [];

    const resolved = this.registry.resolveDependencies(candidate.assetId, candidate.version || 'latest');
    const list = [];

    asArray(resolved.resolved).forEach((contract, index) => {
      list.push(normalizeCandidate({
        assetId: contract.id,
        version: contract.version,
        type: contract.type,
        category: contract.category,
        source: contract.source,
        qualityLevel: contract?.qualityLevels?.default || candidate.qualityLevel || 'medium',
        lodLevel: contract?.lodSupport?.defaultLevel || candidate.lodLevel || 'medium',
        metadata: contract.metadata || {}
      }, index));
    });

    if (asArray(resolved.missing).some((entry) => entry?.required !== false)) {
      this.warn(`Missing required dependencies for ${candidate.assetId}.`);
    }

    return list;
  }

  resolveLoader(candidate = {}) {
    const key = safeString(candidate.type || 'unknown-asset-type').toLowerCase();
    const byType = isObject(this.options.loaders) ? this.options.loaders : {};

    if (typeof byType[key] === 'function') {
      return byType[key];
    }

    if (typeof byType['*'] === 'function') {
      return byType['*'];
    }

    return async ({ candidate: inputCandidate, request, context }) => createDefaultAssetPayload(inputCandidate, {
      request,
      context
    });
  }

  shouldUseCache(entry = {}, requestProfile = {}) {
    const now = Date.now();
    const ttl = requestProfile.cachePolicy.ttlMs || this.cachePolicy.ttlMs;
    if (!entry || entry.status !== 'loaded') return false;
    if (now - Number(entry.loadedAt || 0) > ttl) return false;
    return true;
  }

  updateMemoryStats() {
    let totalBytes = 0;
    let activeBytes = 0;
    let memoryEntries = 0;
    let runtimeEntries = 0;
    let persistentEntries = 0;

    this.entries.forEach((entry) => {
      totalBytes += Number(entry.bytes || 0);
      if (Number(entry.references || 0) > 0 || this.activeAssetIds.has(entry.assetId)) {
        activeBytes += Number(entry.bytes || 0);
      }
      if (entry?.cacheLayers?.memoryCache) memoryEntries += 1;
      if (entry?.cacheLayers?.runtimeCache) runtimeEntries += 1;
      if (entry?.cacheLayers?.persistentCache) persistentEntries += 1;
    });

    this.state.memory.totalBytes = totalBytes;
    this.state.memory.activeBytes = activeBytes;
    this.state.memory.totalEntries = this.entries.size;
    this.state.memory.budgetBytes = this.cachePolicy.maxMemoryMB * 1024 * 1024;
    this.state.memory.pressure = clamp(totalBytes / Math.max(1, this.state.memory.budgetBytes), 0, 2);

    this.state.cacheStats.memoryEntries = memoryEntries;
    this.state.cacheStats.runtimeEntries = runtimeEntries;
    this.state.cacheStats.persistentEntries = persistentEntries;
    this.state.cacheStats.diskEntries = this.diskEntries.size;
    this.state.queues.inflight = this.inflight.size;
    this.state.queues.background = this.backgroundQueue.length;
  }

  touchEntry(entry = {}, options = {}) {
    entry.lastAccessedAt = Date.now();
    if (options.acquire !== false) {
      entry.references = Math.max(0, toFiniteNumber(entry.references, 0) + 1);
    }
    if (options.visible === true) {
      this.visibleAssetIds.add(entry.assetId);
    }
    if (options.active === true) {
      this.activeAssetIds.add(entry.assetId);
    }
  }

  resolveAssetEntry(candidate = {}) {
    const cacheKey = toCacheKey(candidate);
    return this.entries.get(cacheKey) || null;
  }

  storeAssetEntry(candidate = {}, payload, requestProfile = {}) {
    const now = Date.now();
    const cacheKey = toCacheKey(candidate);
    const existing = this.entries.get(cacheKey);
    const cacheLayers = {
      memoryCache: requestProfile.cachePolicy.memoryCache !== false,
      runtimeCache: requestProfile.cachePolicy.runtimeCache !== false,
      persistentCache: requestProfile.cachePolicy.persistentCache === true,
      diskCache: requestProfile.cachePolicy.diskCache === true
    };

    const entry = {
      cacheKey,
      assetId: candidate.assetId,
      version: candidate.version,
      type: candidate.type,
      category: candidate.category,
      source: candidate.source,
      qualityLevel: candidate.qualityLevel,
      lodLevel: candidate.lodLevel,
      metadata: candidate.metadata || {},
      dependencies: asArray(candidate.dependencies),
      payload,
      bytes: estimateBytes(payload),
      loadedAt: now,
      lastAccessedAt: now,
      lastUsedAt: now,
      status: 'loaded',
      references: Math.max(1, toFiniteNumber(existing?.references, 0)),
      retries: Math.max(0, toFiniteNumber(existing?.retries, 0)),
      fallbackUsed: existing?.fallbackUsed === true,
      progressive: requestProfile.progressive === true,
      streaming: requestProfile.streaming === true,
      cacheLayers
    };

    this.entries.set(cacheKey, entry);

    if (cacheLayers.diskCache) {
      this.diskEntries.set(cacheKey, {
        cacheKey,
        assetId: entry.assetId,
        version: entry.version,
        payload,
        updatedAt: now
      });
    }

    this.state.metrics.loadedAssets += 1;
    this.state.lastOperation = {
      type: 'store',
      assetId: entry.assetId,
      cacheKey,
      at: now
    };

    this.updateMemoryStats();
    return entry;
  }

  async runLoader(candidate = {}, requestProfile = {}, context = {}) {
    const loader = this.resolveLoader(candidate);
    const result = await loader({
      candidate,
      request: requestProfile,
      runtime: this.runtime,
      context
    });

    if (result === null || result === undefined) {
      return createDefaultAssetPayload(candidate, { request: requestProfile, context });
    }

    return result;
  }

  async loadCandidateWithRetry(candidate = {}, requestProfile = {}, context = {}) {
    const retries = Math.max(0, toFiniteNumber(requestProfile.maxRetries, 2));
    let attempt = 0;
    let lastError = null;

    while (attempt <= retries) {
      try {
        if (attempt > 0) {
          this.state.metrics.retries += 1;
        }

        const payload = await this.runLoader(candidate, requestProfile, {
          ...context,
          attempt
        });

        const entry = this.storeAssetEntry(candidate, payload, requestProfile);
        return {
          status: 'loaded',
          entry,
          attempts: attempt + 1,
          fallbackUsed: context.fallbackUsed === true,
          candidate
        };
      } catch (error) {
        lastError = error;
        attempt += 1;
      }
    }

    this.state.metrics.failedLoads += 1;
    this.error(`Asset load failed for ${candidate.assetId}: ${safeString(lastError?.message || 'unknown error')}`);
    return {
      status: 'failed',
      error: lastError,
      attempts: retries + 1,
      fallbackUsed: context.fallbackUsed === true,
      candidate
    };
  }

  buildFallbackCandidates(candidate = {}, requestProfile = {}) {
    const generated = [];

    asArray(candidate.fallbackAssetIds).forEach((assetId, index) => {
      const contract = this.registry.lookup(assetId, 'latest');
      if (!contract) return;
      generated.push(normalizeCandidate({
        assetId: contract.id,
        version: contract.version,
        type: contract.type,
        category: contract.category,
        source: contract.source,
        qualityLevel: contract?.qualityLevels?.default || candidate.qualityLevel || 'medium',
        lodLevel: contract?.lodSupport?.defaultLevel || candidate.lodLevel || 'medium',
        metadata: contract.metadata || {},
        dependencies: contract.dependencies || []
      }, index));
    });

    asArray(requestProfile.fallbackCandidates).forEach((entry, index) => {
      generated.push(normalizeCandidate(entry, index + generated.length));
    });

    const procedural = buildProceduralCandidate({
      assetId: `${candidate.assetId}-procedural-fallback`,
      category: candidate.category,
      qualityLevel: candidate.qualityLevel,
      lodLevel: candidate.lodLevel,
      metadata: {
        fallbackReason: 'loader-failure',
        originalAssetId: candidate.assetId
      }
    });

    generated.push(procedural);

    const seen = new Set();
    return generated.filter((entry) => {
      const key = `${entry.assetId}::${entry.version}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async loadCandidateWithFallback(candidate = {}, requestProfile = {}, context = {}) {
    const primary = await this.loadCandidateWithRetry(candidate, requestProfile, {
      ...context,
      fallbackUsed: false
    });

    if (primary.status === 'loaded') {
      return primary;
    }

    const fallbacks = this.buildFallbackCandidates(candidate, requestProfile);

    for (const fallback of fallbacks) {
      const result = await this.loadCandidateWithRetry(fallback, requestProfile, {
        ...context,
        fallbackUsed: true,
        fallbackFor: candidate.assetId
      });
      if (result.status === 'loaded') {
        result.fallbackUsed = true;
        return result;
      }
    }

    return primary;
  }

  async loadDependencies(candidate = {}, requestProfile = {}, options = {}) {
    const dependencies = this.resolveDependencies(candidate, requestProfile);
    const loaded = [];

    for (const dependency of dependencies) {
      const result = await this.load({
        requestId: `${requestProfile.requestId}-dependency-${dependency.assetId}`,
        mode: 'lazy',
        priority: 'normal',
        candidates: [dependency],
        maxRetries: requestProfile.maxRetries,
        cachePolicy: requestProfile.cachePolicy,
        progressive: false,
        streaming: false,
        loadDependencies: false,
        metadata: {
          source: 'dependency-loader',
          parentAssetId: candidate.assetId
        }
      }, {
        acquire: options.acquire !== false,
        visible: false,
        active: false,
        skipGc: true
      });

      if (result.status === 'loaded') {
        loaded.push(result.entry.assetId);
        this.state.metrics.dependencyLoads += 1;
      }
    }

    return loaded;
  }

  async load(request = {}, options = {}) {
    const validation = this.validateLoadRequest(request);
    if (!validation.valid) {
      validation.errors.forEach((entry) => this.error(entry));
      return {
        status: 'failed',
        errors: validation.errors,
        request: validation.profile,
        entry: null
      };
    }

    const requestProfile = validation.profile;
    const candidates = this.normalizeLoadCandidates(requestProfile);

    if (!candidates.length) {
      const procedural = buildProceduralCandidate({
        assetId: `${requestProfile.requestId}-procedural`,
        category: 'Adaptive Visualization'
      });
      candidates.push(procedural);
    }

    this.state.metrics.loadRequests += 1;
    if (requestProfile.preload) this.state.metrics.preloads += 1;
    if (requestProfile.background) this.state.metrics.backgroundLoads += 1;
    if (requestProfile.progressive) this.state.metrics.progressiveLoads += 1;
    if (requestProfile.streaming) this.state.metrics.streamingLoads += 1;

    const primary = candidates[0];
    const cacheKey = toCacheKey(primary);

    const cached = this.entries.get(cacheKey);
    if (cached && this.shouldUseCache(cached, requestProfile)) {
      this.state.cacheStats.cacheHits += 1;
      this.touchEntry(cached, {
        acquire: options.acquire !== false,
        visible: options.visible === true,
        active: options.active === true
      });
      this.updateMemoryStats();
      this.synchronize('cache-hit', {
        assetId: cached.assetId,
        requestId: requestProfile.requestId
      });
      return {
        status: 'loaded',
        fromCache: true,
        request: requestProfile,
        entry: deepClone(cached),
        diagnostics: {
          cacheKey,
          fallbackUsed: cached.fallbackUsed === true,
          dependenciesLoaded: []
        }
      };
    }

    this.state.cacheStats.cacheMisses += 1;

    if (this.inflight.has(cacheKey)) {
      this.state.cacheStats.duplicatePrevented += 1;
      const sharedPromise = this.inflight.get(cacheKey);
      const sharedResult = await sharedPromise;
      return {
        ...sharedResult,
        duplicatePrevented: true
      };
    }

    const job = (async () => {
      const dependencyAssetIds = requestProfile.loadDependencies !== false
        ? await this.loadDependencies(primary, requestProfile, options)
        : [];

      const result = await this.loadCandidateWithFallback(primary, requestProfile, {
        requestId: requestProfile.requestId,
        dependencyAssetIds
      });

      if (result.status !== 'loaded') {
        const failure = {
          status: 'failed',
          request: requestProfile,
          entry: null,
          diagnostics: {
            cacheKey,
            fallbackUsed: false,
            dependenciesLoaded: dependencyAssetIds,
            attempts: result.attempts,
            error: safeString(result?.error?.message || 'unknown')
          }
        };
        this.synchronize('load-failed', {
          assetId: primary.assetId,
          requestId: requestProfile.requestId
        });
        return failure;
      }

      const loadedEntry = this.entries.get(toCacheKey(result.entry || primary));
      if (loadedEntry) {
        this.touchEntry(loadedEntry, {
          acquire: options.acquire !== false,
          visible: options.visible === true,
          active: options.active === true
        });
      }

      if (this.entries.size > requestProfile.cachePolicy.maxEntries) {
        this.collectGarbage({ reason: 'max-entries' });
      }

      if (options.skipGc !== true) {
        this.collectGarbage({ reason: 'post-load' });
      }

      this.updateMemoryStats();
      this.synchronize('asset-loaded', {
        assetId: result.entry.assetId,
        requestId: requestProfile.requestId,
        fallbackUsed: result.fallbackUsed === true
      });

      return {
        status: 'loaded',
        fromCache: false,
        request: requestProfile,
        entry: deepClone(result.entry),
        diagnostics: {
          cacheKey,
          fallbackUsed: result.fallbackUsed === true,
          dependenciesLoaded: dependencyAssetIds,
          attempts: result.attempts
        }
      };
    })();

    this.inflight.set(cacheKey, job);

    try {
      const output = await job;
      return output;
    } finally {
      this.inflight.delete(cacheKey);
      this.updateMemoryStats();
    }
  }

  async lazyLoad(request = {}, options = {}) {
    return this.load({
      ...request,
      mode: request.mode || 'lazy'
    }, options);
  }

  async preloadAssets(requests = [], options = {}) {
    const list = asArray(requests);
    const results = [];

    for (const request of list) {
      const result = await this.load({
        ...(isObject(request) ? request : {}),
        preload: true,
        mode: 'preload',
        priority: 'low'
      }, {
        ...options,
        acquire: options.acquire === true
      });
      results.push(result);
    }

    this.synchronize('preload-complete', {
      count: results.length
    });

    return results;
  }

  queueBackgroundLoad(request = {}) {
    const queued = migrateLoadRequestProfile({
      ...(isObject(request) ? request : {}),
      background: true,
      mode: 'background'
    });

    this.backgroundQueue.push(queued);
    this.updateMemoryStats();
    this.synchronize('background-queued', {
      requestId: queued.requestId
    });

    if (this.options.autoProcessBackground !== false) {
      Promise.resolve().then(() => this.processBackgroundQueue()).catch(() => {});
    }

    return {
      status: 'queued',
      requestId: queued.requestId,
      queueLength: this.backgroundQueue.length
    };
  }

  async processBackgroundQueue(limit = Infinity) {
    const max = Math.max(0, toFiniteNumber(limit, Number.POSITIVE_INFINITY));
    const results = [];

    while (this.backgroundQueue.length > 0 && results.length < max) {
      const request = this.backgroundQueue.shift();
      const result = await this.load(request, {
        acquire: false,
        visible: false,
        active: false
      });
      results.push(result);
    }

    this.updateMemoryStats();
    this.synchronize('background-processed', {
      processed: results.length
    });

    return results;
  }

  updateAssetUsage(input = {}) {
    const source = isObject(input) ? input : {};
    this.visibleAssetIds = new Set(asArray(source.visibleAssetIds).map((value) => safeString(value)).filter(Boolean));
    this.activeAssetIds = new Set(asArray(source.activeAssetIds).map((value) => safeString(value)).filter(Boolean));

    this.entries.forEach((entry) => {
      if (this.visibleAssetIds.has(entry.assetId) || this.activeAssetIds.has(entry.assetId)) {
        entry.lastUsedAt = Date.now();
      }
    });

    this.synchronize('asset-usage-updated', {
      visibleCount: this.visibleAssetIds.size,
      activeCount: this.activeAssetIds.size
    });
  }

  releaseAsset(assetId = '', version = 'latest') {
    const id = safeString(assetId);
    if (!id) return false;

    let released = false;
    this.entries.forEach((entry) => {
      const sameId = entry.assetId === id;
      const sameVersion = version === 'latest' || entry.version === version;
      if (!sameId || !sameVersion) return;
      entry.references = Math.max(0, toFiniteNumber(entry.references, 0) - 1);
      released = true;
    });

    if (released) {
      this.collectGarbage({ reason: 'release' });
    }

    return released;
  }

  disposeAsset(assetId = '', version = 'latest', reason = 'manual-dispose') {
    const id = safeString(assetId);
    if (!id) return false;

    const keys = [];
    this.entries.forEach((entry, key) => {
      if (entry.assetId !== id) return;
      if (version !== 'latest' && entry.version !== version) return;
      keys.push(key);
    });

    keys.forEach((key) => {
      this.entries.delete(key);
      this.diskEntries.delete(key);
      this.state.metrics.disposals += 1;
    });

    if (keys.length) {
      this.updateMemoryStats();
      this.synchronize('asset-disposed', {
        assetId: id,
        version,
        count: keys.length,
        reason
      });
      return true;
    }

    return false;
  }

  collectGarbage(options = {}) {
    const now = Date.now();
    const reason = safeString(options.reason || 'gc') || 'gc';
    const idleLimitMs = Math.max(1000, toFiniteNumber(options.idleDisposeMs, this.cachePolicy.idleDisposeMs));
    const budgetBytes = this.cachePolicy.maxMemoryMB * 1024 * 1024;

    const removable = [];

    this.entries.forEach((entry, key) => {
      const isVisible = this.visibleAssetIds.has(entry.assetId);
      const isActive = this.activeAssetIds.has(entry.assetId);
      const isReferenced = Number(entry.references || 0) > 0;
      const idleMs = now - Number(entry.lastAccessedAt || entry.loadedAt || now);

      if (isVisible || isActive || isReferenced) {
        return;
      }

      if (idleMs >= idleLimitMs || reason === 'max-entries' || reason === 'memory-pressure') {
        removable.push({ key, idleMs, bytes: Number(entry.bytes || 0), lastAccessedAt: Number(entry.lastAccessedAt || 0) });
      }
    });

    removable.sort((left, right) => right.idleMs - left.idleMs || left.lastAccessedAt - right.lastAccessedAt);

    let freedBytes = 0;
    removable.forEach((item) => {
      if (this.state.memory.totalBytes - freedBytes <= budgetBytes && reason !== 'max-entries') {
        return;
      }
      if (this.entries.delete(item.key)) {
        this.diskEntries.delete(item.key);
        freedBytes += item.bytes;
        this.state.metrics.disposals += 1;
      }
    });

    this.state.metrics.gcRuns += 1;

    this.updateMemoryStats();
    this.synchronize('gc', {
      reason,
      removed: removable.length,
      freedBytes
    });

    return {
      removed: removable.length,
      freedBytes,
      reason
    };
  }

  persistDiskCache() {
    if (!this.persistenceAdapter || this.cachePolicy.diskCache !== true) return false;

    const payload = {
      schemaVersion: SCHEMA_VERSION,
      entries: [...this.diskEntries.values()],
      persistedAt: Date.now()
    };

    const serialized = JSON.stringify(payload);
    if (typeof this.persistenceAdapter.setItem === 'function') {
      this.persistenceAdapter.setItem(this.diskCacheKey, serialized);
      return true;
    }
    if (typeof this.persistenceAdapter.save === 'function') {
      this.persistenceAdapter.save(this.diskCacheKey, serialized);
      return true;
    }
    return false;
  }

  recoverDiskCache() {
    if (!this.persistenceAdapter || this.cachePolicy.diskCache !== true) return false;

    let raw = null;
    if (typeof this.persistenceAdapter.getItem === 'function') {
      raw = this.persistenceAdapter.getItem(this.diskCacheKey);
    } else if (typeof this.persistenceAdapter.load === 'function') {
      raw = this.persistenceAdapter.load(this.diskCacheKey);
    }

    if (!raw) return false;

    const parsed = parsePayload(raw);
    if (!parsed || !Array.isArray(parsed.entries)) return false;

    this.diskEntries = new Map();
    parsed.entries.forEach((entry) => {
      if (!entry?.cacheKey) return;
      this.diskEntries.set(String(entry.cacheKey), entry);
    });

    this.state.diagnostics.recoveries += 1;
    this.updateMemoryStats();
    return true;
  }

  serialize() {
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      cachePolicy: this.cachePolicy,
      entries: [...this.entries.values()].map((entry) => ({
        ...entry,
        payload: entry.cacheLayers?.persistentCache ? entry.payload : null
      })),
      state: this.state,
      persistedAt: Date.now()
    };

    return JSON.stringify(payload);
  }

  deserialize(serialized = '') {
    const parsed = parsePayload(serialized);
    if (!parsed) {
      this.error('Failed to deserialize asset runtime state.');
      return this.snapshot();
    }

    const entries = asArray(parsed.entries);
    this.entries = new Map();

    entries.forEach((entryRaw) => {
      const entry = isObject(entryRaw) ? entryRaw : null;
      if (!entry || !entry.cacheKey || !entry.assetId) return;
      this.entries.set(String(entry.cacheKey), {
        cacheKey: String(entry.cacheKey),
        assetId: safeString(entry.assetId),
        version: safeString(entry.version || 'latest') || 'latest',
        type: safeString(entry.type || 'unknown-asset-type') || 'unknown-asset-type',
        category: safeString(entry.category || 'General') || 'General',
        source: safeString(entry.source || 'registry') || 'registry',
        qualityLevel: safeString(entry.qualityLevel || 'medium') || 'medium',
        lodLevel: safeString(entry.lodLevel || 'medium') || 'medium',
        metadata: isObject(entry.metadata) ? entry.metadata : {},
        dependencies: asArray(entry.dependencies),
        payload: entry.payload,
        bytes: Math.max(64, toFiniteNumber(entry.bytes, estimateBytes(entry.payload))),
        loadedAt: toFiniteNumber(entry.loadedAt, Date.now()),
        lastAccessedAt: toFiniteNumber(entry.lastAccessedAt, Date.now()),
        lastUsedAt: toFiniteNumber(entry.lastUsedAt, Date.now()),
        status: safeString(entry.status || 'loaded') || 'loaded',
        references: Math.max(0, toFiniteNumber(entry.references, 0)),
        retries: Math.max(0, toFiniteNumber(entry.retries, 0)),
        fallbackUsed: entry.fallbackUsed === true,
        progressive: entry.progressive === true,
        streaming: entry.streaming === true,
        cacheLayers: normalizeCachePolicy(entry.cacheLayers || this.cachePolicy)
      });
    });

    this.state = migrateRuntimeStateProfile(parsed.state || {});
    this.cachePolicy = normalizeCachePolicy(parsed.cachePolicy || this.cachePolicy);

    this.state.diagnostics.recoveries += 1;
    this.updateMemoryStats();
    this.synchronize('deserialize');
    return this.snapshot();
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const serialized = this.serialize();

    if (typeof adapter.setItem === 'function') {
      adapter.setItem(this.persistenceKey, serialized);
    } else if (typeof adapter.save === 'function') {
      adapter.save(this.persistenceKey, serialized);
    } else {
      return false;
    }

    this.persistDiskCache();
    this.synchronize('persist');
    return true;
  }

  recoverSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    let raw = null;
    if (typeof adapter.getItem === 'function') {
      raw = adapter.getItem(this.persistenceKey);
    } else if (typeof adapter.load === 'function') {
      raw = adapter.load(this.persistenceKey);
    }

    if (!raw) return false;

    this.deserialize(raw);
    return true;
  }

  synchronize(reason = 'manual', payload = {}) {
    this.updateMemoryStats();
    this.state.lastOperation = {
      reason,
      payload,
      at: Date.now()
    };

    const snapshot = this.snapshot();
    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      assetLoading: snapshot,
      rendererAdapter: {
        ...(this.runtime.metadata?.rendererAdapter || {}),
        assetLoadingState: snapshot
      },
      interactionEngine: {
        ...(this.runtime.metadata?.interactionEngine || {}),
        assetLoadingState: snapshot
      },
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        assetLoadingState: snapshot
      }
    };

    this.emit('asset-runtime-sync', {
      reason,
      ...payload
    });

    return snapshot;
  }

  handleExternalTimelineMutation(action = 'tick', payload = {}) {
    const mutation = safeString(action || 'tick') || 'tick';
    const timeMs = toFiniteNumber(payload?.timeMs, this.state.timelineTimeMs);
    this.state.timelineTimeMs = Math.max(0, timeMs);

    if (mutation === 'pause') {
      this.collectGarbage({ reason: 'pause' });
    }

    if (mutation === 'stop' || mutation === 'reset') {
      this.collectGarbage({ reason: 'reset' });
    }

    this.synchronize('timeline-mutation', {
      action: mutation,
      timeMs: this.state.timelineTimeMs
    });

    return this.snapshot();
  }

  snapshot() {
    return normalizeRuntimeStateProfile({
      ...this.state,
      cachePolicy: this.cachePolicy,
      cacheStats: {
        ...this.state.cacheStats,
        memoryEntries: this.entries.size,
        runtimeEntries: this.entries.size,
        persistentEntries: [...this.entries.values()].filter((entry) => entry?.cacheLayers?.persistentCache).length,
        diskEntries: this.diskEntries.size
      },
      queues: {
        inflight: this.inflight.size,
        background: this.backgroundQueue.length
      },
      memory: {
        ...this.state.memory,
        totalEntries: this.entries.size,
        budgetBytes: this.cachePolicy.maxMemoryMB * 1024 * 1024,
        pressure: clamp(this.state.memory.totalBytes / Math.max(1, this.cachePolicy.maxMemoryMB * 1024 * 1024), 0, 2)
      }
    });
  }

  destroy() {
    this.persistSession();
    this.emit('asset-runtime-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });

    this.listeners.clear();
    this.inflight.clear();
    this.backgroundQueue = [];
  }

  static supportedChannels() {
    return [
      'asset-runtime-sync',
      'asset-runtime-destroyed'
    ];
  }
}

export function createUniversalAssetLoadingRuntime(runtime = {}, options = {}) {
  return new UniversalAssetLoadingRuntime(runtime, options);
}

export {
  normalizeCachePolicy,
  normalizeLoadRequestProfile,
  migrateLoadRequestProfile,
  normalizeRuntimeStateProfile,
  migrateRuntimeStateProfile
};
