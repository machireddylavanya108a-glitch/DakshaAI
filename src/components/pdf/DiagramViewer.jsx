export default function DiagramViewer({ diagrams = [] }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <h3 className="text-xl font-semibold text-white">Diagrams</h3>
      <div className="mt-4 space-y-3">
        {diagrams.length === 0 ? <p className="text-sm text-slate-500">No diagrams detected.</p> : diagrams.map((diagram, index) => <div key={index} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3 text-sm text-slate-300">{String(diagram)}</div>)}
      </div>
    </div>
  );
}
