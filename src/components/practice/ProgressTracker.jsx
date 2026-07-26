import { Target, Zap } from 'lucide-react';

export default function ProgressTracker({ progress, score, questionCount }) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-5">
      <div className="flex items-center gap-2 text-cyan-300"><Target className="h-4 w-4" /> Session Progress</div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1rem] border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-400">
          <div className="text-cyan-300">Score</div>
          <div className="mt-1 text-xl font-semibold text-white">{score}/{questionCount}</div>
        </div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-400">
          <div className="text-cyan-300">Momentum</div>
          <div className="mt-1 flex items-center gap-1 text-xl font-semibold text-white"><Zap className="h-5 w-5" /> {progress}%</div>
        </div>
      </div>
    </div>
  );
}
