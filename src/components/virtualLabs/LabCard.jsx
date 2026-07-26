export default function LabCard({ lab, saved, favorite, completed, onSave, onFavorite }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Dynamic Lab Blueprint</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{lab.title}</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={onSave} className={`rounded-full border px-3 py-2 text-sm ${saved ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-slate-900/80 text-slate-300'}`}>
            {saved ? 'Saved' : 'Save Lab'}
          </button>
          <button onClick={onFavorite} className={`rounded-full border px-3 py-2 text-sm ${favorite ? 'border-amber-500/30 bg-amber-500/10 text-amber-100' : 'border-white/10 bg-slate-900/80 text-slate-300'}`}>
            {favorite ? 'Favorited' : 'Favorite'}
          </button>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-400">{lab.objective}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {lab.keywords.slice(0, 6).map((keyword) => (
          <span key={keyword} className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs text-slate-300">{keyword}</span>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
        {completed ? <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-200">Completed</span> : <span className="rounded-full bg-slate-800 px-3 py-1">Ready to run</span>}
        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-cyan-200">AI generated</span>
      </div>
    </div>
  );
}
