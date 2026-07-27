export function buildNarrationSegments(scenePlan = {}, teacherScript = '') {
  const timeline = scenePlan?.timeline || [];
  const lines = String(teacherScript || '').split(/[\n\.]+/).map((item) => item.trim()).filter(Boolean);

  return timeline.map((step, index) => ({
    id: `narration-${index + 1}`,
    line: lines[index] || `Now focus on ${step.target || 'the concept'}.`,
    target: step.target || '',
    durationMs: step.durationMs || 1600,
    labels: [step.target || 'concept', step.objective || 'key detail']
  }));
}

export function detectPauseIntent(question = '') {
  return /what is this|what is that|explain this|pause/i.test(String(question || ''));
}

export default function NarrationSynchronizer({ segments = [], activeIndex = 0, paused = false }) {
  const active = segments[activeIndex] || null;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Narration Synchronizer</p>
      <p className="mt-2 text-xs text-slate-400">Status: {paused ? 'Paused for learner question' : 'Running'}</p>
      <p className="mt-3 text-sm text-white">{active?.line || 'Narration will align with camera and animation cues.'}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {(active?.labels || []).map((label) => (
          <span key={label} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-100">{label}</span>
        ))}
      </div>
    </div>
  );
}
