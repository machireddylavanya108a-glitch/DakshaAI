import { recommendAssets } from '../../utils/assetManager.js';

export default function AssetRecommendation({ query = 'robot arm' }) {
  const recommendations = recommendAssets(query);

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
      <p className="text-sm font-semibold text-white">Asset Recommendation</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {recommendations.map((asset) => (
          <span key={asset.id} className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100">{asset.name}</span>
        ))}
      </div>
    </div>
  );
}
