import { Share2, Star, Heart } from 'lucide-react';

export default function MindMapShare({ map }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
        <Share2 className="h-4 w-4" /> Share & favorites
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">Share link</button>
        <button className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">Copy embed</button>
        <button className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">Favorite</button>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-400">Shared, favorites, downloads, and collaborative workflows are enabled for {map?.title || 'your current map'}.</div>
    </div>
  );
}
