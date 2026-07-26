import { PenTool, Type, MessageSquareText, ArrowRight, Minus, Square, Circle, Triangle, Pentagon, StickyNote } from 'lucide-react';

export default function DrawingTools({ tool, onToolChange, onAddObject }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
        <PenTool className="h-4 w-4" /> Drawing tools
      </div>
      <div className="flex flex-wrap gap-2">
        {['select', 'draw', 'text', 'note', 'arrow', 'line'].map((item) => (
          <button key={item} onClick={() => onToolChange(item)} className={`rounded-2xl px-3 py-2 text-sm ${tool === item ? 'bg-cyan-500/20 text-cyan-200' : 'border border-white/10 bg-slate-800/80 text-slate-200'}`}>{item}</button>
        ))}
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <button onClick={() => onAddObject('note')} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-3 text-sm text-slate-200"><StickyNote className="h-4 w-4" /> Add note</button>
        <button onClick={() => onAddObject('text')} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-3 text-sm text-slate-200"><Type className="h-4 w-4" /> Add text</button>
        <button onClick={() => onAddObject('arrow')} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-3 text-sm text-slate-200"><ArrowRight className="h-4 w-4" /> Add arrow</button>
        <button onClick={() => onAddObject('line')} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-3 text-sm text-slate-200"><Minus className="h-4 w-4" /> Add line</button>
      </div>
    </div>
  );
}
