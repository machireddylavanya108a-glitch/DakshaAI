import { Square, Circle, Triangle, Pentagon, Table2 } from 'lucide-react';

export default function ShapeTools({ onAddObject }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
        <Square className="h-4 w-4" /> Shapes & containers
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <button onClick={() => onAddObject('rectangle')} className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-3 text-sm text-slate-200">Rectangle</button>
        <button onClick={() => onAddObject('circle')} className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-3 text-sm text-slate-200">Circle</button>
        <button onClick={() => onAddObject('triangle')} className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-3 text-sm text-slate-200">Triangle</button>
        <button onClick={() => onAddObject('polygon')} className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-3 text-sm text-slate-200">Polygon</button>
        <button onClick={() => onAddObject('table')} className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-3 text-sm text-slate-200">Table</button>
      </div>
    </div>
  );
}
