import { Bookmark } from 'lucide-react';

export default function Bookmarks({ items }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
        <Bookmark className="h-4 w-4" /> Bookmarks
      </div>
      <div className="space-y-2">
        {items?.length ? items.map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-800/60 px-3 py-3 text-sm text-slate-200">{item.title}</div>) : <div className="text-sm text-slate-400">No bookmarked items yet.</div>}
      </div>
    </div>
  );
}
