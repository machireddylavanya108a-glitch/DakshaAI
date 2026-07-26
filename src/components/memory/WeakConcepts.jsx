export default function WeakConcepts({ concepts }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Weak Concepts</p>
      <h3 className="mt-2 text-xl font-semibold text-white">Topics worth revisiting</h3>
      <div className="mt-5 space-y-3">
        {concepts?.length ? concepts.map((concept, index) => (
          <div key={`${concept}-${index}`} className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{concept}</div>
        )) : <p className="text-sm text-slate-500">No weak concepts detected yet. Keep studying and your profile will adapt.</p>}
      </div>
    </div>
  );
}
