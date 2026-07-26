export default function PresentationSummary({ session }) {
  if (!session) return null;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">AI Learning Package</p>
      <h3 className="mt-2 text-2xl font-semibold text-white">{session.title}</h3>
      <p className="mt-4 text-sm leading-7 text-slate-400">{session.summary}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-sm text-cyan-300">Beginner</p>
          <p className="mt-2 text-sm text-slate-300">{session.beginnerLesson}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-sm text-cyan-300">Advanced</p>
          <p className="mt-2 text-sm text-slate-300">{session.advancedLesson}</p>
        </div>
      </div>
    </div>
  );
}
