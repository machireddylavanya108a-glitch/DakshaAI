import { createAssetManager, searchAssets, recommendAssets, optimizeAsset, compressAsset, lazyLoadAsset } from '../../utils/assetManager.js';

export default function AssetManager({ query = '', category = 'All' }) {
  const manager = createAssetManager();
  const assets = category === 'All' ? searchAssets(query) : manager.getAssetsByCategory(category);
  const recommendations = recommendAssets(query);

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Asset Manager</p>
        <span className="text-xs text-cyan-300">Reusable collections • LOD • Compression • Lazy-loading</span>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {assets.slice(0, 6).map((asset) => (
          <div key={asset.id} className="rounded-xl border border-white/10 bg-slate-900/80 p-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">{asset.name}</p>
              <span className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">{asset.category}</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">{asset.description}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
              <span className="rounded-full border border-slate-700 px-2 py-1">LOD: {asset.lod}</span>
              <span className="rounded-full border border-slate-700 px-2 py-1">Compression: {asset.compression.level}</span>
              <span className="rounded-full border border-slate-700 px-2 py-1">Lazy: {asset.lazyLoading.enabled ? 'on' : 'off'}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Recommendations</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {recommendations.map((asset) => (
            <span key={asset.id} className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100">{asset.name}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
