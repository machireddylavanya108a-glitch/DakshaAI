import { History } from 'lucide-react';

export default function MindMapHistory({ maps, onSelect }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
        <History className="h-4 w-4" /> Recent maps
      </div>
      <div className="space-y-2">
        {maps.map((map) => (
          <button key={map.id} onClick={() => onSelect(map)} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-800/60 px-3 py-3 text-left text-sm text-slate-200 hover:border-violet-400">
            <span>{map.title}</span>
            <span className="text-xs text-slate-400">{map.language || 'English'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
