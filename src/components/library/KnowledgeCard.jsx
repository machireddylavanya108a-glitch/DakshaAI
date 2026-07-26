import { BookOpen, Star } from 'lucide-react';

export default function KnowledgeCard({ item, onSelect, onFavorite }) {
  return (
    <button onClick={() => onSelect(item)} className="rounded-[1.5rem] border border-white/10 bg-slate-800/70 p-4 text-left shadow-sm transition hover:border-cyan-400">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-cyan-300">
          <BookOpen className="h-4 w-4" />
          <span className="text-sm font-semibold">{item.title}</span>
        </div>
        <button onClick={(event) => { event.stopPropagation(); onFavorite(item.id); }} className="rounded-full p-1 text-slate-400 hover:text-amber-300">
          <Star className={`h-4 w-4 ${item.favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
        </button>
      </div>
      <div className="mt-3 text-xs text-slate-400">{item.category} • {item.source}</div>
      <div className="mt-3 text-sm text-slate-300">{item.summary}</div>
    </button>
  );
}
