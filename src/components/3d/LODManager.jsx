import { optimizeAsset } from '../../utils/assetManager.js';

export default function LODManager({ asset }) {
  const optimized = optimizeAsset(asset || {});
  return <div className="text-xs text-slate-400">LOD: {optimized.lod} • Compression: {optimized.compression.level}</div>;
}
