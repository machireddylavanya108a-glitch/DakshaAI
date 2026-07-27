import { TrendingUp } from 'lucide-react';

export default function LessonProgress({ progressPercent = 0, currentChapter = '', completed = 0, remaining = 0 }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30" aria-label="Lesson progress">
      <div className="flex items-center gap-2 text-cyan-300">
        <TrendingUp className="h-4 w-4" />
        <p className="text-xs uppercase tracking-[0.3em]">Progress</p>
      </div>

      <p className="mt-3 text-sm text-slate-300">Current chapter: <span className="font-semibold text-white">{currentChapter}</span></p>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-blue-500" style={{ width: `${progressPercent}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-300">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
          <p className="text-slate-400">Progress</p>
          <p className="font-semibold text-white">{progressPercent}%</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
          <p className="text-slate-400">Done</p>
          <p className="font-semibold text-white">{completed}</p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
          <p className="text-slate-400">Left</p>
          <p className="font-semibold text-white">{remaining}</p>
        </div>
      </div>
    </section>
  );
}
