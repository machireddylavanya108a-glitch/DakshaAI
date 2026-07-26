import { Filter } from 'lucide-react';

export default function NotesFilters({ value, onChange }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><Filter className="h-4 w-4" /> Filters</div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-400">
        {['All', 'Favorites', 'Folders'].map((item) => (
          <button key={item} onClick={() => onChange(item)} className={`rounded-full px-3 py-2 ${value === item ? 'bg-cyan-500 text-slate-950' : 'border border-white/10 bg-slate-950/70 text-slate-300'}`}>{item}</button>
        ))}
      </div>
    </div>
  );
}
