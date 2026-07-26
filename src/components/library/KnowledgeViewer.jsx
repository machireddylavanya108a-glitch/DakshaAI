import { Brain, BookOpen, Sparkles, Layers3 } from 'lucide-react';

export default function KnowledgeViewer({ item }) {
  if (!item) return <div className="rounded-[2rem] border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">Select a knowledge item to preview its analysis.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
          <Brain className="h-4 w-4" /> AI knowledge view
        </div>
        <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">{item.category}</div>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-800/60 p-4">
        <h3 className="text-xl font-semibold text-white">{item.title}</h3>
        <p className="mt-2 text-sm text-slate-400">Source: {item.source}</p>
        <p className="mt-4 text-sm text-slate-300">{item.explanation}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
          <div className="mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4 text-amber-300" /> Summary</div>
          <div>{item.summary}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
          <div className="mb-2 flex items-center gap-2"><Layers3 className="h-4 w-4 text-emerald-300" /> Related knowledge</div>
          <div>Definitions • Examples • Applications • Timeline • Roadmap</div>
        </div>
      </div>
    </div>
  );
}
