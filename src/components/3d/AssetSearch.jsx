import { useMemo, useState } from 'react';
import { searchAssets } from '../../utils/assetManager.js';

export default function AssetSearch() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchAssets(query), [query]);

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
      <p className="text-sm font-semibold text-white">Asset Search</p>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets" className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-200" />
      <div className="mt-3 grid gap-2">
        {results.slice(0, 6).map((asset) => (
          <div key={asset.id} className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs text-slate-300">
            {asset.name} • {asset.category}
          </div>
        ))}
      </div>
    </div>
  );
}
