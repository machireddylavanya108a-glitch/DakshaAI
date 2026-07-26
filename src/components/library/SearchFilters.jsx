import { Filter } from 'lucide-react';

export default function SearchFilters({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
        <Filter className="h-4 w-4" /> Filters
      </div>
      <div className="flex flex-wrap gap-2">
        {['All', 'Favorites', 'Bookmarks'].map((filter) => (
          <button key={filter} onClick={() => onChange(filter)} className={`rounded-2xl px-3 py-2 text-sm ${value === filter ? 'bg-emerald-500/20 text-emerald-200' : 'border border-white/10 bg-slate-800/80 text-slate-200'}`}>{filter}</button>
        ))}
      </div>
    </div>
  );
}
