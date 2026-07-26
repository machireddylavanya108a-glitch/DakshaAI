export default function Achievements({ profile }) {
  const strong = profile?.strongConcepts || [];
  const weak = profile?.weakConcepts || [];
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Achievements</p>
      <h3 className="mt-2 text-xl font-semibold text-white">Your learning momentum</h3>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/10 p-4">
          <p className="text-sm text-emerald-200">Strong topics</p>
          <p className="mt-2 text-lg font-semibold text-white">{strong.length ? strong.slice(0, 3).join(', ') : 'Build mastery'}</p>
        </div>
        <div className="rounded-[1.25rem] border border-sky-500/20 bg-sky-500/10 p-4">
          <p className="text-sm text-sky-200">Focus areas</p>
          <p className="mt-2 text-lg font-semibold text-white">{weak.length ? weak.slice(0, 3).join(', ') : 'Fresh start'}</p>
        </div>
      </div>
    </div>
  );
}
