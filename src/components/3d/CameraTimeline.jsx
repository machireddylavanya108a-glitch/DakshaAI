import { Film, SkipBack, SkipForward } from 'lucide-react';

export function buildCameraTimelineSteps(scenePlan = {}, cameraMode = 'orbit') {
  const cues = scenePlan?.cameraCues || [];
  return cues.map((cue, index) => ({
    id: cue.stepId || `camera-${index + 1}`,
    title: `${cue.action || 'focus'}: ${cue.target || 'scene'}`,
    mode: cue.mode || cameraMode,
    durationMs: cue.durationMs || 1600,
    target: cue.target || ''
  }));
}

export default function CameraTimeline({ steps = [], activeIndex = 0, onJump, onPrevious, onNext }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Camera Timeline</p>
        <div className="flex gap-2">
          <button type="button" onClick={onPrevious} className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-white"><SkipBack className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={onNext} className="rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-white"><SkipForward className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      <div className="space-y-2">
        {steps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onClick={() => onJump?.(index)}
            className={`w-full rounded-xl border px-3 py-2 text-left ${activeIndex === index ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/70'}`}
          >
            <p className="text-sm font-semibold text-white"><Film className="mr-1 inline h-3.5 w-3.5" />{step.title}</p>
            <p className="text-xs text-slate-400">Mode: {step.mode} • {Math.round((step.durationMs || 0) / 1000)}s</p>
          </button>
        ))}
      </div>
    </div>
  );
}
