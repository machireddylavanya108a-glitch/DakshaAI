export default function Recommendations({ items }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Personalized Recommendations</p>
      <h3 className="mt-2 text-xl font-semibold text-white">What your memory brain suggests next</h3>
      <div className="mt-5 space-y-3">
        {items?.length ? items.map((item, index) => (
          <div key={`${item}-${index}`} className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">{item}</div>
        )) : <p className="text-sm text-slate-500">Your brain will suggest the next study path as soon as you build enough history.</p>}
      </div>
    </div>
  );
}
