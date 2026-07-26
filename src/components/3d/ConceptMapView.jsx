export default function ConceptMapView({ concept, selectedNode, onSelectNode }) {
  const nodes = concept?.visualNodes || concept?.conceptMap || [];

  if (!nodes.length) {
    return <div className="rounded-[1.5rem] border border-dashed border-slate-700 p-4 text-sm text-slate-500">No concept map available yet.</div>;
  }

  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
      <p className="mb-3 text-sm text-slate-400">Universal concept map</p>
      <div className="grid gap-3 md:grid-cols-2">
        {nodes.map((node, index) => (
          <button
            key={`${node.label}-${index}`}
            onClick={() => onSelectNode(node.label)}
            className={`rounded-[1.2rem] border px-3 py-3 text-left text-sm transition ${selectedNode === node.label ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-slate-900/80 text-slate-200'}`}
          >
            <p className="font-semibold">{node.label}</p>
            <p className="mt-1 text-xs text-slate-400">{index === 0 ? 'Core idea' : index === 1 ? 'Support concept' : 'Related concept'}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
