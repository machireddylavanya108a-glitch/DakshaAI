import { BookOpen } from 'lucide-react';

export default function WeakConcepts({ analytics }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-5">
      <div className="flex items-center gap-2 text-cyan-300"><BookOpen className="h-4 w-4" /> Weak Concepts</div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        {(analytics.weakTopics || []).length ? analytics.weakTopics.map((topic) => <div key={topic} className="rounded-[0.9rem] border border-white/10 bg-slate-900/80 px-3 py-2">{topic}</div>) : <div className="rounded-[0.9rem] border border-white/10 bg-slate-900/80 px-3 py-2">No weak topics yet. Keep going.</div>}
      </div>
    </div>
  );
}
