import { compressAsset } from '../../utils/assetManager.js';

export default function Compression({ asset }) {
  const compressed = compressAsset(asset || {});
  return <div className="text-xs text-slate-400">Compression: {compressed.compression.level}</div>;
}
