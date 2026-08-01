import { getDefaultUniversalAssetRegistry } from '../asset-registry/index.js';
import { analyzeUniversalAssetDiscoveryMatchingResolution } from '../asset-discovery/index.js';

export const assetCatalog = [
  { id: 'heart-anatomy', name: 'Heart Anatomy', category: 'Human Anatomy', tags: ['heart', 'circulation', 'organ', 'surgery'], description: 'Detailed heart anatomy for medical lessons.', price: 0, enabled: true },
  { id: 'skeleton', name: 'Skeleton', category: 'Skeleton', tags: ['bone', 'skeletal', 'body', 'anatomy'], description: 'Full skeletal system model.', price: 0, enabled: true },
  { id: 'brain-model', name: 'Brain Model', category: 'Brain', tags: ['brain', 'neuron', 'cognition'], description: 'Interactive brain structure model.', price: 0, enabled: true },
  { id: 'eye-model', name: 'Eye Model', category: 'Eye', tags: ['eye', 'vision', 'optics'], description: 'Eye anatomy model.', price: 0, enabled: true },
  { id: 'ear-model', name: 'Ear Model', category: 'Ear', tags: ['ear', 'hearing', 'auditory'], description: 'Ear anatomy model.', price: 0, enabled: true },
  { id: 'muscle-map', name: 'Muscle Map', category: 'Muscles', tags: ['muscle', 'movement', 'anatomy'], description: 'Muscle anatomy and movement model.', price: 0, enabled: true },
  { id: 'cell-model', name: 'Cell Model', category: 'Cells', tags: ['cell', 'biology', 'micro'], description: 'Cell structure model.', price: 0, enabled: true },
  { id: 'dna-helix', name: 'DNA Helix', category: 'DNA', tags: ['dna', 'gene', 'molecule'], description: 'DNA helix model.', price: 0, enabled: true },
  { id: 'animal-body', name: 'Animal Body', category: 'Animals', tags: ['animal', 'body', 'zoology'], description: 'Animal anatomy model.', price: 0, enabled: true },
  { id: 'plant-structure', name: 'Plant Structure', category: 'Plants', tags: ['plant', 'leaf', 'root'], description: 'Plant anatomy model.', price: 0, enabled: true },
  { id: 'machine-assembly', name: 'Machine Assembly', category: 'Machines', tags: ['machine', 'assembly', 'industrial'], description: 'Industrial machine assembly model.', price: 0, enabled: true },
  { id: 'engine-block', name: 'Engine Block', category: 'Engines', tags: ['engine', 'motor', 'mechanics'], description: 'Engine block assembly.', price: 0, enabled: true },
  { id: 'car-chassis', name: 'Car Chassis', category: 'Cars', tags: ['car', 'vehicle', 'chassis'], description: 'Automotive chassis model.', price: 0, enabled: true },
  { id: 'airplane-frame', name: 'Airplane Frame', category: 'Airplanes', tags: ['airplane', 'plane', 'aviation'], description: 'Aircraft frame model.', price: 0, enabled: true },
  { id: 'building-frame', name: 'Building Frame', category: 'Buildings', tags: ['building', 'structure', 'architecture'], description: 'Building structural frame.', price: 0, enabled: true },
  { id: 'physics-equipment', name: 'Physics Equipment', category: 'Physics equipment', tags: ['physics', 'lab', 'experiment'], description: 'Physics lesson equipment model.', price: 0, enabled: true },
  { id: 'chemistry-lab', name: 'Chemistry Lab', category: 'Chemistry lab', tags: ['chemistry', 'lab', 'reaction'], description: 'Chemistry lab setup.', price: 0, enabled: true },
  { id: 'solar-system', name: 'Solar System', category: 'Space', tags: ['space', 'solar', 'planet'], description: 'Solar system asset.', price: 0, enabled: true },
  { id: 'satellite', name: 'Satellite', category: 'Satellites', tags: ['satellite', 'orbital', 'space'], description: 'Satellite asset.', price: 0, enabled: true },
  { id: 'robot-arm', name: 'Robot Arm', category: 'Robots', tags: ['robot', 'arm', 'automation'], description: 'Robot arm asset.', price: 0, enabled: true },
  { id: 'circuit-board', name: 'Circuit Board', category: 'Electronics', tags: ['circuit', 'electronics', 'board'], description: 'Electronic circuit board.', price: 0, enabled: true },
  { id: 'computer-rig', name: 'Computer Rig', category: 'Computers', tags: ['computer', 'cpu', 'hardware'], description: 'Computer hardware model.', price: 0, enabled: true },
  { id: 'network-topology', name: 'Network Topology', category: 'Networking', tags: ['network', 'router', 'switch'], description: 'Networking topology asset.', price: 0, enabled: true },
  { id: 'medical-tools', name: 'Medical Tools', category: 'Medical tools', tags: ['medical', 'surgery', 'instrument'], description: 'Medical tool kit.', price: 0, enabled: true },
  { id: 'bridge-structure', name: 'Bridge Structure', category: 'Civil engineering', tags: ['bridge', 'civil', 'engineering'], description: 'Bridge structure model.', price: 0, enabled: true },
  { id: 'electrical-grid', name: 'Electrical Grid', category: 'Electrical engineering', tags: ['electrical', 'grid', 'circuit'], description: 'Electrical engineering scene asset.', price: 0, enabled: true },
  { id: 'architecture-model', name: 'Architecture Model', category: 'Architecture', tags: ['architecture', 'design', 'building'], description: 'Architecture visualization asset.', price: 0, enabled: true },
  { id: 'farm-scene', name: 'Farm Scene', category: 'Agriculture', tags: ['farm', 'crop', 'agriculture'], description: 'Agriculture environment asset.', price: 0, enabled: true },
  { id: 'sport-field', name: 'Sport Field', category: 'Sports', tags: ['sports', 'field', 'training'], description: 'Sports scene asset.', price: 0, enabled: true },
  { id: 'kitchen-scene', name: 'Kitchen Scene', category: 'Cooking', tags: ['kitchen', 'cooking', 'food'], description: 'Cooking environment asset.', price: 0, enabled: true },
  { id: 'music-studio', name: 'Music Studio', category: 'Music', tags: ['music', 'studio', 'instrument'], description: 'Music studio asset.', price: 0, enabled: true }
];

const assetCache = new Map();
const ASSET_REGISTRY_SOURCE = 'daksha-legacy-catalog';

function safeString(value) {
  return String(value || '').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clamp(value, minimum = 0, maximum = 1) {
  const parsed = Number(value);
  const safe = Number.isFinite(parsed) ? parsed : minimum;
  return Math.min(Math.max(safe, minimum), maximum);
}

function inferAssetType(asset = {}) {
  const category = safeString(asset.category).toLowerCase();
  if (!category) return 'generic-educational-asset';
  if (category.includes('space')) return 'astronomy-asset';
  if (category.includes('robot')) return 'robotics-asset';
  if (category.includes('anatomy') || category.includes('brain') || category.includes('dna')) return 'biology-asset';
  return `${category.replace(/\s+/g, '-') || 'generic'}-asset`;
}

function deriveQualityLevels(lod = 'medium') {
  if (lod === 'high') {
    return {
      low: 0.62,
      medium: 0.78,
      high: 0.95,
      default: 'high'
    };
  }

  if (lod === 'low') {
    return {
      low: 0.5,
      medium: 0.68,
      high: 0.86,
      default: 'low'
    };
  }

  return {
    low: 0.55,
    medium: 0.74,
    high: 0.9,
    default: 'medium'
  };
}

function toUniversalAssetContract(asset = {}) {
  const profile = createBaseAssetProfile(asset);
  return {
    schemaVersion: 'v2',
    id: profile.id,
    version: 'v1',
    type: inferAssetType(profile),
    category: profile.category,
    tags: asArray(profile.tags),
    source: ASSET_REGISTRY_SOURCE,
    metadata: {
      name: profile.name,
      description: profile.description,
      enabled: asset.enabled !== false,
      legacyPrice: Number(asset.price || 0),
      legacyCatalogSeed: true
    },
    qualityLevels: deriveQualityLevels(profile.lod),
    lodSupport: {
      supported: true,
      levels: ['high', 'medium', 'low'],
      autoSelect: true,
      defaultLevel: profile.lod || 'medium'
    },
    capabilities: [
      'renderer-compatible',
      'lesson-asset',
      'metadata-driven'
    ],
    fallbackOptions: {
      mode: 'adaptive-fallback',
      fallbackAssetIds: [],
      supportsProceduralFallback: true,
      supportsUnknownFutureTypes: true
    },
    dependencies: []
  };
}

function ensureDefaultRegistrySeeded(registry) {
  const targetRegistry = registry || getDefaultUniversalAssetRegistry();
  const diagnostics = targetRegistry.getDiagnostics();
  if (diagnostics.assetCount > 0) return targetRegistry;

  assetCatalog.forEach((asset) => {
    targetRegistry.register(toUniversalAssetContract(asset), { allowUpdate: true });
  });
  targetRegistry.persist();
  return targetRegistry;
}

function categoryMatches(asset = {}, category = '') {
  const normalizedCategory = safeString(category).toLowerCase();
  if (!normalizedCategory) return true;

  const assetCategory = safeString(asset.category).toLowerCase();
  if (assetCategory === normalizedCategory) return true;
  if (normalizedCategory.includes(assetCategory) || assetCategory.includes(normalizedCategory)) return true;
  if (asArray(asset.tags).some((tag) => safeString(tag).toLowerCase().includes(normalizedCategory))) return true;
  return false;
}

function normalizeRegistryContractToAssetProfile(contract = {}) {
  const metadata = contract.metadata || {};
  const qualityLevels = contract.qualityLevels || {};
  const defaultLod = safeString(contract?.lodSupport?.defaultLevel || qualityLevels.default || 'medium').toLowerCase();
  const lod = ['high', 'medium', 'low'].includes(defaultLod) ? defaultLod : 'medium';

  return {
    id: safeString(contract.id),
    name: safeString(metadata.name || contract.id),
    category: safeString(contract.category || 'General') || 'General',
    tags: asArray(contract.tags),
    description: safeString(metadata.description || ''),
    type: safeString(contract.type || 'unknown-asset-type') || 'unknown-asset-type',
    version: safeString(contract.version || 'v1') || 'v1',
    source: safeString(contract.source || ASSET_REGISTRY_SOURCE) || ASSET_REGISTRY_SOURCE,
    capabilities: asArray(contract.capabilities),
    dependencies: asArray(contract.dependencies),
    lod,
    compression: {
      enabled: true,
      level: lod === 'high' ? 'balanced' : 'aggressive'
    },
    lazyLoading: {
      enabled: true,
      preloadDistance: lod === 'high' ? 6 : 3
    },
    optimization: {
      culling: true,
      instancing: lod !== 'high',
      batchSize: lod === 'high' ? 24 : 12
    },
    qualityLevels: {
      low: clamp(qualityLevels.low, 0, 1),
      medium: clamp(qualityLevels.medium, 0, 1),
      high: clamp(qualityLevels.high, 0, 1),
      default: qualityLevels.default || lod
    },
    fallbackOptions: contract.fallbackOptions || {
      mode: 'adaptive-fallback',
      fallbackAssetIds: [],
      supportsProceduralFallback: true,
      supportsUnknownFutureTypes: true
    },
    metadata
  };
}

function createBaseAssetProfile(asset) {
  const lod = asset.id === 'heart-anatomy' ? 'high' : asset.id === 'solar-system' ? 'medium' : 'low';
  return {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    tags: asset.tags,
    description: asset.description,
    lod,
    compression: {
      enabled: true,
      level: lod === 'high' ? 'balanced' : 'aggressive'
    },
    lazyLoading: {
      enabled: true,
      preloadDistance: lod === 'high' ? 6 : 3
    },
    optimization: {
      culling: true,
      instancing: lod !== 'high',
      batchSize: lod === 'high' ? 24 : 12
    }
  };
}

function scoreAsset(asset, query = '', category = '') {
  const normalizedQuery = String(query || '').toLowerCase();
  const normalizedCategory = String(category || '').toLowerCase();
  const searchable = [asset.name, asset.category, asset.description, ...asset.tags].join(' ').toLowerCase();
  let score = 0;

  if (normalizedCategory && searchable.includes(normalizedCategory)) score += 5;
  if (searchable.includes(normalizedQuery)) score += 8;
  if (normalizedQuery.split(/\s+/).every((term) => searchable.includes(term))) score += 3;
  if (asset.tags.some((tag) => normalizedQuery.includes(String(tag).toLowerCase()))) score += 3;
  return score;
}

function getRegistryBackedAssets(registry) {
  const seeded = ensureDefaultRegistrySeeded(registry);
  const contracts = seeded.listContracts();
  return contracts.map((contract) => normalizeRegistryContractToAssetProfile(contract));
}

function toDiscoveryContext(input = {}, category = '') {
  const source = isObjectLike(input) ? input : {};
  const query = safeString(source.query || source.content || source.lesson || source.learningIntent || '');
  const sceneMetadata = isObjectLike(source.sceneMetadata) ? source.sceneMetadata : {};
  const objectMetadata = Array.isArray(source.objectMetadata) ? source.objectMetadata : [];
  const learningIntent = isObjectLike(source.learningIntent)
    ? source.learningIntent
    : {
      learningIntent: query,
      educationalStrategy: safeString(source.educationalStrategy || ''),
      reasoningStyle: safeString(source.reasoningStyle || ''),
      confidenceScore: clamp(source.confidenceScore, 0, 1)
    };

  return {
    learningIntent,
    visualizationStrategy: source.visualizationStrategy || {},
    capabilityRecommendation: source.capabilityRecommendation || {},
    sceneMetadata: {
      ...sceneMetadata,
      categoryHint: safeString(category || source.category || ''),
      query
    },
    objectMetadata,
    sceneGraph: source.sceneGraph || {},
    runtimeGraph: source.runtimeGraph || {},
    performanceProfile: safeString(source.performanceProfile || 'balanced') || 'balanced'
  };
}

function isObjectLike(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeCandidateRanking(candidate = {}, byId = new Map()) {
  const asset = byId.get(candidate.assetId);
  if (!asset) return null;

  return {
    ...asset,
    assetId: asset.id,
    label: asset.name,
    icon: asset.category,
    // Keep rank score on legacy-compatible scale used by existing scene heuristics.
    rankScore: clamp(candidate.rankScore, 0, 1) * 10,
    lod: safeString(candidate.lodLevel || asset.lod || 'medium') || 'medium',
    qualityLevel: safeString(candidate.qualityLevel || 'medium') || 'medium',
    compression: asset.compression,
    lazyLoading: asset.lazyLoading,
    optimization: asset.optimization,
    source: candidate.source || asset.source,
    discoveryReason: candidate.reason || 'registry-rank'
  };
}

function buildCompositeAssetPlan(query = '', category = '') {
  const manager = createAssetManager();
  const ranked = manager.rankAssets(query, category);
  const preferred = ranked.slice(0, 2);
  const fallback = ranked.slice(2, 4);

  return {
    primary: preferred[0] || null,
    secondary: preferred[1] || null,
    fallbackAssets: fallback,
    strategy: preferred.length > 1 ? 'compose' : 'single-asset',
    generatedFrom: String(query || category || 'lesson').trim() || 'lesson context'
  };
}

export function createAssetManager() {
  const registry = ensureDefaultRegistrySeeded(getDefaultUniversalAssetRegistry());
  const assets = getRegistryBackedAssets(registry);
  const assetsById = new Map(assets.map((entry) => [entry.id, entry]));
  const categoryIndex = new Map();

  assets.forEach((asset) => {
    const bucket = categoryIndex.get(asset.category) || [];
    bucket.push(asset);
    categoryIndex.set(asset.category, bucket);
  });

  const manager = {
    getRegistry: () => registry,
    getRegistryState: () => registry.exportSnapshot(),
    discoverAssets: (input = {}, options = {}) => {
      const context = toDiscoveryContext(input, input?.category || '');
      const profile = analyzeUniversalAssetDiscoveryMatchingResolution(context, {
        ...options,
        performanceProfile: options.performanceProfile || context.performanceProfile,
        registry
      });

      const selectedAssets = (profile?.decision?.selectedAssets || [])
        .map((candidate) => normalizeCandidateRanking(candidate, assetsById))
        .filter(Boolean);

      return {
        profile,
        selectedAssets,
        rankedCandidates: (profile?.decision?.rankedCandidates || [])
          .map((candidate) => normalizeCandidateRanking(candidate, assetsById))
          .filter(Boolean),
        proceduralFallback: profile?.decision?.proceduralFallback || { enabled: false, placeholderAsset: null }
      };
    },
    getAllAssets: () => assets,
    getAssetsByCategory: (category) => {
      const exact = (categoryIndex.get(category) || []).slice();
      const normalizedCategory = String(category || '').toLowerCase();
      const fallback = assets.filter((asset) => {
        const assetCategory = String(asset.category || '').toLowerCase();
        return normalizedCategory.includes(assetCategory)
          || assetCategory.includes(normalizedCategory)
          || asset.tags.some((tag) => String(tag).toLowerCase().includes(normalizedCategory));
      });

      const combined = [...exact, ...fallback];
      const unique = combined.filter((asset, index, list) => list.findIndex((item) => item.id === asset.id) === index);
      return unique.slice();
    },
    getAssetById: (id) => {
      const match = registry.lookup(id, 'latest');
      if (match) {
        return normalizeRegistryContractToAssetProfile(match);
      }
      return assets.find((asset) => asset.id === id) || null;
    },
    rankAssets: (query = '', category = '') => {
      if (String(query || '').trim() || String(category || '').trim()) {
        const discovered = manager.discoverAssets({ query, category });
        if (discovered.rankedCandidates.length && Number(discovered.rankedCandidates[0]?.rankScore || 0) >= 2) {
          return discovered.rankedCandidates;
        }
      }

      const ranked = assets
        .map((asset) => ({ asset, score: scoreAsset(asset, query, category) }))
        .sort((left, right) => right.score - left.score || left.asset.name.localeCompare(right.asset.name))
        .filter((entry) => entry.score > 0 || !String(query || '').trim())
        .map((entry) => ({
          ...entry.asset,
          assetId: entry.asset.id,
          label: entry.asset.name,
          icon: entry.asset.category,
          rankScore: entry.score,
          lod: entry.asset.lod,
          compression: entry.asset.compression,
          lazyLoading: entry.asset.lazyLoading,
          optimization: entry.asset.optimization
        }));
      return ranked;
    },
    matchAsset: (query = '', category = '') => {
      const ranked = assets
        .map((asset) => ({ asset, score: scoreAsset(asset, query, category) }))
        .sort((left, right) => right.score - left.score || left.asset.name.localeCompare(right.asset.name));
      return ranked[0] ? {
        ...ranked[0].asset,
        assetId: ranked[0].asset.id,
        label: ranked[0].asset.name,
        rankScore: ranked[0].score,
        lod: ranked[0].asset.lod,
        compression: ranked[0].asset.compression,
        lazyLoading: ranked[0].asset.lazyLoading,
        optimization: ranked[0].asset.optimization
      } : null;
    },
    recommendAssets: (query = '', category = '') => {
      const ranked = manager.rankAssets(query, category);
      return ranked.slice(0, 4);
    },
    buildAssetPlan: (content = '', category = 'General') => {
      const query = String(content || '').toLowerCase();
      const ranked = manager.rankAssets(query, category);
      const selected = ranked.slice(0, Math.max(2, Math.min(5, ranked.length)));
      const composite = buildCompositeAssetPlan(query, category);
      return selected.map((asset) => ({
        ...asset,
        assetId: asset.id,
        label: asset.name,
        icon: asset.category,
        focus: String(content || '').split(/\s+/).filter(Boolean)[0] || 'core concept',
        lod: asset.lod,
        compression: asset.compression,
        lazyLoading: asset.lazyLoading,
        optimization: asset.optimization,
        compositePlan: composite
      }));
    }
  };

  return manager;
}

export function searchAssets(query = '') {
  const normalized = String(query || '').toLowerCase().trim();
  const manager = createAssetManager();
  const allAssets = manager.getAllAssets();
  if (!normalized) return allAssets;

  const terms = normalized.split(/\s+/).filter(Boolean);
  return allAssets
    .filter((asset) => {
      const searchable = [asset.name, asset.category, asset.description, ...asset.tags].map((field) => String(field).toLowerCase());
      return terms.every((term) => searchable.some((field) => field.includes(term)));
    });
}

export function recommendAssets(query = '') {
  const matches = searchAssets(query);
  return matches.slice(0, 4);
}

export function getAssetCacheKey(query = '') {
  return `asset:${String(query || '').toLowerCase().trim()}`;
}

export function readAssetCache(key) {
  if (!key) return null;
  return assetCache.get(key) || null;
}

export function writeAssetCache(key, payload) {
  if (!key || !payload) return;
  assetCache.set(key, payload);
  return payload;
}

export function getAssetRecommendation(query = '', category = '') {
  const manager = createAssetManager();
  const discovered = manager.discoverAssets({ query, category });
  const match = manager.matchAsset(query, category);
  const ranked = manager.rankAssets(query, category);
  const composite = buildCompositeAssetPlan(query, category);
  return {
    match: discovered.selectedAssets[0] || match,
    ranked: ranked.slice(0, 4),
    composite,
    discoveryProfile: discovered.profile,
    cacheKey: getAssetCacheKey(query),
    requiresComposition: !match || ranked.length < 2
  };
}

export function getUniversalAssetRegistryState() {
  const registry = ensureDefaultRegistrySeeded(getDefaultUniversalAssetRegistry());
  return registry.exportSnapshot();
}

export function registerUniversalAssetContract(contract = {}, options = {}) {
  const registry = ensureDefaultRegistrySeeded(getDefaultUniversalAssetRegistry());
  const result = registry.register(contract, options);
  registry.persist();
  return result;
}

export function resolveAssetFromRegistry(id = '', version = 'latest') {
  const registry = ensureDefaultRegistrySeeded(getDefaultUniversalAssetRegistry());
  const match = registry.lookup(id, version);
  if (!match) return null;
  return normalizeRegistryContractToAssetProfile(match);
}

export function discoverUniversalAssets(input = {}, options = {}) {
  const manager = createAssetManager();
  return manager.discoverAssets(input, options);
}

export function optimizeAsset(asset) {
  return {
    ...asset,
    lod: asset.lod || 'medium',
    compression: { enabled: true, level: asset.lod === 'high' ? 'balanced' : 'aggressive' },
    lazyLoading: { enabled: true, preloadDistance: asset.lod === 'high' ? 6 : 3 },
    optimization: {
      culling: true,
      instancing: true,
      batchSize: asset.lod === 'high' ? 20 : 10
    }
  };
}

export function compressAsset(asset) {
  return { ...asset, compression: { enabled: true, level: 'balanced' } };
}

export function lazyLoadAsset(asset) {
  return { ...asset, lazyLoading: { enabled: true, preloadDistance: 4 } };
}
