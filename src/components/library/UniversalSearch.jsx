import { Search, Mic, Languages } from 'lucide-react';

export default function UniversalSearch({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
        <Search className="h-4 w-4" /> Universal search
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent text-sm text-white outline-none" placeholder="Search books, papers, topics, code, courses, concepts..." />
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
        <span className="rounded-full border border-white/10 bg-slate-800/80 px-2 py-1">Semantic search</span>
        <span className="rounded-full border border-white/10 bg-slate-800/80 px-2 py-1">Voice search</span>
        <span className="rounded-full border border-white/10 bg-slate-800/80 px-2 py-1">Image search</span>
        <span className="rounded-full border border-white/10 bg-slate-800/80 px-2 py-1">OCR search</span>
      </div>
    </div>
  );
}
