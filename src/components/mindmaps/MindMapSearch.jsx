import { Search } from 'lucide-react';

export default function MindMapSearch({ value, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
        <Search className="h-4 w-4" /> Search nodes
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2">
        <Search className="h-4 w-4 text-slate-400" />
        <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-transparent text-sm text-white outline-none" placeholder="Search concepts, projects, topics..." />
      </div>
    </div>
  );
}
