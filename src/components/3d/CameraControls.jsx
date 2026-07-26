export default function CameraControls({ onReset, onToggleRotate, autoRotate, onToggleExplode }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={onReset} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Reset Camera</button>
      <button onClick={onToggleRotate} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">{autoRotate ? 'Pause Rotate' : 'Auto Rotate'}</button>
      <button onClick={onToggleExplode} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Explode View</button>
    </div>
  );
}
