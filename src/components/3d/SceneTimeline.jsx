import { Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

export default function SceneTimeline({ steps = [], activeIndex = 0, isPlaying = true, onPlayPause, onRestart, onPrevious, onNext, onJump }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Scene Timeline</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onPrevious} className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-white"><SkipBack className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={onPlayPause} className="rounded-lg bg-cyan-500 px-2 py-1 text-xs font-semibold text-slate-950">{isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}</button>
          <button type="button" onClick={onNext} className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-white"><SkipForward className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={onRestart} className="rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-white"><RotateCcw className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, index) => (
          <button
            key={step.id || `${step.title}-${index}`}
            type="button"
            onClick={() => onJump(index)}
            className={`w-full rounded-xl border px-3 py-2 text-left ${index === activeIndex ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/70'}`}
          >
            <p className="text-sm font-semibold text-white">{step.title || `Step ${index + 1}`}</p>
            <p className="text-xs text-slate-400">{step.objective || step.target || 'Scene transition'}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
