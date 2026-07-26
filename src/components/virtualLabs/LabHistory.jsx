export default function LabHistory({ history }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-cyan-300"><span className="text-lg">🕘</span> Lab History</div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        {history.length === 0 ? (
          <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">No completed labs yet. Start your first experiment to build your history.</div>
        ) : history.slice(0, 4).map((entry) => (
          <div key={entry.id} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-white">{entry.experiment}</span>
              <span className="text-xs text-cyan-300">{entry.completed ? 'Complete' : 'In progress'}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Score: {entry.score || 0}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
