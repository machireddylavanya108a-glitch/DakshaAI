import { Layers3 } from 'lucide-react';

export default function Collections() {
  const collections = ['My Library', 'Favorites', 'Bookmarks', 'Recent', 'Downloads', 'Shared', 'Custom Collections'];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
        <Layers3 className="h-4 w-4" /> Collections
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {collections.map((collection) => (
          <div key={collection} className="rounded-2xl border border-white/10 bg-slate-800/60 px-3 py-3 text-sm text-slate-200">{collection}</div>
        ))}
      </div>
    </div>
  );
}
