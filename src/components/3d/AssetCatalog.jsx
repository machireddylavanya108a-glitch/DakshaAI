import { createAssetManager } from '../../utils/assetManager.js';

export default function AssetCatalog({ category = 'All' }) {
  const manager = createAssetManager();
  const assets = category === 'All' ? manager.getAllAssets() : manager.getAssetsByCategory(category);

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
      <p className="text-sm font-semibold text-white">Asset Catalog</p>
      <div className="mt-3 grid gap-2">
        {assets.map((asset) => (
          <div key={asset.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2">
            <div>
              <p className="text-sm text-white">{asset.name}</p>
              <p className="text-xs text-slate-400">{asset.category}</p>
            </div>
            <span className="text-[11px] text-cyan-300">{asset.lod}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
