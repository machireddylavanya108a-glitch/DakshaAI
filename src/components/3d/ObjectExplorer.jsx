export default function ObjectExplorer({ scene }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
      <div className="font-semibold text-white">Objects</div>
      <div className="mt-2 space-y-2">
        {(scene?.objects || []).map((object) => (
          <div key={object.label} className="rounded-xl border border-slate-800 px-3 py-2 text-xs text-slate-400">
            {object.label}
          </div>
        ))}
      </div>
    </div>
  );
}
