export default function MemoryTimeline({ history }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Learning Timeline</p>
      <h3 className="mt-2 text-xl font-semibold text-white">Recently studied and remembered</h3>
      <div className="mt-5 space-y-3">
        {history?.length ? history.slice(0, 8).map((item, index) => (
          <div key={`${item.type}-${index}`} className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-emerald-300">{item.type}</span>
              <span className="text-xs text-slate-500">{item.timestamp || 'recent'}</span>
            </div>
            <p className="mt-2 font-medium text-white">{item.title || 'Learning activity'}</p>
            <p className="mt-1 text-slate-400">{item.summary || 'Captured for future personalization.'}</p>
          </div>
        )) : <p className="text-sm text-slate-500">No memory history yet. Study a lesson to begin building your personalized brain.</p>}
      </div>
    </div>
  );
}
