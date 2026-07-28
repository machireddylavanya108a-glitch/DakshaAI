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
  const assets = assetCatalog.map((asset) => createBaseAssetProfile(asset));
  const categoryIndex = new Map();

  assets.forEach((asset) => {
    const bucket = categoryIndex.get(asset.category) || [];
    bucket.push(asset);
    categoryIndex.set(asset.category, bucket);
  });

  const manager = {
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
    getAssetById: (id) => assets.find((asset) => asset.id === id) || null,
    rankAssets: (query = '', category = '') => {
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
  if (!normalized) return assetCatalog.map((asset) => createBaseAssetProfile(asset));

  const terms = normalized.split(/\s+/).filter(Boolean);
  return assetCatalog
    .filter((asset) => {
      const searchable = [asset.name, asset.category, asset.description, ...asset.tags].map((field) => String(field).toLowerCase());
      return terms.every((term) => searchable.some((field) => field.includes(term)));
    })
    .map((asset) => createBaseAssetProfile(asset));
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
  const match = manager.matchAsset(query, category);
  const ranked = manager.rankAssets(query, category);
  const composite = buildCompositeAssetPlan(query, category);
  return {
    match,
    ranked: ranked.slice(0, 4),
    composite,
    cacheKey: getAssetCacheKey(query),
    requiresComposition: !match || ranked.length < 2
  };
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
