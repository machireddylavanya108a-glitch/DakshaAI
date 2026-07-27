import { Activity, Pause, Play } from 'lucide-react';

export function buildAnimationTrack(scenePlan = {}) {
  const timeline = scenePlan?.timeline || [];
  return timeline.map((item, index) => ({
    id: item.id || `anim-${index + 1}`,
    title: item.title || `Step ${index + 1}`,
    animation: item.animation || 'highlight-pulse',
    target: item.target || '',
    durationMs: item.durationMs || 1500
  }));
}

export default function AnimationTimeline({ steps = [], activeIndex = 0, isPlaying = true, onPlayPause }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Animation Timeline</p>
        <button type="button" onClick={onPlayPause} className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-white">
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={step.id} className={`rounded-xl border px-3 py-2 ${activeIndex === index ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/70'}`}>
            <p className="text-sm font-semibold text-white"><Activity className="mr-1 inline h-3.5 w-3.5" />{step.title}</p>
            <p className="text-xs text-slate-400">{step.animation} on {step.target || 'scene'} • {Math.round((step.durationMs || 0) / 1000)}s</p>
          </div>
        ))}
      </div>
    </div>
  );
}
