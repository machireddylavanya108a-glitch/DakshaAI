import { optimizeAsset } from '../../utils/assetManager.js';

export default function ModelOptimization({ asset }) {
  const optimized = optimizeAsset(asset || {});
  return <div className="text-xs text-slate-400">Optimization: {optimized.optimization?.culling ? 'culling on' : 'culling off'} • LOD {optimized.lod}</div>;
}
