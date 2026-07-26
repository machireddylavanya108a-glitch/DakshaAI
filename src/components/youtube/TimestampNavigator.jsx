export default function TimestampNavigator({ timestamps = [], onTimestampSelect }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <h3 className="text-xl font-semibold text-white">Timestamps</h3>
      <div className="mt-4 space-y-2">
        {timestamps.length === 0 ? <p className="text-sm text-slate-500">No timestamps detected.</p> : timestamps.map((entry, index) => (
          <button key={`${entry.timestamp || index}-${index}`} onClick={() => onTimestampSelect?.(entry.timestamp)} className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300 transition hover:border-slate-700">
            <span>{entry.title || `Timestamp ${index + 1}`}</span>
            <span className="text-fuchsia-300">{entry.timestamp}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
