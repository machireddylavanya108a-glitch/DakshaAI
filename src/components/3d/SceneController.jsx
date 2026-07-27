export default function SceneController({
  onToggleExploded,
  onToggleCrossSection,
  onToggleXRay,
  onToggleLabels,
  onToggleAnimation,
  onToggleHideInactive,
  onToggleMeasurement,
  onTogglePracticeMode,
  onToggleAssessmentMode,
  onResetView,
  onFullscreen,
  onSlowMotion,
  onNormalMotion,
  onFastMotion,
  controls
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {controls?.map((control) => (
        <button key={control.label} onClick={control.onClick} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
          {control.label}
        </button>
      ))}
      <button onClick={onToggleExploded} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Exploded</button>
      <button onClick={onToggleCrossSection} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Cross Section</button>
      <button onClick={onToggleXRay} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">X-Ray</button>
      <button onClick={onToggleHideInactive} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Hide Parts</button>
      <button onClick={onToggleLabels} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Labels</button>
      <button onClick={onToggleMeasurement} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Measure</button>
      <button onClick={onToggleAnimation} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Pause/Resume</button>
      <button onClick={onSlowMotion} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Slow</button>
      <button onClick={onNormalMotion} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Normal</button>
      <button onClick={onFastMotion} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Fast</button>
      <button onClick={onTogglePracticeMode} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Practice</button>
      <button onClick={onToggleAssessmentMode} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Assessment</button>
      <button onClick={onResetView} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Reset</button>
      <button onClick={onFullscreen} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Fullscreen</button>
    </div>
  );
}
