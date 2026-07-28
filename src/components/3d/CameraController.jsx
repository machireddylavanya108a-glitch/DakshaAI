export default function CameraController({ onZoomIn, onZoomOut, onResetView }) {
  return (
    <div className="flex gap-2">
      <button onClick={onZoomIn} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Zoom +</button>
      <button onClick={onZoomOut} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Zoom -</button>
      <button onClick={onResetView} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Reset</button>
    </div>
  );
}
