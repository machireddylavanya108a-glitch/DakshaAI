import { useEffect, useState } from 'react';
import { createAssetManager, optimizeAsset, compressAsset, lazyLoadAsset } from '../../utils/assetManager.js';

export default function AssetLoader({ assetId = 'heart-anatomy' }) {
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const manager = createAssetManager();
    const asset = manager.getAssetById(assetId);
    if (!asset) {
      setStatus('missing');
      return;
    }
    const optimized = optimizeAsset(compressAsset(lazyLoadAsset(asset)));
    setStatus(`ready:${optimized.id}`);
  }, [assetId]);

  return <div className="text-xs text-slate-400">Asset loader: {status}</div>;
}
