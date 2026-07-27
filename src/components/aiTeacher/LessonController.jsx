import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

export default function LessonController({ isPlaying, onPlayPause, onPrevious, onNext, onRepeat, onSlow, onNormal, onFast }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30" aria-label="Lesson controls">
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Lesson Controller</p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onPrevious} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white">
          <SkipBack className="h-4 w-4" /> Previous
        </button>
        <button type="button" onClick={onPlayPause} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={onNext} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white">
          <SkipForward className="h-4 w-4" /> Next
        </button>
        <button type="button" onClick={onRepeat} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white">
          <RotateCcw className="h-4 w-4" /> Repeat
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <button type="button" onClick={onSlow} className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-slate-200">Slow</button>
        <button type="button" onClick={onNormal} className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-slate-200">Normal</button>
        <button type="button" onClick={onFast} className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-slate-200">Fast</button>
      </div>
    </section>
  );
}
