import { Sparkles, BrainCircuit, Bot, BookOpen, MessageSquareText } from 'lucide-react';

export default function MindMapGenerator({ maps, onGenerate }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
        <Bot className="h-4 w-4" /> AI capabilities
      </div>
      <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3">Auto summarize • Auto categorize • Find missing concepts</div>
        <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3">Suggest related topics • Generate quizzes • Generate notes</div>
        <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3">Create learning roadmaps • Build timelines • Reveal dependencies</div>
        <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3">Support for 100+ languages • Auto translation • Language detection</div>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-400">
        <span>{maps.length} map(s) in your workspace</span>
        <button onClick={onGenerate} className="rounded-xl bg-cyan-500/20 px-3 py-2 text-cyan-200">Generate another</button>
      </div>
    </div>
  );
}
